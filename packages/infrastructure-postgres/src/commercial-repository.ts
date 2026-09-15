import pg from 'pg';
import {
  OrganizationId,
  CommercialOrderContract,
  CommercialOrderLineContract,
  FulfillmentAllocationContract
} from '@roastery-os/contracts';

export class CommercialPostgresRepository {
  public async insertOrder(
    client: pg.PoolClient | pg.Pool,
    order: CommercialOrderContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO commercial_order (
        organization_id,
        order_id,
        order_number,
        channel,
        customer_id,
        status,
        subtotal,
        discount_total,
        tax_total,
        grand_total,
        currency,
        ordered_at,
        dispatched_at,
        completed_at,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        order.organizationId,
        order.orderId,
        order.orderNumber,
        order.channel,
        order.customerId ?? null,
        order.status,
        order.subtotal.amount.toString(),
        order.discountTotal.amount.toString(),
        order.taxTotal.amount.toString(),
        order.grandTotal.amount.toString(),
        order.grandTotal.currency,
        order.orderedAt,
        order.dispatchedAt ?? null,
        order.completedAt ?? null,
        new Date(),
        new Date()
      ]
    );
  }

  public async insertOrderLine(
    client: pg.PoolClient | pg.Pool,
    line: CommercialOrderLineContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO commercial_order_line (
        organization_id,
        order_line_id,
        order_id,
        sku_id,
        material_id,
        ordered_quantity,
        fulfilled_quantity,
        uom,
        unit_price,
        discount_amount,
        tax_amount,
        line_subtotal,
        line_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        line.organizationId,
        line.orderLineId,
        line.orderId,
        line.skuId,
        line.materialId,
        line.orderedQuantity.amount.toString(),
        line.fulfilledQuantity.amount.toString(),
        line.orderedQuantity.uom,
        line.unitPrice.amount.toString(),
        line.discountAmount.amount.toString(),
        line.taxAmount.amount.toString(),
        line.lineSubtotal.amount.toString(),
        line.lineStatus
      ]
    );
  }

  public async updateOrderLineFulfilledQuantity(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    orderLineId: string,
    fulfilledQuantity: string,
    lineStatus: string
  ): Promise<void> {
    await client.query(
      `UPDATE commercial_order_line 
       SET fulfilled_quantity = $1, line_status = $2 
       WHERE organization_id = $3 AND order_line_id = $4`,
      [fulfilledQuantity, lineStatus, organizationId, orderLineId]
    );
  }

  public async updateOrderStatus(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    orderId: string,
    status: string,
    dispatchedAt?: Date,
    completedAt?: Date
  ): Promise<void> {
    await client.query(
      `UPDATE commercial_order 
       SET status = $1, dispatched_at = COALESCE($2, dispatched_at), completed_at = COALESCE($3, completed_at), updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = $4 AND order_id = $5`,
      [status, dispatchedAt ?? null, completedAt ?? null, organizationId, orderId]
    );
  }

  public async insertFulfillmentAllocation(
    client: pg.PoolClient | pg.Pool,
    allocation: FulfillmentAllocationContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO fulfillment_allocation (
        organization_id,
        allocation_id,
        order_line_id,
        inventory_lot_id,
        allocated_quantity,
        uom,
        movement_id,
        allocated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        allocation.organizationId,
        allocation.allocationId,
        allocation.orderLineId,
        allocation.inventoryLotId,
        allocation.allocatedQuantity.amount.toString(),
        allocation.allocatedQuantity.uom,
        allocation.movementId ?? null,
        allocation.allocatedAt
      ]
    );
  }

  public async listAllocationsByOrderLine(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    orderLineId: string
  ): Promise<FulfillmentAllocationContract[]> {
    const res = await client.query(
      `SELECT * FROM fulfillment_allocation WHERE organization_id = $1 AND order_line_id = $2 ORDER BY allocated_at ASC`,
      [organizationId, orderLineId]
    );

    return res.rows.map((row) => ({
      organizationId: row.organization_id,
      allocationId: row.allocation_id,
      orderLineId: row.order_line_id,
      inventoryLotId: row.inventory_lot_id,
      allocatedQuantity: { amount: row.allocated_quantity, uom: row.uom },
      movementId: row.movement_id ?? undefined,
      allocatedAt: row.allocated_at
    }));
  }

  public async listAllocationsByOrder(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    orderId: string
  ): Promise<FulfillmentAllocationContract[]> {
    const res = await client.query(
      `SELECT fa.* 
       FROM fulfillment_allocation fa
       JOIN commercial_order_line col ON col.organization_id = fa.organization_id AND col.order_line_id = fa.order_line_id
       WHERE fa.organization_id = $1 AND col.order_id = $2
       ORDER BY fa.allocated_at ASC`,
      [organizationId, orderId]
    );

    return res.rows.map((row) => ({
      organizationId: row.organization_id,
      allocationId: row.allocation_id,
      orderLineId: row.order_line_id,
      inventoryLotId: row.inventory_lot_id,
      allocatedQuantity: { amount: row.allocated_quantity, uom: row.uom },
      movementId: row.movement_id ?? undefined,
      allocatedAt: row.allocated_at
    }));
  }

  public async findOrderById(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    orderId: string
  ): Promise<CommercialOrderContract | null> {
    const orderRes = await client.query(
      `SELECT * FROM commercial_order WHERE organization_id = $1 AND order_id = $2`,
      [organizationId, orderId]
    );

    if (orderRes.rows.length === 0) return null;
    const orderRow = orderRes.rows[0];

    const linesRes = await client.query(
      `SELECT * FROM commercial_order_line WHERE organization_id = $1 AND order_id = $2 ORDER BY order_line_id ASC`,
      [organizationId, orderId]
    );

    const lines: CommercialOrderLineContract[] = [];
    for (const lineRow of linesRes.rows) {
      const allocations = await this.listAllocationsByOrderLine(
        client,
        organizationId,
        lineRow.order_line_id
      );

      lines.push({
        organizationId: lineRow.organization_id,
        orderLineId: lineRow.order_line_id,
        orderId: lineRow.order_id,
        skuId: lineRow.sku_id,
        materialId: lineRow.material_id,
        orderedQuantity: { amount: lineRow.ordered_quantity, uom: lineRow.uom },
        fulfilledQuantity: { amount: lineRow.fulfilled_quantity, uom: lineRow.uom },
        unitPrice: { amount: lineRow.unit_price, currency: orderRow.currency },
        discountAmount: { amount: lineRow.discount_amount, currency: orderRow.currency },
        taxAmount: { amount: lineRow.tax_amount, currency: orderRow.currency },
        lineSubtotal: { amount: lineRow.line_subtotal, currency: orderRow.currency },
        lineStatus: lineRow.line_status,
        allocations
      });
    }

    return {
      organizationId: orderRow.organization_id,
      orderId: orderRow.order_id,
      orderNumber: orderRow.order_number,
      channel: orderRow.channel,
      customerId: orderRow.customer_id ?? undefined,
      status: orderRow.status,
      lines,
      subtotal: { amount: orderRow.subtotal, currency: orderRow.currency },
      discountTotal: { amount: orderRow.discount_total, currency: orderRow.currency },
      taxTotal: { amount: orderRow.tax_total, currency: orderRow.currency },
      grandTotal: { amount: orderRow.grand_total, currency: orderRow.currency },
      orderedAt: orderRow.ordered_at,
      dispatchedAt: orderRow.dispatched_at ?? undefined,
      completedAt: orderRow.completed_at ?? undefined,
      createdAt: orderRow.created_at,
      updatedAt: orderRow.updated_at
    };
  }

  public async listOrders(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    channel?: string
  ): Promise<CommercialOrderContract[]> {
    let query = `SELECT * FROM commercial_order WHERE organization_id = $1`;
    const params: any[] = [organizationId];

    if (channel) {
      params.push(channel);
      query += ` AND channel = $2`;
    }
    query += ` ORDER BY ordered_at DESC`;

    const ordersRes = await client.query(query, params);

    const orders: CommercialOrderContract[] = [];
    for (const row of ordersRes.rows) {
      const fullOrder = await this.findOrderById(client, organizationId, row.order_id);
      if (fullOrder) {
        orders.push(fullOrder);
      }
    }
    return orders;
  }
}

