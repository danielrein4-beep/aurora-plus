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
      <div className="bg-white rounded-2xl p-5 border border-[#E5E5EA] space-y-4 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-[#1D1D1F]">
            Registro Comercial: Ventas vs. Compras
          </h3>
          <p className="text-xs text-[#86868B] mt-0.5 leading-relaxed">
            Monitoreo en tiempo real del flujo de caja comercial en su moneda de pago original (USD, VES o COP).
          </p>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-[#E5E5EA]">
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            <div className="rounded-full p-1 flex items-center gap-1 bg-[#F5F5F7] border border-[#E5E5EA] overflow-x-auto max-w-full">
              {(['ALL', 'VENTA', 'COMPRA', 'GASTO'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                    filterType === type
                      ? 'bg-[#177E89] text-white'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {type === 'ALL' ? 'Todos' : type === 'VENTA' ? 'Ventas' : type === 'COMPRA' ? 'Compras' : 'Gastos'}
                </button>
              ))}
            </div>

            <div className="rounded-full p-1 flex items-center gap-1 bg-[#F5F5F7] border border-[#E5E5EA] overflow-x-auto max-w-full">
              {(['ALL', 'USD', 'VES', 'COP'] as const).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setFilterCurrency(curr)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                    filterCurrency === curr
                      ? 'bg-[#177E89]/10 text-[#177E89] border border-[#177E89]/30'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
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
              className="text-xs w-full lg:w-72 bg-white border border-[#E5E5EA] focus:border-[#177E89] text-[#1D1D1F] placeholder-[#86868B] rounded-full px-3.5 py-2 outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Lista de Transacciones Responsive */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-bold text-[#86868B] border-b border-[#E5E5EA] uppercase tracking-wider bg-[#F5F5F7]">
          <div className="col-span-4">Operación / Ref. Interna</div>
          <div className="col-span-3">Contraparte / Área</div>
          <div className="col-span-2">Método de Pago</div>
          <div className="col-span-2 text-right">Monto</div>
          <div className="col-span-1 text-center">Estado</div>
        </div>

        <div className="divide-y divide-[#E5E5EA]">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#86868B]">
              No se encontraron transacciones con los filtros actuales.
            </div>
          ) : (
            filtered.map((tx) => {
              const isSale = tx.type === 'VENTA';
              const isExpense = tx.type === 'GASTO';

              return (
                <div
                  key={tx.id}
                  className="p-3.5 sm:p-4 md:px-5 md:py-3.5 hover:bg-[#F5F5F7] transition-colors flex flex-col md:grid md:grid-cols-12 md:gap-4 md:items-center gap-2 group"
                >
                  {/* Info Operación */}
                  <div className="md:col-span-4 flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold border ${
                      isSale
                        ? 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30'
                        : isExpense
                          ? 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30'
                          : 'bg-[#177E89]/10 text-[#177E89] border-[#177E89]/30'
                    }`}>
                      {isSale ? '+' : '−'}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#1D1D1F] group-hover:text-[#177E89] transition-colors line-clamp-1">
                        {tx.description}
                      </div>
                      <div className="text-[11px] text-[#86868B] flex items-center gap-1.5 mt-0.5">
                        <span>{tx.date}</span>
                        {tx.referenciaInterna && (
                          <span
                            onClick={() => onSelectDocReference && onSelectDocReference(tx.referenciaInterna!)}
                            className="bg-[#F5F5F7] border border-[#E5E5EA] px-1.5 py-0.5 rounded text-[#177E89] hover:underline cursor-pointer"
                          >
                            {tx.referenciaInterna}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contraparte y Vertical */}
                  <div className="md:col-span-3">
                    <div className="text-xs text-[#1D1D1F] font-medium">
                      {tx.counterparty}
                    </div>
                    <div className="text-[11px] text-[#86868B]">
                      {tx.vertical}
                    </div>
                  </div>

                  {/* Método de Pago */}
                  <div className="md:col-span-2 text-xs text-[#6E6E73]">
                    <span className="md:hidden text-[#86868B] mr-1">Pago:</span>
                    {tx.paymentMethod}
                  </div>

                  {/* Montos */}
                  <div className="md:col-span-2 md:text-right flex items-center justify-between md:block">
                    <span className="md:hidden text-xs text-[#86868B]">Monto:</span>
                    <div>
                      <div className={`text-sm font-bold ${isSale ? 'text-[#16A34A]' : 'text-[#1D1D1F]'}`}>
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
