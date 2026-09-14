# Supplier Master

## Purpose

Supplier Master defines the supplier reference structures used across Roastery OS.

This entity standardizes supplier information to support:
- sourcing workflows,
- procurement tracking,
- inventory traceability,
- costing systems,
- and operational analytics.

Supplier references are treated as reusable business entities shared across inventory, purchasing, roasting, and reporting systems.

---

# Core Philosophy

Supplier structures should remain:
- operationally practical,
- relationship-oriented,
- scalable,
- and suitable for both artisan and production-scale roasting businesses.

The system should support:
- farmers,
- cooperatives,
- traders,
- importers,
- and distributors
without forcing rigid enterprise procurement structures during MVP stages.

Supplier data should support sourcing clarity rather than excessive administrative complexity.

---

# Operational Role

Supplier Master functions as:
- a sourcing reference,
- a procurement relationship entity,
- a traceability component,
- and an operational analytics grouping structure.

Supplier references are commonly used in:
- GreenBean sourcing,
- procurement workflows,
- costing systems,
- roasting traceability,
- and sourcing analytics.

---

# Relationships

```text
Supplier
├── supplies → GreenBean
├── referencedBy → PurchaseRecord
├── referencedBy → Inventory
├── referencedBy → Costing
└── referencedBy → Analytics

Core Fields
Identity Fields
supplierId
name
displayName
internalCode
supplierType
Examples of supplierType:
Farmer
Cooperative
Trader
Importer
Distributor

Contact Fields
contactPerson
phoneNumber
email
website
socialMedia

Location Fields
address
region
province
country
postalCode

Operational Fields
preferredSupplier
activeStatus
paymentTerms
deliveryPreference
supplierRating
Most advanced operational fields should remain optional during MVP implementation.

Traceability Fields
farmRelationship
cooperativeName
importReference
certificationReference
These fields should remain optional in MVP stages.

General Fields
notes
createdAt
updatedAt

Supplier Philosophy
Suppliers should be treated as operational sourcing partners rather than simple vendor records.
Supplier relationships may affect:
	•	sourcing consistency,
	•	coffee quality,
	•	costing structures,
	•	traceability,
	•	and production planning.
The architecture should support evolving sourcing relationships without introducing unnecessary procurement bureaucracy.

Supplier Identity Principle
Supplier represents business relationship identity only.
Example:
Supplier
≠
PurchaseRecord

Supplier
Represents:
	•	sourcing relationship,
	•	supplier identity,
	•	and reusable procurement references.

PurchaseRecord
Represents:
	•	actual procurement activity,
	•	transactional purchasing,
	•	costing events,
	•	and inventory acquisition.
This separation preserves:
	•	modular consistency,
	•	sourcing flexibility,
	•	and operational scalability.

Sourcing Relationship Principle
A single Supplier may supply:
	•	multiple GreenBeans,
	•	multiple harvests,
	•	and multiple processing variations.
Example:
Supplier
├── Bali Kintamani Natural
├── Bali Kintamani Honey
├── Toraja Full Wash
└── Java Wet Hull
The architecture should support reusable sourcing relationships across operational workflows.

Naming Convention
Entity Name:
Supplier
Primary Identifier:
supplierId
Related References:
supplierType
contactPerson
country
Naming should follow standards defined in:
	•	NamingConvention.md
	•	DataModel.md

Used By Modules
Supplier Master is shared across:
	•	GreenBean Master
	•	Inventory Engine
	•	Costing Engine
	•	Procurement Workflows
	•	Batch Traceability
	•	Analytics Dashboard
	•	Future AI Systems

MVP Scope
The MVP implementation should remain lightweight.
Required MVP fields:
supplierId
name
supplierType
phoneNumber
region
country
notes
Basic MVP supplier types:
Farmer
Cooperative
Trader
Importer
Advanced sourcing metadata may be added progressively in future operational stages.

Future Expansion Possibilities
Future versions may support:
	•	supplier performance scoring,
	•	sourcing contracts,
	•	procurement forecasting,
	•	certification management,
	•	sustainability tracking,
	•	supplier analytics,
	•	and AI-assisted sourcing recommendations.
Future expansion should extend the structure without redesigning the operational foundation.

Architectural Notes
Supplier Master is designed as a reusable business reference entity.
Multiple GreenBean and procurement entities may reference the same Supplier structure.
This entity should remain:
	•	stable,
	•	reusable,
	•	operationally meaningful,
	•	and loosely coupled from transactional workflows.
Supplier structures should support operational clarity while remaining flexible enough for evolving sourcing relationships and specialty coffee supply chain models.

