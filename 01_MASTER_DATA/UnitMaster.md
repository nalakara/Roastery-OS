# Unit Master

## Purpose

Unit Master defines the standardized physical and operational measurement units used across Roastery OS.

This entity standardizes measurement references to support:
- physical inventory tracking and balancing,
- transformation recipes, yields, and input/output measurements,
- costing calculations and unit rate evaluations ($U = C / Q$),
- packaging and commercial sales unit specifications.

---

# Core Philosophy: Dimensional Categories & Barriers

Physical quantities belong to distinct **Dimensional Categories**. Mathematical addition, subtraction, or linear conversion across different dimensions without a physical process is strictly invalid.

### 1. Dimensional Categories

| Category | Canonical Base Unit | Standard Units | Conversion Rule |
| :--- | :--- | :--- | :--- |
| **`MASS`** | Gram (`g`) | `kg` (1,000 g), `g` (1 g), `mg` (0.001 g), `lb` (453.592 g), `oz` (28.3495 g) | Direct scalar conversion within dimension |
| **`VOLUME`** | Milliliter (`ml`) | `l` (1,000 ml), `ml` (1 ml), `fl_oz` (29.5735 ml), `gal` (3,785.41 ml) | Direct scalar conversion within dimension |
| **`COUNT`** | Each (`unit`) | `ea` / `pcs` (1 unit), `dozen` (12 units), `box` (spec-defined units), `bag` (1 unit) | Integer / discrete count; spec-defined package conversion |
| **`TIME`** | Second (`s`) | `s` (1 s), `min` (60 s), `hr` (3,600 s) | Direct scalar conversion (used in `CostEvent` labor/machine runtime) |

---

# Mathematical Conversion Rules

### 1. Same-Dimension Conversion (Permitted)
Quantities within the same dimensional category convert via a fixed linear scalar factor:
$$Q_{\text{target}} = Q_{\text{source}} \times \frac{\text{factor}_{\text{source}}}{\text{factor}_{\text{target}}}$$
*Example:* $5.5\text{ kg} \times 1,000 = 5,500\text{ g}$. Valid and lossless.

### 2. Cross-Dimension Conversion Barrier (Strictly Prohibited Without Transformation)
A mass cannot be mathematically converted into a volume or a count by simple multiplication, because the ratio depends on physical density, temperature, or recipe packaging specifications.

$$\text{MASS} \not\longleftrightarrow \text{VOLUME} \quad (\text{e.g. } 1\text{ kg coffee} \neq 1\text{ L beverage})$$
$$\text{MASS} \not\longleftrightarrow \text{COUNT} \quad (\text{e.g. } 1,000\text{ g roasted coffee} \neq 4\text{ bags without packaging transformation})$$

**Rule:** Any conversion between different dimensional categories **must be mediated by an explicit `Transformation` event** (e.g. Extraction Transformation converting ground coffee mass + water volume into liquid cold brew volume, or Packaging Transformation converting roasted whole bean mass + empty bag count into packaged bag count).

### 3. Invalid Dimensional Arithmetic
The system must never allow:
- Summing quantities of different dimensions (e.g. $10\text{ kg} + 5\text{ units} = \text{INVALID}$).
- Calculating cost rates with mismatched units without explicit unit normalization.

---

# Entity Relationships

```text
Unit
 ├── referencedBy → MaterialMaster (baseUnitOfMeasure)
 ├── referencedBy → InventoryLot (quantity unit of measure)
 ├── referencedBy → TransformationInput & TransformationOutput (recipe & actual quantities)
 ├── referencedBy → SKUMaster (commercialUnit, netWeightUnit)
 └── referencedBy → Costing Engine (rate denominator normalization)
```

---

# Core Fields Specification

### Identity Fields
- `unitId`: Unique canonical identifier (UUID / string).
- `name`: Full unit name (e.g. *"Kilogram"*, *"Liter"*, *"Piece / Each"*, *"Minute"*).
- `symbol`: Official standard abbreviation (e.g. `kg`, `g`, `L`, `ml`, `ea`, `box`, `min`).
- `internalCode`: Unique operational code (e.g. `UOM_KG`, `UOM_ML`).

### Dimensional Classification Fields
- `dimension`: Primary physical dimension (`MASS`, `VOLUME`, `COUNT`, `TIME`).
- `isBaseUnit`: Boolean flag indicating if this is the canonical base unit of its dimension (e.g. `g` for `MASS`, `ml` for `VOLUME`, `ea` for `COUNT`, `s` for `TIME`).
- `baseConversionFactor`: Multiplier relative to the base unit of the same dimension (e.g. for `kg`, factor is `1000.0`; for `g`, factor is `1.0`; for `L`, factor is `1000.0`).

### Operational Flags
- `allowDecimal`: Boolean flag (true for `MASS`/`VOLUME`, false for discrete atomic `COUNT` units).
- `isActive`: Boolean flag indicating active operational status.

### Metadata Fields
- `description`: Text notes on standard usage.
- `createdAt`: ISO 8601 timestamp.
- `updatedAt`: ISO 8601 timestamp.

---

# Module Reference Matrix

| Module | Usage |
| :--- | :--- |
| **Material Master (`MaterialMaster`)** | Enforces the primary tracking UOM for physical materials. |
| **Inventory Engine** | Validates dimensional integrity during lot receipts, adjustments, and splits. |
| **Production / Transformation Engine** | Computes yield ratios ($Y = Q_{\text{out}} / Q_{\text{in}}$) when dimensions match, or cross-dimensional yields across transformations. |
| **Costing Engine** | Normalizes consumed quantities to compute economic pool contributions ($V = Q \times U$). |

---

# Summary & Architectural Guardrails

- Measurement units are categorized strictly by dimension (`MASS`, `VOLUME`, `COUNT`, `TIME`).
- Same-dimension conversions are scalar and deterministic.
- Cross-dimension conversions require an explicit physical `Transformation` event.
- Invalid dimensional arithmetic across mismatched categories is strictly prohibited.

