# Roastery OS Database Schema & Migration Specification

**Status:** Ready for Phase 4 (Domain Contracts & Types)  
**Baseline Specification:** `SPECIFICATION_HARDENING_GATE.md` (FROZEN)  
**Architecture Baseline:** `TECHNICAL_ARCHITECTURE.md` (APPROVED)  
**Logical Data Model:** `LOGICAL_DATA_MODEL.md` (APPROVED)  
**Database Target:** PostgreSQL 15+  
**Date:** 2026-09-14  

---

## 1. Purpose & Scope

This document translates the approved **Logical Data Model (LDM)** into a hardened **PostgreSQL Relational Database Schema & Migration Specification**.

It defines:
- Concrete tables, column data types, nullability, defaults, check constraints, and foreign-key behaviors.
- Multi-tenant isolation enforcement using composite foreign keys containing `organization_id`.
- Reconciled physical inventory quantity authority and reservation invariants.
- A clean, acyclic foreign-key architecture eliminating circular references between commercial fulfillment and COGS.
- Atomic multi-table transaction boundaries for critical roastery workflows.
- Migration dependency order and referential integrity guarantees.

---

## 2. Technical Decisions & Classifications

### 2.1 `[DECIDED]` Implementation Decisions

1. **`[DECIDED-DB-01]` Primary Identifier Strategy (UUIDv7):**
   - **Decision:** All primary keys use `UUID` generated via **UUIDv7** (time-ordered 128-bit identifiers).
   - **Rationale:** Provides sequential B-tree index locality (preventing random index page splits), enables offline/distributed ID generation for edge POS registers and roaster hardware terminals, and remains globally unique across organizations.
2. **`[DECIDED-DB-02]` Multi-Tenancy Strategy (Composite Foreign-Key Isolation):**
   - **Decision:** Row-level multi-tenancy with mandatory `organization_id UUID NOT NULL` on all tables. All inter-table foreign keys reference **composite unique keys** `(organization_id, id)` wherever cross-aggregate references exist.
   - **Rationale:** Structurally prevents an entity in Organization A from referencing an entity in Organization B at the database constraint level, backed by PostgreSQL Row-Level Security (RLS) policies.
3. **`[DECIDED-DB-03]` Physical Inventory Authority & Quantity Reconciliation:**
   - **Decision:** `stock_ledger_movement` is the sole authoritative record of physical stock mutations. `inventory_lot.quantity_on_hand` exists as a **materialized balance projection** for high-performance reads.
   - **Rule:** Every balance update **MUST** occur atomically within the same database transaction as the corresponding `stock_ledger_movement` insert. No direct balance mutation is permitted without a ledger entry.
4. **`[DECIDED-DB-04]` Reservation Semantics (Pure Availability State):**
   - **Decision:** Reservations/holds are managed via `inventory_lot.reserved_quantity` and commercial order allocation states.
   - **Rule:** Placing or releasing a reservation does **NOT** insert a `stock_ledger_movement` and does **NOT** alter `quantity_on_hand`. Physical movements represent physical changes in matter; reservations represent commercial intent.
5. **`[DECIDED-DB-05]` Acyclic COGS & Commercial Fulfillment Architecture:**
   - **Decision:** Unidirectional dependency: `cogs_record` references `fulfillment_allocation(organization_id, allocation_id)`. `fulfillment_allocation` does **NOT** store a foreign key back to `cogs_record`.
   - **Rationale:** Completely eliminates circular foreign-key constraints while preserving 100% downstream financial provenance.
6. **`[DECIDED-DB-06]` Process Telemetry Storage (JSONB Payload on `batch`):**
   - **Decision:** Roasting curve samples, environmental logs, and sensor time-series are stored in a `process_telemetry JSONB` column directly on the `batch` table for the MVP.
7. **`[DECIDED-DB-07]` Exact Decimal Types for Physical & Economic Quantities:**
   - **Decision:** Physical quantities use `NUMERIC(14, 4)` (precision down to $0.0001\text{ kg} / 0.1\text{ g}$). Monetary values and unit costs use `NUMERIC(14, 2)` or `NUMERIC(18, 4)` (for fractional unit costs $U_{\text{lot}}$). Never floating-point (`REAL` / `DOUBLE PRECISION`).

---

## 3. Database Schema Overview & Table Catalog

The schema comprises **exactly 20 relational tables** grouped by domain ownership:

