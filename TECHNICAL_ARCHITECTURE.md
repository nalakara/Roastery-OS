# Roastery OS Technical Architecture

**Status:** Approved for Implementation  
**Baseline Specification:** `SPECIFICATION_HARDENING_GATE.md`  
**Date:** 2026-09-14  

---

## 1. Purpose & Scope

This document translates the frozen Roastery OS domain specification into a unified **Technical Architecture**. 

It defines:
- System layers and architectural patterns.
- Mapping of frozen domain concepts to software components and contracts.
- Inter-module dependency topology and transactional boundaries.
- Persistence and immutability invariants.
- An illustrative end-to-end vertical execution slice.
- Clear distinctions between domain rules, candidate implementation choices, and open decisions.

---

## 2. Technical Architectural Layers

Roastery OS follows a layered architectural pattern with clean separation of concerns and dependency inversion towards the core domain:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        UI / Presentation Layer                         │
│       (Web Dashboard, Barista POS, Roaster Terminal, Mobile Clients)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                         API / Interface Layer                          │
│           (API Endpoints, Command Handlers, DTO Serializers)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Application / Orchestration Layer                   │
│     (Use Case Services, Command Dispatchers, Workflow Orchestrators)   │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
┌───────────────────▼────────────────────┐  ┌────────▼───────────────────┐
│          Core Domain Layer             │  │   Infrastructure / Ports   │
│   (Entities, Aggregates, Value Objects,│  │   (Database Adapters,      │
│    Domain Invariants, State Machines,  │  │    Event Dispatchers, Auth,│
│    Transformation Contracts)           │  │    Hardware/Scale Drivers) │
└───────────────────┬────────────────────┘  └────────▲───────────────────┘
                    │                                │
┌───────────────────▼────────────────────────────────┴───────────────────┐
│                      Persistence & Storage Layer                       │
│    (Relational Tables, Append-Only Ledgers, Audit Logs, Time-Series)   │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Layer Responsibilities

1. **Domain Model Layer:** Pure business logic containing entity definitions, invariants, mathematical costing formulas, transformation contracts, and lifecycle state machines. Zero external framework dependencies.
2. **Application Layer:** Orchestrates domain workflows (e.g., executing a roast batch, confirming a wholesale order, receiving a shipment). Coordinates multi-engine operations while respecting authoritative ownership.
3. **API / Interface Layer:** Exposes domain operations via network interfaces, parses inputs, and serializes domain outputs.
4. **Persistence Layer:** Manages relational persistence with transactional guarantees, foreign-key integrity, and append-only ledger immutability.
5. **Infrastructure Layer:** Implements external adapters (database drivers, system clock, telemetry, hardware drivers).
6. **UI / Presentation Layer:** Role-tailored user interfaces (Cashier POS, Roastery Production Terminal, Wholesale Portal, Management Dashboard).

---

## 3. Mapping Frozen Domain Concepts to Technical Components

