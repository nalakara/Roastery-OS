import pg from 'pg';
import {
  OrganizationId,
  CustomerMasterContract
} from '@roastery-os/contracts';

export class CustomerPostgresRepository {
  public async insertCustomer(
    client: pg.PoolClient | pg.Pool,
    customer: CustomerMasterContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO customer_master (
        organization_id,
        customer_id,
        customer_code,
        name,
        customer_type,
        contact_person,
        email,
        phone,
        address,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (organization_id, customer_id) DO UPDATE
      SET name = EXCLUDED.name,
          customer_type = EXCLUDED.customer_type,
          contact_person = EXCLUDED.contact_person,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP`,
      [
        customer.organizationId,
        customer.customerId,
        customer.customerCode,
        customer.name,
        customer.customerType,
        customer.contactPerson ?? null,
        customer.email ?? null,
        customer.phone ?? null,
        customer.address ?? null,
        customer.isActive,
        customer.createdAt ?? new Date(),
        customer.updatedAt ?? new Date()
      ]
    );
  }

  public async findCustomerById(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    customerIdOrCode: string
  ): Promise<CustomerMasterContract | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerIdOrCode);
    const query = isUuid
      ? `SELECT * FROM customer_master WHERE organization_id = $1 AND (customer_id = $2 OR customer_code = $2)`
      : `SELECT * FROM customer_master WHERE organization_id = $1 AND customer_code = $2`;

    const res = await client.query(query, [organizationId, customerIdOrCode]);

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    return {
      organizationId: row.organization_id,
      customerId: row.customer_id,
      customerCode: row.customer_code,
      name: row.name,
      customerType: row.customer_type,
      contactPerson: row.contact_person ?? undefined,
      email: row.email ?? undefined,
      phone: row.phone ?? undefined,
      address: row.address ?? undefined,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public async listCustomers(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId
  ): Promise<CustomerMasterContract[]> {
    const res = await client.query(
      `SELECT * FROM customer_master WHERE organization_id = $1 ORDER BY customer_code ASC`,
      [organizationId]
    );

    return res.rows.map(row => ({
      organizationId: row.organization_id,
      customerId: row.customer_id,
      customerCode: row.customer_code,
      name: row.name,
      customerType: row.customer_type,
      contactPerson: row.contact_person ?? undefined,
      email: row.email ?? undefined,
      phone: row.phone ?? undefined,
      address: row.address ?? undefined,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
}
