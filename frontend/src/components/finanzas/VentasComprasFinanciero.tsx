import React, { useState } from 'react';
import { TransactionSummary, SupportedCurrency } from './types';
import { QualityBadge } from './QualityBadge';
import { formatFinanceCurrency } from './ResumenFinanciero';

interface VentasComprasFinancieroProps {
  transactions: TransactionSummary[];
  onSelectDocReference?: (ref: string) => void;
}

export const VentasComprasFinanciero: React.FC<VentasComprasFinancieroProps> = ({
  transactions,
  onSelectDocReference
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'VENTA' | 'COMPRA' | 'GASTO'>('ALL');
  const [filterCurrency, setFilterCurrency] = useState<'ALL' | SupportedCurrency>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = transactions.filter((t) => {
    const matchesType = filterType === 'ALL' || t.type === filterType;
    const matchesCurrency = filterCurrency === 'ALL' || t.currency === filterCurrency;
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.counterparty.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.referenciaInterna && t.referenciaInterna.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesCurrency && matchesSearch;
  });

  return (
    <div className="space-y-5 text-left">
      {/* Explicación y Filtros */}
      <div className="apple-glass rounded-2xl p-5 border border-slate-200/60 dark:border-white/10 space-y-4 shadow-sm">
        <div>
          <h3 className="font-['Outfit'] text-base font-bold text-slate-900 dark:text-white">
            Registro Comercial: Ventas vs. Compras
          </h3>
          <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5 leading-relaxed">
            Monitoreo en tiempo real del flujo de caja comercial en su moneda de pago original (USD, VES o COP).
          </p>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-slate-200/50 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            <div className="apple-glass-pill rounded-full p-1 flex items-center gap-1 bg-slate-100/90 dark:bg-white/5 border border-slate-300/80 dark:border-white/10 overflow-x-auto max-w-full">
              {(['ALL', 'VENTA', 'COMPRA', 'GASTO'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    filterType === type
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {type === 'ALL' ? 'Todos' : type === 'VENTA' ? 'Ventas' : type === 'COMPRA' ? 'Compras' : 'Gastos'}
                </button>
              ))}
            </div>

            <div className="apple-glass-pill rounded-full p-1 flex items-center gap-1 bg-slate-100/90 dark:bg-white/5 border border-slate-300/80 dark:border-white/10 overflow-x-auto max-w-full">
              {(['ALL', 'USD', 'VES', 'COP'] as const).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setFilterCurrency(curr)}
                  className={`px-2.5 py-1 text-xs font-bold font-mono rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    filterCurrency === curr
                      ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30'
                      : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {curr === 'ALL' ? 'Todas' : curr}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar cliente, proveedor o ref…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-horeca text-xs w-full lg:w-72"
            />
          </div>
        </div>
      </div>

      {/* Lista de Transacciones Responsive */}
      <div className="apple-glass rounded-2xl border border-slate-200/60 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-bold text-slate-400 dark:text-white/40 border-b border-slate-200/50 dark:border-white/10 uppercase tracking-wider bg-slate-100/60 dark:bg-white/[0.02]">
          <div className="col-span-4">Operación / Ref. Interna</div>
          <div className="col-span-3">Contraparte / Área</div>
          <div className="col-span-2">Método de Pago</div>
          <div className="col-span-2 text-right">Monto</div>
          <div className="col-span-1 text-center">Estado</div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 dark:text-white/40">
              No se encontraron transacciones con los filtros actuales.
            </div>
          ) : (
            filtered.map((tx) => {
              const isSale = tx.type === 'VENTA';
              const isExpense = tx.type === 'GASTO';

              return (
                <div
                  key={tx.id}
                  className="p-3.5 sm:p-4 md:px-5 md:py-3.5 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors flex flex-col md:grid md:grid-cols-12 md:gap-4 md:items-center gap-2 group"
                >
                  {/* Info Operación */}
                  <div className="md:col-span-4 flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-mono font-black ${
                      isSale 
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                        : isExpense
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                    }`}>
                      {isSale ? '+' : '−'}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-white/90 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-1">
                        {tx.description}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-white/40 flex items-center gap-1.5 mt-0.5 font-mono">
                        <span>{tx.date}</span>
                        {tx.referenciaInterna && (
                          <span 
                            onClick={() => onSelectDocReference && onSelectDocReference(tx.referenciaInterna!)}
                            className="bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 px-1.5 py-0.5 rounded text-teal-600 dark:text-teal-300 hover:underline cursor-pointer"
                          >
                            {tx.referenciaInterna}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contraparte y Vertical */}
                  <div className="md:col-span-3">
                    <div className="text-xs text-slate-800 dark:text-white/90 font-medium">
                      {tx.counterparty}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-white/40">
                      {tx.vertical}
                    </div>
                  </div>

                  {/* Método de Pago */}
                  <div className="md:col-span-2 text-xs text-slate-600 dark:text-white/70">
                    <span className="md:hidden text-slate-400 mr-1">Pago:</span>
                    {tx.paymentMethod}
                  </div>

                  {/* Montos */}
                  <div className="md:col-span-2 md:text-right flex items-center justify-between md:block">
                    <span className="md:hidden text-xs text-slate-400">Monto:</span>
                    <div>
                      <div className={`text-sm font-black font-['Outfit'] ${isSale ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                        {formatFinanceCurrency(tx.amount, tx.currency)}
                      </div>
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="md:col-span-1 flex items-center justify-between md:justify-center">
                    <QualityBadge state={tx.qualityState} size="sm" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
