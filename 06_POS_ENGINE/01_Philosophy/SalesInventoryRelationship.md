# Sales Inventory Relationship

## Purpose

This document defines the operational relationship between commercial sales activities and inventory management inside Roastery OS.

The purpose of this relationship is to:
- ensure deterministic inventory fulfillment upon sales execution,
- preserve operational auditability and margin tracking,
- decouple commercial `SKUMaster` catalog presentation from physical stock instances (`InventoryLot`),
- support multi-channel sales (Retail POS, Wholesale, E-Commerce, Subscriptions),
- and maintain real-time inventory visibility.

---

# Core Philosophy

Roastery OS treats sales as:
- commercial transaction events,
that trigger:
- deterministic physical deductions from compatible `InventoryLots` via immutable `InventoryMovements`.

Sales activities do not mutate inventory independently; they interact through the formal ledger contract of `02_INVENTORY_ENGINE`.

---

# Commercial SKU to Inventory Lot Fulfillment

In Roastery OS, sales transactions are conducted against commercial **SKUs**, but physical fulfillment occurs against **Inventory Lots**:

```text
Commercial Realm:
Customer purchases SKU (e.g., "Budugasu Honey 250g Whole Bean" or "Wholesale Bulk Roasted 5kg")
       ↓
Operational Fulfillment:
POS resolves and fulfills from compatible InventoryLot(s):
- Matches Material ("Budugasu Honey Roasted")
- Matches Physical Format ("Packaged 250g Retail Bag" OR "Intermediate Bulk Bin")
- Dispatches exact quantity via immutable COMMERCIAL_DISPATCH movement
- Retrieves realized COGS based on that specific InventoryLot's unit cost from 07_COSTING_ENGINE
```

### Fulfillment Flexibility Rules
1. **Packaged Retail Fulfillment:** Standard retail POS sales deduct from packaged `InventoryLots` (e.g., 250g retail pouches).
2. **Direct Intermediate / Wholesale Fulfillment:** Wholesale or café-bar orders can fulfill directly from intermediate `InventoryLots` (e.g., 5kg from bulk roasted storage bin, or 10kg green coffee sold to a roasting partner) without forcing artificial transformation records.
3. **Multi-Lot Fulfillment (1:N):** When an order exceeds the quantity available in a single lot, the POS Engine allocates fulfillment across multiple `InventoryLots` without losing individual lot provenance.
4. **Lot Selection Strategy:** POS checkout can either allocate automatically via FIFO from available lots or allow manual barista/cashier selection of specific roast batch lot numbers for micro-lots.

---

# Inventory Movement & Ledger Mechanics

Sales transactions interact with `02_INVENTORY_ENGINE` through explicit, immutable movements:

1. **`COMMERCIAL_DISPATCH` / `FULFILLMENT`:** Triggered upon transaction completion. Decrements lot physical quantity and transitions lot state to `CONSUMED` if fully depleted.
2. **`RESERVATION`:** Triggered during e-commerce checkout or pending wholesale orders. Moves available lot quantity into reserved allocation without deducting physical stock.
3. **`RETURN_RESTORE`:** Triggered when a customer returns sellable merchandise. Restores lot quantity and credits original COGS.
4. **`SCRAP`:** Triggered when returned goods are damaged, unsealed, or expired.

---

# Quantity Continuity & Stock Integrity

All inventory deductions must remain:
- **Conserved:** Total quantities dispatched equal total quantities sold.
- **Traceable:** Linked to transaction IDs and operator IDs.
- **Double-Entry Audited:** Balanced against the inventory ledger.

Example:
```text
Available Inventory Lot #PB-104: 20 Units
       ↓ Sale Transaction TRX-2026-001 (3 Units)
InventoryMovement (COMMERCIAL_DISPATCH, 3 Units)
       ↓
Remaining Inventory Lot #PB-104: 17 Units
```

---

# Multi-Channel Inventory Continuity

A single central pool of physical `InventoryLots` serves all commercial channels:
- Retail counter POS
- Online e-commerce store
- Wholesale ordering portal
- Coffee subscription platform

Real-time stock synchronization prevents overselling while preserving unified lot history.

---

# Production Demand Signals

Real-time sales depletion from `InventoryLots` feeds demand forecasting and batch planning in `03_ROASTING_ENGINE` and `05_PRODUCTION_ENGINE`, closing the loop between commercial sales and manufacturing operations.

---

# Deterministic Inventory Principle

Critical inventory behavior remains strictly deterministic:
- no silent or unrecorded stock decrements,
- strict validation of lot availability before checkout completion,
- and complete auditability across all transactions.

---

# Philosophy Summary

Sales inventory relationships are not merely stock reduction triggers.
Sales inventory relationships are:
- **the formal contract between commercial commerce and physical material stock**,
- **the trigger for double-entry inventory ledger movements**,
- and **the foundation of end-to-end traceability in Roastery OS**.

