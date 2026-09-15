# Roasting Engine

## Purpose

The Roasting Engine defines the primary coffee transformation workflow inside Roastery OS.

This module is responsible for:
- executing `RoastBatch` instances as coffee-specific `Transformation` records,
- consuming raw green coffee inventory (`RAW_COFFEE` material category `InventoryLot`),
- producing roasted intermediate inventory (`INTERMEDIATE` material category `InventoryLot`),
- capturing roasting telemetry, process profile application (`RoastProfileMaster`), and batch observations,
- recording physical yield and weight loss measurements,
- handing off transformation metrics to `07_COSTING_ENGINE` for unit cost assignment,
- and maintaining complete forward and backward parent-child traceability.

---

# Core Architecture

Roasting is a formal transformation layer:

```text
Input InventoryLot (RAW_COFFEE Material)
↓ RoastBatch (Transformation: RoastProfileMaster, Thermal Telemetry)
Output InventoryLot (INTERMEDIATE Roasted Material)
↓ Inventory Movements (TRANSFORMATION_CONSUME / TRANSFORMATION_PRODUCE)
↓ Costing Event Emission (07_COSTING_ENGINE assigns U_out)
↓ Traceability Graph Update
```

---

# Module Specifications

### Philosophy
- [RoastingPhilosophy.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/03_ROASTING_ENGINE/01_Philosophy/RoastingPhilosophy.md): Core roasting philosophy and transformation principles.
- [RoastCostingLogic.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/03_ROASTING_ENGINE/01_Philosophy/RoastCostingLogic.md): Physical yield measurement and Costing Engine interface.
- [RoastYieldLogic.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/03_ROASTING_ENGINE/01_Philosophy/RoastYieldLogic.md): Deterministic yield and weight loss formulas.
- [RoastTraceability.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/03_ROASTING_ENGINE/01_Philosophy/RoastTraceability.md): Lineage graph linking green harvest lots to roasted intermediate lots.
- [MVPBoundaries.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/03_ROASTING_ENGINE/01_Philosophy/MVPBoundaries.md): Scope limits and MVP focus.

### Operational Specifications
- [RoastBatchStructure.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/03_ROASTING_ENGINE/02_Operational/RoastBatchStructure.md): Canonical `RoastBatch` entity schema and field definitions.
- [RoastInventoryTransformation.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/03_ROASTING_ENGINE/02_Operational/RoastInventoryTransformation.md): Inventory transformation and movement rules.
- [RoastWorkflow.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/03_ROASTING_ENGINE/02_Operational/RoastWorkflow.md): 7-stage roasting operational lifecycle.
- [RoastProfileApplication.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/03_ROASTING_ENGINE/02_Operational/RoastProfileApplication.md): Decoupling process templates (`RoastProfileMaster`) from batch executions.
- [RoastStatus.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/03_ROASTING_ENGINE/02_Operational/RoastStatus.md): Deterministic batch lifecycle progression.
- [RoastLogging.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/03_ROASTING_ENGINE/02_Operational/RoastLogging.md): Telemetry, milestones, and observational logs.

---

# Engine Boundaries

- **Inventory Engine (`02_INVENTORY_ENGINE`)**: Owns physical quantity deduction and lot creation via `InventoryMovement`.
- **Costing Engine (`07_COSTING_ENGINE`)**: Owns economic valuation, absorbing green lot costs and direct batch expenses to assign $U_{\text{out}}$.
- **Blend Engine (`04_BLEND_ENGINE`)**: Consumes roasted intermediate lots produced by Roasting Engine for multi-component blends.


