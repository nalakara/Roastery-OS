# Roast Batch Structure

## Purpose

This document defines the RoastBatch entity structure and operational roasting execution model used across Roastery OS.

In the frozen ontology, a RoastBatch represents the domain-specific execution record of a **Roasting Transformation**:
- consumes one or more input `InventoryLot` instances of raw green coffee (`Material.category == RAW_COFFEE`),
- applies a parameterized `RoastProfile` process template,
- executes machine roasting parameters (charge, crack, development, drop),
- generates one or more output `InventoryLot` instances of roasted whole bean coffee (`Material.category == INTERMEDIATE`),
- records physical yield and shrinkage ($Y = Q_{\text{out}} / Q_{\text{in}}$),
- and maintains complete genealogical lineage ($L_{\text{in}} \rightarrow T \rightarrow L_{\text{out}}$).

---

# Core Philosophy

A RoastBatch is the operational execution of a physical roasting transformation.

```text
[ Input InventoryLot(s) (Raw Coffee) ]
                  │
                  ▼
      [ RoastBatch Transformation ] ── (guided by RoastProfile)
                  │
                  ▼
[ Output InventoryLot(s) (Roasted Coffee) ]
```

RoastBatch links:
1. **Master Specifications**: The green coffee `MaterialMaster` and `RoastProfileMaster`.
2. **Physical Inventory**: Input and output `InventoryLot` instances.
3. **Immutable Ledger**: Appended `InventoryMovement` records (`TRANSFORMATION_CONSUMPTION` and `TRANSFORMATION_OUTPUT`).
4. **Economic Valuation**: Evaluated strictly by `07_COSTING_ENGINE` (Equation 1).

---

# Entity Relationships

```text
RoastBatch (Transformation Execution)
 ├── references → Transformation (underlying system transformation event)
 ├── applies → RoastProfileMaster (Process Template)
 ├── consumes → InventoryLot (references input inventoryLotId instances)
 ├── produces → InventoryLot (creates output inventoryLotId instances)
 ├── generates → InventoryMovement (Ledger records for inputs and outputs)
 ├── carries → Roasting Telemetry & Sensory QC Data
 └── linksTo → Costing Engine (for output unit cost calculation U_out)
```

---

# Core Fields Specification

### Identity Fields
- `roastBatchId`: Unique canonical identifier (UUID / string).
- `batchCode`: Human-readable batch code (e.g. `RB-2026-042`).
- `batchName`: Descriptive operational name (e.g. *"Ethiopia Yirgacheffe Filter Run #3"*).
- `batchType`: Classification (`PRODUCTION_ROAST`, `SAMPLE_ROAST`, `BLEND_COMPONENT_ROAST`, `EXPERIMENTAL_ROAST`).

### Process & Template References
- `roastProfileId`: Reference to `RoastProfileMaster` (Process Template).
- `targetRoastLevel`: Descriptive roast degree target (`LIGHT`, `MEDIUM_LIGHT`, `MEDIUM`, `DARK`).
- `roasterMachineId`: Identifier of the physical roasting machine.
- `operatorId`: Identifier of the roastmaster / operator.

### Input Material & Lot References
- `inputLotId`: Canonical identifier of the consumed green coffee `InventoryLot`.
- `greenBeanMaterialId`: Canonical reference to `MaterialMaster` (`category == RAW_COFFEE`).
- `inputQuantity`: Measured physical mass loaded into hopper ($Q_{\text{in}}$).
- `inputUnitId`: UOM from `UnitMaster` (`MASS` dimension, e.g. `kg` or `g`).

### Output Material & Lot Generation
- `outputLotId`: Canonical identifier of the created roasted coffee `InventoryLot`.
- `roastedMaterialId`: Canonical reference to resulting roasted coffee `MaterialMaster`.
- `outputQuantity`: Measured physical mass dropped from cooling tray ($Q_{\text{out}}$).
- `outputUnitId`: UOM matching input dimension (`kg` or `g`).

### Physical Yield & Loss Tracking
- `yieldPercentage`: Measured physical yield ($Y = \frac{Q_{\text{out}}}{Q_{\text{in}}} \times 100\%$).
- `shrinkagePercentage`: Measured mass loss ($100\% - Y$).

### Thermal Telemetry & Roasting Observations
- `chargeTemperature`: Temperature at bean drop into drum (°C).
- `turningPointTime`: Time elapsed to turning point (seconds).
- `turningPointTemperature`: Temperature at turning point (°C).
- `firstCrackTime`: Time elapsed to start of first crack (seconds).
- `firstCrackTemperature`: Temperature at first crack (°C).
- `developmentTime`: Time from first crack to drop (seconds).
- `developmentTimeRatio`: DTR percentage ($\frac{\text{Development Time}}{\text{Total Roast Time}} \times 100\%$).
- `dropTime`: Total roast duration (seconds).
- `dropTemperature`: Temperature at discharge (°C).
- `colorAgtronWhole`: Measured whole bean Agtron / Colortrack value.
- `colorAgtronGround`: Measured ground coffee Agtron value.

### Operational Lifecycle Status
- `roastStatus`: Operational state:
  - `PLANNED`: Scheduled in roast queue.
  - `IN_PROGRESS`: Beans currently in drum / cooling tray.
  - `COMPLETED`: Roasted lot weighed, QC logged, inventory created.
  - `CANCELLED`: Batch aborted prior to drum charge.
  - `REJECTED_QC`: Output roasted lot quarantined / downgraded due to defect.

### Timestamps & Audit
- `roastDate`: Date of roasting execution.
- `startTime`: ISO 8601 start timestamp.
- `endTime`: ISO 8601 discharge timestamp.
- `notes`: Operational remarks.
- `createdAt`, `updatedAt`: ISO 8601 timestamps.

---

# Operational Execution Workflow

```text
1. Schedule Batch (Status: PLANNED)
         │
2. Stage & Weigh Green Coffee
   (Reserves quantity Q_in on input InventoryLot)
         │
3. Charge Roaster & Execute Profile (Status: IN_PROGRESS)
   (Records roast curve, first crack, DTR, drop temp)
         │
4. Discharge & Cool
         │
5. Weigh Output Mass (Q_out) & Record Agtron
         │
6. Finalize Batch (Status: COMPLETED):
   ├── Deducts Q_in from green InventoryLot via InventoryMovement [TRANSFORMATION_CONSUMPTION]
   ├── Creates new roasted InventoryLot with Q_out via InventoryMovement [TRANSFORMATION_OUTPUT]
   └── Costing Engine assigns U_out = (V_consumed + C_direct) / Q_out to the new lot
```

---

# Architectural Invariants

1. **Physical Transformation:** A RoastBatch consumes physical `InventoryLot` instances and produces physical `InventoryLot` instances.
2. **Economic Separation:** RoastBatch records physical quantities, machine hours, and fuel/labor events; the Costing Engine evaluates the economic cost pool ($V_{\text{consumed}} + C_{\text{direct}}$) and assigns $U_{\text{out}}$.
3. **Traceability Guarantee:** The output `InventoryLot` maintains an immutable lineage link back to the `RoastBatch` and its originating green coffee lots.

