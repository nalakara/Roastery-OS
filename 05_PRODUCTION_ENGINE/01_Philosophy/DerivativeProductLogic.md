# Derivative Product Logic

## Purpose

This document defines the operational philosophy and architectural behavior of derivative products inside the Production Engine of Roastery OS.

The purpose of Derivative Product Logic is to:
- define how coffee evolves into multiple commercial forms,
- preserve operational transformation continuity,
- support modular production workflows,
- maintain derivative product traceability,
- and establish scalable product evolution architecture.

Derivative products represent:
- operationally transformed commercial products
derived from:
- coffee production inventory.

Derivative product systems are one of the major scalability foundations inside Roastery OS.

---

# Core Philosophy

Roastery OS treats derivative products as:
- operational production evolutions,
- workflow-specific commercial entities,
- and transformation-based product categories.

Derivative products are not merely:
- product variations,
- packaging differences,
- or marketing categories.

Derivative products represent:
- unique operational manufacturing behavior.

The system should preserve:
- workflow continuity,
- production traceability,
- costing evolution,
- and operational readability.

---

# Derivative Product Philosophy

Traditional inventory systems commonly interpret products as rigid, hardcoded silos:

```text
One Product = One Static Inventory Table
```

Roastery OS uses a generic, transformation-oriented material model:

```text
InventoryLot (Intermediate Roasted/Blend Lot)
       ↓ (Production Transformation Archetype)
InventoryLot (Derivative Finished Goods / Intermediate Lot)
```

Derivative products represent:
- operational material evolution, not cosmetic product variations.

---

# Core Derivative Product Principle

Every derivative product preserves:
- source `InventoryLot` consumption continuity,
- explicit `Transformation` lineage,
- workflow-specific physical process parameters,
- and unbroken cost provenance.

Example:
```text
Roasted Blend Lot (InventoryLot, INTERMEDIATE)
+ Water & Nitrogen Consumables
+ Packaging Lots (Glass Bottles, Caps, Labels)
       ↓ (COLD_BREW_EXTRACTION & BOTTLING Transformation)
Cold Brew Product Lot (InventoryLot, FINISHED_GOODS)
```

Derivative product relationships remain:
- deterministic,
- traceable,
- and operationally auditable via the immutable inventory ledger.

---

# Derivative Product Categories

Roastery OS supports diverse derivative product categories across standard transformation archetypes:
- **Whole Bean Coffee:** Bulk roasted beans packaged into retail or wholesale containers.
- **Ground Coffee:** Roasted beans transformed via calibrated particle reduction.
- **Drip Bag Coffee:** Precisely portioned ground coffee sealed in ultrasonic nitrogen-flushed filter pouches.
- **Cold Brew Concentrate / RTD:** Immersion or percolation liquid extraction packaged into kegs, bag-in-box, or bottles.
- **Ready-To-Drink (RTD) Beverages:** Formulated coffee beverages with water, dairy, or botanical additions.
- **Kitted / Gift Bundles:** Multi-item assemblies combining packaged coffee, drip bags, and merchandise.

Future derivative products evolve naturally by defining new `MaterialMaster` entries and `RecipeMaster` / `Transformation` definitions without schema migrations.

---

# Workflow-Specific Philosophy

Each derivative product introduces unique operational mechanics:
- **Ground Coffee:** Particle distribution curve, grinder burr temperature, retention loss.
- **Cold Brew:** Grind size, water-to-coffee brew ratio, extraction duration, brew temperature, filtration loss.
- **RTD Coffee:** Pasteurization/sterilization telemetry, dissolved oxygen, automated filling variance.
- **Drip Bag:** Nitrogen flush level ($<1.0\%\ \text{O}_2$), sachet seal integrity, tare weight accuracy.

The architecture supports workflow diversity and operational flexibility across all derivative lines.

---

# Production Workflow Principle

Derivative products are created through explicit `ProductionBatch` execution contexts:

```text
Input InventoryLots
       ↓ ProductionBatch (Transformation execution)
Output InventoryLots + Scrap Records
```

`ProductionBatch` acts as:
- operational execution anchor and scheduling unit,
- container for physical process parameters and quality checkpoints,
- and reference point for double-entry ledger transactions.

---

# Transformation Continuity Principle

Derivative products preserve complete upstream material genealogy:

```text
Green Coffee Lot (GB-101)
       ↓ (ROASTING)
Roasted Coffee Lot (RC-202)
       ↓ (BLENDING)
Blend Lot (BL-303)
       ↓ (COLD_BREW_EXTRACTION)
Cold Brew Bulk Intermediate Lot (CB-404)
       ↓ (BOTTLING)
Packaged Cold Brew Lot (FG-505)
```

Every derivative lot traces back to the exact roast profiles, blending ratios, and green coffee harvest lots that created it.

