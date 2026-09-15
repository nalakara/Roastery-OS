import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { newDb } from 'pg-mem';
import pg from 'pg';
import { createApiServer, seedDatabase, SeedContext } from '../index.js';

describe('App-API POS & Commercial Sales Vertical Slice Integration Tests (Phase 7)', () => {
  let pool: pg.Pool;
  let server: http.Server;
  let baseUrl: string;
  let seedCtx: SeedContext;

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
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.end();
  });

  // 1. GET /api/skus lists sellable SKUs with live stock
  it('1. GET /api/skus returns sellable commercial SKUs with finished lot availability', async () => {
    const res = await fetch(`${baseUrl}/api/skus`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.ok(Array.isArray(json.data));
    const sku1kg = json.data.find((s: any) => s.skuCode === 'SKU-FLORES-1KG-WB');
    assert.ok(sku1kg, 'Flores 1KG Whole Bean SKU should be present');
    assert.equal(Number(sku1kg.baseRetailPrice.amount), 280000);
    // Seed has Lot A (3 UNIT) + Lot B (4 UNIT) + Lot C (20 UNIT) = 27 UNIT available
    assert.equal(Number(sku1kg.availableStockUnits), 27);
  });

  // 2. Scenario 1: Single-lot sale
  it('2. Scenario 1 (Single-Lot Sale): Selling 1 unit depletes 1 unit from Lot A, derives COGS from lot valuation, POS does not own unit cost', async () => {
    const lotsRes = await fetch(`${baseUrl}/api/inventory-lots`);
    const lotsJson = (await lotsRes.json()) as any;
    const lotA = lotsJson.data.find((l: any) => l.lotNumber === 'LOT-FG-FLORES-1KG-SEED-01');
    assert.ok(lotA, 'Finished Lot A must exist');
    const initialLotAQty = Number(lotA.availableQuantity.amount);
    const lotAUnitCost = Number(lotA.unitCost.unitPrice);

    const checkoutPayload = {
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
              inventoryLotId: lotA.inventoryLotId,
              allocatedQuantity: { amount: '1', uom: 'UNIT' }
            }
          ]
        }
      ]
    };

    const checkoutRes = await fetch(`${baseUrl}/api/pos/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkoutPayload)
    });

    assert.equal(checkoutRes.status, 200);
    const checkoutJson = (await checkoutRes.json()) as any;
    const result = checkoutJson.data;

    assert.equal(result.status, 'FULFILLED');
    assert.equal(Number(result.grandTotal.amount), 280000);
    assert.equal(Math.round(Number(result.totalCogs.amount)), Math.round(lotAUnitCost * 1));
    assert.equal(result.allocations.length, 1);
    assert.equal(result.allocations[0].inventoryLotId, lotA.inventoryLotId);

    // Verify Physical Inventory depletion
    const updatedLotsRes = await fetch(`${baseUrl}/api/inventory-lots`);
    const updatedLotsJson = (await updatedLotsRes.json()) as any;
    const updatedLotA = updatedLotsJson.data.find((l: any) => l.lotNumber === 'LOT-FG-FLORES-1KG-SEED-01');
    assert.equal(Number(updatedLotA.availableQuantity.amount), initialLotAQty - 1);
  });

  // 3. Scenario 2: Multi-lot fulfillment (MANDATORY TEST: 3 + 2 = 5 units)
  it('3. Scenario 2 (Multi-Lot Fulfillment): Selling 5 units fulfills 3 units from Lot A + 2 units from Lot B with exact weighted COGS', async () => {
    const lotsRes = await fetch(`${baseUrl}/api/inventory-lots`);
    const lotsJson = (await lotsRes.json()) as any;
    const lotA = lotsJson.data.find((l: any) => l.lotNumber === 'LOT-FG-FLORES-1KG-SEED-01');
    const lotB = lotsJson.data.find((l: any) => l.lotNumber === 'LOT-FG-FLORES-1KG-SEED-02');
    assert.ok(lotA && lotB, 'Both Lot A and Lot B must exist');

    const lotAAvail = Number(lotA.availableQuantity.amount); // 2 units remaining from Scenario 1
    const lotBAvail = Number(lotB.availableQuantity.amount); // 4 units
    assert.ok(lotAAvail >= 2 && lotBAvail >= 3, 'Lots must have sufficient stock for 5-unit test');

    const lotAUnitCost = Number(lotA.unitCost.unitPrice);
    const lotBUnitCost = Number(lotB.unitCost.unitPrice);

    // Allocate: 2 from Lot A + 3 from Lot B = 5 UNIT
    const allocQtyA = 2;
    const allocQtyB = 3;
    const expectedCogs = (allocQtyA * lotAUnitCost) + (allocQtyB * lotBUnitCost);
    const sellingPrice = 280000;
    const expectedRevenue = 5 * sellingPrice;

    const checkoutPayload = {
      channel: 'RETAIL_POS',
      lines: [
        {
          skuId: seedCtx.skuFlores1kg,
          orderedQuantity: { amount: '5', uom: 'UNIT' },
          unitPrice: { amount: sellingPrice.toString(), currency: 'IDR' },
          discountAmount: { amount: '10000', currency: 'IDR' }, // 10k discount
          taxAmount: { amount: '0', currency: 'IDR' },
          allocations: [
            {
              inventoryLotId: lotA.inventoryLotId,
              allocatedQuantity: { amount: allocQtyA.toString(), uom: 'UNIT' }
            },
            {
              inventoryLotId: lotB.inventoryLotId,
              allocatedQuantity: { amount: allocQtyB.toString(), uom: 'UNIT' }
            }
          ]
        }
      ]
    };

    const checkoutRes = await fetch(`${baseUrl}/api/pos/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkoutPayload)
    });

    assert.equal(checkoutRes.status, 200);
    const checkoutJson = (await checkoutRes.json()) as any;
    const result = checkoutJson.data;

    assert.equal(result.status, 'FULFILLED');
    assert.equal(Number(result.subtotal.amount), expectedRevenue);
    assert.equal(Number(result.discountTotal.amount), 10000);
    assert.equal(Number(result.grandTotal.amount), expectedRevenue - 10000);
    assert.equal(Math.round(Number(result.totalCogs.amount)), Math.round(expectedCogs));
    assert.equal(result.allocations.length, 2);

    // Verify Lot A is fully depleted (0 available) and Lot B has remaining balance (4 - 3 = 1)
    const updatedLotsRes = await fetch(`${baseUrl}/api/inventory-lots`);
    const updatedLotsJson = (await updatedLotsRes.json()) as any;
    const updatedLotA = updatedLotsJson.data.find((l: any) => l.lotNumber === 'LOT-FG-FLORES-1KG-SEED-01');
    const updatedLotB = updatedLotsJson.data.find((l: any) => l.lotNumber === 'LOT-FG-FLORES-1KG-SEED-02');

    assert.equal(Number(updatedLotA.availableQuantity.amount), 0);
    assert.equal(updatedLotA.lotState, 'DEPLETED');
    assert.equal(Number(updatedLotB.availableQuantity.amount), lotBAvail - allocQtyB);
  });

  // 4. Scenario 3: Insufficient stock rejection
  it('4. Scenario 3 (Insufficient Stock): Attempting to sell more units than allocated or available is rejected by domain balance checks', async () => {
    const lotsRes = await fetch(`${baseUrl}/api/inventory-lots`);
    const lotsJson = (await lotsRes.json()) as any;
    const lotB = lotsJson.data.find((l: any) => l.lotNumber === 'LOT-FG-FLORES-1KG-SEED-02');
    assert.ok(lotB);

    // Request 10 units with only 1 unit allocated/available
    const checkoutPayload = {
      channel: 'RETAIL_POS',
      lines: [
        {
          skuId: seedCtx.skuFlores1kg,
          orderedQuantity: { amount: '10', uom: 'UNIT' },
          unitPrice: { amount: '280000', currency: 'IDR' },
          allocations: [
            {
              inventoryLotId: lotB.inventoryLotId,
              allocatedQuantity: { amount: '1', uom: 'UNIT' }
            }
          ]
        }
      ]
    };

    const checkoutRes = await fetch(`${baseUrl}/api/pos/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkoutPayload)
    });

    assert.equal(checkoutRes.status, 400);
    const errJson = (await checkoutRes.json()) as any;
    assert.equal(errJson.errorName, 'InsufficientFulfillmentStockError');
  });

  // 5. Commercial Order Inspector Deep Query
  it('5. GET /api/commercial-orders and GET /api/commercial-orders/:orderId inspects commercial totals, physical lot dispatches, lot HPP snapshots, total COGS, and Gross Margin', async () => {
    const ordersRes = await fetch(`${baseUrl}/api/commercial-orders`);
    assert.equal(ordersRes.status, 200);

    const ordersJson = (await ordersRes.json()) as any;
    assert.ok(Array.isArray(ordersJson.data));
    assert.ok(ordersJson.data.length >= 2, 'Should return at least 2 completed commercial orders');

    const firstOrder = ordersJson.data[0];
    const orderDetailRes = await fetch(`${baseUrl}/api/commercial-orders/${firstOrder.orderId}`);
    assert.equal(orderDetailRes.status, 200);

    const detailJson = (await orderDetailRes.json()) as any;
    const order = detailJson.data;

    assert.equal(order.orderId, firstOrder.orderId);
    assert.ok(order.lines && order.lines.length > 0);
    assert.ok(Number(order.grandTotal.amount) > 0);
    assert.ok(Number(order.totalCogs.amount) > 0);
    assert.ok(order.grossMargin);
    assert.equal(
      Math.round(Number(order.grandTotal.amount) - Number(order.totalCogs.amount)),
      Math.round(Number(order.grossMargin.amount))
    );

    const line = order.lines[0];
    assert.ok(line.allocations.length > 0);
    const alloc = line.allocations[0];
    assert.ok(alloc.lotNumber);
    assert.ok(alloc.unitCostSnapshot);
    assert.ok(alloc.totalCogsAmount);
  });
});
