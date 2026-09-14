# Roast Costing Logic

## Purpose

This document defines the roasting costing philosophy and operational costing behavior used across Roastery OS.

The purpose of Roast Costing Logic is to:
- preserve transformation-aware costing continuity,
- maintain yield-adjusted inventory valuation,
- support operational profitability visibility,
- and standardize roasting cost evolution workflows.

Roasting directly affects:
- inventory valuation,
- production economics,
- and operational profitability.

Roasting is one of the first major costing transformation layers inside Roastery OS.

---

# Core Philosophy

Roastery OS treats roasting costing as:
- transformation-aware valuation,
- operational cost evolution,
- and yield-adjusted production economics.

Roasting costing is not merely:
- inventory price mutation,
- or accounting calculation.

Roasting creates:
- new inventory value,
- new unit cost structure,
- and new operational profitability behavior.

The system should preserve:
- costing continuity,
- transformation lineage,
- and deterministic operational calculations.

---

# Costing Philosophy

Traditional inventory systems commonly interpret roasting cost as:

```text
Raw Cost
÷
Remaining Quantity
=
New Cost
Roastery OS uses a transformation-oriented costing philosophy:
Green Bean Cost
+
Roasting Overhead
↓ Yield Transformation
Roasted Coffee Value
Roasting valuation evolves together with:
	•	inventory transformation,
	•	yield behavior,
	•	and operational production flow.

Core Costing Principle
Every RoastBatch should preserve:
	•	source inventory cost,
	•	roasting transformation cost,
	•	yield-adjusted valuation,
	•	and resulting roasted inventory cost.
Example:
100kg Green Beans
Cost: $1000

↓ roasting

82kg Roasted Coffee
The resulting roasted inventory:
	•	contains lower quantity,
	•	but higher operational value per unit.

Yield-Aware Costing Principle
Yield behavior directly affects roasted inventory valuation.
Yield percentage calculation:
Yield Percentage=Output QuantityInput Quantity×100\text{Yield Percentage} = \frac{\text{Output Quantity}}{\text{Input Quantity}} \times 100Yield Percentage=Input QuantityOutput Quantity​×100

Cost Per Unit Formula
Basic roasted inventory valuation:
Cost Per Unit=Total Roasting CostOutput Quantity\text{Cost Per Unit} = \frac{\text{Total Roasting Cost}}{\text{Output Quantity}}Cost Per Unit=Output QuantityTotal Roasting Cost​

Example Costing Transformation
Example:
Green Bean Cost:
$1000

Input Quantity:
100kg

Output Quantity:
82kg
Resulting roasted cost:
Cost Per Kg=100082≈12.20\text{Cost Per Kg} = \frac{1000}{82} \approx 12.20Cost Per Kg=821000​≈12.20
This represents:
	•	transformation-aware costing,
	•	not accounting anomaly.

Roasting Overhead Philosophy
Roasting may introduce operational overhead.
Examples:
Gas Usage
Electricity
Operator Labor
Machine Usage
Packaging Preparation
The MVP should keep roasting overhead:
	•	lightweight,
	•	operationally understandable,
	•	and optionally configurable.
The MVP should avoid:
	•	enterprise manufacturing accounting complexity.

Green Bean Cost Relationship
Roasting valuation begins from:
	•	GreenBeanInventory valuation.
Example:
GreenBeanInventory
↓ RoastBatch
RoastedCoffeeInventory
Roasting workflows should preserve:
	•	source cost continuity,
	•	sourcing valuation lineage,
	•	and transformation-aware profitability visibility.

Roasted Inventory Valuation Philosophy
RoastedCoffeeInventory represents:
	•	transformed inventory value.
Roasted inventory valuation should preserve:
	•	roasting yield impact,
	•	production overhead,
	•	and operational transformation continuity.
Example:
RoastedCoffeeInventory
→ higher value density
Roasted inventory becomes:
	•	production-ready inventory,
	•	with new operational economics.

Costing Continuity Principle
Roasting costing should preserve continuity across operational workflows.
Example:
GreenBeanInventory
↓ RoastBatch
RoastedCoffeeInventory
↓ Production Workflow
FinishedGoodsInventory
Each transformation stage should preserve:
	•	valuation lineage,
	•	operational costing continuity,
	•	and profitability visibility.

Operational Profitability Philosophy
Roasting costing should support:
	•	pricing understanding,
	•	profitability awareness,
	•	and production intelligence.
Operators should understand:
	•	roasting cost evolution,
	•	yield impact,
	•	and operational margin behavior.
Costing systems should support:
	•	operational visibility,
	•	not merely accounting reporting.

Deterministic Costing Principle
Critical roasting costing behavior must remain deterministic.
Examples:
	•	yield-adjusted valuation,
	•	roasted inventory cost,
	•	overhead allocation,
	•	and operational profitability calculations.
Costing workflows should:
	•	produce predictable outcomes,
	•	preserve operational integrity,
	•	and remain auditable.
The system should avoid:
	•	hidden valuation mutation,
	•	ambiguous costing behavior,
	•	and non-traceable inventory value changes.

Traceability Principle
Roasting costing should preserve valuation lineage.
Example:
Green Bean Cost
↓ RoastBatch
Roasted Coffee Cost
↓ Production Workflow
Finished Goods Cost
Valuation continuity should remain:
	•	traceable,
	•	deterministic,
	•	and operationally understandable.

Costing vs Accounting Principle
Roastery OS distinguishes between:
	•	operational roasting costing,
	•	and formal accounting systems.
Example:
Operational Roast Costing
≠
Enterprise Accounting Ledger
The MVP prioritizes:
	•	operational profitability visibility,
	•	not accounting compliance complexity.
Formal accounting integration may evolve later without redesigning the roasting architecture.

Human-Centered Philosophy
Roasting costing should remain understandable for roasting operators.
Operators should be able to:
	•	understand roasting economics,
	•	evaluate profitability impact,
	•	and trace transformation valuation  without accounting-level complexity.
Operational clarity should take priority over financial abstraction.

AI Boundary Philosophy
AI systems may:
	•	analyze roasting profitability,
	•	identify costing anomalies,
	•	recommend optimization opportunities,
	•	and support operational analytics.
However:  AI must not autonomously manipulate deterministic roasting valuation behavior.
Critical costing operations must remain:
	•	explicit,
	•	traceable,
	•	deterministic,
	•	and human-auditable.

MVP Scope
The MVP Roast Costing system should prioritize:
	•	yield-aware valuation,
	•	roasted inventory costing,
	•	operational profitability visibility,
	•	and deterministic costing continuity.
The MVP intentionally excludes:
	•	enterprise accounting systems,
	•	industrial ERP finance modules,
	•	tax orchestration,
	•	and advanced manufacturing accounting.

Architectural Notes
Roast Costing Logic is one of the foundational operational intelligence layers inside the Roasting Engine.
Costing systems influence:
	•	pricing,
	•	profitability,
	•	inventory valuation,
	•	production planning,
	•	and operational analytics.
Roasting costing should remain:
	•	modular,
	•	deterministic,
	•	traceable,
	•	and production-oriented.
Future systems should extend costing behavior without redesigning the operational foundation.

Long-Term Direction
The Roast Costing system is designed to support future evolution toward:
	•	profitability analytics,
	•	production intelligence,
	•	forecasting systems,
	•	AI-assisted operational optimization,
	•	and advanced roasting economics.
However, roasting costing behavior should always remain:
	•	understandable,
	•	traceable,
	•	deterministic,
	•	and human-centered.

Philosophy Summary
Roasting costing is not merely:
	•	inventory repricing,
	•	or accounting adjustment.
Roasting costing is:
	•	transformation-aware valuation,
	•	yield-adjusted production economics,
	•	and operational profitability evolution.
Roasting changes not only inventory quantity,  but also inventory value.
