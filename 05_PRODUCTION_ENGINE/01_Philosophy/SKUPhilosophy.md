# SKU Philosophy

## Purpose

This document defines the philosophy, operational meaning, and architectural role of SKU systems inside Roastery OS.

The purpose of SKU Philosophy is to:
- define commercial product identity,
- separate operational inventory from sales identity,
- preserve modular production architecture,
- support multi-channel commercial workflows,
- and maintain scalable commercial product structures.

SKU systems represent:
- customer-facing commercial identity.

SKU systems are not:
- production execution systems,
- or inventory transformation entities.

This distinction is one of the foundational architectural principles inside Roastery OS.

---

# Core Philosophy

Roastery OS treats SKU as:
- commercial identity abstraction,
- sales-facing product structure,
- and customer-oriented categorization.

SKU is not:
- inventory itself,
- production batch identity,
- or transformation lineage.

SKU represents:
- how products are commercially presented,
sold,
and recognized.

The system should preserve:
- separation between operational inventory
and
- commercial product identity.

---

# SKU Philosophy

Traditional inventory systems commonly merge:

```text id="x5m8tw"
Inventory
=
SKU
Roastery OS intentionally separates:
Inventory
≠
SKU
This separation preserves:
	•	operational flexibility,
	•	production scalability,
	•	and modular architecture continuity.

# Inventory vs SKU Principle

### Physical `InventoryLot`
Represents:
- physical operational stock on hand,
- measurable quantity and UoM dimension,
- immutable double-entry ledger state,
- transformation continuity,
- and upstream batch lineage.

Examples:
- Green Coffee Lot (`materialType = RAW_COFFEE`)
- Roasted Coffee Lot (`materialType = INTERMEDIATE`)
- Roasted Blend Lot (`materialType = INTERMEDIATE`)
- 250g Packaged Geisha Lot (`materialType = FINISHED_GOODS`)

### Commercial `SKUMaster`
Represents:
- commercial sales identity and catalog classification,
- retail packaging presentation rules,
- customer-facing pricing and barcode (UPC/EAN),
- and multi-channel sales categorization.

Examples:
- `SKU-GEO-250`: 250g Retail Geisha Bag
- `SKU-GEO-1KG`: 1kg Wholesale Geisha Bag
- `SKU-DRIP-10PK`: 10-Pack Geisha Drip Box
- `SKU-CB-1L`: 1L Bottled Cold Brew

This distinction is critical for scalable roastery operations.

---

# Commercial Identity Philosophy

SKU systems exist primarily for commercial sales workflows:
- Point of Sale (POS) retail checkout
- Wholesale ordering and B2B invoices
- E-Commerce storefronts
- Coffee subscription engines
- Marketplace integrations

SKU structures support customer recognition, pricing rules, and sales channel presentation.
SKU systems **never** dictate physical manufacturing mechanics or transformation execution.

---

# SKU as an Abstraction Layer

SKU acts as a commercial abstraction layer between physical inventory and customer sales channels:

```text
InventoryLot (Physical Stock Instance, materialType: FINISHED_GOODS)
       │
       ▼ satisfies packaging/spec requirements
SKUMaster (Commercial Catalog Definition)
       │
       ▼ listed across
