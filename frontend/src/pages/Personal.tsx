import React, { useEffect, useState } from 'react';
import {
  listarAsistenciaPersonal,
  listarDirectorioPersonal,
  listarMetasPersonal,
  listarPeriodosNomina,
  listarTurnosPersonal,
  crearTurnoPersonal,
  obtenerDetallePeriodoNomina,
  obtenerCapacidadesPersonal,
  type CapacidadesPersonal,
  type EntradaDirectorioPersonalApi,
} from '../api';
import {
  MOCK_TURNOS_HORARIOS,
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

const departamentoDe = (modulo?: string | null): Empleado['departamento'] => {
  const valor = (modulo || '').toLowerCase();
  if (valor.includes('salud') || valor.includes('clinic')) return 'Atención & Salud';
  if (valor.includes('horeca') || valor.includes('restaurant')) return 'Cocina & Restauración';
  if (valor.includes('ganader') || valor.includes('finca')) return 'Operaciones & Campo';
  return 'Administración & Finanzas';
};

const verticalDe = (modulo?: string | null): Empleado['verticalPrincipal'] => {
  const valor = (modulo || '').toLowerCase();
  if (valor.includes('salud') || valor.includes('clinic')) return 'salud';
  if (valor.includes('horeca') || valor.includes('restaurant')) return 'horeca';
  if (valor.includes('ganader') || valor.includes('finca')) return 'ganaderia';
  return 'general';
};

const mapearEmpleado = (entrada: EntradaDirectorioPersonalApi): Empleado => ({
  id: String(entrada.id),
  codigoEmpleado: `EMP-${entrada.id}`,
  nombre: entrada.nombreCompleto,
  apellidos: '',
  email: '',
  telefono: '',
  identificacion: entrada.documentoIdentidad,
  cargo: entrada.cargo || 'Sin cargo vigente',
  departamento: departamentoDe(entrada.moduloOrigen),
  verticalPrincipal: verticalDe(entrada.moduloOrigen),
  tipoContrato: entrada.tipoSalario === 'POR_HORA' || entrada.tipoSalario === 'POR_JORNADA'
    ? 'POR_JORNAL_GUARDIA' : 'TIEMPO_COMPLETO',
  estado: entrada.fechaEgreso ? 'INACTIVO' : 'ACTIVO',
  fechaIngreso: entrada.fechaIngreso,
  salarioBaseReferencial: entrada.salarioPactado ?? 0,
  moneda: entrada.monedaSalario || 'USD',
  modalidadPago: entrada.tipoSalario === 'POR_JORNADA' ? 'POR_JORNAL' : 'MENSUAL',
  turnoAsignado: 'Consultar planificación',
});

const PERIODO_VACIO: PeriodoNomina = {
  id: 'sin-periodo', codigoPeriodo: 'SIN-PERIODO', nombre: 'Sin períodos calculados',
  fechaInicio: '', fechaFin: '', fechaTentativaPago: '', estado: 'BORRADOR',
  totalEmpleados: 0, montoTotalBruto: 0, montoTotalDeducciones: 0, montoTotalNeto: 0,
  monedaPrincipal: 'USD', recibos: [], historialAjustes: [],
};

export const PersonalPage: React.FC = () => {
  const [seccionActiva, setSeccionActiva] = useState<SeccionPersonal>('resumen');
  
  // Regla estricta: Salarios OCULTOS por defecto en la interfaz
  const [ocultarSueldo, setOcultarSueldo] = useState(true);
  
  // Nómina DESACTIVADA por defecto (centralizada en Personal.tsx)
  const [nominaHabilitada, setNominaHabilitada] = useState(false);
  const [capacidades, setCapacidades] = useState<CapacidadesPersonal | null>(null);

  useEffect(() => {
    obtenerCapacidadesPersonal().then((datos) => {
      setCapacidades(datos);
      setNominaHabilitada(datos.nominaAvanzada);
      if (!datos.puedeVerMontosNomina) setOcultarSueldo(true);
    }).catch(() => {
      setCapacidades(null);
      setNominaHabilitada(false);
      setOcultarSueldo(true);
    });
  }, []);

  // Estado unificado en sesión para que las acciones conserven sus cambios en tiempo real
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [turnosAsignados, setTurnosAsignados] = useState<AsignacionTurno[]>([]);
  const [asistencias, setAsistencias] = useState<RegistroAsistencia[]>([]);
  const [metas, setMetas] = useState<MetaPersonal[]>([]);
  const [periodosNomina, setPeriodosNomina] = useState<PeriodoNomina[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorDatos, setErrorDatos] = useState<string | null>(null);

  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<Empleado | null>(null);

  useEffect(() => {
    if (!capacidades?.accesoPersonal) return;
    let activo = true;
    const hoy = new Date();
    const desde = new Date(hoy.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const hasta = new Date(hoy.getTime() + 30 * 86400000).toISOString().slice(0, 10);

    const cargar = async () => {
      setCargandoDatos(true);
      setErrorDatos(null);
      try {
        const directorio = capacidades.puedeVerDirectorio ? await listarDirectorioPersonal() : [];
        const empleadosMapeados = directorio.map(mapearEmpleado);
        const porId = new Map(empleadosMapeados.map((empleado) => [empleado.id, empleado]));
        const [turnosApi, asistenciasApi, metasApi, periodosApi] = await Promise.all([
          capacidades.asistencia && capacidades.puedeVerDirectorio ? listarTurnosPersonal(desde, hasta) : Promise.resolve([]),
          capacidades.asistencia && capacidades.puedeVerDirectorio ? listarAsistenciaPersonal(desde, hasta) : Promise.resolve([]),
          capacidades.metas && capacidades.puedeVerDirectorio ? listarMetasPersonal() : Promise.resolve([]),
          capacidades.nominaAvanzada && capacidades.puedeVerMontosNomina ? listarPeriodosNomina() : Promise.resolve([]),
        ]);
        if (!activo) return;
        setEmpleados(empleadosMapeados);
        setTurnosAsignados(turnosApi.map((turno) => {
          const empleado = porId.get(String(turno.empleadoId));
          const hora = Number(turno.horaInicio.slice(0, 2));
          return {
            id: String(turno.id), empleadoId: String(turno.empleadoId),
            empleadoNombre: empleado?.nombre || `Empleado ${turno.empleadoId}`,
            empleadoCargo: empleado?.cargo || 'Sin cargo vigente',
            departamento: empleado?.departamento || 'Administración & Finanzas',
            fecha: turno.fecha, turnoId: String(turno.id),
            turnoNombre: `${turno.horaInicio} - ${turno.horaFin}`,
            tipoTurno: hora < 12 ? 'MANANA' : hora < 18 ? 'TARDE' : 'NOCHE', estado: 'PROGRAMADO',
          };
        }));
        setAsistencias(asistenciasApi.map((registro) => {
          const empleado = porId.get(String(registro.empleadoId));
          return {
            id: String(registro.id), empleadoId: String(registro.empleadoId),
            empleadoNombre: empleado?.nombre || `Empleado ${registro.empleadoId}`,
            departamento: empleado?.departamento || 'Administración & Finanzas',
            fecha: registro.fechaHoraEntrada.slice(0, 10), horaEntradaProgramada: '--:--', horaSalidaProgramada: '--:--',
            horaEntradaReal: registro.fechaHoraEntrada.slice(11, 16),
            horaSalidaReal: registro.fechaHoraSalida?.slice(11, 16), minutosRetardo: 0,
            horasTrabajadas: registro.horasTrabajadas || 0, horasExtras: 0,
            estado: registro.fechaHoraSalida ? 'PRESENTE' : 'RETARDO',
            metodoMarcaje: registro.origen === 'MANUAL' ? 'REGISTRO_SUPERVISOR'
              : registro.origen === 'TERMINAL_PIN' ? 'PIN_TERMINAL' : 'PLANILLA_DIGITAL',
          };
        }));
        setMetas(metasApi.map((meta) => {
          const empleado = porId.get(String(meta.empleadoId));
          const vencida = meta.periodoHasta < new Date().toISOString().slice(0, 10);
          return {
            id: String(meta.id), titulo: meta.nombre, descripcion: meta.descripcion || '', categoria: 'EFICIENCIA_PROCESOS',
            tipo: 'MANUAL', origenMetrica: 'Seguimiento registrado en Aurora', departamentoObjetivo: empleado?.departamento || 'TODOS',
            verticalObjetivo: empleado?.verticalPrincipal || 'TODAS', empleadoAsignadoId: String(meta.empleadoId),
            empleadoAsignadoNombre: empleado?.nombre, metaValor: meta.valorObjetivo, unidadMedida: meta.unidad,
            progresoActual: 0, fechaInicio: meta.periodoDesde, fechaLimite: meta.periodoHasta,
            estado: vencida ? 'VENCIDA' : 'EN_PROGRESO', esNoPunitiva: true,
          };
        }));
        const detallesNomina = await Promise.all(periodosApi.map((periodo) => obtenerDetallePeriodoNomina(periodo.id)));
        if (!activo) return;
        setPeriodosNomina(detallesNomina.map(({ periodo, recibos }) => {
          const recibosMapeados = recibos.map((recibo) => {
            const empleado = porId.get(String(recibo.empleadoId));
            return {
              id: String(recibo.id), empleadoId: String(recibo.empleadoId), empleadoNombre: recibo.empleadoNombre,
              empleadoCargo: recibo.cargo || 'Sin cargo vigente',
              departamento: empleado?.departamento || departamentoDe(null), diasTrabajados: 0, horasExtrasTotal: 0,
              totalPercepciones: recibo.totalAsignaciones, totalDeducciones: recibo.totalDeducciones,
              montoNetoPagar: recibo.netoEfectivo, moneda: recibo.moneda,
              conceptosDesglosados: recibo.lineas.filter((linea) => linea.tipo !== 'APORTE_PATRONAL').map((linea) => ({
                concepto: linea.descripcion, tipo: linea.tipo === 'ASIGNACION' ? 'PERCEPCION' as const : 'DEDUCCION' as const,
                baseCalculo: `${linea.cantidad} × ${linea.montoUnitario}`, reglaAplicada: linea.reglaAplicadaId ? `Regla ${linea.reglaAplicadaId}` : 'Cálculo directo',
                vigencia: periodo.fechaFin, monto: linea.montoTotal, moneda: linea.moneda,
              })),
            };
          });
          const ajustes = recibos.flatMap((recibo) => recibo.ajustes.map((ajuste) => ({
            id: String(ajuste.id), fecha: ajuste.fecha,
            tipoAccion: ajuste.tipo === 'REVERSO' ? 'REVERSO_TOTAL' as const : 'AJUSTE_POSTERIOR' as const,
            autor: 'Usuario autorizado', motivoJustificado: ajuste.motivo,
          })));
          return {
            id: String(periodo.id), codigoPeriodo: `NOM-${periodo.id}`, nombre: periodo.nombre,
            fechaInicio: periodo.fechaInicio, fechaFin: periodo.fechaFin,
            fechaTentativaPago: periodo.fechaPagoPlanificada || periodo.fechaFin,
            estado: periodo.estado === 'CALCULADA' ? 'EN_REVISION' : periodo.estado === 'PAGADA' ? 'APROBADA' : periodo.estado,
            totalEmpleados: recibos.length,
            montoTotalBruto: recibos.reduce((total, recibo) => total + recibo.totalAsignaciones, 0),
            montoTotalDeducciones: recibos.reduce((total, recibo) => total + recibo.totalDeducciones, 0),
            montoTotalNeto: recibos.reduce((total, recibo) => total + recibo.netoEfectivo, 0),
            monedaPrincipal: periodo.moneda, recibos: recibosMapeados, historialAjustes: ajustes,
            fechaAprobacion: periodo.fechaAprobacion || undefined,
          };
        }));
      } catch (error) {
        if (activo) setErrorDatos(error instanceof Error ? error.message : 'No pudimos cargar Personal');
      } finally {
        if (activo) setCargandoDatos(false);
      }
    };
    cargar();
    return () => { activo = false; };
  }, [capacidades]);

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
                PILOTO
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#94a3b8]">
              Administración unificada de colaboradores, jornadas y nómina interna para Salud, Gastronomía y Agropecuaria.
            </p>
          </div>

          {/* Acciones Rápidas de Cabecera */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            {/* Modo Privacidad Salarial (Protegido por defecto) */}
            {capacidades?.puedeVerMontosNomina && <button
              onClick={() => setOcultarSueldo(!ocultarSueldo)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#35d7c3] ${
                ocultarSueldo
                  ? 'bg-[#1e293b] border-[#334155] text-[#94a3b8]'
                  : 'bg-[#35d7c3]/15 border-[#35d7c3]/40 text-[#35d7c3]'
              }`}
              title="Alternar privacidad de remuneraciones"
            >
              <span>{ocultarSueldo ? '👁️ Sueldos Ocultos' : '🔓 Sueldos Visibles'}</span>
            </button>}
          </div>
        </div>

        {/* Barra de Navegación de Secciones (Scroll Horizontal Fluido en Móvil) */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#1e2d48] no-scrollbar">
          {pestanas.filter((p) => p.id !== 'nomina' || capacidades?.puedeVerMontosNomina).map((p) => {
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
                    {nominaHabilitada ? 'Activo' : 'Opcional'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Renderizado de la Sección Activa */}
        <main className="space-y-6">
          {cargandoDatos && (
            <div className="rounded-xl border border-white/10 bg-[#0b2341] p-4 font-mono text-xs text-[#35d7c3]">
              Cargando datos autorizados de Personal…
            </div>
          )}
          {errorDatos && (
            <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
              No pudimos cargar los datos reales: {errorDatos}
            </div>
          )}
          {seccionActiva === 'resumen' && (
            <ResumenEquipo
              empleados={empleados}
              periodoActual={periodosNomina[0] || PERIODO_VACIO}
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
              onAgregarAsignacion={async (nueva) => {
                const horario = MOCK_TURNOS_HORARIOS.find((turno) => turno.id === nueva.turnoId);
                if (!horario) throw new Error('El horario seleccionado ya no está disponible');
                const guardado = await crearTurnoPersonal({
                  empleadoId: Number(nueva.empleadoId), fecha: nueva.fecha,
                  horaInicio: horario.horaInicio, horaFin: horario.horaFin,
                });
                const asignacionGuardada = { ...nueva, id: String(guardado.id) };
                setTurnosAsignados((actuales) => [asignacionGuardada, ...actuales]);
                return asignacionGuardada;
              }}
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

          {seccionActiva === 'nomina' && periodosNomina.length > 0 && (
            <NominaPersonal
              periodos={periodosNomina}
              ocultarSueldo={ocultarSueldo}
              nominaHabilitada={nominaHabilitada}
              onActualizarPeriodos={(actualizados) => {
                setPeriodosNomina(actualizados);
              }}
            />
          )}
          {seccionActiva === 'nomina' && periodosNomina.length === 0 && !cargandoDatos && (
            <div className="rounded-2xl border border-white/10 bg-[#0b2341] p-8 text-center">
              <h2 className="font-semibold text-white">Aún no hay períodos de nómina</h2>
              <p className="mt-2 text-sm text-white/60">Crea y calcula el primer período cuando la empresa decida activar Aurora Nómina.</p>
            </div>
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
