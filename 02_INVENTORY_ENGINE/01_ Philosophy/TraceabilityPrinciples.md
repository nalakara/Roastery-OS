# Traceability Principles

## Purpose

This document defines the traceability philosophy and operational lineage principles used across Roastery OS.

The purpose of traceability within Roastery OS is to:
- preserve complete genealogical material lineage across all roastery processes,
- maintain recursive multi-parent and multi-child traceability ($L_{\text{in}} \rightarrow T \rightarrow L_{\text{out}}$),
- support quality accountability, origin tracking, and customer recall capabilities,
- and ensure cost and physical lineage remain deterministic and human-auditable.

---

# Core Philosophy: Graph-Based Material Lineage

Traceability in Roastery OS is modeled as a **Material Transformation Graph**:

```text
[ Supplier / Inbound Receipt ]
              │
              ▼
   [ Green Coffee InventoryLot ]
              │
              ▼ (Roasting Transformation)
   [ Roasted Coffee InventoryLot ]
              │
              ├──────────────────────────────────┐
              ▼ (Blending Transformation)        ▼ (Packaging Transformation)
    [ Blend InventoryLot ]              [ Packaged Retail Bag InventoryLot ]
              │                                  │
              ▼ (Extraction Transformation)      ▼ (Commercial Fulfillment)
  [ Cold Brew Extract Lot ]                   [ Customer / Order ]
```

---

# Key Traceability Dimensions

### 1. Multi-Parent Traceability (Convergence)
When multiple inventory lots combine (e.g. post-roast blending or liquid beverage formulation):
- The resulting `InventoryLot` maintains an unbroken link to the generating `Transformation`.
- The `Transformation` records every participating parent `InventoryLot` and the exact quantity consumed ($\Delta Q_{\text{in}}$).

### 2. Multi-Child Traceability (Branching)
When a single intermediate lot is divided across multiple independent downstream operations (e.g. whole bean bulk sales, drip bag packaging, cold brew extraction):
- Each child `InventoryLot` links directly back to the shared parent lot via its generating transformation.
- Downstream events in one branch never compromise the historical lineage of other branches.

### 3. Sourcing & Origin Traceability
Tracing any retail package or intermediate lot backward through the transformation graph resolves the originating `Supplier` identifier, country of origin, harvest lot, and processing method.

### 4. Commercial Sales Traceability
When an order for a commercial `SKU` is fulfilled, the transaction records the exact `inventoryLotId` instances depleted, providing end-to-end traceability from customer cup back to green coffee farmer.

---

# Architectural Invariants

1. **Immutable Lineage Links:** Transformation outputs and movement records permanently reference their source inputs.
2. **Deterministic Traversal:** Lineage can be traversed upstream (root cause / origin analysis) and downstream (recall / quality impact analysis) with complete mathematical precision.
3. **Decoupling from Commercial Taxonomy:** Lineage connects physical **`InventoryLot`** instances and **`Transformation`** events; commercial `Product` and `SKU` entities attach at the point of commercial fulfillment.

