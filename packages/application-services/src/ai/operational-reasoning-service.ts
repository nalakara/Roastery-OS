import pg from 'pg';
import {
  OrganizationId,
  AiQueryRequest,
  AiReasoningResponse,
  AiReasoningEvidenceItem,
  AiSourceRef
} from '@roastery-os/contracts';
import {
  AnalyticsPostgresRepository
} from '@roastery-os/infrastructure-postgres';
import { IntelligenceEngineService } from '../intelligence/intelligence-engine-service.js';
import { AIProvider, DeterministicOperationalReasoner, OperationalEvidenceBundle } from './ai-provider.js';

export class OperationalReasoningService {
  constructor(
    private readonly analyticsRepo: AnalyticsPostgresRepository,
    private readonly intelligenceService: IntelligenceEngineService,
    private readonly aiProvider: AIProvider = new DeterministicOperationalReasoner()
  ) {}

  /**
   * Evaluates user questions by:
   * 1. Interpreting intent
   * 2. Retrieving bounded evidence from authoritative read models & DAGs
   * 3. Constructing an Evidence Matrix with FACT/DERIVED/HEURISTIC certainty
   * 4. Executing AI reasoning via AIProvider
   * 5. Enforcing truth grounding and multi-tenant boundaries
   */
  public async answerQuestion(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId,
    request: AiQueryRequest
  ): Promise<AiReasoningResponse> {
    const { question } = request;
    const q = question.toLowerCase();

    // 1. Intent Classification
    let intent = 'GENERAL_OPERATIONAL';
    if (q.includes('asal') || q.includes('dari mana') || q.includes('where did') || q.includes('silsilah') || q.includes('trace') || q.includes('lineage')) {
      intent = 'TRACEABILITY_ORIGIN';
    } else if (q.includes('hpp') || q.includes('biaya') || q.includes('cost') || q.includes('mahal') || q.includes('expensive')) {
      intent = 'COST_HPP_EXPLANATION';
    } else if (q.includes('tekanan') || q.includes('stok') || q.includes('pressure') || q.includes('habis') || q.includes('fulfillment') || q.includes('available')) {
      intent = 'INVENTORY_PRESSURE';
    } else if (q.includes('perhatian') || q.includes('attention') || q.includes('peringatan') || q.includes('warning') || q.includes('flagged') || q.includes('sinyal')) {
      intent = 'INTELLIGENCE_ALERTS';
    } else if (q.includes('supplier') || q.includes('pemasok') || q.includes('kualitas') || q.includes('quality') || q.includes('risiko') || q.includes('risk')) {
      intent = 'SUPPLIER_RISK';
    } else if (q.includes('yield') || q.includes('rendemen') || q.includes('susut') || q.includes('roast') || q.includes('roasting')) {
      intent = 'PRODUCTION_YIELD';
    }

    // 2. Bounded Context Retrieval
    const evidence: AiReasoningEvidenceItem[] = [];
    const sourceRefs: AiSourceRef[] = [];
    const rawContext: Record<string, any> = {};

    // Fetch necessary analytical and intelligence data in parallel
    const [inv, tx, cost, comm, sup, intelSummary] = await Promise.all([
      this.analyticsRepo.getInventoryPositionAnalytics(client, organizationId),
      this.analyticsRepo.getTransformationPerformanceAnalytics(client, organizationId),
      this.analyticsRepo.getProductionCostAnalytics(client, organizationId),
      this.analyticsRepo.getCommercialPerformanceAnalytics(client, organizationId),
      this.analyticsRepo.getSupplierAnalytics(client, organizationId),
      this.intelligenceService.getSummary(client, organizationId)
    ]);

    rawContext.inventory = inv;
    rawContext.transformations = tx;
    rawContext.costing = cost;
    rawContext.commercial = comm;
    rawContext.suppliers = sup;
    rawContext.intelligenceSignals = intelSummary;

    // 3. Evidence Matrix Assembly by Intent
    if (intent === 'TRACEABILITY_ORIGIN') {
      // Find matching finished goods, intermediate lots, or suppliers
      for (const lot of inv.lots) {
        if (lot.materialCategory === 'FINISHED_GOOD') {
          evidence.push({
            label: `Lot Produk Jadi (${lot.materialName})`,
            value: `${lot.lotNumber} (Stok: ${lot.quantityOnHand.amount} ${lot.quantityOnHand.uom})`,
            certainty: 'FACT',
            sourceRef: { entityType: 'INVENTORY_LOT', entityId: lot.inventoryLotId, entityCode: lot.lotNumber }
          });
          sourceRefs.push({ entityType: 'INVENTORY_LOT', entityId: lot.inventoryLotId, entityCode: lot.lotNumber, summary: lot.materialName });
        } else if (lot.materialCategory === 'RAW_MATERIAL') {
          evidence.push({
            label: `Lot Biji Mentah Green Bean (${lot.materialName})`,
            value: lot.lotNumber,
            certainty: 'FACT',
            sourceRef: { entityType: 'INVENTORY_LOT', entityId: lot.inventoryLotId, entityCode: lot.lotNumber }
          });
          sourceRefs.push({ entityType: 'INVENTORY_LOT', entityId: lot.inventoryLotId, entityCode: lot.lotNumber, summary: lot.materialName });
        }
      }

      for (const s of sup.supplierSummaries) {
        evidence.push({
          label: `Pemasok Bahan Baku Terdaftar`,
          value: `${s.supplierName} (${s.supplierCode})`,
          certainty: 'FACT',
          sourceRef: { entityType: 'SUPPLIER', entityId: s.supplierId, entityCode: s.supplierCode }
        });
        sourceRefs.push({ entityType: 'SUPPLIER', entityId: s.supplierId, entityCode: s.supplierCode, summary: s.supplierName });
      }
    } else if (intent === 'COST_HPP_EXPLANATION') {
      if (cost.producedLots.length > 0) {
        const targetLot = cost.producedLots[0]!;
        evidence.push({
          label: `HPP Satuan Terhitung (Unit Cost)`,
          value: `${targetLot.unitCost.currency} ${Number(targetLot.unitCost.unitPrice).toLocaleString()} / ${targetLot.unitCost.perUom}`,
          certainty: 'FACT',
          sourceRef: { entityType: 'COST_RECORD', entityId: targetLot.inventoryLotId, entityCode: targetLot.lotNumber }
        });
        evidence.push({
          label: `Total Biaya Penyerapan Bahan Baku`,
          value: `${targetLot.materialCost.currency} ${Number(targetLot.materialCost.amount).toLocaleString()}`,
          certainty: 'FACT'
        });
        evidence.push({
          label: `Total Alokasi Beban Konversi Operasional`,
          value: `${targetLot.conversionCost.currency} ${Number(targetLot.conversionCost.amount).toLocaleString()}`,
          certainty: 'FACT'
        });

        sourceRefs.push({ entityType: 'COST_RECORD', entityId: targetLot.inventoryLotId, entityCode: targetLot.lotNumber, summary: targetLot.materialName });
      }

      // Check average yield from transformations
      if (tx.transformations.length > 0) {
        const latestTx = tx.transformations[0]!;
        if (latestTx.yieldRatio) {
          const yieldPct = (Number(latestTx.yieldRatio) * 100).toFixed(1);
          evidence.push({
            label: `Rendemen Batch Transformasi Terkait`,
            value: `${yieldPct}%`,
            certainty: 'DERIVED',
            sourceRef: { entityType: 'TRANSFORMATION', entityId: latestTx.transformationId, entityCode: latestTx.transformationNumber }
          });
          sourceRefs.push({ entityType: 'TRANSFORMATION', entityId: latestTx.transformationId, entityCode: latestTx.transformationNumber });
        }
      }
    } else if (intent === 'INVENTORY_PRESSURE') {
      let totalOnHand = 0;
      let totalReserved = 0;
      let totalAvailable = 0;

      for (const lot of inv.lots) {
        totalOnHand += Number(lot.quantityOnHand.amount);
        totalReserved += Number(lot.reservedQuantity.amount);
        totalAvailable += Number(lot.availableQuantity.amount);

        if (Number(lot.reservedQuantity.amount) > 0) {
          evidence.push({
            label: `Lot Tereservasi Komersial (${lot.materialName})`,
            value: `${lot.lotNumber}: ${lot.reservedQuantity.amount} ${lot.reservedQuantity.uom} dari ${lot.quantityOnHand.amount} ${lot.quantityOnHand.uom}`,
            certainty: 'FACT',
            sourceRef: { entityType: 'INVENTORY_LOT', entityId: lot.inventoryLotId, entityCode: lot.lotNumber }
          });
          sourceRefs.push({ entityType: 'INVENTORY_LOT', entityId: lot.inventoryLotId, entityCode: lot.lotNumber, summary: lot.materialName });
        }
      }

      evidence.push({
        label: `Total Stok Fisik On-Hand Keseluruhan`,
        value: `${totalOnHand.toFixed(2)} unit/kg`,
        certainty: 'FACT'
      });
      evidence.push({
        label: `Total Komitmen Reservasi Wholesale`,
        value: `${totalReserved.toFixed(2)} unit/kg`,
        certainty: 'FACT'
      });
      evidence.push({
        label: `Total Stok Bebas Tersedia`,
        value: `${totalAvailable.toFixed(2)} unit/kg`,
        certainty: 'FACT'
      });
    } else if (intent === 'INTELLIGENCE_ALERTS') {
      for (const sig of intelSummary.signals) {
        evidence.push({
          label: `${sig.severity} Alert: ${sig.title}`,
          value: sig.explanation,
          certainty: sig.evidence[0]?.certainty || 'HEURISTIC',
          sourceRef: { entityType: 'INTELLIGENCE_SIGNAL', entityId: sig.signalId, summary: sig.title }
        });
        sourceRefs.push({ entityType: 'INTELLIGENCE_SIGNAL', entityId: sig.signalId, summary: sig.title });
      }
    } else if (intent === 'SUPPLIER_RISK') {
      evidence.push({
        label: `Total Pembelanjaan Pengadaan Seluruh Pemasok`,
        value: `${sup.totalProcurementSpend.currency} ${Number(sup.totalProcurementSpend.amount).toLocaleString()}`,
        certainty: 'FACT'
      });
      evidence.push({
        label: `Total Transaksi Penerimaan PO`,
        value: `${sup.totalReceiptsCount} kali penerimaan`,
        certainty: 'FACT'
      });

      for (const s of sup.supplierSummaries) {
        evidence.push({
          label: `Belanja Pemasok: ${s.supplierName}`,
          value: `${s.totalSpend.currency} ${Number(s.totalSpend.amount).toLocaleString()} (${s.totalReceipts} PO)`,
          certainty: 'FACT',
          sourceRef: { entityType: 'SUPPLIER', entityId: s.supplierId, entityCode: s.supplierCode }
        });
        sourceRefs.push({ entityType: 'SUPPLIER', entityId: s.supplierId, entityCode: s.supplierCode, summary: s.supplierName });
      }
    } else {
      // General overview
      evidence.push({
        label: `Total Lot Persediaan Aktif`,
        value: `${inv.activeLotsCount} lot`,
        certainty: 'FACT'
      });
      evidence.push({
        label: `Total Nilai Valuasi Persediaan`,
        value: `${inv.totalValuation.currency} ${Number(inv.totalValuation.amount).toLocaleString()}`,
        certainty: 'FACT'
      });
      evidence.push({
        label: `Total Transformasi Selesai`,
        value: `${tx.completedCount} batch`,
        certainty: 'FACT'
      });
      evidence.push({
        label: `Total Pendapatan Penjualan`,
        value: `${comm.totalRevenue.currency} ${Number(comm.totalRevenue.amount).toLocaleString()}`,
        certainty: 'FACT'
      });
    }

    // 4. Bundle Assembly & AI Reasoning
    const evidenceBundle: OperationalEvidenceBundle = {
      intent,
      matchedKeywords: [intent],
      evidence,
      sourceRefs,
      rawContext
    };

    const aiResult = await this.aiProvider.reason({
      question,
      evidenceBundle
    });

    return {
      question,
      interpretedIntent: intent,
      answer: aiResult.answer,
      reasoningSummary: aiResult.reasoningSummary,
      evidence,
      sourceRefs,
      uncertainty: aiResult.uncertainty,
      suggestedFollowups: aiResult.suggestedFollowups,
      evaluatedAt: new Date()
    };
  }
}
