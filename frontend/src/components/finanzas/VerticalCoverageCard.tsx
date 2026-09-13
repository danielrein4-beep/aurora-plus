import React from 'react';
import { VerticalCoverage } from './types';

interface VerticalCoverageProps {
  coverageList: VerticalCoverage[];
}

export const VerticalCoverageCard: React.FC<VerticalCoverageProps> = ({ coverageList }) => {
  const overallCoverage = Math.round(
    coverageList.reduce((acc, curr) => acc + curr.coveragePercent, 0) / (coverageList.length || 1)
  );

  return (
    <div className="bg-[#0b2341]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00FFC2] shadow-[0_0_8px_#00FFC2]" />
            <h3 className="text-base font-semibold text-white">Cobertura Financiera por Vertical</h3>
          </div>
          <p className="text-xs text-white/60 mt-0.5">
            Mide qué porcentaje de los movimientos operativos de tu empresa están sincronizados con este Centro.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto bg-[#071a2e]/60 px-3.5 py-1.5 rounded-xl border border-white/10">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium">Cobertura Total</div>
            <div className="text-lg font-bold text-[#00FFC2]">{overallCoverage}%</div>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#00FFC2]/10 border border-[#00FFC2]/30">
            <span className="text-xs font-semibold text-[#00FFC2]">{coverageList.filter(c => c.status === 'COMPLETO').length}/{coverageList.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
        {coverageList.map((item) => {
          const isFull = item.coveragePercent === 100;
          const isMedium = item.coveragePercent >= 70 && item.coveragePercent < 100;
          
          const barColor = isFull 
            ? 'bg-[#00FFC2]' 
            : isMedium 
              ? 'bg-amber-400' 
              : 'bg-rose-400';

          const textColor = isFull 
            ? 'text-[#00FFC2]' 
            : isMedium 
              ? 'text-amber-400' 
              : 'text-rose-400';

          return (
            <div 
              key={item.verticalId} 
              className="bg-[#071a2e]/70 border border-white/5 hover:border-white/15 p-3.5 rounded-xl transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-white truncate" title={item.name}>
                    {item.name}
                  </span>
                  <span className={`text-xs font-bold ${textColor}`}>
                    {item.coveragePercent}%
                  </span>
                </div>

                <div className="w-full bg-white/5 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                    style={{ width: `${item.coveragePercent}%` }}
                  />
                </div>
              </div>

              <div className="text-[11px] text-white/55 leading-relaxed">
                {item.notes}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
