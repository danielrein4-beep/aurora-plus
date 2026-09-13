import {
  KpiCardData,
  CashDrawerBalance,
  VerticalCoverage,
  TransactionSummary,
  CostItem,
  FiscalSummary,
  AccountingEntry
} from './types';

// Tasa oficial BCV demostrativa y fehaciente de referencia
export const DEMO_BCV_RATE = 72.45; // Bs. / USD de referencia para el período de muestra

export const MOCK_KPIS: Record<string, KpiCardData> = {
  ventas: {
    title: 'Ventas Totales',
    subtitle: 'Facturado y cobrado en el período',
    amountUsd: 14850.00,
    amountVes: 1075882.50,
    changePercent: 8.4,
    state: 'VERIFICADO',
    stateExplanation: 'Todas las transacciones de ventas provienen de facturas fiscales y tickets POS sincronizados al 100%.',
    detailsHint: 'Incluye Restaurante y Barra'
  },
  compras: {
    title: 'Compras a Proveedores',
    subtitle: 'Insumos, materia prima y reposición',
    amountUsd: 6320.00,
    amountVes: 457884.00,
    changePercent: -2.1,
    state: 'VERIFICADO',
    stateExplanation: 'Soportado con facturas de proveedores registradas en libro de compras.',
    detailsHint: '8 proveedores principales'
  },
  gastos: {
    title: 'Gastos Operativos',
    subtitle: 'Nómina, servicios, alquiler y mantenimiento',
    amountUsd: 3180.00,
    amountVes: 230391.00,
    changePercent: 4.5,
    state: 'ESTIMADO',
    stateExplanation: 'Se incluye provisión estimada de servicios básicos pendientes de facturar a fin de mes.',
    detailsHint: 'Electricidad e internet calculados por promedio'
  },
  resultado: {
    title: 'Resultado Operativo Estimado',
    subtitle: 'Ventas menos compras y gastos operativos registrados',
    amountUsd: 5350.00,
    amountVes: 387607.50,
    changePercent: 12.8,
    state: 'ESTIMADO',
    stateExplanation: 'Cálculo de flujo operativo disponible antes de depreciaciones y conciliación bancaria final de mes. No representa utilidad neta contable definitiva.',
    detailsHint: 'No constituye Utilidad Neta definitiva'
  }
};

export const MOCK_CASH_BALANCES: CashDrawerBalance[] = [
  {
    id: 'caja-usd',
    accountName: 'Caja Fuerte / Bóveda Efectivo',
    currency: 'USD',
    balance: 2450.00,
    lastReconciliation: 'Hoy, 20:00 (Arqueo ciego confirmado)',
    type: 'EFECTIVO'
  },
  {
    id: 'banco-banesco-ves',
    accountName: 'Banesco Banco Universal (Cta Cte)',
    currency: 'VES',
    balance: 384520.40,
    lastReconciliation: 'Hoy, 19:45 (Vía extracto en línea)',
    type: 'BANCO'
  },
  {
    id: 'pago-movil-bnc',
    accountName: 'Pago Móvil BNC C2P',
    currency: 'VES',
    balance: 142100.80,
    lastReconciliation: 'Hoy, 20:10 (Liquidación automática)',
    type: 'DIGITAL'
  },
  {
    id: 'caja-chica-ves',
    accountName: 'Caja Chica Administrativa',
    currency: 'VES',
    balance: 18500.00,
    lastReconciliation: 'Ayer, 17:00 (Pendiente rendición vales)',
    type: 'EFECTIVO'
  }
];

