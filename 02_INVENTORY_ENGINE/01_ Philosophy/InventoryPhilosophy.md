# Inventory Philosophy

## Purpose

This document defines the foundational inventory philosophy used across Roastery OS.

The purpose of this philosophy is to establish:
- how inventory is interpreted as evolving physical material states,
- how inventory participates in transformation workflows,
- and how physical inventory remains distinct from commercial products and sellable SKUs.

This philosophy acts as the conceptual foundation for all inventory-related operations within Roastery OS.

---

# Core Philosophy: Inventory as Evolving Material State

Roastery OS does not treat inventory as static retail stock shelves. Instead, inventory continuously evolves through operational transformations:
- roasting raw green coffee into roasted whole bean intermediates,
- blending single-origin lots into composite blend lots,
- grinding bulk whole beans into ground coffee intermediates,
- portioning and sealing coffee into commercial packaging formats,
- and extracting coffee into liquid derivatives (cold brew, RTD beverages).

```text
[ Physical Material Spec ] ── (instantiates) ──► [ InventoryLot (Physical Stock) ]
                                                         │
                                               (Transformation Event)
                                                         │
                                                         ▼
                                                 [ New InventoryLot ]
```

---

# Key Architectural Separations

### 1. Material (Spec) vs. InventoryLot (Physical Instance)
- **`Material` (`MaterialMaster`)**: The canonical definition of a physical material (properties, storage specs, primary UOM).
- **`InventoryLot`**: The discrete physical batch residing in a bin, tank, or warehouse location with a specific quantity ($Q_{\text{lot}}$), physical state, availability status, and live unit cost ($U_{\text{lot}}$).

### 2. Commercial SKU (Offer) vs. InventoryLot (Fulfillment Stock)
- **`Product` / `SKU` (`ProductMaster`, `SKUMaster`)**: Conceptual catalog offers, customer descriptions, barcodes, and selling prices.
- **`InventoryLot`**: The physical fulfillment stock. A commercial SKU is fulfilled from matching `InventoryLot` instances contextually at transaction time ($M:N$).

### 3. Physical State vs. Availability Status
- **`PhysicalState`**: Describes the physical form of the material (`RawMaterial`, `Intermediate`, `Packaged`).
- **`AvailabilityStatus`**: Describes operational availability (`Available`, `Reserved`, `In-Transformation`, `Sold`, `Depleted`, `Archived`).

---

# Transformation-Driven Inventory Principles

1. **Deterministic Inventory Ledger:** Physical quantities are modified strictly through immutable `InventoryMovement` records.
2. **Yield & Loss Awareness:** Process shrinkage and yield loss ($Y = Q_{\text{out}} / Q_{\text{in}}$) are natural physical transformations. The Costing Engine automatically recalculates unit costs to absorb yield loss into output lots.
3. **Multi-Branch & Fractional Participation:** An `InventoryLot` may be partially consumed across multiple independent downstream branches without affecting the integrity or valuation of unconsumed stock.
4. **Human-Auditable Traceability:** Every `InventoryLot` preserves an unbroken lineage link ($L_{\text{in}} \rightarrow T \rightarrow L_{\text{out}}$) back to its originating transformation or purchase receipt.
5. **AI Boundary:** AI systems may analyze inventory trends and recommend batch sizes, but must never autonomously execute silent stock balance mutations.


