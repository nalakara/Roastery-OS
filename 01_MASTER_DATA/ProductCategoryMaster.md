# Product Category Master

## Purpose

ProductCategory Master defines the operational product category references used across Roastery OS.

This entity standardizes product grouping structures to support:
- inventory organization,
- production workflows,
- sales categorization,
- operational reporting,
- and product scalability.

Product categories are treated as reusable operational references shared across inventory, production, POS, and analytics systems.

---

# Core Philosophy

Product categories should represent operational product structures rather than rigid retail classifications.

The system should support:
- evolving coffee product formats,
- transformation-based production workflows,
- and modular product expansion
without forcing overly complex product taxonomy systems.

Product categories should remain:
- operationally practical,
- flexible,
- scalable,
- and understandable for real-world roastery operations.

---

# Operational Role

ProductCategory Master functions as:
- a product grouping structure,
- an inventory categorization reference,
- a production classification layer,
- and a reporting segmentation structure.

Product categories are commonly used in:
- inventory systems,
- production workflows,
- POS systems,
- pricing structures,
- product naming,
- and operational analytics.

---

# Relationships

```text
ProductCategory
├── referencedBy → Inventory
├── referencedBy → Finished Goods
├── referencedBy → POS Products
├── referencedBy → Analytics
└── affects → Operational Workflow

Core Fields
Identity Fields
productCategoryId
name
displayName
internalCode

Classification Fields
categoryType
parentCategoryId
isDerivativeProduct
isSellable

Operational Fields
defaultUnit
defaultPackagingType
requiresProductionBatch
requiresInventoryTracking
isActive

General Fields
description
notes
createdAt
updatedAt

Product Category Philosophy
The system should support flexible product structures.
Examples:
Roasted Beans
Single Origin Beans
Blend Beans
Ground Coffee
Cold Brew
RTD Coffee
Drip Bag
Concentrate
The architecture should support future product expansion without restructuring the operational foundation.

Product Structure Principle
Product categories should support transformation-based workflows.
Example:
Roasted Beans
↓
Ground Coffee
↓
Drip Bag
↓
RTD Coffee
Each category may represent:
	•	different inventory behavior,
	•	different production workflows,
	•	different costing logic,
	•	and different sales structures.

Product Category Identity Principle
ProductCategory represents operational grouping identity only.
Example:
ProductCategory
≠
Inventory

ProductCategory
Represents:
	•	operational grouping,
	•	workflow classification,
	•	and reusable product references.

Inventory
Represents:
	•	actual stock state,
	•	inventory quantity,
	•	costing,
	•	and operational availability.
This separation preserves:
	•	modular consistency,
	•	workflow flexibility,
	•	and operational scalability.

Hierarchical Category Principle
The system should support category hierarchy when needed.
Example:
Roasted Coffee
├── Single Origin
└── Blend

Derivative Products
├── Ground Coffee
├── Cold Brew
├── RTD
└── Drip Bag
Category hierarchy should remain optional during MVP stages.

Naming Convention
Entity Name:
ProductCategory
Primary Identifier:
productCategoryId
Related References:
categoryType
parentCategoryId
defaultUnit
Naming should follow standards defined in:
	•	NamingConvention.md
	•	DataModel.md

Used By Modules
ProductCategory Master is shared across:
	•	Inventory Engine
	•	Production Engine
	•	POS Engine
	•	Product Naming
	•	Analytics Dashboard
	•	Future AI Systems

MVP Scope
The MVP implementation should remain lightweight.
Required MVP fields:
productCategoryId
name
description
isSellable
Basic MVP examples:
Roasted Beans
Ground Coffee
Cold Brew
Drip Bag
RTD Coffee
Advanced category hierarchy and workflow classification may be introduced progressively in future operational stages.

Future Expansion Possibilities
Future versions may support:
	•	nested category trees,
	•	dynamic workflow mapping,
	•	product lifecycle tagging,
	•	AI-assisted product grouping,
	•	product recommendation systems,
	•	and advanced manufacturing categorization.
Future expansion should extend the structure without redesigning the operational foundation.

Architectural Notes
ProductCategory Master is designed as a reusable operational reference entity.
Multiple inventory and product entities may reference the same ProductCategory structure.
This entity should remain:
	•	stable,
	•	reusable,
	•	operationally meaningful,
	•	and loosely coupled from transactional workflows.
Product categories should support operational clarity while remaining flexible enough for evolving specialty coffee business models and future product formats.

