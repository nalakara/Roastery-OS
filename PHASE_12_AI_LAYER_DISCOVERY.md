# PHASE 12 — AI LAYER / OPERATIONAL REASONING DISCOVERY & ARCHITECTURE

**Status**: COMPLETED & VERIFIED (`GREEN / GO`)  
**Package Scope**: `@roastery-os/contracts`, `@roastery-os/domain-core`, `@roastery-os/application-services`, `@roastery-os/infrastructure-postgres`, `@roastery-os/app-api`  
**Date**: September 2026

---

## 1. Preflight Findings & Architecture Positioning

Phase 12 completes the cognitive spine of Roastery OS by introducing an **Operational Reasoning Layer** built strictly on top of the established physical, economic, commercial, analytical, and intelligence foundations:

```
DOMAIN SYSTEM (Physical Ledger, Costing, Commercial Orders, Traceability DAG)
      ↓
ANALYTICS (Aggregated Read Models, Yield Ratios, Gross Margin, Supplier Breakdown)
      ↓
INTELLIGENCE (Deterministic Anomaly Rules, Severity Alerts, Threshold Evaluation)
      ↓
EVIDENCE MATRIX (Normalized [FACT], [DERIVED], and [HEURISTIC] Records)
      ↓
AI REASONING (Operational Interpretation & Contextual Synthesis)
      ↓
HUMAN DECISION (Operator Authorization via Dedicated Workflow Screens)
```

### Absolute Operational Truth vs. Advisory AI
- **Physical Truth**: Owned exclusively by `InventoryLot` and `stock_ledger_movement` (Module 02).
- **Economic Truth**: Owned exclusively by `CostEvent`, `lot_valuation_record`, and `cogs_record` (Module 07).
- **Lineage Truth**: Owned exclusively by `provenance_edge` (Module 08).
- **Analytical Truth**: Owned exclusively by `AnalyticsPostgresRepository` (Module 11).
- **Anomaly Detection Truth**: Owned exclusively by `IntelligenceEngineService` (Module 11).
- **AI Role (Module 12)**: Strictly an **interpretation, reasoning, and explanation engine**. It never mutates domain records and never acts as a source of truth.

---

## 2. AI Boundary & Anti-Patterns Rejected

1. **NO Autonomous State Mutation**: The AI engine has zero write tools. It cannot create purchase orders, cannot reserve or consume inventory, cannot complete transformations, cannot change prices, and cannot modify recipes.
2. **NO Generic Chatbot Aesthetic**: Rejected floating avatars, open-ended "chat with ChatGPT" sidebars, motivational chit-chat, and fake thinking animations. The interface is strictly "Ask about the operation."
3. **NO Arbitrary SQL or Database Access**: The AI reasoner receives bounded, schema-validated DTOs and Evidence Bundles retrieved deterministically via service interfaces.
4. **NO Hallucinated Operational Facts**: When required context is missing (such as unrecorded cupping quality scores or unrecorded operator behavioral notes), the AI explicitly identifies the data gap and acknowledges uncertainty.

---

## 3. Supported Question Types & Operational Domains

The AI layer supports bounded, high-value operational inquiries:

| Domain | Example Questions | Retrieved Evidence Context |
| :--- | :--- | :--- |
| **Traceability & Provenance** | *"Where did this finished lot come from?"*<br>*"Which green lots contributed to this SKU?"* | Finished Lot ID, Packaging Transformation, Blend Lot, Roasting Transformation, Green Bean Lot, Purchase Receipt, Supplier. |
| **Costing & HPP Explanation** | *"Why is House Blend HPP high?"*<br>*"Where did this lot's cost come from?"* | Lot Unit Cost, Absorbed Material Cost, Direct Conversion Cost, Roasting/Blend Yield Ratio. |
| **Inventory & Fulfillment Pressure** | *"Why is House Blend 1KG under fulfillment pressure?"*<br>*"How much coffee is currently available?"* | Physical On-Hand Quantity, Wholesale Reserved Quantity, Free Available Stock, Commercial Order Commitments. |
| **Operational Intelligence Alerts** | *"What needs attention right now?"*<br>*"Why is this flagged with a Warning?"* | Active Intelligence Signals, Severity Levels, Rule Triggers, Evidence Matrix items. |
| **Supplier Gaps & Procurement Risk** | *"What information is missing for deciding whether this supplier is risky?"* | Supplier Spend Concentration, Receipt Count, Explicit Acknowledgment of missing sensory/quality data. |
| **Production Yield Deviations** | *"Which roast transformations had unusual yield?"* | Batch Inputs, Outputs, Unrecoverable Chaff/Waste, Benchmark Yield Ratio ($82.0\%$). |

