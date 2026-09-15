# Roastery OS Logical Data Model (LDM)

**Status:** Proposed Logical Model & Ready for Phase 3 Review  
**Baseline Specification:** `SPECIFICATION_HARDENING_GATE.md` (FROZEN)  
**Architecture Baseline:** `TECHNICAL_ARCHITECTURE.md` (APPROVED)  
**Date:** 2026-09-14  

---

## 1. Purpose & Scope

This document defines the **Logical Data Model (LDM)** for Roastery OS.

It translates the frozen domain specification and technical architecture into precise logical entities, candidate attributes, relationships, cardinalities, constraints, and invariants.

This model serves as the blueprint for **Phase 3: Database Schema & Migrations (DDL)**.

---

## 2. Model Classification System

To maintain strict architectural discipline, all content in this document is classified under three distinct tiers:

1. **`[FROZEN]` Domain Rules & Invariants:** Non-negotiable domain boundaries, frozen ontology (`Material` $\rightarrow$ `Product` $\rightarrow$ `SKU` $\rightarrow$ `InventoryLot`), physical/economic separation, $N:M$ transformation semantics, and authoritative engine ownership.
2. **`[PROPOSED]` Logical Structures:** Proposed logical entities, candidate attributes, relationships, foreign keys, and cardinalities subject to validation during schema implementation.
3. **`[OPEN]` Implementation Decisions:** Unresolved technical choices explicitly deferred to Phase 3 DDL or later phases.

---

## 3. High-Level Entity-Relationship (ER) Overview

```text
┌────────────────────────────────────────────────────────────────────────┐
│                             01_MASTER_DATA                             │
│  ┌──────────────────┐       ┌─────────────────┐       ┌─────────────┐  │
│  │  MaterialMaster  │◄──────┤  ProductMaster  │◄──────┤  SKUMaster  │  │
│  └────────▲─────────┘       └─────────────────┘       └──────▲──────┘  │
└───────────┼──────────────────────────────────────────────────┼─────────┘
            │ 1:N                                              │ 1:N
┌───────────┼──────────────────────────────────────────────────┼─────────┐
│           │                02_INVENTORY_ENGINE               │         │
│  ┌────────┴─────────┐ 1:N   ┌──────────────────────┐         │         │
│  │   InventoryLot   ├──────►│ StockLedgerMovement  │         │         │
│  └────────▲────▲────┘       └──────────────────────┘         │         │
└───────────┼────┼─────────────────────────────────────────────┼─────────┘
            │    │ (Allocated / Produced)                      │
┌───────────┼────┼─────────────────────────────────────────────┼─────────┐
│           │    │          CORE TRANSFORMATION CONTRACT       │         │
│  ┌────────┴────┴──────────┐   1:N   ┌────────────────┐       │         │
│  │   TransformationInput  │◄────────┤ Transformation ├───────┤         │
│  └────────────────────────┘         └───────┬────────┘       │         │
│                                             │ 1:N            │         │
│  ┌────────────────────────┐                 ▼                │         │
│  │  TransformationOutput  │◄────────────────┘                │         │
│  └────────┬───────────────┘                                  │         │
└───────────┼──────────────────────────────────────────────────┼─────────┘
            │ 1:1 links to created InventoryLot                │
            ▼                                                  │
┌───────────────────────────┐                                  │
│   03 / 04 / 05 EXECUTION  │                                  │
│  ┌─────────────────────┐  │ 0..1 : 1                         │
│  │ Batch (Roast/Blend/ │──┼──────────────────────────────────┘
│  │  Packaging Context) │  │ (optional execution context)
│  └─────────────────────┘  │
└───────────────────────────┘
            │
            ├─────────────────────────────────┐
            ▼                                 ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│     07_COSTING_ENGINE     │   │   08_BATCH_TRACEABILITY   │
│  ┌─────────────────────┐  │   │  ┌─────────────────────┐  │
│  │  CostLedgerEntry    │  │   │  │   ProvenanceEdge    │  │
│  │  (CostEvent, COGS,  │  │   │  │ (Lot ↔ Transformation│ │
│  │   Valuation Record) │  │   │  │  Causal Lineage)    │  │
│  └─────────────────────┘  │   │  └─────────────────────┘  │
└───────────────────────────┘   └───────────────────────────┘
            ▲                                 ▲
            │ reads valuation                 │ records fulfillment trace
┌───────────┴───────────────┐   ┌─────────────┴─────────────┐
│       06_POS_ENGINE       │   │   10_CUSTOMER_WHOLESALE   │
│  ┌─────────────────────┐  │   │  ┌─────────────────────┐  │
│  │ POSTransaction      │  │   │  │ WholesaleOrder      │  │
│  │ POSTransactionLine  ├──┼───┼──┤ WholesaleOrderLine  │  │
│  │ FulfillmentAlloc    │──┴───┴──┤ FulfillmentAlloc    │  │
│  └─────────────────────┘         └─────────────────────┘  │
└───────────────────────────┘   └───────────────────────────┘
            ▲
            │ intake handoff
┌───────────┴───────────────┐
│    09_SUPPLIER_SYSTEM     │
│  ┌─────────────────────┐  │
│  │ SupplierMaster      │  │
│  │ PurchaseOrder       │  │
│  │ PurchaseReceipt     │  │
│  └─────────────────────┘  │
└───────────────────────────┘
```

