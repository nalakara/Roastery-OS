# Sales & Commercial Analytics

## Purpose

This document defines the operational specification for sales, commercial performance, and revenue analytics inside `11_ANALYTICS` of Roastery OS.

The purpose of Sales & Commercial Analytics is to:
- Provide unified, explainable commercial intelligence across all sales channels.
- Consume commercial transaction facts from `06_POS_ENGINE` (retail/direct sales) and `10_CUSTOMER_WHOLESALE` (B2B wholesale orders).
- Derive commercial profitability metrics by combining commercial revenue with authoritative Cost of Goods Sold (COGS) from `07_COSTING_ENGINE`.
- Maintain strict non-ownership boundaries: Analytics does not own order state machines, register sessions, tender execution, or pricing formulas.

---

# 1. Architectural Role & Invariants

```text
  06_POS_ENGINE               10_CUSTOMER_WHOLESALE          07_COSTING_ENGINE
(Retail Transactions)          (Wholesale Orders)           (Lot Valuation & COGS)
          │                              │                             │
          └──────────────────────┬───────┘                             │
                                 ▼                                     ▼
                     ┌───────────────────────────────────────────────────┐
                     │              11_ANALYTICS                         │
                     │       (Sales & Commercial Read-Model)             │
                     └───────────────────────────────────────────────────┘
```

1. **Read-Model Only:** Analytics consumes immutable commercial facts from source engines. It never alters transaction states, reserves inventory, or processes payments.
2. **Channel Separation:** Retail POS sales and Wholesale B2B contracts are distinct analytical dimensions originating from separate authoritative modules.
3. **Derived Economic Realization:**
   $$\text{Gross Commercial Margin} = \text{Commercial Revenue (excl. tax)} - \text{Realized COGS (from 07_COSTING_ENGINE)}$$
   Analytics derives this commercial metric without recalculating lot unit values or altering costing policies.

---

# 2. Master Data Dimensions

Commercial analytics aggregates data across distinct master entities from `01_MASTER_DATA`:

| Dimension | Domain Entity | Analytical Role |
| :--- | :--- | :--- |
| **Material Dimension** | `MaterialMaster` | Physical raw material and coffee bean consumption analysis (e.g., total green coffee mass commercialized). |
| **Product Dimension** | `ProductMaster` | Commercial brand and product line performance (e.g., "Signature House Blend" product performance). |
| **SKU Dimension** | `SKUMaster` | Sellable packaging, unit format, and commercial velocity analysis (e.g., 250g bag vs. 1kg bag sales distribution). |
| **Lot Dimension** | `InventoryLot` | Physical stock fulfillment, lot aging, and downstream cost lineage. |

Analytics never collapses these into a single "product" reporting bucket.

---

# 3. Core Analytical Views & Metrics

### 3.1 Commercial Channel Performance

```text
Commercial Revenue
├── Retail POS Channel (from 06_POS_ENGINE)
│   ├── Register / Counter Sales
│   ├── Shift Throughput
│   ├── Basket Size & Item Velocity
│   └── Tender Mix (Cash, QRIS, Card)
└── Wholesale Channel (from 10_CUSTOMER_WHOLESALE)
    ├── Account Contract Volume
    ├── Price Tier & Discount Performance
    ├── Payment Term Compliance (Net 15/30)
    └── Fulfillment Reliability (Full vs Partial Dispatches)
```

### 3.2 Core Derived Metric Specifications

1. **Revenue Metrics:**
   - $\text{Gross Revenue} = \sum (\text{LineItem.orderedQuantity} \times \text{LineItem.unitPrice})$
   - $\text{Net Revenue} = \text{Gross Revenue} - \text{DiscountTotal} - \text{TaxTotal}$
2. **Velocity & Throughput Metrics:**
   - $\text{SKU Velocity} = \frac{\text{Quantity Sold}}{\text{Time Period}}$
   - $\text{Average Order Value (AOV)} = \frac{\text{Net Revenue}}{\text{Total Completed Transactions}}$
3. **Commercial Profitability Realization:**
   - $\text{Realized COGS} = \sum (\text{FulfillmentAllocation.allocatedQuantity} \times \text{FulfillmentAllocation.unitCost})$ *(where unitCost is supplied by `07_COSTING_ENGINE` at fulfillment)*
   - $\text{Gross Margin Amount} = \text{Net Revenue} - \text{Realized COGS}$
   - $\text{Gross Margin \%} = \left(\frac{\text{Gross Margin Amount}}{\text{Net Revenue}}\right) \times 100$
4. **Wholesale Demand & Retention:**
   - $\text{Customer Reorder Frequency} = \text{Average Days Between Confirmed Wholesale Orders}$
   - $\text{Fulfillment Fill Rate} = \left(\frac{\text{Fulfilled Quantity}}{\text{Ordered Quantity}}\right) \times 100$

---

# 4. Temporal Snapshot & Historical Integrity

- **Historical Facts:** Analytics stores or queries historical sales facts linked to the exact timestamp, SKU price, and lot unit cost effective at the time of transaction completion.
- **No Retrospective Price Mutation:** Recomputing past sales reports uses historical transaction records and historical costing stamps, never retroactively applying current price lists or current inventory valuations.

---

# 5. Summary Checklist

- [x] Consumes facts from `06_POS_ENGINE` and `10_CUSTOMER_WHOLESALE`.
- [x] Reaffirms `07_COSTING_ENGINE` as authoritative for COGS.
- [x] Maintains strict separation between Material, Product, SKU, and Lot dimensions.
- [x] Operates purely as a read-model / intelligence layer.
