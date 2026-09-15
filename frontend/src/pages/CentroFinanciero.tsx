import React, { useState, useRef, useEffect } from 'react';
import {
  MOCK_KPIS,
  MOCK_CASH_BALANCES,
  MOCK_COVERAGE,
  MOCK_TRANSACTIONS,
  MOCK_COSTS,
  MOCK_NON_FISCAL_DOCS
} from '../components/finanzas/mockFinanceData';
import { ResumenFinanciero } from '../components/finanzas/ResumenFinanciero';
import { VentasComprasFinanciero } from '../components/finanzas/VentasComprasFinanciero';
import { CostosFinanciero } from '../components/finanzas/CostosFinanciero';
import { DocumentosFinancieros } from '../components/finanzas/DocumentosFinancieros';
import { VerticalCoverageCard } from '../components/finanzas/VerticalCoverageCard';
import { EmptyFinanceState } from '../components/finanzas/EmptyFinanceState';
import type { KpiCardData, SupportedCurrency, VerticalCoverage } from '../components/finanzas/types';
import { ApiError, EmpresaKpiResponse, obtenerEmpresaKpis } from '../api';
import {
  AuroraGradientDef,
  IconChart,
  IconRefresh,
  IconScale,
  IconFileText,
  IconCloud
} from '../Icons';

type ActiveTab = 'resumen' | 'ventas-compras' | 'costos' | 'documentos' | 'cobertura';

interface TabItem {
  id: ActiveTab;
  label: string;
  shortLabel: string;
  renderIcon: (active: boolean) => React.ReactNode;
  demo?: boolean;
}

interface CentroFinancieroProps {
  previewMode?: boolean;
  /** Permite usar Finanzas dentro de una vertical, sin convertirla en una ruta aparte. */
  embedded?: boolean;
}

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const VERTICAL_NAMES: Record<string, string> = {
  GANADERIA: 'Ganadería',
  HORECA: 'Restaurante y Horeca',
  RETAIL: 'Comercio y Retail',
  REPUESTOS: 'Ferretería y Repuestos',
  MINERIA: 'Minería',
  SALUD: 'Clínicas Médicas'
};

const sourcesFor = (modulo: string) => {
  if (modulo === 'HORECA') return ['Comandas pagadas', 'Costos congelados'];
  if (modulo === 'RETAIL') return ['Ventas de mostrador', 'Costos congelados'];
  if (modulo === 'REPUESTOS') return ['Ventas del kardex de repuestos'];
  return ['Operaciones registradas'];
};

const mapKpis = (response: EmpresaKpiResponse): Record<string, KpiCardData> => {
  const currency = response.moneda as SupportedCurrency;
  const coverage = response.consolidado.coberturaPromedioPonderada;
  const hasDisconnected = response.verticalesNoConectadas.length > 0;
  const incompleteState = hasDisconnected ? 'DATOS_INCOMPLETOS' : 'VERIFICADO';

  return {
    ventas: {
      title: 'Ventas brutas',
      subtitle: 'Operaciones registradas por las verticales conectadas.',
      balances: [{ currency, amount: response.consolidado.ventasBrutas }],
      state: incompleteState,
      stateExplanation: hasDisconnected
        ? 'Hay verticales activas que todavía no aportan datos al consolidado.'
        : 'Todas las verticales activas cuentan con un proveedor conectado.',
      detailsHint: `${response.porModulo.length} fuentes conectadas`
    },
    costos: {
      title: 'Costo de ventas',
      subtitle: 'Costo congelado asociado a las operaciones disponibles.',
      balances: [{ currency, amount: response.consolidado.costoVentas }],
      state: coverage >= 100 && !hasDisconnected ? 'VERIFICADO' : 'DATOS_INCOMPLETOS',
      stateExplanation: `Cobertura de costos informada: ${coverage.toFixed(1)}%.`,
      detailsHint: `${coverage.toFixed(1)}% de cobertura`
    },
    margen: {
      title: 'Margen bruto',
      subtitle: 'Ventas brutas menos el costo disponible de las ventas.',
      balances: [{ currency, amount: response.consolidado.margenBruto }],
      state: coverage >= 100 && !hasDisconnected ? 'VERIFICADO' : 'ESTIMADO',
      stateExplanation: coverage >= 100 && !hasDisconnected
        ? 'Calculado con cobertura completa de costos de las verticales activas.'
        : 'Puede variar cuando se incorporen costos o verticales pendientes.',
      detailsHint: `${response.consolidado.margenBrutoPct.toFixed(1)}% sobre ventas`
    },
    resultado: {
      title: 'Resultado estimado',
      subtitle: 'Margen bruto menos gastos operativos registrados; no equivale a utilidad neta contable.',
      balances: [{ currency, amount: response.consolidado.resultadoEstimado }],
      state: 'ESTIMADO',
      stateExplanation: 'Es una lectura operativa. No incluye todavía un cierre contable completo de partida doble.',
      detailsHint: 'No es utilidad neta fiscal'
    }
  };
};

