# Inventory Transformation

## Purpose

This document defines the inventory transformation model used across Roastery OS.

The purpose of Inventory Transformation is to:
- represent physical material conversions as deterministic state transitions,
- support $N:M$ multi-input and multi-output `InventoryLot` transformations,
- preserve complete genealogical lineage ($L_{\text{in}} \rightarrow T \rightarrow L_{\text{out}}$),
- support yield-aware mass and volume balance tracking,
- and maintain continuous cost flow provenance across all roastery processes.

Inventory transformation is governed by the frozen **Transformation Contract**.

---

# Core Philosophy: Generic N:M Material Transformation

Traditional inventory systems model production as stage-gated movements between rigid table silos. Roastery OS models all production activities under a unified, generic transformation paradigm:

```text
[ Input InventoryLot(s) ] ──► [ Transformation Process ] ──► [ Output InventoryLot(s) ]
```

### Cardinality Configurations Supported:
- **$1 \rightarrow 1$**: Single-origin roast run (Green Coffee Lot $\rightarrow$ Roasted Coffee Lot).
- **$1 \rightarrow N$**: Multi-profile splitting or portion bagging (Roasted Bulk Lot $\rightarrow$ Retail Bags + Bulk Wholesale Containers).
- **$N \rightarrow 1$**: Pre-roast or post-roast blending (Brazil Lot + Ethiopia Lot $\rightarrow$ Blend Lot).
- **$N \rightarrow M$**: Complex multi-product runs with co-products or byproduct recovery (Roasted Coffee Lot + Water + Nitrogen $\rightarrow$ Packaged Nitro Cold Brew Cans + Bottled Concentrate + Spent Grounds Lot).

---

# Transformation Execution Mechanics

When a `Transformation` executes:
1. **Input Depletion:** Specified quantities ($\Delta Q_{\text{in}}$) are deducted from input `InventoryLot` instances via `InventoryMovement` records (`Type: TRANSFORMATION_CONSUMPTION`).
2. **Process Execution:** Physical parameters (roast curve, brew temperature, blend ratios, labor time) are recorded.
3. **Output Creation:** New `InventoryLot` instances are created with measured output quantities ($Q_{\text{out}}$) via `InventoryMovement` records (`Type: TRANSFORMATION_OUTPUT`).
4. **Economic Valuation:** The Costing Engine pools consumed input values ($V_{\text{consumed}} = \sum \Delta Q_{\text{in}} \times U_{\text{in}}$) plus direct capitalized `CostEvent` expenses ($C_{\text{direct}}$), and assigns economic unit costs ($U_{\text{out}}$) to output lots via Costing Equation 1.
5. **Yield Evaluation:** Physical yield ratio is calculated ($Y = Q_{\text{out}} / Q_{\text{in}}$) when input and output units share dimensional categories.

---

# Common Roastery Transformation Patterns

### 1. Roasting Transformation
- **Inputs:** `InventoryLot` (`Material.category == RAW_COFFEE`).
- **Process Template:** Guided by `RoastProfileMaster`.
- **Outputs:** `InventoryLot` (`Material.category == INTERMEDIATE`, Roasted Whole Bean).
- **Yield Behavior:** Natural moisture/mass shrinkage (e.g. $Y \approx 84\% - 87\%$). Output unit cost increases to absorb mass shrinkage.

### 2. Blending Transformation
- **Inputs:** Multiple `InventoryLot` instances of roasted whole beans or green coffee.
- **Outputs:** Single blended `InventoryLot`.
- **Yield Behavior:** $Y \approx 100\%$ (mass balance conserved).

### 3. Grinding & Portion Packaging Transformation
- **Inputs:** 
  - Roasted Whole Bean `InventoryLot` (Mass UOM: `kg`/`g`).
  - Physical Bags / Pouches `InventoryLot` (Count UOM: `ea`).
  - Degassing Valves / Labels `InventoryLot` (Count UOM: `ea`).
- **Outputs:** Packaged portion-packed `InventoryLot` (Count UOM: `ea`).
- **Commercial Context:** Output lot is commercially ready to fulfill matching `SKU` demand.

### 4. Liquid Extraction & Bottling Transformation
- **Inputs:** Ground Coffee `InventoryLot` (Mass: `kg`) + Water (Volume: `L`) + Bottles `InventoryLot` (Count: `ea`).
- **Outputs:** Bottled Cold Brew `InventoryLot` (Count: `ea`) + Optional Spent Grounds `InventoryLot`.

---

# Architectural Invariants

1. **Conservation of Material Lineage:** Every output `InventoryLot` maintains an immutable lineage reference to the originating `Transformation` and its parent input lots.
2. **Deterministic Ledger Updates:** Transformation consumption and output creation always generate linked `InventoryMovement` records.
3. **Decoupling from Commercial SKUs:** Transformations produce physical `InventoryLot` instances referencing `MaterialMaster`. Commercial sales are fulfilled from these lots contextually.
4. **Separation of Economic and Physical Ownership:** Inventory Engine owns physical lot balances and movement execution. Costing Engine owns cost pool aggregation and output unit cost calculations.

