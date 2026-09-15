import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { 
  CompleteTransformationUseCase, 
  CompleteTransformationCommand,
  TransformationNotFoundError,
  InsufficientLotQuantityError,
  MaterialIdentityMismatchError
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
  BatchId,
  TransformationContract,
  MaterialMasterContract,
  StockLedgerMovementContract,
  LotValuationRecordContract,
  CostEventContract,
  ProvenanceEdgeContract,
  TransformationInputContract,
  TransformationOutputContract
} from '@roastery-os/contracts';
import { 
  TransformationPostgresRepository, 
  InventoryPostgresRepository, 
  MasterDataPostgresRepository, 
  CostingPostgresRepository, 
  TraceabilityPostgresRepository 
} from '@roastery-os/infrastructure-postgres';

const dummyClient = {} as pg.PoolClient;

describe('Transformation Execution & Yield : Generic N:M Vertical Slice Tests', () => {
  const orgId = '018f3a00-0000-7000-8000-000000000001' as OrganizationId;
  const otherOrgId = '018f3a00-0000-7000-8000-000000000002' as OrganizationId;
  const txId = '018f3a00-0000-7000-8000-000000000100' as TransformationId;
  const batchId = '018f3a00-0000-7000-8000-000000000101' as BatchId;

  // Materials
  const greenMatA = '018f3a00-0000-7000-8000-000000000031' as MaterialId;
  const greenMatB = '018f3a00-0000-7000-8000-000000000032' as MaterialId;
  const packMatC = '018f3a00-0000-7000-8000-000000000033' as MaterialId;
  const roastMatPrimary = '018f3a00-0000-7000-8000-000000000034' as MaterialId;
  const roastMatSecondary = '018f3a00-0000-7000-8000-000000000035' as MaterialId;
  const wasteMat = '018f3a00-0000-7000-8000-000000000036' as MaterialId;

  // Input Lots
  const inputLotA = '018f3a00-0000-7000-8000-000000000051' as InventoryLotId;
  const inputLotB = '018f3a00-0000-7000-8000-000000000052' as InventoryLotId;
  const inputLotC = '018f3a00-0000-7000-8000-000000000053' as InventoryLotId;

  // Output Lots
  const outputLotPrimary = '018f3a00-0000-7000-8000-000000000061' as InventoryLotId;
  const outputLotSecondary = '018f3a00-0000-7000-8000-000000000062' as InventoryLotId;

  let existingLots: Map<string, InventoryLot>;
  let existingValuations: Map<string, LotValuationRecordContract>;
  let existingMaterials: Map<string, MaterialMasterContract>;
  let existingTransformation: TransformationContract;

  let insertedMovements: StockLedgerMovementContract[];
  let insertedLots: InventoryLot[];
  let insertedValuations: LotValuationRecordContract[];
  let insertedCostEvents: CostEventContract[];
  let insertedEdges: ProvenanceEdgeContract[];
  let insertedInputs: TransformationInputContract[];
  let insertedOutputs: TransformationOutputContract[];
  let updatedTxStatus: string | null;
  let updatedBatchStatus: string | null;

  let transformationRepo: TransformationPostgresRepository;
  let inventoryRepo: InventoryPostgresRepository;
  let masterDataRepo: MasterDataPostgresRepository;
  let costingRepo: CostingPostgresRepository;
  let traceabilityRepo: TraceabilityPostgresRepository;
  let useCase: CompleteTransformationUseCase;

  beforeEach(() => {
    existingLots = new Map();
    existingValuations = new Map();
    existingMaterials = new Map();
    insertedMovements = [];
    insertedLots = [];
    insertedValuations = [];
    insertedCostEvents = [];
    insertedEdges = [];
    insertedInputs = [];
    insertedOutputs = [];
    updatedTxStatus = null;
    updatedBatchStatus = null;

    // Seed Master Materials
    existingMaterials.set(greenMatA, {
      organizationId: orgId, materialId: greenMatA, code: 'RAW-A', name: 'Green Bean A',
      category: 'RAW_MATERIAL', baseUom: 'KG', isActive: true, createdAt: new Date(), updatedAt: new Date()
    });
    existingMaterials.set(greenMatB, {
      organizationId: orgId, materialId: greenMatB, code: 'RAW-B', name: 'Green Bean B',
      category: 'RAW_MATERIAL', baseUom: 'KG', isActive: true, createdAt: new Date(), updatedAt: new Date()
    });
    existingMaterials.set(packMatC, {
      organizationId: orgId, materialId: packMatC, code: 'PKG-BAG', name: 'Valve Bag 1KG',
      category: 'PACKAGING_MATERIAL', baseUom: 'UNIT', isActive: true, createdAt: new Date(), updatedAt: new Date()
    });
    existingMaterials.set(roastMatPrimary, {
      organizationId: orgId, materialId: roastMatPrimary, code: 'ROAST-MAIN', name: 'Roasted Coffee Single Origin',
      category: 'INTERMEDIARY_COFFEE', baseUom: 'KG', isActive: true, createdAt: new Date(), updatedAt: new Date()
    });
    existingMaterials.set(roastMatSecondary, {
      organizationId: orgId, materialId: roastMatSecondary, code: 'ROAST-SEC', name: 'Roasted Coffee Secondary',
      category: 'INTERMEDIARY_COFFEE', baseUom: 'KG', isActive: true, createdAt: new Date(), updatedAt: new Date()
    });
    existingMaterials.set(wasteMat, {
      organizationId: orgId, materialId: wasteMat, code: 'WASTE-CHAFF', name: 'Roasting Chaff & Moisture Loss',
      category: 'CONSUMABLE', baseUom: 'KG', isActive: true, createdAt: new Date(), updatedAt: new Date()
    });

    // Seed Input Inventory Lots
    // Lot A: 20 KG Green Beans @ IDR 100,000 / KG
    existingLots.set(inputLotA, new InventoryLot({
      organizationId: orgId, inventoryLotId: inputLotA, lotNumber: 'LOT-RAW-A', materialId: greenMatA,
      quantityOnHand: Quantity.of('20', 'KG'), reservedQuantity: Quantity.zero('KG'), lotState: 'ACTIVE', receivedAt: new Date()
    }));
    existingValuations.set(inputLotA, {
      organizationId: orgId, valuationRecordId: 'val-a' as ValuationRecordId, inventoryLotId: inputLotA,
      materialCost: Money.of('2000000', 'IDR'), conversionCost: Money.zero('IDR'), totalLotCost: Money.of('2000000', 'IDR'),
      unitCost: { unitPrice: DecimalValue.from('100000'), currency: 'IDR', perUom: 'KG' }, allocationPolicy: 'FULL_ABSORPTION', calculatedAt: new Date()
    });

    // Lot B: 10 KG Green Beans @ IDR 120,000 / KG
    existingLots.set(inputLotB, new InventoryLot({
      organizationId: orgId, inventoryLotId: inputLotB, lotNumber: 'LOT-RAW-B', materialId: greenMatB,
      quantityOnHand: Quantity.of('10', 'KG'), reservedQuantity: Quantity.of('2', 'KG'), lotState: 'ACTIVE', receivedAt: new Date()
    }));
    existingValuations.set(inputLotB, {
      organizationId: orgId, valuationRecordId: 'val-b' as ValuationRecordId, inventoryLotId: inputLotB,
      materialCost: Money.of('1200000', 'IDR'), conversionCost: Money.zero('IDR'), totalLotCost: Money.of('1200000', 'IDR'),
      unitCost: { unitPrice: DecimalValue.from('120000'), currency: 'IDR', perUom: 'KG' }, allocationPolicy: 'FULL_ABSORPTION', calculatedAt: new Date()
    });

    // Lot C: 500 UNIT Bags @ IDR 2,000 / UNIT
    existingLots.set(inputLotC, new InventoryLot({
      organizationId: orgId, inventoryLotId: inputLotC, lotNumber: 'LOT-PKG-C', materialId: packMatC,
      quantityOnHand: Quantity.of('500', 'UNIT'), reservedQuantity: Quantity.zero('UNIT'), lotState: 'ACTIVE', receivedAt: new Date()
    }));
    existingValuations.set(inputLotC, {
      organizationId: orgId, valuationRecordId: 'val-c' as ValuationRecordId, inventoryLotId: inputLotC,
      materialCost: Money.of('1000000', 'IDR'), conversionCost: Money.zero('IDR'), totalLotCost: Money.of('1000000', 'IDR'),
      unitCost: { unitPrice: DecimalValue.from('2000'), currency: 'IDR', perUom: 'UNIT' }, allocationPolicy: 'FULL_ABSORPTION', calculatedAt: new Date()
    });

    // Seed Transformation
    existingTransformation = {
      organizationId: orgId,
      transformationId: txId,
      transformationNumber: 'TX-2026-001',
      archetype: 'ROASTING',
      status: 'IN_PROGRESS',
      inputs: [],
      outputs: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Repositories Mock
    transformationRepo = {
      findTransformationById: async (_c: pg.PoolClient, _orgId: OrganizationId, _id: TransformationId) => (_orgId === orgId && _id === txId ? existingTransformation : null),
      insertTransformationInput: async (_c: pg.PoolClient, input: TransformationInputContract) => { insertedInputs.push(input); },
      insertTransformationOutput: async (_c: pg.PoolClient, output: TransformationOutputContract) => { insertedOutputs.push(output); },
      updateTransformationStatus: async (_c: pg.PoolClient, _orgId: OrganizationId, _id: TransformationId, status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => { updatedTxStatus = status; },
      updateBatchStatus: async (_c: pg.PoolClient, _orgId: OrganizationId, _bId: BatchId, status: 'PLANNED' | 'EXECUTING' | 'COMPLETED' | 'ABORTED') => { updatedBatchStatus = status; }
    } as unknown as TransformationPostgresRepository;

    inventoryRepo = {
      findLotByIdForUpdate: async (_c: pg.PoolClient, _orgId: OrganizationId, lotId: InventoryLotId) => (_orgId === orgId ? (existingLots.get(lotId) ?? null) : null),
      updateLotBalance: async (_c: pg.PoolClient, lot: InventoryLot) => { existingLots.set(lot.inventoryLotId, lot); },
      insertLot: async (_c: pg.PoolClient, lot: InventoryLot) => { insertedLots.push(lot); existingLots.set(lot.inventoryLotId, lot); },
      insertMovement: async (_c: pg.PoolClient, mov: StockLedgerMovementContract) => { insertedMovements.push(mov); }
    } as unknown as InventoryPostgresRepository;

    masterDataRepo = {
      findMaterialById: async (_c: pg.PoolClient, _orgId: OrganizationId, matId: MaterialId) => (_orgId === orgId ? (existingMaterials.get(matId) ?? null) : null)
    } as unknown as MasterDataPostgresRepository;

    costingRepo = {
      findLotValuation: async (_c: pg.PoolClient, _orgId: OrganizationId, lotId: InventoryLotId) => (_orgId === orgId ? (existingValuations.get(lotId) ?? null) : null),
      insertCostEvent: async (_c: pg.PoolClient, event: CostEventContract) => { insertedCostEvents.push(event); },
      insertLotValuation: async (_c: pg.PoolClient, val: LotValuationRecordContract) => { insertedValuations.push(val); }
    } as unknown as CostingPostgresRepository;

    traceabilityRepo = {
      insertProvenanceEdge: async (_c: pg.PoolClient, edge: ProvenanceEdgeContract) => { insertedEdges.push(edge); }
    } as unknown as TraceabilityPostgresRepository;

    useCase = new CompleteTransformationUseCase(
      transformationRepo,
      inventoryRepo,
      masterDataRepo,
      costingRepo,
      traceabilityRepo
    );
  });

  // =========================================================================
  // TEST 1: GENUINE N:M TRANSFORMATION (Multiple Inputs -> Multiple Outputs)
  // =========================================================================
  it('should successfully execute a genuine N:M transformation with physical yield, waste, cost events, and lineage', async () => {
    // Inputs:
    // 10 KG of Lot A (10 * 100,000 = 1,000,000)
    // 5 KG of Lot B (5 * 120,000 = 600,000)
    // 100 UNIT of Packaging Lot C (100 * 2,000 = 200,000)
    // Total Consumed Materials = IDR 1,800,000
    //
    // Non-Inventory Cost Events:
    // Direct Labor = IDR 150,000
    // Energy / Gas = IDR 50,000
    // Total Conversion Cost = IDR 200,000
    //
    // Total Economic Pool = IDR 2,000,000
    //
    // Outputs:
    // Primary: 12 KG Roasted Coffee @ MASS_PRO_RATA share (12/14 of pool = 1,714,285.7143)
    // Secondary: 2 KG Roasted Coffee @ MASS_PRO_RATA share (2/14 of pool = 285,714.2857)
    // Waste: 1 KG Chaff / Moisture Loss (UNRECOVERABLE_WASTE -> No InventoryLot)
    const command: CompleteTransformationCommand = {
      organizationId: orgId,
      transformationId: txId,
      batchId,
      allocationPolicy: 'MASS_PRO_RATA',
      inputs: [
        {
          transformationInputId: 'in-1' as TransformationInputId,
          inventoryLotId: inputLotA,
          materialId: greenMatA,
          plannedQuantity: Quantity.of('10', 'KG'),
          actualQuantityConsumed: Quantity.of('10', 'KG'),
          movementId: 'mov-in-1' as MovementId,
          inputSequence: 1
        },
        {
          transformationInputId: 'in-2' as TransformationInputId,
          inventoryLotId: inputLotB,
          materialId: greenMatB,
          plannedQuantity: Quantity.of('5', 'KG'),
          actualQuantityConsumed: Quantity.of('5', 'KG'),
          movementId: 'mov-in-2' as MovementId,
          inputSequence: 2
        },
        {
          transformationInputId: 'in-3' as TransformationInputId,
          inventoryLotId: inputLotC,
          materialId: packMatC,
          plannedQuantity: Quantity.of('100', 'UNIT'),
          actualQuantityConsumed: Quantity.of('100', 'UNIT'),
          movementId: 'mov-in-3' as MovementId,
          inputSequence: 3
        }
      ],
      outputs: [
        {
          transformationOutputId: 'out-1' as TransformationOutputId,
          materialId: roastMatPrimary,
          outputType: 'PRIMARY_PRODUCT',
          actualQuantityProduced: Quantity.of('12', 'KG'),
          createdLotId: outputLotPrimary,
          lotNumber: 'LOT-ROAST-PRIMARY',
          movementId: 'mov-out-1' as MovementId,
          valuationRecordId: 'val-out-1' as ValuationRecordId
        },
        {
          transformationOutputId: 'out-2' as TransformationOutputId,
          materialId: roastMatSecondary,
          outputType: 'CO_PRODUCT',
          actualQuantityProduced: Quantity.of('2', 'KG'),
          createdLotId: outputLotSecondary,
          lotNumber: 'LOT-ROAST-SECONDARY',
          movementId: 'mov-out-2' as MovementId,
          valuationRecordId: 'val-out-2' as ValuationRecordId
        },
        {
          transformationOutputId: 'out-3' as TransformationOutputId,
          materialId: wasteMat,
          outputType: 'UNRECOVERABLE_WASTE',
          actualQuantityProduced: Quantity.of('1', 'KG')
        }
      ],
      costEvents: [
        {
          costEventId: 'ce-1' as CostEventId,
          costCategory: 'DIRECT_LABOR',
          allocatedAmount: Money.of('150000', 'IDR'),
          allocationBasis: 'TIME_DURATION'
        },
        {
          costEventId: 'ce-2' as CostEventId,
          costCategory: 'ENERGY_UTILITIES',
          allocatedAmount: Money.of('50000', 'IDR'),
          allocationBasis: 'BATCH_FIXED'
        }
      ],
      provenanceEdges: [
        {
          provenanceEdgeId: 'edge-1' as ProvenanceEdgeId,
          sourceLotId: inputLotA,
          targetLotId: outputLotPrimary,
          consumedQuantity: Quantity.of('10', 'KG')
        },
        {
          provenanceEdgeId: 'edge-2' as ProvenanceEdgeId,
          sourceLotId: inputLotB,
          targetLotId: outputLotPrimary,
          consumedQuantity: Quantity.of('5', 'KG')
        }
      ]
    };

    const result = await useCase.execute(command, dummyClient);

    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.consumedInputCount, 3);
    assert.equal(result.createdOutputLotCount, 2);
    assert.equal(result.totalEconomicPool.amount.toString(), '2000000');
    assert.equal(result.provenanceEdgeCount, 2);

    // 1. Verify Input Lot Balance Depletions
    // Lot A: 20 - 10 = 10 KG
    const updatedLotA = existingLots.get(inputLotA)!;
    assert.equal(updatedLotA.quantityOnHand.amount.toString(), '10');

    // Lot B: 10 - 5 = 5 KG
    const updatedLotB = existingLots.get(inputLotB)!;
    assert.equal(updatedLotB.quantityOnHand.amount.toString(), '5');

    // Lot C: 500 - 100 = 400 UNIT
    const updatedLotC = existingLots.get(inputLotC)!;
    assert.equal(updatedLotC.quantityOnHand.amount.toString(), '400');

    // 2. Verify Stock Ledger Movements
    // 3 Consume movements + 2 Yield movements = 5 movements
    assert.equal(insertedMovements.length, 5);
    const consumeMovements = insertedMovements.filter(m => m.movementType === 'TRANSFORMATION_CONSUME');
    const yieldMovements = insertedMovements.filter(m => m.movementType === 'TRANSFORMATION_YIELD');
    assert.equal(consumeMovements.length, 3);
    assert.equal(yieldMovements.length, 2);

    // Verify negative delta on consume
    assert.equal(consumeMovements[0]!.quantityDelta.amount.toString(), '-10');

    // 3. Verify Output Lots Created
    // Exactly 2 physical lots created. Waste output MUST NOT create a lot.
    assert.equal(insertedLots.length, 2);
    const createdPrimary = insertedLots.find(l => l.inventoryLotId === outputLotPrimary)!;
    assert.ok(createdPrimary);
    assert.equal(createdPrimary.quantityOnHand.amount.toString(), '12');
    assert.equal(createdPrimary.reservedQuantity.amount.toString(), '0');

    const createdSec = insertedLots.find(l => l.inventoryLotId === outputLotSecondary)!;
    assert.ok(createdSec);
    assert.equal(createdSec.quantityOnHand.amount.toString(), '2');

    // 4. Verify Cost Events
    assert.equal(insertedCostEvents.length, 2);

    // 5. Verify Lot Valuations & Pro-Rata Allocations
    // Primary Share: (12 / 14) * 2,000,000 = 1,714,285.714285714
    // Secondary Share: (2 / 14) * 2,000,000 = 285,714.2857142857
    assert.equal(insertedValuations.length, 2);
    const valPrimary = insertedValuations.find(v => v.inventoryLotId === outputLotPrimary)!;
    assert.ok(valPrimary);
    assert.equal(valPrimary.allocationPolicy, 'MASS_PRO_RATA');
    assert.equal(valPrimary.totalLotCost.amount.toFixed(2), '1714285.71');

    // 6. Verify Provenance Edges
    assert.equal(insertedEdges.length, 2);

    // 7. Verify Transformation & Batch Status Completion
    assert.equal(updatedTxStatus, 'COMPLETED');
    assert.equal(updatedBatchStatus, 'COMPLETED');
  });

  // =========================================================================
  // TEST 2: 1 -> 1 TRANSFORMATION (Single Input -> Single Output)
  // =========================================================================
  it('should successfully execute a simple 1:1 transformation with Full Absorption', async () => {
    const command: CompleteTransformationCommand = {
      organizationId: orgId,
      transformationId: txId,
      allocationPolicy: 'FULL_ABSORPTION',
      inputs: [
        {
          transformationInputId: 'in-single' as TransformationInputId,
          inventoryLotId: inputLotA,
          materialId: greenMatA,
          plannedQuantity: Quantity.of('5', 'KG'),
          actualQuantityConsumed: Quantity.of('5', 'KG'),
          movementId: 'mov-in-s' as MovementId,
          inputSequence: 1
        }
      ],
      outputs: [
        {
          transformationOutputId: 'out-single' as TransformationOutputId,
          materialId: roastMatPrimary,
          outputType: 'PRIMARY_PRODUCT',
          actualQuantityProduced: Quantity.of('4.2', 'KG'),
          createdLotId: outputLotPrimary,
          lotNumber: 'LOT-ROAST-SINGLE',
          movementId: 'mov-out-s' as MovementId,
          valuationRecordId: 'val-out-s' as ValuationRecordId
        }
      ],
      costEvents: [],
      provenanceEdges: []
    };

    const result = await useCase.execute(command, dummyClient);
    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.consumedInputCount, 1);
    assert.equal(result.createdOutputLotCount, 1);
    // 5 KG * 100,000 = IDR 500,000 absorbed 100% into 4.2 KG output
    assert.equal(result.totalEconomicPool.amount.toString(), '500000');

    const outVal = insertedValuations[0]!;
    assert.equal(outVal.totalLotCost.amount.toString(), '500000');
    // Unit price = 500,000 / 4.2 = 119047.6190...
    assert.equal(outVal.unitCost.unitPrice.toFixed(2), '119047.62');
  });

  // =========================================================================
  // TEST 3: INSUFFICIENT AVAILABLE QUANTITY & RESERVATION PROTECTION
  // =========================================================================
  it('should reject transformation when actual consumption exceeds available quantity (protecting reservations)', async () => {
    // Lot B has 10 KG on hand, but 2 KG is RESERVED -> available is only 8 KG.
    // Attempting to consume 9 KG must be rejected.
    const command: CompleteTransformationCommand = {
      organizationId: orgId,
      transformationId: txId,
      inputs: [
        {
          transformationInputId: 'in-fail' as TransformationInputId,
          inventoryLotId: inputLotB,
          materialId: greenMatB,
          plannedQuantity: Quantity.of('9', 'KG'),
          actualQuantityConsumed: Quantity.of('9', 'KG'), // Exceeds 8 KG available!
          movementId: 'mov-fail' as MovementId,
          inputSequence: 1
        }
      ],
      outputs: [
        {
          transformationOutputId: 'out-fail' as TransformationOutputId,
          materialId: roastMatPrimary,
          outputType: 'PRIMARY_PRODUCT',
          actualQuantityProduced: Quantity.of('7.5', 'KG'),
          createdLotId: outputLotPrimary,
          lotNumber: 'LOT-FAIL',
          movementId: 'mov-out-fail' as MovementId,
          valuationRecordId: 'val-out-fail' as ValuationRecordId
        }
      ],
      costEvents: [],
      provenanceEdges: []
    };

    await assert.rejects(
      () => useCase.execute(command, dummyClient),
      InsufficientLotQuantityError
    );
  });

  // =========================================================================
  // TEST 4: MATERIAL IDENTITY MISMATCH
  // =========================================================================
  it('should reject input if material identity does not match the referenced lot', async () => {
    const command: CompleteTransformationCommand = {
      organizationId: orgId,
      transformationId: txId,
      inputs: [
        {
          transformationInputId: 'in-mat-mismatch' as TransformationInputId,
          inventoryLotId: inputLotA, // Is actually greenMatA
          materialId: greenMatB,     // Claiming it is greenMatB!
          plannedQuantity: Quantity.of('5', 'KG'),
          actualQuantityConsumed: Quantity.of('5', 'KG'),
          movementId: 'mov-mismatch' as MovementId,
          inputSequence: 1
        }
      ],
      outputs: [
        {
          transformationOutputId: 'out-1' as TransformationOutputId,
          materialId: roastMatPrimary,
          outputType: 'PRIMARY_PRODUCT',
          actualQuantityProduced: Quantity.of('4.2', 'KG'),
          createdLotId: outputLotPrimary,
          lotNumber: 'LOT-ROAST-SINGLE',
          movementId: 'mov-out-s' as MovementId,
          valuationRecordId: 'val-out-s' as ValuationRecordId
        }
      ],
      costEvents: [],
      provenanceEdges: []
    };

    await assert.rejects(
      () => useCase.execute(command, dummyClient),
      MaterialIdentityMismatchError
    );
  });

  // =========================================================================
  // TEST 5: TENANT ISOLATION
  // =========================================================================
  it('should reject transformation if transformation or input lot belongs to another organization', async () => {
    const crossTenantCmd: CompleteTransformationCommand = {
      organizationId: otherOrgId, // Tenant B attempting to execute Tenant A's transformation
      transformationId: txId,
      inputs: [
        {
          transformationInputId: 'in-cross' as TransformationInputId,
          inventoryLotId: inputLotA,
          materialId: greenMatA,
          plannedQuantity: Quantity.of('5', 'KG'),
          actualQuantityConsumed: Quantity.of('5', 'KG'),
          movementId: 'mov-cross' as MovementId,
          inputSequence: 1
        }
      ],
      outputs: [
        {
          transformationOutputId: 'out-cross' as TransformationOutputId,
          materialId: roastMatPrimary,
          outputType: 'PRIMARY_PRODUCT',
          actualQuantityProduced: Quantity.of('4.2', 'KG'),
          createdLotId: outputLotPrimary,
          lotNumber: 'LOT-ROAST-CROSS',
          movementId: 'mov-out-cross' as MovementId,
          valuationRecordId: 'val-out-cross' as ValuationRecordId
        }
      ],
      costEvents: [],
      provenanceEdges: []
    };

    await assert.rejects(
      () => useCase.execute(crossTenantCmd, dummyClient),
      TransformationNotFoundError
    );
  });
});
