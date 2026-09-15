import pg from 'pg';
import { 
  LotValuationRecordContract, 
  CostEventContract,
  CogsRecordContract,
  InventoryLotId, 
  TransformationId,
  OrganizationId 
} from '@roastery-os/contracts';

export class CostingPostgresRepository {
  public async insertLotValuation(
    client: pg.PoolClient,
    record: LotValuationRecordContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO lot_valuation_record (
        organization_id, valuation_record_id, inventory_lot_id,
        material_cost, conversion_cost, total_lot_cost,
        unit_cost, currency, allocation_policy, calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        record.organizationId,
        record.valuationRecordId,
        record.inventoryLotId,
        record.materialCost.amount.toString(),
        record.conversionCost.amount.toString(),
        record.totalLotCost.amount.toString(),
        record.unitCost.unitPrice.toString(),
        record.unitCost.currency,
        record.allocationPolicy,
        record.calculatedAt
      ]
    );
  }

  public async findLotValuation(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    inventoryLotId: InventoryLotId
  ): Promise<LotValuationRecordContract | null> {
    const res = await client.query(
      `SELECT lvr.*, il.uom 
       FROM lot_valuation_record lvr
       JOIN inventory_lot il ON il.organization_id = lvr.organization_id AND il.inventory_lot_id = lvr.inventory_lot_id
       WHERE lvr.organization_id = $1 AND lvr.inventory_lot_id = $2`,
      [organizationId, inventoryLotId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      organizationId: row.organization_id,
      valuationRecordId: row.valuation_record_id,
      inventoryLotId: row.inventory_lot_id,
      materialCost: { amount: row.material_cost, currency: row.currency },
      conversionCost: { amount: row.conversion_cost, currency: row.currency },
      totalLotCost: { amount: row.total_lot_cost, currency: row.currency },
      unitCost: {
        unitPrice: row.unit_cost,
        currency: row.currency,
        perUom: row.uom
      },
      allocationPolicy: row.allocation_policy,
      calculatedAt: row.calculated_at
    };
  }

  public async insertCostEvent(
    client: pg.PoolClient,
    event: CostEventContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO cost_event (
        organization_id, cost_event_id, transformation_id,
        cost_category, allocated_amount, currency,
        allocation_basis, recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        event.organizationId,
        event.costEventId,
        event.transformationId,
        event.costCategory,
        event.allocatedAmount.amount.toString(),
        event.allocatedAmount.currency,
        event.allocationBasis,
        event.recordedAt
      ]
    );
  }

  public async findCostEventsByTransformation(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    transformationId: TransformationId
  ): Promise<CostEventContract[]> {
    const res = await client.query(
      `SELECT * FROM cost_event WHERE organization_id = $1 AND transformation_id = $2`,
      [organizationId, transformationId]
    );

    return res.rows.map((r) => ({
      organizationId: r.organization_id,
      costEventId: r.cost_event_id,
      transformationId: r.transformation_id,
      costCategory: r.cost_category,
      allocatedAmount: { amount: r.allocated_amount, currency: r.currency },
      allocationBasis: r.allocation_basis,
      recordedAt: r.recorded_at
    }));
  }

  public async insertCogsRecord(
    client: pg.PoolClient,
    record: CogsRecordContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO cogs_record (
        organization_id, cogs_record_id, fulfillment_allocation_id,
        inventory_lot_id, dispatched_quantity, uom,
        unit_cost_snapshot, total_cogs_amount, currency, realized_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        record.organizationId,
        record.cogsRecordId,
        record.fulfillmentAllocationId,
        record.inventoryLotId,
        record.dispatchedQuantity.amount.toString(),
        record.dispatchedQuantity.uom,
        record.unitCostSnapshot.unitPrice.toString(),
        record.totalCogsAmount.amount.toString(),
        record.totalCogsAmount.currency,
        record.realizedAt
      ]
    );
  }

  public async findCogsByAllocation(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    allocationId: string
  ): Promise<CogsRecordContract | null> {
    const res = await client.query(
      `SELECT * FROM cogs_record WHERE organization_id = $1 AND fulfillment_allocation_id = $2`,
      [organizationId, allocationId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      organizationId: row.organization_id,
      cogsRecordId: row.cogs_record_id,
      fulfillmentAllocationId: row.fulfillment_allocation_id,
      inventoryLotId: row.inventory_lot_id,
      dispatchedQuantity: { amount: row.dispatched_quantity, uom: row.uom },
      unitCostSnapshot: { unitPrice: row.unit_cost_snapshot, currency: row.currency, perUom: row.uom },
      totalCogsAmount: { amount: row.total_cogs_amount, currency: row.currency },
      realizedAt: row.realized_at
    };
  }

  public async listCogsByOrder(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    orderId: string
  ): Promise<CogsRecordContract[]> {
    const res = await client.query(
      `SELECT c.* 
       FROM cogs_record c
       JOIN fulfillment_allocation fa ON fa.organization_id = c.organization_id AND fa.allocation_id = c.fulfillment_allocation_id
       JOIN commercial_order_line col ON col.organization_id = fa.organization_id AND col.order_line_id = fa.order_line_id
       WHERE c.organization_id = $1 AND col.order_id = $2`,
      [organizationId, orderId]
    );

    return res.rows.map((row) => ({
      organizationId: row.organization_id,
      cogsRecordId: row.cogs_record_id,
      fulfillmentAllocationId: row.fulfillment_allocation_id,
      inventoryLotId: row.inventory_lot_id,
      dispatchedQuantity: { amount: row.dispatched_quantity, uom: row.uom },
      unitCostSnapshot: { unitPrice: row.unit_cost_snapshot, currency: row.currency, perUom: row.uom },
      totalCogsAmount: { amount: row.total_cogs_amount, currency: row.currency },
      realizedAt: row.realized_at
    }));
  }
}
