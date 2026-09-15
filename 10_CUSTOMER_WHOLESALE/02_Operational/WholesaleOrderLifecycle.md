# Wholesale Order Lifecycle & Fulfillment Contract

## Purpose

This document defines the concrete operational contract and lifecycle state machine for wholesale orders (`WholesaleOrder`) and their fulfillment execution inside `10_CUSTOMER_WHOLESALE` in Roastery OS.

The purpose of this operational contract is to:
- Establish a deterministic commercial-to-physical order and fulfillment lifecycle.
- Define the `WholesaleOrder`, `WholesaleOrderLine`, and `FulfillmentAllocation` entity models.
- Support multi-lot physical fulfillment ($1 \text{ SKU Line} \rightarrow N \text{ InventoryLots}$) aligned with the canonical Roastery OS inventory model.
- Support partial fulfillment, backorders, cancellations, and returns.
- Enforce strict architectural boundaries with `01_MASTER_DATA`, `02_INVENTORY_ENGINE`, `06_POS_ENGINE`, `07_COSTING_ENGINE`, `08_BATCH_TRACEABILITY`, and `09_SUPPLIER_SYSTEM`.

---

# 1. Architectural Boundaries

`10_CUSTOMER_WHOLESALE` operates as the commercial B2B relationship and demand layer. It strictly respects existing engine ownership:

| Engine | Ownership Scope | Explicit Non-Ownership |
| :--- | :--- | :--- |
| **`10_CUSTOMER_WHOLESALE`** | Wholesale customer accounts, commercial agreements, wholesale price lists/tiers, payment terms (e.g., Net 30), wholesale order lifecycle, wholesale demand signals. | Does **NOT** manage physical stock balances, physical stock movements, register shifts, or independent inventory valuation/HPP. |
| **`01_MASTER_DATA`** | Master definitions for `MaterialMaster`, `ProductMaster`, and `SKUMaster`. | Wholesale consumes SKU/Product definitions; does not create wholesale-specific SKU entities. |
| **`02_INVENTORY_ENGINE`** | Physical inventory stock levels, reservations, physical allocations, depletions, dispatch movements, return restorations. | Wholesale requests reservations and records commercial intent; Inventory Engine executes physical state changes. |
| **`06_POS_ENGINE`** | Retail/direct sales, counter checkouts, register sessions, and immediate point-of-sale tenders. | Wholesale is **NOT** a POS register session. Wholesale handles B2B commercial terms, credit billing, and scheduled wholesale fulfillment. |
| **`07_COSTING_ENGINE`** | Inventory lot valuation, Historical Cost of Production (HPP), and Cost of Goods Sold (COGS). | Wholesale determines commercial selling prices and discounts; Costing Engine provides underlying economic lot costs. |
| **`08_BATCH_TRACEABILITY`** | Historical physical provenance, transformation genealogy, and batch recall audit trails. | Wholesale links commercial order lines to fulfilled `InventoryLot` instances for end-to-end downstream traceability. |
| **`09_SUPPLIER_SYSTEM`** | Inbound vendor relationships, raw material procurement contracts, and inbound purchase receiving. | Wholesale handles outbound customer relationships and demand signals; does not duplicate supplier procurement. |

---

# 2. Wholesale Order Data Structure

A `WholesaleOrder` represents a commercial B2B sales agreement and fulfillment directive.

```text
WholesaleOrder
├── Identity & Commercial Terms (orderId, customerId, status, terms)
└── Order Lines (WholesaleOrderLine[])
    ├── skuId (from 01_MASTER_DATA)
    ├── orderedQuantity & uom
    ├── wholesalePrice (commercial selling price)
    └── Fulfillment Allocations (FulfillmentAllocation[])
        ├── inventoryLotId (from 02_INVENTORY_ENGINE)
        ├── allocatedQuantity
        ├── inventoryMovementId (COMMERCIAL_DISPATCH)
        └── unitCost / cogsAmount (derived from 07_COSTING_ENGINE)
```

### 2.1 WholesaleOrder Entity Specification

