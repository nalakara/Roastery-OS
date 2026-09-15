# PHASE 11 — OPERATIONAL INTELLIGENCE & DECISION SUPPORT DISCOVERY & ARCHITECTURE

**Status**: COMPLETED & VERIFIED  
**Package Scope**: `@roastery-os/contracts`, `@roastery-os/domain-core`, `@roastery-os/application-services`, `@roastery-os/infrastructure-postgres`, `@roastery-os/app-api`  
**Date**: September 2026

---

## 1. Executive Summary & Philosophy

Phase 11 introduces the **Operational Intelligence & Decision Support Layer** for Roastery OS. Building upon the foundational analytical read models established in Phase 10, Phase 11 synthesizes cross-module operational facts across:

- **Physical Inventory**: Lot states, available vs reserved quantities, and aging duration.
- **Transformations**: Physical yield ratios, unrecoverable waste percentages, and process execution status.
- **Economic Costing**: Actual accumulated unit costs (HPP), material cost vs conversion cost allocations, and category baseline deviations.
- **Commercial Performance**: Gross margins per channel and SKU, fulfilled vs pending order commitments.
- **Procurement & Supplier Contribution**: Purchase spend concentration, supplier diversification, and receipt histories.
- **Lineage & Provenance**: Upstream farm/receipt traceability linked through roasting, blending, packaging, and commercial dispatches.

### Non-Negotiable Architectural Commitments
1. **Decision Support, Not Autonomous Mutation**:
   - The intelligence engine is strictly advisory (`advisory-only`).
   - No automatic purchasing, pricing adjustments, recipe tampering, or production triggers are executed without explicit human authorization.
2. **Deterministic Rules & Inspectable Evidence First**:
   - Every operational signal is grounded in verifiable evidence items.
   - Every piece of evidence is explicitly tagged with certainty levels: `[FACT]`, `[DERIVED]`, or `[HEURISTIC]`.
3. **Strict Domain & Tenant Isolation**:
   - The intelligence engine respects multi-tenant boundaries (`organization_id = $1`).
   - Domain invariants and the frozen ontology are strictly preserved without bypassing validation rules.

---

## 2. Evidence Taxonomy: FACT, DERIVED, and HEURISTIC

To eliminate "black-box" guessing and uphold zero-hallucination standards, every signal emitted by `IntelligenceEngineService` provides a structured **Evidence Matrix** classified into three distinct categories:

| Certainty Level | Definition | Roastery OS Examples |
| :--- | :--- | :--- |
| **`FACT`** | Unambiguous, authoritative records directly recorded in the system ledger or transaction logs. | Sisa stok on-hand (`20.00 KG`), status lot (`ACTIVE`), kuantitas tereservasi (`85.00 KG`), total penerimaan PO (`8`), total pendapatan penjualan (`IDR 1,000,000`). |
| **`DERIVED`** | Mathematically derived values computed deterministically from multiple authoritative facts. | Rendemen fisik (`78.00%`), Gross Margin (`20.00%`), deviasi HPP terhadap rata-rata kategori (`+23.4%`), rasio reservasi stok (`85.0%`), pangsa belanja pemasok (`85.0%`). |
| **`HEURISTIC`** | Configurable operational thresholds, industry benchmarks, or target policies used as criteria for attention. | Batas minimum rendemen roasting (`82.0%`), batas stok minimum biji kopi (`10.0 KG`), batas penuaan lot tersisa (`7 Hari`), target margin kotor minimum (`25.0%`), batas konsentrasi belanja pemasok (`75.0%`). |

---

## 3. Supported Signal Types & Detection Rules

The deterministic intelligence engine evaluates six core rule suites across operational domains:

```
+------------------------------------------------------------------------------------+
|                             INTELLIGENCE ENGINE RULES                              |
+--------------------------+--------------------+-----------+------------------------+
| Signal Type              | Domain             | Severity  | Trigger Condition      |
+--------------------------+--------------------+-----------+------------------------+
| LOW_AVAILABLE_STOCK      | INVENTORY          | CRIT/WARN | avail == 0 (CRITICAL)  |
|                          |                    |           | avail <= min (WARNING) |
| AGING_PARTIAL_LOT        | INVENTORY          | ATTENTION | ageDays >= 7 & onHand>0|
| YIELD_DEVIATION          | PRODUCTION         | WARNING   | yield < 82.0% (Roast)  |
| COST_ANOMALY_HPP         | COSTING            | ATTENTION | HPP >= 15% > cat avg   |
| MARGIN_COMPRESSION       | COMMERCIAL         | WARNING   | Gross Margin < 25.0%   |
| CROSS_MODULE_BOTTLENECK  | CROSS_MODULE       | ATTENTION | reserved/onHand >= 70% |
| SUPPLIER_RISK            | SUPPLIER           | ATTENTION | spendShare >= 75.0%    |
+--------------------------+--------------------+-----------+------------------------+
```

