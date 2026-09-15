# Blend Philosophy

## Purpose

This document defines the foundational blending philosophy used across Roastery OS.

The purpose of this philosophy is to establish:
- how blending is interpreted operationally as an $N \to M$ / $N \to 1$ material transformation,
- how blends behave as production entities distinct from commercial SKUs,
- how blend transformation preserves multi-parent inventory lineage across `InventoryLot` instances,
- and how blend workflows remain deterministic, physically measurable, and traceable.

Blending is one of the core physical transformation systems inside Roastery OS.

Blend production represents:
- composition-based physical inventory transformation.

---

# Core Philosophy

Roastery OS treats blending as:
- recipe-based production,
- inventory composition engineering,
- and operational transformation.

Blending is not merely:
- mixing coffee,
- assigning commercial names,
- or creating retail products.

Blending creates:
- new physical inventory identity (`InventoryLot`),
- new operational lineage (multi-parent DAG node),
- and new physical production behavior.

The system preserves:
- blend composition ratios,
- transformation continuity,
- physical operational traceability,
- and production readability.

---

# Blending as Inventory Transformation

Traditional POS systems commonly interpret blends as:

```text
Product Label
+
Coffee Name
```

Roastery OS uses a production-oriented operational model:

```text
Input InventoryLot (Material: Roasted Coffee A, INTERMEDIATE)
+
Input InventoryLot (Material: Roasted Coffee B, INTERMEDIATE)
↓ BlendBatch (Transformation Execution)
Output InventoryLot (Material: Espresso Blend, INTERMEDIATE / DERIVATIVE)
```

Blending is treated as:
- operational transformation,
- not commercial categorization.

Blend production creates:
- a new physical `InventoryLot` with intermediate or derivative material state.

---

# Composition Philosophy

Every blend preserves:
- measurable composition structure based on `MaterialMaster` specifications.

Example:
- Brazil Natural (`MaterialMaster`) → 60%
- Ethiopia Washed (`MaterialMaster`) → 40%

Blend composition remains:
- traceable,
- reproducible,
- operationally meaningful,
- and human-readable.

The system preserves:
- source ratio continuity ($\sum \text{ratio} = 100\%$),
- and component composition visibility.

---

# BlendRecipe Philosophy

`BlendRecipe` represents:
- reusable formulation intention and physical specification template.

`BlendRecipe` is not:
- actual stock or inventory instance,
- or production execution.

`BlendRecipe` defines:
- intended material composition structure and ratios across `MaterialMaster` definitions.

Example:
- House Espresso Blend Recipe:
  - 60% Brazil Cerrado (Material)
  - 40% Ethiopia Guji (Material)

Blend recipes remain:
- reusable,
- versionable,
- flexible,
- and production-oriented.

---

# BlendBatch Philosophy

`BlendBatch` represents:
- actual blend production execution (`Transformation`).

`BlendBatch`:
- consumes source physical stock (`TRANSFORMATION_CONSUME` on source `InventoryLot` instances),
- creates transformed output stock (`TRANSFORMATION_PRODUCE` on target `InventoryLot`),
- and preserves transformation lineage.

Example:
```text
Source InventoryLots (Consumed)
↓ BlendBatch (Execution)
Target InventoryLot (Produced)
```

`BlendBatch` acts as:
- transformation event,
- production execution record,
- and operational traceability anchor.

---

# Transformed Blend Stock Philosophy

Produced blend stock represents:
- newly transformed physical stock (`InventoryLot` with state `AVAILABLE` / `DEPLETED`).

Produced blend stock acts as:
- operational inventory identity,
- production-ready inventory,
- and future workflow input.

Blend inventory may later:
- enter packaging workflows (`InventoryLot` + `PackagingTypeMaster` $\to$ Finished Goods `InventoryLot`),
- be ground/processed,
- or enter derivative production workflows.

```text
Blend InventoryLot (INTERMEDIATE)
↓ Packaging Transformation
Packaged Coffee InventoryLot (FINISHED_GOODS)
```

---

# Blend Identity vs Retail SKU Philosophy

A blend behaves as:
- an operational production entity and physical `MaterialMaster`.

```text
Blend (MaterialMaster) ≠ Retail SKU (Sales / Commercial Unit)
```

