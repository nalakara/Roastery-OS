import pg from 'pg';
import { 
  OrganizationId,
  InventoryPositionAnalyticsResponse,
  InventoryCategorySummary,
  InventoryLotPositionSummary,
  TransformationPerformanceAnalyticsResponse,
  TransformationPerformanceItem,
  TransformationArchetypeSummary,
  ProductionCostAnalyticsResponse,
  ProducedLotCostItem,
  CommercialPerformanceAnalyticsResponse,
  CommercialChannelSummary,
  CommercialSkuSalesSummary,
  SupplierAnalyticsResponse,
  SupplierContributionSummary,
  SupplierMaterialSpendItem,
  GlobalOperationalAnalyticsSummary,
  MaterialCategory,
  LotState,
  TransformationArchetype,
  CommercialSalesChannel
} from '@roastery-os/contracts';

export interface AnalyticsTimeFilter {
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly filterKey?: 'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM';
}

export class AnalyticsPostgresRepository {
  /**
   * 1. Physical Inventory Position & Valuation Summary
   * Source of Truth: inventory_lot JOIN material_master LEFT JOIN lot_valuation_record
   */
  public async getInventoryPositionAnalytics(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId
  ): Promise<InventoryPositionAnalyticsResponse> {
    const lotsRes = await client.query(
      `SELECT 
        il.inventory_lot_id,
        il.lot_number,
        il.material_id,
        mm.code AS material_code,
        mm.name AS material_name,
        mm.category AS material_category,
        il.quantity_on_hand,
        il.reserved_quantity,
        (il.quantity_on_hand - il.reserved_quantity) AS available_quantity,
        il.uom,
        il.lot_state,
        il.received_at,
        lvr.unit_cost,
        lvr.total_lot_cost,
        lvr.currency
       FROM inventory_lot il
       JOIN material_master mm ON mm.organization_id = il.organization_id AND mm.material_id = il.material_id
       LEFT JOIN lot_valuation_record lvr ON lvr.organization_id = il.organization_id AND lvr.inventory_lot_id = il.inventory_lot_id
       WHERE il.organization_id = $1
       ORDER BY il.received_at DESC`,
      [organizationId]
    );

    let activeCount = 0;
    let depletedCount = 0;
    let quarantinedCount = 0;
    let totalValuationNum = 0;
    const catMap = new Map<MaterialCategory, { count: number; val: number }>();
    const now = new Date();

    const lots: InventoryLotPositionSummary[] = lotsRes.rows.map(r => {
      const state = r.lot_state as LotState;
      if (state === 'ACTIVE') activeCount++;
      else if (state === 'DEPLETED') depletedCount++;
      else if (state === 'QUARANTINED') quarantinedCount++;

      const lotCost = r.total_lot_cost ? Number(r.total_lot_cost) : 0;
      totalValuationNum += lotCost;

      const cat = r.material_category as MaterialCategory;
      const currentCat = catMap.get(cat) || { count: 0, val: 0 };
      catMap.set(cat, {
        count: currentCat.count + 1,
        val: currentCat.val + lotCost
      });

      const recDate = new Date(r.received_at);
      const diffMs = now.getTime() - recDate.getTime();
      const ageDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      return {
        inventoryLotId: r.inventory_lot_id,
        lotNumber: r.lot_number,
        materialId: r.material_id,
        materialCode: r.material_code,
        materialName: r.material_name,
        materialCategory: cat,
        quantityOnHand: { amount: r.quantity_on_hand, uom: r.uom },
        reservedQuantity: { amount: r.reserved_quantity, uom: r.uom },
        availableQuantity: { amount: r.available_quantity, uom: r.uom },
        lotState: state,
        receivedAt: recDate,
        ageDays,
        unitCost: r.unit_cost ? { unitPrice: r.unit_cost, currency: r.currency || 'IDR', perUom: r.uom } : undefined,
        totalLotCost: r.total_lot_cost ? { amount: r.total_lot_cost, currency: r.currency || 'IDR' } : undefined
      };
    });

    const categorySummaries: InventoryCategorySummary[] = Array.from(catMap.entries()).map(([cat, summary]) => ({
      category: cat,
      lotCount: summary.count,
      totalValuation: { amount: summary.val.toFixed(2), currency: 'IDR' }
    }));

    return {
      totalLots: lots.length,
      activeLotsCount: activeCount,
      depletedLotsCount: depletedCount,
      quarantinedLotsCount: quarantinedCount,
      totalValuation: { amount: totalValuationNum.toFixed(2), currency: 'IDR' },
      categorySummaries,
      lots
    };
  }

