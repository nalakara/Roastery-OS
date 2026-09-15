import { 
  BatchId, 
  CostEventCategory, 
  CostEventId, 
  InventoryLotId, 
  MaterialId, 
  MovementId, 
  OrganizationId, 
  ProvenanceEdgeId, 
  TransformationId, 
  TransformationInputId, 
  TransformationOutputId, 
  ValuationRecordId,
  CostAllocationPolicy,
  CostAllocationBasis
} from '@roastery-os/contracts';
import { Money, Quantity } from '@roastery-os/domain-core';

export interface ConsumedInputParam {
  readonly transformationInputId: TransformationInputId;
  readonly inventoryLotId: InventoryLotId;
  readonly materialId: MaterialId;
  readonly plannedQuantity: Quantity;
  readonly actualQuantityConsumed: Quantity;
  readonly movementId: MovementId;
  readonly inputSequence: number;
}

export interface PhysicalOutputParam {
  readonly transformationOutputId: TransformationOutputId;
  readonly materialId: MaterialId;
  readonly outputType: 'PRIMARY_PRODUCT' | 'CO_PRODUCT' | 'BY_PRODUCT' | 'RECOVERABLE_RESIDUE';
  readonly actualQuantityProduced: Quantity;
  readonly createdLotId: InventoryLotId;
  readonly lotNumber: string;
  readonly movementId: MovementId;
  readonly valuationRecordId: ValuationRecordId;
}

export interface WasteOutputParam {
  readonly transformationOutputId: TransformationOutputId;
  readonly materialId: MaterialId;
  readonly outputType: 'UNRECOVERABLE_WASTE';
  readonly actualQuantityProduced: Quantity;
}

export type ProducedOutputParam = PhysicalOutputParam | WasteOutputParam;

export interface DirectCostEventParam {
  readonly costEventId: CostEventId;
  readonly costCategory: CostEventCategory;
  readonly allocatedAmount: Money;
  readonly allocationBasis: CostAllocationBasis;
}

export interface ProvenanceEdgeParam {
  readonly provenanceEdgeId: ProvenanceEdgeId;
  readonly sourceLotId: InventoryLotId;
  readonly targetLotId: InventoryLotId;
  readonly consumedQuantity: Quantity;
}

export interface CompleteTransformationCommand {
  readonly organizationId: OrganizationId;
  readonly transformationId: TransformationId;
  readonly batchId?: BatchId;
  readonly allocationPolicy?: CostAllocationPolicy; // Defaults to FULL_ABSORPTION or MASS_PRO_RATA
  readonly inputs: readonly ConsumedInputParam[];
  readonly outputs: readonly ProducedOutputParam[];
  readonly costEvents: readonly DirectCostEventParam[];
  readonly provenanceEdges: readonly ProvenanceEdgeParam[];
  readonly completedAt?: Date;
}

export interface CompleteTransformationResult {
  readonly transformationId: TransformationId;
  readonly status: 'COMPLETED';
  readonly completedAt: Date;
  readonly consumedInputCount: number;
  readonly createdOutputLotCount: number;
  readonly totalEconomicPool: Money;
  readonly provenanceEdgeCount: number;
}

export class TransformationNotFoundError extends Error {
  constructor(txId: string, orgId: string) {
    super(`Transformation '${txId}' not found for organization '${orgId}'`);
    this.name = 'TransformationNotFoundError';
  }
}

export class InvalidTransformationStateError extends Error {
  constructor(status: string) {
    super(`Transformation cannot be completed in status '${status}'`);
    this.name = 'InvalidTransformationStateError';
  }
}

export class InsufficientLotQuantityError extends Error {
  constructor(lotId: string, requested: string, available: string) {
    super(`Insufficient available inventory in lot '${lotId}': requested ${requested}, available ${available}`);
    this.name = 'InsufficientLotQuantityError';
  }
}

export class MaterialIdentityMismatchError extends Error {
  constructor(lotId: string, expectedMaterial: string, lotMaterial: string) {
    super(`Material identity mismatch for lot '${lotId}': expected '${expectedMaterial}', found '${lotMaterial}'`);
    this.name = 'MaterialIdentityMismatchError';
  }
}

export class EmptyTransformationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'EmptyTransformationError';
  }
}