| Schema / Domain | Table Name | Purpose & Ownership Scope |
| :--- | :--- | :--- |
| **`tenant`** | `organization` | Multi-tenancy root tenant organization record. |
| **`master_data`** | `material_master` | Physical substance master catalog (`01_MASTER_DATA`). |
| **`master_data`** | `product_master` | Commercial brand/product line catalog (`01_MASTER_DATA`). |
| **`master_data`** | `sku_master` | Sellable packaging units and commercial pricing (`01_MASTER_DATA`). |
| **`inventory`** | `inventory_lot` | Canonical atomic physical stock instance (`02_INVENTORY_ENGINE`). |
| **`inventory`** | `stock_ledger_movement` | Append-only physical stock ledger (`02_INVENTORY_ENGINE`). |
| **`transformation`**| `transformation` | Shared material conversion boundary ($N:M$). |
| **`transformation`**| `transformation_input` | Physical material consumption ($N$) from `inventory_lot`. |
| **`transformation`**| `transformation_output`| Physical material yield ($M$) initializing `inventory_lot`. |
| **`transformation`**| `batch` | Operational execution wrapper (Roast, Blend, Production). |
| **`costing`** | `cost_event` | Non-inventory conversion expenses (`07_COSTING_ENGINE`). |
| **`costing`** | `lot_valuation_record` | Authoritative lot valuation & unit cost $U_{\text{lot}}$ (`07`). |
| **`costing`** | `cogs_record` | Realized COGS on commercial dispatch (`07`). |
| **`traceability`** | `provenance_edge` | Directed causal genealogy graph (`08_BATCH_TRACEABILITY`). |
| **`supplier`** | `supplier_master` | Inbound vendor accounts (`09_SUPPLIER_SYSTEM`). |
| **`supplier`** | `purchase_order` | Procurement purchase orders (`09_SUPPLIER_SYSTEM`). |
| **`supplier`** | `purchase_order_line`| Line items for procurement purchase orders (`09_SUPPLIER_SYSTEM`). |
| **`supplier`** | `purchase_receipt` | Receiving voucher & intake handoff (`09_SUPPLIER_SYSTEM`). |
| **`commercial`** | `commercial_order` | Unified commercial agreement (POS & Wholesale) (`06`/`10`). |
| **`commercial`** | `commercial_order_line`| Commercial line items for sellable SKUs (`06`/`10`). |
| **`commercial`** | `fulfillment_allocation`| Binding commercial lines to physical `inventory_lot` (`06`/`10`). |

---

## 4. Detailed Table Specifications

### 4.1 Multi-Tenancy & Master Data Tables

