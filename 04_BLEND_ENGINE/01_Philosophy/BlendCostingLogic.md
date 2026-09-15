# Blend Costing Logic

## Purpose

This document defines the costing principles and operational interface between the Blend Engine and `07_COSTING_ENGINE` inside Roastery OS.

The purpose of Blend Costing Logic is to:
- clarify the ownership boundary between Blend Engine (physical composition/yield) and Costing Engine (economic valuation),
- maintain multi-parent costing continuity across component lots,
- and standardize the emission of blend transformation events to `07_COSTING_ENGINE`.

---

# Core Philosophy & Boundary Separation

Roastery OS strictly enforces engine responsibility separation:

- **Blend Engine owns**:
  - component lot consumption quantities ($Q_{\text{in}, i}$),
  - physical recipe component percentages ($\text{ratio}_i$),
  - blended recovered output mass ($Q_{\text{out}}$),
  - physical handling loss / purge measurement ($Q_{\text{loss}}$).
- **Costing Engine (`07_COSTING_ENGINE`) owns**:
  - valuation of consumed component `InventoryLot` instances ($V_{\text{consumed}} = \sum Q_{\text{in}, i} \times U_{\text{in}, i}$),
  - direct labor/machine cost absorption ($C_{\text{direct}}$),
  - canonical output unit cost calculation ($U_{\text{out}}$),
  - assigning unit cost to the newly created blended `InventoryLot`.

Blend Engine does **not** independently calculate or mutate inventory valuations.

---

# Transformation Valuation Model

In accordance with `07_COSTING_ENGINE` Canonical Equation 1 (Transformation Output Unit Cost):

$$U_{\text{out}} = \frac{\sum_{i=1}^{n} (Q_{\text{in}, i} \times U_{\text{in}, i}) + \sum C_{\text{direct}}}{Q_{\text{out}}}$$

Where:
- $Q_{\text{in}, i}$: Mass consumed from component `InventoryLot` $i$.
- $U_{\text{in}, i}$: Current unit cost of component `InventoryLot` $i$.
- $C_{\text{direct}}$: Direct labor or machine blending costs attached via `CostEvent`.
- $Q_{\text{out}}$: Actual blended mass recovered.

### Example Transformation Valuation:
```text
Component 1: Brazil Roasted (60 kg @ $12.00/kg)     => $  720.00
Component 2: Ethiopia Roasted (40 kg @ $16.00/kg)   => $  640.00
Direct Blending Cost (CostEvent):                  => $   10.00
Total Economic Pool:                               => $1,370.00

Recovered Output Mass: 99.5 kg (0.5 kg handling loss)

Output Unit Cost:
U_out = $1,370.00 / 99.5 kg = $13.7688 / kg
```

---

## Handling Loss Absorption

Physical handling loss (0.5 kg) is absorbed into the remaining output mass ($99.5\text{ kg}$). Economic value is conserved, resulting in a slightly higher unit cost per kg for the finished blend lot.

---

## Multi-Parent Lineage & Provenance

The Costing Engine preserves the analytical decomposition (Provenance Decomposition / Equation 7) linking the blend unit cost back to each individual component lot.

```text
Input Lot 1 (Brazil, $12.00/kg) ──┐
                                  ├──> BlendBatch + CostEvents ──> Output Lot (House Blend, $13.77/kg)
Input Lot 2 (Ethiopia, $16.00/kg) ┘
```

---

## AI Boundary Philosophy

AI systems may model theoretical recipe costs to optimize retail gross margins. However, AI systems must **never** alter measured batch weights or manipulate the deterministic costing calculations performed by `07_COSTING_ENGINE`.

---

## Philosophy Summary

Blend costing is **composition-aware valuation, multi-parent economic continuity, and transformation-based valuation**. Blend production unifies multiple component valuations into a single deterministic blend lot unit cost.


