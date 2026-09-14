# Roast Profile Master

## Purpose

RoastProfile Master defines the roasting profile references used across Roastery OS.

This entity standardizes roast profile identity to support:
- product differentiation,
- roasting workflows,
- inventory identity,
- production consistency,
- and operational analytics.

Roast profiles are treated as reusable operational references shared across roasting and production systems.

---

# Core Philosophy

Roast profiles should represent operational roasting intent rather than strict roasting measurements.

The system should support:
- artisan roasting workflows,
- flexible roasting styles,
- and evolving roasting practices
without forcing rigid roasting classification structures.

Roast profiles should remain:
- operationally practical,
- reusable,
- scalable,
- and easy to understand by both small and growing roasteries.

---

# Operational Role

RoastProfile Master functions as:
- a roasting identity reference,
- a product differentiation component,
- and a production classification structure.

Roast profiles are commonly used in:
- RoastBatch workflows,
- roasted product identity,
- product naming,
- production workflows,
- inventory categorization,
- and operational analytics.

---

# Relationships

```text
RoastProfile
├── referencedBy → RoastBatch
├── referencedBy → RoastedCoffeeInventory
├── referencedBy → Product Naming
├── referencedBy → Analytics
└── affects → Product Identity

Core Fields
Identity Fields
roastProfileId
name
displayName
internalCode

Profile Classification Fields
profileType
roastLevel
targetUsage
isDefault
Examples:
Filter
Espresso
Omni
Light
Medium
Dark

Operational Fields
description
recommendedBrewingMethod
flavorDirection
isActive

General Fields
notes
createdAt
updatedAt

Roast Profile Philosophy
Roast profiles should remain operationally flexible.
Examples:
Filter Roast
Espresso Roast
Omni Roast
Light Espresso
Modern Espresso
Nordic Filter
The system should not assume all roasteries use the same roasting terminology.
Roast profiles should support:
	•	traditional roasting styles,
	•	modern specialty roasting styles,
	•	and custom internal roasting classifications.

Roast Profile Identity Principle
RoastProfile represents roasting identity only.
Example:
RoastProfile
≠
RoastedCoffeeInventory

RoastProfile
Represents:
	•	roasting intent,
	•	product classification,
	•	and reusable roasting references.

RoastedCoffeeInventory
Represents:
	•	actual roasted stock,
	•	inventory quantity,
	•	roast batch output,
	•	and operational inventory state.
This separation preserves:
	•	modular consistency,
	•	inventory clarity,
	•	and operational scalability.

Product Identity Principle
Roast profiles may create different operational product identities even when using the same GreenBean source.
Example:
Bali Kintamani Natural
├── Filter Roast
├── Espresso Roast
└── Omni Roast
These may become separate:
	•	inventory states,
	•	product identities,
	•	costing structures,
	•	and sales products.

Naming Convention
Entity Name:
RoastProfile
Primary Identifier:
roastProfileId
Related References:
profileType
roastLevel
targetUsage
Naming should follow standards defined in:
	•	NamingConvention.md
	•	DataModel.md

Used By Modules
RoastProfile Master is shared across:
	•	Roasting Engine
	•	Inventory Engine
	•	Product Naming
	•	Production Engine
	•	Analytics Dashboard
	•	Future AI Systems

MVP Scope
The MVP implementation should remain lightweight.
Required MVP fields:
roastProfileId
name
description
notes
Basic MVP examples:
Filter
Espresso
Omni
Advanced roast classification structures may be added progressively in future operational stages.

Future Expansion Possibilities
Future versions may support:
	•	roast curve references,
	•	roast color values,
	•	development time tracking,
	•	bean temperature references,
	•	roasting strategy tags,
	•	and AI-assisted roast analysis.
Future expansion should extend the structure without redesigning the operational foundation.

Architectural Notes
RoastProfile Master is designed as a reusable operational reference entity.
Multiple RoastBatch and product entities may reference the same RoastProfile structure.
This entity should remain:
	•	stable,
	•	reusable,
	•	operationally meaningful,
	•	and loosely coupled from transactional workflows.
Roast profile structures should support operational clarity while remaining flexible enough for evolving roasting styles and specialty coffee trends.