  /**
   * 2. Transformation Performance & Yield Analytics
   * Source of Truth: transformation JOIN transformation_input JOIN transformation_output LEFT JOIN batch LEFT JOIN cost_event
   */
  public async getTransformationPerformanceAnalytics(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    filter?: AnalyticsTimeFilter
  ): Promise<TransformationPerformanceAnalyticsResponse> {
    let timeClause = '';
    const params: any[] = [organizationId];

    if (filter?.startDate) {
      params.push(filter.startDate);
      timeClause += ` AND t.started_at >= $${params.length}`;
    }
    if (filter?.endDate) {
      params.push(filter.endDate);
      timeClause += ` AND t.started_at <= $${params.length}`;
    }

    const txRes = await client.query(
      `SELECT 
        t.transformation_id,
        t.transformation_number,
        t.archetype,
        t.status,
        t.started_at,
        t.completed_at,
        b.recipe_or_profile_id
       FROM transformation t
       LEFT JOIN batch b ON b.organization_id = t.organization_id AND b.transformation_id = t.transformation_id
       WHERE t.organization_id = $1 ${timeClause}
       ORDER BY t.started_at DESC NULLS LAST`,
      params
    );

    let completedCount = 0;
    let inProgressCount = 0;
    let totalConversionCostsNum = 0;
    const archetypeMap = new Map<TransformationArchetype, { completed: number; cost: number }>();

    const items: TransformationPerformanceItem[] = [];

    for (const row of txRes.rows) {
      const txId = row.transformation_id;
      const archetype = row.archetype as TransformationArchetype;
      const status = row.status;

      if (status === 'COMPLETED') completedCount++;
      else if (status === 'IN_PROGRESS') inProgressCount++;

      // Load Inputs
      const inRes = await client.query(
        `SELECT ti.inventory_lot_id, ti.actual_quantity_consumed, ti.uom, lvr.unit_cost, lvr.currency
         FROM transformation_input ti
         LEFT JOIN lot_valuation_record lvr ON lvr.organization_id = ti.organization_id AND lvr.inventory_lot_id = ti.inventory_lot_id
         WHERE ti.organization_id = $1 AND ti.transformation_id = $2
         ORDER BY ti.input_sequence ASC`,
        [organizationId, txId]
      );

      // Load Outputs
      const outRes = await client.query(
        `SELECT tout.created_lot_id, tout.output_type, tout.actual_quantity_produced, tout.uom, lvr.total_lot_cost, lvr.currency
         FROM transformation_output tout
         LEFT JOIN lot_valuation_record lvr ON lvr.organization_id = tout.organization_id AND lvr.inventory_lot_id = tout.created_lot_id
         WHERE tout.organization_id = $1 AND tout.transformation_id = $2`,
        [organizationId, txId]
      );

      // Load Cost Events
      const costRes = await client.query(
        `SELECT COALESCE(SUM(allocated_amount), 0) AS direct_conversion_total
         FROM cost_event
         WHERE organization_id = $1 AND transformation_id = $2`,
        [organizationId, txId]
      );

      const directConversion = Number(costRes.rows[0]?.direct_conversion_total || 0);
      totalConversionCostsNum += directConversion;

      const curArch = archetypeMap.get(archetype) || { completed: 0, cost: 0 };
      archetypeMap.set(archetype, {
        completed: curArch.completed + (status === 'COMPLETED' ? 1 : 0),
        cost: curArch.cost + directConversion
      });

      // Calculate Physical Quantities (Respecting UOM compatibility)
      let primaryInQty: { amount: string; uom: string } | undefined;
      let consumedMatCostNum = 0;

      if (inRes.rows.length > 0) {
        const firstIn = inRes.rows[0];
        primaryInQty = { amount: firstIn.actual_quantity_consumed || '0', uom: firstIn.uom };

        for (const inR of inRes.rows) {
          const qty = Number(inR.actual_quantity_consumed || 0);
          const uCost = Number(inR.unit_cost || 0);
          consumedMatCostNum += qty * uCost;
        }
      }

      let primaryOutQty: { amount: string; uom: string } | undefined;
      let wasteQty: { amount: string; uom: string } | undefined;
      let totalOutCostNum = 0;

      for (const outR of outRes.rows) {
        if (outR.output_type === 'PRIMARY_PRODUCT') {
          primaryOutQty = { amount: outR.actual_quantity_produced, uom: outR.uom };
        } else if (outR.output_type === 'UNRECOVERABLE_WASTE') {
          wasteQty = { amount: outR.actual_quantity_produced, uom: outR.uom };
        }
        if (outR.total_lot_cost) {
          totalOutCostNum += Number(outR.total_lot_cost);
        }
      }

      // Yield Ratio: if primary input and primary output share the same dimension (e.g. KG and KG)
      let yieldRatio: string | undefined;
      if (primaryInQty && primaryOutQty && primaryInQty.uom === primaryOutQty.uom) {
        const inVal = Number(primaryInQty.amount);
        const outVal = Number(primaryOutQty.amount);
        if (inVal > 0) {
          yieldRatio = (outVal / inVal).toFixed(4);
        }
      }

      items.push({
        transformationId: txId,
        transformationNumber: row.transformation_number,
        archetype,
        status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        recipeOrProfileId: row.recipe_or_profile_id,
        primaryInputQuantity: primaryInQty,
        primaryOutputQuantity: primaryOutQty,
        unrecoverableWasteQuantity: wasteQty,
        yieldRatio,
        consumedMaterialCost: { amount: consumedMatCostNum.toFixed(2), currency: 'IDR' },
        directConversionCost: { amount: directConversion.toFixed(2), currency: 'IDR' },
        totalOutputCost: { amount: totalOutCostNum.toFixed(2), currency: 'IDR' }
      });
    }

    const archetypeSummaries: TransformationArchetypeSummary[] = Array.from(archetypeMap.entries()).map(([arch, s]) => ({
      archetype: arch,
      completedCount: s.completed,
      totalConversionCost: { amount: s.cost.toFixed(2), currency: 'IDR' }
    }));

    return {
      totalTransformations: items.length,
      completedCount,
      inProgressCount,
      totalConversionCosts: { amount: totalConversionCostsNum.toFixed(2), currency: 'IDR' },
      archetypeSummaries,
      transformations: items
    };
  }

