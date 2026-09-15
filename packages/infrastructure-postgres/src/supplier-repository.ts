import pg from 'pg';
import { 
  OrganizationId, 
  PurchaseOrderContract, 
  PurchaseOrderId, 
  PurchaseOrderLineContract, 
  PurchaseOrderLineId, 
  PurchaseReceiptContract,
  PurchaseReceiptId
} from '@roastery-os/contracts';

export class SupplierPostgresRepository {
  public async findPurchaseOrder(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    poId: PurchaseOrderId
  ): Promise<PurchaseOrderContract | null> {
    const poRes = await client.query(
      `SELECT * FROM purchase_order WHERE organization_id = $1 AND po_id = $2`,
      [organizationId, poId]
    );

    if (poRes.rows.length === 0) {
      return null;
    }

    const poRow = poRes.rows[0];

    const linesRes = await client.query(
      `SELECT * FROM purchase_order_line WHERE organization_id = $1 AND po_id = $2`,
      [organizationId, poId]
    );

    const lines: PurchaseOrderLineContract[] = linesRes.rows.map((row) => ({
      organizationId: row.organization_id,
      poLineId: row.po_line_id,
      poId: row.po_id,
      materialId: row.material_id,
      orderedQuantity: { amount: row.ordered_quantity, uom: row.uom },
      receivedQuantity: { amount: row.received_quantity, uom: row.uom },
      unitPurchasePrice: { amount: row.unit_purchase_price, currency: poRow.currency },
      lineTotal: { amount: row.line_total, currency: poRow.currency }
    }));

    return {
      organizationId: poRow.organization_id,
      poId: poRow.po_id,
      poNumber: poRow.po_number,
      supplierId: poRow.supplier_id,
      status: poRow.status,
      lines,
      totalAmount: { amount: poRow.total_amount, currency: poRow.currency },
      issuedAt: poRow.issued_at,
      expectedAt: poRow.expected_at,
      createdAt: poRow.created_at,
      updatedAt: poRow.updated_at
    };
  }

