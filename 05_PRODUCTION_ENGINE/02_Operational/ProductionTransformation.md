# Production Transformation

## Purpose

This document defines the inventory transformation behavior created by production workflows inside Roastery OS.

The purpose of Production Transformation is to:
- preserve deterministic inventory evolution across all manufacturing operations,
- maintain unbroken material lineage and cost provenance,
- support multi-stage, multi-branch, and converging production workflows,
- standardize commercial inventory formatting and packaging,
- and provide operational transformation visibility.

Production workflows convert:
- input `InventoryLot` instances,
into:
- output `InventoryLot` instances.

---

# Core Philosophy

Roastery OS treats production as:
- physical material state transformation,
- multi-dimensional yield evolution,
- and commercial inventory generation.

Production transformation creates:
- new physical inventory lots in defined states,
- newly calculated unit asset valuations based on cost provenance and measured yield via `07_COSTING_ENGINE`,
- and permanent genealogical lineage links.

---

# Transformation Philosophy

Traditional inventory systems interpret production as a rigid formula:
$$\text{Inventory} + \text{Packaging} = \text{Fixed Retail Item}$$

Roastery OS uses a generalized material state conversion model:

```text
Transformation Inputs (N InventoryLot instances)
       ↓
[ Transformation Boundary ] (Guided by Process Recipe / BOM, Executed in ProductionBatch)
       ├── Direct Added Costs (Contract Labor, Outsource Fees, Machine Capitalizable Costs)
       └── Measured Physical Yield (Mass / Volume / Unit Count Yield)
       ↓
Transformation Outputs (M InventoryLot instances)
```

### Supported Production Transformation Archetypes
1. **Mechanical Conversion (Grinding / Milling):** Whole roasted beans converted into ground coffee (Intra-dimensional Mass Yield, recording retention loss).
2. **Phase / Liquid Extraction (Brewing / Concentration):** Ground coffee + water converted into liquid extract (Cross-dimensional Mass $\rightarrow$ Volume Yield, recording liquid absorption loss).
3. **Discrete Portioning (Drip Bags / Sachets):** Ground coffee packed into individual filter sachets (Mass $\rightarrow$ Discrete Unit Count).
4. **Formulation & Bottling (RTD / Syrups):** Cold brew liquid + auxiliary ingredients filled into glass bottles / cans (Volume $\rightarrow$ Discrete Bottled Units).
5. **Discrete Assembly & Kitting (Gift Sets / Variety Packs):** Multiple distinct packaged lots assembled into an outer presentation pack (Count + Count $\rightarrow$ Packaged Unit).
6. **Decanting / Repurposing (Rework):** Opening packaged goods to redirect coffee into bulk extraction (Packaged $\rightarrow$ Intermediate).

---

# Input and Output Inventory Dynamics

### Input Inventory Dynamics
- Consumes physical quantities from one or more existing `InventoryLot` instances (`TRANSFORMATION_CONSUME`).
- Deductions are recorded on the immutable `InventoryMovement` ledger.
- Carries historical cost provenance forward into the transformation event.

### Output Inventory Dynamics
- Creates one or more new `InventoryLot` instances via `TRANSFORMATION_PRODUCE` (or augments existing intermediate holdings).
- Costing Engine allocates accumulated input costs and direct conversion costs across output lots via Canonical Equation 1.
- Generates immutable parent-child lineage connections.
- Output lots are immediately available for downstream transformations, wholesale distribution, e-commerce, or retail POS fulfillment.

---

# Derivative Product Principle

Production workflows create derivative commercial products across diverse physical formats:
- Whole Bean Coffee (`INTERMEDIATE` or `FINISHED_GOODS`)
- Ground Coffee (`DERIVATIVE` or `FINISHED_GOODS`)
- Drip Bag Coffee (`FINISHED_GOODS`)
- Cold Brew Liquid / Concentrate (`DERIVATIVE`)
- RTD Bottled Beverages (`FINISHED_GOODS`)
- Bulk Espresso Totes (`INTERMEDIATE`)

Each derivative product represents a unique operational transformation workflow. The architecture supports workflow diversity, operational flexibility, and future extensibility without changing the underlying `InventoryLot` model.

---

# Packaging Transformation Principle

Packaging is treated as physical material transformation, not cosmetic presentation.
- Packaging items (bags, valves, tins, bottles, caps, filter sachets) are defined in `MaterialMaster` (`materialType = PACKAGING`).
- Packaging materials exist as physical stock in `InventoryLot` instances.
- During packaging execution, packaging lots are consumed via `TRANSFORMATION_CONSUME` as physical transformation inputs.
- The output lot represents the combined packaged unit.

```text
Source Coffee Lot (INTERMEDIATE) + Packaging Lot (PACKAGING)
       ↓ ProductionBatch (Packaging Transformation)
Output Coffee Lot (FINISHED_GOODS)
```

---

# Yield & Mass Balance Principle

Production workflows may introduce:
- handling loss,
- packaging scrap,
- machine retention / purge,
- brewing absorption residue.

Example:
```text
10.0 kg Roasted Coffee Lot + 40 Units Packaging Bags
       ↓ ProductionBatch
39 Units Packaged 250g Coffee Lot (9.75 kg Coffee Mass + 0.25 kg Purge/Loss)
```

Yield behavior remains:
- explicit and physically measured,
- traceable on the batch record,
- and transparently reflected in the output quantity ($Q_{\text{out}}$).

---

# Inventory State Transitions

Production transformation coordinates explicit state transitions on the `InventoryMovement` ledger:
1. Source `InventoryLot` instances transition quantity via `TRANSFORMATION_CONSUME` (state updates to `DEPLETED` when quantity reaches 0).
2. Output `InventoryLot` instances are instantiated via `TRANSFORMATION_PRODUCE` in state `AVAILABLE`.
3. All ledger postings are atomic, non-destructive, and auditable.

---

# Costing Engine Relationship Principle

Production transformation alters physical asset valuation, but valuation arithmetic is owned exclusively by `07_COSTING_ENGINE`.

Production Engine owns:
- physical recipe formulation and consumption quantities ($Q_{\text{consumed}, i}$),
- physical output quantity and packaging counts ($Q_{\text{out}}$),
- and physical handling loss / scrap measurements.

Costing Engine owns:
- input valuation aggregation ($V_{\text{consumed}} = \sum Q_{\text{consumed}, i} \times U_{\text{consumed}, i}$),
- direct cost capitalization ($C_{\text{direct}}$),
- unit cost derivation via Canonical Equation 1 ($U_{\text{out}} = \frac{V_{\text{consumed}} + C_{\text{direct}}}{Q_{\text{out}}}$),
- and provenance decomposition via Canonical Equation 7.

---

# Multi-Parent Traceability (DAG)

Production transformation creates explicit lineage links connecting all consumed parent lots to all produced child lots:

```text
Green Coffee Lot A ──► RoastBatch A ──► Roasted Coffee Lot A ──┐
                                                               ├──► BlendBatch ──► Blend Lot AB ──┐
Green Coffee Lot B ──► RoastBatch B ──► Roasted Coffee Lot B ──┘                                 │
                                                                                                 ├──► ProductionBatch ──► Packaged SKU Lot
Bag Packaging Lot C ─────────────────────────────────────────────────────────────────────────────┘
```

The system preserves full end-to-end traceability from farm origin and green sourcing to customer retail fulfillment.

---

# Summary

Production transformation is:
- operational manufacturing evolution,
- multi-dimensional physical material conversion,
- and commercial inventory creation.

Production transformation defines how coffee and packaging materials physically evolve into commercially sellable `InventoryLot` instances inside Roastery OS.

