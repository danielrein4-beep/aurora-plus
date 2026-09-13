// Tipos y modelos para el Centro Financiero de Aurora Plus (Fase No Fiscal / Consolidada)

export type QualityState = 'VERIFICADO' | 'ESTIMADO' | 'DATOS_INCOMPLETOS';

export interface CurrencyAmount {
  usd: number;
  ves: number;
  cop?: number;
}

export interface KpiCardData {
  title: string;
  subtitle: string;
  amountUsd: number;
  amountVes: number;
  changePercent: number;
  state: QualityState;
  stateExplanation: string;
  detailsHint?: string;
}

export interface CashDrawerBalance {
  id: string;
  accountName: string;
  currency: 'USD' | 'VES' | 'COP';
  balance: number;
  lastReconciliation: string;
  type: 'EFECTIVO' | 'BANCO' | 'DIGITAL';
}

export interface VerticalCoverage {
  verticalId: string;
  name: string;
  coveragePercent: number;
  activeSourceCount: number;
  totalSourceCount: number;
  status: 'COMPLETO' | 'PARCIAL' | 'DESCONECTADO';
  notes: string;
}

export interface TransactionSummary {
  id: string;
  date: string;
  description: string;
  type: 'VENTA' | 'COMPRA' | 'GASTO';
  amountUsd: number;
  amountVes: number;
  counterparty: string;
  vertical: string;
  qualityState: QualityState;
  paymentMethod: string;
  docReference?: string;
}

export interface CostItem {
  id: string;
  category: string;
  amountUsd: number;
  amountVes: number;
  percentageOfTotal: number;
  isEstimated: boolean;
  missingDataWarning?: string;
}

export type NonFiscalDocType = 'NOTA_ENTREGA' | 'DOCUMENTO_VENTA_NO_FISCAL';

export interface NonFiscalDocument {
  id: string;
  docType: NonFiscalDocType;
  internalReference: string; // ej: "NE-HORECA-00412" o "DNV-RETAIL-0089"
  date: string;
  verticalOrigin: string; // ej: "Restaurante (Horeca)", "Tienda Retail", "Distribuidora"
  clientOrBeneficiary: string;
  amountUsd: number;
  amountVes: number;
  paymentMethod: string;
  itemsSummary: string;
  qualityState: QualityState;
  nonFiscalNotice: string; // "DOCUMENTO NO FISCAL"
}