---

## 4. Proposed Canonical Logical Entities

### 4.1 `01_MASTER_DATA` Entities

#### 1. `MaterialMaster` `[PROPOSED]`
- **Purpose:** Canonical definition of physical substances (raw materials, roasted coffee, blended coffee, packaging bags, filters, bottles, nitrogen).
- **Owning Module:** `01_MASTER_DATA` `[FROZEN]`
- **Primary Identifier:** `materialId`
- **Candidate Attributes:** `code`, `name`, `category` (`RAW_MATERIAL`, `INTERMEDIARY_COFFEE`, `PACKAGING_MATERIAL`, `CONSUMABLE`, `FINISHED_GOOD`), `baseUom`, `description`, `isActive`, `createdAt`, `updatedAt`.
- **Relationships:**
  - $1:N$ to `ProductMaster` (optional default material mapping).
  - $1:N$ to `InventoryLot` (physical lots instantiating this material).
  - $1:N$ to `TransformationInput` / `TransformationOutput`.
- **Mutability:** Mutable catalog entity; soft-deletable (`isActive = false`).

#### 2. `ProductMaster` `[PROPOSED]`
- **Purpose:** Conceptual commercial identity and brand family (e.g., "Single Origin Flores Bajawa", "Signature House Blend").
- **Owning Module:** `01_MASTER_DATA` `[FROZEN]`
- **Primary Identifier:** `productId`
- **Candidate Attributes:** `productCode`, `name`, `brandLine`, `description`, `materialId` (optional link to primary material), `isActive`, `createdAt`, `updatedAt`.
- **Relationships:**
  - $N:1$ to `MaterialMaster` (optional).
  - $1:N$ to `SKUMaster` (a Product is packaged/sold across multiple SKU variants).
- **Mutability:** Mutable catalog entity.

#### 3. `SKUMaster` `[PROPOSED]`
- **Purpose:** Commercial sellable stock-keeping unit with specific packaging format, sellable quantity, barcode, and base price.
- **Owning Module:** `01_MASTER_DATA` `[FROZEN]`
- **Primary Identifier:** `skuId`
- **Candidate Attributes:** `skuCode`, `productId` (foreign reference), `materialId` (foreign reference to expected physical stock material), `name`, `packagingType`, `packagedQuantity`, `packagedUom`, `barcode`, `baseRetailPrice`, `baseWholesalePrice`, `isActive`, `createdAt`, `updatedAt`.
- **Relationships:**
  - $N:1$ to `ProductMaster` (mandatory).
  - $N:1$ to `MaterialMaster` (mandatory physical material link).
  - $1:N$ to `POSTransactionLine` and `WholesaleOrderLine`.
- **Mutability:** Mutable catalog entity.

---

### 4.2 `02_INVENTORY_ENGINE` Entities

