# Roast Status

## Purpose

This document defines the roasting status philosophy and operational roast status behavior used across Roastery OS.

The purpose of Roast Status is to:
- represent roasting workflow progression,
- preserve operational visibility,
- support deterministic workflow transitions,
- maintain production clarity,
- and provide readable roasting lifecycle states.

Roast Status represents:
- operational roasting condition,
- workflow readiness,
- and roasting execution progression.

Roast status is one of the behavioral orchestration layers inside the Roasting Engine.

---

# Core Philosophy

Roastery OS treats Roast Status as:
- operational workflow visibility,
- production progression state,
- and deterministic roasting lifecycle behavior.

Roast status is not merely:
- UI labeling,
- or administrative categorization.

Roast status represents:
- the operational condition of a RoastBatch,
- and its current place within the roasting workflow lifecycle.

The system should preserve:
- workflow clarity,
- operational readability,
- and deterministic state transitions.

---

# Roast Status Philosophy

Roasting workflows naturally evolve through:
- preparation,
- execution,
- transformation,
- and completion stages.

Example:

```text id="u7m4tw"
Planned
↓
Prepared
↓
In Progress
↓
Completed
↓
Archived
Each status represents:
	•	different operational meaning,
	•	different workflow readiness,
	•	and different production behavior.

Core Roast Status States
Roastery OS currently recognizes several primary roast statuses.
Examples:
Planned
Prepared
In Progress
Completed
Cancelled
Archived
The MVP should prioritize:
	•	lightweight operational status structures,
	•	not enterprise manufacturing workflow complexity.

Roast Lifecycle Principle
RoastBatch should evolve progressively through operational lifecycle states.
Example:
Planned
↓
Prepared
↓
In Progress
↓
Completed
Lifecycle progression should remain:
	•	deterministic,
	•	traceable,
	•	and operationally understandable.

Planned Status
Purpose
Represents roasting intent before operational preparation begins.

Operational Characteristics
Examples:
Green bean selected
Roast profile assigned
Batch quantity determined
Operator scheduled

Workflow Meaning
Planned status means:
	•	roasting is intended,
	•	but inventory transformation has not yet started.
Inventory should remain:
	•	available,
	•	and not yet consumed.

Prepared Status
Purpose
Represents operational readiness before roasting execution begins.

Operational Characteristics
Examples:
Inventory reserved
Roasting machine prepared
Operator assigned
Batch prepared

Workflow Meaning
Prepared status means:
	•	roasting is operationally ready,
	•	but roasting execution has not yet started.
Inventory may transition:
Available
↓
Reserved

In Progress Status
Purpose
Represents active roasting execution.

Operational Characteristics
Examples:
Roasting started
Development tracked
Roast observations recorded
Transformation active

Workflow Meaning
In Progress means:
	•	roasting transformation is actively occurring.
Critical workflow behavior may include:
	•	transformation tracking,
	•	roast logging,
	•	and operational monitoring.

Completed Status
Purpose
Represents finalized roasting execution.

Operational Characteristics
Examples:
Yield validated
Roasted inventory created
Inventory movement generated
Costing updated
Traceability preserved

Workflow Meaning
Completed status means:
	•	roasting transformation is finalized,
	•	and roasted inventory is operationally available.
Example:
GreenBeanInventory
↓ RoastBatch
RoastedCoffeeInventory
Completed status should preserve:
	•	transformation continuity,
	•	operational traceability,
	•	and deterministic workflow closure.

Cancelled Status
Purpose
Represents terminated roasting workflow before successful completion.

Operational Characteristics
Examples:
Operational cancellation
Failed preparation
Invalid roast attempt
Manual termination

Workflow Meaning
Cancelled status means:
	•	roasting workflow stopped,
	•	and operational completion did not occur.
Inventory behavior should remain:
	•	explicit,
	•	traceable,
	•	and operationally understandable.
The MVP should keep cancellation handling lightweight.

Archived Status
Purpose
Represents finalized historical roasting record preservation.

Operational Characteristics
Examples:
Historical storage
Operational preservation
Production history retention

Workflow Meaning
Archived status means:
	•	RoastBatch remains historically visible,
	•	but no longer participates in active workflows.
Archival should preserve:
	•	roasting lineage,
	•	transformation continuity,
	•	and operational traceability.

Status Transition Principle
Roast status transitions should remain deterministic.
Example:
Planned
→ Prepared
→ In Progress
→ Completed
Transitions should:
	•	preserve workflow meaning,
	•	generate operational visibility,
	•	and remain auditable.
The system should avoid:
	•	hidden workflow mutation,
	•	ambiguous roasting states,
	•	and disconnected lifecycle behavior.

Inventory Relationship Principle
Roast statuses may affect inventory behavior.
Examples:
Prepared
→ inventory reserved

Completed
→ roasted inventory created

Cancelled
→ inventory restored or released
Status behavior should preserve:
	•	inventory continuity,
	•	transformation integrity,
	•	and deterministic operational flow.

Traceability Principle
Roast statuses should preserve operational lineage visibility.
Example:
RoastBatch
Status: Completed
↓
RoastedCoffeeInventory Created
Status progression should remain:
	•	readable,
	•	traceable,
	•	and operationally meaningful.

Deterministic Status Principle
Critical roast statuses must remain deterministic.
Examples:
	•	workflow progression,
	•	inventory readiness,
	•	roasted inventory creation,
	•	and operational completion.
Status behavior should:
	•	produce predictable outcomes,
	•	preserve operational integrity,
	•	and remain auditable.
The system should avoid:
	•	ambiguous workflow states,
	•	hidden lifecycle mutation,
	•	and non-traceable status changes.

Human-Centered Philosophy
Roast statuses should remain understandable for operational users.
Operators should be able to:
	•	understand roasting progression,
	•	identify workflow readiness,
	•	and trace roasting lifecycle state  without enterprise manufacturing complexity.
Operational clarity should take priority over industrial workflow bureaucracy.

AI Boundary Philosophy
AI systems may:
	•	analyze roasting workflow efficiency,
	•	identify operational bottlenecks,
	•	recommend workflow improvements,
	•	and support operational analytics.
However:  AI must not autonomously manipulate deterministic RoastBatch statuses.
Critical workflow states must remain:
	•	explicit,
	•	traceable,
	•	deterministic,
	•	and human-auditable.

MVP Scope
The MVP Roast Status system should prioritize:
	•	simple lifecycle visibility,
	•	deterministic workflow progression,
	•	roasting operational clarity,
	•	and inventory relationship continuity.
The MVP intentionally excludes:
	•	industrial workflow orchestration,
	•	enterprise manufacturing routing,
	•	automated production lifecycle systems,
	•	and advanced operational automation.

Architectural Notes
Roast Status is one of the behavioral orchestration layers inside the Roasting Engine.
Status systems influence:
	•	workflow progression,
	•	inventory readiness,
	•	operational visibility,
	•	and production continuity.
Roast statuses should remain:
	•	modular,
	•	deterministic,
	•	readable,
	•	and operationally meaningful.
Future systems should extend status behavior without redesigning the operational foundation.

Long-Term Direction
The Roast Status system is designed to support future evolution toward:
	•	production orchestration,
	•	operational analytics,
	•	AI-assisted workflow intelligence,
	•	roasting optimization,
	•	and manufacturing visibility systems.
However, roast status behavior should always remain:
	•	understandable,
	•	traceable,
	•	deterministic,
	•	and human-centered.

Philosophy Summary
Roast status is not merely:
	•	workflow labeling,
	•	or UI categorization.
Roast status is:
	•	operational progression visibility,
	•	roasting lifecycle state,
	•	and deterministic workflow behavior.
Roast status tells the system where roasting operationally exists within the production lifecycle.
