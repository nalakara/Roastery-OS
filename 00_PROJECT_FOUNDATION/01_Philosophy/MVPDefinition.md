# Roastery OS — MVP Definition

## Purpose

This document defines the Minimum Viable Product (MVP) scope for Roastery OS.

The purpose of the MVP is to:
- create a usable operational foundation,
- validate real-world roastery workflows,
- maintain implementation simplicity,
- reduce development complexity,
- optimize modular scalability,
- and preserve long-term architectural flexibility.

The MVP is intentionally designed to remain lightweight while still reflecting the core operational realities of specialty coffee roasting businesses.

---

# MVP Philosophy

The MVP is not intended to become a simplified ERP system.

The MVP should already represent the core operational philosophy of Roastery OS:
- transformation-based inventory,
- production-first workflows,
- traceable operations,
- and modular scalability.

However, the MVP should avoid:
- unnecessary operational complexity,
- excessive configuration requirements,
- and advanced enterprise features that are not essential for early operational adoption.

The MVP should feel:
- operationally practical,
- lightweight,
- approachable,
- and immediately usable for small and growing roasteries.

---

# Primary MVP Goals

The MVP should successfully support:

- green bean inventory tracking,
- roasting workflow recording,
- roasted coffee inventory management,
- basic production transformation,
- sales transactions,
- inventory movement tracking,
- and operational traceability.

If these operational foundations work properly, the system is already valuable.

---

# MVP User Target

The MVP is primarily designed for:

- micro roasteries,
- artisan specialty coffee roasteries,
- small wholesale roasting businesses,
- cafes with in-house roasting,
- and growing roasting operations transitioning from manual workflows.

The MVP should prioritize simplicity and operational clarity over enterprise-scale flexibility.

---

# MVP Operational Scope

The MVP operational lifecycle should support:

```text
Green Bean Inventory
↓
Roasting
↓
Roasted Coffee Inventory
↓
Basic Secondary Production
↓
Sales
↓
Basic Reporting
The MVP should already preserve:
	•	inventory movement,
	•	costing updates,
	•	batch references,
	•	and operational traceability.

MVP Core Modules
The following modules are considered mandatory for the MVP.

1. Master Data System
Purpose:  Provide foundational operational references.
Minimum Features:
	•	Green Bean Master
	•	Origin Master
	•	Processing Method Master
	•	Roast Profile Master
	•	Product Category
	•	Packaging Type
	•	Supplier Master
	•	Customer Master
The MVP should prioritize simple operational setup.

2. Inventory Engine
Purpose:  Act as the operational backbone of the system.
Minimum Features:
	•	Green Bean Inventory
	•	Roasted Coffee Inventory
	•	Finished Goods Inventory
	•	Inventory Movement Logging
	•	Inventory Adjustment
	•	Stock Deduction
	•	Stock Addition
	•	Inventory History
The MVP inventory system must already support transformation-based inventory behavior.

3. Roasting Engine
Purpose:  Handle primary roasting operations.
Minimum Features:
	•	Roast Batch Creation
	•	Roast Batch ID
	•	Green Bean Consumption
	•	Roast Yield Recording
	•	Roasted Coffee Creation
	•	Roast Profile Assignment
	•	Roast Notes
	•	Roast History
Roasting should already function as a complete inventory transformation process.

4. Basic Production Engine
Purpose:  Support simple secondary product transformation.
Minimum Features:
	•	Grinding Workflow
	•	Basic Packaging Workflow
	•	Ground Coffee Production
	•	Finished Goods Creation
	•	Basic Production Batch Tracking
The MVP should support only simple derivative production workflows.
Advanced manufacturing complexity is intentionally excluded.

5. POS Engine
Purpose:  Support operational sales transactions.
Minimum Features:
	•	Retail Sales
	•	Wholesale Sales
	•	Product Selection
	•	Stock Deduction
	•	Payment Recording
	•	Invoice Generation
	•	Sales History
The MVP POS should remain operationally lightweight.
The system should prioritize usability over advanced retail features.

6. Basic Costing Engine
Purpose:  Maintain operational cost visibility.
Minimum Features:
	•	Green Bean Costing
	•	Roast Yield Costing
	•	Basic Production Costing
	•	Finished Goods Costing
The MVP costing system should remain operationally deterministic and transparent.

7. Batch Traceability
Purpose:  Preserve operational lineage.
Minimum Features:
	•	Roast Batch Reference
	•	Production Batch Reference
	•	Inventory Movement Reference
	•	Basic Product Lineage
The MVP should already preserve core operational traceability.

MVP Features Intentionally Excluded
The following features are intentionally excluded from the MVP to maintain implementation simplicity.

Advanced Operational Modules
Excluded:
	•	Advanced Blend Engine
	•	Multi Warehouse
	•	Multi-location Management
	•	Production Scheduling
	•	Advanced Workflow Automation
	•	Advanced Manufacturing Logic

AI Features
Excluded:
	•	AI Roast Recommendation
	•	AI Blend Suggestion
	•	AI Forecasting
	•	AI Inventory Prediction
	•	AI Operational Automation
AI systems should only be introduced after operational stability is validated.

Advanced Business Features
Excluded:
	•	Subscription Orders
	•	CRM System
	•	Loyalty System
	•	Advanced Wholesale Contracting
	•	Marketplace Integration
	•	Advanced Accounting Integration

Advanced Analytics
Excluded:
	•	Predictive Analytics
	•	Forecasting Dashboard
	•	AI Reporting
	•	Advanced KPI Systems
	•	Advanced Operational Intelligence

MVP Operational Principles
The MVP must already follow all foundational workflow principles:
	•	inventory transformation,
	•	operational traceability,
	•	deterministic operational logic,
	•	modular scalability,
	•	and production-first workflows.
The MVP should not behave like a generic cafe POS system.

MVP UX Philosophy
The MVP user experience should prioritize:
	•	operational simplicity,
	•	low learning curve,
	•	workflow clarity,
	•	practical usability,
	•	and minimal operational friction.
The system should feel:
	•	lightweight,
	•	production-oriented,
	•	and natural for real roastery workflows.

MVP Scalability Strategy
The MVP should function as a stable operational core that supports future modular expansion.
Future modules should be attachable without:
	•	rebuilding inventory logic,
	•	restructuring operational workflows,
	•	or breaking existing production data.
The MVP architecture must already be:
	•	modular,
	•	extensible,
	•	and operationally stable.

MVP Success Criteria
The MVP is considered successful if a small roastery can:
	•	track green beans,
	•	perform roasting workflows,
	•	manage roasted inventory,
	•	produce simple derivative products,
	•	execute sales transactions,
	•	maintain inventory traceability,
	•	and generate operational records  without relying on spreadsheets or fragmented systems.

Long-Term MVP Philosophy
The MVP is not the final system.
The MVP is the operational foundation of a progressively evolving specialty coffee operating platform.
Roastery OS should evolve:
	•	modularly,
	•	operationally,
	•	and incrementally  without sacrificing simplicity, traceability, or architectural consistency.

