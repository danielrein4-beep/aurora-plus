import React from 'react';
import { Empleado, PeriodoNomina, RegistroAsistencia, AsignacionTurno, SeccionPersonal, formatearMoneda } from './types';
import { EstadoNominaBadge } from './EstadoNominaBadge';
import { useVocabularioPersonal } from './vocabulario';

interface ResumenEquipoProps {
  empleados: Empleado[];
  periodoActual: PeriodoNomina;
  asistenciasHoy: RegistroAsistencia[];
  turnosHoy: AsignacionTurno[];
  onNavegarSeccion: (seccion: SeccionPersonal) => void;
  ocultarSueldo: boolean;
  nominaHabilitada: boolean;
}

export const ResumenEquipo: React.FC<ResumenEquipoProps> = ({
  empleados,
  periodoActual,
  asistenciasHoy,
  turnosHoy,
  onNavegarSeccion,
  ocultarSueldo,
  nominaHabilitada,
}) => {
  const v = useVocabularioPersonal();
  const activosCount = empleados.filter((e) => e.estado === 'ACTIVO').length;
  const vacacionesCount = empleados.filter((e) => e.estado === 'DE_VACACIONES').length;
  const presentesHoy = asistenciasHoy.filter((a) => a.estado === 'PRESENTE' || a.estado === 'RETARDO').length;
  const retardoHoy = asistenciasHoy.filter((a) => a.estado === 'RETARDO').length;
  
  // Conteo por departamento
  const porDepto = empleados.reduce<Record<string, number>>((acc, emp) => {
    acc[emp.departamento] = (acc[emp.departamento] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Estado de las fuentes del módulo */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-[#177E89]/15 text-[#177E89] font-mono font-light uppercase tracking-wide border border-[#177E89]/30">
            EN LÍNEA
          </span>
          <span className="text-slate-500 font-light uppercase tracking-wide">
            Datos de {v.tuNegocio}, según los permisos de tu usuario.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#177E89] animate-pulse" />
          <span className="text-slate-900 font-light uppercase tracking-wide font-mono">Personal & Nómina</span>
        </div>
      </div>

      {/* Tarjetas de Métricas Principales (Grid Responsive 360px+) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Equipo */}
        <div
          onClick={() => onNavegarSeccion('empleados')}
          className="p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-[#177E89]/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#177E89]"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavegarSeccion('empleados')}
        >
          <div className="flex items-center justify-between text-xs font-light uppercase tracking-wide text-slate-500 mb-1">
            <span>Total {v.Personas}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white font-mono text-[#177E89]">
              {activosCount} Activos
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {empleados.length}
            </span>
            <span className="text-xs font-light uppercase tracking-wide text-slate-500">registrados</span>
          </div>
          <div className="mt-2 text-xs font-light uppercase tracking-wide text-slate-500 flex items-center gap-2">
            <span className="text-[#177E89]">&bull;</span>
            <span>{vacacionesCount} de vacaciones</span>
          </div>
        </div>

        {/* Asistencia de Hoy */}
        <div
          onClick={() => onNavegarSeccion('asistencia')}
          className="p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-[#177E89]/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#177E89]"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavegarSeccion('asistencia')}
        >
          <div className="flex items-center justify-between text-xs font-light uppercase tracking-wide text-slate-500 mb-1">
            <span>Asistencia Hoy</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white font-mono text-sky-600">
              {asistenciasHoy.length} Registros
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {presentesHoy}
            </span>
            <span className="text-xs font-light uppercase tracking-wide text-slate-500">en jornada</span>
          </div>
          <div className="mt-2 text-xs font-light uppercase tracking-wide text-slate-500 flex items-center gap-2">
            {retardoHoy > 0 ? (
              <span className="text-amber-600 font-light uppercase tracking-wide">{retardoHoy} con retardo registrado</span>
            ) : asistenciasHoy.length > 0 ? (
              <span className="text-[#177E89]">Sin retardos registrados</span>
            ) : (
              <span className="text-slate-500">Sin marcajes en el período consultado</span>
            )}
          </div>
        </div>

        {/* Turnos en Curso */}
        <div
          onClick={() => onNavegarSeccion('turnos')}
          className="p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-[#177E89]/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#177E89]"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavegarSeccion('turnos')}
        >
          <div className="flex items-center justify-between text-xs font-light uppercase tracking-wide text-slate-500 mb-1">
            <span>{v.coberturaTurnos}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white font-mono text-sky-600">
              Jornada Activa
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
              {turnosHoy.filter((t) => t.estado === 'EN_CURSO').length}
            </span>
            <span className="text-xs font-light uppercase tracking-wide text-slate-500">en puesto</span>
          </div>
          <div className="mt-2 text-xs font-light uppercase tracking-wide text-slate-500">
            <span>{v.areasActivas}</span>
          </div>
        </div>

        {/* Período de Nómina Actual */}
        <div
          onClick={() => onNavegarSeccion('nomina')}
          className="p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-[#177E89]/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#177E89]"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavegarSeccion('nomina')}
        >
          <div className="flex items-center justify-between text-xs font-light uppercase tracking-wide text-slate-500 mb-1">
            <span>Aurora Nómina</span>
            {nominaHabilitada ? (
              <EstadoNominaBadge estado={periodoActual.estado} />
            ) : (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#f59e0b]/15 text-amber-600 font-mono font-light uppercase tracking-wide border border-[#f59e0b]/30">
                Desactivado
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#177E89]">
              {ocultarSueldo ? '••••••' : formatearMoneda(periodoActual.montoTotalNeto, periodoActual.monedaPrincipal)}
            </span>
            <span className="text-xs font-light uppercase tracking-wide text-slate-500">neto</span>
          </div>
          <div className="mt-2 text-[11px] font-light uppercase tracking-wide text-slate-500 truncate font-mono">
            {periodoActual.nombre}
          </div>
        </div>
      </div>

      {/* Sección Doble: Distribución por Área y Turnos del Día */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de Personal */}
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-900">{v.distribucion}</h3>
              <p className="text-xs font-light uppercase tracking-wide text-slate-500">{v.distribucionDetalle}</p>
            </div>
            <button
              onClick={() => onNavegarSeccion('empleados')}
              className="text-xs text-[#177E89] hover:underline font-light uppercase tracking-wide"
            >
              Ver todos &rarr;
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {Object.entries(porDepto).map(([depto, count]) => {
              const porcentaje = Math.round((count / empleados.length) * 100);
              return (
                <div key={depto} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-light uppercase tracking-wide">{v.nombreArea(depto)}</span>
                    <span className="font-mono text-slate-500">
                      {count} ({porcentaje}%)
                    </span>
                  </div>
                  <div className="w-full bg-white h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#177E89] h-full rounded-full transition-all duration-300"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Turnos en Curso Hoy */}
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-900">{v.turnosTitulo}</h3>
              <p className="text-xs font-light uppercase tracking-wide text-slate-500">{v.turnosDetalle}</p>
            </div>
            <button
              onClick={() => onNavegarSeccion('turnos')}
              className="text-xs text-[#177E89] hover:underline font-light uppercase tracking-wide"
            >
              {v.turnosAccion} &rarr;
            </button>
          </div>

          <div className="space-y-2 pt-1 max-h-[260px] overflow-y-auto pr-1">
            {turnosHoy.map((t) => (
              <div
                key={t.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{t.empleadoNombre}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-light uppercase tracking-wide">
                      {v.nombreArea(t.departamento)}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] font-light uppercase tracking-wide">{t.turnoNombre}</p>
                </div>

                <div>
                  {t.estado === 'EN_CURSO' ? (
                    <span className="inline-flex items-center gap-1 text-[#177E89] font-light uppercase tracking-wide font-mono text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#177E89] animate-pulse" />
                      En Servicio
                    </span>
                  ) : (
                    <span className="text-slate-500 font-mono text-[11px] font-light uppercase tracking-wide">Programado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
