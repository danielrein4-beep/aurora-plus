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
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F5F5F7] text-[#86868B] border border-[#E5E5EA] ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#86868B]" />
          Borrador
        </span>
      );
    case 'EN_REVISION':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#86868B]/15 text-[#6E6E73] border border-[#86868B]/30 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#6E6E73]" />
          En Revisión
        </span>
      );
    case 'APROBADA':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#177E89]/15 text-[#177E89] border border-[#177E89]/30 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#177E89]" />
          Aprobada (Inmutable)
        </span>
      );
    case 'AJUSTADA':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#86868B]/15 text-[#6E6E73] border border-[#86868B]/30 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#6E6E73]" />
          Ajustada
        </span>
      );
    case 'REVERSADA':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#D92D20]/15 text-[#D92D20] border border-[#D92D20]/30 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#D92D20]" />
          Reversada
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#F5F5F7] text-[#1D1D1F] ${className}`}>
          {estado}
        </span>
      );
  }
};
