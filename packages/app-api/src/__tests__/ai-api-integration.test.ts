import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { newDb } from 'pg-mem';
import pg from 'pg';
import { createApiServer, seedDatabase, SeedContext } from '../index.js';

describe('Phase 12: AI Layer / Operational Reasoning API Integration Tests', () => {
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

  it('1. POST /api/ai/query handles origin/traceability question and returns grounded evidence', async () => {
    const res = await fetch(`${baseUrl}/api/ai/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Where did this finished lot come from?'
      })
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.ok(json.data);
    assert.equal(json.data.interpretedIntent, 'TRACEABILITY_ORIGIN');
    assert.ok(json.data.answer);
    assert.ok(json.data.reasoningSummary);
    assert.ok(Array.isArray(json.data.evidence));
    assert.ok(json.data.evidence.length > 0);
    assert.ok(Array.isArray(json.data.sourceRefs));

    // Verify certainty tags
    for (const ev of json.data.evidence) {
      assert.ok(['FACT', 'DERIVED', 'HEURISTIC'].includes(ev.certainty));
    }
  });

  it('2. POST /api/ai/query handles cost explanation question and cites absorbed cost records', async () => {
    const res = await fetch(`${baseUrl}/api/ai/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Why is House Blend HPP high?'
      })
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.ok(json.data);
    assert.equal(json.data.interpretedIntent, 'COST_HPP_EXPLANATION');
    assert.ok(json.data.answer.includes('HPP') || json.data.answer.includes('biaya'));
    assert.ok(json.data.reasoningSummary.includes('Full Absorption'));
  });

  it('3. POST /api/ai/query handles missing data questions and acknowledges uncertainty explicitly', async () => {
    const res = await fetch(`${baseUrl}/api/ai/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What information is missing for deciding whether this supplier is risky?'
      })
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as any;
    assert.ok(json.data);
    assert.ok(json.data.uncertainty);
    assert.ok(json.data.uncertainty.includes('TIDAK mencatat skor kualitas sensori'));
  });

  it('4. POST /api/ai/query rejects invalid or empty question payloads', async () => {
    const res = await fetch(`${baseUrl}/api/ai/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.equal(res.status, 400);
  });
});