```json
{
  "orderId": "UUID",
  "orderNumber": "WO-2026-0042",
  "customerId": "UUID",
  "orderDate": "2026-09-14T09:00:00Z",
  "requestedFulfillmentDate": "2026-09-18T12:00:00Z",
  "orderStatus": "DRAFT | CONFIRMED | RESERVED | PARTIALLY_FULFILLED | FULFILLED | DISPATCHED | COMPLETED | CANCELLED | REJECTED",
  "commercialTerms": {
    "priceTierId": "UUID",
    "paymentTerms": "NET_30 | NET_15 | DUE_ON_RECEIPT | PREPAYMENT",
    "creditLimit": 50000000.00,
    "currency": "IDR",
    "taxScheme": "PPN_11"
  },
  "billingAddress": {
    "street": "Jl. Senopati No. 45",
    "city": "Jakarta Selatan",
    "postalCode": "12190"
  },
  "shippingAddress": {
    "destinationName": "Senopati Roastery Cafe",
    "street": "Jl. Senopati No. 45",
    "city": "Jakarta Selatan",
    "contactPerson": "Manager Budi",
    "contactPhone": "+6281122334455"
  },
  "lineItems": [
    {
      "orderLineId": "UUID",
      "skuId": "UUID",
      "materialId": "UUID",
      "orderedQuantity": 50.0,
      "fulfilledQuantity": 50.0,
      "remainingQuantity": 0.0,
      "uom": "KG",
      "unitWholesalePrice": 220000.00,
      "discountAmount": 0.00,
      "taxAmount": 1210000.00,
      "lineSubtotal": 11000000.00,
      "lineStatus": "FULFILLED",
      "fulfillmentAllocations": [
        {
          "allocationId": "UUID",
          "inventoryLotId": "LOT-ROAST-20260912-001",
          "allocatedQuantity": 30.0,
          "uom": "KG",
          "inventoryMovementId": "MOV-DISP-20260914-089",
          "unitCost": 145000.00,
          "cogsAmount": 4350000.00,
          "allocatedAt": "2026-09-14T14:30:00Z"
        },
        {
          "allocationId": "UUID",
          "inventoryLotId": "LOT-ROAST-20260913-004",
          "allocatedQuantity": 20.0,
          "uom": "KG",
          "inventoryMovementId": "MOV-DISP-20260914-090",
          "unitCost": 148000.00,
          "cogsAmount": 2960000.00,
          "allocatedAt": "2026-09-14T14:30:00Z"
        }
      ]
    }
  ],
  "financialSummary": {
    "subtotal": 11000000.00,
    "discountTotal": 0.00,
    "taxTotal": 1210000.00,
    "grandTotal": 12210000.00,
    "totalCOGS": 7310000.00,
    "grossProfit": 3690000.00,
    "grossMarginPercentage": 33.55
  },
  "audit": {
    "createdBy": "UUID",
    "confirmedBy": "UUID",
    "dispatchedBy": "UUID",
    "createdAt": "2026-09-14T09:00:00Z",
    "updatedAt": "2026-09-14T14:35:00Z"
  }
}
```

---

# 3. Operational Order Lifecycle State Machine

The wholesale order lifecycle governs commercial commitment, inventory reservation, physical fulfillment, delivery dispatch, financial settlement, and exception handling:

```text
               ┌─────────────┐
               │    DRAFT    │
               └──────┬──────┘
                      │ Customer confirms order
                      ▼
               ┌─────────────┐
               │  CONFIRMED  │ ────── (Unfulfillable / Credit Reject) ──► ┌──────────┐
               └──────┬──────┘                                            │ REJECTED │
                      │ Request Reservation via 02_INVENTORY_ENGINE       └──────────┘
                      ▼
               ┌─────────────┐
               │  RESERVED   │ ────── (Cancelled before dispatch) ─────► ┌───────────┐
               └──────┬──────┘                                            │ CANCELLED │
                      │ Fulfillment Allocation (Physical picking)         └───────────┘
                      ├──► [Full Stock Available]  ──► ┌───────────┐
                      │                                │ FULFILLED │
                      └──► [Partial Stock Available]──► ┌───────────┴──────────┐
                                                        │ PARTIALLY_FULFILLED  │
                                                        │ (Backorder created)  │
                                                        └───────────┬──────────┘
                                                                    │
                      ┌─────────────────────────────────────────────┘
                      ▼
               ┌─────────────┐
               │ DISPATCHED  │ ◄─── Physical dispatch via 02_INVENTORY_ENGINE
               └──────┬──────┘
                      ├──► [Goods Accepted & Invoice Incurred] ──► ┌───────────┐
                      │                                            │ COMPLETED │
                      │                                            └───────────┘
                      └──► [Return / Refusal] ───────────────────► ┌───────────┐
                                                                   │ RETURNED  │
                                                                   └───────────┘
```

