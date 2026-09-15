import { 
  OrganizationId, 
  MaterialId, 
  ProductId, 
  SkuId, 
  InventoryLotId, 
  MovementId, 
  StorageLocationId,
  TransformationId,
  TransformationInputId,
  TransformationOutputId,
  BatchId,
  EquipmentId,
  OperatorId,
  CostEventId,
  ValuationRecordId,
  CogsRecordId,
  ProvenanceEdgeId,
  SupplierId,
  PurchaseOrderId,
  PurchaseOrderLineId,
  PurchaseReceiptId,
  CommercialOrderId,
  CommercialOrderLineId,
  FulfillmentAllocationId,
  CustomerId,
  BlendRecipeId,
  BlendRecipeComponentId
} from './identifiers.js';

import { 
  Uom, 
  QuantityContract, 
  MoneyContract, 
  UnitCostContract,
  DecimalValueContract 
} from './value-objects.js';

import { 
  MaterialCategory, 
  PackagingType, 
  LotState, 
  StockLedgerMovementType, 
  TransformationArchetype, 
  TransformationStatus, 
  BatchType, 
  BatchStatus, 
  CostEventCategory, 
  CostAllocationPolicy, 
  CostAllocationBasis, 
  ProvenanceEdgeType, 
  CommercialSalesChannel, 
  CommercialOrderStatus, 
  CommercialOrderLineStatus 
} from './vocabularies.js';

// Master Data (01_MASTER_DATA)

