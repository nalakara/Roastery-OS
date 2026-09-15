# PackagingType Master (Packaging Specification)

## Purpose

`PackagingTypeMaster` defines the physical format, capacity, and tare specifications for packaging materials used across Roastery OS.

In the reconciled ontology, physical packaging items (bags, bottles, caps, filter papers, cartons) are physical materials (`Material` with `materialType == PACKAGING_MATERIAL`) and are held as physical stock via `InventoryLot`. `PackagingTypeMaster` provides the structural format and dimensional capacity specifications for these packaging materials.

`PackagingTypeMaster` provides:
- standardized packaging format and dimension specifications,
- volumetric and mass capacity baselines (e.g., $250\text{ g}$, $1\text{ kg}$, $250\text{ ml}$, $1\text{ L}$),
- scale tare weights for filling accuracy,
- and structural references for transformation packaging recipes.

---

# Core Philosophy

`PackagingTypeMaster` defines **packaging physical structure**, not inventory stock, static costing overhead, or commercial SKUs:

```text
PackagingType (Physical Format & Capacity Specification)
       ▲
       │ classifies
Material (type: PACKAGING_MATERIAL, e.g., Matte Black 250g Pouch)
       │
       └── tracked as physical stock ──► InventoryLot (units, warehouse bin, asset value)
```

- **Physical Inventory Tracking:** Packaging items are tracked as distinct `InventoryLot` instances.
- **Strict Costing Firewall:** Consumed packaging enters transformations strictly as **`TransformationInput` ($V_{\text{consumed}}$)**.
- **Zero Double Counting:** Packaging items **never** enter as a non-inventory `CostEvent` ($C_{\text{direct}}$) and do **not** carry static estimated overhead fields inside master data.

---

# Entity Relationships

```text
PackagingType
├── classifies → Material (where materialType == PACKAGING_MATERIAL)
├── referencedBy → Process / Recipe (packaging transformation templates)
├── usedBy → InventoryLot (tare weight deduction & capacity reference)
└── referencedBy → SKU (packaging presentation metadata)
```

---

# Core Fields & Attributes

### 1. Identity & Format
- `packagingTypeId`: Unique identifier (UUID).
- `name`: Descriptive format name (e.g., *250g Valve Side-Gusset Bag*, *250ml Boston Glass Bottle*, *10g Drip Sachet Foil*).
- `packagingFormat`: Enum (`BAG`, `BOTTLE`, `CAN`, `DRIP_BAG_SACHET`, `BOX_CARTON`, `DRUM_BULK`).
- `internalCode`: Reference code (e.g., `PKG-BAG-250G`, `PKG-BOT-250ML`).

### 2. Dimensional & Capacity Specifications
- `capacityQuantity`: Numerical standard holding capacity ($250$, $1000$, $1$, etc.).
- `capacityUnitId`: Reference to `UnitMaster` (`g`, `kg`, `ml`, `L`).
- `tareWeightGrams`: Empty unit weight in grams (used for digital scale net-weight calibration).
- `materialComposition`: Kraft paper, aluminum foil laminate, PET glass, tinplate.

### 3. Operational & Storage Attributes
- `hasDegassingValve`: Boolean.
- `requiresHeatSealing`: Boolean.
- `isReusable`: Boolean (e.g., returnable bulk transfer kegs / storage bins).
- `isActive`: Boolean.
- `notes`: Operational packaging notes.

---

# Transformation & Costing Contract

1. **Packaging Transformation Participation:**
   - In portioning, bottling, or kitting transformations, packaging materials are consumed from specific `InventoryLot` instances.
   - Example (Drip Bag Portioning):
     $$150\text{ g Ground Coffee} + 15\text{ Drip Filter Units} + 15\text{ Outer Foils} \xrightarrow{\text{Transformation}} 15\text{ Drip Bags}$$
2. **Economic Pool Contribution:**
   - The economic value of consumed packaging is extracted via the active valuation policy:
     $$V_{\text{consumed}}(\text{packaging}) = q_{\text{consumed}} \times v_{\text{unit}}(\text{Packaging Lot})$$
   - It is pooled into $V_{\text{input\_total}}$ and capitalized into the produced output lots.
3. **Master Data Costing Rule:**
   - `PackagingTypeMaster` contains **no** static cost or overhead fields. True packaging valuation is derived dynamically from supplier procurement invoices into inventory lots.

---

# Architectural Notes

`PackagingTypeMaster` is designed as a reusable operational reference entity.
Multiple production and finished goods entities may reference the same PackagingType structure.
This entity should remain:

