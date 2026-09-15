# Blend Inventory Transformation

## Purpose

This document defines the inventory transformation behavior created by blend production workflows inside Roastery OS.

The purpose of Blend Inventory Transformation is to:
- preserve deterministic inventory evolution across multi-lot compositions,
- maintain blend composition continuity using `InventoryLot` and `MaterialMaster`,
- support production traceability with multi-parent lineage graphs,
- standardize blend `InventoryLot` creation,
- and provide operational transformation visibility adhering to the canonical Transformation contract.

Blend production transforms:
- multiple input `InventoryLot` instances (e.g. roasted intermediate coffee lots or raw green lots),
- into one or more newly defined blend `InventoryLot` instances.

---

# Core Philosophy

Roastery OS treats blend production as:
- inventory composition transformation,
- multi-parent operational evolution,
- and blend intermediate/derivative identity generation.

Blend transformation does not merely group inventory or relabel products. It creates:
- a new operational `InventoryLot`,
- a unified unit cost structure (calculated by `07_COSTING_ENGINE`),
- multi-parent traceability relationships,
- and production continuity.

---

# Transformation Philosophy

Traditional inventory systems often treat blends as virtual kits or commercial labels. Roastery OS uses a formal physical transformation model:

```text
Input InventoryLots (Lot A + Lot B)
↓ BlendBatch (Multi-Input Transformation Execution)
Output InventoryLot (Blended Material InventoryLot)
```

Blend production represents measurable inventory evolution.

---

## Core Transformation Principle

Every `BlendBatch` should:
- consume two or more input `InventoryLot` instances via `TRANSFORMATION_CONSUME` ledger movements,
- preserve physical component ratio measurements,
- generate output `InventoryLot` instances via `TRANSFORMATION_PRODUCE` ledger movements,
- emit transformation events to `07_COSTING_ENGINE` for unit cost assignment,
- and preserve multi-parent lineage.

Example:
```text
60 kg Brazil Cerrado Roasted (Lot #1)  ─┐
                                       ├──> BlendBatch (Loss: 0.5 kg) ──> 99.5 kg House Espresso Blend (Lot #3)
40 kg Ethiopia Washed Roasted (Lot #2) ─┘
```

The system preserves:
- source inventory lot identities (`consumedLots`),
- output inventory lot identity (`outputLotId`),
- and transformation relationship continuity.

---

## Input & Output Inventory Roles

- **Input `InventoryLot`**: Acts as component source stock (`category: INTERMEDIATE` for post-roast, or `RAW_COFFEE` for pre-roast).
- **Output `InventoryLot`**: Acts as blended intermediate stock (`category: INTERMEDIATE` or `DERIVATIVE`). It is **not** forced to be a terminal finished good; it can undergo subsequent grinding, extraction, flavoring, or packaging into retail SKUs.

---

## Yield & Handling Loss Transformation

Blending transformations typically exhibit minimal handling loss (e.g., scale residue, hopper cling, purge):
```text
Total Input Mass Charged: 100.0 kg
Blended Mass Recovered:   99.5 kg
Handling Loss:            0.5 kg (0.5% Loss, 99.5% Yield)
```

Handling loss is recorded as an expected physical effect of batch homogenization, not an unexplained inventory discrepancy.

---

## Transformation Events & Ledgering

1. Deduct component lots: `TRANSFORMATION_CONSUME` movement per input lot.
2. Create blended lot: `TRANSFORMATION_PRODUCE` movement for output lot.
3. Publish transformation event to `07_COSTING_ENGINE`:
   $$U_{\text{out}} = \frac{\sum (Q_{\text{in}, i} \times U_{\text{in}, i}) + \sum C_{\text{direct}}}{Q_{\text{out}}}$$
4. Update multi-parent traceability links.

---

## AI Boundary Philosophy

AI systems may evaluate blend yields across different mechanical mixers or recommend lot allocations based on bean age. However, AI systems must **never** execute or alter deterministic inventory movements.

---

## Philosophy Summary

Blend transformation is not virtual grouping or commercial relabeling. Blend transformation is **composition-based inventory evolution, physical production progression, and blend inventory identity generation**.


