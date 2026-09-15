# PHASE 6C UI DISCOVERY & OBSERVATION LOG

**Document Purpose**: Diagnostic log capturing observations, domain/contract questions, confirmed gaps, non-issues, and workflow findings discovered when rendering the Roastery OS Packaging, Finished Goods, Commercial Catalog, and Multi-Input Provenance models into the Phase 6C functional UI vertical slice.

---

## 1. Observations: Material vs. Product vs. SKU vs. InventoryLot

The central investigation of Phase 6C is testing the operational clarity of the multi-layered commercial and physical ontology:

```
+-------------------------------------------------------------------------+
| Commercial Layer (Catalog & Pricing)                                   |
|   ProductMaster (Brand / Series identity, e.g. "Flores Bajawa SO")       |
|     ↓ 1:N                                                               |
|   SkuMaster (Sellable commercial unit, e.g. "SKU-FLORES-1KG-WB", Price) |
+-------------------------------------------------------------------------+
                                    ↕ (Linked by material_id)
+-------------------------------------------------------------------------+
| Physical Layer (Inventory & Valuation)                                  |
|   MaterialMaster (Physical substance, e.g. "FG-FLORES-1KG-WB", UOM)    |
|     ↓ 1:N                                                               |
|   InventoryLot (Physical stock instance, e.g. "LOT-FG-FLORES-1KG-001")  |
+-------------------------------------------------------------------------+
```

| Entity | Role in Packaging Workflow | Operator Experience / Findings |
|---|---|---|
| **`Material`** | Physical substance definition (e.g. `ROAST-FLORES-FILTER`, `PKG-POUCH-1KG-MATTE`, `FG-FLORES-1KG-WB`). | Clear distinction between bulk intermediate coffee, physical packaging consumables, and resulting finished items. |
| **`Product`** | Conceptual product family / brand line (e.g. `PROD-FLORES-SO` - *Flores Bajawa Single Origin Series*). | Does not have stock or price; acts as the catalog umbrella grouping related SKUs. |
| **`SKU`** | Sellable commercial unit (e.g. `SKU-FLORES-1KG-WB`, `BAG_1KG`, Retail Price IDR 280,000, Barcode). | Defines customer-facing presentation and pricing rules. In the UI, SKU stock is accurately calculated as `SUM(availableQuantity)` across all active `InventoryLot` records matching `sku.material_id`. |
| **`InventoryLot`** | Physical instance of inventory with specific lot number, warehouse location, quantity on hand, and capitalized unit cost. | The immutable unit of stock that is depleted during sales or created during packaging. |

### Key Insight:
The separation between **Physical Material (`material_master`)** and **Commercial SKU (`sku_master`)** prevents commercial pricing changes (e.g. retail price increase or barcode update) from corrupting historic inventory cost ledgers. Packaging operations produce physical **`InventoryLot`** instances of a finished **`Material`**, which are then made commercially available through matching **`SKU`** definitions.

---

## 2. Packaging Materials as Physical Inventory Inputs (Not Cost Events)

In Roastery OS, packaging materials (such as 1KG valve pouches, 250G kraft pouches, and 10-pack drip box kits) are tracked as physical `InventoryLot` records with `material_category = 'PACKAGING_MATERIAL'`:

1. **Why Packaging is an Inventory Input:**
   - Physical pouches, boxes, and degassing valves have independent unit purchase prices and physical stock levels.
   - Using them in production depletes real physical warehouse balances via `TRANSFORMATION_CONSUME`.
   - Their acquisition unit cost is absorbed directly into `transformation.inputs` and rolled into the finished good's `total_economic_pool`.
2. **Contrast with Cost Events:**
   - `cost_event` is reserved exclusively for non-inventoried conversion expenses (e.g. direct packing labor, electricity/nitrogen flush utilities, machine depreciation).
   - If packaging were treated as a `cost_event`, pouch quantities would not decrement in inventory, leading to phantom warehouse stock.

---

## 3. Supported Packaging Scenarios Matrix

| Scenario Archetype | Inputs Consumed | Yield Outputs Produced | Execution Status | Provenance Topology |
|---|---|---|---|---|
| **Scenario A: Whole Bean 1KG Packaging** (1:1 Multi-Input) | 5 KG Roasted Coffee Lot + 5 UNIT 1KG Pouch Lot | 5 UNIT Finished Goods Lot (`FG-FLORES-1KG-WB`) | **WORKING (Executable)** | Multi-Parent DAG (2 Source Lots → 1 Target Lot) |
| **Scenario B: Grinding & Packaging** (Multi-Step / Multi-Input) | 2.5 KG Roasted Coffee Lot + 10 UNIT 250G Pouch Lot | 10 UNIT Ground Coffee Finished Lot (`FG-FLORES-250G-GRD`) | **WORKING (Executable)** | Multi-Parent DAG (2 Source Lots → 1 Target Lot) |
| **Scenario C: Drip Bag 10-Pack Production** (Kit Assembly) | 1.2 KG Roasted Coffee Lot + 10 UNIT Drip Filter Box Sets | 10 UNIT Drip Box Finished Goods Lot (`FG-FLORES-DRIP-10PK`) | **WORKING (Executable)** | Multi-Parent DAG (2 Source Lots → 1 Target Lot) |

---

## 4. Confirmed Gaps & Discoveries

| Identified Item | UI Screen / Area | Operational Finding | Recommended Consideration |
|---|---|---|---|
| **BOM (Bill of Materials) Presets** | Start Packaging Form | Currently, the operator inputs coffee quantity and pouch quantity manually (or selects a scenario preset). | In future production planning, a formal BOM recipe can automatically calculate required packaging material lots based on target output units. |
| **Direct SKU Binding on Transformation Output** | Transformation Complete Form | `transformation_output` links to `material_id`. The SKU link is derived via `sku_master.material_id`. | Maintaining the link via `material_id` is clean and adheres to the physical vs commercial separation. |
| **Dual UOM Representation (Mass vs Count)** | Available Lots & Outputs | Intermediary coffee is measured in `KG`, while packaging and finished goods are measured in `UNIT` (count). | The domain handles distinct UOM dimensions cleanly without cross-dimension mathematical errors. |

---

## 5. Non-Issues (Verified Consistent with Frozen Architecture)

- **Multi-Parent Provenance DAG**: When multiple inventory lots (coffee + packaging) are consumed into a finished good lot, the system creates discrete `provenance_edge` records for each input lot pointing to the same `target_lot_id`.
- **Valuation Capitalization**: The final unit cost of the finished good lot accurately combines `(Coffee Material Cost + Packaging Material Cost + Direct Labor Cost + Machine Cost) / Yield Units`.
- **Stock Availability Projection**: The commercial SKU list dynamically reflects available finished goods stock without maintaining duplicate inventory counters.
