# Roastery OS — Naming Convention

## Purpose

This document defines the naming standards used across the Roastery OS ecosystem.

The purpose of these conventions is to:
- maintain architectural consistency,
- improve module communication,
- reduce ambiguity,
- support scalable development,
- improve AI generation consistency,
- and preserve operational clarity throughout the system.

Naming conventions should prioritize:
- clarity,
- consistency,
- operational readability,
- and long-term maintainability.

---

# General Naming Philosophy

## 1. Prefer Explicit Naming

Names should clearly describe operational purpose.

Avoid ambiguous or overly generic naming.

Preferred:

```text
RoastBatch
InventoryMovement
GreenBeanInventory
SalesTransaction
Avoid:
Batch
Movement
Stock
Transaction
Operational clarity is more important than short naming.

2. Naming Should Reflect Operational Reality
Naming should follow actual roasting and production workflows whenever possible.
Examples:
	•	RoastBatch
	•	BlendRecipe
	•	PackagingBatch
	•	ProductionBatch
The system should feel aligned with real-world specialty coffee operations.

3. Use Consistent Naming Across Modules
The same operational concept should always use the same naming structure.
Example:
RoastBatch
BlendBatch
ProductionBatch
PackagingBatch
Avoid inconsistent variations such as:
RoastProcess
BlendRecord
ProductionSession
for equivalent operational structures.

Naming Style Rules
1. Entity Naming
System entities should use:
PascalCase
Examples:
GreenBean
RoastBatch
InventoryMovement
SalesTransaction
CustomerProfile

2. Field Naming
Database fields and object properties should use:
camelCase
Examples:
batchId
createdAt
yieldPercentage
inventoryState
roastProfileId

3. Constant Naming
Constants and fixed system variables should use:
UPPER_SNAKE_CASE
Examples:
INVENTORY_STATE_GREEN
PRODUCT_TYPE_BLEND
ROAST_LEVEL_MEDIUM

4. File Naming
Documentation and module files should use:
PascalCase.md
Examples:
Vision.md
SystemOverview.md
CoreArchitecture.md
WorkflowPrinciples.md
NamingConvention.md

Entity Naming Structure
Entities should reflect their operational role.

Master Entities
Master entities represent foundational operational references.
Format:
[Noun]
Examples:
GreenBean
Supplier
Customer
Warehouse
Origin
ProcessingMethod
PackagingType
RoastProfile

Inventory Entities
Inventory entities represent inventory states.
Format:
[InventoryType]Inventory
Examples:
GreenBeanInventory
RoastedCoffeeInventory
BlendInventory
GroundCoffeeInventory
LiquidProductInventory
FinishedGoodsInventory

Production Entities
Production entities represent operational transformation processes.
Format:
[ProcessType]Batch
Examples:
RoastBatch
BlendBatch
ProductionBatch
PackagingBatch

Recipe Entities
Recipe entities represent formulation structures.
Format:
[RecipeType]Recipe
Examples:
BlendRecipe
ExtractionRecipe
RTDRecipe

Transactional Entities
Transactional entities represent business and inventory activities.
Format:
[OperationalAction][EntityType]
Examples:
InventoryMovement
SalesTransaction
PurchaseRecord
PaymentRecord
WasteRecord
AdjustmentRecord

Event Entities
Operational events should explicitly use the "Event" suffix.
Format:
[OperationalAction]Event
Examples:
RoastingEvent
BlendProductionEvent
GrindingEvent
PackagingEvent
SalesEvent
InventoryAdjustmentEvent

Batch Naming Rules
Batch identifiers should remain:
	•	readable,
	•	traceable,
	•	sortable,
	•	and operationally meaningful.

Roast Batch
Format:
RB-YYYYMMDD-XXX
Example:
RB-20260520-001
Meaning:
	•	RB = Roast Batch
	•	YYYYMMDD = Production Date
	•	XXX = Sequential Batch Number

Blend Batch
Format:
BL-YYYYMMDD-XXX
Example:
BL-20260520-002

Production Batch
Format:
PB-YYYYMMDD-XXX
Example:
PB-20260520-003

Packaging Batch
Format:
PK-YYYYMMDD-XXX
Example:
PK-20260520-004

Product Naming Rules
Product naming should remain:
	•	operationally clear,
	•	production-oriented,
	•	and commercially flexible.

Single Origin Product
Suggested structure:
SO-[Origin]-[Process]-[RoastType]
Examples:
SO-BaliHoney-Omni
SO-TorajaNatural-Espresso
SO-JavaFullWash-Filter

Blend Product
Suggested structure:
BL-[BlendName]-[Profile]
Examples:
BL-HouseBlend-Espresso
BL-MorningBlend-Omni

Derivative Product
Suggested structure:
[BaseProduct]-[DerivativeType]
Examples:
HouseBlend-Ground
TorajaNatural-ColdBrew
BaliHoney-DripBag

Inventory State Naming
Inventory states should remain explicit.
Examples:
GreenInventory
RoastedInventory
BlendInventory
GroundInventory
LiquidInventory
FinishedGoodsInventory
Avoid unclear naming such as:
Stock1
Stock2
ProcessedStock

Relationship Naming Rules
Relationships should remain readable and predictable.
Examples:
roastBatchId
supplierId
customerId
blendRecipeId
inventoryMovementId

Timestamp Naming Rules
System timestamps should remain standardized.
Preferred fields:
createdAt
updatedAt
deletedAt
roastedAt
packagedAt
soldAt
Avoid inconsistent variations such as:
created_date
dateCreated
creationTime

Reserved Terminology
Certain terms have specific architectural meaning and should not be mixed.

Product ≠ Inventory
Product
Represents:
	•	commercial product identity
Inventory
Represents:
	•	operational stock state

Batch ≠ Recipe
Batch
Represents:
	•	actual production execution
Recipe
Represents:
	•	reusable production formulation

Event ≠ Transaction
Event
Represents:
	•	operational occurrence
Transaction
Represents:
	•	recorded business activity

Production ≠ Transformation
Production
Represents:
	•	operational manufacturing workflow
Transformation
Represents:
	•	broader inventory state change

UI Naming vs System Naming
System naming may remain operationally explicit while UI naming should remain user-friendly.
Examples:
System Name
UI Label
RoastedCoffeeInventory
Roasted Coffee Stock
InventoryMovement
Stock Movement
RoastBatch
Roast Batch
BlendRecipe
Blend Recipe
SalesTransaction
Sales

Naming Stability Principle
Naming consistency should take priority over temporary convenience.
Existing naming structures should not be changed casually once operational modules depend on them.
Stable naming improves:
	•	module interoperability,
	•	AI consistency,
	•	reporting clarity,
	•	developer onboarding,
	•	and long-term scalability.

Naming Philosophy Summary
Roastery OS naming conventions are designed to support:
	•	operational clarity,
	•	modular communication,
	•	transformation-based workflows,
	•	production traceability,
	•	and scalable architectural consistency.
The naming system should remain:
	•	explicit,
	•	readable,
	•	predictable,
	•	operationally meaningful,
	•	and aligned with real-world roasting workflows.

