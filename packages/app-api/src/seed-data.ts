import pg from 'pg';
import { 
  OrganizationId, 
  MaterialId, 
  SupplierId, 
  PurchaseOrderId, 
  PurchaseOrderLineId,
  StorageLocationId,
  ProductId,
  SkuId,
  CustomerId
} from '@roastery-os/contracts';
import { INITIAL_SCHEMA_DDL } from '@roastery-os/infrastructure-postgres';

export interface SeedContext {
  readonly orgId: OrganizationId;
  readonly supplierJava: SupplierId;
  readonly supplierPackaging: SupplierId;
  readonly customerCafeA: CustomerId;
  readonly customerDistributorB: CustomerId;
  readonly customerHospitalityC: CustomerId;
  readonly greenFlores: MaterialId;
  readonly greenColombia: MaterialId;
  readonly valvePouch: MaterialId;
  readonly roastedFlores: MaterialId;
  readonly roastedColombia: MaterialId;
  readonly roastedHouseBlend: MaterialId;
  readonly groundFlores: MaterialId;
  readonly pouch250g: MaterialId;
  readonly dripFilterSet: MaterialId;
  readonly fgFlores1kg: MaterialId;
  readonly fgFlores250gGrd: MaterialId;
  readonly fgFloresDrip10pk: MaterialId;
  readonly fgHouse1kg: MaterialId;
  readonly chaffWaste: MaterialId;
  readonly lotFloresGreen: string;
  readonly lotColombiaGreen: string;
  readonly lotFloresRoasted: string;
  readonly lotColombiaRoasted: string;
  readonly lotHouseRoasted: string;
  readonly lotPouch1kg: string;
  readonly lotPouch250g: string;
  readonly lotDripSet: string;
  readonly lotFgFloresA: string;
  readonly lotFgFloresB: string;
  readonly lotFgFloresC: string;
  readonly productFlores: ProductId;
  readonly productHouse: ProductId;
  readonly skuFlores1kg: SkuId;
  readonly skuFlores250gGrd: SkuId;
  readonly skuFloresDrip10pk: SkuId;
  readonly skuHouse1kg: SkuId;
  readonly poIssued: PurchaseOrderId;
  readonly poPartiallyReceived: PurchaseOrderId;
  readonly recipeHouseBlend: string;
}