const mapCoverage = (response: EmpresaKpiResponse): VerticalCoverage[] => [
  ...response.porModulo.map((item) => ({
    verticalId: item.modulo,
    name: VERTICAL_NAMES[item.modulo] ?? item.modulo,
    status: (item.ventasBrutas > 0 && item.coberturaPct >= 100 ? 'CON_DATOS' : 'PARCIAL') as VerticalCoverage['status'],
    activeSources: sourcesFor(item.modulo),
    notes: item.ventasBrutas > 0
      ? `Cobertura de costos: ${item.coberturaPct.toFixed(1)}%.`
      : 'Fuente conectada, sin operaciones registradas en el período.'
  })),
  ...response.verticalesNoConectadas.map((modulo) => ({
    verticalId: modulo,
    name: VERTICAL_NAMES[modulo] ?? modulo,
    status: 'SIN_CONEXION' as const,
    activeSources: [],
    notes: 'Vertical activa sin proveedor de KPI conectado.'
  }))
];

export const CentroFinanciero: React.FC<CentroFinancieroProps> = ({ previewMode = false, embedded = false }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('resumen');
  const today = new Date();
  const [desde, setDesde] = useState(() => formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [hasta, setHasta] = useState(() => formatLocalDate(today));
  const [appliedPeriod, setAppliedPeriod] = useState({ desde, hasta });
  const [financeData, setFinanceData] = useState<EmpresaKpiResponse | null>(null);
  const [loading, setLoading] = useState(!previewMode);
  const [error, setError] = useState<string | null>(null);
  const activeContentRef = useRef<HTMLDivElement>(null);
  const requestSequence = useRef(0);

  const tabs: TabItem[] = [
    {
      id: 'resumen',
      label: 'Resumen General',
      shortLabel: 'Resumen',
      renderIcon: (active) => (
        <IconChart size={18} className={active ? 'text-[#051322]' : 'text-white/70'} />
      )
    },
    {
      id: 'ventas-compras',
      label: 'Ventas y Compras',
      shortLabel: 'Ventas',
      renderIcon: (active) => (
        <IconRefresh size={18} className={active ? 'text-[#051322]' : 'text-white/70'} />
      ),
      demo: true
    },
    {
      id: 'costos',
      label: 'Estructura de Costos',
      shortLabel: 'Costos',
      renderIcon: (active) => (
        <IconScale size={18} className={active ? 'text-[#051322]' : 'text-white/70'} />
      ),
      demo: true
    },
    {
      id: 'documentos',
      label: 'Documentos',
      shortLabel: 'Docs',
      renderIcon: (active) => (
        <IconFileText size={18} className={active ? 'text-[#051322]' : 'text-white/70'} />
      ),
      demo: true
    },
    {
      id: 'cobertura',
      label: 'Cobertura por Vertical',
      shortLabel: 'Cobertura',
      renderIcon: (active) => (
        <IconCloud size={18} className={active ? 'text-[#051322]' : 'text-white/70'} />
      )
    }
  ];

  const loadFinanceData = async (period = appliedPeriod) => {
    if (previewMode) return;
    if (period.hasta < period.desde) {
      setError('La fecha final no puede ser anterior a la fecha inicial.');
      return;
    }
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError(null);
    try {
      const response = await obtenerEmpresaKpis(period.desde, period.hasta);
      if (sequence === requestSequence.current) setFinanceData(response);
    } catch (cause) {
      if (sequence !== requestSequence.current) return;
      if (cause instanceof ApiError && cause.status === 403) {
        setError('Este resumen está disponible para propietarios, administradores y perfiles médicos autorizados.');
      } else {
        setError(cause instanceof Error ? cause.message : 'No fue posible cargar el resumen financiero.');
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    void loadFinanceData(appliedPeriod);
    // Solo se ejecuta al abrir la pantalla; luego el usuario aplica el período.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyPeriod = () => {
    const period = { desde, hasta };
    setAppliedPeriod(period);
    void loadFinanceData(period);
  };

  const isDemoTab = previewMode || tabs.find((tab) => tab.id === activeTab)?.demo === true;
  const realKpis = financeData ? mapKpis(financeData) : null;
  const realCoverage = financeData ? mapCoverage(financeData) : [];

  // Cambia de pestaña y hace el contenido activo inmediatamente visible
  const handleTabChange = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    requestAnimationFrame(() => {
      const navElement = document.getElementById('finance-tabs-nav');
      if (navElement) {
        const top = navElement.getBoundingClientRect().top + window.pageYOffset - 16;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
    });
  };

  useEffect(() => {
    // Al cambiar la pestaña (incluso por links internos), enfoca la vista al contenido activo
    const navElement = document.getElementById('finance-tabs-nav');
    if (navElement && window.pageYOffset > navElement.offsetTop) {
      window.scrollTo({ top: navElement.offsetTop - 16, behavior: 'smooth' });
    }
  }, [activeTab]);

  return (
    <div className={`${embedded ? 'aurora-embedded-light text-[#172033] pb-5' : 'min-h-screen bg-[#051322] text-white pb-24'} selection:bg-[#35d7c3]/30 selection:text-white overflow-x-hidden w-full max-w-full font-['IBM_Plex_Sans',sans-serif]`}>
      {/* Definición compartida SVG para compatibilidad */}
      {!embedded && <AuroraGradientDef />}

      {/* La procedencia de los datos siempre queda visible. */}
      <div className={`bg-[#0b2341] border-b px-3 sm:px-4 py-2 text-center text-xs font-medium flex flex-wrap items-center justify-center gap-2 ${isDemoTab ? 'border-amber-500/30 text-amber-300' : 'border-[#35d7c3]/30 text-[#35d7c3]'}`}>
        <span className={`font-bold px-2 py-0.5 rounded border font-['IBM_Plex_Mono',monospace] text-[11px] ${isDemoTab ? 'bg-amber-500/20 border-amber-500/30' : 'bg-[#35d7c3]/10 border-[#35d7c3]/30'}`}>
          {isDemoTab ? '[SIN CONEXIÓN DE DATOS]' : '[DATOS DEL NEGOCIO]'}
        </span>
        <span>
          {isDemoTab
            ? 'Esta sección todavía no tiene una fuente de datos real conectada.'
            : 'Resumen y cobertura obtenidos de las fuentes operativas conectadas.'}
        </span>
        <span className="text-white/60 text-[11px] hidden sm:inline">
          {isDemoTab
            ? '(Sin cifras inventadas • Documentación no fiscal)'
            : financeData ? `(Moneda base: ${financeData.moneda} • Período ${financeData.periodo.desde} al ${financeData.periodo.hasta})` : '(Cargando fuente real…)'}
        </span>
      </div>

      {/* Encabezado Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#35d7c3] flex items-center justify-center text-[#051322] font-black text-xl shrink-0 font-['IBM_Plex_Sans',sans-serif]">
                A+
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Centro Financiero Aurora Plus
                </h1>
                <p className="text-xs text-white/60">
                  Visión operativa consolidada del negocio, diseñada para dueños sin conocimientos contables.
                </p>
              </div>
            </div>
          </div>

          {/* El período se aplica de forma explícita para evitar consultas por cada tecla. */}
          <div className="flex flex-wrap items-end gap-2 mt-2 md:mt-0">
            <label className="text-[10px] uppercase tracking-wide text-white/50">
              Desde
              <input type="date" value={desde} max={hasta} onChange={(event) => setDesde(event.target.value)} className="mt-1 block rounded-lg border border-white/10 bg-[#0b2341] px-2.5 py-2 text-xs text-white [color-scheme:dark]" />
            </label>
            <label className="text-[10px] uppercase tracking-wide text-white/50">
              Hasta
              <input type="date" value={hasta} min={desde} onChange={(event) => setHasta(event.target.value)} className="mt-1 block rounded-lg border border-white/10 bg-[#0b2341] px-2.5 py-2 text-xs text-white [color-scheme:dark]" />
            </label>
            <button type="button" onClick={handleApplyPeriod} disabled={previewMode || loading} className="rounded-lg border border-[#35d7c3]/40 bg-[#35d7c3]/15 px-3 py-2 text-xs font-semibold text-[#35d7c3] transition-colors hover:bg-[#35d7c3]/25 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? 'Consultando…' : 'Aplicar'}
            </button>
          </div>
        </div>

        {/* Barra de Navegación de Pestañas Activas (Desktop y Móvil) */}
        <div 
          id="finance-tabs-nav"
          className="mt-6 flex items-center gap-1.5 p-1.5 bg-[#0b2341] rounded-2xl border border-white/10 overflow-x-auto scrollbar-none max-w-full"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#35d7c3] text-[#051322]'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{tab.renderIcon(isActive)}</span>
                <span>{tab.label}</span>
                {tab.demo && <span className={`rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${isActive ? 'bg-[#051322]/15' : 'bg-amber-500/15 text-amber-300'}`}>Sin datos</span>}
              </button>
            );
          })}
        </div>

        {/* Contenido de la Pestaña Activa (Inmediatamente visible al cambiar) */}
        <div ref={activeContentRef} className="mt-6">
          {!previewMode && (activeTab === 'resumen' || activeTab === 'cobertura') && loading && (
            <div className="rounded-2xl border border-white/10 bg-[#0b2341] p-8 text-center text-sm text-white/60">
              Consultando las fuentes financieras del período…
            </div>
          )}

          {!previewMode && (activeTab === 'resumen' || activeTab === 'cobertura') && !loading && error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-200">
              <p className="font-semibold">No pudimos mostrar los datos del negocio.</p>
              <p className="mt-1 text-xs text-rose-100/75">{error}</p>
              <button type="button" onClick={() => void loadFinanceData()} className="mt-3 rounded-lg border border-rose-300/30 px-3 py-1.5 text-xs font-semibold hover:bg-white/5">Reintentar</button>
            </div>
          )}

          {activeTab === 'resumen' && (previewMode || (!loading && !error && realKpis)) && (
            <ResumenFinanciero
              kpis={previewMode ? MOCK_KPIS : realKpis!}
              cashBalances={previewMode ? MOCK_CASH_BALANCES : []}
              dataMode={previewMode ? 'demo' : 'real'}
              onNavigateToDocuments={() => handleTabChange('documentos')}
            />
          )}

          {activeTab === 'ventas-compras' && (
            previewMode ? (
              <VentasComprasFinanciero
                transactions={MOCK_TRANSACTIONS}
                onSelectDocReference={() => handleTabChange('documentos')}
              />
            ) : (
              <EmptyFinanceState
                title="Aún no hay ventas ni compras conectadas"
                description="Cuando tu vertical reporte operaciones al Centro Financiero, aquí verás el detalle real de ventas, compras y gastos por período."
              />
            )
          )}

          {activeTab === 'costos' && (
            previewMode ? (
              <CostosFinanciero costs={MOCK_COSTS} />
            ) : (
              <EmptyFinanceState
                title="Aún no hay costos operativos conectados"
                description="La estructura de costos aparecerá aquí en cuanto tu vertical reporte costeo para el período seleccionado."
              />
            )
          )}

          {activeTab === 'documentos' && (
            previewMode ? (
              <DocumentosFinancieros documents={MOCK_NON_FISCAL_DOCS} />
            ) : (
              <EmptyFinanceState
                title="Aún no hay documentos comerciales no fiscales conectados"
                description="Las notas de entrega y documentos de venta no fiscales generados por tu vertical aparecerán aquí, cada uno con su referencia interna."
              />
            )
          )}

          {activeTab === 'cobertura' && (previewMode || (!loading && !error && financeData)) && (
            <div className="space-y-4">
              <div className="bg-[#0b2341] border border-white/10 rounded-2xl p-4 sm:p-5">
                <h3 className="text-base font-semibold text-white">
                  Detalle de Integración de Fuentes por Vertical
                </h3>
                <p className="text-xs text-white/65 mt-1 leading-relaxed">
                  Para que las cifras operativas reflejen la realidad de tu empresa, Aurora Plus clasifica cada área en estado cualitativo: <strong className="text-emerald-400">Con datos</strong>, <strong className="text-amber-400">Parcial</strong> o <strong className="text-rose-400">Sin conexión</strong>.
                </p>
              </div>
              <VerticalCoverageCard coverageList={previewMode ? MOCK_COVERAGE : realCoverage} />
            </div>
          )}
        </div>
      </div>

      {/* Barra de Navegación Móvil Inferior Fija (Mobile Dock) sin overflow en 390px */}
      {!embedded && <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#071a2e] border-t border-white/10 px-1 py-1.5 flex justify-between items-center w-full max-w-full">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-1 px-0.5 rounded-xl transition-colors ${
                isActive
                  ? 'text-[#35d7c3]'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              <span className="flex items-center justify-center">
                {tab.id === 'resumen' && <IconChart size={16} className={isActive ? 'text-[#35d7c3]' : 'text-white/50'} />}
                {tab.id === 'ventas-compras' && <IconRefresh size={16} className={isActive ? 'text-[#35d7c3]' : 'text-white/50'} />}
                {tab.id === 'costos' && <IconScale size={16} className={isActive ? 'text-[#35d7c3]' : 'text-white/50'} />}
                {tab.id === 'documentos' && <IconFileText size={16} className={isActive ? 'text-[#35d7c3]' : 'text-white/50'} />}
                {tab.id === 'cobertura' && <IconCloud size={16} className={isActive ? 'text-[#35d7c3]' : 'text-white/50'} />}
              </span>
              <span className="truncate text-[10px] font-medium w-full text-center leading-tight">
                {tab.shortLabel}
              </span>
            </button>
          );
        })}
      </div>}
    </div>
  );
};
export default CentroFinanciero;

