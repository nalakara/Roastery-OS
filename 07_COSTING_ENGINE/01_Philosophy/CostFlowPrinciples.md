# Cost Flow Principles & Mathematical Specification

## Purpose

This document defines the foundational mathematical model, valuation continuity principles, multi-dimensional yield mechanics, cost provenance rules, and reconciliation invariants governing the Costing Engine in Roastery OS.

The purpose of Cost Flow is to:
- provide a deterministic, mathematically rigorous framework for value flow across the Material Transformation Graph,
- establish the exact relationship between physical transformation yields and output unit valuations,
- formalize the distinction between **Current Inventory Valuation** (live asset valuation on lots) and **Cost Provenance** (auditable causal-temporal lineage history),
- define multi-output cost allocation policies,
- and ensure that derived metrics such as **HPP (Harga Pokok Produksi)** and **COGS (Cost of Goods Sold)** are deterministic projections of underlying operational reality.

---

# Core Principle

Roastery OS separates three operational realms:
1. **Physical Flow:** Measurable quantities, units of measure, moisture evaporation, extraction yields, retention losses, and portioning counts.
2. **Economic Flow:** Consumed input asset values, direct labor/energy/overhead additions, value conservation, co-product allocation, and inherited lot valuations.
3. **Commercial Flow:** SKU catalog pricing, channel discounts, sales invoicing, customer payments, and commercial gross margins.

Commercial selling prices and revenue figures **never** contaminate production cost mathematics.

---

# 1. Costing Vocabulary & Domain Definitions

- **Inventory Valuation ($V(L)$):** The total monetary economic value currently carried as an asset by an `InventoryLot` $L$.
- **Unit Valuation ($v_{\text{unit}}(L)$):** The instantaneous representation of scalar unit cost for lot $L$, valid within its specific physical dimension: $v_{\text{unit}}(L) = V(L) / Q(L)$ (defined only when $Q(L) > 0$). It is a descriptive readout, not a universal valuation mutation rule.
- **Transformation Input Participation ($V_{\text{consumed}}(\text{in}_i)$):** The monetary value deducted from an upstream inventory lot when physical material/packaging is consumed by a transformation. Evaluated via the active inventory valuation policy interface.
- **Direct Transformation Cost ($C_{\text{direct}}$):** Monetary non-inventory conversion additions incurred by executing the transformation (direct labor, utilities, machine depreciation, service fees).
- **Total Transformation Economic Value ($V_{\text{total}}$):** The total pool of economic value entering a transformation ($V_{\text{input\_total}} + C_{\text{direct}}$) that must be exhaustively accounted for across outputs and recognized economic dispositions.
- **Cost Provenance / Lineage:** The immutable, auditable causal-temporal explanation detailing every historical input lot, added cost event, and yield concentration factor that formed an inventory lot's valuation.
- **Yield Effect:** The mathematical concentration or dilution of unit cost resulting from physical mass/volume loss or extraction gain across a transformation.
- **Physical Loss vs. Economic Loss:** Physical loss is unrecoverable mass/volume (evaporation, shrinkage, grinder retention). Economic loss is an explicit financial write-off ($V_{\text{loss\_recog}}$) where monetary value is expensed from inventory assets rather than capitalized into output stock.
- **HPP (Harga Pokok Produksi):** The derived unit production cost embodied in an inventory lot at any stage of manufacturing.
- **COGS (Cost of Goods Sold):** The total inventory valuation consumed when an inventory lot is delivered against a commercial sales transaction.

---

# 2. Mathematical Boundary: TransformationInput vs. CostEvent

To eliminate double counting and ensure strict economic attribution:

### 1. TransformationInput (Material & Packaging Inventory $\rightarrow V_{\text{input\_total}}$)
- Represents a physical/material/packaging resource consumed from an existing `InventoryLot`.
- **Enters via:** $V_{\text{input\_total}}(T) = \sum V_{\text{consumed}}(\text{in}_i)$.
- **Includes:** Green coffee, roasted coffee, ground coffee, water, glass bottles, aluminum caps, waterproof labels, filter papers, outer foil sachets, rigid boxes, flavorings, and other physical inventory assets.
- **Rule:** If a physical resource is tracked as an inventory lot and consumed as an input, its economic value **must enter solely through $V_{\text{consumed}}$ and must never be included in $C_{\text{direct}}$**.

