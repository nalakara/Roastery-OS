import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import pg from 'pg';
import { 
  OrganizationId, 
  SupplierId,
  MaterialId, 
  StorageLocationId, 
  PurchaseOrderId,
  PurchaseOrderLineId,
  SkuId,
  ProductId
} from '@roastery-os/contracts';
import { INITIAL_SCHEMA_DDL, AnalyticsPostgresRepository } from '@roastery-os/infrastructure-postgres';
import { AnalyticsQueryService } from '../analytics/analytics-query-service.js';

describe('Phase 10 : Operational Analytics Unit & Service Tests', () => {
  let pool: pg.Pool;
  let analyticsService: AnalyticsQueryService;
  const orgA = '018f3a00-0000-7000-8000-000000000001' as OrganizationId;
  const orgB = '018f3a00-0000-7000-8000-000000000002' as OrganizationId;

  const supplier1 = '018f3a00-0000-7000-8000-000000000011' as SupplierId;
  const greenMat = '018f3a00-0000-7000-8000-000000000021' as MaterialId;
  const roastMat = '018f3a00-0000-7000-8000-000000000024' as MaterialId;
  const wasteMat = '018f3a00-0000-7000-8000-000000000027' as MaterialId;
  const fgMat = '018f3a00-0000-7000-8000-00000000002b' as MaterialId;
  const location1 = '018f3a00-0000-7000-8000-000000000031' as StorageLocationId;

  const prod1 = '018f3a00-0000-7000-8000-000000000081' as ProductId;
  const sku1 = '018f3a00-0000-7000-8000-000000000091' as SkuId;

  before(async () => {
    const db = newDb();
    db.public.registerFunction({
      name: 'uuid_generate_v4',
      returns: db.public.getType('uuid' as any),
      implementation: () => '00000000-0000-0000-0000-000000000000'
    });
    const adapter = db.adapters.createPg();
    pool = new adapter.Pool();

    const client = await pool.connect();
    try {
      const cleanDdl = INITIAL_SCHEMA_DDL.replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g, '');
      await client.query(cleanDdl);

      // Seed Organization A
      await client.query(`INSERT INTO organization VALUES ($1, 'ORG-A', 'Tenant A', 'IDR', TRUE, NOW(), NOW())`, [orgA]);
      await client.query(`INSERT INTO organization VALUES ($1, 'ORG-B', 'Tenant B', 'IDR', TRUE, NOW(), NOW())`, [orgB]);

      // Seed Master Data for Org A
      await client.query(`INSERT INTO storage_location VALUES ($1, $2, 'LOC-1', 'Main Loc', 'WAREHOUSE', TRUE)`, [orgA, location1]);
      await client.query(`INSERT INTO supplier_master VALUES ($1, $2, 'SUP-01', 'Nusantara Origins', 'PRODUCER', 'Budi', 'budi@test.com', '081', 'ID', 'Flores', TRUE, NOW(), NOW())`, [orgA, supplier1]);

      await client.query(`INSERT INTO material_master VALUES 
        ($1, $2, 'RAW-FLORES', 'Flores Green', 'RAW_MATERIAL', 'KG', 'Green Coffee', TRUE, NOW(), NOW()),
        ($1, $3, 'ROAST-FLORES', 'Flores Roast', 'INTERMEDIARY_COFFEE', 'KG', 'Roasted Coffee', TRUE, NOW(), NOW()),
        ($1, $4, 'WASTE-CHAFF', 'Chaff & Moisture', 'CONSUMABLE', 'KG', 'Waste', TRUE, NOW(), NOW()),
        ($1, $5, 'FG-FLORES-1KG', 'Flores 1KG Pack', 'FINISHED_GOOD', 'UNIT', 'Packaged Coffee', TRUE, NOW(), NOW())`,
        [orgA, greenMat, roastMat, wasteMat, fgMat]);

      await client.query(`INSERT INTO product_master VALUES ($1, $2, 'PROD-FLORES', 'Flores Brand', 'Single Origin', 'Desc', $3, TRUE, NOW(), NOW())`, [orgA, prod1, roastMat]);
      await client.query(`INSERT INTO sku_master VALUES ($1, $2, 'SKU-FLORES-1KG', $3, $4, 'Flores 1KG Bag', 'BAG_1KG', 1.0000, 'KG', '899123', 250000.00, 200000.00, TRUE, NOW(), NOW())`,
        [orgA, sku1, prod1, fgMat]);

      // Seed Procurement Receipts for Org A
      const po1 = '018f3a00-0000-7000-8000-000000000041' as PurchaseOrderId;
      const poLine1 = '018f3a00-0000-7000-8000-000000000051' as PurchaseOrderLineId;
      await client.query(`INSERT INTO purchase_order VALUES ($1, $2, 'PO-001', $3, 'RECEIVED', 12000000.00, 'IDR', NOW(), NOW(), NOW(), NOW())`, [orgA, po1, supplier1]);
      await client.query(`INSERT INTO purchase_order_line VALUES ($1, $2, $3, $4, 100.0000, 100.0000, 'KG', 120000.00, 12000000.00)`, [orgA, poLine1, po1, greenMat]);

      const lotGreen = '018f3a00-0000-7000-8000-000000000061';
      const mov1 = '018f3a00-0000-7000-8000-000000000057';
      const rec1 = '018f3a00-0000-7000-8000-000000000055';

      await client.query(`INSERT INTO inventory_lot VALUES ($1, $2, 'LOT-GRN-01', $3, 100.0000, 20.0000, 'KG', $4, 'ACTIVE', NOW() - INTERVAL '10 days', NULL, NOW(), NOW())`, [orgA, lotGreen, greenMat, location1]);
      await client.query(`INSERT INTO lot_valuation_record VALUES ($1, '018f3a00-0000-7000-8000-000000000071', $2, 12000000.00, 0.00, 12000000.00, 120000.0000, 'IDR', 'FULL_ABSORPTION', NOW())`, [orgA, lotGreen]);
      await client.query(`INSERT INTO stock_ledger_movement VALUES ($1, $2, 'MOV-001', $3, 'PURCHASE_RECEIPT', 100.0000, 'KG', NULL, $4, 'PURCHASE_RECEIPT', $5, NULL, NOW(), 'Inbound')`, [orgA, mov1, lotGreen, location1, rec1]);
      await client.query(`INSERT INTO purchase_receipt VALUES ($1, $2, 'REC-001', $3, $4, $5, $6, $7, $8, 100.0000, 'KG', 120000.00, 12000000.00, 'IDR', 'ORIGIN-01', NOW() - INTERVAL '10 days')`,
        [orgA, rec1, po1, poLine1, supplier1, greenMat, lotGreen, mov1]);

      // Seed Transformation (Roasting: 30 KG Green -> 25 KG Roast + 5 KG Waste)
      const txRoast = '018f3a00-0000-7000-8000-0000000000e1';
      const lotRoast = '018f3a00-0000-7000-8000-000000000062';
      await client.query(`INSERT INTO transformation VALUES ($1, $2, 'TX-ROAST-01', 'ROASTING', 'COMPLETED', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW(), NOW())`, [orgA, txRoast]);
      await client.query(`INSERT INTO batch VALUES ($1, '018f3a00-0000-7000-8000-0000000000e3', 'BATCH-ROAST-01', 'ROAST_BATCH', $2, NULL, NULL, 'PROF-LIGHT', 28.5, 60.0, '{}', 'COMPLETED', NOW(), NOW(), NOW(), NOW())`, [orgA, txRoast]);
      await client.query(`INSERT INTO transformation_input VALUES ($1, '018f3a00-0000-7000-8000-0000000000e4', $2, $3, $4, 30.0000, 30.0000, 'KG', 1, NULL)`, [orgA, txRoast, lotGreen, greenMat]);
      
      const movRoast = '018f3a00-0000-7000-8000-0000000000e6';
      await client.query(`INSERT INTO inventory_lot VALUES ($1, $2, 'LOT-RST-01', $3, 25.0000, 0.0000, 'KG', $4, 'ACTIVE', NOW() - INTERVAL '3 days', NULL, NOW(), NOW())`, [orgA, lotRoast, roastMat, location1]);
      await client.query(`INSERT INTO stock_ledger_movement VALUES ($1, $2, 'MOV-002', $3, 'TRANSFORMATION_YIELD', 25.0000, 'KG', NULL, $4, 'TRANSFORMATION', $5, NULL, NOW(), 'Yield')`, [orgA, movRoast, lotRoast, location1, txRoast]);
      await client.query(`INSERT INTO transformation_output VALUES ($1, '018f3a00-0000-7000-8000-0000000000e5', $2, $3, $4, 'PRIMARY_PRODUCT', 25.0000, 'KG', 0.8333, $5)`, [orgA, txRoast, lotRoast, roastMat, movRoast]);
      await client.query(`INSERT INTO transformation_output VALUES ($1, '018f3a00-0000-7000-8000-0000000000e7', $2, NULL, $3, 'UNRECOVERABLE_WASTE', 5.0000, 'KG', 0.1667, NULL)`, [orgA, txRoast, wasteMat]);

      // Direct Labor Cost on Roast
      await client.query(`INSERT INTO cost_event VALUES ($1, '018f3a00-0000-7000-8000-0000000000e8', $2, 'DIRECT_LABOR', 150000.00, 'IDR', 'BATCH_FIXED', NOW() - INTERVAL '3 days')`, [orgA, txRoast]);
      // Valuation of Roasted Lot: 30 KG @ 120k = 3.6m + 150k conversion = 3.75m / 25 KG => 150k / KG
      await client.query(`INSERT INTO lot_valuation_record VALUES ($1, '018f3a00-0000-7000-8000-000000000072', $2, 3600000.00, 150000.00, 3750000.00, 150000.0000, 'IDR', 'FULL_ABSORPTION', NOW() - INTERVAL '3 days')`, [orgA, lotRoast]);

      // Seed Commercial Order & POS / Wholesale Fulfillment
      const order1 = '018f3a00-0000-7000-8000-0000000000c1';
      const orderLine1 = '018f3a00-0000-7000-8000-0000000000c2';
      const alloc1 = '018f3a00-0000-7000-8000-0000000000c3';
      const cogs1 = '018f3a00-0000-7000-8000-0000000000c4';

      await client.query(`INSERT INTO commercial_order VALUES ($1, $2, 'ORD-POS-001', 'RETAIL_POS', NULL, 'COMPLETED', 500000.00, 0.00, 0.00, 500000.00, 'IDR', NOW() - INTERVAL '1 day', NOW(), NOW(), NOW(), NOW())`, [orgA, order1]);
      await client.query(`INSERT INTO commercial_order_line VALUES ($1, $2, $3, $4, $5, 2.0000, 2.0000, 'UNIT', 250000.00, 0.00, 0.00, 500000.00, 'FULFILLED')`, [orgA, orderLine1, order1, sku1, fgMat]);
      await client.query(`INSERT INTO fulfillment_allocation VALUES ($1, $2, $3, $4, 2.0000, 'UNIT', NULL, NOW() - INTERVAL '1 day')`, [orgA, alloc1, orderLine1, lotRoast]);
      // 2 units * 150,000 unit cost = 300,000 COGS -> Gross Margin = 200,000 (40%)
      await client.query(`INSERT INTO cogs_record VALUES ($1, $2, $3, $4, 2.0000, 'UNIT', 150000.0000, 300000.00, 'IDR', NOW() - INTERVAL '1 day')`, [orgA, cogs1, alloc1, lotRoast]);

    } finally {
      client.release();
    }

    const analyticsRepo = new AnalyticsPostgresRepository();
    analyticsService = new AnalyticsQueryService(analyticsRepo);
  });

  after(async () => {
    await pool.end();
  });

  it('1. Inventory Position: Returns accurate stock on-hand, reserved, available, and age', async () => {
    const res = await analyticsService.getInventoryPosition(pool, orgA);
    assert.equal(res.totalLots, 2);
    assert.equal(res.activeLotsCount, 2);

    const green = res.lots.find(l => l.lotNumber === 'LOT-GRN-01');
    assert.ok(green);
    assert.equal(Number(green.quantityOnHand.amount), 100);
    assert.equal(Number(green.reservedQuantity.amount), 20);
    assert.equal(Number(green.availableQuantity.amount), 80);
    assert.ok(green.ageDays >= 9);
    assert.equal(Number(green.unitCost?.unitPrice), 120000);
    assert.equal(Number(green.totalLotCost?.amount), 12000000);
  });

  it('2. Transformation Performance: Aggregates yield, waste, and conversion costs respecting UOM', async () => {
    const res = await analyticsService.getTransformationPerformance(pool, orgA);
    assert.equal(res.totalTransformations, 1);
    assert.equal(res.completedCount, 1);
    assert.equal(Number(res.totalConversionCosts.amount), 150000);

    const tx = res.transformations[0];
    assert.ok(tx);
    assert.equal(tx.transformationNumber, 'TX-ROAST-01');
    assert.equal(tx.archetype, 'ROASTING');
    assert.equal(Number(tx.primaryInputQuantity?.amount), 30);
    assert.equal(Number(tx.primaryOutputQuantity?.amount), 25);
    assert.equal(Number(tx.unrecoverableWasteQuantity?.amount), 5);
    assert.equal(tx.yieldRatio, '0.8333'); // 25 / 30 = 83.33%
    assert.equal(Number(tx.directConversionCost.amount), 150000);
  });

  it('3. Production Cost Breakdown: Confirms absorption HPP propagation', async () => {
    const res = await analyticsService.getProductionCostBreakdown(pool, orgA);
    assert.equal(res.totalProducedLots, 2);

    const roastLotCost = res.producedLots.find(l => l.lotNumber === 'LOT-RST-01');
    assert.ok(roastLotCost);
    assert.equal(Number(roastLotCost.materialCost.amount), 3600000);
    assert.equal(Number(roastLotCost.conversionCost.amount), 150000);
    assert.equal(Number(roastLotCost.totalLotCost.amount), 3750000);
    assert.equal(Number(roastLotCost.unitCost.unitPrice), 150000);
  });

  it('4. Commercial Performance: Verifies Revenue, COGS, and Gross Margin', async () => {
    const res = await analyticsService.getCommercialPerformance(pool, orgA);
    assert.equal(res.totalOrders, 1);
    assert.equal(Number(res.totalRevenue.amount), 500000);
    assert.equal(Number(res.totalCogs.amount), 300000);
    assert.equal(Number(res.totalGrossMargin.amount), 200000);
    assert.equal(res.overallGrossMarginPercentage, '40.00');

    assert.equal(res.channelSummaries.length, 1);
    const ch = res.channelSummaries[0];
    assert.ok(ch);
    assert.equal(ch.channel, 'RETAIL_POS');
    assert.equal(ch.grossMarginPercentage, '40.00');

    assert.equal(res.skuSummaries.length, 1);
    const sku = res.skuSummaries[0];
    assert.ok(sku);
    assert.equal(sku.skuCode, 'SKU-FLORES-1KG');
    assert.equal(Number(sku.totalUnitsSold.amount), 2);
  });

  it('5. Supplier Analytics: Accurately reflects procurement volume and spend', async () => {
    const res = await analyticsService.getSupplierAnalytics(pool, orgA);
    assert.equal(res.totalSuppliers, 1);
    assert.equal(res.totalReceiptsCount, 1);
    assert.equal(Number(res.totalProcurementSpend.amount), 12000000);

    const sup = res.supplierSummaries[0];
    assert.ok(sup);
    assert.equal(sup.supplierCode, 'SUP-01');
    assert.equal(Number(sup.totalSpend.amount), 12000000);
  });

  it('6. Global Operational Summary: Aggregates high-level instrument panel metrics', async () => {
    const summary = await analyticsService.getGlobalSummary(pool, orgA, 'ALL');
    assert.equal(summary.inventory.totalActiveLots, 2);
    assert.equal(summary.production.completedTransformations, 1);
    assert.equal(summary.commercial.totalOrders, 1);
    assert.equal(Number(summary.commercial.totalRevenue.amount), 500000);
    assert.equal(Number(summary.commercial.grossMargin.amount), 200000);
    assert.equal(summary.commercial.grossMarginPercentage, '40.00');
  });

  it('7. Tenant Isolation: Org B sees zero data from Org A', async () => {
    const resInv = await analyticsService.getInventoryPosition(pool, orgB);
    assert.equal(resInv.totalLots, 0);
    assert.equal(Number(resInv.totalValuation.amount), 0);

    const resTx = await analyticsService.getTransformationPerformance(pool, orgB);
    assert.equal(resTx.totalTransformations, 0);

    const resComm = await analyticsService.getCommercialPerformance(pool, orgB);
    assert.equal(resComm.totalOrders, 0);
    assert.equal(Number(resComm.totalRevenue.amount), 0);
  });
});
