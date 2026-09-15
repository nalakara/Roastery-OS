
# Blend Engine

## Purpose

The Blend Engine defines the operational systems responsible for:
- blend formulation and recipe definitions,
- blend production execution (`Transformation`),
- physical inventory consumption and production (`InventoryLot`),
- costing interface via `07_COSTING_ENGINE`,
- and multi-parent blend traceability
inside Roastery OS.

This module treats blending as:
- recipe-based physical material transformation ($N \to M$ / $N \to 1$),
- not simple commercial product grouping.

Blend Engine preserves:
- composition ratio visibility,
- multi-parent DAG production lineage,
- deterministic mass yield measurement,
- and reliable production workflows.

---

# Core Philosophy

Blend production creates:
- new physical inventory identity (`InventoryLot`),
- new operational lineage (multi-parent DAG node),
- and measurable physical production output
from multiple roasted coffee / intermediate inventory lots.

The system treats blend production as:
- operational material transformation,
- not merely commercial SKU labeling.

---

# Included Documents

### Philosophy & Architecture
- [BlendPhilosophy.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/04_BLEND_ENGINE/01_Philosophy/BlendPhilosophy.md) — Core blending transformation philosophy and identity.
- [BlendCostingLogic.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/04_BLEND_ENGINE/01_Philosophy/BlendCostingLogic.md) — Costing engine interface, boundary separation, and Canonical Equations 1 & 7.
- [BlendYieldLogic.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/04_BLEND_ENGINE/01_Philosophy/BlendYieldLogic.md) — Physical mass balance, handling loss, and purge math.
- [BlendTraceability.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/04_BLEND_ENGINE/01_Philosophy/BlendTraceability.md) — Multi-parent Directed Acyclic Graph (DAG) lineage model.
- [MVPBoundaries.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/04_BLEND_ENGINE/01_Philosophy/MVPBoundaries.md) — MVP feature scope and boundaries.

### Operational Specifications
- [BlendRecipeStructure.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/04_BLEND_ENGINE/02_Operational/BlendRecipeStructure.md) — Material composition ratios and recipe data schema.
- [BlendBatchWorkflow.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/04_BLEND_ENGINE/02_Operational/BlendBatchWorkflow.md) — Step-by-step transformation execution workflow.
- [BlendInventoryTransformation.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/04_BLEND_ENGINE/02_Operational/BlendInventoryTransformation.md) — InventoryLot consumption, production, and ledger movement rules.
- [BlendStatus.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/04_BLEND_ENGINE/02_Operational/BlendStatus.md) — Batch lifecycle state machine.
- [BlendLogging.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/04_BLEND_ENGINE/02_Operational/BlendLogging.md) — Scale weight logs, component execution logs, and mixing notes.

---

# Module Relationships

Blend Engine interacts with:
- **`01_MASTER_DATA`**: References `MaterialMaster` (component materials and target blend material) and `UnitMaster`.
- **`02_INVENTORY_ENGINE`**: Consumes source `InventoryLot` instances via `TRANSFORMATION_CONSUME` and creates output `InventoryLot` instances via `TRANSFORMATION_PRODUCE`.
- **`03_ROASTING_ENGINE`**: Consumes intermediate roasted coffee lots produced by roasting.
- **`07_COSTING_ENGINE`**: Supplies physical consumption ($Q_{\text{consumed}, i}$) and output ($Q_{\text{out}}$) quantities; delegates all economic valuation to Canonical Equations 1 & 7.

---

# Operational Role

Blend Engine executes physical transformation:

```text
Source InventoryLots (Consumed)
  ├── InventoryLot 1 (Roasted Coffee A)
  └── InventoryLot 2 (Roasted Coffee B)
       ↓ BlendBatch (Transformation)
Output InventoryLot (Produced)
  └── InventoryLot 3 (Espresso Blend, INTERMEDIATE / DERIVATIVE)
```

### Architectural Notes
Blend Engine is one of the major transformation layers inside Roastery OS.
This module remains:
- modular,
- deterministic,
- traceable,
- and production-oriented.

