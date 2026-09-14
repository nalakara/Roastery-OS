# Unit Master

## Purpose

Unit Master defines the standardized measurement units used across Roastery OS.

This entity standardizes operational units to support:
- inventory consistency,
- production workflows,
- costing calculations,
- packaging systems,
- sales transactions,
- and operational reporting.

Units are treated as reusable operational references shared across all inventory and transactional systems.

---

# Core Philosophy

Measurement units should remain:
- standardized,
- operationally practical,
- scalable,
- and easy to use in real-world roasting operations.

The system should support:
- weight-based operations,
- liquid production,
- packaging workflows,
- and sales activities
without introducing unnecessary industrial measurement complexity during MVP stages.

Unit structures should prioritize operational consistency over technical perfection.

---

# Operational Role

Unit Master functions as:
- a measurement reference structure,
- a quantity standardization layer,
- a costing support entity,
- and an inventory consistency system.

Units are commonly used in:
- inventory tracking,
- roasting workflows,
- production batches,
- packaging systems,
- POS transactions,
- and operational analytics.

---

# Relationships

```text
Unit
├── referencedBy → Inventory
├── referencedBy → ProductionBatch
├── referencedBy → PackagingType
├── referencedBy → POS Products
├── referencedBy → Costing
└── referencedBy → Analytics

Core Fields
Identity Fields
unitId
name
displayName
shortCode
internalCode
Examples:
Kilogram
Gram
Liter
Milliliter
Pack
Bottle
Bag

Classification Fields
unitCategory
measurementType
baseUnit
conversionFactor
Examples of unitCategory:
Weight
Volume
Packaging
Count

Operational Fields
allowDecimal
isInventoryUnit
isSalesUnit
isProductionUnit
isActive

Conversion Fields
baseConversionUnit
baseConversionValue
Examples:
1 Kilogram = 1000 Gram
1 Liter = 1000 Milliliter
Advanced conversion structures may remain optional during MVP stages.

General Fields
description
notes
createdAt
updatedAt

Unit Philosophy
Units should support operational consistency across all transformation workflows.
Examples:
Green Beans → Kilogram
Roasted Coffee → Gram
Cold Brew → Liter
RTD Coffee → Bottle
Drip Bag → Pack
Different operational workflows may require:
	•	different units,
	•	different conversion structures,
	•	and different costing behaviors.
The architecture should support flexible unit usage without breaking inventory consistency.

Unit Identity Principle
Unit represents measurement identity only.
Example:
Unit
≠
Inventory Quantity

Unit
Represents:
	•	measurement structure,
	•	quantity standardization,
	•	and reusable operational references.

Inventory Quantity
Represents:
	•	actual operational quantity,
	•	stock availability,
	•	production usage,
	•	and transactional movement.
This separation preserves:
	•	modular consistency,
	•	inventory clarity,
	•	and operational scalability.

Unit Conversion Principle
The system should support unit conversion structures where operationally necessary.
Examples:
1 Kilogram
↓
1000 Gram

1 Liter
↓
1000 Milliliter
The MVP should prioritize simple conversion workflows only.
Advanced industrial conversion systems are intentionally excluded during early operational stages.

Naming Convention
Entity Name:
Unit
Primary Identifier:
unitId
Related References:
unitCategory
measurementType
conversionFactor
Naming should follow standards defined in:
	•	NamingConvention.md
	•	DataModel.md

Used By Modules
Unit Master is shared across:
	•	Inventory Engine
	•	Roasting Engine
	•	Production Engine
	•	Packaging Systems
	•	POS Engine
	•	Costing Engine
	•	Analytics Dashboard

MVP Scope
The MVP implementation should remain lightweight.
Required MVP fields:
unitId
name
shortCode
unitCategory
allowDecimal
Basic MVP examples:
kg
g
L
ml
bag
bottle
pack
pcs
Advanced conversion structures may be added progressively in future operational stages.

Future Expansion Possibilities
Future versions may support:
	•	dynamic unit conversion,
	•	packaging-to-weight conversion,
	•	automated production conversion,
	•	warehouse conversion standards,
	•	IoT measurement integration,
	•	and AI-assisted production optimization.
Future expansion should extend the structure without redesigning the operational foundation.

Architectural Notes
Unit Master is designed as a reusable operational reference entity.
Multiple inventory, production, packaging, and transactional entities may reference the same Unit structure.
This entity should remain:
	•	stable,
	•	reusable,
	•	operationally meaningful,
	•	and loosely coupled from transactional workflows.
Measurement systems should support operational clarity while remaining flexible enough for evolving production workflows and specialty coffee business models.

