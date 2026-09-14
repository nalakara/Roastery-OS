# Costing Engine Operational Contract & Interface Specification

## Purpose

This document defines the authoritative **Operational Contract** for the Costing Engine in Roastery OS.

It translates the frozen **Cost Flow & Yield Mathematics Specification** into unambiguous operational contracts, execution lifecycles, engine boundary agreements, and interface specifications governing how the Costing Engine interacts with the Material Transformation Graph and adjacent operational engines.

---

# 1. Costing Engine Responsibility Boundary

To ensure strict separation of concerns, the boundaries of ownership are explicitly established:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               COSTING ENGINE BOUNDARY                                  │
│                                                                                        │
│   WHAT COSTING ENGINE OWNS:                       WHAT COSTING ENGINE DOES NOT OWN:    │
│   ├── Economic valuation of consumed quantity     ├── Physical inventory quantity      │
│   ├── Consumed economic value determination       ├── Physical inventory depletion     │
│   ├── Transformation economic pool calculation    ├── Inventory availability & locks   │
│   ├── Direct CostEvent capitalization             ├── Physical inventory location/bins │
│   ├── Output economic allocation                  ├── SKU catalog definitions          │
│   ├── Output lot asset valuation derivation       ├── Commercial selling prices        │
│   ├── Financial recognition of economic loss      ├── Sales orders & POS checkout      │
│   ├── Transformation reconciliation invariants    ├── Production recipes & execution   │
│   ├── Cost Provenance analytical records          ├── Roasting profiles & curves       │
│   └── Derived HPP & realized COGS readouts        ├── Physical yield measurements      │
│                                                   └── General Ledger (GL) bookkeeping  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Invariant Boundary Rule:
> **"Where another engine is responsible for a physical, recipe, or commercial fact, the Costing Engine strictly consumes that fact and never redefines or mutates it. Physical inventory quantity and movement remain the exclusive responsibility of the Inventory Engine."**

---

# 2. Canonical Transformation Costing Lifecycle

Every material transformation in Roastery OS proceeds through a strict 12-step deterministic costing lifecycle:

```text
[Step 1] Transformation Initiated
            ↓
[Step 2] Input Quantities Confirmed (from Inventory / Production Engine)
            ↓
[Step 3] Consumed Inventory Valuation Determined (via active Valuation Policy)
            ↓
[Step 4] Direct Cost Events Registered (Non-inventory conversion additions)
            ↓
[Step 5] Transformation Economic Pool Established (V_total = V_input_total + C_direct)
            ↓
[Step 6] Output Quantities Confirmed (Physical yield measured by Production Engine)
            ↓
[Step 7] Economic Loss Treatment Determined (Policy: absorbed vs. recognized loss)
            ↓
[Step 8] Output Allocation Policy Applied (Full Absorption, Pro-Rata, NRV, etc.)
            ↓
[Step 9] Output Lot Valuation Established (V_allocated and v_unit per output)
            ↓
[Step 10] Inventory Valuation Asset Node Created (Asset values on produced lots)
            ↓
[Step 11] Cost Provenance Recorded (Causal lineage reference persisted)
            ↓
[Step 12] Transformation Cost Reconciliation & Finalization (Exact Invariant Verified)
```

---

# 3. Detailed Step-by-Step Operational Contracts

### Step 1: Transformation Initiated
- **Fact Supplier:** Production Engine (initializes boundary $T$ associated with `Batch` and `Process`).
- **Calculation / State:** Costing Engine creates `TransformationCostLedger` in `DRAFT` status.
- **Ownership:** Lifecycle state owned by Costing Engine.

### Step 2: Input Quantities Confirmed
- **Fact Supplier:** Inventory Engine / Production Engine (supplies confirmed consumed quantities $q_{\text{consumed}}(\text{in}_i)$ and `lot_id` references for coffee, ingredients, packaging).
- **Precondition:** Physical quantities are confirmed depleted/committed by Inventory Engine.
- **Ownership:** Physical quantities owned by Inventory Engine.

### Step 3: Consumed Inventory Valuation Determined
- **Fact Supplier:** Costing Engine (invoking the active **Inventory Valuation Policy** interface, e.g., Specific Lot Identification, FIFO, Moving Weighted Average).
- **Calculation:** Derives $V_{\text{consumed}}(\text{in}_i)$ and updates lot economic balance:
  $$V(L_{\text{remaining}}) = V(L_{\text{initial}}) - V_{\text{consumed}}$$
  $$V_{\text{input\_total}}(T) = \sum_{i=1}^N V_{\text{consumed}}(\text{in}_i)$$