---

## 4. Evidence-First Response Contract

All AI responses adhere to a typed, structured contract defined in `@roastery-os/contracts`:

```typescript
export type AiReasoningCertainty = 'FACT' | 'DERIVED' | 'HEURISTIC';

export interface AiSourceRef {
  readonly entityType: 'INVENTORY_LOT' | 'TRANSFORMATION' | 'COMMERCIAL_ORDER' | 'SKU' | 'SUPPLIER' | 'PURCHASE_RECEIPT' | 'INTELLIGENCE_SIGNAL' | 'COST_RECORD';
  readonly entityId: string;
  readonly entityCode?: string;
  readonly summary?: string;
}

export interface AiReasoningEvidenceItem {
  readonly label: string;
  readonly value: string;
  readonly certainty: AiReasoningCertainty;
  readonly sourceRef?: AiSourceRef;
}

export interface AiReasoningResponse {
  readonly question: string;
  readonly interpretedIntent: string;
  readonly answer: string;
  readonly reasoningSummary: string;
  readonly evidence: readonly AiReasoningEvidenceItem[];
  readonly sourceRefs: readonly AiSourceRef[];
  readonly uncertainty?: string;
  readonly suggestedFollowups: readonly string[];
  readonly evaluatedAt: Date;
}
```

---

## 5. FACT / DERIVED / HEURISTIC Taxonomy Preservation

The AI reasoning engine strictly preserves the certainty taxonomy from Phase 11:
- `[FACT]`: Direct database records (e.g. `Sisa stok: 10.00 BAG`, `Kuantitas tereservasi: 8.00 BAG`, `Total HPP: IDR 250,000`).
- `[DERIVED]`: Deterministic mathematical calculations (e.g. `Rendemen roasting: 83.0%`, `Gross Margin: 28.57%`).
- `[HEURISTIC]`: Acuan operasional atau threshold peringatan (e.g. `Batas rendemen minimum 82.0%`, `Batas konsentrasi belanja pemasok 75.0%`).

---

## 6. AI Provider Abstraction & Offline Determinism

To ensure the test suite and local development environment run reliably without external API dependencies or hardcoded secrets, the architecture defines an `AIProvider` interface:

```typescript
export interface AIProvider {
  reason(request: {
    question: string;
    evidenceBundle: OperationalEvidenceBundle;
  }): Promise<{
    answer: string;
    reasoningSummary: string;
    uncertainty?: string;
    suggestedFollowups: string[];
  }>;
}
```

- **`DeterministicOperationalReasoner`**: Default offline reasoner that synthesizes grounded operational answers directly from the structured `OperationalEvidenceBundle`.
- Pluggable design allows future remote LLM providers (e.g. Google Gemini API) to be injected without changing application service or API layer contracts.

---

## 7. Multi-Module Reasoning Demonstration

### Query: *"Why is House Blend 1KG under fulfillment pressure?"*

1. **Context Retrieved**:
   - Physical Inventory: On-hand $= 10.00\text{ BAG}$, Reserved $= 8.00\text{ BAG}$, Available $= 2.00\text{ BAG}$.
   - Commercial Orders: Wholesale Order `WS-ORD-2026-001` has active reservation of $8.00\text{ BAG}$.
   - Upstream Supply: Roasted house blend lot has $0\text{ KG}$ unreserved available stock.
2. **Grounded Answer**:
   > *"Kondisi persediaan saat ini memiliki total stok fisik on-hand sebesar 10.00 BAG, dengan stok bebas tersedia sebesar 2.00 BAG. Terdapat komitmen reservasi pesanan komersial aktif sebesar 8.00 BAG yang mengikat ketersediaan fisik. Kondisi ini membatasi kapasitas pemenuhan pesanan instan tanpa jadwal produksi baru."*
3. **Evidence Matrix Cited**:
   - `[FACT]` Lot Tereservasi Komersial: `LOT-FG-HOUSE-1KG: 8.00 BAG dari 10.00 BAG` (Ref: `INVENTORY_LOT LOT-FG-HOUSE-1KG`)
   - `[FACT]` Total Komitmen Reservasi Wholesale: `8.00 unit/kg`
   - `[FACT]` Total Stok Bebas Tersedia: `2.00 unit/kg`
