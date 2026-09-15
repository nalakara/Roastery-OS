import pg from 'pg';
import { 
  MaterialId, 
  MaterialMasterContract, 
  OrganizationId, 
  ProductId, 
  ProductMasterContract, 
  SkuId, 
  SkuMasterContract 
} from '@roastery-os/contracts';

export class MasterDataPostgresRepository {
  public async findMaterialById(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    materialId: MaterialId
  ): Promise<MaterialMasterContract | null> {
    const res = await client.query(
      `SELECT * FROM material_master WHERE organization_id = $1 AND material_id = $2`,
      [organizationId, materialId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      organizationId: row.organization_id,
      materialId: row.material_id,
      code: row.code,
      name: row.name,
      category: row.category,
      baseUom: row.base_uom,
      description: row.description,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public async listMaterials(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId
  ): Promise<MaterialMasterContract[]> {
    const res = await client.query(
      `SELECT * FROM material_master WHERE organization_id = $1 ORDER BY code ASC`,
      [organizationId]
    );

    return res.rows.map((row) => ({
      organizationId: row.organization_id,
      materialId: row.material_id,
      code: row.code,
      name: row.name,
      category: row.category,
      baseUom: row.base_uom,
      description: row.description,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  public async listProducts(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId
  ): Promise<ProductMasterContract[]> {
    const res = await client.query(
      `SELECT * FROM product_master WHERE organization_id = $1 ORDER BY product_code ASC`,
      [organizationId]
    );

    return res.rows.map((row) => ({
      organizationId: row.organization_id,
      productId: row.product_id,
      code: row.product_code,
      name: row.name,
      brandLine: row.brand_line,
      description: row.description,
      primaryMaterialId: row.primary_material_id,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  public async findProductById(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    productId: ProductId
  ): Promise<ProductMasterContract | null> {
    const res = await client.query(
      `SELECT * FROM product_master WHERE organization_id = $1 AND product_id = $2`,
      [organizationId, productId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      organizationId: row.organization_id,
      productId: row.product_id,
      code: row.product_code,
      name: row.name,
      brandLine: row.brand_line,
      description: row.description,
      primaryMaterialId: row.primary_material_id,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public async listSkus(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId
  ): Promise<SkuMasterContract[]> {
    const res = await client.query(
      `SELECT * FROM sku_master WHERE organization_id = $1 ORDER BY sku_code ASC`,
      [organizationId]
    );

    return res.rows.map((row) => ({
      organizationId: row.organization_id,
      skuId: row.sku_id,
      skuCode: row.sku_code,
      productId: row.product_id,
      materialId: row.material_id,
      name: row.name,
      packagingType: row.packaging_type,
      packagedQuantity: {
        amount: row.packaged_quantity.toString(),
        uom: row.packaged_uom
      },
      barcode: row.barcode,
      baseRetailPrice: {
        amount: row.base_retail_price.toString(),
        currency: 'IDR'
      },
      baseWholesalePrice: {
        amount: row.base_wholesale_price.toString(),
        currency: 'IDR'
      },
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  public async findSkuById(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    skuId: SkuId
  ): Promise<SkuMasterContract | null> {
    const res = await client.query(
      `SELECT * FROM sku_master WHERE organization_id = $1 AND sku_id = $2`,
      [organizationId, skuId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      organizationId: row.organization_id,
      skuId: row.sku_id,
      skuCode: row.sku_code,
      productId: row.product_id,
      materialId: row.material_id,
      name: row.name,
      packagingType: row.packaging_type,
      packagedQuantity: {
        amount: row.packaged_quantity.toString(),
        uom: row.packaged_uom
      },
      barcode: row.barcode,
      baseRetailPrice: {
        amount: row.base_retail_price.toString(),
        currency: 'IDR'
      },
      baseWholesalePrice: {
        amount: row.base_wholesale_price.toString(),
        currency: 'IDR'
      },
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public async findSkusByProduct(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    productId: ProductId
  ): Promise<SkuMasterContract[]> {
    const res = await client.query(
      `SELECT * FROM sku_master WHERE organization_id = $1 AND product_id = $2 ORDER BY sku_code ASC`,
      [organizationId, productId]
    );

    return res.rows.map((row) => ({
      organizationId: row.organization_id,
      skuId: row.sku_id,
      skuCode: row.sku_code,
      productId: row.product_id,
      materialId: row.material_id,
      name: row.name,
      packagingType: row.packaging_type,
      packagedQuantity: {
        amount: row.packaged_quantity.toString(),
        uom: row.packaged_uom
      },
      barcode: row.barcode,
      baseRetailPrice: {
        amount: row.base_retail_price.toString(),
        currency: 'IDR'
      },
      baseWholesalePrice: {
        amount: row.base_wholesale_price.toString(),
        currency: 'IDR'
      },
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
}

