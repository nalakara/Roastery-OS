# Roast Inventory Transformation

## Purpose

This document defines the inventory transformation behavior created by roasting workflows inside Roastery OS.

The purpose of Roast Inventory Transformation is to:
- preserve deterministic inventory evolution,
- define roasting transformation relationships adhering to the canonical Transformation contract,
- maintain inventory continuity using `InventoryLot` and `MaterialMaster`,
- support yield-aware production workflows,
- and provide operational traceability across roasting activities.

Roasting is a primary transformation layer inside the Roastery OS architecture:
- consuming raw coffee inventory (`RAW_COFFEE` material category `InventoryLot`),
- producing roasted coffee inventory (`INTERMEDIATE` material category `InventoryLot`).

---

# Core Philosophy

Roastery OS treats roasting as:
- inventory transformation,
- operational evolution,
- and roasted inventory lot generation.

Roasting does not simply:
- reduce stock,
- or mutate quantity in place.

Roasting creates:
- a new inventory state,
- a new operational identity (`InventoryLot`),
- and a new production relationship (`Transformation` / `RoastBatch`).

The system preserves:
- transformation lineage,
- inventory continuity,
- and deterministic operational behavior.

---

# Transformation Philosophy

Traditional inventory systems commonly interpret roasting as simple stock reduction:

```text
Raw Inventory
↓
Reduced Inventory Quantity
```

Roastery OS uses a formal transformation-oriented operational model:
```text
Input InventoryLot (RAW_COFFEE Material)
↓ RoastBatch (Transformation Execution)
Output InventoryLot (INTERMEDIATE Roasted Material)
```

This transformation represents:
- material evolution,
- physical production execution,
- and operational state transition.

Inventory does not disappear. Inventory transforms.

---

## Core Transformation Principle

Every `RoastBatch` should:
- consume one or more input `InventoryLot` instances (typically 1 lot for single-origin or N lots for pre-roast blend),
- generate one or more output `InventoryLot` instances (typically 1 roasted lot or N split lots),
- create immutable `InventoryMovement` records (`TRANSFORMATION_CONSUME` and `TRANSFORMATION_PRODUCE`),
- measure and preserve physical yield visibility,
- and maintain transformation traceability.

Example:
```text
100 kg Green Coffee (Input InventoryLot)
↓ RoastBatch (Green Loss: 18 kg)
82 kg Roasted Coffee (Output InventoryLot)
```

The system preserves:
- input inventory lot identity (`sourceLotId`),
- output inventory lot identity (`outputLotId`),
- transformation relationship (`roastBatchId` / `transformationId`),
- and operational continuity.

---

## Transformation Relationship Structure

Roasting transformation preserves explicit operational lineage:

```text
Input InventoryLot (RAW_COFFEE)
├── consumedBy → RoastBatch (Transformation)
↓
Output InventoryLot (INTERMEDIATE Roasted)
```

Transformation relationships remain:
- deterministic,
- traceable across lot parents,
- operationally meaningful,
- and human-readable.

---

## Inventory Evolution Principle

Roasting creates a distinct inventory identity:
```text
Input InventoryLot (RAW_COFFEE) ≠ Output InventoryLot (INTERMEDIATE Roasted)
```

Even when originating from the same coffee variety or farm source, these entities represent:
- different physical states (moisture, density, solubility, color),
- different material definitions (`MaterialMaster`),
- different economic valuations (calculated by `07_COSTING_ENGINE`),
- and different operational usability.

Roasted coffee becomes production-ready intermediate inventory.

---

## Input Inventory Philosophy

Green coffee `InventoryLot` acts as:
- roasting input inventory,
- raw production material (`category: RAW_COFFEE`),
- and transformation source entity.

Input inventory preserves:
- sourcing identity and procurement lineage,
- agricultural attributes (origin, variety, process, crop year via `GreenBeanProfile`),
- and operational quantity continuity via ledger movements.

Input inventory remains fully traceable after transformation consumption.

---

## Output Inventory Philosophy

Roasted coffee `InventoryLot` acts as:
- roasting transformation output,
- production-ready intermediate inventory (`category: INTERMEDIATE`),
- and future production input for blending, packaging, or direct sale.

Roasted inventory preserves:
- roast batch lineage,
- roast profile relationship (`RoastProfileMaster`),
- actual yield and roast telemetry continuity,
- and operational transformation history.

Roasted inventory may later:
- be packaged into finished goods (`SKU`),
- enter post-roast blend workflows (`BlendBatch`),
- or enter derivative production workflows (ground coffee, cold brew extraction, RTD).

---

