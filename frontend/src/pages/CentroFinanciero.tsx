import React, { useState } from 'react';
import {
  MOCK_KPIS,
  MOCK_CASH_BALANCES,
  MOCK_COVERAGE,
  MOCK_TRANSACTIONS,
  MOCK_COSTS,
  MOCK_FISCAL,
  MOCK_ACCOUNTING_SAMPLE,
  DEMO_BCV_RATE
} from '../components/finanzas/mockFinanceData';
import { ResumenFinanciero } from '../components/finanzas/ResumenFinanciero';
import { VentasComprasFinanciero } from '../components/finanzas/VentasComprasFinanciero';
import { CostosFinanciero } from '../components/finanzas/CostosFinanciero';
import { ContabilidadFinanciero } from '../components/finanzas/ContabilidadFinanciero';
import { FiscalFinanciero } from '../components/finanzas/FiscalFinanciero';
import { VerticalCoverageCard } from '../components/finanzas/VerticalCoverageCard';
import { DetalleContableModal } from '../components/finanzas/DetalleContableModal';
import { TransactionSummary, AccountingEntry } from '../components/finanzas/types';

type ActiveTab = 'resumen' | 'ventas-compras' | 'costos' | 'contabilidad' | 'fiscal';

export const CentroFinanciero: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('resumen');
  const [selectedEntry, setSelectedEntry] = useState<AccountingEntry | null>(null);

  // Convierte una transacción en asiento contable simulado para inspección
  const handleSelectTransaction = (tx: TransactionSummary) => {
    const isSale = tx.type === 'VENTA';
    const entry: AccountingEntry = {
      id: `ASI-${tx.id.toUpperCase()}`,
      referenceDoc: tx.invoiceNumber || tx.id,
      date: tx.date,
      description: tx.description,
      lines: isSale
        ? [
            {
              accountCode: '1.1.01.01',
              accountName: `Caja / Cobro (${tx.paymentMethod})`,
              debit: tx.amountUsd,
              credit: 0,
              currency: 'USD'
            },
            {
              accountCode: '4.1.01.01',
              accountName: `Ingresos por Ventas (${tx.vertical})`,
              debit: 0,
              credit: Number((tx.amountUsd * 0.862).toFixed(2)),
              currency: 'USD'
            },
            {
              accountCode: '2.1.04.01',
              accountName: 'Débito Fiscal IVA 16%',
              debit: 0,
              credit: Number((tx.amountUsd * 0.138).toFixed(2)),
              currency: 'USD'
            }
          ]
        : [
            {
              accountCode: '5.1.01.01',
              accountName: `Costo / Gasto Operativo (${tx.vertical})`,
              debit: Number((tx.amountUsd * 0.862).toFixed(2)),
              credit: 0,
              currency: 'USD'
            },
            {
              accountCode: '1.1.05.01',
              accountName: 'Crédito Fiscal IVA Soportado 16%',
              debit: Number((tx.amountUsd * 0.138).toFixed(2)),
              credit: 0,
              currency: 'USD'
            },
            {
              accountCode: '1.1.02.01',
              accountName: `Bancos / Salida de Fondos (${tx.paymentMethod})`,
              debit: 0,
              credit: tx.amountUsd,
              currency: 'USD'
            }
          ],
      isBalanced: true
    };
    setSelectedEntry(entry);
  };

  const tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'resumen', label: 'Resumen General', icon: '📊' },
    { id: 'ventas-compras', label: 'Ventas y Compras', icon: '🔄' },
    { id: 'costos', label: 'Estructura de Costos', icon: '📉' },
    { id: 'contabilidad', label: 'Contabilidad Simple', icon: '🧭' },
    { id: 'fiscal', label: 'Libros y Fiscal', icon: '⚖' }
  ];

  return (
    <div className="min-h-screen bg-[#051322] text-white selection:bg-[#00FFC2]/30 selection:text-white pb-20">
      {/* Banner Superior de Modo Demostración Explícito */}
      <div className="bg-gradient-to-r from-amber-500/20 via-[#0b2341] to-amber-500/20 border-b border-amber-500/30 px-4 py-2.5 text-center text-xs font-medium text-amber-300 flex flex-wrap items-center justify-center gap-2">
        <span className="font-bold bg-amber-500/30 px-2 py-0.5 rounded border border-amber-500/40">
          [DEMO / DATOS DE EJEMPLO]
        </span>
        <span>
          Estás explorando la maqueta funcional del Centro Financiero de Aurora Plus.
        </span>
        <span className="text-white/60 text-[11px] hidden sm:inline">
          (Tasa referencial BCV: {DEMO_BCV_RATE} Bs./USD • Cero cifras simuladas como reales)
        </span>
      </div>

      {/* Encabezado Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00FFC2] to-[#00C9A7] flex items-center justify-center text-[#051322] font-black text-xl shadow-[0_0_15px_rgba(0,255,194,0.4)]">
                A+
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  Centro Financiero Aurora Plus
                </h1>
                <p className="text-xs text-white/60">
                  Visión ejecutiva del negocio, diseñada para dueños sin conocimientos contables.
                </p>
              </div>
            </div>
          </div>

          {/* Selector de Período y Estado de Sincronización */}
          <div className="flex items-center gap-3">
            <div className="bg-[#0b2341] border border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-white/80">
              Período: <span className="text-[#00FFC2] font-semibold">Marzo 2026 (En Curso)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sincronizado</span>
            </div>
          </div>
        </div>

        {/* Cobertura de Verticales */}
        <div className="mt-6">
          <VerticalCoverageCard coverageList={MOCK_COVERAGE} />
        </div>

        {/* Barra de Navegación de Pestañas (Desktop y Móvil Horizontal) */}
        <div className="mt-6 flex items-center gap-2 p-1.5 bg-[#0b2341]/90 rounded-2xl border border-white/10 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#00FFC2] text-[#051322] shadow-[0_0_15px_rgba(0,255,194,0.3)]'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Contenido de la Pestaña Activa */}
        <div className="mt-6">
          {activeTab === 'resumen' && (
            <ResumenFinanciero
              kpis={MOCK_KPIS}
              cashBalances={MOCK_CASH_BALANCES}
              onOpenAccountingSample={() => setSelectedEntry(MOCK_ACCOUNTING_SAMPLE)}
            />
          )}

          {activeTab === 'ventas-compras' && (
            <VentasComprasFinanciero
              transactions={MOCK_TRANSACTIONS}
              onSelectTransaction={handleSelectTransaction}
            />
          )}

          {activeTab === 'costos' && (
            <CostosFinanciero costs={MOCK_COSTS} />
          )}

          {activeTab === 'contabilidad' && (
            <ContabilidadFinanciero
              sampleEntry={MOCK_ACCOUNTING_SAMPLE}
              onViewEntryDetails={setSelectedEntry}
            />
          )}

          {activeTab === 'fiscal' && (
            <FiscalFinanciero fiscal={MOCK_FISCAL} />
          )}
        </div>
      </div>

      {/* Modal de Auditoría Contable */}
      <DetalleContableModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />

      {/* Barra de Navegación Móvil Inferior Fija (Mobile Dock) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#071a2e]/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 flex justify-around items-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl text-[10px] font-medium transition-all ${
              activeTab === tab.id
                ? 'text-[#00FFC2]'
                : 'text-white/50'
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="truncate max-w-[60px]">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
export default CentroFinanciero;