### 2. CostEvent (Non-Inventory Conversion Costs $\rightarrow C_{\text{direct}}$)
- Represents an eligible non-inventory operating cost incurred by executing the transformation and capitalized into the batch pool.
- **Enters via:** $C_{\text{direct}}(T) = \sum C_k(T)$.
- **Includes:** Roasting labor, grinding labor, bottling labor, packaging labor, gas burner fuel, electricity, machine hourly depreciation reserve, service provider fees.
- **Rule:** $C_{\text{direct}}$ is strictly reserved for conversion costs and **must never serve as a second channel for material inventory costs**. External bundles (e.g., outsourced roasting + bags) require explicit policy classification prior to entry.

---

# 3. Canonical Costing Mathematics (Equations 1–6)

Equations 1–6 define the authoritative forward operational cost flow across transformations.

### Mathematical Invariants (Must Hold Universally)

1. **Physical Quantity Conservation:**
   $$Q(L_{\text{initial}}) = q_{\text{consumed}} + Q(L_{\text{remaining}})$$
2. **Lot Economic Value Conservation:**
   $$V(L_{\text{initial}}) = V_{\text{consumed}} + V(L_{\text{remaining}})$$
3. **Transformation Economic Inbound:**
   $$V_{\text{total}}(T) = V_{\text{input\_total}}(T) + C_{\text{direct}}(T) = \sum_{i=1}^N V_{\text{consumed}}(\text{in}_i) + \sum_{k=1}^K C_k(T)$$
4. **Transformation Economic Outbound Conservation:**
   $$V_{\text{total}}(T) = \sum_{j=1}^M V_{\text{allocated}}(\text{out}_j) + V_{\text{loss\_recog}}(T)$$

---

### Canonical Operational Equations

#### Equation 1: Total Input Economic Value
$$V_{\text{input\_total}}(T) = \sum_{i=1}^{N} V_{\text{consumed}}(\text{in}_i)$$
*Evaluated at execution time by the active inventory valuation policy interface.*

#### Equation 2: Total Economic Pool Available for Allocation
$$V_{\text{total}}(T) = V_{\text{input\_total}}(T) + C_{\text{direct}}(T)$$

#### Equation 3: Output Allocation Rule
$$V_{\text{allocated}}(\text{out}_j) = \alpha_j \times \Big[ V_{\text{total}}(T) - V_{\text{loss\_recog}}(T) \Big], \quad \sum_{j=1}^M \alpha_j = 1$$

#### Equation 4: Output Lot Unit Asset Valuation
For any output $\text{out}_j$ receiving an `InventoryLot` $L_{\text{out}, j}$ with $q_{\text{produced}}(\text{out}_j) > 0$:
$$v_{\text{unit}}(\text{out}_j) = \frac{V_{\text{allocated}}(\text{out}_j)}{q_{\text{produced}}(\text{out}_j)}$$

#### Equation 5: Single-Output Transformation Valuation (1 → 1)
When $M=1$ (single primary output):
$$V_{\text{allocated}}(\text{out}_1) = V_{\text{total}}(T) - V_{\text{loss\_recog}}(T)$$
$$v_{\text{unit}}(\text{out}_1) = \frac{V_{\text{total}}(T) - V_{\text{loss\_recog}}(T)}{q_{\text{produced}}(\text{out}_1)}$$

#### Equation 6: Fractional Lot Balance & Valuation Policy Interface
When quantity $\Delta Q = q_{\text{consumed}}$ is deducted from lot $L_{\text{initial}}$:
- $Q(L_{\text{remaining}}) = Q(L_{\text{initial}}) - \Delta Q$ (Physical Invariant)
- $V(L_{\text{remaining}}) = V(L_{\text{initial}}) - V_{\text{consumed}}$ (Economic Invariant)
- The derivation of $V_{\text{consumed}}$ from $\Delta Q$ is governed by the active **Inventory Valuation Policy** (e.g., Specific Lot Identification, FIFO, Moving Weighted Average).
- *Note:* The relation $V_{\text{remaining}} = Q_{\text{remaining}} \times v_{\text{unit}}$ is a property of homogeneous specific lots under specific identification, not a universal definition for all valuation policies.

