# Roastery OS — Core Architecture

## Architectural Purpose

This document defines the core architectural structure of Roastery OS.

The purpose of this architecture is to:
- maintain operational consistency,
- support modular scalability,
- preserve inventory traceability,
- simplify future system expansion,
- and provide a stable foundation for both operational workflows and future intelligence systems.

Roastery OS is designed as a production-first operational platform built around inventory transformation and batch-based coffee production workflows.

---

# Core Architectural Principles

Roastery OS is built around several core architectural principles.

---

## 1. Transformation-Based Architecture

The entire system is based on inventory transformation events.

Every operational activity inside the system:
- consumes inventory,
- creates new inventory states,
- modifies costing,
- and generates traceable operational records.

Examples:
- roasting,
- blending,
- grinding,
- packaging,
- liquid extraction,
- and sales transactions.

The system does not treat products as static inventory objects.

Instead, inventory continuously evolves through operational processes.

---

## 2. Event-Driven Operational Flow

Operational activities are treated as event-based processes.

Every event generates:
- inventory movement,
- costing updates,
- production history,
- batch lineage,
- and operational logs.

Examples of operational events:
- Purchase Event
- Roasting Event
- Blend Production Event
- Grinding Event
- Packaging Event
- Sales Event
- Waste Event
- Inventory Adjustment Event

This event-driven structure allows the system to maintain operational transparency and traceability.

---

## 3. Batch-Centric Production System

Production activities are organized around batch structures.

Every transformation process should be traceable to:
- source inventory,
- operational process,
- production result,
- and downstream distribution.

Examples:
- Roast Batch
- Blend Batch
- Production Batch
- Packaging Batch

This architecture supports:
- operational tracking,
- quality control,
- production auditing,
- and future analytics capabilities.

---

## 4. Deterministic Operational Core

Core operational logic must remain deterministic.

Critical operational calculations such as:
- inventory deduction,
- yield calculation,
- costing,
- batch tracking,
- and production flow
must operate without AI dependency.

AI functions are positioned only as operational assistance layers.

This ensures:
- operational reliability,
- predictable system behavior,
- and accounting consistency.

---

## 5. Modular Expansion Architecture

Roastery OS is designed to:
- start operationally simple,
- remain lightweight for small roasteries,
- and expand progressively through modular features.

Modules should:
- function independently,
- share standardized operational data,
- and avoid unnecessary dependency chains.

This allows:
- incremental adoption,
- scalable implementation,
- and lower operational complexity.

---

# System Layer Structure

The system is divided into several architectural layers.

```text
Foundation Layer
├── Master Data
├── Inventory Engine
├── Costing Engine
└── Batch Traceability

Operation Layer
├── Roasting Engine
├── Blend Engine
├── Production Engine
└── POS Engine

Business Layer
├── Supplier System
├── Customer & Wholesale System
└── Analytics Dashboard

Intelligence Layer
└── AI Recommendation Engine
```

Each layer has distinct operational responsibilities while remaining connected through shared operational entities.

---

# Core Entity Architecture

The system is built around several core operational entities organized across clear domain realms.

## Master Entities
Master entities provide standardized operational and commercial references across all modules.
- **Material** (Physical substance or packaging component master definition: Green Coffee, Roasted Coffee, Milk, Filter Bag, Glass Bottle)
- **Origin** (Geographical origin reference)
- **ProcessingMethod** (Agricultural processing categories: Natural, Honey, Washed, Anaerobic)
- **RoastProfile / Process** (Standardized roasting profile or transformation recipe definition)
- **ProductCategory / ProductLine** (Commercial, reporting, and organizational grouping taxonomy)
- **PackagingType** (Physical packaging format references: 250g Valve Pouch, 1L Glass Bottle, 10g Sachet)
- **Supplier** (External vendor / procurement partner)
- **Customer** (Retail or wholesale buyer)
- **Warehouse / Location** (Physical storage locations, bins, silos, tanks)

## Operational Physical Entities (Transformation Graph)
These entities represent tangible physical stock and manufacturing state evolution:
- **InventoryLot** (Discrete, measurable quantity of a Material in a specific physical InventoryState, location, and cost valuation)
- **Transformation** (The physical conversion boundary consuming inputs and producing outputs)
- **TransformationInput** (Ledger allocation and consumption from an upstream InventoryLot)
- **TransformationOutput** (Physical generation of a newly created or augmented downstream InventoryLot)
- **Batch / ProductionBatch** (Concrete execution context recording operator, timestamps, machine ID, and telemetry)

## Commercial Entities
These entities represent customer-facing sales abstractions decoupled from physical stock:
- **Product** (Commercial offering defined in the sales catalog)
- **SKU (Stock Keeping Unit)** (Specific commercial presentation, price, and packaging fulfillment criteria)

