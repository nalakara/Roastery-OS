# Roast Traceability

## Purpose

This document defines the roasting traceability philosophy and operational traceability behavior used across Roastery OS.

The purpose of Roast Traceability is to:
- preserve roasting lineage across parent and child `InventoryLot` instances,
- maintain transformation visibility from green procurement to roasted intermediate and finished goods,
- support production continuity,
- enable operational accountability,
- and provide readable roasting history across inventory evolution workflows.

---

# Core Philosophy

Roastery OS treats roasting traceability as:
- operational lineage,
- transformation continuity,
- and roasting relationship visibility.

Roast traceability represents:
- which input `InventoryLot` instances were consumed,
- how roasting transformation occurred (`RoastBatch` execution, telemetry, profile adherence),
- and which output `InventoryLot` instances were created.

---

# Traceability Architecture

Roasting connects agricultural green coffee sourcing to downstream roasted products:

```text
Supplier / Producer Harvest Lot
↓ Purchase Order Receipt (PO)
Input InventoryLot (Material: RAW_COFFEE)
↓ RoastBatch (Transformation: Profile, Telemetry, Yield)
Output InventoryLot (Material: INTERMEDIATE Roasted)
↓ Packaging (SKU) or Blending (BlendBatch)
Finished Goods InventoryLot (SKU)
```

---

## Core Traceability Graph Properties

Every `RoastBatch` acts as an immutable transformation node recording:
1. `roastBatchId`: Unique transformation execution identifier.
2. `profileId`: Target process template applied (`RoastProfileMaster`).
3. `consumedLots`: Array of input `InventoryLot` IDs, quantities consumed, and unit cost basis.
4. `producedLots`: Array of output `InventoryLot` IDs, quantities yielded, and allocated unit cost basis ($U_{\text{out}}$).
5. `roasterTelemetry`: Immutable record of charge temp, drop temp, duration, DTR%, and loss %.

---

## Forward & Backward Lineage

- **Forward Traceability (Green $\rightarrow$ Roasted $\rightarrow$ Bagged $\rightarrow$ Order)**:
  Starting from a green coffee `InventoryLot`, determine every `RoastBatch` that consumed it, every resulting roasted `InventoryLot`, and every packaged retail SKU or blend containing that lot.
- **Backward Traceability (Customer Bag $\rightarrow$ Roast Batch $\rightarrow$ Green Lot $\rightarrow$ Farm)**:
  Starting from a packaged `InventoryLot` barcode, trace back to the exact `RoastBatch`, roaster operator, thermal profile curve, green `InventoryLot`, and original agricultural origin.

---

## AI Boundary Philosophy

AI systems may assist roasters in querying traceability graphs (e.g., "Find all customer bags roasted from green lot LOT-2026-04"). However, AI systems must **never** modify or overwrite the immutable lineage relationships established during batch execution.

---

## Philosophy Summary

Roast traceability is not merely logging. Roast traceability is **roasting lineage, transformation visibility, and operational production storytelling**. Roast traceability preserves the complete operational memory of coffee evolution inside Roastery OS.

