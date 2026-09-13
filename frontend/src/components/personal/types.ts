/**
 * Tipos y Definiciones de Datos para el módulo de Personal y Aurora Nómina
 * Todos los identificadores y datos de prueba llevan el indicador [DEMO].
 */

export type DepartamentoPersonal = 
  | 'Médico'
  | 'Enfermería'
  | 'Administración'
  | 'Laboratorio / Farmacia'
  | 'Operaciones / Servicios'
  | 'Soporte y Sistemas';

export type EstadoEmpleado = 'ACTIVO' | 'DE_VACACIONES' | 'LICENCIA' | 'INACTIVO';

export type TipoContrato = 'TIEMPO_COMPLETO' | 'MEDIO_TIEMPO' | 'POR_HONORARIOS' | 'GUARDIA';

export interface Empleado {
  id: string;
  codigoEmpleado: string; // ej. EMP-001
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  identificacion: string;
  cargo: string;
  departamento: DepartamentoPersonal;
  tipoContrato: TipoContrato;
  estado: EstadoEmpleado;
  fechaIngreso: string;
  fotoUrl?: string;
  
  // Datos Salariales (protegidos por RBAC)
  salarioBaseReferencial: number; // Monto referencial en USD [DEMO]
  moneda: 'USD' | 'VES' | 'COP';
  modalidadPago: 'QUINCENAL' | 'MENSUAL' | 'SEMANAL';
  bancoReferencial?: string;
  cuentaReferencial?: string;

  // Turno habitual
  turnoAsignado: string; // ej. "Mañana (07:00 - 15:00)"
  
  // Metas asignadas activas
  metasActivasCount?: number;
  asistenciaTasaMes?: number; // Porcentaje ej. 98%
}

export type TipoTurno = 'MANANA' | 'TARDE' | 'NOCHE' | 'GUARDIA_24H' | 'ROTATIVO' | 'LIBRE';

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
  metodoMarcaje: 'BIOMETRICO_DEMO' | 'PIN_TERMINAL' | 'MANUAL_SUPERVISOR' | 'MOVIL_GPS';
}

export type TipoMeta = 'AUTOMATICA' | 'MANUAL';
export type CategoriaMeta = 'ATENCION_PACIENTES' | 'PUNTUALIDAD' | 'EFICIENCIA_PROCESOS' | 'SATISFACCION' | 'DOCUMENTACION_HISTORIAS' | 'CAPACITACION';

export interface MetaPersonal {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaMeta;
  tipo: TipoMeta; // Automática vs Manual
  origenMetrica: string; // ej. "Citas finalizadas en Historias Clínicas" o "Evaluación trimestral de jefatura"
  departamentoObjetivo?: DepartamentoPersonal | 'TODOS';
  empleadoAsignadoId?: string; // Si es individual o grupal
  empleadoAsignadoNombre?: string;
  metaValor: number;
  unidadMedida: string; // ej. "pacientes", "%", "historias", "puntos"
  progresoActual: number;
  fechaInicio: string;
  fechaLimite: string;
  estado: 'EN_PROGRESO' | 'COMPLETADA' | 'EN_RIESGO' | 'VENCIDA';
  
  // Regla no punitiva:
  esNoPunitiva: boolean; // Siempre true en Aurora Plus
  premioOReconocimiento?: string; // ej. "Mención de honor en cartelera médica"
}

export type EstadoNomina = 'BORRADOR' | 'EN_REVISION' | 'APROBADA' | 'AJUSTADA' | 'REVERSADA';

export type TipoConceptoNomina = 'ASIGNACION_SALARIO' | 'BONO_PUNTUALIDAD' | 'GUARDIA_EXTRA' | 'DEDUCCION_SEGURO' | 'DEDUCCION_ANTICIPO' | 'OTRO_RECONOCIMIENTO';

export interface DesgloseCalculoConcepto {
  concepto: string;
  tipo: 'PERCEPCION' | 'DEDUCCION';
  baseCalculo: string; // ej. "15 días laborados @ $20.00/día"
  reglaAplicada: string; // ej. "Salario base mensual / 30 * días computados"
  vigencia: string; // ej. "Tabulador General Q1-2026 [DEMO]"
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
  montoAfectadoUSD?: number;
}

export interface PeriodoNomina {
  id: string;
  codigoPeriodo: string; // ej. "NOM-2026-Q1-01"
  nombre: string; // ej. "1ra Quincena Enero 2026 [DEMO]"
  fechaInicio: string;
  fechaFin: string;
  fechaTentativaPago: string;
  estado: EstadoNomina;
  totalEmpleados: number;
  montoTotalBruto: number;
  montoTotalDeducciones: number;
  montoTotalNeto: number;
  monedaPrincipal: 'USD';
  
  recibos: ReciboNominaEmpleado[];
  historialAjustes: HistorialAjusteNomina[];
  
  // Auditoría
  aprobadoPor?: string;
  fechaAprobacion?: string;
  notasAuditoria?: string;
}

export type SeccionPersonal = 'resumen' | 'empleados' | 'turnos' | 'asistencia' | 'metas' | 'nomina';
