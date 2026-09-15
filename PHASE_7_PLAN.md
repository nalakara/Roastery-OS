# Phase 7 Preflight & Implementation Plan

## 1. Preflight Audit: Commercial Sales, Fulfillment, Inventory & COGS

| Domain Requirement / Concept | Source Document / Table / Contract | Existing Implementation Status | Action for Phase 7 |
|---|---|---|---|
| **Commercial Order & Lines** | `06_POS_ENGINE`, `10_CUSTOMER_WHOLESALE`, `commercial_order`, `commercial_order_line` | DDL in [schema-ddl.ts](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/packages/infrastructure-postgres/src/schema-ddl.ts), contracts in [entities.ts](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/packages/contracts/src/entities.ts) | **CREATE** `CommercialPostgresRepository` with order, order_line, and fulfillment_allocation CRUD. |
| **Multi-Lot Fulfillment Allocation** | `FulfillmentAllocationContract`, `fulfillment_allocation` table | DDL in [schema-ddl.ts](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/packages/infrastructure-postgres/src/schema-ddl.ts) (references order_line_id, inventory_lot_id, movement_id) | **IMPLEMENT** in `ProcessSaleFulfillmentUseCase`. |
| **Physical Stock Depletion** | `InventoryPostgresRepository.updateLotBalance`, `StockLedgerMovement` with `COMMERCIAL_DISPATCH` | Existing in [inventory-repository.ts](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/packages/infrastructure-postgres/src/inventory-repository.ts) with `SELECT ... FOR UPDATE` row locking | **REUSE** inventory repository directly. |
| **COGS Recognition** | `CogsRecordContract`, `cogs_record` table | DDL in [schema-ddl.ts](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/packages/infrastructure-postgres/src/schema-ddl.ts), `findLotValuation` in [costing-repository.ts](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/packages/infrastructure-postgres/src/costing-repository.ts) | **EXTEND** `CostingPostgresRepository` with `insertCogsRecord` & `findCogsByAllocation`. |
| **Commercial Transaction Lifecycle** | `ProcessSaleFulfillmentUseCase` | Missing application service | **CREATE** `ProcessSaleFulfillmentUseCase` orchestrating atomic order creation, fulfillment allocation, stock movement, and COGS realization. |
| **Finished Goods Seed Data** | `seed-data.ts` | Currently seeds green, roasted bulk, and packaging lots | **ENRICH** `seedDatabase` with pre-packaged finished goods inventory lots (e.g. `LOT-FG-FLORES-1KG-A` with 3 units @ 150k HPP and `LOT-FG-FLORES-1KG-B` with 4 units @ 158k HPP) for instant multi-lot fulfillment testing. |
| **REST API Endpoints** | `packages/app-api/src/server.ts` | Has `/api/products`, `/api/skus`, `/api/production-inputs` | **ADD** `GET /api/commercial-orders`, `GET /api/commercial-orders/:orderId`, `POST /api/pos/checkout` (Process sale & fulfillment). |
| **POS Diagnostic UI** | `packages/app-api/public/` | Has Workstreams 1, 2, 3 (11 screens) | **ADD** Workstream 4: Screen 12 (POS / Sellable Catalog & Cashier), Screen 13 (Commercial Order History), Screen 14 (Commercial Sale & COGS Inspector). |

---

## 2. Technical Design: `ProcessSaleFulfillmentUseCase`

```
Operator / POS Checkout (Commercial Intent: SkuId, Quantity, UnitPrice, Allocations)
            ↓
ProcessSaleFulfillmentCommand
            ↓
ProcessSaleFulfillmentUseCase (Application Service)
    ├── 1. Validate Sku & Material Identity (Ensure Sku exists and maps to Material)
    ├── 2. Calculate Commercial Totals (Subtotal = Qty × UnitPrice, GrandTotal = Subtotal - Discount + Tax)
    ├── 3. Persist `commercial_order` & `commercial_order_line` (Channel = 'RETAIL_POS', Status = 'FULFILLED')
    ├── 4. FOR EACH Allocation (InventoryLotId, Quantity):
    │       ├── SELECT ... FOR UPDATE on `inventory_lot` (Concurrency protection)
    │       ├── Verify available quantity >= allocatedQuantity
    │       ├── Deplete lot quantityOnHand & update lotState ('ACTIVE' or 'DEPLETED')
    │       ├── Insert `stock_ledger_movement` (Type = 'COMMERCIAL_DISPATCH', Delta = -Qty)
    │       ├── Fetch authoritative `lot_valuation_record` (HPP snapshot $U_{\text{lot}}$)
    │       ├── Insert `fulfillment_allocation` (Link orderLine, lot, movement)
    │       └── Insert `cogs_record` (AllocatedQty × UnitCostSnapshot)
    └── 5. Commit PostgreSQL transaction atomically & return order summary + COGS realization
```

---

## 3. Test Scenarios Plan

1. **Scenario 1 (Single-lot sale)**: 2 UNIT of SKU sold from Lot A (10 UNIT available). Lot A decreases to 8 UNIT, COGS recorded = 2 × Lot A Unit Cost.
2. **Scenario 2 (Multi-lot fulfillment - REQUIRED)**: 5 UNIT of SKU sold. Allocated: 3 UNIT from Lot A (3 available) + 2 UNIT from Lot B (4 available). Lot A → 0 (DEPLETED), Lot B → 2 remaining. COGS = (3 × HPP_A) + (2 × HPP_B).
3. **Scenario 3 (Insufficient stock rejection)**: Attempting to allocate 10 UNIT when only 6 UNIT are available fails with domain error `InsufficientLotQuantityError`.
4. **Scenario 4 (Different lot valuations & Gross Margin)**: Lot A (@ IDR 20,000 HPP) + Lot B (@ IDR 24,000 HPP). Sell 5 UNIT @ IDR 35,000 retail. Revenue = IDR 175,000, COGS = IDR 112,000, Gross Margin = IDR 63,000 (36%).
5. **Scenario 5 (Tenant isolation & concurrency)**: Prevents cross-organization order/fulfillment and concurrent double-fulfillment.
