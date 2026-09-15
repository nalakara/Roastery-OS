# Inventory Adjustment

## Purpose

This document defines the inventory adjustment philosophy and operational adjustment behavior used across Roastery OS.

The purpose of Inventory Adjustment is to:
- preserve physical inventory accuracy,
- record exceptional non-transformation quantity changes (shrinkage, damage, spoilage, physical count reconciliation),
- maintain operational transparency and human accountability,
- and ensure all corrections generate auditable `InventoryMovement` records without silent data mutation.

Inventory adjustments are treated as **exceptional operational corrections**, distinct from standard production transformations.

---

# Core Philosophy: Adjustment vs. Transformation Yield

Roastery OS strictly distinguishes between **natural process yield loss** and **exceptional inventory adjustments**:

| Dimension | Transformation Yield Loss | Inventory Adjustment |
| :--- | :--- | :--- |
| **Trigger** | Execution of a planned physical `Transformation` (e.g. moisture loss during roasting, extraction residue). | Exceptional physical deviation (e.g. bag dropped, water leak, count discrepancy during cycle count). |
| **Governing Entity** | `Transformation` & Yield Mathematics ($Y = Q_{\text{out}} / Q_{\text{in}}$). | `InventoryAdjustment` & `InventoryMovement`. |
| **Cost Treatment** | Absorbed directly into output lot unit cost ($U_{\text{out}} = C_{\text{total}} / Q_{\text{out}}$) via Costing Equation 1. | Value written off as unrecovered loss / shrinkage expense via Costing Engine. |
| **Frequency** | Standard operational occurrence on every production run. | Exceptional operational deviation subject to review/approval. |

---

# Entity Relationships

```text
InventoryAdjustment
 ├── targets → InventoryLot (references inventoryLotId)
 ├── references → Material (references materialId from MaterialMaster)
 ├── references → Unit (references unitId from UnitMaster)
 ├── generates → InventoryMovement (Type: INVENTORY_ADJUSTMENT)
 └── notifies → Costing Engine (for asset valuation write-off / adjustment)
```

---

# Core Fields Specification

### Identity Fields
- `inventoryAdjustmentId`: Unique canonical adjustment identifier (UUID / string).
- `adjustmentCode`: Human-readable reference code (e.g. `ADJ-2026-00014`).
- `adjustmentType`: Operational classification:
  - `DAMAGE`: Physical destruction or contamination (dropped bag, torn pouch).
  - `SHRINKAGE_UNEXPLAINED`: Unexplained physical discrepancy discovered during stock check.
  - `SPOILAGE_EXPIRATION`: Shelf-life expiration (e.g. expired RTD beverage lot).
  - `AUDIT_CORRECTION`: Reconciliation following physical cycle count / wall-to-wall audit.
  - `INTERNAL_SAMPLE`: Quality control cupping, sensory testing, or promotional tasting deduction.

### Target Inventory References
- `inventoryLotId`: Canonical identifier of target `InventoryLot`.
- `lotCode`: Snapshot of target lot code.
- `materialId`: Canonical `MaterialMaster` reference.
- `locationId`: Physical location where adjustment occurred.

### Quantity Adjustment Fields
- `adjustmentDirection`: Direction of adjustment (`INCREASE` | `DECREASE`).
- `quantityDifference`: Scalar magnitude of adjustment ($\Delta Q > 0$).
- `unitId`: Standardized Unit of Measure matching target `InventoryLot`.
- `previousQuantity`: Lot quantity immediately prior to adjustment ($Q_{\text{prev}}$).
- `resultingQuantity`: Lot quantity immediately following adjustment ($Q_{\text{prev}} \pm \Delta Q$).

### Reason & Accountability Fields
- `adjustmentReason`: High-level operational reason category.
- `adjustmentDescription`: Mandatory textual narrative explaining why the adjustment occurred.
- `performedBy`: User / operator executing the physical adjustment.
- `approvedBy`: Manager / supervisor authorizing the adjustment.
- `approvalStatus`: Status (`PENDING`, `APPROVED`, `REJECTED`).
- `adjustmentTimestamp`: ISO 8601 timestamp.

### Costing Snapshot
- `unitCostSnapshot`: Economic unit cost of the lot at the time of adjustment ($U_{\text{lot}}$).
- `totalFinancialImpact`: Total monetary value written off or adjusted ($\Delta Q \times U_{\text{lot}}$).

---

# Operational Adjustment Workflow

```text
1. Physical Discrepancy Discovered
         │
2. Create InventoryAdjustment Record
   (Captures lotId, deltaQuantity, reason, narrative, operator)
         │
3. Manager Approval (if required by threshold)
         │
4. Execute Adjustment:
   ├── Mutates InventoryLot.quantity (Q_new = Q_prev ± deltaQuantity)
   ├── Appends immutable InventoryMovement [Type: INVENTORY_ADJUSTMENT]
   └── Informs Costing Engine (records inventory write-off expense)
```

---

# Architectural Invariants

1. **No Silent Stock Editing:** Direct in-place mutation of `InventoryLot.quantity` without an accompanying `InventoryAdjustment` and `InventoryMovement` record is strictly prohibited.
2. **Deterministic Ledger Traceability:** Every adjustment must be traceable to a specific operator, timestamp, and human-readable narrative.
3. **Dimensional Integrity:** Adjustments must strictly use the dimensional category (`MASS`, `VOLUME`, `COUNT`) of the target `InventoryLot`.
4. **Separation from Process Yield:** Operational process shrinkage (e.g. roasting mass loss) must never be recorded as an inventory adjustment; it is modeled via `TransformationOutput` yield mathematics.

