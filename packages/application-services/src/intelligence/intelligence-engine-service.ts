import { 
  OrganizationId,
  IntelligenceSignal
} from '@roastery-os/contracts';
import { 
  AnalyticsPostgresRepository 
} from '@roastery-os/infrastructure-postgres';
import pg from 'pg';

export interface IntelligenceThresholdConfig {
  readonly lowStockUnitThreshold: number; // e.g. 5 units
  readonly lowStockKgThreshold: number; // e.g. 10 kg
  readonly partialLotAgingDaysThreshold: number; // e.g. 7 days
  readonly roastingYieldMinPercent: number; // e.g. 82.0%
  readonly roastingWasteMaxPercent: number; // e.g. 18.0%
  readonly hppOutlierDeviationPercent: number; // e.g. 15.0%
  readonly marginCompressionMinPercent: number; // e.g. 25.0%
}

export const DEFAULT_DIAGNOSTIC_THRESHOLDS: IntelligenceThresholdConfig = {
  lowStockUnitThreshold: 5.0,
  lowStockKgThreshold: 10.0,
  partialLotAgingDaysThreshold: 7,
  roastingYieldMinPercent: 82.0,
  roastingWasteMaxPercent: 18.0,
  hppOutlierDeviationPercent: 15.0,
  marginCompressionMinPercent: 25.0
};

export class IntelligenceEngineService {
  constructor(
    private readonly analyticsRepo: AnalyticsPostgresRepository,
    private readonly config: IntelligenceThresholdConfig = DEFAULT_DIAGNOSTIC_THRESHOLDS
  ) {}

