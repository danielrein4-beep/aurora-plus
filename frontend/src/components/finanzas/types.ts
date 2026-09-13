// Tipos y modelos estrictos para el Centro Financiero de Aurora Plus (Fase Operativa No Fiscal)

export type QualityState = 'VERIFICADO' | 'ESTIMADO' | 'DATOS_INCOMPLETOS';

export type VerticalCoverageStatus = 'CON_DATOS' | 'PARCIAL' | 'SIN_CONEXION';

export type SupportedCurrency = 'USD' | 'VES' | 'COP';

export interface CurrencyBalance {
  currency: SupportedCurrency;
  amount: number;
}

export interface KpiCardData {
  title: string;
  subtitle: string;
  balances: CurrencyBalance[]; // Desglose explícito en monedas admitidas (USD, VES, COP)
  changePercent?: number;
  state: QualityState;
  stateExplanation: string;
  detailsHint?: string;
}

export interface CashDrawerBalance {
  id: string;
  accountName: string;
  currency: SupportedCurrency;
  balance: number;
  lastReconciliation: string;
  type: 'EFECTIVO' | 'BANCO' | 'DIGITAL';
}

export interface VerticalCoverage {
  verticalId: string;
  name: string;
  status: VerticalCoverageStatus; // Estado cualitativo estricto: "Con datos", "Parcial" o "Sin conexión"
  activeSources: string[];
  notes: string;
}

export interface TransactionSummary {
  id: string;
  date: string;
  description: string;
  type: 'VENTA' | 'COMPRA' | 'GASTO';
  currency: SupportedCurrency;
  amount: number;
  counterparty: string;
  vertical: string;
  qualityState: QualityState;
  paymentMethod: string;
  referenciaInterna?: string;
}

export interface CostItem {
  id: string;
  category: string;
  balances: CurrencyBalance[];
  percentageOfTotal: number;
  isEstimated: boolean;
  missingDataWarning?: string;
}

export type NonFiscalDocType = 'NOTA_ENTREGA' | 'DOCUMENTO_VENTA_NO_FISCAL';

export interface NonFiscalDocument {
  id: string;
  docType: NonFiscalDocType;
  referenciaInterna: string; // ej: "NE-HOR-00412" o "DNV-RET-0089"
  date: string;
  verticalOrigin: string; // Vertical de origen (Horeca, Retail, Almacén)
  clientOrBeneficiary: string;
  currency: SupportedCurrency;
  amount: number;
  paymentMethod: string;
  itemsSummary: string;
  qualityState: QualityState;
  nonFiscalNotice: 'DOCUMENTO NO FISCAL'; // Siempre visible
}
