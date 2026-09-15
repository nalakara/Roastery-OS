import pg from 'pg';
import { 
  InventoryLotContract, 
  InventoryLotId, 
  OrganizationId, 
  StockLedgerMovementContract 
} from '@roastery-os/contracts';
import { InventoryLot, Quantity } from '@roastery-os/domain-core';

export class InventoryPostgresRepository {
  /**
   * Retrieves an InventoryLot by composite key (organizationId, inventoryLotId).
   */
  public async findLotById(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    lotId: InventoryLotId
  ): Promise<InventoryLot | null> {
    const res = await client.query(
      `SELECT * FROM inventory_lot WHERE organization_id = $1 AND inventory_lot_id = $2`,
      [organizationId, lotId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return new InventoryLot({
      organizationId: row.organization_id,
      inventoryLotId: row.inventory_lot_id,
      lotNumber: row.lot_number,
      materialId: row.material_id,
      quantityOnHand: Quantity.of(row.quantity_on_hand, row.uom),
      reservedQuantity: Quantity.of(row.reserved_quantity, row.uom),
      storageLocationId: row.storage_location_id,
      lotState: row.lot_state,
      receivedAt: row.received_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  /**
   * Lists all InventoryLots for an organization.
   */
  public async listLots(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId
  ): Promise<InventoryLot[]> {
    const res = await client.query(
      `SELECT * FROM inventory_lot WHERE organization_id = $1 ORDER BY received_at DESC`,
      [organizationId]
    );

    return res.rows.map((row) => new InventoryLot({
      organizationId: row.organization_id,
      inventoryLotId: row.inventory_lot_id,
      lotNumber: row.lot_number,
      materialId: row.material_id,
      quantityOnHand: Quantity.of(row.quantity_on_hand, row.uom),
      reservedQuantity: Quantity.of(row.reserved_quantity, row.uom),
      storageLocationId: row.storage_location_id,
      lotState: row.lot_state,
      receivedAt: row.received_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Retrieves and row-locks an InventoryLot for update (SELECT ... FOR UPDATE).
   * Guarantees concurrency protection against double-spending of stock.
   */
  public async findLotByIdForUpdate(
    client: pg.PoolClient,
    organizationId: OrganizationId,
    lotId: InventoryLotId
  ): Promise<InventoryLot | null> {
    const res = await client.query(
      `SELECT * FROM inventory_lot 
       WHERE organization_id = $1 AND inventory_lot_id = $2 
       FOR UPDATE`,
      [organizationId, lotId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return new InventoryLot({
      organizationId: row.organization_id,
      inventoryLotId: row.inventory_lot_id,
      lotNumber: row.lot_number,
      materialId: row.material_id,
      quantityOnHand: Quantity.of(row.quantity_on_hand, row.uom),
      reservedQuantity: Quantity.of(row.reserved_quantity, row.uom),
      storageLocationId: row.storage_location_id,
      lotState: row.lot_state,
      receivedAt: row.received_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  /**
   * Updates an existing InventoryLot's materialized quantity_on_hand and reserved_quantity.
   */
  public async updateLotBalance(
    client: pg.PoolClient,
    lot: InventoryLotContract
  ): Promise<void> {
    await client.query(
      `UPDATE inventory_lot 
       SET quantity_on_hand = $1, reserved_quantity = $2, lot_state = $3, updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = $4 AND inventory_lot_id = $5`,
      [
        lot.quantityOnHand.amount.toString(),
        lot.reservedQuantity.amount.toString(),
        lot.lotState,
        lot.organizationId,
        lot.inventoryLotId
      ]
    );
  }

  /**
   * Inserts a newly materialized InventoryLot.
   */
  public async insertLot(
    client: pg.PoolClient,
    lot: InventoryLotContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO inventory_lot (
        organization_id, inventory_lot_id, lot_number, material_id,
        quantity_on_hand, reserved_quantity, uom, storage_location_id,
        lot_state, received_at, expires_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        lot.organizationId,
        lot.inventoryLotId,
        lot.lotNumber,
        lot.materialId,
        lot.quantityOnHand.amount.toString(),
        lot.reservedQuantity.amount.toString(),
        lot.quantityOnHand.uom,
        lot.storageLocationId ?? null,
        lot.lotState,
        lot.receivedAt,
        lot.expiresAt ?? null,
        lot.createdAt,
        lot.updatedAt
      ]
    );
  }

  /**
   * Appends an authoritative physical StockLedgerMovement.
   */
  public async insertMovement(
    client: pg.PoolClient,
    movement: StockLedgerMovementContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO stock_ledger_movement (
        organization_id, movement_id, movement_number, inventory_lot_id,
        movement_type, quantity_delta, uom, source_location_id,
        destination_location_id, reference_entity_type, reference_entity_id,
        operator_id, occurred_at, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        movement.organizationId,
        movement.movementId,
        movement.movementNumber,
        movement.inventoryLotId,
        movement.movementType,
        movement.quantityDelta.amount.toString(),
        movement.quantityDelta.uom,
        movement.sourceLocationId ?? null,
        movement.destinationLocationId ?? null,
        movement.referenceEntityType,
        movement.referenceEntityId,
        movement.operatorId ?? null,
        movement.occurredAt,
        movement.notes ?? null
      ]
    );
  }

  /**
   * Retrieves a StockLedgerMovement by ID.
   */
  public async findMovementById(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    movementId: string
  ): Promise<StockLedgerMovementContract | null> {
    const res = await client.query(
      `SELECT * FROM stock_ledger_movement WHERE organization_id = $1 AND movement_id = $2`,
      [organizationId, movementId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      organizationId: row.organization_id,
      movementId: row.movement_id,
      movementNumber: row.movement_number,
      inventoryLotId: row.inventory_lot_id,
      movementType: row.movement_type,
      quantityDelta: { amount: row.quantity_delta, uom: row.uom },
      sourceLocationId: row.source_location_id,
      destinationLocationId: row.destination_location_id,
      referenceEntityType: row.reference_entity_type,
      referenceEntityId: row.reference_entity_id,
      operatorId: row.operator_id,
      occurredAt: row.occurred_at,
      notes: row.notes
    };
  }
}