### 3.1 Lifecycle States and Transitions

1. **`DRAFT`**
   - **Trigger:** Sales representative or customer creates a quote or draft order.
   - **Invariants:** No stock is reserved. No accounting or commercial liability is created. Lines can be modified freely.
2. **`CONFIRMED`**
   - **Trigger:** Customer places/confirms the commercial order; credit check passes against terms.
   - **Action:** Generates a soft demand signal. If inventory is immediately ready, prompts reservation request.
3. **`RESERVED`**
   - **Trigger:** Wholesale requests inventory reservation from `02_INVENTORY_ENGINE`.
   - **Action:** `02_INVENTORY_ENGINE` places a reservation hold on compatible `InventoryLot` instances. Stock availability is guaranteed for this customer order.
4. **`PARTIALLY_FULFILLED`**
   - **Trigger:** Available lot stock is less than ordered quantity, or staggered shipment is requested.
   - **Action:** Allocated lines record exact fulfilled lots. Remaining unallocated quantities generate backorders or trigger replenishment/production requests to `05_PRODUCTION_ENGINE`.
5. **`FULFILLED`**
   - **Trigger:** 100% of order line quantities have physical `InventoryLot` allocations assigned in staging/packing.
6. **`DISPATCHED`**
   - **Trigger:** Order physically leaves the roastery/warehouse facility.
   - **Action:** `02_INVENTORY_ENGINE` executes `COMMERCIAL_DISPATCH` inventory movements, depleting physical stock. Unit costs ($U_{\text{lot}}$) are stamped from `07_COSTING_ENGINE` to compute realized COGS. Delivery note / Surat Jalan is issued.
7. **`COMPLETED`**
   - **Trigger:** Customer acknowledges delivery receipt, and commercial invoice is settled or posted to accounts receivable.
8. **`CANCELLED`**
   - **Trigger:** Customer or roastery cancels the order prior to dispatch.
   - **Action:** If in `RESERVED` state, `10_CUSTOMER_WHOLESALE` sends a release request to `02_INVENTORY_ENGINE` to release stock holds. No physical depletion occurs.
9. **`REJECTED`**
   - **Trigger:** Credit check failure, unresolvable supply constraint, or commercial term breach.
10. **`RETURNED`**
    - **Trigger:** Customer returns delivered goods (e.g., damaged transit, defective seal, commercial return).
    - **Action:** Wholesale records commercial credit/refund. `02_INVENTORY_ENGINE` inspects and records restoration movement (`RESTOCK` into quarantine or active lot). `08_BATCH_TRACEABILITY` logs reverse provenance.

---

# 4. Multi-Lot Fulfillment Model

A single `WholesaleOrderLine` for a commercial `SKUMaster` can be fulfilled across **multiple physical `InventoryLot` instances**.

$$\text{WholesaleOrderLine.orderedQuantity} = \sum_{k=1}^{n} \text{FulfillmentAllocation}[k].\text{allocatedQuantity} + \text{remainingQuantity}$$

### 4.1 Multi-Lot Allocation Mechanics

```text
WholesaleOrderLine: 50 kg "Signature House Blend - 1kg Bag" (SKU-HB-1KG)
├── FulfillmentAllocation #1:
│   ├── inventoryLotId: LOT-ROAST-20260912-001
│   ├── allocatedQuantity: 30 kg
│   ├── inventoryMovementId: MOV-DISP-20260914-089 (02_INVENTORY_ENGINE)
│   └── unitCost: IDR 145,000 / kg (07_COSTING_ENGINE)
└── FulfillmentAllocation #2:
    ├── inventoryLotId: LOT-ROAST-20260913-004
    ├── allocatedQuantity: 20 kg
    ├── inventoryMovementId: MOV-DISP-20260914-090 (02_INVENTORY_ENGINE)
    └── unitCost: IDR 148,000 / kg (07_COSTING_ENGINE)
```

- Each allocation explicitly records its `inventoryLotId` and `allocatedQuantity`.
- Traceability remains 100% granular per physical lot.
- Multi-lot fulfillment avoids forcing artificial 1:1 constraints between sales lines and physical roast/packaging batches.

