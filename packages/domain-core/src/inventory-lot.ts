import { 
  InventoryLotContract, 
  InventoryLotId, 
  MaterialId, 
  OrganizationId, 
  StorageLocationId, 
  LotState 
} from '@roastery-os/contracts';
import { Quantity } from './quantity.js';
import { ReservationExceedsBalanceError, CrossTenantViolationError } from './errors.js';

export class InventoryLot implements InventoryLotContract {
  public readonly organizationId: OrganizationId;
  public readonly inventoryLotId: InventoryLotId;
  public readonly lotNumber: string;
  public readonly materialId: MaterialId;
  public readonly quantityOnHand: Quantity;
  public readonly reservedQuantity: Quantity;
  public readonly storageLocationId?: StorageLocationId;
  public readonly lotState: LotState;
  public readonly receivedAt: Date;
  public readonly expiresAt?: Date;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    organizationId: OrganizationId;
    inventoryLotId: InventoryLotId;
    lotNumber: string;
    materialId: MaterialId;
    quantityOnHand: Quantity;
    reservedQuantity: Quantity;
    storageLocationId?: StorageLocationId;
    lotState: LotState;
    receivedAt: Date;
    expiresAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.organizationId = params.organizationId;
    this.inventoryLotId = params.inventoryLotId;
    this.lotNumber = params.lotNumber;
    this.materialId = params.materialId;
    this.quantityOnHand = params.quantityOnHand;
    this.reservedQuantity = params.reservedQuantity;
    this.storageLocationId = params.storageLocationId;
    this.lotState = params.lotState;
    this.receivedAt = params.receivedAt;
    this.expiresAt = params.expiresAt;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();

    // Invariant Enforcement
    if (this.reservedQuantity.compare(this.quantityOnHand) > 0) {
      throw new ReservationExceedsBalanceError(
        this.reservedQuantity.toString(),
        this.quantityOnHand.toString()
      );
    }
  }

  public getAvailableQuantity(): Quantity {
    return this.quantityOnHand.sub(this.reservedQuantity);
  }

  public reserve(amount: Quantity): InventoryLot {
    const newReserved = this.reservedQuantity.add(amount);
    if (newReserved.compare(this.quantityOnHand) > 0) {
      throw new ReservationExceedsBalanceError(
        newReserved.toString(),
        this.quantityOnHand.toString()
      );
    }
    return new InventoryLot({
      ...this,
      reservedQuantity: newReserved,
      updatedAt: new Date()
    });
  }

  public releaseReservation(amount: Quantity): InventoryLot {
    const newReserved = this.reservedQuantity.sub(amount);
    return new InventoryLot({
      ...this,
      reservedQuantity: newReserved,
      updatedAt: new Date()
    });
  }

  public verifyTenantMatch(otherOrgId: OrganizationId): void {
    if (this.organizationId !== otherOrgId) {
      throw new CrossTenantViolationError(this.organizationId as string, otherOrgId as string);
    }
  }
}
