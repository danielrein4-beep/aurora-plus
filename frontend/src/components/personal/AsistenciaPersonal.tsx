import React, { useState, useEffect, useRef } from 'react';
import { RegistroAsistencia, Empleado, DepartamentoPersonal, MetodoMarcaje } from './types';

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

  const departamentos: (DepartamentoPersonal | 'TODOS')[] = [
    'TODOS',
    'Atención & Salud',
    'Cocina & Restauración',
    'Operaciones & Campo',
    'Administración & Finanzas',
    'Logística & Mantenimiento',
    'Sistemas & Soporte',
  ];

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
        return 'Supervisor';
      case 'PLANILLA_DIGITAL':
        return 'Planilla digital';
      case 'HORARIO_ASIGNADO':
        return 'Horario Asignado';
      default:
        return 'Registro manual';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMensaje && (
        <div className="p-3 bg-[#177E89]/20 border border-[#177E89]/40 rounded-xl text-xs text-[#177E89] font-medium flex items-center justify-between animate-fade-in">
          <span>{toastMensaje}</span>
          <button onClick={() => setToastMensaje(null)} className="text-xs text-[#177E89] hover:underline" aria-label="Cerrar notificación">
            ✕
          </button>
        </div>
      )}

      {/* Barra de Filtros y Acción de Marcaje */}
      <div className="p-4 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="fecha-asistencia" className="text-xs text-[#86868B] font-medium">
              Fecha:
            </label>
            <input
              id="fecha-asistencia"
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg px-3 py-1.5 text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#177E89]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="depto-asistencia" className="text-xs text-[#86868B] font-medium">
              Departamento:
            </label>
            <select
              id="depto-asistencia"
              value={deptoFiltro}
              onChange={(e) => setDeptoFiltro(e.target.value)}
              className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg px-3 py-1.5 text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#177E89]"
            >
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d === 'TODOS' ? 'Todos los Departamentos' : d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {puedeRegistrar && <button
          onClick={() => setModalMarcajeAbierto(true)}
          className="px-3.5 py-2 rounded-full bg-[#177E89] hover:bg-[#136570] text-white font-semibold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        >
          Registrar marcaje
        </button>}
      </div>

      {/* Tabla de Registros de Asistencia */}
      <div className="bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl overflow-hidden">
        <div className="p-4 bg-[#F5F5F7] border-b border-[#E5E5EA] flex items-center justify-between text-xs">
          <span className="font-semibold text-[#1D1D1F]">
            Marcaciones registradas el <span className="text-[#177E89]">{fechaFiltro}</span>
          </span>
          <span className="text-[#86868B]">{filtradas.length} Registros</span>
        </div>

        {filtradas.length === 0 ? (
          <div className="p-8 text-center text-[#86868B] text-xs">
            No se registran asistencias para esta fecha y departamento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F5F7] text-[#86868B] border-b border-[#E5E5EA] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Colaborador</th>
                  <th className="py-3 px-4">Departamento</th>
                  <th className="py-3 px-4">Horario Programado</th>
                  <th className="py-3 px-4">Entrada / Salida Real</th>
                  <th className="py-3 px-4">Horas Computadas</th>
                  <th className="py-3 px-4">Estado / Incidencia</th>
                  <th className="py-3 px-4 text-center">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F7] text-[#1D1D1F]">
                {filtradas.map((ast) => (
                  <tr key={ast.id} className="hover:bg-[#F5F5F7] transition-colors">
                    <td className="py-3 px-4 font-medium text-[#1D1D1F]">
                      {ast.empleadoNombre}
                    </td>
                    <td className="py-3 px-4 text-[#86868B]">{ast.departamento}</td>
                    <td className="py-3 px-4 text-[#1D1D1F]">
                      {ast.horaEntradaProgramada} - {ast.horaSalidaProgramada}
                    </td>
                    <td className="py-3 px-4 text-[#177E89]">
                      {ast.horaEntradaReal || '--:--'} - {ast.horaSalidaReal || '--:--'}
                      {ast.minutosRetardo > 0 && (
                        <span className="block text-[11px] text-[#6E6E73] font-sans">
                          +{ast.minutosRetardo}m retardo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#1D1D1F]">{ast.horasTrabajadas}h</span>
                      {ast.horasExtras > 0 && (
                        <span className="block text-[11px] text-[#177E89]">
                          +{ast.horasExtras}h extra
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          ast.estado === 'PRESENTE'
                            ? 'bg-[#177E89]/15 text-[#177E89]'
                            : ast.estado === 'RETARDO'
                            ? 'bg-[#6E6E73]/15 text-[#6E6E73]'
                            : 'bg-[#177E89]/15 text-[#177E89]'
                        }`}
                      >
                        {ast.estado}
                      </span>
                      {ast.justificacion && (
                        <span className="block text-[11px] text-[#86868B] italic mt-0.5 max-w-[200px] truncate" title={ast.justificacion}>
                          {ast.justificacion}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[#F5F5F7] text-[#86868B] border border-[#E5E5EA]">
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
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-marcaje-titulo"
        >
          <div className="bg-[#FFFFFF] border border-[#E5E5EA] w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 id="modal-marcaje-titulo" className="text-base font-bold text-[#1D1D1F]">
                Marcaje de asistencia
              </h3>
              <button
                ref={btnCerrarModalRef}
                onClick={() => setModalMarcajeAbierto(false)}
                className="text-[#86868B] hover:text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#177E89] rounded p-1"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#86868B] block mb-1">Colaborador:</label>
                <select
                  value={empleadoSeleccionado}
                  onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg p-2 text-[#1D1D1F]"
                >
                  {empleados.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre} {e.apellidos} ({e.departamento})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#86868B] block mb-1">Tipo de Marcación:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoMarcaje('ENTRADA')}
                    className={`py-2 rounded-lg font-medium border text-center transition-colors ${
                      tipoMarcaje === 'ENTRADA'
                        ? 'bg-[#177E89]/20 border-[#177E89] text-[#177E89]'
                        : 'bg-[#F5F5F7] border-[#E5E5EA] text-[#86868B]'
                    }`}
                  >
                    Registrar entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoMarcaje('SALIDA')}
                    className={`py-2 rounded-lg font-medium border text-center transition-colors ${
                      tipoMarcaje === 'SALIDA'
                        ? 'bg-[#D92D20]/20 border-[#D92D20] text-[#D92D20]'
                        : 'bg-[#F5F5F7] border-[#E5E5EA] text-[#86868B]'
                    }`}
                  >
                    Registrar salida
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#86868B] block mb-1">Hora:</label>
                  <input
                    type="time"
                    value={horaMarcaje}
                    onChange={(e) => setHoraMarcaje(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg p-2 text-[#1D1D1F]"
                  />
                </div>
                <div>
                  <label className="text-[#86868B] block mb-1">Método:</label>
                  <select
                    value={metodoSeleccionado}
                    onChange={(e) => setMetodoSeleccionado(e.target.value as MetodoMarcaje)}
                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg p-2 text-[#1D1D1F]"
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
                className="px-4 py-2 rounded-lg bg-[#F5F5F7] text-xs text-[#1D1D1F] hover:bg-[#E5E5EA]"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarMarcaje}
                disabled={guardando}
                className="px-4 py-2 rounded-full bg-[#177E89] hover:bg-[#136570] text-white font-semibold text-xs"
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
