import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listarAsistenciaPersonal,
  listarDirectorioPersonal,
  listarMetasPersonal,
  listarMetasDeEmpleado,
  listarSeguimientosMeta,
  crearMetaPersonal,
  listarPeriodosNomina,
  listarTurnosPersonal,
  crearTurnoPersonal,
  obtenerDetallePeriodoNomina,
  obtenerCapacidadesPersonal,
  registrarEntradaPersonal,
  registrarSalidaPersonal,
  type CapacidadesPersonal,
  type AsistenciaPersonalApi,
  type EntradaDirectorioPersonalApi,
  type MetaPersonalApi,
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

const mapearAsistencia = (registro: AsistenciaPersonalApi, empleado?: Empleado): RegistroAsistencia => ({
  id: String(registro.id), empleadoId: String(registro.empleadoId),
  empleadoNombre: empleado?.nombre || `Empleado ${registro.empleadoId}`,
  departamento: empleado?.departamento || 'Administración & Finanzas',
  fecha: registro.fechaHoraEntrada.slice(0, 10), horaEntradaProgramada: '--:--', horaSalidaProgramada: '--:--',
  horaEntradaReal: registro.fechaHoraEntrada.slice(11, 16), horaSalidaReal: registro.fechaHoraSalida?.slice(11, 16),
  minutosRetardo: 0, horasTrabajadas: registro.horasTrabajadas || 0, horasExtras: 0,
  estado: 'PRESENTE',
  metodoMarcaje: registro.origen === 'MANUAL' ? 'REGISTRO_SUPERVISOR'
    : registro.origen === 'TERMINAL_PIN' ? 'PIN_TERMINAL' : 'PLANILLA_DIGITAL',
});

const mapearMeta = (meta: MetaPersonalApi, empleado?: Empleado, progreso: number | null = null): MetaPersonal => {
  const vencida = meta.periodoHasta < new Date().toISOString().slice(0, 10);
  return {
    id: String(meta.id), titulo: meta.nombre, descripcion: meta.descripcion || '', categoria: 'EFICIENCIA_PROCESOS',
    tipo: 'MANUAL', origenMetrica: 'Seguimiento registrado en Aurora',
    departamentoObjetivo: empleado?.departamento || 'TODOS', verticalObjetivo: empleado?.verticalPrincipal || 'TODAS',
    empleadoAsignadoId: String(meta.empleadoId), empleadoAsignadoNombre: empleado?.nombre,
    metaValor: meta.valorObjetivo, unidadMedida: meta.unidad, progresoActual: progreso,
    fechaInicio: meta.periodoDesde, fechaLimite: meta.periodoHasta,
    estado: vencida ? 'VENCIDA' : 'EN_PROGRESO', esNoPunitiva: true,
  };
};

const PERIODO_VACIO: PeriodoNomina = {
  id: 'sin-periodo', codigoPeriodo: 'SIN-PERIODO', nombre: 'Sin períodos calculados',
  fechaInicio: '', fechaFin: '', fechaTentativaPago: '', estado: 'BORRADOR',
  totalEmpleados: 0, montoTotalBruto: 0, montoTotalDeducciones: 0, montoTotalNeto: 0,
  monedaPrincipal: 'USD', recibos: [], historialAjustes: [],
};