  /**
   * 3. Production Cost & HPP Valuation Analytics
   * Source of Truth: lot_valuation_record JOIN inventory_lot JOIN material_master LEFT JOIN transformation_output
   */
  public async getProductionCostAnalytics(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId
  ): Promise<ProductionCostAnalyticsResponse> {
    const res = await client.query(
      `SELECT 
        lvr.inventory_lot_id,
        il.lot_number,
        il.material_id,
        mm.code AS material_code,
        mm.name AS material_name,
        mm.category AS material_category,
        il.quantity_on_hand,
        il.uom,
        lvr.material_cost,
        lvr.conversion_cost,
        lvr.total_lot_cost,
        lvr.unit_cost,
        lvr.currency,
        lvr.calculated_at,
        tout.transformation_id,
        t.transformation_number,
        t.archetype
       FROM lot_valuation_record lvr
       JOIN inventory_lot il ON il.organization_id = lvr.organization_id AND il.inventory_lot_id = lvr.inventory_lot_id
       JOIN material_master mm ON mm.organization_id = il.organization_id AND mm.material_id = il.material_id
       LEFT JOIN transformation_output tout ON tout.organization_id = il.organization_id AND tout.created_lot_id = il.inventory_lot_id
       LEFT JOIN transformation t ON t.organization_id = tout.organization_id AND t.transformation_id = tout.transformation_id
       WHERE lvr.organization_id = $1
       ORDER BY lvr.calculated_at DESC`,
      [organizationId]
    );

    let totMatNum = 0;
    let totConvNum = 0;
    let grandTotNum = 0;

    const producedLots: ProducedLotCostItem[] = res.rows.map(r => {
      const matCost = Number(r.material_cost || 0);
      const convCost = Number(r.conversion_cost || 0);
      const totCost = Number(r.total_lot_cost || 0);

      totMatNum += matCost;
      totConvNum += convCost;
      grandTotNum += totCost;

      return {
        inventoryLotId: r.inventory_lot_id,
        lotNumber: r.lot_number,
        materialId: r.material_id,
        materialCode: r.material_code,
        materialName: r.material_name,
        materialCategory: r.material_category as MaterialCategory,
        transformationId: r.transformation_id ?? undefined,
        transformationNumber: r.transformation_number ?? undefined,
        archetype: r.archetype as TransformationArchetype ?? undefined,
        quantityOnHand: { amount: r.quantity_on_hand, uom: r.uom },
        materialCost: { amount: r.material_cost, currency: r.currency },
        conversionCost: { amount: r.conversion_cost, currency: r.currency },
        totalLotCost: { amount: r.total_lot_cost, currency: r.currency },
        unitCost: { unitPrice: r.unit_cost, currency: r.currency, perUom: r.uom },
        calculatedAt: r.calculated_at
      };
    });

    return {
      totalProducedLots: producedLots.length,
      totalMaterialCostAccumulated: { amount: totMatNum.toFixed(2), currency: 'IDR' },
      totalConversionCostAccumulated: { amount: totConvNum.toFixed(2), currency: 'IDR' },
      grandTotalCostAccumulated: { amount: grandTotNum.toFixed(2), currency: 'IDR' },
      producedLots
    };
  }

