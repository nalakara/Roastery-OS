# Roasting Philosophy

## Purpose

This document defines the foundational roasting philosophy used across Roastery OS.

The purpose of this philosophy is to establish:
- how roasting is interpreted operationally,
- how roasting behaves as a canonical `Transformation` workflow using `InventoryLot` and `MaterialMaster`,
- how roasting preserves production traceability,
- and how roasting interfaces with `07_COSTING_ENGINE` for unit cost valuation.

Roasting is one of the central operational transformation systems inside Roastery OS.

---

# Core Philosophy

Roastery OS treats roasting as:
- inventory transformation,
- physical production evolution,
- and roasted intermediate lot generation.

Roasting is not merely:
- heat application,
- roast logging,
- or arbitrary inventory reduction.

Roasting creates:
- a new physical state and material definition,
- a new operational identity (`InventoryLot`),
- new economic unit cost structures (calculated by `07_COSTING_ENGINE`),
- and comprehensive traceability lineage.

---

# Transformation Philosophy

Traditional inventory systems often interpret roasting as simple stock decrement. Roastery OS treats roasting as a formal Transformation:

```text
Input InventoryLot (RAW_COFFEE Material)
↓ RoastBatch (Transformation Execution)
Output InventoryLot (INTERMEDIATE Roasted Material)
```

Roasting transforms raw agricultural inventory into production-ready intermediate inventory.

---

## Roasting as Inventory Evolution

Roasting represents the primary physical transformation stage:
- Consumes green coffee lots (`category: RAW_COFFEE`).
- Produces roasted coffee intermediate lots (`category: INTERMEDIATE`).
- Emits immutable `InventoryMovement` entries (`TRANSFORMATION_CONSUME` / `TRANSFORMATION_PRODUCE`).
- Maintains complete parent-to-child lineage.

---

## Roast Batch Philosophy

Roasting workflows remain batch-oriented:
- Every execution creates a `RoastBatch` identity (e.g. `RB-20260520-001`).
- Captures charge weight, roasted output weight, and roasting telemetry (RoR, First Crack, Drop Temp, DTR%).
- Binds to a process template (`RoastProfileMaster`).

---

## Yield Awareness Philosophy

Yield behavior is an inherent physical characteristic:
- Green coffee loses moisture (typically 12%–20%).
- Mass shrinks, but economic value is preserved and concentrated.
- Weight loss is recorded as an expected transformation outcome, not inventory shrinkage.

---

## Costing Transformation Boundary

- **Roasting Engine owns**: Physical process execution, input mass charged, output mass yielded, and process telemetry.
- **Costing Engine (`07_COSTING_ENGINE`) owns**: Consumed inventory valuation, direct batch cost absorption, and calculating the output unit cost:
  $$U_{\text{out}} = \frac{V_{\text{consumed}} + C_{\text{direct}}}{Q_{\text{out}}}$$

---

## Traceability Philosophy

Roasting preserves unbroken operational provenance:
```text
Agricultural Green Lot → Purchase Order Receipt → Input Lot (RAW_COFFEE) → RoastBatch → Output Lot (INTERMEDIATE) → Packaging / Blending → Finished Goods (SKU)
```

---

## AI Boundary Philosophy

AI systems may analyze roast profile curves, suggest rate-of-rise adjustments, or detect profile anomalies. However, AI systems must **never** autonomously alter deterministic inventory movements or batch execution records.

---

## Philosophy Summary

Roasting is not stock reduction or simple logging. Roasting is **inventory transformation, physical production evolution, and roasted identity generation**. Roasting is where raw coffee operationally evolves into a production-ready intermediate product inside Roastery OS.

