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
        <IconChart size={17} className={active ? 'text-[#177E89]' : 'text-[#86868B]'} />
      )
    },
    {
      id: 'ventas-compras',
      label: 'Ventas y Compras',
      shortLabel: 'Ventas',
      renderIcon: (active) => (
        <IconRefresh size={17} className={active ? 'text-[#177E89]' : 'text-[#86868B]'} />
      ),
      demo: true
    },
    {
      id: 'costos',
      label: 'Estructura de Costos',
      shortLabel: 'Costos',
      renderIcon: (active) => (
        <IconScale size={17} className={active ? 'text-[#177E89]' : 'text-[#86868B]'} />
      ),
      demo: true
    },
    {
      id: 'documentos',
      label: 'Documentos',
      shortLabel: 'Docs',
      renderIcon: (active) => (
        <IconFileText size={17} className={active ? 'text-[#177E89]' : 'text-[#86868B]'} />
      ),
      demo: true
    },
    {
      id: 'cobertura',
      label: 'Cobertura por Vertical',
      shortLabel: 'Cobertura',
      renderIcon: (active) => (
        <IconCloud size={17} className={active ? 'text-[#177E89]' : 'text-[#86868B]'} />
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
    <div className={`min-h-screen bg-white text-[#1D1D1F] relative overflow-hidden flex flex-col ${embedded ? 'pb-6' : 'pb-24'}`}>
      {!embedded && <AuroraGradientDef />}

      {/* HEADER SUPERIOR */}
      {!embedded && (
        <header className="bg-white border-b border-[#E5E5EA] px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 relative z-30 sticky top-0">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E5E5EA] border border-[#E5E5EA] transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Regresar al Hub Principal"
            >
              <span>←</span>
              <span>Volver al Hub</span>
            </button>

            <div className="h-5 w-[1px] bg-[#E5E5EA] mx-1" />

            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-xl bg-[#177E89]/10 border border-[#177E89]/20">
                <AuroraLogo size={24} animated />
              </div>
              <div>
                <div className="font-bold text-base text-[#1D1D1F] leading-none flex items-center gap-2">
                  <span>Aurora Finanzas</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-[#177E89]/10 text-[#177E89] border border-[#177E89]/30 font-bold">
                    Control Integral
                  </span>
                </div>
                <div className="text-[#86868B] text-[10px] tracking-wider uppercase mt-0.5 font-medium">
                  Visión operativa del negocio
                </div>
              </div>
            </div>
          </div>

          {/* Rango de Fechas y Botón Aplicar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 rounded-full px-3 py-1 bg-[#F5F5F7] border border-[#E5E5EA]">
              <IconCalendar size={14} className="text-[#177E89]" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#86868B] text-[10px] uppercase font-bold">Del</span>
                <input
                  type="date"
                  value={desde}
                  max={hasta}
                  onChange={(e) => setDesde(e.target.value)}
                  className="bg-transparent text-[#1D1D1F] text-xs outline-none cursor-pointer font-medium"
                />
                <span className="text-[#86868B] text-[10px] uppercase font-bold">al</span>
                <input
                  type="date"
                  value={hasta}
                  min={desde}
                  onChange={(e) => setHasta(e.target.value)}
                  className="bg-transparent text-[#1D1D1F] text-xs outline-none cursor-pointer font-medium"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyPeriod}
              disabled={previewMode || loading}
              className="bg-[#177E89] hover:bg-[#136570] text-white text-xs font-semibold px-4 py-2 rounded-full cursor-pointer transition-colors disabled:opacity-50"
            >
              {loading ? 'Consultando…' : 'Consultar'}
            </button>
          </div>
        </header>
      )}

      {/* Pill Informativa de Estado de Conexión */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="bg-white rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border border-[#E5E5EA] shadow-sm text-xs">
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full ${isDemoTab ? 'bg-[#86868B]' : 'bg-[#177E89]'}`} />
            <span className="font-semibold text-[#1D1D1F]">
              {isDemoTab ? 'Vista de Demostración & Estructura' : 'Fuentes Operativas Consolidadas'}
            </span>
            <span className="text-[#86868B] text-[11px] hidden md:inline">
              — {isDemoTab ? 'Módulo configurado para recibir datos automáticos de tus verticales' : `Moneda base: ${financeData?.moneda || 'USD'}`}
            </span>
          </div>

          <div className="text-[11px] text-[#86868B]">
            Período: <strong className="text-[#177E89]">{appliedPeriod.desde}</strong> al <strong className="text-[#177E89]">{appliedPeriod.hasta}</strong>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10 space-y-6">
        
        {/* Barra de Pestañas */}
        <div
          id="finance-tabs-nav"
          className="flex items-center gap-1.5 p-1.5 rounded-full border border-[#E5E5EA] bg-[#F5F5F7] text-xs overflow-x-auto whitespace-nowrap"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-[#1D1D1F] shadow-sm'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-white'
                }`}
              >
                <span>{tab.renderIcon(isActive)}</span>
                <span>{tab.label}</span>
                {tab.demo && (
                  <span className="rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wide bg-[#F5F5F7] text-[#6E6E73] border border-[#E5E5EA]">
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
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-12 text-center text-sm text-[#86868B] space-y-3 shadow-sm">
              <div className="w-8 h-8 mx-auto border-2 border-[#177E89] border-t-transparent rounded-full animate-spin" />
              <p className="font-semibold">Consultando las fuentes financieras en tiempo real…</p>
            </div>
          )}

          {!previewMode && (activeTab === 'resumen' || activeTab === 'cobertura') && !loading && error && (
            <div className="bg-[#DC2626]/5 rounded-2xl border border-[#DC2626]/20 p-6 text-sm text-[#DC2626] space-y-3">
              <p className="font-bold text-base">No pudimos mostrar los datos del negocio.</p>
              <p className="text-xs opacity-80">{error}</p>
              <button
                type="button"
                onClick={() => void loadFinanceData()}
                className="bg-[#177E89] hover:bg-[#136570] text-white text-xs font-semibold px-4 py-2 rounded-full cursor-pointer transition-colors"
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
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E5EA] shadow-sm">
                <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F]">
                  Detalle de Integración de Fuentes por Vertical
                </h3>
                <p className="text-xs text-[#86868B] mt-1 leading-relaxed max-w-2xl">
                  Para que las cifras operativas reflejen la realidad de tu empresa, Aurora Plus clasifica cada área en estado cualitativo: <strong className="text-[#16A34A]">Con datos</strong>, <strong className="text-[#6E6E73]">Parcial</strong> o <strong className="text-[#DC2626]">Sin conexión</strong>.
                </p>
              </div>
              <VerticalCoverageCard coverageList={previewMode ? MOCK_COVERAGE : realCoverage} />
            </div>
          )}
        </div>
      </main>

      {/* DOCK MÓVIL INFERIOR */}
      {!embedded && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E5EA] px-2 py-2 flex justify-between items-center">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-1 px-1 rounded-xl transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#177E89] font-bold'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                <span className="flex items-center justify-center">
                  {tab.id === 'resumen' && <IconChart size={16} />}
                  {tab.id === 'ventas-compras' && <IconRefresh size={16} />}
                  {tab.id === 'costos' && <IconScale size={16} />}
                  {tab.id === 'documentos' && <IconFileText size={16} />}
                  {tab.id === 'cobertura' && <IconCloud size={16} />}
                </span>
                <span className="truncate text-[10px] font-medium w-full text-center leading-tight">
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
