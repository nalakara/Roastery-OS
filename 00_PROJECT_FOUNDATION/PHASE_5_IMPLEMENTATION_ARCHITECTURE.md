# Roastery OS Phase 5 — Implementation Architecture & Execution Plan

**Status:** Proposed Implementation Architecture (Ready for Review)  
**Phase:** Phase 5 — Engine & Application Implementation Planning  
**Baseline Hardening Gate:** `SPECIFICATION_HARDENING_GATE.md` (FROZEN)  
**Technical Architecture:** `TECHNICAL_ARCHITECTURE.md` (APPROVED)  
**Logical Data Model:** `LOGICAL_DATA_MODEL.md` (APPROVED)  
**Database Schema:** `DATABASE_SCHEMA.md` (APPROVED)  
**Domain Contracts:** `00_PROJECT_FOUNDATION/DOMAIN_CONTRACTS_AND_TYPES.md` (HARDENED)  
**Date:** 2026-09-14  

---

## 1. Purpose & Scope

This document establishes the **Implementation Architecture, Package Structure, and Execution Strategy** for Phase 5 of Roastery OS.

It translates the frozen domain contracts, logical models, and PostgreSQL database schema into an executable application architecture without altering domain ontology or introducing speculative distributed infrastructure.

The core objective is to define a pragmatic, modular, and type-safe implementation path that validates end-to-end correctness through focused vertical slices before building the entire system.

---

## 2. Architectural Principles & Boundaries

### 2.1 The Three-Layer Separation

