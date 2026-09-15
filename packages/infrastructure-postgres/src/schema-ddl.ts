export const INITIAL_SCHEMA_DDL = `
-- ============================================================================
-- ROASTERY OS DATABASE SCHEMA DDL
-- Target: PostgreSQL 15+
-- Specification: DATABASE_SCHEMA.md (20 Relational Tables)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenant Root
CREATE TABLE IF NOT EXISTS organization (
    organization_id UUID PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Master Data: Material
CREATE TABLE IF NOT EXISTS material_master (
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    material_id UUID NOT NULL,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(32) NOT NULL CHECK (category IN ('RAW_MATERIAL', 'INTERMEDIARY_COFFEE', 'PACKAGING_MATERIAL', 'CONSUMABLE', 'FINISHED_GOOD')),
    base_uom VARCHAR(16) NOT NULL CHECK (base_uom IN ('KG', 'G', 'L', 'ML', 'UNIT', 'PACK', 'BOX', 'BOTTLE', 'BAG')),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, material_id),
    CONSTRAINT uq_material_org_code UNIQUE (organization_id, code)
);

-- 3. Master Data: Product
CREATE TABLE IF NOT EXISTS product_master (
    organization_id UUID NOT NULL,
    product_id UUID NOT NULL,
    product_code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand_line VARCHAR(128),
    description TEXT,
    primary_material_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, product_id),
    CONSTRAINT uq_product_org_code UNIQUE (organization_id, product_code),
    FOREIGN KEY (organization_id, primary_material_id) REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT
);

-- 4. Master Data: SKU
CREATE TABLE IF NOT EXISTS sku_master (
    organization_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    sku_code VARCHAR(64) NOT NULL,
    product_id UUID NOT NULL,
    material_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    packaging_type VARCHAR(32) NOT NULL,
    packaged_quantity NUMERIC(14, 4) NOT NULL CHECK (packaged_quantity > 0),
    packaged_uom VARCHAR(16) NOT NULL,
    barcode VARCHAR(64),
    base_retail_price NUMERIC(14, 2) NOT NULL CHECK (base_retail_price >= 0),
    base_wholesale_price NUMERIC(14, 2) NOT NULL CHECK (base_wholesale_price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sku_id),
    CONSTRAINT uq_sku_org_code UNIQUE (organization_id, sku_code),
    FOREIGN KEY (organization_id, product_id) REFERENCES product_master(organization_id, product_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, material_id) REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT
);

-- 5. Physical Inventory: Storage Location
CREATE TABLE IF NOT EXISTS storage_location (
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    storage_location_id UUID NOT NULL,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    location_type VARCHAR(32) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (organization_id, storage_location_id),
    CONSTRAINT uq_location_org_code UNIQUE (organization_id, code)
);

-- 6. Physical Inventory: Inventory Lot
CREATE TABLE IF NOT EXISTS inventory_lot (
    organization_id UUID NOT NULL,
    inventory_lot_id UUID NOT NULL,
    lot_number VARCHAR(64) NOT NULL,
    material_id UUID NOT NULL,
    quantity_on_hand NUMERIC(14, 4) NOT NULL CHECK (quantity_on_hand >= 0),
    reserved_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    uom VARCHAR(16) NOT NULL,
    storage_location_id UUID,
    lot_state VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (lot_state IN ('ACTIVE', 'QUARANTINED', 'DEPLETED')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, inventory_lot_id),
    CONSTRAINT uq_lot_org_number UNIQUE (organization_id, lot_number),
    CONSTRAINT chk_available_qty CHECK (quantity_on_hand >= reserved_quantity),
    FOREIGN KEY (organization_id, material_id) REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, storage_location_id) REFERENCES storage_location(organization_id, storage_location_id) ON DELETE RESTRICT
);

-- 7. Physical Inventory: Append-Only Stock Ledger
CREATE TABLE IF NOT EXISTS stock_ledger_movement (
    organization_id UUID NOT NULL,
    movement_id UUID NOT NULL,
    movement_number VARCHAR(64) NOT NULL,
    inventory_lot_id UUID NOT NULL,
    movement_type VARCHAR(32) NOT NULL CHECK (movement_type IN ('PURCHASE_RECEIPT', 'TRANSFORMATION_CONSUME', 'TRANSFORMATION_YIELD', 'COMMERCIAL_DISPATCH', 'RESTOCK', 'ADJUSTMENT_LOSS', 'ADJUSTMENT_GAIN')),
    quantity_delta NUMERIC(14, 4) NOT NULL CHECK (quantity_delta != 0),
    uom VARCHAR(16) NOT NULL,
    source_location_id UUID,
    destination_location_id UUID,
    reference_entity_type VARCHAR(64) NOT NULL,
    reference_entity_id UUID NOT NULL,
    operator_id UUID,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    PRIMARY KEY (organization_id, movement_id),
    CONSTRAINT uq_movement_org_number UNIQUE (organization_id, movement_number),
    FOREIGN KEY (organization_id, inventory_lot_id) REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT
);

-- 8. Core Transformation Boundary
CREATE TABLE IF NOT EXISTS transformation (
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    transformation_id UUID NOT NULL,
    transformation_number VARCHAR(64) NOT NULL,
    archetype VARCHAR(32) NOT NULL CHECK (archetype IN ('ROASTING', 'BLENDING', 'EXTRACTION_COLD_BREW', 'GRINDING', 'ASSEMBLY_PACKAGING', 'REPACKAGING')),
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, transformation_id),
    CONSTRAINT uq_transformation_org_number UNIQUE (organization_id, transformation_number)
);

-- 9. Transformation Input
CREATE TABLE IF NOT EXISTS transformation_input (
    organization_id UUID NOT NULL,
    transformation_input_id UUID NOT NULL,
    transformation_id UUID NOT NULL,
    inventory_lot_id UUID NOT NULL,
    material_id UUID NOT NULL,
    planned_quantity NUMERIC(14, 4) NOT NULL CHECK (planned_quantity > 0),
    actual_quantity_consumed NUMERIC(14, 4) CHECK (actual_quantity_consumed > 0),
    uom VARCHAR(16) NOT NULL,
    input_sequence INT NOT NULL DEFAULT 1,
    movement_id UUID,
    PRIMARY KEY (organization_id, transformation_input_id),
    FOREIGN KEY (organization_id, transformation_id) REFERENCES transformation(organization_id, transformation_id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, inventory_lot_id) REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, material_id) REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, movement_id) REFERENCES stock_ledger_movement(organization_id, movement_id) ON DELETE RESTRICT
);

-- 10. Transformation Output
CREATE TABLE IF NOT EXISTS transformation_output (
    organization_id UUID NOT NULL,
    transformation_output_id UUID NOT NULL,
    transformation_id UUID NOT NULL,
    created_lot_id UUID,
    material_id UUID NOT NULL,
    output_type VARCHAR(32) NOT NULL CHECK (output_type IN ('PRIMARY_PRODUCT', 'CO_PRODUCT', 'BY_PRODUCT', 'RECOVERABLE_RESIDUE', 'UNRECOVERABLE_WASTE')),
    actual_quantity_produced NUMERIC(14, 4) NOT NULL CHECK (actual_quantity_produced > 0),
    uom VARCHAR(16) NOT NULL,
    yield_ratio NUMERIC(7, 4),
    movement_id UUID,
    PRIMARY KEY (organization_id, transformation_output_id),
    FOREIGN KEY (organization_id, transformation_id) REFERENCES transformation(organization_id, transformation_id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, created_lot_id) REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, material_id) REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, movement_id) REFERENCES stock_ledger_movement(organization_id, movement_id) ON DELETE RESTRICT,
    CONSTRAINT chk_waste_lot_null CHECK (
        (output_type = 'UNRECOVERABLE_WASTE' AND created_lot_id IS NULL AND movement_id IS NULL) OR
        (output_type != 'UNRECOVERABLE_WASTE' AND created_lot_id IS NOT NULL AND movement_id IS NOT NULL)
    )
);

-- 11. Operational Execution: Batch Context
CREATE TABLE IF NOT EXISTS batch (
    organization_id UUID NOT NULL,
    batch_id UUID NOT NULL,
    batch_number VARCHAR(64) NOT NULL,
    batch_type VARCHAR(32) NOT NULL CHECK (batch_type IN ('ROAST_BATCH', 'BLEND_BATCH', 'PRODUCTION_BATCH', 'PACKAGING_BATCH')),
    transformation_id UUID,
    equipment_id UUID,
    operator_id UUID,
    recipe_or_profile_id VARCHAR(128),
    ambient_temperature NUMERIC(5, 2),
    ambient_humidity NUMERIC(5, 2),
    process_telemetry JSONB,
    status VARCHAR(32) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'EXECUTING', 'COMPLETED', 'ABORTED')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, batch_id),
    CONSTRAINT uq_batch_org_number UNIQUE (organization_id, batch_number),
    FOREIGN KEY (organization_id, transformation_id) REFERENCES transformation(organization_id, transformation_id) ON DELETE RESTRICT
);

-- 12. Costing: Direct Cost Events
CREATE TABLE IF NOT EXISTS cost_event (
    organization_id UUID NOT NULL,
    cost_event_id UUID NOT NULL,
    transformation_id UUID NOT NULL,
    cost_category VARCHAR(32) NOT NULL CHECK (cost_category IN ('DIRECT_LABOR', 'ENERGY_UTILITIES', 'MACHINE_USAGE', 'DIRECT_SERVICE_FEE', 'DIRECT_OVERHEAD')),
    allocated_amount NUMERIC(14, 2) NOT NULL CHECK (allocated_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    allocation_basis VARCHAR(32) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, cost_event_id),
    FOREIGN KEY (organization_id, transformation_id) REFERENCES transformation(organization_id, transformation_id) ON DELETE CASCADE
);

-- 13. Costing: Lot Valuation Record
CREATE TABLE IF NOT EXISTS lot_valuation_record (
    organization_id UUID NOT NULL,
    valuation_record_id UUID NOT NULL,
    inventory_lot_id UUID NOT NULL,
    material_cost NUMERIC(14, 2) NOT NULL CHECK (material_cost >= 0),
    conversion_cost NUMERIC(14, 2) NOT NULL CHECK (conversion_cost >= 0),
    total_lot_cost NUMERIC(14, 2) NOT NULL CHECK (total_lot_cost >= 0),
    unit_cost NUMERIC(18, 4) NOT NULL CHECK (unit_cost >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    allocation_policy VARCHAR(32) NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, valuation_record_id),
    CONSTRAINT uq_lot_valuation UNIQUE (organization_id, inventory_lot_id),
    FOREIGN KEY (organization_id, inventory_lot_id) REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT
);

-- 14. Traceability: Provenance Edge
CREATE TABLE IF NOT EXISTS provenance_edge (
    organization_id UUID NOT NULL,
    provenance_edge_id UUID NOT NULL,
    source_lot_id UUID NOT NULL,
    transformation_id UUID NOT NULL,
    target_lot_id UUID NOT NULL,
    consumed_quantity NUMERIC(14, 4) NOT NULL CHECK (consumed_quantity > 0),
    uom VARCHAR(16) NOT NULL,
    edge_type VARCHAR(32) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, provenance_edge_id),
    FOREIGN KEY (organization_id, source_lot_id) REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, transformation_id) REFERENCES transformation(organization_id, transformation_id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, target_lot_id) REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT
);

-- 15. Supplier: Master
CREATE TABLE IF NOT EXISTS supplier_master (
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL,
    supplier_code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    supplier_type VARCHAR(64) NOT NULL,
    contact_person VARCHAR(128),
    email VARCHAR(128),
    phone VARCHAR(64),
    origin_country VARCHAR(64),
    origin_region VARCHAR(64),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, supplier_id),
    CONSTRAINT uq_supplier_org_code UNIQUE (organization_id, supplier_code)
);

-- 16. Supplier: Purchase Order
CREATE TABLE IF NOT EXISTS purchase_order (
    organization_id UUID NOT NULL,
    po_id UUID NOT NULL,
    po_number VARCHAR(64) NOT NULL,
    supplier_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    issued_at TIMESTAMPTZ,
    expected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, po_id),
    CONSTRAINT uq_po_org_number UNIQUE (organization_id, po_number),
    FOREIGN KEY (organization_id, supplier_id) REFERENCES supplier_master(organization_id, supplier_id) ON DELETE RESTRICT
);

-- 17. Supplier: Purchase Order Line
CREATE TABLE IF NOT EXISTS purchase_order_line (
    organization_id UUID NOT NULL,
    po_line_id UUID NOT NULL,
    po_id UUID NOT NULL,
    material_id UUID NOT NULL,
    ordered_quantity NUMERIC(14, 4) NOT NULL CHECK (ordered_quantity > 0),
    received_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
    uom VARCHAR(16) NOT NULL,
    unit_purchase_price NUMERIC(14, 2) NOT NULL CHECK (unit_purchase_price >= 0),
    line_total NUMERIC(14, 2) NOT NULL CHECK (line_total >= 0),
    PRIMARY KEY (organization_id, po_line_id),
    FOREIGN KEY (organization_id, po_id) REFERENCES purchase_order(organization_id, po_id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, material_id) REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT
);

-- 18. Supplier: Purchase Receipt
CREATE TABLE IF NOT EXISTS purchase_receipt (
    organization_id UUID NOT NULL,
    receipt_id UUID NOT NULL,
    receipt_number VARCHAR(64) NOT NULL,
    po_id UUID NOT NULL,
    po_line_id UUID NOT NULL,
    supplier_id UUID NOT NULL,
    material_id UUID NOT NULL,
    created_lot_id UUID NOT NULL,
    movement_id UUID NOT NULL,
    received_quantity NUMERIC(14, 4) NOT NULL CHECK (received_quantity > 0),
    uom VARCHAR(16) NOT NULL,
    unit_purchase_price NUMERIC(14, 2) NOT NULL CHECK (unit_purchase_price >= 0),
    total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    origin_lot_reference VARCHAR(128),
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, receipt_id),
    CONSTRAINT uq_receipt_org_number UNIQUE (organization_id, receipt_number),
    FOREIGN KEY (organization_id, po_id) REFERENCES purchase_order(organization_id, po_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, po_line_id) REFERENCES purchase_order_line(organization_id, po_line_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, supplier_id) REFERENCES supplier_master(organization_id, supplier_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, material_id) REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, created_lot_id) REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, movement_id) REFERENCES stock_ledger_movement(organization_id, movement_id) ON DELETE RESTRICT
);

-- 18b. Commercial: Customer Master
CREATE TABLE IF NOT EXISTS customer_master (
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL,
    customer_code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    customer_type VARCHAR(64) NOT NULL,
    contact_person VARCHAR(128),
    email VARCHAR(128),
    phone VARCHAR(64),
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, customer_id),
    CONSTRAINT uq_customer_org_code UNIQUE (organization_id, customer_code)
);

-- 19. Commercial: Order & Line
CREATE TABLE IF NOT EXISTS commercial_order (
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    order_id UUID NOT NULL,
    order_number VARCHAR(64) NOT NULL,
    channel VARCHAR(32) NOT NULL CHECK (channel IN ('RETAIL_POS', 'WHOLESALE_CONTRACT', 'ECOMMERCE')),
    customer_id UUID,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED', 'RESERVED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'DISPATCHED', 'COMPLETED', 'CANCELLED', 'REFUNDED')),
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
    discount_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    tax_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    ordered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dispatched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, order_id),
    CONSTRAINT uq_order_org_number UNIQUE (organization_id, order_number)
);

CREATE TABLE IF NOT EXISTS commercial_order_line (
    organization_id UUID NOT NULL,
    order_line_id UUID NOT NULL,
    order_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    material_id UUID NOT NULL,
    ordered_quantity NUMERIC(14, 4) NOT NULL CHECK (ordered_quantity > 0),
    fulfilled_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (fulfilled_quantity >= 0),
    uom VARCHAR(16) NOT NULL,
    unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    line_subtotal NUMERIC(14, 2) NOT NULL CHECK (line_subtotal >= 0),
    line_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (line_status IN ('PENDING', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED')),
    PRIMARY KEY (organization_id, order_line_id),
    FOREIGN KEY (organization_id, order_id) REFERENCES commercial_order(organization_id, order_id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, sku_id) REFERENCES sku_master(organization_id, sku_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, material_id) REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT
);

-- 20. Commercial: Fulfillment Allocation & COGS (Acyclic)
CREATE TABLE IF NOT EXISTS fulfillment_allocation (
    organization_id UUID NOT NULL,
    allocation_id UUID NOT NULL,
    order_line_id UUID NOT NULL,
    inventory_lot_id UUID NOT NULL,
    allocated_quantity NUMERIC(14, 4) NOT NULL CHECK (allocated_quantity > 0),
    uom VARCHAR(16) NOT NULL,
    movement_id UUID,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, allocation_id),
    FOREIGN KEY (organization_id, order_line_id) REFERENCES commercial_order_line(organization_id, order_line_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, inventory_lot_id) REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, movement_id) REFERENCES stock_ledger_movement(organization_id, movement_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS cogs_record (
    organization_id UUID NOT NULL,
    cogs_record_id UUID NOT NULL,
    fulfillment_allocation_id UUID NOT NULL,
    inventory_lot_id UUID NOT NULL,
    dispatched_quantity NUMERIC(14, 4) NOT NULL CHECK (dispatched_quantity > 0),
    uom VARCHAR(16) NOT NULL,
    unit_cost_snapshot NUMERIC(18, 4) NOT NULL CHECK (unit_cost_snapshot >= 0),
    total_cogs_amount NUMERIC(14, 2) NOT NULL CHECK (total_cogs_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    realized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, cogs_record_id),
    CONSTRAINT uq_cogs_allocation UNIQUE (organization_id, fulfillment_allocation_id),
    FOREIGN KEY (organization_id, fulfillment_allocation_id) REFERENCES fulfillment_allocation(organization_id, allocation_id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, inventory_lot_id) REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT
);

-- 21. Blend Engine: Formulation & Recipe Templates (04_BLEND_ENGINE)
CREATE TABLE IF NOT EXISTS blend_recipe (
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    recipe_id UUID NOT NULL,
    recipe_code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    output_material_id UUID NOT NULL,
    version INT NOT NULL DEFAULT 1,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, recipe_id),
    CONSTRAINT uq_blend_recipe_org_code UNIQUE (organization_id, recipe_code),
    FOREIGN KEY (organization_id, output_material_id) REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS blend_recipe_component (
    organization_id UUID NOT NULL,
    component_id UUID NOT NULL,
    recipe_id UUID NOT NULL,
    material_id UUID NOT NULL,
    target_ratio_percentage NUMERIC(6, 2) NOT NULL CHECK (target_ratio_percentage > 0 AND target_ratio_percentage <= 100),
    sequence_number INT NOT NULL DEFAULT 1,
    PRIMARY KEY (organization_id, component_id),
    FOREIGN KEY (organization_id, recipe_id) REFERENCES blend_recipe(organization_id, recipe_id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, material_id) REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT
);
`;

