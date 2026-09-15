# Blend Status

## Purpose

This document defines the operational blend status philosophy and lifecycle behavior used inside the Blend Engine of Roastery OS.

The purpose of Blend Status is to:
- represent blend production progression as a canonical `Transformation`,
- preserve workflow visibility,
- support deterministic lifecycle transitions,
- maintain operational clarity,
- and provide readable production state behavior.

`BlendStatus` represents:
- the operational condition of a `BlendBatch`,
- and its current position within the production lifecycle.

---

# Core Philosophy

Roastery OS treats Blend Status as:
- operational workflow visibility,
- production lifecycle behavior,
- and deterministic transformation state management.

Blend status is not merely UI labeling; it represents physical inventory readiness, batch progression, and ledger execution milestones.

---

# Blend Status Lifecycle

Blend production progresses through explicit operational states:

```text
DRAFT / PLANNED
↓
PREPARED / SCHEDULED
↓
IN_PROGRESS (Weighing & Mixing)
↓
BLENDED / PENDING_QC
↓
COMPLETED (or CANCELLED / ABORTED)
↓
ARCHIVED
```

---

## Core Blend Status Definitions

### 1. `PLANNED` / `DRAFT`
- **Meaning**: Blend production intent defined (`recipeId`, target total output weight).
- **Inventory Impact**: No inventory locked or deducted; component `InventoryLot` instances remain `AVAILABLE`.

### 2. `SCHEDULED` / `PREPARED`
- **Meaning**: Specific component `InventoryLot` instances selected and staged at the blending station.
- **Inventory Impact**: Component `InventoryLot` quantities may be marked `ALLOCATED`.

### 3. `IN_PROGRESS`
- **Meaning**: Component lots actively being weighed out and fed into the blending mixer/drum.
- **Inventory Impact**: Physical components undergoing homogenization.

### 4. `BLENDED` / `PENDING_QC`
- **Meaning**: Blending completed; recovered output weight measured and recorded.
- **Inventory Impact**: Handling loss calculated ($Q_{\text{loss}} = \sum Q_{\text{in}} - Q_{\text{out}}$).

### 5. `COMPLETED`
- **Meaning**: Transformation finalized and validated.
- **Inventory Impact**:
  - `TRANSFORMATION_CONSUME` movements posted for all input `InventoryLot` instances.
  - `TRANSFORMATION_PRODUCE` movement posted for output blended `InventoryLot` (`INTERMEDIATE` or `DERIVATIVE`).
  - Event emitted to `07_COSTING_ENGINE` for unit cost assignment ($U_{\text{out}}$).

### 6. `CANCELLED` / `ABORTED`
- **Meaning**: Blend operation terminated prior to successful completion.
- **Inventory Impact**: Allocated component quantities released or written off to scrap.

### 7. `ARCHIVED`
- **Meaning**: Historical blend record preserved for traceability and audit.

---

## Deterministic Status Principle

Status transitions are monotonic during execution:
```text
PLANNED → SCHEDULED → IN_PROGRESS → BLENDED → COMPLETED
```

Transitions generate immutable audit trails and ensure that inventory movements and costing events are executed exactly once upon reaching `COMPLETED`.

---

## AI Boundary Philosophy

AI systems may track blend batch cycle times to detect operational bottlenecks. However, AI systems must **never** advance or alter `BlendBatch` statuses autonomously.

---

## Philosophy Summary

Blend status is **operational progression visibility, blend production lifecycle state, and deterministic transformation behavior**. Blend status tells the system exactly where blend production exists within the production lifecycle.


