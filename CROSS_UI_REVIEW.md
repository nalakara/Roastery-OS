# Cross-UI Review: Phase 6A + 6B + 6C

**Review Scope**: Direct audit of the full Roastery OS operational UI prototype covering **Phase 6A (Inbound Receiving)**, **Phase 6B (Roasting / Material Conversion)**, and **Phase 6C (Packaging & Finished Goods Commercialization)**.

---

## 1. Overall Assessment

Viewed as a continuous operational progression across 11 screens, the Roastery OS prototype demonstrates **strong underlying transactional coherence grounded in immutable domain events**. 

A human operator can trace physical coffee from an inbound purchase order delivery (`PO → Receipt → Green Lot`), into a roasting conversion boundary (`Green Lot → Roast Batch / Transformation → Roasted Bulk Lot`), and through packaging assembly with physical packaging materials (`Roasted Lot + Pouch Lot → Packaging Batch / Transformation → Finished Good Lot → Sellable SKU`).

However, while the **data pipeline and state transitions are unified**, the **operator experience suffers from diagnostic leakage**:
1. Internal domain and database entity names (such as `transformation_input`, `provenance_edge`, `Acyclic DAG Matrix`, and `lot_valuation_record`) are displayed directly on screen cards.
2. Navigation across 11 flat, numbered buttons (`1. Receiving (POs)` through `11. Finished Goods Inspector`) reflects engineering milestones rather than an operator's daily plant floor workflow.
3. The boundary where physical inventory ends and commercial identity begins is correctly isolated in the domain, but requires clearer visual signposting in the UI so operators do not confuse a physical finished good lot with its commercial catalog SKU.

Fundamentally, the architecture is sound and executable end-to-end.

---

## 2. What Works

- **Unbroken Physical Continuity**: An `InventoryLot` created from an inbound purchase receipt (`LOT-GRN-FLORES-001`) appears immediately in Screen 4 as an available green coffee input. After roasting, the resulting lot (`LOT-RST-FLORES-001`) immediately populates Screen 8 as available intermediate stock for packaging.
- **Physical Packaging Material Accounting**: Packaging consumables (valve pouches, drip filter kits) are treated strictly as physical `InventoryLot` assets depleted via inventory movements, rather than invisible overhead cost events.
- **Authoritative Valuation Propagation**: Costing is calculated strictly on the backend using Full Absorption. The UI displays the resulting unit cost without executing financial mathematics in clientside JavaScript.
- **Strict Separation of Physical vs. Commercial Entities**: Commercial pricing (retail IDR 280,000) and barcodes live on `SKUMaster`, while stock levels and capitalized unit costs (~IDR 157,000) live on `InventoryLot`.
- **Accurate Domain Invariant Protection**: Attempts to consume more quantity than available in an inventory lot, or enter negative numbers, are immediately stopped by application services and surfaced as clear error banners.

---

## 3. Language / Terminology Issues

| Current Term | Where Observed | Problem / Diagnosis | Severity | Suggested Direction |
|---|---|---|---|---|
| **`Acyclic DAG Matrix`** | Screens 7 & 11 (Inspector Cards) | Computer science / graph theory term. Roasters and warehouse operators understand "Bean Lineage" or "Lot Traceability", not directed acyclic graphs. | **HIGH** | **RENAME** to *Lot Traceability & Lineage* |
| **`transformation_input` / `transformation_output` / `lot_valuation_record`** | Screens 3, 7, 11 (Card Header Tags) | Database table names leaked directly into UI badge pills. | **MEDIUM** | **HIDE** or **CONTEXTUALIZE** into *Consumed Lots*, *Produced Lots*, and *Valuation Breakdown* |
| **`Total Economic Pool`** | Screens 7 & 11 (Metrics Bar) | Accounting abstraction that confuses floor roasters. Roasters think in terms of *Total Batch Cost* or *Total Production Expense*. | **MEDIUM** | **RENAME** to *Total Batch Cost* |
| **`ASSEMBLY_PACKAGING` / `ROASTING` (Archetype Code)** | Screens 6, 10, 11 | Internal enum code exposed in uppercase without human formatting. | **LOW** | **CONTEXTUALIZE** into readable labels like *Whole Bean Packaging* or *Roasting* |
| **`FULL_ABSORPTION`** | Screens 5, 10 (Forms & Dropdowns) | Exposes internal cost allocation policy enum to operators who simply want standard unit cost calculation. | **LOW** | **CONTEXTUALIZE** with operator explanation (*Standard Unit Capitalization*) |

---

## 4. Workflow Issues

### Workflow A: Inbound Receiving (Phase 6A)
- **What Happens**: PO List → PO Detail → Click "Receive Inbound" → Fill Modal → View Receipt Inspector.
- **Strengths**: Clear modal pre-filling remaining quantities and contract unit purchase prices.
- **Frictions**: After receiving, the user is navigated to the Receipt Inspector. To roast the green beans, there is no direct call-to-action button (e.g. *"Plan Roast with this Lot &rarr;"*); the user must manually click Tab 4 (`Green Lots`) on the top subnav.

