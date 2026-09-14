import {
  KpiCardData,
  CashDrawerBalance,
  VerticalCoverage,
  TransactionSummary,
  CostItem,
  NonFiscalDocument
} from './types';

export const MOCK_KPIS: Record<string, KpiCardData> = {
  ventas: {
    title: 'Ventas Totales Registradas',
    subtitle: 'Consolidado de ventas operativas del período por moneda admitida',
    balances: [
      { currency: 'USD', amount: 14850.00 },
      { currency: 'VES', amount: 324500.00 },
      { currency: 'COP', amount: 1250000.00 }
    ],
    changePercent: 8.4,
    state: 'VERIFICADO',
    stateExplanation: 'Transacciones operativas registradas en comandas de cocina y puntos de venta.',
    detailsHint: 'Consolidado Horeca y Retail'
  },
  compras: {
    title: 'Compras a Proveedores',
    subtitle: 'Reposición de materia prima e insumos directos',
    balances: [
      { currency: 'USD', amount: 6320.00 },
      { currency: 'VES', amount: 112000.00 },
      { currency: 'COP', amount: 480000.00 }
    ],
    changePercent: -2.1,
    state: 'VERIFICADO',
    stateExplanation: 'Notas de entrega y recepciones de almacén recibidas.',
    detailsHint: '8 proveedores activos'
  },
  gastos: {
    title: 'Gastos Operativos',
    subtitle: 'Nómina, servicios y mantenimiento general',
    balances: [
      { currency: 'USD', amount: 3180.00 },
      { currency: 'VES', amount: 78500.00 }
    ],
    changePercent: 4.5,
    state: 'ESTIMADO',
    stateExplanation: 'Incluye provisión estimada de servicios básicos pendientes de corte a fin de mes.',
    detailsHint: 'Servicios calculados por promedio'
  },
  resultado: {
    title: 'Resultado Operativo Estimado',
    subtitle: 'Ventas menos compras y gastos operativos registrados',
    balances: [
      { currency: 'USD', amount: 5350.00 },
      { currency: 'VES', amount: 134000.00 },
      { currency: 'COP', amount: 770000.00 }
    ],
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
    id: 'banco-ves',
    accountName: 'Banco Cuenta Corriente (VES)',
    currency: 'VES',
    balance: 384520.40,
    lastReconciliation: 'Hoy, 19:45 (Vía extracto en línea)',
    type: 'BANCO'
  },
  {
    id: 'pago-movil-ves',
    accountName: 'Pago Móvil Recaudación (VES)',
    currency: 'VES',
    balance: 142100.80,
    lastReconciliation: 'Hoy, 20:10 (Liquidación automática)',
    type: 'DIGITAL'
  },
  {
    id: 'caja-cop',
    accountName: 'Caja Operativa Frontera (COP)',
    currency: 'COP',
    balance: 1680000.00,
    lastReconciliation: 'Hoy, 18:00 (Arqueo de turno)',
    type: 'EFECTIVO'
  }
];

export const MOCK_COVERAGE: VerticalCoverage[] = [
  {
    verticalId: 'horeca',
    name: 'Restaurante & Comedor (Horeca)',
    status: 'CON_DATOS',
    activeSources: ['Comandas POS', 'Notas de Entrega', 'Consumo Cocina'],
    notes: 'Comandas, notas de entrega internas y consumo de cocina integrados.'
  },
  {
    verticalId: 'retail',
    name: 'Tienda de Conveniencia / Kiosco',
    status: 'PARCIAL',
    activeSources: ['Ventas Mostrador', 'Compras Reposición'],
    notes: 'Ventas y compras sincronizadas; artículos de empaque en revisión de inventario.'
  },
  {
    verticalId: 'nomina',
    name: 'Nómina y Personal',
    status: 'PARCIAL',
    activeSources: ['Sueldos Base'],
    notes: 'Sueldos base cargados; bonos operativos pendientes de cierre quincenal.'
  },
  {
    verticalId: 'documentos',
    name: 'Consolidación de Documentos',
    status: 'CON_DATOS',
    activeSources: ['Notas de Entrega', 'Comprobantes No Fiscales'],
    notes: 'Notas de entrega y comprobantes comerciales no fiscales consolidados.'
  },
  {
    verticalId: 'ganaderia',
    name: 'Operaciones de Campo / Ganadería',
    status: 'SIN_CONEXION',
    activeSources: [],
    notes: 'Sin sincronización activa de pesajes ni despachos en el período actual.'
  }
];

