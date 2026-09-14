# Roast Batch Structure

## Purpose

This document defines the RoastBatch entity structure and operational roast batch behavior used across Roastery OS.

The purpose of RoastBatch is to:
- represent roasting execution,
- preserve roasting traceability,
- anchor inventory transformation,
- maintain deterministic production workflows,
- and provide readable roasting history.

RoastBatch is one of the central operational entities within the Roasting Engine.

RoastBatch acts as:
- production execution record,
- transformation anchor,
- and roasted inventory lineage reference.

---

# Core Philosophy

RoastBatch represents:
- actual roasting execution,
- operational transformation event,
- and roasted inventory creation process.

RoastBatch is not merely:
- roast notes,
- roasting logs,
- or roasting metadata.

RoastBatch represents:
- the operational moment where inventory evolves.

---

# Roast Batch Philosophy

Every roasting execution should create:
- a RoastBatch identity,
- a roasting timestamp,
- inventory transformation lineage,
- yield information,
- and operational production history.

Example:

```text id="q7m4tw"
GreenBeanInventory
↓ RoastBatch
RoastedCoffeeInventory
RoastBatch should preserve:
	•	source inventory,
	•	roasting parameters,
	•	transformation continuity,
	•	and resulting roasted inventory identity.

RoastBatch as Transformation Anchor
RoastBatch acts as the primary anchor between:
	•	raw material inventory,
	•	and roasted inventory creation.
Example:
GreenBeanInventory
↓ RoastBatch
RoastedCoffeeInventory
This relationship should remain:
	•	deterministic,
	•	traceable,
	•	operationally readable,
	•	and human-understandable.
RoastBatch is one of the most important operational lineage entities inside Roastery OS.

Core Relationships
RoastBatch
├── consumes → GreenBeanInventory
├── references → GreenBean
├── references → RoastProfile
├── creates → RoastedCoffeeInventory
├── generates → InventoryMovement
├── affects → InventoryValuation
└── supports → Traceability

RoastBatch Entity
Purpose
Represents an operational roasting execution event.
RoastBatch acts as:
	•	roasting execution record,
	•	inventory transformation reference,
	•	and production traceability anchor.

Core Fields
Identity Fields
roastBatchId
batchCode
batchName
batchType
Examples of batchType:
Production Roast
Sample Roast
Experimental Roast
Blend Component Roast

Source Reference Fields
greenBeanId
greenBeanInventoryId
supplierId
originId
processingMethodId
These references preserve:
	•	sourcing continuity,
	•	roasting traceability,
	•	and operational lineage.

Roast Profile Fields
roastProfileId
targetRoastLevel
roastIntent
Examples of roastIntent:
Filter
Espresso
Omni
Blend Component
Roast profiles represent:
	•	roasting references,
	•	not actual roasting execution.

Quantity Fields
inputQuantity
outputQuantity
unitId
yieldPercentage
shrinkagePercentage
Example:
100kg input
↓ roasting
82kg output
Yield behavior should remain:
	•	explicit,
	•	traceable,
	•	and operationally meaningful.

Operational Fields
roastDate
startTime
endTime
roasterMachine
operatorId
roastStatus
Examples of roastStatus:
Planned
In Progress
Completed
Cancelled
Archived
The MVP should keep roast status logic lightweight.

Roast Observation Fields
firstCrackTime
developmentTime
dropTemperature
environmentNotes
operatorNotes
These fields support:
	•	roast history,
	•	production analysis,
	•	and future roasting intelligence systems.
Most advanced roasting telemetry should remain optional during MVP stages.

Costing Fields
greenBeanCost
productionCost
yieldAdjustedCost
costPerKg
Roasting directly affects:
	•	inventory valuation,
	•	and operational profitability.

Traceability Fields
sourceBatchReference
relatedProductionBatchId
relatedBlendBatchId
These references preserve:
	•	operational lineage,
	•	transformation continuity,
	•	and inventory relationships.

General Fields
notes
createdAt
updatedAt

Roast Batch Identity Principle
RoastBatch represents:
	•	actual roasting execution.
Example:
RoastProfile
≠
RoastBatch

RoastProfile
Represents:
	•	roasting target,
	•	reusable roasting reference,
	•	and production intention.

RoastBatch
Represents:
	•	actual production execution,
	•	operational roasting event,
	•	and inventory transformation.
This separation preserves:
	•	operational flexibility,
	•	analytical capability,
	•	and production clarity.

Yield Awareness Principle
Yield behavior is one of the defining characteristics of RoastBatch.
Example:
100kg Green Beans
↓ RoastBatch
82kg Roasted Coffee
RoastBatch should preserve:
	•	shrinkage visibility,
	•	yield history,
	•	roasting efficiency,
	•	and operational continuity.
Yield is considered:
	•	transformation intelligence,
	•	not inventory error.

Deterministic Roast Principle
Critical RoastBatch behavior must remain deterministic.
Examples:
	•	inventory consumption,
	•	roasted inventory creation,
	•	yield calculation,
	•	costing updates,
	•	and traceability relationships.
Roasting workflows should:
	•	produce predictable outcomes,
	•	preserve operational integrity,
	•	and remain auditable.
The system should avoid:
	•	hidden roasting mutation,
	•	ambiguous inventory behavior,
	•	and non-traceable production states.

Roast Status Philosophy
RoastBatch may evolve through operational statuses.
Example:
Planned
↓
In Progress
↓
Completed
↓
Archived
Status transitions should remain:
	•	deterministic,
	•	explicit,
	•	and operationally understandable.
The MVP should prioritize simple workflow visibility.

Human-Centered Philosophy
RoastBatch workflows should feel natural for real roasting operations.
Operators should be able to:
	•	execute roast batches,
	•	understand inventory evolution,
	•	and preserve roasting history  without enterprise manufacturing complexity.
Operational clarity should take priority over industrial production bureaucracy.

AI Boundary Philosophy
AI systems may:
	•	analyze roasting consistency,
	•	compare roast history,
	•	identify yield anomalies,
	•	and recommend roast optimization.
However:  AI must not autonomously manipulate deterministic RoastBatch execution.
Critical roasting workflows must remain:
	•	explicit,
	•	traceable,
	•	deterministic,
	•	and human-auditable.

MVP Scope
The MVP RoastBatch structure should prioritize:
	•	RoastBatch identity,
	•	green bean consumption,
	•	roasted inventory creation,
	•	yield visibility,
	•	roast traceability,
	•	and operational logging.
The MVP intentionally excludes:
	•	machine telemetry orchestration,
	•	automated roast control,
	•	industrial manufacturing integration,
	•	and advanced IoT roasting systems.

Architectural Notes
RoastBatch is one of the most foundational production entities inside Roastery OS.
Many downstream systems depend on:
	•	RoastBatch lineage,
	•	roasted inventory identity,
	•	and transformation continuity.
RoastBatch structures should remain:
	•	modular,
	•	deterministic,
	•	traceable,
	•	production-oriented,
	•	and operationally meaningful.
Future systems should extend RoastBatch behavior without redesigning the operational foundation.

Long-Term Direction
The RoastBatch system is designed to support future evolution toward:
	•	roast analytics,
	•	production intelligence,
	•	AI-assisted roasting systems,
	•	IoT integration,
	•	and operational optimization.
However, RoastBatch behavior should always remain:
	•	understandable,
	•	traceable,
	•	deterministic,
	•	and human-centered.

Philosophy Summary
RoastBatch is not merely:
	•	roast logging,
	•	or roasting metadata.
RoastBatch is:
	•	operational roasting execution,
	•	inventory transformation anchor,
	•	and roasted inventory identity creator.
RoastBatch preserves the operational moment where coffee evolves inside Roastery OS.
