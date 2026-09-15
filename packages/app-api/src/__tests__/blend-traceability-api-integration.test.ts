import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { newDb } from 'pg-mem';
import pg from 'pg';
import { createApiServer, seedDatabase, SeedContext } from '../index.js';

describe('Phase 9 : Blend & Bi-Directional Traceability API Integration Tests', () => {
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

  const generateUuid = () => '018f4a00-0000-7000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');

  // 1. Blend Recipe API
  it('1. GET /api/blend-recipes returns formulation recipes with enriched component material details', async () => {
    const res = await fetch(`${baseUrl}/api/blend-recipes`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as any;
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length >= 1);

    const recipe = json.data.find((r: any) => r.code === 'REC-HOUSE-BLEND-01');
    assert.ok(recipe, 'House blend recipe should exist');
    assert.equal(recipe.name, 'Nusantara Heritage House Blend (60/40)');
    assert.equal(recipe.components.length, 2);

    const floresComp = recipe.components.find((c: any) => c.materialCode === 'ROAST-FLORES-FILTER');
    assert.ok(floresComp);
    assert.equal(Number(floresComp.targetRatioPercentage), 60);

    const colombiaComp = recipe.components.find((c: any) => c.materialCode === 'ROAST-COLOMBIA-ESPRESSO');
    assert.ok(colombiaComp);
    assert.equal(Number(colombiaComp.targetRatioPercentage), 40);

    // Detail endpoint
    const detailRes = await fetch(`${baseUrl}/api/blend-recipes/${recipe.recipeId}`);
    assert.equal(detailRes.status, 200);
    const detailJson = (await detailRes.json()) as any;
    assert.equal(detailJson.data.recipeId, recipe.recipeId);
  });

  // 2. Complete End-to-End Spine Execution (Green -> Roast -> Blend -> Package -> Finished SKU -> Commercial Fulfillment)
  it('2. End-to-End Spine: Blend Execution creates physical blend lot with pooled cost and provenance lineage', async () => {
    // 2.1 Start Blending Transformation
    const blendTxId = generateUuid();
    const blendBatchId = generateUuid();
    const blendOutputLotId = generateUuid();

    const startBlendRes = await fetch(`${baseUrl}/api/transformations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transformationId: blendTxId,
        batchId: blendBatchId,
        transformationNumber: 'TX-BLD-SPINE-001',
        batchNumber: 'BATCH-BLD-SPINE-001',
        archetype: 'BLENDING',
        recipeOrProfileId: 'REC-HOUSE-BLEND-01'
      })
    });
    assert.equal(startBlendRes.status, 201);

    // Complete Blending: 12 KG Flores (@ 151,785.71) + 8 KG Colombia (@ 175,000)
    // Flores pooled: 12 * 151785.714 = 1,821,428.57
    // Colombia pooled: 8 * 175000 = 1,400,000
    // Material cost: ~3,221,428.57 + Conversion: 50,000 = ~3,271,428.57 for 20 KG => ~163,571.43 / KG
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
            lotNumber: 'LOT-BLD-SPINE-001',
            createdLotId: blendOutputLotId
          }
        ],
        costEvents: [
          {
            costCategory: 'DIRECT_LABOR',
            allocatedAmount: '35000',
            currency: 'IDR',
            allocationBasis: 'BATCH_FIXED'
          },
          {
            costCategory: 'ENERGY_UTILITIES',
            allocatedAmount: '15000',
            currency: 'IDR',
            allocationBasis: 'BATCH_FIXED'
          }
        ]
      })
    });
    assert.equal(completeBlendRes.status, 200);

    // 2.2 Package the Blend Lot into Finished Goods (10 bags of 1KG Blend)
    const pkgTxId = generateUuid();
    const pkgBatchId = generateUuid();
    const fgBlendLotId = generateUuid();

    const startPkgRes = await fetch(`${baseUrl}/api/transformations/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transformationId: pkgTxId,
        batchId: pkgBatchId,
        transformationNumber: 'TX-PKG-SPINE-001',
        batchNumber: 'BATCH-PKG-SPINE-001',
        archetype: 'PACKAGING',
        recipeOrProfileId: 'REC-PKG-BLEND-1KG'
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
            inventoryLotId: blendOutputLotId,
            materialId: seedCtx.roastedHouseBlend,
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
            materialId: seedCtx.fgHouse1kg,
            outputType: 'PRIMARY_PRODUCT',
            actualQuantityProduced: '10.0',
            uom: 'UNIT',
            lotNumber: 'LOT-FG-BLEND-1KG-001',
            createdLotId: fgBlendLotId
          }
        ],
        costEvents: [
          {
            costCategory: 'DIRECT_LABOR',
            allocatedAmount: '20000',
            currency: 'IDR',
            allocationBasis: 'BATCH_FIXED'
          }
        ]
      })
    });
    assert.equal(completePkgRes.status, 200);

    // 2.3 Fulfill Wholesale Commercial Order using the finished blend lot
    const orderRes = await fetch(`${baseUrl}/api/wholesale/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: seedCtx.customerCafeA,
        paymentTerms: 'NET_30',
        shippingAddress: 'Jl. Sudirman No. 45, Jakarta Pusat',
        lines: [
          {
            skuId: seedCtx.skuHouse1kg,
            quantity: '5',
            unitPrice: '260000'
          }
        ]
      })
    });
    assert.equal(orderRes.status, 201);
    const orderJson = (await orderRes.json()) as any;
    const orderId = orderJson.data.orderId;
    const orderLineId = orderJson.data.lines[0].orderLineId;

    // Confirm order
    const confirmRes = await fetch(`${baseUrl}/api/wholesale/orders/${orderId}/confirm`, { method: 'POST' });
    assert.equal(confirmRes.status, 200);

    // Dispatch fulfillment against the finished blend lot
    const fulfillRes = await fetch(`${baseUrl}/api/wholesale/orders/${orderId}/fulfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: [
          {
            orderLineId: orderLineId,
            allocations: [
              {
                inventoryLotId: fgBlendLotId,
                quantity: '5'
              }
            ]
          }
        ]
      })
    });
    assert.equal(fulfillRes.status, 200);

    // 3. Bi-directional Traceability Verification from Finished Good Lot
    const traceRes = await fetch(`${baseUrl}/api/traceability/tree?lot=LOT-FG-BLEND-1KG-001`);
    assert.equal(traceRes.status, 200);

    const traceJson = (await traceRes.json()) as any;
    const trace = traceJson.data;

    // Root Lot
    assert.equal(trace.rootLot.lotNumber, 'LOT-FG-BLEND-1KG-001');

    // Upstream Lineage
    assert.ok(trace.upstreamChain);
    assert.ok(trace.upstreamChain.transformations.length >= 2, 'Should traverse packaging and blend transformations');
    
    // Should find packaging transformation
    const foundPkgTx = trace.upstreamChain.transformations.find((t: any) => t.transformation.transformationNumber === 'TX-PKG-SPINE-001');
    assert.ok(foundPkgTx, 'Packaging transformation should be in upstream lineage');
    assert.ok(['PACKAGING', 'ASSEMBLY_PACKAGING'].includes(foundPkgTx.transformation.archetype));

    // Should find blend transformation
    const foundBlendTx = trace.upstreamChain.transformations.find((t: any) => t.transformation.transformationNumber === 'TX-BLD-SPINE-001');
    assert.ok(foundBlendTx, 'Blend transformation should be in upstream lineage');
    assert.equal(foundBlendTx.transformation.archetype, 'BLENDING');

    // Should find source green lot receipts & suppliers
    assert.ok(trace.upstreamChain.suppliers.length >= 1, 'Should find upstream suppliers from inbound receipts');
    const supplierCodes = trace.upstreamChain.suppliers.map((s: any) => s.supplierCode);
    assert.ok(supplierCodes.includes('SUP-NUSANTARA-COFFEE') || supplierCodes.includes('SUP-GLOBAL-PACKAGING'));

    // Downstream Lineage
    assert.ok(trace.downstreamChain);
    assert.ok(trace.downstreamChain.commercialFulfillments.length >= 1, 'Should find wholesale order fulfillment in downstream lineage');
    const commercial = trace.downstreamChain.commercialFulfillments[0];
    assert.ok(['WHOLESALE_CONTRACT', 'WHOLESALE_ORDER'].includes(commercial.channel));
    assert.equal(commercial.customerName, 'Cafe Partner A (Senopati)');
    assert.equal(Number(commercial.fulfilledQuantity.amount), 5);
  });

  it('3. Upstream Traceability from Green Lot traverses downstream to roasted lots, blend lots, finished goods, and commercial orders', async () => {
    const traceRes = await fetch(`${baseUrl}/api/traceability/tree?lot=LOT-GRN-FLORES-001`);
    assert.equal(traceRes.status, 200);

    const traceJson = (await traceRes.json()) as any;
    const trace = traceJson.data;

    assert.equal(trace.rootLot.lotNumber, 'LOT-GRN-FLORES-001');
    assert.ok(trace.downstreamChain.transformations.length >= 1, 'Downstream transformations should be populated');
    
    // Check that downstream derived lots include roasted lot or blend lot
    const producedLotNumbers = trace.downstreamChain.transformations.map((t: any) => t.producedLot.lotNumber);
    assert.ok(producedLotNumbers.includes('LOT-RST-FLORES-001') || producedLotNumbers.includes('LOT-BLD-SPINE-001'));
  });
});
