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
      <div className="bg-white rounded-2xl p-4.5 border border-[#DC2626]/20 bg-[#DC2626]/5 flex items-start gap-3.5 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 flex items-center justify-center shrink-0 text-[#DC2626]">
          <IconWarning size={18} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[#DC2626]">
            Aviso de Costeo: Artículos o Recetas sin Escandallo Completo
          </h4>
          <p className="text-xs text-[#6E6E73] mt-0.5 leading-relaxed">
            Si algún plato o producto tiene costo en $0.00 (recetas sin insumos o pendientes por calcular), el margen comercial real podría ser inferior al estimado aquí.
          </p>
        </div>
      </div>

      {/* Resumen de Estructura de Costos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 bg-white rounded-2xl p-5 border border-[#E5E5EA] flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider">
              Estructura de Costos Operativos
            </span>
            <div className="text-xl sm:text-2xl font-bold text-[#1D1D1F] mt-2">
              Desglose por Moneda
            </div>
            <div className="mt-3 space-y-1">
              {totalEntries.length === 0 ? (
                <div className="text-xs text-[#86868B]">Sin costos registrados en el período.</div>
              ) : (
                totalEntries.map(([currency, amount], idx) => (
                  <div key={currency} className={idx === 0 ? 'text-2xl font-bold text-[#177E89]' : 'text-sm font-bold text-[#6E6E73]'}>
                    {formatFinanceCurrency(amount, currency)}
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-[#86868B] mt-3 leading-relaxed">
              Consumo operativo de insumos y reposiciones registrado en el período seleccionado.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E5E5EA] space-y-2">
            {costs.length === 0 ? (
              <p className="text-xs text-[#86868B]">Aún no hay categorías de costo registradas.</p>
            ) : (
              costs.map((item) => (
                <div key={item.id} className="flex justify-between text-xs text-[#6E6E73]">
                  <span className="truncate pr-2 font-medium">{item.category}:</span>
                  <span className="font-bold text-[#1D1D1F] shrink-0">{item.percentageOfTotal}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Desglose de Categorías de Costo */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-[#E5E5EA] shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#1D1D1F]">
              Desglose por Categoría de Costo
            </h3>
            <p className="text-xs text-[#86868B] mt-0.5">
              Distribución porcentual de los egresos y reposiciones operativas.
            </p>
          </div>

          <div className="space-y-3.5">
            {costs.map((item) => (
              <div key={item.id} className="bg-[#F5F5F7] border border-[#E5E5EA] p-4 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1D1D1F]">
                      {item.category}
                    </span>
                    {item.isEstimated && (
                      <span className="text-[10px] bg-[#F5F5F7] text-[#6E6E73] border border-[#D1D1D6] px-2 py-0.5 rounded-full font-bold">
                        Estimado
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center sm:justify-end">
                    {item.balances.map((b, bIdx) => (
                      <span key={bIdx} className="text-xs font-bold text-[#1D1D1F] bg-white border border-[#E5E5EA] px-2 py-0.5 rounded-lg">
                        {formatFinanceCurrency(b.amount, b.currency)}
                      </span>
                    ))}
                    <span className="text-xs text-[#86868B] font-semibold">
                      ({item.percentageOfTotal}%)
                    </span>
                  </div>
                </div>

                <div className="w-full bg-[#E5E5EA] rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.isEstimated ? 'bg-[#86868B]' : 'bg-[#177E89]'
                    }`}
                    style={{ width: `${item.percentageOfTotal}%` }}
                  />
                </div>

                {item.missingDataWarning && (
                  <p className="text-[11px] text-[#DC2626] mt-2 flex items-center gap-1.5">
                    <IconWarning size={13} className="text-[#DC2626] shrink-0" />
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
