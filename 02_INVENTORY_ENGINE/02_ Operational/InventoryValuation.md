# Inventory Valuation

## Purpose

This document defines the operational inventory valuation model and the boundary between the **Inventory Engine** and the **Costing Engine** in Roastery OS.

The purpose of Inventory Valuation is to:
- maintain live inventory asset value visibility on physical `InventoryLot` instances,
- preserve cost provenance links across multi-stage transformation graphs,
- provide accurate inventory balances for management reporting,
- and ensure strict separation between physical stock management and economic cost calculations.

---

# Core Boundary: Inventory Engine vs. Costing Engine

Roastery OS establishes a strict operational boundary between inventory holding and economic costing:

```text
┌────────────────────────────────────────────────────────┐
│                   INVENTORY ENGINE                     │
│  - Owns physical InventoryLot quantities (Q)           │
│  - Owns PhysicalState & AvailabilityStatus             │
│  - Owns Location & Warehouse tracking                  │
│  - Records live Unit Cost ($U$) & Total Value ($Q \times U$) │
│  - Executes physical InventoryMovement ledger          │
└───────────────────────────▲────────────────────────────┘
                            │ (Assigns U_lot / Value)
┌───────────────────────────┴────────────────────────────┐
│                    COSTING ENGINE                      │
│  - Owns Cost Flow Mathematics (Equations 1–7)          │
│  - Owns Transformation Economic Pool ($V_{in} + C_{dir}$)│
│  - Owns CostEvent direct expense capitalization        │
│  - Evaluates Output Lot Unit Cost ($U_{out}$)          │
│  - Allocates Cost across Co-Products & By-Products     │
└────────────────────────────────────────────────────────┘
```

---

# Valuation Principles on InventoryLot

### 1. Live Unit Cost Snapshot ($U_{\text{lot}}$)
Every `InventoryLot` carries its current economic unit cost:
- **Inbound Receipts:** Sourced purchase cost plus capitalized inbound freight/duties.
- **Transformation Outputs:** Calculated via Costing Equation 1:
  $$U_{\text{out}} = \frac{V_{\text{consumed}} + C_{\text{direct}}}{Q_{\text{out}}}$$
- **Lot Splits & Transfers:** Inherits parent lot unit cost ($U_{\text{child}} = U_{\text{parent}}$).

### 2. Total Lot Asset Value
The total financial balance of any `InventoryLot` is derived deterministically:
$$\text{AssetValue}_{\text{lot}} = Q_{\text{lot}} \times U_{\text{lot}}$$

### 3. Fractional Consumption & Value Integrity
When a transformation or sales order consumes $\Delta Q$ from an `InventoryLot`:
- The remaining physical balance is $Q_{\text{rem}} = Q_{\text{initial}} - \Delta Q$.
- The remaining asset value is $\text{AssetValue}_{\text{rem}} = Q_{\text{rem}} \times U_{\text{lot}}$.
- The consumed economic value $V_{\text{consumed}} = \Delta Q \times U_{\text{lot}}$ is transferred into the transformation pool or charged to COGS.

---

# Valuation across Standard Roastery Workflows

### 1. Green Coffee Receiving
An inbound green coffee `InventoryLot` is assigned its acquisition unit cost ($U_{\text{green}} = \text{Purchase Price} + \text{Direct Inbound Fees}$).

### 2. Roasting Mass Shrinkage Absorption
Because roasting naturally reduces mass ($Q_{\text{roasted}} < Q_{\text{green}}$), the roasted coffee `InventoryLot` automatically carries a higher unit cost ($U_{\text{roasted}} > U_{\text{green}}$) to absorb green shrinkage plus direct roasting labor/energy `CostEvents`.

### 3. Packaging & Auxiliary Materials Combination
When roasted whole beans and packaging bags are combined in a packaging transformation:
- Consumed bean value ($\Delta Q_{\text{beans}} \times U_{\text{beans}}$) + consumed pouch value ($\Delta Q_{\text{pouches}} \times U_{\text{pouches}}$) + direct packaging labor ($C_{\text{direct}}$) form the cost pool.
- The resulting packaged `InventoryLot` is assigned its final unit cost per portioned bag.

### 4. Exceptional Losses (Adjustments)
If an `InventoryLot` suffers damage or spoilage, an `InventoryAdjustment` reduces $Q_{\text{lot}}$, generating an unrecovered inventory write-off expense evaluated at $U_{\text{lot}}$.

---

# Architectural Invariants

1. **No Algorithmic Valuation in Inventory Engine:** The Inventory Engine never calculates cost pools or multi-child allocations independently; it requests valuations from the Costing Engine and stores the resulting $U_{\text{lot}}$.
2. **Deterministic Ledger Traceability:** Every financial impact on inventory is captured in an `InventoryMovement` record with a snapshot of $U_{\text{lot}}$ and total cost impact.
3. **Decoupling from Commercial Pricing:** Inventory valuation represents **actual historical asset cost**, completely distinct from commercial selling prices (`retailPrice`, `wholesalePrice`) on `SKUMaster`.