### Workflow B: Roasting / Material Conversion (Phase 6B)
- **What Happens**: Green Lots List → Select Lot → Roast Transformation Form → Submit → View Roast Inspector.
- **Strengths**: Clean mass balance display (`Input Mass` vs `Yield Mass` vs `Roast Loss %`).
- **Frictions**: The transition between starting a transformation and completing it is collapsed into a single synchronous form submit. While technically convenient, an operator running a 15-minute roast cycle might expect an active batch timer or execution status before entering final drop weight.

### Workflow C: Packaging & Finished Goods Commercialization (Phase 6C)
- **What Happens**: Packaging Inputs List → Select Coffee / Pouch → Packaging Execution Form → Submit → Finished Goods Inspector.
- **Strengths**: Successfully enforces dual physical inputs (coffee mass in KG + pouches in UNIT) without breaking UOM dimensions.
- **Frictions**: The operator must choose both the `Associated Commercial SKU` and the `Resulting Finished Material` manually. Since each SKU is tied 1:1 to a finished material in `sku_master`, selecting the SKU should automatically lock the matching physical material.

---

## 5. Cross-Module Inconsistencies

1. **Subnav Button Proliferation**:
   - The top navigation currently lists 11 individual numbered buttons.
   - It conflates **Workstream Modules** (Receiving, Roasting, Packaging) with **Diagnostic Inspectors** (Receipt Inspector, Roast Inspector, FG Inspector).
2. **Back Navigation Patterns**:
   - In Screen 2 (PO Detail), back button reads `← Back to PO List`.
   - In Screen 7 (Roast Inspector), back button reads `← Back to History`.
   - In Screen 11 (FG Inspector), back button reads `← Back to Packaging Inputs`.
   - The inspector screens lack a unified breadcrumb or consistent return route.
3. **Inspector State Persistence**:
   - The subnav buttons for *Receipt Inspector*, *Roast Inspector*, and *Finished Goods Inspector* start in a `disabled` state until an action occurs. Refreshing the browser resets clientside memory, disabling the inspector tabs even though the database holds the completed records.

---

## 6. Physical vs. Commercial Clarity

| Entity Layer | Defined Scope | UI Evaluation | Clarity Rating |
|---|---|---|---|
| **`Material`** | Physical substance definition (`RAW_MATERIAL`, `INTERMEDIARY_COFFEE`, `PACKAGING_MATERIAL`, `FINISHED_GOOD`) | Clearly distinguished in table category badges. Operators understand that green coffee, roasted beans, kraft pouches, and boxed drip sets are distinct materials. | **HIGH** |
| **`InventoryLot`** | Physical instance of inventory with specific quantity on hand, lot number, location, and acquisition cost. | Consistently rendered as the authoritative stock item across all screens. | **HIGH** |
| **`Transformation`** | Physical conversion boundary depleting source lots and materializing target lots. | Evident across both Roasting (KG &rarr; KG) and Packaging (KG + UNIT &rarr; UNIT). | **HIGH** |
| **`Product`** | Conceptual brand family / product line (e.g. *Flores Bajawa Single Origin Series*). | Rendered in Screen 9 as the catalog header grouping sellable variations. | **MEDIUM** |
| **`SKU`** | Sellable commercial unit with retail/wholesale pricing, packaging format, and barcode. | Rendered clearly under Products, but its connection to physical finished goods lots requires understanding `sku.material_id`. | **MEDIUM** |

### Multi-Dimensional Packaging Evaluation:
In Screen 10, combining `10 KG Roasted Coffee` with `10 UNIT Pouches` produces `10 UNIT Finished Goods`. The UI handles this without confusing mass and count dimensions because coffee is entered in KG while pouches and finished goods are entered in UNIT.

---

## 7. Costing & Traceability Visibility

### Costing:
- **Visibility Level**: Appropriate. Unit acquisition costs and total valuations are displayed cleanly on lot tables and inspector summaries.
- **Risk Identified**: The presence of the `Cost Allocation Policy` dropdown (`FULL_ABSORPTION` vs `MASS_PRO_RATA`) in execution forms makes costing feel like an operator choice rather than an automated business rule. In 99% of standard roasting and packaging runs, allocation policy should be pre-configured.

### Traceability:
- **Visibility Level**: High clarity in the table layout (`Source Lot Number`, `Consumed Qty`, `Target Lot Number`, `Resulting Output`).
- **Language Issue**: Card titled `Provenance Lineage (Acyclic DAG Matrix)` must drop "DAG Matrix" in favor of operational terminology.

---

## 8. AntiSlop Review

