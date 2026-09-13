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
}

export const CentroFinanciero: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('resumen');
  const activeContentRef = useRef<HTMLDivElement>(null);

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
      )
    },
    {
      id: 'costos',
      label: 'Estructura de Costos',
      shortLabel: 'Costos',
      renderIcon: (active) => (
        <IconScale size={18} className={active ? 'text-[#051322]' : 'text-white/70'} />
      )
    },
    {
      id: 'documentos',
      label: 'Documentos',
      shortLabel: 'Docs',
      renderIcon: (active) => (
        <IconFileText size={18} className={active ? 'text-[#051322]' : 'text-white/70'} />
      )
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
    <div className="min-h-screen bg-[#051322] text-white selection:bg-[#35d7c3]/30 selection:text-white pb-24 overflow-x-hidden w-full max-w-full font-['IBM_Plex_Sans',sans-serif]">
      {/* Definición compartida SVG para compatibilidad */}
      <AuroraGradientDef />

      {/* Banner Superior de Modo Demostración Explícito */}
      <div className="bg-[#0b2341] border-b border-amber-500/30 px-3 sm:px-4 py-2 text-center text-xs font-medium text-amber-300 flex flex-wrap items-center justify-center gap-2">
        <span className="font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 font-['IBM_Plex_Mono',monospace] text-[11px]">
          [DEMO / DATOS DE EJEMPLO]
        </span>
        <span>
          Estás explorando la maqueta funcional del Centro Financiero de Aurora Plus.
        </span>
        <span className="text-white/60 text-[11px] hidden sm:inline">
          (Monedas admitidas: USD, VES, COP • Cero tasas inventadas • Documentación no fiscal)
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

          {/* Selector de Período y Estado de Sincronización */}
          <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
            <div className="bg-[#0b2341] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/80 font-['IBM_Plex_Mono',monospace]">
              Período: <span className="text-[#35d7c3] font-semibold">Marzo 2026</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sincronizado</span>
            </div>
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
              </button>
            );
          })}
        </div>

        {/* Contenido de la Pestaña Activa (Inmediatamente visible al cambiar) */}
        <div ref={activeContentRef} className="mt-6">
          {activeTab === 'resumen' && (
            <ResumenFinanciero
              kpis={MOCK_KPIS}
              cashBalances={MOCK_CASH_BALANCES}
              onNavigateToDocuments={() => handleTabChange('documentos')}
            />
          )}

          {activeTab === 'ventas-compras' && (
            <VentasComprasFinanciero
              transactions={MOCK_TRANSACTIONS}
              onSelectDocReference={() => handleTabChange('documentos')}
            />
          )}

          {activeTab === 'costos' && (
            <CostosFinanciero costs={MOCK_COSTS} />
          )}

          {activeTab === 'documentos' && (
            <DocumentosFinancieros documents={MOCK_NON_FISCAL_DOCS} />
          )}

          {activeTab === 'cobertura' && (
            <div className="space-y-4">
              <div className="bg-[#0b2341] border border-white/10 rounded-2xl p-4 sm:p-5">
                <h3 className="text-base font-semibold text-white">
                  Detalle de Integración de Fuentes por Vertical
                </h3>
                <p className="text-xs text-white/65 mt-1 leading-relaxed">
                  Para que las cifras operativas reflejen la realidad de tu empresa, Aurora Plus clasifica cada área en estado cualitativo: <strong className="text-emerald-400">Con datos</strong>, <strong className="text-amber-400">Parcial</strong> o <strong className="text-rose-400">Sin conexión</strong>.
                </p>
              </div>
              <VerticalCoverageCard coverageList={MOCK_COVERAGE} />
            </div>
          )}
        </div>
      </div>

      {/* Barra de Navegación Móvil Inferior Fija (Mobile Dock) sin overflow en 390px */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#071a2e] border-t border-white/10 px-1 py-1.5 flex justify-between items-center w-full max-w-full">
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
      </div>
    </div>
  );
};
export default CentroFinanciero;

