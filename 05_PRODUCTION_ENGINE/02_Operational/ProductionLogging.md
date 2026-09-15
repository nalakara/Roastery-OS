# Production Logging

## Purpose

This document defines the production logging philosophy and operational telemetry behavior used inside the Production Engine of Roastery OS.

The purpose of Production Logging is to:
- capture real-time operational execution telemetry across diverse conversion archetypes,
- preserve physical scrap, purge, and mass balance records,
- maintain unbroken operational history and quality validation records,
- and provide full contextual traceability for every `ProductionBatch`.

Production logging acts as the operational memory of how material transformations were executed.

---

# Core Philosophy

Roastery OS treats production logging as:
- operational history preservation,
- measurable manufacturing telemetry,
- and quality verification documentation.

Production logging is not merely informal notes; it captures structured operational events and measurements essential for yield analysis and quality audits.

---

# Core Logging Dimensions by Conversion Archetype

### 1. Mechanical Conversion (Grinding / Milling)
- **Target Parameters:** Micron particle size target, grinder burr setting / RPM.
- **Physical Telemetry:** Input bean mass, output ground mass, grinder retention mass (purge), chamber temperature.

### 2. Phase / Liquid Extraction (Cold Brew / Concentrate)
- **Target Parameters:** Target brew ratio (coffee-to-water), grind size, water mineral profile.
- **Physical Telemetry:** Water volume added, extraction contact time, brew temperature, gross liquid yield (L), grain absorption retention, final TDS (Total Dissolved Solids) / Brix %.

### 3. Discrete Portioning (Drip Bags / Filter Pouches)
- **Target Parameters:** Target dose per sachet (e.g. $12.0\text{ g} \pm 0.2\text{ g}$), nitrogen flush target.
- **Physical Telemetry:** Bulk ground coffee consumed, total finished sachets produced, sealing defect count, nitrogen residual oxygen %.

### 4. Formulation & Bottling (RTD / Beverage Prep)
- **Target Parameters:** Recipe formulation ratios (extract + water + syrup/flavoring), bottle target volume.
- **Physical Telemetry:** Volume consumed per ingredient, total filled bottle count, capping torque verification, fill level variance.

### 5. Assembly & Kitting (Gift Sets / Variety Packs)
- **Target Parameters:** BOM component checklist (Pack A + Pack B + Outer Gift Box + Insert Card).
- **Physical Telemetry:** Component lot counts consumed, finished kit unit counts produced, damaged packaging scrap.

### 6. Decanting / Repurposing (Rework)
- **Target Parameters:** Target bulk intermediate conversion.
- **Physical Telemetry:** Packaged lots decanted, recovered coffee mass, discarded packaging scrap mass/count.

---

# Logging Structure Specification

Every log entry attached to a `ProductionBatch` preserves:
- `logId`: UUID string.
- `timestamp`: UTC timestamp of the observation.
- `operatorId`: User recording the log.
- `logCategory`: `PROCESS_TELEMETRY`, `MASS_BALANCE`, `QUALITY_CHECK`, `SCRAP_EVENT`, or `OPERATOR_NOTE`.
- `structuredData`: Key-value pairs capturing quantitative metrics (e.g. `{"tds": 1.45, "yield_liters": 18.5, "retention_g": 35}`).
- `notes`: Human-readable context or anomaly explanation.

---

# Summary

Production logging captures deterministic process measurements and quality telemetry across all transformation archetypes, ensuring complete transparency and operational accountability inside Roastery OS.

