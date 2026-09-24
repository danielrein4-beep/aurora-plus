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
          badgeClass: 'bg-[#16A34A]/10 border-[#16A34A]/30 text-[#16A34A]',
          dotClass: 'bg-[#16A34A]'
        };
      case 'PARCIAL':
        return {
          label: 'Parcial',
          badgeClass: 'bg-[#F5F5F7] border-[#D1D1D6] text-[#6E6E73]',
          dotClass: 'bg-[#86868B]'
        };
      case 'SIN_CONEXION':
        return {
          label: 'Sin conexión',
          badgeClass: 'bg-[#DC2626]/10 border-[#DC2626]/30 text-[#DC2626]',
          dotClass: 'bg-[#DC2626]'
        };
    }
  };

  const conDatosCount = coverageList.filter(c => c.status === 'CON_DATOS').length;
  const parcialCount = coverageList.filter(c => c.status === 'PARCIAL').length;
  const sinConexionCount = coverageList.filter(c => c.status === 'SIN_CONEXION').length;

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-7 border border-[#E5E5EA] relative overflow-hidden shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E5EA]">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#177E89]/10 text-[#177E89] flex items-center justify-center shrink-0 border border-[#177E89]/20">
            <IconCloud size={20} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F]">
              Cobertura Financiera por Vertical
            </h3>
            <p className="text-xs text-[#86868B] mt-0.5">
              Estado de sincronización cualitativa e integración de fuentes operativas en tu negocio.
            </p>
          </div>
        </div>

        {/* Resumen Cualitativo en Pills */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className="px-3 py-1.5 text-xs rounded-full bg-[#16A34A]/10 border border-[#16A34A]/30 text-[#16A34A] font-semibold inline-flex items-center">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] mr-2" />
            <span>{conDatosCount} Con datos</span>
          </span>
          <span className="px-3 py-1.5 text-xs rounded-full bg-[#F5F5F7] border border-[#D1D1D6] text-[#6E6E73] font-semibold inline-flex items-center">
            <span className="w-2 h-2 rounded-full bg-[#86868B] mr-2" />
            <span>{parcialCount} Parcial</span>
          </span>
          {sinConexionCount > 0 && (
            <span className="px-3 py-1.5 text-xs rounded-full bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] font-semibold inline-flex items-center">
              <span className="w-2 h-2 rounded-full bg-[#DC2626] mr-2" />
              <span>{sinConexionCount} Sin conexión</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-5">
        {coverageList.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-5 rounded-2xl border border-dashed border-[#D1D1D6] bg-white p-8 text-center text-sm text-[#86868B]">
            No hay verticales operativas conectadas para este período.
          </div>
        )}
        {coverageList.map((item) => {
          const badge = getStatusBadge(item.status);

          return (
            <div
              key={item.verticalId}
              className="bg-white border border-[#E5E5EA] hover:border-[#D1D1D6] p-4 rounded-2xl transition-colors flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-[#1D1D1F] truncate" title={item.name}>
                    {item.name}
                  </span>
                </div>

                <div className="mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${badge.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                    {badge.label}
                  </span>
                </div>

                {item.activeSources.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.activeSources.map((source, sIdx) => (
                      <span key={sIdx} className="text-[10px] bg-[#F5F5F7] border border-[#E5E5EA] px-2 py-0.5 rounded-full text-[#6E6E73]">
                        {source}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-[#86868B] leading-relaxed pt-2.5 border-t border-[#E5E5EA]">
                {item.notes}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
