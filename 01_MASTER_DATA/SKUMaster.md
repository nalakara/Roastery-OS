# SKU Master (Stock Keeping Unit)

## Purpose

SKUMaster defines the canonical commercial sellable transaction units used across Roastery OS.

This entity standardizes sellable unit definitions to support:
- sales transactions and order line item specifications,
- pricing structures, wholesale price tiers, and barcode/UPC management,
- commercial packaging variant specifications (size, grind, package format),
- and contextual fulfillment mapping to physical `InventoryLot` instances.

SKU represents the **commercial transaction unit** (e.g. *"HB-250G-WB"*, *"COLDBREW-BTL-330ML"*, *"DRIP-BOX-10PK"*), remaining distinct from conceptual `Product`, physical `Material`, and physical stock instances (`InventoryLot`).

---

# Core Philosophy

A SKU is a commercial sellable identity. It is not equivalent to Finished Goods inventory or a physical stock lot.

In the frozen Roastery OS ontology:
- **`Product`**: Conceptual product identity (e.g. *"House Blend"*).
- **`SKU`**: Commercial sellable transaction variant (e.g. *"House Blend 250g Whole Bean"*, SKU Code: `HB-250G-WB`).
- **`Material`**: Physical material specification (e.g. *Packaged 250g House Blend Bag* or bulk *Roasted House Bean Beans*).
- **`InventoryLot`**: Physical stock batch residing in a location with physical balance and unit valuation.

### Contextual M:N Commercial Fulfillment
A commercial SKU does not have a rigid $1:1$ lock to a single static inventory bucket:
1. **Direct Pre-Packaged Fulfillment ($1:1$)**: A sales order for `HB-250G-WB` is fulfilled by selecting an `InventoryLot` of pre-packaged 250g bags (`Material`: *MAT-PKG-HB-250G*).
2. **On-Demand Grind / Repack Fulfillment ($M:N$)**: A sales order for `HB-250G-GR-V60` (Ground for V60) may be fulfilled by taking 250g from a bulk `InventoryLot` of whole beans (`Material`: *MAT-ROAST-HB-BULK*), performing a rapid grinding/repackaging transformation, and issuing the order.
3. **Multi-Lot Order Fulfillment ($1:M$)**: An order for 10 units of `HB-250G-WB` may be fulfilled by consuming 4 units from `InventoryLot` #A and 6 units from `InventoryLot` #B.

```text
Product (1) ──── N ───> SKU (Commercial Sellable Unit)
                             │
                             └── Contextual M : N Fulfillment
                                   │
                                   ▼
                             InventoryLot (Physical Stock Instance)
```

---

# Entity Relationships

```text
SKU
 ├── belongsTo → Product (N:1)
 ├── (optional) classifiedBy → ProductCategory
 ├── fulfillsVia → InventoryLot (Contextual M:N at transaction time)
 ├── references → UnitMaster (Commercial Transaction UOM: EACH, BOX, PACK, KG)
 ├── referencedBy → POS Engine, E-Commerce, Wholesale Invoicing
 └── referencedBy → Sales Analytics & Margin Reporting
```

### Boundary Distinctions

| Entity | Domain Scope | Responsibility |
| :--- | :--- | :--- |
| **`Product`** | Commercial Catalog | Conceptual product identity and narrative |
| **`SKU`** | Commercial Sellable Unit | Barcode, retail price, wholesale price, packaging size, sale UOM |
| **`Material`** | Physical Master Data | Physical recipe, bulk composition, packaging specs |
| **`InventoryLot`** | Physical Stock Instance | Actual stock in location with physical balance and live economic unit cost |

---

# Core Fields Specification

### Identity Fields
- `skuId`: Unique canonical identifier (UUID / string).
- `productId`: Parent `ProductMaster` identifier ($N:1$).
- `skuCode`: Unique merchant SKU code (e.g. `HB-250G-WB`, `ETH-YIRG-1KG-WB`).
- `name`: Full commercial SKU name (e.g. *"House Blend - 250g Whole Bean"*).
- `displayName`: POS / receipt display name.
- `barcode`: UPC / EAN / GTIN barcode string.

