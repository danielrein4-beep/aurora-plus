import React, { useState } from 'react';
import { NonFiscalDocument, NonFiscalDocType } from './types';
import { QualityBadge } from './QualityBadge';

interface DocumentosFinancierosProps {
  documents: NonFiscalDocument[];
}

export const DocumentosFinancieros: React.FC<DocumentosFinancierosProps> = ({ documents }) => {
  const [selectedType, setSelectedType] = useState<'ALL' | NonFiscalDocType>('ALL');
  const [selectedVertical, setSelectedVertical] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const verticals = Array.from(new Set(documents.map(d => d.verticalOrigin)));

  const filtered = documents.filter((doc) => {
    const matchesType = selectedType === 'ALL' || doc.docType === selectedType;
    const matchesVertical = selectedVertical === 'ALL' || doc.verticalOrigin === selectedVertical;
    const matchesSearch = doc.internalReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.clientOrBeneficiary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.itemsSummary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesVertical && matchesSearch;
  });

  const formatUsd = (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatVes = (val: number) => `Bs. ${val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Banner Explicativo de Documentación No Fiscal */}
      <div className="bg-gradient-to-r from-blue-950/40 via-[#0b2341]/60 to-[#071a2e]/40 border border-[#00FFC2]/20 rounded-2xl p-5 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <h3 className="text-base font-semibold text-white">
                Vista Consolidada de Documentos Operativos
              </h3>
            </div>
            <p className="text-xs text-white/65 mt-1 leading-relaxed">
              Consolidación centralizada de notas de entrega y comprobantes comerciales generados en cada vertical operativa (Restaurante, Retail, etc.). Esta vista permite auditar la entrega de productos y el cobro operativo de tu empresa.
            </p>
          </div>

          <div className="shrink-0 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-xl">
            <span className="text-xs font-bold text-amber-300 tracking-wide uppercase">
              DOCUMENTO NO FISCAL
            </span>
          </div>
        </div>

        {/* Filtros de Tipo y Origen Vertical */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mt-4 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-[#071a2e] rounded-xl border border-white/10">
              {(['ALL', 'NOTA_ENTREGA', 'DOCUMENTO_VENTA_NO_FISCAL'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    selectedType === type
                      ? 'bg-[#00FFC2] text-[#051322] shadow-[0_0_10px_rgba(0,255,194,0.3)]'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {type === 'ALL' ? 'Todos los Documentos' : type === 'NOTA_ENTREGA' ? 'Notas de Entrega' : 'Ventas No Fiscales'}
                </button>
              ))}
            </div>

            <select
              value={selectedVertical}
              onChange={(e) => setSelectedVertical(e.target.value)}
              className="bg-[#071a2e] border border-white/10 text-white text-xs rounded-xl px-3 py-2 outline-none cursor-pointer"
            >
              <option value="ALL">Todas las Verticales</option>
              {verticals.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <input
            type="text"
            placeholder="Buscar por referencia, cliente o detalle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 bg-[#071a2e] border border-white/10 focus:border-[#00FFC2]/50 text-white placeholder-white/35 text-xs rounded-xl px-3.5 py-2 outline-none transition-all"
          />
        </div>
      </div>

      {/* Listado de Documentos Consolidado */}
      <div className="bg-[#0b2341]/80 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-lg">
        <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-semibold text-white/50 border-b border-white/10 uppercase tracking-wider bg-[#071a2e]/50">
          <div className="col-span-3">Referencia Interna / Tipo</div>
          <div className="col-span-3">Vertical de Origen / Receptor</div>
          <div className="col-span-3">Contenido y Método</div>
          <div className="col-span-2 text-right">Monto (USD / VES)</div>
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
                  className="p-4 lg:px-5 lg:py-3.5 hover:bg-white/[0.03] transition-all flex flex-col lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center gap-2 group"
                >
                  {/* Referencia y Tipo */}
                  <div className="lg:col-span-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#00FFC2]">
                        {doc.internalReference}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                        {doc.nonFiscalNotice}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/60 mt-1 flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        isNotaEntrega ? 'bg-sky-500/20 text-sky-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {isNotaEntrega ? 'Nota de Entrega' : 'Doc. Venta No Fiscal'}
                      </span>
                      <span>{doc.date}</span>
                    </div>
                  </div>

                  {/* Vertical de Origen y Cliente */}
                  <div className="lg:col-span-3">
                    <div className="text-xs text-white font-medium">
                      {doc.clientOrBeneficiary}
                    </div>
                    <div className="text-[11px] text-[#00FFC2]/80 mt-0.5">
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
                      <div className="text-sm font-bold text-white">
                        {formatUsd(doc.amountUsd)}
                      </div>
                      <div className="text-[11px] font-mono text-[#00FFC2]/80">
                        {formatVes(doc.amountVes)}
                      </div>
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
