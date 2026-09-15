# Roast Status

## Purpose

This document defines the roasting status philosophy and operational roast status behavior used across Roastery OS.

The purpose of Roast Status is to:
- represent roasting workflow progression,
- preserve operational visibility,
- support deterministic workflow transitions,
- maintain production clarity,
- and provide readable roasting lifecycle states.

Roast Status represents:
- operational roasting condition,
- workflow readiness,
- and roasting execution progression.

Roast status is one of the behavioral orchestration layers inside the Roasting Engine.

---

# Core Philosophy

Roastery OS treats Roast Status as:
- operational workflow visibility,
- production progression state,
- and deterministic roasting lifecycle behavior.

Roast status is not merely:
- UI labeling,
- or administrative categorization.

Roast status represents:
- the operational condition of a `RoastBatch` (`Transformation`),
- and its current place within the roasting workflow lifecycle.

The system preserves:
- workflow clarity,
- operational readability,
- and deterministic state transitions.

---

# Roast Status Lifecycle

Roasting workflows naturally evolve through preparation, execution, transformation, and completion stages:

```text
DRAFT / PLANNED
↓
PREPARED / SCHEDULED
↓
IN_PROGRESS
↓
COOLED / PENDING_QC
↓
COMPLETED (or REJECTED / ABORTED)
↓
ARCHIVED
```

Each status represents distinct operational meaning, inventory ledger impact, and production behavior.

---

## Core Roast Status Definitions

### 1. `PLANNED` / `DRAFT`
- **Meaning**: Roasting intent defined (green material, target profile, estimated batch size).
- **Inventory Impact**: No inventory consumed or locked; green coffee `InventoryLot` remains `AVAILABLE`.

### 2. `SCHEDULED` / `PREPARED`
- **Meaning**: Machine prepped, green coffee weighed and staged.
- **Inventory Impact**: Green coffee `InventoryLot` may be marked `ALLOCATED` to prevent double-charging.

### 3. `IN_PROGRESS`
- **Meaning**: Green coffee charged into drum; thermal roast curve actively progressing.
- **Inventory Impact**: Physical coffee is inside the roaster.

### 4. `COOLED` / `PENDING_QC`
- **Meaning**: Roasted coffee dropped into cooling tray, cooled, and weighed.
- **Inventory Impact**: Actual roasted weight recorded; physical yield calculated.

### 5. `COMPLETED`
- **Meaning**: Roasting transformation finalized and validated.
- **Inventory Impact**: Input `InventoryLot` deducted (`TRANSFORMATION_CONSUME`); output `InventoryLot` (`INTERMEDIATE`) created (`TRANSFORMATION_PRODUCE`). Event emitted to `07_COSTING_ENGINE` for unit cost assignment.

### 6. `REJECTED` / `ABORTED`
- **Meaning**: Roast terminated due to machine failure, profile defect, or severe defect.
- **Inventory Impact**: Green inventory written off or designated to scrap lot; economic loss captured via Costing Engine.

### 7. `ARCHIVED`
- **Meaning**: Historical roast record retained for sensory, profile, and traceability analysis.

---

## Status Transition Principle

Roast status transitions are deterministic and monotonic during normal execution:
```text
PLANNED → SCHEDULED → IN_PROGRESS → COOLED → COMPLETED
```

Transitions preserve operational meaning, create immutable audit trails, and maintain transformation integrity.

---

## Inventory Relationship Principle

Roast statuses dictate inventory ledger operations:
- `SCHEDULED`: `InventoryLot` quantity allocated.
- `COMPLETED`: `TRANSFORMATION_CONSUME` movement posted for input lot; `TRANSFORMATION_PRODUCE` movement posted for output lot.
- `ABORTED`: Scrap movement posted; allocated quantity released or consumed as scrap.

---

## AI Boundary Philosophy

AI systems may evaluate roast status progression to flag delays or detect machine idle times. However, AI systems must **never** autonomously alter or advance `RoastBatch` statuses.

---

## Philosophy Summary

Roast status is operational progression visibility, roasting lifecycle state, and deterministic workflow behavior. Roast status tells the system exactly where roasting physically and operationally exists within the production lifecycle.

