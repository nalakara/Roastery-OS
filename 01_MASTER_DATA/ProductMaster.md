# Product Master

## Purpose

ProductMaster defines the canonical conceptual/commercial product identity used across Roastery OS.

This entity standardizes commercial product definitions to support:
- catalog management,
- brand and commercial product line hierarchy,
- commercial naming and storytelling,
- product categorization and marketing attributes,
- and commercial relationships with SKUs.

Product represents the **conceptual product offer** (e.g. *"El Paraiso Lychee Extended Anaerobic"*, *"Symphony House Blend"*, *"Signature Cold Brew Bottle"*), distinct from physical materials (`MaterialMaster`) and physical stock instances (`InventoryLot`).

---

# Core Philosophy

A commercial Product represents what the roastery offers to the market conceptually. It is distinct from physical material composition and physical inventory instances.

In the frozen Roastery OS ontology:
- **`Product`**: The conceptual/commercial product entity (e.g. *"House Blend"*).
- **`SKU`**: The specific sellable transaction unit of a Product (e.g. *"HB-250G-WB"*, *"HB-1KG-WB"*, *"HB-250G-DRIP"*). A Product has a $1:N$ relationship with SKUs.
- **`Material`**: The physical master specification (e.g. *Roasted Blend Whole Bean*, *Printed Kraft 250g Gusset Pouch*).
- **`InventoryLot`**: The physical stock batch residing in the warehouse with a specific quantity, location, and economic unit cost.

```text
Product (Conceptual Commercial Offer)
   │
   └── 1 : N ──> SKU (Sellable Commercial Unit)
                  │
                  └── Contextual M : N Fulfillment
                        │
                        ▼
                  InventoryLot (Physical Stock Instance)
```

---

# Entity Relationships

```text
Product
 ├── classifiedBy → ProductCategory (N:1)
 ├── defines → SKU (1:N)
 ├── referencedBy → POS Engine & Sales Channels
 ├── referencedBy → Commercial Analytics & Marketing
 └── decoupledFrom ──x Material (No direct physical coupling)
 └── decoupledFrom ──x InventoryLot (No direct inventory coupling)
```

### Boundary Distinctions

| Entity | Domain Scope | Responsibility |
| :--- | :--- | :--- |
| **`Product`** | Commercial Catalog | Conceptual product identity, branding, story, category taxonomy |
| **`SKU`** | Commercial Transaction | Specific package size, grind variant, barcode, price, sellable unit |
| **`Material`** | Physical Specification | Physical recipe/material definition, UOM, physical properties |
| **`InventoryLot`** | Physical Stock | Specific batch in warehouse with physical balance and unit cost |

---

# Core Fields Specification

### Identity Fields
- `productId`: Unique canonical identifier (UUID / string).
- `name`: Commercial product name (e.g. *"Seasonal Espresso Blend - Solstice"*).
- `displayName`: Marketing / customer-facing display name.
- `internalCode`: Unique operational code (e.g. `PRD_SOLSTICE_BLD`).

### Commercial & Classification Fields
- `productCategoryId`: Reference to commercial `ProductCategoryMaster`.
- `brandName`: Brand or roastery sub-brand name.
- `productLine`: Commercial product line designation (`RETAIL_BAGS`, `BULK_WHOLESALE`, `BEVERAGES_RTD`, `EQUIPMENT`, `MERCHANDISE`).
- `isSellable`: Boolean indicating if the product is active for sales.
- `isSubscriptionEligible`: Boolean indicating subscription sales support.
- `isActive`: Boolean indicating active catalog status.

### Commercial & Sensory Marketing Metadata
- `shortDescription`: Brief summary for menu/POS listing.
- `longDescription`: Full origin story, tasting notes, and promotional copy.
- `flavorNotes`: Structured tags of flavor descriptors (e.g. `["peach", "bergamot", "caramel"]`).
- `recommendedBrewMethods`: List of recommended brew preparations.

### Audit & Timestamps
- `createdAt`: ISO 8601 timestamp.
- `updatedAt`: ISO 8601 timestamp.

---

# Operational Architectural Principles

### 1. 1:N Relationship with SKUs
A single conceptual Product parent has one or more sellable commercial SKUs:
```text
Product: "El Paraiso Lychee Anaerobic"
 ├── SKU #1: 200g Whole Bean (SKU-EP-200G-WB)
 ├── SKU #2: 200g Ground for Filter (SKU-EP-200G-GR-FIL)
 ├── SKU #3: 1kg Wholesale Whole Bean (SKU-EP-1KG-WB)
 └── SKU #4: Single Drip Bag Box - 5pk (SKU-EP-DRIP-5PK)
```

### 2. Decoupling from Physical Inventory & Transformations
`Product` does not own physical stock quantities or physical unit costs.
- Sales transactions debit orders against a **`SKU`**.
- The fulfillment engine contextually assigns and depletes matching **`InventoryLot`** instances.
- Valuation and COGS are derived from the depleted `InventoryLot` unit costs ($U_{\text{lot}}$), never from static estimates on `Product`.

---

# Module Reference Matrix

| Module | Usage |
| :--- | :--- |
| **Commercial / POS Engine** | Displays product catalog, customer descriptions, and menu hierarchy. |
| **SKU Master (`SKUMaster`)** | Parent conceptual entity for all sellable transaction variants. |
| **Sales & Analytics** | Aggregates revenue, margin, and velocity by conceptual product. |
| **Inventory Engine** | *None* (Operates exclusively on `InventoryLot` and `Material`). |
| **Costing Engine** | *None* (Costing Engine calculates lot unit costs across `Transformation` and `InventoryLot`). |

---

# Summary & Architectural Guardrails

- `Product` is strictly a commercial and conceptual catalog entity.
- It is distinct from `Material` (physical specification) and `InventoryLot` (physical stock).
- `Product` has a $1:N$ relationship with `SKU`.
- Inventory balances and COGS are never stored on `Product`.
