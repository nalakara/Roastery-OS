# Production Status

## Purpose

This document defines the operational production status philosophy and lifecycle state machine used inside the Production Engine of Roastery OS.

The purpose of Production Status is to:
- represent production lifecycle progression across all conversion archetypes,
- preserve operational workflow visibility and operator accountability,
- support deterministic ledger transitions on `InventoryMovement`,
- and maintain complete auditability for material transformations.

Production status represents the operational condition of a `ProductionBatch` throughout its transformation lifecycle.

---

# Core Philosophy

Roastery OS treats `ProductionStatus` as:
- operational workflow visibility,
- deterministic state machine progression,
- and ledger transition triggers.

Production status is not merely cosmetic UI labeling; each state change enforces specific inventory validation and ledger rules.

---

# Production Lifecycle State Machine

```text
[ PLANNED ] ──► [ PREPARED ] ──► [ IN_PROGRESS ] ──► [ COMPLETED ] ──► [ ARCHIVED ]
       │               │                │
       ▼               ▼                ▼
  [ CANCELLED ]   [ CANCELLED ]    [ PAUSED ]
                                        │
                                        ▼
                                 [ IN_PROGRESS ]
```

---

# State Definitions & Ledger Behavior

### 1. `PLANNED`
- **Definition:** Transformation intent is declared (archetype selected, recipe/BOM attached, target quantity defined).
- **Ledger Impact:** None. No stock reserved or depleted.
- **Valid Transitions:** $\to$ `PREPARED`, $\to$ `CANCELLED`.

### 2. `PREPARED`
- **Definition:** Physical staging and machine calibration complete. Required source lots (coffee, packaging, additives) are verified.
- **Ledger Impact:** Source `InventoryLot` instances may optionally transition to state `ALLOCATED`.
- **Valid Transitions:** $\to$ `IN_PROGRESS`, $\to$ `CANCELLED`.

### 3. `IN_PROGRESS`
- **Definition:** Active physical material conversion is underway (Milling, Brewing, Filling, Packaging, Kitting).
- **Ledger Impact:** Consumed quantities are posted via `TRANSFORMATION_CONSUME` on source `InventoryLot` instances.
- **Valid Transitions:** $\to$ `PAUSED`, $\to$ `COMPLETED`, $\to$ `CANCELLED`.

### 4. `PAUSED`
- **Definition:** Transformation temporarily halted (e.g. machine maintenance, quality check, shift handover).
- **Ledger Impact:** Consumed quantities remain posted; output creation is on hold.
- **Valid Transitions:** $\to$ `IN_PROGRESS`, $\to$ `CANCELLED`.

### 5. `COMPLETED`
- **Definition:** Physical transformation finalized and validated.
- **Ledger Impact:**
  - Target `InventoryLot` instances are instantiated via `TRANSFORMATION_PRODUCE` in state `AVAILABLE`.
  - Final physical quantities ($Q_{\text{consumed}, i}, Q_{\text{out}}$) and direct cost events ($C_{\text{direct}}$) are locked and transmitted to `07_COSTING_ENGINE`.
  - Costing Engine sets unit cost ($U_{\text{out}}$) via Canonical Equation 1.
- **Valid Transitions:** $\to$ `ARCHIVED`.

### 6. `CANCELLED`
- **Definition:** Batch aborted prior to finalization.
- **Ledger Impact:** Any consumed quantities must be reversed or accounted for via explicit scrap adjustments (`SCRAP_ADJUSTMENT`). No target output lots are created.
- **Valid Transitions:** $\to$ `ARCHIVED`.

### 7. `ARCHIVED`
- **Definition:** Historical batch record locked for active editing; retained for audit, traceability, and analytical provenance.
- **Ledger Impact:** Immutable read-only status.

---

# Summary

Production status provides a deterministic, auditable state machine governing the operational and financial lifecycle of every production transformation inside Roastery OS.

