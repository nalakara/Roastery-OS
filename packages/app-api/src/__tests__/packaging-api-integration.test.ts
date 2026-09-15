import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { newDb } from 'pg-mem';
import pg from 'pg';
import { createApiServer, seedDatabase, SeedContext } from '../index.js';

describe('App-API Packaging & Finished Goods Vertical Slice Integration Tests (Phase 6C)', () => {
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

  // 1. Available Production Inputs
  it('1. GET /api/production-inputs returns active intermediate roasted coffee lots and packaging material lots with valuation and available qty', async () => {
    const res = await fetch(`${baseUrl}/api/production-inputs`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length >= 5, 'Should return both roasted coffee and packaging lots');

    const roastedFlores = json.data.find((l: any) => l.lotNumber === 'LOT-RST-FLORES-001');
    assert.ok(roastedFlores, 'Flores roasted lot should be present');
    assert.equal(roastedFlores.materialCategory, 'INTERMEDIARY_COFFEE');
    assert.equal(roastedFlores.lotState, 'ACTIVE');
    assert.equal(Number(roastedFlores.availableQuantity.amount), 25);
    assert.ok(roastedFlores.unitCost);
    assert.equal(Math.round(Number(roastedFlores.unitCost.unitPrice)), 151786);

    const pouch1kg = json.data.find((l: any) => l.lotNumber === 'LOT-PKG-POUCH-1KG-001');
    assert.ok(pouch1kg, '1KG pouch packaging lot should be present');
    assert.equal(pouch1kg.materialCategory, 'PACKAGING_MATERIAL');
    assert.equal(Number(pouch1kg.availableQuantity.amount), 100);
    assert.equal(Number(pouch1kg.unitCost.unitPrice), 2500);
  });

  // 2. Commercial Catalog (Products and SKUs)
  it('2. GET /api/products and GET /api/skus return accurate commercial entities and calculate available stock from finished lots', async () => {
    const prodRes = await fetch(`${baseUrl}/api/products`);
    assert.equal(prodRes.status, 200);
    const prodJson = (await prodRes.json()) as any;
    assert.ok(Array.isArray(prodJson.data));
    assert.ok(prodJson.data.length >= 2);
    const floresProd = prodJson.data.find((p: any) => p.code === 'PROD-FLORES-SO');
    assert.ok(floresProd, 'Flores Single Origin product should exist');

    const skuRes = await fetch(`${baseUrl}/api/skus`);
    assert.equal(skuRes.status, 200);
    const skuJson = (await skuRes.json()) as any;
    assert.ok(Array.isArray(skuJson.data));
    assert.ok(skuJson.data.length >= 4);

    const sku1kg = skuJson.data.find((s: any) => s.skuCode === 'SKU-FLORES-1KG-WB');
    assert.ok(sku1kg, 'Flores 1kg SKU should exist');
    assert.equal(sku1kg.packagingType, 'BAG_1KG');
    assert.equal(Number(sku1kg.baseRetailPrice.amount), 280000);
    assert.equal(sku1kg.productName, 'Flores Bajawa Single Origin Series');
  });

  // 3. Scenario A: Whole Bean 1KG Packaging Transformation (Roasted coffee lot + 1kg pouch lot -> Finished Good Lot)
  it('3. Scenario A (1:1 / Multi-Input Packaging): Whole Bean 1KG Packaging creates finished goods lot with combined material & labor valuation', async () => {
    const generateUuid = () => '018f4a00-0000-7000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    const txId = generateUuid();
    const batchId = generateUuid();
    const targetLotId = generateUuid();

    // 1. Start transformation
    const startRes = await fetch(`${baseUrl}/api/transformations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transformationId: txId,
        batchId: batchId,
        transformationNumber: 'TX-PKG-TEST-001',
        batchNumber: 'BATCH-PKG-TEST-001',
        recipeOrProfileId: '1KG Whole Bean Nitrogen Flush Standard',
        archetype: 'PACKAGING'
      })
    });
    assert.equal(startRes.status, 201);

    // 2. Complete transformation:
    // Inputs:
    // - 5 kg Flores Roasted (@ 151,785.7143/kg) = 758,928.5715 IDR
    // - 5 units 1KG Pouch (@ 2,500/ea) = 12,500 IDR
    // Cost Event: Direct Labor = 15,000 IDR
    // Total Economic Pool = 786,428.5715 IDR
    // Output: 5 units of Finished Good (FG-FLORES-1KG-WB)
    const completeRes = await fetch(`${baseUrl}/api/transformations/${txId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId,
        allocationPolicy: 'FULL_ABSORPTION',
        inputs: [
          {
            inventoryLotId: seedCtx.lotFloresRoasted,
            materialId: seedCtx.roastedFlores,
            plannedQuantity: '5',
            actualQuantityConsumed: '5',
            uom: 'KG'
          },
          {
            inventoryLotId: seedCtx.lotPouch1kg,
            materialId: seedCtx.valvePouch,
            plannedQuantity: '5',
            actualQuantityConsumed: '5',
            uom: 'UNIT'
          }
        ],
        outputs: [
          {
            createdLotId: targetLotId,
            lotNumber: 'LOT-FG-FLORES-1KG-001',
            materialId: seedCtx.fgFlores1kg,
            outputType: 'PRIMARY_PRODUCT',
            actualQuantityProduced: '5',
            uom: 'UNIT'
          }
        ],
        costEvents: [
          {
            costCategory: 'DIRECT_LABOR',
            allocatedAmount: '15000',
            currency: 'IDR',
            allocationBasis: 'BATCH_FIXED'
          }
        ],
        provenanceEdges: [
          {
            sourceLotId: seedCtx.lotFloresRoasted,
            targetLotId: targetLotId,
            consumedQuantity: '5',
            uom: 'KG'
          },
          {
            sourceLotId: seedCtx.lotPouch1kg,
            targetLotId: targetLotId,
            consumedQuantity: '5',
            uom: 'UNIT'
          }
        ]
      })
    });

    const completeJson = (await completeRes.json()) as any;
    if (completeRes.status !== 200) {
      console.error('Packaging Scenario A failed:', completeJson);
    }
    assert.equal(completeRes.status, 200);
    assert.equal(completeJson.data.status, 'COMPLETED');
    assert.equal(completeJson.data.consumedInputCount, 2, 'Should consume both bulk coffee and physical pouches');
    assert.equal(completeJson.data.createdOutputLotCount, 1);
    assert.equal(completeJson.data.totalEconomicPool.amount, '786428.5715');

    // 3. Inspect Transformation Inspector
    const inspectRes = await fetch(`${baseUrl}/api/transformations/${txId}`);
    assert.equal(inspectRes.status, 200);
    const inspectJson = (await inspectRes.json()) as any;

    const tx = inspectJson.data.transformation;
    assert.equal(tx.status, 'COMPLETED');
    assert.equal(tx.archetype, 'ASSEMBLY_PACKAGING');
    assert.equal(tx.inputs.length, 2);
    assert.equal(tx.outputs.length, 1);

    const fgOutput = tx.outputs[0];
    assert.equal(fgOutput.lot.lotNumber, 'LOT-FG-FLORES-1KG-001');
    assert.equal(Number(fgOutput.lot.quantityOnHand.amount), 5);
    assert.equal(Number(fgOutput.valuation.totalLotCost.amount), 786428.5715);

    // Multi-parent DAG Provenance Verification
    assert.equal(inspectJson.data.provenanceEdges.length, 2, 'Must have 2 provenance edges (coffee + packaging)');
    const coffeeEdge = inspectJson.data.provenanceEdges.find((e: any) => e.sourceLotNumber === 'LOT-RST-FLORES-001');
    const pouchEdge = inspectJson.data.provenanceEdges.find((e: any) => e.sourceLotNumber === 'LOT-PKG-POUCH-1KG-001');
    assert.ok(coffeeEdge, 'Coffee provenance edge must exist');
    assert.ok(pouchEdge, 'Pouch packaging provenance edge must exist');
    assert.equal(coffeeEdge.targetLotNumber, 'LOT-FG-FLORES-1KG-001');
    assert.equal(pouchEdge.targetLotNumber, 'LOT-FG-FLORES-1KG-001');

    // 4. Verify SKU reference link
    const skuRes = await fetch(`${baseUrl}/api/skus`);
    const skuJson = (await skuRes.json()) as any;
    const sku1kg = skuJson.data.find((s: any) => s.skuCode === 'SKU-FLORES-1KG-WB');
    assert.ok(sku1kg);
    assert.equal(Number(sku1kg.availableStockUnits), 32, 'Available sellable stock should now be 32 units (27 seeded + 5 produced)');
  });

  // 4. Scenario B: Grinding & Packaging (Roasted Coffee -> Ground Coffee + 250G Pouches -> Finished Good Lot)
  it('4. Scenario B: Grinding & Packaging produces 250g ground finished goods with correct inventory and costing', async () => {
    const generateUuid = () => '018f4b00-0000-7000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    const txId = generateUuid();
    const batchId = generateUuid();
    const targetLotId = generateUuid();

    // Start transformation
    await fetch(`${baseUrl}/api/transformations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transformationId: txId,
        batchId: batchId,
        transformationNumber: 'TX-PKG-GRD-001',
        batchNumber: 'BATCH-PKG-GRD-001',
        recipeOrProfileId: 'Medium-Fine Drip Grind & Pack',
        archetype: 'PACKAGING'
      })
    });

    // 2.5 kg Flores Roasted (@ 151,785.7143/kg) = 379,464.28575 IDR
    // 10 pouches 250G (@ 1,800/ea) = 18,000 IDR
    // Labor = 10,000 IDR
    // Total = 407,464.28575 IDR
    const completeRes = await fetch(`${baseUrl}/api/transformations/${txId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId,
        allocationPolicy: 'FULL_ABSORPTION',
        inputs: [
          {
            inventoryLotId: seedCtx.lotFloresRoasted,
            materialId: seedCtx.roastedFlores,
            plannedQuantity: '2.5',
            actualQuantityConsumed: '2.5',
            uom: 'KG'
          },
          {
            inventoryLotId: seedCtx.lotPouch250g,
            materialId: seedCtx.pouch250g,
            plannedQuantity: '10',
            actualQuantityConsumed: '10',
            uom: 'UNIT'
          }
        ],
        outputs: [
          {
            createdLotId: targetLotId,
            lotNumber: 'LOT-FG-FLORES-250G-001',
            materialId: seedCtx.fgFlores250gGrd,
            outputType: 'PRIMARY_PRODUCT',
            actualQuantityProduced: '10',
            uom: 'UNIT'
          }
        ],
        costEvents: [
          {
            costCategory: 'DIRECT_LABOR',
            allocatedAmount: '10000',
            currency: 'IDR',
            allocationBasis: 'BATCH_FIXED'
          }
        ],
        provenanceEdges: [
          {
            sourceLotId: seedCtx.lotFloresRoasted,
            targetLotId: targetLotId,
            consumedQuantity: '2.5',
            uom: 'KG'
          },
          {
            sourceLotId: seedCtx.lotPouch250g,
            targetLotId: targetLotId,
            consumedQuantity: '10',
            uom: 'UNIT'
          }
        ]
      })
    });

    assert.equal(completeRes.status, 200);
    const completeJson = (await completeRes.json()) as any;
    assert.equal(completeJson.data.status, 'COMPLETED');
    assert.equal(completeJson.data.totalEconomicPool.amount, '407464.28575');
  });

  // 5. Scenario C: Drip Bag Production (Roasted Coffee + Drip Box Kit -> 10-Pack Drip Box Finished Good)
  it('5. Scenario C: Drip Bag Box Production consumes coffee + packaging kits into finished goods', async () => {
    const generateUuid = () => '018f4c00-0000-7000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    const txId = generateUuid();
    const batchId = generateUuid();
    const targetLotId = generateUuid();

    // Start transformation
    await fetch(`${baseUrl}/api/transformations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transformationId: txId,
        batchId: batchId,
        transformationNumber: 'TX-PKG-DRIP-001',
        batchNumber: 'BATCH-PKG-DRIP-001',
        recipeOrProfileId: '10-Pack Nitrogen Drip Bag Assemble',
        archetype: 'PACKAGING'
      })
    });

    // 1.2 kg Flores Roasted @ 151,785.7143/kg = 182,142.85716 IDR
    // 10 Drip Kit sets @ 4,500/set = 45,000 IDR
    // Direct Labor = 20,000 IDR
    // Total = 247,142.85716 IDR
    const completeRes = await fetch(`${baseUrl}/api/transformations/${txId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId,
        allocationPolicy: 'FULL_ABSORPTION',
        inputs: [
          {
            inventoryLotId: seedCtx.lotFloresRoasted,
            materialId: seedCtx.roastedFlores,
            plannedQuantity: '1.2',
            actualQuantityConsumed: '1.2',
            uom: 'KG'
          },
          {
            inventoryLotId: seedCtx.lotDripSet,
            materialId: seedCtx.dripFilterSet,
            plannedQuantity: '10',
            actualQuantityConsumed: '10',
            uom: 'UNIT'
          }
        ],
        outputs: [
          {
            createdLotId: targetLotId,
            lotNumber: 'LOT-FG-FLORES-DRIP-001',
            materialId: seedCtx.fgFloresDrip10pk,
            outputType: 'PRIMARY_PRODUCT',
            actualQuantityProduced: '10',
            uom: 'UNIT'
          }
        ],
        costEvents: [
          {
            costCategory: 'DIRECT_LABOR',
            allocatedAmount: '20000',
            currency: 'IDR',
            allocationBasis: 'BATCH_FIXED'
          }
        ],
        provenanceEdges: [
          {
            sourceLotId: seedCtx.lotFloresRoasted,
            targetLotId: targetLotId,
            consumedQuantity: '1.2',
            uom: 'KG'
          },
          {
            sourceLotId: seedCtx.lotDripSet,
            targetLotId: targetLotId,
            consumedQuantity: '10',
            uom: 'UNIT'
          }
        ]
      })
    });

    assert.equal(completeRes.status, 200);
    const completeJson = (await completeRes.json()) as any;
    assert.equal(completeJson.data.status, 'COMPLETED');
    assert.equal(completeJson.data.totalEconomicPool.amount, '247142.85716');
  });

  // 6. Packaging Material Over-consumption Rejection
  it('6. Attempting to consume more packaging lots than available is rejected by domain balance checks', async () => {
    const generateUuid = () => '018f4d00-0000-7000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    const txId = generateUuid();
    const batchId = generateUuid();

    // Start transformation
    await fetch(`${baseUrl}/api/transformations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transformationId: txId,
        batchId: batchId,
        transformationNumber: 'TX-PKG-OVER-001',
        batchNumber: 'BATCH-PKG-OVER-001',
        recipeOrProfileId: 'Overconsume Test',
        archetype: 'PACKAGING'
      })
    });

    // Try to consume 99,999 pouches (we only seeded 200)
    const completeRes = await fetch(`${baseUrl}/api/transformations/${txId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchId,
        allocationPolicy: 'FULL_ABSORPTION',
        inputs: [
          {
            inventoryLotId: seedCtx.lotFloresRoasted,
            materialId: seedCtx.roastedFlores,
            plannedQuantity: '1',
            actualQuantityConsumed: '1',
            uom: 'KG'
          },
          {
            inventoryLotId: seedCtx.lotPouch1kg,
            materialId: seedCtx.valvePouch,
            plannedQuantity: '99999',
            actualQuantityConsumed: '99999',
            uom: 'UNIT'
          }
        ],
        outputs: [
          {
            materialId: seedCtx.fgFlores1kg,
            outputType: 'PRIMARY_PRODUCT',
            actualQuantityProduced: '1',
            uom: 'UNIT',
            lotNumber: 'LOT-FG-FAIL-001'
          }
        ]
      })
    });

    assert.equal(completeRes.status, 400);
    const json = (await completeRes.json()) as any;
    assert.ok(json.error.includes('Insufficient available quantity') || json.errorName.includes('InsufficientLotQuantityError'));
  });
});
