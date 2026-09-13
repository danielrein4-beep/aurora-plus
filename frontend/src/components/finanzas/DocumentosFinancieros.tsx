import React, { useState } from 'react';
import { NonFiscalDocument, NonFiscalDocType, SupportedCurrency } from './types';
import { QualityBadge } from './QualityBadge';
import { IconFileText } from '../../Icons';

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
    <div className="space-y-6 font-['IBM_Plex_Sans',sans-serif]">
      {/* Banner Explicativo de Documentación No Fiscal */}
      <div className="bg-[#0b2341] border border-[#35d7c3]/30 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <IconFileText size={18} className="text-[#35d7c3]" />
              <h3 className="text-base font-semibold text-white">
                Vista Consolidada de Documentos Operativos
              </h3>
            </div>
            <p className="text-xs text-white/65 mt-1 leading-relaxed">
              Consolidación centralizada de notas de entrega y documentos de venta no fiscales generados en cada vertical de tu empresa. Cada documento cuenta con su referencia interna.
            </p>
          </div>

          <div className="shrink-0 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
            <span className="text-xs font-bold font-['IBM_Plex_Mono',monospace] text-amber-300 tracking-wide uppercase">
              DOCUMENTO NO FISCAL
            </span>
          </div>
        </div>

        {/* Filtros de Tipo, Origen Vertical y Moneda con corrección de overflow para 390px */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mt-4 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            <div className="flex items-center gap-1 p-1 bg-[#071a2e] rounded-xl border border-white/10 overflow-x-auto max-w-full scrollbar-none">
              {(['ALL', 'NOTA_ENTREGA', 'DOCUMENTO_VENTA_NO_FISCAL'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    selectedType === type
                      ? 'bg-[#35d7c3] text-[#051322]'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {type === 'ALL' ? 'Todos' : type === 'NOTA_ENTREGA' ? 'Notas de Entrega' : 'Ventas No Fiscales'}
                </button>
              ))}
            </div>

            <select
              value={selectedVertical}
              onChange={(e) => setSelectedVertical(e.target.value)}
              className="bg-[#071a2e] border border-white/10 text-white text-xs rounded-xl px-3 py-2 outline-none cursor-pointer max-w-full"
            >
              <option value="ALL">Todas las Verticales</option>
              {verticals.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            <div className="flex items-center gap-1 p-1 bg-[#071a2e] rounded-xl border border-white/10 overflow-x-auto max-w-full scrollbar-none">
              {(['ALL', 'USD', 'VES', 'COP'] as const).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setSelectedCurrency(curr)}
                  className={`px-2.5 py-1 text-xs font-semibold font-['IBM_Plex_Mono',monospace] rounded-lg transition-colors cursor-pointer ${
                    selectedCurrency === curr
                      ? 'bg-[#35d7c3]/20 text-[#35d7c3] border border-[#35d7c3]/40'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {curr === 'ALL' ? 'Todas' : curr}
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            placeholder="Buscar por referencia o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full lg:w-64 bg-[#071a2e] border border-white/10 focus:border-[#35d7c3] text-white placeholder-white/35 text-xs rounded-xl px-3.5 py-2 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Listado de Documentos Consolidado */}
      <div className="bg-[#0b2341] border border-white/10 rounded-2xl overflow-hidden">
        <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-semibold text-white/50 border-b border-white/10 uppercase tracking-wider bg-[#071a2e]/50">
          <div className="col-span-3">Referencia Interna / Tipo</div>
          <div className="col-span-3">Vertical de Origen / Receptor</div>
          <div className="col-span-3">Detalle Operativo</div>
          <div className="col-span-2 text-right">Monto Operativo</div>
          <div className="col-span-1 text-center">Estado</div>
        </div>

        <div className="divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-white/50">
              No hay documentos que coincidan con los filtros seleccionados.
            </div>
          ) : (
            filtered.map((doc) => {
              const isNotaEntrega = doc.docType === 'NOTA_ENTREGA';

              return (
                <div
                  key={doc.id}
                  className="p-3.5 sm:p-4 lg:px-5 lg:py-3.5 hover:bg-white/[0.02] transition-colors flex flex-col lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center gap-2 group"
                >
                  {/* Referencia Interna y Etiqueta No Fiscal */}
                  <div className="lg:col-span-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-['IBM_Plex_Mono',monospace] text-xs font-bold text-[#35d7c3]">
                        {doc.referenciaInterna}
                      </span>
                      <span className="text-[10px] uppercase font-['IBM_Plex_Mono',monospace] tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold">
                        {doc.nonFiscalNotice}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/60 mt-1 flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        isNotaEntrega ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {isNotaEntrega ? 'Nota de Entrega' : 'Doc. Venta No Fiscal'}
                      </span>
                      <span className="font-['IBM_Plex_Mono',monospace]">{doc.date}</span>
                    </div>
                  </div>

                  {/* Vertical de Origen y Cliente */}
                  <div className="lg:col-span-3">
                    <div className="text-xs text-white font-medium">
                      {doc.clientOrBeneficiary}
                    </div>
                    <div className="text-[11px] text-[#35d7c3]/80 mt-0.5">
                      Origen: {doc.verticalOrigin}
                    </div>
                  </div>

                  {/* Detalle y Pago */}
                  <div className="lg:col-span-3">
                    <div className="text-xs text-white/80 line-clamp-1" title={doc.itemsSummary}>
                      {doc.itemsSummary}
                    </div>
                    <div className="text-[11px] text-white/50 mt-0.5">
                      Cobro: {doc.paymentMethod}
                    </div>
                  </div>

                  {/* Montos */}
                  <div className="lg:col-span-2 lg:text-right flex items-center justify-between lg:block">
                    <span className="lg:hidden text-xs text-white/40">Monto:</span>
                    <div>
                      <div className="text-sm font-bold font-['IBM_Plex_Mono',monospace] text-white">
                        {formatCurrency(doc.amount, doc.currency)}
                      </div>
                      <span className="text-[10px] text-white/50 font-['IBM_Plex_Mono',monospace]">
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

