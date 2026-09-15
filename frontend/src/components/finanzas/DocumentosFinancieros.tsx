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
      {/* Banner Explicativo de Documentación No Fiscal — Apple Liquid Glass */}
      <div className="apple-glass rounded-3xl p-5 sm:p-6 border border-slate-300/60 dark:border-white/10 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 dark:bg-teal-400/10 text-teal-600 dark:text-teal-300 flex items-center justify-center shrink-0 border border-teal-500/20">
              <IconFileText size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-['Outfit'] text-slate-900 dark:text-white">
                Vista Consolidada de Documentos Operativos
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/60 mt-1 leading-relaxed max-w-2xl">
                Consolidación centralizada de notas de entrega y documentos de venta no fiscales generados en cada vertical de tu empresa. Cada comprobante cuenta con su referencia interna y trazabilidad de origen.
              </p>
            </div>
          </div>

          <div className="shrink-0 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-full self-start sm:self-auto shadow-sm">
            <span className="text-[11px] font-bold font-mono text-amber-600 dark:text-amber-300 tracking-wider uppercase">
              DOCUMENTO NO FISCAL
            </span>
          </div>
        </div>

        {/* Filtros de Tipo, Origen Vertical y Moneda con Apple Glass Pill */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-200/80 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            {/* Tipo de Documento */}
            <div className="flex items-center gap-1 p-1 apple-glass-pill rounded-full border border-slate-300/70 dark:border-white/15 overflow-x-auto max-w-full scrollbar-none">
              {(['ALL', 'NOTA_ENTREGA', 'DOCUMENTO_VENTA_NO_FISCAL'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    selectedType === type
                      ? 'bg-teal-500 text-white shadow-md'
                      : 'text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5'
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
              className="apple-glass rounded-full border border-slate-300/70 dark:border-white/15 text-slate-800 dark:text-white text-xs px-3.5 py-2 outline-none cursor-pointer max-w-full font-medium"
            >
              <option value="ALL">Todas las Verticales</option>
              {verticals.map((v) => (
                <option key={v} value={v} className="bg-slate-900 text-white">{v}</option>
              ))}
            </select>

            {/* Filtro de Monedas */}
            <div className="flex items-center gap-1 p-1 apple-glass-pill rounded-full border border-slate-300/70 dark:border-white/15 overflow-x-auto max-w-full scrollbar-none">
              {(['ALL', 'USD', 'VES', 'COP'] as const).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setSelectedCurrency(curr)}
                  className={`px-2.5 py-1 text-xs font-semibold font-mono rounded-full transition-all cursor-pointer ${
                    selectedCurrency === curr
                      ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/40 shadow-xs'
                      : 'text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {curr === 'ALL' ? 'Todas' : curr}
                </button>
              ))}
            </div>
          </div>

          {/* Buscador Rápido */}
          <div className="relative w-full lg:w-72">
            <IconSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por ref, cliente o ítem..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full apple-glass border border-slate-300/70 dark:border-white/15 focus:border-teal-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 text-xs rounded-full pl-9 pr-3.5 py-2 outline-none transition-all shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Listado de Documentos Consolidado — Apple Liquid Glass Table */}
      <div className="apple-glass rounded-3xl border border-slate-300/60 dark:border-white/10 overflow-hidden shadow-xl">
        <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3.5 text-[11px] font-bold text-slate-500 dark:text-white/50 border-b border-slate-200/80 dark:border-white/10 uppercase tracking-wider bg-slate-100/50 dark:bg-white/[0.02]">
          <div className="col-span-3">Referencia Interna / Tipo</div>
          <div className="col-span-3">Vertical de Origen / Receptor</div>
          <div className="col-span-3">Detalle Operativo</div>
          <div className="col-span-2 text-right">Monto Operativo</div>
          <div className="col-span-1 text-center">Estado</div>
        </div>

        <div className="divide-y divide-slate-200/60 dark:divide-white/5">
          {filtered.length === 0 ? (
            <div className="text-center py-14 text-sm text-slate-400 dark:text-white/50 font-medium">
              No hay comprobantes operativos que coincidan con los filtros seleccionados.
            </div>
          ) : (
            filtered.map((doc) => {
              const isNotaEntrega = doc.docType === 'NOTA_ENTREGA';

              return (
                <div
                  key={doc.id}
                  className="p-4 sm:p-5 lg:px-6 lg:py-4 hover:bg-teal-500/[0.04] transition-colors flex flex-col lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center gap-2 group"
                >
                  {/* Referencia Interna y Etiqueta No Fiscal */}
                  <div className="lg:col-span-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-300">
                        {doc.referenciaInterna}
                      </span>
                      <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-semibold">
                        {doc.nonFiscalNotice}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-white/60 mt-1 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isNotaEntrega
                          ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30'
                          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      }`}>
                        {isNotaEntrega ? 'Nota de Entrega' : 'Doc. Venta No Fiscal'}
                      </span>
                      <span className="font-mono">{doc.date}</span>
                    </div>
                  </div>

                  {/* Vertical de Origen y Cliente */}
                  <div className="lg:col-span-3">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {doc.clientOrBeneficiary}
                    </div>
                    <div className="text-[11px] text-teal-600 dark:text-teal-300/90 mt-0.5 font-medium">
                      Origen: {doc.verticalOrigin}
                    </div>
                  </div>

                  {/* Detalle y Pago */}
                  <div className="lg:col-span-3">
                    <div className="text-xs text-slate-700 dark:text-white/80 line-clamp-1" title={doc.itemsSummary}>
                      {doc.itemsSummary}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-white/50 mt-0.5">
                      Cobro: {doc.paymentMethod}
                    </div>
                  </div>

                  {/* Montos */}
                  <div className="lg:col-span-2 lg:text-right flex items-center justify-between lg:block">
                    <span className="lg:hidden text-xs text-slate-400 dark:text-white/40">Monto:</span>
                    <div>
                      <div className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                        {formatCurrency(doc.amount, doc.currency)}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-white/50 font-mono">
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
