# Supplier Master

## Purpose

Supplier Master defines the external supplier and vendor reference structures used across Roastery OS.

This entity standardizes supplier identity to support:
- procurement and purchasing workflows across all material categories,
- supply chain and origin traceability,
- receiving, inbound lot creation, and cost tracking,
- vendor relationship and performance analytics.

In the frozen ontology, a Supplier may supply **any physical Material** (`MaterialMaster`), including raw green coffee, packaging items, additives, consumables, merchandise, and equipment.

---

# Core Philosophy

Suppliers represent **commercial sourcing and procurement relationships**. They are not restricted to green coffee sourcing.

The system supports:
- **Raw Coffee Suppliers**: Farmers, washing stations, cooperatives, traders, importers, exporters.
- **Packaging Suppliers**: Bag manufacturers, box converters, label printers, tin/can suppliers.
- **Additives & Ingredients Suppliers**: Milk/syrup distributors, beverage ingredient vendors.
- **Consumables & Operations Suppliers**: Roaster gas providers, cleaning supply distributors, filter paper vendors.
- **Merchandise & Equipment Suppliers**: Brewer manufacturers, merchandise printers, grinder vendors.

---

# Entity Relationships

```text
Supplier
 ├── supplies → Material (1:N across any Material classification)
 ├── referencedBy → Inbound Receiving / Purchase Order Workflows
 ├── referencedBy → InventoryLot (origin traceability on receipt)
 ├── referencedBy → CostEvent (direct vendor freight/service invoices)
 └── referencedBy → Sourcing Analytics & Vendor Performance
```

### Boundary Distinctions

| Entity | Domain Scope | Responsibility |
| :--- | :--- | :--- |
| **`Supplier`** | Business Partner Entity | Identity, contact, terms, sourcing origin, vendor classification |
| **`Material`** | Physical Master Data | Material definition supplied by the vendor |
| **`InventoryLot`** | Physical Stock Instance | Inbound lot received from supplier with lot code, quantity, and unit cost |
| **`PurchaseOrder`** | Commercial Transaction | Purchasing contract and inbound receipt line items |

---

# Core Fields Specification

### Identity Fields
- `supplierId`: Unique canonical identifier (UUID / string).
- `name`: Legal or trade name of the supplier (e.g. *"IndoCafco Specialty Importers"*, *"PackPro Eco Packaging Solutions"*).
- `displayName`: Short operational name for screens and receipts.
- `internalCode`: Unique operational code (e.g. `SUP_INDO_001`).
- `supplierCategory`: Primary vendor domain (`GREEN_COFFEE_PRODUCER`, `GREEN_COFFEE_IMPORTER`, `PACKAGING_MANUFACTURER`, `INGREDIENT_SUPPLIER`, `EQUIPMENT_VENDOR`, `GENERAL_CONSUMABLES`).

### Sourcing & Origin Fields (Specialty Coffee Context)
- `supplierType`: Specific operational classification (`FARMER`, `COOPERATIVE`, `ESTATE`, `WASHING_STATION`, `EXPORTER`, `IMPORTER`, `DOMESTIC_DISTRIBUTOR`, `MANUFACTURER`).
- `farmOrEstateName`: Name of farm, finca, or washing station (if applicable).
- `cooperativeName`: Name of associated cooperative (if applicable).
- `country`: Country of origin (e.g. *"Colombia"*, *"Ethiopia"*, *"Indonesia"*).
- `region`: Specific growing province, state, or region (e.g. *"Huila"*, *"Yirgacheffe"*, *"Kintamani"*).
- `certifications`: List of active sustainability/quality badges (e.g. `["Fair Trade", "Organic", "Rainforest Alliance"]`).

### Contact & Location Fields
- `contactPerson`: Primary representative or account manager name.
- `email`: Sourcing / order contact email.
- `phoneNumber`: Phone or messaging contact number.
- `address`: Physical office, mill, or warehouse address.
- `website`: Supplier website or catalog URL.

### Commercial & Operational Terms
- `currencyCode`: Preferred trading currency (ISO 4217, e.g. `USD`, `IDR`, `EUR`).
- `paymentTerms`: Standard terms (e.g. `NET_30`, `CAD`, `ADVANCE_DEPOSIT`, `COD`).
- `leadTimeDays`: Typical delivery lead time in days.
- `preferredSupplier`: Boolean flag indicating preferred vendor status for relevant materials.
- `isActive`: Boolean flag indicating active procurement status.

### Metadata Fields
- `notes`: Relationship history, cupping notes from origin trips, or handling guidelines.
- `createdAt`: ISO 8601 timestamp.
- `updatedAt`: ISO 8601 timestamp.

---

# Operational Architectural Principles

### 1. Universal Material Supply Support
A Supplier can supply multiple materials across diverse categories:
```text
Supplier: "PT Agro Nusantara"
 ├── Supplies: Bali Kintamani Natural Green Coffee (Material: RAW_COFFEE)
 ├── Supplies: Java Frinsa Estate Wet Hull Green Coffee (Material: RAW_COFFEE)
 └── Supplies: Woven Burlap Storage Sacks (Material: CONSUMABLE)
```

### 2. Inbound Lot Cost Attribution
When an inbound purchase order is received:
1. An `InventoryLot` is created referencing the purchased `Material` and the originating `Supplier`.
2. The initial purchase price plus inbound freight/duties (invoiced directly or via `CostEvent`) form the opening unit valuation ($U_{\text{lot}}$) of the new stock lot.

### 3. Traceability Lineage
Tracing an end product back through its `Lineage` preserves the originating `Supplier` identifier across all upstream transformations (e.g. Retail Bag $\rightarrow$ Roasted Bean Lot $\rightarrow$ Green Coffee Lot $\rightarrow$ Supplier).

---

# Module Reference Matrix

| Module | Usage |
| :--- | :--- |
| **Material Master (`MaterialMaster`)** | Optional default supplier reference for reordering. |
| **Inventory / Receiving Engine** | Records supplier reference on inbound `InventoryLot` receipts. |
| **Costing Engine** | Attributes purchase invoice expenses to incoming raw lots. |
| **Analytics Engine** | Analyzes vendor spend, lead time reliability, and sensory quality. |

---

# Summary & Architectural Guardrails

- `Supplier` is a universal procurement partner entity, not restricted to green coffee.
- It supplies any physical `Material` tracked in `MaterialMaster`.
- It connects to `InventoryLot` during inbound receiving to establish origin traceability and opening acquisition valuation.