---

# 4. Analytical Provenance Decomposition (Equation 7)

Equation 7 is an **analytical diagnostic query**, NOT the operational calculation engine.

Operational costing calculates value strictly in the forward direction ($T_{t-1} \rightarrow \text{Lot} \rightarrow T_t$). Equation 7 provides the retrospective breakdown answering *"How much of output lot $L_{\text{out}}$'s value originated from specific upstream green coffee lots vs. packaging vs. labor?"*:

#### Equation 7: Analytical Provenance Decomposition
$$V(L_{\text{out}}) = \sum_{k=1}^K \omega_{\text{out}} C_k(T) + \sum_{i=1}^N \omega_{\text{out}} \left( \frac{q_{\text{consumed}}(\text{in}_i)}{Q(L_{\text{in}, i})} \right) V(L_{\text{in}, i})$$
where $\omega_{\text{out}} = \frac{V_{\text{allocated}}(L_{\text{out}})}{V_{\text{total}}(T) - V_{\text{loss\_recog}}(T)}$ is the output's fractional share of the transformation pool. Recursion proceeds backward through the causal-temporal transformation lineage until terminating at origin procurement lots.

---

# 5. Policy vs. Invariant Classification

| Domain Element | Classification | Behavioral Contract |
| :--- | :--- | :--- |
| **Physical Quantity Conservation** | **Mathematical Invariant** | $Q_{\text{initial}} = Q_{\text{consumed}} + Q_{\text{remaining}}$ |
| **Economic Value Conservation** | **Mathematical Invariant** | $V_{\text{total}}(T) = \sum V_{\text{allocated}}(\text{out}_j) + V_{\text{loss\_recog}}(T)$ |
| **Lot Value Conservation** | **Mathematical Invariant** | $V_{\text{initial}} = V_{\text{consumed}} + V_{\text{remaining}}$ |
| **Dimensional Integrity** | **Mathematical Invariant** | Mass/volume adds only within compatible units; currency adds globally. |
| **Commercial Firewall** | **Mathematical Invariant** | SKU catalog prices/revenues never alter production lot valuations. |
| **Inventory Depletion Method** | **Costing Policy** | Specific Lot ID, FIFO, Moving Weighted Average. |
| **Multi-Output Allocation Model** | **Costing Policy** | Full Absorption, Mass Pro-Rata, NRV, Standard Credit Rate. |
| **Loss Financial Recognition** | **Costing Policy** | Normal loss absorption into surviving units vs. explicit scrap write-off ($V_{\text{loss\_recog}}$). |

---

# 6. Multi-Output Allocation Policies

When a transformation generates multiple outputs ($M > 1$), the distribution of available value $[V_{\text{total}}(T) - V_{\text{loss\_recog}}(T)]$ across outputs is governed by a configured **Cost Allocation Policy**:

```text
========================================================================================
ECONOMIC VALUE DISPOSITION POLICIES
========================================================================================
Policy A: Full Absorption by Primary Output
  - Primary output absorbs 100% of (V_total - V_residue).
  - Co-products / by-products receive Rp 0 inventory valuation.
  - Used when secondary outputs have negligible commercial value (e.g., spent grounds).

Policy B: Physical Pro-Rata Allocation (Mass / Volume Share)
  - V_allocated(out_j) = V_total * [ q_produced(out_j) / Sum(q_produced) ]
  - Applicable only when outputs share identical physical dimensions and similar market value.

Policy C: Relative Sales Value / Net Realizable Value (NRV)
  - V_allocated(out_j) = V_total * [ (q_produced(out_j) * ExpectedMarketPrice_j) / TotalExpectedMarketValue ]
  - Applicable when co-products have distinct commercial market values (e.g., Green Coffee grading yielding Specialty Grade + Commercial Grade + Cascara).

Policy D: Standard Value Deduction for By-Products
  - By-product receives a fixed standard valuation V_byproduct = q_produced * StandardCreditRate.
  - Primary output absorbs the remainder: V_primary = V_total - V_byproduct.
  - Applicable when by-products have stable secondary market recovery prices (e.g., bulk cascara sold to tea blenders).

Policy E: Recoverable Residue Retention
  - Recoverable residue retained for rework carries pro-rata base unit cost into a holding lot:
    V_residue = q_residue * v_base_unit.
  - V_residue is deducted from V_total before primary output unit valuation is computed.
```