### Detailed Signal Logic

1. **`LOW_AVAILABLE_STOCK`** (`INVENTORY`):
   - **Trigger**: Active lot has available quantity equal to zero (Severity: `CRITICAL`) or below diagnostic threshold (Severity: `WARNING`, e.g., $\le 10\text{ kg}$ for green/roasted coffee, $\le 5\text{ units}$ for packaging).
   - **Evidence**: `[FACT]` available qty, `[FACT]` reserved qty, `[HEURISTIC]` warning threshold.
   - **Suggested Action**: `INSPECT_LOT` (drills down into Traceability/Inventory) or `TRIGGER_ROAST`.

2. **`AGING_PARTIAL_LOT`** (`INVENTORY`):
   - **Trigger**: Active lot with physical quantity on hand that has been stored for $\ge 7\text{ days}$ since physical receipt.
   - **Evidence**: `[DERIVED]` age in days, `[FACT]` physical quantity remaining, `[FACT]` received date.
   - **Suggested Action**: `INSPECT_LOT` to prioritize older batches under FIFO scheduling.

3. **`YIELD_DEVIATION`** (`PRODUCTION`):
   - **Trigger**: Completed roasting transformation where physical output yield ratio is below the expected benchmark ($< 82.0\%$).
   - **Evidence**: `[DERIVED]` actual yield ratio, `[FACT]` raw input quantity, `[FACT]` roasted output quantity, `[FACT]` unrecoverable waste/chaff, `[HEURISTIC]` minimum yield benchmark ($82.0\%$).
   - **Suggested Action**: `INSPECT_TRANSFORMATION` (drills down into Roast Inspector).

4. **`COST_ANOMALY_HPP`** (`COSTING`):
   - **Trigger**: Finished goods lot unit cost (HPP) exceeds category average by $\ge 15.0\%$.
   - **Evidence**: `[FACT]` lot unit cost, `[DERIVED]` category average unit cost, `[DERIVED]` percentage deviation, `[HEURISTIC]` outlier threshold ($15.0\%$).
   - **Suggested Action**: `REVIEW_COSTING` (drills down into Finished Goods Inspector).

5. **`MARGIN_COMPRESSION`** (`COMMERCIAL`):
   - **Trigger**: Commercial SKU where gross margin percentage is below the target minimum ($< 25.0\%$).
   - **Evidence**: `[DERIVED]` actual gross margin %, `[FACT]` total revenue, `[FACT]` total COGS, `[HEURISTIC]` target minimum margin ($25.0\%$).
   - **Suggested Action**: `INSPECT_ORDER` or review product pricing catalog.

6. **`CROSS_MODULE_BOTTLENECK`** (`CROSS_MODULE`):
   - **Trigger**: Correlation between Physical Inventory and Commercial Wholesale Reservations where $\ge 70.0\%$ of on-hand inventory is locked by commercial orders.
   - **Evidence**: `[FACT]` reserved quantity, `[FACT]` on-hand physical stock, `[DERIVED]` reservation ratio %.
   - **Suggested Action**: `TRIGGER_PACKAGING` (schedule packaging batch to replenish free stock).

7. **`SUPPLIER_RISK`** (`SUPPLIER`):
   - **Trigger**: Single supplier accounts for $\ge 75.0\%$ of all procurement expenditure across multiple suppliers.
   - **Evidence**: `[DERIVED]` supplier spend share %, `[FACT]` supplier total spend, `[FACT]` total procurement spend, `[HEURISTIC]` concentration limit ($75.0\%$).
   - **Suggested Action**: `INSPECT_SUPPLIER` (evaluate supply chain diversification).

---

## 4. REST API Contracts & Endpoints

