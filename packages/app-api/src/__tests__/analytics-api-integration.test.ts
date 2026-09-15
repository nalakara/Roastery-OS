import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { newDb } from 'pg-mem';
import pg from 'pg';
import { createApiServer, seedDatabase, SeedContext } from '../index.js';

describe('Phase 10 : Operational Analytics & Cross-Module Intelligence API Integration Tests', () => {
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

  it('1. GET /api/analytics/inventory returns live stock, availability, and category valuation', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/inventory`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.ok(json.data);
    assert.ok(json.data.totalLots >= 5);
    assert.ok(json.data.activeLotsCount >= 5);
    assert.ok(Number(json.data.totalValuation.amount) > 0);

    // Verify category breakdown
    assert.ok(json.data.categorySummaries.length >= 2);
    const rawCat = json.data.categorySummaries.find((c: any) => c.category === 'RAW_MATERIAL');
    assert.ok(rawCat);
    assert.ok(rawCat.lotCount >= 2);

    // Check individual lot metrics
    const floresGreen = json.data.lots.find((l: any) => l.lotNumber === 'LOT-GRN-FLORES-001');
    assert.ok(floresGreen);
    assert.equal(Number(floresGreen.quantityOnHand.amount), 50);
    assert.equal(Number(floresGreen.reservedQuantity.amount), 0);
    assert.equal(Number(floresGreen.availableQuantity.amount), 50);
    assert.equal(Number(floresGreen.unitCost.unitPrice), 120000);
  });

  it('2. GET /api/analytics/transformations aggregates roasting yields and conversion costs', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/transformations`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.ok(json.data);
    assert.ok(json.data.completedCount >= 1);

    const seedRoast = json.data.transformations.find((t: any) => t.transformationNumber === 'TX-ROAST-SEED-001');
    assert.ok(seedRoast);
    assert.equal(seedRoast.archetype, 'ROASTING');
    assert.equal(seedRoast.status, 'COMPLETED');
  });

  it('3. GET /api/analytics/production-cost details absorbed HPP for roasted and finished lots', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/production-cost`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.ok(json.data);
    assert.ok(json.data.totalProducedLots >= 3);
    assert.ok(Number(json.data.grandTotalCostAccumulated.amount) > 0);

    const floresRoasted = json.data.producedLots.find((l: any) => l.lotNumber === 'LOT-RST-FLORES-001');
    assert.ok(floresRoasted);
    assert.ok(Number(floresRoasted.unitCost.unitPrice) > 120000);
  });

  it('4. GET /api/analytics/commercial returns sales metrics, revenue, COGS, and gross margin', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/commercial`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.ok(json.data);
    assert.ok(json.data.channelSummaries);
    assert.ok(json.data.skuSummaries);
  });

  it('5. GET /api/analytics/suppliers lists receipts and procurement spend by supplier', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/suppliers`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.ok(json.data);
    assert.ok(json.data.totalSuppliers >= 1);

    const sup = json.data.supplierSummaries.find((s: any) => s.supplierCode === 'SUP-NUSANTARA-COFFEE');
    assert.ok(sup);
    assert.ok(Number(sup.totalSpend.amount) > 0);
  });

  it('6. GET /api/analytics/summary returns high-level operational overview across all workstreams', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/summary`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.ok(json.data);
    assert.ok(json.data.inventory.totalActiveLots >= 5);
    assert.ok(Number(json.data.inventory.totalValuation.amount) > 0);
    assert.ok(json.data.procurement.totalReceipts >= 1);
  });
});