---

# 5. Multi-Dimensional Yield & Transformation Economics

The Cost Flow Engine supports six dimensional transformation archetypes without dimension conflation:

### 1. Intra-Dimensional Mass Conversion ($\text{kg} \rightarrow \text{kg}$)
- **Process:** Coffee Roasting, Bean Cleaning.
- **Physical Dynamics:** $1.00\text{ kg Green} \xrightarrow{15\% \text{ loss}} 0.85\text{ kg Roasted}$.
- **Yield Ratio:** $Y = 0.85 / 1.00 = 85\%$.
- **Economic Math:** $v_{\text{unit}} = (\text{Rp } 150,000 + \text{Rp } 10,000) / 0.85\text{ kg} = \text{Rp } 188,235.29 / \text{kg}$.

### 2. Intra-Dimensional Mass Formulation ($N \rightarrow 1$ Blending)
- **Process:** Multi-Origin Post-Roast Blending.
- **Physical Dynamics:** $0.50\text{ kg A} + 0.50\text{ kg B} + 0.10\text{ kg Spice} \rightarrow 1.10\text{ kg Seasonal Blend}$.
- **Economic Math:** $V_{\text{total}} = (0.50 \times v_{\text{A}}) + (0.50 \times v_{\text{B}}) + (0.10 \times v_{\text{Spice}}) + C_{\text{blend\_labor}}$.

### 3. Cross-Dimensional Liquid Extraction ($\text{kg} + \text{L} \rightarrow \text{L}$)
- **Process:** Cold Brew Immersion Brewing.
- **Physical Dynamics:** $0.30\text{ kg Roasted Grounds} + 3.00\text{ L Water} \rightarrow 2.50\text{ L Extract}$ ($0.50\text{ L}$ retained in wet cake).
- **Physical Equation:** $V_{\text{extract}} = V_{\text{water}} - (\text{Absorption Factor } \times M_{\text{coffee}})$.
- **Economic Math:** $V_{\text{total}} = V_{\text{coffee}} + V_{\text{water}} + C_{\text{brew\_labor}}$.  
  $v_{\text{unit}}(\text{Extract}) = V_{\text{total}} / 2.50\text{ L}$.

### 4. Discrete Portioning ($\text{g} \rightarrow \text{Units}$)
- **Process:** Drip Bag Packaging.
- **Physical Dynamics:** $150\text{ g Ground Coffee} + 15\text{ Sachets} + 15\text{ Foils} \rightarrow 15\text{ Drip Bags @ } 10\text{ g}$.
- **Economic Math:** $V_{\text{total}} = (0.15\text{ kg} \times v_{\text{ground}}) + (15 \times \text{Cost}_{\text{sachet}}) + (15 \times \text{Cost}_{\text{foil}}) + C_{\text{packing\_labor}}$.  
  $v_{\text{unit}}(\text{Sachet}) = V_{\text{total}} / 15\text{ units}$.

### 5. Formulation & Bottling ($\text{L} + \text{Units} \rightarrow \text{Bottled Units}$)
- **Process:** RTD Bottling.
- **Physical Dynamics:** $2.50\text{ L Extract} + 10\text{ Glass Bottles} + 10\text{ Caps} + 10\text{ Labels} \rightarrow 10\text{ RTD Bottles @ } 250\text{ ml}$.
- **Economic Math:** $V_{\text{total}} = (2.50\text{ L} \times v_{\text{extract}}) + (10 \times \text{Cost}_{\text{bottle+cap+label}}) + C_{\text{bottling\_labor}}$.  
  $v_{\text{unit}}(\text{RTD Bottle}) = V_{\text{total}} / 10\text{ bottles}$.