export const MOCK_TRANSACTIONS: TransactionSummary[] = [
  {
    id: 'tx-001',
    date: 'Hoy, 19:25',
    description: 'Servicio Mesa 14 - Consumo Alimentos y Bebidas',
    type: 'VENTA',
    currency: 'USD',
    amount: 145.00,
    counterparty: 'Cliente Particular',
    vertical: 'Restaurante (Horeca)',
    qualityState: 'VERIFICADO',
    paymentMethod: 'USD Efectivo + Pago Móvil',
    referenciaInterna: 'DNV-HOR-004921'
  },
  {
    id: 'tx-002',
    date: 'Hoy, 16:40',
    description: 'Recepción Lomo de Res y Pollo Beneficiado (15kg)',
    type: 'COMPRA',
    currency: 'USD',
    amount: 210.00,
    counterparty: 'Distribuidora Carnes del Centro C.A.',
    vertical: 'Inventario / Cocina',
    qualityState: 'VERIFICADO',
    paymentMethod: 'Transferencia Bancaria',
    referenciaInterna: 'NE-PROV-001894'
  },
  {
    id: 'tx-003',
    date: 'Ayer, 18:15',
    description: 'Gasto Recarga Botellones y Gas Operativo',
    type: 'GASTO',
    currency: 'VES',
    amount: 3260.25,
    counterparty: 'Distribución Gas / Agua',
    vertical: 'Operaciones',
    qualityState: 'VERIFICADO',
    paymentMethod: 'Caja Chica Efectivo',
    referenciaInterna: 'NE-INT-000912'
  },
  {
    id: 'tx-004',
    date: 'Ayer, 12:00',
    description: 'Venta Mostrador Pastelería y Café',
    type: 'VENTA',
    currency: 'USD',
    amount: 38.50,
    counterparty: 'Consumidor Final',
    vertical: 'Retail',
    qualityState: 'VERIFICADO',
    paymentMethod: 'Punto de Venta Débito',
    referenciaInterna: 'DNV-RET-004920'
  },
  {
    id: 'tx-005',
    date: 'Ayer, 10:30',
    description: 'Despacho Venta Especial Frontera',
    type: 'VENTA',
    currency: 'COP',
    amount: 450000.00,
    counterparty: 'Cliente Comercial Frontera',
    vertical: 'Comercio',
    qualityState: 'VERIFICADO',
    paymentMethod: 'Efectivo COP',
    referenciaInterna: 'DNV-COM-00104'
  },
  {
    id: 'tx-006',
    date: 'Hace 2 días',
    description: 'Estimación Provisión Consumo Eléctrico',
    type: 'GASTO',
    currency: 'USD',
    amount: 180.00,
    counterparty: 'Servicio Eléctrico',
    vertical: 'Servicios Básicos',
    qualityState: 'ESTIMADO',
    paymentMethod: 'Pendiente de pago al corte',
    referenciaInterna: 'EST-SERV-MAR'
  },
  {
    id: 'tx-007',
    date: 'Hace 3 días',
    description: 'Ajuste de cocina: Mermas vegetales sin procesar',
    type: 'GASTO',
    currency: 'USD',
    amount: 65.00,
    counterparty: 'Cocina Central',
    vertical: 'Costos / Mermas',
    qualityState: 'DATOS_INCOMPLETOS',
    paymentMethod: 'N/A (Merma interna)',
    referenciaInterna: 'AJU-INT-0082'
  }
];

export const MOCK_COSTS: CostItem[] = [
  {
    id: 'cost-1',
    category: 'Materia Prima e Insumos Directos (Alimentos y Bebidas)',
    balances: [
      { currency: 'USD', amount: 4850.00 },
      { currency: 'VES', amount: 95000.00 }
    ],
    percentageOfTotal: 51.0,
    isEstimated: false
  },
  {
    id: 'cost-2',
    category: 'Nómina Operativa de Cocina y Salón',
    balances: [
      { currency: 'USD', amount: 2600.00 },
      { currency: 'VES', amount: 45000.00 }
    ],
    percentageOfTotal: 27.4,
    isEstimated: false
  },
  {
    id: 'cost-3',
    category: 'Servicios Básicos y Alquiler',
    balances: [
      { currency: 'USD', amount: 1250.00 }
    ],
    percentageOfTotal: 13.2,
    isEstimated: true,
    missingDataWarning: 'Factura eléctrica estimada por promedio del mes anterior.'
  },
  {
    id: 'cost-4',
    category: 'Mantenimiento y Suministros Menores',
    balances: [
      { currency: 'USD', amount: 800.00 }
    ],
    percentageOfTotal: 8.4,
    isEstimated: false
  }
];