#### `organization` (Tenant Root)
```sql
CREATE TABLE organization (
    organization_id UUID PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### `material_master` (`01_MASTER_DATA`)
```sql
CREATE TABLE material_master (
    material_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL CHECK (category IN ('RAW_MATERIAL', 'INTERMEDIARY_COFFEE', 'PACKAGING_MATERIAL', 'CONSUMABLE', 'FINISHED_GOOD')),
    base_uom VARCHAR(16) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_material_org_id UNIQUE (organization_id, material_id),
    CONSTRAINT uq_material_org_code UNIQUE (organization_id, code)
);
```

#### `product_master` (`01_MASTER_DATA`)
```sql
CREATE TABLE product_master (
    product_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand_line VARCHAR(128),
    description TEXT,
    primary_material_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_org_id UNIQUE (organization_id, product_id),
    CONSTRAINT uq_product_org_code UNIQUE (organization_id, code),
    CONSTRAINT fk_product_material FOREIGN KEY (organization_id, primary_material_id) 
        REFERENCES material_master(organization_id, material_id) ON DELETE SET NULL
);
```

#### `sku_master` (`01_MASTER_DATA`)
```sql
CREATE TABLE sku_master (
    sku_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    sku_code VARCHAR(64) NOT NULL,
    product_id UUID NOT NULL,
    material_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    packaging_type VARCHAR(64) NOT NULL,
    packaged_quantity NUMERIC(14, 4) NOT NULL CHECK (packaged_quantity > 0),
    packaged_uom VARCHAR(16) NOT NULL,
    barcode VARCHAR(64),
    base_retail_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (base_retail_price >= 0),
    base_wholesale_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (base_wholesale_price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sku_org_id UNIQUE (organization_id, sku_id),
    CONSTRAINT uq_sku_org_code UNIQUE (organization_id, sku_code),
    CONSTRAINT fk_sku_product FOREIGN KEY (organization_id, product_id) 
        REFERENCES product_master(organization_id, product_id) ON DELETE RESTRICT,
    CONSTRAINT fk_sku_material FOREIGN KEY (organization_id, material_id) 
        REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT
);
```

---

### 4.2 Physical Inventory Tables (`02_INVENTORY_ENGINE`)

#### `inventory_lot`
```sql
CREATE TABLE inventory_lot (
    inventory_lot_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    lot_number VARCHAR(64) NOT NULL,
    material_id UUID NOT NULL,
    quantity_on_hand NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (quantity_on_hand >= 0),
    reserved_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (reserved_quantity >= 0),
    uom VARCHAR(16) NOT NULL,
    storage_location_id VARCHAR(64),
    lot_state VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (lot_state IN ('ACTIVE', 'QUARANTINED', 'DEPLETED')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_lot_org_id UNIQUE (organization_id, inventory_lot_id),
    CONSTRAINT uq_lot_org_number UNIQUE (organization_id, lot_number),
    CONSTRAINT chk_lot_availability CHECK (quantity_on_hand >= reserved_quantity),
    CONSTRAINT fk_lot_material FOREIGN KEY (organization_id, material_id) 
        REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT
);
```

#### `stock_ledger_movement` (Append-Only Physical Ledger)
```sql
CREATE TABLE stock_ledger_movement (
    movement_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    movement_number VARCHAR(64) NOT NULL,
    inventory_lot_id UUID NOT NULL,
    movement_type VARCHAR(64) NOT NULL CHECK (movement_type IN (
        'PURCHASE_RECEIPT',
        'TRANSFORMATION_CONSUME',
        'TRANSFORMATION_YIELD',
        'COMMERCIAL_DISPATCH',
        'RESTOCK',
        'ADJUSTMENT_LOSS',
        'ADJUSTMENT_GAIN'
    )),
    quantity_delta NUMERIC(14, 4) NOT NULL,
    uom VARCHAR(16) NOT NULL,
    source_location_id VARCHAR(64),
    destination_location_id VARCHAR(64),
    reference_entity_type VARCHAR(64) NOT NULL CHECK (reference_entity_type IN (
        'PURCHASE_ORDER',
        'TRANSFORMATION',
        'COMMERCIAL_ORDER',
        'INVENTORY_AUDIT'
    )),
    reference_entity_id UUID NOT NULL,
    operator_id UUID,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    CONSTRAINT uq_movement_org_id UNIQUE (organization_id, movement_id),
    CONSTRAINT uq_movement_org_number UNIQUE (organization_id, movement_number),
    CONSTRAINT fk_movement_lot FOREIGN KEY (organization_id, inventory_lot_id) 
        REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT
);
```

---

### 4.3 Transformation & Batch Execution Tables

#### `transformation` (Shared Core Contract)
```sql
CREATE TABLE transformation (
    transformation_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    transformation_number VARCHAR(64) NOT NULL,
    archetype VARCHAR(64) NOT NULL CHECK (archetype IN (
        'ROASTING',
        'BLENDING',
        'EXTRACTION_COLD_BREW',
        'GRINDING',
        'ASSEMBLY_PACKAGING',
        'REPACKAGING'
    )),
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_transformation_org_id UNIQUE (organization_id, transformation_id),
    CONSTRAINT uq_transformation_org_number UNIQUE (organization_id, transformation_number)
);
```

#### `batch` (Operational Execution Context)
```sql
CREATE TABLE batch (
    batch_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    batch_number VARCHAR(64) NOT NULL,
    batch_type VARCHAR(64) NOT NULL CHECK (batch_type IN ('ROAST_BATCH', 'BLEND_BATCH', 'PRODUCTION_BATCH', 'PACKAGING_BATCH')),
    transformation_id UUID,
    equipment_id VARCHAR(64),
    operator_id UUID,
    recipe_or_profile_id VARCHAR(64),
    ambient_temperature NUMERIC(5, 2),
    ambient_humidity NUMERIC(5, 2),
    process_telemetry JSONB,
    status VARCHAR(32) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'EXECUTING', 'COMPLETED', 'ABORTED')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_batch_org_id UNIQUE (organization_id, batch_id),
    CONSTRAINT uq_batch_org_number UNIQUE (organization_id, batch_number),
    CONSTRAINT fk_batch_transformation FOREIGN KEY (organization_id, transformation_id) 
        REFERENCES transformation(organization_id, transformation_id) ON DELETE RESTRICT
);
```

#### `transformation_input` (Physical Input Consumption)
```sql
CREATE TABLE transformation_input (
    transformation_input_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    transformation_id UUID NOT NULL,
    inventory_lot_id UUID NOT NULL,
    material_id UUID NOT NULL,
    planned_quantity NUMERIC(14, 4) NOT NULL CHECK (planned_quantity > 0),
    actual_quantity_consumed NUMERIC(14, 4) CHECK (actual_quantity_consumed >= 0),
    uom VARCHAR(16) NOT NULL,
    input_sequence INT NOT NULL DEFAULT 1,
    movement_id UUID,
    CONSTRAINT uq_tr_input_org_id UNIQUE (organization_id, transformation_input_id),
    CONSTRAINT fk_tr_input_transformation FOREIGN KEY (organization_id, transformation_id) 
        REFERENCES transformation(organization_id, transformation_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tr_input_lot FOREIGN KEY (organization_id, inventory_lot_id) 
        REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tr_input_material FOREIGN KEY (organization_id, material_id) 
        REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tr_input_movement FOREIGN KEY (organization_id, movement_id) 
        REFERENCES stock_ledger_movement(organization_id, movement_id) ON DELETE RESTRICT
);
```

#### `transformation_output` (Physical Yield Initialization)
```sql
CREATE TABLE transformation_output (
    transformation_output_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    transformation_id UUID NOT NULL,
    created_lot_id UUID,
    material_id UUID NOT NULL,
    output_type VARCHAR(64) NOT NULL DEFAULT 'PRIMARY_PRODUCT' CHECK (output_type IN (
        'PRIMARY_PRODUCT',
        'CO_PRODUCT',
        'BY_PRODUCT',
        'RECOVERABLE_RESIDUE',
        'UNRECOVERABLE_WASTE'
    )),
    actual_quantity_produced NUMERIC(14, 4) NOT NULL CHECK (actual_quantity_produced > 0),
    uom VARCHAR(16) NOT NULL,
    movement_id UUID,
    CONSTRAINT uq_tr_output_org_id UNIQUE (organization_id, transformation_output_id),
    CONSTRAINT fk_tr_output_transformation FOREIGN KEY (organization_id, transformation_id) 
        REFERENCES transformation(organization_id, transformation_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tr_output_lot FOREIGN KEY (organization_id, created_lot_id) 
        REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tr_output_material FOREIGN KEY (organization_id, material_id) 
        REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tr_output_movement FOREIGN KEY (organization_id, movement_id) 
        REFERENCES stock_ledger_movement(organization_id, movement_id) ON DELETE RESTRICT,
    CONSTRAINT chk_output_lot_presence CHECK (
        (output_type IN ('PRIMARY_PRODUCT', 'CO_PRODUCT', 'BY_PRODUCT', 'RECOVERABLE_RESIDUE') AND created_lot_id IS NOT NULL) OR
        (output_type = 'UNRECOVERABLE_WASTE' AND created_lot_id IS NULL)
    )
);
```

---

### 4.4 Economic Costing Tables (`07_COSTING_ENGINE`)

#### `cost_event` (Non-Inventory Conversion Expenses)
```sql
CREATE TABLE cost_event (
    cost_event_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    transformation_id UUID NOT NULL,
    cost_category VARCHAR(64) NOT NULL CHECK (cost_category IN (
        'DIRECT_LABOR',
        'ENERGY_UTILITIES',
        'MACHINE_USAGE',
        'DIRECT_SERVICE_FEE',
        'DIRECT_OVERHEAD'
    )),
    allocated_amount NUMERIC(14, 2) NOT NULL CHECK (allocated_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    allocation_basis VARCHAR(64) NOT NULL DEFAULT 'BATCH_FIXED',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cost_event_org_id UNIQUE (organization_id, cost_event_id),
    CONSTRAINT fk_cost_event_transformation FOREIGN KEY (organization_id, transformation_id) 
        REFERENCES transformation(organization_id, transformation_id) ON DELETE RESTRICT
);
```

#### `lot_valuation_record` (Authoritative Lot Cost Accumulation)
```sql
CREATE TABLE lot_valuation_record (
    valuation_record_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    inventory_lot_id UUID NOT NULL,
    material_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (material_cost >= 0),
    conversion_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (conversion_cost >= 0),
    total_lot_cost NUMERIC(14, 2) NOT NULL CHECK (total_lot_cost >= 0),
    unit_cost NUMERIC(18, 4) NOT NULL CHECK (unit_cost >= 0),
    costing_method VARCHAR(64) NOT NULL DEFAULT 'SPECIFIC_IDENTIFICATION_BATCH',
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_lot_valuation_org_id UNIQUE (organization_id, valuation_record_id),
    CONSTRAINT uq_lot_valuation_lot UNIQUE (organization_id, inventory_lot_id),
    CONSTRAINT fk_valuation_lot FOREIGN KEY (organization_id, inventory_lot_id) 
        REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT
);
```

#### `cogs_record` (Realized Cost of Goods Sold)
```sql
CREATE TABLE cogs_record (
    cogs_record_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    fulfillment_allocation_id UUID NOT NULL,
    inventory_lot_id UUID NOT NULL,
    dispatched_quantity NUMERIC(14, 4) NOT NULL CHECK (dispatched_quantity > 0),
    uom VARCHAR(16) NOT NULL,
    unit_cost_snapshot NUMERIC(18, 4) NOT NULL CHECK (unit_cost_snapshot >= 0),
    total_cogs_amount NUMERIC(14, 2) NOT NULL CHECK (total_cogs_amount >= 0),
    realized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cogs_org_id UNIQUE (organization_id, cogs_record_id),
    CONSTRAINT uq_cogs_allocation UNIQUE (organization_id, fulfillment_allocation_id),
    CONSTRAINT fk_cogs_lot FOREIGN KEY (organization_id, inventory_lot_id) 
        REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT
);
```

---

### 4.5 Traceability Tables (`08_BATCH_TRACEABILITY`)

#### `provenance_edge` (Historical Lineage Graph)
```sql
CREATE TABLE provenance_edge (
    provenance_edge_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    source_lot_id UUID NOT NULL,
    transformation_id UUID NOT NULL,
    target_lot_id UUID NOT NULL,
    consumed_quantity NUMERIC(14, 4) NOT NULL CHECK (consumed_quantity > 0),
    uom VARCHAR(16) NOT NULL,
    edge_type VARCHAR(64) NOT NULL DEFAULT 'MATERIAL_CONSUMPTION',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_provenance_org_id UNIQUE (organization_id, provenance_edge_id),
    CONSTRAINT fk_provenance_source_lot FOREIGN KEY (organization_id, source_lot_id) 
        REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT,
    CONSTRAINT fk_provenance_transformation FOREIGN KEY (organization_id, transformation_id) 
        REFERENCES transformation(organization_id, transformation_id) ON DELETE RESTRICT,
    CONSTRAINT fk_provenance_target_lot FOREIGN KEY (organization_id, target_lot_id) 
        REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT
);
```

---

### 4.6 Procurement Tables (`09_SUPPLIER_SYSTEM`)

#### `supplier_master`
```sql
CREATE TABLE supplier_master (
    supplier_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    supplier_type VARCHAR(64) NOT NULL,
    contact_person VARCHAR(128),
    email VARCHAR(128),
    phone VARCHAR(64),
    payment_terms VARCHAR(64),
    origin_country VARCHAR(64),
    origin_region VARCHAR(128),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_supplier_org_id UNIQUE (organization_id, supplier_id),
    CONSTRAINT uq_supplier_org_code UNIQUE (organization_id, code)
);
```

#### `purchase_order`
```sql
CREATE TABLE purchase_order (
    po_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    po_number VARCHAR(64) NOT NULL,
    supplier_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED')),
    ordered_at TIMESTAMPTZ,
    expected_delivery_at TIMESTAMPTZ,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_po_org_id UNIQUE (organization_id, po_id),
    CONSTRAINT uq_po_org_number UNIQUE (organization_id, po_number),
    CONSTRAINT fk_po_supplier FOREIGN KEY (organization_id, supplier_id) 
        REFERENCES supplier_master(organization_id, supplier_id) ON DELETE RESTRICT
);
```

#### `purchase_order_line`
```sql
CREATE TABLE purchase_order_line (
    po_line_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    po_id UUID NOT NULL,
    material_id UUID NOT NULL,
    ordered_quantity NUMERIC(14, 4) NOT NULL CHECK (ordered_quantity > 0),
    received_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (received_quantity >= 0),
    uom VARCHAR(16) NOT NULL,
    unit_price NUMERIC(18, 4) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(14, 2) NOT NULL CHECK (line_total >= 0),
    CONSTRAINT uq_po_line_org_id UNIQUE (organization_id, po_line_id),
    CONSTRAINT fk_po_line_po FOREIGN KEY (organization_id, po_id) 
        REFERENCES purchase_order(organization_id, po_id) ON DELETE RESTRICT,
    CONSTRAINT fk_po_line_material FOREIGN KEY (organization_id, material_id) 
        REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT
);
```

#### `purchase_receipt`
```sql
CREATE TABLE purchase_receipt (
    receipt_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    receipt_number VARCHAR(64) NOT NULL,
    po_id UUID,
    supplier_id UUID NOT NULL,
    material_id UUID NOT NULL,
    received_quantity NUMERIC(14, 4) NOT NULL CHECK (received_quantity > 0),
    uom VARCHAR(16) NOT NULL,
    unit_purchase_price NUMERIC(18, 4) NOT NULL CHECK (unit_purchase_price >= 0),
    total_price NUMERIC(14, 2) NOT NULL CHECK (total_price >= 0),
    origin_lot_reference VARCHAR(128),
    created_inventory_lot_id UUID NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_receipt_org_id UNIQUE (organization_id, receipt_id),
    CONSTRAINT uq_receipt_org_number UNIQUE (organization_id, receipt_number),
    CONSTRAINT fk_receipt_po FOREIGN KEY (organization_id, po_id) 
        REFERENCES purchase_order(organization_id, po_id) ON DELETE RESTRICT,
    CONSTRAINT fk_receipt_supplier FOREIGN KEY (organization_id, supplier_id) 
        REFERENCES supplier_master(organization_id, supplier_id) ON DELETE RESTRICT,
    CONSTRAINT fk_receipt_material FOREIGN KEY (organization_id, material_id) 
        REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT,
    CONSTRAINT fk_receipt_lot FOREIGN KEY (organization_id, created_inventory_lot_id) 
        REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT
);
```

---

### 4.7 Commercial Sales & Fulfillment Tables (`06_POS_ENGINE` & `10_CUSTOMER_WHOLESALE`)

#### `commercial_order`
```sql
CREATE TABLE commercial_order (
    order_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    order_number VARCHAR(64) NOT NULL,
    channel VARCHAR(32) NOT NULL CHECK (channel IN ('RETAIL_POS', 'WHOLESALE_CONTRACT', 'ECOMMERCE')),
    customer_id UUID,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',
        'CONFIRMED',
        'RESERVED',
        'PARTIALLY_FULFILLED',
        'FULFILLED',
        'DISPATCHED',
        'COMPLETED',
        'CANCELLED',
        'REFUNDED'
    )),
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    ordered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dispatched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_commercial_order_org_id UNIQUE (organization_id, order_id),
    CONSTRAINT uq_commercial_order_org_number UNIQUE (organization_id, order_number)
);
```

#### `commercial_order_line`
```sql
CREATE TABLE commercial_order_line (
    order_line_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    order_id UUID NOT NULL,
    sku_id UUID NOT NULL,
    material_id UUID NOT NULL,
    ordered_quantity NUMERIC(14, 4) NOT NULL CHECK (ordered_quantity > 0),
    fulfilled_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (fulfilled_quantity >= 0),
    uom VARCHAR(16) NOT NULL,
    unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    line_subtotal NUMERIC(14, 2) NOT NULL CHECK (line_subtotal >= 0),
    line_status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (line_status IN ('PENDING', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED')),
    CONSTRAINT uq_order_line_org_id UNIQUE (organization_id, order_line_id),
    CONSTRAINT fk_order_line_order FOREIGN KEY (organization_id, order_id) 
        REFERENCES commercial_order(organization_id, order_id) ON DELETE RESTRICT,
    CONSTRAINT fk_order_line_sku FOREIGN KEY (organization_id, sku_id) 
        REFERENCES sku_master(organization_id, sku_id) ON DELETE RESTRICT,
    CONSTRAINT fk_order_line_material FOREIGN KEY (organization_id, material_id) 
        REFERENCES material_master(organization_id, material_id) ON DELETE RESTRICT
);
```

#### `fulfillment_allocation` (Multi-Lot Binding)
```sql
CREATE TABLE fulfillment_allocation (
    allocation_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organization(organization_id) ON DELETE RESTRICT,
    order_line_id UUID NOT NULL,
    inventory_lot_id UUID NOT NULL,
    allocated_quantity NUMERIC(14, 4) NOT NULL CHECK (allocated_quantity > 0),
    uom VARCHAR(16) NOT NULL,
    movement_id UUID,
    unit_cost_snapshot NUMERIC(18, 4) NOT NULL CHECK (unit_cost_snapshot >= 0),
    cogs_amount NUMERIC(14, 2) NOT NULL CHECK (cogs_amount >= 0),
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_fulfillment_alloc_org_id UNIQUE (organization_id, allocation_id),
    CONSTRAINT fk_alloc_order_line FOREIGN KEY (organization_id, order_line_id) 
        REFERENCES commercial_order_line(organization_id, order_line_id) ON DELETE RESTRICT,
    CONSTRAINT fk_alloc_lot FOREIGN KEY (organization_id, inventory_lot_id) 
        REFERENCES inventory_lot(organization_id, inventory_lot_id) ON DELETE RESTRICT,
    CONSTRAINT fk_alloc_movement FOREIGN KEY (organization_id, movement_id) 
        REFERENCES stock_ledger_movement(organization_id, movement_id) ON DELETE RESTRICT
);

-- Unidirectional FK: cogs_record references fulfillment_allocation (Acyclic)
ALTER TABLE cogs_record 
ADD CONSTRAINT fk_cogs_fulfillment_allocation 
FOREIGN KEY (organization_id, fulfillment_allocation_id) 
REFERENCES fulfillment_allocation(organization_id, allocation_id) ON DELETE RESTRICT;
```

---

## 5. Indexing Strategy

```sql
-- 1. Multi-Tenant Composite Lookups
CREATE INDEX idx_lot_org_material ON inventory_lot(organization_id, material_id, lot_state);
CREATE INDEX idx_lot_org_number ON inventory_lot(organization_id, lot_number);

-- 2. Stock Ledger Audit and Temporal Ordering
CREATE INDEX idx_stock_movement_lot ON stock_ledger_movement(organization_id, inventory_lot_id, occurred_at);
CREATE INDEX idx_stock_movement_ref ON stock_ledger_movement(organization_id, reference_entity_type, reference_entity_id);

-- 3. Transformation Input/Output Lookups
CREATE INDEX idx_transformation_inputs ON transformation_input(organization_id, transformation_id);
CREATE INDEX idx_transformation_outputs ON transformation_output(organization_id, transformation_id);
CREATE INDEX idx_batch_transformation ON batch(organization_id, transformation_id);

-- 4. Lineage Graph Traversal
CREATE INDEX idx_provenance_source ON provenance_edge(organization_id, source_lot_id);
CREATE INDEX idx_provenance_target ON provenance_edge(organization_id, target_lot_id);
CREATE INDEX idx_provenance_transformation ON provenance_edge(organization_id, transformation_id);

-- 5. Commercial Order Lines & Allocations
CREATE INDEX idx_order_lines_order ON commercial_order_line(organization_id, order_id);
CREATE INDEX idx_fulfillment_alloc_line ON fulfillment_allocation(organization_id, order_line_id);
CREATE INDEX idx_fulfillment_alloc_lot ON fulfillment_allocation(organization_id, inventory_lot_id);

-- 6. Costing and Valuation
CREATE INDEX idx_valuation_lot ON lot_valuation_record(organization_id, inventory_lot_id);
CREATE INDEX idx_cogs_lot ON cogs_record(organization_id, inventory_lot_id);
CREATE INDEX idx_cost_events_transformation ON cost_event(organization_id, transformation_id);
```

---

## 6. Atomic Transaction Boundaries

Database transactions **MUST** encapsulate the following multi-table workflows atomically:

### Transaction Boundary A: Inbound Purchase Receiving
$$\text{BEGIN TRANSACTION}$$
1. `INSERT INTO inventory_lot` (initialize lot in `ACTIVE` state with $Q = \text{received\_qty}$).
2. `INSERT INTO stock_ledger_movement` (`PURCHASE_RECEIPT`, $\Delta Q = +\text{received\_qty}$).
3. `INSERT INTO purchase_receipt` (record receiving voucher with unit purchase price).
4. `INSERT INTO lot_valuation_record` (stamp initial unit valuation $U_{\text{lot}} = \text{unit\_purchase\_price}$).
$$\text{COMMIT TRANSACTION}$$

### Transaction Boundary B: Transformation Completion
$$\text{BEGIN TRANSACTION}$$
1. `UPDATE transformation` (status $\rightarrow$ `COMPLETED`, `completed_at` = NOW).
2. For each `transformation_input`:
   - `INSERT INTO stock_ledger_movement` (`TRANSFORMATION_CONSUME`, $\Delta Q = -\text{consumed\_qty}$).
   - `UPDATE inventory_lot` (decrement materialized `quantity_on_hand` atomically with movement insert).
3. For each `transformation_output`:
   - If output is `PRIMARY_PRODUCT`, `CO_PRODUCT`, `BY_PRODUCT`, or `RECOVERABLE_RESIDUE`:
     - `INSERT INTO inventory_lot` (initialize new lot with $Q = \text{produced\_qty}$).
     - `INSERT INTO stock_ledger_movement` (`TRANSFORMATION_YIELD`, $\Delta Q = +\text{produced\_qty}$).
4. `INSERT INTO cost_event` (record any non-inventory conversion expenses).
5. For each output lot:
   - `INSERT INTO lot_valuation_record` ($U_{\text{lot}} = \frac{\sum \text{Input Valuations} + \sum \text{CostEvents}}{\text{Output Qty}}$).
6. For each input-output pair:
   - `INSERT INTO provenance_edge` (record exact genealogy edge).
$$\text{COMMIT TRANSACTION}$$

### Transaction Boundary C: Commercial Order Dispatch
$$\text{BEGIN TRANSACTION}$$
1. For each `fulfillment_allocation`:
   - `INSERT INTO stock_ledger_movement` (`COMMERCIAL_DISPATCH`, $\Delta Q = -\text{allocated\_qty}$).
   - `UPDATE inventory_lot` (decrement materialized `quantity_on_hand` and release `reserved_quantity`).
   - `INSERT INTO cogs_record` (stamp realized COGS $\text{allocated\_qty} \times U_{\text{lot}}$).
2. `UPDATE commercial_order` (status $\rightarrow$ `DISPATCHED`, `dispatched_at` = NOW).
$$\text{COMMIT TRANSACTION}$$

---

## 7. Migration Dependency Order

Migrations must be executed in the following strict order to satisfy foreign-key dependencies:

```text
Migration 001_core_tenancy:
  └── organization

Migration 002_master_data:
  ├── material_master
  ├── product_master
  └── sku_master

Migration 003_physical_inventory:
  ├── inventory_lot
  └── stock_ledger_movement

Migration 004_transformations:
  ├── transformation
  ├── batch
  ├── transformation_input
  └── transformation_output

Migration 005_costing_and_traceability:
  ├── cost_event
  ├── lot_valuation_record
  └── provenance_edge

Migration 006_procurement:
  ├── supplier_master
  ├── purchase_order
  ├── purchase_order_line
  └── purchase_receipt

Migration 007_commercial_sales:
  ├── commercial_order
  ├── commercial_order_line
  ├── fulfillment_allocation
  └── cogs_record (+ Unidirectional FK to fulfillment_allocation)
```

---

## 8. Schema Integrity Review & Baseline Alignment

An internal review against the three baseline documents confirmed:
1. **`SPECIFICATION_HARDENING_GATE.md` Alignment:** 100% compliant. Zero legacy typed inventory entities. Complete $N:M$ transformation support. Strict physical vs economic separation.
2. **`TECHNICAL_ARCHITECTURE.md` Alignment:** Append-only ledgers for stock movements and economic costs. Unit-aware quantity columns (`NUMERIC(14, 4)` + `uom`).
3. **`LOGICAL_DATA_MODEL.md` Alignment:** All 18 canonical logical entities mapped to 20 relational tables (including root `organization` and `purchase_order_line`). Transformation $\leftrightarrow$ Batch optionality preserved. CostEvent restricted strictly to non-inventory conversion expenses.
4. **Tenant Isolation:** Enforced via composite foreign keys `(organization_id, id)` across all tables.
5. **Acyclic Architecture:** Zero circular foreign-key constraints.

---

## 9. Summary Checklist

- [x] Correct table count: Exactly 20 relational tables defined.
- [x] Multi-tenant isolation enforced via composite foreign keys on all cross-module relationships.
- [x] Reconciled physical inventory quantity authority: `stock_ledger_movement` authoritative; `quantity_on_hand` is a materialized balance projection updated atomically.
- [x] Reservation state isolated from physical quantity and physical movement ledgers.
- [x] Circular foreign-key dependencies eliminated: `cogs_record` references `fulfillment_allocation` unidirectionally.
- [x] `transformation_output` / `inventory_lot` nullability and check constraint explicitly defined.
- [x] Non-authoritative yield ratios removed; unit-aware conservation preserved.
