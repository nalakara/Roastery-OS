# Roastery OS — Data Model

## Purpose

This document defines the foundational operational data model for Roastery OS.

The purpose of this data model is to:
- establish core operational entities,
- define entity relationships,
- support modular scalability,
- preserve inventory traceability,
- and maintain transformation-based operational consistency.

The data model is designed around:
- inventory transformation,
- batch-centric production,
- modular operational workflows,
- and deterministic operational logic.

---

# Data Model Philosophy

Roastery OS uses a transformation-based operational data structure.

The system does not treat products as static objects.

Instead:
- inventory evolves,
- production generates new operational states,
- and every transformation preserves operational lineage.

The data model should prioritize:
- operational clarity,
- traceability,
- modular extensibility,
- and long-term scalability.

---

# Core Entity Categories

The system is organized into several primary entity groups across operational and commercial realms:

```text
Master Entities (Material, Origin, ProcessingMethod, Process/RoastProfile, PackagingType, Location)
Physical Operational Entities (InventoryLot, InventoryState, Transformation, TransformationInput, TransformationOutput, Batch)
Commercial Entities (Product, SKU, ProductCategory, ProductLine)
Transactional Entities (InventoryMovement, PurchaseRecord, SalesTransaction, PaymentRecord, AdjustmentRecord)
Business Entities (Supplier, Customer)
Analytical Entities (CostRecord, LineageNode, YieldMetric)
```

---

# Master Entities

Master entities provide standardized operational and commercial references across all modules.

### Material
Represents the master definition of physical substances or packaging components.
```text
Material
├── belongsTo → ProductCategory (optional)
├── hasAttributes → (species, variety, originId, processingMethodId) [for coffee]
└── tracksInstances → InventoryLot
```
**Core Fields:**
- `materialId`
- `name`
- `materialType` (e.g., Green Coffee, Roasted Coffee, Additive, Packaging, Liquid Base)
- `defaultUnitId`
- `notes`
- `createdAt`

### Origin
Represents coffee origin information.
**Core Fields:** `originId`, `name`, `region`, `country`, `notes`

### ProcessingMethod
Represents coffee processing categories (Natural, Honey, Washed, Anaerobic, WetHull).
**Core Fields:** `processingMethodId`, `name`, `description`

### Process / RoastProfile
Represents the standardized recipe, template, or method governing a physical transformation.
**Core Fields:** `processId`, `name`, `processType` (Roasting, Blending, Grinding, Extraction, Packaging, Kitting), `expectedYieldRatio`, `standardOverheadCost`, `description`

### PackagingType
Represents packaging format references (250g Valve Pouch, 1L Glass Bottle, 10g Drip Sachet, Gift Box).
**Core Fields:** `packagingTypeId`, `name`, `unitType`, `capacity`, `tareWeight`

---

# Physical Operational Entities (Transformation Graph)

Physical operational entities track tangible inventory holdings and transformation events.

### InventoryLot
Represents a discrete, measurable quantity of a physical material held in a specific location under an active inventory state.
```text
InventoryLot
├── references → Material
├── references → Warehouse / Location
├── createdBy → PurchaseRecord OR TransformationOutput
├── consumedBy → TransformationInput OR SalesTransaction
└── carries → CurrentValuation (Unit Cost & Asset Balance)
```
**Core Fields:**
- `inventoryLotId`
- `lotCode`
- `materialId`
- `locationId`
- `quantity`
- `unitId`
- `physicalState` (Raw Material, Intermediate, Packaged / Commercially Ready)
- `availabilityStatus` (Available, Reserved, In-Transformation, Sold, Depleted, Archived)
- `currentUnitCost` (Live unit valuation derived from cost provenance)
- `totalAssetValue`
- `packagingTypeId` (optional, if packaged)
- `createdAt`, `updatedAt`

### Transformation
Represents the physical conversion event where inputs are converted to outputs.
```text
Transformation
├── implementedBy → Batch
├── guidedBy → Process
├── consumes → TransformationInput(s)
├── produces → TransformationOutput(s)
├── records → MeasuredYield, LossBreakdown, RecoverableResidue
└── attaches → DirectTransformationCosts (Labor, Energy, Overhead)
```
**Core Fields:**
- `transformationId`
- `batchId` (The enclosing execution batch)
- `processId` (The recipe/procedure template)
- `startedAt`, `completedAt`
- `validationStatus` (Draft, In-Transformation, Validated, Finalized, Cancelled)
- `directLaborCost` (Allocated labor monetary amount)
- `directOverheadCost` (Allocated energy, machine, facility costs)
- `expectedYieldRatio` (Theoretical ratio from Process)
- `actualYieldRatio` (Measured empirical ratio)
- `yieldVariancePercentage` (Difference between actual and expected)
- `processLossQuantity` (Measured unrecoverable evaporation/shrinkage mass or volume)
- `processLossUnitId`
- `notes`

### TransformationInput
Represents the physical allocation and deduction from an existing `InventoryLot`.
**Core Fields:**
- `transformationInputId`
- `transformationId`
- `inventoryLotId` (The specific physical stock being consumed)
- `inputRole` (PrimaryMaterial, SecondaryIngredient, AuxiliaryPackaging, ProcessingAid)
- `quantityConsumed` (Scalar amount)
- `unitId` (Standardized UoM)
- `unitCostAtConsumption` (Historical asset unit valuation carried from lot)
- `totalAllocatedCost` (`quantityConsumed * unitCostAtConsumption`)
- `isDepleted` (Boolean: whether this consumption brought the lot to zero)