## Transactional Entities
These entities represent operational movements and commercial events:
- **InventoryMovement** (Immutable physical stock movement ledger)
- **PurchaseRecord** (Raw material receipt and procurement event)
- **SalesTransaction** (Commercial fulfillment event satisfying a SKU from compatible Inventory Lots)
- **PaymentRecord** (Financial settlement record)
- **AdjustmentRecord** (Audit adjustment or loss record)

---

# Material Transformation Model

Roastery OS operates using a generic, event-driven material transformation graph.

Physical manufacturing is modeled as an interconnected network of states and events:

```text
Material Definition (Master)
       │
       ▼ tracks physical instances
Inventory Lot (State S₁) ───┐
Inventory Lot (State S₂) ───┼──► [ Transformation Event ] ──► Inventory Lot (State S₃)
...                         │        (Process + Batch)               │
Auxiliary Material (Pkg) ───┘             ▲                          ├──► Branch A (e.g., Retail Pack)
                                          │                          └──► Branch B (e.g., Cold Brew)
                                   Yield & Cost Rules
```

### Physical Operational States
An `InventoryLot` carries a physical operational state:
1. **Raw Material State:** Sourced directly from external vendors without internal transformation (Green Beans, Raw Packaging, Ingredients).
2. **Intermediate State:** Transformed internally, held in intermediate containers (bins, silos, tanks), capable of further transformation, blending, or direct bulk sale (Roasted Bulk Beans, Ground Coffee, Cold Brew Concentrate).
3. **Packaged / Commercially Ready State:** Packaged and labeled such that it satisfies the physical fulfillment constraints of one or more commercial SKUs.

### Commercial Readiness as a Contextual Role
"Finished Goods" is not an immutable terminal inventory silo. A lot is "commercially ready" when it satisfies a SKU's packaging requirements. Any inventory lot (roasted beans, packaged bags, liquid concentrate) may:
- be sold directly through commercial channels,
- be consumed as input to another downstream transformation,
- or be un-packaged / redirected into a subsequent process via an explicit physical operation.

---

# Transformation Event System

Transformation events are the operational backbone of the system.
Every transformation event follows a consistent operational pattern:

```text
Transformation Inputs (from N Inventory Lots)
       ↓
Operational Transformation (Process Recipe + Batch Execution)
       ↓
Transformation Outputs (to M Inventory Lots)
       ↓
Inventory Movements (Ledger Deductions & Additions)
       ↓
Cost Provenance & Current Valuation Update
       ↓
Material Lineage Update
```

### Universal Transformation Dynamics
The transformation engine supports:
- **$1 \rightarrow 1$ Transformations:** Single-step processing (e.g., Single origin roasting run, bulk bean grinding).
- **$N \rightarrow 1$ Transformations:** Convergence and blending (e.g., Multi-origin post-roast blending, multi-ingredient beverage formulation).
- **$1 \rightarrow M$ Transformations:** Branching and co-product generation (e.g., Green coffee grading/sorting, spent grounds separation).
- **$N \rightarrow M$ Transformations:** Complex multi-component processing with co-products.
- **Recursive Chaining:** Output lots immediately serve as input lots to downstream transformations across arbitrary graph depth.
- **Multi-Dimensional Yield:** Conversions across mass ($\text{kg} \rightarrow \text{kg}$), volume ($\text{L} \rightarrow \text{ml}$), cross-dimensional extraction ($\text{kg} \rightarrow \text{L}$), discrete portioning ($\text{kg} \rightarrow \text{units}$), and kitting ($\text{units} + \text{units} \rightarrow \text{pack}$).

---

# Universal Transformation Contract

The Transformation Contract is the authoritative, domain-independent operational specification governing physical material conversions across Roastery OS.

## 1. Process vs. Batch vs. Transformation
The system enforces a precise conceptual separation among these three operational concepts:
- **Process (How the work should be done):** The master recipe, procedure, or standard method (e.g., "Espresso Profile Roast", "Cold Brew 1:10 Extraction", "10g Nitrogen Flush Sachet Packaging"). Defines expected inputs, operational parameters, auxiliary material requirements, and target yield expectations.
- **Batch (Concrete execution context):** An operational execution instance providing execution context: operator identity, machine ID, facility location, start/completion timestamps, environmental telemetry, and audit notes. A Batch may provide execution context for one or more Transformations.
- **Transformation (Material conversion boundary):** The immutable material state transition boundary. It deducts specific quantities from input `InventoryLots`, applies physical conversion dynamics, records direct added conversion costs, produces output `InventoryLots`, and records parent-child material lineage. A Transformation references a Batch execution context whenever the conversion requires concrete operational tracking.

