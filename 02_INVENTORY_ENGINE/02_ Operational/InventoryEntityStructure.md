# Inventory Entity Structure

## Purpose

This document defines the primary inventory entity structures used across Roastery OS.

The purpose of this structure is to:
- standardize inventory states,
- preserve transformation traceability,
- support production workflows,
- maintain operational consistency,
- and enable modular inventory scalability.

Inventory entities represent operational material states within the system.

They are not merely product lists.

---

# Core Philosophy

Inventory entities should represent:
- operational condition,
- transformation stage,
- and production readiness.

Different inventory entities may:
- behave differently,
- follow different workflows,
- and require different operational logic.

The architecture should support inventory evolution without redesigning the operational foundation.

---

# Inventory Entity Structure

## Purpose

This document defines the primary inventory entity structures used across Roastery OS.

The purpose of this structure is to:
- standardize inventory tracking around physical stock instances (`InventoryLot`),
- preserve transformation lineage and cost provenance,
- support multi-branch and multi-stage production workflows,
- maintain operational consistency across all material types,
- and enable modular inventory scalability.

Inventory entities represent operational material states within the system.

They are not merely catalog lists or sales SKUs.

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
├── hasState → PhysicalState (Raw Material, Intermediate, Packaged / Commercially Ready)
├── hasStatus → AvailabilityStatus (Available, Reserved, In-Transformation, Sold, Depleted)
├── hasLocation → Warehouse / Bin / Tank Location
├── tracksQuantity → Quantity + Unit of Measure
└── carriesValuation → Current Unit Cost & Total Asset Value
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
├── references → Material (Master Data)
├── references → Warehouse / Location (Master Data)
├── createdBy → PurchaseRecord OR TransformationOutput
├── consumedBy → TransformationInput OR SalesTransaction
├── generates → InventoryMovement (Ledger)
└── carries → Live Asset Valuation & Cost Provenance Link
```

### Core Fields
- `inventoryLotId`: Unique lot identifier.
- `lotCode`: Human-readable batch/lot code (e.g., `LOT-GB-2026-001`, `LOT-RB-2026-042`).
- `materialId`: Reference to Material master definition.
- `locationId`: Reference to physical location (warehouse, room, bin, silo, tank).
- `quantity`: Current measurable scalar amount.
- `unitId`: Standardized Unit of Measure (kg, g, L, ml, units, pcs).
- `physicalState`: Physical condition of the material:
  - `RawMaterial`: Unprocessed sourced stock (Green Beans, Packaging Materials, Ingredients).
  - `Intermediate`: Processed stock held in bulk/intermediate containers (Roasted Beans, Ground Coffee, Cold Brew Concentrate).
  - `Packaged`: Portion-packed stock in commercial packaging (250g Pouches, 10g Drip Sachets, 1L Glass Bottles).
- `availabilityStatus`: Operational stock status (Available, Reserved, In-Transformation, Sold, Depleted, Archived).
- `currentUnitCost`: Live unit asset valuation derived from cost provenance.
- `totalAssetValue`: Calculated asset balance ($\text{Quantity} \times \text{CurrentUnitCost}$).
- `packagingTypeId`: Reference to PackagingType master (if packaged).
- `expirationDate`: Optional shelf-life timestamp.
- `notes`: Operational and quality remarks.
- `createdAt`, `updatedAt`

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
2. **Economic Value Attribution:** The corresponding economic value remains attributable to the unconsumed inventory according to the active costing policy (e.g., Moving Weighted Average, Lot Specificity, FIFO). The system preserves complete historical transaction records so that Cost Flow can deterministically determine consumed vs. remaining asset balances.
3. **Multi-Branch Independence:** Downstream branches operate completely independently. A change in yield or packaging cost in Branch 3 (Drip Bags) does NOT retroactively alter the valuation or status of Branch 4 (Cold Brew) or the remaining intermediate stock.
4. **Lot Depletion:** When $Q_{\text{remaining}} = 0$, the lot status transitions to `Depleted`. Its complete historical ledger movements, cost provenance, and child lineage links remain permanently archived and auditable.

---

# Operational Inventory Categories

Under the unified `InventoryLot` model, different material types behave according to domain rules while sharing the same underlying inventory engine:

### 1. Raw Coffee Materials (Green Coffee)
- Represents physical green coffee before roasting.
- Acts as input to roasting transformations.
- Sourced via `PurchaseRecord`.

### 2. Roasted & Blended Coffee (Intermediate Stock)
- Represents roasted single-origin or blended whole bean stock.
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
- Represents physical bags, bottles, caps, filter sachets, and outer boxes.
- Consumed as auxiliary `TransformationInputs` during packaging and bottling operations.

---

# Shared Inventory Principles

1. **Deterministic Ledger Updates:** Quantity is modified strictly through immutable `InventoryMovement` records.
2. **State vs. Quantity Separation:** Quantity describes *how much*; Physical State describes *what physical form it has*; Availability Status describes *how it may currently be used*.
3. **Contextual Readiness:** An inventory lot is sellable if its physical state and packaging match a commercial SKU. It does not require relocation to a separate "Finished Goods" table.
4. **Lineage Preservation:** Every `InventoryLot` maintains an unbroken link back to its generating transformation output or supplier purchase record.

Inventory Status Structure
Inventory entities may support operational status references.
Examples:
Available
Reserved
In Production
Sold
Expired
Archived
The MVP should keep inventory status logic lightweight and operationally understandable.

Quantity and Unit Principle
All inventory quantities should reference standardized Unit structures.
Example:
quantity
+
unitId
This preserves:
	•	inventory consistency,
	•	production compatibility,
	•	and costing accuracy.
Unit conversions should remain explicit and traceable.

Costing Relationship Principle
Each inventory entity may preserve:
	•	valuation state,
	•	transformation cost,
	•	and operational costing history.
Costing behavior should remain:
	•	deterministic,
	•	traceable,
	•	and auditable.

Traceability Relationship Principle
All inventory entities should preserve operational lineage.
Example:
GreenBeanInventory
↓ RoastBatch
RoastedCoffeeInventory
↓ ProductionBatch
FinishedGoodsInventory
↓ SalesTransaction
Customer
Traceability should remain operationally readable.

MVP Scope
The MVP Inventory Entity Structure should prioritize:
	•	operational clarity,
	•	transformation visibility,
	•	simple inventory relationships,
	•	and traceable inventory workflows.
The MVP intentionally excludes:
	•	advanced warehouse routing,
	•	industrial inventory orchestration,
	•	and enterprise logistics complexity.

Architectural Notes
Inventory entities are among the most foundational operational structures within Roastery OS.
Most modules will:
	•	consume inventory,
	•	transform inventory,
	•	create inventory,
	•	or analyze inventory behavior.
Inventory structures should remain:
	•	modular,
	•	traceable,
	•	deterministic,
	•	and operationally meaningful.
Future systems should extend inventory entities without redesigning the operational foundation.

Long-Term Direction
The Inventory Entity Structure is designed to support future evolution toward:
	•	advanced production orchestration,
	•	warehouse systems,
	•	AI-assisted inventory analytics,
	•	forecasting infrastructure,
	•	and ecosystem-wide operational intelligence.
However, inventory entities should always remain:
	•	understandable,
	•	transformation-oriented,
	•	traceable,
	•	and production-first.