## Yield Transformation Principle

Roasting transformations inherently alter inventory mass due to moisture loss and organic degasification:
```text
100 kg Green Coffee Input
↓ roasting
82 kg Roasted Coffee Output (Yield: 82.0%, Weight Loss: 18.0%)
```

Yield behavior remains:
- explicit and measured directly by Roasting Engine,
- traceable,
- deterministic,
- and operationally meaningful.

Roast weight loss is:
- an expected physical transformation effect,
- not an inventory shrinkage discrepancy or inventory adjustment.

---

## Transformation Event Principle

Roasting transformation generates discrete operational events:
1. Input `InventoryLot` deduction via `InventoryMovement` (`TRANSFORMATION_CONSUME`).
2. Output `InventoryLot` creation via `InventoryMovement` (`TRANSFORMATION_PRODUCE`).
3. Physical yield calculation (`actualYieldPercentage = (outputQuantity / inputQuantity) * 100`).
4. Transformation completion event published to `07_COSTING_ENGINE` for unit cost valuation.
5. Traceability graph update linking input lot(s) to output lot(s).

Every transformation event preserves:
- operational visibility,
- deterministic workflow continuity,
- and production traceability.

---

## Inventory State Transition Principle

Roasting transformations transition inventory states:

```text
Input InventoryLot:
AVAILABLE / ALLOCATED → PARTIALLY_CONSUMED / FULLY_CONSUMED

Output InventoryLot:
CREATED (UNRELEASED / PENDING_QC) → AVAILABLE
```

State transitions remain explicit, deterministic, and auditable.

---

## Costing Transformation Boundary

Roasting transformations directly impact economic unit cost. However, **Roasting Engine owns physical process measurement, NOT economic valuation**.

Boundary separation:
- **Roasting Engine owns**: Input lot consumption quantity, output lot yield quantity, roast loss percentage, and batch process execution.
- **Costing Engine (`07_COSTING_ENGINE`) owns**: Consumed economic value valuation, labor/machine cost absorption, and calculating output unit cost:
  $$U_{\text{out}} = \frac{V_{\text{consumed}} + C_{\text{direct}}}{Q_{\text{out}}}$$

Roasting Engine does not compute or assign inventory monetary balances directly.

---

## Traceability Principle

Roasting transformation preserves complete operational lineage:

```text
Supplier / Harvest Lot
↓ Purchase Order Receipt
Input InventoryLot (RAW_COFFEE)
↓ RoastBatch (Profile, Agtron, Telemetry)
Output InventoryLot (INTERMEDIATE Roasted)
↓ Packaging / Blending
Finished Goods InventoryLot (SKU)
```

Transformation history remains readable, traceable, and production-oriented.

---

## Transformation vs Consumption Principle

Roastery OS distinguishes between:
- **Transformation**: Consumes inventory lots to produce new inventory lots with new material identities (e.g., Roasting, Blending, Packaging).
- **Non-Transformation Consumption**: Depletes inventory lots without producing new inventory lots (e.g., internal cupping sample, quality testing scrap, office coffee consumption).

This distinction preserves operational clarity and inventory ledger integrity.

---

## Deterministic Transformation Principle

Critical roasting transformations must remain deterministic:
- inventory lot deductions,
- roasted lot creation,
- yield calculation,
- and traceability relationships.

Transformation workflows produce predictable outcomes, preserve operational integrity, and remain fully auditable without hidden mutations or disconnected lineage.

---

## Human-Centered Philosophy

Roasting transformations remain understandable for operational roasters. Roastery operators can trace green sourcing to roasted batches and follow production continuity without enterprise ERP complexity.

---

## AI Boundary Philosophy

AI systems may:
- analyze roasting curve profiles,
- predict roast yield based on ambient conditions and bean density,
- identify roasting anomalies or defect patterns,
- and recommend profile adjustments.

However, AI systems must **never** autonomously manipulate deterministic inventory transformations or bypass operational confirmation.

---

## MVP Scope

The MVP Roast Inventory Transformation system prioritizes:
- input `InventoryLot` consumption,
- output `InventoryLot` creation,
- deterministic yield and loss calculation,
- transformation traceability linking green lots to roasted lots,
- and operational continuity.

The MVP intentionally excludes automated robotic transfer systems or continuous industrial manufacturing orchestration.

---

## Philosophy Summary

Roasting transformation is not stock reduction or ad-hoc adjustment.
Roasting transformation is **inventory evolution, physical production progression, and roasted inventory lot generation**.
Roasting is where raw agricultural coffee becomes production-ready intermediate inventory inside Roastery OS.