export async function seedDatabase(pool: pg.Pool): Promise<SeedContext> {
  const client = await pool.connect();
  try {
    const cleanDdl = INITIAL_SCHEMA_DDL.replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/g, '');
    await client.query(cleanDdl);

    // Identifiers
    const orgId = '018f3a00-0000-7000-8000-000000000001' as OrganizationId;
    const supplierJava = '018f3a00-0000-7000-8000-000000000011' as SupplierId;
    const supplierPackaging = '018f3a00-0000-7000-8000-000000000012' as SupplierId;

    // Materials
    const greenFlores = '018f3a00-0000-7000-8000-000000000021' as MaterialId;
    const greenColombia = '018f3a00-0000-7000-8000-000000000022' as MaterialId;
    const valvePouch = '018f3a00-0000-7000-8000-000000000023' as MaterialId;

    const roastedFlores = '018f3a00-0000-7000-8000-000000000024' as MaterialId;
    const roastedColombia = '018f3a00-0000-7000-8000-000000000025' as MaterialId;
    const roastedHouseBlend = '018f3a00-0000-7000-8000-000000000026' as MaterialId;
    const groundFlores = '018f3a00-0000-7000-8000-000000000028' as MaterialId;

    const pouch250g = '018f3a00-0000-7000-8000-000000000029' as MaterialId;
    const dripFilterSet = '018f3a00-0000-7000-8000-00000000002a' as MaterialId;

    const fgFlores1kg = '018f3a00-0000-7000-8000-00000000002b' as MaterialId;
    const fgFlores250gGrd = '018f3a00-0000-7000-8000-00000000002c' as MaterialId;
    const fgFloresDrip10pk = '018f3a00-0000-7000-8000-00000000002d' as MaterialId;
    const fgHouse1kg = '018f3a00-0000-7000-8000-00000000002e' as MaterialId;

    const chaffWaste = '018f3a00-0000-7000-8000-000000000027' as MaterialId;

    const locationMain = '018f3a00-0000-7000-8000-000000000031' as StorageLocationId;

    const poIssued = '018f3a00-0000-7000-8000-000000000041' as PurchaseOrderId;
    const poPartiallyReceived = '018f3a00-0000-7000-8000-000000000042' as PurchaseOrderId;

    const productFlores = '018f3a00-0000-7000-8000-000000000081' as ProductId;
    const productHouse = '018f3a00-0000-7000-8000-000000000082' as ProductId;

    const skuFlores1kg = '018f3a00-0000-7000-8000-000000000091' as SkuId;
    const skuFlores250gGrd = '018f3a00-0000-7000-8000-000000000092' as SkuId;
    const skuFloresDrip10pk = '018f3a00-0000-7000-8000-000000000093' as SkuId;
    const skuHouse1kg = '018f3a00-0000-7000-8000-000000000094' as SkuId;

    // 1. Organization
    await client.query(
      `INSERT INTO organization (organization_id, code, name, currency)
       VALUES ($1, 'ORG-ROASTERY-HQ', 'Roastery OS Master Tenant', 'IDR')
       ON CONFLICT (organization_id) DO NOTHING`,
      [orgId]
    );

    // 2. Storage Location
    await client.query(
      `INSERT INTO storage_location (organization_id, storage_location_id, code, name, location_type, is_active)
       VALUES ($1, $2, 'LOC-RAW-BAY-1', 'Main Storage Warehouse', 'WAREHOUSE_BAY', TRUE)
       ON CONFLICT (organization_id, storage_location_id) DO NOTHING`,
      [orgId, locationMain]
    );

    // 3. Materials
    await client.query(
      `INSERT INTO material_master (organization_id, material_id, code, name, category, base_uom, description, is_active)
       VALUES 
        ($1, $2, 'RAW-FLORES-BAJAWA', 'Flores Bajawa Green Coffee (Grade 1)', 'RAW_MATERIAL', 'KG', 'Specialty Arabica, Wet Hulled, Flores NTT', TRUE),
        ($1, $3, 'RAW-COLOMBIA-SUPREMO', 'Colombia Supremo Huila Green Coffee', 'RAW_MATERIAL', 'KG', 'Specialty Arabica, Fully Washed, Huila', TRUE),
        ($1, $4, 'PKG-POUCH-1KG-MATTE', '1KG Matte Black Degassing Valve Pouch', 'PACKAGING_MATERIAL', 'UNIT', 'Foil lined, zipper + one-way degassing valve', TRUE),
        ($1, $5, 'ROAST-FLORES-FILTER', 'Flores Bajawa Filter Roast (Whole Bean)', 'INTERMEDIARY_COFFEE', 'KG', 'Light-Medium Filter Roast, Intermediary bulk coffee', TRUE),
        ($1, $6, 'ROAST-COLOMBIA-ESPRESSO', 'Colombia Supremo Espresso Roast', 'INTERMEDIARY_COFFEE', 'KG', 'Medium-Dark Espresso Profile', TRUE),
        ($1, $7, 'ROAST-HOUSE-BLEND', 'Nusantara Heritage House Blend Roast', 'INTERMEDIARY_COFFEE', 'KG', 'Multi-origin roasted blend output', TRUE),
        ($1, $8, 'ROAST-FLORES-GROUND', 'Flores Bajawa Filter Grind (Bulk)', 'INTERMEDIARY_COFFEE', 'KG', 'Precision ground intermediary coffee', TRUE),
        ($1, $9, 'PKG-POUCH-250G-VALVE', '250g Matte Kraft Valve Pouch', 'PACKAGING_MATERIAL', 'UNIT', 'Foil lined with one-way degassing valve', TRUE),
        ($1, $10, 'PKG-DRIP-FILTER-SET', 'Single-Serve Drip Coffee Filter & 10ct Box Set', 'PACKAGING_MATERIAL', 'UNIT', 'Ultrasonic sealed filter bags & retail outer box', TRUE),
        ($1, $11, 'FG-FLORES-1KG-WB', 'Flores Bajawa 1KG Whole Bean Packaged', 'FINISHED_GOOD', 'UNIT', 'Retail/Wholesale ready 1kg valve bag', TRUE),
        ($1, $12, 'FG-FLORES-250G-GRD', 'Flores Bajawa 250G Ground Filter Packaged', 'FINISHED_GOOD', 'UNIT', 'Retail ready 250g ground valve pouch', TRUE),
        ($1, $13, 'FG-FLORES-DRIP-10PK', 'Flores Bajawa Drip Bag (10-Count Retail Box)', 'FINISHED_GOOD', 'UNIT', 'Retail ready 10-pack drip bag box', TRUE),
        ($1, $14, 'FG-HOUSE-1KG-WB', 'Nusantara Heritage House Blend 1KG Whole Bean', 'FINISHED_GOOD', 'UNIT', 'Commercial 1kg whole bean espresso blend', TRUE),
        ($1, $15, 'WASTE-CHAFF-MOISTURE', 'Roasting Chaff & Moisture Loss', 'CONSUMABLE', 'KG', 'Unrecoverable physical roasting waste loss', TRUE)
       ON CONFLICT (organization_id, material_id) DO NOTHING`,
      [
        orgId, 
        greenFlores, 
        greenColombia, 
        valvePouch, 
        roastedFlores, 
        roastedColombia, 
        roastedHouseBlend,
        groundFlores,
        pouch250g,
        dripFilterSet,
        fgFlores1kg,
        fgFlores250gGrd,
        fgFloresDrip10pk,
        fgHouse1kg,
        chaffWaste
      ]
    );

    // 4. Products (Brand Line)
    await client.query(
      `INSERT INTO product_master (organization_id, product_id, product_code, name, brand_line, description, primary_material_id, is_active)
       VALUES
        ($1, $2, 'PROD-FLORES-SO', 'Flores Bajawa Single Origin Series', 'Single Origin Estate', 'Specialty single-origin Arabica from Bajawa plateau, Flores.', $3, TRUE),
        ($1, $4, 'PROD-HOUSE-BLEND', 'Nusantara Heritage Espresso Series', 'Signature Blends', 'Balanced multi-origin espresso blend with notes of chocolate and caramel.', $5, TRUE)
       ON CONFLICT (organization_id, product_id) DO NOTHING`,
      [orgId, productFlores, roastedFlores, productHouse, roastedHouseBlend]
    );

    // 5. SKUs (Commercial Sales Units)
    await client.query(
      `INSERT INTO sku_master (
        organization_id, sku_id, sku_code, product_id, material_id, name,
        packaging_type, packaged_quantity, packaged_uom, barcode,
        base_retail_price, base_wholesale_price, is_active
      ) VALUES
        ($1, $2, 'SKU-FLORES-1KG-WB', $3, $4, 'Flores Bajawa 1KG Whole Bean Bag', 'BAG_1KG', 1.0000, 'KG', '8991001001001', 280000.00, 220000.00, TRUE),
        ($1, $5, 'SKU-FLORES-250G-GRD', $6, $7, 'Flores Bajawa 250G Ground Pouch', 'BAG_250G', 0.2500, 'KG', '8991001001002', 85000.00, 68000.00, TRUE),
        ($1, $8, 'SKU-FLORES-DRIP-10PK', $9, $10, 'Flores Bajawa 10-Pack Drip Bag Box', 'DRIP_BOX_10CT', 0.1200, 'KG', '8991001001003', 125000.00, 95000.00, TRUE),
        ($1, $11, 'SKU-HOUSE-1KG-WB', $12, $13, 'Nusantara Heritage 1KG Espresso Bag', 'BAG_1KG', 1.0000, 'KG', '8991001002001', 250000.00, 195000.00, TRUE)
       ON CONFLICT (organization_id, sku_id) DO NOTHING`,
      [
        orgId,
        skuFlores1kg, productFlores, fgFlores1kg,
        skuFlores250gGrd, productFlores, fgFlores250gGrd,
        skuFloresDrip10pk, productFlores, fgFloresDrip10pk,
        skuHouse1kg, productHouse, fgHouse1kg
      ]
    );

    // 6. Suppliers
    await client.query(
      `INSERT INTO supplier_master (organization_id, supplier_id, supplier_code, name, supplier_type, contact_person, email, origin_country, origin_region, is_active)
       VALUES
        ($1, $2, 'SUP-NUSANTARA-COFFEE', 'PT Nusantara Specialty Origins', 'ORIGIN_PRODUCER', 'Budi Santoso', 'budi@nusantaracoffee.example', 'Indonesia', 'East Nusa Tenggara', TRUE),
        ($1, $3, 'SUP-GLOBAL-PACKAGING', 'PT Multi Kemas Perkasa', 'PACKAGING_CONVERTER', 'Maya Handayani', 'sales@multikemas.example', 'Indonesia', 'West Java', TRUE)
       ON CONFLICT (organization_id, supplier_id) DO NOTHING`,
      [orgId, supplierJava, supplierPackaging]
    );

    // 6b. Synthetic Wholesale Customers (Phase 8 B2B Diagnostics)
    const customerCafeA = '018f3a00-0000-7000-8000-00000000001a' as CustomerId;
    const customerDistributorB = '018f3a00-0000-7000-8000-00000000001b' as CustomerId;
    const customerHospitalityC = '018f3a00-0000-7000-8000-00000000001c' as CustomerId;

    await client.query(
      `INSERT INTO customer_master (
        organization_id, customer_id, customer_code, name, customer_type,
        contact_person, email, phone, address, is_active
      ) VALUES
        ($1, $2, 'CUST-CAFE-A', 'Cafe Partner A (Senopati)', 'CAFE_RETAILER', 'Ahmad Ridwan', 'order@cafe-a.example', '+628123456701', 'Jl. Senopati No. 10, Jakarta Selatan', TRUE),
        ($1, $3, 'CUST-DIST-B', 'Regional Distributor B (Bandung)', 'REGIONAL_DISTRIBUTOR', 'Siti Rahma', 'procurement@dist-b.example', '+628123456702', 'Kawasan Industri Gedebage, Bandung', TRUE),
        ($1, $4, 'CUST-HOSP-C', 'Hospitality Client C (Bali)', 'HOTEL_RESORT', 'Ketut Suantara', 'fb@hospitality-c.example', '+628123456703', 'Kawasan ITDC Lot N-5, Nusa Dua, Bali', TRUE)
      ON CONFLICT (organization_id, customer_id) DO NOTHING`,
      [orgId, customerCafeA, customerDistributorB, customerHospitalityC]
    );

    // 7. Purchase Orders (Issued & Partially Received)
    await client.query(
      `INSERT INTO purchase_order (organization_id, po_id, po_number, supplier_id, status, total_amount, currency, issued_at, expected_at)
       VALUES ($1, $2, 'PO-2026-001', $3, 'ISSUED', 24000000.00, 'IDR', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '4 days')
       ON CONFLICT (organization_id, po_id) DO NOTHING`,
      [orgId, poIssued, supplierJava]
    );

    const po1Line1 = '018f3a00-0000-7000-8000-000000000051' as PurchaseOrderLineId;
    await client.query(
      `INSERT INTO purchase_order_line (organization_id, po_line_id, po_id, material_id, ordered_quantity, received_quantity, uom, unit_purchase_price, line_total)
       VALUES ($1, $2, $3, $4, 200.0000, 0.0000, 'KG', 120000.00, 24000000.00)
       ON CONFLICT (organization_id, po_line_id) DO NOTHING`,
      [orgId, po1Line1, poIssued, greenFlores]
    );

    await client.query(
      `INSERT INTO purchase_order (organization_id, po_id, po_number, supplier_id, status, total_amount, currency, issued_at, expected_at)
       VALUES ($1, $2, 'PO-2026-002', $3, 'PARTIALLY_RECEIVED', 23500000.00, 'IDR', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '1 day')
       ON CONFLICT (organization_id, po_id) DO NOTHING`,
      [orgId, poPartiallyReceived, supplierPackaging]
    );

    const po2Line1 = '018f3a00-0000-7000-8000-000000000052' as PurchaseOrderLineId;
    const po2Line2 = '018f3a00-0000-7000-8000-000000000053' as PurchaseOrderLineId;

    await client.query(
      `INSERT INTO purchase_order_line (organization_id, po_line_id, po_id, material_id, ordered_quantity, received_quantity, uom, unit_purchase_price, line_total)
       VALUES 
        ($1, $2, $3, $4, 150.0000, 50.0000, 'KG', 140000.00, 21000000.00),
        ($1, $5, $3, $6, 1000.0000, 0.0000, 'UNIT', 2500.00, 2500000.00)
       ON CONFLICT (organization_id, po_line_id) DO NOTHING`,
      [orgId, po2Line1, poPartiallyReceived, greenColombia, po2Line2, valvePouch]
    );

    // 8. Seed Ready Green Inventory Lots for Roasting Experiments
    const lotFloresGreen = '018f3a00-0000-7000-8000-000000000061';
    await client.query(
      `INSERT INTO inventory_lot (
        organization_id, inventory_lot_id, lot_number, material_id,
        quantity_on_hand, reserved_quantity, uom, storage_location_id,
        lot_state, received_at
      ) VALUES ($1, $2, 'LOT-GRN-FLORES-001', $3, 50.0000, 0.0000, 'KG', $4, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '5 days')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotFloresGreen, greenFlores, locationMain]
    );

    await client.query(
      `INSERT INTO lot_valuation_record (
        organization_id, valuation_record_id, inventory_lot_id,
        material_cost, conversion_cost, total_lot_cost, unit_cost,
        currency, allocation_policy, calculated_at
      ) VALUES ($1, '018f3a00-0000-7000-8000-000000000071', $2, 6000000.00, 0.00, 6000000.00, 120000.00, 'IDR', 'FULL_ABSORPTION', CURRENT_TIMESTAMP - INTERVAL '5 days')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotFloresGreen]
    );

    const lotColombiaGreen = '018f3a00-0000-7000-8000-000000000062';
    await client.query(
      `INSERT INTO inventory_lot (
        organization_id, inventory_lot_id, lot_number, material_id,
        quantity_on_hand, reserved_quantity, uom, storage_location_id,
        lot_state, received_at
      ) VALUES ($1, $2, 'LOT-GRN-COLOMBIA-001', $3, 30.0000, 0.0000, 'KG', $4, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '2 days')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotColombiaGreen, greenColombia, locationMain]
    );

    await client.query(
      `INSERT INTO lot_valuation_record (
        organization_id, valuation_record_id, inventory_lot_id,
        material_cost, conversion_cost, total_lot_cost, unit_cost,
        currency, allocation_policy, calculated_at
      ) VALUES ($1, '018f3a00-0000-7000-8000-000000000072', $2, 4200000.00, 0.00, 4200000.00, 140000.00, 'IDR', 'FULL_ABSORPTION', CURRENT_TIMESTAMP - INTERVAL '2 days')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotColombiaGreen]
    );

    // 9. Seed Intermediary Roasted & Packaging Lots for Packaging Experiments
    const lotFloresRoasted = '018f3a00-0000-7000-8000-000000000063';
    await client.query(
      `INSERT INTO inventory_lot (
        organization_id, inventory_lot_id, lot_number, material_id,
        quantity_on_hand, reserved_quantity, uom, storage_location_id,
        lot_state, received_at
      ) VALUES ($1, $2, 'LOT-RST-FLORES-001', $3, 25.0000, 0.0000, 'KG', $4, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '1 day')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotFloresRoasted, roastedFlores, locationMain]
    );

    await client.query(
      `INSERT INTO lot_valuation_record (
        organization_id, valuation_record_id, inventory_lot_id,
        material_cost, conversion_cost, total_lot_cost, unit_cost,
        currency, allocation_policy, calculated_at
      ) VALUES ($1, '018f3a00-0000-7000-8000-000000000073', $2, 3571428.57, 223214.28, 3794642.85, 151785.7143, 'IDR', 'FULL_ABSORPTION', CURRENT_TIMESTAMP - INTERVAL '1 day')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotFloresRoasted]
    );

    // Seed Purchase Receipt linking green Flores to supplierJava
    const receiptFloresId = '018f3a00-0000-7000-8000-000000000055';
    const movementReceiptId = '018f3a00-0000-7000-8000-000000000057';

    await client.query(
      `INSERT INTO stock_ledger_movement (
        organization_id, movement_id, movement_number, inventory_lot_id,
        movement_type, quantity_delta, uom, reference_entity_type, reference_entity_id
      ) VALUES ($1, $2, 'MOV-REC-2026-001', $3, 'PURCHASE_RECEIPT', 50.0000, 'KG', 'PURCHASE_RECEIPT', $4)
      ON CONFLICT (organization_id, movement_id) DO NOTHING`,
      [orgId, movementReceiptId, lotFloresGreen, receiptFloresId]
    );

    await client.query(
      `INSERT INTO purchase_receipt (
        organization_id, receipt_id, receipt_number, po_id, po_line_id, supplier_id,
        material_id, created_lot_id, movement_id, received_quantity, uom,
        unit_purchase_price, total_amount, currency, origin_lot_reference, received_at
      ) VALUES ($1, $2, 'REC-2026-001', $3, $4, $5, $6, $7, $8, 50.0000, 'KG', 120000.00, 6000000.00, 'IDR', 'ORIGIN-FLORES-2026-A', CURRENT_TIMESTAMP - INTERVAL '5 days')
      ON CONFLICT (organization_id, receipt_id) DO NOTHING`,
      [orgId, receiptFloresId, poIssued, po1Line1, supplierJava, greenFlores, lotFloresGreen, movementReceiptId]
    );

    // Seed Roasting Transformation linking green Flores to roasted Flores
    const roastTxId = '018f3a00-0000-7000-8000-0000000000e1';
    await client.query(
      `INSERT INTO transformation (
        organization_id, transformation_id, transformation_number, archetype,
        status, started_at, completed_at
      ) VALUES ($1, $2, 'TX-ROAST-SEED-001', 'ROASTING', 'COMPLETED', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day')
      ON CONFLICT (organization_id, transformation_id) DO NOTHING`,
      [orgId, roastTxId]
    );

    await client.query(
      `INSERT INTO provenance_edge (
        organization_id, provenance_edge_id, source_lot_id, target_lot_id,
        transformation_id, consumed_quantity, uom, edge_type
      ) VALUES ($1, '018f3a00-0000-7000-8000-0000000000e2', $2, $3, $4, 30.0000, 'KG', 'DIRECT_DERIVATION')
      ON CONFLICT (organization_id, provenance_edge_id) DO NOTHING`,
      [orgId, lotFloresGreen, lotFloresRoasted, roastTxId]
    );

    const lotHouseRoasted = '018f3a00-0000-7000-8000-000000000064';
    await client.query(
      `INSERT INTO inventory_lot (
        organization_id, inventory_lot_id, lot_number, material_id,
        quantity_on_hand, reserved_quantity, uom, storage_location_id,
        lot_state, received_at
      ) VALUES ($1, $2, 'LOT-RST-HOUSE-001', $3, 20.0000, 0.0000, 'KG', $4, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '1 day')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotHouseRoasted, roastedHouseBlend, locationMain]
    );

    await client.query(
      `INSERT INTO lot_valuation_record (
        organization_id, valuation_record_id, inventory_lot_id,
        material_cost, conversion_cost, total_lot_cost, unit_cost,
        currency, allocation_policy, calculated_at
      ) VALUES ($1, '018f3a00-0000-7000-8000-000000000074', $2, 2800000.00, 170000.00, 2970000.00, 148500.0000, 'IDR', 'FULL_ABSORPTION', CURRENT_TIMESTAMP - INTERVAL '1 day')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotHouseRoasted]
    );

    const lotPouch1kg = '018f3a00-0000-7000-8000-000000000065';
    await client.query(
      `INSERT INTO inventory_lot (
        organization_id, inventory_lot_id, lot_number, material_id,
        quantity_on_hand, reserved_quantity, uom, storage_location_id,
        lot_state, received_at
      ) VALUES ($1, $2, 'LOT-PKG-POUCH-1KG-001', $3, 100.0000, 0.0000, 'UNIT', $4, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '3 days')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotPouch1kg, valvePouch, locationMain]
    );

    await client.query(
      `INSERT INTO lot_valuation_record (
        organization_id, valuation_record_id, inventory_lot_id,
        material_cost, conversion_cost, total_lot_cost, unit_cost,
        currency, allocation_policy, calculated_at
      ) VALUES ($1, '018f3a00-0000-7000-8000-000000000075', $2, 250000.00, 0.00, 250000.00, 2500.0000, 'IDR', 'FULL_ABSORPTION', CURRENT_TIMESTAMP - INTERVAL '3 days')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotPouch1kg]
    );

    const lotPouch250g = '018f3a00-0000-7000-8000-000000000066';
    await client.query(
      `INSERT INTO inventory_lot (
        organization_id, inventory_lot_id, lot_number, material_id,
        quantity_on_hand, reserved_quantity, uom, storage_location_id,
        lot_state, received_at
      ) VALUES ($1, $2, 'LOT-PKG-POUCH-250G-001', $3, 200.0000, 0.0000, 'UNIT', $4, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '3 days')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotPouch250g, pouch250g, locationMain]
    );

    await client.query(
      `INSERT INTO lot_valuation_record (
        organization_id, valuation_record_id, inventory_lot_id,
        material_cost, conversion_cost, total_lot_cost, unit_cost,
        currency, allocation_policy, calculated_at
      ) VALUES ($1, '018f3a00-0000-7000-8000-000000000076', $2, 360000.00, 0.00, 360000.00, 1800.0000, 'IDR', 'FULL_ABSORPTION', CURRENT_TIMESTAMP - INTERVAL '3 days')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotPouch250g]
    );

    const lotDripSet = '018f3a00-0000-7000-8000-000000000067';
    await client.query(
      `INSERT INTO inventory_lot (
        organization_id, inventory_lot_id, lot_number, material_id,
        quantity_on_hand, reserved_quantity, uom, storage_location_id,
        lot_state, received_at
      ) VALUES ($1, $2, 'LOT-PKG-DRIP-SET-001', $3, 150.0000, 0.0000, 'UNIT', $4, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '3 days')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotDripSet, dripFilterSet, locationMain]
    );

    await client.query(
      `INSERT INTO lot_valuation_record (
        organization_id, valuation_record_id, inventory_lot_id,
        material_cost, conversion_cost, total_lot_cost, unit_cost,
        currency, allocation_policy, calculated_at
      ) VALUES ($1, '018f3a00-0000-7000-8000-000000000077', $2, 675000.00, 0.00, 675000.00, 4500.0000, 'IDR', 'FULL_ABSORPTION', CURRENT_TIMESTAMP - INTERVAL '3 days')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotDripSet]
    );

    // 10. Seed Finished Goods Lots for POS & Wholesale Commercial Sales (Phases 7 & 8)
    // Lot A: Finished Flores 1KG (3 UNIT @ IDR 154,285.71 / UNIT HPP)
    const lotFgFloresA = '018f3a00-0000-7000-8000-000000000068';
    await client.query(
      `INSERT INTO inventory_lot (
        organization_id, inventory_lot_id, lot_number, material_id,
        quantity_on_hand, reserved_quantity, uom, storage_location_id,
        lot_state, received_at
      ) VALUES ($1, $2, 'LOT-FG-FLORES-1KG-SEED-01', $3, 3.0000, 0.0000, 'UNIT', $4, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '12 hours')
      ON CONFLICT (organization_id, inventory_lot_id) DO UPDATE
      SET quantity_on_hand = 3.0000, reserved_quantity = 0.0000, lot_state = 'ACTIVE'`,
      [orgId, lotFgFloresA, fgFlores1kg, locationMain]
    );

    await client.query(
      `INSERT INTO lot_valuation_record (
        organization_id, valuation_record_id, inventory_lot_id,
        material_cost, conversion_cost, total_lot_cost, unit_cost,
        currency, allocation_policy, calculated_at
      ) VALUES ($1, '018f3a00-0000-7000-8000-000000000078', $2, 462857.13, 0.00, 462857.13, 154285.7100, 'IDR', 'FULL_ABSORPTION', CURRENT_TIMESTAMP - INTERVAL '12 hours')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotFgFloresA]
    );

    // Lot B: Finished Flores 1KG (4 UNIT @ IDR 158,500.00 / UNIT HPP)
    const lotFgFloresB = '018f3a00-0000-7000-8000-000000000069';
    await client.query(
      `INSERT INTO inventory_lot (
        organization_id, inventory_lot_id, lot_number, material_id,
        quantity_on_hand, reserved_quantity, uom, storage_location_id,
        lot_state, received_at
      ) VALUES ($1, $2, 'LOT-FG-FLORES-1KG-SEED-02', $3, 4.0000, 0.0000, 'UNIT', $4, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '6 hours')
      ON CONFLICT (organization_id, inventory_lot_id) DO UPDATE
      SET quantity_on_hand = 4.0000, reserved_quantity = 0.0000, lot_state = 'ACTIVE'`,
      [orgId, lotFgFloresB, fgFlores1kg, locationMain]
    );

    await client.query(
      `INSERT INTO lot_valuation_record (
        organization_id, valuation_record_id, inventory_lot_id,
        material_cost, conversion_cost, total_lot_cost, unit_cost,
        currency, allocation_policy, calculated_at
      ) VALUES ($1, '018f3a00-0000-7000-8000-000000000079', $2, 634000.00, 0.00, 634000.00, 158500.0000, 'IDR', 'FULL_ABSORPTION', CURRENT_TIMESTAMP - INTERVAL '6 hours')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotFgFloresB]
    );

    // Lot C: Finished Flores 1KG - Large Lot for Scenario 1 (20 UNIT @ IDR 150,000.00 / UNIT HPP)
    const lotFgFloresC = '018f3a00-0000-7000-8000-00000000006a';
    await client.query(
      `INSERT INTO inventory_lot (
        organization_id, inventory_lot_id, lot_number, material_id,
        quantity_on_hand, reserved_quantity, uom, storage_location_id,
        lot_state, received_at
      ) VALUES ($1, $2, 'LOT-FG-FLORES-1KG-SEED-03', $3, 20.0000, 0.0000, 'UNIT', $4, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '2 hours')
      ON CONFLICT (organization_id, inventory_lot_id) DO UPDATE
      SET quantity_on_hand = 20.0000, reserved_quantity = 0.0000, lot_state = 'ACTIVE'`,
      [orgId, lotFgFloresC, fgFlores1kg, locationMain]
    );

    await client.query(
      `INSERT INTO lot_valuation_record (
        organization_id, valuation_record_id, inventory_lot_id,
        material_cost, conversion_cost, total_lot_cost, unit_cost,
        currency, allocation_policy, calculated_at
      ) VALUES ($1, '018f3a00-0000-7000-8000-00000000007a', $2, 3000000.00, 0.00, 3000000.00, 150000.0000, 'IDR', 'FULL_ABSORPTION', CURRENT_TIMESTAMP - INTERVAL '2 hours')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotFgFloresC]
    );

    // 10b. Seed Roasted Colombia Lot (for multi-origin blend executions)
    const lotColombiaRoasted = '018f3a00-0000-7000-8000-00000000006b';
    await client.query(
      `INSERT INTO inventory_lot (
        organization_id, inventory_lot_id, lot_number, material_id,
        quantity_on_hand, reserved_quantity, uom, storage_location_id,
        lot_state, received_at
      ) VALUES ($1, $2, 'LOT-RST-COLOMBIA-001', $3, 20.0000, 0.0000, 'KG', $4, 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '1 day')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotColombiaRoasted, roastedColombia, locationMain]
    );


    await client.query(
      `INSERT INTO lot_valuation_record (
        organization_id, valuation_record_id, inventory_lot_id,
        material_cost, conversion_cost, total_lot_cost, unit_cost,
        currency, allocation_policy, calculated_at
      ) VALUES ($1, '018f3a00-0000-7000-8000-00000000007b', $2, 3300000.00, 200000.00, 3500000.00, 175000.0000, 'IDR', 'FULL_ABSORPTION', CURRENT_TIMESTAMP - INTERVAL '1 day')
      ON CONFLICT (organization_id, inventory_lot_id) DO NOTHING`,
      [orgId, lotColombiaRoasted]
    );

    // 11. Seed Blend Recipe Master (04_BLEND_ENGINE)
    const recipeHouseBlend = '018f3a00-0000-7000-8000-0000000000a1';
    const comp1 = '018f3a00-0000-7000-8000-0000000000b1';
    const comp2 = '018f3a00-0000-7000-8000-0000000000b2';

    await client.query(
      `INSERT INTO blend_recipe (
        organization_id, recipe_id, recipe_code, name, output_material_id,
        version, description, is_active
      ) VALUES ($1, $2, 'REC-HOUSE-BLEND-01', 'Nusantara Heritage House Blend (60/40)', $3, 1, 'Signature house espresso blend: 60% Flores Filter + 40% Colombia Espresso', TRUE)
      ON CONFLICT (organization_id, recipe_id) DO NOTHING`,
      [orgId, recipeHouseBlend, roastedHouseBlend]
    );

    await client.query(
      `INSERT INTO blend_recipe_component (
        organization_id, component_id, recipe_id, material_id, target_ratio_percentage, sequence_number
      ) VALUES 
        ($1, $2, $3, $4, 60.00, 1),
        ($1, $5, $3, $6, 40.00, 2)
      ON CONFLICT (organization_id, component_id) DO NOTHING`,
      [orgId, comp1, recipeHouseBlend, roastedFlores, comp2, roastedColombia]
    );

    return {
      orgId,
      supplierJava,
      supplierPackaging,
      customerCafeA,
      customerDistributorB,
      customerHospitalityC,
      greenFlores,
      greenColombia,
      valvePouch,
      roastedFlores,
      roastedColombia,
      roastedHouseBlend,
      groundFlores,
      pouch250g,
      dripFilterSet,
      fgFlores1kg,
      fgFlores250gGrd,
      fgFloresDrip10pk,
      fgHouse1kg,
      chaffWaste,
      lotFloresGreen,
      lotColombiaGreen,
      lotFloresRoasted,
      lotColombiaRoasted,
      lotHouseRoasted,
      lotPouch1kg,
      lotPouch250g,
      lotDripSet,
      lotFgFloresA,
      lotFgFloresB,
      lotFgFloresC,
      productFlores,
      productHouse,
      skuFlores1kg,
      skuFlores250gGrd,
      skuFloresDrip10pk,
      skuHouse1kg,
      poIssued,
      poPartiallyReceived,
      recipeHouseBlend
    };

  } finally {
    client.release();
  }
}