  /**
   * Evaluates all deterministic rules across physical, economic, and commercial read models.
   */
  public async evaluateSignals(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId
  ): Promise<IntelligenceSignal[]> {
    const signals: IntelligenceSignal[] = [];

    // 1. Fetch Authoritative Read Models in Parallel
    const [inv, tx, cost, comm, sup] = await Promise.all([
      this.analyticsRepo.getInventoryPositionAnalytics(client, organizationId),
      this.analyticsRepo.getTransformationPerformanceAnalytics(client, organizationId),
      this.analyticsRepo.getProductionCostAnalytics(client, organizationId),
      this.analyticsRepo.getCommercialPerformanceAnalytics(client, organizationId),
      this.analyticsRepo.getSupplierAnalytics(client, organizationId)
    ]);

    // ------------------------------------------------------------------------
    // Rule A: Inventory Attention (Low Stock & Aging Partial Lots)
    // ------------------------------------------------------------------------
    for (const lot of inv.lots) {
      if (lot.lotState !== 'ACTIVE') continue;

      const avail = Number(lot.availableQuantity.amount);
      const uom = lot.availableQuantity.uom;
      const isCount = ['UNIT', 'PACK', 'BOX'].includes(uom);
      const threshold = isCount ? this.config.lowStockUnitThreshold : this.config.lowStockKgThreshold;

      if (avail <= threshold) {
        signals.push({
          signalId: `SIG-LOW-STK-${lot.inventoryLotId.substring(0, 8)}`,
          signalType: 'LOW_AVAILABLE_STOCK',
          domain: 'INVENTORY',
          severity: avail === 0 ? 'CRITICAL' : 'WARNING',
          title: `Stok Tersedia Rendah: ${lot.materialName} (${lot.lotNumber})`,
          explanation: `Sisa stok tersedia untuk lot ini adalah ${avail.toFixed(2)} ${uom}, berada di bawah batas peringatan operasional (${threshold} ${uom}).`,
          evidence: [
            { label: 'Stok Fisik Tersedia', value: `${avail.toFixed(2)} ${uom}`, certainty: 'FACT', sourceRef: { entityType: 'INVENTORY_LOT', entityId: lot.inventoryLotId, entityCode: lot.lotNumber } },
            { label: 'Kuantitas Tereservasi', value: `${Number(lot.reservedQuantity.amount).toFixed(2)} ${uom}`, certainty: 'FACT' },
            { label: 'Batas Ambang Peringatan', value: `${threshold} ${uom}`, certainty: 'HEURISTIC' }
          ],
          suggestedAction: {
            label: 'Inspeksi Ketersediaan Lot & Rencanakan Produksi',
            actionType: 'INSPECT_LOT',
            targetScreen: 'traceability-explorer',
            targetParams: { lotNumber: lot.lotNumber }
          },
          detectedAt: new Date()
        });
      }

      // Aging Partial Lot check
      if (lot.ageDays >= this.config.partialLotAgingDaysThreshold && Number(lot.quantityOnHand.amount) > 0) {
        signals.push({
          signalId: `SIG-AGING-LOT-${lot.inventoryLotId.substring(0, 8)}`,
          signalType: 'AGING_PARTIAL_LOT',
          domain: 'INVENTORY',
          severity: 'ATTENTION',
          title: `Lot Mengendap (Aging): ${lot.lotNumber} (${lot.ageDays} Hari)`,
          explanation: `Lot material ${lot.materialName} telah tersimpan selama ${lot.ageDays} hari sejak diterima. Periksa kondisi fisik atau prioritaskan pemakaian (FIFO).`,
          evidence: [
            { label: 'Usia Simpan Lot', value: `${lot.ageDays} Hari`, certainty: 'DERIVED', sourceRef: { entityType: 'INVENTORY_LOT', entityId: lot.inventoryLotId, entityCode: lot.lotNumber } },
            { label: 'Kuantitas Fisik Tersisa', value: `${Number(lot.quantityOnHand.amount).toFixed(2)} ${uom}`, certainty: 'FACT' },
            { label: 'Tanggal Diterima', value: new Date(lot.receivedAt).toISOString().split('T')[0]!, certainty: 'FACT' }
          ],
          suggestedAction: {
            label: 'Prioritaskan pada Jadwal Transformasi Berikutnya',
            actionType: 'INSPECT_LOT',
            targetScreen: 'roast-exec'
          },
          detectedAt: new Date()
        });
      }
    }

    // ------------------------------------------------------------------------
    // Rule B: Production & Yield Deviations
    // ------------------------------------------------------------------------
    for (const t of tx.transformations) {
      if (t.archetype === 'ROASTING' && t.status === 'COMPLETED' && t.yieldRatio) {
        const yieldPct = Number(t.yieldRatio) * 100;
        if (yieldPct < this.config.roastingYieldMinPercent) {
          signals.push({
            signalId: `SIG-YIELD-DEV-${t.transformationId.substring(0, 8)}`,
            signalType: 'YIELD_DEVIATION',
            domain: 'PRODUCTION',
            severity: 'WARNING',
            title: `Deviasi Rendemen Roasting: ${t.transformationNumber} (${yieldPct.toFixed(1)}%)`,
            explanation: `Rendemen fisik hasil roasting (${yieldPct.toFixed(1)}%) lebih rendah dari standar acuan minimum (${this.config.roastingYieldMinPercent}%). Terdapat penyusutan/waste berlebih.`,
            evidence: [
              { label: 'Rendemen Aktual (Yield)', value: `${yieldPct.toFixed(2)}%`, certainty: 'DERIVED', sourceRef: { entityType: 'TRANSFORMATION', entityId: t.transformationId, entityCode: t.transformationNumber } },
              { label: 'Bahan Baku Masuk', value: `${t.primaryInputQuantity?.amount} ${t.primaryInputQuantity?.uom}`, certainty: 'FACT' },
              { label: 'Hasil Roasted Keluar', value: `${t.primaryOutputQuantity?.amount} ${t.primaryOutputQuantity?.uom}`, certainty: 'FACT' },
              { label: 'Susut & Chaff Waste', value: `${t.unrecoverableWasteQuantity?.amount || '0'} ${t.primaryInputQuantity?.uom}`, certainty: 'FACT' },
              { label: 'Standar Acuan Minimum', value: `${this.config.roastingYieldMinPercent}%`, certainty: 'HEURISTIC' }
            ],
            suggestedAction: {
              label: 'Inspeksi Parameter Mesin & Telemetri Batch',
              actionType: 'INSPECT_TRANSFORMATION',
              targetScreen: 'roast-inspector',
              targetParams: { transformationId: t.transformationId }
            },
            detectedAt: new Date()
          });
        }
      }
    }

    // ------------------------------------------------------------------------
    // Rule C: Costing & HPP Outlier Analysis
    // ------------------------------------------------------------------------
    const finishedLots = cost.producedLots.filter(l => l.materialCategory === 'FINISHED_GOOD');
    if (finishedLots.length >= 2) {
      const avgHpp = finishedLots.reduce((acc, l) => acc + Number(l.unitCost.unitPrice), 0) / finishedLots.length;
      for (const lot of finishedLots) {
        const unitCostNum = Number(lot.unitCost.unitPrice);
        const diffPercent = ((unitCostNum - avgHpp) / avgHpp) * 100;

        if (diffPercent >= this.config.hppOutlierDeviationPercent) {
          signals.push({
            signalId: `SIG-COST-HPP-${lot.inventoryLotId.substring(0, 8)}`,
            signalType: 'COST_ANOMALY_HPP',
            domain: 'COSTING',
            severity: 'ATTENTION',
            title: `HPP Lebih Tinggi dari Rata-Rata: ${lot.lotNumber}`,
            explanation: `HPP satuan lot ini (${lot.unitCost.currency} ${unitCostNum.toLocaleString()}) adalah +${diffPercent.toFixed(1)}% lebih tinggi daripada rata-rata produk sejenis (${lot.unitCost.currency} ${avgHpp.toLocaleString()}).`,
            evidence: [
              { label: 'HPP Satuan Lot', value: `${lot.unitCost.currency} ${unitCostNum.toLocaleString()}`, certainty: 'FACT', sourceRef: { entityType: 'INVENTORY_LOT', entityId: lot.inventoryLotId, entityCode: lot.lotNumber } },
              { label: 'Rata-Rata HPP Kategori', value: `${lot.unitCost.currency} ${avgHpp.toLocaleString()}`, certainty: 'DERIVED' },
              { label: 'Biaya Konversi Langsung', value: `${lot.conversionCost.currency} ${Number(lot.conversionCost.amount).toLocaleString()}`, certainty: 'FACT' },
              { label: 'Deviasi Relatif', value: `+${diffPercent.toFixed(1)}%`, certainty: 'DERIVED' }
            ],
            suggestedAction: {
              label: 'Inspeksi Komposisi Biaya Penyerapan',
              actionType: 'REVIEW_COSTING',
              targetScreen: 'operational-analytics'
            },
            detectedAt: new Date()
          });
        }
      }
    }

    // ------------------------------------------------------------------------
    // Rule D: Commercial Fulfillment Risk & Margin Compression
    // ------------------------------------------------------------------------
    for (const sku of comm.skuSummaries) {
      const gm = Number(sku.grossMarginPercentage);
      if (gm < this.config.marginCompressionMinPercent && Number(sku.totalRevenue.amount) > 0) {
        signals.push({
          signalId: `SIG-COMM-MARGIN-${sku.skuId.substring(0, 8)}`,
          signalType: 'MARGIN_COMPRESSION',
          domain: 'COMMERCIAL',
          severity: 'WARNING',
          title: `Kompresi Margin Kotor: ${sku.skuCode}`,
          explanation: `Margin kotor produk ${sku.skuName} saat ini hanya ${gm.toFixed(1)}%, berada di bawah target acuan profitabilitas (${this.config.marginCompressionMinPercent}%).`,
          evidence: [
            { label: 'Margin Kotor Aktual', value: `${gm.toFixed(2)}%`, certainty: 'DERIVED', sourceRef: { entityType: 'SKU', entityId: sku.skuId, entityCode: sku.skuCode } },
            { label: 'Total Pendapatan', value: `${sku.totalRevenue.currency} ${Number(sku.totalRevenue.amount).toLocaleString()}`, certainty: 'FACT' },
            { label: 'Total COGS (HPP)', value: `${sku.totalCogs.currency} ${Number(sku.totalCogs.amount).toLocaleString()}`, certainty: 'FACT' },
            { label: 'Target Margin Minimum', value: `${this.config.marginCompressionMinPercent}%`, certainty: 'HEURISTIC' }
          ],
          suggestedAction: {
            label: 'Evaluasi Penetapan Harga Jual atau Optimasi Biaya Produksi',
            actionType: 'INSPECT_ORDER',
            targetScreen: 'prod-catalog'
          },
          detectedAt: new Date()
        });
      }
    }

    // ------------------------------------------------------------------------
    // Rule E: Cross-Module Reasoning (Reservation Pressure vs Available Stock)
    // ------------------------------------------------------------------------
    for (const lot of inv.lots) {
      const onHand = Number(lot.quantityOnHand.amount);
      const reserved = Number(lot.reservedQuantity.amount);
      if (onHand > 0 && reserved > 0 && (reserved / onHand) >= 0.70) {
        const reserveRatioPct = ((reserved / onHand) * 100).toFixed(1);
        signals.push({
          signalId: `SIG-CROSS-RES-${lot.inventoryLotId.substring(0, 8)}`,
          signalType: 'CROSS_MODULE_BOTTLENECK',
          domain: 'CROSS_MODULE',
          severity: 'ATTENTION',
          title: `Tekanan Reservasi Tinggi pada Lot: ${lot.lotNumber} (${reserveRatioPct}%)`,
          explanation: `${reserveRatioPct}% dari total stok fisik pada lot ${lot.materialName} telah terikat oleh komitmen pesanan komersial. Ketersediaan bebas hanya tersisa ${(onHand - reserved).toFixed(2)} ${lot.quantityOnHand.uom}.`,
          evidence: [
            { label: 'Kuantitas Tereservasi', value: `${reserved.toFixed(2)} ${lot.quantityOnHand.uom}`, certainty: 'FACT', sourceRef: { entityType: 'INVENTORY_LOT', entityId: lot.inventoryLotId, entityCode: lot.lotNumber } },
            { label: 'Total Stok Fisik On-Hand', value: `${onHand.toFixed(2)} ${lot.quantityOnHand.uom}`, certainty: 'FACT' },
            { label: 'Rasio Keterikatan Stok', value: `${reserveRatioPct}%`, certainty: 'DERIVED' }
          ],
          suggestedAction: {
            label: 'Jadwalkan Produksi Pengemasan Tambahan',
            actionType: 'TRIGGER_PACKAGING',
            targetScreen: 'prod-exec'
          },
          detectedAt: new Date()
        });
      }
    }

    // ------------------------------------------------------------------------
    // Rule F: Supplier Concentration Attention
    // ------------------------------------------------------------------------
    if (sup.supplierSummaries.length > 1 && Number(sup.totalProcurementSpend.amount) > 0) {
      const totalSpendNum = Number(sup.totalProcurementSpend.amount);
      for (const s of sup.supplierSummaries) {
        const suppSpendNum = Number(s.totalSpend.amount);
        const sharePct = (suppSpendNum / totalSpendNum) * 100;
        if (sharePct >= 75) {
          signals.push({
            signalId: `SIG-SUPP-CONC-${s.supplierId.substring(0, 8)}`,
            signalType: 'SUPPLIER_RISK',
            domain: 'SUPPLIER',
            severity: 'ATTENTION',
            title: `Konsentrasi Pengeluaran Pemasok Tinggi: ${s.supplierName} (${sharePct.toFixed(1)}%)`,
            explanation: `${sharePct.toFixed(1)}% dari total belanja pengadaan terkonsentrasi pada pemasok ${s.supplierName}. Ketergantungan pasokan tunggal yang tinggi berpotensi menimbulkan risiko rantai pasok jika terjadi disrupsi.`,
            evidence: [
              { label: 'Pangsa Belanja Pemasok', value: `${sharePct.toFixed(1)}%`, certainty: 'DERIVED', sourceRef: { entityType: 'SUPPLIER', entityId: s.supplierId, entityCode: s.supplierCode } },
              { label: 'Total Belanja pada Pemasok', value: `${s.totalSpend.currency} ${suppSpendNum.toLocaleString()}`, certainty: 'FACT' },
              { label: 'Total Belanja Seluruh Pengadaan', value: `${sup.totalProcurementSpend.currency} ${totalSpendNum.toLocaleString()}`, certainty: 'FACT' },
              { label: 'Batas Acuan Konsentrasi', value: '75%', certainty: 'HEURISTIC' }
            ],
            suggestedAction: {
              label: 'Tinjau Rantai Pasok dan Pertimbangkan Pemasok Alternatif',
              actionType: 'INSPECT_SUPPLIER',
              targetScreen: 'proc-supplier'
            },
            detectedAt: new Date()
          });
        }
      }
    }

    return signals;
  }

