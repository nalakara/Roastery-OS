# Roast Profile Application

## Purpose

This document defines the roast profile application philosophy and operational roast profile behavior used across Roastery OS.

The purpose of Roast Profile Application is to:
- standardize roasting intention,
- support production consistency as a `ProcessTemplate` / `TransformationTemplate`,
- preserve roast identity references,
- maintain roasting workflow continuity,
- and separate roasting targets from actual roasting execution.

Roast profiles represent:
- roasting intention,
- operational targeting,
- and reusable roasting references.

Roast profiles are not the roast itself.

---

# Core Philosophy

Roastery OS treats `RoastProfileMaster` as:
- reusable roasting reference and process template,
- operational roasting intention,
- and production targeting structure.

Roast profiles are not:
- actual roasting execution,
- or deterministic production outcome.

Roast profiles define:
- how roasting is intended to behave.

`RoastBatch` defines:
- how roasting actually happened.

This separation is one of the foundational architectural principles inside the Roasting Engine.

---

# Profile Application Philosophy

Roasting workflows commonly require:
- repeatable operational intention,
- roasting consistency references,
- and reusable roasting targets.

Example:
```text
Filter Roast Profile
Espresso Roast Profile
Omni Roast Profile
```

These are:
- roast intentions,
- not guaranteed roasting outcomes.

The system preserves:
- profile reusability,
- execution flexibility,
- and operational traceability.

---

## Core Relationship Principle

`RoastProfileMaster` and `RoastBatch` are separate operational entities:

```text
RoastProfileMaster (Template / Target)
↓ applied to
RoastBatch (Transformation Execution)
```

This relationship preserves:
- operational flexibility,
- production continuity,
- and future analytical capability.

---

## RoastProfile vs RoastBatch Principle

```text
RoastProfileMaster ≠ RoastBatch
```

**RoastProfileMaster** represents:
- roasting target parameters (charge temp, target drop temp, expected development time ratio, expected loss percentage),
- intended roast behavior,
- reusable roasting reference,
- and production standardization.

**RoastBatch** represents:
- actual roasting execution,
- operational transformation event,
- and real production outcome (actual loss, actual duration, actual curves).

This separation preserves analytical integrity, operational realism, and roasting flexibility.

---

## Core Roast Profile Components

A `RoastProfileMaster` defines:
- `profileName`: Human-readable identifier.
- `targetRoastLevel`: Light, Medium-Light, Medium, Medium-Dark, Dark.
- `roastIntent`: Filter, Espresso, Omni, Blend Component.
- `targetDevelopmentTimeRatio`: e.g., 14.5%–16.0%.
- `targetDropTemperatureC`: e.g., 208°C.
- `targetTotalDurationSeconds`: e.g., 630s.
- `expectedWeightLossPercentage`: e.g., 14.2%.
- `recommendedChargeTemperatureC`: e.g., 200°C.
- `recommendedBatchSizeKg`: e.g., 12.0 kg.

---

## Profile Application Workflow

Operational flow:
1. Select Green Coffee `MaterialMaster` (`RAW_COFFEE`) and input `InventoryLot`.
2. Select target `RoastProfileMaster`.
3. Create `RoastBatch` referencing `profileId`.
4. Execute roasting with profile guidance.
5. Record actual output weight and create intermediate roasted `InventoryLot`.

Roast profiles guide roasting; they do not control roasting autonomously.

---

## Roast Observation Relationship Principle

Actual roasting execution may differ from profile intention:
- **Target Development Time Ratio**: 15.0%
- **Actual Development Time Ratio**: 16.2%
- **Expected Weight Loss**: 14.0%
- **Actual Weight Loss**: 14.8%

The system preserves both intended targets and actual execution telemetry, enabling:
- roasting consistency analysis,
- production quality control,
- and profile refinement.

---

## Inventory Relationship Principle

`RoastProfileMaster` influences the resulting roasted coffee's material definition and lot metadata:

```text
Input InventoryLot (RAW_COFFEE)
↓ RoastBatch (with RoastProfileMaster)
Output InventoryLot (INTERMEDIATE Roasted Coffee)
```

Roasted inventory preserves:
- roasting intention (`profileId`),
- execution history (`roastBatchId`),
- and transformation continuity.

---

## Yield & Costing Relationship

Different roast profiles yield different physical weight losses:
- **Filter Roast**: ~12%–14% loss (higher physical yield).
- **Dark Espresso Roast**: ~16%–18% loss (lower physical yield).

Roasting Engine records the physical yield and loss percentages. Economic valuation is strictly computed by `07_COSTING_ENGINE`:
$$U_{\text{out}} = \frac{V_{\text{consumed}} + C_{\text{direct}}}{Q_{\text{out}}}$$

---

## Deterministic Workflow Principle

Critical roast profile relationships must remain deterministic:
- `RoastProfileMaster` assignment to `RoastBatch`,
- input lot consumption and output lot production,
- and immutable batch telemetry logs.

---

## AI Boundary Philosophy

AI systems may analyze profile adherence, suggest rate-of-rise adjustments, or detect profile drift across atmospheric seasons. However, AI systems must never autonomously alter frozen profile definitions or mutate active batch records without roaster approval.

---

## Philosophy Summary

Roast profiles are not roasting executions or guaranteed outcomes. Roast profiles are **roasting intentions, reusable process templates, and operational production targets**. Roast profiles define how roasting is intended to behave inside Roastery OS.


