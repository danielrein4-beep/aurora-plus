import React from 'react';
import { KpiCardData, CashDrawerBalance, SupportedCurrency } from './types';
import { QualityBadge } from './QualityBadge';
import { IconBank, IconFileText, IconHourglass, IconInfo } from '../../Icons';

interface ResumenFinancieroProps {
  kpis: Record<string, KpiCardData>;
  cashBalances?: CashDrawerBalance[];
  onNavigateToDocuments: () => void;
  dataMode?: 'real' | 'demo';
}

export const formatFinanceCurrency = (amount: number, currency: SupportedCurrency) => {
  const num = Number(amount) || 0;
  if (currency === 'COP') {
    return `$${num.toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP`;
  }
  if (currency === 'VES') {
    const dec = num % 1 !== 0;
    return `Bs. ${num.toLocaleString('es-CO', { minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: 2 })}`;
  }
  const dec = num % 1 !== 0;
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: 2 })}`;
};

export const ResumenFinanciero: React.FC<ResumenFinancieroProps> = ({
  kpis,
  cashBalances = [],
  onNavigateToDocuments,
  dataMode = 'demo'
}) => {
  return (
    <div className="space-y-6 text-left">
      {/* Banner de Claridad Empresarial */}
      <div className="apple-glass rounded-2xl p-5 border border-teal-500/25 bg-gradient-to-r from-teal-500/[0.08] via-transparent to-sky-500/[0.08] backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center shrink-0 mt-0.5 text-teal-600 dark:text-teal-300">
            <IconInfo size={20} />
          </div>
          <div>
            <h4 className="font-['Outfit'] text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Centro Financiero Diseñado para la Toma de Decisiones
            </h4>
            <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5 leading-relaxed">
              {dataMode === 'real'
                ? 'Importes consolidados en la moneda base del negocio. Los movimientos conservan el contravalor registrado al momento exacto de la operación.'
                : 'Los importes se presentan en su moneda real de origen (USD, VES y COP) con arqueos auditados en tiempo real.'}
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateToDocuments}
          className="apple-glass-btn text-xs font-semibold px-4 py-2.5 rounded-xl text-teal-600 dark:text-teal-300 border border-teal-500/30 hover:bg-teal-500/15 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 shrink-0"
        >
          <IconFileText size={14} />
          <span>Ver Documentos</span>
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
              className={`apple-glass rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden shadow-sm ${
                isResult 
                  ? 'border-teal-500/50 dark:border-teal-400/40 bg-teal-500/[0.04] ring-1 ring-teal-500/20' 
                  : 'border-slate-200/60 dark:border-white/10 hover:border-teal-500/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-white/40 tracking-wider uppercase">
                    {kpi.title}
                  </span>
                  <QualityBadge state={kpi.state} explanation={kpi.stateExplanation} size="sm" />
                </div>

                <div className="space-y-1">
                  {primaryBalance && (
                    <div className="text-2xl lg:text-3xl font-black font-['Outfit'] text-slate-900 dark:text-white tracking-tight">
                      {formatFinanceCurrency(primaryBalance.amount, primaryBalance.currency)}
                    </div>
                  )}

                  {secondaryBalances.length > 0 && (
                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs font-mono font-bold text-teal-600 dark:text-teal-400 pt-1">
                      {secondaryBalances.map((sec, idx) => (
                        <span key={idx} className="bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 px-2 py-0.5 rounded-lg">
                          {formatFinanceCurrency(sec.amount, sec.currency)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-white/50 mt-2.5 leading-snug">
                  {kpi.subtitle}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-xs min-h-5">
                {kpi.changePercent !== undefined && (
                  <span className={`font-mono font-bold ${kpi.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {kpi.changePercent >= 0 ? '+' : ''}{kpi.changePercent}% vs mes ant.
                  </span>
                )}
                {kpi.detailsHint && (
                  <span className="text-[11px] text-slate-400 dark:text-white/40 truncate max-w-[150px]" title={kpi.detailsHint}>
                    {kpi.detailsHint}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disponibilidad en Caja y Cuentas */}
      {cashBalances.length > 0 && (
        <div className="apple-glass rounded-2xl p-5 sm:p-6 border border-slate-200/60 dark:border-white/10 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/50 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                <h3 className="font-['Outfit'] text-base font-bold text-slate-900 dark:text-white">
                  Disponibilidad en Caja y Cuentas (USD / VES / COP)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                Saldos en moneda real disponibles inmediatamente para pagos e imprevistos. Sin sumas heterogéneas.
              </p>
            </div>

            <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full self-start sm:self-auto font-bold">
              Arqueos al día
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-2">
            {cashBalances.map((acc) => (
              <div
                key={acc.id}
                className="bg-slate-100/60 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 hover:border-teal-500/30 p-4 rounded-xl transition-all flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-white/90 truncate">
                      {acc.accountName}
                    </span>
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border ${
                      acc.currency === 'USD'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' 
                        : acc.currency === 'VES'
                          ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
                          : 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30'
                    }`}>
                      {acc.currency}
                    </span>
                  </div>

                  <div className="text-xl font-black font-['Outfit'] text-slate-900 dark:text-white mt-1 break-all">
                    {formatFinanceCurrency(acc.balance, acc.currency)}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/40 dark:border-white/5 text-[11px] text-slate-400 dark:text-white/40 flex items-center gap-1.5 font-mono">
                  <IconHourglass size={12} className="shrink-0" />
                  <span className="truncate">{acc.lastReconciliation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
