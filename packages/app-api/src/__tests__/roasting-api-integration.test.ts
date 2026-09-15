import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { newDb } from 'pg-mem';
import pg from 'pg';
import { createApiServer, seedDatabase, SeedContext } from '../index.js';

describe('App-API Roasting & Transformation Vertical Slice Integration Tests (Phase 6B)', () => {
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

  // 1. Available Lots List
  it('1. GET /api/inventory-lots returns active green coffee lots with valuation and available qty', async () => {
    const res = await fetch(`${baseUrl}/api/inventory-lots`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length >= 2, 'Should have at least 2 seeded green lots');

    const floresLot = json.data.find((l: any) => l.lotNumber === 'LOT-GRN-FLORES-001');
    assert.ok(floresLot, 'Flores green lot should be present');
    assert.equal(floresLot.materialCode, 'RAW-FLORES-BAJAWA');
    assert.equal(floresLot.lotState, 'ACTIVE');
    assert.equal(Number(floresLot.quantityOnHand.amount), 50);
    assert.equal(Number(floresLot.availableQuantity.amount), 50);
    assert.ok(floresLot.unitCost);
    assert.equal(Number(floresLot.unitCost.unitPrice), 120000);
  });

  // 2. Scenario A (1:1 Single Origin Roast)
  it('2. Scenario A: 1:1 Single Origin Roast completes transformation and assigns full absorption cost', async () => {
    const generateUuid = () => '018f3b00-0000-7000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    const txId = generateUuid();
    const batchId = generateUuid();
    const targetLotId = generateUuid();

    // 1. Start transformation & batch
    const startRes = await fetch(`${baseUrl}/api/transformations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transformationId: txId,
        batchId: batchId,
        transformationNumber: 'TX-ROAST-TEST-001',
        batchNumber: 'BATCH-ROAST-TEST-001',
        recipeOrProfileId: 'Flores Light Filter',
        archetype: 'ROASTING'
      })
    });
    assert.equal(startRes.status, 201);

    // 2. Complete transformation: 10kg Flores Green -> 8.4kg Flores Roasted
    // 10kg @ 120,000 = 1,200,000 + 50,000 labor + 25,000 gas = 1,275,000 total / 8.4kg
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
            createdLotId: targetLotId,
            lotNumber: 'LOT-RST-FLR-001',
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
          },
          {
            costCategory: 'ENERGY_UTILITIES',
            allocatedAmount: '25000',
            currency: 'IDR',
            allocationBasis: 'BATCH_FIXED'
          }
        ],
        provenanceEdges: [
          {
            sourceLotId: seedCtx.lotFloresGreen,
            targetLotId: targetLotId,
            consumedQuantity: '10',
            uom: 'KG'
          }
        ]
      })
    });

    const completeJson = (await completeRes.json()) as any;
    if (completeRes.status !== 200) {
      console.error('Scenario A failed with error:', completeJson);
    }
    assert.equal(completeRes.status, 200);
    assert.equal(completeJson.data.status, 'COMPLETED');
    assert.equal(completeJson.data.consumedInputCount, 1);
    assert.equal(completeJson.data.createdOutputLotCount, 1);
    assert.equal(completeJson.data.totalEconomicPool.amount, '1275000');

    // 3. Inspect Transformation
    const inspectRes = await fetch(`${baseUrl}/api/transformations/${txId}`);
    assert.equal(inspectRes.status, 200);
    const inspectJson = (await inspectRes.json()) as any;

    const tx = inspectJson.data.transformation;
    assert.equal(tx.status, 'COMPLETED');
    assert.equal(tx.inputs.length, 1);
    assert.equal(tx.outputs.length, 1);
    assert.equal(tx.outputs[0].outputType, 'PRIMARY_PRODUCT');
    assert.equal(tx.outputs[0].lot.lotNumber, 'LOT-RST-FLR-001');
    assert.equal(Number(tx.outputs[0].lot.quantityOnHand.amount), 8.4);
    assert.equal(Number(tx.outputs[0].valuation.totalLotCost.amount), 1275000);

    // Provenance Check
    assert.equal(inspectJson.data.provenanceEdges.length, 1);
    assert.equal(inspectJson.data.provenanceEdges[0].sourceLotNumber, 'LOT-GRN-FLORES-001');
    assert.equal(inspectJson.data.provenanceEdges[0].targetLotNumber, 'LOT-RST-FLR-001');
  });

  // 3. Scenario C (N:M Multi-Origin Blend with Co-Product & Waste)
  it('3. Scenario C: N:M Transformation produces primary + secondary output and unrecoverable waste without lot creation', async () => {
    const generateUuid = () => '018f3c00-0000-7000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    const txId = generateUuid();
    const batchId = generateUuid();
    const priLotId = generateUuid();
    const secLotId = generateUuid();

    // 1. Start transformation & batch
    const startRes = await fetch(`${baseUrl}/api/transformations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transformationId: txId,
        batchId: batchId,
        transformationNumber: 'TX-ROAST-NM-001',
        batchNumber: 'BATCH-ROAST-NM-001',
        recipeOrProfileId: 'Split Roast with Chaff',
        archetype: 'ROASTING'
      })
    });
    assert.equal(startRes.status, 201);

    // 2. Complete: 10kg Flores + 10kg Colombia -> 14kg Primary + 2kg Secondary + 0.5kg Chaff Waste
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
          },
          {
            inventoryLotId: seedCtx.lotColombiaGreen,
            materialId: seedCtx.greenColombia,
            plannedQuantity: '10',
            actualQuantityConsumed: '10',
            uom: 'KG'
          }
        ],
        outputs: [
          {
            createdLotId: priLotId,
            lotNumber: 'LOT-RST-PRI-001',
            materialId: seedCtx.roastedHouseBlend,
            outputType: 'PRIMARY_PRODUCT',
            actualQuantityProduced: '14.0',
            uom: 'KG'
          },
          {
            createdLotId: secLotId,
            lotNumber: 'LOT-RST-SEC-001',
            materialId: seedCtx.roastedColombia,
            outputType: 'CO_PRODUCT',
            actualQuantityProduced: '2.0',
            uom: 'KG'
          },
          {
            materialId: seedCtx.chaffWaste,
            outputType: 'UNRECOVERABLE_WASTE',
            actualQuantityProduced: '0.5',
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
        ],
        provenanceEdges: [
          {
            sourceLotId: seedCtx.lotFloresGreen,
            targetLotId: priLotId,
            consumedQuantity: '10',
            uom: 'KG'
          },
          {
            sourceLotId: seedCtx.lotColombiaGreen,
            targetLotId: priLotId,
            consumedQuantity: '10',
            uom: 'KG'
          }
        ]
      })
    });

    assert.equal(completeRes.status, 200);
    const completeJson = (await completeRes.json()) as any;
    assert.equal(completeJson.data.consumedInputCount, 2);
    assert.equal(completeJson.data.createdOutputLotCount, 2, 'Only 2 lots should be created for physical outputs, waste has no lot');

    // 3. Inspect Transformation Inspector
    const inspectRes = await fetch(`${baseUrl}/api/transformations/${txId}`);
    assert.equal(inspectRes.status, 200);
    const inspectJson = (await inspectRes.json()) as any;

    const tx = inspectJson.data.transformation;
    assert.equal(tx.inputs.length, 2);
    assert.equal(tx.outputs.length, 3);

    const wasteOutput = tx.outputs.find((o: any) => o.outputType === 'UNRECOVERABLE_WASTE');
    assert.ok(wasteOutput, 'Waste output should be in transformation ledger');
    assert.equal(wasteOutput.createdLotId, null, 'Waste output MUST have null createdLotId');
    assert.equal(wasteOutput.lot, null, 'Waste output MUST have null lot object');

    const primaryOutput = tx.outputs.find((o: any) => o.outputType === 'PRIMARY_PRODUCT');
    assert.ok(primaryOutput);
    assert.equal(primaryOutput.lot.lotNumber, 'LOT-RST-PRI-001');

    // Provenance Check: 2 edges connecting both source lots to primary target lot
    assert.equal(inspectJson.data.provenanceEdges.length, 2);
  });

  // 4. Over-consumption rejection
  it('4. Over-consumption should be rejected with InsufficientLotQuantityError at the domain boundary', async () => {
    const generateUuid = () => '018f3d00-0000-7000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    const txId = generateUuid();
    const batchId = generateUuid();

    // Start transformation
    await fetch(`${baseUrl}/api/transformations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transformationId: txId,
        batchId: batchId,
        transformationNumber: 'TX-ROAST-OVER-001',
        batchNumber: 'BATCH-ROAST-OVER-001',
        recipeOrProfileId: 'Flores Light Filter',
        archetype: 'ROASTING'
      })
    });

    // Attempt to consume 1,000kg from Flores lot (available is < 60kg)
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
            plannedQuantity: '1000',
            actualQuantityConsumed: '1000',
            uom: 'KG'
          }
        ],
        outputs: [
          {
            materialId: seedCtx.roastedFlores,
            outputType: 'PRIMARY',
            actualQuantityProduced: '840',
            uom: 'KG',
            lotNumber: 'LOT-RST-FAIL-001'
          }
        ]
      })
    });

    assert.equal(completeRes.status, 400);
    const json = (await completeRes.json()) as any;
    assert.ok(json.error.includes('Insufficient available quantity') || json.errorName.includes('InsufficientLotQuantityError'));
  });
});
