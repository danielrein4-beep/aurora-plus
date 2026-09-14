import React from 'react';
import { IconCloud } from '../../Icons';

interface EmptyFinanceStateProps {
  title: string;
  description: string;
}

// Estado honesto para secciones del Centro Financiero que aún no tienen una fuente de datos real conectada.
export const EmptyFinanceState: React.FC<EmptyFinanceStateProps> = ({ title, description }) => (
  <div className="bg-[#0b2341] border border-white/10 rounded-2xl p-8 sm:p-10 text-center flex flex-col items-center gap-3 font-['IBM_Plex_Sans',sans-serif]">
    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
      <IconCloud size={22} className="text-white/40" />
    </div>
    <h4 className="text-sm font-semibold text-white">{title}</h4>
    <p className="text-xs text-white/60 max-w-md leading-relaxed">{description}</p>
  </div>
);
