import React, { useState, useEffect, useRef } from 'react';
import { MetaPersonal, DepartamentoPersonal, TipoMeta, Empleado } from './types';

interface MetasPersonalProps {
  metas: MetaPersonal[];
  empleados: Empleado[];
  puedeGestionar: boolean;
  onCrearMeta?: (datos: {
    empleadoId: string; titulo: string; descripcion: string; valor: number;
    unidad: string; fechaInicio: string; fechaLimite: string;
  }) => Promise<MetaPersonal>;
}

export const MetasPersonal: React.FC<MetasPersonalProps> = ({
  metas: initialMetas,
  empleados,
  puedeGestionar,
  onCrearMeta,
}) => {
  const [metas, setMetas] = useState<MetaPersonal[]>(initialMetas);
  const [tipoFiltro, setTipoFiltro] = useState<'TODAS' | TipoMeta>('TODAS');
  const [deptoFiltro, setDeptoFiltro] = useState<string>('TODOS');
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
  const [nuevoValor, setNuevoValor] = useState(100);
  const [nuevaUnidad, setNuevaUnidad] = useState('%');
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [fechaLimite, setFechaLimite] = useState(() => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Referencias para gestión real del foco
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const btnCerrarModalRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMetas(initialMetas);
  }, [initialMetas]);

  useEffect(() => {
    if (!empleadoSeleccionado && empleados[0]) setEmpleadoSeleccionado(empleados[0].id);
  }, [empleados, empleadoSeleccionado]);

  // Gestión de foco al abrir/cerrar modal
  useEffect(() => {
    if (modalCrearAbierto) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        if (btnCerrarModalRef.current) {
          btnCerrarModalRef.current.focus();
        }
      }, 50);
    } else if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
    }
  }, [modalCrearAbierto]);

  // Accesibilidad: Cerrar modal con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalCrearAbierto) {
        setModalCrearAbierto(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalCrearAbierto]);

  const mostrarNotificacion = (msg: string) => {
    setToastMensaje(msg);
    setTimeout(() => setToastMensaje(null), 3500);
  };

  const handleCrearMeta = async () => {
    if (!nuevoTitulo.trim() || !empleadoSeleccionado || !nuevaUnidad.trim() || nuevoValor <= 0 || fechaInicio > fechaLimite) {
      mostrarNotificacion('Completa empleado, título, objetivo y un período válido');
      return;
    }
    if (!onCrearMeta) return;
    setGuardando(true);
    try {
      const guardada = await onCrearMeta({
        empleadoId: empleadoSeleccionado, titulo: nuevoTitulo.trim(), descripcion: nuevaDescripcion.trim(),
        valor: nuevoValor, unidad: nuevaUnidad.trim(), fechaInicio, fechaLimite,
      });
      setMetas((actuales) => [guardada, ...actuales]);
      setModalCrearAbierto(false);
      setNuevoTitulo('');
      setNuevaDescripcion('');
      mostrarNotificacion('Meta formativa creada correctamente');
    } catch (error) {
      mostrarNotificacion(error instanceof Error ? error.message : 'No se pudo crear la meta');
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

  const filtradas = metas.filter((m) => {
    const coincideTipo = tipoFiltro === 'TODAS' || m.tipo === tipoFiltro;
    const coincideDepto =
      deptoFiltro === 'TODOS' ||
      m.departamentoObjetivo === deptoFiltro ||
      m.departamentoObjetivo === 'TODOS';
    return coincideTipo && coincideDepto;
  });

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

      {/* Declaración de Rendimiento No Punitivo */}
      <div className="p-4 bg-[#131c2e] border border-[#1e2d48] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#35d7c3]" />
            <h3 className="font-bold text-[#f8fafc]">
              Garantía de Rendimiento No Punitivo
            </h3>
            <span className="px-2 py-0.2 rounded bg-[#35d7c3]/15 text-[#35d7c3] font-mono text-[10px]">
              Política Ética Aurora Plus
            </span>
          </div>
          <p className="text-[#94a3b8] leading-relaxed">
            Las metas y métricas del personal son herramientas formativas de excelencia clínica y operativa. Ningún algoritmo ni objetivo incumplido ejecuta sanciones automáticas, reducciones forzosas de honorarios ni despidos.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-[#cbd5e1] bg-[#0b111e] px-3 py-2 rounded-lg border border-[#1e293b] whitespace-nowrap">
          <span>🎯 {metas.filter((m) => m.estado === 'COMPLETADA').length} de {metas.length} Logradas</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 bg-[#131c2e] border border-[#1e2d48] rounded-xl flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="tipo-meta" className="text-xs text-[#94a3b8] font-medium">
              Tipo de Meta:
            </label>
            <select
              id="tipo-meta"
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value as any)}
              className="bg-[#0b111e] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#35d7c3]"
            >
              <option value="TODAS">Todas (Automáticas y Manuales)</option>
              <option value="AUTOMATICA">Solo Automáticas [Sistema ERP]</option>
              <option value="MANUAL">Solo Manuales [Supervisión]</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="depto-meta" className="text-xs text-[#94a3b8] font-medium">
              Departamento:
            </label>
            <select
              id="depto-meta"
              value={deptoFiltro}
              onChange={(e) => setDeptoFiltro(e.target.value)}
              className="bg-[#0b111e] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#35d7c3]"
            >
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d === 'TODOS' ? 'Todos los Departamentos' : d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {puedeGestionar && <button
          onClick={() => setModalCrearAbierto(true)}
          className="px-3.5 py-2 rounded-lg bg-[#35d7c3] hover:bg-[#28b8a6] text-black font-semibold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        >
          + Crear meta formativa
        </button>}
      </div>

      {/* Grid de Metas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtradas.map((meta) => {
          const porcentaje = meta.progresoActual == null || meta.metaValor <= 0
            ? null : Math.min(100, Math.round((meta.progresoActual / meta.metaValor) * 100));
          const esAutomatica = meta.tipo === 'AUTOMATICA';

          return (
            <div
              key={meta.id}
              className="p-5 bg-[#131c2e] border border-[#1e2d48] rounded-xl space-y-4 hover:border-[#35d7c3]/40 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                          esAutomatica
                            ? 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30'
                            : 'bg-[#1e293b] text-[#cbd5e1] border-[#334155]'
                        }`}
                      >
                        {esAutomatica ? '⚡ Automática (ERP)' : '📝 Manual (Supervisión)'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#0b111e] text-[#94a3b8]">
                        {meta.departamentoObjetivo}
                      </span>
                    </div>
                    <h4 className="font-semibold text-[#f8fafc] text-sm mt-1.5">{meta.titulo}</h4>
                  </div>

                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      meta.estado === 'COMPLETADA'
                        ? 'bg-[#10b981]/15 text-[#34d399]'
                        : 'bg-[#fbbf24]/15 text-[#fbbf24]'
                    }`}
                  >
                    {meta.estado === 'COMPLETADA' ? 'Cumplida' : 'En progreso'}
                  </span>
                </div>

                <p className="text-xs text-[#94a3b8] leading-relaxed">{meta.descripcion}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#1e293b]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#64748b]">Progreso computado:</span>
                  <span className="font-mono font-bold text-[#35d7c3]">
                    {meta.progresoActual == null
                      ? `Sin seguimiento · objetivo ${meta.metaValor} ${meta.unidadMedida}`
                      : `${meta.progresoActual} / ${meta.metaValor} ${meta.unidadMedida} (${porcentaje}%)`}
                  </span>
                </div>

                <div className="w-full bg-[#0b111e] h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      meta.estado === 'COMPLETADA' ? 'bg-[#35d7c3]' : 'bg-[#38bdf8]'
                    }`}
                    style={{ width: `${porcentaje ?? 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#64748b] pt-1">
                  <span>Fuente: {meta.origenMetrica}</span>
                  <span className="font-mono">Límite: {meta.fechaLimite}</span>
                </div>

                {meta.reconocimiento && (
                  <div className="p-2 bg-[#0b111e] rounded-lg border border-[#1e293b] text-[11px] text-[#cbd5e1] flex items-center gap-1.5">
                    <span>🏆</span>
                    <span>{meta.reconocimiento}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Creación de Meta con Gestión de Foco Real */}
      {modalCrearAbierto && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-crear-meta-titulo"
        >
          <div className="bg-[#131c2e] border border-[#1e2d48] w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 id="modal-crear-meta-titulo" className="text-base font-bold text-[#f8fafc]">
                Nueva meta formativa
              </h3>
              <button
                ref={btnCerrarModalRef}
                onClick={() => setModalCrearAbierto(false)}
                className="text-[#94a3b8] hover:text-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#35d7c3] rounded p-1"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#94a3b8] block mb-1">Título del Objetivo:</label>
                <input
                  type="text"
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  placeholder="Ej. Tiempo de atención en mesa, Control de inventario..."
                  className="w-full bg-[#0b111e] border border-[#1e293b] rounded-lg p-2 text-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#35d7c3]"
                />
              </div>

              <div>
                <label className="text-[#94a3b8] block mb-1">Descripción:</label>
                <textarea
                  rows={2}
                  value={nuevaDescripcion}
                  onChange={(e) => setNuevaDescripcion(e.target.value)}
                  placeholder="Criterio de excelencia..."
                  className="w-full bg-[#0b111e] border border-[#1e293b] rounded-lg p-2 text-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#35d7c3]"
                />
              </div>

              <div>
                <label htmlFor="meta-empleado" className="text-[#94a3b8] block mb-1">Empleado:</label>
                <select id="meta-empleado" value={empleadoSeleccionado} onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
                  className="w-full bg-[#0b111e] border border-[#1e293b] rounded-lg p-2 text-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#35d7c3]">
                  {empleados.map((empleado) => <option key={empleado.id} value={empleado.id}>{empleado.nombre} · {empleado.cargo}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="meta-desde" className="text-[#94a3b8] block mb-1">Desde:</label>
                  <input id="meta-desde" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full bg-[#0b111e] border border-[#1e293b] rounded-lg p-2 text-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#35d7c3]"
                  />
                </div>
                <div>
                  <label htmlFor="meta-hasta" className="text-[#94a3b8] block mb-1">Hasta:</label>
                  <input id="meta-hasta" type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)}
                    className="w-full bg-[#0b111e] border border-[#1e293b] rounded-lg p-2 text-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#35d7c3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#94a3b8] block mb-1">Meta a Alcanzar:</label>
                  <input
                    type="number"
                    value={nuevoValor}
                    onChange={(e) => setNuevoValor(Number(e.target.value))}
                    className="w-full bg-[#0b111e] border border-[#1e293b] rounded-lg p-2 text-[#f8fafc] font-mono focus:outline-none focus:ring-2 focus:ring-[#35d7c3]"
                  />
                </div>
                <div>
                  <label className="text-[#94a3b8] block mb-1">Unidad:</label>
                  <input
                    type="text"
                    value={nuevaUnidad}
                    onChange={(e) => setNuevaUnidad(e.target.value)}
                    placeholder="%, minutos, órdenes..."
                    className="w-full bg-[#0b111e] border border-[#1e293b] rounded-lg p-2 text-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#35d7c3]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalCrearAbierto(false)}
                className="px-4 py-2 rounded-lg bg-[#1e293b] text-xs text-[#cbd5e1] hover:bg-[#334155] focus:outline-none focus:ring-2 focus:ring-[#35d7c3]"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearMeta}
                disabled={guardando}
                className="px-4 py-2 rounded-lg bg-[#35d7c3] hover:bg-[#28b8a6] text-black font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-white"
              >
                {guardando ? 'Guardando…' : 'Crear meta formativa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
