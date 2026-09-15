// Operational Intelligence & Decision Support Layer Contracts (12_AI_LAYER)

export type IntelligenceSignalSeverity = 'INFO' | 'ATTENTION' | 'WARNING' | 'CRITICAL';

export type IntelligenceDomain = 
  | 'INVENTORY' 
  | 'PRODUCTION' 
  | 'COSTING' 
  | 'COMMERCIAL' 
  | 'SUPPLIER' 
  | 'CROSS_MODULE';

export type IntelligenceCertainty = 'FACT' | 'DERIVED' | 'HEURISTIC';

export type IntelligenceSignalType =
  | 'LOW_AVAILABLE_STOCK'
  | 'AGING_PARTIAL_LOT'
  | 'YIELD_DEVIATION'
  | 'COST_ANOMALY_HPP'
  | 'COMMERCIAL_FULFILLMENT_RISK'
  | 'MARGIN_COMPRESSION'
  | 'PROCUREMENT_PRICE_SPIKE'
  | 'SUPPLIER_RISK'
  | 'CROSS_MODULE_BOTTLENECK';

export interface SignalSourceRef {
  readonly entityType: 'INVENTORY_LOT' | 'TRANSFORMATION' | 'COMMERCIAL_ORDER' | 'SKU' | 'SUPPLIER' | 'PURCHASE_RECEIPT';
  readonly entityId: string;
  readonly entityCode?: string;
}

export interface SignalEvidenceItem {
  readonly label: string;
  readonly value: string;
  readonly certainty: IntelligenceCertainty;
  readonly sourceRef?: SignalSourceRef;
}

export interface SuggestedAction {
  readonly label: string;
  readonly actionType: 'INSPECT_LOT' | 'INSPECT_TRANSFORMATION' | 'INSPECT_ORDER' | 'TRIGGER_ROAST' | 'TRIGGER_PACKAGING' | 'REVIEW_COSTING' | 'INSPECT_SUPPLIER';
  readonly targetScreen: string;
  readonly targetParams?: Record<string, string>;
}

export interface IntelligenceSignal {
  readonly signalId: string;
  readonly signalType: IntelligenceSignalType;
  readonly domain: IntelligenceDomain;
  readonly severity: IntelligenceSignalSeverity;
  readonly title: string;
  readonly explanation: string;
  readonly evidence: readonly SignalEvidenceItem[];
  readonly suggestedAction?: SuggestedAction;
  readonly detectedAt: Date;
}

export interface IntelligenceSummaryResponse {
  readonly asOfDate: Date;
  readonly totalSignals: number;
  readonly countsBySeverity: {
    readonly critical: number;
    readonly warning: number;
    readonly attention: number;
    readonly info: number;
  };
  readonly countsByDomain: {
    readonly inventory: number;
    readonly production: number;
    readonly costing: number;
    readonly commercial: number;
    readonly supplier: number;
    readonly crossModule: number;
  };
  readonly signals: readonly IntelligenceSignal[];
}