To maintain strict domain isolation and testability, the codebase adheres to a strict hexagonal / clean architectural separation:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION / API LAYER                        │
│             (REST / GraphQL / CLI / Hardware Serial Port DTOs)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ invokes
┌───────────────────────────────────▼────────────────────────────────────┐
│                        APPLICATION SERVICES LAYER                      │
│   (Use Case Interactors, Transaction Boundaries, Cross-Engine Sagas)   │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ coordinates                     │ loads / persists
┌──────────────────▼──────────────────┐   ┌──────────▼───────────────────┐
│         DOMAIN LAYER (CORE)         │   │     INFRASTRUCTURE LAYER      │
│ ├── Entities & Aggregates           │   │ ├── PostgreSQL Repositories  │
│ ├── Value Objects (Quantity, Money) │   │ ├── Transaction Manager (pg) │
│ ├── Domain Invariants & Rules       │   │ ├── Database Schema Mappers  │
│ └── Engine Boundary Interfaces      │   │ └── Telemetry / Serial Adapters│
└─────────────────────────────────────┘   └──────────────────────────────┘
```

1. **Domain Layer (Core):**
   - Pure, zero-dependency domain logic.
   - Contains entities, aggregates, value objects (`Quantity`, `UnitOfMeasure`, `Money`, `UnitCost`, `DecimalValue`), domain invariants, and nominal identifier types.
   - Independent of databases, frameworks, ORMs, and web transports.
2. **Application Layer:**
   - Coordinates domain aggregates and orchestrates multi-engine workflows (e.g., `CompleteTransformationUseCase`, `ReceivePurchaseOrderUseCase`).
   - Defines and manages **atomic database transaction boundaries**.
   - Invokes domain interfaces and infrastructure repositories without owning domain state.
3. **Infrastructure Layer:**
   - Implements repository interfaces using PostgreSQL.
   - Maps between relational tables (from `DATABASE_SCHEMA.md`) and domain contracts/entities.
   - Encapsulates database connection pools, row-level tenant context (`organization_id`), and migrations.
4. **Presentation / API Layer:**
   - Handles transport-level serialization, HTTP/JSON routing, and request validation.
   - DTOs (Data Transfer Objects) are strictly mapped to application commands; HTTP DTOs are **NEVER** allowed to contaminate the domain model.

---

## 3. Package & Monorepo Structure `[PROPOSED]`

For Phase 5, a clean, modular **TypeScript Monorepo** using npm/pnpm workspaces is proposed. This guarantees compile-time dependency direction enforcement and shared contracts without microservice complexity:

```text
roastery-os/
├── packages/
│   ├── contracts/                     # [SHARED] Pure TypeScript Domain Contracts & Interfaces
│   │   ├── src/
│   │   │   ├── identifiers.ts         # Nominal Branded IDs (OrganizationId, MaterialId, etc.)
│   │   │   ├── value-objects/         # Quantity, UnitOfMeasure, Money, UnitCost, DecimalValue
│   │   │   ├── vocabularies/          # Enums & controlled types (LotState, Archetypes, etc.)
│   │   │   ├── master-data.ts         # Material, Product, SKU contracts
│   │   │   ├── inventory.ts           # InventoryLot, StockLedgerMovement contracts
│   │   │   ├── transformation.ts      # Transformation, Input, Discriminated Output contracts
│   │   │   ├── execution.ts           # Batch execution context contracts
│   │   │   ├── costing.ts             # CostEvent, ValuationRecord, CogsRecord contracts
│   │   │   ├── traceability.ts        # ProvenanceEdge contracts
│   │   │   ├── supplier.ts            # Supplier, PurchaseOrder, PurchaseReceipt contracts
│   │   │   ├── commercial.ts          # CommercialOrder, Line, FulfillmentAllocation contracts
│   │   │   └── invariants.ts          # Formal domain invariant definitions & error types
│   │   └── package.json
│   │
│   ├── domain-core/                   # [DOMAIN] Pure Domain Aggregates & Invariant Enforcers
│   │   ├── src/
│   │   │   ├── master-data/           # Material, Product, SKU entities
│   │   │   ├── inventory/             # InventoryLot aggregate, balance calculations
│   │   │   ├── transformation/        # Transformation aggregate, yield calculation
│   │   │   ├── costing/               # Valuation math, allocation policies, COGS derivation
│   │   │   ├── traceability/          # Provenance causal edge recording
│   │   │   └── common/                # Decimal implementation & dimension safety logic
│   │   └── package.json
│   │
│   ├── infrastructure-postgres/       # [INFRASTRUCTURE] Database Schema, Migrations & Adapters
│   │   ├── src/
│   │   │   ├── connection.ts          # pg-pool connection & tenant context provider
│   │   │   ├── transaction.ts         # Atomic Unit of Work / Transaction Manager
│   │   │   ├── mappers/               # Relational Row <-> Domain Entity Mappers
│   │   │   ├── repositories/          # MasterDataRepo, InventoryRepo, TransformationRepo, etc.
│   │   │   └── migrations/            # DDL migration scripts (1-to-1 with DATABASE_SCHEMA.md)
│   │   └── package.json
│   │
│   ├── application-services/          # [APPLICATION] Use Cases & Multi-Engine Sagas
│   │   ├── src/
│   │   │   ├── procurement/           # ReceivePurchaseOrderUseCase
│   │   │   ├── inventory/             # AdjustStockUseCase, ReserveStockUseCase
│   │   │   ├── transformation/        # CompleteTransformationUseCase (Cross-Engine Orchestrator)
│   │   │   ├── commercial/            # ConfirmOrderUseCase, DispatchFulfillmentUseCase
│   │   │   └── costing/               # RecalculateLotValuationUseCase
│   │   └── package.json
│   │
│   └── app-api/                       # [PRESENTATION] REST / Fastify / Express Entrypoint (Future)
│       └── src/
│           ├── routes/
│           └── server.ts
│
├── package.json
└── tsconfig.base.json
```

---

## 4. Engine Interaction & Cross-Cutting Workflows

### 4.1 The Transformation Completion Lifecycle

The completion of a material conversion represents the central cross-engine orchestration in Roastery OS. The application service orchestrates the steps within a **single atomic PostgreSQL transaction** while strictly preserving domain ownership:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               APPLICATION SERVICE: CompleteTransformationUseCase.execute()             │
│                                                                                        │
│   1. BEGIN TRANSACTION (organization_id)                                               │
│   ├── 2. Validate Transformation Status (Must be IN_PROGRESS or DRAFT)                 │
│   ├── 3. Deplete Input Lots (02_INVENTORY_ENGINE)                                      │
│   │      ├── Deduct quantity_on_hand projection                                        │
│   │      └── Insert StockLedgerMovement(TRANSFORMATION_CONSUME, -qty)                  │
│   ├── 4. Materialize Output Lots (02_INVENTORY_ENGINE)                                 │
│   │      ├── For physical outputs: Create new InventoryLot(qty, ACTIVE)                │
│   │      ├── Insert StockLedgerMovement(TRANSFORMATION_YIELD, +qty)                    │
│   │      └── For UNRECOVERABLE_WASTE: Skip InventoryLot creation                       │
│   ├── 5. Capitalize Direct Conversion Expenses (07_COSTING_ENGINE)                     │
│   │      └── Insert CostEvent records (DIRECT_LABOR, ENERGY, MACHINE, OVERHEAD)        │
│   ├── 6. Calculate Output Lot Valuations (07_COSTING_ENGINE)                           │
│   │      ├── Pool Value: V_total = Sum(V_consumed_inputs) + Sum(CostEvents)            │
│   │      ├── Apply CostAllocationPolicy (Full Absorption, Pro-Rata, NRV, etc.)         │
│   │      ├── Derive Unit Cost: U_lot = V_allocated / Q_produced                        │
│   │      └── Insert LotValuationRecord(createdLotId, totalCost, unitCost, policy)      │
│   ├── 7. Record Causal Lineage (08_BATCH_TRACEABILITY)                                 │
│   │      └── Insert ProvenanceEdge(sourceLotId -> transformationId -> targetLotId)     │
│   ├── 8. Update Transformation Record                                                  │
│   │      └── Set status = 'COMPLETED', completed_at = NOW()                            │
│   └── 9. COMMIT TRANSACTION                                                            │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Ownership Firewall Rules:
- **Inventory Engine** owns: input lot depletion, output lot creation, and physical movements.
- **Transformation Core** owns: transformation state lifecycle and input/output structure.
- **Costing Engine** owns: consumed inventory valuation, cost events, allocation calculations, and `LotValuationRecord`.
- **Traceability Engine** owns: `ProvenanceEdge` causal graph links.
- **Application Service** owns: transaction boundary coordination only; it owns zero domain data.

---

## 5. Transaction Boundary Model

Every state-mutating operation in Roastery OS is categorized by its strict transactional requirements:

| Operation / Use Case | Transaction Scope | Authoritative Writes | Materialized Projections Updated | Append-Only Records Inserted |
| :--- | :--- | :--- | :--- | :--- |
| **`ReceivePurchaseOrder`** | Atomic (Single Tx) | `purchase_receipt` | `inventory_lot.quantity_on_hand` ($+Q$) | `stock_ledger_movement`, `lot_valuation_record` |
| **`ReserveStock`** | Atomic (Single Tx) | `commercial_order` | `inventory_lot.reserved_quantity` ($+Q$) | *(None — 0 physical movements)* |
| **`ReleaseReservation`** | Atomic (Single Tx) | `commercial_order` | `inventory_lot.reserved_quantity` ($-Q$) | *(None — 0 physical movements)* |
| **`CompleteTransformation`**| Atomic (Single Tx) | `transformation`, `batch` | `inventory_lot.quantity_on_hand` ($-Q_{\text{in}}, +Q_{\text{out}}$) | `stock_ledger_movement` ($\times N+M$), `cost_event`, `lot_valuation_record`, `provenance_edge` |
| **`DispatchFulfillment`** | Atomic (Single Tx) | `fulfillment_allocation`, `commercial_order_line` | `inventory_lot.quantity_on_hand` ($-Q$), `inventory_lot.reserved_quantity` ($-Q$) | `stock_ledger_movement` (`COMMERCIAL_DISPATCH`), `cogs_record` |
| **`InventoryCycleCountAdjust`**| Atomic (Single Tx)| `inventory_audit` | `inventory_lot.quantity_on_hand` ($\pm \Delta Q$) | `stock_ledger_movement` (`ADJUSTMENT_GAIN` / `ADJUSTMENT_LOSS`) |

---

## 6. Domain Contract to Database Schema Mapping

| Domain Contract Interface | PostgreSQL Table Name | Key Mapping Nuances & Database Types |
| :--- | :--- | :--- |
| `MaterialMasterContract` | `master_data.material_master` | `material_id UUID`, `code VARCHAR`, `category VARCHAR`, `base_uom VARCHAR` |
| `ProductMasterContract` | `master_data.product_master` | `product_id UUID`, `primary_material_id UUID NULL` |
| `SkuMasterContract` | `master_data.sku_master` | `sku_id UUID`, `packaged_quantity NUMERIC(14, 4)`, `base_retail_price NUMERIC(14, 2)` |
| `InventoryLotContract` | `inventory.inventory_lot` | `quantity_on_hand NUMERIC(14, 4)`, `reserved_quantity NUMERIC(14, 4)`, `lot_state VARCHAR` |
| `StockLedgerMovementContract`| `inventory.stock_ledger_movement`| `quantity_delta NUMERIC(14, 4)`, `movement_type VARCHAR`, `occurred_at TIMESTAMPTZ` |
| `TransformationContract` | `transformation.transformation` | `archetype VARCHAR`, `status VARCHAR`, `started_at`, `completed_at` |
| `TransformationInputContract`| `transformation.transformation_input`| `planned_quantity NUMERIC(14, 4)`, `actual_quantity_consumed NUMERIC(14, 4)`, `movement_id UUID` |
| `PhysicalTransformationOutputContract`| `transformation.transformation_output`| `output_type VARCHAR`, `actual_quantity_produced NUMERIC(14, 4)`, `created_lot_id UUID NOT NULL` |
| `WasteTransformationOutputContract`| `transformation.transformation_output`| `output_type = 'UNRECOVERABLE_WASTE'`, `created_lot_id NULL`, `movement_id NULL` |
| `BatchExecutionContract` | `transformation.batch` | `batch_type VARCHAR`, `ambient_temperature NUMERIC(5, 2)`, `process_telemetry JSONB` |
| `CostEventContract` | `costing.cost_event` | `cost_category VARCHAR`, `allocated_amount NUMERIC(14, 2)`, `allocation_basis VARCHAR` |
| `LotValuationRecordContract` | `costing.lot_valuation_record` | `material_cost NUMERIC(14, 2)`, `conversion_cost NUMERIC(14, 2)`, `unit_cost NUMERIC(18, 4)` |
| `CogsRecordContract` | `costing.cogs_record` | `dispatched_quantity NUMERIC(14, 4)`, `unit_cost_snapshot NUMERIC(18, 4)`, `total_cogs_amount NUMERIC(14, 2)` |
| `ProvenanceEdgeContract` | `traceability.provenance_edge` | `source_lot_id UUID`, `transformation_id UUID`, `target_lot_id UUID`, `consumed_quantity NUMERIC(14, 4)` |
| `FulfillmentAllocationContract`| `commercial.fulfillment_allocation`| `order_line_id UUID`, `inventory_lot_id UUID`, `allocated_quantity NUMERIC(14, 4)`, `movement_id UUID` |

---

## 7. Open Decisions Resolution Strategy `[PROPOSED]`

1. **`[OPEN-CONTRACTS-01]` Contract Packaging:**
   - **Resolution for Phase 5:** Implemented as a dedicated `@roastery-os/contracts` TypeScript package inside the monorepo.
   - **Rationale:** Provides zero-build overhead type sharing across domain, application, and infrastructure layers.
2. **`[OPEN-CONTRACTS-02]` Exact Decimal Runtime Representation:**
   - **Resolution for Phase 5:** Wrap `decimal.js` behind the pure `DecimalValue` value-object interface in `@roastery-os/domain-core`.
   - **Rationale:** Prevents library lock-in while ensuring 100% precision safety for mass arithmetic and fractional unit costs ($U_{\text{lot}}$).

---

## 8. First Vertical Slice Proposal: Inbound Procurement to Physical Inventory

To validate the end-to-end architecture (Domain Contracts $\rightarrow$ Domain Aggregate $\rightarrow$ Application Use Case $\rightarrow$ Repository Adapter $\rightarrow$ PostgreSQL Transaction $\rightarrow$ Exact Decimal Math), the **First Vertical Slice** is defined as:

### Use Case: `ReceiveInboundPurchaseOrderSlice`

```text
[PurchaseOrder Verified]
           ↓