- **Ownership:** Economic asset balance owned by Costing Engine.

### Step 4: Direct Cost Events Registered
- **Fact Supplier:** Production / Operations Engine (supplies eligible non-inventory conversion expenditures $C_k(T)$).
- **Strict Isolation Firewall:** Confirms that no physical material or packaging lot tracked in inventory is included in $C_k(T)$. (Accounting reserves/depreciation are policy-dependent additions, not universal invariants).
- **Calculation:**
  $$C_{\text{direct}}(T) = \sum_{k=1}^K C_k(T)$$
- **Ownership:** Transformation conversion ledger owned by Costing Engine.

### Step 5: Transformation Economic Pool Established
- **Calculation:**
  $$V_{\text{total}}(T) = V_{\text{input\_total}}(T) + C_{\text{direct}}(T)$$
- **Ownership:** Transformation economic pool owned by Costing Engine.

### Step 6: Output Quantities Confirmed
- **Fact Supplier:** Production Engine (supplies actual measured physical quantities produced $q_{\text{produced}}(\text{out}_j)$ and physical mass/volume loss $\Delta Q_{\text{loss}}$).
- **Ownership:** Physical yield facts owned by Production Engine.

### Step 7: Economic Loss Treatment Determined
- **Calculation / Policy:** Costing Engine evaluates the process economic loss policy:
  - *Normal Process Loss (e.g., moisture loss in roasting):* $V_{\text{loss\_recog}}(T) = 0$. Loss is absorbed into surviving outputs.
  - *Abnormal Loss / Spoilage (e.g., dropped container, ruined batch):* $V_{\text{loss\_recog}}(T) = \text{Evaluated Write-Off Value}$.
- **Available Pool:**
  $$V_{\text{available}}(T) = V_{\text{total}}(T) - V_{\text{loss\_recog}}(T)$$
- **Ownership:** Economic loss classification owned by Costing Engine.

### Step 8: Output Allocation Policy Applied
- **Calculation / Policy:** Costing Engine applies the configured **Cost Allocation Policy** ($\alpha_j$):
  - *Policy A (Full Absorption):* Primary output receives $100\%$ of $V_{\text{available}}$.
  - *Policy B (Mass / Volume Pro-Rata):* Value divided by physical mass/volume share.
  - *Policy C (Net Realizable Value - NRV):* Value divided proportional to expected net market value.
  - *Policy D (Nominal / Standard Value for Secondary Outputs):* Secondary outputs receive fixed standard credit; primary absorbs remainder.
  - *Policy E (Fixed Ratio):* Fixed percentage allocation per configured recipe.
- **Allocated Value:**
  $$V_{\text{allocated}}(\text{out}_j) = \alpha_j \times V_{\text{available}}(T), \quad \text{where } \sum_{j=1}^M \alpha_j = 1$$
- **Ownership:** Value allocation owned by Costing Engine.

### Step 9: Output Lot Valuation Established
- **Calculation:** For each output $j$ receiving an `InventoryLot` with $q_{\text{produced}}(\text{out}_j) > 0$:
  $$v_{\text{unit}}(\text{out}_j) = \frac{V_{\text{allocated}}(\text{out}_j)}{q_{\text{produced}}(\text{out}_j)}$$
- **Ownership:** Output unit asset cost owned by Costing Engine.

### Step 10: Inventory Valuation Asset Node Created
- **Engine Hand-off:** Costing Engine attaches asset valuation balances to the newly created `InventoryLot` instances in the Inventory Engine:
  $$\text{Lot}_j.\text{total\_asset\_value} = V_{\text{allocated}}(\text{out}_j)$$
  $$\text{Lot}_j.\text{unit\_cost} = v_{\text{unit}}(\text{out}_j)$$
- **Ownership:** Asset valuation node balance owned by Costing Engine; physical lot record owned by Inventory Engine.

### Step 11: Cost Provenance Recorded
- **Lineage Persistence:** Costing Engine persists an immutable causal provenance record linking the output lot to transformation $T$, its input consumption fractions, direct cost events, yield ratio, and applied allocation policy.
- **Ownership:** Cost provenance ledger owned by Costing Engine; causal graph edges owned by Batch / Lineage Engine.