export const PersonalPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
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
      setErrorDatos('No pudimos verificar tus permisos de Personal');
      setCargandoDatos(false);
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
          capacidades.metas && capacidades.puedeVerDirectorio ? listarMetasPersonal()
            : capacidades.metas && capacidades.rolPersonal === 'EMPLEADO' && capacidades.empleadoId
              ? listarMetasDeEmpleado(capacidades.empleadoId) : Promise.resolve([]),
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
        setAsistencias(asistenciasApi.map((registro) => mapearAsistencia(registro, porId.get(String(registro.empleadoId)))));
        const seguimientos = await Promise.all(metasApi.map((meta) => listarSeguimientosMeta(meta.id)));
        if (!activo) return;
        setMetas(metasApi.map((meta, indice) => {
          const historial = seguimientos[indice];
          const ultimo = historial.length > 0 ? historial[historial.length - 1] : null;
          return mapearMeta(meta, porId.get(String(meta.empleadoId)), ultimo?.valorAlcanzado ?? null);
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

  const pestanas: { id: SeccionPersonal; etiqueta: string }[] = [
    { id: 'resumen', etiqueta: 'Resumen' },
    { id: 'empleados', etiqueta: 'Empleados' },
    { id: 'turnos', etiqueta: 'Turnos' },
    { id: 'asistencia', etiqueta: 'Asistencia' },
    { id: 'metas', etiqueta: 'Metas' },
    { id: 'nomina', etiqueta: 'Nómina' },
  ];

  const todosRecibos = periodosNomina.flatMap((p) => p.recibos);

  return (
    <div className={`${embedded ? 'min-h-0 bg-transparent text-slate-900' : 'min-h-screen bg-slate-50 text-slate-900'} font-sans antialiased selection:bg-[#177E89] selection:text-black`}>
      {/* Contenedor Principal Responsive (desde 360px) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {!embedded && <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-light uppercase tracking-wide text-slate-500 hover:text-[#177E89] focus:outline-none focus:ring-2 focus:ring-[#177E89]">
          ← Volver al Hub
        </Link>}
        {/* Cabecera Superior del Módulo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#177E89]" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Gestión de Personal & Aurora Nómina
              </h1>
              <span className="px-2 py-0.5 rounded bg-[#177E89]/15 text-[#177E89] font-mono text-xs font-light uppercase tracking-wide border border-[#177E89]/30">
                PILOTO
              </span>
            </div>
            <p className="text-xs sm:text-sm font-light uppercase tracking-wide text-slate-500">
              Tu equipo, sus turnos, su asistencia, metas y nómina en un solo lugar.
            </p>
          </div>

          {/* Acciones Rápidas de Cabecera */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            {/* Modo Privacidad Salarial (Protegido por defecto) */}
            {capacidades?.puedeVerMontosNomina && <button
              onClick={() => setOcultarSueldo(!ocultarSueldo)}
              className={`px-3 py-1.5 rounded-lg text-xs font-light uppercase tracking-wide border flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#177E89] ${
                ocultarSueldo
                  ? 'bg-slate-100 border-slate-300 text-slate-500'
                  : 'bg-[#177E89]/15 border-[#177E89]/40 text-[#177E89]'
              }`}
              title="Alternar privacidad de remuneraciones"
            >
              <span>{ocultarSueldo ? 'Sueldos ocultos' : 'Sueldos visibles'}</span>
            </button>}
          </div>
        </div>

        {/* Barra de Navegación de Secciones (Scroll Horizontal Fluido en Móvil) */}
        <div role="tablist" aria-label="Secciones de Personal" className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 no-scrollbar">
          {pestanas.filter((p) => p.id !== 'nomina' || capacidades?.puedeVerMontosNomina).map((p) => {
            const esActiva = seccionActiva === p.id;
            return (
              <button
                key={p.id}
                id={`tab-personal-${p.id}`}
                role="tab"
                aria-selected={esActiva}
                aria-controls={`panel-personal-${p.id}`}
                onClick={() => setSeccionActiva(p.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-light uppercase tracking-wide whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-[#177E89] ${
                  esActiva
                    ? 'bg-slate-50 text-[#177E89] border border-[#177E89]/40 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{p.etiqueta}</span>
                {p.id === 'nomina' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#f59e0b]/20 text-amber-600 font-mono font-light uppercase tracking-wide">
                    {nominaHabilitada ? 'Activo' : 'Opcional'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Renderizado de la Sección Activa */}
        <main id={`panel-personal-${seccionActiva}`} role="tabpanel" aria-labelledby={`tab-personal-${seccionActiva}`} className="space-y-6">
          {cargandoDatos && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 font-mono text-xs font-light uppercase tracking-wide text-[#177E89]">
              Cargando datos autorizados de Personal…
            </div>
          )}
          {errorDatos && (
            <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-light uppercase tracking-wide text-red-200">
              No pudimos cargar los datos reales: {errorDatos}
            </div>
          )}
          {!cargandoDatos && !errorDatos && seccionActiva === 'resumen' && (
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

          {!cargandoDatos && !errorDatos && seccionActiva === 'empleados' && (
            <ListaEmpleados
              empleados={empleados}
              onSeleccionarEmpleado={(emp) => setEmpleadoSeleccionado(emp)}
              ocultarSueldo={ocultarSueldo}
              onAlternarPrivacidadSueldo={() => setOcultarSueldo(!ocultarSueldo)}
            />
          )}

          {!cargandoDatos && !errorDatos && seccionActiva === 'turnos' && (
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

          {!cargandoDatos && !errorDatos && seccionActiva === 'asistencia' && (
            <AsistenciaPersonal
              asistencias={asistencias}
              empleados={empleados}
              puedeRegistrar={Boolean(capacidades?.puedeRegistrarAsistencia)}
              onRegistrarMarcaje={async ({ empleadoId, tipo, fecha, hora, metodo }) => {
                const fechaHora = `${fecha}T${hora}:00`;
                let guardado: AsistenciaPersonalApi;
                if (tipo === 'ENTRADA') {
                  guardado = await registrarEntradaPersonal({
                    empleadoId: Number(empleadoId), fechaHoraEntrada: fechaHora,
                    origen: metodo === 'PIN_TERMINAL' ? 'TERMINAL_PIN'
                      : metodo === 'REGISTRO_SUPERVISOR' ? 'MANUAL' : 'PLANILLA_DIGITAL',
                  });
                } else {
                  const abierto = asistencias.find((item) => item.empleadoId === empleadoId && !item.horaSalidaReal);
                  if (!abierto) throw new Error('Este empleado no tiene una entrada abierta');
                  guardado = await registrarSalidaPersonal(Number(abierto.id), fechaHora);
                }
                const empleado = empleados.find((item) => item.id === empleadoId);
                const asistenciaGuardada = mapearAsistencia(guardado, empleado);
                setAsistencias((actuales) => tipo === 'SALIDA'
                  ? actuales.map((item) => item.id === asistenciaGuardada.id ? asistenciaGuardada : item)
                  : [asistenciaGuardada, ...actuales]);
                return asistenciaGuardada;
              }}
            />
          )}

          {!cargandoDatos && !errorDatos && seccionActiva === 'metas' && (
            <MetasPersonal
              metas={metas}
              empleados={empleados}
              puedeGestionar={Boolean(capacidades?.puedeGestionarMetas)}
              onCrearMeta={async (datos) => {
                const guardada = await crearMetaPersonal({
                  empleadoId: Number(datos.empleadoId), nombre: datos.titulo,
                  descripcion: datos.descripcion || undefined, valorObjetivo: datos.valor,
                  unidad: datos.unidad, periodoDesde: datos.fechaInicio, periodoHasta: datos.fechaLimite,
                });
                const metaGuardada = mapearMeta(guardada, empleados.find((item) => item.id === datos.empleadoId));
                setMetas((actuales) => [metaGuardada, ...actuales]);
                return metaGuardada;
              }}
            />
          )}

          {!cargandoDatos && !errorDatos && seccionActiva === 'nomina' && periodosNomina.length > 0 && (
            <NominaPersonal
              periodos={periodosNomina}
              ocultarSueldo={ocultarSueldo}
              nominaHabilitada={nominaHabilitada}
              onActualizarPeriodos={(actualizados) => {
                setPeriodosNomina(actualizados);
              }}
            />
          )}
          {!errorDatos && seccionActiva === 'nomina' && periodosNomina.length === 0 && !cargandoDatos && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <h2 className="font-bold tracking-tight text-slate-900">Aún no hay períodos de nómina</h2>
              <p className="mt-2 text-sm font-light uppercase tracking-wide text-slate-500">Crea y calcula el primer período cuando la empresa decida activar Aurora Nómina.</p>
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