[Application Service: ReceivePurchaseOrderUseCase]
           ↓
[BEGIN TX (organization_id)]
   ├── 1. Verify Master Data (MaterialMaster active)
   ├── 2. Initialize InventoryLot (lotNumber, materialId, quantityReceived, lotState = ACTIVE)
   ├── 3. Insert StockLedgerMovement (type = PURCHASE_RECEIPT, quantityDelta = +quantityReceived)
   ├── 4. Initialize LotValuationRecord (materialCost = purchasePrice * qty, unitCost = purchasePrice)
   └── 5. Insert PurchaseReceipt record
[COMMIT TX]
           ↓
[Verify: Database row constraints, tenant isolation, balance projection, and decimal exactness]
```

#### Why This Slice?
1. Validates tenant isolation on composite keys `(organization_id, id)`.
2. Validates physical ledger authority (`StockLedgerMovement` + `quantityOnHand` projection).
3. Validates unit cost initialization in `07_COSTING_ENGINE` without requiring complex $N:M$ transformation math.
4. Provides a solid foundation of real physical lots required for the second slice.

### Second Vertical Slice (Follow-up):
- **`ExecuteTransformationAndYieldSlice`:** Consumes green bean lot, records roasting execution context (`Batch`), yields roasted coffee lot, records direct labor/energy `CostEvent`, computes unit valuation, and records `ProvenanceEdge`.

---

## 9. Test Strategy

```text
┌────────────────────────────────────────────────────────┐
│                VERTICAL SLICE TESTS                    │
│   (End-to-End In-Memory / TestContainer DB Scenarios)   │
├────────────────────────────────────────────────────────┤
│             APPLICATION USE CASE TESTS                 │
│         (Mocked Repositories, Tx Boundaries)           │
├────────────────────────────────────────────────────────┤
│             INFRASTRUCTURE PERSISTENCE TESTS           │
│    (PostgreSQL Row-Level Security, Constraints, FKs)   │
├────────────────────────────────────────────────────────┤
│             DOMAIN INVARIANT & UNIT TESTS              │
│ (Quantity Math, UOM Dimension Safety, Cost Allocations)│
└────────────────────────────────────────────────────────┘
```

1. **Domain Unit Tests (Invariant Verification):**
   - Pure fast unit tests with zero database dependencies.
   - Tests: mass conversion ($1000\text{ g} = 1\text{ kg}$), incompatible UOM rejection (`KG` + `UNIT` $\rightarrow$ Error), negative quantity rejection, availability formula ($\text{avail} = \text{onHand} - \text{reserved}$).
2. **Infrastructure Persistence Tests:**
   - Integration tests executing against a real PostgreSQL instance (via local Docker / Testcontainers).
   - Tests: Composite foreign key cross-tenant rejection, `CHECK` constraints on negative balance, UUIDv7 indexing.
3. **Application Service Tests:**
   - Verifies multi-engine coordination and rollback on failure.

---

## 10. Phase 5 Implementation Sequencing

```text
Step 1: Monorepo Foundation & Contract Package (@roastery-os/contracts)
   ├── Set up workspaces and tsconfig
   └── Port hardened DOMAIN_CONTRACTS_AND_TYPES.md into TypeScript interfaces
         ↓
