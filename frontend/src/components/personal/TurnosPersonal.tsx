import React, { useState, useEffect } from 'react';
import { TurnoHorario, AsignacionTurno, Empleado, DepartamentoPersonal } from './types';

interface TurnosPersonalProps {
  turnosHorarios: TurnoHorario[];
  asignaciones: AsignacionTurno[];
  empleados: Empleado[];
  onAgregarAsignacion?: (nueva: AsignacionTurno) => void;
}

export const TurnosPersonal: React.FC<TurnosPersonalProps> = ({
  turnosHorarios,
  asignaciones: initialAsignaciones,
  empleados,
  onAgregarAsignacion,
}) => {
  const [asignaciones, setAsignaciones] = useState<AsignacionTurno[]>(initialAsignaciones);
  const [fechaSeleccionada, setFechaSeleccionada] = useState('2026-09-15');
  const [deptoFiltro, setDeptoFiltro] = useState<string>('TODOS');
  const [modalAsignarAbierto, setModalAsignarAbierto] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<string>(empleados[0]?.id || '');
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<string>(turnosHorarios[0]?.id || '');
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);

  // Sincronizar props iniciales si cambian
  useEffect(() => {
    setAsignaciones(initialAsignaciones);
  }, [initialAsignaciones]);

  // Accesibilidad: Cerrar modal con tecla Escape
  useEffect(() => {
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

  const handleCrearAsignacion = () => {
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

    setAsignaciones([nueva, ...asignaciones]);
    if (onAgregarAsignacion) {
      onAgregarAsignacion(nueva);
    }
    setModalAsignarAbierto(false);
    mostrarNotificacion(`Turno programado exitosamente para ${emp.nombre} [DEMO]`);
  };

  const asignacionesFiltradas = asignaciones.filter((a) => {
    const coincideFecha = a.fecha === fechaSeleccionada;
    const coincideDepto = deptoFiltro === 'TODOS' || a.departamento === deptoFiltro;
    return coincideFecha && coincideDepto;
  });

  const departamentos: (DepartamentoPersonal | 'TODOS')[] = [
    'TODOS',
    'Atención & Salud',
    'Cocina & Restauración',
    'Operaciones & Campo',
    'Administración & Finanzas',
    'Logística & Mantenimiento',
    'Sistemas & Soporte',
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMensaje && (
        <div className="p-3 bg-[#10b981]/20 border border-[#10b981]/40 rounded-xl text-xs text-[#34d399] font-medium flex items-center justify-between animate-fade-in">
          <span>{toastMensaje}</span>
          <button onClick={() => setToastMensaje(null)} className="text-xs text-[#34d399] hover:underline" aria-label="Cerrar notificación">
            ✕
          </button>
        </div>
      )}

      {/* Catálogo de Tipos de Turno */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-[#f8fafc] uppercase tracking-wider text-[#94a3b8]">
              Catálogo de Turnos y Jornadas Operativas
            </h3>
            <p className="text-xs text-[#64748b]">Esquemas horarios adaptados a salud, gastronomía y campo</p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#131c2e] text-[#35d7c3] border border-[#1e2d48]">
            [DEMO]
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {turnosHorarios.map((th) => (
            <div
              key={th.id}
              className="p-3.5 bg-[#131c2e] border border-[#1e2d48] rounded-xl space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#f8fafc]">{th.nombre}</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#0b111e] text-[#35d7c3]">
                  {th.horasJornada > 0 ? `${th.horasJornada}h` : 'Descanso'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#94a3b8] font-mono text-[11px]">
                <span>Horario: {th.horaInicio} - {th.horaFin}</span>
                <span className="text-[#64748b]">ID: {th.id}</span>
              </div>
              {th.descripcion && <p className="text-[#64748b] text-[11px]">{th.descripcion}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Barra de Filtros de Cronograma */}
      <div className="p-4 bg-[#131c2e] border border-[#1e2d48] rounded-xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="fecha-turnos" className="text-xs text-[#94a3b8] font-medium">
              Fecha:
            </label>
            <input
              id="fecha-turnos"
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="bg-[#0b111e] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-[#f8fafc] font-mono focus:outline-none focus:ring-2 focus:ring-[#35d7c3]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="depto-turnos" className="text-xs text-[#94a3b8] font-medium">
              Área:
            </label>
            <select
              id="depto-turnos"
              value={deptoFiltro}
              onChange={(e) => setDeptoFiltro(e.target.value)}
              className="bg-[#0b111e] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#35d7c3]"
            >
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d === 'TODOS' ? 'Todas las Áreas' : d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => setModalAsignarAbierto(true)}
          className="px-3.5 py-2 rounded-lg bg-[#35d7c3] hover:bg-[#28b8a6] text-black font-semibold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        >
          + Asignar Turno Manual [DEMO]
        </button>
      </div>

      {/* Matriz de Asignaciones del Día */}
      <div className="bg-[#131c2e] border border-[#1e2d48] rounded-xl overflow-hidden">
        <div className="p-4 bg-[#0f172a] border-b border-[#1e2d48] flex items-center justify-between text-xs">
          <span className="font-semibold text-[#f8fafc]">
            Turnos Programados para el <span className="font-mono text-[#35d7c3]">{fechaSeleccionada}</span>
          </span>
          <span className="text-[#94a3b8] font-mono">{asignacionesFiltradas.length} Asignaciones</span>
        </div>

        {asignacionesFiltradas.length === 0 ? (
          <div className="p-8 text-center text-[#94a3b8] text-xs">
            No se registran turnos asignados para esta fecha y área.
          </div>
        ) : (
          <div className="divide-y divide-[#1e293b]">
            {asignacionesFiltradas.map((asg) => (
              <div
                key={asg.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[#1a2438] transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#f8fafc] text-sm">{asg.empleadoNombre}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0b111e] text-[#94a3b8] font-mono">
                      {asg.departamento}
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8]">{asg.empleadoCargo}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-left sm:text-right">
                    <span className="font-medium text-[#38bdf8] block">{asg.turnoNombre}</span>
                    <span className="text-[11px] text-[#64748b] font-mono">Estado: {asg.estado}</span>
                  </div>

                  <button
                    onClick={() => mostrarNotificacion(`Solicitud de cambio de turno registrada para ${asg.empleadoNombre} [DEMO]`)}
                    className="px-2.5 py-1.5 rounded bg-[#0b111e] border border-[#1e293b] text-xs text-[#cbd5e1] hover:text-[#f8fafc] hover:border-[#35d7c3]/40 transition-colors"
                  >
                    Reasignar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Asignación Rápida de Turno con Accesibilidad */}
      {modalAsignarAbierto && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-asignar-turno-titulo"
        >
          <div className="bg-[#131c2e] border border-[#1e2d48] w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 id="modal-asignar-turno-titulo" className="text-base font-bold text-[#f8fafc]">
                Asignar Turno de Trabajo [DEMO]
              </h3>
              <button
                onClick={() => setModalAsignarAbierto(false)}
                className="text-[#94a3b8] hover:text-[#f8fafc]"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#94a3b8] block mb-1">Colaborador:</label>
                <select
                  value={empleadoSeleccionado}
                  onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
                  className="w-full bg-[#0b111e] border border-[#1e293b] rounded-lg p-2 text-[#f8fafc]"
                >
                  {empleados.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre} {e.apellidos} ({e.cargo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#94a3b8] block mb-1">Turno a Programar:</label>
                <select
                  value={turnoSeleccionado}
                  onChange={(e) => setTurnoSeleccionado(e.target.value)}
                  className="w-full bg-[#0b111e] border border-[#1e293b] rounded-lg p-2 text-[#f8fafc]"
                >
                  {turnosHorarios.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} ({t.horaInicio} - {t.horaFin})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#94a3b8] block mb-1">Fecha:</label>
                <input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  className="w-full bg-[#0b111e] border border-[#1e293b] rounded-lg p-2 text-[#f8fafc] font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalAsignarAbierto(false)}
                className="px-4 py-2 rounded-lg bg-[#1e293b] text-xs text-[#cbd5e1] hover:bg-[#334155]"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearAsignacion}
                className="px-4 py-2 rounded-lg bg-[#35d7c3] hover:bg-[#28b8a6] text-black font-semibold text-xs"
              >
                Confirmar Asignación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
