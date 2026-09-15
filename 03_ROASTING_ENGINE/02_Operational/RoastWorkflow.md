# Roast Workflow

## Purpose

This document defines the operational roasting workflow behavior used across Roastery OS.

The purpose of Roast Workflow is to:
- standardize roasting execution flow,
- preserve deterministic production behavior,
- support inventory transformation adhering to the canonical Transformation contract,
- maintain roasting traceability,
- and provide operational workflow clarity.

Roast Workflow represents the operational sequence of roasting execution inside the system.

This workflow acts as:
- production orchestration logic,
- transformation sequencing,
- and roasting operational lifecycle.

---

# Core Philosophy

Roasting workflows should reflect:
- real-world roasting operations,
- production-oriented inventory behavior,
- and deterministic transformation logic.

Roasting workflows are not merely:
- logging sequences,
- UI forms,
- or administrative procedures.

Roast workflows represent:
- operational production flow,
- inventory evolution via `InventoryLot` instances,
- and roasted intermediate lot generation.

---

# Workflow Philosophy

Roasting behaves as a structured transformation process:

```text
Input InventoryLot (RAW_COFFEE)
↓ Roast Preparation (Lot Reservation/Validation)
↓ Roast Execution (Profile Execution, Thermal Logging)
↓ Yield Measurement & Validation (Actual Output Weight)
↓ Output InventoryLot Creation (INTERMEDIATE Roasted)
↓ Inventory Movement Generation (TRANSFORMATION_CONSUME / TRANSFORMATION_PRODUCE)
↓ Traceability & Costing Event Publication
```

Each workflow stage preserves:
- operational meaning,
- deterministic behavior,
- and traceable production continuity.

---

## Primary Workflow Stages

Roastery OS defines seven core roasting workflow stages:
1. Planning
2. Preparation
3. Execution
4. Transformation & Movement Ledgering
5. Yield Validation
6. Roast Completion & Valuation Hand-off
7. Archival

---

## Workflow Lifecycle

### 1. Roast Planning
**Purpose**: Represents roasting preparation before physical execution.

**Operational Activities**:
- Select Green Coffee Material (`MaterialMaster` category `RAW_COFFEE`)
- Select specific input `InventoryLot`
- Select Target Roast Profile (`RoastProfileMaster`)
- Define Roast Intent / Batch Type (Production, Sample, QC, Experimental)
- Determine Target Batch Green Weight
- Assign Operator and Roasting Machine

---

### 2. Roast Preparation
**Purpose**: Operational machine setup and green bean staging.

**Operational Activities**:
- Validate `InventoryLot` availability and status (`AVAILABLE`)
- Reserve/allocate green coffee quantity (optional staged state: `ALLOCATED`)
- Charge machine to target preheat/charge temperature
- Confirm batch identity (`roastBatchId` / `batchNumber`)

---

### 3. Roast Execution
**Purpose**: Actual roasting thermal transformation.

**Operational Activities**:
- Charge green coffee into roasting drum
- Track roasting telemetry (Charge Temp, Turning Point, Yellowing, First Crack, Development Time Ratio, Drop Temp)
- Record roast observations and sensory markers
- Discharge roasted coffee into cooling tray and execute rapid cooling

---

### 4. Inventory Transformation & Ledgering
**Purpose**: Execute physical inventory state transition.

**Workflow Behavior**:
- Deduct input `InventoryLot` quantity via `InventoryMovement` (`TRANSFORMATION_CONSUME`).
- Create output `InventoryLot` (`materialId` of roasted product, `category: INTERMEDIATE`) via `InventoryMovement` (`TRANSFORMATION_PRODUCE`).
- Bind `roastBatchId` as the `referenceId` for both movements.
- Generate transformation relationship record linking source lot to output lot.

---

### 5. Yield Validation
**Purpose**: Operational measurement and recording of roasted output.

**Operational Activities**:
- Weigh roasted batch post-cooling (`actualRoastedWeightKg`).
- Compute actual yield percentage:
  $$\text{actualYieldPercentage} = \frac{\text{actualRoastedWeightKg}}{\text{greenWeightChargedKg}} \times 100$$
- Compute weight loss percentage:
  $$\text{weightLossPercentage} = 100 - \text{actualYieldPercentage}$$
- Compare against expected yield tolerance defined in `RoastProfileMaster`.

---

### 6. Roast Completion & Valuation Hand-off
**Purpose**: Finalize operational batch and trigger costing engine valuation.

**Operational Activities**:
- Finalize `RoastBatch` status to `COMPLETED`.
- Set output `InventoryLot` state to `AVAILABLE` (or `PENDING_QC`).
- Publish transformation event to `07_COSTING_ENGINE` with consumed lot valuations and direct batch costs to establish output unit cost:
  $$U_{\text{out}} = \frac{V_{\text{consumed}} + C_{\text{direct}}}{Q_{\text{out}}}$$
- Finalize traceability graph links.

---

### 7. Workflow Archival
**Purpose**: Long-term roasting history, profile adherence, and telemetry preservation.

**Operational Activities**:
- Archive roast telemetry curves, Agtron color readings, and cupping scores.
- Maintain immutable traceability records linking agricultural green lot to roast batch to downstream packaging/blend lots.

---

## Workflow State Lifecycle

A `RoastBatch` progresses through explicit operational states:
```text
DRAFT → SCHEDULED → IN_PROGRESS → COOLED → COMPLETED (or REJECTED / ABORTED)
```

State transitions remain deterministic, explicit, and auditable.

---

## Workflow Relationship Principle

Roasting workflows preserve explicit parent-child lineage:

```text
Input InventoryLot (RAW_COFFEE)
↓ RoastBatch (Transformation)
Output InventoryLot (INTERMEDIATE Roasted)
↓ Packaging Workflow / Blending Workflow
Finished Goods InventoryLot (SKU / Blend)
```

Workflow relationships remain traceable, readable, and deterministic.

---

## Deterministic Workflow Principle

Critical roasting workflows must remain deterministic:
- inventory lot reservation and deduction,
- roasted lot creation,
- yield calculation,
- and ledger movement generation.

The system strictly avoids hidden inventory mutations, ambiguous batch states, or disconnected transformation behavior.

---

## Human-Centered Philosophy

Roast workflows feel natural for real roastery operations. Roasters can execute batches quickly with clear visual feedback, without enterprise ERP bureaucratic friction.

---

## Modular Workflow Philosophy

The roasting engine supports diverse workflow types:
- **Production Roast**: Standard full-scale batches adhering to production profiles.
- **Sample Roast**: Small evaluation batches for green lot purchase decisions.
- **Experimental Roast**: R&D profile development batches.
- **QC / Calibration Roast**: Machine calibration and sensory alignment batches.

---

## AI Boundary Philosophy

AI systems may:
- analyze roast curve adherence and rate of rise (RoR),
- recommend profile adjustments for target development,
- identify ambient temperature drift anomalies,
- and assist with predictive yield forecasting.

However, AI systems must **never** autonomously create, alter, or finalize deterministic inventory transformations.

---

## MVP Scope

The MVP Roast Workflow prioritizes:
- `RoastBatch` creation and status progression,
- physical `InventoryLot` transformation,
- deterministic yield and loss measurement,
- roast completion and costing hand-off,
- and end-to-end operational traceability.

---

## Philosophy Summary

Roast workflows are production orchestration, inventory transformation sequencing, and operational evolution flow. Roast workflows define how coffee physically and operationally evolves from green bean to roasted coffee inside Roastery OS.

