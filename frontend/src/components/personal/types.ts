/**
 * Tipos y Definiciones de Datos para el módulo compartido de Personal y Aurora Nómina
 * Adaptado para las verticales de Salud (MediClinic), Horeca (Restaurantes/Hoteles) y Ganadería/Agropecuaria.
 * Todos los registros de prueba llevan el indicador explícito [DEMO].
 */

export type VerticalNegocio = 'salud' | 'horeca' | 'ganaderia' | 'general';

export type DepartamentoPersonal =
  | 'Atención & Salud'
  | 'Cocina & Restauración'
  | 'Operaciones & Campo'
  | 'Administración & Finanzas'
  | 'Logística & Mantenimiento'
  | 'Sistemas & Soporte';

export type EstadoEmpleado = 'ACTIVO' | 'DE_VACACIONES' | 'LICENCIA' | 'INACTIVO';

export type TipoContrato = 'TIEMPO_COMPLETO' | 'MEDIO_TIEMPO' | 'POR_HONORARIOS' | 'POR_JORNAL_GUARDIA';

export interface Empleado {
  id: string;
  codigoEmpleado: string; // ej. EMP-001 [DEMO]
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  identificacion: string;
  cargo: string;
  departamento: DepartamentoPersonal;
  verticalPrincipal: VerticalNegocio;
  tipoContrato: TipoContrato;
  estado: EstadoEmpleado;
  fechaIngreso: string;
  
  // Remuneración referencial (oculta por defecto en la UI)
  salarioBaseReferencial: number;
  moneda: 'USD' | 'VES' | 'COP';
  modalidadPago: 'QUINCENAL' | 'MENSUAL' | 'SEMANAL' | 'POR_JORNAL';
  bancoReferencial?: string;
  cuentaReferencial?: string;

  // Turno habitual
  turnoAsignado: string;
  
  // Métricas referenciales
  metasActivasCount?: number;
  asistenciaTasaMes?: number; // ej. 98%
}

export type TipoTurno = 'MANANA' | 'TARDE' | 'NOCHE' | 'JORNADA_CONTINUA' | 'ROTATIVO' | 'LIBRE';

export interface TurnoHorario {
  id: string;
  nombre: string;
  tipo: TipoTurno;
  horaInicio: string;
  horaFin: string;
  horasJornada: number;
  color: string;
  descripcion?: string;
}

export interface AsignacionTurno {
  id: string;
  empleadoId: string;
  empleadoNombre: string;
  empleadoCargo: string;
  departamento: DepartamentoPersonal;
  fecha: string; // YYYY-MM-DD
  turnoId: string;
  turnoNombre: string;
  tipoTurno: TipoTurno;
  estado: 'PROGRAMADO' | 'EN_CURSO' | 'CUMPLIDO' | 'CAMBIO_SOLICITADO' | 'AUSENTE';
  observaciones?: string;
}

export type EstadoAsistencia = 'PRESENTE' | 'RETARDO' | 'AUSENCIA_JUSTIFICADA' | 'AUSENCIA_INJUSTIFICADA' | 'PERMISO' | 'VACACIONES';

export type MetodoMarcaje = 'PIN_TERMINAL' | 'REGISTRO_SUPERVISOR' | 'PLANILLA_DIGITAL' | 'HORARIO_ASIGNADO';

export interface RegistroAsistencia {
  id: string;
  empleadoId: string;
  empleadoNombre: string;
  departamento: DepartamentoPersonal;
  fecha: string; // YYYY-MM-DD
  horaEntradaProgramada: string;
  horaSalidaProgramada: string;
  horaEntradaReal?: string;
  horaSalidaReal?: string;
  minutosRetardo: number;
  horasTrabajadas: number;
  horasExtras: number;
  estado: EstadoAsistencia;
  justificacion?: string;
  metodoMarcaje: MetodoMarcaje;
}

export type TipoMeta = 'AUTOMATICA' | 'MANUAL';
export type CategoriaMeta = 'CALIDAD_SERVICIO' | 'PUNTUALIDAD' | 'EFICIENCIA_PROCESOS' | 'DOCUMENTACION' | 'CAPACITACION' | 'PRODUCCION_CAMPO';

export interface MetaPersonal {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaMeta;
  tipo: TipoMeta; // Automática vs Manual
  origenMetrica: string;
  departamentoObjetivo: DepartamentoPersonal | 'TODOS';
  verticalObjetivo: VerticalNegocio | 'TODAS';
  empleadoAsignadoId?: string;
  empleadoAsignadoNombre?: string;
  metaValor: number;
  unidadMedida: string;
  progresoActual: number | null;
  fechaInicio: string;
  fechaLimite: string;
  estado: 'EN_PROGRESO' | 'COMPLETADA' | 'EN_RIESGO' | 'VENCIDA';
  
  // Regla no punitiva garantizada
  esNoPunitiva: boolean;
  reconocimiento?: string;
}

export type EstadoNomina = 'BORRADOR' | 'EN_REVISION' | 'APROBADA' | 'AJUSTADA' | 'REVERSADA';

export interface DesgloseCalculoConcepto {
  concepto: string;
  tipo: 'PERCEPCION' | 'DEDUCCION';
  baseCalculo: string;
  baseCalculoMascara?: string; // Para no filtrar cifras en modo protegido
  reglaAplicada: string;
  vigencia: string;
  monto: number;
  moneda: 'USD' | 'VES' | 'COP';
  observacion?: string;
}

export interface ReciboNominaEmpleado {
  id: string;
  empleadoId: string;
  empleadoNombre: string;
  empleadoCargo: string;
  departamento: DepartamentoPersonal;
  diasTrabajados: number;
  horasExtrasTotal: number;
  totalPercepciones: number;
  totalDeducciones: number;
  montoNetoPagar: number;
  moneda: 'USD' | 'VES' | 'COP';
  conceptosDesglosados: DesgloseCalculoConcepto[];
}

export interface HistorialAjusteNomina {
  id: string;
  fecha: string;
  tipoAccion: 'AJUSTE_POSTERIOR' | 'REVERSO_TOTAL' | 'APROBACION_INICIAL';
  autor: string;
  motivoJustificado: string;
}

export interface PeriodoNomina {
  id: string;
  codigoPeriodo: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  fechaTentativaPago: string;
  estado: EstadoNomina;
  totalEmpleados: number;
  montoTotalBruto: number;
  montoTotalDeducciones: number;
  montoTotalNeto: number;
  monedaPrincipal: 'USD' | 'VES' | 'COP';
  
  recibos: ReciboNominaEmpleado[];
  historialAjustes: HistorialAjusteNomina[];
  
  aprobadoPor?: string;
  fechaAprobacion?: string;
  notasAuditoria?: string;
}

export type SeccionPersonal = 'resumen' | 'empleados' | 'turnos' | 'asistencia' | 'metas' | 'nomina';

/**
 * Formateador Multi-Moneda oficial para Aurora Plus (USD, VES, COP)
 */
export function formatearMoneda(monto: number, moneda: 'USD' | 'VES' | 'COP' = 'USD'): string {
  if (isNaN(monto)) return '$0.00 USD';
  
  if (moneda === 'VES') {
    return `Bs. ${monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VES`;
  }
  if (moneda === 'COP') {
    return `$${Math.round(monto).toLocaleString('es-CO')} COP`;
  }
  return `$${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
}