| Frozen Domain Concept | Technical Pattern / Component | Architectural Role & Characteristics |
| :--- | :--- | :--- |
| **`MaterialMaster`** | Entity / Catalog Aggregate (`01_MASTER_DATA`) | Master definition of physical substance (green coffee, roasted beans, packaging bags, labels, filters, bottles, nitrogen). |
| **`ProductMaster`** | Entity / Catalog Aggregate (`01_MASTER_DATA`) | Conceptual commercial identity and brand family (e.g., "Signature Espresso Blend"). |
| **`SKUMaster`** | Entity / Catalog Aggregate (`01_MASTER_DATA`) | Sellable stock-keeping unit with specific packaging format, weight/volume, barcode, and base price. References a Product and/or Material. |
| **`InventoryLot`** | Aggregate Root (`02_INVENTORY_ENGINE`) | Canonical physical stock instance. Tracks `lotNumber`, `materialId`, physical `quantityOnHand`, `allocatedQuantity`, `uom`, storage location, and state (`ACTIVE`, `QUARANTINED`, `DEPLETED`). |
| **`Transformation`** | Core Domain Contract / Shared Domain Concept | The canonical material conversion boundary. Consumes $N$ input `InventoryLots` via `TransformationInput` and yields $M$ output `InventoryLots` via `TransformationOutput`. Instantiated across Roasting (`03`), Blending (`04`), and Production (`05`). |
| **`Batch`** | Execution Context Entity | Execution operational wrapper (`RoastBatch`, `BlendBatch`, `PackagingBatch`) recording equipment ID, operator ID, start/end timestamps, environmental sensor logs, and process parameters. |
| **`Yield`** | Unit-Aware Value Object | Physical measurement of transformation output ($Q_{\text{out}}$ vs $Q_{\text{in}}$). Unit-aware (mass in kg, volume in L, count in units/packs). |
| **`CostEvent`** | Immutable Ledger Entry (`07_COSTING_ENGINE`) | Economic consequence. Represents non-inventory conversion costs (labor, roasting machine gas, packaging machine overhead). Distinct from physical material inputs. |
| **`Lineage`** | Immutable Graph Relation (`08_BATCH_TRACEABILITY`) | Historical provenance edges recording exact parent-to-child dependencies: $\text{InventoryLot} \rightarrow \text{Transformation} \rightarrow \text{InventoryLot}$. |

---

## 4. Aggregate Boundaries & Ownership Architecture

Ownership strictly adheres to the frozen specification without subordinating core engines into an artificial linear chain:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                             01_MASTER_DATA                             │
│         Aggregates: MaterialMaster, ProductMaster, SKUMaster           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE DOMAIN CONTRACTS                           │
│   Shared Concepts: Transformation (N:M Boundary), Yield (Unit-Aware)   │
└──────┬────────────────────────────┬────────────────────────────┬───────┘
       │                            │                            │
       ▼                            ▼                            ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│  03_ROASTING │             │   04_BLEND   │             │05_PRODUCTION │
│ Execution    │             │ Execution    │             │ Execution    │
│ Context:     │             │ Context:     │             │ Context:     │
│ RoastBatch   │             │ BlendBatch   │             │ Packaging/RTD│
└──────┬───────┘             └──────┬───────┘             └──────┬───────┘
       │                            │                            │
       └────────────────────┬───────┴────────────────────────────┘
                            │ instantiates transformations
                            ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          02_INVENTORY_ENGINE                           │
│        Authoritative Physical Stock Owner: InventoryLot, Movements     │
└──────▲────────────────────────────▲────────────────────────────▲───────┘
       │                            │                            │
       │ records receipts           │ dispatches stock           │ allocates stock
┌──────┴──────────────┐      ┌──────┴──────────────┐      ┌──────┴──────────────┐
│ 09_SUPPLIER_SYSTEM  │      │    06_POS_ENGINE    │      │10_CUSTOMER_WHOLESALE│
│ Sourcing & Inbound  │      │ Retail Sales & Shift│      │ B2B Orders & Terms  │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘

═══════════════════════════════════════════════════════════════════════════
                      CROSS-CUTTING DOMAIN OWNERS
═══════════════════════════════════════════════════════════════════════════
┌────────────────────────────────────────────────────────────────────────┐
│ 07_COSTING_ENGINE                                                      │
│ Authoritative Economic Owner: Valuation, Lot Unit Cost, HPP, COGS      │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│ 08_BATCH_TRACEABILITY                                                  │
│ Authoritative Provenance Owner: Historical Graph Traversal (Lot ↔ Trx) │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│ 11_ANALYTICS & 12_AI_LAYER                                             │
│ Read-Model Consumer & Advisory Intelligence (Zero Mutation Authority)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Module Integration & Invariants

1. **State Mutation Invariants:**
   - **`02_INVENTORY_ENGINE`** is the sole authority for physical stock quantities, reservations, and lot states.
   - **`07_COSTING_ENGINE`** is the sole authority for lot valuations ($U_{\text{lot}}$), HPP, cost allocations, and realized COGS.
   - **`08_BATCH_TRACEABILITY`** is the sole authority for historical provenance edges.
