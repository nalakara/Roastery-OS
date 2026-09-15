import pg from 'pg';
import { 
  TransformationContract, 
  TransformationId, 
  OrganizationId, 
  TransformationInputContract, 
  TransformationOutputContract,
  BatchExecutionContract,
  BatchId
} from '@roastery-os/contracts';

export class TransformationPostgresRepository {
  /**
   * Loads a Transformation by composite key (organizationId, transformationId).
   */
  public async findTransformationById(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    transformationId: TransformationId
  ): Promise<TransformationContract | null> {
    const res = await client.query(
      `SELECT * FROM transformation WHERE organization_id = $1 AND transformation_id = $2`,
      [organizationId, transformationId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];

    // Load inputs
    const inputsRes = await client.query(
      `SELECT * FROM transformation_input WHERE organization_id = $1 AND transformation_id = $2 ORDER BY input_sequence ASC`,
      [organizationId, transformationId]
    );

    const inputs: TransformationInputContract[] = inputsRes.rows.map((r) => ({
      organizationId: r.organization_id,
      transformationInputId: r.transformation_input_id,
      transformationId: r.transformation_id,
      inventoryLotId: r.inventory_lot_id,
      materialId: r.material_id,
      plannedQuantity: { amount: r.planned_quantity, uom: r.uom },
      actualQuantityConsumed: r.actual_quantity_consumed ? { amount: r.actual_quantity_consumed, uom: r.uom } : undefined,
      inputSequence: r.input_sequence,
      movementId: r.movement_id ?? undefined
    }));

    // Load outputs
    const outputsRes = await client.query(
      `SELECT * FROM transformation_output WHERE organization_id = $1 AND transformation_id = $2`,
      [organizationId, transformationId]
    );

    const outputs: TransformationOutputContract[] = outputsRes.rows.map((r) => {
      if (r.output_type === 'UNRECOVERABLE_WASTE') {
        return {
          organizationId: r.organization_id,
          transformationOutputId: r.transformation_output_id,
          transformationId: r.transformation_id,
          outputType: 'UNRECOVERABLE_WASTE',
          materialId: r.material_id,
          actualQuantityProduced: { amount: r.actual_quantity_produced, uom: r.uom },
          createdLotId: null,
          movementId: null
        };
      }
      return {
        organizationId: r.organization_id,
        transformationOutputId: r.transformation_output_id,
        transformationId: r.transformation_id,
        outputType: r.output_type,
        materialId: r.material_id,
        actualQuantityProduced: { amount: r.actual_quantity_produced, uom: r.uom },
        createdLotId: r.created_lot_id,
        movementId: r.movement_id
      };
    });

    return {
      organizationId: row.organization_id,
      transformationId: row.transformation_id,
      transformationNumber: row.transformation_number,
      archetype: row.archetype,
      status: row.status,
      inputs,
      outputs,
      startedAt: row.started_at ?? undefined,
      completedAt: row.completed_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public async insertTransformation(
    client: pg.PoolClient,
    tx: TransformationContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO transformation (
        organization_id, transformation_id, transformation_number, archetype,
        status, started_at, completed_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        tx.organizationId,
        tx.transformationId,
        tx.transformationNumber,
        tx.archetype,
        tx.status,
        tx.startedAt ?? null,
        tx.completedAt ?? null,
        tx.createdAt,
        tx.updatedAt
      ]
    );
  }

  public async insertTransformationInput(
    client: pg.PoolClient,
    input: TransformationInputContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO transformation_input (
        organization_id, transformation_input_id, transformation_id,
        inventory_lot_id, material_id, planned_quantity, actual_quantity_consumed,
        uom, input_sequence, movement_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        input.organizationId,
        input.transformationInputId,
        input.transformationId,
        input.inventoryLotId,
        input.materialId,
        input.plannedQuantity.amount.toString(),
        input.actualQuantityConsumed ? input.actualQuantityConsumed.amount.toString() : null,
        input.plannedQuantity.uom,
        input.inputSequence,
        input.movementId ?? null
      ]
    );
  }

  public async insertTransformationOutput(
    client: pg.PoolClient,
    output: TransformationOutputContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO transformation_output (
        organization_id, transformation_output_id, transformation_id,
        created_lot_id, material_id, output_type, actual_quantity_produced,
        uom, movement_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        output.organizationId,
        output.transformationOutputId,
        output.transformationId,
        output.createdLotId ?? null,
        output.materialId,
        output.outputType,
        output.actualQuantityProduced.amount.toString(),
        output.actualQuantityProduced.uom,
        output.movementId ?? null
      ]
    );
  }

