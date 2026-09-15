# PHASE 19 — AUTHORITATIVE IMPLEMENTATION SCOPE CONTRACT

**Document Type:** Authoritative Scope Contract for Phase 19 Frontend Consolidation  
**Audit Reference:** [PHASE_19_UX_AUDIT.md](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/PHASE_19_UX_AUDIT.md)  
**Implementation Rule:** Only items classified as `VERIFIED_FRICTION` or `JUSTIFIED_PRODUCTIZATION` enter this implementation scope. All speculative ideas remain strictly in `DEFERRED_ENHANCEMENTS`. Zero backend/domain mutations permitted.

---

## 1. Scope Summary

Phase 19 consolidates the Roastery OS frontend experience into an intuitive, work-first instrument. Grounded by the hardened audit in `PHASE_19_UX_AUDIT.md`, this contract defines the exact, bounded set of changes to be executed in the next implementation step.

---

## 2. In-Scope Implementation Tasks

### 2.1 Verified UX Friction Fixes (`VERIFIED_FRICTION`)

1. **Fix Today Cockpit Attention Card Header Routing (`TODAY-01`)**:
   - **File:** `packages/app-api/public/index.html` (line 134)
   - **Problem:** "Lihat Semua $\rightarrow$" button calls `app.showScreen('operational-intelligence')`, breaking out of the primary hub into legacy diagnostic screen 23.
   - **Target Fix:** Change `onclick` handler to switch to primary Insights Hub: `app.switchHub('insights')` and `app.switchInsightsSubtab('signals')`.

2. **Fix Today Cockpit Recent Batches Header Routing (`TODAY-02`)**:
   - **File:** `packages/app-api/public/index.html` (line 171)
   - **Problem:** "Riwayat Batch $\rightarrow$" button calls `app.showScreen('roast-history')`, breaking out into legacy diagnostic screen 6.
   - **Target Fix:** Change `onclick` handler to switch to primary Production Hub: `app.switchHub('production')` and `app.switchProdSubtab('history')`.

3. **Fix Signal Action Drilldown Routing in Today Cockpit (`TODAY-03`)**:
   - **File:** `packages/app-api/public/app.js` (line 189 & line 7257)
   - **Problem:** `drilldownAction` routes directly to legacy diagnostic screens via `this.showScreen(targetScreen)`.
   - **Target Fix:** Update `drilldownAction` to route to the appropriate primary hub subtab (e.g. `insights/signals`, `production/roast`, `inventory/stock`) or open the relevant contextual 360 drawer (`Lot 360`, `Order 360`) if an entity identifier is provided.

---

### 2.2 Justified Productization Consolidations (`PRODUCTIZATION_OPPORTUNITY`)

1. **Continuous Roast-to-Packaging Bridge (`PROD-01`)**:
   - **File:** `packages/app-api/public/index.html` & `packages/app-api/public/app.js`
   - **Description:** Maintain the `[📦 Kemas Lot Ini Jadi SKU →]` CTA button on the Production Result Hero (`startPackagingFromProductionResult()`) that directly opens the Packaging workspace with the newly roasted lot pre-selected as the coffee input.

2. **Actionable Empty Table Guidance (`INV-03`)**:
   - **File:** `packages/app-api/public/app.js`
   - **Description:** Replace generic empty messages with contextual instructions explaining what work to perform to populate that inventory category (e.g. "Belum ada kopi sangrai. Buka tab Produksi untuk memanggang batch pertama.").

3. **Signal Cards Direct Object Drawer Links (`INS-01`)**:
   - **File:** `packages/app-api/public/app.js`
   - **Description:** When an intelligence signal references a concrete entity (e.g. a specific `lotNumber` or `orderId`), display a direct `[🔍 Buka Objek]` button alongside the existing `[🧠 Tanya AI]` reasoning trigger.

---

## 3. Diagnostic Compatibility Governance

- All 24 milestone diagnostic screens remain functional and accessible behind the `⚙️ Toggle Diagnostic Subnav` header button (`btn-toggle-diag` / `diagnostic-nav-wrapper`).
- Primary product navigation (Sidebar 5-Hubs and Top Bar) must **never** route into the diagnostic overlay.
- Capabilities represented by the diagnostic milestone surfaces are now fully available through the integrated product experience.

---

## 4. Deferred Enhancements (`DEFERRED_ENHANCEMENTS`)

The following items were evaluated during the audit and are **explicitly deferred** to prevent scope creep:

| Item ID | Description | Reason for Deferral |
| :--- | :--- | :--- |
| **DEF-01** | Extra KPI analytics cards on Today Cockpit (`TODAY-05`). | Cockpit is designed as an operational command post, not a BI dashboard. Existing attention count and summary metrics are sufficient. |
| **DEF-02** | Automated one-click replenishment PO generation. | Out of scope. Violates the read-only AI boundary and automated procurement boundaries. |
| **DEF-03** | Merging Wholesale Desk and POS Counter into a single unified sales screen. | B2B contract lifecycle (draft $\rightarrow$ confirm $\rightarrow$ reserve $\rightarrow$ fulfill) and Retail POS (immediate checkout) have distinct operational requirements. Forcing them together damages usability. |
| **DEF-04** | Custom dashboard widgets and drag-and-drop report builders. | Out of scope. Roastery OS is an operational instrument, not a generic BI platform. |
| **DEF-05** | Direct invoice PDF generation and accounting integrations. | Strictly out of MVP scope as defined by project foundation contracts. |

---

## 5. Verification & Acceptance Criteria

Before declaring GREEN in Phase 19 implementation:
1. `npm run build && npm test` must pass 100% across all packages (`@roastery-os/domain-core`, `@roastery-os/application-services`, `@roastery-os/infrastructure-postgres`, `@roastery-os/contracts`, `@roastery-os/app-api`).
2. Primary Today Cockpit header buttons and signal drilldown actions must stay within the 5-Hub product shell without opening diagnostic views.
3. All 6 Phase 19 Acceptance Journeys (A through F) must be covered by automated integration tests in `packages/app-api/src/__tests__/frontend-experience-integration.test.ts`.
4. Zero backend/domain contracts or database schema changes.
