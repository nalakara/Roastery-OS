# PHASE 6A UI DISCOVERY & OBSERVATION LOG

**Document Purpose**: Diagnostic log capturing observations, domain/contract questions, confirmed gaps, and non-issues discovered when rendering the Roastery OS domain into the first functional UI slice (Receiving Workflow).

---

## 1. Existing Supported Information

| Entity / Concept | Contract / Table Source | Usage in UI | Notes |
|---|---|---|---|
| Purchase Order Identity & Status | `purchase_order` (`po_number`, `status`, `issued_at`, `expected_at`) | PO List & Detail Header | Direct contract support. Valid statuses: `DRAFT`, `ISSUED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`. |
| Supplier Identity | `supplier_master` (`supplier_id`, `supplier_code`, `name`) | PO List, PO Detail, Receipt Inspector | Linked via `supplier_id`. |
| Line Item Material & Quantities | `purchase_order_line` (`material_id`, `ordered_quantity`, `received_quantity`, `uom`) | PO Detail Line Grid, Receive Form | Persisted on PO line. UOM is invariant per line. |
| Line Commercial Pricing | `purchase_order_line` (`unit_purchase_price`, `line_total`) | PO Detail Line Grid | Explicitly stored in `purchase_order_line`. |
| PO Total Amount | `purchase_order` (`total_amount`, `currency`) | PO List, PO Detail Header | Explicitly stored in `purchase_order`. |
| Origin Lot Reference | `purchase_receipt` (`origin_lot_reference`) | Receive Form, Receipt Inspector | Optional external/farm reference passed into `ReceivePurchaseOrderCommand`. |
| Authoritative Stock Movement | `stock_ledger_movement` (`movement_number`, `movement_type`, `quantity_delta`, `occurred_at`) | Receipt Inspector | Type `PURCHASE_RECEIPT`, positive quantity delta. |
| Materialized Lot & Valuation | `inventory_lot` + `lot_valuation_record` | Receipt Inspector | Lot number, quantity on hand, unit cost, calculated material cost. |

---

## 2. Derived Information (Presentation / API Layer)

| Field / Metric | Derivation Formula | Authority | Notes |
|---|---|---|---|
| **Remaining Quantity** | `ordered_quantity - received_quantity` | Derived (API/Read Model) | Not stored in DB to avoid redundancy. Calculated by subtracting received from ordered. The domain usecase enforces `receivedQuantity <= (ordered - received)`. |
| **Receipt Line Total Amount** | `receivedQuantity * unitPurchasePrice` | Application / Costing | Calculated in `ReceivePurchaseOrderUseCase` and persisted to `purchase_receipt.total_amount` and `lot_valuation_record.material_cost`. |
| **PO Line Count** | `lines.length` / `COUNT(po_line_id)` | Query Read Model | Aggregate count for summary list display. |

---

## 3. Missing Information / Observed Gaps

| Identified Gap | Where Noticed | Impact on Operations | Recommended Future Consideration |
|---|---|---|---|
| **Storage Location Selection on Receipt** | Receive Form | Receiving automatically assigns `storage_location_id = null` on the newly created `InventoryLot`. The operator cannot choose which warehouse / bay / shelf the pallet was placed in during receiving. | Future enhancement: Add optional `storageLocationId` to `ReceivePurchaseOrderCommand` and link `stock_ledger_movement.destination_location_id`. |
| **Receiving Notes / Memo** | Receive Form | `StockLedgerMovement` has a `notes` column (presently defaulted to `"Received against PO ..."`), but `ReceivePurchaseOrderCommand` does not accept a custom operator note input. | Low impact for Phase 6A. Kept as non-domain field (or omitted) to respect frozen contract. |
| **Supplier Contact / Name in PO Read Model** | PO List | The `purchase_order` entity has `supplier_id` but not supplier name. Listing POs requires joining `supplier_master` on the read model to avoid displaying raw UUIDs to human operators. | Standard read-model projection pattern. Solved via query join without changing domain write model. |
| **Material Name in PO Line Read Model** | PO Line Table | `purchase_order_line` has `material_id` but not material name/code. Displaying lines requires joining `material_master`. | Standard read-model projection pattern. |

---

## 4. Potential Domain / Product Questions

1. **Multi-line simultaneous receiving**:
   - Currently, `ReceivePurchaseOrderUseCase` processes receiving line-by-line (`poId`, `poLineId`).
   - In physical warehouse operations, a shipment often arrives with multiple PO lines on a single bill of lading / packing slip.
   - *Question for future product refinement*: Should there be a bulk receiving use case, or is line-by-line receiving with separate receipts per line the intended domain model?

2. **Price variance at receipt**:
   - The command allows specifying `unitPurchasePrice` at receipt time (which could differ from PO line contract price if invoice/spot price adjusted).
   - Currently, whatever `unitPurchasePrice` is passed into the command becomes the initial `lot_valuation_record`.
   - *Question*: Is PO unit price strictly fixed, or can spot receiving price deviate with variance tracking?

---

## 5. Non-Issues (Verified Consistent with Frozen Architecture)

- **Lot Number Generation (`LOT-<receiptNumber>`)**: The use case derives the lot number and movement number from the receipt number. This is intentional and consistent with deterministic lineage.
- **Acquisition Cost as Initial Valuation**: Acquisition cost directly seeds `lot_valuation_record` with `conversionCost = 0` and `allocationPolicy = 'FULL_ABSORPTION'`. This is mathematically and architecturally correct per 07_COSTING_ENGINE.
- **Stock Movement Direction**: `PURCHASE_RECEIPT` movements have a positive `quantity_delta` equal to received quantity. Consistent with append-only ledger invariants.
