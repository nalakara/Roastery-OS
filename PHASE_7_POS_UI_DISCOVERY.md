# Phase 7 — POS / Commercial Sales & Fulfillment Diagnostic Slice Discovery

## 1. Executive Summary

Phase 7 establishes and proves the commercial sales and fulfillment boundary for Roastery OS. The primary domain hypothesis tested was:

> *"Can a commercial SKU sale consume the correct physical lots while keeping commercial revenue and inventory/costing responsibilities cleanly separated?"*

**Status: GREEN (Fully Implemented & Verified)**
- **Total Automated Tests:** 49 passing tests across all 5 workspace packages (`contracts`, `domain-core`, `infrastructure-postgres`, `application-services`, `app-api`). Zero failures.
- **Multi-Lot Fulfillment (Scenario 2: 3 + 2 = 5 units):** Passed and verified with atomic row locking, multi-lot stock ledger movements, snapshot lot valuations, and weighted COGS calculation.
- **Boundary Invariance:** POS owns commercial transactions, selling prices, discounts, and order totals. Costing owns lot valuations and COGS. Physical depletion is executed strictly through the Inventory engine.

---

## 2. Preflight Findings & Reused Capabilities

Before implementation, the repository state was audited across all layers:

1. **Contracts (`@roastery-os/contracts`):**
   - `CommercialOrderContract`, `CommercialOrderLineContract`, `FulfillmentAllocationContract`, `CogsRecordContract`, `CommercialSaleChannel` (`RETAIL_POS`, `WHOLESALE_CONTRACT`, `ECOMMERCE`) already existed and aligned with the specification.
2. **Domain Core (`@roastery-os/domain-core`):**
   - Value objects `Money`, `Quantity`, `DecimalValue`, and `UnitCost` were reused directly.
   - `StockMovementType.COMMERCIAL_DISPATCH` was verified as the correct physical stock disposition movement.
3. **Infrastructure (`@roastery-os/infrastructure-postgres`):**
   - PostgreSQL schema for `commercial_order`, `commercial_order_line`, `fulfillment_allocation`, and `cogs_record` was already defined with composite multi-tenant foreign keys in `schema-ddl.ts`.
   - Created `CommercialPostgresRepository` to encapsulate CRUD, order lines, and allocation queries.
   - Extended `CostingPostgresRepository` with `findLotValuation`, `insertCogsRecord`, `findCogsByAllocation`, and `listCogsByOrder`.
4. **Application Services (`@roastery-os/application-services`):**
   - Implemented `ProcessSaleFulfillmentUseCase` orchestrating atomic transaction execution, physical lot validation (`ACTIVE` status, matching material, available quantity), `findLotByIdForUpdate` row locking, stock ledger movement generation, valuation snapshot lookup, and `cogs_record` insertion.
5. **REST API & Prototype Console (`@roastery-os/app-api`):**
   - Added REST routes:
     - `GET /api/skus`: Sellable catalog with calculated available finished stock.
     - `POST /api/pos/checkout`: Multi-lot sale execution.
     - `GET /api/commercial-orders`: Commercial order listing with revenue, COGS, and gross margin.
     - `GET /api/commercial-orders/:orderId`: Deep 3-column split inspector (Commercial, Physical, Economic).

---

## 3. Verified Diagnostic Workflow & Screens

The operational web console was extended with Workstream 4:

### Screen 12: POS Kasir (Checkout & Multi-Lot Allocation)
- **Sellable SKU Selection:** Displays commercial SKU details, packaged quantity, catalog selling price, and live available finished stock.
- **Commercial Sale Form:** Allows setting purchase quantity, selling price, discounts, taxes, sales channel (`RETAIL_POS`, `WHOLESALE_CONTRACT`, `ECOMMERCE`), and customer notes.
- **Physical Lot Allocation Builder:** Displays available finished goods candidate lots, their stock on hand, and current snapshot unit cost (HPP). Operators can allocate units across single or multiple candidate lots with live visual balance indicators (`Alokasi: X / Y UNIT`).
- **One-Click Test Presets:**
  - *Skenario 1 (Single-Lot):* 1 unit from Lot A.
  - *Skenario 2 (Multi-Lot):* 5 units fulfilled via 3 units from Lot A + 2 units from Lot B.
  - *Skenario 3 (Insufficient Stock):* 10 units requested, under-allocated to trigger domain rejection.

### Screen 13: Riwayat Penjualan (Commercial Orders)
- Lists all commercial transactions with order number, timestamp, sales channel, status (`FULFILLED`), commercial revenue total, COGS total, and gross margin percentage.

### Screen 14: Inspektur Penjualan & HPP (Order Inspector)
Provides a 3-column diagnostic split:
1. **Batas Komersial (Commercial):** Order number, channel, timestamp, subtotal, discount, tax, grand total, and order lines with selling prices.
2. **Batas Fisik Stok (Physical Inventory):** Movement type `COMMERCIAL_DISPATCH`, total units discharged, candidate lot IDs, individual quantities deducted, and remaining physical lot stock.
3. **Batas Ekonomi & HPP (Costing Engine):** Valuation snapshot method, per-lot unit HPP snapshot basis, COGS recognition per lot, total order COGS, and derived Gross Margin (Revenue - COGS).

---

## 4. Test Scenarios Execution Summary

| Scenario | Description | Physical Result | Economic Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Scenario 1** | Single-lot sale (1 UNIT @ IDR 280,000) | Lot 1 decreases by 1 UNIT | COGS = IDR 158,500.00; Margin = IDR 121,500.00 (43.4%) | **PASS** |
| **Scenario 2** | Multi-lot fulfillment (5 UNITS @ IDR 280,000 via Lot A: 3 UNIT + Lot B: 2 UNIT) | Lot A: 3 → 0 (DEPLETED); Lot B: 4 → 2 (ACTIVE) | Weighted COGS = 3 × 154,285.71 + 2 × 158,500 = IDR 779,857.13; Margin = IDR 620,142.87 (44.3%) | **PASS** |
| **Scenario 3** | Insufficient stock / under-allocation (10 requested, 1 allocated) | Transaction rejected before mutation | Zero stock or costing changes | **PASS** |
| **Scenario 4** | Different lot valuations | Physical stock tracked independently | Weighted COGS accurately recognizes exact consumed lots without averaging | **PASS** |

---

## 5. Domain & Architectural Discoveries

1. **Strict Costing Read-Only Boundary:**
   - The POS subsystem neither computes nor persists unit costs. Instead, `cogs_record` is created by looking up the existing `lot_valuation_record` of each consumed lot at the moment of fulfillment dispatch.
2. **UOM Dimension Safety:**
   - Finished commercial SKUs are sold in commercial units (`UNIT` or `COUNT`). The physical lots created in packaging hold finished goods in `UNIT`. The POS allocation operates in `UNIT` without needing to convert coffee mass or packaging foil dimensions. Upstream mass conversions (KG to UNIT) remain safely encapsulated inside the Packaging Transformation boundary.
3. **Multi-Lot Traceability:**
   - Because `fulfillment_allocation` references `inventory_lot` directly, downstream commercial transactions maintain an unbroken link back to roasting batches and green coffee PO receipts via `provenance_edge`.

---

## 6. Recommendations & Next Steps

- **Recommendation: GREEN.** Proceed to the next planned domain slice.
- **Remaining Minor Gaps:** Commercial returns / restocking workflow (`RETURN_RESTORE`) and customer credit balances can be introduced in a future wholesale commercial phase when return policies are formalized.