export interface MaterialMasterContract {
  readonly organizationId: OrganizationId;
  readonly materialId: MaterialId;
  readonly code: string;
  readonly name: string;
  readonly category: MaterialCategory;
  readonly baseUom: Uom;
  readonly description?: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProductMasterContract {
  readonly organizationId: OrganizationId;
  readonly productId: ProductId;
  readonly code: string;
  readonly name: string;
  readonly brandLine?: string;
  readonly description?: string;
  readonly primaryMaterialId?: MaterialId;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SkuMasterContract {
  readonly organizationId: OrganizationId;
  readonly skuId: SkuId;
  readonly skuCode: string;
  readonly productId: ProductId;
  readonly materialId: MaterialId;
  readonly name: string;
  readonly packagingType: PackagingType;
  readonly packagedQuantity: QuantityContract;
  readonly barcode?: string;
  readonly baseRetailPrice: MoneyContract;
  readonly baseWholesalePrice: MoneyContract;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// Inventory Engine (02_INVENTORY_ENGINE)

export interface InventoryLotContract {
  readonly organizationId: OrganizationId;
  readonly inventoryLotId: InventoryLotId;
  readonly lotNumber: string;
  readonly materialId: MaterialId;
  readonly quantityOnHand: QuantityContract;
  readonly reservedQuantity: QuantityContract;
  readonly storageLocationId?: StorageLocationId;
  readonly lotState: LotState;
  readonly receivedAt: Date;
  readonly expiresAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface StockLedgerMovementContract {
  readonly organizationId: OrganizationId;
  readonly movementId: MovementId;
  readonly movementNumber: string;
  readonly inventoryLotId: InventoryLotId;
  readonly movementType: StockLedgerMovementType;
  readonly quantityDelta: QuantityContract;
  readonly sourceLocationId?: StorageLocationId;
  readonly destinationLocationId?: StorageLocationId;
  readonly referenceEntityType: 'PURCHASE_ORDER' | 'TRANSFORMATION' | 'COMMERCIAL_ORDER' | 'INVENTORY_AUDIT';
  readonly referenceEntityId: string;
  readonly operatorId?: OperatorId;
  readonly occurredAt: Date;
  readonly notes?: string;
}

// Core Transformation & Batch Execution

export interface TransformationInputContract {
  readonly organizationId: OrganizationId;
  readonly transformationInputId: TransformationInputId;
  readonly transformationId: TransformationId;
  readonly inventoryLotId: InventoryLotId;
  readonly materialId: MaterialId;
  readonly plannedQuantity: QuantityContract;
  readonly actualQuantityConsumed?: QuantityContract;
  readonly inputSequence: number;
  readonly movementId?: MovementId;
}

export interface PhysicalTransformationOutputContract {
  readonly organizationId: OrganizationId;
  readonly transformationOutputId: TransformationOutputId;
  readonly transformationId: TransformationId;
  readonly outputType: 'PRIMARY_PRODUCT' | 'CO_PRODUCT' | 'BY_PRODUCT' | 'RECOVERABLE_RESIDUE';
  readonly materialId: MaterialId;
  readonly actualQuantityProduced: QuantityContract;
  readonly createdLotId: InventoryLotId;
  readonly movementId: MovementId;
}

export interface WasteTransformationOutputContract {
  readonly organizationId: OrganizationId;
  readonly transformationOutputId: TransformationOutputId;
  readonly transformationId: TransformationId;
  readonly outputType: 'UNRECOVERABLE_WASTE';
  readonly materialId: MaterialId;
  readonly actualQuantityProduced: QuantityContract;
  readonly createdLotId: null;
  readonly movementId: null;
}

export type TransformationOutputContract = 
  | PhysicalTransformationOutputContract 
  | WasteTransformationOutputContract;

export interface TransformationContract {
  readonly organizationId: OrganizationId;
  readonly transformationId: TransformationId;
  readonly transformationNumber: string;
  readonly archetype: TransformationArchetype;
  readonly status: TransformationStatus;
  readonly inputs: readonly TransformationInputContract[];
  readonly outputs: readonly TransformationOutputContract[];
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface BatchExecutionContract {
  readonly organizationId: OrganizationId;
  readonly batchId: BatchId;
  readonly batchNumber: string;
  readonly batchType: BatchType;
  readonly transformationId?: TransformationId;
  readonly equipmentId?: EquipmentId;
  readonly operatorId?: OperatorId;
  readonly recipeOrProfileId?: string;
  readonly ambientTemperature?: DecimalValueContract;
  readonly ambientHumidity?: DecimalValueContract;
  readonly processTelemetry?: Record<string, unknown>;
  readonly status: BatchStatus;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// Costing Engine (07_COSTING_ENGINE)

export interface CostEventContract {
  readonly organizationId: OrganizationId;
  readonly costEventId: CostEventId;
  readonly transformationId: TransformationId;
  readonly costCategory: CostEventCategory;
  readonly allocatedAmount: MoneyContract;
  readonly allocationBasis: CostAllocationBasis;
  readonly recordedAt: Date;
}

export interface LotValuationRecordContract {
  readonly organizationId: OrganizationId;
  readonly valuationRecordId: ValuationRecordId;
  readonly inventoryLotId: InventoryLotId;
  readonly materialCost: MoneyContract;
  readonly conversionCost: MoneyContract;
  readonly totalLotCost: MoneyContract;
  readonly unitCost: UnitCostContract;
  readonly allocationPolicy: CostAllocationPolicy;
  readonly calculatedAt: Date;
}

export interface CogsRecordContract {
  readonly organizationId: OrganizationId;
  readonly cogsRecordId: CogsRecordId;
  readonly fulfillmentAllocationId: FulfillmentAllocationId;
  readonly inventoryLotId: InventoryLotId;
  readonly dispatchedQuantity: QuantityContract;
  readonly unitCostSnapshot: UnitCostContract;
  readonly totalCogsAmount: MoneyContract;
  readonly realizedAt: Date;
}

// Traceability (08_BATCH_TRACEABILITY)

export interface ProvenanceEdgeContract {
  readonly organizationId: OrganizationId;
  readonly provenanceEdgeId: ProvenanceEdgeId;
  readonly sourceLotId: InventoryLotId;
  readonly transformationId: TransformationId;
  readonly targetLotId: InventoryLotId;
  readonly consumedQuantity: QuantityContract;
  readonly edgeType: ProvenanceEdgeType;
  readonly recordedAt: Date;
}

// Supplier System (09_SUPPLIER_SYSTEM)

export interface SupplierMasterContract {
  readonly organizationId: OrganizationId;
  readonly supplierId: SupplierId;
  readonly supplierCode: string;
  readonly name: string;
  readonly supplierType: string;
  readonly contactPerson?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly originCountry?: string;
  readonly originRegion?: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PurchaseOrderLineContract {
  readonly organizationId: OrganizationId;
  readonly poLineId: PurchaseOrderLineId;
  readonly poId: PurchaseOrderId;
  readonly materialId: MaterialId;
  readonly orderedQuantity: QuantityContract;
  readonly receivedQuantity: QuantityContract;
  readonly unitPurchasePrice: MoneyContract;
  readonly lineTotal: MoneyContract;
}

export interface PurchaseOrderContract {
  readonly organizationId: OrganizationId;
  readonly poId: PurchaseOrderId;
  readonly poNumber: string;
  readonly supplierId: SupplierId;
  readonly status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  readonly lines: readonly PurchaseOrderLineContract[];
  readonly totalAmount: MoneyContract;
  readonly issuedAt?: Date;
  readonly expectedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PurchaseReceiptContract {
  readonly organizationId: OrganizationId;
  readonly receiptId: PurchaseReceiptId;
  readonly receiptNumber: string;
  readonly poId: PurchaseOrderId;
  readonly poLineId: PurchaseOrderLineId;
  readonly supplierId: SupplierId;
  readonly materialId: MaterialId;
  readonly createdLotId: InventoryLotId;
  readonly movementId: MovementId;
  readonly receivedQuantity: QuantityContract;
  readonly unitPurchasePrice: MoneyContract;
  readonly totalAmount: MoneyContract;
  readonly originLotReference?: string;
  readonly receivedAt: Date;
}

// Commercial Sales & Fulfillment (06 / 10)

export interface CustomerMasterContract {
  readonly organizationId: OrganizationId;
  readonly customerId: CustomerId;
  readonly customerCode: string;
  readonly name: string;
  readonly customerType: string;
  readonly contactPerson?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly address?: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface FulfillmentAllocationContract {
  readonly organizationId: OrganizationId;
  readonly allocationId: FulfillmentAllocationId;
  readonly orderLineId: CommercialOrderLineId;
  readonly inventoryLotId: InventoryLotId;
  readonly allocatedQuantity: QuantityContract;
  readonly movementId?: MovementId;
  readonly allocatedAt: Date;
}

export interface CommercialOrderLineContract {
  readonly organizationId: OrganizationId;
  readonly orderLineId: CommercialOrderLineId;
  readonly orderId: CommercialOrderId;
  readonly skuId: SkuId;
  readonly materialId: MaterialId;
  readonly orderedQuantity: QuantityContract;
  readonly fulfilledQuantity: QuantityContract;
  readonly unitPrice: MoneyContract;
  readonly discountAmount: MoneyContract;
  readonly taxAmount: MoneyContract;
  readonly lineSubtotal: MoneyContract;
  readonly lineStatus: CommercialOrderLineStatus;
  readonly allocations: readonly FulfillmentAllocationContract[];
}

export interface CommercialOrderContract {
  readonly organizationId: OrganizationId;
  readonly orderId: CommercialOrderId;
  readonly orderNumber: string;
  readonly channel: CommercialSalesChannel;
  readonly customerId?: CustomerId;
  readonly status: CommercialOrderStatus;
  readonly lines: readonly CommercialOrderLineContract[];
  readonly subtotal: MoneyContract;
  readonly discountTotal: MoneyContract;
  readonly taxTotal: MoneyContract;
  readonly grandTotal: MoneyContract;
  readonly orderedAt: Date;
  readonly dispatchedAt?: Date;
  readonly completedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// Blend Engine (04_BLEND_ENGINE)

export interface BlendRecipeComponentContract {
  readonly organizationId: OrganizationId;
  readonly componentId: BlendRecipeComponentId;
  readonly recipeId: BlendRecipeId;
  readonly materialId: MaterialId;
  readonly targetRatioPercentage: DecimalValueContract;
  readonly sequenceNumber: number;
}

export interface BlendRecipeMasterContract {
  readonly organizationId: OrganizationId;
  readonly recipeId: BlendRecipeId;
  readonly recipeCode: string;
  readonly name: string;
  readonly outputMaterialId: MaterialId;
  readonly version: number;
  readonly description?: string;
  readonly components: readonly BlendRecipeComponentContract[];
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// Traceability Read-Model Contracts (08_BATCH_TRACEABILITY)

export interface TraceabilityLotNode {
  readonly inventoryLotId: InventoryLotId;
  readonly lotNumber: string;
  readonly materialId: MaterialId;
  readonly materialCode: string;
  readonly materialName: string;
  readonly materialCategory: string;
  readonly quantityOnHand: QuantityContract;
  readonly reservedQuantity: QuantityContract;
  readonly lotState: string;
  readonly receivedAt: Date;
  readonly unitCost?: UnitCostContract;
  readonly totalLotCost?: MoneyContract;
}

export interface TraceabilityTransformationNode {
  readonly transformationId: TransformationId;
  readonly transformationNumber: string;
  readonly archetype: string;
  readonly status: string;
  readonly completedAt?: Date;
  readonly recipeOrProfileId?: string;
}

export interface TraceabilitySupplierNode {
  readonly supplierId: SupplierId;
  readonly supplierCode: string;
  readonly name: string;
  readonly purchaseOrderId: PurchaseOrderId;
  readonly poNumber: string;
  readonly receiptId: PurchaseReceiptId;
  readonly receiptNumber: string;
  readonly originLotReference?: string;
  readonly receivedAt: Date;
}

export interface TraceabilityCommercialNode {
  readonly orderId: CommercialOrderId;
  readonly orderNumber: string;
  readonly channel: string;
  readonly customerName?: string;
  readonly customerCode?: string;
  readonly skuId: SkuId;
  readonly skuCode: string;
  readonly skuName: string;
  readonly fulfilledQuantity: QuantityContract;
  readonly unitPrice: MoneyContract;
  readonly orderedAt: Date;
}

export interface TraceabilityTreeResponse {
  readonly rootLot: TraceabilityLotNode;
  readonly upstreamChain: {
    readonly transformations: readonly {
      readonly transformation: TraceabilityTransformationNode;
      readonly consumedLots: readonly TraceabilityLotNode[];
    }[];
    readonly suppliers: readonly TraceabilitySupplierNode[];
  };
  readonly downstreamChain: {
    readonly transformations: readonly {
      readonly transformation: TraceabilityTransformationNode;
      readonly producedLots: readonly TraceabilityLotNode[];
    }[];
    readonly commercialFulfillments: readonly TraceabilityCommercialNode[];
  };
}

