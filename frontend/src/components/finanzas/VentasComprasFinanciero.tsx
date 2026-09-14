import React, { useState } from 'react';
import { TransactionSummary, SupportedCurrency } from './types';
import { QualityBadge } from './QualityBadge';

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
    <div className="space-y-6 font-['IBM_Plex_Sans',sans-serif]">
      {/* Explicación en lenguaje simple para dueños de negocio */}
      <div className="bg-[#0b2341] border border-white/10 rounded-2xl p-4 sm:p-5">
        <h3 className="text-base font-semibold text-white">
          Registro Comercial: Ventas vs. Compras
        </h3>
        <p className="text-xs text-white/65 mt-1 leading-relaxed">
          Aquí ves con total claridad cuánto dinero entró por ventas y cuánto salió en compras o reposiciones, reflejado en su moneda de pago original (USD, VES o COP).
        </p>

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mt-4 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            <div className="flex items-center gap-1 p-1 bg-[#071a2e] rounded-xl border border-white/10 overflow-x-auto max-w-full scrollbar-none">
              {(['ALL', 'VENTA', 'COMPRA', 'GASTO'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    filterType === type
                      ? 'bg-[#35d7c3] text-[#051322]'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {type === 'ALL' ? 'Todos' : type === 'VENTA' ? 'Solo Ventas' : type === 'COMPRA' ? 'Solo Compras' : 'Gastos'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#071a2e] rounded-xl border border-white/10 overflow-x-auto max-w-full scrollbar-none">
              {(['ALL', 'USD', 'VES', 'COP'] as const).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setFilterCurrency(curr)}
                  className={`px-2.5 py-1 text-xs font-semibold font-['IBM_Plex_Mono',monospace] rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    filterCurrency === curr
                      ? 'bg-[#35d7c3]/20 text-[#35d7c3] border border-[#35d7c3]/40'
                      : 'text-white/50 hover:text-white'
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
              placeholder="Buscar por cliente, proveedor o referencia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full lg:w-72 bg-[#071a2e] border border-white/10 focus:border-[#35d7c3] text-white placeholder-white/35 text-xs rounded-xl px-3.5 py-2 outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Lista de Transacciones Responsive */}
      <div className="bg-[#0b2341] border border-white/10 rounded-2xl overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-semibold text-white/50 border-b border-white/10 uppercase tracking-wider bg-[#071a2e]/50">
          <div className="col-span-4">Operación / Referencia Interna</div>
          <div className="col-span-3">Contraparte / Vertical</div>
          <div className="col-span-2">Método de Pago</div>
          <div className="col-span-2 text-right">Monto Operativo</div>
          <div className="col-span-1 text-center">Estado</div>
        </div>

        <div className="divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-white/50">
              No se encontraron transacciones con los filtros actuales.
            </div>
          ) : (
            filtered.map((tx) => {
              const isSale = tx.type === 'VENTA';
              const isExpense = tx.type === 'GASTO';

              return (
                <div
                  key={tx.id}
                  className="p-3.5 sm:p-4 md:px-5 md:py-3.5 hover:bg-white/[0.02] transition-colors flex flex-col md:grid md:grid-cols-12 md:gap-4 md:items-center gap-2 group"
                >
                  {/* Móvil / Escritorio: Info Operación */}
                  <div className="md:col-span-4 flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-['IBM_Plex_Mono',monospace] font-bold ${
                      isSale 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                        : isExpense
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    }`}>
                      {isSale ? '+' : '-'}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-[#35d7c3] transition-colors line-clamp-1">
                        {tx.description}
                      </div>
                      <div className="text-[11px] text-white/50 flex items-center gap-1.5 mt-0.5 font-['IBM_Plex_Mono',monospace]">
                        <span>{tx.date}</span>
                        {tx.referenciaInterna && (
                          <span 
                            onClick={() => onSelectDocReference && onSelectDocReference(tx.referenciaInterna!)}
                            className="bg-white/5 border border-white/10 px-1 rounded text-[#35d7c3] hover:underline cursor-pointer"
                          >
                            {tx.referenciaInterna}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contraparte y Vertical */}
                  <div className="md:col-span-3">
                    <div className="text-xs text-white/90 font-medium">
                      {tx.counterparty}
                    </div>
                    <div className="text-[11px] text-white/50">
                      {tx.vertical}
                    </div>
                  </div>

                  {/* Método de Pago */}
                  <div className="md:col-span-2 text-xs text-white/70">
                    <span className="md:hidden text-white/40 mr-1">Pago:</span>
                    {tx.paymentMethod}
                  </div>

                  {/* Montos */}
                  <div className="md:col-span-2 md:text-right flex items-center justify-between md:block">
                    <span className="md:hidden text-xs text-white/40">Monto:</span>
                    <div>
                      <div className={`text-sm font-bold font-['IBM_Plex_Mono',monospace] ${isSale ? 'text-emerald-400' : 'text-white'}`}>
                        {formatCurrency(tx.amount, tx.currency)}
                      </div>
                      <span className="text-[10px] text-white/50 font-['IBM_Plex_Mono',monospace]">
                        {tx.currency}
                      </span>
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

