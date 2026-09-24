import React from 'react';
import { KpiCardData, CashDrawerBalance, SupportedCurrency } from './types';
import { QualityBadge } from './QualityBadge';
import { IconFileText, IconHourglass, IconInfo } from '../../Icons';

interface ResumenFinancieroProps {
  kpis: Record<string, KpiCardData>;
  cashBalances?: CashDrawerBalance[];
  onNavigateToDocuments: () => void;
  dataMode?: 'real' | 'demo';
}

export const formatFinanceCurrency = (amount: number, currency: SupportedCurrency) => {
  const num = Number(amount) || 0;
  if (currency === 'COP') {
    return `$${num.toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP`;
  }
  if (currency === 'VES') {
    const dec = num % 1 !== 0;
    return `Bs. ${num.toLocaleString('es-CO', { minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: 2 })}`;
  }
  const dec = num % 1 !== 0;
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: 2 })}`;
};

export const ResumenFinanciero: React.FC<ResumenFinancieroProps> = ({
  kpis,
  cashBalances = [],
  onNavigateToDocuments,
  dataMode = 'demo'
}) => {
  return (
    <div className="space-y-6 text-left">
      {/* Banner de Claridad Empresarial */}
      <div className="bg-white rounded-2xl p-5 border border-[#E5E5EA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#177E89]/10 border border-[#177E89]/30 flex items-center justify-center shrink-0 mt-0.5 text-[#177E89]">
            <IconInfo size={20} />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-[#1D1D1F]">
              Centro Financiero Diseñado para la Toma de Decisiones
            </h4>
            <p className="text-xs text-[#86868B] mt-0.5 leading-relaxed">
              {dataMode === 'real'
                ? 'Importes consolidados en la moneda base del negocio. Los movimientos conservan el contravalor registrado al momento exacto de la operación.'
                : 'Los importes se presentan en su moneda real de origen (USD, VES y COP) con arqueos auditados en tiempo real.'}
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateToDocuments}
          className="text-xs font-semibold px-4 py-2.5 rounded-full text-[#177E89] bg-[#F5F5F7] border border-[#E5E5EA] hover:bg-[#E5E5EA] transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 shrink-0"
        >
          <IconFileText size={14} />
          <span>Ver Documentos</span>
        </button>
      </div>

      {/* Grid de 4 KPIs Principales con Desglose Multi-moneda */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(kpis).map(([key, kpi]) => {
          const isResult = key === 'resultado';
          const primaryBalance = kpi.balances[0];
          const secondaryBalances = kpi.balances.slice(1);

          return (
            <div
              key={key}
              className={`bg-white rounded-2xl p-5 border transition-colors flex flex-col justify-between relative overflow-hidden shadow-sm ${
                isResult
                  ? 'border-[#177E89] ring-1 ring-[#177E89]/20'
                  : 'border-[#E5E5EA] hover:border-[#D1D1D6]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-[11px] font-bold text-[#86868B] tracking-wider uppercase">
                    {kpi.title}
                  </span>
                  <QualityBadge state={kpi.state} explanation={kpi.stateExplanation} size="sm" />
                </div>

                <div className="space-y-1">
                  {primaryBalance && (
                    <div className="text-2xl lg:text-3xl font-bold text-[#1D1D1F] tracking-tight">
                      {formatFinanceCurrency(primaryBalance.amount, primaryBalance.currency)}
                    </div>
                  )}

                  {secondaryBalances.length > 0 && (
                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs font-semibold text-[#177E89] pt-1">
                      {secondaryBalances.map((sec, idx) => (
                        <span key={idx} className="bg-[#F5F5F7] border border-[#E5E5EA] px-2 py-0.5 rounded-lg">
                          {formatFinanceCurrency(sec.amount, sec.currency)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-[#86868B] mt-2.5 leading-snug">
                  {kpi.subtitle}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E5E5EA] flex items-center justify-between text-xs min-h-5">
                {kpi.changePercent !== undefined && (
                  <span className={`font-bold ${kpi.changePercent >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                    {kpi.changePercent >= 0 ? '+' : ''}{kpi.changePercent}% vs mes ant.
                  </span>
                )}
                {kpi.detailsHint && (
                  <span className="text-[11px] text-[#86868B] truncate max-w-[150px]" title={kpi.detailsHint}>
                    {kpi.detailsHint}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disponibilidad en Caja y Cuentas */}
      {cashBalances.length > 0 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E5EA] space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5E5EA]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#177E89]" />
                <h3 className="text-base font-bold text-[#1D1D1F]">
                  Disponibilidad en Caja y Cuentas (USD / VES / COP)
                </h3>
              </div>
              <p className="text-xs text-[#86868B] mt-0.5">
                Saldos en moneda real disponibles inmediatamente para pagos e imprevistos. Sin sumas heterogéneas.
              </p>
            </div>

            <span className="text-xs text-[#16A34A] bg-[#16A34A]/10 border border-[#16A34A]/20 px-3 py-1 rounded-full self-start sm:self-auto font-bold">
              Arqueos al día
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-2">
            {cashBalances.map((acc) => (
              <div
                key={acc.id}
                className="bg-[#F5F5F7] border border-[#E5E5EA] hover:border-[#D1D1D6] p-4 rounded-xl transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-[#1D1D1F] truncate">
                      {acc.accountName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-[#177E89]/10 text-[#177E89] border-[#177E89]/30">
                      {acc.currency}
                    </span>
                  </div>

                  <div className="text-xl font-bold text-[#1D1D1F] mt-1 break-all">
                    {formatFinanceCurrency(acc.balance, acc.currency)}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[#E5E5EA] text-[11px] text-[#86868B] flex items-center gap-1.5">
                  <IconHourglass size={12} className="shrink-0" />
                  <span className="truncate">{acc.lastReconciliation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
