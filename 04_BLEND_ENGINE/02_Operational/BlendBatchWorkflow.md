# Blend Batch Workflow

## Purpose

This document defines the operational blend production workflow behavior used across Roastery OS.

The purpose of BlendBatch Workflow is to:
- standardize blend production execution as a canonical `Transformation`,
- preserve deterministic inventory transformation consuming multiple `InventoryLot` instances,
- maintain multi-parent composition continuity,
- support end-to-end operational traceability,
- and provide clear production workflow visibility.

`BlendBatch` represents:
- actual blend production execution,
- a multi-input (`N \rightarrow 1` or `N \rightarrow M`) `Transformation` event,
- and operational composition realization.

---

# Core Philosophy

Roastery OS treats `BlendBatch` as:
- operational blend execution,
- recipe-based inventory transformation,
- and production composition realization.

`BlendBatch` is not merely inventory grouping or static mixing. It creates new `InventoryLot` instances with a distinct blended material identity.

---

# Workflow Philosophy

Blend production behaves as a structured transformation process:

```text
Input InventoryLots (Lot A + Lot B)
↓ Blend Preparation (Lot Reservation/Validation)
↓ Component Staging & Weighing (Actual Scall Weights)
↓ Physical Blending Execution (Mechanical Homogenization)
↓ Output Weighing & Yield Validation (Actual Output Weight)
↓ Output InventoryLot Creation (INTERMEDIATE or DERIVATIVE Blend)
↓ Inventory Movement Ledgering (TRANSFORMATION_CONSUME / TRANSFORMATION_PRODUCE)
↓ Traceability & Costing Event Publication
```

Each workflow stage preserves operational meaning, composition visibility, and transformation continuity.

---

## Primary Workflow Stages

Roastery OS defines seven core blend workflow stages:
1. **Planning**: Select `BlendRecipeMaster`, target batch size, and scheduled production date.
2. **Preparation**: Identify and stage specific input `InventoryLot` instances satisfying recipe component materials. Validate lot availability (`AVAILABLE`).
3. **Composition & Weighing**: Weigh out component lots according to recipe target ratios. Record actual input weight for each lot.
4. **Physical Blending**: Combine components in the blending drum/mixer.
5. **Yield Validation**: Weigh final blended coffee output. Record physical loss/purge ($Q_{\text{loss}} = \sum Q_{\text{in}} - Q_{\text{out}}$).
6. **Transformation & Completion**:
   - Post `TRANSFORMATION_CONSUME` movements for all input lots.
   - Post `TRANSFORMATION_PRODUCE` movement for output blend `InventoryLot`.
   - Publish transformation completion event to `07_COSTING_ENGINE` to establish output lot unit cost:
     $$U_{\text{out}} = \frac{\sum (Q_{\text{in}, i} \times U_{\text{in}, i}) + \sum C_{\text{direct}}}{Q_{\text{out}}}$$
7. **Archival**: Archive batch composition record, component actual ratios, and quality notes.

---

## Blend Lifecycle State Progression

A `BlendBatch` progresses through explicit operational states:
```text
DRAFT → SCHEDULED → IN_PROGRESS → BLENDED → COMPLETED (or CANCELLED / ABORTED)
```

---

## Multi-Parent Lineage Preservation

`BlendBatch` links multiple source parents to one or more output lots:

```text
Input Lot 1 (Brazil Cerrado Roasted, 60 kg) ──┐
                                             ├──> BlendBatch ──> Output Lot (House Espresso Blend, 99.5 kg)
Input Lot 2 (Ethiopia Yirgacheffe, 40 kg) ────┘
```

Both input parent lots remain permanently connected in the traceability graph.

---

## Deterministic Workflow Principle

Critical blend workflows must remain deterministic:
- inventory lot deductions,
- actual component weight recordings,
- output lot creation,
- and ledger movement generation.

---

## AI Boundary Philosophy

AI systems may recommend component substitutes based on available lot inventory or suggest ratio adjustments to compensate for harvest year changes. However, AI systems must **never** execute or alter deterministic blend transformations autonomously.

---

## Philosophy Summary

`BlendBatch` workflows are **operational transformation orchestration, composition realization, and multi-input inventory evolution sequencing**. Blend workflows define how multiple component lots evolve into a unified blend entity inside Roastery OS.


