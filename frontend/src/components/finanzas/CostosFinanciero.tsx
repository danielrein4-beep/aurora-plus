import React from 'react';
import { CostItem, SupportedCurrency } from './types';
import { IconWarning } from '../../Icons';
import { formatFinanceCurrency } from './ResumenFinanciero';

interface CostosFinancieroProps {
  costs: CostItem[];
}

export const CostosFinanciero: React.FC<CostosFinancieroProps> = ({ costs }) => {
  const totalsByCurrency = costs.reduce<Partial<Record<SupportedCurrency, number>>>((acc, item) => {
    item.balances.forEach((b) => {
      acc[b.currency] = (acc[b.currency] ?? 0) + b.amount;
    });
    return acc;
  }, {});
  const totalEntries = Object.entries(totalsByCurrency) as [SupportedCurrency, number][];

  return (
    <div className="space-y-5 text-left">
      {/* Alerta de Costeo Incompleto / Contexto de Escandallo */}
      <div className="apple-glass rounded-2xl p-4.5 border border-amber-500/25 bg-amber-500/[0.06] flex items-start gap-3.5 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-500">
          <IconWarning size={18} />
        </div>
        <div>
          <h4 className="font-['Outfit'] text-sm font-bold text-amber-700 dark:text-amber-300">
            Aviso de Costeo: Artículos o Recetas sin Escandallo Completo
          </h4>
          <p className="text-xs text-slate-600 dark:text-amber-200/80 mt-0.5 leading-relaxed font-light uppercase tracking-wide">
            Si algún plato o producto tiene costo en $0.00 (recetas sin insumos o pendientes por calcular), el margen comercial real podría ser inferior al estimado aquí.
          </p>
        </div>
      </div>

      {/* Resumen de Estructura de Costos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 apple-glass rounded-2xl p-5 border border-slate-200/60 dark:border-white/10 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-light text-slate-400 dark:text-white/40 uppercase tracking-wide">
              Estructura de Costos Operativos
            </span>
            <div className="text-xl sm:text-2xl font-black font-['Outfit'] text-slate-900 dark:text-white mt-2">
              Desglose por Moneda
            </div>
            <div className="mt-3 space-y-1">
              {totalEntries.length === 0 ? (
                <div className="text-xs text-slate-400 font-light uppercase tracking-wide">Sin costos registrados en el período.</div>
              ) : (
                totalEntries.map(([currency, amount], idx) => (
                  <div key={currency} className={idx === 0 ? 'text-2xl font-black font-[\'Outfit\'] text-teal-600 dark:text-teal-400' : 'text-sm font-bold font-mono text-slate-600 dark:text-white/70'}>
                    {formatFinanceCurrency(amount, currency)}
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-white/50 mt-3 leading-relaxed font-light uppercase tracking-wide">
              Consumo operativo de insumos y reposiciones registrado en el período seleccionado.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-white/10 space-y-2">
            {costs.length === 0 ? (
              <p className="text-xs text-slate-400 font-light uppercase tracking-wide">Aún no hay categorías de costo registradas.</p>
            ) : (
              costs.map((item) => (
                <div key={item.id} className="flex justify-between text-xs text-slate-600 dark:text-white/70">
                  <span className="truncate pr-2 font-light uppercase tracking-wide">{item.category}:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-white shrink-0">{item.percentageOfTotal}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Desglose de Categorías de Costo */}
        <div className="lg:col-span-2 apple-glass rounded-2xl p-5 border border-slate-200/60 dark:border-white/10 shadow-sm space-y-4">
          <div>
            <h3 className="font-['Outfit'] text-base font-bold text-slate-900 dark:text-white">
              Desglose por Categoría de Costo
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5 font-light uppercase tracking-wide">
              Distribución porcentual de los egresos y reposiciones operativas.
            </p>
          </div>

          <div className="space-y-3.5">
            {costs.map((item) => (
              <div key={item.id} className="bg-slate-100/60 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 p-4 rounded-xl shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-light uppercase tracking-wide text-slate-800 dark:text-white">
                      {item.category}
                    </span>
                    {item.isEstimated && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/25 px-2 py-0.5 rounded-full font-light uppercase tracking-wide">
                        Estimado
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center sm:justify-end">
                    {item.balances.map((b, bIdx) => (
                      <span key={bIdx} className="text-xs font-bold font-mono text-slate-800 dark:text-white bg-slate-200/60 dark:bg-white/10 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-lg">
                        {formatFinanceCurrency(b.amount, b.currency)}
                      </span>
                    ))}
                    <span className="text-xs text-slate-400 dark:text-white/40 font-mono font-semibold">
                      ({item.percentageOfTotal}%)
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-200/70 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      item.isEstimated ? 'bg-amber-400' : 'bg-gradient-to-r from-teal-500 to-emerald-400'
                    }`}
                    style={{ width: `${item.percentageOfTotal}%` }}
                  />
                </div>

                {item.missingDataWarning && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-300/90 mt-2 flex items-center gap-1.5 font-light uppercase tracking-wide">
                    <IconWarning size={13} className="text-amber-500 shrink-0" />
                    <span>{item.missingDataWarning}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
