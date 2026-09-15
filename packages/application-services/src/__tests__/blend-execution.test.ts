import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { 
  CompleteTransformationUseCase, 
  CompleteTransformationCommand,
  TransformationNotFoundError,
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

describe('Phase 9 : Blend Execution & Traceability Unit Tests', () => {
  const orgId = '018f3a00-0000-7000-8000-000000000001' as OrganizationId;
  const otherOrgId = '018f3a00-0000-7000-8000-000000000002' as OrganizationId;
  const txId = '018f3a00-0000-7000-8000-000000000100' as TransformationId;
  const batchId = '018f3a00-0000-7000-8000-000000000101' as BatchId;

  // Materials
  const roastedFloresMat = '018f3a00-0000-7000-8000-000000000031' as MaterialId;
  const roastedColombiaMat = '018f3a00-0000-7000-8000-000000000032' as MaterialId;
  const houseBlendMat = '018f3a00-0000-7000-8000-000000000033' as MaterialId;

  // Input Lots
  const lotFloresA = '018f3a00-0000-7000-8000-000000000051' as InventoryLotId;
  const lotFloresB = '018f3a00-0000-7000-8000-000000000052' as InventoryLotId;
  const lotColombia = '018f3a00-0000-7000-8000-000000000053' as InventoryLotId;

  // Output Lots
  const blendOutputLot = '018f3a00-0000-7000-8000-000000000061' as InventoryLotId;

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

    // Seed Materials
    existingMaterials.set(roastedFloresMat, {
      materialId: roastedFloresMat,
      organizationId: orgId,
      code: 'ROAST-FLORES-FILTER',
      name: 'Flores Bajawa Filter Roast',
      category: 'INTERMEDIARY_COFFEE',
      baseUom: 'KG',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    existingMaterials.set(roastedColombiaMat, {
      materialId: roastedColombiaMat,
      organizationId: orgId,
      code: 'ROAST-COLOMBIA-ESPRESSO',
      name: 'Colombia Supremo Espresso Roast',
      category: 'INTERMEDIARY_COFFEE',
      baseUom: 'KG',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    existingMaterials.set(houseBlendMat, {
      materialId: houseBlendMat,
      organizationId: orgId,
      code: 'ROAST-HOUSE-BLEND',
      name: 'Nusantara Signature House Blend',
      category: 'INTERMEDIARY_COFFEE',
      baseUom: 'KG',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Seed Input Lots (Flores: 20 KG @ IDR 160,000/KG; Colombia: 15 KG @ IDR 180,000/KG)
    existingLots.set(lotFloresA, new InventoryLot({
      inventoryLotId: lotFloresA,
      organizationId: orgId,
      materialId: roastedFloresMat,
      lotNumber: 'LOT-RST-FLR-001',
      quantityOnHand: Quantity.of('20', 'KG'),
      reservedQuantity: Quantity.zero('KG'),
      lotState: 'ACTIVE',
      receivedAt: new Date()
    }));

    existingValuations.set(lotFloresA, {
      valuationRecordId: '018f3a00-0000-7000-8000-000000000071' as ValuationRecordId,
      organizationId: orgId,
      inventoryLotId: lotFloresA,
      unitCost: { unitPrice: DecimalValue.from('160000'), currency: 'IDR', perUom: 'KG' },
      materialCost: Money.of('3200000', 'IDR'),
      conversionCost: Money.zero('IDR'),
      totalLotCost: Money.of('3200000', 'IDR'),
      allocationPolicy: 'FULL_ABSORPTION',
      calculatedAt: new Date()
    });

    existingLots.set(lotFloresB, new InventoryLot({
      inventoryLotId: lotFloresB,
      organizationId: orgId,
      materialId: roastedFloresMat,
      lotNumber: 'LOT-RST-FLR-002',
      quantityOnHand: Quantity.of('10', 'KG'),
      reservedQuantity: Quantity.zero('KG'),
      lotState: 'ACTIVE',
      receivedAt: new Date()
    }));

    existingValuations.set(lotFloresB, {
      valuationRecordId: '018f3a00-0000-7000-8000-000000000072' as ValuationRecordId,
      organizationId: orgId,
      inventoryLotId: lotFloresB,
      unitCost: { unitPrice: DecimalValue.from('165000'), currency: 'IDR', perUom: 'KG' },
      materialCost: Money.of('1650000', 'IDR'),
      conversionCost: Money.zero('IDR'),
      totalLotCost: Money.of('1650000', 'IDR'),
      allocationPolicy: 'FULL_ABSORPTION',
      calculatedAt: new Date()
    });

    existingLots.set(lotColombia, new InventoryLot({
      inventoryLotId: lotColombia,
      organizationId: orgId,
      materialId: roastedColombiaMat,
      lotNumber: 'LOT-RST-COL-001',
      quantityOnHand: Quantity.of('15', 'KG'),
      reservedQuantity: Quantity.zero('KG'),
      lotState: 'ACTIVE',
      receivedAt: new Date()
    }));

    existingValuations.set(lotColombia, {
      valuationRecordId: '018f3a00-0000-7000-8000-000000000073' as ValuationRecordId,
      organizationId: orgId,
      inventoryLotId: lotColombia,
      unitCost: { unitPrice: DecimalValue.from('180000'), currency: 'IDR', perUom: 'KG' },
      materialCost: Money.of('2700000', 'IDR'),
      conversionCost: Money.zero('IDR'),
      totalLotCost: Money.of('2700000', 'IDR'),
      allocationPolicy: 'FULL_ABSORPTION',
      calculatedAt: new Date()
    });

    // Seed Transformation
    existingTransformation = {
      transformationId: txId,
      organizationId: orgId,
      transformationNumber: 'TX-BLD-001',
      status: 'IN_PROGRESS',
      archetype: 'BLENDING',
      inputs: [],
      outputs: [],
      startedAt: new Date(),
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

  it('Scenario 1: Standard 2-component blend (60:40) with archetype BLENDING', async () => {
    // 12 KG Flores (@ 160k = 1,920,000) + 8 KG Colombia (@ 180k = 1,440,000) = 3,360,000 pooled material
    // Conversion: 35,000 labor + 15,000 energy = 50,000
    // Total = 3,410,000 for 20 KG => 170,500 / KG
    const cmd: CompleteTransformationCommand = {
      organizationId: orgId,
      transformationId: txId,
      batchId: batchId,
      allocationPolicy: 'FULL_ABSORPTION',
      inputs: [
        {
          transformationInputId: 'in-1' as TransformationInputId,
          inventoryLotId: lotFloresA,
          materialId: roastedFloresMat,
          plannedQuantity: Quantity.of('12', 'KG'),
          actualQuantityConsumed: Quantity.of('12', 'KG'),
          movementId: 'mov-in-1' as MovementId,
          inputSequence: 1
        },
        {
          transformationInputId: 'in-2' as TransformationInputId,
          inventoryLotId: lotColombia,
          materialId: roastedColombiaMat,
          plannedQuantity: Quantity.of('8', 'KG'),
          actualQuantityConsumed: Quantity.of('8', 'KG'),
          movementId: 'mov-in-2' as MovementId,
          inputSequence: 2
        }
      ],
      outputs: [
        {
          transformationOutputId: 'out-1' as TransformationOutputId,
          materialId: houseBlendMat,
          outputType: 'PRIMARY_PRODUCT',
          actualQuantityProduced: Quantity.of('20', 'KG'),
          createdLotId: blendOutputLot,
          lotNumber: 'LOT-BLD-STD-001',
          movementId: 'mov-out-1' as MovementId,
          valuationRecordId: 'val-out-1' as ValuationRecordId
        }
      ],
      costEvents: [
        {
          costEventId: 'ce-1' as CostEventId,
          costCategory: 'DIRECT_LABOR',
          allocatedAmount: Money.of('35000', 'IDR'),
          allocationBasis: 'BATCH_FIXED'
        },
        {
          costEventId: 'ce-2' as CostEventId,
          costCategory: 'ENERGY_UTILITIES',
          allocatedAmount: Money.of('15000', 'IDR'),
          allocationBasis: 'BATCH_FIXED'
        }
      ],
      provenanceEdges: [
        {
          provenanceEdgeId: 'edge-1' as ProvenanceEdgeId,
          sourceLotId: lotFloresA,
          targetLotId: blendOutputLot,
          consumedQuantity: Quantity.of('12', 'KG')
        },
        {
          provenanceEdgeId: 'edge-2' as ProvenanceEdgeId,
          sourceLotId: lotColombia,
          targetLotId: blendOutputLot,
          consumedQuantity: Quantity.of('8', 'KG')
        }
      ]
    };

    const result = await useCase.execute(cmd, dummyClient);

    assert.equal(result.status, 'COMPLETED');
    assert.equal(result.consumedInputCount, 2);
    assert.equal(result.createdOutputLotCount, 1);
    assert.equal(result.totalEconomicPool.amount.toString(), '3410000');
    assert.equal(updatedTxStatus, 'COMPLETED');
    assert.equal(updatedBatchStatus, 'COMPLETED');

    // Verify stock ledger movements
    assert.equal(insertedMovements.length, 3); // 2 consumptions + 1 production
    const consumeMovements = insertedMovements.filter(m => m.movementType === 'TRANSFORMATION_CONSUME');
    const yieldMovements = insertedMovements.filter(m => m.movementType === 'TRANSFORMATION_YIELD');
    assert.equal(consumeMovements.length, 2);
    assert.equal(yieldMovements.length, 1);

    // Verify inventory lots state
    const floresLot = existingLots.get(lotFloresA);
    assert.equal(floresLot?.quantityOnHand.amount.toString(), '8'); // 20 - 12 = 8 KG remaining

    const colLot = existingLots.get(lotColombia);
    assert.equal(colLot?.quantityOnHand.amount.toString(), '7'); // 15 - 8 = 7 KG remaining

    const outLot = insertedLots[0];
    assert.ok(outLot);
    assert.equal(outLot.lotNumber, 'LOT-BLD-STD-001');
    assert.equal(outLot.quantityOnHand.amount.toString(), '20');
    assert.equal(outLot.lotState, 'ACTIVE');

    // Verify costing
    assert.equal(insertedValuations.length, 1);
    const val = insertedValuations[0];
    assert.ok(val);
    assert.equal(val.materialCost.amount.toString(), '3360000');
    assert.equal(val.conversionCost.amount.toString(), '50000');
    assert.equal(val.totalLotCost.amount.toString(), '3410000');
    assert.equal(val.unitCost.unitPrice.toString(), '170500'); // 3410000 / 20 = 170500

    // Verify provenance DAG edges
    assert.equal(insertedEdges.length, 2);
    assert.ok(insertedEdges.some(e => e.sourceLotId === lotFloresA && e.targetLotId === blendOutputLot));
    assert.ok(insertedEdges.some(e => e.sourceLotId === lotColombia && e.targetLotId === blendOutputLot));
  });

  it('Scenario 2: Ratio deviation (recipe target 60:40 vs actual execution 50:50)', async () => {
    // 10 KG Flores (@ 160k = 1,600,000) + 10 KG Colombia (@ 180k = 1,800,000) = 3,400,000
    // Conversion: 0
    // Total = 3,400,000 for 20 KG => 170,000 / KG
    const cmd: CompleteTransformationCommand = {
      organizationId: orgId,
      transformationId: txId,
      batchId: batchId,
      allocationPolicy: 'FULL_ABSORPTION',
      inputs: [
        {
          transformationInputId: 'in-1' as TransformationInputId,
          inventoryLotId: lotFloresA,
          materialId: roastedFloresMat,
          plannedQuantity: Quantity.of('10', 'KG'),
          actualQuantityConsumed: Quantity.of('10', 'KG'),
          movementId: 'mov-in-1' as MovementId,
          inputSequence: 1
        },
        {
          transformationInputId: 'in-2' as TransformationInputId,
          inventoryLotId: lotColombia,
          materialId: roastedColombiaMat,
          plannedQuantity: Quantity.of('10', 'KG'),
          actualQuantityConsumed: Quantity.of('10', 'KG'),
          movementId: 'mov-in-2' as MovementId,
          inputSequence: 2
        }
      ],
      outputs: [
        {
          transformationOutputId: 'out-1' as TransformationOutputId,
          materialId: houseBlendMat,
          outputType: 'PRIMARY_PRODUCT',
          actualQuantityProduced: Quantity.of('20', 'KG'),
          createdLotId: blendOutputLot,
          lotNumber: 'LOT-BLD-DEV-001',
          movementId: 'mov-out-1' as MovementId,
          valuationRecordId: 'val-out-1' as ValuationRecordId
        }
      ],
      costEvents: [],
      provenanceEdges: [
        {
          provenanceEdgeId: 'edge-1' as ProvenanceEdgeId,
          sourceLotId: lotFloresA,
          targetLotId: blendOutputLot,
          consumedQuantity: Quantity.of('10', 'KG')
        },
        {
          provenanceEdgeId: 'edge-2' as ProvenanceEdgeId,
          sourceLotId: lotColombia,
          targetLotId: blendOutputLot,
          consumedQuantity: Quantity.of('10', 'KG')
        }
      ]
    };

    const result = await useCase.execute(cmd, dummyClient);
    assert.equal(result.status, 'COMPLETED');

    const val = insertedValuations[0];
    assert.ok(val);
    assert.equal(val.materialCost.amount.toString(), '3400000');
    assert.equal(val.unitCost.unitPrice.toString(), '170000');
  });

  it('Scenario 3: Multi-lot same material blending (Flores Batch 1 + Batch 2 + Colombia)', async () => {
    // 6 KG Flores A (@ 160k = 960,000) + 6 KG Flores B (@ 165k = 990,000) + 8 KG Colombia (@ 180k = 1,440,000) = 3,390,000
    // Conversion: 10,000 labor
    // Total = 3,400,000 for 20 KG => 170,000 / KG
    const cmd: CompleteTransformationCommand = {
      organizationId: orgId,
      transformationId: txId,
      batchId: batchId,
      allocationPolicy: 'FULL_ABSORPTION',
      inputs: [
        {
          transformationInputId: 'in-1' as TransformationInputId,
          inventoryLotId: lotFloresA,
          materialId: roastedFloresMat,
          plannedQuantity: Quantity.of('6', 'KG'),
          actualQuantityConsumed: Quantity.of('6', 'KG'),
          movementId: 'mov-in-1' as MovementId,
          inputSequence: 1
        },
        {
          transformationInputId: 'in-2' as TransformationInputId,
          inventoryLotId: lotFloresB,
          materialId: roastedFloresMat,
          plannedQuantity: Quantity.of('6', 'KG'),
          actualQuantityConsumed: Quantity.of('6', 'KG'),
          movementId: 'mov-in-2' as MovementId,
          inputSequence: 2
        },
        {
          transformationInputId: 'in-3' as TransformationInputId,
          inventoryLotId: lotColombia,
          materialId: roastedColombiaMat,
          plannedQuantity: Quantity.of('8', 'KG'),
          actualQuantityConsumed: Quantity.of('8', 'KG'),
          movementId: 'mov-in-3' as MovementId,
          inputSequence: 3
        }
      ],
      outputs: [
        {
          transformationOutputId: 'out-1' as TransformationOutputId,
          materialId: houseBlendMat,
          outputType: 'PRIMARY_PRODUCT',
          actualQuantityProduced: Quantity.of('20', 'KG'),
          createdLotId: blendOutputLot,
          lotNumber: 'LOT-BLD-MLT-001',
          movementId: 'mov-out-1' as MovementId,
          valuationRecordId: 'val-out-1' as ValuationRecordId
        }
      ],
      costEvents: [
        {
          costEventId: 'ce-1' as CostEventId,
          costCategory: 'DIRECT_LABOR',
          allocatedAmount: Money.of('10000', 'IDR'),
          allocationBasis: 'BATCH_FIXED'
        }
      ],
      provenanceEdges: [
        {
          provenanceEdgeId: 'edge-1' as ProvenanceEdgeId,
          sourceLotId: lotFloresA,
          targetLotId: blendOutputLot,
          consumedQuantity: Quantity.of('6', 'KG')
        },
        {
          provenanceEdgeId: 'edge-2' as ProvenanceEdgeId,
          sourceLotId: lotFloresB,
          targetLotId: blendOutputLot,
          consumedQuantity: Quantity.of('6', 'KG')
        },
        {
          provenanceEdgeId: 'edge-3' as ProvenanceEdgeId,
          sourceLotId: lotColombia,
          targetLotId: blendOutputLot,
          consumedQuantity: Quantity.of('8', 'KG')
        }
      ]
    };

    const result = await useCase.execute(cmd, dummyClient);
    assert.equal(result.status, 'COMPLETED');

    // 3 provenance edges
    assert.equal(insertedEdges.length, 3);
    assert.ok(insertedEdges.some(e => e.sourceLotId === lotFloresA));
    assert.ok(insertedEdges.some(e => e.sourceLotId === lotFloresB));
    assert.ok(insertedEdges.some(e => e.sourceLotId === lotColombia));

    const val = insertedValuations[0];
    assert.ok(val);
    assert.equal(val.materialCost.amount.toString(), '3390000');
    assert.equal(val.conversionCost.amount.toString(), '10000');
    assert.equal(val.totalLotCost.amount.toString(), '3400000');
    assert.equal(val.unitCost.unitPrice.toString(), '170000');
  });

  it('Scenario 4: Partial lot consumption (remaining quantity of roasted inputs remains active)', async () => {
    // Consume 3 KG Flores A (20 -> 17 remaining) and 2 KG Colombia (15 -> 13 remaining) into 5 KG blend
    const cmd: CompleteTransformationCommand = {
      organizationId: orgId,
      transformationId: txId,
      batchId: batchId,
      allocationPolicy: 'FULL_ABSORPTION',
      inputs: [
        {
          transformationInputId: 'in-1' as TransformationInputId,
          inventoryLotId: lotFloresA,
          materialId: roastedFloresMat,
          plannedQuantity: Quantity.of('3', 'KG'),
          actualQuantityConsumed: Quantity.of('3', 'KG'),
          movementId: 'mov-in-1' as MovementId,
          inputSequence: 1
        },
        {
          transformationInputId: 'in-2' as TransformationInputId,
          inventoryLotId: lotColombia,
          materialId: roastedColombiaMat,
          plannedQuantity: Quantity.of('2', 'KG'),
          actualQuantityConsumed: Quantity.of('2', 'KG'),
          movementId: 'mov-in-2' as MovementId,
          inputSequence: 2
        }
      ],
      outputs: [
        {
          transformationOutputId: 'out-1' as TransformationOutputId,
          materialId: houseBlendMat,
          outputType: 'PRIMARY_PRODUCT',
          actualQuantityProduced: Quantity.of('5', 'KG'),
          createdLotId: blendOutputLot,
          lotNumber: 'LOT-BLD-PARTIAL-001',
          movementId: 'mov-out-1' as MovementId,
          valuationRecordId: 'val-out-1' as ValuationRecordId
        }
      ],
      costEvents: [],
      provenanceEdges: [
        {
          provenanceEdgeId: 'edge-1' as ProvenanceEdgeId,
          sourceLotId: lotFloresA,
          targetLotId: blendOutputLot,
          consumedQuantity: Quantity.of('3', 'KG')
        },
        {
          provenanceEdgeId: 'edge-2' as ProvenanceEdgeId,
          sourceLotId: lotColombia,
          targetLotId: blendOutputLot,
          consumedQuantity: Quantity.of('2', 'KG')
        }
      ]
    };

    await useCase.execute(cmd, dummyClient);

    const lotA = existingLots.get(lotFloresA);
    assert.equal(lotA?.quantityOnHand.amount.toString(), '17');
    assert.equal(lotA?.lotState, 'ACTIVE');

    const lotCol = existingLots.get(lotColombia);
    assert.equal(lotCol?.quantityOnHand.amount.toString(), '13');
    assert.equal(lotCol?.lotState, 'ACTIVE');
  });

  it('Guards: Throws InsufficientLotQuantityError when input quantity exceeds available stock', async () => {
    const cmd: CompleteTransformationCommand = {
      organizationId: orgId,
      transformationId: txId,
      batchId: batchId,
      allocationPolicy: 'FULL_ABSORPTION',
      inputs: [
        {
          transformationInputId: 'in-1' as TransformationInputId,
          inventoryLotId: lotFloresA,
          materialId: roastedFloresMat,
          plannedQuantity: Quantity.of('25', 'KG'),
          actualQuantityConsumed: Quantity.of('25', 'KG'), // available is only 20
          movementId: 'mov-in-1' as MovementId,
          inputSequence: 1
        }
      ],
      outputs: [
        {
          transformationOutputId: 'out-1' as TransformationOutputId,
          materialId: houseBlendMat,
          outputType: 'PRIMARY_PRODUCT',
          actualQuantityProduced: Quantity.of('25', 'KG'),
          createdLotId: blendOutputLot,
          lotNumber: 'LOT-BLD-FAIL-001',
          movementId: 'mov-out-1' as MovementId,
          valuationRecordId: 'val-out-1' as ValuationRecordId
        }
      ],
      costEvents: [],
      provenanceEdges: []
    };

    await assert.rejects(
      async () => useCase.execute(cmd, dummyClient),
      (err: any) => err instanceof InsufficientLotQuantityError
    );
  });

  it('Guards: Tenant isolation enforced on transformation lookup', async () => {
    const cmd: CompleteTransformationCommand = {
      organizationId: otherOrgId, // Cross-tenant attempt
      transformationId: txId,
      batchId: batchId,
      allocationPolicy: 'FULL_ABSORPTION',
      inputs: [
        {
          transformationInputId: 'in-1' as TransformationInputId,
          inventoryLotId: lotFloresA,
          materialId: roastedFloresMat,
          plannedQuantity: Quantity.of('10', 'KG'),
          actualQuantityConsumed: Quantity.of('10', 'KG'),
          movementId: 'mov-in-1' as MovementId,
          inputSequence: 1
        }
      ],
      outputs: [
        {
          transformationOutputId: 'out-1' as TransformationOutputId,
          materialId: houseBlendMat,
          outputType: 'PRIMARY_PRODUCT',
          actualQuantityProduced: Quantity.of('10', 'KG'),
          createdLotId: blendOutputLot,
          lotNumber: 'LOT-BLD-TEST',
          movementId: 'mov-out-1' as MovementId,
          valuationRecordId: 'val-out-1' as ValuationRecordId
        }
      ],
      costEvents: [],
      provenanceEdges: []
    };

    await assert.rejects(
      async () => useCase.execute(cmd, dummyClient),
      (err: any) => err instanceof TransformationNotFoundError
    );
  });
});
