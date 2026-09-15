import pg from 'pg';
import {
  OrganizationId,
  BlendRecipeId,
  BlendRecipeMasterContract,
  BlendRecipeComponentContract
} from '@roastery-os/contracts';
import { DecimalValue } from '@roastery-os/domain-core';

export class BlendRecipePostgresRepository {
  public async insertRecipe(
    client: pg.PoolClient | pg.Pool,
    recipe: BlendRecipeMasterContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO blend_recipe (
        organization_id,
        recipe_id,
        recipe_code,
        name,
        output_material_id,
        version,
        description,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (organization_id, recipe_id) DO UPDATE
      SET name = EXCLUDED.name,
          output_material_id = EXCLUDED.output_material_id,
          version = EXCLUDED.version,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP`,
      [
        recipe.organizationId,
        recipe.recipeId,
        recipe.recipeCode,
        recipe.name,
        recipe.outputMaterialId,
        recipe.version,
        recipe.description ?? null,
        recipe.isActive,
        recipe.createdAt,
        recipe.updatedAt
      ]
    );

    for (const comp of recipe.components) {
      await this.insertComponent(client, comp);
    }
  }

  public async insertComponent(
    client: pg.PoolClient | pg.Pool,
    component: BlendRecipeComponentContract
  ): Promise<void> {
    await client.query(
      `INSERT INTO blend_recipe_component (
        organization_id,
        component_id,
        recipe_id,
        material_id,
        target_ratio_percentage,
        sequence_number
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (organization_id, component_id) DO UPDATE
      SET material_id = EXCLUDED.material_id,
          target_ratio_percentage = EXCLUDED.target_ratio_percentage,
          sequence_number = EXCLUDED.sequence_number`,
      [
        component.organizationId,
        component.componentId,
        component.recipeId,
        component.materialId,
        component.targetRatioPercentage.toString(),
        component.sequenceNumber
      ]

    );
  }

  public async findRecipeById(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    recipeId: BlendRecipeId
  ): Promise<BlendRecipeMasterContract | null> {
    const res = await client.query(
      `SELECT * FROM blend_recipe WHERE organization_id = $1 AND recipe_id = $2`,
      [organizationId, recipeId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    const compRes = await client.query(
      `SELECT * FROM blend_recipe_component WHERE organization_id = $1 AND recipe_id = $2 ORDER BY sequence_number ASC`,
      [organizationId, recipeId]
    );

    const components: BlendRecipeComponentContract[] = compRes.rows.map((r) => ({
      organizationId: r.organization_id,
      componentId: r.component_id,
      recipeId: r.recipe_id,
      materialId: r.material_id,
      targetRatioPercentage: new DecimalValue(r.target_ratio_percentage.toString()),
      sequenceNumber: r.sequence_number
    }));

    return {
      organizationId: row.organization_id,
      recipeId: row.recipe_id,
      recipeCode: row.recipe_code,
      name: row.name,
      outputMaterialId: row.output_material_id,
      version: row.version,
      description: row.description ?? undefined,
      components,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public async listRecipes(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId
  ): Promise<BlendRecipeMasterContract[]> {
    const res = await client.query(
      `SELECT * FROM blend_recipe WHERE organization_id = $1 ORDER BY recipe_code ASC`,
      [organizationId]
    );

    const recipes: BlendRecipeMasterContract[] = [];
    for (const row of res.rows) {
      const compRes = await client.query(
        `SELECT * FROM blend_recipe_component WHERE organization_id = $1 AND recipe_id = $2 ORDER BY sequence_number ASC`,
        [organizationId, row.recipe_id]
      );

      const components: BlendRecipeComponentContract[] = compRes.rows.map((r) => ({
        organizationId: r.organization_id,
        componentId: r.component_id,
        recipeId: r.recipe_id,
        materialId: r.material_id,
        targetRatioPercentage: new DecimalValue(r.target_ratio_percentage.toString()),
        sequenceNumber: r.sequence_number
      }));

      recipes.push({
        organizationId: row.organization_id,
        recipeId: row.recipe_id,
        recipeCode: row.recipe_code,
        name: row.name,
        outputMaterialId: row.output_material_id,
        version: row.version,
        description: row.description ?? undefined,
        components,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    }

    return recipes;
  }
}
