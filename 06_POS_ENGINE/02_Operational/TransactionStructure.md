# Transaction Structure

## Purpose

This document defines the transaction entity structure and operational transaction behavior used inside the POS Engine of Roastery OS.

The purpose of Transaction Structure is to:
- standardize commercial transaction architecture,
- preserve deterministic commerce workflows,
- maintain inventory continuity via `02_INVENTORY_ENGINE`,
- support customer-facing sales operations,
- and provide operational commerce visibility.

Transactions act as:
- operational commerce events,
- inventory fulfillment triggers,
- revenue generation events,
- and customer interaction records.

Transaction systems are one of the core operational layers inside the POS Engine.

---

# Core Philosophy

Roastery OS treats transactions as:
- operational commerce orchestration,
- business activity events,
- and inventory-connected commercial workflows.

Transactions are not merely:
- payment records,
- receipt entries,
- or cashier actions.

Transactions represent:
- commercially meaningful operational events.

The system strictly preserves:
- inventory continuity (`InventoryLot`),
- costing continuity (deferring valuation to `07_COSTING_ENGINE`),
- customer continuity,
- and transaction traceability.

---

# Transaction Philosophy

Traditional POS systems commonly interpret transactions as:

```text
Payment = Completed Transaction
```

Roastery OS uses a commerce-oriented transaction model:

```text
Commercial Transaction
       ↓
Inventory Fulfillment Event (COMMERCIAL_DISPATCH against InventoryLot)
       ↓
Cost Realization Event (COGS from 07_COSTING_ENGINE)
       ↓
Customer Relationship Record
       ↓
Operational Intelligence Signal
```

Transactions preserve:
- operational meaning,
- physical inventory continuity,
- and commercial revenue visibility.

---

# Core Transaction Principle

Every transaction preserves:
- unique transaction identity,
- physical `InventoryLot` fulfillment relationships,
- payment settlement continuity,
- customer relationship continuity,
- and commercial revenue/margin visibility.

Example:
```text
InventoryLot (Physical stock instance)
       ↓ Commercial Sale (SKUMaster checkout)
Inventory Fulfillment (COMMERCIAL_DISPATCH movement)
       ↓
Revenue & Cost Realization (COGS via 07_COSTING_ENGINE)
       ↓
Customer Relationship History
```

Transaction systems remain:
- deterministic,
- traceable,
- and operationally understandable.

---

# Transaction Entity Structure

### Purpose
Represents a completed or active commercial commerce event.
Transaction acts as:
- commercial workflow entity,
- operational sales record,
- and inventory-connected commerce structure.

---

### Core Fields

#### 1. Identity Fields
- `transactionId` (UUID)
- `transactionCode` (e.g., `TRX-20260521-001`)
- `transactionType` (`RETAIL_SALE`, `WHOLESALE_SALE`, `ONLINE_ORDER`, `SUBSCRIPTION_SALE`, `MARKETPLACE_SALE`)
- `salesChannel` (`POS_COUNTER`, `MOBILE_POS`, `WEB_STORE`, `MARKETPLACE`, `WHOLESALE_PORTAL`)

#### 2. Customer Fields
- `customerId` (UUID, optional for anonymous walk-ins)
- `customerName` (String)
- `customerType` (`WALK_IN`, `MEMBER`, `WHOLESALE_CLIENT`, `SUBSCRIBER`, `MARKETPLACE_BUYER`)
- `customerReference` (External ID / Phone / Email)

#### 3. Transaction Item Fields (`transactionItems[]`)
Each line item represents a commercial product sold and its underlying physical fulfillment:
- `transactionItemId` (UUID)
- `skuId` (UUID, references `SKUMaster`)
- `materialId` (UUID, references `MaterialMaster`)
- `orderedQuantity` (Decimal)
- `uom` (UoM code, e.g., `UNIT`, `KG`, `G`, `BOTTLE`)
- `unitPrice` (Decimal, selling price per unit)
- `discountAmount` (Decimal)
- `taxAmount` (Decimal)
- `lineSubtotal` (Decimal)
- `fulfillmentAllocations[]`: Array supporting 1:N lot fulfillment:
  - `inventoryLotId` (UUID, references `InventoryLot`)
  - `allocatedQuantity` (Decimal)
  - `inventoryMovementId` (UUID, references `COMMERCIAL_DISPATCH` in `02_INVENTORY_ENGINE`)
  - `unitCost` (Decimal, historical unit cost resolved from `07_COSTING_ENGINE` at dispatch)
  - `cogsAmount` (Decimal, $\text{allocatedQuantity} \times \text{unitCost}$)

