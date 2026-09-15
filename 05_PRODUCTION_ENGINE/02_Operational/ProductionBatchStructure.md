# Production Batch Structure

## Purpose

This document defines the `ProductionBatch` entity structure and operational production batch behavior used across the Production Engine inside Roastery OS.

The purpose of `ProductionBatch` is to:
- act as the operational execution context for material transformation workflows,
- standardize production execution across diverse manufacturing archetypes,
- support finished goods and derivative product generation,
- maintain operational traceability,
- and provide structured records for $N \to M$ inventory transformations.

`ProductionBatch` acts as:
- operational production execution context,
- transformation container,
- and physical inventory generation reference.

---

# Core Philosophy

Roastery OS treats `ProductionBatch` as:
- operational manufacturing execution,
- inventory transformation orchestration,
- and commercial product generation infrastructure.

`ProductionBatch` is not:
- a retail SKU,
- a packaging label,
- or a static sales record.

`ProductionBatch` represents:
- actual physical production execution (`Transformation`).

---

# ProductionBatch Philosophy

Every production workflow preserves:
- operational continuity,
- deterministic transformation behavior,
- physical mass/count balance,
- and multi-parent production traceability.

```text
Transformation Inputs (N InventoryLot instances: Intermediate Coffee, Packaging Materials, Additives)
       ↓
[ ProductionBatch Execution ] (Guided by Recipe / BOM)
       ↓
Transformation Outputs (M InventoryLot instances: Packaged Finished Goods, Byproducts, Derivative Lots)
```

`ProductionBatch` preserves:
- transformation relationships,
- workflow visibility,
- and physical inventory continuity.

---

# Core Relationship Principle

`ProductionBatch` acts as the execution wrapper around the generic `Transformation` contract:

```text
ProductionBatch (Execution Context)
├── executes → Transformation
│    ├── consumes → Source InventoryLots (TRANSFORMATION_CONSUME)
│    └── produces → Output InventoryLots (TRANSFORMATION_PRODUCE)
├── measuredBy → Production Yield & Telemetry
├── costedBy → 07_COSTING_ENGINE (Canonical Equations 1 & 7)
├── recordedIn → InventoryMovement Ledger
└── preserves → Multi-Parent Lineage (DAG)
```

---

# ProductionBatch Data Structure Specification

### 1. Identity & Execution Context
- `productionBatchId`: Unique UUID string identifying this production batch.
- `transformationId`: Unique UUID string linking this execution to the canonical `Transformation` ledger record.
- `batchCode`: Human-readable production code (e.g., `PB-20260521-001`).
- `productionArchetype`: Enum identifying the conversion archetype:
  - `MECHANICAL_CONVERSION` (Grinding / Milling)
  - `LIQUID_EXTRACTION` (Cold Brew / Concentrate)
  - `PORTIONING` (Drip Bags / Sachets)
  - `FORMULATION_BOTTLING` (RTD / Beverage Prep)
  - `ASSEMBLY_KITTING` (Gift Sets / Variety Packs)
  - `DECANTING_REWORK` (Repurposing / Bulk Conversion)
- `recipeId`: Optional reference to the process recipe or BOM specification.

### 2. Transformation Inputs (`TransformationInput[]`)
Collection of physical stock instances consumed during batch execution:
- `inputs`: Array of input records:
  - `inventoryLotId`: UUID of consumed source `InventoryLot`.
  - `materialId`: UUID of source `MaterialMaster` (e.g., Roasted Whole Bean, Drip Bag Filter, Glass Bottle).
  - `materialRole`: `PRIMARY_COFFEE`, `PACKAGING`, `ADDITIVE`, `WATER`, or `AUXILIARY`.
  - `quantity`: Consumed physical quantity ($Q_{\text{consumed}, i}$).
  - `unitId`: Unit of Measure (`kg`, `g`, `l`, `ml`, `unit`, `box`).

