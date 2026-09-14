# Cost Entity Structure

## Purpose

This document defines the foundational cost-related entities, valuation relationship structures, and provenance models used inside the Costing Engine of Roastery OS.

The purpose of the Cost Entity Structure is to:
- standardize operational valuation entities across multi-stage transformation graphs,
- define the exact mathematical contracts on `InventoryLot` and `Transformation`,
- preserve deterministic costing continuity and economic auditability,
- separate **Current Inventory Valuation** (balance carried on live lots) from **Cost Provenance** (causal-temporal lineage of value additions on transformation edges),
- and maintain traceable margin and profitability relationships across all commercial channels without letting commercial catalog pricing contaminate production cost mathematics.

Cost entities represent operational economic reality, not merely accounting ledger categories.

---

# 1. Core Mathematical Model & Invariant Architecture

Roastery OS organizes production economics strictly around the frozen physical transformation ontology:

```text
Transformation Inputs (Consumed Lot Valuations)
       +
Transformation Added Costs (Labor, Energy, Consumables, Auxiliary Materials)
       ↓ (Yield & Policy Distribution)
Transformation Output Lots (Allocated Valuations) + Recognized Economic Dispositions
```

### Governing Conservation Invariant:
$$\sum_{i=1}^N V_{\text{consumed}}(\text{in}_i) + \sum_{k=1}^K C_k(T) = \sum_{j=1}^M V_{\text{allocated}}(\text{out}_j) + V_{\text{loss\_recog}}(T)$$

Where:
- $\text{in}_i \in \text{Inputs}(T)$ is an input lot consumption event.
- $C_k(T)$ is a direct transformation cost event.
- $\text{out}_j \in \text{Outputs}(T)$ is an output lot creation event.
- $V_{\text{loss\_recog}}(T)$ is explicitly recognized economic loss (write-off/scrap).

---

# 2. Entity Structural Hierarchy

Operational economics are structured into three decoupled layers:

```text
1. CURRENT INVENTORY VALUATION (Node Balance on InventoryLot)
   ├── quantity (Scalar physical quantity Q)
   ├── uom (Physical dimension: kg, g, L, ml, unit)
   ├── totalAssetValue (V_lot = Q * v_unit)
   └── currentUnitCost (v_unit = V_lot / Q, defined only for Q > 0)

2. TRANSFORMATION COST LEDGER & PROVENANCE (Edge Ledger on Transformation)
   ├── Input Consumption Ledger (V_consumed per input lot)
   ├── Cost Event Registry (DirectLabor, Energy, Packaging, MachineUsage, Maintenance)
   ├── Yield Event Record (Measured physical loss, concentration factor)
   ├── Output Allocation Ledger (V_allocated per output lot, allocation policy type)
   └── Economic Disposition Ledger (V_loss_recog, scrap/spoilage write-off)

3. COMMERCIAL PROFITABILITY METRICS (Derived upon Sales Fulfillment)
   ├── Cost of Goods Sold (COGS = q_sold * v_unit(Lot))
   ├── Gross Margin = SKU_Price - COGS
   └── Gross Margin Percentage = ((SKU_Price - COGS) / SKU_Price) * 100
```

---

# 3. Inventory Valuation Entity Specification

Attached directly to `InventoryLot`. Represents the current live asset balance.

### Fields & Contracts:
- `lot_id`: Unique identifier of the physical lot.
- `material_id`: Associated physical material master.
- `quantity`: Current physical balance ($Q \ge 0$).
- `uom`: Unit of measure (e.g., `kg`, `g`, `L`, `ml`, `unit`).
- `total_asset_value`: Monetary value currently carried by the lot ($V_{\text{lot}} \ge 0$).
- `unit_cost`: Derived instantaneous unit valuation ($v_{\text{unit}} = V_{\text{lot}} / Q$).
  - *Invariant*: When $Q = 0$, $V_{\text{lot}} = 0$ and $v_{\text{unit}}$ is retained as historical closing valuation.
- `valuation_state`: `ACTIVE`, `DEPLETED`, `WRITTEN_OFF`.
- `last_reconciliation_timestamp`: Timestamp of the latest transformation or audit event.

### Partial Consumption Rules:
When physical quantity $\Delta Q$ is consumed by a downstream transformation:
- **Physical Invariant:**
  $$Q(L_{\text{remaining}}) = Q(L_{\text{initial}}) - \Delta Q$$
- **Economic Invariant:**
  $$V(L_{\text{remaining}}) = V(L_{\text{initial}}) - V_{\text{consumed}}$$
- **Valuation Policy Interface:** The monetary value $V_{\text{consumed}}$ is calculated by the active inventory valuation policy (e.g., Specific Lot Identification, FIFO, Moving Weighted Average). For homogeneous specific lots:
  $$V_{\text{consumed}} = \Delta Q \times v_{\text{unit}}(L_{\text{initial}})$$
  $$V(L_{\text{remaining}}) = Q(L_{\text{remaining}}) \times v_{\text{unit}}(L_{\text{initial}})$$

