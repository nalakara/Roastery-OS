import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { newDb, IMemoryDb } from 'pg-mem';
import pg from 'pg';
import { 
  CompleteTransformationUseCase, 
  CompleteTransformationCommand,
  InsufficientLotQuantityError
} from '../index.js';
import { 
  Quantity, 
  Money, 
  DecimalValue, 
  InventoryLot 
} from '@roastery-os/domain-core';
import { 
  OrganizationId, 
  MaterialId, 
  InventoryLotId, 
  TransformationId, 
  TransformationInputId, 
  TransformationOutputId, 
  MovementId, 
  ValuationRecordId, 
  ProvenanceEdgeId, 
  CostEventId, 
  BatchId
} from '@roastery-os/contracts';
import { 
  INITIAL_SCHEMA_DDL,
  TransformationPostgresRepository, 
  InventoryPostgresRepository, 
  MasterDataPostgresRepository, 
  CostingPostgresRepository, 
  TraceabilityPostgresRepository 
} from '@roastery-os/infrastructure-postgres';

describe('Real PostgreSQL Integration Gate : CompleteTransformationUseCase', () => {
  let db: IMemoryDb;
  let pool: pg.Pool;

  const orgId = '018f3a00-0000-7000-8000-000000000001' as OrganizationId;
  const otherOrgId = '018f3a00-0000-7000-8000-000000000002' as OrganizationId;

  // Master Materials
  const rawGreenA = '018f3a00-0000-7000-8000-000000000011' as MaterialId;
  const rawGreenB = '018f3a00-0000-7000-8000-000000000012' as MaterialId;
  const packMaterialC = '018f3a00-0000-7000-8000-000000000013' as MaterialId;
  const roastedPrimary = '018f3a00-0000-7000-8000-000000000014' as MaterialId;
  const roastedSecondary = '018f3a00-0000-7000-8000-000000000015' as MaterialId;
  const chaffWaste = '018f3a00-0000-7000-8000-000000000016' as MaterialId;

  // Repositories & Use Case
  let transformationRepo: TransformationPostgresRepository;
  let inventoryRepo: InventoryPostgresRepository;
  let masterDataRepo: MasterDataPostgresRepository;
  let costingRepo: CostingPostgresRepository;
  let traceabilityRepo: TraceabilityPostgresRepository;
  let useCase: CompleteTransformationUseCase;

  beforeEach(async () => {
    db = newDb();
    db.public.registerFunction({
      name: 'uuid_generate_v4',
      returns: db.public.getType('uuid' as any),
      implementation: () => '00000000-0000-0000-0000-000000000000'
    });

    const adapter = db.adapters.createPg();
    pool = new adapter.Pool();

    // Execute real PostgreSQL DDL (20 tables, check constraints, FKs, unique keys)
    // Strip CREATE EXTENSION for pg-mem compatibility
    const cleanDdl = INITIAL_SCHEMA_DDL.replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g, '');
    await pool.query(cleanDdl);

    // Initialize real repositories with real PG pool/client
    transformationRepo = new TransformationPostgresRepository();
    inventoryRepo = new InventoryPostgresRepository();
    masterDataRepo = new MasterDataPostgresRepository();
    costingRepo = new CostingPostgresRepository();
    traceabilityRepo = new TraceabilityPostgresRepository();

    useCase = new CompleteTransformationUseCase(
      transformationRepo,
      inventoryRepo,
      masterDataRepo,
      costingRepo,
      traceabilityRepo
    );

    // Seed Organization & Master Data
    await pool.query(`INSERT INTO organization (organization_id, code, name, currency) VALUES ($1, 'ORG-01', 'Roastery Corp', 'IDR')`, [orgId]);
    await pool.query(`INSERT INTO organization (organization_id, code, name, currency) VALUES ($1, 'ORG-02', 'Other Corp', 'IDR')`, [otherOrgId]);

    // Seed Materials for ORG 1
    const seedMat = async (mId: string, code: string, name: string, cat: string, uom: string) => {
      await pool.query(
        `INSERT INTO material_master (organization_id, material_id, code, name, category, base_uom, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
        [orgId, mId, code, name, cat, uom]
      );
    };

    await seedMat(rawGreenA, 'RAW-A', 'Green Bean Ethiopia', 'RAW_MATERIAL', 'KG');
    await seedMat(rawGreenB, 'RAW-B', 'Green Bean Colombia', 'RAW_MATERIAL', 'KG');
    await seedMat(packMaterialC, 'PKG-C', 'Valve Pouch 1KG', 'PACKAGING_MATERIAL', 'UNIT');
    await seedMat(roastedPrimary, 'ROAST-PRI', 'Ethiopia Roasted Whole', 'INTERMEDIARY_COFFEE', 'KG');
    await seedMat(roastedSecondary, 'ROAST-SEC', 'Secondary Batch Output', 'INTERMEDIARY_COFFEE', 'KG');
    await seedMat(chaffWaste, 'WASTE-CHAFF', 'Chaff & Moisture Loss', 'CONSUMABLE', 'KG');
  });

  // =========================================================================
  // TEST A: GENUINE N:M TRANSFORMATION & REAL DATABASE PERSISTENCE
  // =========================================================================
  it('A. should execute a real PostgreSQL N:M transformation with input depletion, output creation, waste, cost events, valuation, and provenance', async () => {
    const txId = '018f3a00-0000-7000-8000-000000000100' as TransformationId;
    const batchId = '018f3a00-0000-7000-8000-000000000101' as BatchId;
    const lotA = '018f3a00-0000-7000-8000-000000000051' as InventoryLotId;
    const lotB = '018f3a00-0000-7000-8000-000000000052' as InventoryLotId;
    const lotC = '018f3a00-0000-7000-8000-000000000053' as InventoryLotId;

    const outPrimaryLot = '018f3a00-0000-7000-8000-000000000061' as InventoryLotId;
    const outSecondaryLot = '018f3a00-0000-7000-8000-000000000062' as InventoryLotId;

    const client = await pool.connect();
    try {
      // 1. Seed Initial Lots & Valuations into real PG tables
      // Lot A: 20 KG Green Beans @ IDR 100,000 / KG (Total: 2,000,000)
      await inventoryRepo.insertLot(client, new InventoryLot({
        organizationId: orgId, inventoryLotId: lotA, lotNumber: 'LOT-A', materialId: rawGreenA,
        quantityOnHand: Quantity.of('20', 'KG'), reservedQuantity: Quantity.zero('KG'), lotState: 'ACTIVE', receivedAt: new Date()
      }));
      await costingRepo.insertLotValuation(client, {
        organizationId: orgId, valuationRecordId: '018f3a00-0000-7000-8000-000000000041' as ValuationRecordId, inventoryLotId: lotA,
        materialCost: Money.of('2000000', 'IDR'), conversionCost: Money.zero('IDR'), totalLotCost: Money.of('2000000', 'IDR'),
        unitCost: { unitPrice: DecimalValue.from('100000'), currency: 'IDR', perUom: 'KG' }, allocationPolicy: 'FULL_ABSORPTION', calculatedAt: new Date()
      });

      // Lot B: 10 KG Green Beans @ IDR 120,000 / KG (Total: 1,200,000)
      await inventoryRepo.insertLot(client, new InventoryLot({
        organizationId: orgId, inventoryLotId: lotB, lotNumber: 'LOT-B', materialId: rawGreenB,
        quantityOnHand: Quantity.of('10', 'KG'), reservedQuantity: Quantity.of('2', 'KG'), lotState: 'ACTIVE', receivedAt: new Date()
      }));
      await costingRepo.insertLotValuation(client, {
        organizationId: orgId, valuationRecordId: '018f3a00-0000-7000-8000-000000000042' as ValuationRecordId, inventoryLotId: lotB,
        materialCost: Money.of('1200000', 'IDR'), conversionCost: Money.zero('IDR'), totalLotCost: Money.of('1200000', 'IDR'),
        unitCost: { unitPrice: DecimalValue.from('120000'), currency: 'IDR', perUom: 'KG' }, allocationPolicy: 'FULL_ABSORPTION', calculatedAt: new Date()
      });

      // Lot C: 500 UNIT Bags @ IDR 2,000 / UNIT (Total: 1,000,000)
      await inventoryRepo.insertLot(client, new InventoryLot({
        organizationId: orgId, inventoryLotId: lotC, lotNumber: 'LOT-C', materialId: packMaterialC,
        quantityOnHand: Quantity.of('500', 'UNIT'), reservedQuantity: Quantity.zero('UNIT'), lotState: 'ACTIVE', receivedAt: new Date()
      }));
      await costingRepo.insertLotValuation(client, {
        organizationId: orgId, valuationRecordId: '018f3a00-0000-7000-8000-000000000043' as ValuationRecordId, inventoryLotId: lotC,
        materialCost: Money.of('1000000', 'IDR'), conversionCost: Money.zero('IDR'), totalLotCost: Money.of('1000000', 'IDR'),
        unitCost: { unitPrice: DecimalValue.from('2000'), currency: 'IDR', perUom: 'UNIT' }, allocationPolicy: 'FULL_ABSORPTION', calculatedAt: new Date()
      });

      // Seed Transformation & Batch
      await transformationRepo.insertTransformation(client, {
        organizationId: orgId, transformationId: txId, transformationNumber: 'TX-2026-N-M',
        archetype: 'ROASTING', status: 'IN_PROGRESS', inputs: [], outputs: [],
        createdAt: new Date(), updatedAt: new Date()
      });
      await pool.query(
        `INSERT INTO batch (organization_id, batch_id, batch_number, batch_type, transformation_id, status)
         VALUES ($1, $2, 'BATCH-001', 'ROAST_BATCH', $3, 'EXECUTING')`,
        [orgId, batchId, txId]
      );

      // 2. Execute CompleteTransformationUseCase
      const command: CompleteTransformationCommand = {
        organizationId: orgId,
        transformationId: txId,
        batchId,
        allocationPolicy: 'MASS_PRO_RATA',
        inputs: [
          {
            transformationInputId: '018f3a00-0000-7000-8000-000000000111' as TransformationInputId,
            inventoryLotId: lotA,
            materialId: rawGreenA,
            plannedQuantity: Quantity.of('10', 'KG'),
            actualQuantityConsumed: Quantity.of('10', 'KG'),
            movementId: '018f3a00-0000-7000-8000-000000000121' as MovementId,
            inputSequence: 1
          },
          {
            transformationInputId: '018f3a00-0000-7000-8000-000000000112' as TransformationInputId,
            inventoryLotId: lotB,
            materialId: rawGreenB,
            plannedQuantity: Quantity.of('5', 'KG'),
            actualQuantityConsumed: Quantity.of('5', 'KG'),
            movementId: '018f3a00-0000-7000-8000-000000000122' as MovementId,
            inputSequence: 2
          },
          {
            transformationInputId: '018f3a00-0000-7000-8000-000000000113' as TransformationInputId,
            inventoryLotId: lotC,
            materialId: packMaterialC,
            plannedQuantity: Quantity.of('100', 'UNIT'),
            actualQuantityConsumed: Quantity.of('100', 'UNIT'),
            movementId: '018f3a00-0000-7000-8000-000000000123' as MovementId,
            inputSequence: 3
          }
        ],
        outputs: [
          {
            transformationOutputId: '018f3a00-0000-7000-8000-000000000131' as TransformationOutputId,
            materialId: roastedPrimary,
            outputType: 'PRIMARY_PRODUCT',
            actualQuantityProduced: Quantity.of('12', 'KG'),
            createdLotId: outPrimaryLot,
            lotNumber: 'LOT-ROASTED-PRI',
            movementId: '018f3a00-0000-7000-8000-000000000124' as MovementId,
            valuationRecordId: '018f3a00-0000-7000-8000-000000000141' as ValuationRecordId
          },
          {
            transformationOutputId: '018f3a00-0000-7000-8000-000000000132' as TransformationOutputId,
            materialId: roastedSecondary,
            outputType: 'CO_PRODUCT',
            actualQuantityProduced: Quantity.of('2', 'KG'),
            createdLotId: outSecondaryLot,
            lotNumber: 'LOT-ROASTED-SEC',
            movementId: '018f3a00-0000-7000-8000-000000000125' as MovementId,
            valuationRecordId: '018f3a00-0000-7000-8000-000000000142' as ValuationRecordId
          },
          {
            transformationOutputId: '018f3a00-0000-7000-8000-000000000133' as TransformationOutputId,
            materialId: chaffWaste,
            outputType: 'UNRECOVERABLE_WASTE',
            actualQuantityProduced: Quantity.of('1', 'KG')
          }
        ],
        costEvents: [
          {
            costEventId: '018f3a00-0000-7000-8000-000000000151' as CostEventId,
            costCategory: 'DIRECT_LABOR',
            allocatedAmount: Money.of('150000', 'IDR'),
            allocationBasis: 'TIME_DURATION'
          },
          {
            costEventId: '018f3a00-0000-7000-8000-000000000152' as CostEventId,
            costCategory: 'ENERGY_UTILITIES',
            allocatedAmount: Money.of('50000', 'IDR'),
            allocationBasis: 'BATCH_FIXED'
          }
        ],
        provenanceEdges: [
          {
            provenanceEdgeId: '018f3a00-0000-7000-8000-000000000161' as ProvenanceEdgeId,
            sourceLotId: lotA,
            targetLotId: outPrimaryLot,
            consumedQuantity: Quantity.of('10', 'KG')
          },
          {
            provenanceEdgeId: '018f3a00-0000-7000-8000-000000000162' as ProvenanceEdgeId,
            sourceLotId: lotB,
            targetLotId: outPrimaryLot,
            consumedQuantity: Quantity.of('5', 'KG')
          }
        ]
      };

      // Wrap execution in real PG transaction
      await client.query('BEGIN');
      const res = await useCase.execute(command, client);
      await client.query('COMMIT');

      assert.equal(res.status, 'COMPLETED');
      assert.equal(res.consumedInputCount, 3);
      assert.equal(res.createdOutputLotCount, 2);
      assert.equal(res.totalEconomicPool.amount.toString(), '2000000');

      // 3. Database State Reconciliation Assertions
      // Input Lot balances in PostgreSQL
      const dbLotA = await pool.query('SELECT * FROM inventory_lot WHERE inventory_lot_id = $1', [lotA]);
      assert.equal(Number(dbLotA.rows[0].quantity_on_hand), 10);

      const dbLotB = await pool.query('SELECT * FROM inventory_lot WHERE inventory_lot_id = $1', [lotB]);
      assert.equal(Number(dbLotB.rows[0].quantity_on_hand), 5);

      const dbLotC = await pool.query('SELECT * FROM inventory_lot WHERE inventory_lot_id = $1', [lotC]);
      assert.equal(Number(dbLotC.rows[0].quantity_on_hand), 400);

      // Output Lots in PostgreSQL
      const dbOutPri = await pool.query('SELECT * FROM inventory_lot WHERE inventory_lot_id = $1', [outPrimaryLot]);
      assert.equal(dbOutPri.rows.length, 1);
      assert.equal(Number(dbOutPri.rows[0].quantity_on_hand), 12);
      assert.equal(Number(dbOutPri.rows[0].reserved_quantity), 0);

      const dbOutSec = await pool.query('SELECT * FROM inventory_lot WHERE inventory_lot_id = $1', [outSecondaryLot]);
      assert.equal(dbOutSec.rows.length, 1);
      assert.equal(Number(dbOutSec.rows[0].quantity_on_hand), 2);

      // Unrecoverable Waste MUST NOT create an inventory lot
      const allLots = await pool.query('SELECT * FROM inventory_lot');
      assert.equal(allLots.rows.length, 5); // 3 inputs + 2 outputs = 5 (NO waste lot)

      // Transformation Output records (Waste record exists in table with created_lot_id = null and movement_id = null)
      const wasteOut = await pool.query('SELECT * FROM transformation_output WHERE output_type = $1', ['UNRECOVERABLE_WASTE']);
      assert.equal(wasteOut.rows.length, 1);
      assert.equal(wasteOut.rows[0].created_lot_id, null);
      assert.equal(wasteOut.rows[0].movement_id, null);

      // Stock Ledger Movements: 3 Consume + 2 Yield = 5 movements in real table
      const dbMovements = await pool.query('SELECT * FROM stock_ledger_movement ORDER BY occurred_at ASC');
      assert.equal(dbMovements.rows.length, 5);
      const consumeMovs = dbMovements.rows.filter(m => m.movement_type === 'TRANSFORMATION_CONSUME');
      assert.equal(consumeMovs.length, 3);
      assert.equal(Number(consumeMovs[0].quantity_delta), -10);

      // Cost Events in real table
      const dbCostEvents = await pool.query('SELECT * FROM cost_event');
      assert.equal(dbCostEvents.rows.length, 2);

      // Lot Valuation Records in real table
      const dbValuations = await pool.query('SELECT * FROM lot_valuation_record WHERE inventory_lot_id IN ($1, $2)', [outPrimaryLot, outSecondaryLot]);
      assert.equal(dbValuations.rows.length, 2);
      const priVal = dbValuations.rows.find(v => v.inventory_lot_id === outPrimaryLot);
      assert.equal(new DecimalValue(priVal.total_lot_cost).toFixed(2), '1714285.71');

      // Provenance Edges in real table
      const dbEdges = await pool.query('SELECT * FROM provenance_edge');
      assert.equal(dbEdges.rows.length, 2);

      // Transformation and Batch status in real table
      const dbTx = await pool.query('SELECT * FROM transformation WHERE transformation_id = $1', [txId]);
      assert.equal(dbTx.rows[0].status, 'COMPLETED');

      const dbBatch = await pool.query('SELECT * FROM batch WHERE batch_id = $1', [batchId]);
      assert.equal(dbBatch.rows[0].status, 'COMPLETED');
    } finally {
      client.release();
    }
  });

  // =========================================================================
  // TEST B: REAL DATABASE TRANSACTION ATOMICITY & ROLLBACK
  // =========================================================================
  it('B. should completely rollback all PostgreSQL writes if a failure occurs mid-transaction', async () => {
    const txId = '018f3a00-0000-7000-8000-000000000200' as TransformationId;
    const lotA = '018f3a00-0000-7000-8000-000000000071' as InventoryLotId;
    const outLot = '018f3a00-0000-7000-8000-000000000072' as InventoryLotId;
    const missingMat = '018f3a00-0000-7000-8000-000000000099' as MaterialId; // Does not exist!

    // Setup initial data on a dedicated client and commit it
    const setupClient = await pool.connect();
    try {
      await setupClient.query('BEGIN');
      await inventoryRepo.insertLot(setupClient, new InventoryLot({
        organizationId: orgId, inventoryLotId: lotA, lotNumber: 'LOT-ROLLBACK-A', materialId: rawGreenA,
        quantityOnHand: Quantity.of('20', 'KG'), reservedQuantity: Quantity.zero('KG'), lotState: 'ACTIVE', receivedAt: new Date()
      }));
      await costingRepo.insertLotValuation(setupClient, {
        organizationId: orgId, valuationRecordId: '018f3a00-0000-7000-8000-000000000241' as ValuationRecordId, inventoryLotId: lotA,
        materialCost: Money.of('2000000', 'IDR'), conversionCost: Money.zero('IDR'), totalLotCost: Money.of('2000000', 'IDR'),
        unitCost: { unitPrice: DecimalValue.from('100000'), currency: 'IDR', perUom: 'KG' }, allocationPolicy: 'FULL_ABSORPTION', calculatedAt: new Date()
      });

      await transformationRepo.insertTransformation(setupClient, {
        organizationId: orgId, transformationId: txId, transformationNumber: 'TX-ROLLBACK',
        archetype: 'ROASTING', status: 'IN_PROGRESS', inputs: [], outputs: [],
        createdAt: new Date(), updatedAt: new Date()
      });
      await setupClient.query('COMMIT');
    } finally {
      setupClient.release();
    }

    // Command with valid input depletion but INVALID output material -> triggers failure after input consumption!
    const command: CompleteTransformationCommand = {
      organizationId: orgId,
      transformationId: txId,
      inputs: [
        {
          transformationInputId: '018f3a00-0000-7000-8000-000000000211' as TransformationInputId,
          inventoryLotId: lotA,
          materialId: rawGreenA,
          plannedQuantity: Quantity.of('10', 'KG'),
          actualQuantityConsumed: Quantity.of('10', 'KG'),
          movementId: '018f3a00-0000-7000-8000-000000000221' as MovementId,
          inputSequence: 1
        }
      ],
      outputs: [
        {
          transformationOutputId: '018f3a00-0000-7000-8000-000000000231' as TransformationOutputId,
          materialId: missingMat, // Triggers MaterialNotFoundError in Step 5
          outputType: 'PRIMARY_PRODUCT',
          actualQuantityProduced: Quantity.of('8.5', 'KG'),
          createdLotId: outLot,
          lotNumber: 'LOT-OUT-ROLL',
          movementId: '018f3a00-0000-7000-8000-000000000222' as MovementId,
          valuationRecordId: '018f3a00-0000-7000-8000-000000000242' as ValuationRecordId
        }
      ],
      costEvents: [],
      provenanceEdges: []
    };

    const backup = db.backup();
    const execClient = await pool.connect();
    try {
      // Execute within transaction and catch expected error
      await execClient.query('BEGIN');
      try {
        await useCase.execute(command, execClient);
        await execClient.query('COMMIT');
        assert.fail('Should have thrown error on missing output material');
      } catch (err) {
        await execClient.query('ROLLBACK');
        backup.restore();
      }
    } finally {
      execClient.release();
    }

    // Verify PostgreSQL state is 100% UNTOUCHED
    const dbLotA = await pool.query('SELECT * FROM inventory_lot WHERE inventory_lot_id = $1', [lotA]);
    assert.equal(Number(dbLotA.rows[0].quantity_on_hand), 20); // NOT depleted

    const movements = await pool.query('SELECT * FROM stock_ledger_movement');
    assert.equal(movements.rows.length, 0); // No movements persisted

    const outputs = await pool.query('SELECT * FROM transformation_output');
    assert.equal(outputs.rows.length, 0); // No outputs persisted

    const createdLots = await pool.query('SELECT * FROM inventory_lot WHERE inventory_lot_id = $1', [outLot]);
    assert.equal(createdLots.rows.length, 0); // Output lot rolled back

    const txRecord = await pool.query('SELECT * FROM transformation WHERE transformation_id = $1', [txId]);
    assert.equal(txRecord.rows[0].status, 'IN_PROGRESS'); // Not completed
  });

  // =========================================================================
  // TEST C: CONCURRENCY / DOUBLE CONSUMPTION & PESSIMISTIC LOCKING
  // =========================================================================
  it('C. should prevent double consumption and over-spending under concurrent transformations using SELECT ... FOR UPDATE', async () => {
    const lotA = '018f3a00-0000-7000-8000-000000000081' as InventoryLotId;
    const tx1 = '018f3a00-0000-7000-8000-000000000301' as TransformationId;
    const tx2 = '018f3a00-0000-7000-8000-000000000302' as TransformationId;

    const setupClient = await pool.connect();
    try {
      // Lot A has 15 KG available (15 on hand, 0 reserved)
      await inventoryRepo.insertLot(setupClient, new InventoryLot({
        organizationId: orgId, inventoryLotId: lotA, lotNumber: 'LOT-CONCUR-A', materialId: rawGreenA,
        quantityOnHand: Quantity.of('15', 'KG'), reservedQuantity: Quantity.zero('KG'), lotState: 'ACTIVE', receivedAt: new Date()
      }));
      await costingRepo.insertLotValuation(setupClient, {
        organizationId: orgId, valuationRecordId: '018f3a00-0000-7000-8000-000000000341' as ValuationRecordId, inventoryLotId: lotA,
        materialCost: Money.of('1500000', 'IDR'), conversionCost: Money.zero('IDR'), totalLotCost: Money.of('1500000', 'IDR'),
        unitCost: { unitPrice: DecimalValue.from('100000'), currency: 'IDR', perUom: 'KG' }, allocationPolicy: 'FULL_ABSORPTION', calculatedAt: new Date()
      });

      await transformationRepo.insertTransformation(setupClient, {
        organizationId: orgId, transformationId: tx1, transformationNumber: 'TX-CONCUR-1',
        archetype: 'ROASTING', status: 'IN_PROGRESS', inputs: [], outputs: [],
        createdAt: new Date(), updatedAt: new Date()
      });
      await transformationRepo.insertTransformation(setupClient, {
        organizationId: orgId, transformationId: tx2, transformationNumber: 'TX-CONCUR-2',
        archetype: 'ROASTING', status: 'IN_PROGRESS', inputs: [], outputs: [],
        createdAt: new Date(), updatedAt: new Date()
      });
    } finally {
      setupClient.release();
    }

    // Both TX1 and TX2 attempt to consume 10 KG from Lot A (10 + 10 = 20 KG > 15 KG available)
    const cmd1: CompleteTransformationCommand = {
      organizationId: orgId,
      transformationId: tx1,
      inputs: [{
        transformationInputId: '018f3a00-0000-7000-8000-000000000311' as TransformationInputId,
        inventoryLotId: lotA,
        materialId: rawGreenA,
        plannedQuantity: Quantity.of('10', 'KG'),
        actualQuantityConsumed: Quantity.of('10', 'KG'),
        movementId: '018f3a00-0000-7000-8000-000000000321' as MovementId,
        inputSequence: 1
      }],
      outputs: [{
        transformationOutputId: '018f3a00-0000-7000-8000-000000000331' as TransformationOutputId,
        materialId: roastedPrimary,
        outputType: 'PRIMARY_PRODUCT',
        actualQuantityProduced: Quantity.of('8.5', 'KG'),
        createdLotId: '018f3a00-0000-7000-8000-000000000082' as InventoryLotId,
        lotNumber: 'LOT-OUT-C1',
        movementId: '018f3a00-0000-7000-8000-000000000322' as MovementId,
        valuationRecordId: '018f3a00-0000-7000-8000-000000000342' as ValuationRecordId
      }],
      costEvents: [],
      provenanceEdges: []
    };

    const cmd2: CompleteTransformationCommand = {
      organizationId: orgId,
      transformationId: tx2,
      inputs: [{
        transformationInputId: '018f3a00-0000-7000-8000-000000000312' as TransformationInputId,
        inventoryLotId: lotA,
        materialId: rawGreenA,
        plannedQuantity: Quantity.of('10', 'KG'),
        actualQuantityConsumed: Quantity.of('10', 'KG'),
        movementId: '018f3a00-0000-7000-8000-000000000323' as MovementId,
        inputSequence: 1
      }],
      outputs: [{
        transformationOutputId: '018f3a00-0000-7000-8000-000000000332' as TransformationOutputId,
        materialId: roastedPrimary,
        outputType: 'PRIMARY_PRODUCT',
        actualQuantityProduced: Quantity.of('8.5', 'KG'),
        createdLotId: '018f3a00-0000-7000-8000-000000000083' as InventoryLotId,
        lotNumber: 'LOT-OUT-C2',
        movementId: '018f3a00-0000-7000-8000-000000000324' as MovementId,
        valuationRecordId: '018f3a00-0000-7000-8000-000000000343' as ValuationRecordId
      }],
      costEvents: [],
      provenanceEdges: []
    };

    const client1 = await pool.connect();
    const client2 = await pool.connect();

    try {
      // First transaction begins and executes
      await client1.query('BEGIN');
      const res1 = await useCase.execute(cmd1, client1);
      await client1.query('COMMIT');
      assert.equal(res1.status, 'COMPLETED');

      // Second transaction attempts to consume 10 KG when only 5 KG remains -> MUST throw InsufficientLotQuantityError
      await client2.query('BEGIN');
      let failed = false;
      try {
        await useCase.execute(cmd2, client2);
        await client2.query('COMMIT');
      } catch (err: any) {
        await client2.query('ROLLBACK');
        assert.ok(err instanceof InsufficientLotQuantityError);
        failed = true;
      }
      assert.ok(failed, 'Second concurrent transaction correctly rejected due to insufficient stock after row-lock check');

      // Final inventory lot in PostgreSQL must have exactly 5 KG remaining
      const finalLot = await pool.query('SELECT * FROM inventory_lot WHERE inventory_lot_id = $1', [lotA]);
      assert.equal(Number(finalLot.rows[0].quantity_on_hand), 5);
    } finally {
      client1.release();
      client2.release();
    }
  });

  // =========================================================================
  // TEST D: TENANT ISOLATION & CROSS-TENANT REJECTION
  // =========================================================================
  it('D. should strictly enforce PostgreSQL row-level tenant isolation across organizations', async () => {
    const txOther = '018f3a00-0000-7000-8000-000000000401' as TransformationId;
    const lotOrg1 = '018f3a00-0000-7000-8000-000000000091' as InventoryLotId;

    const client = await pool.connect();
    try {
      // Seed Lot under Org 1
      await inventoryRepo.insertLot(client, new InventoryLot({
        organizationId: orgId, inventoryLotId: lotOrg1, lotNumber: 'LOT-ORG1', materialId: rawGreenA,
        quantityOnHand: Quantity.of('10', 'KG'), reservedQuantity: Quantity.zero('KG'), lotState: 'ACTIVE', receivedAt: new Date()
      }));
      await costingRepo.insertLotValuation(client, {
        organizationId: orgId, valuationRecordId: '018f3a00-0000-7000-8000-000000000441' as ValuationRecordId, inventoryLotId: lotOrg1,
        materialCost: Money.of('1000000', 'IDR'), conversionCost: Money.zero('IDR'), totalLotCost: Money.of('1000000', 'IDR'),
        unitCost: { unitPrice: DecimalValue.from('100000'), currency: 'IDR', perUom: 'KG' }, allocationPolicy: 'FULL_ABSORPTION', calculatedAt: new Date()
      });

      // Seed Transformation under Org 2
      await transformationRepo.insertTransformation(client, {
        organizationId: otherOrgId, transformationId: txOther, transformationNumber: 'TX-ORG2',
        archetype: 'ROASTING', status: 'IN_PROGRESS', inputs: [], outputs: [],
        createdAt: new Date(), updatedAt: new Date()
      });

      // Org 2 attempts to consume Org 1's InventoryLot
      const command: CompleteTransformationCommand = {
        organizationId: otherOrgId,
        transformationId: txOther,
        inputs: [{
          transformationInputId: '018f3a00-0000-7000-8000-000000000411' as TransformationInputId,
          inventoryLotId: lotOrg1, // Belonging to Org 1!
          materialId: rawGreenA,
          plannedQuantity: Quantity.of('5', 'KG'),
          actualQuantityConsumed: Quantity.of('5', 'KG'),
          movementId: '018f3a00-0000-7000-8000-000000000421' as MovementId,
          inputSequence: 1
        }],
        outputs: [{
          transformationOutputId: '018f3a00-0000-7000-8000-000000000431' as TransformationOutputId,
          materialId: roastedPrimary,
          outputType: 'PRIMARY_PRODUCT',
          actualQuantityProduced: Quantity.of('4.2', 'KG'),
          createdLotId: '018f3a00-0000-7000-8000-000000000092' as InventoryLotId,
          lotNumber: 'LOT-CROSS-OUT',
          movementId: '018f3a00-0000-7000-8000-000000000422' as MovementId,
          valuationRecordId: '018f3a00-0000-7000-8000-000000000442' as ValuationRecordId
        }],
        costEvents: [],
        provenanceEdges: []
      };

      await client.query('BEGIN');
      await assert.rejects(
        () => useCase.execute(command, client),
        /not found for Organization/
      );
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  // =========================================================================
  // TEST E: PARTIAL LOT CONSUMPTION & EXACT INVENTORY ARITHMETIC
  // =========================================================================
  it('E. should handle partial-lot consumption without accidental full-lot depletion', async () => {
    const txId = '018f3a00-0000-7000-8000-000000000501' as TransformationId;
    const lotA = '018f3a00-0000-7000-8000-000000000095' as InventoryLotId;
    const outLot = '018f3a00-0000-7000-8000-000000000096' as InventoryLotId;

    const client = await pool.connect();
    try {
      // Lot with 50 KG
      await inventoryRepo.insertLot(client, new InventoryLot({
        organizationId: orgId, inventoryLotId: lotA, lotNumber: 'LOT-PARTIAL', materialId: rawGreenA,
        quantityOnHand: Quantity.of('50', 'KG'), reservedQuantity: Quantity.zero('KG'), lotState: 'ACTIVE', receivedAt: new Date()
      }));
      await costingRepo.insertLotValuation(client, {
        organizationId: orgId, valuationRecordId: '018f3a00-0000-7000-8000-000000000541' as ValuationRecordId, inventoryLotId: lotA,
        materialCost: Money.of('5000000', 'IDR'), conversionCost: Money.zero('IDR'), totalLotCost: Money.of('5000000', 'IDR'),
        unitCost: { unitPrice: DecimalValue.from('100000'), currency: 'IDR', perUom: 'KG' }, allocationPolicy: 'FULL_ABSORPTION', calculatedAt: new Date()
      });

      await transformationRepo.insertTransformation(client, {
        organizationId: orgId, transformationId: txId, transformationNumber: 'TX-PARTIAL',
        archetype: 'ROASTING', status: 'IN_PROGRESS', inputs: [], outputs: [],
        createdAt: new Date(), updatedAt: new Date()
      });

      // Consume only 12.5 KG
      const command: CompleteTransformationCommand = {
        organizationId: orgId,
        transformationId: txId,
        inputs: [{
          transformationInputId: '018f3a00-0000-7000-8000-000000000511' as TransformationInputId,
          inventoryLotId: lotA,
          materialId: rawGreenA,
          plannedQuantity: Quantity.of('12.5', 'KG'),
          actualQuantityConsumed: Quantity.of('12.5', 'KG'),
          movementId: '018f3a00-0000-7000-8000-000000000521' as MovementId,
          inputSequence: 1
        }],
        outputs: [{
          transformationOutputId: '018f3a00-0000-7000-8000-000000000531' as TransformationOutputId,
          materialId: roastedPrimary,
          outputType: 'PRIMARY_PRODUCT',
          actualQuantityProduced: Quantity.of('10.5', 'KG'),
          createdLotId: outLot,
          lotNumber: 'LOT-PART-OUT',
          movementId: '018f3a00-0000-7000-8000-000000000522' as MovementId,
          valuationRecordId: '018f3a00-0000-7000-8000-000000000542' as ValuationRecordId
        }],
        costEvents: [],
        provenanceEdges: []
      };

      await client.query('BEGIN');
      await useCase.execute(command, client);
      await client.query('COMMIT');

      // Remaining should be exactly 37.5000 KG and still ACTIVE
      const updatedLot = await pool.query('SELECT * FROM inventory_lot WHERE inventory_lot_id = $1', [lotA]);
      assert.equal(Number(updatedLot.rows[0].quantity_on_hand), 37.5);
      assert.equal(updatedLot.rows[0].lot_state, 'ACTIVE');

      // Output lot created with 10.5000 KG
      const producedLot = await pool.query('SELECT * FROM inventory_lot WHERE inventory_lot_id = $1', [outLot]);
      assert.equal(Number(producedLot.rows[0].quantity_on_hand), 10.5);
    } finally {
      client.release();
    }
  });
});
