import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { newDb } from 'pg-mem';
import pg from 'pg';
import { createApiServer, seedDatabase, SeedContext } from '../index.js';

describe('App-API Wholesale B2B & Reservation Integration Tests (Phase 8)', () => {
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

  // 1. GET /api/customers returns synthetic B2B customers without ERP bloat
  it('1. GET /api/customers returns synthetic B2B customers', async () => {
    const res = await fetch(`${baseUrl}/api/customers`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.ok(Array.isArray(json.data));
    assert.equal(json.data.length, 3);

    const cafeA = json.data.find((c: any) => c.customerCode === 'CUST-CAFE-A');
    assert.ok(cafeA, 'Cafe Partner A should be present');
    assert.equal(cafeA.name, 'Cafe Partner A (Senopati)');
    assert.equal(cafeA.isActive, true);

    const distB = json.data.find((c: any) => c.customerCode === 'CUST-DIST-B');
    assert.ok(distB, 'Regional Distributor B should be present');
  });

  // 2. Scenario 1: Simple Wholesale Order Lifecycle (DRAFT -> CONFIRMED -> RESERVED -> FULFILLED -> COMPLETED)
  it('2. Scenario 1: End-to-end Wholesale lifecycle with reservation and fulfillment', async () => {
    // A. Create Draft Order
    const createRes = await fetch(`${baseUrl}/api/wholesale/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'CUST-CAFE-A',
        notes: 'Monthly bulk bean order',
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
    const createJson = (await createRes.json()) as any;
    const orderId = createJson.data.orderId;
    const lineId = createJson.data.lines[0].orderLineId || createJson.data.lines[0].lineId;
    assert.equal(createJson.data.status, 'DRAFT');
    assert.equal(createJson.data.channel, 'WHOLESALE_CONTRACT');
    assert.equal(Number(createJson.data.grandTotal.amount), 1100000);

    // B. Confirm Order
    const confirmRes = await fetch(`${baseUrl}/api/wholesale/orders/${orderId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(confirmRes.status, 200);
    const confirmJson = (await confirmRes.json()) as any;
    assert.equal(confirmJson.data.status, 'CONFIRMED');

    // C. Inspect Lot 03 before reservation (should have 20 on hand, 0 reserved, 20 available)
    const lotsRes1 = await fetch(`${baseUrl}/api/inventory-lots`);
    const lotsJson1 = (await lotsRes1.json()) as any;
    const lot3Before = lotsJson1.data.find((l: any) => l.inventoryLotId === seedCtx.lotFgFloresC);
    assert.equal(Number(lot3Before.quantityOnHand.amount), 20);
    assert.equal(Number(lot3Before.reservedQuantity.amount), 0);
    assert.equal(Number(lot3Before.availableQuantity.amount), 20);

    // D. Reserve 5 Units from Lot 03
    const reserveRes = await fetch(`${baseUrl}/api/wholesale/orders/${orderId}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: [
          {
            lineId,
            allocations: [
              {
                lotId: seedCtx.lotFgFloresC,
                quantity: 5
              }
            ]
          }
        ]
      })
    });
    assert.equal(reserveRes.status, 200);
    const reserveJson = (await reserveRes.json()) as any;
    assert.equal(reserveJson.data.status, 'RESERVED');

    // E. Verify Lot 03 after reservation:
    // Invariant: quantityOnHand UNCHANGED (20), reservedQuantity = 5, availableQuantity = 15
    const lotsRes2 = await fetch(`${baseUrl}/api/inventory-lots`);
    const lotsJson2 = (await lotsRes2.json()) as any;
    const lot3AfterRes = lotsJson2.data.find((l: any) => l.inventoryLotId === seedCtx.lotFgFloresC);
    assert.equal(Number(lot3AfterRes.quantityOnHand.amount), 20, 'quantity_on_hand must not change on reservation');
    assert.equal(Number(lot3AfterRes.reservedQuantity.amount), 5, 'reserved_quantity must increase by 5');
    assert.equal(Number(lot3AfterRes.availableQuantity.amount), 15, 'available_quantity must decrease by 5');

    // Verify no COGS was recorded during reservation
    const orderAudit1 = await fetch(`${baseUrl}/api/commercial-orders/${orderId}`);
    const orderAudit1Json = (await orderAudit1.json()) as any;
    assert.equal(Number(orderAudit1Json.data.totalCogs.amount), 0, 'COGS must be 0 before physical dispatch');

    // F. Fulfill & Dispatch 5 Units
    const fulfillRes = await fetch(`${baseUrl}/api/wholesale/orders/${orderId}/fulfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: [
          {
            lineId,
            allocations: [
              {
                lotId: seedCtx.lotFgFloresC,
                quantity: 5
              }
            ]
          }
        ]
      })
    });
    assert.equal(fulfillRes.status, 200);
    const fulfillJson = (await fulfillRes.json()) as any;
    assert.equal(fulfillJson.data.status, 'COMPLETED');
    assert.equal(Number(fulfillJson.data.lines[0].fulfilledQuantity.amount), 5);

    // G. Verify Lot 03 after fulfillment:
    // Invariant: quantityOnHand = 15, reservedQuantity = 0, availableQuantity = 15
    const lotsRes3 = await fetch(`${baseUrl}/api/inventory-lots`);
    const lotsJson3 = (await lotsRes3.json()) as any;
    const lot3AfterFul = lotsJson3.data.find((l: any) => l.inventoryLotId === seedCtx.lotFgFloresC);
    assert.equal(Number(lot3AfterFul.quantityOnHand.amount), 15, 'quantity_on_hand must decrement by 5');
    assert.equal(Number(lot3AfterFul.reservedQuantity.amount), 0, 'reserved_quantity must be released to 0');
    assert.equal(Number(lot3AfterFul.availableQuantity.amount), 15, 'available_quantity must remain 15');

    // H. Verify COGS Recognition & Gross Margin on Completed Order
    const orderAudit2 = await fetch(`${baseUrl}/api/commercial-orders/${orderId}`);
    const orderAudit2Json = (await orderAudit2.json()) as any;
    // Lot 03 unit valuation is 150,000 IDR -> 5 * 150,000 = 750,000 IDR COGS
    const expectedCogs = 5 * 150000;
    const expectedRevenue = 5 * 220000;
    const expectedMargin = expectedRevenue - expectedCogs;

    assert.equal(Number(orderAudit2Json.data.totalCogs.amount), expectedCogs);
    assert.equal(Number(orderAudit2Json.data.grossMargin.amount), expectedMargin);
  });

  // 3. Scenario 2: Multi-Lot Wholesale Fulfillment (Lot 01: 3u + Lot 02: 4u = 7u)
  it('3. Scenario 2: Multi-lot fulfillment combines distinct lot valuations into accurate total COGS', async () => {
    // Create & Confirm Order for 7 units
    const createRes = await fetch(`${baseUrl}/api/wholesale/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'CUST-DIST-B',
        lines: [
          {
            skuId: seedCtx.skuFlores1kg,
            quantity: 8,
            unitPrice: 215000
          }
        ]
      })
    });
    const orderJson = (await createRes.json()) as any;
    const orderId = orderJson.data.orderId;
    const lineId = orderJson.data.lines[0].orderLineId || orderJson.data.lines[0].lineId;

    await fetch(`${baseUrl}/api/wholesale/orders/${orderId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    // Fulfill multi-lot: 3 from Lot 01 (unit cost 154,285.71) + 5 from Lot 03 (unit cost 150,000.00)
    const fulfillRes = await fetch(`${baseUrl}/api/wholesale/orders/${orderId}/fulfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: [
          {
            lineId,
            allocations: [
              {
                lotId: seedCtx.lotFgFloresA,
                quantity: 3
              },
              {
                lotId: seedCtx.lotFgFloresC,
                quantity: 5
              }
            ]
          }
        ]
      })
    });
    assert.equal(fulfillRes.status, 200);
    const fulfillJson = (await fulfillRes.json()) as any;
    assert.equal(fulfillJson.data.status, 'COMPLETED');

    // Expected COGS: (3 * 154285.71) + (5 * 150000.00) = 462857.13 + 750000.00 = 1212857.13 IDR
    const expectedCogs = 462857.13 + 750000.00;
    const revenue = 8 * 215000; // 1,720,000 IDR
    const expectedMargin = Math.round(revenue - expectedCogs);

    const auditRes = await fetch(`${baseUrl}/api/commercial-orders/${orderId}`);
    const auditJson = (await auditRes.json()) as any;
    assert.equal(auditJson.data.status, 'COMPLETED');
    assert.equal(Math.round(Number(auditJson.data.totalCogs.amount)), Math.round(expectedCogs));
    assert.equal(Math.round(Number(auditJson.data.grossMargin.amount)), expectedMargin);
  });

  // 4. Scenario 3: Partial Wholesale Fulfillment (4 of 10 Units fulfilled)
  it('4. Scenario 3: Partial fulfillment sets status to PARTIALLY_FULFILLED and records partial COGS', async () => {
    // Create & Confirm Order for 10 units
    const createRes = await fetch(`${baseUrl}/api/wholesale/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'CUST-HOSP-C',
        lines: [
          {
            skuId: seedCtx.skuFlores1kg,
            quantity: 10,
            unitPrice: 220000
          }
        ]
      })
    });
    const orderJson = (await createRes.json()) as any;
    const orderId = orderJson.data.orderId;
    const lineId = orderJson.data.lines[0].orderLineId || orderJson.data.lines[0].lineId;

    await fetch(`${baseUrl}/api/wholesale/orders/${orderId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    // Fulfill partially: 4 units from Lot 02 (4 * 158,500.00 = 634,000.00 IDR)
    const fulfillRes = await fetch(`${baseUrl}/api/wholesale/orders/${orderId}/fulfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: [
          {
            lineId,
            allocations: [
              {
                lotId: seedCtx.lotFgFloresB,
                quantity: 4
              }
            ]
          }
        ]
      })
    });
    assert.equal(fulfillRes.status, 200);
    const fulfillJson = (await fulfillRes.json()) as any;
    assert.equal(fulfillJson.data.status, 'PARTIALLY_FULFILLED');
    assert.equal(Number(fulfillJson.data.lines[0].fulfilledQuantity.amount), 4);

    const auditRes = await fetch(`${baseUrl}/api/commercial-orders/${orderId}`);
    const auditJson = (await auditRes.json()) as any;
    assert.equal(auditJson.data.status, 'PARTIALLY_FULFILLED');
    assert.equal(Number(auditJson.data.totalCogs.amount), 4 * 158500);
  });

  // 5. Scenario 4: Competing Reservation Scenario (REQUIRED INTEGRITY TEST)
  it('5. Scenario 4 (Competing Reservations): First order reserves available stock; second order requesting more than remaining available stock is rejected', async () => {
    // Remaining available in Lot 03 is 15 units.
    // Let's test with Lot 03:
    // Order A requests 10 units -> succeeds (remaining available: 5)
    // Order B requests 8 units -> must be REJECTED with InsufficientReservableStockError

    // Create Order A
    const resA = await fetch(`${baseUrl}/api/wholesale/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'CUST-CAFE-A',
        lines: [{ skuId: seedCtx.skuFlores1kg, quantity: 10, unitPrice: 220000 }]
      })
    });
    const orderA = (await resA.json()) as any;

    // Create Order B
    const resB = await fetch(`${baseUrl}/api/wholesale/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'CUST-DIST-B',
        lines: [{ skuId: seedCtx.skuFlores1kg, quantity: 8, unitPrice: 220000 }]
      })
    });
    const orderB = (await resB.json()) as any;

    // Confirm both
    await fetch(`${baseUrl}/api/wholesale/orders/${orderA.data.orderId}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    await fetch(`${baseUrl}/api/wholesale/orders/${orderB.data.orderId}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });

    // Order A reserves 10 units from Lot 03
    const lineIdA = orderA.data.lines[0].orderLineId || orderA.data.lines[0].lineId;
    const reserveARes = await fetch(`${baseUrl}/api/wholesale/orders/${orderA.data.orderId}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: [
          {
            lineId: lineIdA,
            allocations: [{ lotId: seedCtx.lotFgFloresC, quantity: 10 }]
          }
        ]
      })
    });
    assert.equal(reserveARes.status, 200);

    // Order B attempts to reserve 8 units from Lot 03 (only 5 units available)
    const lineIdB = orderB.data.lines[0].orderLineId || orderB.data.lines[0].lineId;
    const reserveBRes = await fetch(`${baseUrl}/api/wholesale/orders/${orderB.data.orderId}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: [
          {
            lineId: lineIdB,
            allocations: [{ lotId: seedCtx.lotFgFloresC, quantity: 8 }]
          }
        ]
      })
    });
    assert.equal(reserveBRes.status, 400);
    const errorB = (await reserveBRes.json()) as any;
    assert.ok(errorB.error?.includes('Cannot reserve') || errorB.error?.includes('Insufficient reservable stock') || errorB.message?.includes('Insufficient reservable stock'));
  });

  // 6. Cross-channel Stock Safety: POS cannot fulfill stock reserved by Wholesale
  it('6. Cross-Channel Stock Safety: POS checkout fails when attempting to consume stock reserved by Wholesale', async () => {
    // From previous test, Lot 03 has 15 on hand, 10 reserved by Order A, available = 5.
    // POS attempts to directly checkout 10 units from Lot 03 -> should be rejected because available is only 5.
    const posRes = await fetch(`${baseUrl}/api/pos/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'RETAIL_POS',
        lines: [
          {
            skuId: seedCtx.skuFlores1kg,
            quantity: 10,
            unitPrice: 280000,
            allocations: [
              {
                lotId: seedCtx.lotFgFloresC,
                quantity: 10
              }
            ]
          }
        ]
      })
    });

    assert.equal(posRes.status, 400);
    const posJson = (await posRes.json()) as any;
    assert.ok(posJson.error?.includes('Insufficient stock') || posJson.error?.includes('Insufficient available stock') || posJson.error?.includes('exceeds available'));
  });
});