```text
Process (Template / Master Recipe)
   └── guides ──► Batch (Execution Telemetry & Operator Context)
                     └── provides context for ──► Transformation (Material Conversion Boundary)
                                                     ├── Consumes TransformationInputs
                                                     ├── Attaches Direct Costs & Measures Yield
                                                     └── Generates TransformationOutputs
```

## 2. Transformation Inputs & Input Roles
A `TransformationInput` represents the allocation and consumption of a discrete physical quantity from an existing active `InventoryLot`.
Every input carries an explicit operational role:
- **Primary Material:** The core base material being converted (e.g., Green Coffee, Roasted Whole Beans, Raw Spice, Fermentation Substrate).
- **Secondary Ingredient:** Subordinate consumable ingredients blended into the formulation (e.g., Water, Milk, Sugar, Flavoring, Salt).
- **Auxiliary Packaging:** Physical packaging items consumed to format the material (e.g., Pouches, Bottles, Caps, Filter Sachets, Outer Boxes).
- **Processing Aid:** Consumables used during the operation that do not remain in the final product (e.g., Nitrogen gas, filter pads, fining agents).

## 3. Physical Reality vs. Inventory Identity vs. Economic Disposition
The Transformation Contract strictly distinguishes between three independent dimensions of transformation outcomes:
1. **Physical Disposition:** Does physical material exist after the conversion? (Primary Material, Co-Product, By-Product, Recoverable Residue, Discarded Scrap, Process Loss/Evaporation).
2. **Inventory Representation:** Does the system create or maintain an `InventoryLot` for it? (Yes for primary outputs, co-products, and recoverable residues; Optional/Policy-driven for by-products and tracked scrap; No for process losses/evaporated moisture).
3. **Economic Disposition:** How is the monetary value accounted for? (Absorbed into output inventory valuation, capitalized onto co-products, carried forward on residue, or recognized as an economic write-off/loss).

| Outcome Category | Physical Reality | Inventory Representation | Economic Disposition |
| :--- | :--- | :--- | :--- |
| **Primary Output** | Physical material exists | Always receives/augments an `InventoryLot` | Receives allocated share of input + conversion costs |
| **Co-Product** | Physical material exists | Receives a distinct `InventoryLot` | Receives allocated economic value per costing policy |
| **By-Product** | Physical material exists | Receives an `InventoryLot` if operationally tracked | Carries zero cost or nominal scrap value per policy |
| **Recoverable Residue** | Physical material exists | Retained in an intermediate `InventoryLot` | Carries proportional value forward into subsequent runs |
| **Discarded Scrap** | Physical material exists | Untracked or tracked in a scrap holding lot | Value recognized as loss or absorbed per costing policy |
| **Process Loss** | Ceases to physically exist | **No InventoryLot** (evaporated moisture / shrinkage) | Costs concentrated into surviving output mass/volume |

## 4. Economic Value Conservation Invariant
Every economic value entering a Transformation must have an explicit, exhaustive disposition:
$$\text{Total Economic Value Entering} + \text{Direct Transformation Costs} = \text{Total Economic Value Explicitly Disposed Across Outputs and Losses}$$
- Economic value cannot vanish without explicit recording.
- Physical process loss (e.g., 15% moisture loss during roasting) concentrates input cost into the surviving primary output mass.
- All monetary additions (labor, energy, overhead, auxiliary packaging) are completely allocated across output valuations, co-products, or recognized economic losses according to the active costing policy.

## 5. Universal Yield & Quantity Semantics
Yield is a physical performance metric independent of financial valuation.
- A Transformation may have multiple inputs, multiple outputs, and multi-dimensional measurements (mass, volume, discrete count, assembled packs).
- **Yield Definition:** The measured relationship between transformation inputs, transformation outputs, and recognized physical dispositions.
- **Yield Archetypes:**
  - *Intra-dimensional Mass/Volume Yield:* Ratio of actual output to input (e.g., $0.85\text{ kg} / 1.00\text{ kg} = 85\%$).
  - *Cross-dimensional Extraction Ratio:* Ratio of solvent volume to dry substrate mass (e.g., $10\text{ L water} : 1\text{ kg coffee grounds} \rightarrow 8.5\text{ L extract}$).
  - *Discrete Portioning Yield:* Discrete units generated from continuous mass/volume (e.g., $150\text{ g coffee} \rightarrow 15\text{ sachets @ } 10\text{ g}$).
  - *Discrete Kitting Assembly:* Integer count sum of distinct packaged units into a composite pack ($2\text{ bottles} + 4\text{ sachets} + 1\text{ box} \rightarrow 1\text{ gift set}$).
