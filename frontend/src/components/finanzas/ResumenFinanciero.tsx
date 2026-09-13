import React from 'react';
import { KpiCardData, CashDrawerBalance, SupportedCurrency } from './types';
import { QualityBadge } from './QualityBadge';

interface ResumenFinancieroProps {
  kpis: Record<string, KpiCardData>;
  cashBalances: CashDrawerBalance[];
  onNavigateToDocuments: () => void;
}

export const ResumenFinanciero: React.FC<ResumenFinancieroProps> = ({
  kpis,
  cashBalances,
  onNavigateToDocuments
}) => {
  const formatCurrency = (amount: number, currency: SupportedCurrency) => {
    switch (currency) {
      case 'USD':
        return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'VES':
        return `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'COP':
        return `$${amount.toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Claridad Empresarial */}
      <div className="bg-gradient-to-r from-blue-950/40 via-[#0b2341]/60 to-[#071a2e]/40 border border-[#00FFC2]/20 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00FFC2]/10 border border-[#00FFC2]/30 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[#00FFC2] text-lg font-bold">ℹ</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">
              Centro Financiero Diseñado para la Toma de Decisiones
            </h4>
            <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
              Monitorea el flujo operativo consolidado de tu negocio en lenguaje simple. Los importes se presentan de forma independiente en sus monedas de origen admitidas (USD, VES y COP), sin conversiones ficticias.
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateToDocuments}
          className="self-stretch sm:self-auto px-4 py-2 text-xs font-semibold rounded-xl bg-[#00FFC2]/15 hover:bg-[#00FFC2]/25 text-[#00FFC2] border border-[#00FFC2]/30 transition-all cursor-pointer whitespace-nowrap shadow-[0_0_12px_rgba(0,255,194,0.1)] flex items-center justify-center gap-1.5"
        >
          <span>📋</span>
          <span>Ver Documentos No Fiscales</span>
        </button>
      </div>

      {/* Grid de 4 KPIs Principales con Desglose Multi-moneda */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(kpis).map(([key, kpi]) => {
          const isResult = key === 'resultado';
          const primaryBalance = kpi.balances[0];
          const secondaryBalances = kpi.balances.slice(1);

          return (
            <div
              key={key}
              className={`rounded-2xl p-5 border backdrop-blur-xl transition-all flex flex-col justify-between relative overflow-hidden shadow-lg ${
                isResult 
                  ? 'bg-gradient-to-br from-[#0b2341] to-[#0d3159] border-[#00FFC2]/40 ring-1 ring-[#00FFC2]/20' 
                  : 'bg-[#0b2341]/80 border-white/10 hover:border-white/20'
              }`}
            >
              {isResult && (
                <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#00FFC2]/10 rounded-full blur-2xl pointer-events-none" />
              )}

              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs font-medium text-white/60 tracking-wide uppercase">
                    {kpi.title}
                  </span>
                  <QualityBadge state={kpi.state} explanation={kpi.stateExplanation} size="sm" />
                </div>

                <div className="space-y-1">
                  {primaryBalance && (
                    <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                      {formatCurrency(primaryBalance.amount, primaryBalance.currency)}
                    </div>
                  )}

                  {secondaryBalances.length > 0 && (
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs font-mono font-medium text-[#00FFC2]/90 pt-1">
                      {secondaryBalances.map((sec, idx) => (
                        <span key={idx} className="bg-white/5 px-1.5 py-0.5 rounded">
                          {formatCurrency(sec.amount, sec.currency)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-white/55 mt-2.5 leading-snug">
                  {kpi.subtitle}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className={`font-semibold ${kpi.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {kpi.changePercent >= 0 ? '↑' : '↓'} {Math.abs(kpi.changePercent)}% vs mes ant.
                </span>
                {kpi.detailsHint && (
                  <span className="text-[11px] text-white/40 truncate max-w-[140px]" title={kpi.detailsHint}>
                    {kpi.detailsHint}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Caja y Cuentas Bancarias Multi-Moneda */}
      <div className="bg-[#0b2341]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">🏦</span>
              <h3 className="text-base font-semibold text-white">Disponibilidad en Caja y Cuentas (USD / VES / COP)</h3>
            </div>
            <p className="text-xs text-white/60 mt-0.5">
              Saldos en moneda real disponibles inmediatamente para pagos e imprevistos. Sin sumas heterogéneas.
            </p>
          </div>

          <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full self-start sm:self-auto font-medium">
            Arqueos al día
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
          {cashBalances.map((acc) => {
            return (
              <div
                key={acc.id}
                className="bg-[#071a2e]/70 border border-white/5 hover:border-white/15 p-4 rounded-xl transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-white/90 truncate">
                      {acc.accountName}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      acc.currency === 'USD'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : acc.currency === 'VES'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {acc.currency}
                    </span>
                  </div>

                  <div className="text-xl font-bold text-white mt-1">
                    {formatCurrency(acc.balance, acc.currency)}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/5 text-[11px] text-white/50 flex items-center gap-1">
                  <span>⏱</span>
                  <span className="truncate">{acc.lastReconciliation}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
