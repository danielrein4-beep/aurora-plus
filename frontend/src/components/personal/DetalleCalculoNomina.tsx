import React from 'react';
import { ReciboNominaEmpleado, DesgloseCalculoConcepto } from './types';

interface DetalleCalculoNominaProps {
  recibo: ReciboNominaEmpleado;
  ocultarSueldo?: boolean;
}

export const DetalleCalculoNomina: React.FC<DetalleCalculoNominaProps> = ({
  recibo,
  ocultarSueldo = false,
}) => {
  const percepciones = recibo.conceptosDesglosados.filter((c) => c.tipo === 'PERCEPCION');
  const deducciones = recibo.conceptosDesglosados.filter((c) => c.tipo === 'DEDUCCION');

  const renderConceptoRow = (c: DesgloseCalculoConcepto, idx: number) => (
    <div
      key={idx}
      className="p-3 rounded-lg bg-[#0f172a]/70 border border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
    >
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              c.tipo === 'PERCEPCION' ? 'bg-[#35d7c3]' : 'bg-[#f87171]'
            }`}
          />
          <span className="font-medium text-[#f8fafc]">{c.concepto}</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#1e293b] text-[#94a3b8] font-mono">
            {c.vigencia}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-[#94a3b8] pl-4">
          <div>
            <span className="text-[#64748b]">Base: </span>
            <span className="font-mono text-[#cbd5e1]">{c.baseCalculo}</span>
          </div>
          <div>
            <span className="text-[#64748b]">Regla: </span>
            <span className="font-mono text-[#cbd5e1]">{c.reglaAplicada}</span>
          </div>
        </div>
      </div>

      <div className="text-right sm:pl-4 sm:border-l sm:border-[#1e293b] self-end sm:self-center">
        <span className="text-xs text-[#64748b] block sm:hidden">Resultado:</span>
        <span
          className={`font-mono text-base font-semibold ${
            c.tipo === 'PERCEPCION' ? 'text-[#35d7c3]' : 'text-[#f87171]'
          }`}
        >
          {ocultarSueldo
            ? '••••••'
            : `${c.tipo === 'PERCEPCION' ? '+' : '-'}$${c.monto.toFixed(2)} ${c.moneda}`}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Resumen del colaborador */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#131c2e] rounded-lg border border-[#1e2d48]">
        <div>
          <h4 className="font-semibold text-[#f8fafc] text-sm">{recibo.empleadoNombre}</h4>
          <p className="text-xs text-[#94a3b8]">
            {recibo.empleadoCargo} &bull; <span className="text-[#cbd5e1]">{recibo.departamento}</span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <span className="text-[#64748b] block">Días computados</span>
            <span className="font-mono font-medium text-[#f8fafc]">{recibo.diasTrabajados} días</span>
          </div>
          <div className="text-right">
            <span className="text-[#64748b] block">Horas extras</span>
            <span className="font-mono font-medium text-[#f8fafc]">{recibo.horasExtrasTotal} hrs</span>
          </div>
          <div className="text-right pl-3 border-l border-[#1e2d48]">
            <span className="text-[#64748b] block">Neto a liquidar</span>
            <span className="font-mono font-bold text-[#35d7c3] text-sm">
              {ocultarSueldo ? '••••••' : `$${recibo.montoNetoPagar.toFixed(2)} ${recibo.moneda}`}
            </span>
          </div>
        </div>
      </div>

      {/* Asignaciones / Percepciones */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-[#35d7c3]" />
            Percepciones y Asignaciones
          </span>
          <span className="font-mono text-[#35d7c3]">
            {ocultarSueldo ? '••••••' : `+$${recibo.totalPercepciones.toFixed(2)} USD`}
          </span>
        </div>
        <div className="space-y-2">
          {percepciones.map((c, i) => renderConceptoRow(c, i))}
        </div>
      </div>

      {/* Deducciones */}
      {deducciones.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-[#f87171]" />
              Deducciones y Retenciones
            </span>
            <span className="font-mono text-[#f87171]">
              {ocultarSueldo ? '••••••' : `-$${recibo.totalDeducciones.toFixed(2)} USD`}
            </span>
          </div>
          <div className="space-y-2">
            {deducciones.map((c, i) => renderConceptoRow(c, i))}
          </div>
        </div>
      )}

      {/* Totalizador de Auditoría */}
      <div className="p-3 rounded-lg bg-[#0b111e] border border-[#1e293b] flex items-center justify-between text-xs">
        <span className="text-[#64748b]">
          Fórmula de liquidación: <span className="font-mono text-[#94a3b8]">Neto = Total Percepciones - Total Deducciones</span>
        </span>
        <span className="font-mono font-bold text-[#35d7c3] text-sm">
          {ocultarSueldo ? '••••••' : `$${recibo.montoNetoPagar.toFixed(2)} ${recibo.moneda}`}
        </span>
      </div>
    </div>
  );
};
