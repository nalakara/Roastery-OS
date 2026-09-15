# Phase 18 Implementation Discovery: Insights + Traceability + AI Experience

**Phase Status:** COMPLETE & GREEN  
**Author:** Antigravity  
**Domain Layer Status:** Zero backend schema or contract expansions required. 100% experience layer execution over existing authoritative endpoints.

---

## 1. Executive Summary

Phase 18 connects the operational capabilities developed in earlier phases into three cohesive user-facing views:
1. **Insights Hub**: Operational signals and analytical perspectives.
2. **Physical Traceability**: End-to-end lineage visualization from origin to dispatch.
3. **Ask Roastery OS**: Evidence-first ambient and contextual AI operational reasoning.

Mental Model:
$$\text{PHYSICAL REALITY} \longrightarrow \text{OPERATIONS} \longrightarrow \text{COMMERCIAL / ECONOMIC CONSEQUENCE} \longrightarrow \text{INSIGHTS} \longrightarrow \text{REASONING}$$

---

## 2. Key Discoveries & Architectural Alignments

### A. Operational Signals & Attention Feed (Insights Hub)
- **Problem**: Traditional BI dashboards overwhelm roastery managers with dozens of charts lacking operational context.
- **Solution**: The Signals feed surfaces meaningful items detected by `IntelligenceEngineService` (`LOW_AVAILABLE_STOCK`, `AGING_PARTIAL_LOT`, `YIELD_DEVIATION`, `COST_ANOMALY_HPP`, `MARGIN_COMPRESSION`, `CROSS_MODULE_BOTTLENECK`, `SUPPLIER_RISK`).
- **Breakdown Pattern**:
  - **What Happened**: Clear descriptive title (e.g. *Stok Menipis & Tekanan Alokasi*).
  - **Why It Matters**: Plain-language operational risk explanation.
  - **Evidence Matrix**: Concrete proof items categorized into `FACT` (physical readings), `DERIVED` (system calculations), or `HEURISTIC` (heuristic pattern).
  - **Contextual Actions**: Direct bridge buttons (`[Buka Objek]` and `[Investigasi via AI]`).

### B. Focused Operational Analytics (Not Generic BI)
- Exposed 5 purposeful operational perspectives:
  1. **Green Coffee Availability & Stock Level**: Inventory positions and low-stock watch.
  2. **Recent Roast Yield & Efficiency**: Batch yield percentages and variance thresholds ($80\% - 88\%$).
  3. **Production Cost Movement (HPP)**: Full absorption unit cost and conversion cost tracking.
  4. **Commercial Margin**: SKU profit margins, realization vs baseline.
  5. **Supplier Reliability**: Defect rates and procurement spend.

### C. Physical Traceability (Lineage Without DAG Jargon)
- **Problem**: Technical graph terms ("Directed Acyclic Graph", "DAG", "Edge", "Node") confuse roastery operators.
- **Solution**: Human-centered step-by-step lineage cards:
  $$\text{1. Asal Petani \& Penerimaan} \longrightarrow \text{2. Transformasi Hulu (Sangrai/Blend)} \longrightarrow \text{3. Pengemasan SKU} \longrightarrow \text{4. Pengiriman Komersial (POS/Wholesale)}$$
- Fully bidirectional: clicking an upstream lot or downstream order navigates into that context instantly without losing place.

### D. Ambient & Contextual "Ask Roastery OS" (AI Reasoning)
- **Strict Read-Only Enforcement**: The AI reasoning endpoint (`/api/ai/query` calling `OperationalReasoningService`) performs zero mutations, creates no background jobs, and triggers no autonomous writes.
- **Evidence-First Presentation**: Every answer cites its source entities and classifies certainty (`FACT`, `DERIVED`, `HEURISTIC`).
- **Context Preservation**: Triggering "Tanya AI" from `Lot 360°`, `SKU 360°`, or `Order 360°` automatically binds the entity's reference (lot number, SKU code, or order ID) into the reasoning query.

---

## 3. Files Modified & Created

1. `packages/app-api/public/index.html`:
   - Expanded `#hub-view-insights` into 3 sub-navigation views (`signals`, `analytics`, `traceability`).
   - Integrated Ambient AI Reasoning Drawer (`#ai-reasoning-drawer`).
2. `packages/app-api/public/app.css`:
   - Added styles for `.insights-subview`, `.signal-card`, `.lineage-step-node`, and AI evidence badges.
3. `packages/app-api/public/app.js`:
   - Implemented `switchInsightsSubtab()`, `loadInsightsHubData()`, `loadInsightsSignals()`, `loadInsightsAnalytics()`, `inspectLotTraceability()`, and `openAskRoasteryAi()`.
   - Added contextual AI bridge triggers into `openLot360`, `openSku360`, and `openOrder360`.
4. `packages/app-api/src/__tests__/frontend-experience-integration.test.ts`:
   - Added automated tests for Phase 18 UI components, intelligence signals, traceability lineage resolution, and read-only AI grounding.

---

## 4. Acceptance Journeys Verified

- **Journey A (Operational Signal)**: Navigated from TODAY/Insights signal $\rightarrow$ Evidence Matrix $\rightarrow$ Object context.
- **Journey B (Traceability)**: Traversed physical lot from green coffee receipt through roasting, packaging, and commercial dispatch.
- **Journey C (Commercial Traceability)**: Started from SKU 360 $\rightarrow$ Traced backwards to green lot and supplier origin.
- **Journey D (AI Investigation)**: Evaluated signal $\rightarrow$ Asked Roastery OS $\rightarrow$ Received grounded response with evidence matrix.
- **Journey E (Contextual AI)**: Queried AI from inside Lot 360 $\rightarrow$ Context preserved.
- **Journey F (Constraint Investigation)**: Queried stock shortage $\rightarrow$ AI explained constraint with zero writes.
