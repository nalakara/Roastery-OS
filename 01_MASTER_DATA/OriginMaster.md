# Origin Master

## Purpose

Origin Master defines the geographical origin references used across Roastery OS.

This entity standardizes coffee origin information to support:
- sourcing consistency,
- operational traceability,
- roasting workflows,
- inventory references,
- and analytical grouping.

Origin Master represents reusable location identity references shared across multiple coffee products and operational modules.

---

# Core Philosophy

Origin data should remain:
- reusable,
- operationally meaningful,
- flexible,
- and scalable.

The system should support both:
- simplified origin references for small roasteries,
- and more detailed geographical structures for advanced sourcing operations.

Origin structures should support real-world specialty coffee terminology without forcing unnecessary geographic complexity during MVP stages.

---

# Operational Role

Origin Master functions as:
- a sourcing reference,
- a product identity component,
- and an analytical grouping structure.

Origin references are commonly used in:
- GreenBean Master,
- roasting workflows,
- product naming,
- blend formulation,
- inventory grouping,
- and sales analytics.

---

# Relationships

```text
Origin
├── referencedBy → GreenBean
├── referencedBy → Product Naming
├── referencedBy → Analytics
└── groupedInto → Regional Reporting

Core Fields
Identity Fields
originId
name
displayName
internalCode

Geographic Fields
region
province
country
subregion
altitude
latitude
longitude
Most advanced geographic fields should remain optional in MVP implementations.

Operational Fields
originType
isBlendOrigin
isActive

General Fields
notes
createdAt
updatedAt

Origin Structure Philosophy
The system should support flexible origin granularity.
Examples:
Indonesia
Bali
Kintamani
Aceh Gayo
Java Preanger
Toraja
The architecture should not assume all roasteries require the same level of geographic detail.

Origin Identity Principle
Origin represents geographical identity only.
Example:
Origin
≠
GreenBean

Origin
Represents:
	•	geographic reference,
	•	sourcing location,
	•	and analytical grouping.

GreenBean
Represents:
	•	actual coffee identity,
	•	processing,
	•	supplier reference,
	•	and operational product input.
This separation preserves:
	•	modular consistency,
	•	reusable sourcing structures,
	•	and operational flexibility.

Naming Convention
Entity Name:
Origin
Primary Identifier:
originId
Related References:
region
province
country
Naming should follow standards defined in:
	•	NamingConvention.md
	•	DataModel.md

Used By Modules
Origin Master is shared across:
	•	GreenBean Master
	•	Inventory Engine
	•	Roasting Engine
	•	Product Naming
	•	Analytics Dashboard
	•	Future AI Systems

MVP Scope
The MVP implementation should remain lightweight.
Required MVP fields:
originId
name
region
country
notes
Advanced geographic metadata may be introduced progressively in future operational stages.

Future Expansion Possibilities
Future versions may support:
	•	GPS coordinates,
	•	altitude ranges,
	•	terroir mapping,
	•	cooperative grouping,
	•	regional classifications,
	•	climate references,
	•	and sourcing visualization systems.
Future expansion should extend the structure without redesigning the operational foundation.

Architectural Notes
Origin Master is designed as a reusable reference entity.
Multiple GreenBean entities may reference the same Origin structure.
This entity should remain:
	•	stable,
	•	reusable,
	•	operationally meaningful,
	•	and loosely coupled from transactional workflows.
Origin data should support operational clarity without introducing unnecessary geographic bureaucracy.