A single blend material may later produce:
- multiple packaging formats (e.g., 250g bag, 1kg bag, bulk tote),
- multiple retail SKUs,
- and multiple derivative products.

This separation preserves:
- modular architecture,
- production scalability,
- and operational flexibility.

---

# Blend Types Philosophy

The system supports flexible blend structures.

Examples:
- Espresso Blend
- House Blend
- Filter Blend
- Omni Blend
- Seasonal Blend
- Milk Blend
- Signature Blend

The architecture does not assume:
- all blends behave identically,
- or follow rigid commercial taxonomy.

Blend structures remain:
- operationally adaptable,
- and production-oriented.

---

# Production-First Philosophy

Blending prioritizes:
- physical production behavior,
- inventory ledger continuity,
- and operational transformation.

Blend workflows adapt to:
- production logic, not retail abstraction.

This philosophy differentiates Roastery OS from:
- cafe POS systems,
- generic inventory systems,
- and retail-first operational software.

---

# Costing & Economic Boundary Philosophy

Blend production alters inventory valuation, but economic valuation is governed strictly by the Costing Engine (`07_COSTING_ENGINE`).

Blend Engine owns:
- physical recipe formulation,
- physical lot consumption quantities ($Q_{\text{consumed}, i}$),
- physical output quantity ($Q_{\text{out}}$),
- and physical handling loss / purge.

Costing Engine owns:
- economic valuation of consumed inputs ($V_{\text{consumed}} = \sum Q_{\text{consumed}, i} \times U_{\text{consumed}, i}$),
- aggregation of direct capitalizable costs ($C_{\text{direct}}$),
- output unit cost calculation via Canonical Equation 1 ($U_{\text{out}} = \frac{V_{\text{consumed}} + C_{\text{direct}}}{Q_{\text{out}}}$),
- and analytical provenance decomposition (Canonical Equation 7).

Blend costing preserves:
- source valuation continuity,
- ratio-weighted costing,
- and auditable economic flow.

---

# Yield & Handling Loss Philosophy

Blend production may introduce:
- operational handling loss,
- purge,
- container residue,
- and measurement shrinkage.

Example:
```text
10.0 kg Total Consumed Inputs
↓ BlendBatch
9.8 kg Produced Output Stock (0.2 kg Handling Loss / 2.0%)
```

Yield behavior remains:
- explicit and measurable,
- traceable,
- and recorded on the physical transformation record.

Handling loss affects final output unit cost strictly through the physical denominator $Q_{\text{out}}$ in Canonical Equation 1.

---

# Traceability Philosophy

Blend production preserves upstream roasting and green coffee lineage via a Directed Acyclic Graph (DAG).

Example:
```text
Green Coffee Lot A → RoastBatch A → Roasted Coffee Lot A ↘
                                                            BlendBatch → Blend Lot AB
Green Coffee Lot B → RoastBatch B → Roasted Coffee Lot B ↗
```

The system preserves:
- multi-parent roasting continuity,
- component composition visibility,
- and full production transformation history.

---

# Deterministic Blend Principle

Critical blend workflows must remain deterministic:
- physical inventory deduction (`TRANSFORMATION_CONSUME`),
- composition ratio verification ($\sum \% = 100\%$),
- output lot creation (`TRANSFORMATION_PRODUCE`),
- costing ledger alignment,
- and traceability relationships.

The system avoids:
- hidden composition mutation,
- ambiguous blend relationships,
- and disconnected production lineage.

---

# Human-Centered & Operational Simplicity Principle

Blend workflows remain understandable for real operators:
- formulation is intuitive,
- batch execution is straightforward,
- and physical behavior is clear without ERP bureaucracy.

The MVP intentionally avoids:
- industrial continuous formulation systems,
- automated robotic orchestration,
- and black-box AI optimization.

---

# AI Boundary Philosophy

AI systems may:
- recommend blend component ratios,
- analyze sensory balance,
- and support production analytics.

However:
- AI must NOT autonomously execute inventory mutations or alter deterministic recipes.
- Critical blend operations remain explicit, deterministic, and human-auditable.

---

# Philosophy Summary

Blending is not merely coffee mixing or commercial product labeling.

Blending is:
- recipe-based physical material transformation,
- operational composition engineering,
- and production identity creation.

Blending is where multiple source `InventoryLot` instances operationally evolve into a newly traceable, valued production entity inside Roastery OS.


