# Production Yield Logic

## Purpose

This document defines the production yield philosophy and operational yield behavior used inside the Production Engine of Roastery OS.

The purpose of Production Yield Logic is to:
- preserve deterministic quantity transformation,
- maintain production continuity,
- support finished goods accuracy,
- provide operational manufacturing visibility,
- and standardize production output calculations.

Production workflows may introduce:
- handling loss,
- packaging loss,
- brewing loss,
- residue,
- purge,
- and operational shrinkage.

Production yield behavior is one of the operational intelligence layers inside production workflows.

---

# Core Philosophy

Roastery OS treats production yield as:
- operational manufacturing behavior,
not:
- inventory discrepancy.

Production yield should remain:
- explicit,
- traceable,
- deterministic,
- and operationally meaningful.

The system should preserve:
- quantity continuity,
- transformation visibility,
- and production integrity.

---

# # Yield Philosophy

Production workflows transform physical input inventory lots into commercially sellable finished goods or intermediate outputs.

Example:
```text
Inputs: 10.0 kg Roasted Coffee Lot + 40 Units 250g Retail Bags
       ↓ ProductionBatch (Grinding & Portioning Transformation)
Outputs: 39 Units Packaged Coffee Lot (9.75 kg equivalent)
Scrap: 0.15 kg Grinding Residue + 1 Damaged Bag
Shrinkage/Loss: 0.10 kg (Moisture loss / unrecoverable fines)
```

The resulting difference represents expected physical manufacturing behavior, not inventory error.
Production yield is treated as:
- operational manufacturing intelligence,
- mass and unit balance conservation,
- and input to unit cost determination.

---

# Yield Awareness Principle

Every `ProductionBatch` preserves:
- total input quantities per material ($Q_{\text{consumed}, i}$),
- total output quantities per produced lot ($Q_{\text{produced}, j}$),
- scrap quantities per material ($Q_{\text{scrap}, k}$),
- physical yield percentage,
- and operational loss/scrap percentage.

---

# Core Yield Formulas

### 1. Mass-Based Yield (Coffee Material Conversion)
For transformations where physical mass is conserved or converted (e.g., Grinding, Extraction, Portioning):

$$\text{Mass Yield } (\%) = \left( \frac{\sum Q_{\text{output\_mass}}}{\sum Q_{\text{input\_coffee\_mass}}} \right) \times 100$$

$$\text{Mass Loss } (\%) = 100\% - \text{Mass Yield } (\%)$$

### 2. Unit/Packaging Yield (Portioning / Packaging / Assembly)
For discrete packaging conversion (e.g., Target Units vs Actual Units):

$$\text{Packaging Yield } (\%) = \left( \frac{Q_{\text{actual\_units}}}{Q_{\text{target\_units}}} \right) \times 100$$

$$\text{Defect Rate } (\%) = \left( \frac{Q_{\text{damaged\_pkg\_units}}}{Q_{\text{total\_pkg\_units\_consumed}}} \right) \times 100$$

---

# Operational Loss & Scrap Philosophy

Production workflows naturally generate operational losses:
- **Grinder Retention & Fines:** Coffee grounds trapped in chute and burr chamber ($0.5\% - 2.0\%$).
- **Cold Brew Absorption:** Liquid retained in spent coffee grounds cake ($1.5 - 2.2 \times \text{dry coffee weight}$).
- **Bottling / Purge Loss:** Liquid lost during line priming, foaming, and filtration purge.
- **Packaging Defects:** Damaged pouches, failed heat seals, or defective degassing valves.

Operational loss behavior remains:
- explicit and measurable,
- categorized as either **Scrap** (physically measured and written off) or **Process Shrinkage** (unrecoverable loss),
- and recorded via double-entry ledger transactions (`TRANSFORMATION_CONSUME` / `SCRAP`).

---

# Derivative Product Yield Principle

Different transformation archetypes introduce distinct yield dynamics:
- **Ground Coffee:** Near $100\%$ mass yield ($98.5\% - 99.5\%$, loss is pure grinder retention).
- **Cold Brew Extraction:** Liquid yield typically $65\% - 85\%$ based on brew ratio and press efficiency.
- **RTD Bottling:** Liquid transfer yield $97\% - 99\%$; bottle packaging yield $98\% - 99.5\%$.
- **Drip Bag Portioning:** Dosing yield $98\% - 99.5\%$; sachet material yield $97\% - 99\%$.

---

# Inventory Relationship Principle

Production yield directly determines:
- exact physical quantities credited to output `InventoryLots`,
- exact quantities written off as scrap,
- and ledger mass balance integrity.

---

# Costing Relationship Principle (07_COSTING_ENGINE Integration)

Physical yield directly impacts unit cost valuation. Under `07_COSTING_ENGINE` Canonical Equation 1:

$$U_{\text{out}} = \frac{V_{\text{consumed}} + C_{\text{direct}}}{Q_{\text{out}}}$$

- **Lower Yield ($Q_{\text{out}}$ decreases):** Unrecoverable process shrinkage naturally inflates the unit cost of the surviving good units ($U_{\text{out}}$).
- **Physical Scrap ($Q_{\text{scrap}}$):** Explicitly tracked and costed according to scrap allocation policies in the Costing Engine.

Production Engine measures physical quantities; Costing Engine derives financial valuations.

---

# Yield Validation Principle

The system helps operators validate production results against standard recipe yields:
- **Unexpectedly Low Yield:** Alerts operator to possible machine misalignment, excessive grinder retention, or spillage.
- **Unexpectedly High Yield ($>100\%$ on dry coffee):** Alerts operator to tare calibration error or unrecorded input additions.

Yield validation supports operational quality assurance without blocking ledger finalization.

---

# Deterministic Yield Principle

Critical production yield behavior remains deterministic:
- double-entry mass conservation,
- immutable ledger recording,
- and cost provenance preservation.

---

# Human-Centered Philosophy

Yield tracking provides clear operational feedback for roasters and packaging staff without requiring manual spreadsheet calculations.

---

# AI Boundary Philosophy

AI systems may analyze historical yield trends, identify machine degradation patterns, and recommend recipe ratio refinements. AI systems must **never** mutate yield records or alter ledger transactions.

---

# MVP Scope

The MVP Production Yield system prioritizes:
- deterministic mass and unit yield calculations,
- physical scrap recording via `SCRAP` movements,
- yield variance reporting against recipe targets,
- and seamless input quantity handoff to `07_COSTING_ENGINE`.

---

# Architectural Notes

Production Yield Logic provides the physical telemetry and mass balance enforcement required for accurate operational accounting.

---

# Philosophy Summary

Production yield is not an inventory discrepancy.
Production yield is:
- **measurable physical transformation behavior**,
- **mass balance accounting**,
- and **the physical foundation of unit cost determination**.

Production yield tells the system exactly how physical coffee transforms into finished goods inside Roastery OS.
