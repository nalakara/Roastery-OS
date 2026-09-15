# GreenBean Master (Coffee Sourcing Specification)

## Purpose

`GreenBeanMaster` defines the agricultural, agronomic, processing, and sourcing specifications for green coffee materials used across Roastery OS.

In the reconciled ontology, green coffee is a specialization of `Material` (`materialType == RAW_COFFEE`). `GreenBeanMaster` provides the rich sourcing and quality attributes attached to these materials.

`GreenBeanMaster` provides:
- standardized green coffee identity and agronomic references,
- sourcing, farm, and producer traceability attributes,
- harvest and sensory quality baseline records,
- and reusable production references across transformation workflows.

This entity does not represent physical stock quantity. Physical quantities are tracked strictly by `InventoryLot` instances referencing this material.

---

# Core Philosophy

`GreenBeanMaster` defines **what** a raw coffee lot is botanically and commercially, not its physical inventory state:

```text
Material (type: RAW_COFFEE) + GreenBean Specification
   │
   └── tracked as physical stock ──► InventoryLot (kg, warehouse location, state, asset value)
```

Green coffee can participate in any valid material transformation:
- Roasting transformations (`Process: Roasting`),
- Pre-roast green blending (`Process: Green Blending`),
- Cleaning / destoning / sorting (`Process: Mechanical Sorting`),
- Decoction / extraction (`Process: Extraction`),
- or direct wholesale / retail fulfillment.

---

# Entity Relationships

```text
GreenBean (Material Specialization)
├── belongsTo → OriginMaster
├── belongsTo → ProcessingMethodMaster
├── suppliedBy → SupplierMaster
├── trackedBy → InventoryLot (1:N generic inventory holdings)
├── consumedBy → TransformationInput (any valid transformation process)
└── referencedBy → Analytics & Sourcing Intelligence
```

---

# Core Fields & Attributes

### 1. Identity & Classification
- `greenBeanId` / `materialId`: Unique master identifier.
- `name`: Full formal name (e.g., *Guatemala Huehuetenango El Injerto Bourbon*).
- `species`: Arabica, Robusta, Liberica, Eugenioides.
- `variety`: Bourbon, Caturra, Geisha, SL28, Typica, etc.
- `internalCode`: Sourcing code (e.g., `GB-GUA-INJ-2026`).

### 2. Origin & Terroir Attributes
- `originId`: Reference to `OriginMaster`.
- `producerName`: Farm owner or estate name.
- `farmName`: Specific farm, washing station, or cooperative name.
- `region`: Growing micro-region / department.
- `country`: Producing country.
- `altitude`: Elevation range (e.g., `1600 - 1850 masl`).
- `harvestYear`: Crop / harvest season (e.g., `2025/2026`).

### 3. Processing & Agronomic Attributes
- `processingMethodId`: Reference to `ProcessingMethodMaster` (Washed, Natural, Honey, Anaerobic, etc.).
- `processingNotes`: Fermentation protocols, yeast inoculation, drying details.
- `dryingMethod`: Raised African beds, patio sun-dried, mechanical guardiola.

### 4. Sourcing & Lot Attributes
- `supplierId`: Reference to `SupplierMaster`.
- `purchaseReference`: Sourcing contract or purchase order reference.
- `arrivalDate`: Date of initial warehouse landing.

### 5. Quality & Physical Baseline Attributes
- `screenSize`: Bean size classification (e.g., `17/18`, `15/16`, `Peaberry`).
- `moistureContent`: Initial green bean moisture percentage (e.g., `10.8%`).
- `density`: Bulk density ($g/L$).
- `waterActivity`: Initial water activity ($a_w$).
- `cuppingScore`: Baseline specialty cupping score (e.g., `87.5`).
- `qualityNotes`: Flavor profile, defect count, grading notes.

### 6. Operational Status
- `isActive`: Boolean flag.
- `notes`: General operational comments.
- `createdAt`, `updatedAt`: Timestamps.

---

# Inventory Separation Principle

`GreenBean` master specifications must remain strictly decoupled from physical inventory holdings:

- **`GreenBean` (Material Master):** Defines terroir, variety, processing, supplier, and baseline quality attributes.
- **`InventoryLot` (Physical Inventory):** Tracks the actual physical kilograms, warehouse bin location, availability status, and carried economic valuation.

# Naming & Module Alignment

- **Primary Identifier:** `greenBeanId` (or `materialId` where `materialType == RAW_COFFEE`).
- **Related References:** `originId`, `processingMethodId`, `supplierId`.

### Shared Across:
- `Inventory Engine` (references master definition for physical `InventoryLot` holdings)
- `Production / Roasting Engine` (references input material specifications in transformation recipes)
- `Costing Engine` (references physical attributes for dimensional baselines)
- `Batch Traceability` (records botanical terroir origin in causal lineage)
- `Supplier System` (associates purchase contracts with coffee materials)

