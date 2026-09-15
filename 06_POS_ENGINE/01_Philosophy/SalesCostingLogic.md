# Sales Costing Logic

## Purpose

This document defines the costing philosophy, COGS realization, and operational profitability visibility inside the POS Engine of Roastery OS.

The purpose of Sales Costing Logic is to:
- preserve deterministic profitability continuity across commercial channels,
- establish clear ownership boundaries between commercial sales and valuation mechanics,
- integrate seamlessly with the frozen Costing Engine (`07_COSTING_ENGINE`),
- standardize COGS realization from physical `InventoryLots`,
- and provide real-time commercial margin visibility.

---

# Core Philosophy & Engine Boundary

Roastery OS strictly defines the boundary between commercial sales execution and economic valuation:

- **POS Engine Responsibility:**
  - Owns commercial selling price ($P_{\text{unit}}$), item discounts, promotional rules, order subtotals, customer taxes, and gross realized revenue ($R$).
  - Captures the exact quantity fulfilled per line item from specific `InventoryLots` ($Q_{\text{fulfilled}, i}$).
  
- **Costing Engine Responsibility (`07_COSTING_ENGINE`):**
  - Owns the economic valuation of inventory lots and COGS derivation.
  - Supplies the historical unit cost ($U_{\text{lot}}$) of the consumed `InventoryLots` at dispatch.
  - Derives realized COGS via Canonical Equation 4:
    $$\text{COGS} = \sum (Q_{\text{fulfilled}, i} \times U_{\text{lot}, i})$$
  - Maintains the valuation ledger and double-entry COGS realization.

The POS Engine **never** computes or mutates inventory valuations independently.

---

# Operational Costing Model

```text
Commercial Sale (SKUMaster checkout at price P)
       ↓
Physical Fulfillment (Deduction of Q units from InventoryLot)
       ↓
Costing Engine Query (Retrieve U_lot from 07_COSTING_ENGINE)
       ↓
Realized COGS Event (COGS = Q × U_lot)
       ↓
Commercial Margin Visibility (Gross Profit = Revenue - Taxes - COGS)
```

---

# Profitability & Margin Formulas

The POS Engine provides real-time commercial profitability visibility using standard accounting relationships based on inputs from the Costing Engine:

### 1. Net Commercial Revenue
$$\text{Net Revenue} = \text{Grand Total} - \text{Taxes}$$

### 2. Realized Cost of Goods Sold (from `07_COSTING_ENGINE`)
$$\text{Total COGS} = \sum_{i=1}^{n} (Q_{\text{allocated}, i} \times U_{\text{lot}, i})$$

### 3. Realized Gross Profit
$$\text{Gross Profit} = \text{Net Revenue} - \text{Total COGS}$$

### 4. Realized Gross Margin Percentage
$$\text{Gross Margin } (\%) = \left( \frac{\text{Gross Profit}}{\text{Net Revenue}} \right) \times 100$$

---

# Multi-Lot Fulfillment Costing

When a commercial SKU line item is fulfilled from multiple physical `InventoryLots` with differing unit costs (e.g., fulfilling 10 units from Lot A [$U = \$8.00$] and Lot B [$U = \$8.50$]):

$$\text{Line Item COGS} = (Q_A \times U_A) + (Q_B \times U_B) = (4 \times \$8.00) + (6 \times \$8.50) = \$32.00 + \$51.00 = \$83.00$$

The POS Engine records the exact split allocations without creating artificial average lot records, preserving full auditability back to specific production batches.

---

# Multi-Channel Costing Continuity

Sales costing remains unified across all commerce channels:
- Retail counter POS
- E-Commerce web store
- Wholesale orders (volume discounted)
- Recurring subscription shipments
- Third-party marketplaces

Different channels may apply distinct pricing tiers or discounts, but all channels resolve physical COGS against the exact `InventoryLots` fulfilled via `07_COSTING_ENGINE`.

---

# Discounts, Promotions, and Margin Impact

Discounts and promotional pricing directly reduce net commercial revenue ($R_{\text{net}}$) without altering the physical unit cost ($U_{\text{lot}}$) of the consumed goods:
- **Normal Price:** $\text{Revenue} = \$15.00, \text{COGS} = \$8.00 \implies \text{Margin} = \$7.00\ (46.7\%)$
- **20% Discounted:** $\text{Revenue} = \$12.00, \text{COGS} = \$8.00 \implies \text{Margin} = \$4.00\ (33.3\%)$

This ensures operational transparency: promotions are recognized as commercial margin concessions, not inventory cost fluctuations.

---

# Refund & Reversal Costing

When a customer return occurs:
- **Sellable Return (`RETURN_RESTORE`):** The inventory lot quantity is restored, and the original COGS is credited back via `07_COSTING_ENGINE`.
- **Damaged / Unsellable Return (`SCRAP`):** Revenue is refunded to the customer, but the inventory write-off remains recognized as scrap/loss under `07_COSTING_ENGINE` scrap policies.

---

# Deterministic Costing Principle

Critical sales costing behavior remains strictly deterministic:
- no manual or ad-hoc COGS overrides in POS,
- immutable link to `07_COSTING_ENGINE` lot unit costs,
- and fully auditable margin tracking per transaction.

---

# Philosophy Summary

Sales costing is not an isolated spreadsheet calculation.
Sales costing is:
- **the commercial realization of production value**,
- **the convergence of commercial selling prices and physical lot valuations**,
- and **the foundation of real-time operational profitability in Roastery OS**.

