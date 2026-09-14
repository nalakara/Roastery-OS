# Roast Yield Logic

## Purpose

This document defines the roasting yield philosophy and operational yield behavior used across Roastery OS.

The purpose of Roast Yield Logic is to:
- preserve roasting transformation accuracy,
- maintain inventory continuity,
- support yield-aware costing,
- provide operational production visibility,
- and standardize roasting output calculations.

Yield behavior is one of the defining operational characteristics of roasting workflows.

Roasting inherently changes:
- material weight,
- inventory quantity,
- and operational valuation.

---

# Core Philosophy

Roastery OS treats roasting yield as:
- operational transformation intelligence,
- not inventory error.

Yield behavior should remain:
- explicit,
- traceable,
- deterministic,
- and operationally meaningful.

The system should preserve:
- roasting shrinkage,
- output evolution,
- and production efficiency visibility.

---

# Yield Philosophy

Roasting naturally transforms:
- raw coffee mass,
- into roasted coffee mass.

Example:

```text id="x4m7tw"
100kg Green Beans
↓ roasting
82kg Roasted Coffee
The resulting quantity difference represents:
	•	expected roasting transformation,
	•	not stock discrepancy.
Roast yield is treated as:
	•	transformation behavior,
	•	and operational production intelligence.

Yield Awareness Principle
Every RoastBatch should preserve:
	•	input quantity,
	•	output quantity,
	•	yield percentage,
	•	and shrinkage percentage.
Example:
Input:
100kg Green Beans

Output:
82kg Roasted Coffee

Yield:
82%

Shrinkage:
18%
Yield behavior should remain:
	•	readable,
	•	auditable,
	•	and operationally understandable.

Core Yield Formula
Roastery OS uses deterministic yield calculation logic.
Yield percentage calculation:
Yield Percentage=Output QuantityInput Quantity×100\text{Yield Percentage} = \frac{\text{Output Quantity}}{\text{Input Quantity}} \times 100Yield Percentage=Input QuantityOutput Quantity​×100

Shrinkage Formula
Shrinkage percentage calculation:
Shrinkage Percentage=100−Yield Percentage\text{Shrinkage Percentage} = 100 - \text{Yield Percentage}Shrinkage Percentage=100−Yield Percentage

Example Calculation
Example roasting transformation:
Input:
100kg Green Beans

Output:
82kg Roasted Coffee
Yield calculation:
Yield=82100×100=82%\text{Yield} = \frac{82}{100} \times 100 = 82\%Yield=10082​×100=82%
Shrinkage calculation:
100−82=18%100 - 82 = 18\%100−82=18%

Yield as Operational Intelligence
Yield behavior may provide insight into:
	•	roasting consistency,
	•	roast intensity,
	•	green bean characteristics,
	•	moisture content,
	•	roasting efficiency,
	•	and operational performance.
Examples:
High Shrinkage
→ darker roast possibility

Lower Shrinkage
→ lighter roast possibility
Yield behavior should support:
	•	operational understanding,
	•	not merely inventory calculation.

Roast Profile Relationship
Different roast profiles may produce:
	•	different yield behavior,
	•	different shrinkage patterns,
	•	and different operational outcomes.
Examples:
Filter Roast
→ higher yield possibility

Espresso Roast
→ lower yield possibility
The system should preserve:
	•	roast profile relationship,
	•	yield continuity,
	•	and production history.

Green Bean Relationship Principle
Yield behavior should preserve source inventory continuity.
Example:
GreenBeanInventory
↓ RoastBatch
RoastedCoffeeInventory
The system should preserve:
	•	source inventory quantity,
	•	output inventory quantity,
	•	and transformation lineage.
Yield logic should remain:
	•	deterministic,
	•	traceable,
	•	and operationally auditable.

Costing Relationship Principle
Yield directly affects inventory valuation.
Example:
100kg Green Beans
Cost: $1000

↓ roasting

82kg Roasted Coffee
Result:
Higher Cost Per Kg
Yield-aware costing is one of the foundational operational principles inside Roastery OS.
The system should preserve:
	•	transformation costing continuity,
	•	operational profitability visibility,
	•	and deterministic valuation behavior.

Expected Yield Philosophy
Different coffees may produce different expected yield ranges.
Examples may vary based on:
	•	coffee type,
	•	moisture content,
	•	processing method,
	•	roast level,
	•	and roasting technique.
Examples:
Light Roast
→ typically higher yield

Dark Roast
→ typically lower yield
The MVP should preserve:
	•	yield recording,
	•	not predictive roasting intelligence.

Yield Validation Principle
Yield behavior should remain operationally validated.
The system should help operators identify:
	•	abnormal shrinkage,
	•	unusual roasting behavior,
	•	and possible operational issues.
Examples:
Unexpectedly Low Yield
→ possible roasting anomaly

Unexpectedly High Yield
→ possible measurement issue
Yield validation should support:
	•	operational awareness,
	•	not automated correction.

Deterministic Yield Principle
Yield calculations must remain deterministic.
Critical roasting calculations should:
	•	produce predictable outcomes,
	•	preserve transformation continuity,
	•	and remain auditable.
The system should avoid:
	•	hidden yield manipulation,
	•	ambiguous quantity behavior,
	•	and non-traceable inventory mutation.

Inventory Relationship Principle
Yield calculations directly affect:
	•	roasted inventory quantity,
	•	inventory valuation,
	•	costing continuity,
	•	and production traceability.
Yield logic should preserve explicit operational relationships.
Example:
Input Inventory
↓ RoastBatch
Yield Calculation
↓
Output Inventory
This relationship should remain:
	•	traceable,
	•	deterministic,
	•	and operationally readable.

Human-Centered Philosophy
Yield systems should remain understandable for roasting operators.
Operators should be able to:
	•	understand roasting shrinkage,
	•	validate roasting outcomes,
	•	and trace production efficiency  without manufacturing or accounting complexity.
Operational clarity should take priority over theoretical production optimization.

AI Boundary Philosophy
AI systems may:
	•	analyze yield consistency,
	•	identify roasting anomalies,
	•	recommend roasting adjustments,
	•	and support operational analytics.
However:  AI must not autonomously manipulate deterministic yield calculations.
Critical yield behavior must remain:
	•	explicit,
	•	traceable,
	•	deterministic,
	•	and human-auditable.

MVP Scope
The MVP Roast Yield system should prioritize:
	•	deterministic yield calculation,
	•	shrinkage visibility,
	•	operational yield tracking,
	•	and transformation continuity.
The MVP intentionally excludes:
	•	predictive roasting systems,
	•	automated roasting optimization,
	•	machine-learning roast control,
	•	and industrial production analytics.

Architectural Notes
Roast Yield Logic is one of the most foundational operational intelligence layers inside the Roasting Engine.
Yield systems influence:
	•	inventory quantity,
	•	valuation continuity,
	•	profitability visibility,
	•	and production analytics.
Yield logic should remain:
	•	modular,
	•	deterministic,
	•	traceable,
	•	and production-oriented.
Future systems should extend yield behavior without redesigning the operational foundation.

Long-Term Direction
The Roast Yield system is designed to support future evolution toward:
	•	roasting analytics,
	•	consistency monitoring,
	•	AI-assisted roasting intelligence,
	•	production forecasting,
	•	and operational optimization.
However, yield behavior should always remain:
	•	understandable,
	•	traceable,
	•	deterministic,
	•	and human-centered.

Philosophy Summary
Roast yield is not:
	•	inventory loss,
	•	or stock discrepancy.
Roast yield is:
	•	operational transformation behavior,
	•	roasting intelligence,
	•	and measurable production evolution.
Yield tells the system how coffee physically transforms during roasting.