### 6. Discrete Kitting / Assembly ($\text{Units} + \text{Units} \rightarrow \text{Composite Pack}$)
- **Process:** Gift Set Assembly.
- **Physical Dynamics:** $2\text{ RTD Bottles} + 4\text{ Drip Bags} + 1\text{ Gift Box} \rightarrow 1\text{ Holiday Gift Set}$.
- **Economic Math:** $V_{\text{total}} = (2 \times v_{\text{RTD}}) + (4 \times v_{\text{Drip}}) + \text{Cost}_{\text{box}} + C_{\text{kitting\_labor}}$.  
  $v_{\text{unit}}(\text{Gift Set}) = V_{\text{total}} / 1\text{ unit}$.

---

# 6. Cost Provenance & Lineage Traversal

Every `InventoryLot` carries an unbroken **Cost Provenance** causal lineage that allows recursive derivation and exact breakdown of its current asset valuation:

```text
[Holiday Gift Set Lot #GIFT-001] (Valuation = Rp 59,696.71)
  ├── Consumed: 2x RTD Bottle Lot #RTD-001 (Value = Rp 25,594.12)
  │     ├── Consumed: 0.50 L Cold Brew Lot #CB-001 (Value = Rp 16,194.12)
  │     │     ├── Consumed: 0.06 kg Roasted Lot #ROAST-001 (Value = Rp 11,294.12)
  │     │     │     ├── Consumed: 0.070588 kg Green Lot #GRN-001 (Value = Rp 10,588.24)
  │     │     │     └── Allocated Roast Cost: (0.06 / 0.85) * Rp 10,000 = Rp 705.88
  │     │     ├── Consumed: 0.60 L Water (Value = Rp 900.00)
  │     │     └── Allocated Brewing Cost: (0.50 L / 2.50 L) * Rp 20,000 = Rp 4,000.00
  │     ├── Consumed: 2x Glass Bottles + Caps + Labels (Value = Rp 7,400.00)
  │     └── Allocated Bottling Cost: (2 / 10) * Rp 10,000 = Rp 2,000.00
  ├── Consumed: 4x Drip Bag Lot #DRIP-001 (Value = Rp 14,102.59)
  │     ├── Consumed: 0.04 kg Ground Lot #GRD-001 (Value = Rp 7,969.26)
  │     │     ├── Consumed: 0.040201 kg Roasted Lot #ROAST-001 (Value = Rp 7,567.25)
  │     │     │     ├── Consumed: 0.047295 kg Green Lot #GRN-001 (Value = Rp 7,094.30)
  │     │     │     └── Allocated Roast Cost: (0.040201 / 0.85) * Rp 10,000 = Rp 472.95
  │     │     └── Allocated Grinding Cost: (40.201 g / 200 g) * Rp 2,000 = Rp 402.01
  │     ├── Consumed: 4x Drip Filter Sets (Value = Rp 4,800.00)
  │     └── Allocated Drip Packing Cost: (4 / 15) * Rp 5,000 = Rp 1,333.33
  ├── Consumed: 1x Gift Box Lot #BOX-001 (Value = Rp 15,000.00)
  └── Added: Direct Kitting Labor (Value = Rp 5,000.00)
```

---

# 7. Commercial Projections: HPP and COGS

