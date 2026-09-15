# Production Workflow

## Purpose

This document defines the operational production workflow behavior used across the Production Engine inside Roastery OS.

The purpose of Production Workflow is to:
- standardize production execution across diverse manufacturing archetypes,
- preserve deterministic physical transformation behavior,
- maintain operational continuity and ledger integrity,
- support finished goods and derivative product generation,
- and provide structured production lifecycle visibility.

Production workflows represent commercial-oriented material manufacturing orchestration.

---

# Core Philosophy

Roastery OS treats production workflows as:
- operational manufacturing systems,
- physical material state conversion orchestration,
- and commercial inventory evolution.

Production workflows are not merely:
- packaging procedures,
- static SKU generation,
- or retail preparation.

Production workflows represent:
- operational transformation sequencing,
- physical mass/count balance tracking,
- and finished goods generation.

---

# Workflow Stages

Roastery OS structures all production transformations across six standardized operational stages:

```text
1. Planning ──► 2. Preparation ──► 3. Transformation ──► 4. Validation ──► 5. Completion ──► 6. Archival
```

### 1. Production Planning
- **Purpose:** Define production intent and resource requirements before execution.
- **Activities:**
  - Select production archetype (Grinding, Brewing, Portioning, Bottling, Kitting, Decanting).
  - Select process recipe / BOM specification.
  - Define target output quantity ($Q_{\text{planned}}$) and target SKU format.
  - Schedule execution and assign operators.

### 2. Production Preparation
- **Purpose:** Stage and verify physical materials before active conversion.
- **Activities:**
  - Verify and allocate source `InventoryLot` instances (Base Coffee, Packaging, Additives).
  - Confirm machine setup and tooling (e.g. grind size calibration, sealing temperature).
  - Inventory lots transition from `AVAILABLE` to `ALLOCATED` if reservation is required.

### 3. Production Transformation Execution
- **Purpose:** Execute physical material conversion.
- **Activities:**
  - Deduct consumed quantities from source `InventoryLot` instances via `TRANSFORMATION_CONSUME`.
  - Execute physical conversion (Milling, Brewing, Filling, Packaging, Kitting).
  - Record operational process logs and scrap/purge events.

### 4. Workflow Validation
- **Purpose:** Inspect and measure physical output results.
- **Activities:**
  - Measure actual output quantity ($Q_{\text{out}}$) and package counts.
  - Calculate physical yield percentage ($Y_{\%}$) and operational loss ($Q_{\text{loss}}$).
  - Validate physical quality parameters (seal integrity, fill level, grind distribution, dissolved solids).

### 5. Production Completion
- **Purpose:** Finalize physical ledger postings and trigger economic valuation.
- **Activities:**
  - Instantiate target `InventoryLot` instances via `TRANSFORMATION_PRODUCE` in state `AVAILABLE`.
  - Transmit physical quantities ($Q_{\text{consumed}, i}, Q_{\text{out}}$) and direct cost events ($C_{\text{direct}}$) to `07_COSTING_ENGINE`.
  - Costing Engine derives output unit cost ($U_{\text{out}}$) via Canonical Equation 1.
  - Finalize multi-parent DAG lineage links.

### 6. Workflow Archival
- **Purpose:** Preserve immutable historical production memory.
- **Activities:**
  - Archive batch execution telemetry, operator notes, and quality logs for compliance and analytics.

---

# Multi-Archetype Workflow Applicability

The workflow applies universally across all supported conversion archetypes:

```text
Mechanical Conversion:  Roasted Coffee Lot ──► [Grind] ──► Ground Coffee Lot
Liquid Extraction:      Ground Coffee + Water ──► [Cold Brew] ──► Liquid Extract Lot
Discrete Portioning:    Ground Coffee + Pouches ──► [Pack] ──► Drip Bag Lot
Bottling / RTD:         Liquid Extract + Bottles + Caps ──► [Bottle] ──► Bottled RTD Lot
Assembly & Kitting:     Packaged Coffee Lots + Gift Box ──► [Kit] ──► Variety Gift Set Lot
Decanting / Rework:     Packaged Goods Lot ──► [Decant] ──► Bulk Intermediate Lot
```

---

# Summary

Production workflows govern how physical stock instances are transformed into finished commercial goods inside Roastery OS, maintaining rigorous ledger accounting, mass balance verification, and seamless handoff to the Costing Engine.

