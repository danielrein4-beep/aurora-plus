import React, { useState } from 'react';
import {
  MOCK_EMPLEADOS,
  MOCK_TURNOS_HORARIOS,
  MOCK_ASIGNACIONES_TURNOS,
  MOCK_REGISTROS_ASISTENCIA,
  MOCK_METAS_PERSONAL,
  MOCK_PERIODOS_NOMINA,
} from '../components/personal/mockPersonalData';
import {
  SeccionPersonal,
  Empleado,
  AsignacionTurno,
  RegistroAsistencia,
  MetaPersonal,
  PeriodoNomina,
} from '../components/personal/types';
import { ResumenEquipo } from '../components/personal/ResumenEquipo';
import { ListaEmpleados } from '../components/personal/ListaEmpleados';
import { TurnosPersonal } from '../components/personal/TurnosPersonal';
import { AsistenciaPersonal } from '../components/personal/AsistenciaPersonal';
import { MetasPersonal } from '../components/personal/MetasPersonal';
import { NominaPersonal } from '../components/personal/NominaPersonal';
import { PerfilEmpleado } from '../components/personal/PerfilEmpleado';

export const PersonalPage: React.FC = () => {
  const [seccionActiva, setSeccionActiva] = useState<SeccionPersonal>('resumen');
  
  // Regla estricta: Salarios OCULTOS por defecto en la interfaz
  const [ocultarSueldo, setOcultarSueldo] = useState(true);
  
  // Nómina desactivada por defecto
  const [nominaHabilitada, setNominaHabilitada] = useState(false);

  // Estado unificado en sesión para que las acciones conserven sus cambios en tiempo real
  const [empleados] = useState<Empleado[]>(MOCK_EMPLEADOS);
  const [turnosAsignados, setTurnosAsignados] = useState<AsignacionTurno[]>(MOCK_ASIGNACIONES_TURNOS);
  const [asistencias, setAsistencias] = useState<RegistroAsistencia[]>(MOCK_REGISTROS_ASISTENCIA);
  const [metas, setMetas] = useState<MetaPersonal[]>(MOCK_METAS_PERSONAL);
  const [periodosNomina, setPeriodosNomina] = useState<PeriodoNomina[]>(MOCK_PERIODOS_NOMINA);

  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<Empleado | null>(null);

  const pestanas: { id: SeccionPersonal; etiqueta: string; icono: string }[] = [
    { id: 'resumen', etiqueta: 'Resumen', icono: '📊' },
    { id: 'empleados', etiqueta: 'Empleados', icono: '👥' },
    { id: 'turnos', etiqueta: 'Turnos', icono: '📅' },
    { id: 'asistencia', etiqueta: 'Asistencia', icono: '⏱️' },
    { id: 'metas', etiqueta: 'Metas', icono: '🎯' },
    { id: 'nomina', etiqueta: 'Nómina', icono: '💵' },
  ];

  const todosRecibos = periodosNomina.flatMap((p) => p.recibos);

  return (
    <div className="min-h-screen bg-[#0b111e] text-[#f8fafc] font-sans antialiased selection:bg-[#35d7c3] selection:text-black">
      {/* Contenedor Principal Responsive (desde 360px) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* Cabecera Superior del Módulo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1e2d48]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#35d7c3]" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f8fafc]">
                Gestión de Personal & Aurora Nómina
              </h1>
              <span className="px-2 py-0.5 rounded bg-[#35d7c3]/15 text-[#35d7c3] font-mono text-xs font-semibold border border-[#35d7c3]/30">
                [DEMO]
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#94a3b8]">
              Administración unificada de colaboradores, jornadas y nómina interna para Salud, Gastronomía y Agropecuaria.
            </p>
          </div>

          {/* Acciones Rápidas de Cabecera */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            {/* Modo Privacidad Salarial (Protegido por defecto) */}
            <button
              onClick={() => setOcultarSueldo(!ocultarSueldo)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#35d7c3] ${
                ocultarSueldo
                  ? 'bg-[#1e293b] border-[#334155] text-[#94a3b8]'
                  : 'bg-[#35d7c3]/15 border-[#35d7c3]/40 text-[#35d7c3]'
              }`}
              title="Alternar privacidad de remuneraciones"
            >
              <span>{ocultarSueldo ? '👁️ Sueldos Ocultos' : '🔓 Sueldos Visibles'}</span>
            </button>
          </div>
        </div>

        {/* Barra de Navegación de Secciones (Scroll Horizontal Fluido en Móvil) */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#1e2d48] no-scrollbar">
          {pestanas.map((p) => {
            const esActiva = seccionActiva === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSeccionActiva(p.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-[#35d7c3] ${
                  esActiva
                    ? 'bg-[#131c2e] text-[#35d7c3] border border-[#35d7c3]/40 shadow-sm'
                    : 'text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#131c2e]/50'
                }`}
              >
                <span>{p.icono}</span>
                <span>{p.etiqueta}</span>
                {p.id === 'nomina' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#f59e0b]/20 text-[#fbbf24] font-mono">
                    Opcional
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Renderizado de la Sección Activa */}
        <main className="space-y-6">
          {seccionActiva === 'resumen' && (
            <ResumenEquipo
              empleados={empleados}
              periodoActual={periodosNomina[0]}
              asistenciasHoy={asistencias}
              turnosHoy={turnosAsignados}
              onNavegarSeccion={(sec) => setSeccionActiva(sec)}
              ocultarSueldo={ocultarSueldo}
              nominaHabilitada={nominaHabilitada}
            />
          )}

          {seccionActiva === 'empleados' && (
            <ListaEmpleados
              empleados={empleados}
              onSeleccionarEmpleado={(emp) => setEmpleadoSeleccionado(emp)}
              ocultarSueldo={ocultarSueldo}
              onAlternarPrivacidadSueldo={() => setOcultarSueldo(!ocultarSueldo)}
            />
          )}

          {seccionActiva === 'turnos' && (
            <TurnosPersonal
              turnosHorarios={MOCK_TURNOS_HORARIOS}
              asignaciones={turnosAsignados}
              empleados={empleados}
              onAgregarAsignacion={(nueva) => setTurnosAsignados([nueva, ...turnosAsignados])}
            />
          )}

          {seccionActiva === 'asistencia' && (
            <AsistenciaPersonal
              asistencias={asistencias}
              empleados={empleados}
              onAgregarAsistencia={(nueva) => setAsistencias([nueva, ...asistencias])}
            />
          )}

          {seccionActiva === 'metas' && (
            <MetasPersonal
              metas={metas}
              onAgregarMeta={(nueva) => setMetas([nueva, ...metas])}
            />
          )}

          {seccionActiva === 'nomina' && (
            <NominaPersonal
              periodos={periodosNomina}
              ocultarSueldo={ocultarSueldo}
              onActualizarPeriodos={(actualizados) => {
                setPeriodosNomina(actualizados);
                setNominaHabilitada(true);
              }}
            />
          )}
        </main>

        {/* Modal de Ficha de Empleado */}
        {empleadoSeleccionado && (
          <PerfilEmpleado
            empleado={empleadoSeleccionado}
            asistencias={asistencias}
            metas={metas}
            recibosHistoricos={todosRecibos}
            onCerrar={() => setEmpleadoSeleccionado(null)}
            ocultarSueldo={ocultarSueldo}
          />
        )}
      </div>
    </div>
  );
};

export default PersonalPage;
