import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { 
  ReceivePurchaseOrderUseCase, 
  ReceivePurchaseOrderCommand,
  InvalidPurchaseOrderStateError,
  ExcessiveReceiptQuantityError,
  PurchaseOrderNotFoundError
} from '../index.js';
import { 
  IncompatibleUomDimensionError, 
  NegativeQuantityError, 
  Quantity, 
  Money, 
  DecimalValue 
} from '@roastery-os/domain-core';
import { 
  OrganizationId, 
  PurchaseOrderId, 
  PurchaseOrderLineId, 
  SupplierId, 
  MaterialId, 
  MovementId, 
  PurchaseReceiptId,
  PurchaseOrderContract,
  PurchaseOrderLineContract,
  MaterialMasterContract,
  InventoryLotContract,
  StockLedgerMovementContract,
  LotValuationRecordContract,
  PurchaseReceiptContract
} from '@roastery-os/contracts';
import { 
  SupplierPostgresRepository, 
  MasterDataPostgresRepository, 
  InventoryPostgresRepository, 
  CostingPostgresRepository 
} from '@roastery-os/infrastructure-postgres';
import pg from 'pg';

// Mock Client to satisfy repository signatures during unit test execution
const dummyClient = {} as pg.PoolClient;

describe('Receive Inbound Purchase Order : Vertical Slice Use Case Tests', () => {
  const orgId = '018f3a00-0000-7000-8000-000000000001' as OrganizationId;
  const otherOrgId = '018f3a00-0000-7000-8000-000000000002' as OrganizationId;
  const poId = '018f3a00-0000-7000-8000-000000000010' as PurchaseOrderId;
  const poLineId = '018f3a00-0000-7000-8000-000000000011' as PurchaseOrderLineId;
  const supplierId = '018f3a00-0000-7000-8000-000000000020' as SupplierId;
  const materialId = '018f3a00-0000-7000-8000-000000000030' as MaterialId;
  const receiptId = '018f3a00-0000-7000-8000-000000000040' as PurchaseReceiptId;
  const movementId = '018f3a00-0000-7000-8000-000000000050' as MovementId;

  let mockPo: PurchaseOrderContract;
  let mockPoLine: PurchaseOrderLineContract;
  let mockMaterial: MaterialMasterContract;

  let insertedLot: InventoryLotContract | null = null;
  let insertedMovement: StockLedgerMovementContract | null = null;
  let insertedValuation: LotValuationRecordContract | null = null;
  let insertedReceipt: PurchaseReceiptContract | null = null;
  let updatedPoLineQty: string | null = null;
  let updatedPoStatus: string | null = null;

  let supplierRepo: SupplierPostgresRepository;
  let masterDataRepo: MasterDataPostgresRepository;
  let inventoryRepo: InventoryPostgresRepository;
  let costingRepo: CostingPostgresRepository;
  let useCase: ReceivePurchaseOrderUseCase;

  beforeEach(() => {
    insertedLot = null;
    insertedMovement = null;
    insertedValuation = null;
    insertedReceipt = null;
    updatedPoLineQty = null;
    updatedPoStatus = null;

    mockPo = {
      organizationId: orgId,
      poId,
      poNumber: 'PO-2026-001',
      supplierId,
      status: 'ISSUED',
      lines: [],
      totalAmount: { amount: DecimalValue.from('12000000'), currency: 'IDR' },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockPoLine = {
      organizationId: orgId,
      poLineId,
      poId,
      materialId,
      orderedQuantity: { amount: DecimalValue.from('100'), uom: 'KG' },
      receivedQuantity: { amount: DecimalValue.from('0'), uom: 'KG' },
      unitPurchasePrice: { amount: DecimalValue.from('120000'), currency: 'IDR' },
      lineTotal: { amount: DecimalValue.from('12000000'), currency: 'IDR' }
    };

    mockMaterial = {
      organizationId: orgId,
      materialId,
      code: 'RAW-FLORES-01',
      name: 'Flores Bajawa Green Beans',
      category: 'RAW_MATERIAL',
      baseUom: 'KG',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    supplierRepo = {
      findPurchaseOrder: async (_c: pg.PoolClient, _orgId: OrganizationId, _poId: PurchaseOrderId) => (_orgId === orgId && _poId === poId ? mockPo : null),
      findPurchaseOrderLine: async (_c: pg.PoolClient, _orgId: OrganizationId, _poId: PurchaseOrderId, _lineId: PurchaseOrderLineId) => (_orgId === orgId && _poId === poId && _lineId === poLineId ? mockPoLine : null),
      updatePoLineReceivedQuantity: async (_c: pg.PoolClient, _orgId: OrganizationId, _lineId: PurchaseOrderLineId, qty: string) => { updatedPoLineQty = qty; },
      updatePoStatus: async (_c: pg.PoolClient, _orgId: OrganizationId, _poId: PurchaseOrderId, status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED') => { updatedPoStatus = status; },
      insertPurchaseReceipt: async (_c: pg.PoolClient, receipt: PurchaseReceiptContract) => { insertedReceipt = receipt; }
    } as unknown as SupplierPostgresRepository;

    masterDataRepo = {
      findMaterialById: async (_c: pg.PoolClient, _orgId: OrganizationId, _matId: MaterialId) => (_orgId === orgId && _matId === materialId ? mockMaterial : null)
    } as unknown as MasterDataPostgresRepository;

    inventoryRepo = {
      insertLot: async (_c: pg.PoolClient, lot: InventoryLotContract) => { insertedLot = lot; },
      insertMovement: async (_c: pg.PoolClient, mov: StockLedgerMovementContract) => { insertedMovement = mov; }
    } as unknown as InventoryPostgresRepository;

    costingRepo = {
      insertLotValuation: async (_c: pg.PoolClient, val: LotValuationRecordContract) => { insertedValuation = val; }
    } as unknown as CostingPostgresRepository;

    useCase = new ReceivePurchaseOrderUseCase(
      supplierRepo,
      masterDataRepo,
      inventoryRepo,
      costingRepo
    );
  });

  it('should successfully execute inbound receipt, creating lot, movement, valuation, and receipt atomically', async () => {
    const command: ReceivePurchaseOrderCommand = {
      organizationId: orgId,
      receiptId,
      receiptNumber: 'REC-2026-001',
      poId,
      poLineId,
      supplierId,
      materialId,
      movementId,
      receivedQuantity: Quantity.of('60', 'KG'),
      unitPurchasePrice: Money.of('120000', 'IDR'),
      originLotReference: 'FARM-BAJAWA-LOT-9'
    };

    const result = await useCase.execute(command, dummyClient);

    assert.equal(result.receiptId, receiptId);
    assert.equal(result.lotNumber, 'LOT-REC-2026-001');
    assert.equal(result.quantityOnHand.amount.toString(), '60');
    assert.equal(result.quantityOnHand.uom, 'KG');

    // Verify InventoryLot created
    assert.ok(insertedLot);
    assert.equal(insertedLot!.organizationId, orgId);
    assert.equal(insertedLot!.quantityOnHand.amount.toString(), '60');
    assert.equal(insertedLot!.reservedQuantity.amount.toString(), '0');
    assert.equal(insertedLot!.lotState, 'ACTIVE');

    // Verify StockLedgerMovement (PURCHASE_RECEIPT) created
    assert.ok(insertedMovement);
    assert.equal(insertedMovement!.movementType, 'PURCHASE_RECEIPT');
    assert.equal(insertedMovement!.quantityDelta.amount.toString(), '60');
    assert.equal(insertedMovement!.quantityDelta.uom, 'KG');

    // Verify Initial LotValuationRecord created
    assert.ok(insertedValuation);
    assert.equal(insertedValuation!.materialCost.amount.toString(), '7200000'); // 60 * 120,000
    assert.equal(insertedValuation!.unitCost.unitPrice.toString(), '120000');
    assert.equal(insertedValuation!.conversionCost.amount.toString(), '0');

    // Verify PurchaseReceipt persisted
    assert.ok(insertedReceipt);
    assert.equal(insertedReceipt!.receiptNumber, 'REC-2026-001');
    assert.equal(insertedReceipt!.totalAmount.amount.toString(), '7200000');

    // Verify Partial PO Update
    assert.equal(updatedPoLineQty, '60');
    assert.equal(updatedPoStatus, 'PARTIALLY_RECEIVED');
  });

  it('should transition PO status to RECEIVED when full quantity is delivered', async () => {
    const command: ReceivePurchaseOrderCommand = {
      organizationId: orgId,
      receiptId,
      receiptNumber: 'REC-2026-002',
      poId,
      poLineId,
      supplierId,
      materialId,
      movementId,
      receivedQuantity: Quantity.of('100', 'KG'),
      unitPurchasePrice: Money.of('120000', 'IDR')
    };

    await useCase.execute(command, dummyClient);
    assert.equal(updatedPoLineQty, '100');
    assert.equal(updatedPoStatus, 'RECEIVED');
  });

  it('should reject receipt with negative or zero quantity', async () => {
    const zeroCmd: ReceivePurchaseOrderCommand = {
      organizationId: orgId,
      receiptId,
      receiptNumber: 'REC-2026-003',
      poId,
      poLineId,
      supplierId,
      materialId,
      movementId,
      receivedQuantity: Quantity.zero('KG'),
      unitPurchasePrice: Money.of('120000', 'IDR')
    };

    await assert.rejects(
      () => useCase.execute(zeroCmd, dummyClient),
      NegativeQuantityError
    );
  });

  it('should reject receipt with incompatible UOM dimension (e.g. UNIT for Mass Material)', async () => {
    const incompatibleCmd: ReceivePurchaseOrderCommand = {
      organizationId: orgId,
      receiptId,
      receiptNumber: 'REC-2026-004',
      poId,
      poLineId,
      supplierId,
      materialId,
      movementId,
      receivedQuantity: Quantity.of('10', 'UNIT'),
      unitPurchasePrice: Money.of('120000', 'IDR')
    };

    await assert.rejects(
      () => useCase.execute(incompatibleCmd, dummyClient),
      IncompatibleUomDimensionError
    );
  });

  it('should reject receipt if quantity exceeds remaining ordered quantity', async () => {
    const excessiveCmd: ReceivePurchaseOrderCommand = {
      organizationId: orgId,
      receiptId,
      receiptNumber: 'REC-2026-005',
      poId,
      poLineId,
      supplierId,
      materialId,
      movementId,
      receivedQuantity: Quantity.of('150', 'KG'), // Ordered was 100
      unitPurchasePrice: Money.of('120000', 'IDR')
    };

    await assert.rejects(
      () => useCase.execute(excessiveCmd, dummyClient),
      ExcessiveReceiptQuantityError
    );
  });

  it('should enforce tenant isolation and reject PO belonging to another organization', async () => {
    const crossTenantCmd: ReceivePurchaseOrderCommand = {
      organizationId: otherOrgId, // Tenant B attempting to receive Tenant A's PO
      receiptId,
      receiptNumber: 'REC-2026-006',
      poId,
      poLineId,
      supplierId,
      materialId,
      movementId,
      receivedQuantity: Quantity.of('50', 'KG'),
      unitPurchasePrice: Money.of('120000', 'IDR')
    };

    await assert.rejects(
      () => useCase.execute(crossTenantCmd, dummyClient),
      PurchaseOrderNotFoundError
    );
  });

  it('should reject receiving against a CANCELLED or COMPLETED PO', async () => {
    mockPo = { ...mockPo, status: 'CANCELLED' };

    const invalidStateCmd: ReceivePurchaseOrderCommand = {
      organizationId: orgId,
      receiptId,
      receiptNumber: 'REC-2026-007',
      poId,
      poLineId,
      supplierId,
      materialId,
      movementId,
      receivedQuantity: Quantity.of('50', 'KG'),
      unitPurchasePrice: Money.of('120000', 'IDR')
    };

    await assert.rejects(
      () => useCase.execute(invalidStateCmd, dummyClient),
      InvalidPurchaseOrderStateError
    );
  });
});