### 3. Transformation Outputs (`TransformationOutput[]`)
Collection of physical stock instances produced by batch execution:
- `outputs`: Array of output records:
  - `inventoryLotId`: UUID of created target `InventoryLot`.
  - `materialId`: UUID of target `MaterialMaster` (e.g., 250g Packaged Coffee, Cold Brew Concentrate).
  - `quantity`: Produced physical quantity ($Q_{\text{out}}$).
  - `unitId`: Unit of Measure (`unit`, `kg`, `l`, `bottle`, `sachet`).
  - `targetSkuId`: Optional reference to commercial `SKUMaster` satisfied by this lot.

### 4. Yield & Physical Measurements
- `inputMassTotal`: Aggregated coffee mass consumed (standardized to base unit).
- `outputMassTotal`: Aggregated output mass/count produced.
- `yieldPercentage`: Physical yield ratio ($Y_{\%}$).
- `lossQuantity`: Measured physical loss ($Q_{\text{loss}}$) with reason code (`PURGE`, `RESIDUE`, `SPILLAGE`, `SCRAP`).

### 5. Costing Engine Interface
*Note: Production Engine records physical quantities only. Economic valuation is calculated and maintained strictly by `07_COSTING_ENGINE`.*
- `costingStatus`: Status of economic calculation (`PENDING`, `CALCULATED`, `LOCKED`).
- `valuationReference`: Reference to the `TransformationCostPool` in `07_COSTING_ENGINE`.
- `directCostEvents`: Collection of capitalizable direct costs ($C_{\text{direct}}$) associated with batch execution (e.g., outsourced bottling fee, direct contract packaging labor).

### 6. Operational & Status Fields
- `operatorId`: UUID of user who executed the batch.
- `productionStatus`: Current lifecycle state (`PLANNED`, `PREPARED`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `CANCELLED`, `ARCHIVED`).
- `scheduledAt`: Timestamp of planned execution.
- `startedAt`: Timestamp when transformation began.
- `completedAt`: Timestamp when production was finalized.

### 7. Traceability & Lineage
- `parentLotIds`: Array of source `InventoryLot` UUIDs consumed.
- `childLotIds`: Array of output `InventoryLot` UUIDs produced.
- `traceabilityHash`: Cryptographic or sequential hash anchoring this batch in the production DAG.

---

# ProductionBatch vs SKU Principle

```text
ProductionBatch (Operational Execution) ≠ Retail SKU (Commercial Presentation)
```

- **ProductionBatch:** Represents operational manufacturing execution, physical transformation, and inventory creation.
- **Retail SKU:** Represents commercial sales identity, customer-facing packaging format, pricing, and sales channel cataloging.

A single `ProductionBatch` may produce `InventoryLot` instances that satisfy one or more commercial SKUs without merging production identity with retail sales identity.

---

# Costing & Economic Boundary Principle

Production Engine owns:
- physical recipe quantities ($Q_{\text{consumed}, i}$),
- physical output counts/mass ($Q_{\text{out}}$),
- and physical packaging scrap / handling loss.

Costing Engine (`07_COSTING_ENGINE`) owns:
- economic valuation of consumed inputs ($V_{\text{consumed}} = \sum Q_{\text{consumed}, i} \times U_{\text{consumed}, i}$),
- aggregation of direct capitalizable costs ($C_{\text{direct}}$),
- derivation of finished lot unit cost via Canonical Equation 1:
  $$U_{\text{out}} = \frac{V_{\text{consumed}} + C_{\text{direct}}}{Q_{\text{out}}}$$
- and cost provenance decomposition via Canonical Equation 7.

---

# Summary

`ProductionBatch` is the operational execution wrapper for all material conversions in the Production Engine. By structuring inputs and outputs as generic arrays of `InventoryLot` instances typed by `MaterialMaster`, `ProductionBatch` provides universal support for grinding, brewing, portioning, packaging, and kitting workflows inside Roastery OS.

