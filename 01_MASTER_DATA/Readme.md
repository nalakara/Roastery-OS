# Master Data Module

## Purpose

The Master Data module defines the canonical, reusable master reference structures across Roastery OS.

Master data establishes standardized identities, taxonomies, physical material classifications, process templates, and commercial catalog definitions shared across:
- physical inventory operations (`InventoryLot`),
- transformation and production execution (`Transformation`),
- costing and economic flow evaluation (`Costing Engine`),
- commercial sales and retail checkout (`Product`, `SKU`, POS/Order channels),
- operational reporting and analytics.

---

# Core Philosophy

Master Data entities represent **reusable reference identities and specifications**, not transactional activity or live stock balances.

In the frozen Roastery OS ontology:
1. **Physical Materials (`MaterialMaster`)**: Canonical specifications for physical items (raw green coffee, packaging items, consumables, intermediates, derivative products). Distinct from physical stock instances.
2. **Physical Stock Instances (`InventoryLot`)**: Discrete batches/lots residing in physical locations with live balances, tracking states, and dynamic economic unit costs ($U_{\text{lot}}$).
3. **Process Templates (`RoastProfileMaster`)**: Parameterized operational transformation templates that govern physical transformations.
4. **Commercial Catalog (`ProductMaster`, `SKUMaster`, `ProductCategoryMaster`)**: Conceptual products and transactable sellable units. Decoupled from physical stock and related via contextual $M:N$ fulfillment.
5. **Business Relationships & Taxonomy (`SupplierMaster`, `CustomerMaster`, `OriginMaster`, `ProcessingMethodMaster`, `UnitMaster`)**: Universal partner, origin, processing, and dimensional measurement foundations.

---

# Master Data Entity Directory

| Document | Entity Name | Scope & Responsibility |
| :--- | :--- | :--- |
| **[`MaterialMaster.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/01_MASTER_DATA/MaterialMaster.md)** | `Material` | Canonical physical material master across all categories (`RAW_COFFEE`, `PACKAGING_MATERIAL`, `INTERMEDIATE`, `ADDITIVE`, `CONSUMABLE`, `DERIVATIVE`). |
| **[`GreenBeanMaster.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/01_MASTER_DATA/GreenBeanMaster.md)** | `GreenBean` | Specialty coffee domain specialization of `Material` (`RAW_COFFEE`). |
| **[`PackagingTypeMaster.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/01_MASTER_DATA/PackagingTypeMaster.md)** | `PackagingType` | Physical packaging specification and dimensions (physical packaging stock tracked via `Material`/`InventoryLot`). |
| **[`ProductCategoryMaster.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/01_MASTER_DATA/ProductCategoryMaster.md)** | `ProductCategory` | Commercial catalog and reporting taxonomy for `Product` and `SKU`. |
| **[`ProductMaster.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/01_MASTER_DATA/ProductMaster.md)** | `Product` | Conceptual/commercial product identity (1:N relationship with `SKU`). |
| **[`SKUMaster.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/01_MASTER_DATA/SKUMaster.md)** | `SKU` | Commercial sellable transaction unit with contextual M:N fulfillment mapping to `InventoryLot`. |
| **[`RoastProfileMaster.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/01_MASTER_DATA/RoastProfileMaster.md)** | `RoastProfile` | Coffee-specific Process/Transformation template producing generic roasted `InventoryLot` instances. |
| **[`SupplierMaster.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/01_MASTER_DATA/SupplierMaster.md)** | `Supplier` | Universal sourcing and vendor partner entity supplying any `Material`. |
| **[`CustomerMaster.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/01_MASTER_DATA/CustomerMaster.md)** | `Customer` | Commercial customer and wholesale client relationship master. |
| **[`OriginMaster.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/01_MASTER_DATA/OriginMaster.md)** | `Origin` | Geographical origin reference for coffee sourcing traceability. |
| **[`ProcessingMethodMaster.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/01_MASTER_DATA/ProcessingMethodMaster.md)** | `ProcessingMethod` | Post-harvest coffee processing method reference. |
| **[`UnitMaster.md`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/01_MASTER_DATA/UnitMaster.md)** | `Unit` | Dimensional measurement units (`MASS`, `VOLUME`, `COUNT`, `TIME`) and conversion barrier rules. |

---

# Cross-Engine Interoperability Matrix

```text
                  ┌──────────────────────┐
                  │     Master Data      │
                  │   (01_MASTER_DATA)   │
                  └──────────┬───────────┘
                             │
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Inventory   │      │ Production / │      │  Commercial  │
│    Engine    │      │Transformation│      │    & POS     │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             ▼
                  ┌──────────────────────┐
                  │    Costing Engine    │
                  │ (07_COSTING_ENGINE)  │
                  └──────────────────────┘
```

- **Inventory Engine**: Creates and tracks physical `InventoryLot` instances that reference `MaterialMaster` and `UnitMaster`.
- **Transformation Engine**: Executes physical transformation events guided by `RoastProfileMaster` / BOM recipes, consuming and producing `InventoryLot` instances.
- **Commercial & POS Engine**: Offers commercial catalog items defined in `ProductMaster`, `SKUMaster`, and `ProductCategoryMaster`, mapping sales to `InventoryLot` instances via contextual fulfillment.
- **Costing Engine**: Evaluates economic value flow ($V_{\text{consumed}} + C_{\text{direct}}$) across transformations, maintaining the strict boundary between physical materials (`TransformationInput`) and service/conversion expenses (`CostEvent`).

---

# Architectural Guardrails

1. Master data entities must never store live transactional stock quantities or dynamic lot valuations.
2. `Material` is distinct from `InventoryLot` (spec vs physical stock instance).
3. `Product` and `SKU` are distinct from `Material` and `InventoryLot` (commercial offer vs physical material/stock).
4. Measurement conversions are permitted within the same dimensional category; cross-dimension conversions require an explicit `Transformation` event.
5. Sourcing and vendor structures are generalized to support any physical material class.

