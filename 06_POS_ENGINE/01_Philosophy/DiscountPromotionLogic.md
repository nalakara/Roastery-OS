# Discount Promotion Logic

## Purpose

This document defines the discount and promotion philosophy and operational pricing adjustment behavior used inside the POS Engine of Roastery OS.

The purpose of Discount Promotion Logic is to:
- standardize commercial pricing adjustment workflows,
- preserve deterministic profitability continuity,
- maintain transparent transaction behavior,
- support flexible commerce strategies,
- and provide operational pricing visibility.

Discount and promotion systems inside Roastery OS are designed to support:
- operational commerce strategy,
not merely:
- price reduction mechanisms.

Discount and promotion logic is one of the commercial behavior layers inside the POS Engine.

---

# Core Philosophy

Roastery OS treats discounts and promotions as:
- operational commerce strategy tools,
- customer relationship mechanisms,
- and controlled profitability adjustments.

Discounts are not merely:
- arbitrary price cuts,
- cashier overrides,
- or marketing gimmicks.

Every discount or promotion may affect:
- profitability continuity,
- customer behavior,
- inventory velocity,
- transaction economics,
- and operational forecasting.

The system should preserve:
- pricing transparency,
- profitability visibility,
- and deterministic commerce continuity.

---

# Promotion Philosophy

Traditional POS systems commonly interpret promotions as:

