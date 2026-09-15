// Operational AI Reasoning Contracts (12_AI_LAYER)

export type AiReasoningCertainty = 'FACT' | 'DERIVED' | 'HEURISTIC';

export interface AiSourceRef {
  readonly entityType: 'INVENTORY_LOT' | 'TRANSFORMATION' | 'COMMERCIAL_ORDER' | 'SKU' | 'SUPPLIER' | 'PURCHASE_RECEIPT' | 'INTELLIGENCE_SIGNAL' | 'COST_RECORD';
  readonly entityId: string;
  readonly entityCode?: string;
  readonly summary?: string;
}

export interface AiReasoningEvidenceItem {
  readonly label: string;
  readonly value: string;
  readonly certainty: AiReasoningCertainty;
  readonly sourceRef?: AiSourceRef;
}

export interface AiQueryRequest {
  readonly question: string;
  readonly contextFilters?: {
    readonly entityId?: string;
    readonly entityType?: string;
  };
}

export interface AiReasoningResponse {
  readonly question: string;
  readonly interpretedIntent: string;
  readonly answer: string;
  readonly reasoningSummary: string;
  readonly evidence: readonly AiReasoningEvidenceItem[];
  readonly sourceRefs: readonly AiSourceRef[];
  readonly uncertainty?: string;
  readonly suggestedFollowups: readonly string[];
  readonly evaluatedAt: Date;
}