### Step 12: Transformation Cost Reconciliation & Finalization
- **Invariant Audit:** Costing Engine verifies the governing conservation invariant:
  $$\Big| V_{\text{total}}(T) - \Big( \sum_{j=1}^M V_{\text{allocated}}(\text{out}_j) + V_{\text{loss\_recog}}(T) \Big) \Big| = 0$$
- **Finalization:** Any sub-currency-unit residual ($< \text{Rp } 1$) resulting from division across discrete units is allocated to the primary output lot balance to preserve exact zero drift. Ledger status transitions to `FINALIZED`.

---

# 4. Intersystem Operational Contracts & Ownership Matrix

| Domain Engine | Facts Supplied to Costing Engine | State Owned by Engine | State Received from Costing Engine |
| :--- | :--- | :--- | :--- |
| **Inventory Engine** | Consumed physical quantities ($\Delta Q$), source `lot_id`, material UoM | Physical lot quantities ($Q$), physical lot state, warehouse bins | Consumed lot value ($V_{\text{consumed}}$), remaining asset value ($V_{\text{remaining}}$), output lot asset value ($V_{\text{allocated}}$), unit cost ($v_{\text{unit}}$) |
| **Production Engine** | Transformation boundary $T$, batch ID, process ID, non-inventory cost events ($C_k$), measured output yields ($q_{\text{produced}}$) | Work orders, batch execution, machine profiles, physical yield ($\Delta Q_{\text{loss}}$) | Total economic pool ($V_{\text{total}}$), allocated output costs ($V_{\text{allocated}}$), recognized loss ($V_{\text{loss\_recog}}$), reconciliation status |
| **POS / Sales Engine** | Fulfilled `lot_id`, fulfilled physical quantity ($q_{\text{sold}}$), commercial SKU ID, selling price | Sales orders, customer invoices, payments, retail pricing | Realized COGS ($q_{\text{sold}} \times v_{\text{unit}}$), unit production HPP ($v_{\text{unit}}$), gross margin nominal & percentage |
| **Batch / Lineage Engine** | Transformation graph hyperedges, parent-child physical material lineage | Graph topology, physical trace history | Economic provenance records (causal-temporal value breakdown) |

---

# 5. Non-Inventory CostEvent Firewall & Anti-Double-Counting Rules

1. **Strict Input Channel:** Any physical resource tracked as an inventory lot (green coffee, roasted beans, mineral water, bottles, caps, labels, drip filter sachets, foil, boxes, ingredients) **must enter strictly as a `TransformationInput` via $V_{\text{consumed}}$**.
2. **Strict CostEvent Channel:** `CostEvent` ($C_{\text{direct}}$) is strictly restricted to non-inventory conversion expenditures (labor, utilities, machine usage fees, toll service charges).
3. **Double Counting Prohibition:** A physical inventory lot ID **must never be registered inside $C_{\text{direct}}$**.
4. **Bundled Procurement Classification:** Third-party services bundled with physical materials (e.g., toll roaster supplying packaging + roasting service) must be explicitly classified by policy prior to entry into material input lots vs. service cost events.

---

# 6. Operational Error Handling & Invariant Violations

If an invariant is breached during execution, the Costing Engine **must reject finalization**:

1. **Unreconciled Value Pool Error:** If $V_{\text{total}} \ne \sum V_{\text{allocated}} + V_{\text{loss\_recog}}$, the transformation finalization is blocked.
2. **Zero Produced Quantity on Output Lot:** If $q_{\text{produced}} = 0$ for a primary output, allocation cannot divide by zero; unallocated value must be routed to $V_{\text{loss\_recog}}$ as explicit scrap write-off.
3. **Double Counting Protection Error:** If a physical inventory lot ID is submitted inside the `CostEvent` array, execution aborts with `INVALID_COST_EVENT_CLASSIFICATION`.
4. **Negative Quantity / Value Error:** If any quantity or monetary value is $< 0$, execution is rejected.

---

# 7. Summary of Operational Status

This operational contract establishes deterministic behavioral rules for the Costing Engine without making premature database, framework, or UI implementation choices. It preserves complete fidelity to the frozen domain ontology and mathematical specification.
