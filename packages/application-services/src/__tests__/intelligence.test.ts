import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IntelligenceEngineService } from '../intelligence/intelligence-engine-service.js';
import type { AnalyticsPostgresRepository } from '@roastery-os/infrastructure-postgres';
import type {
  OrganizationId,
  MaterialId,
  InventoryLotId,
  TransformationId,
  SkuId,
  SupplierId,
  InventoryPositionAnalyticsResponse,
  TransformationPerformanceAnalyticsResponse,
  ProductionCostAnalyticsResponse,
  CommercialPerformanceAnalyticsResponse,
  SupplierAnalyticsResponse
} from '@roastery-os/contracts';

describe('IntelligenceEngineService Unit Tests', () => {
  const mockOrgId = 'ORG-TEST-123' as OrganizationId;

  it('detects low stock and aging lot signals correctly with FACT/DERIVED/HEURISTIC evidence', async () => {
    const mockInventoryResponse: InventoryPositionAnalyticsResponse = {
      totalLots: 2,
      activeLotsCount: 2,
      depletedLotsCount: 0,
      quarantinedLotsCount: 0,
      totalValuation: { currency: 'IDR', amount: '500000' },
      categorySummaries: [],
      lots: [
        {
          inventoryLotId: 'LOT-CRIT-001' as InventoryLotId,
          lotNumber: 'LOT-GREEN-001',
          materialId: 'MAT-GB-01' as MaterialId,
          materialCode: 'GB-ETH-01',
          materialName: 'Ethiopia Yirgacheffe G1',
          materialCategory: 'RAW_MATERIAL',
          lotState: 'ACTIVE',
          quantityOnHand: { amount: '20.00', uom: 'KG' },
          reservedQuantity: { amount: '0.00', uom: 'KG' },
          availableQuantity: { amount: '0.00', uom: 'KG' },
          unitCost: { unitPrice: '150000', currency: 'IDR', perUom: 'KG' },
          totalLotCost: { currency: 'IDR', amount: '0' },
          receivedAt: new Date(Date.now() - 10 * 86400 * 1000), // 10 days ago
          ageDays: 10
        },
        {
          inventoryLotId: 'LOT-WARN-002' as InventoryLotId,
          lotNumber: 'LOT-PACK-002',
          materialId: 'MAT-PK-01' as MaterialId,
          materialCode: 'PK-BAG-250',
          materialName: 'Pouch Bag 250g',
          materialCategory: 'PACKAGING_MATERIAL',
          lotState: 'ACTIVE',
          quantityOnHand: { amount: '3.00', uom: 'UNIT' },
          reservedQuantity: { amount: '0.00', uom: 'UNIT' },
          availableQuantity: { amount: '3.00', uom: 'UNIT' },
          unitCost: { unitPrice: '3000', currency: 'IDR', perUom: 'UNIT' },
          totalLotCost: { currency: 'IDR', amount: '9000' },
          receivedAt: new Date(),
          ageDays: 0
        }
      ]
    };

    const emptyTx: TransformationPerformanceAnalyticsResponse = {
      totalTransformations: 0,
      completedCount: 0,
      inProgressCount: 0,
      totalConversionCosts: { currency: 'IDR', amount: '0' },
      archetypeSummaries: [],
      transformations: []
    };

    const emptyCost: ProductionCostAnalyticsResponse = {
      totalProducedLots: 0,
      totalMaterialCostAccumulated: { currency: 'IDR', amount: '0' },
      totalConversionCostAccumulated: { currency: 'IDR', amount: '0' },
      grandTotalCostAccumulated: { currency: 'IDR', amount: '0' },
      producedLots: []
    };

    const emptyComm: CommercialPerformanceAnalyticsResponse = {
      totalOrders: 0,
      completedOrdersCount: 0,
      totalRevenue: { currency: 'IDR', amount: '0' },
      totalCogs: { currency: 'IDR', amount: '0' },
      totalGrossMargin: { currency: 'IDR', amount: '0' },
      overallGrossMarginPercentage: '0.00',
      channelSummaries: [],
      skuSummaries: []
    };

    const emptySup: SupplierAnalyticsResponse = {
      totalSuppliers: 0,
      totalReceiptsCount: 0,
      totalProcurementSpend: { currency: 'IDR', amount: '0' },
      supplierSummaries: [],
      materialBreakdown: []
    };

    const mockAnalyticsRepo = {
      getInventoryPositionAnalytics: async () => mockInventoryResponse,
      getTransformationPerformanceAnalytics: async () => emptyTx,
      getProductionCostAnalytics: async () => emptyCost,
      getCommercialPerformanceAnalytics: async () => emptyComm,
      getSupplierAnalytics: async () => emptySup
    } as unknown as AnalyticsPostgresRepository;

    const engine = new IntelligenceEngineService(mockAnalyticsRepo);
    const summary = await engine.getSummary({} as any, mockOrgId);

    assert.equal(summary.totalSignals, 3); // 1 Critical low stock + 1 Warning low stock unit + 1 Attention aging lot
    assert.equal(summary.countsBySeverity.critical, 1);
    assert.equal(summary.countsBySeverity.warning, 1);
    assert.equal(summary.countsBySeverity.attention, 1);
    assert.equal(summary.countsByDomain.inventory, 3);

    const critSignal = summary.signals.find(s => s.severity === 'CRITICAL');
    assert.ok(critSignal);
    assert.equal(critSignal.signalType, 'LOW_AVAILABLE_STOCK');
    assert.equal(critSignal.suggestedAction?.actionType, 'INSPECT_LOT');

    // Evidence checks
    const facts = critSignal.evidence.filter(e => e.certainty === 'FACT');
    const heuristics = critSignal.evidence.filter(e => e.certainty === 'HEURISTIC');
    assert.ok(facts.length >= 2);
    assert.ok(heuristics.length >= 1);
  });

  it('detects yield deviation and costing HPP outlier correctly', async () => {
    const mockTx: TransformationPerformanceAnalyticsResponse = {
      totalTransformations: 1,
      completedCount: 1,
      inProgressCount: 0,
      totalConversionCosts: { currency: 'IDR', amount: '250000' },
      archetypeSummaries: [],
      transformations: [
        {
          transformationId: 'TX-ROAST-001' as TransformationId,
          transformationNumber: 'TRX-202609-001',
          archetype: 'ROASTING',
          status: 'COMPLETED',
          recipeOrProfileId: 'REC-01',
          primaryInputQuantity: { amount: '100.00', uom: 'KG' },
          primaryOutputQuantity: { amount: '78.00', uom: 'KG' },
          unrecoverableWasteQuantity: { amount: '22.00', uom: 'KG' },
          yieldRatio: '0.78',
          directConversionCost: { currency: 'IDR', amount: '250000' },
          startedAt: new Date(),
          completedAt: new Date()
        }
      ]
    };

    const mockCost: ProductionCostAnalyticsResponse = {
      totalProducedLots: 2,
      totalMaterialCostAccumulated: { currency: 'IDR', amount: '2000000' },
      totalConversionCostAccumulated: { currency: 'IDR', amount: '500000' },
      grandTotalCostAccumulated: { currency: 'IDR', amount: '2500000' },
      producedLots: [
        {
          inventoryLotId: 'LOT-FG-001' as InventoryLotId,
          lotNumber: 'LOT-FG-2026-001',
          materialId: 'MAT-FG-01' as MaterialId,
          materialCode: 'FG-ROAST-250G',
          materialName: 'Roasted Beans 250g',
          materialCategory: 'FINISHED_GOOD',
          quantityOnHand: { amount: '50.00', uom: 'BAG' },
          materialCost: { currency: 'IDR', amount: '750000' },
          conversionCost: { currency: 'IDR', amount: '150000' },
          totalLotCost: { currency: 'IDR', amount: '900000' },
          unitCost: { unitPrice: '18000', currency: 'IDR', perUom: 'BAG' },
          calculatedAt: new Date()
        },
        {
          inventoryLotId: 'LOT-FG-002' as InventoryLotId,
          lotNumber: 'LOT-FG-2026-002',
          materialId: 'MAT-FG-01' as MaterialId,
          materialCode: 'FG-ROAST-250G',
          materialName: 'Roasted Beans 250g',
          materialCategory: 'FINISHED_GOOD',
          quantityOnHand: { amount: '50.00', uom: 'BAG' },
          materialCost: { currency: 'IDR', amount: '1200000' },
          conversionCost: { currency: 'IDR', amount: '250000' },
          totalLotCost: { currency: 'IDR', amount: '1450000' },
          unitCost: { unitPrice: '29000', currency: 'IDR', perUom: 'BAG' }, // > 15% above average (23500)
          calculatedAt: new Date()
        }
      ]
    };

    const emptyInv: InventoryPositionAnalyticsResponse = {
      totalLots: 0,
      activeLotsCount: 0,
      depletedLotsCount: 0,
      quarantinedLotsCount: 0,
      totalValuation: { currency: 'IDR', amount: '0' },
      categorySummaries: [],
      lots: []
    };

    const emptyComm: CommercialPerformanceAnalyticsResponse = {
      totalOrders: 0,
      completedOrdersCount: 0,
      totalRevenue: { currency: 'IDR', amount: '0' },
      totalCogs: { currency: 'IDR', amount: '0' },
      totalGrossMargin: { currency: 'IDR', amount: '0' },
      overallGrossMarginPercentage: '0.00',
      channelSummaries: [],
      skuSummaries: []
    };

    const emptySup: SupplierAnalyticsResponse = {
      totalSuppliers: 0,
      totalReceiptsCount: 0,
      totalProcurementSpend: { currency: 'IDR', amount: '0' },
      supplierSummaries: [],
      materialBreakdown: []
    };

    const mockAnalyticsRepo = {
      getInventoryPositionAnalytics: async () => emptyInv,
      getTransformationPerformanceAnalytics: async () => mockTx,
      getProductionCostAnalytics: async () => mockCost,
      getCommercialPerformanceAnalytics: async () => emptyComm,
      getSupplierAnalytics: async () => emptySup
    } as unknown as AnalyticsPostgresRepository;

    const engine = new IntelligenceEngineService(mockAnalyticsRepo);
    const summary = await engine.getSummary({} as any, mockOrgId);

    assert.equal(summary.countsByDomain.production, 1);
    assert.equal(summary.countsByDomain.costing, 1);

    const yieldSignal = summary.signals.find(s => s.signalType === 'YIELD_DEVIATION');
    assert.ok(yieldSignal);
    assert.equal(yieldSignal.severity, 'WARNING');

    const costSignal = summary.signals.find(s => s.signalType === 'COST_ANOMALY_HPP');
    assert.ok(costSignal);
    assert.equal(costSignal.severity, 'ATTENTION');
  });

  it('detects margin compression, cross-module bottleneck, and supplier concentration correctly', async () => {
    const mockInv: InventoryPositionAnalyticsResponse = {
      totalLots: 1,
      activeLotsCount: 1,
      depletedLotsCount: 0,
      quarantinedLotsCount: 0,
      totalValuation: { currency: 'IDR', amount: '20000000' },
      categorySummaries: [],
      lots: [
        {
          inventoryLotId: 'LOT-FG-RES-01' as InventoryLotId,
          lotNumber: 'LOT-FG-RES-2026',
          materialId: 'MAT-FG-01' as MaterialId,
          materialCode: 'FG-01',
          materialName: 'Signature Espresso 1kg',
          materialCategory: 'FINISHED_GOOD',
          lotState: 'ACTIVE',
          quantityOnHand: { amount: '100.00', uom: 'KG' },
          reservedQuantity: { amount: '85.00', uom: 'KG' }, // 85% reserved
          availableQuantity: { amount: '15.00', uom: 'KG' },
          unitCost: { unitPrice: '200000', currency: 'IDR', perUom: 'KG' },
          totalLotCost: { currency: 'IDR', amount: '20000000' },
          receivedAt: new Date(),
          ageDays: 0
        }
      ]
    };

    const mockComm: CommercialPerformanceAnalyticsResponse = {
      totalOrders: 1,
      completedOrdersCount: 1,
      totalRevenue: { currency: 'IDR', amount: '1000000' },
      totalCogs: { currency: 'IDR', amount: '800000' },
      totalGrossMargin: { currency: 'IDR', amount: '200000' },
      overallGrossMarginPercentage: '20.00',
      channelSummaries: [],
      skuSummaries: [
        {
          skuId: 'SKU-LOW-MARGIN' as SkuId,
          skuCode: 'SKU-ESP-1KG',
          skuName: 'Signature Espresso 1kg',
          totalUnitsSold: { amount: '5.00', uom: 'KG' },
          totalRevenue: { currency: 'IDR', amount: '1000000' },
          totalCogs: { currency: 'IDR', amount: '800000' },
          grossMarginAmount: { currency: 'IDR', amount: '200000' },
          grossMarginPercentage: '20.00' // < 25% target
        }
      ]
    };

    const mockSup: SupplierAnalyticsResponse = {
      totalSuppliers: 2,
      totalReceiptsCount: 10,
      totalProcurementSpend: { currency: 'IDR', amount: '10000000' },
      supplierSummaries: [
        {
          supplierId: 'SUPP-MAIN' as SupplierId,
          supplierCode: 'SUP-01',
          supplierName: 'PT Kopi Nusantara',
          totalReceipts: 8,
          totalSpend: { currency: 'IDR', amount: '8500000' }, // 85% spend
          suppliedMaterials: []
        },
        {
          supplierId: 'SUPP-SEC' as SupplierId,
          supplierCode: 'SUP-02',
          supplierName: 'CV Kemasan Indah',
          totalReceipts: 2,
          totalSpend: { currency: 'IDR', amount: '1500000' },
          suppliedMaterials: []
        }
      ],
      materialBreakdown: []
    };

    const emptyTx: TransformationPerformanceAnalyticsResponse = {
      totalTransformations: 0,
      completedCount: 0,
      inProgressCount: 0,
      totalConversionCosts: { currency: 'IDR', amount: '0' },
      archetypeSummaries: [],
      transformations: []
    };

    const emptyCost: ProductionCostAnalyticsResponse = {
      totalProducedLots: 0,
      totalMaterialCostAccumulated: { currency: 'IDR', amount: '0' },
      totalConversionCostAccumulated: { currency: 'IDR', amount: '0' },
      grandTotalCostAccumulated: { currency: 'IDR', amount: '0' },
      producedLots: []
    };

    const mockAnalyticsRepo = {
      getInventoryPositionAnalytics: async () => mockInv,
      getTransformationPerformanceAnalytics: async () => emptyTx,
      getProductionCostAnalytics: async () => emptyCost,
      getCommercialPerformanceAnalytics: async () => mockComm,
      getSupplierAnalytics: async () => mockSup
    } as unknown as AnalyticsPostgresRepository;

    const engine = new IntelligenceEngineService(mockAnalyticsRepo);
    const summary = await engine.getSummary({} as any, mockOrgId);

    assert.equal(summary.countsByDomain.commercial, 1);
    assert.equal(summary.countsByDomain.crossModule, 1);
    assert.equal(summary.countsByDomain.supplier, 1);

    const marginSignal = summary.signals.find(s => s.signalType === 'MARGIN_COMPRESSION');
    assert.ok(marginSignal);

    const crossSignal = summary.signals.find(s => s.signalType === 'CROSS_MODULE_BOTTLENECK');
    assert.ok(crossSignal);
    assert.equal(crossSignal.suggestedAction?.actionType, 'TRIGGER_PACKAGING');

    const suppSignal = summary.signals.find(s => s.signalType === 'SUPPLIER_RISK');
    assert.ok(suppSignal);
  });
});
