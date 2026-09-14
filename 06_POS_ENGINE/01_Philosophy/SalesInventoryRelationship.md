# Sales Inventory Relationship

## Purpose

This document defines the operational relationship between commercial sales activities and inventory management inside Roastery OS.

The purpose of this relationship is to:
- ensure deterministic inventory deduction upon sales execution,
- preserve operational auditability and margin tracking,
- decouple commercial `SKU` presentation from physical stock instances (`InventoryLot`),
- support multi-channel sales (Retail POS, Wholesale, E-Commerce, Subscriptions),
- and maintain real-time inventory visibility.

---

# Core Philosophy

Roastery OS treats sales as:
- commercial transaction events,
that trigger:
- deterministic physical deductions from compatible `InventoryLots`.

Sales activities do not control production logic; they consume operational inventory.

---

# Commercial SKU to Inventory Lot Fulfillment

In Roastery OS, sales are conducted against commercial **SKUs**, but fulfillment occurs against physical **Inventory Lots**:

```text
Commercial Realm:
Customer purchases SKU (e.g., "Budugasu Honey 250g Whole Bean" or "Wholesale Bulk Roasted 5kg")
       ↓
Operational Fulfillment:
SalesEngine resolves and deducts from compatible InventoryLot:
- Matches Material ("Budugasu Honey Roasted")
- Matches Physical State ("Packaged 250g" OR "Intermediate Bulk Bin")
- Deducts exact quantity on immutable InventoryMovement ledger
- Records COGS based on that specific InventoryLot's currentUnitCost
```

### Fulfillment Flexibility Rules
1. **Packaged Retail Fulfillment:** Standard retail POS sales deduct from portion-packaged `InventoryLots` (e.g., 250g retail pouches).
2. **Direct Intermediate / Wholesale Fulfillment:** Wholesale or cafe-bar orders can deduct directly from intermediate `InventoryLots` (e.g., 5kg from bulk roasted storage bin, or 10kg green coffee sold to a roasting partner) without forcing artificial transformation records.
3. **Lot Specificity:** POS checkout can either deduct via FIFO from available lots or allow explicit operator selection of a specific roast batch lot code for high-value micro-lots.

---

# Commercial Readiness Fulfillment Principle

Sales workflows consume `InventoryLots` that satisfy the physical and packaging criteria of the ordered `SKU`.
Example:
- 250g House Blend Pouch $\rightarrow$ fulfills from a packaged 250g `InventoryLot`.
- 1L Cold Brew Bottle $\rightarrow$ fulfills from a packaged 1L `InventoryLot`.
- 10kg Wholesale Bulk Beans $\rightarrow$ fulfills directly from an intermediate roasted `InventoryLot`.
	•	and manufacturing integrity.

Inventory Deduction Principle
Inventory deduction should occur:
	•	only after valid sales completion.
Example:
Transaction Completed
↓
Inventory Deduction Executed

The system should avoid:
	•	premature deduction,
	•	hidden quantity mutation,
	•	and disconnected sales continuity.
Inventory deduction must remain:
	•	deterministic,
	•	explicit,
	•	and auditable.

Inventory Movement Principle
Sales transactions should generate:
	•	InventoryMovement records.
Example:
FinishedGoodsInventory
↓ Sale
InventoryMovement
↓
Quantity Reduced

Inventory movement should preserve:
	•	transaction relationship,
	•	operational history,
	•	and stock continuity.
Inventory movement acts as:
	•	operational inventory memory.

Quantity Continuity Principle
Sales workflows should preserve:
	•	measurable inventory continuity.
Example:
Inventory Before Sale:
20 Units

Transaction:
3 Units Sold

Inventory After Sale:
17 Units

Quantity continuity should remain:
	•	explicit,
	•	traceable,
	•	and operationally understandable.

Reservation Principle
Some sales workflows may temporarily reserve inventory before completion.
Examples:
Online Checkout
Wholesale Orders
Subscription Orders
Marketplace Orders

Example relationship:
Available
↓ Reserved
Pending Transaction
↓ Completed
Deducted

Reservation workflows should preserve:
	•	inventory integrity,
	•	operational continuity,
	•	and deterministic transaction behavior.

Multi-Channel Inventory Principle
Inventory continuity should remain unified across:
	•	multiple commerce channels.
Examples:
Retail POS
Online Store
Marketplace
Wholesale
Subscription

Example:
Shared FinishedGoodsInventory
↓
Multiple Sales Channels

The architecture should preserve:
	•	centralized inventory continuity, without:
	•	channel fragmentation.

SKU Relationship Principle
Sales workflows primarily interact with:
	•	SKU abstraction systems.
Example:
SKU
↓
Sales Transaction
↓
FinishedGoodsInventory

SKU systems preserve:
	•	commercial presentation.
Inventory systems preserve:
	•	operational stock continuity.
This separation preserves:
	•	modular commerce architecture.

