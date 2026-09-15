# Product Category Master

## Purpose

ProductCategory Master defines the commercial, catalog, and reporting taxonomy references used across Roastery OS.

This entity standardizes commercial categorization structures to support:
- catalog organization and navigation,
- sales categorization and POS grouping,
- commercial reporting and revenue analytics,
- brand and product line taxonomy.

Product categories are strictly commercial and reporting metadata. They do not dictate physical manufacturing rules, transformation mechanics, or inventory lot tracking.

---

# Core Philosophy

Product categories represent **commercial and reporting taxonomy**, not physical transformation behavior or inventory constraints.

In the frozen Roastery OS ontology:
- **ProductCategory** classifies commercial **Product** and **SKU** entities.
- **Material** (`MaterialMaster`) defines physical material classifications (`RAW_COFFEE`, `PACKAGING_MATERIAL`, etc.).
- **Transformation** governs conversion mechanics, recipes, and inputs/outputs.
- **InventoryLot** represents physical stock instances and their independent tracking states.

ProductCategory must never:
- Imply physical inventory tracking flags (inventory tracking is a universal capability of `InventoryLot`).
- Dictate mandatory manufacturing packaging or recipe defaults (recipes and packaging bills of materials belong to `Transformation`/BOM specifications).
- Be confused with physical `Material` classifications.

---

# Operational Role

ProductCategory Master functions as:
- a catalog hierarchy and navigation taxonomy,
- a sales and POS grouping mechanism,
- a commercial reporting and analytics segmentation dimension,
- a marketing and customer-facing classification structure.

---

# Entity Relationships

```text
ProductCategory
 ├── categorizes → Product (1:N)
 ├── (optional) classifies → SKU (via Product or direct commercial override)
 ├── referencedBy → POS Catalog & Commercial Menus
 └── referencedBy → Sales Analytics & Revenue Reporting
```

### Boundary Distinctions

| Entity | Domain Scope | Responsibility |
| :--- | :--- | :--- |
| **`ProductCategory`** | Commercial / Reporting | Catalog grouping, commercial reporting, POS hierarchy |
| **`Product`** | Commercial Identity | Conceptual product entity (e.g. *"House Blend 250g Package"*) |
| **`SKU`** | Commercial Sellable Unit | Transactable sellable unit (e.g. *"HB-250G-WB"*) |
| **`Material`** | Physical Master Data | Physical material specification (e.g. Roasted Blend Coffee) |
| **`InventoryLot`** | Physical Stock Instance | Specific physical batch/lot in stock |

---

# Core Fields Specification

### Identity Fields
- `productCategoryId`: Unique canonical identifier (UUID / string).
- `name`: Human-readable category name (e.g. *"Retail Whole Bean"*, *"Cold Brew Beverages"*, *"Brewing Merchandise"*).
- `displayName`: Customer-facing or POS display name.
- `internalCode`: Unique short code for business operations (e.g. `CAT_RETAIL_BEAN`).

### Commercial & Taxonomy Fields
- `categoryType`: High-level commercial domain (`COFFEE_BEANS`, `BEVERAGES`, `READY_TO_DRINK`, `MERCHANDISE`, `EQUIPMENT`, `SERVICES`).
- `parentCategoryId`: Self-referencing link to parent category for hierarchical catalog trees (nullable).
- `displayOrder`: Integer sorting index for POS/e-commerce menus.
- `isSellable`: Boolean indicating if products in this category are commercially offered.
- `isActive`: Boolean indicating active catalog status.

### Metadata Fields
- `description`: Text describing the scope of this commercial category.
- `notes`: Operational or merchandising notes.
- `createdAt`: ISO 8601 timestamp.
- `updatedAt`: ISO 8601 timestamp.

---

# Categorization Principles

### 1. Separation from Physical Transformation
A product category such as *"Single Origin Retail"* may be fulfilled by an `InventoryLot` that underwent a complex sequence of transformations:
```text
Green Coffee (Material)
   ↓ (Roasting Transformation)
Roasted Beans (Material / InventoryLot)
   ↓ (Packaging Transformation)
Packaged Coffee (Material / InventoryLot) ── fulfilled as ──> SKU (ProductCategory: "Single Origin Retail")
```
`ProductCategory` classifies the commercial offer (`Product`/`SKU`), while `MaterialMaster` and `Transformation` govern the physical lineage.

### 2. No Embedded Physical Packaging or Inventory Rules
Physical packaging specifications are defined in `PackagingTypeMaster` and tracked as physical `Material`. Physical stock is tracked via `InventoryLot`. `ProductCategory` does not contain `defaultPackagingType` or `requiresInventoryTracking` flags.

### 3. Hierarchical Classification Support
Categories can optionally form simple hierarchical trees for deep retail catalogs:
```text
Packaged Coffee (Parent)
 ├── Single Origin (Child)
 └── Blends (Child)

Ready to Drink (Parent)
 ├── Bottled Cold Brew (Child)
 └── Nitro Cans (Child)
```

---

# Module Reference Matrix

| Module | Usage |
| :--- | :--- |
| **Commercial / POS Engine** | Organizes menu items, POS screens, and online catalog navigation. |
| **Product Master (`ProductMaster`)** | Primary classification attribute for conceptual products. |
| **Analytics & Reporting** | Aggregates revenue, sales volume, and margin performance by category. |
| **Inventory Engine** | *None* (Inventory Engine operates strictly on `InventoryLot` and `Material`). |
| **Costing Engine** | *None* (Costing Engine calculates economic flow across `Transformation` and `InventoryLot`). |

---

# Summary & Architectural Guardrails

- `ProductCategory` is strictly commercial and reporting metadata.
- It applies to `Product` and `SKU`, never directly to physical `InventoryLot` or `Material`.
- Physical inventory tracking and transformation logic are decoupled from product categorization.

