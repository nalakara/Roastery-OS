# Roast Profile Master

## Purpose

RoastProfile Master defines the coffee-specific roasting process and profile templates used across Roastery OS.

In the frozen ontology, a RoastProfile represents a reusable **Process / Transformation Template** that governs a roasting transformation:
- standardizing roasting intent (development style, roast degree, flavor profile),
- guiding machine transformation parameters (charge temperature, drop temperature, target weight loss percentage),
- linking input green coffee materials to output roasted coffee materials,
- and ensuring production consistency and traceability.

---

# Core Philosophy

RoastProfile is a domain-specific **Process / Transformation Template**. It is not an inventory bucket or a physical stock entity.

In the frozen Roastery OS ontology:
- A **Roasting Transformation** executes a roast event using a `RoastProfile` template.
- It consumes an `InventoryLot` of green coffee (`Material` with category `RAW_COFFEE`).
- It outputs one or more generic **`InventoryLot`** instances referencing the resulting roasted `Material` (e.g. *Ethiopia Yirgacheffe Filter Roast*).
- Physical shrinkage and moisture loss are accounted for via **Yield Mathematics** ($Y = Q_{\text{out}} / Q_{\text{in}}$).
- The resulting `InventoryLot` exists as generic stock, which may subsequently be packaged, blended, ground, extracted, or fulfilled.

```text
InventoryLot (Green Coffee)
        ↓
Transformation (Process: RoastProfile)
        ↓
InventoryLot (Roasted Whole Bean Coffee)
```

---

# Entity Relationships

```text
RoastProfile (Process Template)
 ├── appliedIn → Transformation (Roast Transformation Event)
 ├── referencedBy → MaterialMaster (Roasted Coffee Material identity)
 ├── referencedBy → Product Naming & Labeling Specs
 └── referencedBy → Roasting Quality & Production Analytics
```

### Boundary Distinctions

| Entity | Domain Scope | Responsibility |
| :--- | :--- | :--- |
| **`RoastProfile`** | Process / Transformation Template | Standardized roasting parameters, sensory profile, target loss % |
| **`Transformation`** | Operational Execution | The transactional event that consumes green lot(s) and produces roasted lot(s) |
| **`Material`** | Physical Master Data | The definition of the roasted coffee material (e.g. *MAT-ROAST-ETH-001*) |
| **`InventoryLot`** | Physical Stock Instance | Specific physical batch/lot of roasted coffee held in stock |
| **`CostEvent`** | Economic Transformation Cost | Gas, electricity, roasting labor capitalized during roasting |

---

# Core Fields Specification

### Identity Fields
- `roastProfileId`: Unique canonical identifier (UUID / string).
- `name`: Human-readable profile name (e.g. *"Nordic Filter Light"*, *"Modern Espresso Medium"*).
- `displayName`: Customer-facing or label display name.
- `internalCode`: Business short code (e.g. `PROF_ETH_FILTER_01`).

### Process & Technical Parameters
- `profileType`: High-level profile classification (`FILTER`, `ESPRESSO`, `OMNI`, `DARK_COMMERCIAL`, `SAMPLE`).
- `roastLevel`: Descriptive roast degree (`LIGHT`, `MEDIUM_LIGHT`, `MEDIUM`, `MEDIUM_DARK`, `DARK`).
- `targetDevelopmentTimeRatio`: Target DTR percentage (e.g. `12.5%`).
- `targetColorAgtron`: Target Agtron / Colortrack value (e.g. Whole: `75`, Ground: `88`).
- `expectedLossPercentage`: Standard expected moisture/mass loss percentage (e.g. `14.5%`), used for planned yield calculations.
- `recommendedRestDays`: Degassing / resting recommendation before consumption (e.g. `7` to `14` days).

### Sensory & Operational Guidance
- `flavorDirection`: Sensory profile description (e.g. *"Jasmine florals, peach, bergamot tea"*).
- `recommendedBrewingMethod`: Optimal preparation methods (`V60`, `Aeropress`, `Espresso`).
- `roastingNotes`: Operational instructions for the roastmaster.
- `isDefault`: Boolean indicating if this is the default profile for matching green coffee materials.
- `isActive`: Boolean indicating whether the profile is currently approved for production.

### Metadata Fields
- `createdAt`: ISO 8601 timestamp.
- `updatedAt`: ISO 8601 timestamp.

---

# Operational Integration Rules

### 1. Independent Output Material & Lot Generation
When a roasting transformation finishes:
1. The consumed green coffee `InventoryLot` has its quantity reduced (or lot closed).
2. The Costing Engine pools the consumed green coffee value ($V_{\text{consumed}}$) plus direct roasting `CostEvent` expenses ($C_{\text{direct}}$).
3. The Roasting Engine produces a new generic **`InventoryLot`** linked to the appropriate roasted `Material`.
4. The new `InventoryLot` is assigned its economic unit cost via Equation 1 ($U = C_{\text{total}} / Q_{\text{out}}$).

### 2. Multi-Profile Differentiation from Single Green Source
A single green coffee lot may be split across multiple transformations using different roast profiles:
```text
Green Coffee Lot #GC-2026-001
 ├── Roast Transformation (Profile: "Filter")  ──> InventoryLot #RB-FIL-001 (Material: Roasted Filter)
 └── Roast Transformation (Profile: "Espresso")──> InventoryLot #RB-ESP-002 (Material: Roasted Espresso)
```
Each resulting lot has its own independent physical quantity, unit cost, and lineage.

### 3. Separation from Finished Packaged Goods
RoastProfile governs the roasting process only. Packaging into retail bags, cans, or bulk containers is a separate downstream **Transformation** (packaging process) consuming the roasted `InventoryLot` and packaging `InventoryLot` instances.

---

# Module Reference Matrix

| Module | Usage |
| :--- | :--- |
| **Production / Roasting Engine** | Guides batch execution parameters and quality control targets. |
| **Inventory Engine** | Tracks resulting roasted whole bean `InventoryLot` stock instances. |
| **Costing Engine** | Allocates green lot value and roasting `CostEvent` items to output lots. |
| **Commercial / Product Master** | Informs flavor notes and brew recommendations on commercial `Product` entries. |

---

# Summary & Architectural Guardrails

- `RoastProfile` is a process/transformation specification, not an inventory class.
- The output of a roasting transformation is a generic `InventoryLot` referencing a roasted `Material`.
- There is no hard dependency on a legacy `RoastedCoffeeInventory` entity.
- Yield and loss mathematics apply cleanly to the roasting transformation governed by this profile.

