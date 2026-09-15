# Material Master

## Purpose

`MaterialMaster` defines the foundational identity and specification structures for physical substances, components, and packaging materials used across Roastery OS.

This entity represents the master definition of a material independently from any physical stock, location, batch, or current valuation.

`MaterialMaster` provides:
- standardized physical material definitions,
- universal material classification (raw, intermediate, derivative, packaging, additive, consumable),
- dimensional unit baselines,
- sourcing and storage reference attributes,
- and decoupled references for generic `InventoryLot` instances.

---

# Core Philosophy

Roastery OS strictly separates **Material Definition** from **Physical Inventory Holdings**:

```text
Material (Master Reference / Specification)
   │
   └── tracks instances ──► InventoryLot (Physical Stock / Location / State / Valuation)
```

- A `Material` defines **what** a physical substance is.
- An `InventoryLot` defines **how much** of that material physically exists, where it is stored, its operational state, and its current valuation.
- A `Material` is **NOT** an `InventoryLot`.
- A `Material` is **NOT** a commercial `Product` or `SKU`.

---

# Material Classification & Roles

`Material` accommodates physical substances across all manufacturing stages without requiring distinct entity classes for each stage:

```text
1. RAW_COFFEE         : Green coffee beans, dried coffee cherries.
2. ROASTED_COFFEE     : Single-origin roasted beans, roasted components.
3. BLEND_COFFEE       : Post-roast blends, pre-roast blend formulations.
4. LIQUID_BASE        : Cold brew extract, brewed espresso base, concentrates.
5. PACKAGING_MATERIAL : Valve bags, glass bottles, aluminum caps, labels, drip filter sachets, outer foil, boxes.
6. INGREDIENT_ADDITIVE: Mineral salts, water, flavorings, spices, dairy/plant milk bases.
7. PROCESS_CONSUMABLE : Inert gas flush, paper filters, cleaning agents.
8. MERCHANDISE        : Physical non-coffee retail items, drippers, scales.
```

---

# Entity Structure & Attributes

```text
Material
├── belongsTo → MaterialCategory (optional)
├── hasAttributes → CoffeeAttributes (optional, for coffee materials)
├── hasAttributes → PackagingAttributes (optional, for packaging materials)
├── usesDefaultUnit → UnitMaster
├── suppliedBy → SupplierMaster (optional default reference)
└── trackedBy → InventoryLot (1:N instance relationship)
```

### 1. Core Identity Attributes
- `materialId`: Unique system identifier (UUID).
- `materialCode`: Human-readable identifier / SKU-agnostic internal code (e.g., `MAT-GRN-ETH-YIRG-001`, `MAT-PKG-BAG-250G-BLK`).
- `name`: Canonical material name (e.g., *Ethiopia Yirgacheffe G1 Washed*, *Matte Black 250g Valve Pouch*).
- `materialType`: Enum (`RAW_COFFEE`, `ROASTED_COFFEE`, `BLEND_COFFEE`, `LIQUID_BASE`, `PACKAGING_MATERIAL`, `INGREDIENT_ADDITIVE`, `PROCESS_CONSUMABLE`, `MERCHANDISE`).
- `defaultUnitId`: Primary base unit of measure (e.g., `kg`, `g`, `L`, `ml`, `unit`).
- `description`: Detailed operational description.
- `isActive`: Boolean flag.

### 2. Coffee-Specific Attributes (Optional Extension)
- `species`: Arabica, Robusta, Liberica.
- `variety`: Typica, Bourbon, Geisha, SL28, etc.
- `originId`: Reference to `OriginMaster`.
- `processingMethodId`: Reference to `ProcessingMethodMaster`.
- `targetDensity`: Standard target bulk density ($g/L$).
- `targetMoisture`: Standard target moisture content percentage.

### 3. Packaging-Specific Attributes (Optional Extension)
- `packagingTypeId`: Reference to `PackagingTypeMaster` (format/capacity specification).
- `tareWeight`: Empty unit weight for scale tare deduction.
- `barrierProperties`: Degassing valve, foil lining, light barrier.

### 4. Handling & Storage Attributes
- `storageCondition`: Standard ambient, climate-controlled, frozen, dry warehouse.
- `shelfLifeDays`: Standard recommended storage duration.
- `reorderPoint`: Optional operational restocking threshold.

---

# Intersystem & Engine Contracts

1. **Inventory Engine Contract:**
   - `InventoryLot` instances must hold a valid `materialId`.
   - Physical inventory movements, reservations, and state transitions occur at the `InventoryLot` level, referencing `Material` solely for master attributes and dimensional compatibility.
2. **Production Engine Contract:**
   - Transformation recipes (`Process`) define required input and output materials by `materialId`.
   - When a transformation executes, `TransformationInput` consumes specific `InventoryLot` instances of that `materialId`, and `TransformationOutput` generates new `InventoryLot` instances of the target `materialId`.
3. **Costing Engine Contract:**
   - Material definitions establish standard dimensions.
   - Economic value is carried on `InventoryLot` instances ($V_{\text{lot}}$).
   - Physical materials and packaging are consumed strictly as `TransformationInput` ($V_{\text{consumed}}$) and never as non-inventory `CostEvent` ($C_{\text{direct}}$).
4. **Commercial Product Firewall:**
   - A `Material` can exist without any associated `Product` or `SKU` (e.g., work-in-progress intermediate extract, bulk roasted coffee in curing bins).
   - A commercial `SKU` fulfills sales orders by consuming `InventoryLot` instances of a specific `Material`.
