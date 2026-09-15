# MVP Boundaries

## Purpose

This document defines the MVP boundaries and operational scope limitations for the Production Engine inside Roastery OS.

The purpose of MVP Boundaries is to:
- preserve architectural focus,
- maintain implementation realism,
- reduce unnecessary manufacturing complexity,
- and ensure sustainable ecosystem evolution.

The MVP Production Engine should prioritize:
- operational usefulness,
- deterministic manufacturing workflows,
- and practical specialty coffee production operations.

The MVP is intended to establish:
- a strong production transformation foundation,
not:
- a complete industrial manufacturing platform.

---

# Core Philosophy

Roastery OS is designed to evolve progressively.

The MVP Production Engine should therefore focus on:
- foundational production workflows,
- commercially sellable inventory generation,
- deterministic transformation behavior,
- and production-oriented operational clarity.

The MVP should avoid:
- premature industrial complexity,
- enterprise manufacturing abstraction,
- and unnecessary automation systems.

The goal is:
- operational usefulness first,
- ecosystem expansion later.

---

# MVP Philosophy

The MVP Production Engine behaves as:
- Production-Oriented
- Transformation-Aware
- Deterministic
- Traceable
- Commercially Practical
- Human-Centered
- Operationally Understandable

The MVP is not intended to become an industrial manufacturing ERP or autonomous factory infrastructure. It solves real specialty coffee production workflows with practical operational elegance.

---

# MVP Core Objectives

The MVP successfully supports:
1. `ProductionBatch` execution context management across 6 conversion archetypes.
2. Generic `InventoryLot` creation typed by `MaterialMaster` (`FINISHED_GOODS`, `INTERMEDIATE`, `DERIVATIVE`).
3. Packaging material consumption as physical `TransformationInput`.
4. `SKUMaster` decoupling from physical inventory stock.
5. Derivative product transformation workflows (Grinding, Extraction, Portioning, Bottling, Kitting, Decanting).
6. Mass balance and unit packaging yield calculation.
7. Seamless input quantity handoff to `07_COSTING_ENGINE`.
8. End-to-end genealogical traceability back to roast batches and green lots.
9. Structured operational logging and process parameter capture.

---

# MVP Operational Scope

The MVP Production Engine primarily supports:
- Home Roasteries
- Nano Roasteries
- Small Batch Specialty Roasters
- Specialty Coffee Production Labs
- Independent Commercial Coffee Brands

---

# Included MVP Features

### 1. ProductionBatch Workflows
- Batch creation and lifecycle state management (`PLANNED` $\to$ `PREPARED` $\to$ `IN_PROGRESS` $\to$ `COMPLETED` / `CANCELLED` $\to$ `ARCHIVED`).
- Multi-input, multi-output physical transformation execution.
- Operational batch logging and parameter capture.

### 2. Commercial Inventory Generation
- Conversion of intermediate bulk coffee lots into packaged, commercially sellable `InventoryLots`.
- Inventory state transitions (`AVAILABLE`, `RESERVED`, `CONSUMED`, `QUARANTINED`, `ARCHIVED`).
- Clear mapping from physical lots to commercial `SKUMaster` definitions.

### 3. Packaging Material Tracking
- Physical packaging tracking via `MaterialMaster` and `InventoryLot`.
- Consumption of packaging materials via `TRANSFORMATION_CONSUME`.
- Packaging defect and scrap recording.

### 4. Derivative Product Transformations
- Standard archetypes: Grinding, Cold Brew Extraction, Bottling, Drip Bag Portioning, Kitting, and Decanting.
- Multi-step transformation pipelines without schema migrations.

### 5. Production Costing Handoff
- Physical quantity, yield, scrap, and direct process parameter recording.
- Full deference of valuation and cost absorption to `07_COSTING_ENGINE`.

### 6. Production Traceability
- Forward and backward genealogical tracking across all transformation stages.

---

# Excluded MVP Features

The MVP intentionally excludes:
- **Industrial Factory Routing:** Machine scheduling algorithms and automated conveyor integration.
- **Autonomous Manufacturing AI:** Automated AI batch triggering or recipe parameter auto-overrides.
- **Advanced Food Compliance ERP:** Complex multi-jurisdiction HACCP auditing software integration.
- **Industrial Packaging Automation:** High-speed rotary filler IoT telemetry integration.
- **Enterprise Warehouse Management:** Multi-facility automated pallet racking and 3PL routing.
- **Enterprise Financial Modules:** General ledger journal entries, payroll integration, and tax accounting (handled externally or in future iterations).

---

# Human-Centered MVP Principle

The MVP remains approachable, intuitive, and lightweight for roastery operators, reducing operational friction without sacrificing data integrity.

---

# Deterministic MVP Principle

Critical operational behavior remains deterministic:
- Mass and unit conservation.
- Double-entry inventory ledger integrity.
- Cost provenance governed by `07_COSTING_ENGINE`.
- Complete genealogical traceability.

---

# MVP Success Criteria

The MVP is successful when operators can execute production batches, package retail coffee, bottle cold brew, assemble gift sets, track scrap, and verify true production costs without spreadsheets or manual ledger adjustments.

---

# Philosophy Summary

The MVP Production Engine is a focused, robust commercial production foundation designed to solve real specialty coffee manufacturing workflows while preserving long-term architectural scalability.
