# Inventory Entity Structure

## Purpose

This document defines the primary inventory entity structures used across Roastery OS.

The purpose of this structure is to:
- standardize inventory tracking around physical stock instances (`InventoryLot`),
- preserve transformation lineage and cost provenance,
- support multi-branch and multi-stage production workflows,
- maintain operational consistency across all material types,
- and enable modular inventory scalability.

Inventory entities represent operational material states within the system. They are not merely catalog lists or commercial sales SKUs.

---

# Core Philosophy

Inventory entities represent:
- physical condition,
- transformation stage,
- location and stock holding,
- and production readiness.

Roastery OS treats physical inventory as a unified entity:
```text
InventoryLot (Physical Instance)
├── references → Material (Master definition)
├── hasState → PhysicalState (RawMaterial, Intermediate, Packaged)
├── hasStatus → AvailabilityStatus (Available, Reserved, In-Transformation, Sold, Depleted, Archived)
├── hasLocation → Warehouse / Location (Master definition)
├── tracksQuantity → Quantity + Unit of Measure (bound to UnitMaster dimensions)
└── carriesValuation → Live Unit Cost ($U_{\text{lot}}$) & Total Asset Value ($Q \times U$)
```

---

# Deprecation of Hard-Coded Inventory Stage Tables

*Architectural Refinement:*
Previous iterations defined four separate physical inventory tables (`GreenBeanInventory`, `RoastedCoffeeInventory`, `BlendInventory`, `FinishedGoodsInventory`).
These separate tables have been **deprecated** in favor of the unified `InventoryLot` entity.

### Rationale:
1. **Elimination of Table Boundaries:** In craft production, material frequently crosses arbitrary stage boundaries (e.g., roasted beans ground into intermediate coffee, cold brew concentrate diluted into RTD, or packaged bags reopened for bulk blending).
2. **Contextual Commercial Readiness:** "Finished Goods" is not a physical inventory silo; it is a contextual commercial role. An `InventoryLot` whose physical state and packaging satisfy a commercial SKU's fulfillment rules can be sold directly or consumed as an input into further transformation.
3. **Uniform Lineage & Costing:** A single `InventoryLot` model allows uniform graph traversal ($L_{\text{in}} \rightarrow T \rightarrow L_{\text{out}}$) and uniform cost inheritance across all facility operations.

---

# Primary Operational Entity: InventoryLot

### Purpose
Represents an identifiable, measurable quantity of physical material held in a specific location under an active inventory state.

### Relationships
```text
InventoryLot
├── references → Material (MaterialMaster)
├── references → Warehouse / Location (Location Master)
├── references → Unit (UnitMaster - dimensionally validated)
├── createdBy → PurchaseRecord OR TransformationOutput
├── consumedBy → TransformationInput OR SalesTransaction (SKU fulfillment)
├── generates → InventoryMovement (Immutable Ledger)
└── carries → Live Asset Valuation ($U_{\text{lot}}$ derived from Costing Engine)
```

### Core Fields Specification
- `inventoryLotId`: Unique canonical identifier (UUID / string).
- `lotCode`: Human-readable batch/lot code (e.g., `LOT-GB-2026-001`, `LOT-RB-2026-042`).
- `materialId`: Reference to canonical `MaterialMaster` definition.
- `locationId`: Reference to physical location (warehouse, room, bin, silo, tank).
- `quantity`: Current measurable scalar amount ($Q \ge 0$).
- `unitId`: Standardized Unit of Measure from `UnitMaster` (`MASS`, `VOLUME`, `COUNT`).
- `physicalState`: Physical condition of the material:
  - `RawMaterial`: Unprocessed sourced stock (Green Coffee, Packaging Materials, Ingredients).
  - `Intermediate`: Processed stock held in bulk/intermediate containers (Roasted Beans, Ground Coffee, Cold Brew Concentrate).
  - `Packaged`: Portion-packed stock in commercial packaging (250g Pouches, 10g Drip Sachets, 1L Glass Bottles).
- `availabilityStatus`: Operational stock status:
  - `Available`: Ready for production transformation or sales fulfillment.
  - `Reserved`: Committed to a scheduled transformation batch or customer order.
  - `In-Transformation`: Currently being processed in an active transformation batch.
  - `Sold`: Deducted via sales transaction fulfillment.
  - `Depleted`: Zero balance reached ($Q = 0$).
  - `Archived`: Removed from active operations, preserved for permanent auditability.
- `currentUnitCost`: Live unit asset valuation ($U_{\text{lot}}$) calculated via Costing Engine Equation 1.
- `totalAssetValue`: Calculated asset balance ($Q \times U_{\text{lot}}$).
- `packagingTypeId`: Reference to `PackagingTypeMaster` (if packaged).
- `expirationDate`: Optional shelf-life timestamp.
- `notes`: Operational and quality remarks.
- `createdAt`: ISO 8601 timestamp.
- `updatedAt`: ISO 8601 timestamp.

---