### Commercial & Packaging Specifications
- `commercialUnit`: Commercial sale UOM from `UnitMaster` (`EACH`, `BAG`, `BOX`, `BOTTLE`, `CAN`, `KG`).
- `netWeightQuantity`: Nominal physical weight/volume content (e.g. `250`).
- `netWeightUnit`: UOM for nominal net weight from `UnitMaster` (e.g. `GRAM`, `KG`, `ML`, `LITER`).
- `grindOption`: Grind specification variant (`WHOLE_BEAN`, `COARSE_COLDBREW`, `MEDIUM_FILTER`, `FINE_ESPRESSO`, `CUSTOM`).
- `packagingSpecification`: Optional description or link to `PackagingTypeMaster` spec (e.g. *250g Valve Gusset Bag*).

### Pricing & Commercial Attributes
- `retailPrice`: Default consumer retail price (monetary value).
- `wholesalePrice`: Default wholesale / B2B price (monetary value).
- `currencyCode`: Currency ISO 4217 code (e.g. `USD`, `IDR`, `EUR`).
- `taxRatePercentage`: Applicable sales tax / VAT rate.
- `isSellable`: Boolean flag indicating if active for customer transactions.
- `isWholesaleEligible`: Boolean flag for B2B ordering portals.
- `isSubscriptionEligible`: Boolean flag for recurring subscription orders.
- `isActive`: Boolean flag indicating operational status.

### Audit & Timestamps
- `createdAt`: ISO 8601 timestamp.
- `updatedAt`: ISO 8601 timestamp.

---

# Operational Architectural Principles

### 1. No Live Inventory Balances on SKU
`SKU` is a commercial master data definition. Live quantities on hand, reserved quantities, and damaged quantities are maintained exclusively on **`InventoryLot`** records.

### 2. No Static Asset Cost on SKU
`SKU` defines selling prices (`retailPrice`, `wholesalePrice`). It does **not** store inventory valuation. When an order for a SKU is shipped/fulfilled:
- The actual COGS is calculated directly from the consumed **`InventoryLot.unitCost`** ($U_{\text{lot}}$) via Costing Engine Equation 1.
- Margin is computed dynamically as:
  $$\text{Margin} = \text{Price}_{\text{SKU}} - U_{\text{lot}}$$

### 3. Contextual M:N Commercial Fulfillment
A SKU may be fulfilled from different physical materials depending on channel or inventory availability:
```text
SKU: "House Blend 1kg Wholesale" (HB-1KG-WB)
 ├── Option A: Fulfilled from pre-bagged 1kg bag InventoryLot (Material: MAT-PKG-HB-1KG)
 └── Option B: Fulfilled by dispensing 1kg from bulk roasted bean tote InventoryLot (Material: MAT-ROAST-HB-BULK)
```
This decoupling allows the roastery to operate flexible just-in-time or pre-packaged fulfillment without altering the commercial SKU catalog.

---

# Module Reference Matrix

| Module | Usage |
| :--- | :--- |
| **Commercial / POS / E-Commerce** | Core sellable line item for POS checkout, webstore cart, and wholesale orders. |
| **Inventory / Fulfillment Engine** | Resolves commercial SKU demand into physical `InventoryLot` allocations. |
| **Costing Engine** | Evaluates COGS upon lot depletion for order fulfillment. |
| **Analytics Engine** | Tracks revenue, sales volume, margin, and discount performance per SKU. |

---

# Summary & Architectural Guardrails

- `SKU` is strictly the commercial sellable unit.
- It is distinct from `Product` ($1:N$) and physical `InventoryLot` ($M:N$ fulfillment).
- `SKU` is NOT synonymous with "Finished Goods Inventory".
- `SKU` holds commercial selling prices; inventory valuation lives strictly on `InventoryLot`.
