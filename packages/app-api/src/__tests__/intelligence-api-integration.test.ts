import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { newDb } from 'pg-mem';
import pg from 'pg';
import { createApiServer, seedDatabase, SeedContext } from '../index.js';

describe('Phase 11: Operational Intelligence & Decision Support API Integration Tests', () => {
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

  it('1. GET /api/intelligence/summary returns aggregated counts and signals across domains', async () => {
    const res = await fetch(`${baseUrl}/api/intelligence/summary`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.ok(json.data);
    assert.ok(json.data.asOfDate);
    assert.equal(typeof json.data.totalSignals, 'number');
    assert.ok(json.data.countsBySeverity);
    assert.ok(json.data.countsByDomain);
    assert.ok(Array.isArray(json.data.signals));

    // Verify evidence certainty tags on all returned signals
    for (const sig of json.data.signals) {
      assert.ok(sig.signalId);
      assert.ok(sig.signalType);
      assert.ok(sig.domain);
      assert.ok(sig.severity);
      assert.ok(sig.title);
      assert.ok(sig.explanation);
      assert.ok(Array.isArray(sig.evidence));
      for (const ev of sig.evidence) {
        assert.ok(['FACT', 'DERIVED', 'HEURISTIC'].includes(ev.certainty));
      }
    }
  });

  it('2. GET /api/intelligence/signals returns full signal list and supports severity filtering', async () => {
    const resAll = await fetch(`${baseUrl}/api/intelligence/signals`);
    assert.equal(resAll.status, 200);
    const jsonAll = (await resAll.json()) as any;
    assert.ok(Array.isArray(jsonAll.data));

    // Test severity filter query
    const resWarning = await fetch(`${baseUrl}/api/intelligence/signals?severity=WARNING`);
    assert.equal(resWarning.status, 200);
    const jsonWarning = (await resWarning.json()) as any;
    assert.ok(Array.isArray(jsonWarning.data));
    for (const sig of jsonWarning.data) {
      assert.equal(sig.severity, 'WARNING');
    }
  });

  it('3. GET /api/intelligence/signals supports domain filtering', async () => {
    const resInv = await fetch(`${baseUrl}/api/intelligence/signals?domain=INVENTORY`);
    assert.equal(resInv.status, 200);
    const jsonInv = (await resInv.json()) as any;
    assert.ok(Array.isArray(jsonInv.data));
    for (const sig of jsonInv.data) {
      assert.equal(sig.domain, 'INVENTORY');
    }
  });

  it('4. GET /api/intelligence/signals/:signalId returns single signal or 404', async () => {
    const resAll = await fetch(`${baseUrl}/api/intelligence/signals`);
    const jsonAll = (await resAll.json()) as any;

    if (jsonAll.data.length > 0) {
      const firstSignal = jsonAll.data[0];
      const resSingle = await fetch(`${baseUrl}/api/intelligence/signals/${firstSignal.signalId}`);
      assert.equal(resSingle.status, 200);
      const jsonSingle = (await resSingle.json()) as any;
      assert.equal(jsonSingle.data.signalId, firstSignal.signalId);
      assert.equal(jsonSingle.data.title, firstSignal.title);
    }

    const resNotFound = await fetch(`${baseUrl}/api/intelligence/signals/SIG-NON-EXISTING-999`);
    assert.equal(resNotFound.status, 404);
  });
});