  public async findPurchaseOrderLine(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    poId: PurchaseOrderId,
    poLineId: PurchaseOrderLineId
  ): Promise<PurchaseOrderLineContract | null> {
    const res = await client.query(
      `SELECT pol.*, po.currency 
       FROM purchase_order_line pol
       JOIN purchase_order po ON po.organization_id = pol.organization_id AND po.po_id = pol.po_id
       WHERE pol.organization_id = $1 AND pol.po_id = $2 AND pol.po_line_id = $3`,
      [organizationId, poId, poLineId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      organizationId: row.organization_id,
      poLineId: row.po_line_id,
      poId: row.po_id,
      materialId: row.material_id,
      orderedQuantity: { amount: row.ordered_quantity, uom: row.uom },
      receivedQuantity: { amount: row.received_quantity, uom: row.uom },
      unitPurchasePrice: { amount: row.unit_purchase_price, currency: row.currency },
      lineTotal: { amount: row.line_total, currency: row.currency }
    };
  }

  public async updatePoLineReceivedQuantity(
    client: pg.PoolClient,
    organizationId: OrganizationId,
    poLineId: PurchaseOrderLineId,
    newReceivedQuantity: string
  ): Promise<void> {
    await client.query(
      `UPDATE purchase_order_line 
       SET received_quantity = $1 
       WHERE organization_id = $2 AND po_line_id = $3`,
      [newReceivedQuantity, organizationId, poLineId]
    );
  }

  public async updatePoStatus(
    client: pg.PoolClient,
    organizationId: OrganizationId,
    poId: PurchaseOrderId,
    status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  ): Promise<void> {
    await client.query(
      `UPDATE purchase_order 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE organization_id = $2 AND po_id = $3`,
      [status, organizationId, poId]
    );
  }

  public async listPurchaseOrders(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId
  ): Promise<PurchaseOrderContract[]> {
    const poRes = await client.query(
      `SELECT * FROM purchase_order WHERE organization_id = $1 ORDER BY created_at DESC`,
      [organizationId]
    );

    const pos: PurchaseOrderContract[] = [];
    for (const poRow of poRes.rows) {
      const linesRes = await client.query(
        `SELECT * FROM purchase_order_line WHERE organization_id = $1 AND po_id = $2`,
        [organizationId, poRow.po_id]
      );
      const lines: PurchaseOrderLineContract[] = linesRes.rows.map((row) => ({
        organizationId: row.organization_id,
        poLineId: row.po_line_id,
        poId: row.po_id,
        materialId: row.material_id,
        orderedQuantity: { amount: row.ordered_quantity, uom: row.uom },
        receivedQuantity: { amount: row.received_quantity, uom: row.uom },
        unitPurchasePrice: { amount: row.unit_purchase_price, currency: poRow.currency },
        lineTotal: { amount: row.line_total, currency: poRow.currency }
      }));

      pos.push({
        organizationId: poRow.organization_id,
        poId: poRow.po_id,
        poNumber: poRow.po_number,
        supplierId: poRow.supplier_id,
        status: poRow.status,
        lines,
        totalAmount: { amount: poRow.total_amount, currency: poRow.currency },
        issuedAt: poRow.issued_at,
        expectedAt: poRow.expected_at,
        createdAt: poRow.created_at,
        updatedAt: poRow.updated_at
      });
    }

    return pos;
  }

  public async findPurchaseReceipt(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    receiptId: PurchaseReceiptId
  ): Promise<PurchaseReceiptContract | null> {
    const res = await client.query(
      `SELECT * FROM purchase_receipt WHERE organization_id = $1 AND receipt_id = $2`,
      [organizationId, receiptId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      organizationId: row.organization_id,
      receiptId: row.receipt_id,
      receiptNumber: row.receipt_number,
      poId: row.po_id,
      poLineId: row.po_line_id,
      supplierId: row.supplier_id,
      materialId: row.material_id,
      createdLotId: row.created_lot_id,
      movementId: row.movement_id,
      receivedQuantity: { amount: row.received_quantity, uom: row.uom },
      unitPurchasePrice: { amount: row.unit_purchase_price, currency: row.currency },
      totalAmount: { amount: row.total_amount, currency: row.currency },
      originLotReference: row.origin_lot_reference,
      receivedAt: row.received_at
    };
  }

  public async findPurchaseReceiptsByPo(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    poId: PurchaseOrderId
  ): Promise<PurchaseReceiptContract[]> {
    const res = await client.query(
      `SELECT * FROM purchase_receipt WHERE organization_id = $1 AND po_id = $2 ORDER BY received_at DESC`,
      [organizationId, poId]
    );

    return res.rows.map((row) => ({
      organizationId: row.organization_id,
      receiptId: row.receipt_id,
      receiptNumber: row.receipt_number,
      poId: row.po_id,
      poLineId: row.po_line_id,
      supplierId: row.supplier_id,
      materialId: row.material_id,
      createdLotId: row.created_lot_id,
      movementId: row.movement_id,
      receivedQuantity: { amount: row.received_quantity, uom: row.uom },
      unitPurchasePrice: { amount: row.unit_purchase_price, currency: row.currency },
      totalAmount: { amount: row.total_amount, currency: row.currency },
      originLotReference: row.origin_lot_reference,
      receivedAt: row.received_at
    }));
  }

  public async listSuppliers(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId
  ): Promise<any[]> {
    const res = await client.query(
      `SELECT * FROM supplier_master WHERE organization_id = $1 ORDER BY supplier_code ASC`,
      [organizationId]
    );

    return res.rows.map((row) => ({
      organizationId: row.organization_id,
      supplierId: row.supplier_id,
      supplierCode: row.supplier_code,
      name: row.name,
      supplierType: row.supplier_type,
      contactPerson: row.contact_person,
      email: row.email,
      phone: row.phone,
      originCountry: row.origin_country,
      originRegion: row.origin_region,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  public async insertPurchaseReceipt(
    client: pg.PoolClient,
    receipt: PurchaseReceiptContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO purchase_receipt (
        organization_id, receipt_id, receipt_number, po_id, po_line_id,
        supplier_id, material_id, created_lot_id, movement_id,
        received_quantity, uom, unit_purchase_price, total_amount,
        currency, origin_lot_reference, received_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        receipt.organizationId,
        receipt.receiptId,
        receipt.receiptNumber,
        receipt.poId,
        receipt.poLineId,
        receipt.supplierId,
        receipt.materialId,
        receipt.createdLotId,
        receipt.movementId,
        receipt.receivedQuantity.amount.toString(),
        receipt.receivedQuantity.uom,
        receipt.unitPurchasePrice.amount.toString(),
        receipt.totalAmount.amount.toString(),
        receipt.totalAmount.currency,
        receipt.originLotReference ?? null,
        receipt.receivedAt
      ]
    );
  }
}
