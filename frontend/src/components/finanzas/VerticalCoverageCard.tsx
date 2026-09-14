import React from 'react';
import { VerticalCoverage, VerticalCoverageStatus } from './types';

interface VerticalCoverageProps {
  coverageList: VerticalCoverage[];
}

export const VerticalCoverageCard: React.FC<VerticalCoverageProps> = ({ coverageList }) => {
  const getStatusBadge = (status: VerticalCoverageStatus) => {
    switch (status) {
      case 'CON_DATOS':
        return {
          label: 'Con datos',
          badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dotClass: 'bg-emerald-400'
        };
      case 'PARCIAL':
        return {
          label: 'Parcial',
          badgeClass: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          dotClass: 'bg-amber-400'
        };
      case 'SIN_CONEXION':
        return {
          label: 'Sin conexión',
          badgeClass: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          dotClass: 'bg-rose-400'
        };
    }
  };

  const conDatosCount = coverageList.filter(c => c.status === 'CON_DATOS').length;
  const parcialCount = coverageList.filter(c => c.status === 'PARCIAL').length;
  const sinConexionCount = coverageList.filter(c => c.status === 'SIN_CONEXION').length;

  return (
    <div className="bg-[#0b2341] border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden font-['IBM_Plex_Sans',sans-serif]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#35d7c3]" />
            <h3 className="text-base font-semibold text-white">Cobertura Financiera por Vertical</h3>
          </div>
          <p className="text-xs text-white/60 mt-0.5">
            Estado cualitativo de la información recibida desde cada vertical operativa de tu negocio.
          </p>
        </div>

        {/* Resumen Cualitativo */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium inline-flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
            <span>{conDatosCount} Con datos</span>
          </span>
          <span className="px-2.5 py-1 text-xs rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium inline-flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5" />
            <span>{parcialCount} Parcial</span>
          </span>
          {sinConexionCount > 0 && (
            <span className="px-2.5 py-1 text-xs rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium inline-flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5" />
              <span>{sinConexionCount} Sin conexión</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 mt-4">
        {coverageList.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-5 rounded-xl border border-white/10 bg-[#071a2e] p-5 text-center text-sm text-white/60">
            No hay verticales operativas conectadas para este período.
          </div>
        )}
        {coverageList.map((item) => {
          const badge = getStatusBadge(item.status);

          return (
            <div 
              key={item.verticalId} 
              className="bg-[#071a2e] border border-white/10 hover:border-white/20 p-3.5 rounded-xl transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-white truncate" title={item.name}>
                    {item.name}
                  </span>
                </div>

                <div className="mb-2.5">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium ${badge.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                    {badge.label}
                  </span>
                </div>

                {item.activeSources.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.activeSources.map((source, sIdx) => (
                      <span key={sIdx} className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/70 font-['IBM_Plex_Mono',monospace]">
                        {source}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-white/55 leading-relaxed pt-2 border-t border-white/10">
                {item.notes}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

