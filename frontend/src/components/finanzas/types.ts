// Tipos y modelos para el Centro Financiero de Aurora Plus

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
  changePercent: number; // e.g. +12.5% vs mes anterior
  state: QualityState;
  stateExplanation: string;
  detailsHint?: string;
}

export interface CashDrawerBalance {
  id: string;
  accountName: string; // ej: "Caja Principal Efectivo", "Banco Banesco Cuenta Corriente", "Pago Móvil BNC"
  currency: 'USD' | 'VES' | 'COP';
  balance: number;
  lastReconciliation: string; // ej: "Hoy, 18:30"
  type: 'EFECTIVO' | 'BANCO' | 'DIGITAL';
}

export interface VerticalCoverage {
  verticalId: string;
  name: string;
  coveragePercent: number; // 0 - 100
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
  counterparty: string; // Cliente o Proveedor
  vertical: string; // ej: "Restaurante (Horeca)", "Retail", "Administración"
  qualityState: QualityState;
  paymentMethod: string;
  invoiceNumber?: string;
  hasAccountingEntry: boolean;
}

export interface AccountingEntryLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  currency: 'USD' | 'VES';
}

export interface AccountingEntry {
  id: string;
  referenceDoc: string;
  date: string;
  description: string;
  lines: AccountingEntryLine[];
  isBalanced: boolean;
}

export interface CostItem {
  id: string;
  category: string; // "Materia Prima (Alimentos)", "Nómina Operativa", "Alquiler", "Servicios"
  amountUsd: number;
  amountVes: number;
  percentageOfTotal: number;
  isEstimated: boolean;
  missingDataWarning?: string;
}

export interface FiscalSummary {
  period: string; // "Marzo 2026"
  officialRateBcv: number; // Tasa de cambio oficial BCV de referencia
  salesIvaDebito: {
    baseUsd: number;
    baseVes: number;
    ivaUsd: number;
    ivaVes: number;
    invoicesCount: number;
  };
  purchasesIvaCredito: {
    baseUsd: number;
    baseVes: number;
    ivaUsd: number;
    ivaVes: number;
    invoicesCount: number;
  };
  estimatedNetIvaPayableVes: number;
  correlativeRanges: {
    type: string;
    from: string;
    to: string;
    missingNumbers: number;
  }[];
  rifStatus: {
    rif: string;
    razonSocial: string;
    retentionAgent: boolean;
    validUntil: string;
  };
}