2. **Transformation Invariant:**
   - `Transformation` is a shared domain contract defining material conversion ($N \text{ inputs} \rightarrow M \text{ outputs}$).
   - `03_ROASTING_ENGINE`, `04_BLEND_ENGINE`, and `05_PRODUCTION_ENGINE` act as execution contexts (`Batch`) that execute transformations; they do not own a private inventory model.
3. **Application Orchestration:**
   - Application use cases coordinate cross-engine workflows (e.g., executing a roast batch prompts `02_INVENTORY_ENGINE` for physical depletion/yield, `07_COSTING_ENGINE` for cost propagation, and `08_BATCH_TRACEABILITY` for provenance recording) without violating domain ownership boundaries.

---

## 6. Persistence & Ledger Principles

1. **Relational Foundation:** Canonical entities (`MaterialMaster`, `SKUMaster`, `InventoryLot`, `Batch`, `WholesaleOrder`) are persisted in relational structures with foreign-key constraints enforcing domain integrity.
2. **Append-Only Ledgers:**
   - **Append-Only Physical Inventory Ledger (`02_INVENTORY_ENGINE`):** Physical stock state changes are recorded as append-only `StockLedgerMovements` (`PURCHASE_RECEIPT`, `TRANSFORMATION_CONSUME`, `TRANSFORMATION_YIELD`, `COMMERCIAL_DISPATCH`, `RESTOCK`). Current lot balances represent the deterministic sum of movements.
   - **Append-Only Economic Cost Ledger (`07_COSTING_ENGINE`):** Economic consequences and COGS realizations are recorded as append-only `CostLedgerEntries`.
3. **Unit-Aware Storage:** Quantities are stored as pairs: `(quantity: Decimal, uom: String)` (e.g., `(10.500, 'KG')`, `(50.0, 'L')`, `(100, 'UNIT')`). Unit conversions are handled explicitly in domain services.
4. **Temporal Immutability & Auditability:**
   - Dispatched commercial transactions and completed transformations are immutable.
   - Reversals require explicit compensating entries (`RESTOCK`, `REVERSAL_MOVEMENT`).
   - Every transaction/batch records `createdAt`, `createdBy`, and associated operational context.

---

## 7. Illustrative End-to-End Vertical Execution Slice

*Note: All numerical values, prices, and quantities below are strictly illustrative and do not establish domain rules.*

```text
1. Sourcing & Receiving
   ├── 09_SUPPLIER_SYSTEM: Confirms Purchase Order for 60 kg Green Coffee.
   └── 02_INVENTORY_ENGINE: Creates InventoryLot #LOT-GRN-01 (60 kg) via PURCHASE_RECEIPT.
       └── 07_COSTING_ENGINE: Stamps unit cost U_lot = 10.00 / kg (Illustrative Total = 600.00).

2. Roasting Transformation
   ├── 03_ROASTING_ENGINE: Executes RoastBatch #RB-101 (Execution Context).
   ├── Core Transformation Contract: Executes Transformation #TR-01:
   │   ├── Consumes: 60 kg from #LOT-GRN-01 (100% depletion).
   │   └── Yields: 51 kg Roasted Coffee into #LOT-RST-01 (15% shrinkage yield).
   ├── 07_COSTING_ENGINE: Propagates cost (600.00 green + 30.00 roasting conversion CostEvent)
   │   └── Calculates U_lot for #LOT-RST-01 = 630.00 / 51 kg = 12.353 / kg.
   └── 08_BATCH_TRACEABILITY: Records edge: #LOT-GRN-01 ──(TR-01 / RB-101)──► #LOT-RST-01.

3. Packaging Transformation
   ├── 05_PRODUCTION_ENGINE: Executes PackagingBatch #PB-201 (Execution Context).
   ├── Core Transformation Contract: Executes Transformation #TR-02 (Assembly & Packaging):
   │   ├── Consumes: 50 kg Roasted Coffee from #LOT-RST-01.
   │   ├── Consumes: 200 Empty 250g Bags from #LOT-PKG-01 (0.50 / bag = 100.00).
   │   └── Yields: 200 Finished Bags (SKU-HB-250G) into #LOT-FIN-01.
   ├── 07_COSTING_ENGINE: Calculates U_lot for #LOT-FIN-01:
   │   └── (50 kg × 12.353) + 100.00 bags + 20.00 labor = 737.65 / 200 units = 3.688 / unit.
   └── 08_BATCH_TRACEABILITY: Records edge: {#LOT-RST-01, #LOT-PKG-01} ──(TR-02 / PB-201)──► #LOT-FIN-01.

4. Commercial Sale & Fulfillment (POS / Wholesale)
   ├── 06_POS_ENGINE / 10_CUSTOMER_WHOLESALE: Sells 10 bags of SKU-HB-250G at 10.00 / bag.
   ├── 02_INVENTORY_ENGINE: Executes COMMERCIAL_DISPATCH of 10 units from #LOT-FIN-01.
   ├── 07_COSTING_ENGINE: Realizes COGS = 10 units × 3.688 = 36.88.
   │   └── Gross Profit = 100.00 Revenue − 36.88 COGS = 63.12 (63.12% margin).
   └── 08_BATCH_TRACEABILITY: Links Customer Transaction ──► #LOT-FIN-01 (complete backward genealogy).
```

