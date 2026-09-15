# Roast Yield Logic

## Purpose

This document defines the roasting yield philosophy and operational yield behavior used across Roastery OS.

The purpose of Roast Yield Logic is to:
- preserve roasting physical transformation accuracy,
- maintain inventory mass continuity using `InventoryLot`,
- provide physical yield metrics to `07_COSTING_ENGINE`,
- provide operational production visibility,
- and standardize roasting output calculations.

Yield behavior is an inherent physical characteristic of roasting:
- losing moisture and volatile organic compounds,
- reducing total mass while preserving economic value.

---

# Core Philosophy

Roastery OS treats roasting yield as:
- physical transformation behavior,
- not inventory error, scrap, or shrinkage discrepancy.

Yield behavior remains:
- explicit and directly measured,
- traceable across lot lineages,
- deterministic,
- and operationally meaningful.

---

# Yield Mathematics & Principles

Roasting transforms raw green coffee mass into roasted coffee mass:

```text
100.0 kg Green Coffee Input (InventoryLot RAW_COFFEE)
↓ roasting execution (RoastBatch)
85.0 kg Roasted Coffee Output (InventoryLot INTERMEDIATE)
```

The mass difference represents expected physical organic transformation.

---

## Core Yield Formulas

### 1. Actual Yield Percentage
$$\text{actualYieldPercentage} = \frac{\text{actualRoastedWeightKg}}{\text{greenWeightChargedKg}} \times 100$$

### 2. Weight Loss Percentage (Shrinkage)
$$\text{weightLossPercentage} = 100 - \text{actualYieldPercentage}$$

### Example Calculation:
- **Green Charged**: 12.0 kg
- **Roasted Output**: 10.2 kg
- **Yield**: $(10.2 / 12.0) \times 100 = 85.0\%$
- **Weight Loss**: $100 - 85.0 = 15.0\%$

---

## Expected Yield & Tolerances

Profiles defined in `RoastProfileMaster` specify `expectedWeightLossPercentage` and `yieldTolerancePercentage`:
- Typical filter roasts: 12.0% – 14.5% loss (85.5% – 88.0% yield)
- Typical espresso roasts: 15.0% – 17.5% loss (82.5% – 85.0% yield)
- Out-of-tolerance yields flag an operational warning for roaster inspection (e.g., scale tare error or incorrect drop timing).

---

## Inventory & Ledger Boundary

- **Roasting Engine records**: `greenWeightChargedKg` and `actualRoastedWeightKg`.
- **Inventory Engine creates**:
  - `TRANSFORMATION_CONSUME` movement deducting $Q_{\text{in}}$ from the source `InventoryLot`.
  - `TRANSFORMATION_PRODUCE` movement adding $Q_{\text{out}}$ to the output `InventoryLot`.
- **Costing Engine (`07_COSTING_ENGINE`) calculates**: The unit cost of the output lot ($U_{\text{out}}$) absorbing the full input value across $Q_{\text{out}}$.

---

## AI Boundary Philosophy

AI systems may analyze yield variance over time to detect green bean moisture dry-out in storage or seasonal roaster airflow changes. However, AI systems must **never** alter measured output weights.

---

## Philosophy Summary

Roast yield is not inventory shrinkage or stock discrepancy. Roast yield is **operational transformation measurement, roasting intelligence, and measurable physical mass evolution**.

