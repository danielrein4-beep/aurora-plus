import React, { useState, useEffect, useRef } from 'react';
import { Empleado, RegistroAsistencia, MetaPersonal, ReciboNominaEmpleado, formatearMoneda } from './types';
import { DetalleCalculoNomina } from './DetalleCalculoNomina';

interface PerfilEmpleadoProps {
  empleado: Empleado;
  asistencias: RegistroAsistencia[];
  metas: MetaPersonal[];
  recibosHistoricos: ReciboNominaEmpleado[];
  onCerrar: () => void;
  ocultarSueldo: boolean;
}

export const PerfilEmpleado: React.FC<PerfilEmpleadoProps> = ({
  empleado,
  asistencias,
  metas,
  recibosHistoricos,
  onCerrar,
  ocultarSueldo,
}) => {
  const [pestanaActiva, setPestanaActiva] = useState<'info' | 'asistencia' | 'metas' | 'recibos'>('info');
  const btnCerrarRef = useRef<HTMLButtonElement | null>(null);
  const elementoPrevioRef = useRef<HTMLElement | null>(null);

  // Accesibilidad: Guardar foco anterior, enfocar botón de cierre al montar y restaurar foco al desmontar
  useEffect(() => {
    elementoPrevioRef.current = document.activeElement as HTMLElement | null;
    btnCerrarRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCerrar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      elementoPrevioRef.current?.focus();
    };
  }, [onCerrar]);

  const asistenciasEmpleado = asistencias.filter((a) => a.empleadoId === empleado.id);
  const metasEmpleado = metas.filter(
    (m) =>
      m.empleadoAsignadoId === empleado.id ||
      m.departamentoObjetivo === empleado.departamento ||
      m.departamentoObjetivo === 'TODOS'
  );
  const recibosEmpleado = recibosHistoricos.filter((r) => r.empleadoId === empleado.id);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perfil-titulo"
    >
      <div className="bg-slate-50 border border-slate-200 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
        {/* Cabecera del Perfil */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-[#177E89]/30 flex items-center justify-center font-mono font-bold text-lg text-[#177E89]">
              {empleado.nombre[0]}
              {empleado.apellidos[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="perfil-titulo" className="text-base sm:text-lg font-bold text-slate-900">
                  {empleado.nombre} {empleado.apellidos}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-[#177E89]/15 text-[#177E89] font-mono">
                  {empleado.codigoEmpleado}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {empleado.cargo} &bull; <span className="text-slate-700">{empleado.departamento}</span>
              </p>
            </div>
          </div>

          <button
            ref={btnCerrarRef}
            onClick={onCerrar}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#177E89]"
            aria-label="Cerrar ficha de colaborador"
          >
            ✕
          </button>
        </div>

        {/* Pestañas de Navegación Interna */}
        <div className="flex border-b border-slate-200 bg-white px-4 overflow-x-auto text-xs font-medium text-slate-500">
          <button
            onClick={() => setPestanaActiva('info')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              pestanaActiva === 'info'
                ? 'border-[#177E89] text-[#177E89] font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Información & Contrato
          </button>
          <button
            onClick={() => setPestanaActiva('asistencia')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              pestanaActiva === 'asistencia'
                ? 'border-[#177E89] text-[#177E89] font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            ⏱️ Asistencia ({asistenciasEmpleado.length})
          </button>
          <button
            onClick={() => setPestanaActiva('metas')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              pestanaActiva === 'metas'
                ? 'border-[#177E89] text-[#177E89] font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Metas ({metasEmpleado.length})
          </button>
          <button
            onClick={() => setPestanaActiva('recibos')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              pestanaActiva === 'recibos'
                ? 'border-[#177E89] text-[#177E89] font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Recibos de Nómina ({recibosEmpleado.length})
          </button>
        </div>

        {/* Contenido de la Ficha */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {pestanaActiva === 'info' && (
            <div className="space-y-6">
              {/* Información Personal */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
                  Datos de Contacto e Identificación
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs text-slate-500 block">Documento de Identidad</span>
                    <span className="font-mono text-slate-700 font-medium">{empleado.identificacion}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Correo Electrónico</span>
                    <span className="text-slate-700">{empleado.email}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Teléfono de Contacto</span>
                    <span className="font-mono text-slate-700">{empleado.telefono}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Fecha de Ingreso</span>
                    <span className="font-mono text-slate-700">{empleado.fechaIngreso}</span>
                  </div>
                </div>
              </div>

              {/* Condiciones Laborales y Salario */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
                  Condiciones laborales y remuneración
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs text-slate-500 block">Tipo de Contrato</span>
                    <span className="text-slate-700 font-medium">{empleado.tipoContrato.replace(/_/g, ' ')}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Modalidad de Pago</span>
                    <span className="text-slate-700">{empleado.modalidadPago}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Turno Habitual</span>
                    <span className="text-sky-600 font-medium">{empleado.turnoAsignado}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Sueldo pactado</span>
                    <span className="font-mono text-[#177E89] font-bold text-sm sm:text-base">
                      {ocultarSueldo
                        ? '••••••'
                        : `${formatearMoneda(empleado.salarioBaseReferencial, empleado.moneda)} / mes`}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Entidad bancaria</span>
                    <span className="text-slate-700">{ocultarSueldo ? '••••••' : (empleado.bancoReferencial || 'No configurado')}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Cuenta / Referencia</span>
                    <span className="font-mono text-slate-700">{ocultarSueldo ? '••••••' : (empleado.cuentaReferencial || '••••')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {pestanaActiva === 'asistencia' && (
            <div className="space-y-3">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500">
                Historial reciente de marcaciones
              </h4>
              {asistenciasEmpleado.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  No hay registros de marcaje recientes para este colaborador.
                </div>
              ) : (
                <div className="space-y-2">
                  {asistenciasEmpleado.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-700 font-semibold">{a.fecha}</span>
                          <span className="px-2 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-[#177E89]">
                            {a.estado}
                          </span>
                        </div>
                        <p className="text-slate-500">
                          Programado: {a.horaEntradaProgramada} - {a.horaSalidaProgramada} | Real: {a.horaEntradaReal || '--'} - {a.horaSalidaReal || '--'}
                        </p>
                        {a.justificacion && (
                          <p className="text-amber-600 text-[11px] italic">Nota: {a.justificacion}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-[#177E89] font-medium">
                          {a.horasTrabajadas}h laboradas
                        </span>
                        {a.horasExtras > 0 && (
                          <span className="block text-[11px] text-sky-600 font-mono">
                            +{a.horasExtras}h extras
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {pestanaActiva === 'metas' && (
            <div className="space-y-3">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500">
                Metas y Rendimiento No Punitivo
              </h4>
              {metasEmpleado.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  No hay metas asignadas a este colaborador en el ciclo actual.
                </div>
              ) : (
                <div className="space-y-3">
                  {metasEmpleado.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">{m.titulo}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                                m.tipo === 'AUTOMATICA'
                                  ? 'bg-[#38bdf8]/15 text-sky-600 border border-[#38bdf8]/30'
                                  : 'bg-slate-100 text-slate-700 border border-slate-300'
                              }`}
                            >
                              [{m.tipo}]
                            </span>
                          </div>
                          <p className="text-slate-500 text-xs mt-0.5">{m.descripcion}</p>
                        </div>
                        <span className="font-mono text-[#177E89] font-bold">
                          {m.progresoActual == null ? 'Sin seguimiento' : `${m.progresoActual} / ${m.metaValor} ${m.unidadMedida}`}
                        </span>
                      </div>

                      <div className="w-full bg-white h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#177E89] h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${m.progresoActual == null || m.metaValor <= 0 ? 0 : Math.min(100, Math.round((m.progresoActual / m.metaValor) * 100))}%`,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Métrica: {m.origenMetrica}</span>
                        <span className="text-[#177E89]">Regla no punitiva garantizada</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {pestanaActiva === 'recibos' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500">
                Recibos de Quincena y Desglose de Fórmulas
              </h4>
              {recibosEmpleado.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  No se registran recibos calculados para este colaborador en el histórico.
                </div>
              ) : (
                <div className="space-y-4">
                  {recibosEmpleado.map((recibo) => (
                    <DetalleCalculoNomina
                      key={recibo.id}
                      recibo={recibo}
                      ocultarSueldo={ocultarSueldo}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onCerrar}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-900 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#177E89]"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
