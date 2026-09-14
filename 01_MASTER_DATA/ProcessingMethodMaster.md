# Processing Method Master

## Purpose

ProcessingMethod Master defines the coffee processing references used across Roastery OS.

This entity standardizes processing terminology to support:
- coffee identity consistency,
- sourcing references,
- roasting workflows,
- product categorization,
- and operational analytics.

Processing methods are treated as reusable operational references shared across multiple coffee products and production workflows.

---

# Core Philosophy

Processing methods should remain:
- operationally practical,
- standardized,
- reusable,
- and flexible enough to support evolving specialty coffee trends.

The system should support both:
- traditional processing methods,
- and experimental processing approaches
without forcing rigid classification structures.

Processing references should help operational clarity rather than create unnecessary taxonomy complexity.

---

# Operational Role

ProcessingMethod Master functions as:
- a coffee identity component,
- a sourcing reference,
- and an analytical grouping structure.

Processing references are commonly used in:
- GreenBean Master,
- product naming,
- roasting workflows,
- blend formulation,
- inventory categorization,
- and analytics.

---

# Relationships

```text
ProcessingMethod
├── referencedBy → GreenBean
├── referencedBy → Product Naming
├── referencedBy → Analytics
└── groupedInto → Processing Categories

Core Fields
Identity Fields
processingMethodId
name
displayName
internalCode

Classification Fields
processingCategory
fermentationType
dryingMethod
isExperimental
Most advanced classification fields should remain optional during MVP implementation.

Operational Fields
description
flavorCharacteristics
recommendedUsage
isActive

General Fields
notes
createdAt
updatedAt

Processing Structure Philosophy
The system should support flexible processing terminology.
Examples:
Natural
Honey
Full Wash
Wet Hull
Anaerobic
Carbonic Maceration
Lactic Fermentation
Extended Fermentation
The architecture should not assume processing methods remain static over time.
New processing trends should be supportable without restructuring the operational foundation.

Processing Identity Principle
ProcessingMethod represents processing identity only.
Example:
ProcessingMethod
≠
GreenBean

ProcessingMethod
Represents:
	•	processing classification,
	•	fermentation identity,
	•	and reusable operational reference.

GreenBean
Represents:
	•	actual coffee identity,
	•	sourcing information,
	•	supplier reference,
	•	and operational production input.
This separation preserves:
	•	reusable references,
	•	modular consistency,
	•	and operational scalability.

Naming Convention
Entity Name:
ProcessingMethod
Primary Identifier:
processingMethodId
Related References:
processingCategory
fermentationType
dryingMethod
Naming should follow standards defined in:
	•	NamingConvention.md
	•	DataModel.md

Used By Modules
ProcessingMethod Master is shared across:
	•	GreenBean Master
	•	Inventory Engine
	•	Roasting Engine
	•	Product Naming
	•	Analytics Dashboard
	•	Future AI Systems

MVP Scope
The MVP implementation should remain lightweight.
Required MVP fields:
processingMethodId
name
description
notes
Advanced fermentation metadata may be added progressively in future operational stages.

Future Expansion Possibilities
Future versions may support:
	•	fermentation tracking,
	•	drying protocols,
	•	microbial references,
	•	experimental processing tagging,
	•	flavor prediction systems,
	•	and AI-assisted processing analytics.
Future expansion should extend the entity structure without redesigning the operational foundation.

Architectural Notes
ProcessingMethod Master is designed as a reusable reference entity.
Multiple GreenBean entities may reference the same ProcessingMethod structure.
This entity should remain:
	•	stable,
	•	reusable,
	•	operationally meaningful,
	•	and loosely coupled from transactional workflows.
Processing terminology should support operational clarity while remaining flexible enough for evolving specialty coffee practices.

