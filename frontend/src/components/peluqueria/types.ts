export type CitaEstado = "CONFIRMADA" | "EN_SALA" | "EN_ATENCION" | "FINALIZADA" | "CANCELADA" | "NO_ASISTIO";

export type MetodoPagoBelleza = 
  | "EFECTIVO_USD" 
  | "PAGO_MOVIL" 
  | "PUNTO_VENTA" 
  | "ZELLE" 
  | "BINANCE" 
  | "EFECTIVO_BS";

export type CategoriaServicio = 
  | "Corte & Peinado" 
  | "Coloración & Balayage" 
  | "Tratamientos & Keratinas" 
  | "Barbería & Afeitado" 
  | "Manicura & Pedicura" 
  | "Cejas & Pestañas" 
  | "Spa & Masajes";

export interface Especialista {
  id: string;
  nombre: string;
  rol: string;
  telefono: string;
  porcentajeComision: number;
  colorAvatar: string;
  activo: boolean;
}

export interface ServicioPeluqueria {
  id: string;
  nombre: string;
  categoria: CategoriaServicio;
  duracionMinutos: number;
  precioUSD: number;
  descripcion: string;
  popular?: boolean;
}

export interface FichaTecnicaColorimetria {
  tonoNatural?: string;
  tonoDeseado?: string;
  formulaTinte?: string;
  historialDecoloracion?: string;
  sensibilidadAlergias?: string;
  bebidaPreferida?: string;
  observacionesEstilo?: string;
  ultimaActualizacion?: string;
}

export interface ClientePeluqueria {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  fechaNacimiento?: string;
  totalVisitas: number;
  fechaUltimaVisita: string;
  ultimoServicio?: string;
  especialistaPreferidoId?: string;
  totalGastadoUSD: number;
  fichaTecnica: FichaTecnicaColorimetria;
  notasGenerales?: string;
}

export interface CitaPeluqueria {
  id: string;
  clienteId?: string;
  clienteNombre: string;
  clienteTelefono: string;
  especialistaId: string;
  especialistaNombre: string;
  servicioId: string;
  servicioNombre: string;
  fecha: string;
  hora: string;
  duracionMinutos: number;
  precioEstimadoUSD: number;
  estado: CitaEstado;
  esWalkIn: boolean;
  notas?: string;
  fechaCreacion: string;
}

export interface TurnoWalkIn {
  id: string;
  clienteNombre: string;
  clienteTelefono: string;
  servicioSolicitado: string;
  precioEstimadoUSD: number;
  horaLlegada: string;
  especialistaId?: string;
  especialistaNombre?: string;
  sillonOTocador?: string;
  estado: "ESPERANDO" | "EN_SILLON" | "LISTO_COBRO" | "COBRADO";
  tiempoEsperaMinutos?: number;
  notas?: string;
}

export interface CobroServicioItem {
  nombre: string;
  precioUSD: number;
}

export interface TransaccionCobroPeluqueria {
  id: string;
  citaId?: string;
  turnoId?: string;
  clienteNombre: string;
  clienteTelefono?: string;
  fecha: string;
  hora: string;
  servicios: CobroServicioItem[];
  subtotalUSD: number;
  descuentoUSD: number;
  propinaUSD: number;
  totalUSD: number;
  tasaBcv: number;
  montoBs: number;
  metodoPago: MetodoPagoBelleza;
  referenciaPago?: string;
  especialistaId: string;
  especialistaNombre: string;
  porcentajeComision: number;
  montoComisionUSD: number;
  estado: "COBRADO" | "ANULADO";
}

export interface PresupuestoItem {
  descripcion: string;
  cantidad: number;
  precioUnitarioUSD: number;
}

export interface PresupuestoBelleza {
  id: string;
  codigo: string;
  clienteNombre: string;
  clienteTelefono: string;
  especialistaNombre: string;
  fecha: string;
  validezDias: number;
  items: PresupuestoItem[];
  totalUSD: number;
  notasTecnicas?: string;
}

export type PaginaPeluqueria = 
  | "agenda" 
  | "walkin" 
  | "clientes" 
  | "retencion" 
  | "caja" 
  | "presupuestos" 
  | "estadisticas" 
  | "servicios";
