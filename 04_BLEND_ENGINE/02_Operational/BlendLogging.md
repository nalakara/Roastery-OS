# Blend Logging

## Purpose

This document defines the blend logging philosophy and operational logging behavior used inside the Blend Engine of Roastery OS.

The purpose of Blend Logging is to:
- preserve blend production history,
- maintain operational visibility of multi-component weighing and mixing,
- support composition continuity across recipe versions,
- provide readable production records,
- and create long-term production intelligence infrastructure.

Blend logging acts as operational memory, composition history preservation, and transformation storytelling infrastructure.

---

# Core Philosophy

Roastery OS treats blend logging as:
- operational history preservation,
- production visibility infrastructure,
- and multi-input transformation documentation.

---

# Logging Philosophy

Every meaningful blend activity leaves:
- operational visibility,
- composition context (target ratios vs actual scale weights),
- and traceable production history.

```text
Input InventoryLots (Lot A + Lot B)
↓ BlendBatch (with Blend Logging)
Output InventoryLot (Blended Material)
```

---

## Core Logging Categories

Roastery OS recognizes several blend logging categories:
1. **Operational Logs**: Batch scheduling, start time, mix duration, operator ID, blender machine ID.
2. **Composition & Scale Logs**: For each component: target percentage, target mass (kg), actual weighed mass (kg), variance (kg and %).
3. **Yield Logs**: Total input mass charged (kg), blended output mass recovered (kg), handling loss (kg and %).
4. **Sensory & QC Logs**: Blend cupping evaluation, aroma balance, visual roast uniformity in the blend.
5. **Inventory Movement Logs**: `TRANSFORMATION_CONSUME` for each component `InventoryLot` and `TRANSFORMATION_PRODUCE` for the output `InventoryLot`.
6. **Cost Event Logs**: Direct labor and machine absorption events published to `07_COSTING_ENGINE`.

---

## Deterministic vs Observational Logging

- **Deterministic Logs**: Scale weights, lot IDs, loss quantities, and ledger movement references (immutable).
- **Observational Logs**: Roaster sensory notes, cupping feedback, and mechanical notes (e.g. ribbon blender speed or drum agitation).

---

## AI Boundary Philosophy

AI systems may summarize blend production histories, calculate seasonal component drift, and analyze yield trends. However, AI systems must **never** modify recorded scale weights or alter deterministic batch logs.

---

## Philosophy Summary

Blend logging is **composition history preservation, operational storytelling, and transformation memory infrastructure**. Blend logging preserves exactly how blend production operationally happened inside Roastery OS.