export const MOCK_COVERAGE: VerticalCoverage[] = [
  {
    verticalId: 'horeca',
    name: 'Restaurante & Comedor (Horeca)',
    coveragePercent: 100,
    activeSourceCount: 3,
    totalSourceCount: 3,
    status: 'COMPLETO',
    notes: 'POS comanda, facturación e inventario de cocina totalmente integrados.'
  },
  {
    verticalId: 'retail',
    name: 'Tienda de Conveniencia / Kiosco',
    coveragePercent: 85,
    activeSourceCount: 2,
    totalSourceCount: 2,
    status: 'PARCIAL',
    notes: 'Ventas y compras sincronizadas; 3 recetas de empaque sin costear.'
  },
  {
    verticalId: 'nomina',
    name: 'Nómina y Talento',
    coveragePercent: 60,
    activeSourceCount: 1,
    totalSourceCount: 2,
    status: 'PARCIAL',
    notes: 'Sueldos base cargados; bonos de asistencia pendientes de cierre quincenal.'
  },
  {
    verticalId: 'tributario',
    name: 'Cumplimiento Fiscal (SENIAT / Alcaldía)',
    coveragePercent: 95,
    activeSourceCount: 4,
    totalSourceCount: 4,
    status: 'COMPLETO',
    notes: 'Libro de ventas al día con correlativos sin saltos.'
  }
];

export const MOCK_TRANSACTIONS: TransactionSummary[] = [
  {
    id: 'tx-001',
    date: 'Hoy, 19:25',
    description: 'Servicio Mesa 14 - Consumo Alimentos y Bebidas',
    type: 'VENTA',
    amountUsd: 145.00,
    amountVes: 10505.25,
    counterparty: 'Cliente Particular',
    vertical: 'Restaurante (Horeca)',
    qualityState: 'VERIFICADO',
    paymentMethod: 'USD Efectivo ($100) + Pago Móvil (Bs. 3,260.25)',
    invoiceNumber: 'FAC-0004921',
    hasAccountingEntry: true
  },
  {
    id: 'tx-002',
    date: 'Hoy, 16:40',
    description: 'Compra de Lomo de Res y Pollo Beneficiado (15kg)',
    type: 'COMPRA',
    amountUsd: 210.00,
    amountVes: 15214.50,
    counterparty: 'Distribuidora Carnes del Centro C.A.',
    vertical: 'Inventario / Cocina',
    qualityState: 'VERIFICADO',
    paymentMethod: 'Transferencia Banesco',
    invoiceNumber: 'FAC-001894',
    hasAccountingEntry: true
  },
  {
    id: 'tx-003',
    date: 'Ayer, 18:15',
    description: 'Gasto Recarga Botellones y Gas Doméstico',
    type: 'GASTO',
    amountUsd: 45.00,
    amountVes: 3260.25,
    counterparty: 'Gas Comunal / Agua Manantial',
    vertical: 'Operaciones',
    qualityState: 'VERIFICADO',
    paymentMethod: 'Caja Chica Efectivo',
    invoiceNumber: 'FAC-000912',
    hasAccountingEntry: true
  },
  {
    id: 'tx-004',
    date: 'Ayer, 12:00',
    description: 'Venta Mostrador Pastelería y Café',
    type: 'VENTA',
    amountUsd: 38.50,
    amountVes: 2789.33,
    counterparty: 'Consumidor Final',
    vertical: 'Retail',
    qualityState: 'VERIFICADO',
    paymentMethod: 'Punto de Venta Débito',
    invoiceNumber: 'FAC-0004920',
    hasAccountingEntry: true
  },
  {
    id: 'tx-005',
    date: 'Hace 2 días',
    description: 'Estimación Provisión Consumo Eléctrico CORPOELEC',
    type: 'GASTO',
    amountUsd: 180.00,
    amountVes: 13041.00,
    counterparty: 'CORPOELEC',
    vertical: 'Servicios Básicos',
    qualityState: 'ESTIMADO',
    paymentMethod: 'Pendiente de pago al corte',
    invoiceNumber: 'EST-MAR-2026',
    hasAccountingEntry: false
  },
  {
    id: 'tx-006',
    date: 'Hace 3 días',
    description: 'Ajuste de inventario: Mermas vegetales sin procesar',
    type: 'GASTO',
    amountUsd: 65.00,
    amountVes: 4709.25,
    counterparty: 'Cocina Central',
    vertical: 'Costos / Mermas',
    qualityState: 'DATOS_INCOMPLETOS',
    paymentMethod: 'N/A (Merma)',
    hasAccountingEntry: false
  }
];