### TransformationOutput
Represents the physical generation of material resulting in the creation or augmentation of an `InventoryLot`.
**Core Fields:**
- `transformationOutputId`
- `transformationId`
- `outputRole` (PrimaryOutput, CoProduct, ByProduct, RecoverableResidue)
- `materialId` (Master Material definition)
- `inventoryLotId` (The created or augmented InventoryLot; NULL for untracked by-products)
- `quantityProduced` (Measured actual amount)
- `unitId` (Standardized UoM)
- `resultingPhysicalState` (RawMaterial, Intermediate, Packaged)
- `inheritedUnitCost` (Calculated unit valuation derived from cost provenance)
- `totalOutputValuation` (`quantityProduced * inheritedUnitCost`)

### Batch / ProductionBatch
Represents the concrete execution record anchoring physical manufacturing telemetry.
**Core Fields:** `batchId`, `batchCode`, `processId`, `operatorName`, `machineId`, `facilityLocationId`, `startedAt`, `completedAt`, `status`, `telemetryLogs`

---

# Commercial Entities

Commercial entities represent customer-facing catalog offerings decoupled from warehouse inventory lots.

### Product
Represents the commercial product concept defined in the catalog.
**Core Fields:** `productId`, `name`, `productCategoryId`, `productLineId`, `description`, `isActive`

### SKU (Stock Keeping Unit)
Represents the specific commercial presentation, package size, pricing, and sales channel format.
```text
SKU
├── belongsTo → Product
├── requiresPhysicalState → (Material, PhysicalState, PackagingType)
└── fulfilledBy → Compatible InventoryLot(s)
```
**Core Fields:**
- `skuId`
- `skuCode`
- `productId`
- `packagingTypeId`
- `unitQuantity`
- `unitId`
- `retailPrice`
- `wholesalePrice`
- `channelType` (Retail POS, Wholesale, E-Commerce, Subscription)

---

# Transactional Entities

### InventoryMovement
Immutable physical inventory ledger tracking all additions, deductions, and transfers.
**Core Fields:** `movementId`, `inventoryLotId`, `movementType` (Purchase, TransformationInput, TransformationOutput, SalesFulfillment, Waste, Adjustment), `quantityDelta`, `unitId`, `sourceEntity`, `sourceEntityId`, `timestamp`, `notes`

### SalesTransaction
Represents commercial fulfillment and customer checkout.
```text
SalesTransaction
├── references → Customer
├── references → SKU(s)
├── fulfillsFrom → InventoryLot(s)
└── generates → InventoryMovement(s)
```
**Core Fields:** `salesTransactionId`, `customerId`, `channel`, `transactionDate`, `totalAmount`, `paymentStatus`, `notes`

### PaymentRecord
Represents payment tracking and financial settlement.
**Core Fields:** `paymentRecordId`, `salesTransactionId`, `paymentMethod`, `paymentAmount`, `paymentDate`

---

# Operational Relationship Flow

The primary operational and commercial lifecycle flow is:

```text
Supplier
   ↓ (PurchaseRecord)
InventoryLot (Raw Green Coffee, Pkg Materials)
   ↓ (TransformationInput)
Transformation (Roasting, Blending, Extraction, Portioning, Packaging)
   ↓ (TransformationOutput)
InventoryLot (Intermediate or Packaged Stock)
   ├── Further Transformations (Recursive Branching / Convergence)
   └── Commercial Fulfillment (SalesTransaction satisfying SKU criteria)
          ↓
       Customer
```

---

# Event-Driven Relationship Model

All operational activities generate deterministic operational events.
Events generate:
- inventory movement records on the immutable ledger,
- cost provenance updates and output valuation,
- parent-child batch and material lineage links,
- and operational traceability history.

Example:
```text
Transformation Event (Roasting)
   ↓
TransformationInputs Deducted (Green Coffee InventoryLot)
   ↓
TransformationOutputs Generated (Roasted Coffee InventoryLot)
   ↓
InventoryMovement Ledger Updated
   ↓
Cost Provenance & Current Valuation Calculated (Yield-Adjusted)
   ↓
Material Lineage Recorded
```

Modularity Strategy
The data model is designed to support modular expansion.
Core operational entities should remain reusable across modules.
Future modules should extend existing entities rather than replacing them.
Examples:
	•	AI systems should read operational data rather than control it.
	•	Advanced analytics should consume historical transactional records.
	•	Future production modules should reuse transformation structures.

Deterministic Core Principle
Critical operational entities must remain deterministic.
Examples:
	•	inventory quantity,
	•	costing,
	•	batch relationships,
	•	and transaction history  must remain traceable and auditable.
AI systems must not directly manipulate core operational entities.

Future Expansion Considerations
The data model is intentionally designed to support future expansion, including:
	•	multi warehouse,
	•	multi-location operations,
	•	advanced production orchestration,
	•	IoT roasting integration,
	•	forecasting systems,
	•	and AI-assisted analytics.
These features should extend existing structures rather than redesigning the operational foundation.

Data Model Philosophy Summary
Roastery OS data architecture is designed as:
	•	a transformation-based operational model,
	•	a batch-centric production structure,
	•	a modular operational ecosystem,
	•	and a production-first specialty coffee infrastructure.
The data model prioritizes:
	•	operational clarity,
	•	transformation traceability,
	•	deterministic workflows,
	•	modular extensibility,
	•	and long-term architectural consistency.
