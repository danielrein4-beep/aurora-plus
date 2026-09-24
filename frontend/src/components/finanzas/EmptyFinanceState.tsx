import React from 'react';
import { IconCloud } from '../../Icons';

interface EmptyFinanceStateProps {
  title: string;
  description: string;
}

export const EmptyFinanceState: React.FC<EmptyFinanceStateProps> = ({ title, description }) => (
  <div className="bg-white rounded-2xl p-10 sm:p-12 text-center flex flex-col items-center gap-3 border border-[#E5E5EA] shadow-sm">
    <div className="w-14 h-14 rounded-2xl bg-[#177E89]/10 border border-[#177E89]/25 flex items-center justify-center text-[#177E89]">
      <IconCloud size={24} />
    </div>
    <h4 className="font-bold text-base text-[#1D1D1F]">{title}</h4>
    <p className="text-xs text-[#86868B] max-w-md leading-relaxed">{description}</p>
  </div>
);