---

## 8. Implementation Sequence Roadmap

The technical construction proceeds strictly in sequential order:

```text
Phase 1: Technical Architecture (Current Document)
   │
   ▼
Phase 2: Logical Data Model (LDM)
   └── Entity relationship models, attribute mappings, foreign keys, cardinality.
   │
   ▼
Phase 3: Database Schema & Migrations (DDL)
   └── Relational schemas, constraints, indices, ledger check constraints.
   │
   ▼
Phase 4: Core Domain Contracts & Types
   └── Type-safe interfaces, value objects, domain entities.
   │
   ▼
Phase 5: Domain Engine Implementation
   └── Inventory ledger, Transformation coordinator, Costing engine, Traceability engine.
   │
   ▼
Phase 6: Application Layer & API Services
   └── Use cases, API endpoints, command handlers.
   │
   ▼
Phase 7: UI & Presentation Clients
   └── POS terminal, Roaster execution screen, Inventory & Wholesale management dashboards.
```

---

## 9. Boundary Classifications & Open Decisions

### 9.1 Frozen Domain Concepts (Non-Negotiable)
- Entity definitions (`MaterialMaster`, `ProductMaster`, `SKUMaster`, `InventoryLot`, `Transformation`, `Batch`, `Yield`, `CostEvent`, `Lineage`).
- Strict separation of physical material consumption (`TransformationInput`) from non-inventory conversion expenses (`CostEvent`).
- Authoritative engine ownership (Inventory owns physical stock, Costing owns valuation, Traceability owns lineage).

### 9.2 Candidate Implementation Choices (Subject to Engineering Selection)
- Storage: Relational database (e.g., PostgreSQL or equivalent SQL engine).
- Language / Runtime: Candidate type-safe backend environments (e.g., TypeScript / Node.js, Go, or Java/Kotlin).
- Communication: REST / JSON or GraphQL for API layer; in-process event dispatchers for internal decoupling.

### 9.3 Open Architectural Decisions `[OPEN]`

1. **`[OPEN-ARCH-01]` Multi-Tenancy Strategy:**
   - *Option A:* Row-level multi-tenancy with `organizationId` on all canonical tables.
   - *Option B:* Schema-per-tenant isolation.
   - *Status:* OPEN — to be formally decided during Phase 2 (Logical Data Model) based on schema complexity and isolation requirements.

---

## 10. Summary Checklist

- [x] Defined all 6 technical architecture layers.
- [x] Corrected Transformation ownership: shared domain contract instantiated by Roasting, Blend, and Production execution contexts (`Batch`).
- [x] Positioned Costing and Traceability as cross-cutting domain owners rather than downstream modules.
- [x] Adopted accurate ledger terminology ("append-only physical inventory ledger" and "append-only economic cost ledger").
- [x] Classified technology options as candidate implementation choices.
- [x] Maintained illustrative-only status for vertical slice values.
- [x] Scoped open decisions strictly to multi-tenancy strategy for Phase 2 LDM.