  public async updateTransformationStatus(
    client: pg.PoolClient,
    organizationId: OrganizationId,
    transformationId: TransformationId,
    status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    completedAt?: Date
  ): Promise<void> {
    await client.query(
      `UPDATE transformation 
       SET status = $1, completed_at = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE organization_id = $3 AND transformation_id = $4`,
      [status, completedAt ?? new Date(), organizationId, transformationId]
    );
  }

  public async updateBatchStatus(
    client: pg.PoolClient,
    organizationId: OrganizationId,
    batchId: BatchId,
    status: 'PLANNED' | 'EXECUTING' | 'COMPLETED' | 'ABORTED',
    completedAt?: Date
  ): Promise<void> {
    await client.query(
      `UPDATE batch 
       SET status = $1, completed_at = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE organization_id = $3 AND batch_id = $4`,
      [status, completedAt ?? new Date(), organizationId, batchId]
    );
  }

  public async listTransformations(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId
  ): Promise<TransformationContract[]> {
    const res = await client.query(
      `SELECT * FROM transformation WHERE organization_id = $1 ORDER BY created_at DESC`,
      [organizationId]
    );

    const list: TransformationContract[] = [];
    for (const row of res.rows) {
      const full = await this.findTransformationById(client, organizationId, row.transformation_id);
      if (full) list.push(full);
    }
    return list;
  }

  public async insertBatch(
    client: pg.PoolClient,
    batch: BatchExecutionContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO batch (
        organization_id, batch_id, batch_number, batch_type,
        transformation_id, equipment_id, operator_id, recipe_or_profile_id,
        ambient_temperature, ambient_humidity, process_telemetry,
        status, started_at, completed_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        batch.organizationId,
        batch.batchId,
        batch.batchNumber,
        batch.batchType,
        batch.transformationId ?? null,
        batch.equipmentId ?? null,
        batch.operatorId ?? null,
        batch.recipeOrProfileId ?? null,
        batch.ambientTemperature ?? null,
        batch.ambientHumidity ?? null,
        batch.processTelemetry ? JSON.stringify(batch.processTelemetry) : null,
        batch.status,
        batch.startedAt ?? null,
        batch.completedAt ?? null,
        batch.createdAt,
        batch.updatedAt
      ]
    );
  }

  public async findBatchByTransformation(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    transformationId: TransformationId
  ): Promise<BatchExecutionContract | null> {
    const res = await client.query(
      `SELECT * FROM batch WHERE organization_id = $1 AND transformation_id = $2`,
      [organizationId, transformationId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      organizationId: row.organization_id,
      batchId: row.batch_id,
      batchNumber: row.batch_number,
      batchType: row.batch_type,
      transformationId: row.transformation_id ?? undefined,
      equipmentId: row.equipment_id ?? undefined,
      operatorId: row.operator_id ?? undefined,
      recipeOrProfileId: row.recipe_or_profile_id ?? undefined,
      ambientTemperature: row.ambient_temperature ? row.ambient_temperature : undefined,
      ambientHumidity: row.ambient_humidity ? row.ambient_humidity : undefined,
      processTelemetry: row.process_telemetry ?? undefined,
      status: row.status,
      startedAt: row.started_at ?? undefined,
      completedAt: row.completed_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
