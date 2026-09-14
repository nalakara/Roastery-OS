# GreenBean Master

## Purpose

GreenBean Master defines the foundational identity structure for green coffee references used across Roastery OS.

This master entity represents the identity of a coffee before it enters operational inventory workflows.

GreenBean Master is intended to provide:
- standardized coffee identity references,
- operational consistency,
- sourcing traceability,
- and reusable production references across modules.

This entity does not represent physical stock quantity.

Inventory quantities are handled separately by inventory entities.

---

# Core Philosophy

GreenBean Master should represent coffee identity rather than inventory state.

The structure should remain:
- operationally practical,
- flexible,
- reusable,
- and suitable for both artisan and production-oriented roasting businesses.

The system should support real-world specialty coffee sourcing workflows without creating excessive operational complexity.

---

# Operational Role

GreenBean Master acts as the primary reference entity for:
- roasting workflows,
- inventory systems,
- costing systems,
- sourcing records,
- and production traceability.

Most coffee production activities originate from GreenBean references.

---

# Relationships

```text
GreenBean
├── belongsTo → Origin
├── belongsTo → ProcessingMethod
├── belongsTo → Supplier
├── usedBy → GreenBeanInventory
├── consumedBy → RoastBatch
└── referencedBy → Analytics

Core Fields
Identity Fields
greenBeanId
name
species
commercialName
internalCode

Origin Fields
originId
producerName
farmName
region
country
altitude
harvestYear

Processing Fields
processingMethodId
processingNotes
fermentationNotes
dryingMethod

Sourcing Fields
supplierId
purchaseReference
arrivalDate

Quality Reference Fields
screenSize
moistureContent
density
cuppingScore
qualityNotes
These fields should remain optional in MVP implementations.

General Fields
notes
isActive
createdAt
updatedAt

Product Philosophy
A GreenBean represents:
	•	a coffee identity,
	•	a sourcing reference,
	•	and a production input.
It should not directly represent:
	•	roast result,
	•	finished product,
	•	or inventory quantity.
Roasting processes create new operational identities from GreenBean references.

Inventory Separation Principle
GreenBean Master must remain separated from inventory quantity systems.
Example:
GreenBean
≠
GreenBeanInventory

GreenBean
Represents:
	•	coffee identity,
	•	origin,
	•	processing,
	•	sourcing information,
	•	and reusable references.

GreenBeanInventory
Represents:
	•	stock quantity,
	•	warehouse location,
	•	operational availability,
	•	and inventory valuation.
This separation preserves:
	•	modular consistency,
	•	inventory clarity,
	•	and operational scalability.

Naming Convention
Entity Name:
GreenBean
Primary Identifier:
greenBeanId
Related References:
originId
processingMethodId
supplierId
Naming must follow the standards defined in:
	•	NamingConvention.md
	•	DataModel.md

Used By Modules
GreenBean Master is shared across:
	•	Inventory Engine
	•	Roasting Engine
	•	Costing Engine
	•	Batch Traceability
	•	Supplier System
	•	Analytics Dashboard
	•	Future AI Systems

MVP Scope
The MVP implementation should prioritize only essential operational fields.
Required MVP fields:
greenBeanId
name
species
originId
processingMethodId
supplierId
harvestYear
notes
Advanced sourcing and quality fields may be added progressively in future operational stages.

Future Expansion Possibilities
Future versions may support:
	•	producer cooperatives,
	•	lot separation,
	•	crop season tracking,
	•	import references,
	•	certifications,
	•	cupping datasets,
	•	and advanced quality control systems.
Future expansion should extend the entity structure without breaking the operational foundation.

Architectural Notes
GreenBean Master is one of the foundational entities of Roastery OS.
Most production workflows originate from GreenBean references before entering transformation workflows such as:
	•	roasting,
	•	blending,
	•	production,
	•	and derivative manufacturing.
This entity should remain:
	•	stable,
	•	reusable,
	•	operationally meaningful,
	•	and loosely coupled from transactional workflows.

