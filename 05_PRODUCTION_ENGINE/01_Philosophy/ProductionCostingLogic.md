# Production Costing Logic

## Purpose

This document defines the interface and operational boundary between the Production Engine and the Costing Engine (`07_COSTING_ENGINE`) inside Roastery OS.

The purpose of Production Costing Logic is to:
- define the physical production inputs and outputs that feed the economic valuation engine,
- enforce strict ownership boundaries between physical manufacturing execution and financial cost accounting,
- ensure accurate capitalization of packaging, additives, and direct conversion costs,
- and preserve end-to-end cost provenance and traceability.

---

# Core Philosophy

Roastery OS strictly separates **physical production execution** from **economic valuation**:

```text
[ Production Engine ]
  • Physical recipe mass / counts (Q_consumed, i)
  • Physical output quantity / unit counts (Q_out)
  • Physical scrap / handling loss
  • Direct cost event capture (C_direct)
            │
            ▼ (Physical Quantities & Direct Events)
[ 07_COSTING_ENGINE ]
  • Consumed value calculation: V_consumed = ∑ (Q_consumed, i × U_consumed, i)
  • Direct cost capitalization: C_direct
  • Canonical Equation 1 (Unit Cost Derivation): U_out = (V_consumed + C_direct) / Q_out
  • Canonical Equation 7 (Provenance Decomposition)
            │
            ▼ (Valuation Postings)
[ Inventory Lot Asset Value ] (U_out assigned to target InventoryLot)
```

The Production Engine **does not perform valuation arithmetic or mutate inventory values**. It provides deterministic physical measurements to the Costing Engine.

---

# Transformation Cost Boundary

In the Production Engine, every `ProductionBatch` represents a physical `Transformation`.

### 1. Consumed Materials Valuation ($V_{\text{consumed}}$)
Production transformations consume multiple physical `InventoryLot` inputs:
- **Base Coffee Lots:** (e.g. Roasted Whole Bean or Cold Brew Liquid).
- **Packaging Material Lots:** (e.g. 250g Valve Bags, Glass Bottles, Tin Cans, Drip Filter Pouches).
- **Additives / Formulation Ingredients:** (e.g. Water, Syrups, Nitrogen).

Each consumed lot $i$ has a known, immutable unit cost $U_{\text{consumed}, i}$ established at the moment of depletion. The Costing Engine aggregates total consumed value:
$$V_{\text{consumed}} = \sum_{i=1}^{n} \left( Q_{\text{consumed}, i} \times U_{\text{consumed}, i} \right)$$

### 2. Direct Capitalizable Added Costs ($C_{\text{direct}}$)
Specific, direct, batch-traceable cash expenditures may be attached directly to the production transformation via `CostEvent` records:
- Outsourced contract canning/bottling fees,
- Machine hourly capitalizable run costs,
- Direct piece-rate packaging labor.

*Note: General administrative overhead and indirect fixed labor are NOT capitalized into inventory lots unless explicitly configured via the Costing Engine.*

### 3. Output Unit Cost Derivation (Canonical Equation 1)
The Costing Engine calculates the unit cost for the produced output `InventoryLot` ($U_{\text{out}}$) by dividing the total transformation economic pool by the actual physical produced quantity ($Q_{\text{out}}$):

$$U_{\text{out}} = \frac{V_{\text{consumed}} + C_{\text{direct}}}{Q_{\text{out}}}$$

Where:
- $V_{\text{consumed}} =$ Total economic value of all consumed coffee, packaging, and additive lots.
- $C_{\text{direct}} =$ Total direct capitalizable added costs.
- $Q_{\text{out}} =$ Actual measured physical output units or mass (e.g. 39 units of 250g bags, or 18.5 L of cold brew).

---

# Yield & Handling Loss Absorption

Production workflows naturally experience physical handling loss, grinding retention, brewing absorption, and packaging scrap.

Because Canonical Equation 1 divides the full economic pool $(V_{\text{consumed}} + C_{\text{direct}})$ by the actual produced quantity $Q_{\text{out}}$, **the financial cost of physical shrinkage and scrap is automatically and mathematically absorbed into the remaining output units**.

Example:
- Consumed Coffee: $10.0\text{ kg} \times \$15.00/\text{kg} = \$150.00$
- Consumed Bags: $40\text{ units} \times \$0.50/\text{unit} = \$20.00$
- Direct Boxing Fee: $\$10.00$
- Total Economic Pool: $\$150.00 + \$20.00 + \$10.00 = \$180.00$
- Actual Produced Output ($Q_{\text{out}}$): $39\text{ bags}$ (1 bag lost during machine sealing / purge)
- Output Unit Cost ($U_{\text{out}}$):
  $$U_{\text{out}} = \frac{\$180.00}{39\text{ bags}} = \$4.6154/\text{bag}$$

No manual write-off or secondary cost adjustment is required during standard production.

---

# Analytical Cost Provenance Decomposition (Canonical Equation 7)

To ensure full commercial transparency, the Costing Engine maintains analytical provenance breakdown for every produced lot via Canonical Equation 7:

$$U_{\text{out}} = U_{\text{raw\_coffee}} + U_{\text{roast\_direct}} + U_{\text{packaging}} + U_{\text{production\_direct}} + U_{\text{yield\_drag}}$$

This enables the roastery to see exactly how much of a \$4.62 retail bag's cost comes from green coffee sourcing, roasting labor/energy, packaging materials, and manufacturing shrinkage.

---

# Summary of Engine Responsibilities

| Responsibility | Production Engine | Costing Engine (`07_COSTING_ENGINE`) |
| :--- | :---: | :---: |
| Recipe Formulation & Ratios | **OWNS** | Read-Only |
| Physical Input Depletion ($Q_{\text{consumed}, i}$) | **OWNS** | Read-Only |
| Physical Output Quantity ($Q_{\text{out}}$) | **OWNS** | Read-Only |
| Physical Scrap / Purge Tracking | **OWNS** | Read-Only |
| Input Lot Valuation Lookup ($U_{\text{consumed}, i}$) | External | **OWNS** |
| Total Consumed Value ($V_{\text{consumed}}$) | External | **OWNS** |
| Output Unit Cost Derivation ($U_{\text{out}}$) | External | **OWNS** |
| Cost Provenance Decomposition (Eq 7) | External | **OWNS** |

The Production Engine maintains strict adherence to physical execution and delegates 100% of economic math to `07_COSTING_ENGINE`.
