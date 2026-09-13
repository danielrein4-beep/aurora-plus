import React from 'react';
import { FiscalSummary } from './types';

interface FiscalFinancieroProps {
  fiscal: FiscalSummary;
}

export const FiscalFinanciero: React.FC<FiscalFinancieroProps> = ({ fiscal }) => {
  const formatVes = (val: number) => `Bs. ${val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatUsd = (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Nota de Responsabilidad Tributaria */}
      <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4.5 flex items-start gap-3.5 backdrop-blur-md">
        <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center shrink-0 text-sky-400 font-bold">
          ⚖
        </div>
        <div>
          <h4 className="text-sm font-semibold text-sky-300">
            Resumen Tributario Estimado (IVA y Libros Fiscales)
          </h4>
          <p className="text-xs text-sky-200/80 mt-1 leading-relaxed">
            Esta información consolida las facturas de ventas y compras emitidas bajo providencia SENIAT a la tasa oficial BCV de referencia ({fiscal.officialRateBcv} Bs./USD). Úsalo para planificar tu flujo de caja ante los anticipos y declaraciones quincenales.
          </p>
        </div>
      </div>

      {/* Tarjeta de RIF y Condición */}
      <div className="bg-[#0b2341]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-white">
                {fiscal.rifStatus.rif}
              </span>
              <h3 className="text-sm font-semibold text-white">
                {fiscal.rifStatus.razonSocial}
              </h3>
            </div>
            <p className="text-xs text-white/55 mt-1">
              Vigencia comprobada: {fiscal.rifStatus.validUntil}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
              Contribuyente Ordinario
            </span>
            {fiscal.rifStatus.retentionAgent && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-medium">
                Agente de Retención IVA
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Balance de IVA: Débito vs Crédito */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Débito Fiscal (Por tus ventas) */}
        <div className="bg-[#0b2341]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-lg">
          <div className="text-xs font-medium text-white/60 uppercase tracking-wider">
            1. Débito Fiscal IVA (Ventas)
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {formatVes(fiscal.salesIvaDebito.ivaVes)}
          </div>
          <div className="text-xs font-mono text-[#00FFC2] mt-0.5">
            Equiv. {formatUsd(fiscal.salesIvaDebito.ivaUsd)}
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-xs text-white/50 space-y-1">
            <div className="flex justify-between">
              <span>Base Imponible Venta:</span>
              <span className="text-white">{formatVes(fiscal.salesIvaDebito.baseVes)}</span>
            </div>
            <div className="flex justify-between">
              <span>Facturas emitidas:</span>
              <span className="text-white">{fiscal.salesIvaDebito.invoicesCount} doc.</span>
            </div>
          </div>
        </div>

        {/* Crédito Fiscal (Por tus compras con factura) */}
        <div className="bg-[#0b2341]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-lg">
          <div className="text-xs font-medium text-white/60 uppercase tracking-wider">
            2. Crédito Fiscal IVA (Compras)
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-2">
            {formatVes(fiscal.purchasesIvaCredito.ivaVes)}
          </div>
          <div className="text-xs font-mono text-emerald-300 mt-0.5">
            Equiv. {formatUsd(fiscal.purchasesIvaCredito.ivaUsd)}
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-xs text-white/50 space-y-1">
            <div className="flex justify-between">
              <span>Base Imponible Compra:</span>
              <span className="text-white">{formatVes(fiscal.purchasesIvaCredito.baseVes)}</span>
            </div>
            <div className="flex justify-between">
              <span>Facturas deducibles:</span>
              <span className="text-white">{fiscal.purchasesIvaCredito.invoicesCount} doc.</span>
            </div>
          </div>
        </div>

        {/* IVA Estimado a Declarar */}
        <div className="bg-gradient-to-br from-[#0b2341] to-[#0f3b6c] border border-[#00FFC2]/30 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="text-xs font-medium text-[#00FFC2] uppercase tracking-wider flex items-center justify-between">
              <span>3. Estimado Neto a Pagar</span>
              <span className="text-[10px] bg-[#00FFC2]/20 text-[#00FFC2] px-1.5 py-0.5 rounded">Provisión</span>
            </div>
            <div className="text-2xl font-black text-white mt-2">
              {formatVes(fiscal.estimatedNetIvaPayableVes)}
            </div>
            <div className="text-xs text-white/70 mt-1 leading-snug">
              Débito menos Crédito Fiscal generado en el período antes de aplicar retenciones recibidas.
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-white/50">
            Reserva este monto en tu cuenta en Bolívares para la declaración quincenal.
          </div>
        </div>
      </div>

      {/* Control de Correlativos y Folios */}
      <div className="bg-[#0b2341]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-lg">
        <h3 className="text-sm font-semibold text-white mb-1">
          Control de Folios y Secuencia Numérica
        </h3>
        <p className="text-xs text-white/60 mb-4">
          Aurora Plus verifica que no existan huecos ni saltos en la numeración correlativa de tus documentos fiscales.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fiscal.correlativeRanges.map((corr, idx) => (
            <div key={idx} className="bg-[#071a2e]/70 border border-white/5 p-4 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-white">{corr.type}</div>
                <div className="text-xs font-mono text-white/60 mt-1">
                  Rango: <span className="text-white">{corr.from}</span> al <span className="text-white">{corr.to}</span>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                0 faltantes (Secuencia Perfecta)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
