# Inventory Adjustment

## Purpose

This document defines the inventory adjustment philosophy and operational adjustment behavior used across Roastery OS.

The purpose of Inventory Adjustment is to:
- preserve inventory accuracy,
- maintain operational transparency,
- support real-world inventory correction,
- and provide traceable exceptional inventory events.

Inventory adjustments are treated as exceptional operational corrections rather than normal inventory workflows.

---

# Core Philosophy

Roastery OS prioritizes:
- deterministic inventory behavior,
- traceable inventory movement,
- and production-oriented operational clarity.

Inventory adjustments should therefore remain:
- explicit,
- traceable,
- explainable,
- and operationally meaningful.

Inventory adjustments should never become hidden inventory manipulation.

---

# Adjustment Philosophy

Inventory adjustments represent:
- exceptional operational corrections,
- inventory reconciliation,
- or unavoidable real-world inventory deviations.

Examples:

```text id="v8m4tw"
Shrinkage
Damage
Expired Product
Spillage
Measurement Correction
Manual Reconciliation
Adjustments should preserve:
	•	operational reason,
	•	inventory lineage,
	•	and traceable history.

Adjustment vs Transformation Principle
Roastery OS distinguishes between:
	•	inventory transformation,
	•	and inventory adjustment.
Example:
Roasting
→ transformation

Damaged Product
→ adjustment

Transformation
Represents:
	•	operational evolution,
	•	production workflow,
	•	and inventory state progression.
Transformation creates:
	•	new inventory state.

Adjustment
Represents:
	•	inventory correction,
	•	exceptional operational event,
	•	or reconciliation activity.
Adjustment does not represent production evolution.
This distinction preserves:
	•	operational clarity,
	•	traceability consistency,
	•	and deterministic inventory behavior.

Adjustment Event Principle
Every inventory adjustment should:
	•	generate movement history,
	•	preserve operational reason,
	•	and remain auditable.
Inventory quantity should never change silently.
Example:
Roasted Coffee Inventory
↓ Damage Adjustment
Quantity Reduced
↓ Adjustment Record Created
The system should preserve:
	•	what changed,
	•	why it changed,
	•	when it changed,
	•	and who performed the adjustment.

InventoryAdjustment Entity
Purpose
Represents explicit operational inventory correction events.
This entity acts as:
	•	adjustment history,
	•	operational reconciliation record,
	•	and audit reference.

Relationships
InventoryAdjustment
├── references → Inventory Entity
├── generates → InventoryMovement
├── affects → Inventory State
├── affects → Costing
└── supports → Auditability

Core Fields
Identity Fields
inventoryAdjustmentId
adjustmentCode
adjustmentType
adjustmentCategory

Inventory Reference Fields
inventoryEntityType
inventoryEntityId
relatedBatchId
Examples of inventoryEntityType:
GreenBeanInventory
RoastedCoffeeInventory
BlendInventory
FinishedGoodsInventory

Quantity Fields
adjustmentDirection
quantityDifference
unitId
previousQuantity
resultingQuantity
Examples of adjustmentDirection:
INCREASE
DECREASE
CORRECTION

Adjustment Reason Fields
adjustmentReason
adjustmentDescription
operationalNotes
Examples of adjustmentReason:
Damage
Shrinkage
Expired Product
Measurement Error
Manual Reconciliation
Sample Usage

Operational Fields
adjustmentTimestamp
performedBy
approvedBy
approvalStatus

Costing Fields
costImpact
valuationAdjustment
Advanced costing behavior may remain optional during MVP stages.

General Fields
notes
createdAt
updatedAt

Adjustment Categories
The system should support several operational adjustment categories.
Examples:
Damage
Shrinkage
Expired
Correction
Operational Usage
Sampling
Loss
Return
The MVP should prioritize only essential operational adjustment types.

Shrinkage Philosophy
Some inventory reduction represents natural operational loss.
Examples:
Coffee Dust Loss
Grinding Residue
Packaging Residue
Liquid Evaporation
The system should distinguish between:
	•	expected operational yield behavior,
	•	and abnormal inventory loss.
Expected production yield belongs to:
	•	transformation workflows.
Unexpected operational loss belongs to:
	•	adjustment workflows.

Expired Inventory Philosophy
Certain inventory types may expire operationally.
Examples:
Cold Brew
RTD Coffee
Ground Coffee
Expired inventory should:
	•	preserve traceability,
	•	remain historically visible,
	•	but no longer participate in active workflows.
Expiration handling should remain operationally understandable.

Manual Correction Philosophy
Manual adjustments should remain:
	•	explicit,
	•	traceable,
	•	and operationally justified.
The system should discourage:
	•	invisible quantity editing,
	•	silent stock mutation,
	•	and non-traceable corrections.
Manual adjustments should always preserve:
	•	operational reason,
	•	timestamp,
	•	and responsible operator.

Deterministic Adjustment Principle
Inventory adjustments must remain deterministic.
Adjustment workflows should:
	•	produce predictable inventory outcomes,
	•	preserve operational history,
	•	and remain auditable.
The system should never allow ambiguous adjustment behavior.

Traceability Principle
Adjustment history should remain traceable.
Example:
Roast Batch
↓
RoastedCoffeeInventory
↓
Damage Adjustment
↓
Updated Inventory State
Adjustment records should preserve:
	•	operational lineage,
	•	inventory relationships,
	•	and historical visibility.

Human-Centered Philosophy
Inventory adjustment workflows should remain understandable for operational users.
Operators should:
	•	understand why adjustments exist,
	•	trace inventory corrections easily,
	•	and perform operational reconciliation  without ERP-level operational complexity.
Operational clarity should take priority over bureaucratic inventory procedures.

AI Boundary Philosophy
AI systems may:
	•	detect adjustment anomalies,
	•	identify unusual inventory behavior,
	•	and recommend operational investigation.
However:  AI must not autonomously create inventory adjustments.
Adjustments must remain:
	•	explicit,
	•	traceable,
	•	deterministic,
	•	and human-authorized.

MVP Scope
The MVP Inventory Adjustment system should prioritize:
	•	explicit correction workflows,
	•	traceable adjustment history,
	•	operational inventory reconciliation,
	•	and deterministic inventory correction behavior.
The MVP intentionally excludes:
	•	enterprise warehouse reconciliation,
	•	automated adjustment engines,
	•	industrial audit orchestration,
	•	and advanced accounting automation.

Architectural Notes
Inventory Adjustment is an operational exception layer within the Inventory Engine.
Adjustments should remain:
	•	rare,
	•	explicit,
	•	operationally meaningful,
	•	and traceable.
The architecture should encourage:
	•	accurate transformation workflows,
	•	deterministic inventory movement,
	•	and minimal adjustment dependency.
Future systems should extend adjustment behavior without weakening inventory integrity.

Long-Term Direction
The Inventory Adjustment system is designed to support future evolution toward:
	•	anomaly detection,
	•	operational audit systems,
	•	forecasting intelligence,
	•	AI-assisted inventory analysis,
	•	and advanced traceability infrastructure.
However, adjustment workflows should always remain:
	•	understandable,
	•	traceable,
	•	deterministic,
	•	and human-centered.

Philosophy Summary
Inventory adjustments are not normal inventory behavior.
Inventory adjustments represent:
	•	exceptional correction,
	•	operational reconciliation,
	•	and traceable inventory repair.
Inventory integrity is preserved not by hiding adjustments,  but by making them explicit.