#### 4. `InventoryLot` `[PROPOSED]`
- **Purpose:** The canonical, atomic physical stock instance. Tracks physical quantity, reservations, and location.
- **Owning Module:** `02_INVENTORY_ENGINE` `[FROZEN]`
- **Primary Identifier:** `inventoryLotId`
- **Candidate Attributes:** `lotNumber` (human-readable tracking code), `materialId` (foreign reference), `quantityOnHand` (physical balance), `reservedQuantity` (active soft holds), `uom`, `storageLocationId`, `lotState` (`ACTIVE`, `QUARANTINED`, `DEPLETED`), `receivedAt`, `expiresAt`, `createdAt`, `updatedAt`.
- **Derived Attribute:** `availableQuantity = quantityOnHand - reservedQuantity`.
- **Relationships:**
  - $N:1$ to `MaterialMaster` (defines physical substance).
  - $1:N$ to `StockLedgerMovement` (audit trail of all physical stock mutations).
  - $1:N$ to `TransformationInput` (as a consumed source).
  - $1:1$ or $N:1$ from `TransformationOutput` (as a produced target).
  - $1:N$ to `FulfillmentAllocation` (POS and Wholesale dispatch).
- **Mutability:** Physical quantity mutated **strictly** via append-only `StockLedgerMovement` records. Reservations managed via allocation state.

#### 5. `StockLedgerMovement` `[PROPOSED]`
- **Purpose:** Immutable append-only audit ledger of every physical stock addition, deduction, or restoration.
- **Owning Module:** `02_INVENTORY_ENGINE` `[FROZEN]`
- **Primary Identifier:** `movementId`
- **Candidate Attributes:** `movementNumber`, `inventoryLotId` (foreign reference), `movementType` (`PURCHASE_RECEIPT`, `TRANSFORMATION_CONSUME`, `TRANSFORMATION_YIELD`, `COMMERCIAL_DISPATCH`, `RESTOCK`, `ADJUSTMENT_LOSS`, `ADJUSTMENT_GAIN`), `quantityDelta` (signed Decimal), `uom`, `sourceLocationId`, `destinationLocationId`, `referenceEntityType` (`PURCHASE_ORDER`, `TRANSFORMATION`, `POS_TRANSACTION`, `WHOLESALE_ORDER`, `INVENTORY_AUDIT`), `referenceEntityId`, `operatorId`, `occurredAt`, `notes`.
- **Relationships:**
  - $N:1$ to `InventoryLot`.
- **Mutability:** Strictly **IMMUTABLE** (append-only). Corrections require compensatory movements.

---

### 4.3 Core Transformation & Execution Entities

#### 6. `Transformation` `[PROPOSED]`
- **Purpose:** Canonical material conversion boundary. Consumes $N$ input lots and yields $M$ output lots.
- **Owning Module:** Core Domain Contract / Shared Domain Concept `[FROZEN]`
- **Primary Identifier:** `transformationId`
- **Candidate Attributes:** `transformationNumber`, `transformationArchetype` (`ROASTING`, `BLENDING`, `EXTRACTION_COLD_BREW`, `GRINDING`, `ASSEMBLY_PACKAGING`, `REPACKAGING`), `transformationStatus` (`DRAFT`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), `batchId` (optional foreign reference to execution context), `startedAt`, `completedAt`, `createdAt`, `updatedAt`.
- **Relationships:**
  - $0..1 : 1$ to `Batch` (optional execution context wrapper).
  - $1:N$ to `TransformationInput` ($N \ge 1$).
  - $1:N$ to `TransformationOutput` ($M \ge 1$).
  - $1:N$ to `CostEvent` (non-inventory conversion expenses).
