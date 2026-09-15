# Roast Logging

## Purpose

This document defines the roasting logging philosophy and operational roast logging behavior used across Roastery OS.

The purpose of Roast Logging is to:
- preserve roasting history,
- maintain operational visibility of batch thermal execution and sensory observations,
- support production continuity,
- provide readable roasting records,
- and create long-term roasting intelligence infrastructure.

Roast logging acts as operational memory, production documentation, and roasting history preservation.

---

# Core Philosophy

Roastery OS treats roast logging as:
- operational history preservation,
- roasting execution visibility,
- and production intelligence infrastructure.

Roast logging represents:
- observable roasting behavior and telemetry,
- operational roasting context,
- and physical transformation documentation.

---

# Logging Philosophy

Every meaningful roasting activity leaves:
- operational visibility,
- roasting context (thermal curves, phase milestones, ambient conditions),
- and traceable execution history.

```text
Input InventoryLot (RAW_COFFEE)
↓ RoastBatch (with Roast Logging)
Output InventoryLot (INTERMEDIATE Roasted)
```

---

## Core Logging Categories

Roastery OS recognizes several roasting log categories:
1. **Operational Logs**: Batch scheduling, start time, drop time, cooling duration, operator ID.
2. **Roast Telemetry & Curve Logs**: Charge temp, Turning Point, Yellowing milestone, First Crack (time/temp), Development Time Ratio (DTR%), Drop temp, Rate of Rise (RoR) progression.
3. **Yield Logs**: Green charged weight (kg), Roasted output weight (kg), actual yield %, weight loss %.
4. **Sensory & QC Logs**: Ground/whole bean Agtron color values, defect notes, cupping evaluation scores.
5. **Inventory Movement Logs**: `TRANSFORMATION_CONSUME` (source lot) and `TRANSFORMATION_PRODUCE` (output lot).
6. **Cost Event Logs**: Direct labor and machine absorption events published to `07_COSTING_ENGINE`.

---

## Roast Observation Philosophy

Roast observations represent human operational insight and execution context:
- First crack sound intensity and vigor.
- Smoke/aroma transition markers during Maillard and development phases.
- Visual roast color uniformity in the cooling tray.
- Environmental variables (ambient room temperature and relative humidity).

---

## Deterministic vs Observational Logging

The system separates:
- **Deterministic Transformation Logs**: Consumed `InventoryLot`, produced `InventoryLot`, measured weights, and ledger movements (immutable and strictly auditable).
- **Observational Logs**: Roaster qualitative notes, cupping impressions, and sensory descriptors.

---

## AI Boundary Philosophy

AI systems may summarize roasting batch histories, analyze rate-of-rise trends, and detect anomalies across batches. However, AI systems must **never** autonomously alter or rewrite deterministic batch logs.

---

## Philosophy Summary

Roast logging is not merely data storage. Roast logging is **roasting memory, operational storytelling, and production history preservation**. Roast logging preserves exactly how roasting physically and operationally happened inside Roastery OS.


