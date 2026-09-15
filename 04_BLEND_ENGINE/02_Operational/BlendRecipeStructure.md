# Blend Recipe Structure

## Purpose

This document defines the `BlendRecipeMaster` (or `BlendRecipe`) entity structure and operational recipe behavior used across Roastery OS.

The purpose of `BlendRecipeMaster` is to:
- define reusable blend formulation templates and material composition ratios,
- standardize blend composition references based on `MaterialMaster`,
- decouple formulation definitions from physical inventory stock instances (`InventoryLot`),
- support deterministic blend production execution (`BlendBatch`),
- maintain operational consistency,
- and provide clean composition structures for both post-roast and intermediate blending.

`BlendRecipeMaster` acts as:
- a reusable recipe / process formulation template,
- a material composition reference structure,
- and a blend identity definition.

---

# Core Philosophy

Roastery OS treats `BlendRecipeMaster` as:
- a reusable blend formulation reference (`RecipeTemplate` / `ProcessTemplate`),
- an operational composition blueprint specifying `MaterialMaster` percentages,
- and production intention structure.

`BlendRecipeMaster` is **NOT**:
- physical inventory (`InventoryLot`),
- a specific roast batch instance,
- or production execution.

`BlendRecipeMaster` defines:
- how a blend is intended to be composed in terms of abstract materials and ratios ($\sum \text{ratio}_i = 100\%$).

Actual production execution belongs to:
- `BlendBatch` (consuming specific physical `InventoryLot` instances).

This separation is a foundational architectural invariant inside Roastery OS.

---

# Blend Recipe Philosophy

Every blend defines an explicit material composition structure:

```text
House Espresso Blend (Blend Material Definition)
├── Brazil Cerrado Natural (MaterialMaster) → 60%
└── Ethiopia Yirgacheffe Washed (MaterialMaster) → 40%
```

`BlendRecipeMaster` preserves:
- composition consistency,
- production repeatability,
- and operational recipe versioning.

---

## Core Relationship Principle

```text
BlendRecipeMaster (Recipe Template: Material % Ratios)
↓ applied to
BlendBatch (Transformation Execution: Consumes specific InventoryLots)
↓ produces
Output InventoryLot (INTERMEDIATE or DERIVATIVE Blend Material)
```

This relationship ensures that when bean lots rotate (e.g. from Lot A to Lot B of the same Brazil Cerrado Material), the recipe definition does not need to be rewritten.

---

# BlendRecipe Master Entity Structure

```typescript
interface BlendRecipeMaster {
  // Identity
  recipeId: string;
  recipeCode: string; // e.g. "REC-ESP-HOUSE"
  recipeName: string; // e.g. "House Espresso Recipe v2"
  outputMaterialId: string; // MaterialMaster ID for the resulting blend product
  version: number; // e.g. 1, 2
  isActive: boolean;

  // Material Formulation (must sum to 100.0%)
  components: BlendRecipeComponent[];

  // Target Parameters
  blendTiming: 'PRE_ROAST' | 'POST_ROAST';
  targetRoastStyle?: string;
  expectedLossPercentage: number; // e.g. 0.5% handling/purge loss

  // Operational Metadata
  description?: string;
  targetFlavorProfile?: string[];
  createdAt: string;
  updatedAt: string;
}

interface BlendRecipeComponent {
  materialId: string; // Reference to MaterialMaster (RAW_COFFEE or INTERMEDIATE)
  targetPercentage: number; // e.g. 60.0 (percentage of total batch weight)
  tolerancePercentage?: number; // e.g. +/- 1.0% allowable scale variance
  substituteMaterialIds?: string[]; // Optional allowable substitutes
}
```

---

## Component Separation: Material vs InventoryLot

- **`BlendRecipeMaster` specifies**: `materialId` (the abstract catalog item, e.g. "Brazil Fazenda Dutra Natural Medium Roast") and `targetPercentage` (e.g. 60%).
- **`BlendBatch` specifies**: `consumedLots` linking to physical `inventoryLotId` instances (e.g. "LOT-2026-BR-004", 60 kg) satisfying that material requirement.

This distinction eliminates coupling between static recipes and transient warehouse stock.

---

## Supported Transformation Topologies

1. **Standard Blending ($N \rightarrow 1$)**:
   Multiple roasted intermediate coffee lots blended into a single output roasted blend lot.
2. **Intermediate / Pre-Roast Blending ($N \rightarrow 1$)**:
   Multiple green raw coffee lots blended before roasting into a single pre-roast green blend lot.
3. **Compound / Multi-Stage Blending ($N \rightarrow M$)**:
   Blending multiple intermediate lots and packaging into multiple batch sizes or split intermediate containers simultaneously.

Blending does not assume a terminal or finished retail good. The output of a `BlendBatch` is an `InventoryLot` that can be stored, re-blended, ground, extracted, or packaged.

---

## Costing & Valuation Boundary

`BlendRecipeMaster` does not compute or fix unit costs.
When `BlendBatch` executes:
- Roasting/Blend operators measure actual input lot weights and actual blended output weight.
- `07_COSTING_ENGINE` computes the actual unit cost of the blended output lot:
  $$U_{\text{out}} = \frac{\sum (Q_{\text{in}, i} \times U_{\text{in}, i}) + \sum C_{\text{direct}}}{Q_{\text{out}}}$$

---

## AI Boundary Philosophy

AI systems may simulate blend ratios based on green bean sensory attributes or suggest cost-optimized component percentages. However, AI systems must **never** modify active `BlendRecipeMaster` definitions or alter `BlendBatch` execution lots without explicit roaster authorization.

---

## Philosophy Summary

`BlendRecipeMaster` is **reusable formulation structure, composition blueprint, and operational blend intention**. `BlendRecipeMaster` defines what materials compose a blend, while `BlendBatch` executes that intention against physical inventory lots.