  /**
   * 4. Commercial Sales Performance & Gross Margin Analytics (POS & Wholesale)
   * Source of Truth: commercial_order JOIN commercial_order_line LEFT JOIN cogs_record
   */
  public async getCommercialPerformanceAnalytics(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    filter?: AnalyticsTimeFilter
  ): Promise<CommercialPerformanceAnalyticsResponse> {
    let timeClause = '';
    const params: any[] = [organizationId];

    if (filter?.startDate) {
      params.push(filter.startDate);
      timeClause += ` AND co.ordered_at >= $${params.length}`;
    }
    if (filter?.endDate) {
      params.push(filter.endDate);
      timeClause += ` AND co.ordered_at <= $${params.length}`;
    }

    // Orders & Channels
    const ordersRes = await client.query(
      `SELECT 
        co.order_id,
        co.channel,
        co.status,
        co.grand_total,
        co.ordered_at
       FROM commercial_order co
       WHERE co.organization_id = $1 ${timeClause}`,
      params
    );

    const totalOrders = ordersRes.rows.length;
    let completedOrdersCount = 0;
    let totalRevenueNum = 0;

    const channelMap = new Map<CommercialSalesChannel, { count: number; rev: number; cogs: number }>();

    for (const o of ordersRes.rows) {
      const ch = o.channel as CommercialSalesChannel;
      const grand = Number(o.grand_total || 0);
      totalRevenueNum += grand;
      if (['FULFILLED', 'DISPATCHED', 'COMPLETED'].includes(o.status)) {
        completedOrdersCount++;
      }

      const curCh = channelMap.get(ch) || { count: 0, rev: 0, cogs: 0 };
      channelMap.set(ch, {
        count: curCh.count + 1,
        rev: curCh.rev + grand,
        cogs: curCh.cogs
      });
    }

    // COGS & SKU breakdown
    const skuRes = await client.query(
      `SELECT 
        col.sku_id,
        sm.sku_code,
        sm.name AS sku_name,
        co.channel,
        SUM(col.fulfilled_quantity) AS total_sold_qty,
        sm.packaged_uom,
        SUM(col.line_subtotal) AS total_sku_revenue,
        COALESCE(SUM(cr.total_cogs_amount), 0) AS total_sku_cogs
       FROM commercial_order_line col
       JOIN commercial_order co ON co.organization_id = col.organization_id AND co.order_id = col.order_id
       JOIN sku_master sm ON sm.organization_id = col.organization_id AND sm.sku_id = col.sku_id
       LEFT JOIN fulfillment_allocation fa ON fa.organization_id = col.organization_id AND fa.order_line_id = col.order_line_id
       LEFT JOIN cogs_record cr ON cr.organization_id = fa.organization_id AND cr.fulfillment_allocation_id = fa.allocation_id
       WHERE col.organization_id = $1 ${timeClause}
       GROUP BY col.sku_id, sm.sku_code, sm.name, co.channel, sm.packaged_uom`,
      params
    );

    let totalCogsNum = 0;
    const aggregatedSkuMap = new Map<string, CommercialSkuSalesSummary>();

    for (const r of skuRes.rows) {
      const ch = r.channel as CommercialSalesChannel;
      const skuCogs = Number(r.total_sku_cogs || 0);
      const skuRev = Number(r.total_sku_revenue || 0);
      totalCogsNum += skuCogs;

      // Update channel COGS
      const curCh = channelMap.get(ch) || { count: 0, rev: 0, cogs: 0 };
      channelMap.set(ch, {
        ...curCh,
        cogs: curCh.cogs + skuCogs
      });

      // Aggregate SKU across channels
      const skuId = r.sku_id;
      const curSku = aggregatedSkuMap.get(skuId);
      const soldQty = Number(r.total_sold_qty || 0);

      if (!curSku) {
        const grossMargin = skuRev - skuCogs;
        const gmPercent = skuRev > 0 ? ((grossMargin / skuRev) * 100).toFixed(2) : '0.00';
        aggregatedSkuMap.set(skuId, {
          skuId,
          skuCode: r.sku_code,
          skuName: r.sku_name,
          totalUnitsSold: { amount: soldQty.toFixed(4), uom: r.packaged_uom || 'UNIT' },
          totalRevenue: { amount: skuRev.toFixed(2), currency: 'IDR' },
          totalCogs: { amount: skuCogs.toFixed(2), currency: 'IDR' },
          grossMarginAmount: { amount: grossMargin.toFixed(2), currency: 'IDR' },
          grossMarginPercentage: gmPercent
        });
      } else {
        const combinedQty = Number(curSku.totalUnitsSold.amount) + soldQty;
        const combinedRev = Number(curSku.totalRevenue.amount) + skuRev;
        const combinedCogs = Number(curSku.totalCogs.amount) + skuCogs;
        const combinedMargin = combinedRev - combinedCogs;
        const combinedGmPercent = combinedRev > 0 ? ((combinedMargin / combinedRev) * 100).toFixed(2) : '0.00';
        aggregatedSkuMap.set(skuId, {
          skuId,
          skuCode: curSku.skuCode,
          skuName: curSku.skuName,
          totalUnitsSold: { amount: combinedQty.toFixed(4), uom: curSku.totalUnitsSold.uom },
          totalRevenue: { amount: combinedRev.toFixed(2), currency: 'IDR' },
          totalCogs: { amount: combinedCogs.toFixed(2), currency: 'IDR' },
          grossMarginAmount: { amount: combinedMargin.toFixed(2), currency: 'IDR' },
          grossMarginPercentage: combinedGmPercent
        });
      }
    }

    const totalGrossMarginNum = totalRevenueNum - totalCogsNum;
    const overallGmPercent = totalRevenueNum > 0 ? ((totalGrossMarginNum / totalRevenueNum) * 100).toFixed(2) : '0.00';

    const channelSummaries: CommercialChannelSummary[] = Array.from(channelMap.entries()).map(([ch, s]) => {
      const margin = s.rev - s.cogs;
      const gmPct = s.rev > 0 ? ((margin / s.rev) * 100).toFixed(2) : '0.00';
      return {
        channel: ch,
        orderCount: s.count,
        totalRevenue: { amount: s.rev.toFixed(2), currency: 'IDR' },
        totalCogs: { amount: s.cogs.toFixed(2), currency: 'IDR' },
        grossMarginAmount: { amount: margin.toFixed(2), currency: 'IDR' },
        grossMarginPercentage: gmPct
      };
    });

    return {
      totalOrders,
      completedOrdersCount,
      totalRevenue: { amount: totalRevenueNum.toFixed(2), currency: 'IDR' },
      totalCogs: { amount: totalCogsNum.toFixed(2), currency: 'IDR' },
      totalGrossMargin: { amount: totalGrossMarginNum.toFixed(2), currency: 'IDR' },
      overallGrossMarginPercentage: overallGmPercent,
      channelSummaries,
      skuSummaries: Array.from(aggregatedSkuMap.values())
    };
  }

