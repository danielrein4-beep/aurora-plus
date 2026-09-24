import React from 'react';
import { ReciboNominaEmpleado, DesgloseCalculoConcepto, formatearMoneda } from './types';

interface DetalleCalculoNominaProps {
  recibo: ReciboNominaEmpleado;
  ocultarSueldo?: boolean;
}

export const DetalleCalculoNomina: React.FC<DetalleCalculoNominaProps> = ({
  recibo,
  ocultarSueldo = true,
}) => {
  const percepciones = recibo.conceptosDesglosados.filter((c) => c.tipo === 'PERCEPCION');
  const deducciones = recibo.conceptosDesglosados.filter((c) => c.tipo === 'DEDUCCION');

  const renderConceptoRow = (c: DesgloseCalculoConcepto, idx: number) => {
    const textoBase = ocultarSueldo && c.baseCalculoMascara ? c.baseCalculoMascara : c.baseCalculo;
    
    return (
      <div
        key={idx}
        className="p-3 rounded-lg bg-[#0f172a]/70 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
      >
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                c.tipo === 'PERCEPCION' ? 'bg-[#177E89]' : 'bg-[#f87171]'
              }`}
            />
            <span className="font-bold tracking-tight text-slate-900">{c.concepto}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono font-light uppercase tracking-wide">
              {c.vigencia}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-slate-500 pl-4">
            <div>
              <span className="text-slate-500">Base: </span>
              <span className="font-mono text-slate-700">{textoBase}</span>
            </div>
            <div>
              <span className="text-slate-500">Regla: </span>
              <span className="font-mono text-slate-700">{c.reglaAplicada}</span>
            </div>
          </div>
        </div>

        <div className="text-right sm:pl-4 sm:border-l sm:border-[#1e293b] self-end sm:self-center">
          <span className="text-[10px] text-slate-500 block sm:hidden font-light uppercase tracking-wide">Resultado:</span>
          <span
            className={`font-mono text-sm font-bold ${
              c.tipo === 'PERCEPCION' ? 'text-[#177E89]' : 'text-rose-600'
            }`}
          >
            {ocultarSueldo
              ? '••••••'
              : `${c.tipo === 'PERCEPCION' ? '+' : '-'}${formatearMoneda(c.monto, c.moneda)}`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Resumen del colaborador */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div>
          <h4 className="font-bold tracking-tight text-slate-900 text-xs">{recibo.empleadoNombre}</h4>
          <p className="text-[11px] text-slate-500 font-light uppercase tracking-wide">
            {recibo.empleadoCargo} &bull; <span className="text-slate-700">{recibo.departamento}</span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <span className="text-slate-500 block text-[10px] font-light uppercase tracking-wide">Días computados</span>
            <span className="font-mono font-light uppercase tracking-wide text-slate-900">{recibo.diasTrabajados} días</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block text-[10px] font-light uppercase tracking-wide">Horas extras</span>
            <span className="font-mono font-light uppercase tracking-wide text-slate-900">{recibo.horasExtrasTotal} hrs</span>
          </div>
          <div className="text-right pl-3 border-l border-slate-200">
            <span className="text-slate-500 block text-[10px] font-light uppercase tracking-wide">Neto a liquidar</span>
            <span className="font-mono font-bold text-[#177E89] text-xs">
              {ocultarSueldo ? '••••••' : formatearMoneda(recibo.montoNetoPagar, recibo.moneda)}
            </span>
          </div>
        </div>
      </div>

      {/* Asignaciones / Percepciones */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-light uppercase tracking-wider text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-[#177E89]" />
            Percepciones y Asignaciones
          </span>
          <span className="font-mono text-[#177E89]">
            {ocultarSueldo ? '••••••' : `+${formatearMoneda(recibo.totalPercepciones, recibo.moneda)}`}
          </span>
        </div>
        <div className="space-y-2">
          {percepciones.map((c, i) => renderConceptoRow(c, i))}
        </div>
      </div>

      {/* Deducciones */}
      {deducciones.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-[11px] font-light uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-[#f87171]" />
              Deducciones y Retenciones
            </span>
            <span className="font-mono text-rose-600">
              {ocultarSueldo ? '••••••' : `-${formatearMoneda(recibo.totalDeducciones, recibo.moneda)}`}
            </span>
          </div>
          <div className="space-y-2">
            {deducciones.map((c, i) => renderConceptoRow(c, i))}
          </div>
        </div>
      )}

      {/* Totalizador de Auditoría */}
      <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-light uppercase tracking-wide">
          Fórmula de liquidación: <span className="font-mono text-slate-500">Neto = Total Percepciones - Total Deducciones</span>
        </span>
        <span className="font-mono font-bold text-[#177E89]">
          {ocultarSueldo ? '••••••' : formatearMoneda(recibo.montoNetoPagar, recibo.moneda)}
        </span>
      </div>
    </div>
  );
};
