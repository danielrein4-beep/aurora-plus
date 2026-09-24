import React from 'react';
import { EstadoNomina } from './types';

interface EstadoNominaBadgeProps {
  estado: EstadoNomina;
  className?: string;
}

export const EstadoNominaBadge: React.FC<EstadoNominaBadgeProps> = ({ estado, className = '' }) => {
  switch (estado) {
    case 'BORRADOR':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-light uppercase tracking-wide bg-slate-100 text-slate-500 border border-slate-300 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8]" />
          Borrador
        </span>
      );
    case 'EN_REVISION':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-light uppercase tracking-wide bg-[#f59e0b]/15 text-amber-600 border border-[#f59e0b]/30 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] animate-pulse" />
          En Revisión
        </span>
      );
    case 'APROBADA':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-light uppercase tracking-wide bg-[#10b981]/15 text-emerald-600 border border-[#10b981]/30 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
          Aprobada (Inmutable)
        </span>
      );
    case 'AJUSTADA':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-light uppercase tracking-wide bg-[#38bdf8]/15 text-sky-600 border border-[#38bdf8]/30 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
          Ajustada
        </span>
      );
    case 'REVERSADA':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-light uppercase tracking-wide bg-[#ef4444]/15 text-rose-600 border border-[#ef4444]/30 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#f87171]" />
          Reversada
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 ${className}`}>
          {estado}
        </span>
      );
  }
};
