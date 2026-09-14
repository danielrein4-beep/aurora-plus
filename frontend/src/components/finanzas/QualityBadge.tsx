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
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      dot: 'bg-emerald-400',
      icon: <IconCheck size={12} className="text-emerald-400" />,
      defaultDesc: 'Información respaldada por documentos operativos y conciliación completa.'
    },
    ESTIMADO: {
      label: 'Estimado',
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      dot: 'bg-amber-400',
      icon: <span className="font-mono text-xs text-amber-400 leading-none font-bold">~</span>,
      defaultDesc: 'Incluye cálculos proyectados o provisiones temporales en espera de cierre.'
    },
    DATOS_INCOMPLETOS: {
      label: 'Datos incompletos',
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      dot: 'bg-rose-400',
      icon: <IconWarning size={12} className="text-rose-400" />,
      defaultDesc: 'Faltan comprobantes o fuentes sin costear. No tomar como cifra concluyente.'
    }
  }[state];

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs' 
    : 'px-2.5 py-1 text-xs font-medium';

  return (
    <div 
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${sizeClasses} select-none group relative cursor-help font-['IBM_Plex_Sans',sans-serif]`}
      title={explanation || config.defaultDesc}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
      
      {explanation && (
        <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 max-w-[calc(100vw-32px)] p-2 text-[11px] leading-snug rounded-lg bg-[#071a2e] border border-white/10 text-white/90 shadow-xl z-50 pointer-events-none">
          <p className="font-semibold text-white mb-0.5 flex items-center gap-1.5">
            {config.icon}
            <span>{config.label}</span>
          </p>
          {explanation}
        </span>
      )}
    </div>
  );
};

