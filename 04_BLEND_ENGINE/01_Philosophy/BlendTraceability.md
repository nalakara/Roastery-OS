# Blend Traceability

## Purpose

This document defines the blend traceability philosophy and operational traceability behavior used inside the Blend Engine of Roastery OS.

The purpose of Blend Traceability is to:
- preserve multi-parent blend composition lineage,
- maintain production continuity from individual roast batches to intermediate blend lots and packaged finished goods,
- support inventory transformation visibility across multi-lot inputs,
- enable operational accountability,
- and provide clear production history across blend workflows.

---

# Core Philosophy

Roastery OS treats blend traceability as:
- multi-parent composition lineage,
- transformation continuity,
- and operational relationship visibility.

Blend traceability represents:
- which component `InventoryLot` instances were combined,
- which `RoastBatch` and agricultural source lots created those components,
- what recipe version was executed,
- and which output `InventoryLot` instances were created.

---

# Traceability Architecture

Blending creates multi-parent nodes in the Roastery OS lineage graph:

```text
[Farm A] -> PO Receipt -> Green Lot 1 -> RoastBatch 1 -> Roasted Lot 1 (60kg) ──┐
                                                                               ├──> BlendBatch -> Output Blend Lot (99.5kg) -> Packaging -> Finished Retail SKU
[Farm B] -> PO Receipt -> Green Lot 2 -> RoastBatch 2 -> Roasted Lot 2 (40kg) ──┘
```

---

## Core Traceability Graph Properties

Every `BlendBatch` acts as an immutable multi-parent transformation node recording:
1. `blendBatchId`: Unique transformation execution identifier.
2. `recipeId`: Reference to `BlendRecipeMaster` and version.
3. `consumedLots`: Array of input `InventoryLot` IDs, quantities consumed (kg), and unit cost basis.
4. `producedLots`: Array of output `InventoryLot` IDs, quantities produced (kg), and allocated unit cost basis ($U_{\text{out}}$).
5. `compositionRatios`: Actual recorded weight percentages per input lot.
6. `yieldMetrics`: Total mass charged vs total mass recovered.

---

## Forward & Backward Lineage

- **Forward Traceability (Roast Batch $\rightarrow$ Blend Batch $\rightarrow$ Packaging Lot $\rightarrow$ Customer)**:
  Starting from any individual roast batch or green coffee lot, discover every blend batch that utilized it and every retail bag shipped containing that blend.
- **Backward Traceability (Customer Retail Bag $\rightarrow$ Blend Batch $\rightarrow$ Parent Roasted Lots $\rightarrow$ Green Lots $\rightarrow$ Farms)**:
  Starting from a retail bag barcode, trace back to the exact blend batch, all constituent parent roast batches, roasting curves, roaster operators, and green sourcing contracts.

---

## Multi-Stage & Reusable Intermediate Lineage

Because blending output is an `InventoryLot` (`INTERMEDIATE`), the lineage graph cleanly supports multi-stage blending (e.g. creating a base blend intermediate lot, and later blending that intermediate lot with additional flavor components or varietals).

---

## AI Boundary Philosophy

AI systems may assist roasters in querying complex multi-parent graphs (e.g., "Trace all blends affected by green recall on LOT-ETH-09"). However, AI systems must **never** modify frozen lineage links.

---

## Philosophy Summary

Blend traceability is **multi-parent composition lineage, transformation visibility, and operational production storytelling**. Blend traceability preserves the unbroken operational memory of how multiple coffees combine to create a blend in Roastery OS.
	or batch logging.
Blend traceability is:
	•	composition lineage,
	•	transformation visibility,
	•	and operational production storytelling.
Blend traceability preserves the operational memory of how multiple roasted inventories evolve into a newly traceable blend entity inside Roastery OS.