export const MOCK_NON_FISCAL_DOCS: NonFiscalDocument[] = [
  {
    id: 'doc-001',
    docType: 'DOCUMENTO_VENTA_NO_FISCAL',
    referenciaInterna: 'DNV-HOR-004921',
    date: 'Hoy, 19:25',
    verticalOrigin: 'Restaurante & Comedor (Horeca)',
    clientOrBeneficiary: 'Consumo Mesa 14',
    currency: 'USD',
    amount: 145.00,
    paymentMethod: 'USD Efectivo + Pago Móvil',
    itemsSummary: '1 Parrilla Especial, 2 Bebidas Artesanales, 1 Postre de la Casa',
    qualityState: 'VERIFICADO',
    nonFiscalNotice: 'DOCUMENTO NO FISCAL'
  },
  {
    id: 'doc-002',
    docType: 'NOTA_ENTREGA',
    referenciaInterna: 'NE-HOR-000318',
    date: 'Hoy, 17:10',
    verticalOrigin: 'Restaurante & Comedor (Horeca)',
    clientOrBeneficiary: 'Despacho Delivery Corporativo',
    currency: 'USD',
    amount: 85.00,
    paymentMethod: 'Transferencia Bancaria Inmediata',
    itemsSummary: '6 Almuerzos Ejecutivos con bebida para oficina aliada',
    qualityState: 'VERIFICADO',
    nonFiscalNotice: 'DOCUMENTO NO FISCAL'
  },
  {
    id: 'doc-003',
    docType: 'DOCUMENTO_VENTA_NO_FISCAL',
    referenciaInterna: 'DNV-RET-004920',
    date: 'Ayer, 12:00',
    verticalOrigin: 'Tienda de Conveniencia / Kiosco',
    clientOrBeneficiary: 'Cliente Mostrador',
    currency: 'USD',
    amount: 38.50,
    paymentMethod: 'Punto de Venta Débito',
    itemsSummary: 'Combo Café Gourmet + 2 Snacks Importados',
    qualityState: 'VERIFICADO',
    nonFiscalNotice: 'DOCUMENTO NO FISCAL'
  },
  {
    id: 'doc-004',
    docType: 'DOCUMENTO_VENTA_NO_FISCAL',
    referenciaInterna: 'DNV-COM-00104',
    date: 'Ayer, 10:30',
    verticalOrigin: 'Comercio Frontera',
    clientOrBeneficiary: 'Distribución Aliada San Antonio',
    currency: 'COP',
    amount: 450000.00,
    paymentMethod: 'Efectivo COP',
    itemsSummary: 'Despacho 5 cajas de insumos empaque para delivery',
    qualityState: 'VERIFICADO',
    nonFiscalNotice: 'DOCUMENTO NO FISCAL'
  },
  {
    id: 'doc-005',
    docType: 'NOTA_ENTREGA',
    referenciaInterna: 'NE-ALM-000842',
    date: 'Ayer, 09:30',
    verticalOrigin: 'Almacén Central / Inventario',
    clientOrBeneficiary: 'Recepción Proveedor Frutas & Legumbres',
    currency: 'USD',
    amount: 180.00,
    paymentMethod: 'Contraentrega Efectivo',
    itemsSummary: 'Cajas de tomate, cebolla morada, lechuga hidropónica',
    qualityState: 'VERIFICADO',
    nonFiscalNotice: 'DOCUMENTO NO FISCAL'
  },
  {
    id: 'doc-006',
    docType: 'DOCUMENTO_VENTA_NO_FISCAL',
    referenciaInterna: 'DNV-HOR-004918',
    date: 'Hace 2 días, 21:00',
    verticalOrigin: 'Restaurante & Comedor (Horeca)',
    clientOrBeneficiary: 'Servicio Barra / Coctelería',
    currency: 'VES',
    amount: 6665.40,
    paymentMethod: 'Pago Móvil Recaudación',
    itemsSummary: 'Servicio de coctelería y picada mixta',
    qualityState: 'VERIFICADO',
    nonFiscalNotice: 'DOCUMENTO NO FISCAL'
  }
];