export const MOCK_COSTS: CostItem[] = [
  {
    id: 'cost-1',
    category: 'Materia Prima e Insumos Directos (Alimentos y Bebidas)',
    amountUsd: 4850.00,
    amountVes: 351382.50,
    percentageOfTotal: 51.0,
    isEstimated: false
  },
  {
    id: 'cost-2',
    category: 'Nómina Operativa de Cocina y Salón',
    amountUsd: 2600.00,
    amountVes: 188370.00,
    percentageOfTotal: 27.4,
    isEstimated: false
  },
  {
    id: 'cost-3',
    category: 'Servicios Básicos y Alquiler',
    amountUsd: 1250.00,
    amountVes: 90562.50,
    percentageOfTotal: 13.2,
    isEstimated: true,
    missingDataWarning: 'Factura eléctrica estimada por promedio del mes anterior.'
  },
  {
    id: 'cost-4',
    category: 'Mantenimiento y Suministros Menores',
    amountUsd: 800.00,
    amountVes: 57960.00,
    percentageOfTotal: 8.4,
    isEstimated: false
  }
];

export const MOCK_FISCAL: FiscalSummary = {
  period: 'Marzo 2026 (En curso)',
  officialRateBcv: DEMO_BCV_RATE,
  salesIvaDebito: {
    baseUsd: 14850.00,
    baseVes: 1075882.50,
    ivaUsd: 2376.00,
    ivaVes: 172141.20,
    invoicesCount: 412
  },
  purchasesIvaCredito: {
    baseUsd: 6320.00,
    baseVes: 457884.00,
    ivaUsd: 1011.20,
    ivaVes: 73261.44,
    invoicesCount: 28
  },
  estimatedNetIvaPayableVes: 98879.76, // 172,141.20 - 73,261.44
  correlativeRanges: [
    {
      type: 'Facturas de Venta Electrónicas',
      from: 'FAC-0004510',
      to: 'FAC-0004922',
      missingNumbers: 0
    },
    {
      type: 'Comprobantes de Retención IVA Emitidos',
      from: 'RET-2026-0040',
      to: 'RET-2026-0068',
      missingNumbers: 0
    }
  ],
  rifStatus: {
    rif: 'J-50184920-1',
    razonSocial: 'COMERCIAL AURORA PLUS, C.A.',
    retentionAgent: true,
    validUntil: '18/11/2027 (Al día ante SENIAT)'
  }
};

export const MOCK_ACCOUNTING_SAMPLE: AccountingEntry = {
  id: 'ASIENTO-2026-03-492',
  referenceDoc: 'FAC-0004921 (Servicio Mesa 14)',
  date: 'Hoy, 19:25',
  description: 'Registro de Venta y Cobro en Mostrador Restaurante',
  lines: [
    {
      accountCode: '1.1.01.01',
      accountName: 'Caja Efectivo Divisas USD',
      debit: 100.00,
      credit: 0,
      currency: 'USD'
    },
    {
      accountCode: '1.1.02.04',
      accountName: 'Banco BNC - Recaudación Pago Móvil',
      debit: 45.00, // Equivalente a Bs. 3,260.25
      credit: 0,
      currency: 'USD'
    },
    {
      accountCode: '4.1.01.01',
      accountName: 'Ingresos por Venta Alimentos y Bebidas',
      debit: 0,
      credit: 125.00,
      currency: 'USD'
    },
    {
      accountCode: '2.1.04.01',
      accountName: 'Débito Fiscal IVA por Pagar (16%)',
      debit: 0,
      credit: 20.00,
      currency: 'USD'
    }
  ],
  isBalanced: true
};
