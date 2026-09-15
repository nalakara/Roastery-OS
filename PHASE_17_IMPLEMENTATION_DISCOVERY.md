# Phase 17 Implementation Discovery: Commercial Experience (POS + Wholesale)

## 1. Overview
Phase 17 expands the Roastery OS frontend experience into the commercial domain:
`SKU → ORDER → ALLOCATION → FULFILLMENT → INVENTORY → COGS`

The Commercial Hub unites two distinct operational modes into a single coherent workspace:
- **Wholesale Desk (B2B)**: Order commitments, confirmation, physical lot reservation (locking available stock without physical depletion), multi-lot fulfillment, and gross margin recognition.
- **POS Kasir Retail**: Fast, counter-oriented checkout, direct multi-lot allocation, instantaneous physical depletion, and capitalized COGS derivation.
- **Unified SKU & Customer Contexts**: Reusable `Order 360°`, `SKU 360°`, and `Customer 360°` drawers directly bridging commercial commitments to underlying `InventoryLot` records.

---

## 2. Key Discoveries, Patterns & Architectural Guardrails

### A. Shared Physical Inventory Pool Between POS & Wholesale
- **Discovery**: POS retail checkout and Wholesale B2B orders draw from the exact same finished goods inventory lots (`FINISHED_GOOD`).
- **Pattern Implemented**:
  - Reservation in Wholesale increases `reservedQuantity` and reduces `availableQuantity` while leaving `quantityOnHand` untouched.
  - POS checkout respects active reservations: attempting to fulfill from reserved quantities or beyond available unreserved stock is rejected at the domain boundary.
  - Real-time stock status is presented uniformly:
    - **Fisik On-Hand**: Physical stock currently present in the warehouse.
    - **Dipesan (Reserved)**: Units locked for active wholesale commitments.
    - **Tersedia Bebas (Available)**: Unreserved units available for immediate sale or new orders.

### B. Multi-Lot Allocation & Pooled Valuation
- **Discovery**: A single commercial order line (e.g. 5 units of 1KG Whole Bean) can be fulfilled across multiple physical inventory lots (e.g. 3 units from Lot A with HPP 140,000 + 2 units from Lot B with HPP 150,000).
- **Pattern Implemented**:
  - Both POS and Wholesale interfaces allow operators to split line items across candidate lots.
  - The UI does not expose internal database IDs; instead, operators interact with lot numbers, available stock counters, and lot HPP badges.
  - Backend costing records authoritative COGS for each lot disposition without frontend cost manipulation.

### C. Reusable Contextual 360° Drawers
- **Discovery**: Operators inspecting an order or SKU frequently need to pivot into upstream inventory lots or customer histories without losing their primary workspace state.
- **Pattern Implemented**:
  - The contextual slide-over drawer is reused across 4 key entities:
    1. **`LOT 360°`**: Physical position, valuation breakdown, provenance lineage, and commercial actions (`[🏪 Jual di POS]`, `[📦 Pesan Wholesale]`).
    2. **`ORDER 360°`**: Commercial header, lines, allocations, physical dispatch movements, and realized COGS / gross margin.
    3. **`SKU 360°`**: SKU specs, warehouse stock positions, and candidate finished goods lots with direct links to `Lot 360°`.
    4. **`CUSTOMER 360°`**: Account status, active orders count, total commitments, and order history.

### D. Stock Shortage Notification & Contextual Bridges
- **Discovery**: When an order exceeds available finished goods stock, operators need immediate clarity on what is missing and how to replenish it.
- **Pattern Implemented**:
  - If requested quantity exceeds available stock, the UI presents an alert banner with direct contextual action buttons:
    - `[📦 Buka Inventaris]` $\rightarrow$ jumps to Inventory Hub to inspect raw/roasted stocks.
    - `[⚙️ Buka Produksi / Kemas]` $\rightarrow$ jumps to Production Hub Packaging workspace to package new batches.

---

## 3. Verified Operational Acceptance Journeys

The integration test suite verified all 5 primary commercial operational journeys:

| Journey | Operational Sequence | Verification Status |
| :--- | :--- | :--- |
| **Journey A: Wholesale Lifecycle** | Commercial $\rightarrow$ Wholesale Desk $\rightarrow$ Create Draft $\rightarrow$ Confirm $\rightarrow$ Reserve $\rightarrow$ Fulfill $\rightarrow$ Result Hero $\rightarrow$ Order 360 | ✅ PASSED |
| **Journey B: Multi-Lot Fulfillment** | Order Line $\rightarrow$ Lot A (3u) + Lot B (2u) $\rightarrow$ Fulfill $\rightarrow$ Physical Depletion & Dual Dispositions $\rightarrow$ COGS | ✅ PASSED |
| **Journey C: Retail POS Sale** | Commercial $\rightarrow$ POS Counter $\rightarrow$ Select SKU $\rightarrow$ Checkout $\rightarrow$ Sale Result Hero $\rightarrow$ Depleted Stock $\rightarrow$ Realized Margin | ✅ PASSED |
| **Journey D: SKU Context** | Commercial $\rightarrow$ SKU Catalog $\rightarrow$ Available Stock $\rightarrow$ Active Orders $\rightarrow$ Finished Lots $\rightarrow$ Lot 360 | ✅ PASSED |
| **Journey E: Stock Shortage** | Order Intent $\rightarrow$ Insufficient Available Stock Detected $\rightarrow$ Contextual Inventory / Production Bridges | ✅ PASSED |

---

## 4. Anti-Slop Governance & Hard Boundaries
- **No Accounting / ERP Bloat**: Zero implementation of accounts receivable, credit ledgers, invoice engines, or fake payment gateways.
- **Authoritative Costing**: Frontend strictly displays backend-calculated COGS and gross margins; no client-side mathematical guessing.
- **Diagnostic Compatibility**: All original 24 diagnostic milestone screens remain fully preserved and accessible via the diagnostic toggle.
