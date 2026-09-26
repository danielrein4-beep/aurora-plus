import React, { useState, useEffect, useRef } from 'react';
import { RegistroAsistencia, Empleado, DepartamentoPersonal, MetodoMarcaje } from './types';
import { useVocabularioPersonal } from './vocabulario';

interface AsistenciaPersonalProps {
  asistencias: RegistroAsistencia[];
  empleados: Empleado[];
  puedeRegistrar: boolean;
  onRegistrarMarcaje?: (datos: {
    empleadoId: string;
    tipo: 'ENTRADA' | 'SALIDA';
    fecha: string;
    hora: string;
    metodo: MetodoMarcaje;
  }) => Promise<RegistroAsistencia>;
}

export const AsistenciaPersonal: React.FC<AsistenciaPersonalProps> = ({
  asistencias: initialAsistencias,
  empleados,
  puedeRegistrar,
  onRegistrarMarcaje,
}) => {
  const v = useVocabularioPersonal();
  const [asistencias, setAsistencias] = useState<RegistroAsistencia[]>(initialAsistencias);
  const [fechaFiltro, setFechaFiltro] = useState(() => new Date().toISOString().slice(0, 10));
  const [deptoFiltro, setDeptoFiltro] = useState<string>('TODOS');
  const [modalMarcajeAbierto, setModalMarcajeAbierto] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<string>(empleados[0]?.id || '');
  const [tipoMarcaje, setTipoMarcaje] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA');
  const [horaMarcaje, setHoraMarcaje] = useState('07:00');
  const [metodoSeleccionado, setMetodoSeleccionado] = useState<MetodoMarcaje>('PIN_TERMINAL');
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const btnCerrarModalRef = useRef<HTMLButtonElement | null>(null);
  const elementoPrevioRef = useRef<HTMLElement | null>(null);

  // Sincronizar props iniciales
  useEffect(() => {
    setAsistencias(initialAsistencias);
  }, [initialAsistencias]);

  useEffect(() => {
    if (!empleadoSeleccionado && empleados[0]) setEmpleadoSeleccionado(empleados[0].id);
  }, [empleados, empleadoSeleccionado]);

  // Accesibilidad: Guardar foco, capturar y restaurar foco, y cerrar modal con Escape
  useEffect(() => {
    if (modalMarcajeAbierto) {
      elementoPrevioRef.current = document.activeElement as HTMLElement | null;
      btnCerrarModalRef.current?.focus();
    } else if (elementoPrevioRef.current) {
      elementoPrevioRef.current.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalMarcajeAbierto) {
        setModalMarcajeAbierto(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalMarcajeAbierto]);

  const mostrarNotificacion = (msg: string) => {
    setToastMensaje(msg);
    setTimeout(() => setToastMensaje(null), 3500);
  };

  const handleRegistrarMarcaje = async () => {
    const emp = empleados.find((e) => e.id === empleadoSeleccionado);
    if (!emp || !onRegistrarMarcaje) return;
    setGuardando(true);
    try {
      const guardada = await onRegistrarMarcaje({
        empleadoId: emp.id, tipo: tipoMarcaje, fecha: fechaFiltro,
        hora: horaMarcaje, metodo: metodoSeleccionado,
      });
      setAsistencias((actuales) => tipoMarcaje === 'SALIDA'
        ? actuales.map((item) => item.id === guardada.id ? guardada : item)
        : [guardada, ...actuales]);
      setModalMarcajeAbierto(false);
      mostrarNotificacion(`Marcaje de ${tipoMarcaje.toLowerCase()} registrado para ${emp.nombre}`);
    } catch (error) {
      mostrarNotificacion(error instanceof Error ? error.message : 'No se pudo registrar el marcaje');
    } finally {
      setGuardando(false);
    }
  };

  const departamentos: (DepartamentoPersonal | 'TODOS')[] = ['TODOS', ...v.areas];

  const filtradas = asistencias.filter((a) => {
    const coincideFecha = a.fecha === fechaFiltro;
    const coincideDepto = deptoFiltro === 'TODOS' || a.departamento === deptoFiltro;
    return coincideFecha && coincideDepto;
  });

  const getMetodoIcon = (metodo: MetodoMarcaje) => {
    switch (metodo) {
      case 'PIN_TERMINAL':
        return 'Terminal PIN';
      case 'REGISTRO_SUPERVISOR':
        return '✍️ Supervisor';
      case 'PLANILLA_DIGITAL':
        return 'Planilla digital';
      case 'HORARIO_ASIGNADO':
        return '⏱️ Horario Asignado';
      default:
        return 'Registro manual';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMensaje && (
        <div className="p-3 bg-[#10b981]/20 border border-[#10b981]/40 rounded-xl text-xs text-emerald-600 font-normal flex items-center justify-between animate-fade-in">
          <span>{toastMensaje}</span>
          <button onClick={() => setToastMensaje(null)} className="text-xs text-emerald-600 hover:underline" aria-label="Cerrar notificación">
            ✕
          </button>
        </div>
      )}

      {/* Barra de Filtros y Acción de Marcaje */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="fecha-asistencia" className="text-xs text-slate-500 font-normal">
              Fecha:
            </label>
            <input
              id="fecha-asistencia"
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#177E89]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="depto-asistencia" className="text-xs text-slate-500 font-normal">
              {v.area}:
            </label>
            <select
              id="depto-asistencia"
              value={deptoFiltro}
              onChange={(e) => setDeptoFiltro(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#177E89]"
            >
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d === 'TODOS' ? v.todasLasAreas : v.nombreArea(d)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {puedeRegistrar && <button
          onClick={() => setModalMarcajeAbierto(true)}
          className="px-3.5 py-2 rounded-lg bg-[#177E89] hover:bg-[#28b8a6] text-black font-normal text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#177E89]"
        >
          ⏱️ Registrar marcaje
        </button>}
      </div>

      {/* Tabla de Registros de Asistencia */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold tracking-tight text-slate-900">
            Marcaciones registradas el <span className="font-mono text-[#177E89]">{fechaFiltro}</span>
          </span>
          <span className="text-slate-500 font-mono font-normal">{filtradas.length} Registros</span>
        </div>

        {filtradas.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-normal">
            No se registran asistencias para esta fecha y {v.area.toLowerCase()}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white text-slate-500 border-b border-slate-200 uppercase tracking-wider font-light">
                <tr>
                  <th className="py-3 px-4">{v.Persona}</th>
                  <th className="py-3 px-4">{v.area}</th>
                  <th className="py-3 px-4">Horario Programado</th>
                  <th className="py-3 px-4">Entrada / Salida Real</th>
                  <th className="py-3 px-4">Horas Computadas</th>
                  <th className="py-3 px-4">Estado / Incidencia</th>
                  <th className="py-3 px-4 text-center">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {filtradas.map((ast) => (
                  <tr key={ast.id} className="hover:bg-slate-100 transition-colors">
                    <td className="py-3 px-4 font-bold tracking-tight text-slate-900">
                      {ast.empleadoNombre}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-normal">{v.nombreArea(ast.departamento)}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {ast.horaEntradaProgramada} - {ast.horaSalidaProgramada}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#177E89]">
                      {ast.horaEntradaReal || '--:--'} - {ast.horaSalidaReal || '--:--'}
                      {ast.minutosRetardo > 0 && (
                        <span className="block text-[11px] text-amber-600 font-sans font-normal">
                          +{ast.minutosRetardo}m retardo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="font-bold text-slate-900">{ast.horasTrabajadas}h</span>
                      {ast.horasExtras > 0 && (
                        <span className="block text-[11px] text-sky-600">
                          +{ast.horasExtras}h extra
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-normal ${
                          ast.estado === 'PRESENTE'
                            ? 'bg-[#10b981]/15 text-emerald-600'
                            : ast.estado === 'RETARDO'
                            ? 'bg-[#fbbf24]/15 text-amber-600'
                            : 'bg-[#38bdf8]/15 text-sky-600'
                        }`}
                      >
                        {ast.estado}
                      </span>
                      {ast.justificacion && (
                        <span className="block text-[11px] text-slate-500 italic mt-0.5 max-w-[200px] truncate font-normal" title={ast.justificacion}>
                          {ast.justificacion}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded bg-white text-slate-500 border border-slate-200">
                        {getMetodoIcon(ast.metodoMarcaje)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Marcaje Manual con Accesibilidad */}
      {modalMarcajeAbierto && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-marcaje-titulo"
        >
          <div className="bg-slate-50 border border-slate-200 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 id="modal-marcaje-titulo" className="text-base font-bold tracking-tight text-slate-900">
                Marcaje de asistencia
              </h3>
              <button
                ref={btnCerrarModalRef}
                onClick={() => setModalMarcajeAbierto(false)}
                className="text-slate-500 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#177E89] rounded p-1"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1 font-normal">{v.Persona}:</label>
                <select
                  value={empleadoSeleccionado}
                  onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900"
                >
                  {empleados.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre} {e.apellidos} ({v.nombreArea(e.departamento)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-normal">Tipo de Marcación:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoMarcaje('ENTRADA')}
                    className={`py-2 rounded-lg font-normal border text-center transition-colors ${
                      tipoMarcaje === 'ENTRADA'
                        ? 'bg-[#177E89]/20 border-[#177E89] text-[#177E89]'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    Registrar entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoMarcaje('SALIDA')}
                    className={`py-2 rounded-lg font-normal border text-center transition-colors ${
                      tipoMarcaje === 'SALIDA'
                        ? 'bg-[#f87171]/20 border-[#f87171] text-rose-600'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    Registrar salida
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-500 block mb-1 font-normal">Hora:</label>
                  <input
                    type="time"
                    value={horaMarcaje}
                    onChange={(e) => setHoraMarcaje(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-normal">Método:</label>
                  <select
                    value={metodoSeleccionado}
                    onChange={(e) => setMetodoSeleccionado(e.target.value as MetodoMarcaje)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900"
                  >
                    <option value="PIN_TERMINAL">Terminal PIN</option>
                    <option value="REGISTRO_SUPERVISOR">Supervisor</option>
                    <option value="PLANILLA_DIGITAL">Planilla Digital</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalMarcajeAbierto(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-xs font-normal text-slate-700 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarMarcaje}
                disabled={guardando}
                className="px-4 py-2 rounded-lg bg-[#177E89] hover:bg-[#28b8a6] text-black font-normal text-xs"
              >
                {guardando ? 'Guardando…' : 'Confirmar registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