Step 2: Domain Core & Value Objects (@roastery-os/domain-core)
   ├── Implement DecimalValue (wrapping decimal.js)
   ├── Implement UnitOfMeasure & Dimension Safety Matrix
   ├── Implement Quantity, Money, and UnitCost value objects
   └── Implement Domain Invariant Validators
         ↓
Step 3: Infrastructure & PostgreSQL Schema Layer (@roastery-os/infrastructure-postgres)
   ├── Set up pg connection pool and Transaction Manager
   ├── Create migration runner executing DATABASE_SCHEMA.md DDL
   └── Implement database mappers for Master Data, Inventory, and Costing
         ↓
Step 4: Execute Vertical Slice 1 (Inbound Procurement & Inventory Intake)
   ├── Implement MasterDataRepo, InventoryRepo, and SupplierRepo
   ├── Implement ReceivePurchaseOrderUseCase
   └── Run end-to-end integration test against PostgreSQL
         ↓
Step 5: Execute Vertical Slice 2 (Transformation, Costing & Lineage)
   ├── Implement TransformationRepo, CostingRepo, TraceabilityRepo
   ├── Implement CompleteTransformationUseCase
   └── Verify N:M transformation yield, CostEvent capitalization, and ProvenanceEdge
         ↓
Step 6: Commercial Fulfillment & COGS (POS / Wholesale)
   ├── Implement Reservation and Dispatch use cases
   └── Verify multi-lot allocation and COGS realization