Sales Channels (POS, E-Commerce, Wholesale, Subscriptions)
```

This abstraction preserves:
- operational manufacturing flexibility,
- commercial sales agility,
- and seamless multi-channel fulfillment.

---

# One Inventory to Multiple SKUs Principle

A single physical inventory lot format may satisfy multiple commercial SKUs:

```text
InventoryLot (250g Packaged House Blend #PB-104)
       ├── Direct Retail POS SKU (SKU-HB-250-RET)
       ├── E-Commerce Store SKU (SKU-HB-250-WEB)
       └── Wholesale Sample SKU (SKU-HB-250-SMP)
```

The same physical inventory satisfies distinct commercial channels without duplicating inventory records or creating artificial lot splits.

---

# One SKU to Multiple Inventory Lots Principle

A commercial SKU may be fulfilled by different physical inventory lots over time:
- A "Seasonal Espresso 250g" SKU may be fulfilled by Lot #PB-201 in January and Lot #PB-305 in February.
- A "Roaster's Choice Subscription" SKU may rotate between distinct single-origin roast lots each week.

SKU systems remain commercially flexible while physical inventory lots remain deterministic, traceable, and costed individually.

---

# SKU Independence Principle

SKU systems must not directly manipulate inventory transformation behavior:

$$\text{SKUMaster} \neq \text{ProductionBatch}$$

Production workflows remain operationally deterministic. SKU systems remain commercially descriptive. This strict separation prevents commercial marketing changes from corrupting manufacturing ledger integrity.

---

# Packaging Relationship Philosophy

SKU definitions specify expected packaging formats (e.g., 250g valve pouch, 1L amber glass bottle, 10-count box).

However:

$$\text{Packaging Material} \neq \text{SKUMaster}$$

Packaging materials (bags, valves, tins, boxes) are physical materials tracked in `InventoryLot` and consumed during manufacturing. SKU defines the commercial presentation.

---

# Branding Relationship Philosophy

SKUMaster definitions store brand naming, tasting notes, roast level descriptions, and customer marketing copy.

Branding systems remain commercially expressive, while physical inventory tracking remains strictly grounded in material physics, batch metrics, and double-entry ledger state.

---

# Sales Relationship Philosophy

SKU systems optimize commercial usability and catalog management across sales channels:
- POS barcode lookups
- Web store inventory synchronization
- Wholesale price lists and volume tiers

SKU systems do not orchestrate machine maintenance, grinder calibration, or production batch workflows.

---

# Costing Relationship Philosophy

SKU definitions store commercial retail pricing, wholesale tier pricing, and target margin structures.

However:

$$\text{SKU Retail Price} \neq \text{Inventory Lot Unit Cost}$$

- **Inventory Lot Unit Cost** originates deterministically from upstream material consumption and direct production costs via `07_COSTING_ENGINE`.
- **SKU Retail Price** is a commercial decision reflecting market positioning, brand value, channel discounts, and taxes.

Roastery OS strictly decouples physical manufacturing valuation from commercial pricing.

---

# Traceability Philosophy

SKU transactions maintain indirect traceability back to sourcing origins:

```text
Customer Order (SKU-HB-250)
       ↓ fulfills from
InventoryLot (Packaged Coffee Lot #FG-2026-089)
       ↓ produced by
ProductionBatch #PB-2026-004
       ↓ consumed
Roasted / Blend Lot #RC-802
       ↓ roasted in
RoastBatch #RB-2026-042
       ↓ sourced from
Green Coffee Lot #GB-089 (Origin: Ethiopia Yirgacheffe)
```

Commercial records link seamlessly to full operational provenance without cluttering the sales domain with manufacturing details.

---

# Derivative Product Philosophy

Different derivative product categories utilize distinct SKU configurations:
- Whole Bean Coffee SKUs
- Ground Coffee SKUs (with grind size variants)
- Drip Bag Box SKUs
- Bottled Cold Brew SKUs
- Ready-To-Drink (RTD) Can SKUs
- Merchandise & Kitted Gift Box SKUs

Generic `MaterialMaster` and `SKUMaster` structures support all derivative categories without requiring custom code or specialized database schemas.

---

# Deterministic Inventory Principle

SKU systems must never compromise:
- double-entry ledger conservation,
- transformation lineage continuity,
- or operational lot traceability.

SKU is a commercial abstraction layer, not an inventory mutation tool.

---

# Human-Centered Philosophy

SKU management remains clear and intuitive for roasters, baristas, wholesale managers, and e-commerce staff:
- sales teams manage pricing and catalog visibility easily,
- production operators focus on batch execution and physical lot yields,
- and leadership has immediate clarity on margins without ERP friction.

---

# AI Boundary Philosophy

AI systems may:
- analyze SKU sales velocity and recommend catalog adjustments,
- suggest dynamic pricing strategies based on cost fluctuations,
- and forecast demand for packaging materials.

AI systems must **never**:
- autonomously reassign physical inventory lots to mismatched SKUs,
- or alter historical lot costs and transaction ledgers.

---

# MVP Scope

The MVP SKU system prioritizes:
- canonical `SKUMaster` data model,
- clean separation between `SKUMaster` and physical `InventoryLot`,
- packaging specification mapping,
- multi-channel catalog support,
- and basic price tier configuration.

The MVP excludes:
- automated algorithmic pricing bots,
- multi-currency global tax matrix engines,
- and enterprise retail markdown optimization suites.

---

# Architectural Notes

SKU systems form the commercial presentation layer of Roastery OS, bridging manufacturing reality with market commerce.

The architecture remains:
- **Decoupled:** Manufacturing operations are unaffected by catalog rebranding.
- **Traceable:** Commercial fulfillment maps back to exact physical lots.
- **Scalable:** Multi-channel and multi-brand catalogs run on a single unified inventory core.

---

# Philosophy Summary

SKU is not inventory, batch identity, or physical transformation.
SKU is:
- **commercial product abstraction**,
- **sales-facing product structure**,
- and **customer-facing retail identity**.

SKU organizes how coffee is presented to the world, while `InventoryLot` and `Transformation` preserve how coffee is crafted inside Roastery OS.