# Quantity & Dimensional Unit of Measure Rules

All inventory quantities are strictly bound to **`UnitMaster.md`** dimensional categories (`MASS`, `VOLUME`, `COUNT`):
1. **Dimensional Integrity:** An `InventoryLot` with a `MASS` unit (e.g. `kg`) can only be adjusted or incremented by `MASS` units.
2. **Scalar In-Dimension Conversions:** Converting units within the same dimension (e.g. `kg` to `g`) is deterministic and preserves exact quantity ($5.0\text{ kg} = 5,000\text{ g}$).
3. **Cross-Dimension Barrier:** An `InventoryLot` cannot change dimensions (e.g. `MASS` $\rightarrow$ `VOLUME` or `MASS` $\rightarrow$ `COUNT`) without an explicit **`Transformation`** event.

---

# Fractional Lot Consumption & Multi-Branch Mechanics

Under the Transformation Contract, a single `InventoryLot` may participate fractionally in multiple independent downstream transformations and commercial fulfillment events over time:

```text
                                [ Shared Intermediate Lot #RB-001 ]
                                 Total: 850 g Roasted Coffee @ Initial Unit Valuation
                                                │
       ┌────────────────────────┬───────────────┴───────────────┬────────────────────────┐
       ▼                        ▼                               ▼                        ▼
[Branch 1: Wholesale]   [Branch 2: Grinding]            [Branch 3: Drip Bags]    [Branch 4: Cold Brew]
Deducts: 200 g          Deducts: 200 g                  Deducts: 150 g           Deducts: 300 g
Status: Sold            Creates Ground Lot              Creates 15x Sachets      Creates 2.5 L Extract
```

### Fractional Consumption Rules
1. **Physical Quantity Deduction:** When a transformation consumes a quantity $\Delta Q$ from an `InventoryLot` ($Q_{\text{initial}}$), the remaining physical quantity remains associated with the original lot identity and location:
   $$Q_{\text{remaining}} = Q_{\text{initial}} - \Delta Q$$
2. **Economic Value Attribution:** The corresponding economic value remains attributable to the unconsumed inventory according to the Costing Engine valuation rules. The system preserves complete historical transaction records so that Cost Flow can deterministically determine consumed vs. remaining asset balances.
3. **Multi-Branch Independence:** Downstream branches operate completely independently. A change in yield or packaging cost in Branch 3 (Drip Bags) does NOT retroactively alter the valuation or status of Branch 4 (Cold Brew) or the remaining intermediate stock.
4. **Lot Depletion:** When $Q_{\text{remaining}} = 0$, the lot status transitions to `Depleted`. Its complete historical ledger movements, cost provenance, and child lineage links remain permanently archived and auditable.

---

# Operational Material Categories Under Unified InventoryLot

Under the unified `InventoryLot` model, different material types behave according to domain rules while sharing the same underlying inventory engine:

### 1. Raw Coffee Materials (Green Coffee)
- Represents physical green coffee before roasting (`Material.category == RAW_COFFEE`).
- Acts as input to roasting transformations. Sourced via `PurchaseRecord`.

### 2. Roasted & Blended Coffee (Intermediate Stock)
- Represents roasted single-origin or blended whole bean stock (`Material.category == INTERMEDIATE` or `DERIVATIVE`).
- Held in intermediate containers (bins, silos, tubs).
- May be sold directly in bulk, packaged for retail, ground, or extracted.

### 3. Derivative & Liquid Materials (Intermediate Stock)
- Represents ground coffee, cold brew concentrate, extracts, or botanical infusions.
- Held in liquid tanks, kegs, or intermediate bins.
- May be portioned, diluted, bottled, or combined into composite products.

### 4. Packaged Goods (Commercially Ready Stock)
- Represents portioned, labeled stock satisfying commercial `SKU` requirements.
- Available for direct POS checkout, wholesale order fulfillment, or kitting into composite gift sets.

### 5. Packaging & Auxiliary Materials
- Represents physical bags, bottles, caps, filter sachets, and outer boxes (`Material.category == PACKAGING_MATERIAL`).
- Consumed as auxiliary `TransformationInputs` during packaging and bottling operations.

---

# Shared Inventory Principles

1. **Deterministic Ledger Updates:** Quantity is modified strictly through immutable `InventoryMovement` records.
2. **State vs. Quantity Separation:** Quantity describes *how much*; Physical State describes *what physical form it has*; Availability Status describes *how it may currently be used*.
3. **Contextual Readiness:** An inventory lot is sellable if its physical state and packaging match a commercial SKU. It does not require relocation to a separate "Finished Goods" table.
4. **Lineage Preservation:** Every `InventoryLot` maintains an unbroken link back to its generating transformation output or supplier purchase record.
5. **Separation of Economic and Physical Ownership:** Inventory Engine owns physical quantities ($Q_{\text{lot}}$), movements, and states. Costing Engine owns unit valuation ($U_{\text{lot}}$) and cost flow calculations.