### Derived HPP (Harga Pokok Produksi)
HPP is a real-time derived readout of the unit asset valuation:
$$\text{HPP}(\text{InventoryLot}) \equiv v_{\text{unit}}(\text{InventoryLot}) = \frac{V(L)}{Q(L)}$$
For commercial SKUs, $\text{HPP}$ represents the inventory valuation of the fulfilling lot:
$$\text{HPP}(\text{SKU-BUD-250G-WB}) = v_{\text{unit}}(\text{Lot #FG-250G-001})$$

### Derived COGS & Gross Profit
Upon sales checkout of quantity $q_{\text{sold}}$ at unit selling price $P_{\text{SKU}}$:
$$\text{COGS} = q_{\text{sold}} \times v_{\text{unit}}(\text{Lot})$$
$$\text{Revenue} = q_{\text{sold}} \times P_{\text{SKU}}$$
$$\text{Gross Profit} = \text{Revenue} - \text{COGS}$$
$$\text{Gross Margin \%} = \frac{\text{Gross Profit}}{\text{Revenue}} \times 100\%$$

---

# 8. Precision, Rounding & Reconciliation Invariants

1. **High Internal Precision:** All quantity and unit valuation calculations are maintained at high internal precision (minimum 6 decimal places for unit costs, 4 decimal places for quantities).
2. **Boundary Rounding:** Monetary currency values are rounded to currency precision (e.g., 2 decimal places for standard fiat, integer for Rupiah) only at transaction boundaries and final reporting ledgers.
3. **Exact Conservation Invariant:**
   $$\left| V_{\text{total}}(T) - \left( \sum_{j=1}^{M} V_{\text{allocated}}(\text{out}_j) + V_{\text{loss\_recog}}(T) \right) \right| = 0$$
4. **Fractional Residual Handling:** Any sub-cent/sub-Rupiah arithmetic remainder is assigned to the primary output lot balance to preserve exact conservation.

---

# 9. Test Suite Verification & Numerical Reconciliation

| Test # | Description | Input Value ($V_{\text{in}}$) | Added Cost ($C_{\text{dir}}$) | Output Value ($V_{\text{out}}$) | Loss ($V_{\text{loss}}$) | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Test 1** | Simple Roast ($1\text{ kg} \rightarrow 850\text{ g}$) | Rp 150,000.00 | Rp 10,000.00 | Rp 160,000.00 | Rp 0.00 | **PASS** |
| **Test 2** | Simple Grinding ($200\text{ g} \rightarrow 199\text{ g}$) | Rp 37,647.06 | Rp 2,000.00 | Rp 39,647.06 | Rp 0.00 | **PASS** |
| **Test 3** | Multi-Input Blend ($N \rightarrow 1$) | Rp 209,117.65 | Rp 5,000.00 | Rp 214,117.65 | Rp 0.00 | **PASS** |
| **Test 4** | Drip Bag Packaging ($150\text{ g} \rightarrow 15\text{ bags}$) | Rp 47,884.72 | Rp 5,000.00 | Rp 52,884.72 | Rp 0.00 | **PASS** |
| **Test 5** | Cold Brew Extraction ($0.3\text{ kg} \rightarrow 2.5\text{ L}$) | Rp 60,970.59 | Rp 20,000.00 | Rp 80,970.59 | Rp 0.00 | **PASS** |
| **Test 6** | RTD Bottling ($2.5\text{ L} \rightarrow 10\text{ bottles}$) | Rp 117,970.59 | Rp 10,000.00 | Rp 127,970.59 | Rp 0.00 | **PASS** |
| **Test 7** | Branching ($850\text{ g} \rightarrow 4\text{ branches}$) | Rp 160,000.00 | Rp 0.00 | Rp 160,000.00 | Rp 0.00 | **PASS** |
| **Test 8** | Convergence ($2\text{ RTD} + 4\text{ Drip} + \text{Box}$) | Rp 54,696.71 | Rp 5,000.00 | Rp 59,696.71 | Rp 0.00 | **PASS** |
| **Test 9** | Multi-Output Split (Policy B & D) | Rp 1,500,000.00 | Rp 100,000.00 | Rp 1,600,000.00 | Rp 0.00 | **PASS** |
| **Test 10** | Deep Recursive Provenance Chain | Rp 38,482.54 | Rp 21,214.17 | Rp 59,696.71 | Rp 0.00 | **PASS** |

*All 10 tests satisfy $V_{\text{in}} + C_{\text{dir}} = V_{\text{out}} + V_{\text{loss}}$ exactly.*