---

# 5. Pricing vs. Costing Architecture

`10_CUSTOMER_WHOLESALE` governs commercial pricing, while strictly delegating valuation and cost calculation to `07_COSTING_ENGINE`:

```text
               ┌──────────────────────────────┐
               │    10_CUSTOMER_WHOLESALE     │
               │  Owns Selling Price & Terms  │
               └──────────────┬───────────────┘
                              │ unitWholesalePrice × orderedQuantity = Revenue
                              ▼
                      Commercial Invoicing
                              ▲
                              │ unitCost × allocatedQuantity = COGS
               ┌──────────────┴───────────────┐
               │      07_COSTING_ENGINE       │
               │   Owns Lot Valuation & COGS  │
               └──────────────────────────────┘
```

1. **Commercial Selling Price ($P_{\text{wholesale}}$):**
   - Determined by `10_CUSTOMER_WHOLESALE` based on customer tier, contractual volume commitment, or promotional agreement.
2. **Economic Lot Cost ($U_{\text{lot}}$):**
   - Owned solely by `07_COSTING_ENGINE`, derived from green bean purchase cost, roasting shrink/yield, packaging materials, and direct labor overhead.
3. **Realized Gross Margin:**
   $$\text{Gross Profit} = \text{Selling Price (excl. Tax)} - \sum (\text{Allocated Qty}_i \times U_{\text{lot}, i})$$
   $$\text{Gross Margin \%} = \frac{\text{Gross Profit}}{\text{Selling Price (excl. Tax)}} \times 100$$
- `10_CUSTOMER_WHOLESALE` never calculates or invents inventory valuation formulas.

---

# 6. Demand & Production Planning Boundary

Wholesale customer ordering patterns generate critical operational signals:

```text
Wholesale Demand Signal (Forecast / Confirmed Order)
       ↓ (Demand Signal Handoff)
05_PRODUCTION_ENGINE (Production Planning & Batch Scheduling)
       ↓ (Transformation Execution)
02_INVENTORY_ENGINE (Creates / Updates Canonical InventoryLots)
       ↓ (Reservation & Fulfillment Allocation)
10_CUSTOMER_WHOLESALE (Fulfillment Allocation)
```

- **Rule:** Wholesale demand **NEVER** creates inventory directly.
- **Rule:** Wholesale orders **CANNOT** bypass `05_PRODUCTION_ENGINE` (for transformation) or `02_INVENTORY_ENGINE` (for physical stock generation).
- Wholesale demand serves as an advisory or planning input into production scheduling and raw material procurement.

---

# 7. Downstream Batch Traceability Integration

For every dispatched wholesale order, `08_BATCH_TRACEABILITY` provides complete backward and forward genealogy:

```text
WholesaleCustomer (Delivery Target)
       ▲
WholesaleOrder (Commercial Agreement)
       ▲
FulfillmentAllocation (Physical Dispatch Event)
       ▲
InventoryLot (Finished Coffee Stock)
       ▲
Transformation / Batch (Roast / Blend / Packaging)
       ▲
Upstream InventoryLot(s) (Green Coffee / Raw Materials)
       ▲
Supplier System (Vendor / Farm / Inbound PO)
```

If a quality incident occurs on a specific harvest lot or roast batch, the roastery can query downstream traceability to identify every `WholesaleOrder`, `FulfillmentAllocation`, and `Customer` that received stock from that `InventoryLot`.

---

# 8. Summary Checklist

- [x] Concrete order lifecycle states (`Draft` $\rightarrow$ `Confirmed` $\rightarrow$ `Reserved` $\rightarrow$ `Fulfilled` $\rightarrow$ `Dispatched` $\rightarrow$ `Completed`, plus cancellations, backorders, and returns).
- [x] Canonical `WholesaleOrder` structure referencing `skuId` and multi-lot `FulfillmentAllocation`.
- [x] Multi-lot allocation ($1 \text{ SKU line} \rightarrow N \text{ InventoryLots}$).
- [x] Inventory ownership strictly in `02_INVENTORY_ENGINE`.
- [x] Retail POS ownership strictly in `06_POS_ENGINE`.
- [x] Costing and valuation strictly in `07_COSTING_ENGINE`.
- [x] Downstream physical provenance strictly in `08_BATCH_TRACEABILITY`.
- [x] Wholesale demand never directly generates inventory.
