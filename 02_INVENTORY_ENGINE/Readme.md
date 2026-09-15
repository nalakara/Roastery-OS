# Inventory Engine Module

## Purpose

The Inventory Engine manages the physical inventory holding, stock movement ledger, physical state lifecycle, and material traceability across Roastery OS.

Its core responsibilities are to:
- track physical stock instances as canonical **`InventoryLot`** records referencing **`MaterialMaster`**,
- maintain an immutable transaction ledger via **`InventoryMovement`**,
- support multi-input and multi-output ($N:M$) physical conversions via the **`Transformation`** engine,
- enforce dimensional unit of measure integrity via **`UnitMaster`**,
- provide continuous genealogical lineage ($L_{\text{in}} \rightarrow T \rightarrow L_{\text{out}}$),
- and maintain live asset valuations ($U_{\text{lot}}$ and $Q \times U$) calculated by the **`Costing Engine`**.

---

# Core Philosophy: Unified InventoryLot Architecture

In Roastery OS, physical inventory is unified under the **`InventoryLot`** model. Legacy stage-specific inventory tables (`GreenBeanInventory`, `RoastedCoffeeInventory`, `BlendInventory`, `FinishedGoodsInventory`) are deprecated.

```text
InventoryLot (Physical Instance)
 ├── references → Material (MaterialMaster)
 ├── hasState → PhysicalState (RawMaterial, Intermediate, Packaged)
 ├── hasStatus → AvailabilityStatus (Available, Reserved, In-Transformation, Sold, Depleted, Archived)
 ├── hasLocation → Warehouse / Location Master
 ├── tracksQuantity → Quantity + Unit (bound to UnitMaster dimensions)
 └── carriesValuation → Live Unit Cost ($U_{\text{lot}}$) & Asset Balance ($Q \times U$)
```

---

# Module Document Directory

| Document | Purpose & Architectural Scope |
| :--- | :--- |
| **[`01_ Philosophy/InventoryPhilosophy.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/02_INVENTORY_ENGINE/01_%20Philosophy/InventoryPhilosophy.md)** | Core principles of transformation-driven inventory, material evolution, and physical vs commercial separations. |
| **[`01_ Philosophy/TraceabilityPrinciples.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/02_INVENTORY_ENGINE/01_%20Philosophy/TraceabilityPrinciples.md)** | Graph-based lineage principles ($L_{\text{in}} \rightarrow T \rightarrow L_{\text{out}}$), convergence, branching, and origin traceability. |
| **[`02_ Operational/InventoryEntityStructure.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/02_INVENTORY_ENGINE/02_%20Operational/InventoryEntityStructure.md)** | Canonical `InventoryLot` entity specification, fields, dimensional UOM binding, and fractional lot mechanics. |
| **[`02_ Operational/InventoryMovement.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/02_INVENTORY_ENGINE/02_%20Operational/InventoryMovement.md)** | Immutable ledger specification, movement types, quantity directionality, and determinism rules. |
| **[`02_ Operational/InventoryState.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/02_INVENTORY_ENGINE/02_%20Operational/InventoryState.md)** | Two-dimensional state model (`PhysicalState` $\times$ `AvailabilityStatus`), contextual commercial readiness, and state lifecycle. |
| **[`02_ Operational/InventoryTransformation.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/02_INVENTORY_ENGINE/02_%20Operational/InventoryTransformation.md)** | Integration with Transformation Contract, $N:M$ input/output lot mechanics, and yield tracking. |
| **[`02_ Operational/InventoryAdjustment.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/02_INVENTORY_ENGINE/02_%20Operational/InventoryAdjustment.md)** | Exceptional inventory corrections (damage, shrinkage, cycle counts) distinguished from process yield loss. |
| **[`02_ Operational/InventoryValuation.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/02_INVENTORY_ENGINE/02_%20Operational/InventoryValuation.md)** | Physical vs economic ownership boundary, live unit cost storage, and Costing Engine integration. |

---

# Cross-Engine Interoperability

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      MASTER DATA (01_MASTER_DATA)                      │
│   MaterialMaster  •  UnitMaster  •  SupplierMaster  •  LocationMaster   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Defines specs, UOMs, vendors)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   INVENTORY ENGINE (02_INVENTORY_ENGINE)               │
│   InventoryLot (Physical Stock)  •  InventoryMovement (Ledger)         │
└───────────────┬───────────────────────────────────────┬────────────────┘
                │                                       │
                │ (Inputs / Outputs)                    │ (Fulfillment)
                ▼                                       ▼
┌───────────────────────────────┐       ┌────────────────────────────────┐
│     TRANSFORMATION ENGINE     │       │   COMMERCIAL / POS ENGINE      │
│  (Roasting, Blending, Pack)   │       │  ProductMaster  •  SKUMaster   │
└───────────────┬───────────────┘       └────────────────────────────────┘
                │
                │ (Evaluates V_consumed + C_direct)
                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   COSTING ENGINE (07_COSTING_ENGINE)                   │
│   Calculates output unit costs ($U_{out}$) and assigns to InventoryLot  │
└────────────────────────────────────────────────────────────────────────┘
```

---

# Architectural Invariants

1. **Single Physical Entity:** `InventoryLot` is the sole entity representing physical stock on hand.
2. **Immutable Ledger:** All stock balance updates occur strictly via appended `InventoryMovement` records.
3. **Decoupled from Commercial SKUs:** Commercial `Product` and `SKU` entities define commercial catalog offers and selling prices; they are fulfilled contextually from matching `InventoryLot` instances.
4. **Strict Economic Firewall:** Inventory Engine owns physical balances ($Q_{\text{lot}}$); Costing Engine owns economic valuation ($U_{\text{lot}}$) and cost flow mathematics.