```

---

## 11. Explicit "NOT IN PHASE 5 YET" List

To maintain rigorous focus and avoid scope creep, the following are strictly excluded from initial Phase 5 execution:
- ❌ REST / GraphQL API routing and HTTP controller scaffolding.
- ❌ Web UI / Frontend dashboards / React components.
- ❌ Redis, RabbitMQ, Kafka, or distributed message queues.
- ❌ Multi-tenant database schema-per-tenant isolation (we use row-level `organization_id` as decided).
- ❌ Hardware roast machine serial/Bluetooth drivers (telemetry is tested via JSON payloads).
- ❌ Analytics data warehouse / OLAP rollups.
- ❌ AI suggestion engine and prompt orchestration.

---

## 12. Verification & Status Assessment

An audit against the frozen foundation documents confirms:
- **Ontology Integrity:** $100\%$ compliant. `Material` $\rightarrow$ `Product` $\rightarrow$ `SKU` $\rightarrow$ `InventoryLot` preserved.
- **Transformation Independence:** Transformation is a shared core boundary; `Batch` is an execution wrapper.
- **Physical vs Economic Separation:** Physical inventory owned by `02_INVENTORY_ENGINE`; valuation owned by `07_COSTING_ENGINE`.
- **Reservation Isolation:** Reservations do not insert physical movements and do not affect `quantityOnHand`.
- **Multi-Tenant Isolation:** Maintained via composite keys `(organization_id, id)` across all tables and domain contracts.

---

## 13. Status Verdict

> [!IMPORTANT]
> **PHASE 5 DESIGN STATUS: GREEN / READY FOR IMPLEMENTATION PLANNING APPROVAL**  
> The implementation architecture is fully grounded, acyclic, and aligned with all frozen specifications.
