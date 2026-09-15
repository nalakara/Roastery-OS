# MVP Boundaries

## Purpose

This document defines the MVP boundaries and operational scope limitations for the Blend Engine inside Roastery OS.

The purpose of MVP Boundaries is to:
- preserve architectural focus,
- maintain implementation realism,
- reduce unnecessary production complexity,
- and ensure sustainable ecosystem evolution.

The MVP Blend Engine prioritizes:
- operational usefulness,
- deterministic production workflows,
- and practical specialty coffee operations.

The MVP establishes:
- a strong blend production foundation based on generic `InventoryLot` and `MaterialMaster` transformations,
- not a complete industrial manufacturing platform.

---

# Core Philosophy

Roastery OS is designed to evolve progressively.

The MVP Blend Engine focuses on:
- foundational blend workflows,
- measurable composition structures,
- deterministic physical transformation behavior,
- and production-oriented operational clarity.

The MVP avoids:
- premature manufacturing complexity,
- enterprise formulation abstraction,
- and unnecessary automation systems.

The goal is:
- operational usefulness first,
- ecosystem expansion later.

---

# MVP Philosophy

The MVP Blend Engine behaves as:

```text
Production-Oriented
Composition-Aware
Deterministic
Traceable
Human-Centered
Operationally Understandable
```

The MVP is not intended to become:
- industrial manufacturing software,
- enterprise ERP production orchestration,
- or autonomous blend optimization infrastructure.

The MVP solves:
- real specialty coffee blend workflows,
- with realistic operational complexity.

---

# MVP Core Objectives

The MVP successfully supports:
- `BlendRecipe` creation (defining percentage composition across `MaterialMaster` definitions)
- `BlendBatch` execution (executing physical transformation across `InventoryLot` instances)
- Source `InventoryLot` consumption (`TRANSFORMATION_CONSUME`)
- Output `InventoryLot` creation (`TRANSFORMATION_PRODUCE`)
- Composition ratio visibility
- Physical yield and handling loss visibility
- Costing continuity via `07_COSTING_ENGINE` (Canonical Equations 1 & 7)
- Multi-parent blend traceability (DAG)
- Production workflow visibility and logging

These capabilities establish:
- meaningful production value,
- and a strong architectural foundation.

---

# MVP Operational Scope

The MVP Blend Engine primarily supports:
- Home Roasteries
- Nano Roasteries
- Small Batch Specialty Operations
- Independent Coffee Roasters

The MVP is optimized for:
- lightweight production workflows,
- not industrial-scale continuous manufacturing infrastructure.

---

# Included MVP Features

### BlendRecipe Management
- BlendRecipe Creation
- Material-based Composition Ratio Structure ($\sum \% = 100\%$)
- Reusable Blend Formulation Templates
- Recipe Version Visibility

### BlendBatch Production
- BlendBatch Creation & Execution (`Transformation`)
- Multi-input consumption to single/multi-output production
- Production Workflow Visibility
- Lifecycle Status Progression (`PLANNED` $\to$ `COMPLETED` / `CANCELLED`)

### Inventory Transformation
- Source `InventoryLot` Consumption (`TRANSFORMATION_CONSUME`)
- Transformed `InventoryLot` Output Creation (`TRANSFORMATION_PRODUCE`)
- Composition Continuity
- Yield & Handling Loss Tracking

### Blend Costing Interface
- Input valuation aggregation via `07_COSTING_ENGINE`
- Direct cost capitalization
- Output unit cost derivation via Canonical Equation 1 ($U_{\text{out}} = \frac{V_{\text{consumed}} + C_{\text{direct}}}{Q_{\text{out}}}$)
- Provenance decomposition via Canonical Equation 7

### Blend Traceability
- Composition Lineage
- Multi-parent DAG linkage across green and roasted parent lots
- Transformation Continuity
- Complete Production Traceability

### Blend Logging
- Scale weight logs
- Component ratio execution logs
- Mixing and homogenization notes
- Workflow timeline

---

# Excluded MVP Features

The MVP intentionally excludes:
- advanced industrial manufacturing infrastructure,
- enterprise production complexity,
- and premature AI automation systems.

### Excluded: Flavor Simulation Systems
- Flavor Mapping
- Sensory Prediction
- AI Flavor Modeling
- Taste Simulation Systems
- *Reason:* Operational production workflows take priority over advanced sensory analytics.

### Excluded: Automated Blend Optimization
- Automatic Ratio Adjustment
- AI Blend Generation
- Autonomous Composition Optimization
- Predictive Blend Formulation
- *Reason:* Deterministic composition workflows must remain human-controlled during foundational product stages.

### Excluded: Industrial Manufacturing Systems
- Factory Routing
- Industrial Continuous Mixing Line Scheduling
- Multi-Facility Production
- Enterprise Manufacturing Orchestration
- *Reason:* MVP target users are small batch and specialty coffee roasteries.

### Excluded: Advanced Production Analytics
- Predictive Production Modeling
- Advanced Statistical Blend Analysis
- Industrial Yield Forecasting
- Enterprise Operational Intelligence
- *Reason:* Foundational operational workflows take priority over advanced analytics infrastructure.

### Excluded: IoT Infrastructure
- Automated Scale Streaming
- Robotic Silo Dispensing Sync
- Real-Time Continuous In-line Telemetry
- *Reason:* Excessive implementation complexity, hardware dependency, and reduced MVP accessibility.

### Excluded: Enterprise Accounting Systems
- ERP Finance Modules
- General Ledger Balancing
- Tax Orchestration
- Complex Overhead Absorption Matrices
- *Reason:* Roastery OS MVP prioritizes operational inventory costing via `07_COSTING_ENGINE`, not general ledger accounting.

### Excluded: Full Autonomous AI Infrastructure
- Autonomous Workflow Execution
- Predictive Production AI
- Automatic Inventory Mutation
- Self-Adjusting Production Logic
- *Reason:* Deterministic operational integrity must remain human-auditable. AI acts as an operational assistant, not an autonomous production operator.

---

# Human-Centered & Deterministic Principles

The MVP remains:
- approachable and operationally understandable,
- easy to adopt without ERP intimidation,
- fully deterministic in ledger deductions, mass balances, and costing handoffs.

---

# MVP Success Criteria

The MVP is considered successful if operators can:
1. Create reusable blend recipes defined by material ratios,
2. Execute physical blend production against actual inventory lots,
3. Understand composition structure and mass yield,
4. Trace multi-parent lot lineage,
5. Obtain deterministic inventory valuation via the Costing Engine,
6. Manage produced blend inventory stock,

without spreadsheets, disconnected notes, or operational confusion.

---

# Architectural Summary

The MVP Blend Engine is a focused, mathematically sound production foundation designed to solve real specialty coffee blend workflows while strictly conforming to the generic transformation ontology and costing contract of Roastery OS.

