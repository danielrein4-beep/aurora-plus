import React from 'react';
import { IconCloud } from '../../Icons';

interface EmptyFinanceStateProps {
  title: string;
  description: string;
}

export const EmptyFinanceState: React.FC<EmptyFinanceStateProps> = ({ title, description }) => (
  <div className="apple-glass rounded-2xl p-10 sm:p-12 text-center flex flex-col items-center gap-3 border border-slate-200/60 dark:border-white/10 shadow-sm">
    <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-inner">
      <IconCloud size={24} />
    </div>
    <h4 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">{title}</h4>
    <p className="text-xs text-slate-500 dark:text-white/50 max-w-md leading-relaxed font-light uppercase tracking-wide">{description}</p>
  </div>
);
