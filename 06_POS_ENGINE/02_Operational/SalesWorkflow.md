# Sales Workflow

## Purpose

This document defines the operational sales workflow behavior used inside the POS Engine of Roastery OS.

The purpose of Sales Workflow is to:
- standardize commercial transaction flow,
- preserve deterministic commerce behavior,
- maintain inventory continuity via `02_INVENTORY_ENGINE`,
- support customer-facing operations,
- and provide operational commerce visibility.

Sales workflows represent:
- operational commerce orchestration.

Sales workflows define how commercial inventory operationally moves into real-world business activity.

---

# Core Philosophy

Roastery OS treats sales workflows as:
- operational commerce systems,
- inventory-connected transaction orchestration,
- and customer-facing business workflows.

Sales workflows preserve:
- inventory continuity (`InventoryLot`),
- customer continuity,
- profitability visibility (in collaboration with `07_COSTING_ENGINE`),
- and operational traceability.

---

# Workflow Stages

```text
1. Order Creation & Item Selection (SKUMaster)
       ↓
2. Inventory Availability Validation (InventoryLot state: AVAILABLE)
       ↓
3. Transaction Processing (Discounts, Promotions, Taxes)
       ↓
4. Payment Settlement (Cash, QRIS, Card, Split)
       ↓
5. Inventory Fulfillment (COMMERCIAL_DISPATCH against InventoryLot)
       ↓
6. Receipt / Invoice Generation
       ↓
7. Workflow Finalization & Analytics Signal
```

---

# Detailed Stage Execution

### 1. Order Creation
- Operator or customer selects commercial `SKUMaster` items.
- Line quantities and custom notes (e.g., grind size, packaging options) are established.
- Customer account is linked (if applicable).
- *No inventory movement occurs at this stage.*

### 2. Inventory Availability Validation
- System verifies availability of compatible `InventoryLots` (`materialType = FINISHED_GOODS` or `INTERMEDIATE` in state `AVAILABLE`).
- Verifies sufficient stock quantity across available lots.
- For e-commerce or wholesale pre-orders, optional `RESERVATION` movements can hold inventory.

### 3. Transaction Processing
- Calculates line subtotals, item-level discounts, customer membership promotions, and applicable local taxes.
- Computes final payable `grandTotal`.

### 4. Payment Settlement
- Settles financial payment via supported payment methods (`CASH`, `QRIS`, `CARD`, `BANK_TRANSFER`, `STORE_CREDIT`).
- Multi-method split payments are fully supported.
- Captures external payment gateway references.

### 5. Inventory Fulfillment
- Resolves exact fulfillment allocations to specific `InventoryLot(s)`.
- Generates immutable `COMMERCIAL_DISPATCH` / `FULFILLMENT` movements in `02_INVENTORY_ENGINE`.
- Retrieves historical unit costs ($U_{\text{lot}}$) from `07_COSTING_ENGINE` to realize COGS:
  $$\text{COGS} = \sum (Q_{\text{allocated}, i} \times U_{\text{lot}, i})$$

### 6. Receipt Generation
- Generates printed receipt, digital e-receipt, or formal wholesale B2B invoice.
- Displays commercial details (items, prices, discounts, taxes) while keeping manufacturing cost details confidential.

### 7. Workflow Finalization
- Transaction transitions to `COMPLETED`.
- Customer purchase history and loyalty points are updated.
- Sales velocity signals are broadcast to demand planning in `03_ROASTING_ENGINE` and `05_PRODUCTION_ENGINE`.

---

# Multi-Channel Workflow Support

The identical workflow stages govern all commercial sales channels:
- Counter POS (instant payment & immediate fulfillment)
- Mobile ordering (table-side checkout)
- E-Commerce storefront (online payment $\to$ picking/packing dispatch)
- Wholesale portal (order placement $\to$ credit terms / invoice $\to$ pallet dispatch)
- Recurring subscriptions (automated billing $\to$ batch roasting allocation $\to$ fulfillment dispatch)

---

# Deterministic Commerce Principle

Critical sales workflow steps remain deterministic:
- no checkout completion without validated payment and confirmed lot allocation,
- double-entry conservation across inventory and financial ledgers,
- and complete auditability of all transactions and operator actions.

---

# Philosophy Summary

Sales workflows are not mere cashier mechanics.
Sales workflows are:
- **operational commerce orchestration**,
- **the formal transition of physical inventory into customer value**,
- and **the realization of commercial revenue inside Roastery OS**.

