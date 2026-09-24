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
        className="p-3 rounded-lg bg-[#F5F5F7]/70 border border-[#E5E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
      >
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                c.tipo === 'PERCEPCION' ? 'bg-[#177E89]' : 'bg-[#D92D20]'
              }`}
            />
            <span className="font-medium text-[#1D1D1F]">{c.concepto}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F5F5F7] text-[#86868B]">
              {c.vigencia}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-[#86868B] pl-4">
            <div>
              <span className="text-[#86868B]">Base: </span>
              <span className="text-[#1D1D1F]">{textoBase}</span>
            </div>
            <div>
              <span className="text-[#86868B]">Regla: </span>
              <span className="text-[#1D1D1F]">{c.reglaAplicada}</span>
            </div>
          </div>
        </div>

        <div className="text-right sm:pl-4 sm:border-l sm:border-[#E5E5EA] self-end sm:self-center">
          <span className="text-[10px] text-[#86868B] block sm:hidden">Resultado:</span>
          <span
            className={`text-sm font-semibold ${
              c.tipo === 'PERCEPCION' ? 'text-[#177E89]' : 'text-[#D92D20]'
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
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#FFFFFF] rounded-lg border border-[#E5E5EA]">
        <div>
          <h4 className="font-semibold text-[#1D1D1F] text-xs">{recibo.empleadoNombre}</h4>
          <p className="text-[11px] text-[#86868B]">
            {recibo.empleadoCargo} &bull; <span className="text-[#1D1D1F]">{recibo.departamento}</span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <span className="text-[#86868B] block text-[10px]">Días computados</span>
            <span className="font-medium text-[#1D1D1F]">{recibo.diasTrabajados} días</span>
          </div>
          <div className="text-right">
            <span className="text-[#86868B] block text-[10px]">Horas extras</span>
            <span className="font-medium text-[#1D1D1F]">{recibo.horasExtrasTotal} hrs</span>
          </div>
          <div className="text-right pl-3 border-l border-[#E5E5EA]">
            <span className="text-[#86868B] block text-[10px]">Neto a liquidar</span>
            <span className="font-bold text-[#177E89] text-xs">
              {ocultarSueldo ? '••••••' : formatearMoneda(recibo.montoNetoPagar, recibo.moneda)}
            </span>
          </div>
        </div>
      </div>

      {/* Asignaciones / Percepciones */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-[#177E89]" />
            Percepciones y Asignaciones
          </span>
          <span className="text-[#177E89]">
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
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-[#D92D20]" />
              Deducciones y Retenciones
            </span>
            <span className="text-[#D92D20]">
              {ocultarSueldo ? '••••••' : `-${formatearMoneda(recibo.totalDeducciones, recibo.moneda)}`}
            </span>
          </div>
          <div className="space-y-2">
            {deducciones.map((c, i) => renderConceptoRow(c, i))}
          </div>
        </div>
      )}

      {/* Totalizador de Auditoría */}
      <div className="p-3 rounded-lg bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-between text-xs">
        <span className="text-[#86868B]">
          Fórmula de liquidación: <span className="text-[#86868B]">Neto = Total Percepciones - Total Deducciones</span>
        </span>
        <span className="font-bold text-[#177E89]">
          {ocultarSueldo ? '••••••' : formatearMoneda(recibo.montoNetoPagar, recibo.moneda)}
        </span>
      </div>
    </div>
  );
};