  /**
   * Generates summary aggregates across severity and domains.
   */
  public async getSummary(
    client: pg.PoolClient | pg.Pool,
    organizationId: OrganizationId
  ) {
    const signals = await this.evaluateSignals(client, organizationId);
    
    let critical = 0;
    let warning = 0;
    let attention = 0;
    let info = 0;

    let inventory = 0;
    let production = 0;
    let costing = 0;
    let commercial = 0;
    let supplier = 0;
    let crossModule = 0;

    for (const s of signals) {
      if (s.severity === 'CRITICAL') critical++;
      else if (s.severity === 'WARNING') warning++;
      else if (s.severity === 'ATTENTION') attention++;
      else if (s.severity === 'INFO') info++;

      if (s.domain === 'INVENTORY') inventory++;
      else if (s.domain === 'PRODUCTION') production++;
      else if (s.domain === 'COSTING') costing++;
      else if (s.domain === 'COMMERCIAL') commercial++;
      else if (s.domain === 'SUPPLIER') supplier++;
      else if (s.domain === 'CROSS_MODULE') crossModule++;
    }

    return {
      asOfDate: new Date(),
      totalSignals: signals.length,
      countsBySeverity: { critical, warning, attention, info },
      countsByDomain: { inventory, production, costing, commercial, supplier, crossModule },
      signals
    };
  }
}