#### 4. Pricing & Total Fields
- `subtotal` (Sum of line subtotals before transaction-level adjustments)
- `transactionDiscountAmount` (Transaction-level discount)
- `taxTotal` (Aggregated tax)
- `serviceCharge` (Optional dine-in or handling charge)
- `grandTotal` (Final payable amount)

#### 5. Costing & Profitability Summary Fields (Integration with `07_COSTING_ENGINE`)
- `totalCOGS` (Sum of all line item `cogsAmount` derived from `07_COSTING_ENGINE`)
- `grossProfit` ($\text{grandTotal} - \text{taxTotal} - \text{totalCOGS}$)
- `grossMarginPercentage` ($\frac{\text{grossProfit}}{\text{grandTotal} - \text{taxTotal}} \times 100$)

*Note: The POS Engine records commercial transaction values and receives lot unit costs from `07_COSTING_ENGINE`; POS does not calculate inventory valuations independently.*

#### 6. Payment Fields (`payments[]`)
- `paymentId` (UUID)
- `paymentMethod` (`CASH`, `QRIS`, `DEBIT_CARD`, `CREDIT_CARD`, `BANK_TRANSFER`, `STORE_CREDIT`)
- `paymentStatus` (`PENDING`, `PARTIALLY_PAID`, `PAID`, `REFUNDED`, `FAILED`)
- `paymentReference` (Gateway ref / approval code / external trace)
- `paidAmount` (Decimal)
- `changeAmount` (Decimal, for cash)
- `settledAt` (Timestamp)

#### 7. Operational & Audit Fields
- `operatorId` (UUID, cashier / user)
- `shiftId` (UUID, POS register shift)
- `transactionStatus` (`DRAFT`, `PENDING_PAYMENT`, `COMPLETED`, `CANCELLED`, `REFUNDED`, `ARCHIVED`)
- `transactionTimestamp` (Timestamp)
- `completedAt` (Timestamp)
- `notes` (String)
- `createdAt` / `updatedAt` (Timestamps)

---

# Transaction vs Payment Principle

Roastery OS strictly separates transactions from payments:

$$\text{Transaction} \neq \text{Payment}$$

- **Transaction:** Represents commercial commerce activity, items purchased, and inventory fulfillment obligations.
- **Payment:** Represents financial settlement mechanism. A single transaction may be settled with split payments or delayed settlement (e.g., wholesale invoices) without corrupting commerce continuity.

---

# Transaction vs Inventory Principle

$$\text{Transaction} \neq \text{Inventory}$$

Transactions trigger physical inventory fulfillment, but inventory continuity and state transitions remain strictly managed by `02_INVENTORY_ENGINE`. The POS Engine issues `COMMERCIAL_DISPATCH` ledger movements against compatible `InventoryLots`.

---

# Transaction vs SKU Principle

$$\text{SKUMaster} \neq \text{InventoryLot}$$

- `SKUMaster` represents commercial catalog presentation and retail pricing.
- `InventoryLot` represents physical stock on hand.
- A single transaction line item for an SKU can be fulfilled from multiple physical `InventoryLots` (e.g., fulfilling 10 bags of House Blend from Lot #A [4 bags] and Lot #B [6 bags]).

---

# Transaction Lifecycle

Transactions evolve through deterministic operational states:

```text
DRAFT
  ↓
PENDING_PAYMENT
  ↓ (Payment settled & Inventory dispatched)
COMPLETED
  ↓ (If return occurs)
REFUNDED / PARTIALLY_REFUNDED
  ↓
ARCHIVED
```

---

# Multi-Channel Transaction Principle

The same transaction architecture supports all sales channels:
- Retail café counter checkout
- Mobile table-side ordering
- Online e-commerce orders
- Wholesale client invoicing
- Recurring subscription shipments

---

# Costing & Traceability Provenance

1. **COGS Provenance:** COGS is not estimated or invented by the POS. It is calculated by multiplying the exact fulfilled quantities by the historical unit cost ($U_{\text{lot}}$) of the consumed `InventoryLots` provided by `07_COSTING_ENGINE`.
2. **Traceability Lineage:** Every line item's `fulfillmentAllocations[]` points back to specific `InventoryLots`, preserving the complete genealogical lineage back through `ProductionBatch`, `BlendBatch`, `RoastBatch`, and green coffee harvest lots.

---

# Human-Centered & Deterministic Principles

- POS operations provide immediate, intuitive workflows for cashiers and baristas.
- Critical commerce behaviors (deductions, payments, reversals) remain strictly deterministic, double-entry auditable, and immutable once completed.

---

# Philosophy Summary

Transactions are not mere receipt records.
Transactions are:
- **operational commerce events**,
- **inventory fulfillment triggers**,
- and **the commercial realization of specialty coffee value inside Roastery OS**.