- **Rule Compliance**:
  - **No Empty Dashboard Stats**: The UI avoids arbitrary "productivity scores", "efficiency indexes", or decorative trend widgets. All metrics (`Input Mass`, `Yield Mass`, `Mass Loss %`, `Capitalized Cost / Unit`) are directly derived from PostgreSQL records.
  - **No Decorative Glassmorphism / Purple Gradients**: The interface uses a clean, high-contrast, functional design system (`#1e293b` slate headers, `#2563eb` action buttons, `#ffffff` surfaces, accessible WCAG AA borders).
  - **Usable Data Tables**: Tables provide complete information density without clipping critical lot numbers, quantities, or currency amounts.
- **AntiSlop Copy Violations**:
  - Exposure of internal DDL table names in card headers (`stock_ledger_movement`, `provenance_edge`).
  - Use of academic jargon (`Acyclic DAG Matrix`, `Economic Pool`).

---

## 9. Confirmed Gaps

1. **Continuous Workflow Hand-off**:
   - Lack of contextual action links connecting sequential operations (e.g. completing a roast does not offer a one-click *"Send to Packaging"* action).
2. **Inspector URL Routing / Deep Linking**:
   - Inspectors rely on in-memory JavaScript state (`app.state.selectedTxId`). Direct URL linking or page reloads lose the inspector context.
3. **Automated Bill of Materials (BOM) Calculation**:
   - The operator must manually specify packaging pouch counts matching target finished units rather than having a recipe auto-calculate requirements.

---

## 10. Questions for Product Review

1. **Inspector Role in Production UI**:
   - Are the *Receiving Inspector*, *Roast Inspector*, and *Finished Goods Inspector* permanent auditing screens for management, or diagnostic prototype views that should eventually be merged into Lot Detail drawers?
2. **Roast Execution Timing**:
   - Should a Roast Transformation support a persistent "In-Progress / Roasting" state where operators can log charge temp, turning point, and roast time before recording final drop weight?
3. **Commercial Catalog Management vs Production**:
   - Should Product and SKU definitions live in a dedicated "Catalog & POS" module rather than being nested directly inside the Production subnav?

---

## 11. Correct-but-Unfamiliar Concepts (DO NOT CHANGE)

The following core architectural patterns may feel dense or unfamiliar to casual users, but are **essential domain invariants that must be preserved**:

1. **Packaging Consumables as Physical Inventory**:
   - Packaging materials are physical inventory lots, not overhead expense items.
2. **Strict Separation of Material vs. Product vs. SKU**:
   - `Material` = Physical substance; `Product` = Brand family; `SKU` = Commercial sales unit. Merging these would corrupt inventory cost ledgers whenever retail prices or packaging branding change.
3. **Generic Transformation Model for Roasting & Packaging**:
   - Both roasting and packaging are transformations (`inputs → conversion boundary → outputs + valuation + lineage`).
4. **Waste Outputs do NOT Create Inventory Lots**:
   - `UNRECOVERABLE_WASTE` records physical mass loss without materializing phantom zero-value lots.

---

## 12. Recommended Changes

### P0 — Blocks Understanding or Plant Operation
- **P0.1**: Replace computer science jargon (`Acyclic DAG Matrix`, `Total Economic Pool`, table name badges) with operational roastery terms (*Traceability Lineage*, *Total Batch Cost*, *Inventory Ledger*).
- **P0.2**: Auto-bind `Resulting Finished Material` when `Associated Commercial SKU` is selected in packaging execution.

### P1 — Materially Improves Workflow Coherence
- **P1.1**: Restructure top navigation from 11 flat buttons into 3 operational tabs:
  - **1. Inbound Procurement** (PO List, Detail, Receipts)
  - **2. Roasting & Processing** (Green Coffee, Roast Execution, Batch History)
  - **3. Packaging & Finished Goods** (Production Inputs, Packaging Execution, Product/SKU Catalog)
- **P1.2**: Add contextual action buttons at workflow completion points (e.g. *"Roast this Lot &rarr;"* from Receiving Inspector, *"Package this Roasted Lot &rarr;"* from Roast Inspector).

### P2 — Polish / Future Optimization
- **P2.1**: Implement URL hash routing (`#po/PO-2026-001`, `#tx/TX-ROAST-001`) so inspector views persist across browser refreshes.
- **P2.2**: Hide advanced Cost Allocation Policy dropdowns under an "Advanced Accounting" toggle, defaulting to `FULL_ABSORPTION`.

---

## 13. Final Verdict

### **GREEN**

**Rationale**: The three vertical slices (Phase 6A Receiving, Phase 6B Roasting, and Phase 6C Packaging) form a **fully executable, mathematically sound, and architecturally coherent operational pipeline**. Physical inventory, mass yields, capitalized cost valuations, and multi-parent provenance flow seamlessly across PostgreSQL and the UI. The identified issues are language refinement and workflow ergonomics, none of which require domain ontology alterations.

The system is ready to proceed to the next milestone (**Phase 7: POS / Commercial Sales & Fulfillment Slice**).
