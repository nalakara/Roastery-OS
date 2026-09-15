# Roast Costing Logic

## Purpose

This document defines the roasting costing principles and operational interface with `07_COSTING_ENGINE` used across Roastery OS.

The purpose of Roast Costing Logic is to:
- clarify the ownership boundary between Roasting (physical execution) and Costing (economic valuation),
- preserve transformation-aware costing continuity across roasting batches,
- support yield-adjusted inventory valuation,
- and standardize the emission of roasting transformation events to `07_COSTING_ENGINE`.

---

# Core Philosophy & Boundary Separation

Roastery OS strictly separates physical execution from economic valuation:

- **Roasting Engine owns**:
  - physical green coffee charged quantity ($Q_{\text{in}}$),
  - physical roasted coffee output quantity ($Q_{\text{out}}$),
  - physical weight loss and yield percentage measurements,
  - roasting telemetry and batch execution status.
- **Costing Engine (`07_COSTING_ENGINE`) owns**:
  - valuation of consumed green coffee inventory lots ($V_{\text{consumed}}$),
  - direct labor and machine cost absorption ($C_{\text{direct}}$),
  - canonical output unit cost calculation ($U_{\text{out}}$),
  - assigning monetary unit cost to newly created output `InventoryLot` instances.

Roasting Engine does **not** independently calculate or assign inventory unit cost. It provides physical metrics to `07_COSTING_ENGINE`.

---

# Transformation Valuation Model

Roasting transforms lower unit-cost raw green coffee into higher unit-cost intermediate roasted coffee due to mass shrinkage and direct batch costs.

In accordance with `07_COSTING_ENGINE` Canonical Equation 1 (Transformation Output Unit Cost):

$$U_{\text{out}} = \frac{\sum (Q_{\text{in}, i} \times U_{\text{in}, i}) + \sum C_{\text{direct}}}{Q_{\text{out}}}$$

Where:
- $Q_{\text{in}, i}$: Quantity consumed from input `InventoryLot` $i$ (measured by Roasting Engine).
- $U_{\text{in}, i}$: Unit cost of input `InventoryLot` $i$ (provided by Costing Engine / InventoryLot).
- $C_{\text{direct}}$: Direct batch costs (e.g. direct machine gas/power or operator labor attached via `CostEvent`).
- $Q_{\text{out}}$: Actual roasted weight output (measured by Roasting Engine).

### Example Transformation Valuation:
```text
Green Input: 100 kg @ $10.00/kg  =>  $1,000.00 (Consumed Value)
Direct Batch Cost:                   $   20.00 (CostEvent)
Total Economic Pool:                 $1,020.00
Roasted Output: 82 kg

Output Unit Cost:
U_out = $1,020.00 / 82 kg = $12.439 / kg
```

---

## Yield & Shrinkage Economic Impact

Roasting weight loss (typically 12%–20%) concentrates the consumed economic value into fewer output kilograms:
- **Higher shrinkage (darker roast)**: Higher unit cost per kg.
- **Lower shrinkage (lighter roast)**: Lower unit cost per kg.

The physical yield loss is an inherent transformation effect, not an inventory discrepancy or loss adjustment.

---

## Direct Batch Costs (`CostEvent`)

Roasting may absorb direct operational costs:
- Roaster fuel / electrical energy.
- Direct roasting operator labor.

These costs are captured as direct `CostEvent` entries associated with the `transformationId` (`roastBatchId`) and absorbed into the batch pool by `07_COSTING_ENGINE`.

---

## Traceability & Lineage Continuity

Economic valuation maintains unbroken provenance:

```text
Input InventoryLot (RAW_COFFEE) [Unit Cost: U_in]
↓ RoastBatch (Physical Loss: 18%) + CostEvents
Output InventoryLot (INTERMEDIATE Roasted) [Unit Cost: U_out]
↓ Blending / Packaging
Finished Goods InventoryLot (SKU) [Unit Cost: U_fg]
```

---

## AI Boundary Philosophy

AI systems may analyze roast batch profitability trends and identify cost variance across origins. However, AI systems must **never** autonomously alter or override the deterministic mathematical valuation calculated by `07_COSTING_ENGINE`.

---

## Philosophy Summary

Roasting costing is **transformation-aware valuation, yield-adjusted production economics, and economic continuity**. Roasting changes not only physical inventory mass, but also economic value concentration.