---

# Derivative Product Identity Principle

Derivative products generate new physical inventory lots:

$$\text{Input Roasted Coffee Lot} \neq \text{Derivative Product Lot}$$

Even when using the same source coffee, derivative products represent:
- distinct physical material properties and shelf-life constraints,
- distinct packaging and labor costs,
- and distinct commercial usability.

---

# Packaging Relationship Principle

Different derivative products consume distinct packaging bills of materials:
- **Whole Bean:** Gusseted foil bags, degassing valves, tin ties.
- **Cold Brew:** Amber glass bottles, crown caps, tamper-evident neck bands.
- **Drip Bags:** Non-woven filter sachets, foil outer pouches, 10-count retail boxes.

All packaging materials are physical `InventoryLots` (`materialType = PACKAGING`) consumed via `TRANSFORMATION_CONSUME` entries.

---

# Costing Relationship Principle

Derivative product costing preserves operational valuation continuity governed by `07_COSTING_ENGINE`:

$$U_{\text{derivative}} = \frac{\sum V_{\text{consumed}} + C_{\text{direct}}}{Q_{\text{out}}}$$

- **Production Engine:** Records exact physical input quantities consumed ($Q_{\text{coffee}}, Q_{\text{pkg}}, Q_{\text{water}}$), scrap generated, and direct process labor/machine energy costs.
- **Costing Engine:** Calculates unit valuations, absorbs overhead, and updates the double-entry valuation ledger.

---

# Yield Relationship Principle

Different derivative workflows experience distinct physical yield behaviors:
- **Cold Brew Extraction:** $65\% - 85\%$ liquid recovery depending on coffee grind absorption.
- **Drip Bag Portioning:** Grinding fines loss and volumetric dosing tare variance ($<1.5\%$).
- **Bottling / Canning:** Transfer line purge and foaming spillage ($<2.0\%$).

All material losses are explicitly recorded as `SCRAP` ledger transactions, preserving exact mass balance accounting.

---

# Shelf Life Philosophy

Derivative products introduce workflow-specific shelf-life behavior:
- **Whole Bean:** 6–12 months (nitrogen-flushed valve bag).
- **Ground Coffee:** 3–6 months.
- **Cold Brew (Kegged/Refrigerated):** 30–90 days ($4^\circ\text{C}$).
- **Cold Brew (Aseptic/Pasteurized RTD):** 6–12 months ambient.

`InventoryLot` preserves manufactured date, expiration date, and storage condition metadata to prevent obsolete inventory fulfillment.

---

# Commercial Relationship Principle

Derivative products fulfill diverse commercial channels:
- direct retail café bar consumption,
- wholesale café supply,
- grocery retail distribution,
- and subscription home delivery.

---

# SKU Relationship Principle

Derivative product lots map to commercial `SKUMaster` catalog items:

```text
InventoryLot (Packaged Cold Brew #CB-404)
       ├── 250ml Single Bottle POS SKU (SKU-CB-250)
       ├── 6-Pack E-Commerce SKU (SKU-CB-6PK)
       └── 24-Case Wholesale SKU (SKU-CB-CASE)
```

The physical derivative lot remains decoupled from commercial catalog presentation.

---

# Modular Product Principle

The generic `MaterialMaster` + `Transformation` model allows roasteries to introduce new derivative product lines (e.g., cascara sparkling tea, coffee concentrate, freeze-dried instant specialty coffee) with zero database migrations or code modifications.

---

# Deterministic Workflow Principle

Critical derivative product behavior remains strictly deterministic:
- mass balance conservation,
- immutable double-entry ledger transactions,
- cost absorption rules governed by `07_COSTING_ENGINE`,
- and end-to-end genealogical traceability.

---

# Human-Centered Philosophy

Derivative production workflows provide clear operational instructions and quality checkpoints for roasters, packaging operators, and QC technicians.

---

# AI Boundary Philosophy

AI systems may forecast derivative product demand, analyze extraction yields, and suggest optimal batch schedules. AI systems must **never** mutate ledger balances, alter physical lot records, or override costing equations.

---

# MVP Scope

The MVP Derivative Product system prioritizes:
- generic `InventoryLot` tracking across all 6 conversion archetypes,
- explicit packaging material consumption,
- physical yield and scrap recording,
- and end-to-end genealogical traceability back to roast batches.

---

# Architectural Notes

Derivative Product Logic establishes the operational bridge between bulk roasted coffee and diverse commercial products.

---

# Philosophy Summary

Derivative products are not superficial marketing variants.
Derivative products are:
- **operational manufacturing evolutions**,
- **outputs of deterministic physical transformations**,
- and **high-value commercial inventory entities**.

Derivative products define how roasted coffee expands into diverse commercial experiences inside Roastery OS.
