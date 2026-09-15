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
      bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
      dot: 'bg-emerald-500',
      icon: <IconCheck size={11} className="text-emerald-500" />,
      defaultDesc: 'Información respaldada por documentos operativos y conciliación completa.'
    },
    ESTIMADO: {
      label: 'Estimado',
      bg: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
      dot: 'bg-amber-500',
      icon: <span className="font-mono text-xs text-amber-500 leading-none font-bold">~</span>,
      defaultDesc: 'Incluye cálculos proyectados o provisiones temporales en espera de cierre.'
    },
    DATOS_INCOMPLETOS: {
      label: 'Parcial',
      bg: 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400',
      dot: 'bg-rose-500',
      icon: <IconWarning size={11} className="text-rose-500" />,
      defaultDesc: 'Faltan comprobantes o fuentes sin costear. No tomar como cifra concluyente.'
    }
  }[state];

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[10px] font-bold' 
    : 'px-2.5 py-1 text-xs font-bold';

  return (
    <div 
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${sizeClasses} select-none group relative cursor-help transition-all shadow-xs`}
      title={explanation || config.defaultDesc}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
      
      {explanation && (
        <span className="hidden group-hover:block absolute bottom-full right-0 mb-2 w-56 max-w-[calc(100vw-32px)] p-2.5 text-[11px] leading-snug rounded-xl apple-glass border border-slate-200/60 dark:border-white/15 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-white shadow-xl z-50 pointer-events-none backdrop-blur-xl">
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
