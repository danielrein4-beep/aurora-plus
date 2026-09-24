import React from 'react';
import { QualityState } from './types';
import { IconCheck, IconWarning } from '../../Icons';

interface QualityBadgeProps {
  state: QualityState;
  explanation?: string;
  size?: 'sm' | 'md';
}

export const QualityBadge: React.FC<QualityBadgeProps> = ({
  state,
  explanation,
  size = 'md'
}) => {
  const config = {
    VERIFICADO: {
      label: 'Verificado',
      bg: 'bg-[#177E89]/10 border-[#177E89]/30 text-[#177E89]',
      dot: 'bg-[#177E89]',
      icon: <IconCheck size={11} className="text-[#177E89]" />,
      defaultDesc: 'Información respaldada por documentos operativos y conciliación completa.'
    },
    ESTIMADO: {
      label: 'Estimado',
      bg: 'bg-[#F5F5F7] border-[#D1D1D6] text-[#6E6E73]',
      dot: 'bg-[#86868B]',
      icon: <span className="text-xs text-[#86868B] leading-none font-bold">~</span>,
      defaultDesc: 'Incluye cálculos proyectados o provisiones temporales en espera de cierre.'
    },
    DATOS_INCOMPLETOS: {
      label: 'Parcial',
      bg: 'bg-[#DC2626]/10 border-[#DC2626]/30 text-[#DC2626]',
      dot: 'bg-[#DC2626]',
      icon: <IconWarning size={11} className="text-[#DC2626]" />,
      defaultDesc: 'Faltan comprobantes o fuentes sin costear. No tomar como cifra concluyente.'
    }
  }[state];

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10px] font-bold'
    : 'px-2.5 py-1 text-xs font-bold';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${sizeClasses} select-none group relative cursor-help transition-colors`}
      title={explanation || config.defaultDesc}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>

      {explanation && (
        <span className="hidden group-hover:block absolute bottom-full right-0 mb-2 w-56 max-w-[calc(100vw-32px)] p-2.5 text-[11px] leading-snug rounded-xl border border-[#E5E5EA] bg-white text-[#1D1D1F] shadow-sm z-50 pointer-events-none">
          <p className="font-bold mb-1 flex items-center gap-1.5">
            {config.icon}
            <span>{config.label}</span>
          </p>
          {explanation}
        </span>
      )}
    </div>
  );
};