  /**
   * 5. Supplier Procurement & Acquisition Analytics
   * Source of Truth: purchase_receipt JOIN supplier_master JOIN material_master
   */
  public async getSupplierAnalytics(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    filter?: AnalyticsTimeFilter
  ): Promise<SupplierAnalyticsResponse> {
    let timeClause = '';
    const params: any[] = [organizationId];

    if (filter?.startDate) {
      params.push(filter.startDate);
      timeClause += ` AND pr.received_at >= $${params.length}`;
    }
    if (filter?.endDate) {
      params.push(filter.endDate);
      timeClause += ` AND pr.received_at <= $${params.length}`;
    }

    const receiptsRes = await client.query(
      `SELECT 
        pr.supplier_id,
        sm.supplier_code,
        sm.name AS supplier_name,
        pr.material_id,
        mm.code AS material_code,
        mm.name AS material_name,
        pr.received_quantity,
        pr.uom,
        pr.total_amount,
        pr.currency,
        pr.received_at
       FROM purchase_receipt pr
       JOIN supplier_master sm ON sm.organization_id = pr.organization_id AND sm.supplier_id = pr.supplier_id
       JOIN material_master mm ON mm.organization_id = pr.organization_id AND mm.material_id = pr.material_id
       WHERE pr.organization_id = $1 ${timeClause}
       ORDER BY pr.received_at DESC`,
      params
    );

    let totalSpendNum = 0;
    const supplierMap = new Map<string, {
      supplierId: string;
      supplierCode: string;
      supplierName: string;
      receiptCount: number;
      totalSpend: number;
      materials: Map<string, { materialCode: string; materialName: string; amount: number; uom: string }>;
    }>();

    const materialSpendItems: SupplierMaterialSpendItem[] = [];

    for (const r of receiptsRes.rows) {
      const supId = r.supplier_id;
      const spend = Number(r.total_amount || 0);
      const qty = Number(r.received_quantity || 0);
      totalSpendNum += spend;

      let sup = supplierMap.get(supId);
      if (!sup) {
        sup = {
          supplierId: supId,
          supplierCode: r.supplier_code,
          supplierName: r.supplier_name,
          receiptCount: 0,
          totalSpend: 0,
          materials: new Map()
        };
        supplierMap.set(supId, sup);
      }

      sup.receiptCount++;
      sup.totalSpend += spend;

      const matCode = r.material_code;
      const curMat = sup.materials.get(matCode) || { materialCode: matCode, materialName: r.material_name, amount: 0, uom: r.uom };
      curMat.amount += qty;
      sup.materials.set(matCode, curMat);

      materialSpendItems.push({
        supplierId: supId,
        supplierCode: r.supplier_code,
        supplierName: r.supplier_name,
        materialId: r.material_id,
        materialCode: r.material_code,
        materialName: r.material_name,
        totalReceivedQuantity: { amount: qty.toFixed(4), uom: r.uom },
        totalSpendAmount: { amount: spend.toFixed(2), currency: r.currency || 'IDR' },
        receiptCount: 1,
        lastReceivedAt: r.received_at
      });
    }

    const supplierSummaries: SupplierContributionSummary[] = Array.from(supplierMap.values()).map(s => ({
      supplierId: s.supplierId as any,
      supplierCode: s.supplierCode,
      supplierName: s.supplierName,
      totalReceipts: s.receiptCount,
      totalSpend: { amount: s.totalSpend.toFixed(2), currency: 'IDR' },
      suppliedMaterials: Array.from(s.materials.values()).map(m => ({
        materialCode: m.materialCode,
        materialName: m.materialName,
        quantity: { amount: m.amount.toFixed(4), uom: m.uom }
      }))
    }));

    return {
      totalSuppliers: supplierSummaries.length,
      totalReceiptsCount: receiptsRes.rows.length,
      totalProcurementSpend: { amount: totalSpendNum.toFixed(2), currency: 'IDR' },
      supplierSummaries,
      materialBreakdown: materialSpendItems
    };
  }

