# Packaging Relationship

## Purpose

This document defines the operational philosophy and architectural relationship between packaging materials and production workflows inside Roastery OS.

The purpose of Packaging Relationship is to:
- define packaging as a physical material conversion in the `Transformation` lifecycle,
- preserve physical inventory ledger continuity for packaging items,
- maintain packaging traceability and scrap recording,
- support commercial finished goods generation,
- and establish a modular, decoupled packaging architecture.

Packaging is the physical encapsulation transformation layer inside the Production Engine.

---

# Core Philosophy

Roastery OS treats packaging as:
- physical material consumption (`TransformationInput`),
- commercial usability enablement,
- and finished goods generation.

Packaging is not merely:
- visual presentation or cosmetic decoration,
- or an abstract financial overhead percentage.

Packaging materials are:
- real physical items tracked in `MaterialMaster` (`materialType = PACKAGING`),
- stocked in discrete `InventoryLot` instances,
- and consumed via `TRANSFORMATION_CONSUME` ledger movements.

---

# Packaging as Physical Transformation

Traditional retail systems treat packaging as an intangible markup or cosmetic step:
$$\text{Coffee} + \text{Packaging Markup} = \text{Product}$$

Roastery OS treats packaging as an explicit physical material transformation:

```text
Source Coffee Lot (Material: Roasted Coffee, INTERMEDIATE)
+
Packaging Lot (Material: 250g Gusset Valve Bag, PACKAGING)
+
Label Lot (Material: Front/Back Label Set, PACKAGING)
       ↓ ProductionBatch (Packaging Transformation)
Output Packaged Lot (Material: 250g Retail Bag, FINISHED_GOODS)
```

Packaging creates:
- a new physical `InventoryLot` with defined commercial format,
- unbroken multi-parent lineage back to both coffee and packaging lots,
- and capitalized asset value based on both coffee and packaging consumption.

---

# Packaging vs Commercial Entities

To ensure modularity and scalability, Roastery OS maintains strict separation between related domain concepts:

```text
Packaging Material (MaterialMaster) ≠ Packaging Spec (PackagingTypeMaster) ≠ Commercial SKU (SKUMaster)
```

1. **Packaging Material (`MaterialMaster`):** The physical stock item (e.g. `250g Matte Black Valve Bag`, `330ml Amber Glass Bottle`). Stored in `InventoryLot` instances with physical count/weight and purchase unit cost.
2. **Packaging Specification (`PackagingTypeMaster`):** The structural engineering profile (dimensions, capacity, tare weight, seal temp, valve specs) that guides machine settings and recipe portioning.
3. **Commercial SKU (`SKUMaster`):** The customer-facing sales identity (e.g. `House Espresso 250g Whole Bean - E-Commerce`), which is fulfilled by an available packaged `InventoryLot`.

---

# Packaging Inventory Mechanics

### 1. Procurement & Storage
Packaging items are received via `PURCHASE_RECEIPT` into `InventoryLot` records:
- Lot ID: `LOT-BAG-2026-004`
- Material: `250g Matte Black Gusset Bag`
- Quantity: `5,000 units`
- Unit Cost: `$0.45 / unit`

### 2. Consumption in Production
When executing a packaging batch:
- The required packaging count is deducted from `LOT-BAG-2026-004` via `TRANSFORMATION_CONSUME`.
- Damaged bags or calibration scrap are recorded as physical scrap quantities on the `ProductionBatch`.

### 3. Economic Capitalization
The Costing Engine values packaging consumption directly as part of $V_{\text{consumed}}$:
$$V_{\text{packaging}} = Q_{\text{bags\_consumed}} \times U_{\text{bag\_cost}}$$

This value enters the transformation cost pool and is capitalized directly into the resulting finished goods unit cost via Canonical Equation 1. Packaging is never treated as vague indirect overhead.

---

# Multi-Format Packaging Independence

The same bulk roasted coffee lot can be split across multiple packaging formats without duplicating roasting records:

```text
Bulk Roasted Coffee Lot (100 kg)
  ├── 40 kg + 160 Bags (250g) ──► Output Lot 1: 160 units of 250g Retail Bags
  ├── 30 kg + 60 Bags (500g)  ──► Output Lot 2: 60 units of 500g Retail Bags
  └── 30 kg + 6 Totes (5kg)   ──► Output Lot 3: 6 units of 5kg Wholesale Totes
```

Each packaging run is an independent `ProductionBatch` that consumes the exact physical materials required, ensuring precise mass balance and inventory ledger integrity.

---

# Packaging Scrap & Filling Variance

Packaging operations may experience machine sealing defects, bag tears, or overfill purge:
- **Scrap Tracking:** Packaging units consumed but scrapped during setup are recorded on the `ProductionBatch` (`lossQuantity`, reason `PACKAGING_SCRAP`).
- **Cost Absorption:** Because the Costing Engine divides the total consumed pool ($V_{\text{consumed}}$) by the actual successful produced units ($Q_{\text{out}}$), scrap costs are naturally absorbed into the good units.

---

# Summary

Packaging in Roastery OS is:
- physical material transformation,
- tracked via `MaterialMaster` and `InventoryLot`,
- capitalized deterministically via `07_COSTING_ENGINE`,
- and completely decoupled from commercial SKU presentation.

