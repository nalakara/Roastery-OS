# Inventory Movement

## Purpose

This document defines the inventory movement ledger system used across Roastery OS.

The purpose of the Inventory Movement system is to:
- preserve immutable inventory transaction history,
- track physical quantity changes ($\Delta Q$) across `InventoryLot` instances,
- maintain transformation traceability and operational accountability,
- support deterministic stock balancing,
- and provide complete auditable records for operations, costing, and compliance.

Inventory movements act as the **immutable operational event ledger** of the inventory system. Physical inventory quantities are modified strictly through `InventoryMovement` records.

---

# Core Philosophy

InventoryMovement represents:
- operational events,
- transformation inputs and outputs,
- physical location transfers,
- exceptional inventory adjustments,
- and commercial sales fulfillments.

Every inventory movement record is **immutable**: it is appended to the ledger and never updated or deleted in place.

---

# Entity Relationships

```text
InventoryMovement
 ├── mutates → InventoryLot (references inventoryLotId)
 ├── references → Material (references materialId from MaterialMaster)
 ├── references → Unit (references unitId from UnitMaster)
 ├── triggeredBy → Operational Event (Transformation, PurchaseReceipt, SalesFulfillment, Adjustment)
 └── providesDataTo → Costing Engine & Inventory Balancing
```

---

# Core Fields Specification

### Identity Fields
- `inventoryMovementId`: Unique canonical movement identifier (UUID / string).
- `movementCode`: Human-readable reference code (e.g. `MOV-2026-00421`).
- `movementType`: Specific operational classification:
  - `PURCHASE_RECEIPT`: Inbound receiving from supplier creating a new `InventoryLot`.
  - `TRANSFORMATION_CONSUMPTION`: Consumption of quantity as `TransformationInput`.
  - `TRANSFORMATION_OUTPUT`: Creation of new stock as `TransformationOutput`.
  - `INTERNAL_TRANSFER`: Movement of a lot between warehouses/bins/tanks without material change.
  - `COMMERCIAL_FULFILLMENT`: Depletion of lot quantity to fulfill a commercial `SKU` sale.
  - `INVENTORY_ADJUSTMENT`: Explicit correction for damage, spoilage, shrinkage, or audit reconciliation.
  - `LOT_SPLIT`: Administrative partition of one lot into multiple child lots.

### Target Inventory References
- `inventoryLotId`: Canonical identifier of the affected `InventoryLot`.
- `lotCode`: Snapshot of human-readable lot code.
- `materialId`: Reference to `MaterialMaster` for the physical item.
- `locationId`: Reference to the physical warehouse/bin location involved.

### Quantity & Direction Fields
- `movementDirection`: Direction of physical change (`IN` | `OUT`).
- `quantity`: Positive scalar magnitude of change ($\Delta Q > 0$).
- `unitId`: Unit of Measure from `UnitMaster`, dimensionally matching the target `InventoryLot`.
- `previousQuantity`: Snapshot of lot balance before movement ($Q_{\text{prev}}$).
- `resultingQuantity`: Snapshot of lot balance after movement ($Q_{\text{prev}} \pm \Delta Q$).

### Event & Source Reference Fields
- `sourceEventType`: Originating business process (`PURCHASE_ORDER`, `TRANSFORMATION`, `SALES_ORDER`, `ADJUSTMENT_RECORD`).
- `sourceEventId`: Identifier of originating transaction (e.g. `transformationId`, `purchaseOrderId`, `orderId`).
- `relatedBatchId`: Optional batch reference for roastery operations.
- `movementReason`: Human-readable explanation of movement trigger.

### Cost & Valuation Snapshots
- `unitCostSnapshot`: Economic unit cost ($U_{\text{lot}}$) at the moment of movement.
- `totalCostImpact`: Total economic value of the movement ($\Delta Q \times U_{\text{lot}}$).

### Audit & Operational Metadata
- `movementTimestamp`: ISO 8601 timestamp of operational event execution.
- `performedBy`: User / operator identifier.
- `notes`: Operational or quality remarks.

---

# Standard Operational Movement Patterns

### 1. Inbound Purchase Receipt
```text
Supplier Receipt ──► Creates InventoryLot #LOT-GB-001 (Q = 100 kg)
                       └── Generates InventoryMovement [Type: PURCHASE_RECEIPT, Direction: IN, Quantity: +100 kg]
```

### 2. Transformation Execution (Roasting, Blending, Packaging, Extraction)
```text
Transformation Event (Roasting)
 ├── Input Movement:  InventoryLot #LOT-GB-001 [Type: TRANSFORMATION_CONSUMPTION, Direction: OUT, Quantity: -100 kg]
 └── Output Movement: InventoryLot #LOT-RB-001 [Type: TRANSFORMATION_OUTPUT, Direction: IN, Quantity: +84 kg]
```

### 3. Commercial SKU Fulfillment
```text
Sales Order Line Item (SKU: HB-250G-WB, Count: 2 Bags)
 └── Fulfill from InventoryLot #LOT-PKG-HB-01
      └── Generates InventoryMovement [Type: COMMERCIAL_FULFILLMENT, Direction: OUT, Quantity: -2 units]
```

### 4. Exceptional Inventory Adjustment
```text
Inventory Audit / Damage Record
 └── InventoryLot #LOT-RB-001
      └── Generates InventoryMovement [Type: INVENTORY_ADJUSTMENT, Direction: OUT, Quantity: -0.5 kg, Reason: "Grinder Spillage"]
```

---

# Architectural Invariants

1. **Immutable Ledger:** Movement records cannot be updated or deleted. Corrections must be made by appending compensating movements.
2. **Quantity Determinism:** The current physical quantity of any `InventoryLot` is mathematically equal to the algebraic sum of all its movements:
   $$Q_{\text{lot}} = \sum \Delta Q_{\text{IN}} - \sum \Delta Q_{\text{OUT}}$$
3. **Dimensional Integrity:** Movements must strictly match the dimensional category (`MASS`, `VOLUME`, `COUNT`) of the target `InventoryLot`.
4. **Separation of Economic and Physical Concerns:** Inventory movements record physical quantities and snapshot unit costs; the Costing Engine evaluates cost pool accumulations and allocations.


