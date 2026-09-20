export type UnidadMedidaPartida = "m³" | "m²" | "ml" | "kg" | "ton" | "pza" | "pto" | "gl" | "día" | "hora";

export type EstadoProyecto = "LICITACION" | "EN_EJECUCION" | "PARALIZADA" | "FINALIZADA";
export type EstadoValuacion = "BORRADOR" | "PRESENTADA" | "APROBADA" | "COBRADA";
export type ClimaJornada = "SOLEADO" | "NUBLADO" | "LLUVIOSO" | "VARIABLE";

export interface PartidaObra {
  id: string;
  capituloId: string;
  codigoPartida: string;
  descripcion: string;
  unidad: UnidadMedidaPartida;
  cantidad: number; // Cómputo métrico
  precioUnitarioUSD: number; // APU / PU
  totalUSD: number;
  rendimientoDiario?: number;
  notasTecnicas?: string;
}

export interface CapituloObra {
  id: string;
  proyectoId: string;
  numero: string; // ej: "1.0", "2.0"
  nombre: string; // ej: "Obras Preliminares"
  orden: number;
}

export interface ProyectoConstruccion {
  id: string;
  codigo: string; // ej: "OBR-2026-001"
  nombre: string;
  clienteNombre: string;
  clienteRif: string;
  clienteTelefono: string;
  ubicacion: string;
  ingenieroResidente: string;
  ingenieroCiv: string; // Colegio de Ingenieros de Venezuela (CIV)
  fechaInicio: string;
  fechaFinEstimada: string;
  estado: EstadoProyecto;
  // Parámetros económicos y deducciones de ley
  anticipoPorcentaje: number; // ej: 20%
  retencionPorcentaje: number; // ej: 5% fiel cumplimiento y laboral
  porcentajeAdministracion: number; // ej: 12%
  porcentajeUtilidad: number; // ej: 10%
  porcentajeIva: number; // ej: 16% o 0% si exento
  totalPresupuestadoUSD: number;
  costoDirectoUSD: number;
  monedaPrincipal: "USD" | "VES";
  notas?: string;
}

export interface ItemValuacion {
  id: string;
  valuacionId: string;
  partidaId: string;
  cantidadAnterior: number;
  cantidadPeriodo: number; // Medición de campo en esta valuación
  cantidadAcumulada: number;
  precioUnitarioUSD: number;
  montoPeriodoUSD: number;
  porcentajeAvance: number; // 0 - 100%
}

export interface ValuacionObra {
  id: string;
  proyectoId: string;
  numeroValuacion: number; // Valuación N° 1, 2, 3...
  fechaCorte: string;
  periodoDesde: string;
  periodoHasta: string;
  montoBrutoUSD: number;
  amortizacionAnticipoUSD: number; // % del monto bruto
  retencionGarantiaUSD: number; // % retención laboral/fiel cumplimiento
  montoNetoUSD: number; // Monto a cobrar por el contratista
  estado: EstadoValuacion;
  items: ItemValuacion[];
  notas?: string;
  fechaRegistro: string;
}

export interface InsumoObra {
  id: string;
  codigo: string;
  nombre: string;
  tipo: "MATERIAL" | "EQUIPO" | "MANO_OBRA";
  unidad: string;
  costoUnitarioUSD: number;
  cantidadPresupuestada: number;
  cantidadConsumida: number;
  proveedor?: string;
}

export interface RegistroBitacora {
  id: string;
  proyectoId: string;
  fecha: string;
  clima: ClimaJornada;
  cuadrillasActivas: number;
  obrerosPresentes: number;
  equiposEnSitio: string;
  trabajosEjecutados: string;
  incidencias?: string;
  ingenieroFirma: string;
}

export interface PartidaCatalogoCOVENIN {
  codigo: string;
  capituloSugerido: string;
  descripcion: string;
  unidad: UnidadMedidaPartida;
  precioUnitarioEstimadoUSD: number;
  rendimientoDiario: number;
}