- Every transformation records `Expected Quantity`, `Actual Measured Quantity`, and `Yield Variance`.

## 6. Conditional Re-Entry Contract
- Any `InventoryLot` **MAY** participate in a subsequent Transformation if its material identity, physical state, quantity, operational condition, and transformation-specific recipe requirements are satisfied.
- **Universal Re-entry $\ne$ Unrestricted Re-entry:** A roasted coffee lot is eligible for grinding, cold brew, or packaging. A bottled RTD cold brew is eligible for gift set kitting or decanting rework, but is NOT valid as a green bean roasting input. Transformation validity rules enforce domain compatibility.

## 7. Fractional Lot Consumption & Multi-Branch Mechanics
- When a quantity $\Delta Q$ is consumed from an `InventoryLot` ($Q_{\text{initial}}$), the remaining physical quantity ($Q_{\text{initial}} - \Delta Q$) remains associated with the original lot identity and location.
- The corresponding economic value remains attributable to the unconsumed inventory according to the active costing policy.
- A single `InventoryLot` may participate in multiple downstream transformations and commercial fulfillment events across different product lines independently and over time.

## 8. Transformation Validity & Finalization Contract
A Transformation is valid and may be finalized only when:
1. **Input Eligibility & Availability:** All referenced input `InventoryLots` exist, hold compatible states, possess active/available status, and have sufficient physical quantity.
2. **Execution Context:** The transformation is guided by a valid `Process` and linked to an active `Batch` where required.
3. **Physical Quantity Accounting:** All consumed quantities, produced outputs, recoverable residues, by-products, and process losses are fully accounted for within physical tolerance.
4. **Economic Disposition Check:** All entering input valuations and direct transformation costs are completely disposed across outputs, co-products, or recognized losses.
5. **Causal Lineage Immutability:** Parent-child genealogy links connecting input lots to output lots are permanently written to the ledger upon finalization ($t_{\text{out}} \ge t_{\text{trans}} \ge t_{\text{in}}$).

Module Dependency Structure
Modules are designed to maintain clean operational dependencies.

Foundation Dependencies
The following modules are considered foundational:
Master Data
Inventory Engine
Costing Engine
Batch Traceability

All operational modules depend on these systems.

Operational Dependencies
Roasting Engine
Depends on:
	•	Master Data
	•	Inventory Engine
	•	Costing Engine
	•	Batch Traceability

Blend Engine
Depends on:
	•	Roasting Engine
	•	Inventory Engine
	•	Costing Engine
	•	Batch Traceability

Production Engine
Depends on:
	•	Inventory Engine
	•	Costing Engine
	•	Batch Traceability

POS Engine
Depends on:
	•	Inventory Engine
	•	Costing Engine
	•	Customer System

Analytics Dashboard
Depends on:
	•	All transactional modules
	•	Costing Engine
	•	Inventory Engine

AI Recommendation Engine
Depends on:
	•	Analytics Dashboard
	•	Historical Production Data
	•	Operational Data Structures
AI systems should never directly control operational inventory logic.

Minimal Operational Core (MVP Foundation)
The minimum usable operational system should include:
Master Data
Inventory Engine
Roasting Engine
Basic Production Engine
Basic POS Engine
Basic Costing Engine
Batch Traceability

This operational core should already support:
	•	inventory tracking,
	•	roasting workflow,
	•	production workflow,
	•	sales transactions,
	•	and operational reporting.
Advanced modules may be added progressively.

Operational Scalability Strategy
Roastery OS is designed to scale progressively.

Small Roastery Stage
Typical modules:
	•	Inventory
	•	Roasting
	•	Basic Production
	•	Basic POS
Focus:
	•	operational simplicity,
	•	lightweight workflow,
	•	and minimal setup complexity.

Growing Roastery Stage
Additional modules:
	•	Blend Engine
	•	Wholesale System
	•	Advanced Analytics
	•	Multi Warehouse
Focus:
	•	operational coordination,
	•	production scaling,
	•	and reporting visibility.

Advanced Operational Stage
Additional modules:
	•	AI Recommendation Engine
	•	Forecasting
	•	Production Planning
	•	Quality Control
	•	Multi-location operations
Focus:
	•	operational optimization,
	•	predictive systems,
	•	and advanced production orchestration.

Architectural Philosophy Summary
Roastery OS is architected as:
	•	a transformation-based operational system,
	•	a modular production platform,
	•	a batch-centric inventory ecosystem,
	•	and a production-first specialty coffee infrastructure.
The system prioritizes:
	•	operational clarity,
	•	inventory traceability,
	•	modular scalability,
	•	deterministic operational behavior,
	•	and long-term extensibility.