Traceability Principle
Sales workflows should preserve:
	•	downstream inventory traceability.
Example:
FinishedGoodsInventory
↓ Sale
Customer

Sales traceability should preserve:
	•	transaction continuity,
	•	customer continuity,
	•	and inventory lineage visibility.
Inventory relationships should remain:
	•	readable,
	•	traceable,
	•	and operationally meaningful.

Costing Relationship Principle
Sales inventory relationships directly affect:
	•	COGS continuity,
	•	profitability visibility,
	•	and operational analytics.
Example:
FinishedGoodsInventory Cost
↓ Sale
COGS
↓
Profit Visibility

Inventory continuity should preserve:
	•	costing lineage,
	•	operational profitability,
	•	and deterministic valuation continuity.

Refund Relationship Principle
Refund workflows may affect:
	•	inventory restoration behavior.
Example:
Completed Sale
↓ Refund
Inventory Returned

Refund inventory behavior should remain:
	•	deterministic,
	•	traceable,
	•	and operationally understandable.
The MVP should preserve:
	•	lightweight refund handling, without:
	•	enterprise retail complexity.

Inventory State Principle
Sales workflows may affect:
	•	inventory states.
Examples:
Available
Reserved
Sold
Returned
Archived

Inventory state transitions should remain:
	•	explicit,
	•	deterministic,
	•	and operationally meaningful.

Real-Time Inventory Principle
Sales workflows should preserve:
	•	real-time inventory visibility.
Examples:
Current Stock Availability
Sales Velocity
Fast-Moving Products
Low Stock Visibility

Real-time inventory continuity supports:
	•	operational awareness,
	•	forecasting,
	•	and future AI systems.

Production Signal Principle
Sales inventory behavior may later generate:
	•	production demand signals.
Example:
Sales Velocity
↓
FinishedGoodsInventory Depletion
↓
Production Recommendation

This relationship is one of the foundations for:
	•	future operational intelligence systems.

Deterministic Inventory Principle
Critical inventory behavior must remain deterministic.
Examples:
	•	inventory deduction,
	•	quantity continuity,
	•	reservation handling,
	•	refund restoration,
	•	and transaction relationships.
Inventory workflows should:
	•	produce predictable outcomes,
	•	preserve operational integrity,
	•	and remain auditable.
The system should avoid:
	•	hidden stock mutation,
	•	ambiguous inventory behavior,
	•	and disconnected commerce continuity.

Human-Centered Philosophy
Sales inventory systems should remain understandable for:
	•	cashiers,
	•	café operators,
	•	roastery operators,
	•	and growing specialty coffee businesses.
Inventory behavior should feel:
	•	practical,
	•	readable,
	•	and operationally intuitive.
Operational clarity should take priority over:
	•	ERP-level inventory bureaucracy.

AI Boundary Philosophy
AI systems may:
	•	analyze sales velocity,
	•	recommend restocking,
	•	identify inventory anomalies,
	•	and support operational forecasting.
However: AI must not autonomously manipulate deterministic inventory relationships.
Critical inventory continuity must remain:
	•	explicit,
	•	traceable,
	•	deterministic,
	•	and human-auditable.

MVP Scope
The MVP Sales Inventory Relationship system should prioritize:
	•	deterministic inventory deduction,
	•	transaction-connected inventory continuity,
	•	inventory movement generation,
	•	real-time stock visibility,
	•	and operational traceability.
The MVP intentionally excludes:
	•	autonomous warehouse systems,
	•	industrial logistics orchestration,
	•	enterprise retail infrastructure,
	•	and advanced inventory AI automation.

Architectural Notes
Sales Inventory Relationship is one of the operational integrity layers inside the POS Engine.
Inventory relationship systems influence:
	•	stock continuity,
	•	transaction traceability,
	•	profitability visibility,
	•	operational forecasting,
	•	and production intelligence systems.
Inventory relationship architecture should remain:
	•	modular,
	•	deterministic,
	•	traceable,
	•	and commerce-oriented.
Future systems should extend inventory behavior without redesigning the operational foundation.

Long-Term Direction
The Sales Inventory Relationship system is designed to support future evolution toward:
	•	real-time operational forecasting,
	•	AI-assisted inventory intelligence,
	•	predictive production orchestration,
	•	omnichannel commerce continuity,
	•	and ecosystem-wide operational visibility.
However, inventory behavior should always remain:
	•	understandable,
	•	deterministic,
	•	traceable,
	•	and human-centered.

Philosophy Summary
Sales inventory relationships are not merely:
	•	stock reduction systems,
	•	or quantity tracking mechanisms.
Sales inventory relationships are:
	•	operational inventory consumption continuity,
	•	transaction-connected stock orchestration,
	•	and real-world commerce integrity systems.
Sales inventory relationships define how coffee operationally moves from commercial inventory into customer ownership inside Roastery OS.