| Method | Endpoint | Description | Query Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/intelligence/summary` | Aggregated intelligence summary with total counts, severity breakdown, domain breakdown, and full signal list. | None |
| `GET` | `/api/intelligence/signals` | Filterable list of active operational intelligence signals. | `severity` (`CRITICAL`, `WARNING`, `ATTENTION`, `INFO`), `domain` (`INVENTORY`, `PRODUCTION`, `COSTING`, `COMMERCIAL`, `SUPPLIER`, `CROSS_MODULE`) |
| `GET` | `/api/intelligence/signals/:signalId` | Detailed single signal payload with complete Evidence Matrix and Suggested Action. | None |

### Sample Response (`GET /api/intelligence/signals`):
```json
{
  "data": [
    {
      "signalId": "SIG-CROSS-RES-018f3a00",
      "signalType": "CROSS_MODULE_BOTTLENECK",
      "domain": "CROSS_MODULE",
      "severity": "ATTENTION",
      "title": "Tekanan Reservasi Tinggi pada Lot: LOT-FG-RES-2026 (85.0%)",
      "explanation": "85.0% dari total stok fisik pada lot Signature Espresso 1kg telah terikat oleh komitmen pesanan komersial. Ketersediaan bebas hanya tersisa 15.00 KG.",
      "evidence": [
        {
          "label": "Kuantitas Tereservasi",
          "value": "85.00 KG",
          "certainty": "FACT",
          "sourceRef": {
            "entityType": "INVENTORY_LOT",
            "entityId": "018f3a00-0000-7000-8000-000000000001",
            "entityCode": "LOT-FG-RES-2026"
          }
        },
        {
          "label": "Total Stok Fisik On-Hand",
          "value": "100.00 KG",
          "certainty": "FACT"
        },
        {
          "label": "Rasio Keterikatan Stok",
          "value": "85.0%",
          "certainty": "DERIVED"
        }
      ],
      "suggestedAction": {
        "label": "Jadwalkan Produksi Pengemasan Tambahan",
        "actionType": "TRIGGER_PACKAGING",
        "targetScreen": "prod-exec"
      },
      "detectedAt": "2026-09-15T06:24:00.000Z"
    }
  ]
}
```

---

## 5. Diagnostic UI (Screen 23: Intelijen & Keputusan)

Screen 23 (`#screen-operational-intelligence`) provides an AntiSlop, human-centered decision cockpit:
- **Severity Summary Cards**: Color-coded KPI counters for Critical (Red), Warning (Amber), Attention (Blue), and Total Active Signals (Emerald).
- **Interactive Filtering Bar**: Filter pills for Urgency (`ALL`, `CRITICAL`, `WARNING`, `ATTENTION`) and Domain dropdown selector.
- **Signal Cards**: Clear, structured cards displaying:
  - Header: Urgency badge, Domain tag, Signal ID, and Timestamp.
  - Title & Contextual Explanation: Plain-language operational Indonesian explanation.
  - **Evidence Matrix Grid**: Distinctly tagged `[FACT]`, `[DERIVED]`, and `[HEURISTIC]` evidence tiles with clickable entity references.
  - **Suggested Action Buttons**: Drilldown action buttons routing directly to corresponding operational execution screens (e.g. `roast-exec`, `prod-exec`, `traceability-explorer`, `proc-supplier`).

---

## 6. Test Suite & Verification Results

1. **Unit Tests** (`packages/application-services/src/__tests__/intelligence.test.ts`):
   - `✔ detects low stock and aging lot signals correctly with FACT/DERIVED/HEURISTIC evidence`
   - `✔ detects yield deviation and costing HPP outlier correctly`
   - `✔ detects margin compression, cross-module bottleneck, and supplier concentration correctly`
2. **API Integration Tests** (`packages/app-api/src/__tests__/intelligence-api-integration.test.ts`):
   - `✔ 1. GET /api/intelligence/summary returns aggregated counts and signals across domains`
   - `✔ 2. GET /api/intelligence/signals returns full signal list and supports severity filtering`
   - `✔ 3. GET /api/intelligence/signals supports domain filtering`
   - `✔ 4. GET /api/intelligence/signals/:signalId returns single signal or 404`
3. **Workspace Regression Test Suite**:
   - All 84 monorepo tests pass across all packages with 0 failures.

---

## 7. Operational Boundaries & AI Integration Readiness

| Responsibility | Handled in Phase 11 (Deterministic Layer) | Reserved for Future Generative AI / Agentic Layer |
| :--- | :--- | :--- |
| **Fact Gathering** | Read models from Postgres across all 6 domains. | Consumes structured read models via tool calls. |
| **Anomaly Detection** | Deterministic formulas and configurable thresholds. | Multi-variable pattern synthesis across long historical windows. |
| **Evidence Assembly** | Strict `FACT` / `DERIVED` / `HEURISTIC` matrix. | Explanations must cite provided matrix without hallucinating facts. |
| **Action Suggestion** | Deterministic UI screen routing & target entity IDs. | Natural language synthesis of recommended action plans. |
| **Operational Execution** | **Strictly Human Decision** via UI execution forms. | **Strictly Human Decision**; AI cannot mutate state autonomously. |
