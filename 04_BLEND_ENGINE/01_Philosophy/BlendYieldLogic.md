# Blend Yield Logic

## Purpose

This document defines the blend production yield philosophy and operational yield behavior used inside the Blend Engine of Roastery OS.

The purpose of Blend Yield Logic is to:
- preserve deterministic physical quantity transformation across input and output `InventoryLot` instances,
- maintain composition continuity,
- support operational inventory ledger accuracy,
- provide production visibility,
- and standardize blend output calculations.

Blend production may introduce:
- operational handling loss,
- grinder/mixer purge,
- container residue,
- and transformation shrinkage.

Blend yield behavior is one of the operational measurement layers inside blend production workflows.

---

# Core Philosophy

Roastery OS treats blend yield as:
- physical operational transformation behavior,
- not arbitrary inventory discrepancy.

Blend yield remains:
- explicit and measurable,
- traceable,
- deterministic,
- and operationally meaningful.

The system preserves:
- physical quantity continuity,
- transformation visibility,
- and production ledger integrity.

---

# Yield Philosophy

Blend production physically transforms:
- multiple source `InventoryLot` instances (typically `INTERMEDIATE` roasted coffee),
- into newly defined output `InventoryLot` instances (typically `INTERMEDIATE` or `DERIVATIVE` blend coffee).

Example:

```text
10.0 kg Total Consumed Inputs (InventoryLots)
↓ BlendBatch (Transformation)
9.8 kg Produced Output Stock (InventoryLot)
```

The resulting difference represents:
- expected physical operational transformation behavior (handling loss / purge),
- not inventory accounting error.

Blend yield is treated as:
- operational production telemetry.

---

# Yield Awareness Principle

Every `BlendBatch` record preserves:
- total input quantity ($Q_{\text{in}} = \sum Q_{\text{consumed}, i}$),
- total output quantity ($Q_{\text{out}}$),
- physical yield percentage ($Y_{\%}$),
- and operational loss percentage ($L_{\%}$).

Example:
- Total Consumed Input: $10.0\text{ kg}$
- Produced Output: $9.8\text{ kg}$
- Yield: $98.0\%$
- Operational Loss: $2.0\%$

Yield behavior remains:
- readable,
- auditable,
- and operationally understandable.

---

# Core Physical Yield Mathematics

Blend yield uses deterministic physical quantity calculations.

### Physical Yield Formula

$$Y_{\%} = \left( \frac{Q_{\text{out}}}{Q_{\text{in}}} \right) \times 100$$

Where:
- $Q_{\text{in}} = \sum_{i=1}^{n} Q_{\text{consumed}, i}$ (Total physical mass of all consumed `InventoryLot` inputs)
- $Q_{\text{out}} =$ Total physical mass of produced `InventoryLot` output

### Operational Handling Loss Formula

$$L_{\%} = 100 - Y_{\%} = \left( \frac{Q_{\text{in}} - Q_{\text{out}}}{Q_{\text{in}}} \right) \times 100$$

### Example Calculation

- Input $Q_{\text{in}} = 10.0\text{ kg}$
- Output $Q_{\text{out}} = 9.8\text{ kg}$
- $Y_{\%} = \frac{9.8}{10.0} \times 100 = 98.0\%$
- $L_{\%} = 100 - 98.0 = 2.0\%$

---

# Operational Loss Philosophy

Blend production may naturally create:
- mixer residue,
- container clinging,
- handling spillage,
- purge during quality verification.

Examples:
- Mixer Residue
- Container Transfer Loss
- Handling Spillage
- Packaging Preparation Purge

These behaviors remain:
- explicit and measurable,
- traceable on the `BlendBatch` record,
- and operationally visible.

Operational loss is considered:
- physical production behavior,
- not an inventory anomaly.

---

# Composition Relationship Principle

Yield behavior preserves:
- composition ratio continuity.

Example:
- Brazil Natural (`MaterialMaster`) → 60%
- Ethiopia Washed (`MaterialMaster`) → 40%
- $\downarrow$ `BlendBatch` Execution
- Output `InventoryLot` (Espresso Blend)

Even after physical handling shrinkage, the relative component ratios defined in the recipe are preserved across the output stock.

---

# Ledger & Inventory Relationship Principle

Blend yield directly determines:
- the exact physical quantity registered on the newly created output `InventoryLot` via `TRANSFORMATION_PRODUCE`,
- and the physical ledger depletion recorded on source `InventoryLot` instances via `TRANSFORMATION_CONSUME`.

The system preserves:
- ledger transformation continuity,
- yield visibility,
- and deterministic quantity relationships.

---

# Costing Engine Relationship Principle

Physical yield directly affects economic valuation, but valuation mathematics are owned strictly by the Costing Engine (`07_COSTING_ENGINE`).

Blend Engine owns:
- physical measurement of $Q_{\text{in}}$, $Q_{\text{out}}$, and $L_{\%}$.

Costing Engine owns:
- absorption of handling loss cost into the produced output stock unit cost via Canonical Equation 1:
  $$U_{\text{out}} = \frac{V_{\text{consumed}} + C_{\text{direct}}}{Q_{\text{out}}}$$

Because handling loss reduces the physical denominator $Q_{\text{out}}$ while the total economic pool $(V_{\text{consumed}} + C_{\text{direct}})$ is fully conserved, the resulting unit cost per kg $U_{\text{out}}$ naturally absorbs the cost of handling loss without secondary loss adjustments.

---

# Yield Validation Principle

Yield behavior remains operationally validated against expected tolerance ranges.

The system helps operators identify:
- abnormal handling loss (e.g., spillage or machine malfunction),
- unexpected scale tare errors (e.g., $Q_{\text{out}} > Q_{\text{in}}$ which is physically invalid in standard blending).

Examples:
- $Y_{\%} < 95.0\% \implies$ Warning: Abnormal handling loss.
- $Y_{\%} > 100.0\% \implies$ Error: Physically impossible output gain for unhydrated dry blending; check scale tare.

Yield validation supports:
- operational awareness and data hygiene,
- not silent automated tampering.

---

# Deterministic Yield Principle

Critical blend yield behavior must remain deterministic:
- mass balance calculations,
- operational loss percentages,
- ledger quantity postings,
- and lineage graphs.

The system avoids:
- hidden yield mutations,
- arbitrary discrepancy write-offs during transformation,
- and disconnected inventory records.

---

# MVP Scope

The MVP Blend Yield system prioritizes:
- deterministic mass calculations ($Q_{\text{in}}, Q_{\text{out}}, Y_{\%}, L_{\%}$),
- operational loss recording,
- transformation ledger continuity,
- and operator tolerance alerts.

The MVP intentionally excludes:
- predictive statistical yield regression,
- automated IoT scale sync,
- and complex humidity/moisture equalization models.

---

# Summary

Blend yield is:
- measurable physical production transformation behavior,
- physical mass evolution across `InventoryLot` instances,
- and production intelligence visibility.

Blend yield provides the exact physical denominator that allows the Costing Engine to deterministically value blended coffee inside Roastery OS.


