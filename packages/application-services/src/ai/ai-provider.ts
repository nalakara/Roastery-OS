import type {
  AiReasoningEvidenceItem,
  AiSourceRef
} from '@roastery-os/contracts';

export interface OperationalEvidenceBundle {
  readonly intent: string;
  readonly matchedKeywords: readonly string[];
  readonly evidence: readonly AiReasoningEvidenceItem[];
  readonly sourceRefs: readonly AiSourceRef[];
  readonly rawContext: {
    readonly inventory?: any;
    readonly transformations?: any;
    readonly costing?: any;
    readonly commercial?: any;
    readonly suppliers?: any;
    readonly intelligenceSignals?: any;
    readonly traceabilityTrees?: any;
  };
}

export interface AIProvider {
  reason(request: {
    question: string;
    evidenceBundle: OperationalEvidenceBundle;
  }): Promise<{
    answer: string;
    reasoningSummary: string;
    uncertainty?: string;
    suggestedFollowups: string[];
  }>;
}

/**
 * Deterministic Operational Reasoner:
 * Operates offline with zero external AI credentials. Synthesizes answers strictly
 * from retrieved and verified evidence items, respecting FACT/DERIVED/HEURISTIC taxonomy.
 */
export class DeterministicOperationalReasoner implements AIProvider {
  public async reason(request: {
    question: string;
    evidenceBundle: OperationalEvidenceBundle;
  }): Promise<{
    answer: string;
    reasoningSummary: string;
    uncertainty?: string;
    suggestedFollowups: string[];
  }> {
    const { question, evidenceBundle } = request;
    const { intent, evidence, rawContext: _rawContext } = evidenceBundle;

    const q = question.toLowerCase();

    // 1. Traceability & Provenance Question
    if (intent === 'TRACEABILITY_ORIGIN' || q.includes('dari mana') || q.includes('asal') || q.includes('where did')) {
      const greenLots = evidence.filter(e => e.sourceRef?.entityType === 'INVENTORY_LOT' && e.label.includes('Green'));
      const recipes = evidence.filter(e => e.label.includes('Resep') || e.label.includes('Formula'));
      const suppliers = evidence.filter(e => e.sourceRef?.entityType === 'SUPPLIER');

      let ans = `Penelusuran asal (lineage) produk berhasil dipetakan dari catatan transaksi sistem. `;
      if (greenLots.length > 0) {
        ans += `Produk ini diturunkan dari lot biji mentah (Green Bean): ${greenLots.map(g => `${g.value} (${g.label})`).join(', ')}. `;
      }
      if (recipes.length > 0) {
        ans += `Formulasi melalui ${recipes.map(r => r.value).join(', ')}. `;
      }
      if (suppliers.length > 0) {
        ans += `Bahan baku dipasok oleh pemasok resmi: ${suppliers.map(s => s.value).join(', ')}.`;
      }

      return {
        answer: ans.trim(),
        reasoningSummary: `Menghubungkan rantai pohon silsilah (DAG) dari SKU/Lot Akhir -> Transformasi Pengemasan -> Lot Sangrai/Blend -> Transformasi Roasting -> Lot Green Bean -> Penerimaan PO -> Pemasok.`,
        uncertainty: suppliers.length === 0 ? `Silsilah lot terhubung hingga level lot mentah internal roastery, namun catatan PO pemasok asal tidak terlampir pada batch ini.` : undefined,
        suggestedFollowups: [
          'Berapa total HPP yang diakumulasikan sepanjang rantai transformasi ini?',
          'Apakah ada deviasi rendemen pada batch roasting pembentuk lot ini?'
        ]
      };
    }

    // 2. Costing & HPP Explanation
    if (intent === 'COST_HPP_EXPLANATION' || q.includes('hpp') || q.includes('biaya') || q.includes('cost') || q.includes('mahal') || q.includes('expensive')) {
      const hppEv = evidence.find(e => e.label.includes('HPP') || e.label.includes('Unit Cost'));
      const matEv = evidence.find(e => e.label.includes('Bahan Baku') || e.label.includes('Material Cost'));
      const convEv = evidence.find(e => e.label.includes('Konversi') || e.label.includes('Tenaga Kerja'));
      const yieldEv = evidence.find(e => e.label.includes('Rendemen') || e.label.includes('Yield'));

      let ans = `Analisis pembentukan biaya (HPP) lot ini menunjukkan total HPP sebesar ${hppEv ? hppEv.value : 'terekam di sistem'}. `;
      if (matEv && convEv) {
        ans += `Struktur biaya terdiri dari penyerapan biaya bahan baku (${matEv.value}) ditambah alokasi biaya konversi operasional (${convEv.value}). `;
      }
      if (yieldEv) {
        ans += `Rendemen fisik yang tercatat (${yieldEv.value}) mempengaruhi pembagian biaya per unit output fisik.`;
      }

      return {
        answer: ans.trim(),
        reasoningSummary: `Menguraikan penyerapan biaya penuh (Full Absorption Costing): Biaya Lot = Total Nilai Bahan Baku Masuk + Beban Konversi Langsung / Total Unit Fisik Dihasilkan.`,
        uncertainty: `Sistem mencatat pembagian matematis biaya bahan dan konversi, namun faktor eksternal (seperti variasi harga beli green bean di pasar global atau efisiensi operator mesin per menit) tidak terekam secara spesifik.`,
        suggestedFollowups: [
          'Bagaimana perbandingan HPP lot ini terhadap rata-rata kategori?',
          'Apakah ada margin kompresi pada penjualan produk ini?'
        ]
      };
    }

    // 3. Inventory & Fulfillment Pressure
    if (intent === 'INVENTORY_PRESSURE' || q.includes('tekanan') || q.includes('stok') || q.includes('pressure') || q.includes('habis') || q.includes('fulfillment')) {
      const availEv = evidence.find(e => e.label.includes('Tersedia') || e.label.includes('Available'));
      const resEv = evidence.find(e => e.label.includes('Reservasi') || e.label.includes('Reserved'));
      const onHandEv = evidence.find(e => e.label.includes('Fisik') || e.label.includes('On-Hand'));

      let ans = `Kondisi persediaan saat ini `;
      if (onHandEv && availEv) {
        ans += `memiliki total stok fisik on-hand sebesar ${onHandEv.value}, dengan stok bebas tersedia sebesar ${availEv.value}. `;
      }
      if (resEv && Number(resEv.value.split(' ')[0]) > 0) {
        ans += `Terdapat komitmen reservasi pesanan komersial aktif sebesar ${resEv.value} yang mengikat ketersediaan fisik. `;
      }
      ans += `Kondisi ini membatasi kapasitas pemenuhan pesanan instan tanpa jadwal produksi baru.`;

      return {
        answer: ans.trim(),
        reasoningSummary: `Mengevaluasi ketersediaan bebas (Available = QuantityOnHand - ReservedQuantity) terhadap komitmen pesanan komersial yang sedang berjalan.`,
        suggestedFollowups: [
          'Berapa banyak roasted bean yang siap untuk dikemas?',
          'Jadwalkan batch pengemasan untuk menambah ketersediaan stok bebas.'
        ]
      };
    }

    // 4. Intelligence & Attention Signals
    if (intent === 'INTELLIGENCE_ALERTS' || q.includes('perhatian') || q.includes('attention') || q.includes('peringatan') || q.includes('warning') || q.includes('flagged')) {
      const sigs = evidence.filter(e => e.sourceRef?.entityType === 'INTELLIGENCE_SIGNAL');
      let ans = '';
      if (sigs.length === 0) {
        ans = `Saat ini tidak ada sinyal anomali kritis atau deviasi operasional yang aktif di sistem. Seluruh indikator persediaan, yield, dan biaya berada dalam batas acuan normal.`;
      } else {
        ans = `Terdapat ${sigs.length} sinyal operasional yang membutuhkan perhatian manajemen: ` +
          sigs.map(s => `[${s.certainty}] ${s.label}: ${s.value}`).join('; ') + '.';
      }

      return {
        answer: ans,
        reasoningSummary: `Memeriksa engine sinyal intelijen deterministik Phase 11 berdasarkan evaluasi terkini atas seluruh model analitik aktif.`,
        suggestedFollowups: [
          'Bagaimana rincian bukti pendukung untuk sinyal yang paling kritis?',
          'Tindakan operasional apa yang disarankan untuk meresolusi sinyal tersebut?'
        ]
      };
    }

    // 5. Supplier Quality & Risk Gaps
    if (intent === 'SUPPLIER_RISK' || q.includes('supplier') || q.includes('pemasok') || q.includes('kualitas') || q.includes('quality') || q.includes('risiko')) {
      const suppSpend = evidence.find(e => e.label.includes('Belanja') || e.label.includes('Spend'));
      const receipts = evidence.find(e => e.label.includes('Penerimaan') || e.label.includes('Receipts'));

      let ans = `Berdasarkan catatan penerimaan pengadaan: `;
      if (suppSpend && receipts) {
        ans += `Tercatat ${receipts.value} dengan total pembelanjaan ${suppSpend.value}. `;
      }
      ans += `Analisis ketergantungan pasokan menunjukkan konsentrasi belanja pada pemasok utama.`;

      return {
        answer: ans,
        reasoningSummary: `Mengevaluasi rekam jejak penerimaan PO dan konsentrasi pengeluaran per pemasok dari ledger pengadaan.`,
        uncertainty: `Sistem mencatat kuantitas, harga faktur, dan tanggal kedatangan barang, namun TIDAK mencatat skor kualitas sensori (cupping score), tingkat cacat fisik defect green bean per karung, atau performa kepatuhan SLA pengiriman pemasok. Tidak dapat ditarik kesimpulan mengenai kualitas intrinsik kopi tanpa data sensori tersebut.`,
        suggestedFollowups: [
          'Berapa pangsa belanja pemasok ini terhadap total pengadaan roastery?',
          'Material apa saja yang dipasok oleh pemasok ini?'
        ]
      };
    }

    // 6. Generic Operational Synthesis Fallback
    const evidenceSummary = evidence.map(e => `[${e.certainty}] ${e.label}: ${e.value}`).slice(0, 4).join(', ');
    return {
      answer: `Berdasarkan data operasional yang terverifikasi di sistem: ${evidenceSummary || 'Data terkait telah diperiksa dari model analitik operasional'}.`,
      reasoningSummary: `Melakukan sintesis atas ${evidence.length} butir bukti operasional yang relevan dengan pertanyaan '${question}'.`,
      suggestedFollowups: [
        'Apa saja faktor utama yang mempengaruhi metrik ini?',
        'Tampilkan rincian silsilah batch terkait.'
      ]
    };
  }
}
