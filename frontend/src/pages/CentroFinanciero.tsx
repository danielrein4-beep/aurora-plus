import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { TasaCambioWidget } from '../components/finanzas/TasaCambioWidget';
import type { KpiCardData, SupportedCurrency, VerticalCoverage } from '../components/finanzas/types';
import { ApiError, EmpresaKpiResponse, obtenerEmpresaKpis } from '../api';
import AuroraLogo from '../AuroraLogo';
import {
  AuroraGradientDef,
  IconChart,
  IconRefresh,
  IconScale,
  IconFileText,
  IconCloud,
  IconBank,
  IconCalendar
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
  GANADERIA: 'Ganadería & Agro',
  HORECA: 'Restaurante & Horeca',
  RETAIL: 'Comercio & Retail',
  REPUESTOS: 'Ferretería & Repuestos',
  MINERIA: 'Minería',
  SALUD: 'Clínica & Salud'
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
  const navigate = useNavigate();
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
        <IconChart size={17} className={active ? 'text-teal-600 dark:text-teal-300' : 'text-slate-500 dark:text-white/60'} />
      )
    },
    {
      id: 'ventas-compras',
      label: 'Ventas y Compras',
      shortLabel: 'Ventas',
      renderIcon: (active) => (
        <IconRefresh size={17} className={active ? 'text-teal-600 dark:text-teal-300' : 'text-slate-500 dark:text-white/60'} />
      ),
      demo: true
    },
    {
      id: 'costos',
      label: 'Estructura de Costos',
      shortLabel: 'Costos',
      renderIcon: (active) => (
        <IconScale size={17} className={active ? 'text-teal-600 dark:text-teal-300' : 'text-slate-500 dark:text-white/60'} />
      ),
      demo: true
    },
    {
      id: 'documentos',
      label: 'Documentos',
      shortLabel: 'Docs',
      renderIcon: (active) => (
        <IconFileText size={17} className={active ? 'text-teal-600 dark:text-teal-300' : 'text-slate-500 dark:text-white/60'} />
      ),
      demo: true
    },
    {
      id: 'cobertura',
      label: 'Cobertura por Vertical',
      shortLabel: 'Cobertura',
      renderIcon: (active) => (
        <IconCloud size={17} className={active ? 'text-teal-600 dark:text-teal-300' : 'text-slate-500 dark:text-white/60'} />
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
        setError('Este resumen está disponible para propietarios, administradores y perfiles autorizados.');
      } else {
        setError(cause instanceof Error ? cause.message : 'No fue posible cargar el resumen financiero.');
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    void loadFinanceData(appliedPeriod);
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

  return (
    <div className={`min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-500 relative overflow-hidden flex flex-col ${embedded ? 'pb-6' : 'pb-24'}`}>
      {!embedded && <AuroraGradientDef />}

      {/* Fondos atmosféricos aurora */}
      {!embedded && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="aurora-ribbon-1 -top-32 -left-20 opacity-25" />
          <div className="aurora-ribbon-2 top-1/3 -right-20 opacity-30" />
        </div>
      )}

      {/* HEADER SUPERIOR — APPLE GLASS */}
      {!embedded && (
        <header className="nav-glass border-b border-slate-300/60 dark:border-white/10 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 relative z-30 sticky top-0 transition-colors duration-500 backdrop-blur-2xl">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate('/dashboard')}
              className="apple-glass-btn text-xs font-light uppercase tracking-wide px-3 py-1.5 rounded-full text-slate-700 dark:text-white/80 hover:text-teal-500 dark:hover:text-teal-300 border border-slate-300/70 dark:border-white/15 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Regresar al Hub Principal"
            >
              <span>←</span>
              <span>Volver al Hub</span>
            </button>

            <div className="h-5 w-[1px] bg-slate-300/80 dark:bg-white/15 mx-1" />

            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <AuroraLogo size={24} animated />
              </div>
              <div>
                <div className="font-['Outfit'] font-extrabold text-base text-aurora leading-none flex items-center gap-2">
                  <span>Aurora Finanzas</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                    Control Integral
                  </span>
                </div>
                <div className="text-slate-500 dark:text-white/45 text-[10px] tracking-wide uppercase mt-0.5 font-light">
                  Visión operativa del negocio
                </div>
              </div>
            </div>
          </div>

          {/* Rango de Fechas y Botón Aplicar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 apple-glass-pill rounded-full px-3 py-1 border border-slate-300/70 dark:border-white/15 shadow-inner">
              <IconCalendar size={14} className="text-teal-500" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 dark:text-white/40 text-[10px] uppercase font-bold">Del</span>
                <input
                  type="date"
                  value={desde}
                  max={hasta}
                  onChange={(e) => setDesde(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-white text-xs outline-none cursor-pointer font-medium"
                />
                <span className="text-slate-400 dark:text-white/40 text-[10px] uppercase font-bold">al</span>
                <input
                  type="date"
                  value={hasta}
                  min={desde}
                  onChange={(e) => setHasta(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-white text-xs outline-none cursor-pointer font-medium"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyPeriod}
              disabled={previewMode || loading}
              className="btn-cyber-neon text-white text-xs font-light uppercase tracking-wide px-4 py-2 rounded-full cursor-pointer shadow-md hover:scale-105 transition-all disabled:opacity-50"
            >
              {loading ? 'Consultando…' : 'Consultar'}
            </button>
          </div>
        </header>
      )}

      {/* Pill Informativa de Estado de Conexión (Aesthetics Premium) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="apple-glass rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border border-slate-300/60 dark:border-white/10 shadow-sm text-xs">
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full ${isDemoTab ? 'bg-amber-400 animate-pulse' : 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]'}`} />
            <span className="font-light uppercase tracking-wide text-slate-800 dark:text-white">
              {isDemoTab ? 'Vista de Demostración & Estructura' : 'Fuentes Operativas Consolidadas'}
            </span>
            <span className="text-slate-500 dark:text-white/50 text-[11px] hidden md:inline font-light uppercase tracking-wide">
              — {isDemoTab ? 'Módulo configurado para recibir datos automáticos de tus verticales' : `Moneda base: ${financeData?.moneda || 'USD'}`}
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-500 dark:text-white/50">
            Período: <strong className="text-teal-600 dark:text-teal-300">{appliedPeriod.desde}</strong> al <strong className="text-teal-600 dark:text-teal-300">{appliedPeriod.hasta}</strong>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10 space-y-6">
        
        {/* Barra de Pestañas Apple Liquid Glass */}
        <div
          id="finance-tabs-nav"
          className="flex items-center gap-1.5 p-1.5 apple-glass-pill rounded-full border border-slate-300/80 dark:border-white/15 bg-slate-100/90 dark:bg-white/[0.04] shadow-inner text-xs overflow-x-auto whitespace-nowrap"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-light uppercase tracking-wide transition-all duration-300 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-[0_2px_12px_rgba(0,0,0,0.12)] dark:bg-white/20 dark:text-white dark:border dark:border-white/25'
                    : 'text-slate-600 dark:text-white/65 hover:text-slate-950 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/8'
                }`}
              >
                <span>{tab.renderIcon(isActive)}</span>
                <span className="font-['Outfit']">{tab.label}</span>
                {tab.demo && (
                  <span className={`rounded-full px-2 py-0.5 text-[9px] uppercase font-mono tracking-wide ${
                    isActive ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300' : 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                  }`}>
                    Vista
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* CONTENEDOR DE LA PESTAÑA ACTIVA */}
        <div ref={activeContentRef} className="transition-all duration-300">
          {!previewMode && (activeTab === 'resumen' || activeTab === 'cobertura') && loading && (
            <div className="apple-glass rounded-3xl border border-slate-300/60 dark:border-white/10 p-12 text-center text-sm text-slate-500 dark:text-white/60 space-y-3">
              <div className="w-8 h-8 mx-auto border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <p className="font-light uppercase tracking-wide">Consultando las fuentes financieras en tiempo real…</p>
            </div>
          )}

          {!previewMode && (activeTab === 'resumen' || activeTab === 'cobertura') && !loading && error && (
            <div className="apple-glass rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-700 dark:text-rose-200 space-y-3">
              <p className="font-bold font-['Outfit'] text-base">No pudimos mostrar los datos del negocio.</p>
              <p className="text-xs opacity-80">{error}</p>
              <button
                type="button"
                onClick={() => void loadFinanceData()}
                className="btn-electric-blue text-white text-xs font-light uppercase tracking-wide px-4 py-2 rounded-full cursor-pointer shadow-md"
              >
                Reintentar
              </button>
            </div>
          )}

          {activeTab === 'resumen' && (previewMode || (!loading && !error && realKpis)) && (
            <div className="space-y-4">
              {!previewMode && <TasaCambioWidget />}
              <ResumenFinanciero
                kpis={previewMode ? MOCK_KPIS : realKpis!}
                cashBalances={previewMode ? MOCK_CASH_BALANCES : []}
                dataMode={previewMode ? 'demo' : 'real'}
                onNavigateToDocuments={() => handleTabChange('documentos')}
              />
            </div>
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
                description="Las notas de entrega y comprobantes no fiscales generados por tu vertical aparecerán aquí, cada uno con su referencia interna."
              />
            )
          )}

          {activeTab === 'cobertura' && (previewMode || (!loading && !error && financeData)) && (
            <div className="space-y-6">
              <div className="apple-glass rounded-3xl p-5 sm:p-6 border border-slate-300/60 dark:border-white/10 shadow-lg">
                <h3 className="text-base sm:text-lg font-bold font-['Outfit'] text-slate-900 dark:text-white">
                  Detalle de Integración de Fuentes por Vertical
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/60 mt-1 leading-relaxed max-w-2xl font-light uppercase tracking-wide">
                  Para que las cifras operativas reflejen la realidad de tu empresa, Aurora Plus clasifica cada área en estado cualitativo: <strong className="text-emerald-500">Con datos</strong>, <strong className="text-amber-500">Parcial</strong> o <strong className="text-rose-500">Sin conexión</strong>.
                </p>
              </div>
              <VerticalCoverageCard coverageList={previewMode ? MOCK_COVERAGE : realCoverage} />
            </div>
          )}
        </div>
      </main>

      {/* DOCK MÓVIL INFERIOR — APPLE LIQUID GLASS */}
      {!embedded && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 apple-glass border-t border-slate-300/60 dark:border-white/10 px-2 py-2 flex justify-between items-center backdrop-blur-2xl">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'text-teal-600 dark:text-teal-300 font-bold'
                    : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center justify-center">
                  {tab.id === 'resumen' && <IconChart size={16} />}
                  {tab.id === 'ventas-compras' && <IconRefresh size={16} />}
                  {tab.id === 'costos' && <IconScale size={16} />}
                  {tab.id === 'documentos' && <IconFileText size={16} />}
                  {tab.id === 'cobertura' && <IconCloud size={16} />}
                </span>
                <span className="truncate text-[10px] font-light uppercase tracking-wide w-full text-center leading-tight">
                  {tab.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CentroFinanciero;
