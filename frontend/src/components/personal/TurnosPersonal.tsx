import React, { useState, useEffect, useRef } from 'react';
import { TurnoHorario, AsignacionTurno, Empleado, DepartamentoPersonal } from './types';
import { useVocabularioPersonal } from './vocabulario';

interface TurnosPersonalProps {
  turnosHorarios: TurnoHorario[];
  asignaciones: AsignacionTurno[];
  empleados: Empleado[];
  onAgregarAsignacion?: (nueva: AsignacionTurno) => Promise<AsignacionTurno>;
}

export const TurnosPersonal: React.FC<TurnosPersonalProps> = ({
  turnosHorarios,
  asignaciones: initialAsignaciones,
  empleados,
  onAgregarAsignacion,
}) => {
  const v = useVocabularioPersonal();
  const [asignaciones, setAsignaciones] = useState<AsignacionTurno[]>(initialAsignaciones);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => new Date().toISOString().slice(0, 10));
  const [deptoFiltro, setDeptoFiltro] = useState<string>('TODOS');
  const [modalAsignarAbierto, setModalAsignarAbierto] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<string>(empleados[0]?.id || '');
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<string>(turnosHorarios[0]?.id || '');
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const btnCerrarModalRef = useRef<HTMLButtonElement | null>(null);
  const elementoPrevioRef = useRef<HTMLElement | null>(null);

  // Sincronizar props iniciales si cambian
  useEffect(() => {
    setAsignaciones(initialAsignaciones);
  }, [initialAsignaciones]);

  useEffect(() => {
    if (!empleadoSeleccionado && empleados[0]) setEmpleadoSeleccionado(empleados[0].id);
  }, [empleados, empleadoSeleccionado]);

  // Accesibilidad: Guardar foco, capturar y restaurar foco, y cerrar modal con Escape
  useEffect(() => {
    if (modalAsignarAbierto) {
      elementoPrevioRef.current = document.activeElement as HTMLElement | null;
      btnCerrarModalRef.current?.focus();
    } else if (elementoPrevioRef.current) {
      elementoPrevioRef.current.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalAsignarAbierto) {
        setModalAsignarAbierto(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalAsignarAbierto]);

  const mostrarNotificacion = (msg: string) => {
    setToastMensaje(msg);
    setTimeout(() => setToastMensaje(null), 3500);
  };

  const handleCrearAsignacion = async () => {
    const emp = empleados.find((e) => e.id === empleadoSeleccionado);
    const trn = turnosHorarios.find((t) => t.id === turnoSeleccionado);

    if (!emp || !trn) return;

    const nueva: AsignacionTurno = {
      id: `ASG-${Date.now()}`,
      empleadoId: emp.id,
      empleadoNombre: `${emp.nombre} ${emp.apellidos}`,
      empleadoCargo: emp.cargo,
      departamento: emp.departamento,
      fecha: fechaSeleccionada,
      turnoId: trn.id,
      turnoNombre: `${trn.nombre} (${trn.horaInicio} - ${trn.horaFin})`,
      tipoTurno: trn.tipo,
      estado: 'PROGRAMADO',
    };

    if (!onAgregarAsignacion) return;
    setGuardando(true);
    try {
      const guardada = await onAgregarAsignacion(nueva);
      setAsignaciones([guardada, ...asignaciones]);
      setModalAsignarAbierto(false);
      mostrarNotificacion(`Turno programado para ${emp.nombre}`);
    } catch (error) {
      mostrarNotificacion(error instanceof Error ? error.message : 'No se pudo programar el turno');
    } finally {
      setGuardando(false);
    }
  };

  const asignacionesFiltradas = asignaciones.filter((a) => {
    const coincideFecha = a.fecha === fechaSeleccionada;
    const coincideDepto = deptoFiltro === 'TODOS' || a.departamento === deptoFiltro;
    return coincideFecha && coincideDepto;
  });

  const departamentos: (DepartamentoPersonal | 'TODOS')[] = ['TODOS', ...v.areas];

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

      {/* Catálogo de Tipos de Turno */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-500">
              Catálogo de Turnos y Jornadas Operativas
            </h3>
            <p className="text-xs font-normal text-slate-500">Esquemas horarios adaptados a salud, gastronomía y campo</p>
          </div>
          <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded bg-slate-50 text-[#177E89] border border-slate-200">
            PLANTILLAS
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {turnosHorarios.map((th) => (
            <div
              key={th.id}
              className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold tracking-tight text-slate-900">{th.nombre}</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white text-[#177E89] font-normal">
                  {th.horasJornada > 0 ? `${th.horasJornada}h` : 'Descanso'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 font-mono text-[11px] font-normal">
                <span>Horario: {th.horaInicio} - {th.horaFin}</span>
                <span className="text-slate-500">ID: {th.id}</span>
              </div>
              {th.descripcion && <p className="text-slate-500 text-[11px] font-normal">{th.descripcion}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Barra de Filtros de Cronograma */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="fecha-turnos" className="text-xs text-slate-500 font-normal">
              Fecha:
            </label>
            <input
              id="fecha-turnos"
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#177E89]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="depto-turnos" className="text-xs text-slate-500 font-normal">
              Área:
            </label>
            <select
              id="depto-turnos"
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

        <button
          onClick={() => setModalAsignarAbierto(true)}
          className="px-3.5 py-2 rounded-lg bg-[#177E89] hover:bg-[#28b8a6] text-black font-normal text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#177E89]"
        >
          + Asignar turno
        </button>
      </div>

      {/* Matriz de Asignaciones del Día */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold tracking-tight text-slate-900">
            Turnos Programados para el <span className="font-mono text-[#177E89]">{fechaSeleccionada}</span>
          </span>
          <span className="text-slate-500 font-mono font-normal">{asignacionesFiltradas.length} Asignaciones</span>
        </div>

        {asignacionesFiltradas.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-normal">
            No se registran turnos asignados para esta fecha y área.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {asignacionesFiltradas.map((asg) => (
              <div
                key={asg.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-100 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold tracking-tight text-slate-900 text-sm">{asg.empleadoNombre}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-slate-500 font-mono font-normal">
                      {v.nombreArea(asg.departamento)}
                    </span>
                  </div>
                  <p className="text-xs font-normal text-slate-500">{asg.empleadoCargo}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-left sm:text-right">
                    <span className="font-normal text-sky-600 block">{asg.turnoNombre}</span>
                    <span className="text-[11px] text-slate-500 font-mono font-normal">Estado: {asg.estado}</span>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Asignación Rápida de Turno con Accesibilidad */}
      {modalAsignarAbierto && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-asignar-turno-titulo"
        >
          <div className="bg-slate-50 border border-slate-200 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 id="modal-asignar-turno-titulo" className="text-base font-bold tracking-tight text-slate-900">
                Asignar turno de trabajo
              </h3>
              <button
                ref={btnCerrarModalRef}
                onClick={() => setModalAsignarAbierto(false)}
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
                      {e.nombre} {e.apellidos} ({e.cargo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-normal">Turno a Programar:</label>
                <select
                  value={turnoSeleccionado}
                  onChange={(e) => setTurnoSeleccionado(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900"
                >
                  {turnosHorarios.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} ({t.horaInicio} - {t.horaFin})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-normal">Fecha:</label>
                <input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalAsignarAbierto(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-xs font-normal text-slate-700 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearAsignacion}
                disabled={guardando}
                className="px-4 py-2 rounded-lg bg-[#177E89] hover:bg-[#28b8a6] text-black font-normal text-xs"
              >
                {guardando ? 'Guardando…' : 'Confirmar asignación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
