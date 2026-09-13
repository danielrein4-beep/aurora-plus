import {
  KpiCardData,
  CashDrawerBalance,
  VerticalCoverage,
  TransactionSummary,
  CostItem,
  NonFiscalDocument
} from './types';

// Tasa referencial documental de muestra
export const DEMO_BCV_RATE = 72.45; // Bs. / USD de referencia estática

export const MOCK_KPIS: Record<string, KpiCardData> = {
  ventas: {
    title: 'Ventas Totales Registradas',
    subtitle: 'Consolidado de ventas operativas del período',
    amountUsd: 14850.00,
    amountVes: 1075882.50,
    changePercent: 8.4,
    state: 'VERIFICADO',
    stateExplanation: 'Transacciones operativas registradas y cobradas en puntos de venta y mostrador.',
    detailsHint: 'Consolidado Horeca y Retail'
  },
  compras: {
    title: 'Compras a Proveedores',
    subtitle: 'Reposición de materia prima e insumos directos',
    amountUsd: 6320.00,
    amountVes: 457884.00,
    changePercent: -2.1,
    state: 'VERIFICADO',
    stateExplanation: 'Notas de entrega y recepciones de almacén confirmadas.',
    detailsHint: '8 proveedores activos'
  },
  gastos: {
    title: 'Gastos Operativos',
    subtitle: 'Nómina, servicios y mantenimiento general',
    amountUsd: 3180.00,
    amountVes: 230391.00,
    changePercent: 4.5,
    state: 'ESTIMADO',
    stateExplanation: 'Incluye provisión estimada de servicios básicos pendientes de corte a fin de mes.',
    detailsHint: 'Servicios calculados por promedio'
  },
  resultado: {
    title: 'Resultado Operativo Estimado',
    subtitle: 'Ventas menos compras y gastos operativos registrados',
    amountUsd: 5350.00,
    amountVes: 387607.50,
    changePercent: 12.8,
    state: 'ESTIMADO',
    stateExplanation: 'Cálculo de flujo operativo disponible antes de conciliaciones finales. No representa utilidad neta contable ni fiscal.',
    detailsHint: 'No constituye Utilidad Neta'
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
    notes: 'Comandas, notas de entrega internas y consumo de cocina integrados.'
  },
  {
    verticalId: 'retail',
    name: 'Tienda de Conveniencia / Kiosco',
    coveragePercent: 85,
    activeSourceCount: 2,
    totalSourceCount: 2,
    status: 'PARCIAL',
    notes: 'Ventas y compras sincronizadas; artículos de empaque en revisión.'
  },
  {
    verticalId: 'nomina',
    name: 'Nómina y Personal',
    coveragePercent: 60,
    activeSourceCount: 1,
    totalSourceCount: 2,
    status: 'PARCIAL',
    notes: 'Sueldos base cargados; bonos operativos pendientes de cierre quincenal.'
  },
  {
    verticalId: 'documentos',
    name: 'Consolidación de Documentos',
    coveragePercent: 95,
    activeSourceCount: 4,
    totalSourceCount: 4,
    status: 'COMPLETO',
    notes: 'Notas de entrega y comprobantes comerciales no fiscales consolidados.'
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
    docReference: 'DNV-HOR-004921'
  },
  {
    id: 'tx-002',
    date: 'Hoy, 16:40',
    description: 'Recepción Lomo de Res y Pollo Beneficiado (15kg)',
    type: 'COMPRA',
    amountUsd: 210.00,
    amountVes: 15214.50,
    counterparty: 'Distribuidora Carnes del Centro C.A.',
    vertical: 'Inventario / Cocina',
    qualityState: 'VERIFICADO',
    paymentMethod: 'Transferencia Banesco',
    docReference: 'NE-PROV-001894'
  },
  {
    id: 'tx-003',
    date: 'Ayer, 18:15',
    description: 'Gasto Recarga Botellones y Gas Operativo',
    type: 'GASTO',
    amountUsd: 45.00,
    amountVes: 3260.25,
    counterparty: 'Gas Comunal / Agua Manantial',
    vertical: 'Operaciones',
    qualityState: 'VERIFICADO',
    paymentMethod: 'Caja Chica Efectivo',
    docReference: 'NE-INT-000912'
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
    docReference: 'DNV-RET-004920'
  },
  {
    id: 'tx-005',
    date: 'Hace 2 días',
    description: 'Estimación Provisión Consumo Eléctrico',
    type: 'GASTO',
    amountUsd: 180.00,
    amountVes: 13041.00,
    counterparty: 'Servicio Eléctrico',
    vertical: 'Servicios Básicos',
    qualityState: 'ESTIMADO',
    paymentMethod: 'Pendiente de pago al corte',
    docReference: 'EST-SERV-MAR'
  },
  {
    id: 'tx-006',
    date: 'Hace 3 días',
    description: 'Ajuste de cocina: Mermas vegetales sin procesar',
    type: 'GASTO',
    amountUsd: 65.00,
    amountVes: 4709.25,
    counterparty: 'Cocina Central',
    vertical: 'Costos / Mermas',
    qualityState: 'DATOS_INCOMPLETOS',
    paymentMethod: 'N/A (Merma interna)',
    docReference: 'AJU-INT-0082'
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

export const MOCK_NON_FISCAL_DOCS: NonFiscalDocument[] = [
  {
    id: 'doc-001',
    docType: 'DOCUMENTO_VENTA_NO_FISCAL',
    internalReference: 'DNV-HOR-004921',
    date: 'Hoy, 19:25',
    verticalOrigin: 'Restaurante & Comedor (Horeca)',
    clientOrBeneficiary: 'Consumo Mesa 14',
    amountUsd: 145.00,
    amountVes: 10505.25,
    paymentMethod: 'USD Efectivo + Pago Móvil',
    itemsSummary: '1 Parrilla Especial, 2 Bebidas Artesanales, 1 Postre de la Casa',
    qualityState: 'VERIFICADO',
    nonFiscalNotice: 'DOCUMENTO NO FISCAL'
  },
  {
    id: 'doc-002',
    docType: 'NOTA_ENTREGA',
    internalReference: 'NE-HOR-000318',
    date: 'Hoy, 17:10',
    verticalOrigin: 'Restaurante & Comedor (Horeca)',
    clientOrBeneficiary: 'Despacho Delivery Corporativo',
    amountUsd: 85.00,
    amountVes: 6158.25,
    paymentMethod: 'Transferencia Bancaria Inmediata',
    itemsSummary: '6 Almuerzos Ejecutivos con bebida para oficina aliada',
    qualityState: 'VERIFICADO',
    nonFiscalNotice: 'DOCUMENTO NO FISCAL'
  },
  {
    id: 'doc-003',
    docType: 'DOCUMENTO_VENTA_NO_FISCAL',
    internalReference: 'DNV-RET-004920',
    date: 'Ayer, 12:00',
    verticalOrigin: 'Tienda de Conveniencia / Kiosco',
    clientOrBeneficiary: 'Cliente Mostrador',
    amountUsd: 38.50,
    amountVes: 2789.33,
    paymentMethod: 'Punto de Venta Débito',
    itemsSummary: 'Combo Café Gourmet + 2 Snacks Importados',
    qualityState: 'VERIFICADO',
    nonFiscalNotice: 'DOCUMENTO NO FISCAL'
  },
  {
    id: 'doc-004',
    docType: 'NOTA_ENTREGA',
    internalReference: 'NE-ALM-000842',
    date: 'Ayer, 09:30',
    verticalOrigin: 'Almacén Central / Inventario',
    clientOrBeneficiary: 'Recepción Proveedor Frutas & Legumbres',
    amountUsd: 180.00,
    amountVes: 13041.00,
    paymentMethod: 'Contraentrega Efectivo',
    itemsSummary: 'Cajas de tomate, cebolla morada, lechuga hidropónica',
    qualityState: 'VERIFICADO',
    nonFiscalNotice: 'DOCUMENTO NO FISCAL'
  },
  {
    id: 'doc-005',
    docType: 'DOCUMENTO_VENTA_NO_FISCAL',
    internalReference: 'DNV-HOR-004918',
    date: 'Hace 2 días, 21:00',
    verticalOrigin: 'Restaurante & Comedor (Horeca)',
    clientOrBeneficiary: 'Servicio Barra / Coctelería',
    amountUsd: 92.00,
    amountVes: 6665.40,
    paymentMethod: 'Pago Móvil BNC',
    itemsSummary: 'Servicio de coctelería y picada mixta',
    qualityState: 'VERIFICADO',
    nonFiscalNotice: 'DOCUMENTO NO FISCAL'
  }
];
