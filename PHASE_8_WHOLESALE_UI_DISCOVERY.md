# PHASE 8 — WHOLESALE / CUSTOMER ORDER & FULFILLMENT DISCOVERY REPORT

## 1. Executive Summary & Validation Objective

Phase 8 answered the primary operational validation question:
> **"Can a B2B customer commitment reserve physical stock without changing physical inventory, and later consume that same stock through fulfillment while correctly producing inventory and costing consequences?"**

**Verdict: YES.** 
Through rigorous domain modeling, integration testing (26/26 tests passing across all packages), and the diagnostic UI slice, we verified that:
1. **Reservation (`RESERVED`)** locks stock (`reserved_quantity` increases, `available_quantity` decreases) while preserving physical inventory (`quantity_on_hand` unchanged), generating **0 movements** and **0 COGS**.
2. **Fulfillment / Commercial Dispatch (`COMPLETED` / `PARTIALLY_FULFILLED`)** physically consumes stock (`quantity_on_hand` decrements, `reserved_quantity` releases), appends an immutable `COMMERCIAL_DISPATCH` movement to the ledger, and records the snapshot valuation into `cogs_record` owned by the Costing engine.
3. **Competing Reservations** enforce hard bounds: when available inventory is depleted by prior commitments, subsequent reservation requests are cleanly rejected at the domain boundary with `InsufficientReservableStockError`.
4. **Shared Finished Goods Pool** is completely safe across channels: Retail POS cannot sell or fulfill stock that has been committed/reserved by Wholesale contracts.

---

## 2. Constraints & Anti-Slop Hardening Applied

Per the Phase 8 Hardening Directives, the implementation strictly adhered to the following boundaries:

| Area | Hardened Rule Applied | Verification |
| :--- | :--- | :--- |
| **Customer Master Scope** | No credit scoring, accounts receivable, invoicing, payment collection, or credit limits. | Reused minimal `CustomerMasterContract` (`customerId`, `customerCode`, `name`, `customerType`, `contactPerson`, `email`, `phone`, `address`, `isActive`). |
| **Customer Seed Data** | Strictly synthetic diagnostic customers only. | Seeded `Cafe Partner A (Senopati)`, `Regional Distributor B (Bandung)`, and `Hospitality Client C (Bali)`. |
| **Commercial Order Model** | Reuse existing `CommercialOrderContract` with `channel = 'WHOLESALE_CONTRACT'`. | Zero duplicate order entities. Reused commercial order spine across POS & Wholesale. |
| **Status Vocabulary** | Strictly respect frozen status contract: `DRAFT` → `CONFIRMED` → `RESERVED` → `PARTIALLY_FULFILLED` / `COMPLETED`. | Preserved lifecycle without ad-hoc status invention. |
| **Reservation vs Dispatch** | Reservation never touches physical ledger or valuation. Dispatch executes physical and economic consequences. | Verified by database assertion: `quantityOnHand` unchanged on reservation; `cogs_record` created only on dispatch. |
| **Costing Ownership** | Wholesale service does NOT own HPP formulas or lot valuation. | Reuses `lot_valuation_record` snapshot via `CostingPostgresRepository.findLotValuation` and inserts `cogs_record`. |

---

## 3. Four-Column Diagnostic Inspection Model

The Phase 8 Diagnostic UI features the authoritative 4-column operational inspector:

```
┌──────────────────────────┬──────────────────────────┬──────────────────────────┬──────────────────────────┐
│   1. CUSTOMER COMMITMENT │ 2. STOCK RESERVATION     │ 3. PHYSICAL DISPATCH     │ 4. COGS & MARGIN         │
├──────────────────────────┼──────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Customer: CUST-CAFE-A    │ Lot: LOT-FG-FLORES-003   │ Movement:                │ Valuation Snapshot:      │
│ Channel: WHOLESALE       │ Allocated: 5 UNIT        │ MOV-DISPATCH-2026-004    │ IDR 150,000.00 / UNIT    │
│ Order Total:             │ Status: RESERVED         │ Delta: -5.0000 UNIT      │ Recognized COGS:         │
│ IDR 1,100,000.00         │ Effect:                  │ Lot State: ACTIVE        │ IDR 750,000.00           │
│ Order Status: COMPLETED  │ - Qty On Hand: UNCHANGED │ Qty On Hand: 15 UNIT     │ Realized Gross Margin:   │
│                          │ - Available: 15 UNIT     │ Reserved Qty: 0 UNIT     │ IDR 350,000.00 (31.8%)   │
└──────────────────────────┴──────────────────────────┴──────────────────────────┴──────────────────────────┘
```

---

## 4. Key Discoveries & Architectural Integrity

1. **Clean Separation of Commercial Commitment & Physical Reality:**
   B2B orders frequently experience days or weeks between order agreement and dispatch. The explicit `RESERVED` state allows the business to promise inventory without falsifying physical stock counts in the warehouse.
2. **Multi-Lot Weighted COGS for Wholesale:**
   When a wholesale order line of 8 units is fulfilled across multiple lots (e.g. 3 units from Lot A @ 154,285.71 IDR + 5 units from Lot C @ 150,000.00 IDR), the system records granular `fulfillment_allocation` and `cogs_record` entries, deriving an exact total COGS of IDR 1,212,857.13 and Gross Margin of IDR 507,142.87.
3. **Cross-Channel Inventory Protection:**
   Because both POS and Wholesale check `availableQuantity = quantityOnHand - reservedQuantity`, POS checkout immediately fails when trying to fulfill stock that has been reserved by Wholesale, preventing warehouse collisions.
