# Roastery OS — AntiSlop Development Governance Index

This directory contains the **AntiSlop Governance Suite**, serving as the authoritative reference for visual, copy, code comment, layout, and human-interface quality standards across Roastery OS.

---

## 1. Directory Structure & Governance Concerns

| Directory / Skill | Governance Scope | Key Responsibilities |
|---|---|---|
| [`antislop/`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/antislop/antislop/SKILL.md) | **Core AntiSlop Filter & Delivery Gate** | Universal quality baseline (Rules R-01 to R-38), Purpose Test, Three Tiers of Rules, Energy/Rhythm/Motion dials, and final Delivery Gate. |
| [`antislop-code/`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/antislop/antislop-code/SKILL.md) | **Code Comment Hygiene** | Filters out decorative separators, workflow narration, empty labels, and redundant signature echoes. Preserves domain invariants, equations, and concurrency rules. Never alters executable logic. |
| [`antislop-copywriting/`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/antislop/antislop-copywriting/SKILL.md) | **Copy, Text & Terminology** | Eliminates generic AI buzzwords (*unlock, elevate, seamless*), significance inflation, and fabricated claims. Enforces precise, factually grounded operational vocabulary. |
| [`antislop-human/`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/antislop/antislop-human/SKILL.md) | **Accessibility & Human Usability** | Enforces WCAG AA compliance (4.5:1 text contrast, 3:1 non-text contrast), focus rings, error states, and keyboard ergonomics. Includes automated Python contrast checkers. |
| [`antislop-layoutmobile/`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/antislop/antislop-layoutmobile/SKILL.md) | **Responsive & Mobile Layout** | Governs content-driven breakpoints, fluid typography (`clamp()`), avoidance of fixed-height viewport traps (`100vh`), and minimum 44×44px tap targets. |
| [`antislop-ui/`](file:///Users/yudhan/Documents/FRAMEWORKS/Roastery%20OS/antislop/antislop-ui/SKILL.md) | **UI & Visual Craft** | Bans generic AI aesthetic clichés (blue-purple gradients, excessive glassmorphism, universal shadows/glows, decorative placeholder grids). Enforces intentional hierarchy and contrast. |

---

## 2. Applicability to Roastery OS

Roastery OS is an industrial ERP system for specialty coffee roasting, physical inventory tracking, and unit-aware cost accounting. The AntiSlop suite is applied as follows:

1. **Domain Integrity Alignment**:
   - AntiSlop's hard prohibition on fabricated data (R-17, R-36, R-38) aligns with Roastery OS's frozen domain ontology where inventory quantities, valuations, and provenance are strictly grounded in PostgreSQL records.
2. **Operations-First Visual Design**:
   - Operational screens prioritize data legibility, structured tables, and clear status badges over cosmetic decorations or artificial glassmorphism.
3. **Precise Operational Language**:
   - UI labels and messages use domain-specific terms (`InventoryLot`, `Transformation`, `Mass Loss`, `Full Absorption`, `Purchase Receipt`) rather than generic SaaS filler.
4. **Accessibility on the Roastery Floor**:
   - All text, table headers, badges, and controls must pass WCAG AA contrast standards to ensure readability under varying lighting conditions in roasting bays and warehouses.

---

## 3. How Agents Consult AntiSlop During Development

When working on tasks in Roastery OS, agents must follow this workflow:

1. **Task Identification**:
   - Building or editing frontend screens / HTML / CSS → Consult `antislop/antislop/SKILL.md`, `antislop-ui/SKILL.md`, and `antislop-layoutmobile/SKILL.md`.
   - Writing user-facing text, error messages, or documentation → Consult `antislop-copywriting/SKILL.md`.
   - Modifying code comments, docstrings, or technical notes → Consult `antislop-code/SKILL.md`.
   - Checking color palettes, badges, or interactive states → Consult `antislop-human/SKILL.md`.
2. **Execution Guardrails**:
   - Follow the **Purpose Test**: Every visual element, label, or comment must serve a documented operational or domain requirement.
   - Do not add decorative AI artifacts (e.g. colored orbs, floating cards, empty hype copy).
3. **Delivery Gate Verification**:
   - Review proposed changes against the Delivery Gate checklist before finalizing frontend or documentation deliverables.

---

## 4. Governance Layer Mapping

```
┌────────────────────────────────────────────────────────────┐
│         ROASTERY OS DOMAIN ARCHITECTURE & SPECIFICATION    │
│  (Authoritative Domain Entities, Contracts, PostgreSQL DDL)│
└──────────────────────────────┬─────────────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│       TECHNICAL LOGIC        │        │   HUMAN INTERFACE & COPY     │
│                              │        │                              │
│ • Domain Logic: contracts/   │        │ • UI/Visual: antislop-ui     │
│ • Application Services       │        │ • Mobile: antislop-layout    │
│ • Code Comments:             │        │ • Copy: antislop-copywriting │
│   antislop-code              │        │ • Usability: antislop-human  │
└──────────────────────────────┘        └──────────────────────────────┘
```