*No economic value is duplicated or leaked during partial consumption.*

---

# 4. Transformation Cost Event Entity Specification

Attached to the `Transformation` boundary. Represents newly incurred **non-inventory conversion costs** added during processing.

### Cost Event Types (Non-Inventory Conversion Additions):
- `DIRECT_LABOR`: Roaster, barista, filler, kitchen, or packing labor hours allocated to the batch.
- `ENERGY_UTILITIES`: Gas burner fuel, roasting electricity, water filtration utility costs.
- `MACHINE_USAGE`: Machine depreciation reserve, equipment hourly operating rate, maintenance allocation.
- `DIRECT_SERVICE_FEE`: Outsourced toll-roasting fee, specialized testing/lab fee.
- `DIRECT_OVERHEAD`: Facility batch-level operational overhead.

### Strict Input vs. Cost Event Economic Boundary:
- **Material & Packaging Isolation:** Any physical asset tracked as an inventory lot (e.g., green coffee, roasted beans, mineral water, glass bottles, caps, labels, drip filter sachets, outer foil, boxes) **must enter strictly as a `TransformationInput` via $V_{\text{consumed}}$**.
- **Zero Double Counting:** Physical inventory lot costs **must never be registered as a `CostEvent` ($C_{\text{direct}}$)**. $C_{\text{direct}}$ is strictly restricted to non-inventory conversion and operating additions.
- **Bundled Services Policy:** Third-party services bundled with materials (e.g., toll roasting including bags) must be explicitly classified by policy into material input lots vs. conversion service cost events prior to transformation execution.

### Entity Attributes:
- `event_id`: Unique cost event identifier.
- `transformation_id`: Associated transformation boundary.
- `cost_type`: One of the non-inventory cost event types above.
- `amount`: Monetary value ($C_k \ge 0$).
- `currency`: Base system currency (e.g., `IDR`).
- `allocation_basis`: Direct assignment, time-rate ($Rp/hr$), or mass/volume throughput rate ($Rp/kg$, $Rp/L$).

---

# 5. Output Allocation & Provenance Specification

Attached to the `Transformation` boundary. Records the deterministic distribution of total transformation economic value.

### Total Transformation Economic Value ($V_{\text{total}}$):
$$V_{\text{total}}(T) = \sum_{i=1}^N V_{\text{consumed}}(\text{in}_i) + \sum_{k=1}^K C_k(T)$$

### Supported Allocation Policies:
1. **Full Absorption by Primary Output**: All $V_{\text{total}} - V_{\text{loss\_recog}}$ allocated to primary output; by-products/scrap receive $Rp 0$.
2. **Physical Mass/Volume Pro-Rata**: Value distributed in proportion to physical output mass/volume across compatible outputs.
3. **Net Realizable Value (NRV) Allocation**: Value distributed proportional to expected net market value for co-products.
4. **Nominal Standard Value**: By-products/residues credited at fixed standard rate, reducing primary output burden:
   $$V_{\text{primary}} = (V_{\text{total}} - V_{\text{loss\_recog}}) - (q_{\text{residue}} \times v_{\text{standard}})$$
5. **Discrete Component Summation**: For kitting/assembly, sum of exact component lot valuations plus kitting labor.

### Causal Provenance Lineage:
For any output lot $\text{Lot}_{\text{target}}$, its economic provenance is reconstructed recursively through the Material Transformation Graph:
$$\text{Provenance}(\text{Lot}_{\text{target}}) = \langle T_{\text{source}}, \{ \text{Provenance}(\text{Lot}_{\text{parent}, i}) \}, \{ C_k(T_{\text{source}}) \}, \text{YieldRatio}, \text{AllocationPolicy} \rangle$$

This allows full recursive auditability back to original green coffee procurement invoices and packaging purchases without forcing a specific database traversal implementation.

---

# 6. Commercial Profitability & COGS Realization

The system strictly enforces the unidirectional firewall between production economics and commercial sales:

1. **Commercial Catalog Independence**: Selling prices (SKU Price) do not dictate lot valuation during production.
2. **COGS Realization**: When a sales transaction fulfills quantity $q_{\text{sold}}$ from `InventoryLot`:
   $$\text{COGS} = q_{\text{sold}} \times v_{\text{unit}}(\text{Lot})$$
3. **Margin Derivation**:
   $$\text{Gross Margin} = \text{Revenue} - \text{COGS}$$
   $$\text{Gross Margin \%} = \frac{\text{Revenue} - \text{COGS}}{\text{Revenue}} \times 100$$

---

# 7. Invariant Summary

1. **Exact Conservation**: Total input value + conversion costs = total output value + recognized losses.
2. **Zero Contamination**: Commercial sales prices never mutate inventory asset valuation.
3. **Dimensional Integrity**: Physical quantities reconcile only within compatible dimensions; economic value reconciles across all transformations universally.
4. **Deterministic Reproducibility**: Given identical input lot valuations, cost events, and measured quantities, output valuations are strictly deterministic.