- **Mutability:** State advances from `DRAFT` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`. Immutable once completed.

#### 7. `TransformationInput` `[PROPOSED]`
- **Purpose:** Records physical material consumption from an existing `InventoryLot` into a `Transformation`.
- **Owning Module:** Core Domain Contract `[FROZEN]`
- **Primary Identifier:** `transformationInputId`
- **Candidate Attributes:** `transformationId` (foreign reference), `inventoryLotId` (foreign reference), `materialId` (foreign reference), `plannedQuantity`, `actualQuantityConsumed`, `uom`, `inputSequence`, `movementId` (foreign reference to `StockLedgerMovement` for physical deduction).
- **Costing Contract Note:** `TransformationInput` stores **physical consumption data only**. It does **NOT** store authoritative material cost; economic value is resolved by `07_COSTING_ENGINE` based on active valuation policies.
- **Relationships:**
  - $N:1$ to `Transformation`.
  - $N:1$ to `InventoryLot`.
- **Mutability:** Immutable once transformation is completed.

#### 8. `TransformationOutput` `[PROPOSED]`
- **Purpose:** Records physical material output yielded by a `Transformation` and initialized as an `InventoryLot`.
- **Owning Module:** Core Domain Contract `[FROZEN]`
- **Primary Identifier:** `transformationOutputId`
- **Candidate Attributes:** `transformationId` (foreign reference), `createdLotId` (foreign reference to newly initialized `InventoryLot`), `materialId` (foreign reference), `outputType` (`PRIMARY_PRODUCT`, `CO_PRODUCT`, `BY_PRODUCT`, `RECOVERABLE_RESIDUE`), `actualQuantityProduced`, `uom`, `yieldRatio`, `movementId` (foreign reference to `StockLedgerMovement` for physical stock entry).
- **Relationships:**
  - $N:1$ to `Transformation`.
  - $1:1$ to `InventoryLot` (the newly yielded lot).
- **Mutability:** Immutable once transformation is completed.

#### 9. `Batch` (Execution Context) `[PROPOSED]`
- **Purpose:** Operational execution context envelope capturing machine, operator, sensor logs, and process parameters for engines that utilize batches.
- **Owning Module:** Shared Execution Model across `03_ROASTING_ENGINE`, `04_BLEND_ENGINE`, and `05_PRODUCTION_ENGINE` `[FROZEN]`
- **Primary Identifier:** `batchId`
- **Candidate Attributes:** `batchNumber`, `batchType` (`ROAST_BATCH`, `BLEND_BATCH`, `PRODUCTION_BATCH`, `PACKAGING_BATCH`), `transformationId` (foreign reference), `equipmentId`, `operatorId`, `recipeOrProfileId`, `ambientTemperature`, `ambientHumidity`, `processTelemetry`, `startedAt`, `completedAt`, `batchStatus` (`PLANNED`, `EXECUTING`, `COMPLETED`, `ABORTED`).
- **Relationships:**
  - $1 : 0..1$ to `Transformation` (Batch is an execution wrapper; generic transformations do not inherently require a Batch).
- **Mutability:** Mutable during execution; strictly immutable upon `COMPLETED`.

---

### 4.4 `07_COSTING_ENGINE` Entities

#### 10. `CostEvent` `[PROPOSED]`
- **Purpose:** Records non-inventory conversion expenses incurred during a `Transformation`.
- **Owning Module:** `07_COSTING_ENGINE` `[FROZEN]`
- **Primary Identifier:** `costEventId`
- **Candidate Attributes:** `transformationId` (foreign reference), `costCategory` (`DIRECT_LABOR`, `ENERGY_UTILITIES`, `MACHINE_USAGE`, `DIRECT_SERVICE_FEE`, `DIRECT_OVERHEAD`), `allocatedAmount` (Decimal monetary value), `currency`, `allocationBasis` (`BATCH_FIXED`, `MASS_PROPORTIONAL`, `VOLUME_PROPORTIONAL`, `TIME_DURATION`), `recordedAt`.
- **Boundary Invariant:** `CostEvent` is strictly for non-inventory expenses. All physical materials (beans, bags, bottles, labels) **MUST** enter as `TransformationInput`.
- **Relationships:**
  - $N:1$ to `Transformation`.
- **Mutability:** Strictly **IMMUTABLE** (append-only economic cost entry).

#### 11. `LotValuationRecord` `[PROPOSED]`
- **Purpose:** Authoritative record of accumulated economic cost and calculated unit cost for an `InventoryLot`.
- **Owning Module:** `07_COSTING_ENGINE` `[FROZEN]`
- **Primary Identifier:** `valuationRecordId`
- **Candidate Attributes:** `inventoryLotId` (foreign reference), `materialCost` ($\sum \text{Resolved Input Values}$), `conversionCost` ($\sum \text{CostEvents}$), `totalLotCost` ($\text{materialCost} + \text{conversionCost}$), `unitCost` ($U_{\text{lot}} = \frac{\text{totalLotCost}}{\text{lotQuantity}}$), `valuationPolicySnapshot`, `calculatedAt`.
- **Relationships:**
  - $1:1$ to `InventoryLot` (one authoritative valuation per lot creation/yield event).
- **Mutability:** Immutable historical record.

#### 12. `COGSRecord` `[PROPOSED]`
- **Purpose:** Records realized Cost of Goods Sold when physical inventory is commercially dispatched.
- **Owning Module:** `07_COSTING_ENGINE` `[FROZEN]`
- **Primary Identifier:** `cogsRecordId`
- **Key Attributes:** `fulfillmentAllocationId` (foreign reference), `inventoryLotId` (foreign reference), `dispatchedQuantity`, `uom`, `unitCostSnapshot` ($U_{\text{lot}}$), `totalCOGSAmount` ($\text{dispatchedQuantity} \times \text{unitCostSnapshot}$), `realizedAt`.
- **Relationships:**
  - $1:1$ to `FulfillmentAllocation`.
  - $N:1$ to `InventoryLot`.
- **Mutability:** Strictly **IMMUTABLE**.

---

### 4.5 `08_BATCH_TRACEABILITY` Entities

#### 13. `ProvenanceEdge` `[PROPOSED]`
- **Purpose:** Immutable directed causal graph edge recording exact physical genealogy between parent lots, transformations, and child lots.
- **Owning Module:** `08_BATCH_TRACEABILITY` `[FROZEN]`
- **Primary Identifier:** `provenanceEdgeId`
- **Candidate Attributes:** `sourceLotId` (parent `InventoryLot`), `transformationId` (conversion step), `targetLotId` (child `InventoryLot`), `consumedQuantity`, `uom`, `edgeType` (`MATERIAL_CONSUMPTION`, `ASSEMBLY_COMPONENT`, `SPLIT_OUTPUT`), `recordedAt`.
- **Relationships:**
  - $N:1$ to parent `InventoryLot`.
  - $N:1$ to `Transformation`.
  - $N:1$ to child `InventoryLot`.
- **Mutability:** Strictly **IMMUTABLE** (append-only provenance store).

---

### 4.6 `09_SUPPLIER_SYSTEM` Entities

#### 14. `SupplierMaster` `[PROPOSED]`
- **Purpose:** Generic B2B vendor and supplier relationship identity (green coffee farms, exporters, packaging suppliers, equipment vendors).
- **Owning Module:** `09_SUPPLIER_SYSTEM` `[FROZEN]`
- **Primary Identifier:** `supplierId`
- **Candidate Attributes:** `supplierCode`, `name`, `supplierType` (`GREEN_COFFEE_PRODUCER`, `COFFEE_EXPORTER`, `PACKAGING_MANUFACTURER`, `INGREDIENT_VENDOR`, `EQUIPMENT_SUPPLIER`), `contactPerson`, `email`, `phone`, `paymentTerms`, `originCountry`, `originRegion`, `isActive`, `createdAt`, `updatedAt`.
- **Relationships:**
  - $1:N$ to `PurchaseOrder`.
- **Mutability:** Mutable catalog entity.

#### 15. `PurchaseOrder` & `PurchaseReceipt` `[PROPOSED]`
- **Purpose:** Inbound commercial procurement order and receiving voucher.
- **Owning Module:** `09_SUPPLIER_SYSTEM` `[FROZEN]`
- **Primary Identifier:** `poId` / `receiptId`
- **Key Attributes (`PurchaseReceipt`):** `receiptNumber`, `poId` (foreign reference), `supplierId` (foreign reference), `materialId` (foreign reference), `receivedQuantity`, `uom`, `unitPurchasePrice`, `totalPrice`, `originLotReference`, `receivedAt`, `createdInventoryLotId` (foreign reference to lot initialized in `02_INVENTORY_ENGINE`).
- **Relationships:**
  - $N:1$ to `SupplierMaster`.
  - $1:1$ to `InventoryLot` (via `createdInventoryLotId`).
- **Mutability:** Purchase Receipt is immutable once verified.

---

### 4.7 Commercial Sales & Fulfillment Entities (`06_POS_ENGINE` & `10_CUSTOMER_WHOLESALE`)

#### 16. `CommercialTransaction` (POS & Wholesale) `[PROPOSED]`
- **Purpose:** Represents a commercial sales agreement (Retail `POSTransaction` or B2B `WholesaleOrder`).
- **Owning Module:** `06_POS_ENGINE` (Retail) / `10_CUSTOMER_WHOLESALE` (B2B) `[FROZEN]`
- **Primary Identifier:** `orderId` / `transactionId`
- **Candidate Attributes:** `orderNumber`, `channel` (`RETAIL_POS`, `WHOLESALE_CONTRACT`, `ECOMMERCE`), `customerId` (optional for retail, mandatory for wholesale), `orderStatus` (`DRAFT`, `CONFIRMED`, `RESERVED`, `PARTIALLY_FULFILLED`, `FULFILLED`, `DISPATCHED`, `COMPLETED`, `CANCELLED`, `REFUNDED`), `subtotal`, `discountTotal`, `taxTotal`, `grandTotal`, `orderedAt`, `dispatchedAt`, `completedAt`.
- **Relationships:**
  - $1:N$ to `CommercialOrderLine`.
- **Mutability:** Advances through lifecycle state machine; immutable once completed.

#### 17. `CommercialOrderLine` `[PROPOSED]`
- **Purpose:** Sellable line item on a commercial order specifying the purchased SKU and commercial price.
- **Owning Module:** `06_POS_ENGINE` / `10_CUSTOMER_WHOLESALE` `[FROZEN]`
- **Primary Identifier:** `orderLineId`
- **Candidate Attributes:** `orderId` (foreign reference), `skuId` (foreign reference to `SKUMaster`), `materialId` (derived from SKU), `orderedQuantity`, `fulfilledQuantity`, `uom`, `unitPrice` (commercial selling price), `discountAmount`, `taxAmount`, `lineSubtotal`, `lineStatus`.
- **Relationships:**
  - $N:1$ to `CommercialTransaction`.
  - $N:1$ to `SKUMaster`.
  - $1:N$ to `FulfillmentAllocation` ($1 \text{ Line} \rightarrow N \text{ Lots}$).
- **Mutability:** Mutable prior to fulfillment; locked upon dispatch.

#### 18. `FulfillmentAllocation` `[PROPOSED]`
- **Purpose:** Binds a commercial line item to one or more physical `InventoryLot` instances for dispatch and COGS stamping.
- **Owning Module:** Shared Commercial Fulfillment Model (`06_POS_ENGINE` & `10_CUSTOMER_WHOLESALE`) `[FROZEN]`
- **Primary Identifier:** `allocationId`
- **Candidate Attributes:** `orderLineId` (foreign reference), `inventoryLotId` (foreign reference to consumed physical stock), `allocatedQuantity`, `uom`, `movementId` (foreign reference to `COMMERCIAL_DISPATCH` in `02_INVENTORY_ENGINE`), `unitCostSnapshot` ($U_{\text{lot}}$ stamped from `07_COSTING_ENGINE`), `cogsAmount` ($\text{allocatedQuantity} \times \text{unitCostSnapshot}$), `allocatedAt`.
- **Relationships:**
  - $N:1$ to `CommercialOrderLine`.
  - $N:1$ to `InventoryLot`.
  - $1:1$ to `StockLedgerMovement`.
  - $1:1$ to `COGSRecord`.
- **Mutability:** Strictly **IMMUTABLE** once physical dispatch occurs.

---

## 5. Logical Integrity Constraints & Domain Invariants `[FROZEN]`

1. **Physical Quantity Conservation Invariant:**  
   $$\text{InventoryLot.quantityOnHand} = \sum_{\text{movements}} \text{StockLedgerMovement.quantityDelta}$$
   `InventoryLot.quantityOnHand` reconciles **exclusively** from physical stock movements (`PURCHASE_RECEIPT`, `TRANSFORMATION_CONSUME`, `TRANSFORMATION_YIELD`, `COMMERCIAL_DISPATCH`, `RESTOCK`, `ADJUSTMENT`).
2. **Reservation & Availability Separation:**  
   - Placing or releasing a reservation does **NOT** alter `quantityOnHand`.
   - `availableQuantity` is derived:
     $$\text{availableQuantity} = \text{quantityOnHand} - \text{reservedQuantity} \ge 0$$
3. **Unit-Aware Transformation Invariant:**  
   - $N:M$ Transformations consume and produce materials across distinct, unit-aware dimensions (mass, volume, count, packs).
   - Incompatible units are **NEVER** summed together (e.g., $10\text{ kg} + 1000\text{ units}$ is invalid).
   - Physical yield is evaluated per compatible material/UoM dimension:
     $$\text{Yield Ratio} = \frac{\text{Output Quantity}}{\text{Compatible Input Quantity}} \quad (\text{for identical UoM})$$
4. **Valuation & Physical/Economic Separation:**  
   $$U_{\text{lot}} = \frac{\sum \text{ResolvedValue}(\text{TransformationInput}_i) + \sum \text{CostEvents.allocatedAmount}}{\text{TransformationOutput.actualQuantityProduced}}$$
   - `TransformationInput` records physical consumption.
   - `CostEvent` records non-inventory expenses (`DIRECT_LABOR`, `ENERGY_UTILITIES`, `MACHINE_USAGE`, `DIRECT_SERVICE_FEE`, `DIRECT_OVERHEAD`).
   - `07_COSTING_ENGINE` resolves input lot values according to active valuation policy without modifying physical inventory records.
5. **Multi-Lot Commercial Fulfillment:**  
   $$\text{CommercialOrderLine.orderedQuantity} = \sum_{k=1}^{n} \text{FulfillmentAllocation}[k].\text{allocatedQuantity} + \text{remainingQuantity}$$
   A single commercial SKU line item can allocate across $N$ physical `InventoryLots`.

---

## 6. Open Implementation Decisions `[OPEN]`

1. **`[OPEN-LDM-01]` Primary Identifier Strategy:**
   - *Option A:* Canonical UUIDv7 for all primary keys (time-ordered, offline-friendly).
   - *Option B:* 64-bit BigInt Identity keys with external UUID aliases.
   - *Status:* OPEN — to be decided during Phase 3 DDL.
2. **`[OPEN-LDM-02]` Multi-Tenancy Column Strategy:**
   - *Option A:* `organizationId` foreign key on all root aggregate tables.
   - *Option B:* Database schema-per-tenant.
   - *Status:* OPEN — to be decided during Phase 3 DDL.
3. **`[OPEN-LDM-03]` Process Telemetry / Curve Storage:**
   - *Option A:* JSONB field (`processTelemetry`) directly on `Batch`.
   - *Option B:* Dedicated time-series table.
   - *Status:* OPEN — to be decided during Phase 3 DDL.

---

## 7. Summary Checklist

- [x] Transformation $\leftrightarrow$ Batch modeled as optional $0..1:1$ (Batch does not replace Transformation).
- [x] CostEvent restricted strictly to non-inventory conversion expenses per frozen costing contract.
- [x] Valuation logic clarified: `TransformationInput` stores physical consumption; Costing Engine resolves economic values.
- [x] Inventory quantity invariant strictly reconciles physical movements; reservations separated from `quantityOnHand`.
- [x] Unit-aware transformation conservation enforced per compatible UoM dimension (no summing across incompatible units).
- [x] Clear tier separation: `[FROZEN]` domain rules, `[PROPOSED]` logical structures, `[OPEN]` implementation choices.
