# PHASE 6B UI DISCOVERY & OBSERVATION LOG

**Document Purpose**: Diagnostic log capturing observations, domain/contract questions, confirmed gaps, and non-issues discovered when rendering the Roastery OS core transformation, batch execution, yield, and provenance model into the Phase 6B functional UI slice.

---

## 1. Observations: Batch vs. Transformation Boundary

| Concept | Domain Role | Observation in UI |
|---|---|---|
| **`Transformation`** | The immutable **material conversion boundary** (Inputs → Outputs, mass balance, economic pool transfer). | Acts as the foundational transaction record. It defines which physical inventory lots were depleted and created. |
| **`Batch`** | The **operational execution context** (machine ID, operator ID, roast profile, ambient conditions, status). | Provides operational context to a transformation. In the UI, roasters think in terms of "Batch #ROAST-2026-001 with Profile Light Roast", while the ledger records the underlying `Transformation`. Linking `batch.transformation_id` makes this dual-layer relationship clear without collapsing the concepts. |

---

## 2. Existing Supported Information

| Entity / Concept | Contract / Table Source | Usage in UI | Notes |
|---|---|---|---|
| Available Green Lots | `inventory_lot` (`quantity_on_hand`, `reserved_quantity`, `lot_state`, `uom`) | Available Lots Screen | Shows physical stock available for roasting (`quantityOnHand > 0` and `lotState = 'ACTIVE'`). |
| Material Identity | `material_master` (`code`, `name`, `category`, `base_uom`) | Available Lots, Input/Output Grids | Differentiates green beans (`RAW_MATERIAL`) from roasted outputs (`INTERMEDIARY_COFFEE`). |
| Multi-Lot Consumption (N:M Inputs) | `transformation_input` (`inventory_lot_id`, `planned_quantity`, `actual_quantity_consumed`) | Transformation Start & Complete Forms | Multiple green coffee lots can be selected and consumed in a single transformation. |
| Physical & Waste Outputs | `transformation_output` (`output_type`, `actual_quantity_produced`) | Transformation Complete Form | Supports `PRIMARY_PRODUCT`, `CO_PRODUCT`, and `UNRECOVERABLE_WASTE`. Waste produces no `InventoryLot`. |
| Cost Events & Direct Conversion Costs | `cost_event` (`cost_category`, `allocated_amount`, `allocation_basis`) | Transformation Inspector | Direct labor, energy utilities, and machine usage added to the total economic pool. |
| Lot Valuation Record | `lot_valuation_record` (`material_cost`, `conversion_cost`, `total_lot_cost`, `unit_cost`) | Transformation Inspector | Authoritative valuation computed via `CompleteTransformationUseCase`. |
| Provenance Lineage | `provenance_edge` (`source_lot_id`, `target_lot_id`, `consumed_quantity`) | Transformation Inspector | Explicit Acyclic DAG edges connecting source green lots to target roasted lots. |

---

## 3. Derived Information (Presentation / Read Model)

| Field / Metric | Derivation Formula | Authority | Notes |
|---|---|---|---|
| **Available Lot Quantity** | `quantity_on_hand - reserved_quantity` | Derived (Domain/Read Model) | Computed to prevent over-allocation of reserved stock. |
| **Total Input Mass** | `SUM(actualQuantityConsumed)` | Presentation / Read Model | Aggregated across input lots for mass balance display. |
| **Total Output Mass** | `SUM(actualQuantityProduced)` (Physical outputs + Waste) | Presentation / Read Model | Physical mass yielded across all outputs. |
| **Physical Roast Loss / Yield %** | `(Total Output Mass / Total Input Mass) * 100` | Presentation / Read Model | Pure presentation calculation. Useful diagnostic for roasters without polluting domain contracts. |

---

## 4. Confirmed Gaps & Limitations

| Identified Gap | Where Noticed | Operational Impact | Recommended Future Consideration |
|---|---|---|---|
| **Roast Machine / Equipment Selection** | Batch Creation / Start Roast | `batch.equipment_id` exists in schema, but there is no dedicated Equipment Master table or selection dropdown in this slice. | Future enhancement: Introduce equipment master data management. |
| **Green Bean Harvest/Origin metadata on Lot** | Available Lots Grid | `InventoryLot` links to `MaterialMaster` and optionally `storage_location_id`, but origin harvest details live on `purchase_receipt.origin_lot_reference`. | Consider projecting origin lot references into lot search/detail read models. |
| **Draft / In-Progress Transformation Management** | Start Roast Flow | Starting a roast creates an `IN_PROGRESS` Transformation and `EXECUTING` Batch, but there is currently no pausing/saving draft state before calling `CompleteTransformationUseCase`. | CompleteTransformationUseCase completes the entire lifecycle atomically. |

---

## 5. Non-Issues (Verified Consistent with Frozen Architecture)

- **Waste Lots are Null**: `UNRECOVERABLE_WASTE` output records have `created_lot_id = null` and `movement_id = null`. The UI clearly explains "No InventoryLot created" to prevent confusing operators.
- **Economic Pool Absorption**: In 1:1 and 1:N transformations, unrecoverable waste mass loss naturally absorbs into the unit cost of primary/co-products without generating phantom valuation records.
- **Provenance Edge Acyclicity**: Provenance edges strictly point from `source_lot_id` (depleted green lot) to `target_lot_id` (created roasted lot), maintaining strict DAG invariants.
