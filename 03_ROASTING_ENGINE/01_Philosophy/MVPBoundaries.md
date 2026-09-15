# MVP Boundaries

## Purpose

This document defines the MVP boundaries and operational scope limitations for the Roasting Engine inside Roastery OS.

The purpose of MVP Boundaries is to:
- preserve architectural focus,
- maintain implementation realism,
- reduce unnecessary operational complexity,
- and ensure sustainable product evolution.

---

# MVP Core Objectives

The MVP Roasting Engine supports:
1. `RoastBatch` execution as a coffee-specific `Transformation`.
2. Input `InventoryLot` (`RAW_COFFEE`) consumption via ledger movements.
3. Output `InventoryLot` (`INTERMEDIATE`) production via ledger movements.
4. Deterministic physical yield and weight loss percentage calculation.
5. `RoastProfileMaster` assignment and adherence tracking.
6. Batch thermal milestones and observation logging.
7. Handing off physical metrics to `07_COSTING_ENGINE` for unit cost assignment.
8. End-to-end parent-child batch and lot traceability.

---

# Included MVP Features

- **Roast Batch Management**: Creation, scheduling, in-progress logging, cooling, completion, and cancellation.
- **Inventory Lot Transformation**: Multi-lot or single-lot green input consumption; intermediate roasted lot creation.
- **Roast Profile Application**: Reusable profile templates (`RoastProfileMaster`), target development time ratios, charge/drop temp guidance.
- **Roast Logging**: Manual entry of turning point, yellowing, first crack, drop temp, DTR%, sensory notes, and ambient conditions.
- **Physical Yield Measurement**: Green charged weight vs roasted output weight calculation.
- **Traceability**: Complete forward and backward lineage from agricultural source to roasted intermediate lot.
- **Costing Interface**: Emitting transformation events to `07_COSTING_ENGINE` without embedding internal accounting logic.

---

# Excluded MVP Features

- **Automated Machine Control**: No autonomous burner/airflow actuators or closed-loop PID control.
- **Hardware Telemetry Streaming**: Direct live USB/Bluetooth Artisan/Cropster probe daemon sync is deferred to post-MVP plugins.
- **Enterprise Routing / Multi-Facility Scheduling**: Complex ERP factory floor dispatching is excluded.
- **Autonomous AI Transformation**: AI never mutates batch records or bypasses roaster confirmation.

---

## Philosophy Summary

The MVP Roasting Engine is a **focused operational foundation** that executes deterministic coffee transformations cleanly, tracks physical yields accurately, and integrates seamlessly with Inventory and Costing Engines.