4. **Suggested Followups**:
   - *Berapa banyak roasted bean yang siap untuk dikemas?*
   - *Jadwalkan batch pengemasan untuk menambah ketersediaan stok bebas.*

---

## 8. Data Gaps & Uncertainty Handling Demonstration

### Query: *"What information is missing for deciding whether this supplier is risky?"*

1. **Context Retrieved**:
   - Total Procurement Spend: $\text{IDR } 15,000,000$ (3 PO receipts from Koperasi Petani Bajawa).
2. **Grounded Answer & Explicit Uncertainty**:
   > **Answer**: *"Berdasarkan catatan penerimaan pengadaan: Tercatat 3 kali penerimaan dengan total pembelanjaan IDR 15,000,000. Analisis ketergantungan pasokan menunjukkan konsentrasi belanja pada pemasok utama."*  
   > **Uncertainty (Data Gap)**: *"Sistem mencatat kuantitas, harga faktur, dan tanggal kedatangan barang, namun TIDAK mencatat skor kualitas sensori (cupping score), tingkat cacat fisik defect green bean per karung, atau performa kepatuhan SLA pengiriman pemasok. Tidak dapat ditarik kesimpulan mengenai kualitas intrinsik kopi tanpa data sensori tersebut."*

---

## 9. Diagnostic UI (Screen 24: AI Penalaran Operasional)

The web console provides **Screen 24 (`#screen-operational-ai`)**:
- **Question Input & 6 Quick Operational Presets**.
- **Grounded Answer Panel**: Displays Intent badge, Timestamp, and Grounding confirmation.
- **Synthesized Answer & Reasoning Flow**: Highlights logic chain.
- **Verified Evidence Grid**: Tiles displaying `[FACT]`, `[DERIVED]`, and `[HEURISTIC]` certainty tags with source record references.
- **Data Gaps / Uncertainty Callout**: High-visibility amber box surfacing unrecorded or missing variables.
- **Clickable Suggested Followup Questions**: Routes follow-up inquiries with one click.

---

## 10. Verification & Test Suite Results

1. **Unit Tests (`packages/application-services/src/__tests__/ai-query.test.ts`)**:
   - `✔ 1. Traceability Reasoning: answers origin question with grounded Green lot & Supplier evidence`
   - `✔ 2. Cost Reasoning: explains HPP structure using absorbed material cost and conversion fee`
   - `✔ 3. Multi-Module Inventory Reasoning: detects fulfillment reservation pressure on finished goods`
   - `✔ 4. Hallucination Resistance & Data Gaps: explicitly states uncertainty when asked about unrecorded supplier quality`
2. **Integration Tests (`packages/app-api/src/__tests__/ai-api-integration.test.ts`)**:
   - `✔ 1. POST /api/ai/query handles origin/traceability question and returns grounded evidence`
   - `✔ 2. POST /api/ai/query handles cost explanation question and cites absorbed cost records`
   - `✔ 3. POST /api/ai/query handles missing data questions and acknowledges uncertainty explicitly`
   - `✔ 4. POST /api/ai/query rejects invalid or empty question payloads`
3. **Workspace Regression Results**:
   - **88 tests passing across all packages (100% pass rate, 0 failures, 0 skipped)**.

---

## 11. Final Assessment & Recommendation

| Component | Status | Verification |
| :--- | :--- | :--- |
| **Contracts** | `GREEN` | Explicit evidence, source refs, certainty tags, and response structures. |
| **Application Services** | `GREEN` | Bounded retrieval, certainty tagging, deterministic reasoning. |
| **Provider Abstraction** | `GREEN` | Offline deterministic execution, no external API keys required. |
| **API Endpoints** | `GREEN` | `POST /api/ai/query` fully integrated and validated. |
| **Diagnostic UI** | `GREEN` | Screen 24 with Evidence Matrix, Uncertainty Box, and Quick Presets. |
| **Multi-Tenant Isolation** | `GREEN` | Tenant isolation strictly enforced on all retrieved evidence context. |
| **Non-Mutating Boundary**| `GREEN` | Zero write operations or autonomous execution pathways exist. |

### Overall Phase 12 Status: **`GREEN / COMPLETE`**
