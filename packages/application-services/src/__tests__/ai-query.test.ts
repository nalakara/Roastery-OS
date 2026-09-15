import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OperationalReasoningService } from '../ai/operational-reasoning-service.js';
import { IntelligenceEngineService } from '../intelligence/intelligence-engine-service.js';
import type { AnalyticsPostgresRepository } from '@roastery-os/infrastructure-postgres';
import type {
  OrganizationId,
  InventoryPositionAnalyticsResponse,
  TransformationPerformanceAnalyticsResponse,
  ProductionCostAnalyticsResponse,
  CommercialPerformanceAnalyticsResponse,
  SupplierAnalyticsResponse,
  MaterialId,
  InventoryLotId,
  TransformationId,
  SupplierId
} from '@roastery-os/contracts';

describe('OperationalReasoningService Unit & AI Grounding Tests', () => {
  const mockOrgId = 'ORG-TEST-123' as OrganizationId;

  const mockInv: InventoryPositionAnalyticsResponse = {
    totalLots: 2,
    activeLotsCount: 2,
    depletedLotsCount: 0,
    quarantinedLotsCount: 0,
    totalValuation: { currency: 'IDR', amount: '25000000' },
    categorySummaries: [],
    lots: [
      {
        inventoryLotId: 'LOT-FG-01' as InventoryLotId,
        lotNumber: 'LOT-FG-HOUSE-1KG',
        materialId: 'MAT-FG-01' as MaterialId,
        materialCode: 'FG-HOUSE-1KG',
        materialName: 'House Blend 1KG Whole Bean',
        materialCategory: 'FINISHED_GOOD',
        lotState: 'ACTIVE',
        quantityOnHand: { amount: '10.00', uom: 'BAG' },
        reservedQuantity: { amount: '8.00', uom: 'BAG' }, // 8 reserved
        availableQuantity: { amount: '2.00', uom: 'BAG' }, // 2 available
        unitCost: { unitPrice: '250000', currency: 'IDR', perUom: 'BAG' },
        totalLotCost: { currency: 'IDR', amount: '2500000' },
        receivedAt: new Date(),
        ageDays: 1
      },
      {
        inventoryLotId: 'LOT-GRN-01' as InventoryLotId,
        lotNumber: 'LOT-GRN-FLORES-001',
        materialId: 'MAT-GB-01' as MaterialId,
        materialCode: 'GB-FLORES-01',
        materialName: 'Flores Bajawa Green Bean',
        materialCategory: 'RAW_MATERIAL',
        lotState: 'ACTIVE',
        quantityOnHand: { amount: '60.00', uom: 'KG' },
        reservedQuantity: { amount: '0.00', uom: 'KG' },
        availableQuantity: { amount: '60.00', uom: 'KG' },
        unitCost: { unitPrice: '120000', currency: 'IDR', perUom: 'KG' },
        totalLotCost: { currency: 'IDR', amount: '7200000' },
        receivedAt: new Date(),
        ageDays: 2
      }
    ]
  };

  const mockTx: TransformationPerformanceAnalyticsResponse = {
    totalTransformations: 1,
    completedCount: 1,
    inProgressCount: 0,
    totalConversionCosts: { currency: 'IDR', amount: '350000' },
    archetypeSummaries: [],
    transformations: [
      {
        transformationId: 'TX-ROAST-01' as TransformationId,
        transformationNumber: 'TRX-ROAST-2026-01',
        archetype: 'ROASTING',
        status: 'COMPLETED',
        primaryInputQuantity: { amount: '20.00', uom: 'KG' },
        primaryOutputQuantity: { amount: '16.60', uom: 'KG' },
        unrecoverableWasteQuantity: { amount: '3.40', uom: 'KG' },
        yieldRatio: '0.83', // 83% yield
        directConversionCost: { currency: 'IDR', amount: '150000' },
        startedAt: new Date(),
        completedAt: new Date()
      }
    ]
  };

  const mockCost: ProductionCostAnalyticsResponse = {
    totalProducedLots: 1,
    totalMaterialCostAccumulated: { currency: 'IDR', amount: '2200000' },
    totalConversionCostAccumulated: { currency: 'IDR', amount: '300000' },
    grandTotalCostAccumulated: { currency: 'IDR', amount: '2500000' },
    producedLots: [
      {
        inventoryLotId: 'LOT-FG-01' as InventoryLotId,
        lotNumber: 'LOT-FG-HOUSE-1KG',
        materialId: 'MAT-FG-01' as MaterialId,
        materialCode: 'FG-HOUSE-1KG',
        materialName: 'House Blend 1KG Whole Bean',
        materialCategory: 'FINISHED_GOOD',
        quantityOnHand: { amount: '10.00', uom: 'BAG' },
        materialCost: { currency: 'IDR', amount: '2200000' },
        conversionCost: { currency: 'IDR', amount: '300000' },
        totalLotCost: { currency: 'IDR', amount: '2500000' },
        unitCost: { unitPrice: '250000', currency: 'IDR', perUom: 'BAG' },
        calculatedAt: new Date()
      }
    ]
  };

  const mockComm: CommercialPerformanceAnalyticsResponse = {
    totalOrders: 2,
    completedOrdersCount: 2,
    totalRevenue: { currency: 'IDR', amount: '3500000' },
    totalCogs: { currency: 'IDR', amount: '2500000' },
    totalGrossMargin: { currency: 'IDR', amount: '1000000' },
    overallGrossMarginPercentage: '28.57',
    channelSummaries: [],
    skuSummaries: []
  };

  const mockSup: SupplierAnalyticsResponse = {
    totalSuppliers: 1,
    totalReceiptsCount: 3,
    totalProcurementSpend: { currency: 'IDR', amount: '15000000' },
    supplierSummaries: [
      {
        supplierId: 'SUPP-FLORES-01' as SupplierId,
        supplierCode: 'SUP-FLO-01',
        supplierName: 'Koperasi Petani Bajawa',
        totalReceipts: 3,
        totalSpend: { currency: 'IDR', amount: '15000000' },
        suppliedMaterials: []
      }
    ],
    materialBreakdown: []
  };

  const mockAnalyticsRepo = {
    getInventoryPositionAnalytics: async () => mockInv,
    getTransformationPerformanceAnalytics: async () => mockTx,
    getProductionCostAnalytics: async () => mockCost,
    getCommercialPerformanceAnalytics: async () => mockComm,
    getSupplierAnalytics: async () => mockSup
  } as unknown as AnalyticsPostgresRepository;

  const intelEngine = new IntelligenceEngineService(mockAnalyticsRepo);
  const reasoningService = new OperationalReasoningService(mockAnalyticsRepo, intelEngine);

  it('1. Traceability Reasoning: answers origin question with grounded Green lot & Supplier evidence', async () => {
    const res = await reasoningService.answerQuestion({} as any, mockOrgId, {
      question: 'Where did this finished lot come from?'
    });

    assert.equal(res.interpretedIntent, 'TRACEABILITY_ORIGIN');
    assert.ok(res.answer.includes('Green Bean') || res.answer.includes('Pemasok'));
    assert.ok(res.evidence.length > 0);
    assert.ok(res.sourceRefs.length > 0);

    // Verify certainty tag preservation
    for (const ev of res.evidence) {
      assert.ok(['FACT', 'DERIVED', 'HEURISTIC'].includes(ev.certainty));
    }
  });

  it('2. Cost Reasoning: explains HPP structure using absorbed material cost and conversion fee', async () => {
    const res = await reasoningService.answerQuestion({} as any, mockOrgId, {
      question: 'Why is House Blend HPP high?'
    });

    assert.equal(res.interpretedIntent, 'COST_HPP_EXPLANATION');
    assert.ok(res.answer.includes('HPP'));
    assert.ok(res.reasoningSummary.includes('Full Absorption'));

    const hppEv = res.evidence.find(e => e.label.includes('HPP'));
    assert.ok(hppEv);
    assert.equal(hppEv.certainty, 'FACT');
  });

  it('3. Multi-Module Inventory Reasoning: detects fulfillment reservation pressure on finished goods', async () => {
    const res = await reasoningService.answerQuestion({} as any, mockOrgId, {
      question: 'Why is House Blend 1KG under fulfillment pressure?'
    });

    assert.equal(res.interpretedIntent, 'INVENTORY_PRESSURE');
    assert.ok(res.answer.includes('stok fisik') || res.answer.includes('reservasi'));

    const reservedEv = res.evidence.find(e => e.label.includes('Reservasi'));
    assert.ok(reservedEv);
    assert.equal(reservedEv.certainty, 'FACT');
  });

  it('4. Hallucination Resistance & Data Gaps: explicitly states uncertainty when asked about unrecorded supplier quality', async () => {
    const res = await reasoningService.answerQuestion({} as any, mockOrgId, {
      question: 'What information is missing for deciding whether this supplier quality is risky?'
    });

    assert.equal(res.interpretedIntent, 'SUPPLIER_RISK');
    assert.ok(res.uncertainty);
    assert.ok(res.uncertainty.includes('TIDAK mencatat skor kualitas sensori (cupping score)'));
  });
});