  /**
   * 6. Combined Global Operational Summary
   */
  public async getGlobalOperationalSummary(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    filterKey: 'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' = 'ALL'
  ): Promise<GlobalOperationalAnalyticsSummary> {
    let startDate: Date | undefined;
    const now = new Date();

    if (filterKey === 'TODAY') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filterKey === 'LAST_7_DAYS') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (filterKey === 'THIS_MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const timeFilter: AnalyticsTimeFilter = { startDate, filterKey };

    const [inv, tx, comm, sup] = await Promise.all([
      this.getInventoryPositionAnalytics(client, organizationId),
      this.getTransformationPerformanceAnalytics(client, organizationId, timeFilter),
      this.getCommercialPerformanceAnalytics(client, organizationId, timeFilter),
      this.getSupplierAnalytics(client, organizationId, timeFilter)
    ]);

    return {
      asOfDate: now,
      timeFilter: filterKey,
      inventory: {
        totalActiveLots: inv.activeLotsCount,
        totalValuation: inv.totalValuation
      },
      production: {
        completedTransformations: tx.completedCount,
        totalConversionCost: tx.totalConversionCosts
      },
      commercial: {
        totalOrders: comm.totalOrders,
        totalRevenue: comm.totalRevenue,
        totalCogs: comm.totalCogs,
        grossMargin: comm.totalGrossMargin,
        grossMarginPercentage: comm.overallGrossMarginPercentage
      },
      procurement: {
        totalReceipts: sup.totalReceiptsCount,
        totalSpend: sup.totalProcurementSpend
      }
    };
  }
}
