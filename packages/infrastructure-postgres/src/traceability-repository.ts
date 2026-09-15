import pg from 'pg';
import { 
  ProvenanceEdgeContract, 
  OrganizationId, 
  InventoryLotId 
} from '@roastery-os/contracts';

export class TraceabilityPostgresRepository {
  public async insertProvenanceEdge(
    client: pg.PoolClient,
    edge: ProvenanceEdgeContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO provenance_edge (
        organization_id, provenance_edge_id, source_lot_id,
        transformation_id, target_lot_id, consumed_quantity,
        uom, edge_type, recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        edge.organizationId,
        edge.provenanceEdgeId,
        edge.sourceLotId,
        edge.transformationId,
        edge.targetLotId,
        edge.consumedQuantity.amount.toString(),
        edge.consumedQuantity.uom,
        edge.edgeType,
        edge.recordedAt
      ]
    );
  }

  public async findEdgesByTargetLot(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    targetLotId: InventoryLotId
  ): Promise<ProvenanceEdgeContract[]> {
    const res = await client.query(
      `SELECT * FROM provenance_edge WHERE organization_id = $1 AND target_lot_id = $2`,
      [organizationId, targetLotId]
    );

    return res.rows.map((r) => ({
      organizationId: r.organization_id,
      provenanceEdgeId: r.provenance_edge_id,
      sourceLotId: r.source_lot_id,
      transformationId: r.transformation_id,
      targetLotId: r.target_lot_id,
      consumedQuantity: { amount: r.consumed_quantity, uom: r.uom },
      edgeType: r.edge_type,
      recordedAt: r.recorded_at
    }));
  }

  public async findEdgesBySourceLot(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    sourceLotId: InventoryLotId
  ): Promise<ProvenanceEdgeContract[]> {
    const res = await client.query(
      `SELECT * FROM provenance_edge WHERE organization_id = $1 AND source_lot_id = $2`,
      [organizationId, sourceLotId]
    );

    return res.rows.map((r) => ({
      organizationId: r.organization_id,
      provenanceEdgeId: r.provenance_edge_id,
      sourceLotId: r.source_lot_id,
      transformationId: r.transformation_id,
      targetLotId: r.target_lot_id,
      consumedQuantity: { amount: r.consumed_quantity, uom: r.uom },
      edgeType: r.edge_type,
      recordedAt: r.recorded_at
    }));
  }

  public async findEdgesByTransformation(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    transformationId: string
  ): Promise<ProvenanceEdgeContract[]> {
    const res = await client.query(
      `SELECT * FROM provenance_edge WHERE organization_id = $1 AND transformation_id = $2`,
      [organizationId, transformationId]
    );

    return res.rows.map((r) => ({
      organizationId: r.organization_id,
      provenanceEdgeId: r.provenance_edge_id,
      sourceLotId: r.source_lot_id,
      transformationId: r.transformation_id,
      targetLotId: r.target_lot_id,
      consumedQuantity: { amount: r.consumed_quantity, uom: r.uom },
      edgeType: r.edge_type,
      recordedAt: r.recorded_at
    }));
  }
}

