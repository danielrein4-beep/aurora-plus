import React from 'react';
import { CostItem, SupportedCurrency } from './types';
import { IconWarning } from '../../Icons';

interface CostosFinancieroProps {
  costs: CostItem[];
}

export const CostosFinanciero: React.FC<CostosFinancieroProps> = ({ costs }) => {
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

  // Totales derivados de los costos recibidos por props; nunca cifras fijas.
  const totalsByCurrency = costs.reduce<Partial<Record<SupportedCurrency, number>>>((acc, item) => {
    item.balances.forEach((b) => {
      acc[b.currency] = (acc[b.currency] ?? 0) + b.amount;
    });
    return acc;
  }, {});
  const totalEntries = Object.entries(totalsByCurrency) as [SupportedCurrency, number][];

  return (
    <div className="space-y-6 font-['IBM_Plex_Sans',sans-serif]">
      {/* Alerta de Costeo Incompleto / Contexto de Escandallo */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-4.5 flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
          <IconWarning size={18} className="text-amber-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-amber-300">
            Aviso de Costeo: Artículos o Recetas sin Escandallo Completo
          </h4>
          <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
            Si algún plato o producto de tu inventario tiene costo en $0.00 (por ejemplo, recetas sin ingredientes asociados o pendientes por recalcular), el margen comercial real podría ser inferior al estimado aquí. Aurora Plus te avisa para que no tomes decisiones con costos ciegos.
          </p>
        </div>
      </div>

      {/* Resumen de Estructura de Costos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 bg-[#0b2341] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Estructura de Costos Operativos
            </span>
            <div className="text-xl sm:text-2xl font-bold text-white mt-2">
              Desglose por Moneda
            </div>
            <div className="mt-2 space-y-1 font-['IBM_Plex_Mono',monospace]">
              {totalEntries.length === 0 ? (
                <div className="text-sm text-white/50">Sin costos registrados en el período.</div>
              ) : (
                totalEntries.map(([currency, amount], idx) => (
                  <div key={currency} className={idx === 0 ? 'text-xl font-bold text-[#35d7c3]' : 'text-sm text-white/70'}>
                    {formatCurrency(amount, currency)}
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-white/60 mt-3 leading-relaxed">
              Representa el consumo operativo de insumos y nómina registrado en el período. Mantener los costos directos de materia prima controlados es clave para la rentabilidad de tu negocio.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
            {costs.length === 0 ? (
              <p className="text-xs text-white/50">Aún no hay categorías de costo con datos para este período.</p>
            ) : (
              costs.map((item) => (
                <div key={item.id} className="flex justify-between text-xs text-white/70">
                  <span className="truncate pr-2">{item.category}:</span>
                  <span className="font-semibold text-white font-['IBM_Plex_Mono',monospace] shrink-0">{item.percentageOfTotal}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Desglose de Categorías de Costo */}
        <div className="lg:col-span-2 bg-[#0b2341] border border-white/10 rounded-2xl p-4 sm:p-5">
          <h3 className="text-base font-semibold text-white mb-1">
            Desglose por Categoría de Costo
          </h3>
          <p className="text-xs text-white/60 mb-5">
            Entiende exactamente en qué se va el dinero operativo de tu empresa.
          </p>

          <div className="space-y-4">
            {costs.map((item) => (
              <div key={item.id} className="bg-[#071a2e] border border-white/10 p-3.5 sm:p-4 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs font-semibold text-white">
                      {item.category}
                    </span>
                    {item.isEstimated && (
                      <span className="ml-2 text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                        Estimado
                      </span>
                    )}
                  </div>

                  <div className="text-right flex flex-wrap gap-1.5 items-center sm:justify-end">
                    {item.balances.map((b, bIdx) => (
                      <span key={bIdx} className="text-xs font-bold font-['IBM_Plex_Mono',monospace] text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                        {formatCurrency(b.amount, b.currency)}
                      </span>
                    ))}
                    <span className="text-xs text-white/50 font-['IBM_Plex_Mono',monospace]">
                      ({item.percentageOfTotal}%)
                    </span>
                  </div>
                </div>

                <div className="w-full bg-white/5 rounded-full h-2 mb-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      item.isEstimated ? 'bg-amber-400' : 'bg-[#35d7c3]'
                    }`}
                    style={{ width: `${item.percentageOfTotal}%` }}
                  />
                </div>

                {item.missingDataWarning && (
                  <p className="text-[11px] text-amber-300/90 mt-1 flex items-center gap-1.5">
                    <IconWarning size={13} className="text-amber-400 shrink-0" />
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

