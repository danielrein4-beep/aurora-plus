import { avisar } from "../../avisos";
import React, { useState, useEffect, useRef } from 'react';
import { PeriodoNomina, ReciboNominaEmpleado, formatearMoneda } from './types';
import { EstadoNominaBadge } from './EstadoNominaBadge';
import { DetalleCalculoNomina } from './DetalleCalculoNomina';
import { IconWarning } from '../../Icons';

interface NominaPersonalProps {
  periodos: PeriodoNomina[];
  ocultarSueldo: boolean;
  nominaHabilitada: boolean;
  onToggleNominaHabilitada?: (habilitada: boolean) => void;
  onActualizarPeriodos?: (actualizados: PeriodoNomina[]) => void;
}

export const NominaPersonal: React.FC<NominaPersonalProps> = ({
  periodos: initialPeriodos,
  ocultarSueldo,
  nominaHabilitada,
  onToggleNominaHabilitada,
  onActualizarPeriodos,
}) => {
  const accionesNominaConectadas = false;
  const [periodos, setPeriodos] = useState<PeriodoNomina[]>(initialPeriodos);
  const [periodoActivo, setPeriodoActivo] = useState<PeriodoNomina>(initialPeriodos[0]);
  const [reciboDetalle, setReciboDetalle] = useState<ReciboNominaEmpleado | null>(null);
  const [modalRevisionAbierto, setModalRevisionAbierto] = useState(false);
  const [modalAjusteAbierto, setModalAjusteAbierto] = useState(false);
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);

  // Referencias para gestión real del foco accesible
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const btnCerrarRevisionRef = useRef<HTMLButtonElement | null>(null);
  const btnCerrarAjusteRef = useRef<HTMLButtonElement | null>(null);
  const btnCerrarDesgloseRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setPeriodos(initialPeriodos);
    setPeriodoActivo(initialPeriodos[0]);
  }, [initialPeriodos]);

  // Gestión de foco en apertura y cierre de modales
  useEffect(() => {
    if (modalRevisionAbierto || modalAjusteAbierto || reciboDetalle) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      
      // Enfocar botón de cierre correspondiente
      setTimeout(() => {
        if (modalRevisionAbierto && btnCerrarRevisionRef.current) {
          btnCerrarRevisionRef.current.focus();
        } else if (modalAjusteAbierto && btnCerrarAjusteRef.current) {
          btnCerrarAjusteRef.current.focus();
        } else if (reciboDetalle && btnCerrarDesgloseRef.current) {
          btnCerrarDesgloseRef.current.focus();
        }
      }, 50);
    } else if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
    }
  }, [modalRevisionAbierto, modalAjusteAbierto, reciboDetalle]);

  // Accesibilidad: Cerrar modales con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (reciboDetalle) setReciboDetalle(null);
        if (modalRevisionAbierto) setModalRevisionAbierto(false);
        if (modalAjusteAbierto) setModalAjusteAbierto(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reciboDetalle, modalRevisionAbierto, modalAjusteAbierto]);

  const mostrarNotificacion = (msg: string) => {
    setToastMensaje(msg);
    setTimeout(() => setToastMensaje(null), 4000);
  };

  const handleAprobarPeriodo = () => {
    if (!nominaHabilitada) {
      mostrarNotificacion('Debe habilitar el módulo de nómina para ejecutar aprobaciones.');
      return;
    }

    const actualizado: PeriodoNomina = {
      ...periodoActivo,
      estado: 'APROBADA',
      aprobadoPor: 'Dirección General & Finanzas [DEMO]',
      fechaAprobacion: new Date().toLocaleString(),
      historialAjustes: [
        {
          id: `AJU-${Date.now()}`,
          fecha: new Date().toLocaleString(),
          tipoAccion: 'APROBACION_INICIAL',
          autor: 'Usuario Administrativo [DEMO]',
          motivoJustificado: 'Aprobación definitiva del período tras revisión previa de auditoría.',
        },
        ...periodoActivo.historialAjustes,
      ],
    };

    const nuevaLista = periodos.map((p) => (p.id === actualizado.id ? actualizado : p));
    setPeriodos(nuevaLista);
    setPeriodoActivo(actualizado);
    if (onActualizarPeriodos) {
      onActualizarPeriodos(nuevaLista);
    }
    setModalRevisionAbierto(false);
    mostrarNotificacion(`Período ${actualizado.codigoPeriodo} aprobado exitosamente. Estado inmutable activado.`);
  };

  const handleRegistrarAjuste = (tipo: 'AJUSTE_POSTERIOR' | 'REVERSO_TOTAL') => {
    if (!nominaHabilitada) {
      mostrarNotificacion('El módulo de nómina está desactivado.');
      return;
    }

    if (!motivoAjuste.trim()) {
      avisar('Debe indicar una justificación de auditoría válida.');
      return;
    }

    const nuevoEstado = tipo === 'REVERSO_TOTAL' ? 'REVERSADA' : 'AJUSTADA';
    const actualizado: PeriodoNomina = {
      ...periodoActivo,
      estado: nuevoEstado,
      historialAjustes: [
        {
          id: `AJU-${Date.now()}`,
          fecha: new Date().toLocaleString(),
          tipoAccion: tipo,
          autor: 'Auditor Financiero [DEMO]',
          motivoJustificado: motivoAjuste,
        },
        ...periodoActivo.historialAjustes,
      ],
    };

    const nuevaLista = periodos.map((p) => (p.id === actualizado.id ? actualizado : p));
    setPeriodos(nuevaLista);
    setPeriodoActivo(actualizado);
    if (onActualizarPeriodos) {
      onActualizarPeriodos(nuevaLista);
    }
    setModalAjusteAbierto(false);
    setMotivoAjuste('');
    mostrarNotificacion(`Acción de ${tipo === 'REVERSO_TOTAL' ? 'reverso' : 'ajuste'} registrada con respaldo de auditoría.`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMensaje && (
        <div className="p-3 bg-[#10b981]/20 border border-[#10b981]/40 rounded-xl text-xs text-emerald-600 font-light uppercase tracking-wide flex items-center justify-between animate-fade-in">
          <span>{toastMensaje}</span>
          <button onClick={() => setToastMensaje(null)} className="text-xs text-emerald-600 hover:underline" aria-label="Cerrar notificación">
            ✕
          </button>
        </div>
      )}

      {/* Banner Prominente: Módulo Opcional y Desactivado por Defecto */}
      <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#f59e0b]/15 text-amber-600 font-mono text-[11px] font-bold border border-[#f59e0b]/30">
                MÓDULO OPCIONAL
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-mono text-[11px]">
                {nominaHabilitada ? 'ACTIVO' : 'DESACTIVADO'}
              </span>
            </div>
            <h3 className="text-base font-bold tracking-tight text-slate-900">
              Aurora Nómina: Liquidación Referencial & Control Interno
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-light uppercase tracking-wide">Estado del módulo:</span>
            <span className="px-3 py-1.5 rounded-lg text-xs font-light uppercase tracking-wide bg-slate-100 text-slate-700 border border-slate-300">
              Se administra desde la configuración del negocio
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-200 pt-2 font-light uppercase tracking-wide">
          <strong className="text-slate-700">Aviso de Cumplimiento:</strong> Este módulo es un sistema de cálculo interno referencial y control gerencial de percepciones y deducciones. No sustituye ni simula sistemas tributarios oficiales ni ejecuta pasarelas directas con entidades gubernamentales.
        </p>
      </div>

      {/* Alerta si el módulo está desactivado */}
      {!nominaHabilitada && (
        <div className="p-4 bg-white border border-[#f59e0b]/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-600">
          <div className="flex items-center gap-2">
            <IconWarning size={14} />
            <span>
              <strong>Módulo desactivado:</strong> Solicita su activación al administrador del negocio para comenzar a calcular períodos.
            </span>
          </div>
        </div>
      )}

      {/* Selector de Períodos y Resumen Financiero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Períodos */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">
              Períodos de Nómina
            </h4>
            <span className="font-mono text-xs text-[#177E89] font-light uppercase tracking-wide">{periodos.length} Ciclos</span>
          </div>

          <div className="space-y-2">
            {periodos.map((p) => {
              const esSeleccionado = p.id === periodoActivo.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setPeriodoActivo(p)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    esSeleccionado
                      ? 'bg-[#1a2438] border-[#177E89] text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-[#177E89]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-[#177E89]">
                      {p.codigoPeriodo}
                    </span>
                    <EstadoNominaBadge estado={p.estado} />
                  </div>
                  <h5 className="font-bold tracking-tight text-xs text-slate-900">{p.nombre}</h5>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-mono font-light uppercase tracking-wide">
                    <span>{p.totalEmpleados} colaboradores</span>
                    <span className="text-[#177E89] font-bold">
                      {ocultarSueldo ? '••••••' : formatearMoneda(p.montoTotalNeto, p.monedaPrincipal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel del Período Seleccionado */}
        <div className="lg:col-span-2 p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold tracking-tight text-base text-slate-900">{periodoActivo.nombre}</h4>
                <EstadoNominaBadge estado={periodoActivo.estado} />
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5 font-light uppercase tracking-wide">
                Vigencia: {periodoActivo.fechaInicio} al {periodoActivo.fechaFin} | Pago estimado: {periodoActivo.fechaTentativaPago}
              </p>
            </div>

            {/* Controles de Estado de Nómina */}
            {accionesNominaConectadas && <div className="flex items-center gap-2">
              {periodoActivo.estado === 'BORRADOR' || periodoActivo.estado === 'EN_REVISION' ? (
                <button
                  disabled={!nominaHabilitada}
                  onClick={() => setModalRevisionAbierto(true)}
                  className={`px-3.5 py-2 rounded-lg font-light uppercase tracking-wide text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-white ${
                    nominaHabilitada
                      ? 'bg-[#177E89] hover:bg-[#28b8a6] text-black cursor-pointer'
                      : 'bg-slate-100 text-slate-500 border border-slate-300 cursor-not-allowed opacity-60'
                  }`}
                  title={!nominaHabilitada ? 'Habilite el módulo de nómina para autorizar revisiones' : ''}
                >
                  Revisar y aprobar período
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-600 font-mono font-light uppercase tracking-wide bg-[#10b981]/15 px-2 py-1 rounded border border-[#10b981]/30">
                    Nómina bloqueada
                  </span>
                  <button
                    disabled={!nominaHabilitada}
                    onClick={() => setModalAjusteAbierto(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-light uppercase tracking-wide border ${
                      nominaHabilitada
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 cursor-pointer'
                        : 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed opacity-60'
                    }`}
                  >
                    Ajustar / Reversar
                  </button>
                </div>
              )}
            </div>}
          </div>

          {/* Totales de Liquidación */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block font-light uppercase tracking-wide">Total Percepciones Brutas</span>
              <span className="font-mono text-sm sm:text-base font-bold text-slate-900">
                {ocultarSueldo ? '••••••' : formatearMoneda(periodoActivo.montoTotalBruto, periodoActivo.monedaPrincipal)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block font-light uppercase tracking-wide">Total Deducciones</span>
              <span className="font-mono text-sm sm:text-base font-bold text-rose-600">
                {ocultarSueldo ? '••••••' : `-${formatearMoneda(periodoActivo.montoTotalDeducciones, periodoActivo.monedaPrincipal)}`}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block font-light uppercase tracking-wide">Monto Neto a Desembolsar</span>
              <span className="font-mono text-sm sm:text-base font-bold text-[#177E89]">
                {ocultarSueldo ? '••••••' : formatearMoneda(periodoActivo.montoTotalNeto, periodoActivo.monedaPrincipal)}
              </span>
            </div>
          </div>

          {/* Recibos Desglosados por Empleado */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Recibos de Pago Individuales ({periodoActivo.recibos.length})
              </h5>
              <span className="text-xs text-slate-500 font-light uppercase tracking-wide">Clic para inspeccionar fórmula</span>
            </div>

            <div className="space-y-2">
              {periodoActivo.recibos.map((recibo) => (
                <div
                  key={recibo.id}
                  onClick={() => setReciboDetalle(recibo)}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs cursor-pointer hover:border-[#177E89]/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold tracking-tight text-slate-900 text-sm">{recibo.empleadoNombre}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-light uppercase tracking-wide">
                        {recibo.departamento}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs font-light uppercase tracking-wide">{recibo.empleadoCargo}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-mono font-bold text-[#177E89] text-sm block">
                        {ocultarSueldo ? '••••••' : formatearMoneda(recibo.montoNetoPagar, recibo.moneda)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-light uppercase tracking-wide">
                        {recibo.conceptosDesglosados.length} conceptos
                      </span>
                    </div>
                    <span className="text-[#177E89] font-mono font-light uppercase tracking-wide">Ver</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historial de Auditoría / Ajustes */}
          {periodoActivo.historialAjustes.length > 0 && (
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
              <h5 className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                Bitácora de Auditoría del Período
              </h5>
              <div className="divide-y divide-slate-200">
                {periodoActivo.historialAjustes.map((h) => (
                  <div key={h.id} className="py-2 space-y-0.5">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#177E89] font-light uppercase tracking-wide">{h.tipoAccion}</span>
                      <span className="text-slate-500">{h.fecha}</span>
                    </div>
                    <p className="text-slate-700 font-light uppercase tracking-wide">{h.motivoJustificado}</p>
                    <span className="text-[10px] text-slate-500 font-light uppercase tracking-wide">Registrado por: {h.autor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalle de Fórmulas y Cálculos de un Recibo */}
      {reciboDetalle && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-desglose-recibo-titulo"
        >
          <div className="bg-slate-50 border border-slate-200 w-full max-w-2xl rounded-2xl p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 id="modal-desglose-recibo-titulo" className="text-base font-bold tracking-tight text-slate-900">
                  Inspección analítica de recibo
                </h3>
                <p className="text-xs text-slate-500 font-light uppercase tracking-wide">Desglose de bases de cálculo y reglas aplicadas</p>
              </div>
              <button
                ref={btnCerrarDesgloseRef}
                onClick={() => setReciboDetalle(null)}
                className="text-slate-500 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#177E89] rounded p-1"
                aria-label="Cerrar desglose"
              >
                ✕
              </button>
            </div>

            <DetalleCalculoNomina recibo={reciboDetalle} ocultarSueldo={ocultarSueldo} />

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setReciboDetalle(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-light uppercase tracking-wide text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#177E89]"
              >
                Cerrar Desglose
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pre-Revisión antes de Aprobación */}
      {accionesNominaConectadas && modalRevisionAbierto && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-revision-nomina-titulo"
        >
          <div className="bg-slate-50 border border-slate-200 w-full max-w-xl rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 id="modal-revision-nomina-titulo" className="text-base font-bold tracking-tight text-slate-900">
                  Pantalla de Revisión Previa de Nómina
                </h3>
                <span className="text-xs text-amber-600 font-light uppercase tracking-wide">
                  Validación obligatoria antes de congelar período
                </span>
              </div>
              <button
                ref={btnCerrarRevisionRef}
                onClick={() => setModalRevisionAbierto(false)}
                className="text-slate-500 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#177E89] rounded p-1"
                aria-label="Cerrar revisión"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p className="leading-relaxed font-light uppercase tracking-wide">
                Está a punto de aprobar el período{' '}
                <strong className="text-slate-900">{periodoActivo.nombre}</strong>. Una vez aprobado, el período pasará a estado inmutable y no admitirá modificaciones directas.
              </p>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-light uppercase tracking-wide">Colaboradores a liquidar:</span>
                  <span className="text-slate-900 font-bold">{periodoActivo.recibos.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-light uppercase tracking-wide">Total Bruto:</span>
                  <span className="text-slate-900">
                    {ocultarSueldo ? '••••••' : formatearMoneda(periodoActivo.montoTotalBruto, periodoActivo.monedaPrincipal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-light uppercase tracking-wide">Total Deducciones:</span>
                  <span className="text-rose-600">
                    {ocultarSueldo ? '••••••' : `-${formatearMoneda(periodoActivo.montoTotalDeducciones, periodoActivo.monedaPrincipal)}`}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                  <span className="text-[#177E89] font-bold">Total Neto a Pagar:</span>
                  <span className="text-[#177E89] font-bold">
                    {ocultarSueldo ? '••••••' : formatearMoneda(periodoActivo.montoTotalNeto, periodoActivo.monedaPrincipal)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/25 rounded-lg text-amber-600 text-[11px] inline-flex items-center gap-1.5">
                <IconWarning size={12} /> Recordatorio: Los cambios posteriores deberán realizarse exclusivamente mediante notas de ajuste o reverso justificado.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setModalRevisionAbierto(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-xs font-light uppercase tracking-wide text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-[#177E89]"
              >
                Cancelar
              </button>
              <button
                onClick={handleAprobarPeriodo}
                className="px-4 py-2 rounded-lg bg-[#177E89] hover:bg-[#28b8a6] text-black font-light uppercase tracking-wide text-xs focus:outline-none focus:ring-2 focus:ring-[#177E89]"
              >
                Confirmar y Congelar Nómina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registro de Ajuste o Reverso */}
      {accionesNominaConectadas && modalAjusteAbierto && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-ajuste-reverso-titulo"
        >
          <div className="bg-slate-50 border border-slate-200 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 id="modal-ajuste-reverso-titulo" className="text-base font-bold tracking-tight text-slate-900">
                Ajuste / Reverso de Período [DEMO]
              </h3>
              <button
                ref={btnCerrarAjusteRef}
                onClick={() => setModalAjusteAbierto(false)}
                className="text-slate-500 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#177E89] rounded p-1"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500 font-light uppercase tracking-wide">
                Indique el motivo justificado que quedará asentado en la bitácora inmutable de auditoría:
              </p>

              <div>
                <label className="text-slate-500 block mb-1 font-light uppercase tracking-wide">Motivo de la Corrección:</label>
                <textarea
                  rows={3}
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                  placeholder="Ej. Corrección por reporte tardío de jornada extraordinaria..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#177E89]"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => handleRegistrarAjuste('AJUSTE_POSTERIOR')}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[#177E89] font-light uppercase tracking-wide text-xs focus:outline-none focus:ring-2 focus:ring-[#177E89]"
              >
                Registrar Nota de Ajuste
              </button>
              <button
                onClick={() => handleRegistrarAjuste('REVERSO_TOTAL')}
                className="px-3.5 py-2 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] text-white font-light uppercase tracking-wide text-xs focus:outline-none focus:ring-2 focus:ring-[#177E89]"
              >
                Reversar Período Completo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