```text id="x5m8tw"
Normal Price
↓ Discount
Cheaper Transaction

Roastery OS uses an operational pricing strategy model:
Promotion Strategy
↓
Transaction Adjustment
↓
Customer Behavior
↓
Operational Commerce Intelligence

Promotions represent:
	•	operational business strategy, not merely:
	•	reduced pricing.

Discount vs Promotion Principle
Roastery OS intentionally separates:
	•	discounts, from:
	•	promotions.
Example:
Discount
≠
Promotion


Discount
Represents:
	•	direct pricing reduction.
Examples:
10% Discount
Rp 5.000 Off
Manual Price Adjustment


Promotion
Represents:
	•	broader commercial strategy.
Examples:
Bundle Offer
Buy 2 Get 1
Happy Hour
Subscription Pricing
Loyalty Rewards

This separation preserves:
	•	modular commerce architecture,
	•	pricing flexibility,
	•	and future marketing extensibility.

Core Pricing Principle
Every pricing adjustment should preserve:
	•	original pricing visibility,
	•	transaction continuity,
	•	profitability visibility,
	•	and operational traceability.
Example:
Original Price
↓ Promotion Applied
Adjusted Price
↓
Profitability Visibility

Pricing adjustments should remain:
	•	explicit,
	•	measurable,
	•	and operationally understandable.

Discount Types Philosophy
Roastery OS may support multiple discount structures.
Examples:
Percentage Discount
Fixed Amount Discount
Item-Level Discount
Transaction-Level Discount
Membership Discount
Manual Discount

Discount systems should remain:
	•	modular,
	•	extensible,
	•	and operationally practical.

Percentage Discount Formula
Percentage-based discount calculation:
\text{Discount Amount} = \text{Original Price} \times \frac{\text{Discount Percentage}}{100}

Final Price Formula
Final adjusted pricing calculation:
\text{Final Price} = \text{Original Price} - \text{Discount Amount}

Example Discount Calculation
Example:
Original Price:
Rp 100.000

Discount:
10%

Discount amount:
100000 \times \frac{10}{100} = 10000
Final price:
100000 - 10000 = 90000
Result:
Final Price:
Rp 90.000


Promotion Types Philosophy
Promotion systems may support:
	•	operational commerce strategies.
Examples:
Bundle Promotions
Seasonal Campaigns
Loyalty Rewards
Wholesale Pricing
Subscription Discounts
Time-Based Promotions

Promotion systems should remain:
	•	operationally flexible,
	•	traceable,
	•	and profitability-aware.

Bundle Promotion Principle
Some promotions may combine:
	•	multiple SKUs,
	•	multiple quantities,
	•	or mixed inventory structures.
Examples:
Buy 2 Get 1
Coffee + Pastry Bundle
Drip Bag Variety Pack

Bundle systems should preserve:
	•	inventory continuity,
	•	transaction readability,
	•	and profitability visibility.

Membership Pricing Principle
Customer relationships may influence:
	•	transaction pricing behavior.
Examples:
Member Discount
Wholesale Pricing
Subscriber Pricing
VIP Pricing

Pricing relationships should preserve:
	•	customer continuity,
	•	operational traceability,
	•	and deterministic commerce behavior.

Manual Adjustment Principle
Operators may occasionally perform:
	•	manual pricing adjustments.
Examples:
Special Customer Adjustment
Damaged Packaging Discount
Operational Compensation
Custom Wholesale Pricing

Manual adjustments should preserve:
	•	operator visibility,
	•	pricing traceability,
	•	and auditability.
The system should avoid:
	•	hidden price mutation.

Profitability Visibility Principle
Discounts and promotions directly affect:
	•	operational profitability.
Example:
Original Margin
↓ Discount Applied
Reduced Margin

The system should preserve:
	•	margin visibility,
	•	operational transparency,
	•	and profitability continuity.
Promotions should never become:
	•	invisible profitability leakage.

Multi-Channel Promotion Principle
Promotion systems should remain unified across:
	•	multiple commerce channels.
Examples:
Retail POS
Online Store
Marketplace
Subscription
Wholesale

The architecture should preserve:
	•	centralized pricing continuity across:
	•	multiple commercial ecosystems.

Time-Based Promotion Principle
Some promotions may include:
	•	operational time constraints.
Examples:
Happy Hour
Weekend Promotion
Seasonal Campaign
Limited-Time Offer

Time-based promotions should preserve:
	•	deterministic activation behavior,
	•	pricing visibility,
	•	and operational traceability.

Refund Relationship Principle
Refund workflows should preserve:
	•	original promotion continuity.
Example:
Discounted Transaction
↓ Refund
Adjusted Revenue Correction

Refund systems should preserve:
	•	pricing traceability,
	•	transaction continuity,
	•	and profitability integrity.

Operational Intelligence Principle
Discount and promotion systems are one of the operational intelligence sources inside Roastery OS.
Promotion behavior may later support:
	•	customer analytics,
	•	pricing optimization,
	•	sales forecasting,
	•	inventory movement analysis,
	•	and AI-assisted commerce intelligence.
Example:
Promotion Performance
↓
Sales Velocity
↓
Inventory Consumption Pattern

The architecture should preserve:
	•	future intelligence scalability.

Marketing Separation Principle
Roastery OS distinguishes between:
	•	operational promotion infrastructure, and:
	•	marketing execution systems.
Example:
Promotion Logic
≠
Marketing Campaign System

The MVP prioritizes:
	•	operational pricing continuity, not:
	•	enterprise marketing orchestration.
Advanced campaign systems may evolve later without redesigning the commerce foundation.

Deterministic Pricing Principle
Critical pricing behavior must remain deterministic.
Examples:
	•	discount calculation,
	•	promotion activation,
	•	pricing adjustment,
	•	refund correction,
	•	and profitability continuity.
Pricing workflows should:
	•	produce predictable outcomes,
	•	preserve operational integrity,
	•	and remain auditable.
The system should avoid:
	•	hidden pricing mutation,
	•	ambiguous promotion behavior,
	•	and disconnected profitability continuity.

Human-Centered Philosophy
Discount and promotion systems should remain understandable for:
	•	cashiers,
	•	café operators,
	•	roastery owners,
	•	and growing specialty coffee businesses.
Pricing workflows should feel:
	•	practical,
	•	readable,
	•	and operationally intuitive.
Operational clarity should take priority over:
	•	enterprise pricing bureaucracy.

AI Boundary Philosophy
AI systems may:
	•	analyze promotion performance,
	•	recommend pricing optimization,
	•	identify customer behavior patterns,
	•	and support forecasting analytics.
However: AI must not autonomously manipulate deterministic pricing relationships.
Critical pricing continuity must remain:
	•	explicit,
	•	traceable,
	•	deterministic,
	•	and human-auditable.

MVP Scope
The MVP Discount Promotion system should prioritize:
	•	deterministic discount calculation,
	•	promotion traceability,
	•	profitability visibility,
	•	lightweight promotion workflows,
	•	and multi-channel pricing continuity.
The MVP intentionally excludes:
	•	enterprise marketing automation,
	•	autonomous pricing AI,
	•	industrial campaign orchestration,
	•	and advanced retail optimization systems.

Architectural Notes
Discount Promotion Logic is one of the commercial pricing behavior layers inside the POS Engine.
Pricing systems influence:
	•	profitability visibility,
	•	customer behavior,
	•	inventory movement,
	•	forecasting systems,
	•	and future commerce intelligence systems.
Promotion architecture should remain:
	•	modular,
	•	deterministic,
	•	traceable,
	•	and commerce-oriented.
Future systems should extend pricing behavior without redesigning the operational foundation.

Long-Term Direction
The Discount Promotion system is designed to support future evolution toward:
	•	AI-assisted pricing intelligence,
	•	predictive promotion analytics,
	•	customer behavior modeling,
	•	subscription pricing systems,
	•	and ecosystem-wide commerce orchestration.
However, pricing behavior should always remain:
	•	understandable,
	•	deterministic,
	•	traceable,
	•	and human-centered.

Philosophy Summary
Discounts and promotions are not merely:
	•	price cuts,
	•	marketing tricks,
	•	or cashier adjustments.
Discounts and promotions are:
	•	operational commerce strategy tools,
	•	customer relationship mechanisms,
	•	and profitability-aware pricing systems.
Discount and promotion systems define how specialty coffee businesses operationally shape commercial behavior inside Roastery OS.

