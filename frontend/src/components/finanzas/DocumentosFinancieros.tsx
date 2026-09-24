import React, { useState } from 'react';
import { NonFiscalDocument, NonFiscalDocType, SupportedCurrency } from './types';
import { QualityBadge } from './QualityBadge';
import { IconFileText, IconSearch } from '../../Icons';

interface DocumentosFinancierosProps {
  documents: NonFiscalDocument[];
}

export const DocumentosFinancieros: React.FC<DocumentosFinancierosProps> = ({ documents }) => {
  const [selectedType, setSelectedType] = useState<'ALL' | NonFiscalDocType>('ALL');
  const [selectedVertical, setSelectedVertical] = useState<string>('ALL');
  const [selectedCurrency, setSelectedCurrency] = useState<'ALL' | SupportedCurrency>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const verticals = Array.from(new Set(documents.map(d => d.verticalOrigin)));

  const filtered = documents.filter((doc) => {
    const matchesType = selectedType === 'ALL' || doc.docType === selectedType;
    const matchesVertical = selectedVertical === 'ALL' || doc.verticalOrigin === selectedVertical;
    const matchesCurrency = selectedCurrency === 'ALL' || doc.currency === selectedCurrency;
    const matchesSearch = doc.referenciaInterna.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.clientOrBeneficiary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.itemsSummary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesVertical && matchesCurrency && matchesSearch;
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
    <div className="space-y-6">
      {/* Banner Explicativo de Documentación No Fiscal */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E5EA] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#177E89]/10 text-[#177E89] flex items-center justify-center shrink-0 border border-[#177E89]/20">
              <IconFileText size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F]">
                Vista Consolidada de Documentos Operativos
              </h3>
              <p className="text-xs text-[#86868B] mt-1 leading-relaxed max-w-2xl">
                Consolidación centralizada de notas de entrega y documentos de venta no fiscales generados en cada vertical de tu empresa. Cada comprobante cuenta con su referencia interna y trazabilidad de origen.
              </p>
            </div>
          </div>

          <div className="shrink-0 bg-[#F5F5F7] border border-[#E5E5EA] px-3.5 py-1.5 rounded-full self-start sm:self-auto">
            <span className="text-[11px] font-bold text-[#6E6E73] tracking-wider uppercase">
              DOCUMENTO NO FISCAL
            </span>
          </div>
        </div>

        {/* Filtros de Tipo, Origen Vertical y Moneda */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mt-5 pt-4 border-t border-[#E5E5EA]">
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            {/* Tipo de Documento */}
            <div className="flex items-center gap-1 p-1 rounded-full border border-[#E5E5EA] bg-[#F5F5F7] overflow-x-auto max-w-full">
              {(['ALL', 'NOTA_ENTREGA', 'DOCUMENTO_VENTA_NO_FISCAL'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                    selectedType === type
                      ? 'bg-[#177E89] text-white'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {type === 'ALL' ? 'Todos' : type === 'NOTA_ENTREGA' ? 'Notas de Entrega' : 'Ventas No Fiscales'}
                </button>
              ))}
            </div>

            {/* Selector de Vertical */}
            <select
              value={selectedVertical}
              onChange={(e) => setSelectedVertical(e.target.value)}
              className="bg-white rounded-full border border-[#E5E5EA] text-[#1D1D1F] text-xs px-3.5 py-2 outline-none cursor-pointer max-w-full font-medium"
            >
              <option value="ALL">Todas las Verticales</option>
              {verticals.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            {/* Filtro de Monedas */}
            <div className="flex items-center gap-1 p-1 rounded-full border border-[#E5E5EA] bg-[#F5F5F7] overflow-x-auto max-w-full">
              {(['ALL', 'USD', 'VES', 'COP'] as const).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setSelectedCurrency(curr)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                    selectedCurrency === curr
                      ? 'bg-[#177E89]/10 text-[#177E89] border border-[#177E89]/30'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  {curr === 'ALL' ? 'Todas' : curr}
                </button>
              ))}
            </div>
          </div>

          {/* Buscador Rápido */}
          <div className="relative w-full lg:w-72">
            <IconSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B] pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por ref, cliente o ítem..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E5E5EA] focus:border-[#177E89] text-[#1D1D1F] placeholder-[#86868B] text-xs rounded-full pl-9 pr-3.5 py-2 outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Listado de Documentos Consolidado */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
        <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3.5 text-[11px] font-bold text-[#86868B] border-b border-[#E5E5EA] uppercase tracking-wider bg-[#F5F5F7]">
          <div className="col-span-3">Referencia Interna / Tipo</div>
          <div className="col-span-3">Vertical de Origen / Receptor</div>
          <div className="col-span-3">Detalle Operativo</div>
          <div className="col-span-2 text-right">Monto Operativo</div>
          <div className="col-span-1 text-center">Estado</div>
        </div>

        <div className="divide-y divide-[#E5E5EA]">
          {filtered.length === 0 ? (
            <div className="text-center py-14 text-sm text-[#86868B] font-medium">
              No hay comprobantes operativos que coincidan con los filtros seleccionados.
            </div>
          ) : (
            filtered.map((doc) => {
              const isNotaEntrega = doc.docType === 'NOTA_ENTREGA';

              return (
                <div
                  key={doc.id}
                  className="p-4 sm:p-5 lg:px-6 lg:py-4 hover:bg-[#F5F5F7] transition-colors flex flex-col lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center gap-2 group"
                >
                  {/* Referencia Interna y Etiqueta No Fiscal */}
                  <div className="lg:col-span-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#177E89]">
                        {doc.referenciaInterna}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#6E6E73] border border-[#D1D1D6] font-semibold">
                        {doc.nonFiscalNotice}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#86868B] mt-1 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isNotaEntrega
                          ? 'bg-[#177E89]/10 text-[#177E89] border-[#177E89]/30'
                          : 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30'
                      }`}>
                        {isNotaEntrega ? 'Nota de Entrega' : 'Doc. Venta No Fiscal'}
                      </span>
                      <span>{doc.date}</span>
                    </div>
                  </div>

                  {/* Vertical de Origen y Cliente */}
                  <div className="lg:col-span-3">
                    <div className="text-xs font-semibold text-[#1D1D1F]">
                      {doc.clientOrBeneficiary}
                    </div>
                    <div className="text-[11px] text-[#177E89] mt-0.5 font-medium">
                      Origen: {doc.verticalOrigin}
                    </div>
                  </div>

                  {/* Detalle y Pago */}
                  <div className="lg:col-span-3">
                    <div className="text-xs text-[#6E6E73] line-clamp-1" title={doc.itemsSummary}>
                      {doc.itemsSummary}
                    </div>
                    <div className="text-[11px] text-[#86868B] mt-0.5">
                      Cobro: {doc.paymentMethod}
                    </div>
                  </div>

                  {/* Montos */}
                  <div className="lg:col-span-2 lg:text-right flex items-center justify-between lg:block">
                    <span className="lg:hidden text-xs text-[#86868B]">Monto:</span>
                    <div>
                      <div className="text-sm font-bold text-[#1D1D1F]">
                        {formatCurrency(doc.amount, doc.currency)}
                      </div>
                      <span className="text-[10px] text-[#86868B]">
                        {doc.currency}
                      </span>
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="lg:col-span-1 flex items-center justify-end lg:justify-center">
                    <QualityBadge state={doc.qualityState} size="sm" />
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
