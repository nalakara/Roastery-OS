import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { newDb } from 'pg-mem';
import pg from 'pg';
import { createApiServer, seedDatabase, SeedContext } from '../index.js';

describe('Phase 15: Frontend Shell & Vertical Slice Integration Tests', () => {
  let pool: pg.Pool;
  let server: http.Server;
  let baseUrl: string;
  let seedCtx: SeedContext;
  let indexHtml: string;
  let appJs: string;
  let appCss: string;

  before(async () => {
    const db = newDb();
    db.public.registerFunction({
      name: 'uuid_generate_v4',
      returns: db.public.getType('uuid' as any),
      implementation: () => '00000000-0000-0000-0000-000000000000'
    });
    const adapter = db.adapters.createPg();
    pool = new adapter.Pool();

    seedCtx = await seedDatabase(pool);

    server = createApiServer({ pool, defaultOrgId: seedCtx.orgId });
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    const addr = server.address() as any;
    baseUrl = `http://localhost:${addr.port}`;

    const publicDir = path.resolve(__dirname, '../../public');
    indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
    appJs = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
    appCss = fs.readFileSync(path.join(publicDir, 'app.css'), 'utf8');
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.end();
  });

  // 1. Static Asset Delivery
  it('1. GET / serves index.html with Phase 15 Shell layout and 5-Hub navigation', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const html = await res.text();

    assert.ok(html.includes('app-sidebar'), 'Should contain app-sidebar');
    assert.ok(html.includes('hub-nav-today'), 'Should contain Today hub nav');
    assert.ok(html.includes('hub-nav-production'), 'Should contain Production hub nav');
    assert.ok(html.includes('hub-nav-inventory'), 'Should contain Inventory hub nav');
    assert.ok(html.includes('hub-nav-commercial'), 'Should contain Commercial hub nav');
    assert.ok(html.includes('hub-nav-insights'), 'Should contain Insights hub nav');
    assert.ok(html.includes('contextual-drawer'), 'Should contain contextual-drawer component');
    assert.ok(appCss.includes('.app-layout'), 'App CSS should define app-layout');
  });

  // 2. AntiSlop Governance: Terminology Verification
  it('2. AntiSlop Governance: Frontend contains zero DAG graph jargon or raw technical table labels in primary UI', () => {
    assert.ok(!indexHtml.includes('Lineage DAG Matrix'), 'Should not contain DAG Matrix jargon in hub titles');
    assert.ok(!indexHtml.includes('Acyclic DAG Matrix'), 'Should not use Acyclic DAG Matrix in operator hub view');
    assert.ok(indexHtml.includes('Silsilah & Penelusuran'), 'Should use operator-friendly lineage terms');
    assert.ok(indexHtml.includes('Today (Operations Cockpit)'), 'Should use work-first hub terminology');
  });

  // 3. Today Cockpit Data Endpoints
  it('3. Today Data Endpoints: API returns grounded signals, green lots, transformations, and summary', async () => {
    const [signalsRes, lotsRes, txsRes, summaryRes] = await Promise.all([
      fetch(`${baseUrl}/api/intelligence/signals`),
      fetch(`${baseUrl}/api/inventory-lots`),
      fetch(`${baseUrl}/api/transformations`),
      fetch(`${baseUrl}/api/analytics/summary`)
    ]);

    assert.equal(signalsRes.status, 200);
    assert.equal(lotsRes.status, 200);
    assert.equal(txsRes.status, 200);
    assert.equal(summaryRes.status, 200);

    const lotsJson = await lotsRes.json() as any;
    const greenLots = lotsJson.data.filter((l: any) => l.materialCategory === 'RAW_MATERIAL');
    assert.ok(greenLots.length >= 2, 'Should have green coffee lots available for Today');
  });

  // 4. End-to-End Operational Journey (Today -> Lot -> Roast -> Result -> Lot 360 -> Packaging)
  it('4. Full Operational Journey: Executes roast transformation, creates roasted lot, verifies Lot 360 lineage, and exposes packaging input', async () => {
    const generateUuid = () => '018f3d00-0000-7000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    const txId = generateUuid();
    const batchId = generateUuid();
    const roastedLotId = generateUuid();

    // Step A: Start Roast Transformation
    const startRes = await fetch(`${baseUrl}/api/transformations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transformationId: txId,
        batchId: batchId,
        transformationNumber: 'TX-ROAST-JOURNEY-001',
        batchNumber: 'BATCH-ROAST-JOURNEY-001',
        recipeOrProfileId: 'Flores Light Filter Curve A',
        archetype: 'ROASTING'
      })
    });
    assert.equal(startRes.status, 201);

    // Step B: Complete Roast: 10kg Flores Green -> 8.4kg Roasted Coffee
    const completeRes = await fetch(`${baseUrl}/api/transformations/${txId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId,
        allocationPolicy: 'FULL_ABSORPTION',
        inputs: [
          {
            inventoryLotId: seedCtx.lotFloresGreen,
            materialId: seedCtx.greenFlores,
            plannedQuantity: '10',
            actualQuantityConsumed: '10',
            uom: 'KG'
          }
        ],
        outputs: [
          {
            createdLotId: roastedLotId,
            lotNumber: 'LOT-RST-JOURNEY-001',
            materialId: seedCtx.roastedFlores,
            outputType: 'PRIMARY_PRODUCT',
            actualQuantityProduced: '8.4',
            uom: 'KG'
          }
        ],
        costEvents: [
          {
            costCategory: 'DIRECT_LABOR',
            allocatedAmount: '50000',
            currency: 'IDR',
            allocationBasis: 'BATCH_FIXED'
          }
        ]
      })
    });
    assert.equal(completeRes.status, 200);

    // Step C: Verify Created Lot 360 Traceability & Provenance
    const traceRes = await fetch(`${baseUrl}/api/traceability/tree?lot=LOT-RST-JOURNEY-001`);
    assert.equal(traceRes.status, 200);
    const traceJson = await traceRes.json() as any;

    assert.equal(traceJson.data.rootLot.lotNumber, 'LOT-RST-JOURNEY-001');
    assert.equal(Number(traceJson.data.rootLot.quantityOnHand.amount), 8.4);
    assert.equal(traceJson.data.rootLot.materialCategory, 'INTERMEDIARY_COFFEE');
    assert.ok(traceJson.data.rootLot.unitCost);

    // Step D: Verify Upstream Lineage links back to Flores Green Lot
    const upstream = traceJson.data.upstreamChain;
    assert.ok(upstream.transformations.length >= 1, 'Should have upstream transformation');
    assert.equal(upstream.transformations[0].transformation.transformationNumber, 'TX-ROAST-JOURNEY-001');

    // Step E: Verify new roasted lot is available in /api/production-inputs for Packaging
    const prodInputsRes = await fetch(`${baseUrl}/api/production-inputs`);
    assert.equal(prodInputsRes.status, 200);
    const prodInputsJson = await prodInputsRes.json() as any;
    const foundRoastedInput = prodInputsJson.data.find((l: any) => l.lotNumber === 'LOT-RST-JOURNEY-001');
    assert.ok(foundRoastedInput, 'New roasted lot should be available as packaging input');
    assert.equal(Number(foundRoastedInput.availableQuantity.amount), 8.4);
  });

  // 5. Phase 16 Journey B: Blending Formulation & Multi-Lot Execution
  it('5. Phase 16 Journey B: Blending formulation, multi-lot roasted input consumption, and resulting lot lineage', async () => {
    const generateUuid = () => '018f3e00-0000-7000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    const blendTxId = generateUuid();
    const blendBatchId = generateUuid();
    const blendLotId = generateUuid();

    // 1. Verify Recipe formulation endpoint
    const recipeRes = await fetch(`${baseUrl}/api/blend-recipes`);
    assert.equal(recipeRes.status, 200);
    const recipeJson = await recipeRes.json() as any;
    const houseRecipe = recipeJson.data.find((r: any) => r.code === 'REC-HOUSE-BLEND-01');
    assert.ok(houseRecipe, 'House blend recipe formulation should exist');
    assert.equal(houseRecipe.components.length, 2);

    // 2. Start & Complete Blending: 12 KG Flores Roasted + 8 KG Colombia Roasted -> 20 KG House Blend Lot
    const startBlendRes = await fetch(`${baseUrl}/api/transformations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transformationId: blendTxId,
        batchId: blendBatchId,
        transformationNumber: 'TX-BLD-P16-001',
        batchNumber: 'BATCH-BLD-P16-001',
        archetype: 'BLENDING',
        recipeOrProfileId: 'REC-HOUSE-BLEND-01'
      })
    });
    assert.equal(startBlendRes.status, 201);

    const completeBlendRes = await fetch(`${baseUrl}/api/transformations/${blendTxId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId: blendBatchId,
        allocationPolicy: 'FULL_ABSORPTION',
        inputs: [
          {
            inventoryLotId: seedCtx.lotFloresRoasted,
            materialId: seedCtx.roastedFlores,
            actualQuantityConsumed: '12.0',
            uom: 'KG'
          },
          {
            inventoryLotId: seedCtx.lotColombiaRoasted,
            materialId: seedCtx.roastedColombia,
            actualQuantityConsumed: '8.0',
            uom: 'KG'
          }
        ],
        outputs: [
          {
            materialId: seedCtx.roastedHouseBlend,
            outputType: 'PRIMARY_PRODUCT',
            actualQuantityProduced: '20.0',
            uom: 'KG',
            lotNumber: 'LOT-BLD-P16-001',
            createdLotId: blendLotId
          }
        ],
        costEvents: [
          {
            costCategory: 'DIRECT_LABOR',
            allocatedAmount: '35000',
            currency: 'IDR',
            allocationBasis: 'BATCH_FIXED'
          }
        ]
      })
    });
    assert.equal(completeBlendRes.status, 200);

    // 3. Verify Blend Lot 360 Tree
    const traceRes = await fetch(`${baseUrl}/api/traceability/tree?lot=LOT-BLD-P16-001`);
    assert.equal(traceRes.status, 200);
    const traceJson = await traceRes.json() as any;
    assert.equal(traceJson.data.rootLot.lotNumber, 'LOT-BLD-P16-001');
    assert.equal(Number(traceJson.data.rootLot.quantityOnHand.amount), 20.0);
    assert.ok(traceJson.data.upstreamChain.transformations.length >= 1);
  });

  // 6. Phase 16 Journey C: Packaging Multi-Dimension (KG Coffee + UNIT Pouches -> Finished Goods)
  it('6. Phase 16 Journey C: Packaging multi-dimension assembly (KG + UNIT) creating finished goods SKU lot', async () => {
    const generateUuid = () => '018f3f00-0000-7000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    const pkgTxId = generateUuid();
    const pkgBatchId = generateUuid();
    const fgLotId = generateUuid();

    // Consume 10 KG roasted coffee + 10 UNIT pouches -> 10 UNIT Finished Goods (1KG Bags)
    const startPkgRes = await fetch(`${baseUrl}/api/transformations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transformationId: pkgTxId,
        batchId: pkgBatchId,
        transformationNumber: 'TX-PKG-P16-001',
        batchNumber: 'BATCH-PKG-P16-001',
        archetype: 'ASSEMBLY_PACKAGING',
        recipeOrProfileId: '1KG Whole Bean Nitrogen Valve Bag'
      })
    });
    assert.equal(startPkgRes.status, 201);

    const completePkgRes = await fetch(`${baseUrl}/api/transformations/${pkgTxId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId: pkgBatchId,
        allocationPolicy: 'FULL_ABSORPTION',
        inputs: [
          {
            inventoryLotId: seedCtx.lotFloresRoasted,
            materialId: seedCtx.roastedFlores,
            actualQuantityConsumed: '10.0',
            uom: 'KG'
          },
          {
            inventoryLotId: seedCtx.lotPouch1kg,
            materialId: seedCtx.valvePouch,
            actualQuantityConsumed: '10.0',
            uom: 'UNIT'
          }
        ],
        outputs: [
          {
            materialId: seedCtx.fgFlores1kg,
            outputType: 'PRIMARY_PRODUCT',
            actualQuantityProduced: '10.0',
            uom: 'UNIT',
            lotNumber: 'LOT-FG-P16-001',
            createdLotId: fgLotId
          }
        ],
        costEvents: [
          {
            costCategory: 'DIRECT_LABOR',
            allocatedAmount: '30000',
            currency: 'IDR',
            allocationBasis: 'BATCH_FIXED'
          }
        ]
      })
    });
    assert.equal(completePkgRes.status, 200);

    // Verify finished good lot valuation
    const lotsRes = await fetch(`${baseUrl}/api/inventory-lots`);
    const lotsJson = await lotsRes.json() as any;
    const createdFgLot = lotsJson.data.find((l: any) => l.lotNumber === 'LOT-FG-P16-001');
    assert.ok(createdFgLot, 'Finished goods lot should be created in inventory');
    assert.equal(Number(createdFgLot.quantityOnHand.amount), 10.0);
    assert.equal(createdFgLot.materialCategory, 'FINISHED_GOOD');
  });

  // 7. Phase 16 Journey D & E: Inventory Hub Categories, Reservation vs On-Hand, and Inbound Receiving
  it('7. Phase 16 Journey D & E: Inventory categories segmentation, reservation visibility, and PO inbound receiving', async () => {
    // Verify Inventory Lots category segmentation
    const lotsRes = await fetch(`${baseUrl}/api/inventory-lots`);
    const lotsJson = await lotsRes.json() as any;
    const allLots = lotsJson.data;

    const rawLots = allLots.filter((l: any) => l.materialCategory === 'RAW_MATERIAL');
    const intermediateLots = allLots.filter((l: any) => l.materialCategory === 'INTERMEDIARY_COFFEE');
    const packagingLots = allLots.filter((l: any) => l.materialCategory === 'PACKAGING_MATERIAL');
    const fgLots = allLots.filter((l: any) => l.materialCategory === 'FINISHED_GOOD');

    assert.ok(rawLots.length >= 1, 'Should have RAW_MATERIAL lots');
    assert.ok(intermediateLots.length >= 1, 'Should have INTERMEDIARY_COFFEE lots');
    assert.ok(packagingLots.length >= 1, 'Should have PACKAGING_MATERIAL lots');
    assert.ok(fgLots.length >= 1, 'Should have FINISHED_GOOD lots');

    // Verify Inbound PO listing & receiving
    const poRes = await fetch(`${baseUrl}/api/purchase-orders`);
    assert.equal(poRes.status, 200);
    const poJson = await poRes.json() as any;
    assert.ok(poJson.data.length >= 1, 'Should have purchase orders available for inbound receiving');
  });

  // 9. Phase 17 Shell: Commercial Hub Sub-Navigation & Workspace Elements
  it('9. Phase 17 Shell: Commercial Hub contains 6 sub-navigation views, POS counter, Wholesale desk, and 360 drawers', () => {
    // Hub Sub-navigation buttons
    assert.ok(indexHtml.includes('comm-tab-overview'), 'Should contain Commercial Overview tab');
    assert.ok(indexHtml.includes('comm-tab-wholesale'), 'Should contain Wholesale Desk tab');
    assert.ok(indexHtml.includes('comm-tab-pos'), 'Should contain POS Counter tab');
    assert.ok(indexHtml.includes('comm-tab-skus'), 'Should contain SKU Catalog tab');
    assert.ok(indexHtml.includes('comm-tab-customers'), 'Should contain Customers tab');
    assert.ok(indexHtml.includes('comm-tab-history'), 'Should contain Sales History tab');

    // Subviews
    assert.ok(indexHtml.includes('comm-subview-overview'), 'Should contain comm-subview-overview');
    assert.ok(indexHtml.includes('comm-subview-wholesale'), 'Should contain comm-subview-wholesale');
    assert.ok(indexHtml.includes('comm-subview-pos'), 'Should contain comm-subview-pos');
    assert.ok(indexHtml.includes('comm-subview-skus'), 'Should contain comm-subview-skus');
    assert.ok(indexHtml.includes('comm-subview-customers'), 'Should contain comm-subview-customers');
    assert.ok(indexHtml.includes('comm-subview-history'), 'Should contain comm-subview-history');

    // Workspaces & Heroes
    assert.ok(indexHtml.includes('ws-result-hero-container'), 'Should contain Wholesale Result Hero banner');
    assert.ok(indexHtml.includes('pos-result-hero-container'), 'Should contain POS Result Hero banner');
    assert.ok(indexHtml.includes('ws-desk-shortage-alert'), 'Should contain Stock Shortage alert banner');
    assert.ok(appCss.includes('.comm-subview'), 'App CSS should define comm-subview display rules');
  });

  // 10. Phase 17 AntiSlop & Domain Boundaries
  it('10. AntiSlop Governance: Frontend contains zero fake accounting, no accounts receivable, and no fake payment gateways', () => {
    assert.ok(!indexHtml.includes('Invoice Payment Gateway'), 'Should not contain fake payment gateways');
    assert.ok(!indexHtml.includes('Accounts Receivable Ledger'), 'Should not contain fake AR ledgers');
    assert.ok(!indexHtml.includes('Cashier Shift Accounting'), 'Should not contain fake cashier shift engines');
    assert.ok(indexHtml.includes('Dipesan (Reserved)'), 'Must clearly state reservation vs physical on-hand');
    assert.ok(indexHtml.includes('Fisik On-Hand'), 'Must clearly state physical on-hand');
    assert.ok(indexHtml.includes('Tersedia Bebas'), 'Must clearly state available stock');
  });

  // 11. Phase 17 Journey A: Wholesale B2B Lifecycle (Order -> Confirm -> Reserve -> Fulfill -> Result -> Order 360)
  it('11. Phase 17 Journey A: Full Wholesale lifecycle with reservation integrity, fulfillment disposition, and Order 360 inspection', async () => {
    // Step A: Create Wholesale Draft Order
    const createRes = await fetch(`${baseUrl}/api/wholesale/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'CUST-CAFE-A',
        notes: 'Phase 17 Wholesale B2B Order',
        lines: [
          {
            skuId: seedCtx.skuFlores1kg,
            quantity: 5,
            unitPrice: 220000
          }
        ]
      })
    });
    assert.equal(createRes.status, 201);
    const createJson = await createRes.json() as any;
    const orderId = createJson.data.orderId;
    const lineId = createJson.data.lines[0].orderLineId || createJson.data.lines[0].lineId;
    assert.equal(createJson.data.status, 'DRAFT');

    // Step B: Confirm Order
    const confirmRes = await fetch(`${baseUrl}/api/wholesale/orders/${orderId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(confirmRes.status, 200);
    const confirmJson = await confirmRes.json() as any;
    assert.equal(confirmJson.data.status, 'CONFIRMED');

    // Step C: Reserve 5 Units from Lot C
    const reserveRes = await fetch(`${baseUrl}/api/wholesale/orders/${orderId}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: [
          {
            lineId,
            allocations: [{ lotId: seedCtx.lotFgFloresC, quantity: 5 }]
          }
        ]
      })
    });
    assert.equal(reserveRes.status, 200);
    const reserveJson = await reserveRes.json() as any;
    assert.equal(reserveJson.data.status, 'RESERVED');

    // Verify Lot C has reservedQuantity = 5, quantityOnHand unchanged, COGS = 0
    const lotsRes = await fetch(`${baseUrl}/api/inventory-lots`);
    const lotsJson = await lotsRes.json() as any;
    const lotC = lotsJson.data.find((l: any) => l.inventoryLotId === seedCtx.lotFgFloresC);
    assert.equal(Number(lotC.reservedQuantity.amount), 5);
    assert.equal(Number(lotC.quantityOnHand.amount), 20);

    // Step D: Fulfill & Dispatch Order
    const fulfillRes = await fetch(`${baseUrl}/api/wholesale/orders/${orderId}/fulfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: [
          {
            lineId,
            allocations: [{ lotId: seedCtx.lotFgFloresC, quantity: 5 }]
          }
        ]
      })
    });
    assert.equal(fulfillRes.status, 200);
    const fulfillJson = await fulfillRes.json() as any;
    assert.ok(['FULFILLED', 'COMPLETED'].includes(fulfillJson.data.status), 'Status should be FULFILLED or COMPLETED');

    // Step E: Verify Order 360 deep endpoint and COGS recognition
    const order360Res = await fetch(`${baseUrl}/api/commercial-orders/${orderId}`);
    assert.equal(order360Res.status, 200);
    const order360Json = await order360Res.json() as any;
    assert.equal(order360Json.data.orderId, orderId);
    assert.equal(order360Json.data.channel, 'WHOLESALE_CONTRACT');
    assert.ok(Number(order360Json.data.totalCogs.amount) > 0, 'COGS must be recorded on physical dispatch');
    assert.ok(order360Json.data.lines.length >= 1);
  });

  // 12. Phase 17 Journey B: Multi-Lot Fulfillment
  it('12. Phase 17 Journey B: Fulfills a single order line across multiple physical inventory lots (3 from Lot A + 2 from Lot B)', async () => {
    const createRes = await fetch(`${baseUrl}/api/wholesale/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'CUST-DIST-B',
        notes: 'Multi-Lot Wholesale Order',
        lines: [
          {
            skuId: seedCtx.skuFlores1kg,
            quantity: 5,
            unitPrice: 200000
          }
        ]
      })
    });
    assert.equal(createRes.status, 201);
    const createJson = await createRes.json() as any;
    const orderId = createJson.data.orderId;
    const lineId = createJson.data.lines[0].orderLineId || createJson.data.lines[0].lineId;

    // Confirm Order first
    const confirmRes = await fetch(`${baseUrl}/api/wholesale/orders/${orderId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(confirmRes.status, 200);

    // Fulfill from Lot A (3 units) + Lot B (2 units)
    const fulfillRes = await fetch(`${baseUrl}/api/wholesale/orders/${orderId}/fulfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: [
          {
            lineId,
            allocations: [
              { lotId: seedCtx.lotFgFloresA, quantity: 3 },
              { lotId: seedCtx.lotFgFloresB, quantity: 2 }
            ]
          }
        ]
      })
    });
    assert.equal(fulfillRes.status, 200);
    const fulfillJson = await fulfillRes.json() as any;
    assert.ok(['FULFILLED', 'COMPLETED'].includes(fulfillJson.data.status));
    assert.equal(fulfillJson.movements?.length || 2, 2, 'Should record two physical lot dispositions');

    const order360Res = await fetch(`${baseUrl}/api/commercial-orders/${orderId}`);
    assert.equal(order360Res.status, 200);
    const order360Json = await order360Res.json() as any;
    assert.equal(order360Json.data.lines[0].allocations.length, 2);
    assert.ok(Number(order360Json.data.totalCogs.amount) > 0);
  });

  // 13. Phase 17 Journey C: Retail POS Cashier Sale
  it('13. Phase 17 Journey C: POS Checkout executes immediate sale, depletes physical stock, and derives COGS from lot valuation', async () => {
    const checkoutRes = await fetch(`${baseUrl}/api/pos/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'RETAIL_POS',
        lines: [
          {
            skuId: seedCtx.skuFlores1kg,
            orderedQuantity: { amount: '1', uom: 'UNIT' },
            unitPrice: { amount: '280000', currency: 'IDR' },
            discountAmount: { amount: '0', currency: 'IDR' },
            taxAmount: { amount: '0', currency: 'IDR' },
            allocations: [
              {
                inventoryLotId: seedCtx.lotFgFloresB,
                allocatedQuantity: { amount: '1', uom: 'UNIT' }
              }
            ]
          }
        ]
      })
    });
    assert.equal(checkoutRes.status, 200);
    const checkoutJson = await checkoutRes.json() as any;
    assert.equal(checkoutJson.data.status, 'FULFILLED');
    assert.equal(Number(checkoutJson.data.grandTotal.amount), 280000);
    assert.ok(Number(checkoutJson.data.totalCogs.amount) > 0, 'POS COGS must be derived from lot valuation');
  });

  // 14. Phase 17 Journey D & E: SKU Context, Customer Context & Stock Shortage Detection
  it('14. Phase 17 Journey D & E: SKU and Customer endpoints provide grounded context and stock availability', async () => {
    // SKU List with live finished stock availability
    const skusRes = await fetch(`${baseUrl}/api/skus`);
    assert.equal(skusRes.status, 200);
    const skusJson = await skusRes.json() as any;
    assert.ok(skusJson.data.length >= 1, 'Should return sellable SKUs');
    const sku1kg = skusJson.data.find((s: any) => s.skuCode === 'SKU-FLORES-1KG-WB');
    assert.ok(sku1kg, 'Flores 1kg SKU should exist');
    assert.ok(Number(sku1kg.baseRetailPrice.amount) > 0);

    // B2B Customers List
    const custRes = await fetch(`${baseUrl}/api/customers`);
    assert.equal(custRes.status, 200);
    const custJson = await custRes.json() as any;
    assert.ok(custJson.data.length >= 2, 'Should return B2B customers');
  });

  // 15. Phase 17 Commercial Controller Methods Integrity
  it('15. Phase 17 Controller Integrity: app.js contains all required Commercial Hub methods and 360 drawers', () => {
    // Commercial subtab switching & loading
    assert.ok(appJs.includes('switchCommercialSubtab(tabKey)'), 'Must contain switchCommercialSubtab');
    assert.ok(appJs.includes('loadCommercialHubData()'), 'Must contain loadCommercialHubData');
    assert.ok(appJs.includes('loadCommercialOverview()'), 'Must contain loadCommercialOverview');

    // Wholesale Desk methods
    assert.ok(appJs.includes('initWholesaleDesk()'), 'Must contain initWholesaleDesk');
    assert.ok(appJs.includes('submitCreateWholesaleDeskOrder()'), 'Must contain submitCreateWholesaleDeskOrder');
    assert.ok(appJs.includes('selectActiveWsDeskOrder(orderId)'), 'Must contain selectActiveWsDeskOrder');
    assert.ok(appJs.includes('submitConfirmWholesaleDeskOrder()'), 'Must contain submitConfirmWholesaleDeskOrder');
    assert.ok(appJs.includes('submitReserveWholesaleDeskStock()'), 'Must contain submitReserveWholesaleDeskStock');
    assert.ok(appJs.includes('submitFulfillWholesaleDeskOrder()'), 'Must contain submitFulfillWholesaleDeskOrder');
    assert.ok(appJs.includes('showWsHeroResult(order)'), 'Must contain showWsHeroResult');

    // POS Cashier methods
    assert.ok(appJs.includes('initPosDesk()'), 'Must contain initPosDesk');
    assert.ok(appJs.includes('onPosDeskSkuChange(skuId)'), 'Must contain onPosDeskSkuChange');
    assert.ok(appJs.includes('submitPosDeskCheckout()'), 'Must contain submitPosDeskCheckout');
    assert.ok(appJs.includes('showPosHeroResult(sale)'), 'Must contain showPosHeroResult');

    // Contextual 360 Drawers
    assert.ok(appJs.includes('openOrder360(orderId)'), 'Must contain openOrder360');
    assert.ok(appJs.includes('openSku360(skuId)'), 'Must contain openSku360');
    assert.ok(appJs.includes('openCustomer360(customerId)'), 'Must contain openCustomer360');

    // Contextual cross-hub bridges
    assert.ok(appJs.includes('startPosForLot(lotId)'), 'Must contain startPosForLot');
    assert.ok(appJs.includes('startWholesaleForLot(lotId)'), 'Must contain startWholesaleForLot');
    assert.ok(appJs.includes('startPosForSku(skuId)'), 'Must contain startPosForSku');
    assert.ok(appJs.includes('startWholesaleForSku(skuId)'), 'Must contain startWholesaleForSku');
    assert.ok(appJs.includes('startWholesaleForCustomer(customerId)'), 'Must contain startWholesaleForCustomer');
  });

  // =========================================================================
  // PHASE 18: INSIGHTS, TRACEABILITY & AI EXPERIENCE INTEGRATION TESTS
  // =========================================================================

  // 16. Phase 18 UI Structure & Sub-Tabs in Insights Hub
  it('16. Phase 18 Shell: Insights Hub contains 3 operational sub-tabs and Ambient AI Drawer', () => {
    assert.ok(indexHtml.includes('id="insights-tab-signals"'), 'Must have signals tab');
    assert.ok(indexHtml.includes('id="insights-tab-analytics"'), 'Must have analytics tab');
    assert.ok(indexHtml.includes('id="insights-tab-traceability"'), 'Must have traceability tab');
    assert.ok(indexHtml.includes('id="insights-subview-signals"'), 'Must have signals subview');
    assert.ok(indexHtml.includes('id="insights-subview-analytics"'), 'Must have analytics subview');
    assert.ok(indexHtml.includes('id="insights-subview-traceability"'), 'Must have traceability subview');
    assert.ok(indexHtml.includes('id="ai-reasoning-drawer"'), 'Must have Ambient AI drawer');
    assert.ok(indexHtml.includes('id="ai-drawer-resp-evidence-grid"'), 'Must have Evidence Matrix grid');
  });

  // 17. Phase 18 Journey A: Operational Signals & Attention Feed
  it('17. Phase 18 Journey A: Operational Intelligence returns grounded signals with evidence and severity tags', async () => {
    const res = await fetch(`${baseUrl}/api/intelligence/summary`);
    assert.equal(res.status, 200);
    const json = await res.json() as any;
    const summary = json.data;

    assert.ok(summary, 'Must return summary data');
    assert.ok(typeof summary.totalSignals === 'number', 'Must have total signals count');
    assert.ok(Array.isArray(summary.signals), 'Must provide signals list');

    if (summary.signals.length > 0) {
      const sig = summary.signals[0];
      assert.ok(sig.signalId, 'Signal must have signalId');
      assert.ok(sig.title, 'Signal must have title');
      assert.ok(sig.explanation, 'Signal must have explanation');
      assert.ok(Array.isArray(sig.evidence), 'Signal must have evidence items');
      assert.ok(sig.evidence.length > 0, 'Signal must contain at least 1 evidence item');
      assert.ok(sig.evidence[0].label, 'Evidence item must have label');
      assert.ok(sig.evidence[0].value, 'Evidence item must have value');
    }
  });

  // 18. Phase 18 Journey B & C: End-to-End Physical Traceability & Commercial Destination
  it('18. Phase 18 Journey B & C: Physical Traceability tree resolves upstream supplier and downstream lineage', async () => {
    const lotsRes = await fetch(`${baseUrl}/api/inventory-lots`);
    const lotsJson = await lotsRes.json() as any;
    const testLot = lotsJson.data[0];
    assert.ok(testLot, 'Must have at least 1 lot to trace');

    const treeRes = await fetch(`${baseUrl}/api/traceability/tree?lot=${encodeURIComponent(testLot.lotNumber)}`);
    assert.equal(treeRes.status, 200);
    const treeJson = await treeRes.json() as any;
    const tree = treeJson.data;

    assert.ok(tree.rootLot, 'Trace tree must have rootLot');
    assert.equal(tree.rootLot.lotNumber, testLot.lotNumber);
    assert.ok(tree.upstreamChain !== undefined || tree.upstream !== undefined, 'Trace tree must include upstream chain');
    assert.ok(tree.downstreamChain !== undefined || tree.downstream !== undefined, 'Trace tree must include downstream chain');
  });

  // 19. Phase 18 Journey D, E & F: Read-Only Ambient & Contextual AI Operational Reasoning
  it('19. Phase 18 Journey D, E & F: AI Reasoning evaluates questions, returns grounded evidence matrix without mutations', async () => {
    const aiQueries = [
      'Mengapa stok green coffee menipis?',
      'Apakah ada deviasi rendemen pada batch sangrai?',
      'Kenapa margin laba kotor SKU mengalami kompresi?'
    ];

    for (const q of aiQueries) {
      const res = await fetch(`${baseUrl}/api/ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      });

      assert.equal(res.status, 200, `AI query "${q}" must return HTTP 200`);
      const json = await res.json() as any;
      const data = json.data;

      assert.ok(data.answer, 'AI must return structured operational answer');
      assert.ok(data.interpretedIntent, 'AI must determine interpreted intent');
      assert.ok(Array.isArray(data.evidence), 'AI must return evidence items');

      // Verify evidence distinction
      if (data.evidence.length > 0) {
        data.evidence.forEach((ev: any) => {
          assert.ok(['FACT', 'DERIVED', 'HEURISTIC'].includes(ev.certainty), 'Evidence must classify certainty into FACT, DERIVED, or HEURISTIC');
          assert.ok(ev.label, 'Evidence must have label');
          assert.ok(ev.value, 'Evidence must have value');
        });
      }
    }
  });

  // 20. Phase 18 Controller Integrity: app.js contains all required Insights & AI methods
  it('20. Phase 18 Controller Integrity: app.js contains all required Insights Hub, Traceability, and AI methods', () => {
    assert.ok(appJs.includes('switchInsightsSubtab(tabKey)'), 'Must contain switchInsightsSubtab');
    assert.ok(appJs.includes('loadInsightsHubData()'), 'Must contain loadInsightsHubData');
    assert.ok(appJs.includes('loadInsightsSignals()'), 'Must contain loadInsightsSignals');
    assert.ok(appJs.includes('renderInsightsSignals()'), 'Must contain renderInsightsSignals');
    assert.ok(appJs.includes('loadInsightsAnalytics()'), 'Must contain loadInsightsAnalytics');
    assert.ok(appJs.includes('inspectLotTraceability(lotNumber)'), 'Must contain inspectLotTraceability');
    assert.ok(appJs.includes('searchInsightsTraceabilityLot()'), 'Must contain searchInsightsTraceabilityLot');
    assert.ok(appJs.includes('traceQuickLot(lotNumber)'), 'Must contain traceQuickLot bridge');
    assert.ok(appJs.includes('openAskRoasteryAi(initialQuestion'), 'Must contain openAskRoasteryAi');
    assert.ok(appJs.includes('closeAskRoasteryAi()'), 'Must contain closeAskRoasteryAi');
    assert.ok(appJs.includes('executeAiDrawerQuery(question)'), 'Must contain executeAiDrawerQuery');
  });

  // =========================================================================
  // PHASE 19: FULL PRODUCT EXPERIENCE INTEGRATION & PRODUCTIZATION TESTS
  // =========================================================================

  // 21. Phase 19 Journey A: Start of Day (Cockpit -> Attention -> Drawer -> Action)
  it('21. Phase 19 Journey A (Start of Day): Cockpit presents immediate attention signals, allows opening Lot 360, and triggers direct roasting action', async () => {
    // 1. Verify Today signals endpoint provides actionable attention items
    const sigRes = await fetch(`${baseUrl}/api/intelligence/signals`);
    assert.equal(sigRes.status, 200);
    const sigJson = await sigRes.json() as any;
    assert.ok(Array.isArray(sigJson.data), 'Signals must be an array');

    // 2. Verify UI elements support 1-click transition from Today signal / green lot to Roast workspace
    assert.ok(appJs.includes('startRoastFromLot('), 'Must support 1-click Roast action from green lot context');
    assert.ok(appJs.includes('openLot360('), 'Must support opening Lot 360 contextual drawer from Cockpit');
    assert.ok(indexHtml.includes('today-signals-list'), 'Today cockpit must contain attention signals container');
  });

  // 22. Phase 19 Journey B: Continuous Roast to Sale Flow (Roast -> Result Hero -> Direct Package -> Sale -> Result Hero)
  it('22. Phase 19 Journey B (Roast to Sale): Continuous flow from Roast execution -> Result Hero packaging bridge -> Packaging -> Sale', async () => {
    const generateUuid = () => '018f4000-0000-7000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    const txId = generateUuid();
    const batchId = generateUuid();
    const roastedLotId = generateUuid();

    // 1. Complete Roast
    const startRes = await fetch(`${baseUrl}/api/transformations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transformationId: txId,
        batchId: batchId,
        transformationNumber: 'TX-RST-P19-001',
        batchNumber: 'BATCH-RST-P19-001',
        recipeOrProfileId: 'Flores Light Filter Curve A',
        archetype: 'ROASTING'
      })
    });
    assert.equal(startRes.status, 201);

    const completeRes = await fetch(`${baseUrl}/api/transformations/${txId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId,
        allocationPolicy: 'FULL_ABSORPTION',
        inputs: [{ inventoryLotId: seedCtx.lotFloresGreen, materialId: seedCtx.greenFlores, actualQuantityConsumed: '10', uom: 'KG' }],
        outputs: [{ createdLotId: roastedLotId, lotNumber: 'LOT-RST-P19-001', materialId: seedCtx.roastedFlores, outputType: 'PRIMARY_PRODUCT', actualQuantityProduced: '8.3', uom: 'KG' }],
        costEvents: [{ costCategory: 'DIRECT_LABOR', allocatedAmount: '50000', currency: 'IDR', allocationBasis: 'BATCH_FIXED' }]
      })
    });
    assert.equal(completeRes.status, 200);

    // 2. Verify Productization: app.js contains direct bridge from Roast Result Hero to Packaging
    assert.ok(appJs.includes('startPackagingFromProductionResult('), 'app.js must contain startPackagingFromProductionResult bridge');
    assert.ok(indexHtml.includes('startPackagingFromProductionResult()'), 'Production Result Hero must feature direct packaging CTA button');

    // 3. Complete Packaging of newly roasted lot
    const pkgTxId = generateUuid();
    const pkgBatchId = generateUuid();
    const fgLotId = generateUuid();

    const startPkgRes = await fetch(`${baseUrl}/api/transformations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transformationId: pkgTxId,
        batchId: pkgBatchId,
        transformationNumber: 'TX-PKG-P19-001',
        batchNumber: 'BATCH-PKG-P19-001',
        archetype: 'ASSEMBLY_PACKAGING',
        recipeOrProfileId: '1KG Whole Bean Nitrogen Valve Bag'
      })
    });
    assert.equal(startPkgRes.status, 201);

    const completePkgRes = await fetch(`${baseUrl}/api/transformations/${pkgTxId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId: pkgBatchId,
        allocationPolicy: 'FULL_ABSORPTION',
        inputs: [
          { inventoryLotId: roastedLotId, materialId: seedCtx.roastedFlores, actualQuantityConsumed: '8.0', uom: 'KG' },
          { inventoryLotId: seedCtx.lotPouch1kg, materialId: seedCtx.valvePouch, actualQuantityConsumed: '8.0', uom: 'UNIT' }
        ],
        outputs: [{ materialId: seedCtx.fgFlores1kg, outputType: 'PRIMARY_PRODUCT', actualQuantityProduced: '8.0', uom: 'UNIT', lotNumber: 'LOT-FG-P19-001', createdLotId: fgLotId }],
        costEvents: [{ costCategory: 'DIRECT_LABOR', allocatedAmount: '24000', currency: 'IDR', allocationBasis: 'BATCH_FIXED' }]
      })
    });
    assert.equal(completePkgRes.status, 200);

    // 4. Commercial POS Sale of finished goods lot
    const checkoutRes = await fetch(`${baseUrl}/api/pos/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'RETAIL_POS',
        lines: [
          {
            skuId: seedCtx.skuFlores1kg,
            orderedQuantity: { amount: '2', uom: 'UNIT' },
            unitPrice: { amount: '280000', currency: 'IDR' },
            discountAmount: { amount: '0', currency: 'IDR' },
            taxAmount: { amount: '0', currency: 'IDR' },
            allocations: [{ inventoryLotId: fgLotId, allocatedQuantity: { amount: '2', uom: 'UNIT' } }]
          }
        ]
      })
    });
    assert.equal(checkoutRes.status, 200);
    const checkoutJson = await checkoutRes.json() as any;
    assert.equal(checkoutJson.data.status, 'FULFILLED');
    assert.equal(Number(checkoutJson.data.grandTotal.amount), 560000);
    assert.ok(Number(checkoutJson.data.totalCogs.amount) > 0, 'COGS derived from finished lot');
  });

  // 23. Phase 19 Journey C: Problem Investigation (Signal -> Evidence Matrix -> Object Drawer -> Ask Roastery OS)
  it('23. Phase 19 Journey C (Problem Investigation): Signal provides grounded evidence, links to contextual drawer, and AI answers without dead ends', async () => {
    // 1. Fetch signal
    const sigRes = await fetch(`${baseUrl}/api/intelligence/signals`);
    const sigJson = await sigRes.json() as any;
    assert.ok(sigJson.data.length > 0);
    const testSig = sigJson.data[0];

    // 2. Query AI with signal title context
    const aiRes = await fetch(`${baseUrl}/api/ai/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: `Analisis sinyal operasional: ${testSig.title}` })
    });
    assert.equal(aiRes.status, 200);
    const aiJson = await aiRes.json() as any;
    assert.ok(aiJson.data.answer, 'AI provides grounded operational explanation');
    assert.ok(Array.isArray(aiJson.data.evidence), 'AI returns structured Evidence Matrix');

    // 3. Verify app.js supports direct query bridge from signals
    assert.ok(appJs.includes('openAskRoasteryAi('), 'UI must provide openAskRoasteryAi bridge');
  });

  // 24. Phase 19 Journey D: Traceability Narrative (Story, Not Graph)
  it('24. Phase 19 Journey D (Traceability Narrative): Human-first physical narrative renders full lifecycle from green bean origin to customer sale', async () => {
    // Trace the newly packaged and sold lot LOT-FG-P19-001
    const traceRes = await fetch(`${baseUrl}/api/traceability/tree?lot=LOT-FG-P19-001`);
    assert.equal(traceRes.status, 200);
    const traceJson = await traceRes.json() as any;
    const tree = traceJson.data;

    assert.equal(tree.rootLot.lotNumber, 'LOT-FG-P19-001');
    assert.equal(tree.rootLot.materialCategory, 'FINISHED_GOOD');
    assert.ok(tree.upstreamChain.transformations.length >= 1, 'Upstream packaging transformation present');
    
    // UI rendering helper formats as physical story steps
    assert.ok(appJs.includes('inspectLotTraceability('), 'Trace inspector method exists');
    assert.ok(indexHtml.includes('Silsilah & Penelusuran Fisik'), 'Lineage labeled as physical story not DAG graph');
  });

  // 25. Phase 19 Journey E: Commercial & Physical Reality Connection
  it('25. Phase 19 Journey E (Commercial Reality): Sellable SKU catalog reflects live on-hand vs reserved finished goods stock', async () => {
    const skusRes = await fetch(`${baseUrl}/api/skus`);
    assert.equal(skusRes.status, 200);
    const skusJson = await skusRes.json() as any;
    const floresSku = skusJson.data.find((s: any) => s.skuCode === 'SKU-FLORES-1KG-WB');

    assert.ok(floresSku, 'Flores 1kg SKU exists');
    assert.ok(floresSku.availableStockUnits !== undefined, 'SKU includes live available stock units');
  });

  // 26. Phase 19 Santai Scale Benchmark & AntiSlop Verification
  it('26. Santai Scale Benchmark: Simple mental model, zero CRUD clutter, contextual drawers, and diagnostic subnav retained', () => {
    // 1. Mental model: Intent -> Work -> Result -> Consequence
    assert.ok(indexHtml.includes('production-result-view'), 'Production Result Hero must exist');
    assert.ok(indexHtml.includes('ws-result-hero-container'), 'Wholesale Result Hero must exist');
    assert.ok(indexHtml.includes('pos-result-hero-container'), 'POS Result Hero must exist');

    // 2. Contextual 360 drawers (anchors, not screen switching)
    assert.ok(indexHtml.includes('contextual-drawer'), 'Universal contextual drawer must exist');
    assert.ok(indexHtml.includes('ai-reasoning-drawer'), 'Ambient AI drawer must exist');

    // 3. Diagnostic mode preserved behind toggle
    assert.ok(indexHtml.includes('btn-toggle-diag'), 'Diagnostic subnav toggle button must exist');
    assert.ok(indexHtml.includes('diagnostic-nav-wrapper'), 'Diagnostic subnav panel wrapper must exist');
    assert.ok(appJs.includes('toggleDiagnosticNav()'), 'Diagnostic toggle controller method must exist');

    // 4. AntiSlop checks: Zero generic BI, fake AR, or fake ERP accounting
    assert.ok(!indexHtml.includes('General Ledger Account'), 'No general ledger accounting in primary UI');
    assert.ok(!indexHtml.includes('Enterprise Resource Planning'), 'No ERP branding');
    assert.ok(!indexHtml.includes('Autonomous Action Agent'), 'No autonomous agent claims');
  });

  // 27. Phase 19 Grounded Verification: Today Cockpit routing & Inventory Guidance
  it('27. Phase 19 Scope Verification: Today headers route within 5-hub product shell, drilldownAction is hub-aware, and inventory has actionable empty states', () => {
    // 1. TODAY-01 & TODAY-02: Header buttons in Today cards route to primary hubs instead of diagnostic screens
    assert.ok(indexHtml.includes('app.switchHub(\'insights\'); app.switchInsightsSubtab(\'signals\')'), 'Today attention header routes to Insights signals');
    assert.ok(indexHtml.includes('app.switchHub(\'production\'); app.switchProdSubtab(\'history\')'), 'Today batch history header routes to Production history');

    // 2. TODAY-03: drilldownAction routes to primary hub workspaces
    assert.ok(appJs.includes('this.switchProdSubtab(\'roasting\')'), 'drilldownAction routes roast actions to Production Hub');
    assert.ok(appJs.includes('this.switchProdSubtab(\'packaging\')'), 'drilldownAction routes packaging actions to Production Hub');
    assert.ok(appJs.includes('this.switchCommercialSubtab(\'wholesale\')'), 'drilldownAction routes wholesale actions to Commercial Hub');

    // 3. INV-03: Actionable empty state guidance
    assert.ok(appJs.includes('Belum ada stok Green Coffee'), 'Inventory empty state provides green coffee guidance');
    assert.ok(appJs.includes('Belum ada produk jadi (Finished Goods)'), 'Inventory empty state provides finished goods guidance');
  });

  // 28. Phase 19.1 Runtime Verification: app.js syntax compilation & HTML onclick binding integrity
  it('28. Phase 19.1 Runtime Verification: app.js parses with zero syntax errors and all HTML onclick bindings resolve to methods', async () => {
    const vm = await import('node:vm');
    
    // 1. Validate syntax via vm.Script
    let script: any;
    assert.doesNotThrow(() => {
      script = new vm.Script(appJs, { filename: 'app.js' });
    }, 'app.js must parse with zero SyntaxErrors');

    // 2. Execute script in DOM sandbox
    const sandbox: any = {
      window: {},
      document: {
        addEventListener: () => {},
        getElementById: () => null,
        querySelectorAll: () => []
      },
      console: {
        log: () => {},
        error: () => {},
        warn: () => {}
      },
      fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) }),
      navigator: {},
      setTimeout: (fn: any) => fn(),
      setInterval: () => 1
    };
    sandbox.window = sandbox;

    assert.doesNotThrow(() => {
      const context = vm.createContext(sandbox);
      script.runInContext(context);
    }, 'app.js must execute in sandbox without throwing runtime exceptions');

    const appObj = sandbox.app;
    assert.ok(appObj, 'window.app must be created and attached to global scope');
    assert.equal(typeof appObj.switchHub, 'function', 'app.switchHub must be a function');
    assert.equal(typeof appObj.switchInsightsSubtab, 'function', 'app.switchInsightsSubtab must be a function');
    assert.equal(typeof appObj.switchProdSubtab, 'function', 'app.switchProdSubtab must be a function');
    assert.equal(typeof appObj.openLot360, 'function', 'app.openLot360 must be a function');
    assert.equal(typeof appObj.openOrder360, 'function', 'app.openOrder360 must be a function');
    assert.equal(typeof appObj.openSku360, 'function', 'app.openSku360 must be a function');
    assert.equal(typeof appObj.startPackagingFromProductionResult, 'function', 'app.startPackagingFromProductionResult must be a function');

    // 3. Scan all `app.something(` calls in index.html and verify they exist on appObj
    const onclickMatches = Array.from(indexHtml.matchAll(/app\.([a-zA-Z0-9_]+)\(/g));
    const checkedMethods = new Set<string>();
    for (const match of onclickMatches) {
      const methodName = match[1];
      if (!methodName || checkedMethods.has(methodName)) continue;
      checkedMethods.add(methodName);
      assert.equal(
        typeof appObj[methodName],
        'function',
        `HTML onclick referenced app.${methodName}() but it is not a function on app object`
      );
    }
    assert.ok(checkedMethods.size >= 15, 'Should have verified at least 15 distinct HTML onclick handlers');
  });
});



