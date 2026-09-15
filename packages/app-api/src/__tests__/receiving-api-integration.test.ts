import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { newDb } from 'pg-mem';
import pg from 'pg';
import { createApiServer, seedDatabase, SeedContext } from '../index.js';

describe('App-API Operational Receiving Vertical Slice Integration Tests', () => {
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

  // 1. PO List
  it('1. GET /api/purchase-orders should list purchase orders with supplier names and line counts', async () => {
    const res = await fetch(`${baseUrl}/api/purchase-orders`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.ok(Array.isArray(json.data));
    assert.equal(json.data.length, 2);

    const po1 = json.data.find((p: any) => p.poNumber === 'PO-2026-001');
    assert.ok(po1);
    assert.equal(po1.supplierName, 'PT Nusantara Specialty Origins');
    assert.equal(po1.status, 'ISSUED');
    assert.equal(po1.lineCount, 1);
  });

  // 2. PO Detail
  it('2. GET /api/purchase-orders/:poId should return PO with line details and remaining quantity', async () => {
    const res = await fetch(`${baseUrl}/api/purchase-orders/${seedCtx.poPartiallyReceived}`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    const po = json.data;
    assert.equal(po.poNumber, 'PO-2026-002');
    assert.equal(po.status, 'PARTIALLY_RECEIVED');
    assert.equal(po.lines.length, 2);

    const colLine = po.lines.find((l: any) => l.materialCode === 'RAW-COLOMBIA-SUPREMO');
    assert.ok(colLine);
    assert.equal(String(colLine.orderedQuantity.amount), '150');
    assert.equal(String(colLine.receivedQuantity.amount), '50');
    assert.equal(String(colLine.remainingQuantity.amount), '100');
  });

  // 3. Receiving Use Case Execution via API
  it('3. POST /api/purchase-orders/:poId/receive should execute ReceivePurchaseOrderUseCase and return created lot and movement', async () => {
    const poDetailRes = await fetch(`${baseUrl}/api/purchase-orders/${seedCtx.poIssued}`);
    const poDetail = ((await poDetailRes.json()) as any).data;
    const line = poDetail.lines[0];

    const payload = {
      poLineId: line.poLineId,
      supplierId: poDetail.supplierId,
      materialId: line.materialId,
      quantity: '75',
      uom: 'KG',
      unitPrice: '120000',
      currency: 'IDR',
      originLotReference: 'FARM-HARVEST-LOT-2026'
    };

    const res = await fetch(`${baseUrl}/api/purchase-orders/${seedCtx.poIssued}/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const json = (await res.json()) as any;
    assert.equal(json.success, true);
    assert.ok(json.data.receiptId);
    assert.ok(json.data.createdLotId);
    assert.ok(json.data.movementId);
    assert.equal(String(json.data.quantityOnHand.amount), '75');

    // Verify PO status transitioned to PARTIALLY_RECEIVED
    const updatedPoRes = await fetch(`${baseUrl}/api/purchase-orders/${seedCtx.poIssued}`);
    const updatedPo = ((await updatedPoRes.json()) as any).data;
    assert.equal(updatedPo.status, 'PARTIALLY_RECEIVED');
    assert.equal(String(updatedPo.lines[0].receivedQuantity.amount), '75');
    assert.equal(String(updatedPo.lines[0].remainingQuantity.amount), '125');

    // 4. Receipt Inspection
    const inspectRes = await fetch(`${baseUrl}/api/receipts/${json.data.receiptId}`);
    assert.equal(inspectRes.status, 200);
    const inspectJson = (await inspectRes.json()) as any;

    assert.equal(inspectJson.data.receipt.receiptId, json.data.receiptId);
    assert.equal(inspectJson.data.receipt.originLotReference, 'FARM-HARVEST-LOT-2026');

    assert.equal(inspectJson.data.lot.inventoryLotId, json.data.createdLotId);
    assert.equal(String(inspectJson.data.lot.quantityOnHand.amount), '75');

    assert.equal(inspectJson.data.movement.movementId, json.data.movementId);
    assert.equal(inspectJson.data.movement.movementType, 'PURCHASE_RECEIPT');
    assert.equal(String(inspectJson.data.movement.quantityDelta.amount), '75');

    assert.equal(String(inspectJson.data.valuation.totalLotCost.amount), '9000000'); // 75 * 120,000
    assert.equal(String(inspectJson.data.valuation.unitCost.unitPrice), '120000');
  });

  // 5. Application Error Surfacing
  it('5. POST /api/purchase-orders/:poId/receive should reject excessive quantity over remaining PO limit', async () => {
    const poDetailRes = await fetch(`${baseUrl}/api/purchase-orders/${seedCtx.poIssued}`);
    const poDetail = ((await poDetailRes.json()) as any).data;
    const line = poDetail.lines[0]; // remaining is now 125 KG

    const excessivePayload = {
      poLineId: line.poLineId,
      supplierId: poDetail.supplierId,
      materialId: line.materialId,
      quantity: '200', // Exceeds remaining 125
      uom: 'KG',
      unitPrice: '120000',
      currency: 'IDR'
    };

    const res = await fetch(`${baseUrl}/api/purchase-orders/${seedCtx.poIssued}/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(excessivePayload)
    });

    assert.equal(res.status, 400);
    const json = (await res.json()) as any;
    assert.equal(json.errorName, 'ExcessiveReceiptQuantityError');
    assert.ok(json.error.includes('exceeds remaining allowable PO quantity'));
  });

  // 6. Static files serving
  it('6. GET / should serve the operational receiving UI index.html', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Roastery OS'));
    assert.ok(html.includes('Receiving'));
  });
});
