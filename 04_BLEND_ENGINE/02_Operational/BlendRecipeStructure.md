# Blend Recipe Structure

## Purpose

This document defines the BlendRecipe entity structure and operational recipe behavior used across Roastery OS.

The purpose of BlendRecipe is to:
- preserve reusable blend formulation logic,
- standardize blend composition references,
- support deterministic blend production,
- maintain operational consistency,
- and provide readable composition structures.

BlendRecipe acts as:
- reusable production formulation,
- composition reference structure,
- and blend identity definition.

BlendRecipe is one of the foundational operational entities inside the Blend Engine.

---

# Core Philosophy

Roastery OS treats BlendRecipe as:
- reusable blend formulation reference,
- operational composition blueprint,
- and production intention structure.

BlendRecipe is not:
- actual inventory,
- or production execution.

BlendRecipe defines:
- intended blend composition.

Actual production execution belongs to:
- BlendBatch.

This separation is one of the foundational architectural principles inside the Blend Engine.

---

# BlendRecipe Philosophy

Every blend should preserve:
- explicit composition structure,
- measurable formulation ratios,
- and operational blend identity.

Example:

```text id="u7m4tw"
House Espresso Blend
├── Brazil Natural → 60%
└── Ethiopia Washed → 40%
BlendRecipe should preserve:
	•	composition continuity,
	•	production readability,
	•	and operational repeatability.

Core Relationship Principle
BlendRecipe acts as:
	•	reusable production reference.
Example:
BlendRecipe
↓ applied to
BlendBatch
BlendRecipe defines:
	•	intended blend structure.
BlendBatch represents:
	•	actual production execution.
This separation preserves:
	•	operational flexibility,
	•	analytical capability,
	•	and production continuity.

BlendRecipe Entity
Purpose
Represents reusable blend formulation structure.
BlendRecipe acts as:
	•	composition blueprint,
	•	production targeting structure,
	•	and operational recipe identity.

Core Relationships
BlendRecipe
├── references → RoastedCoffeeInventory
├── contains → Blend Components
├── referencedBy → BlendBatch
├── affects → Costing
└── supports → Traceability

Core Fields
Identity Fields
blendRecipeId
recipeCode
recipeName
recipeType
Examples of recipeType:
Espresso Blend
Filter Blend
House Blend
Seasonal Blend
Signature Blend
Recipe identity should remain:
	•	operationally meaningful,
	•	readable,
	•	and scalable.

Composition Fields
componentList
compositionRatio
targetPercentage
Example:
Brazil Natural → 60%
Ethiopia Washed → 40%
Composition structures should remain:
	•	measurable,
	•	traceable,
	•	and deterministic.

Component Reference Fields
roastedCoffeeInventoryId
roastBatchId
greenBeanId
These references preserve:
	•	roasting lineage,
	•	sourcing continuity,
	•	and operational traceability.

Operational Fields
blendIntent
targetFlavorDirection
recommendedUsage
isActive
Examples of blendIntent:
Espresso
Milk Beverage
Filter
Omni
Operational fields should remain:
	•	lightweight,
	•	and production-oriented during MVP stages.

Yield Reference Fields
expectedYieldPercentage
expectedLossPercentage
Blend workflows may include:
	•	purge,
	•	handling loss,
	•	and production residue.
The MVP should preserve:
	•	simple operational yield visibility.

Costing Reference Fields
estimatedCostPerKg
targetCostRange
pricingReference
These fields support:
	•	operational costing visibility,
	•	and profitability planning.
Advanced costing intelligence should remain optional during MVP stages.

Traceability Fields
sourceRoastReference
sourceInventoryReference
recipeVersion
These references preserve:
	•	operational continuity,
	•	recipe evolution,
	•	and production lineage.

General Fields
description
notes
createdAt
updatedAt

BlendRecipe vs BlendBatch Principle
Example:
BlendRecipe
≠
BlendBatch

BlendRecipe
Represents:
	•	reusable formulation intention,
	•	composition structure,
	•	and operational recipe reference.

BlendBatch
Represents:
	•	actual blend production execution,
	•	inventory transformation,
	•	and operational production event.
This separation preserves:
	•	production flexibility,
	•	operational realism,
	•	and future analytical capability.

Composition Integrity Principle
BlendRecipe should preserve:
	•	deterministic composition structure.
Example:
Brazil Natural → 60%
Ethiopia Washed → 40%
Composition relationships should remain:
	•	explicit,
	•	measurable,
	•	and traceable.
The system should avoid:
	•	ambiguous blend composition,
	•	hidden ratio mutation,
	•	and disconnected recipe structures.

Production-Oriented Philosophy
BlendRecipe should support:
	•	real production workflows,
	•	not merely marketing categorization.
Blend recipes should remain:
	•	operationally meaningful,
	•	inventory-aware,
	•	and transformation-oriented.
This philosophy differentiates Roastery OS from:
	•	cafe POS systems,
	•	retail-first inventory systems,
	•	and generic product databases.

Costing Relationship Principle
BlendRecipe may influence:
	•	operational profitability,
	•	production costing,
	•	and pricing strategy.
Example:
Brazil Cost
+
Ethiopia Cost
↓
Estimated Blend Cost
Costing continuity should remain:
	•	traceable,
	•	deterministic,
	•	and operationally understandable.

Traceability Principle
BlendRecipe should preserve:
	•	upstream roasting lineage.
Example:
GreenBean
↓ RoastBatch
RoastedCoffeeInventory
↓ BlendRecipe
Recipe structures should remain:
	•	connected to roasting origin,
	•	production continuity,
	•	and operational traceability.

Recipe Versioning Philosophy
Blend recipes may evolve operationally over time.
Examples:
Version 1
→ 70/30 Ratio

Version 2
→ 60/40 Ratio
Recipe evolution should remain:
	•	explicit,
	•	traceable,
	•	and operationally understandable.
The MVP should keep versioning lightweight.

Deterministic Recipe Principle
Critical recipe behavior must remain deterministic.
Examples:
	•	composition structure,
	•	ratio continuity,
	•	costing continuity,
	•	and inventory relationships.
Recipe systems should:
	•	preserve operational integrity,
	•	produce predictable blend structures,
	•	and remain auditable.
The system should avoid:
	•	hidden recipe mutation,
	•	ambiguous formulation behavior,
	•	and disconnected production lineage.

Human-Centered Philosophy
BlendRecipe systems should remain understandable for real operators.
Operators should be able to:
	•	define blend recipes,
	•	understand composition structures,
	•	and maintain production consistency  without manufacturing ERP complexity.
Operational clarity should take priority over industrial production abstraction.

AI Boundary Philosophy
AI systems may:
	•	recommend blend ratios,
	•	analyze composition behavior,
	•	simulate flavor direction,
	•	and support operational analytics.
However:  AI must not autonomously manipulate deterministic recipe structures.
Critical blend relationships must remain:
	•	explicit,
	•	traceable,
	•	deterministic,
	•	and human-auditable.

MVP Scope
The MVP BlendRecipe system should prioritize:
	•	reusable blend formulations,
	•	measurable composition structures,
	•	deterministic ratio visibility,
	•	costing continuity,
	•	and roasting lineage preservation.
The MVP intentionally excludes:
	•	flavor simulation systems,
	•	automated formulation engines,
	•	predictive sensory analytics,
	•	and industrial manufacturing orchestration.

Architectural Notes
BlendRecipe is one of the operational formulation layers inside the Blend Engine.
Recipe systems influence:
	•	blend production,
	•	costing behavior,
	•	inventory transformation,
	•	product identity,
	•	and operational analytics.
BlendRecipe structures should remain:
	•	modular,
	•	deterministic,
	•	traceable,
	•	and production-oriented.
Future systems should extend recipe behavior without redesigning the operational foundation.

Long-Term Direction
The BlendRecipe system is designed to support future evolution toward:
	•	AI-assisted blend formulation,
	•	flavor modeling,
	•	predictive production analytics,
	•	operational optimization,
	•	and advanced composition intelligence.
However, recipe behavior should always remain:
	•	understandable,
	•	traceable,
	•	deterministic,
	•	and human-centered.

Philosophy Summary
BlendRecipe is not:
	•	inventory,
	•	or production execution.
BlendRecipe is:
	•	reusable formulation structure,
	•	composition blueprint,
	•	and operational blend intention.
BlendRecipe defines how blend production is intended to behave inside Roastery OS.

