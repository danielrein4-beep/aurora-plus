import React from 'react';
import { VerticalCoverage, VerticalCoverageStatus } from './types';
import { IconCloud } from '../../Icons';

interface VerticalCoverageProps {
  coverageList: VerticalCoverage[];
}

export const VerticalCoverageCard: React.FC<VerticalCoverageProps> = ({ coverageList }) => {
  const getStatusBadge = (status: VerticalCoverageStatus) => {
    switch (status) {
      case 'CON_DATOS':
        return {
          label: 'Con datos',
          badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
          dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
        };
      case 'PARCIAL':
        return {
          label: 'Parcial',
          badgeClass: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300',
          dotClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
        };
      case 'SIN_CONEXION':
        return {
          label: 'Sin conexión',
          badgeClass: 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300',
          dotClass: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
        };
    }
  };

  const conDatosCount = coverageList.filter(c => c.status === 'CON_DATOS').length;
  const parcialCount = coverageList.filter(c => c.status === 'PARCIAL').length;
  const sinConexionCount = coverageList.filter(c => c.status === 'SIN_CONEXION').length;

  return (
    <div className="apple-glass rounded-3xl p-5 sm:p-7 border border-slate-300/60 dark:border-white/10 relative overflow-hidden shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-white/10">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 dark:bg-teal-400/10 text-teal-600 dark:text-teal-300 flex items-center justify-center shrink-0 border border-teal-500/20">
            <IconCloud size={20} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold font-['Outfit'] text-slate-900 dark:text-white">
              Cobertura Financiera por Vertical
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5 font-light uppercase tracking-wide">
              Estado de sincronización cualitativa e integración de fuentes operativas en tu negocio.
            </p>
          </div>
        </div>

        {/* Resumen Cualitativo en Pills */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className="px-3 py-1.5 text-xs rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-light uppercase tracking-wide inline-flex items-center shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span>{conDatosCount} Con datos</span>
          </span>
          <span className="px-3 py-1.5 text-xs rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-light uppercase tracking-wide inline-flex items-center shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 mr-2 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
            <span>{parcialCount} Parcial</span>
          </span>
          {sinConexionCount > 0 && (
            <span className="px-3 py-1.5 text-xs rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-light uppercase tracking-wide inline-flex items-center shadow-xs">
              <span className="w-2 h-2 rounded-full bg-rose-400 mr-2 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
              <span>{sinConexionCount} Sin conexión</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-5">
        {coverageList.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-5 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 apple-glass p-8 text-center text-sm text-slate-500 dark:text-white/60 font-light uppercase tracking-wide">
            No hay verticales operativas conectadas para este período.
          </div>
        )}
        {coverageList.map((item) => {
          const badge = getStatusBadge(item.status);

          return (
            <div 
              key={item.verticalId} 
              className="apple-glass border border-slate-300/60 dark:border-white/10 hover:border-teal-400/40 p-4 rounded-2xl transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate font-['Outfit']" title={item.name}>
                    {item.name}
                  </span>
                </div>

                <div className="mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-light uppercase tracking-wide ${badge.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                    {badge.label}
                  </span>
                </div>

                {item.activeSources.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.activeSources.map((source, sIdx) => (
                      <span key={sIdx} className="text-[10px] bg-slate-100 dark:bg-white/5 border border-slate-300/60 dark:border-white/10 px-2 py-0.5 rounded-full text-slate-700 dark:text-white/70 font-mono font-light uppercase tracking-wide">
                        {source}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 dark:text-white/55 leading-relaxed pt-2.5 border-t border-slate-200/80 dark:border-white/10 font-light uppercase tracking-wide">
                {item.notes}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
