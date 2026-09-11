import { useState, useMemo, useEffect, useRef } from "react";
import {
  IconHardware, IconPrescription, IconRetail, IconCard, IconSearch, IconTrash,
  IconCheck, IconWarning, IconClose, IconUsers, IconFileText, IconHourglass,
  IconDownload, IconRefresh, IconCheckCircle, IconBank,
} from "../Icons";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import {
  listarRepuestos,
  crearRepuesto,
  actualizarRepuesto,
  eliminarRepuesto,
  listarPresentacionesRepuesto,
  crearPresentacionRepuesto,
  despacharPorPresentacion,
  venderRepuestoPorVolumen,
  historialMovimientosRepuesto,
  listarProveedoresRepuesto,
  crearProveedorRepuesto,
  listarComprasRepuesto,
  registrarCompraRepuesto,
  type RepuestoItem,
  type PresentacionRepuesto,
  type MovimientoRepuesto,
  type ProveedorRepuesto,
} from "../api";

function IconShoppingCart({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function IconShoe({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 18h20v2H2z" />
      <path d="M4 18V9a3 3 0 0 1 3-3h2v4l5-2 6 2v8H4z" />
    </svg>
  );
}

function IconPerfume({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="5" y="8" width="14" height="13" rx="3" />
      <path d="M9 8V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
      <line x1="12" y1="4" x2="12" y2="2" />
      <circle cx="12" cy="14" r="2.5" />
    </svg>
  );
}

function IconLipstick({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 22h6V11H9z" />
      <path d="M10 11V7l4-4v8" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function IconCalculator({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="16" y1="14" x2="16" y2="18" />
      <path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01" />
    </svg>
  );
}

function IconGift({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TIPOS Y MODELOS
// ══════════════════════════════════════════════════════════════════════════
export type PerfilComercio = "ferreteria" | "farmacia" | "retail";

export interface ProductoComercio {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  rubro: PerfilComercio;
  precio: number;
  costo: number;
  stock: number;
  stockMinimo: number;
  // Específico Farmacia
  principioActivo?: string;
  lote?: string;
  fechaVencimiento?: string;
  laboratorio?: string;
  // Específico Ferretería / Repuestos
  unidadMedida?: string; // Pza, Kg, Mtr, Saco, Galón
  ubicacion?: string; // Pasillo 2, Estante B
  codigoParte?: string;
  marca?: string;
  backendId?: number;
  codigoOem?: string;
  precioMayorista?: number;
  precioContratista?: number;
  cantidadMinimaMayorista?: number;
  presentaciones?: PresentacionRepuesto[];
  unidadesConversion?: Array<{ unidad: string; factor: number; precio: number }>;
  ubicacionGalpon?: string;

  // Específico Calzado & Moda
  subrubro?: "calzado" | "perfumeria" | "maquillaje" | "alimentos" | "general" | string;
  genero?: "CABALLERO" | "DAMA" | "UNISEX" | "INFANTIL";
  variantesTalla?: Array<{ talla: string; stock: number; color?: string }>;
  color?: string;
  material?: string;

  // Específico Perfumería & Fragancias
  casaPerfume?: string;
  concentracion?: "EDT" | "EDP" | "PARFUM" | "ELIXIR" | "BODY_MIST" | "DECANT" | string;
  volumenMl?: number;
  familiaOlfativa?: string;
  esTester?: boolean;

  // Específico Maquillaje & Cosmética
  tonosCosmeticos?: Array<{ nombre: string; hex: string; stock: number }>;
  acabadoMaquillaje?: string;
  paoMeses?: number;
}

export interface LineaCarritoComercio {
  productoId: string;
  codigo: string;
  nombre: string;
  precio: number;
  cantidad: number;
  unidadMedida?: string;
  lote?: string;
  fechaVencimiento?: string;
  descuentoPct?: number;
  backendId?: number;
  precioOriginalDetal?: number;
  precioMayorista?: number;
  cantidadMinimaMayorista?: number;
  esMayorista?: boolean;
  presentacionId?: number;
  nombrePresentacion?: string;
  factorConversion?: number;
  tallaSeleccionada?: string;
  colorSeleccionado?: string;
  tonoSeleccionado?: { nombre: string; hex: string };
  esTester?: boolean;
  ubicacion?: string;
}

export interface ClienteComercio {
  id: string;
  nombre: string;
  documento: string; // V-12345678 o J-12345678-0
  telefono: string;
  direccion?: string;
  saldoPendiente: number;
  limiteCredito: number;
}

export interface VentaComercio {
  id: string;
  numero: string;
  cliente: ClienteComercio;
  lineas: LineaCarritoComercio[];
  fecha: string;
  total: number;
  totalBs: number;
  totalCop: number;
  metodoPago: string;
  esCredito: boolean;
  recibido?: number;
  monedaRecibida?: string;
  vuelto?: number;
  monedaVuelto?: string;
  esTicketRegalo?: boolean;
  fechaLimiteCambio?: string;
}

export interface CotizacionComercio {
  id: string;
  numero: string;
  cliente: ClienteComercio;
  lineas: LineaCarritoComercio[];
  fecha: string;
  validezDias: number;
  total: number;
  totalBs: number;
  totalCop: number;
}

// ══════════════════════════════════════════════════════════════════════════
// CATÁLOGO INICIAL OPTIMIZADO (FERRETERÍA, FARMACIA, RETAIL)
// ══════════════════════════════════════════════════════════════════════════
const PRODUCTOS_INICIALES: ProductoComercio[] = [
  // ─────────────────────────────────────────────────────────────
  // FERRETERÍA, CONSTRUCCIÓN & REPUESTOS (MULTI-UNIDADES & PRECIOS)
  // ─────────────────────────────────────────────────────────────
  { 
    id: "f-1", 
    codigo: "TORN-38", 
    nombre: "Tornillo Drywall 6x1\" Rosca Fina", 
    categoria: "Tornillería", 
    rubro: "ferreteria", 
    precio: 2.80, 
    precioContratista: 2.38,
    precioMayorista: 2.10,
    cantidadMinimaMayorista: 10,
    costo: 1.50, 
    stock: 145, 
    stockMinimo: 20, 
    unidadMedida: "Caja", 
    ubicacion: "Pasillo 1 - Gaveta 4", 
    ubicacionGalpon: "Galpón Central - Sección Tornillos",
    codigoParte: "DW-61",
    unidadesConversion: [
      { unidad: "Caja (100u)", factor: 1, precio: 2.80 },
      { unidad: "Millar (1000u)", factor: 10, precio: 24.50 },
    ]
  },
  { 
    id: "f-2", 
    codigo: "TAL-20V", 
    nombre: "Taladro Percutor Inalámbrico 20V Brushless", 
    categoria: "Herramientas", 
    rubro: "ferreteria", 
    precio: 68.00, 
    precioContratista: 59.50,
    precioMayorista: 53.00,
    cantidadMinimaMayorista: 3,
    costo: 45.00, 
    stock: 14, 
    stockMinimo: 3, 
    unidadMedida: "Pza", 
    ubicacion: "Vitrina Central A-1", 
    ubicacionGalpon: "Showroom / Mostrador",
    marca: "DeWalt / Ingco" 
  },
  { 
    id: "f-3", 
    codigo: "CAB-THW12", 
    nombre: "Cable Eléctrico 7 Hilos THW #12 Cobre 100%", 
    categoria: "Eléctrico", 
    rubro: "ferreteria", 
    precio: 0.95, 
    precioContratista: 0.82,
    precioMayorista: 0.72,
    cantidadMinimaMayorista: 50,
    costo: 0.60, 
    stock: 650, 
    stockMinimo: 80, 
    unidadMedida: "Metro", 
    ubicacion: "Bobina 3", 
    ubicacionGalpon: "Patio Eléctrico - Bobinero Principal",
    unidadesConversion: [
      { unidad: "Metro", factor: 1, precio: 0.95 },
      { unidad: "Rollo (100m)", factor: 100, precio: 82.00 },
    ]
  },
  { 
    id: "f-4", 
    codigo: "TUB-PVC4", 
    nombre: "Tubo PVC Aguas Negras 4\" x 3 Mts Reforzado", 
    categoria: "Plomería", 
    rubro: "ferreteria", 
    precio: 9.50, 
    precioContratista: 8.20,
    precioMayorista: 7.40,
    cantidadMinimaMayorista: 10,
    costo: 6.50, 
    stock: 48, 
    stockMinimo: 10, 
    unidadMedida: "Tubo", 
    ubicacion: "Patio Trasero - Rack Tubos", 
    ubicacionGalpon: "Galpón Abierto - Caballete 2",
    unidadesConversion: [
      { unidad: "Tubo 3m", factor: 1, precio: 9.50 },
      { unidad: "Atado (10 tubos)", factor: 10, precio: 88.00 },
    ]
  },
  { 
    id: "f-5", 
    codigo: "DISC-45", 
    nombre: "Disco de Corte Ultra Fino para Metal 4 1/2\" x 1mm", 
    categoria: "Herramientas", 
    rubro: "ferreteria", 
    precio: 1.25, 
    precioContratista: 1.05,
    precioMayorista: 0.92,
    cantidadMinimaMayorista: 25,
    costo: 0.70, 
    stock: 180, 
    stockMinimo: 30, 
    unidadMedida: "Pza", 
    ubicacion: "Pasillo 2 - Estante 1", 
    ubicacionGalpon: "Bodega de Consumibles",
    unidadesConversion: [
      { unidad: "Pieza", factor: 1, precio: 1.25 },
      { unidad: "Caja (25 unidades)", factor: 25, precio: 26.00 },
    ]
  },
  { 
    id: "f-6", 
    codigo: "CEM-T1", 
    nombre: "Cemento Gris Tipo I Portland 42.5kg", 
    categoria: "Construcción", 
    rubro: "ferreteria", 
    precio: 9.00, 
    precioContratista: 8.20,
    precioMayorista: 7.60,
    cantidadMinimaMayorista: 40,
    costo: 7.20, 
    stock: 240, 
    stockMinimo: 40, 
    unidadMedida: "Saco", 
    ubicacion: "Bodega Patio Techado", 
    ubicacionGalpon: "Galpón Cemento - Muelle de Carga 1",
    unidadesConversion: [
      { unidad: "Saco (42.5kg)", factor: 1, precio: 9.00 },
      { unidad: "Paleta (40 sacos)", factor: 40, precio: 340.00 },
    ]
  },
  { 
    id: "f-7", 
    codigo: "BLOQ-15", 
    nombre: "Bloque de Arcilla Estructural 15x20x30 cm", 
    categoria: "Construcción", 
    rubro: "ferreteria", 
    precio: 0.65, 
    precioContratista: 0.58,
    precioMayorista: 0.52,
    cantidadMinimaMayorista: 250,
    costo: 0.42, 
    stock: 1800, 
    stockMinimo: 300, 
    unidadMedida: "Unidad", 
    ubicacion: "Patio Abierto - Lote 1", 
    ubicacionGalpon: "Patio Descubierto Entrada",
    unidadesConversion: [
      { unidad: "Unidad", factor: 1, precio: 0.65 },
      { unidad: "Paleta (250u)", factor: 250, precio: 145.00 },
    ]
  },
  { 
    id: "f-8", 
    codigo: "PIN-CAU5", 
    nombre: "Pintura Caucho Clase A Blanco Puro Lavable", 
    categoria: "Pinturas", 
    rubro: "ferreteria", 
    precio: 12.50, 
    precioContratista: 10.80,
    precioMayorista: 9.80,
    cantidadMinimaMayorista: 4,
    costo: 8.50, 
    stock: 52, 
    stockMinimo: 10, 
    unidadMedida: "Galón", 
    ubicacion: "Pasillo Pinturas - Módulo 3", 
    ubicacionGalpon: "Almacén Pinturas y Solventes",
    unidadesConversion: [
      { unidad: "Galón (3.785 L)", factor: 1, precio: 12.50 },
      { unidad: "Cuñete (5 Galones)", factor: 5, precio: 54.00 },
    ]
  },
  { 
    id: "f-9", 
    codigo: "ARE-LAV", 
    nombre: "Arena Lavada para Friso y Concreto", 
    categoria: "Construcción", 
    rubro: "ferreteria", 
    precio: 25.00, 
    precioContratista: 22.00,
    precioMayorista: 19.50,
    cantidadMinimaMayorista: 6,
    costo: 16.00, 
    stock: 35, 
    stockMinimo: 8, 
    unidadMedida: "Metro Cúbico (m³)", 
    ubicacion: "Patio de Agregados - Tolva 1", 
    ubicacionGalpon: "Patio Pesado Silo Arena",
  },
  { 
    id: "f-10", 
    codigo: "PAS-HILUX", 
    nombre: "Pastillas de Freno Delanteras Hilux / Fortuner 2006-2022", 
    categoria: "Repuestos", 
    rubro: "ferreteria", 
    precio: 22.00, 
    precioContratista: 19.00,
    precioMayorista: 17.00,
    costo: 14.00, 
    stock: 18, 
    stockMinimo: 4, 
    unidadMedida: "Juego", 
    codigoParte: "04465-0K090", 
    marca: "Bendix / Toyota OEM",
    ubicacion: "Pasillo 4 - Estante Frenos",
  },
  { 
    id: "f-11", 
    codigo: "BUJ-BOSH", 
    nombre: "Bujía Iridium Doble Platino FR7DC+", 
    categoria: "Repuestos", 
    rubro: "ferreteria", 
    precio: 5.50, 
    precioContratista: 4.80,
    precioMayorista: 4.20,
    costo: 3.20, 
    stock: 46, 
    stockMinimo: 8, 
    unidadMedida: "Pza", 
    codigoParte: "FR7DC+", 
    marca: "Bosch",
    ubicacion: "Gavetero Eléctrico 2",
  },

  // ─────────────────────────────────────────────────────────────
  // RETAIL ESPECIALIZADO: CALZADO & ZAPATOS CON MATRIZ DE TALLAS
  // ─────────────────────────────────────────────────────────────
  {
    id: "ret-c1",
    codigo: "ZAP-AIRPRO",
    nombre: "Sneaker Urbano Retro Air Pro Runner",
    categoria: "Calzado",
    rubro: "retail",
    subrubro: "calzado",
    genero: "CABALLERO",
    material: "Malla transpirable y refuerzos TPU amortiguados",
    color: "Blanco / Negro Shadow",
    precio: 48.00,
    costo: 26.00,
    stock: 28,
    stockMinimo: 6,
    unidadMedida: "Par",
    ubicacion: "Estante Calzado Deportivo A-2",
    variantesTalla: [
      { talla: "38", stock: 2 },
      { talla: "39", stock: 4 },
      { talla: "40", stock: 6 },
      { talla: "41", stock: 8 },
      { talla: "42", stock: 5 },
      { talla: "43", stock: 2 },
      { talla: "44", stock: 1 },
    ],
  },
  {
    id: "ret-c2",
    codigo: "ZAP-OXFORD",
    nombre: "Zapato Formal Oxford Cuero Vacuno Legítimo",
    categoria: "Calzado",
    rubro: "retail",
    subrubro: "calzado",
    genero: "CABALLERO",
    material: "100% Cuero Genuino Glaseado, Forro Confort",
    color: "Marrón Caramelo",
    precio: 65.00,
    costo: 38.00,
    stock: 19,
    stockMinimo: 4,
    unidadMedida: "Par",
    ubicacion: "Vitrina Calzado Ejecutivo",
    variantesTalla: [
      { talla: "39", stock: 3 },
      { talla: "40", stock: 5 },
      { talla: "41", stock: 6 },
      { talla: "42", stock: 4 },
      { talla: "43", stock: 1 },
    ],
  },
  {
    id: "ret-c3",
    codigo: "ZAP-STIL",
    nombre: "Tacón Stiletto Glamour Nude Punta Fina 9cm",
    categoria: "Calzado",
    rubro: "retail",
    subrubro: "calzado",
    genero: "DAMA",
    material: "Gamuza aterciopelada y plantilla acolchada memory foam",
    color: "Nude Piel / Rosa Palo",
    precio: 42.00,
    costo: 22.00,
    stock: 22,
    stockMinimo: 5,
    unidadMedida: "Par",
    ubicacion: "Exhibidor Dama Isla 1",
    variantesTalla: [
      { talla: "35", stock: 2 },
      { talla: "36", stock: 5 },
      { talla: "37", stock: 7 },
      { talla: "38", stock: 5 },
      { talla: "39", stock: 2 },
      { talla: "40", stock: 1 },
    ],
  },
  {
    id: "ret-c4",
    codigo: "ZAP-BOTA-IND",
    nombre: "Bota de Seguridad Industrial Puntera de Acero Dieléctrica",
    categoria: "Calzado",
    rubro: "retail",
    subrubro: "calzado",
    genero: "UNISEX",
    material: "Cuero Nobuk hidrofugado y suela PU bi-densidad antiresbalante",
    color: "Negro Industrial",
    precio: 52.00,
    costo: 32.00,
    stock: 25,
    stockMinimo: 5,
    unidadMedida: "Par",
    ubicacion: "Rack Seguridad EPP",
    variantesTalla: [
      { talla: "38", stock: 3 },
      { talla: "39", stock: 4 },
      { talla: "40", stock: 6 },
      { talla: "41", stock: 6 },
      { talla: "42", stock: 3 },
      { talla: "43", stock: 2 },
      { talla: "44", stock: 1 },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // RETAIL ESPECIALIZADO: PERFUMERÍA & FRAGANCIAS DE LUJO
  // ─────────────────────────────────────────────────────────────
  {
    id: "ret-p1",
    codigo: "PERF-CHGG",
    nombre: "Good Girl Eau de Parfum 80ml (Original)",
    categoria: "Perfumería",
    rubro: "retail",
    subrubro: "perfumeria",
    casaPerfume: "Carolina Herrera",
    concentracion: "EDP",
    volumenMl: 80,
    familiaOlfativa: "Oriental Floral Gourmand (Jazmín Sambac, Haba Tonka)",
    esTester: false,
    precio: 115.00,
    costo: 78.00,
    stock: 9,
    stockMinimo: 2,
    unidadMedida: "Frasco",
    ubicacion: "Vitrina de Alta Fragancia A-1",
  },
  {
    id: "ret-p2",
    codigo: "PERF-SAUV-TESTER",
    nombre: "Sauvage Parfum 100ml (Probador / Tester Oficial)",
    categoria: "Perfumería",
    rubro: "retail",
    subrubro: "perfumeria",
    casaPerfume: "Dior",
    concentracion: "PARFUM",
    volumenMl: 100,
    familiaOlfativa: "Fougère Ambarado (Bergamota de Reggio, Cedro, Vainilla)",
    esTester: true,
    precio: 85.00,
    costo: 55.00,
    stock: 4,
    stockMinimo: 1,
    unidadMedida: "Frasco Tester",
    ubicacion: "Mostrador Probadores",
  },
  {
    id: "ret-p3",
    codigo: "PERF-CDN-INT",
    nombre: "Club De Nuit Intense Man EDT 105ml",
    categoria: "Perfumería",
    rubro: "retail",
    subrubro: "perfumeria",
    casaPerfume: "Armaf",
    concentracion: "EDT",
    volumenMl: 105,
    familiaOlfativa: "Amaderado Especiado (Limón, Grosella, Abedul ahumado)",
    esTester: false,
    precio: 38.00,
    costo: 24.00,
    stock: 16,
    stockMinimo: 4,
    unidadMedida: "Frasco",
    ubicacion: "Vitrina Caballeros",
  },
  {
    id: "ret-p4",
    codigo: "PERF-BAC540-DEC",
    nombre: "Baccarat Rouge 540 Extrait Decant 10ml",
    categoria: "Perfumería",
    rubro: "retail",
    subrubro: "perfumeria",
    casaPerfume: "Maison Francis Kurkdjian",
    concentracion: "DECANT",
    volumenMl: 10,
    familiaOlfativa: "Ámbar Floral Amaderado (Azafrán, Almendra amarga, Gris ámbar)",
    esTester: false,
    precio: 28.00,
    costo: 16.00,
    stock: 25,
    stockMinimo: 5,
    unidadMedida: "Atomizador 10ml",
    ubicacion: "Exhibidor Decants Nicho",
  },

  // ─────────────────────────────────────────────────────────────
  // RETAIL ESPECIALIZADO: MAQUILLAJE & COSMÉTICA PROFESIONAL
  // ─────────────────────────────────────────────────────────────
  {
    id: "ret-m1",
    codigo: "MAQ-BASE-FLAW",
    nombre: "Base Líquida Larga Duración Flawless Finish 30ml",
    categoria: "Maquillaje",
    rubro: "retail",
    subrubro: "maquillaje",
    acabadoMaquillaje: "Semi-Mate Natural HD",
    paoMeses: 12,
    precio: 14.50,
    costo: 7.20,
    stock: 45,
    stockMinimo: 10,
    unidadMedida: "Frasco",
    ubicacion: "Isla Rostro & Maquillaje",
    tonosCosmeticos: [
      { nombre: "110 Porcelana Fría", hex: "#F8D9C0", stock: 8 },
      { nombre: "120 Natural Cálido", hex: "#EAC098", stock: 12 },
      { nombre: "130 Beige Dorado", hex: "#D6A172", stock: 14 },
      { nombre: "140 Caramelo Honey", hex: "#B37B4D", stock: 7 },
      { nombre: "150 Mocha Intenso", hex: "#734827", stock: 4 },
    ],
  },
  {
    id: "ret-m2",
    codigo: "MAQ-LIP-MATE",
    nombre: "Labial Líquido Velvet Mate Indeleble 24H",
    categoria: "Maquillaje",
    rubro: "retail",
    subrubro: "maquillaje",
    acabadoMaquillaje: "Mate Aterciopelado Sin Transferencia",
    paoMeses: 18,
    precio: 7.50,
    costo: 3.50,
    stock: 36,
    stockMinimo: 8,
    unidadMedida: "Pza",
    ubicacion: "Torre Labiales",
    tonosCosmeticos: [
      { nombre: "01 Ruby Queen", hex: "#9B111E", stock: 12 },
      { nombre: "04 Nude Elegance", hex: "#C47E7A", stock: 15 },
      { nombre: "09 Berry Sunset", hex: "#5B1E31", stock: 9 },
    ],
  },
  {
    id: "ret-m3",
    codigo: "MAQ-POLV-BAN",
    nombre: "Polvo Translúcido Banana Touch Micro-pulverizado",
    categoria: "Maquillaje",
    rubro: "retail",
    subrubro: "maquillaje",
    acabadoMaquillaje: "Matificante Sellador Flash-Friendly",
    paoMeses: 24,
    precio: 9.00,
    costo: 4.20,
    stock: 28,
    stockMinimo: 6,
    unidadMedida: "Estuche",
    ubicacion: "Isla Polvos y Fijadores",
  },
  {
    id: "ret-m4",
    codigo: "MAQ-PAL-SUNSET",
    nombre: "Paleta de Sombras Sunset Glam 18 Tonos Ultra-Pigmentados",
    categoria: "Maquillaje",
    rubro: "retail",
    subrubro: "maquillaje",
    acabadoMaquillaje: "Mate, Shimmer y Glitter Prensado",
    paoMeses: 24,
    precio: 18.00,
    costo: 9.50,
    stock: 15,
    stockMinimo: 3,
    unidadMedida: "Paleta",
    ubicacion: "Exhibidor Ojos & Sombras",
  },

  // ─────────────────────────────────────────────────────────────
  // RETAIL / MINIMARKET CONVENIENCIA
  // ─────────────────────────────────────────────────────────────
  { id: "r-1", codigo: "HAR-PAN", nombre: "Harina de Maíz Blanco Precocida 1kg", categoria: "Alimentos", rubro: "retail", subrubro: "alimentos", precio: 1.15, costo: 0.88, stock: 140, stockMinimo: 30, unidadMedida: "Paquete" },
  { id: "r-2", codigo: "ARR-PRIM", nombre: "Arroz Blanco Extra Grano Largo 1kg", categoria: "Alimentos", rubro: "retail", subrubro: "alimentos", precio: 1.30, costo: 0.95, stock: 95, stockMinimo: 20, unidadMedida: "Paquete" },
  { id: "r-3", codigo: "ACE-SOYA", nombre: "Aceite Vegetal Comestible 1 Litro", categoria: "Alimentos", rubro: "retail", subrubro: "alimentos", precio: 2.50, costo: 1.85, stock: 48, stockMinimo: 15, unidadMedida: "Litro" },
  { id: "r-4", codigo: "REF-COCA2", nombre: "Refresco Sabor Cola 2 Litros", categoria: "Bebidas", rubro: "retail", subrubro: "alimentos", precio: 2.20, costo: 1.60, stock: 36, stockMinimo: 12, unidadMedida: "Botella" },
  { id: "r-5", codigo: "CAF-500G", nombre: "Café Molido Tostado Gourmet 500g", categoria: "Alimentos", rubro: "retail", subrubro: "alimentos", precio: 4.80, costo: 3.20, stock: 40, stockMinimo: 10, unidadMedida: "Bolsa" },

  // ─────────────────────────────────────────────────────────────
  // FARMACIA & DROGUERÍA
  // ─────────────────────────────────────────────────────────────
  { id: "m-1", codigo: "ACT-500", nombre: "Acetaminofén / Paracetamol 500mg x 10 Tab", categoria: "Analgésicos", rubro: "farmacia", precio: 1.20, costo: 0.60, stock: 85, stockMinimo: 20, principioActivo: "Paracetamol", lote: "LT-8842", fechaVencimiento: "2027-10", laboratorio: "Genven / Calox" },
  { id: "m-2", codigo: "IBU-400", nombre: "Ibuprofeno 400mg x 10 Cápsulas Blandas", categoria: "Analgésicos", rubro: "farmacia", precio: 1.80, costo: 0.95, stock: 60, stockMinimo: 15, principioActivo: "Ibuprofeno", lote: "LT-9102", fechaVencimiento: "2026-05", laboratorio: "Elmor / Ibufen" },
  { id: "m-3", codigo: "AMX-500", nombre: "Amoxicilina 500mg x 12 Cápsulas", categoria: "Antibióticos", rubro: "farmacia", precio: 3.50, costo: 2.10, stock: 32, stockMinimo: 10, principioActivo: "Amoxicilina", lote: "LT-7740", fechaVencimiento: "2026-08", laboratorio: "Leti" },
  { id: "m-4", codigo: "LOS-50", nombre: "Losartán Potásico 50mg x 30 Tabletas", categoria: "Cardiovascular", rubro: "farmacia", precio: 4.20, costo: 2.40, stock: 40, stockMinimo: 12, principioActivo: "Losartán", lote: "LT-6211", fechaVencimiento: "2027-12", laboratorio: "Calox" },
  { id: "m-5", codigo: "OME-20", nombre: "Omeprazol 20mg x 14 Cápsulas", categoria: "Gástrico", rubro: "farmacia", precio: 2.40, costo: 1.30, stock: 50, stockMinimo: 15, principioActivo: "Omeprazol", lote: "LT-5541", fechaVencimiento: "2027-03", laboratorio: "Genéricos" },
  { id: "m-6", codigo: "ALC-70", nombre: "Alcohol Antiséptico 70% 500ml", categoria: "Insumos", rubro: "farmacia", precio: 1.60, costo: 0.90, stock: 75, stockMinimo: 15, principioActivo: "Alcohol Isopropílico", lote: "LT-3329", fechaVencimiento: "2028-01", laboratorio: "Bialcohol" },
  { id: "m-7", codigo: "GAS-3X3", nombre: "Gasas Estériles 3\" x 3\" (Sobre 10u)", categoria: "Insumos", rubro: "farmacia", precio: 0.85, costo: 0.40, stock: 120, stockMinimo: 25, lote: "LT-2210", fechaVencimiento: "2028-09", laboratorio: "MedSupply" },
  { id: "m-8", codigo: "CMP-B", nombre: "Complejo B B12 Inyectable x 3 Ampollas", categoria: "Vitaminas", rubro: "farmacia", precio: 5.80, costo: 3.50, stock: 18, stockMinimo: 6, principioActivo: "Vitaminas B1, B6, B12", lote: "LT-1194", fechaVencimiento: "2026-04", laboratorio: "Bayer / Neurobión" },
];

const CLIENTES_INICIALES: ClienteComercio[] = [
  { id: "c-1", nombre: "Consumidor Final", documento: "V-00000000", telefono: "—", saldoPendiente: 0, limiteCredito: 0 },
  { id: "c-2", nombre: "Taller Mecánico Hermanos Ramos", documento: "J-31456789-2", telefono: "0414-7581290", saldoPendiente: 145.50, limiteCredito: 500 },
  { id: "c-3", nombre: "Constructora Andina C.A.", documento: "J-40982314-1", telefono: "0424-7128901", saldoPendiente: 380.00, limiteCredito: 1200 },
  { id: "c-4", nombre: "Dr. Marcos Peñaloza", documento: "V-14567890", telefono: "0412-6543210", saldoPendiente: 0, limiteCredito: 200 },
];

// ══════════════════════════════════════════════════════════════════════════
// IMPRESIÓN TÉRMICA UNIVERSAL PARA COMERCIO (80mm / 58mm)
// ══════════════════════════════════════════════════════════════════════════
function imprimirTicketComercio(venta: VentaComercio, nombreLocal: string, tasaActivaBs: number, tasaCop: number) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Recibo ${venta.numero}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body {
            font-family: 'Courier New', Courier, monospace, sans-serif;
            font-size: 12px;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 8px 6px;
            width: 76mm;
            line-height: 1.3;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .right { text-align: right; }
          .divider { border-top: 1px dashed #000; margin: 5px 0; }
          .item-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .item-sub { font-size: 10px; color: #444; margin-left: 6px; }
          .total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-top: 4px; }
          .footer { font-size: 10px; text-align: center; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 14px;">${nombreLocal}</div>
        <div class="center" style="font-size: 10px;">COMPROBANTE DE VENTA / POS</div>
        <div class="divider"></div>
        <div><strong>Recibo:</strong> ${venta.numero}</div>
        <div><strong>Fecha:</strong> ${venta.fecha}</div>
        <div><strong>Cliente:</strong> ${venta.cliente.nombre}</div>
        <div><strong>RIF/C.I.:</strong> ${venta.cliente.documento}</div>
        <div class="divider"></div>
        <div style="font-size: 10px;"><strong>CANT  DESCRIPCIÓN             TOTAL</strong></div>
        ${venta.lineas.map((l) => `
          <div class="item-row">
            <span style="flex: 1;">${l.cantidad}x ${l.nombre}</span>
            <span class="right bold">$${(l.precio * l.cantidad).toFixed(2)}</span>
          </div>
          ${l.tallaSeleccionada ? `<div class="item-sub">↳ Talla: ${l.tallaSeleccionada} ${l.colorSeleccionado ? `· Color: ${l.colorSeleccionado}` : ""}</div>` : ""}
          ${l.tonoSeleccionado ? `<div class="item-sub">↳ Tono Cosmético: ${l.tonoSeleccionado.nombre}</div>` : ""}
          ${l.lote ? `<div class="item-sub">↳ Lote: ${l.lote} (Vence: ${l.fechaVencimiento || "N/A"})</div>` : ""}
          ${l.unidadMedida ? `<div class="item-sub">↳ Unidad: ${l.unidadMedida}</div>` : ""}
        `).join("")}
        <div class="divider"></div>
        <div class="total-row">
          <span>TOTAL USD:</span>
          <span>$${venta.total.toFixed(2)}</span>
        </div>
        ${venta.totalBs ? `
          <div class="item-row bold">
            <span>TOTAL Bs:</span>
            <span>Bs. ${venta.totalBs.toFixed(2)}</span>
          </div>
        ` : ""}
        ${venta.totalCop ? `
          <div class="item-row">
            <span>TOTAL COP:</span>
            <span>COP $${venta.totalCop.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
          </div>
        ` : ""}
        <div class="divider"></div>
        <div><strong>Método:</strong> ${venta.esCredito ? "VENTA A CRÉDITO (CUENTA POR COBRAR)" : venta.metodoPago.replace("_", " ")}</div>
        ${venta.recibido != null && venta.recibido > 0 ? `<div><strong>Recibido:</strong> ${venta.monedaRecibida === "VES" ? "Bs. " : venta.monedaRecibida === "COP" ? "COP $" : "$"}${venta.recibido.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${venta.monedaRecibida || ""}</div>` : ""}
        ${venta.vuelto != null && venta.vuelto > 0.004 ? `<div class="bold">VUELTO: ${venta.monedaVuelto === "VES" ? "Bs. " : venta.monedaVuelto === "COP" ? "COP $" : "$"}${venta.vuelto.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${venta.monedaVuelto || "USD"}</div>` : ""}
        <div class="divider"></div>
        <div class="footer">¡Gracias por su compra!<br>Generado con Aurora Retail & Mostrador</div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch {}
    }, 3000);
  }, 250);
}

// ══════════════════════════════════════════════════════════════════════════
// TICKET DE REGALO / TICKET DE CAMBIO (GIFT RECEIPT - SIN PRECIOS)
// ══════════════════════════════════════════════════════════════════════════
function imprimirTicketRegalo(venta: VentaComercio, nombreLocal: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + 30);
  const fechaLimiteStr = fechaLimite.toLocaleDateString();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Ticket de Regalo ${venta.numero}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body {
            font-family: 'Courier New', Courier, monospace, sans-serif;
            font-size: 12px;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 8px 6px;
            width: 76mm;
            line-height: 1.3;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .right { text-align: right; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .item-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 11px; }
          .item-sub { font-size: 10px; color: #333; margin-left: 6px; }
          .gift-box { border: 1.5px solid #000; padding: 6px; margin: 8px 0; text-align: center; border-radius: 4px; }
          .footer { font-size: 9px; text-align: center; margin-top: 8px; line-height: 1.3; }
          .barcode { font-family: monospace; letter-spacing: 4px; font-size: 16px; font-weight: bold; margin: 8px 0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 14px;">${nombreLocal}</div>
        <div class="center bold" style="font-size: 11px; margin-top: 2px;">TICKET DE REGALO / COMPROBANTE DE CAMBIO</div>
        <div class="divider"></div>
        <div><strong>Recibo Ref:</strong> ${venta.numero}</div>
        <div><strong>Fecha Emisión:</strong> ${venta.fecha}</div>
        <div class="gift-box">
          <div class="bold" style="font-size: 11px;">VALIDEZ PARA CAMBIO HASTA:</div>
          <div class="bold" style="font-size: 15px; margin-top: 2px;">${fechaLimiteStr}</div>
          <div style="font-size: 9px; margin-top: 2px;">(30 días continuos a partir de la emisión)</div>
        </div>
        <div class="divider"></div>
        <div style="font-size: 10px;"><strong>CANT  DESCRIPCIÓN / VARIANTE SELECCIONADA</strong></div>
        ${venta.lineas.map((l) => `
          <div class="item-row">
            <span style="flex: 1; font-weight: bold;">${l.cantidad}x ${l.nombre}</span>
          </div>
          ${l.tallaSeleccionada ? `<div class="item-sub">↳ Talla: <strong>${l.tallaSeleccionada}</strong> ${l.colorSeleccionado ? `· Color: ${l.colorSeleccionado}` : ""}</div>` : ""}
          ${l.tonoSeleccionado ? `<div class="item-sub">↳ Tono Cosmético: <strong>${l.tonoSeleccionado.nombre}</strong></div>` : ""}
        `).join("")}
        <div class="divider"></div>
        <div class="center barcode">*${venta.numero.replace(/[^A-Z0-9]/g, "")}*</div>
        <div class="footer">
          <strong>POLÍTICAS DE CAMBIO:</strong><br>
          1. Indispensable presentar este ticket físico de regalo.<br>
          2. Calzado debe conservar caja original, etiquetas y suela impecable.<br>
          3. Perfumes y cosméticos solo aplican con precinto y empaque intacto.<br>
          4. No se realizan reintegros de dinero en efectivo; solo cambio por mercancía.<br>
          Generado con Aurora Retail POS
        </div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch {}
    }, 3000);
  }, 250);
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: COMERCIO & RETAIL APP
// ══════════════════════════════════════════════════════════════════════════
export default function ComercioApp({ onSalir }: { onSalir: () => void }) {
  const { user } = useAuth();

  // Rubro Activo: Ferretería, Farmacia o Retail (Cambiable con 1 clic)
  const [perfilActivo, setPerfilActivo] = useState<PerfilComercio>(() => {
    try {
      const guardado = localStorage.getItem("aurora_perfil_comercio");
      if (guardado === "farmacia" || guardado === "ferreteria" || guardado === "retail") return guardado;
      if (user?.industry === "farmacia") return "farmacia";
      if (user?.industry === "ferreteria") return "ferreteria";
      return "ferreteria";
    } catch {
      return "ferreteria";
    }
  });

  const cambiarPerfil = (nuevo: PerfilComercio) => {
    setPerfilActivo(nuevo);
    try { localStorage.setItem("aurora_perfil_comercio", nuevo); } catch {}
  };

  // Motor Multi-Tasa Fronterizo (USDT / BCV / COP / Propia)
  const [tipoTasaActiva, setTipoTasaActiva] = useState<"USDT" | "BCV" | "PERSONALIZADA">(() => {
    try { return (localStorage.getItem("aurora_tipo_tasa_activa") as any) || "USDT"; } catch { return "USDT"; }
  });
  const [tasaUsdtVal, setTasaUsdtVal] = useState(() => {
    try { return localStorage.getItem("aurora_tasa_usdt_val") || "65.50"; } catch { return "65.50"; }
  });
  const [tasaBcvVal, setTasaBcvVal] = useState("56.80");
  const [tasaCopVal, setTasaCopVal] = useState("4180");
  const [tasaPersVal, setTasaPersVal] = useState("");
  const [popoverTasa, setPopoverTasa] = useState(false);

  const tasaActivaBs = useMemo(() => {
    if (tipoTasaActiva === "USDT") return Number(tasaUsdtVal) || 65.50;
    if (tipoTasaActiva === "BCV") return Number(tasaBcvVal) || 56.80;
    return Number(tasaPersVal) || Number(tasaUsdtVal) || 65.50;
  }, [tipoTasaActiva, tasaUsdtVal, tasaBcvVal, tasaPersVal]);

  const tasaCop = Number(tasaCopVal) || 4180;

  // Tabs de Navegación
  const [tab, setTab] = useState<"pos" | "inventario" | "clientes" | "cierre">("pos");

  // Estado del Catálogo y Clientes
  const [productos, setProductos] = useState<ProductoComercio[]>(() => {
    try {
      const g = localStorage.getItem("aurora_comercio_productos_v4");
      return g ? JSON.parse(g) : PRODUCTOS_INICIALES;
    } catch {
      return PRODUCTOS_INICIALES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("aurora_comercio_productos_v4", JSON.stringify(productos));
    } catch {}
  }, [productos]);

  const [clientes, setClientes] = useState<ClienteComercio[]>(() => {
    try {
      const g = localStorage.getItem("aurora_comercio_clientes");
      return g ? JSON.parse(g) : CLIENTES_INICIALES;
    } catch {
      return CLIENTES_INICIALES;
    }
  });

  const [clienteSel, setClienteSel] = useState<ClienteComercio>(clientes[0]);

  // Carrito de Mostrador
  const [carrito, setCarrito] = useState<LineaCarritoComercio[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSel, setCategoriaSel] = useState("Todos");

  // Subrubro selector para Retail (Calzado, Perfumes, Maquillaje, Minimarket)
  const [subrubroRetailSel, setSubrubroRetailSel] = useState<string>("todos");

  // Nivel de Precio para Ferretería (Detal, Contratista -15%, Mayorista -25%)
  const [nivelPrecioFerreteria, setNivelPrecioFerreteria] = useState<"detal" | "contratista" | "mayorista">("detal");

  // Modal Matriz de Tallas para Calzado
  const [calzadoModalItem, setCalzadoModalItem] = useState<ProductoComercio | null>(null);
  const [tallaModalSel, setTallaModalSel] = useState<string>("");
  const [cantTallaModal, setCantTallaModal] = useState<number>(1);

  // Modal Muestrario de Tonos de Maquillaje
  const [maquillajeModalItem, setMaquillajeModalItem] = useState<ProductoComercio | null>(null);
  const [tonoModalSel, setTonoModalSel] = useState<{ nombre: string; hex: string } | null>(null);
  const [cantTonoModal, setCantTonoModal] = useState<number>(1);

  // Modal Calculadora Ferretera de Materiales de Obra
  const [modalCalculadora, setModalCalculadora] = useState(false);
  const [calcTipoObra, setCalcTipoObra] = useState<"pared" | "friso" | "piso">("pared");
  const [calcAreaM2, setCalcAreaM2] = useState<string>("30");
  const [calcEspesorCm, setCalcEspesorCm] = useState<string>("10");

  // Modales POS
  const [modalCobro, setModalCobro] = useState(false);
  const [metodoPagoSel, setMetodoPagoSel] = useState("EFECTIVO_USD");
  const [monedaRecibida, setMonedaRecibida] = useState<"USD" | "VES" | "COP">("USD");
  const [montoRecibido, setMontoRecibido] = useState("");
  const [monedaVuelto, setMonedaVuelto] = useState<"USD" | "VES" | "COP">("USD");
  const [emitirTicketRegaloCobro, setEmitirTicketRegaloCobro] = useState(false);
  const [ventaReciente, setVentaReciente] = useState<VentaComercio | null>(null);
  const [modalNuevoProducto, setModalNuevoProducto] = useState(false);
  const [clienteAbonoSel, setClienteAbonoSel] = useState<ClienteComercio | null>(null);
  const [montoAbono, setMontoAbono] = useState("");
  const [metodoAbono, setMetodoAbono] = useState("PAGO_MOVIL");

  // Estados de Integración Backend Ferretería & Repuestos
  const [cargandoBackend, setCargandoBackend] = useState(false);
  const [kardexModalItem, setKardexModalItem] = useState<ProductoComercio | null>(null);
  const [kardexMovimientos, setKardexMovimientos] = useState<MovimientoRepuesto[]>([]);
  const [kardexCargando, setKardexCargando] = useState(false);
  const [presentacionesModalItem, setPresentacionesModalItem] = useState<ProductoComercio | null>(null);
  const [presentacionesLista, setPresentacionesLista] = useState<PresentacionRepuesto[]>([]);
  const [presentacionesCargando, setPresentacionesCargando] = useState(false);
  const [modalCompraProveedor, setModalCompraProveedor] = useState(false);
  const [proveedoresRepuesto, setProveedoresRepuesto] = useState<ProveedorRepuesto[]>([]);
  const [cargandoCompra, setCargandoCompra] = useState(false);
  const [toast, setToast] = useState<{ tipo: "success" | "error" | "info"; mensaje: string } | null>(null);

  const mostrarToast = (mensaje: string, tipo: "success" | "error" | "info" = "success") => {
    setToast({ tipo, mensaje });
    setTimeout(() => setToast(null), 4000);
  };

  const cargarRepuestosBackend = async () => {
    if (!user?.tenantId) return;
    setCargandoBackend(true);
    try {
      const items = await listarRepuestos();
      if (items && items.length > 0) {
        const itemsTenant = items.filter((r) => r.tenantId === user.tenantId);
        if (itemsTenant.length > 0) {
          const mapeados: ProductoComercio[] = itemsTenant.map((r) => ({
            id: `rep-${r.id}`,
            backendId: r.id,
            codigo: r.codigoSku,
            codigoOem: r.codigoOriginalOem || "",
            nombre: r.descripcion,
            categoria: "Repuestos & Ferretería",
            rubro: "ferreteria",
            precio: r.precioVenta,
            costo: r.costoUnitario || 0,
            stock: r.stockActual,
            stockMinimo: 5,
            unidadMedida: r.unidadBase || "UNIDAD",
            codigoParte: r.codigoOriginalOem || undefined,
            precioMayorista: r.precioMayorista || undefined,
            cantidadMinimaMayorista: r.cantidadMinimaMayorista || undefined,
            ubicacion: "Almacén Central",
          }));
          setProductos((prev) => {
            const noFerreteria = prev.filter((p) => p.rubro !== "ferreteria");
            return [...noFerreteria, ...mapeados];
          });
        }
      }
    } catch (err) {
      console.warn("No se pudo conectar a /api/repuestos/items", err);
    } finally {
      setCargandoBackend(false);
    }
  };

  useEffect(() => {
    if (user?.tenantId && perfilActivo === "ferreteria") {
      cargarRepuestosBackend();
      listarProveedoresRepuesto().then(setProveedoresRepuesto).catch(() => {});
    }
  }, [user?.tenantId, perfilActivo]);

  useEffect(() => {
    if (kardexModalItem?.backendId) {
      setKardexCargando(true);
      historialMovimientosRepuesto(kardexModalItem.backendId)
        .then(setKardexMovimientos)
        .catch(() => setKardexMovimientos([]))
        .finally(() => setKardexCargando(false));
    }
  }, [kardexModalItem]);

  useEffect(() => {
    if (presentacionesModalItem?.backendId && user?.tenantId) {
      setPresentacionesCargando(true);
      listarPresentacionesRepuesto(user.tenantId, presentacionesModalItem.backendId)
        .then(setPresentacionesLista)
        .catch(() => setPresentacionesLista([]))
        .finally(() => setPresentacionesCargando(false));
    }
  }, [presentacionesModalItem, user?.tenantId]);

  // Atajos de teclado profesionales (F2 Buscar, F4 Cobrar, ESC Salir)
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "F4") {
        if (carrito.length > 0 && !modalCobro) {
          e.preventDefault();
          setModalCobro(true);
        }
      } else if (e.key === "Escape") {
        if (modalCobro) setModalCobro(false);
        else if (modalNuevoProducto) setModalNuevoProducto(false);
        else if (calzadoModalItem) setCalzadoModalItem(null);
        else if (maquillajeModalItem) setMaquillajeModalItem(null);
        else if (modalCalculadora) setModalCalculadora(false);
        else if (kardexModalItem) setKardexModalItem(null);
        else if (presentacionesModalItem) setPresentacionesModalItem(null);
        else if (modalCompraProveedor) setModalCompraProveedor(false);
        else if (ventaReciente) setVentaReciente(null);
        else if (busqueda) setBusqueda("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [carrito.length, modalCobro, modalNuevoProducto, calzadoModalItem, maquillajeModalItem, modalCalculadora, kardexModalItem, presentacionesModalItem, modalCompraProveedor, ventaReciente, busqueda]);

  // Arqueo Ciego
  const [desgloseCaja, setDesgloseCaja] = useState({ usd: "", ves: "", punto: "", pagoMovil: "", zelle: "", cop: "" });
  const [cajaCerradaMsg, setCajaCerradaMsg] = useState<string | null>(null);

  // Filtro de productos según perfil, subrubro y búsqueda
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideRubro = p.rubro === perfilActivo;
      const coincideSubrubro = perfilActivo !== "retail" || subrubroRetailSel === "todos" || p.subrubro === subrubroRetailSel;
      const coincideCat = categoriaSel === "Todos" || p.categoria === categoriaSel;
      const b = busqueda.toLowerCase().trim();
      const coincideBusqueda =
        !b ||
        p.nombre.toLowerCase().includes(b) ||
        p.codigo.toLowerCase().includes(b) ||
        (p.casaPerfume && p.casaPerfume.toLowerCase().includes(b)) ||
        (p.familiaOlfativa && p.familiaOlfativa.toLowerCase().includes(b)) ||
        (p.color && p.color.toLowerCase().includes(b)) ||
        (p.material && p.material.toLowerCase().includes(b)) ||
        (p.principioActivo && p.principioActivo.toLowerCase().includes(b)) ||
        (p.codigoParte && p.codigoParte.toLowerCase().includes(b)) ||
        (p.codigoOem && p.codigoOem.toLowerCase().includes(b)) ||
        (p.ubicacionGalpon && p.ubicacionGalpon.toLowerCase().includes(b)) ||
        (p.lote && p.lote.toLowerCase().includes(b));

      return coincideRubro && coincideSubrubro && coincideCat && coincideBusqueda;
    });
  }, [productos, perfilActivo, subrubroRetailSel, categoriaSel, busqueda]);

  // Categorías según perfil
  const categoriasDisponibles = useMemo(() => {
    const cats = new Set(productos.filter((p) => p.rubro === perfilActivo).map((p) => p.categoria));
    return ["Todos", ...Array.from(cats)];
  }, [productos, perfilActivo]);

  // Helper de clave única para líneas de carrito
  const obtenerLineKey = (item: { productoId: string; presentacionId?: number; tallaSeleccionada?: string; tonoSeleccionado?: { nombre: string }; unidadMedida?: string }) => {
    let k = item.productoId;
    if (item.presentacionId) k += `-pres-${item.presentacionId}`;
    if (item.tallaSeleccionada) k += `-talla-${item.tallaSeleccionada}`;
    if (item.tonoSeleccionado) k += `-tono-${item.tonoSeleccionado.nombre.replace(/\s+/g, "_")}`;
    if (item.unidadMedida && item.unidadMedida !== "Pza" && item.unidadMedida !== "Par" && item.unidadMedida !== "UNIDAD") {
      k += `-uni-${item.unidadMedida.replace(/\s+/g, "_")}`;
    }
    return k;
  };

  // Cálculos de Totales del Carrito
  const totalUSD = useMemo(() => {
    return carrito.reduce((acc, l) => acc + l.precio * l.cantidad, 0);
  }, [carrito]);

  const totalBs = useMemo(() => totalUSD * tasaActivaBs, [totalUSD, tasaActivaBs]);
  const totalCopCalculado = useMemo(() => totalUSD * tasaCop, [totalUSD, tasaCop]);

  // Agregar al carrito con soporte de presentaciones, matriz de tallas, tonos y escala de precios
  const agregarAlCarrito = (
    p: ProductoComercio,
    opciones?: {
      presentacion?: PresentacionRepuesto;
      talla?: string;
      color?: string;
      tono?: { nombre: string; hex: string };
      unidadCustom?: string;
      precioCustom?: number;
      factorConversion?: number;
      cantidad?: number;
    }
  ) => {
    let precioUnitario = opciones?.precioCustom ?? (opciones?.presentacion ? opciones.presentacion.precioVenta : p.precio);
    if (!opciones?.precioCustom && !opciones?.presentacion && perfilActivo === "ferreteria") {
      if (nivelPrecioFerreteria === "contratista") {
        precioUnitario = p.precioContratista || Number((p.precio * 0.85).toFixed(2));
      } else if (nivelPrecioFerreteria === "mayorista") {
        precioUnitario = p.precioMayorista || Number((p.precio * 0.75).toFixed(2));
      }
    }

    const unidadTxt = opciones?.unidadCustom || (opciones?.presentacion ? opciones.presentacion.nombrePresentacion : (p.unidadMedida || "Pza"));
    const cantAgregar = opciones?.cantidad ?? 1;

    let itemNombre = p.nombre;
    if (opciones?.presentacion) itemNombre += ` (${opciones.presentacion.nombrePresentacion})`;
    else if (opciones?.talla) itemNombre += ` [Talla ${opciones.talla}${opciones.color ? ` - ${opciones.color}` : ""}]`;
    else if (opciones?.tono) itemNombre += ` [Tono: ${opciones.tono.nombre}]`;
    else if (opciones?.unidadCustom && opciones.unidadCustom !== p.unidadMedida) itemNombre += ` [${opciones.unidadCustom}]`;

    const targetKey = obtenerLineKey({
      productoId: p.id,
      presentacionId: opciones?.presentacion?.id,
      tallaSeleccionada: opciones?.talla,
      tonoSeleccionado: opciones?.tono,
      unidadMedida: unidadTxt,
    });

    setCarrito((prev) => {
      const idx = prev.findIndex((it) => obtenerLineKey(it) === targetKey);

      if (idx >= 0) {
        const copy = [...prev];
        const nuevaCant = copy[idx].cantidad + cantAgregar;
        copy[idx].cantidad = nuevaCant;
        return copy;
      }

      const esMayoreo = !opciones?.presentacion && !!p.precioMayorista && !!p.cantidadMinimaMayorista && cantAgregar >= p.cantidadMinimaMayorista;

      return [
        ...prev,
        {
          productoId: p.id,
          backendId: p.backendId,
          codigo: p.codigo,
          nombre: itemNombre,
          precio: esMayoreo ? (p.precioMayorista || precioUnitario) : precioUnitario,
          precioOriginalDetal: p.precio,
          precioMayorista: p.precioMayorista,
          cantidadMinimaMayorista: p.cantidadMinimaMayorista,
          esMayorista: esMayoreo || nivelPrecioFerreteria === "mayorista",
          cantidad: cantAgregar,
          unidadMedida: unidadTxt,
          lote: p.lote,
          fechaVencimiento: p.fechaVencimiento,
          presentacionId: opciones?.presentacion?.id,
          nombrePresentacion: opciones?.presentacion?.nombrePresentacion,
          factorConversion: opciones?.factorConversion ?? opciones?.presentacion?.factorConversion ?? 1,
          tallaSeleccionada: opciones?.talla,
          colorSeleccionado: opciones?.color,
          tonoSeleccionado: opciones?.tono,
          esTester: p.esTester,
          ubicacion: p.ubicacionGalpon || p.ubicacion,
        },
      ];
    });
  };

  const cambiarCantidad = (key: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (obtenerLineKey(item) === key) {
            const nueva = item.cantidad + delta;
            if (nueva <= 0) return null;
            let precioFinal = item.precio;
            let esMay = item.esMayorista;
            if (!item.presentacionId && item.precioMayorista && item.cantidadMinimaMayorista) {
              if (nueva >= item.cantidadMinimaMayorista) {
                precioFinal = item.precioMayorista;
                esMay = true;
              } else {
                precioFinal = item.precioOriginalDetal || item.precio;
                esMay = false;
              }
            }
            return { ...item, cantidad: nueva, precio: precioFinal, esMayorista: esMay };
          }
          return item;
        })
        .filter(Boolean) as LineaCarritoComercio[]
    );
  };

  const quitarDelCarrito = (key: string) => {
    setCarrito((prev) => prev.filter((item) => obtenerLineKey(item) !== key));
  };

  // Manejar Clic en Tarjeta de Producto del Catálogo
  const manejarClickProducto = (p: ProductoComercio) => {
    if (p.rubro === "retail" && p.subrubro === "calzado" && p.variantesTalla && p.variantesTalla.length > 0) {
      setCalzadoModalItem(p);
      const primeraTalla = p.variantesTalla.find((v) => v.stock > 0)?.talla || p.variantesTalla[0].talla;
      setTallaModalSel(primeraTalla);
      setCantTallaModal(1);
      return;
    }
    if (p.rubro === "retail" && p.subrubro === "maquillaje" && p.tonosCosmeticos && p.tonosCosmeticos.length > 0) {
      setMaquillajeModalItem(p);
      const primerTono = p.tonosCosmeticos.find((t) => t.stock > 0) || p.tonosCosmeticos[0];
      setTonoModalSel(primerTono);
      setCantTonoModal(1);
      return;
    }
    agregarAlCarrito(p);
  };

  // Finalizar Cobro
  const ejecutarCobro = async (esCredito = false) => {
    if (carrito.length === 0) return;

    const numRecibo = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    
    // Calcular monto recibido en USD equivalente
    let recibidoEnUSD = totalUSD;
    const ingresado = parseFloat(montoRecibido);
    if (!isNaN(ingresado) && ingresado > 0) {
      if (monedaRecibida === "USD") recibidoEnUSD = ingresado;
      else if (monedaRecibida === "VES") recibidoEnUSD = ingresado / tasaActivaBs;
      else if (monedaRecibida === "COP") recibidoEnUSD = ingresado / tasaCop;
    }

    const vueltoUSD = Math.max(0, recibidoEnUSD - totalUSD);
    let vueltoFinal = vueltoUSD;
    if (monedaVuelto === "VES") vueltoFinal = vueltoUSD * tasaActivaBs;
    if (monedaVuelto === "COP") vueltoFinal = vueltoUSD * tasaCop;

    const nuevaVenta: VentaComercio = {
      id: String(Date.now()),
      numero: numRecibo,
      cliente: clienteSel,
      lineas: [...carrito],
      fecha: new Date().toLocaleString(),
      total: totalUSD,
      totalBs,
      totalCop: totalCopCalculado,
      metodoPago: esCredito ? "CREDITO_CUENTA" : metodoPagoSel,
      esCredito,
      recibido: esCredito ? 0 : (ingresado || (monedaRecibida === "VES" ? totalBs : monedaRecibida === "COP" ? totalCopCalculado : totalUSD)),
      monedaRecibida: esCredito ? "USD" : monedaRecibida,
      vuelto: vueltoFinal,
      monedaVuelto,
      esTicketRegalo: emitirTicketRegaloCobro,
      fechaLimiteCambio: emitirTicketRegaloCobro ? new Date(Date.now() + 30 * 24 * 3600 * 1000).toLocaleDateString() : undefined,
    };

    // Registrar en backend Spring Boot para Ferretería & Repuestos si hay tenant activo
    if (user?.tenantId && perfilActivo === "ferreteria") {
      try {
        for (const item of carrito) {
          if (!item.backendId) continue;
          const claveIdemp = `${numRecibo}-${item.backendId}-${item.presentacionId || "base"}-${Date.now()}`;
          if (item.presentacionId) {
            await despacharPorPresentacion(item.presentacionId, user.tenantId, item.cantidad, monedaRecibida, ingresado || undefined, claveIdemp);
          } else {
            await venderRepuestoPorVolumen(item.backendId, user.tenantId, item.cantidad, monedaRecibida, ingresado || undefined, claveIdemp);
          }
        }
        cargarRepuestosBackend();
        mostrarToast("Venta registrada y sincronizada en base de datos (Kárdex y Caja actualizados)", "success");
      } catch (err: any) {
        console.warn("Venta procesada localmente (alerta backend):", err);
        mostrarToast("Venta procesada con éxito", "info");
      }
    }

    // Descontar inventario localmente
    setProductos((prev) =>
      prev.map((prod) => {
        const items = carrito.filter((c) => c.productoId === prod.id);
        if (items.length > 0) {
          const totalCant = items.reduce((s, it) => s + (it.factorConversion ? it.cantidad * it.factorConversion : it.cantidad), 0);
          return { ...prod, stock: Math.max(0, prod.stock - totalCant) };
        }
        return prod;
      })
    );

    // Si es crédito, sumar a saldo del cliente
    if (esCredito && clienteSel.id !== "c-1") {
      setClientes((prev) =>
        prev.map((c) => (c.id === clienteSel.id ? { ...c, saldoPendiente: c.saldoPendiente + totalUSD } : c))
      );
    }

    setVentaReciente(nuevaVenta);
    setCarrito([]);
    setModalCobro(false);
    setMontoRecibido("");
    setEmitirTicketRegaloCobro(false);
  };

  // Generar Cotización PDF / Proforma
  const generarCotizacion = () => {
    if (carrito.length === 0) return;
    const num = `COT-${Math.floor(1000 + Math.random() * 9000)}`;
    const proforma = `
      ═══════════════════════════════════════════════════════════════════
      PRESUPUESTO / COTIZACIÓN FORMAL: ${num}
      Empresa: ${user?.empresa || "Aurora Comercial"}
      Fecha: ${new Date().toLocaleDateString()} · Validez: 5 días continuos
      Cliente: ${clienteSel.nombre} (${clienteSel.documento})
      ═══════════════════════════════════════════════════════════════════
      ${carrito.map((l) => `${l.cantidad}x ${l.nombre} | Unit: $${l.precio.toFixed(2)} | Subtotal: $${(l.precio * l.cantidad).toFixed(2)}`).join("\n      ")}
      ═══════════════════════════════════════════════════════════════════
      TOTAL REF. USD:  $${totalUSD.toFixed(2)}
      TOTAL BOLÍVARES: Bs. ${totalBs.toFixed(2)} (Tasa: ${tasaActivaBs.toFixed(2)})
      TOTAL COP:       COP $${totalCopCalculado.toLocaleString("en-US", { maximumFractionDigits: 0 })}
      ═══════════════════════════════════════════════════════════════════
      * Precios sujetos a cambio tras vencimiento de la cotización.
    `;
    const blob = new Blob([proforma], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Cotizacion_${num}_${clienteSel.nombre.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const nombreLocal = user?.empresa || (
    perfilActivo === "ferreteria" ? "Ferretería & Repuestos El Tornillo" :
    perfilActivo === "farmacia" ? "Farmacia & Droguería San Cristóbal" :
    "Comercio & Minimarket Express"
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Inter'] selection:bg-teal-500 selection:text-white">
      
      {/* ── HEADER SUPERIOR COMERCIAL: GLASSMORPHISM & MULTI-TASA ── */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        
        {/* Izquierda: Logo + Perfil Switcher */}
        <div className="flex items-center gap-4">
          <button
            onClick={onSalir}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
            title="Volver al Hub General"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                {perfilActivo === "farmacia" ? <IconPrescription size={18} className="text-teal-400" /> :
                 perfilActivo === "ferreteria" ? <IconHardware size={18} className="text-teal-400" /> :
                 <IconRetail size={18} className="text-teal-400" />}
              </div>
            </div>
            <div>
              <div className="font-['Outfit'] font-black text-base text-white leading-tight flex items-center gap-1.5">
                <span>{nombreLocal}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/30 font-mono">
                  {perfilActivo.toUpperCase()}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 tracking-wider uppercase">
                Aurora Retail · Sistema de Mostrador
              </div>
            </div>
          </button>

          {/* Switcher Rápido de Perfil Comercial */}
          <div className="hidden md:flex items-center gap-1 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs">
            <button
              onClick={() => cambiarPerfil("ferreteria")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                perfilActivo === "ferreteria" ? "bg-teal-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              <IconHardware size={14} />
              <span>Ferretería & Repuestos</span>
            </button>
            <button
              onClick={() => cambiarPerfil("farmacia")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                perfilActivo === "farmacia" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              <IconPrescription size={14} />
              <span>Farmacia & Lotes</span>
            </button>
            <button
              onClick={() => cambiarPerfil("retail")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                perfilActivo === "retail" ? "bg-cyan-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              <IconRetail size={14} />
              <span>Retail (Calzado, Fragancias, Belleza)</span>
            </button>
          </div>
        </div>

        {/* Centro: Pestañas Principales */}
        <nav className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-full border border-slate-700/50 text-xs">
          <button
            onClick={() => setTab("pos")}
            className={`px-4 py-1.5 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === "pos" ? "bg-teal-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <IconRetail size={14} />
            <span>POS Mostrador</span>
          </button>
          <button
            onClick={() => setTab("inventario")}
            className={`px-4 py-1.5 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === "inventario" ? "bg-teal-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <IconHardware size={14} />
            <span>Inventario & Kárdex</span>
          </button>
          <button
            onClick={() => setTab("clientes")}
            className={`px-4 py-1.5 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === "clientes" ? "bg-teal-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <IconUsers size={14} />
            <span>Clientes & Crédito</span>
          </button>
          <button
            onClick={() => setTab("cierre")}
            className={`px-4 py-1.5 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === "cierre" ? "bg-teal-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <IconBank size={14} />
            <span>Cierre Z</span>
          </button>
        </nav>

        {/* Derecha: Multi-Tasa Badge + Salir */}
        <div className="flex items-center gap-2.5">
          {/* Badge de Tasa Flotante */}
          <div className="relative">
            <button
              onClick={() => setPopoverTasa((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-teal-500/30 text-xs font-mono font-bold hover:border-teal-400 transition-all cursor-pointer shadow-inner"
              title="Cambiar tasa activa (USDT / BCV / COP)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-teal-400">{tipoTasaActiva}: Bs. {tasaActivaBs.toFixed(2)}</span>
              <span className="text-slate-400 text-[10px]">· COP {tasaCop.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              <span className="text-slate-500 text-[9px]">▼</span>
            </button>

            {popoverTasa && (
              <div className="absolute right-0 mt-2 z-50 w-72 bg-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-700 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-white">Tasa Activa para Venta</span>
                  <button onClick={() => setPopoverTasa(false)} className="text-slate-400 hover:text-white cursor-pointer"><IconClose size={14} /></button>
                </div>

                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-800 rounded-xl text-xs">
                  <button
                    onClick={() => { setTipoTasaActiva("USDT"); try { localStorage.setItem("aurora_tipo_tasa_activa", "USDT"); } catch {} }}
                    className={`py-1 rounded-lg font-bold cursor-pointer ${tipoTasaActiva === "USDT" ? "bg-emerald-600 text-white" : "text-slate-400"}`}
                  >USDT</button>
                  <button
                    onClick={() => { setTipoTasaActiva("BCV"); try { localStorage.setItem("aurora_tipo_tasa_activa", "BCV"); } catch {} }}
                    className={`py-1 rounded-lg font-bold cursor-pointer ${tipoTasaActiva === "BCV" ? "bg-teal-600 text-white" : "text-slate-400"}`}
                  >BCV Oficial</button>
                  <button
                    onClick={() => { setTipoTasaActiva("PERSONALIZADA"); try { localStorage.setItem("aurora_tipo_tasa_activa", "PERSONALIZADA"); } catch {} }}
                    className={`py-1 rounded-lg font-bold cursor-pointer ${tipoTasaActiva === "PERSONALIZADA" ? "bg-amber-600 text-white" : "text-slate-400"}`}
                  >Propia</button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">Tasa USDT ($):</span>
                    <input
                      type="number" step="0.01" value={tasaUsdtVal}
                      onChange={(e) => { setTasaUsdtVal(e.target.value); try { localStorage.setItem("aurora_tasa_usdt_val", e.target.value); } catch {} }}
                      className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-right text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">Tasa BCV ($):</span>
                    <input
                      type="number" step="0.01" value={tasaBcvVal}
                      onChange={(e) => setTasaBcvVal(e.target.value)}
                      className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-right text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">Pesos COP:</span>
                    <input
                      type="number" step="1" value={tasaCopVal}
                      onChange={(e) => setTasaCopVal(e.target.value)}
                      className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-right text-xs"
                    />
                  </div>
                  {tipoTasaActiva === "PERSONALIZADA" && (
                    <div className="flex items-center justify-between gap-2 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                      <span className="text-[11px] text-amber-300 font-bold">Propia (Bs):</span>
                      <input
                        type="number" step="0.01" placeholder="Ej. 66.50" value={tasaPersVal}
                        onChange={(e) => setTasaPersVal(e.target.value)}
                        className="w-24 px-2 py-1 rounded bg-slate-800 border border-amber-500/40 font-mono text-right text-xs font-bold text-amber-300"
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setPopoverTasa(false)}
                  className="w-full py-1.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-teal-400"
                >Aplicar tasas al POS</button>
              </div>
            )}
          </div>

          <ThemeToggle />

          <button
            onClick={onSalir}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Salir al Hub
          </button>
        </div>
      </header>

      {/* ── CONTENIDO SEGÚN LA PESTAÑA SELECCIONADA ── */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 overflow-hidden flex flex-col">
        
        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: POS MOSTRADOR ULTRA RÁPIDO
            ══════════════════════════════════════════════════════════════════ */}
        {tab === "pos" && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-115px)]">
            
            {/* Columna Izquierda (7 cols): Catálogo, Buscador & Categorías */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full bg-slate-900/60 rounded-3xl p-4 sm:p-5 border border-slate-800 overflow-hidden shadow-xl">
              
              {/* Barra de Búsqueda Reactiva */}
              <div className="relative mb-3 flex-shrink-0">
                <IconSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={
                    perfilActivo === "farmacia"
                      ? "Buscar por medicamento, principio activo (ej. Paracetamol), lote o escanear código..."
                      : perfilActivo === "ferreteria"
                      ? "Buscar por producto, medida, cable, cemento, código OEM, tornillo o ubicación..."
                      : "Buscar zapato, sneaker, fragancia, marca (Dior, Carolina Herrera), tono de base o labial..."
                  }
                  className="w-full pl-10 pr-20 py-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 focus:border-teal-500 text-sm text-white placeholder-slate-400 focus:outline-none shadow-inner"
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {busqueda && (
                    <button onClick={() => setBusqueda("")} className="text-slate-400 hover:text-white mr-1 cursor-pointer">
                      <IconClose size={16} />
                    </button>
                  )}
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-700/80 border border-slate-600 text-[10px] font-mono text-slate-400 font-bold" title="Presiona F2 para buscar rápido">
                    F2
                  </kbd>
                </div>
              </div>

              {/* Barra de Especialización: Ferretería (Nivel de Precios + Calculadora) */}
              {perfilActivo === "ferreteria" && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-800/80 rounded-2xl border border-slate-700/70 mb-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Escala Precio:</span>
                    <div className="inline-flex rounded-xl bg-slate-900 p-0.5 border border-slate-700/80 text-xs">
                      <button
                        onClick={() => setNivelPrecioFerreteria("detal")}
                        className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          nivelPrecioFerreteria === "detal" ? "bg-teal-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Detal (PVP)
                      </button>
                      <button
                        onClick={() => setNivelPrecioFerreteria("contratista")}
                        className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          nivelPrecioFerreteria === "contratista" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Contratista (-15%)
                      </button>
                      <button
                        onClick={() => setNivelPrecioFerreteria("mayorista")}
                        className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          nivelPrecioFerreteria === "mayorista" ? "bg-emerald-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Mayorista (-25%)
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setModalCalculadora(true)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500/20 to-cyan-500/20 hover:from-teal-500/30 hover:to-cyan-500/30 border border-teal-500/40 text-teal-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                    title="Calcular cantidades de bloques, cemento y arena para paredes, pisos o frisos"
                  >
                    <IconCalculator size={15} />
                    <span>Calculadora de Obra</span>
                  </button>
                </div>
              )}

              {/* Barra de Especialización: Retail Sub-líneas (Calzado, Perfumes, Maquillaje, Minimarket) */}
              {perfilActivo === "retail" && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-3 flex-shrink-0 scrollbar-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 pl-1">Línea:</span>
                  {[
                    { id: "todos", label: "Todo el Catálogo", icon: null },
                    { id: "calzado", label: "Calzado & Zapatos", icon: <IconShoe size={14} /> },
                    { id: "perfumeria", label: "Perfumes & Fragancias", icon: <IconPerfume size={14} /> },
                    { id: "maquillaje", label: "Cosmética & Maquillaje", icon: <IconLipstick size={14} /> },
                    { id: "alimentos", label: "Minimarket & Víveres", icon: <IconRetail size={14} /> },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setSubrubroRetailSel(sub.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                        subrubroRetailSel === sub.id
                          ? "bg-gradient-to-r from-teal-500 to-cyan-400 text-slate-950 shadow-md font-black"
                          : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60"
                      }`}
                    >
                      {sub.icon}
                      <span>{sub.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Categorías Rápidas */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 flex-shrink-0 scrollbar-none">
                {categoriasDisponibles.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaSel(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      categoriaSel === cat
                        ? "bg-teal-500 text-slate-950 shadow-md"
                        : "bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid de Productos Especializados */}
              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
                {productosFiltrados.map((p) => {
                  const bajoStock = p.stock <= p.stockMinimo;
                  
                  // Precio efectivo según nivel seleccionado en ferretería
                  let precioEfectivo = p.precio;
                  if (perfilActivo === "ferreteria") {
                    if (nivelPrecioFerreteria === "contratista") precioEfectivo = p.precioContratista || Number((p.precio * 0.85).toFixed(2));
                    else if (nivelPrecioFerreteria === "mayorista") precioEfectivo = p.precioMayorista || Number((p.precio * 0.75).toFixed(2));
                  }

                  const esCalzado = p.rubro === "retail" && p.subrubro === "calzado";
                  const esPerfume = p.rubro === "retail" && p.subrubro === "perfumeria";
                  const esMaquillaje = p.rubro === "retail" && p.subrubro === "maquillaje";
                  const esFerreteria = p.rubro === "ferreteria";

                  return (
                    <div
                      key={p.id}
                      className="group bg-slate-800/40 hover:bg-slate-800/80 p-3 rounded-2xl border border-slate-700/50 hover:border-teal-500/50 transition-all text-left flex flex-col justify-between shadow-sm relative overflow-hidden"
                    >
                      <div className="space-y-1.5">
                        {/* Cabecera de la Tarjeta */}
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-mono text-slate-400">{p.codigo}</span>
                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                            p.stock <= 0 ? "bg-red-500/20 text-red-400" :
                            bajoStock ? "bg-amber-500/20 text-amber-400" :
                            "bg-teal-500/20 text-teal-400"
                          }`}>
                            Stock: {p.stock} {p.unidadMedida || "und"}
                          </span>
                        </div>

                        {/* Nombre del Producto */}
                        <div className="font-bold text-xs sm:text-sm text-white group-hover:text-teal-300 transition-colors line-clamp-2">
                          {p.nombre}
                        </div>

                        {/* Detalle Especializado: Calzado */}
                        {esCalzado && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-teal-300">
                              <IconShoe size={12} />
                              <span className="font-bold">{p.genero}</span>
                              {p.color && <span className="text-slate-400">· {p.color}</span>}
                            </div>
                            {p.variantesTalla && (
                              <div className="text-[9px] text-slate-300 bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-700/60 flex items-center justify-between">
                                <span>Tallas {p.variantesTalla[0].talla}-{p.variantesTalla[p.variantesTalla.length - 1].talla}</span>
                                <span className="text-teal-400 font-bold">{p.variantesTalla.reduce((s, v) => s + v.stock, 0)} pares</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Detalle Especializado: Perfumería */}
                        {esPerfume && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-cyan-300">{p.casaPerfume}</span>
                              <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-mono font-bold">
                                {p.concentracion} · {p.volumenMl}ml
                              </span>
                            </div>
                            {p.esTester ? (
                              <div className="text-[9px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold">
                                PROBADOR / TESTER OFICIAL
                              </div>
                            ) : p.familiaOlfativa ? (
                              <div className="text-[9px] text-slate-400 truncate">
                                {p.familiaOlfativa}
                              </div>
                            ) : null}
                          </div>
                        )}

                        {/* Detalle Especializado: Maquillaje */}
                        {esMaquillaje && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-purple-300 font-semibold">
                              <span>{p.acabadoMaquillaje || "Acabado HD"}</span>
                              {p.paoMeses && <span className="text-[9px] font-mono text-slate-400">{p.paoMeses}M PAO</span>}
                            </div>
                            {p.tonosCosmeticos && (
                              <div className="flex items-center gap-1.5 pt-0.5">
                                {p.tonosCosmeticos.slice(0, 5).map((t, idx) => (
                                  <span
                                    key={idx}
                                    title={`${t.nombre} (Stock: ${t.stock})`}
                                    style={{ backgroundColor: t.hex }}
                                    className="w-4 h-4 rounded-full border border-white/30 shadow-inner inline-block"
                                  />
                                ))}
                                {p.tonosCosmeticos.length > 5 && (
                                  <span className="text-[9px] text-slate-400 font-bold">+{p.tonosCosmeticos.length - 5}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Detalle Especializado: Ferretería & Repuestos */}
                        {esFerreteria && (
                          <div className="space-y-1">
                            {p.ubicacionGalpon ? (
                              <div className="text-[9px] text-slate-300 truncate">
                                📍 {p.ubicacionGalpon}
                              </div>
                            ) : p.ubicacion ? (
                              <div className="text-[9px] text-slate-400 truncate">
                                📍 {p.ubicacion}
                              </div>
                            ) : null}

                            {p.codigoOem && (
                              <div className="text-[9px] text-cyan-400 font-mono truncate">
                                OEM: {p.codigoOem}
                              </div>
                            )}

                            {/* Botones de Conversión Rápida (Metro vs Rollo, Saco vs Paleta) */}
                            {p.unidadesConversion && p.unidadesConversion.length > 1 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {p.unidadesConversion.map((conv, cIdx) => (
                                  <button
                                    key={cIdx}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      agregarAlCarrito(p, {
                                        unidadCustom: conv.unidad,
                                        factorConversion: conv.factor,
                                        precioCustom: conv.precio,
                                        cantidad: 1,
                                      });
                                      mostrarToast(`Agregado: ${conv.unidad} (${p.nombre})`, "success");
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[9px] font-bold cursor-pointer transition-colors"
                                    title={`Vender en ${conv.unidad} a $${conv.precio.toFixed(2)}`}
                                  >
                                    {conv.unidad.split(" ")[0]}: ${conv.precio.toFixed(2)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Detalle Especializado: Farmacia */}
                        {p.principioActivo && (
                          <div className="text-[10px] text-emerald-400 font-semibold truncate">
                            {p.principioActivo}
                          </div>
                        )}
                      </div>

                      {/* Pie de la Tarjeta con Precio y Botón de Acción */}
                      <div className="mt-3 pt-2 border-t border-slate-700/40 flex items-baseline justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-mono font-black text-sm text-teal-400">
                              ${precioEfectivo.toFixed(2)}
                            </span>
                            {precioEfectivo !== p.precio && (
                              <span className="text-[9px] font-mono line-through text-slate-500">
                                ${p.precio.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            ≈ Bs. {(precioEfectivo * tasaActivaBs).toFixed(2)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => manejarClickProducto(p)}
                          className="px-2.5 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500 text-teal-300 hover:text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                          title={esCalzado ? "Abrir matriz de tallas" : esMaquillaje ? "Elegir tono cosmético" : "Agregar al carrito"}
                        >
                          {esCalzado ? <span>Talla</span> : esMaquillaje ? <span>Tono</span> : <span>+ Vender</span>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Columna Derecha (5 cols): Carrito de Venta & Cobro */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full bg-slate-900 rounded-3xl border border-slate-800 p-4 sm:p-5 shadow-2xl overflow-hidden">
              
              {/* Selector de Cliente */}
              <div className="flex-shrink-0 pb-3 mb-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cliente en Mostrador</label>
                  <select
                    value={clienteSel.id}
                    onChange={(e) => setClienteSel(clientes.find((c) => c.id === e.target.value) || clientes[0])}
                    className="bg-slate-800 text-xs font-bold text-white rounded-xl px-2.5 py-1.5 border border-slate-700 focus:outline-none mt-1"
                  >
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({c.documento})
                      </option>
                    ))}
                  </select>
                </div>
                {clienteSel.saldoPendiente > 0 && (
                  <div className="text-right">
                    <span className="text-[9px] text-amber-400 font-bold block">Deuda Pendiente:</span>
                    <span className="font-mono text-xs font-bold text-amber-300">${clienteSel.saldoPendiente.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Lista de Ítems en Venta */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px]">
                {carrito.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-4">
                    <IconShoppingCart size={36} className="text-slate-600 mb-2 opacity-60" />
                    <p className="text-xs font-semibold text-slate-400">El carrito está vacío</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">Toca un producto del catálogo o escanea para vender.</p>
                  </div>
                ) : (
                  carrito.map((l) => {
                    const lineKey = obtenerLineKey(l);
                    return (
                      <div key={lineKey} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1.5 hover:border-slate-600 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate flex items-center gap-1.5 flex-wrap">
                              <span>{l.nombre}</span>
                              {l.tallaSeleccionada && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                                  Talla {l.tallaSeleccionada}
                                </span>
                              )}
                              {l.tonoSeleccionado && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30 inline-flex items-center gap-1">
                                  <span
                                    className="w-2 h-2 rounded-full border border-white/50 shrink-0 inline-block"
                                    style={{ backgroundColor: l.tonoSeleccionado.hex }}
                                  />
                                  {l.tonoSeleccionado.nombre}
                                </span>
                              )}
                              {l.esTester && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                                  TESTER
                                </span>
                              )}
                              {l.esMayorista && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                  MAYORISTA
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                              <span>${l.precio.toFixed(2)} c/u</span>
                              {l.esMayorista && <span className="text-emerald-400 font-semibold">(Escala Mayor)</span>}
                              {l.ubicacion && <span className="text-slate-500 text-[9px]">Ubic: {l.ubicacion}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => cambiarCantidad(lineKey, -1)} className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs cursor-pointer flex items-center justify-center">−</button>
                            <span className="w-5 text-center font-bold text-xs font-mono">{l.cantidad}</span>
                            <button onClick={() => cambiarCantidad(lineKey, 1)} className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs cursor-pointer flex items-center justify-center">+</button>
                            <button onClick={() => quitarDelCarrito(lineKey)} className="w-6 h-6 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center ml-1 cursor-pointer">
                              <IconTrash size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-800/60">
                          {l.lote && <span className="font-mono text-emerald-400">Lote: {l.lote}</span>}
                          {l.unidadMedida && <span>Unidad: {l.unidadMedida}</span>}
                          <span className="font-mono font-bold text-teal-300 ml-auto">${(l.precio * l.cantidad).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Totalizador & Acciones Comerciales */}
              <div className="flex-shrink-0 pt-3 border-t border-slate-800 space-y-3">
                <div className="space-y-1 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold">TOTAL USD:</span>
                    <span className="font-mono font-black text-xl text-teal-400">${totalUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Total Bolívares (Bs):</span>
                    <span className="text-slate-200 font-bold">Bs. {totalBs.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Total Pesos (COP):</span>
                    <span className="text-slate-300 font-bold">COP ${totalCopCalculado.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                {/* Botones de Acción de Venta */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={generarCotizacion}
                    disabled={carrito.length === 0}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Descargar presupuesto formal para cliente"
                  >
                    <IconFileText size={14} />
                    <span>📄 Cotización</span>
                  </button>

                  <button
                    onClick={() => ejecutarCobro(true)}
                    disabled={carrito.length === 0 || clienteSel.id === "c-1"}
                    className="py-2 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 disabled:opacity-40 text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Cargar a cuenta por cobrar (crédito)"
                  >
                    <span>🤝 A Crédito</span>
                  </button>
                </div>

                <button
                  onClick={() => setModalCobro(true)}
                  disabled={carrito.length === 0}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-black text-sm cursor-pointer hover:opacity-95 disabled:opacity-40 shadow-[0_0_20px_rgba(45,212,191,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  <span>💰 Cobrar en Mostrador (${totalUSD.toFixed(2)})</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-950/25 text-[10px] font-mono text-slate-950 font-black">
                    F4
                  </kbd>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: INVENTARIO, LOTES & KARDEX
            ══════════════════════════════════════════════════════════════════ */}
        {tab === "inventario" && (
          <div className="flex-1 bg-slate-900/80 rounded-3xl border border-slate-800 p-5 flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-white">Control de Inventario & Stock</h3>
                <p className="text-xs text-slate-400">
                  {perfilActivo === "ferreteria" 
                    ? "Kárdex auditable, presentaciones fraccionadas, escala mayorista y compras a proveedores."
                    : "Catálogo de productos, existencias, lotes y precios de venta."}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {perfilActivo === "ferreteria" && (
                  <>
                    <button
                      onClick={() => cargarRepuestosBackend()}
                      disabled={cargandoBackend}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer border border-slate-700 flex items-center gap-1.5 transition-colors"
                      title="Sincronizar catálogo con base de datos"
                    >
                      <IconRefresh size={14} className={cargandoBackend ? "animate-spin" : ""} />
                      <span>{cargandoBackend ? "Sincronizando..." : "Sincronizar DB"}</span>
                    </button>
                    <button
                      onClick={() => setModalCompraProveedor(true)}
                      className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer shadow-md flex items-center gap-1.5 transition-colors"
                    >
                      <span>📦 Registrar Compra (Proveedor)</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setModalNuevoProducto(true)}
                  className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-teal-400 shadow-md transition-colors"
                >
                  + Nuevo {perfilActivo === "ferreteria" ? "Repuesto / Artículo" : "Producto"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-slate-300 font-bold uppercase tracking-wider sticky top-0 text-[11px]">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Producto</th>
                    <th className="p-3">Categoría</th>
                    {perfilActivo === "farmacia" && <th className="p-3">Principio Activo</th>}
                    {perfilActivo === "farmacia" && <th className="p-3">Lote / Vence</th>}
                    {perfilActivo === "ferreteria" && <th className="p-3">Unidad / Ubicación</th>}
                    {perfilActivo === "ferreteria" && <th className="p-3">Escala Mayorista</th>}
                    <th className="p-3 text-right">Stock</th>
                    {perfilActivo === "ferreteria" && <th className="p-3 text-right">Último Costo</th>}
                    <th className="p-3 text-right">Precio USD</th>
                    <th className="p-3 text-right">Precio Bs</th>
                    {perfilActivo === "ferreteria" && <th className="p-3 text-center">Gestión</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {productos.filter((p) => p.rubro === perfilActivo).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="p-3 text-slate-400">
                        <div>{p.codigo}</div>
                        {p.codigoOem && <div className="text-[10px] text-cyan-400 font-mono">OEM: {p.codigoOem}</div>}
                      </td>
                      <td className="p-3 font-sans font-bold text-white">{p.nombre}</td>
                      <td className="p-3 font-sans text-slate-400">{p.categoria}</td>
                      {perfilActivo === "farmacia" && <td className="p-3 text-emerald-400">{p.principioActivo || "—"}</td>}
                      {perfilActivo === "farmacia" && <td className="p-3 text-slate-300">{p.lote || "—"} ({p.fechaVencimiento || "—"})</td>}
                      {perfilActivo === "ferreteria" && <td className="p-3 text-slate-300">{p.unidadMedida || "Pza"} · {p.ubicacion || "Almacén"}</td>}
                      {perfilActivo === "ferreteria" && (
                        <td className="p-3 text-emerald-400 text-xs">
                          {p.precioMayorista && p.cantidadMinimaMayorista
                            ? `$${p.precioMayorista.toFixed(2)} (≥${p.cantidadMinimaMayorista} ${p.unidadMedida || 'u'})`
                            : "—"}
                        </td>
                      )}
                      <td className={`p-3 text-right font-bold ${p.stock <= p.stockMinimo ? "text-amber-400" : "text-teal-400"}`}>
                        {p.stock}
                      </td>
                      {perfilActivo === "ferreteria" && (
                        <td className="p-3 text-right text-slate-400 font-mono">
                          ${p.costo.toFixed(2)}
                        </td>
                      )}
                      <td className="p-3 text-right font-bold text-white">${p.precio.toFixed(2)}</td>
                      <td className="p-3 text-right text-slate-300">Bs. {(p.precio * tasaActivaBs).toFixed(2)}</td>
                      {perfilActivo === "ferreteria" && (
                        <td className="p-3 text-center space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setKardexModalItem(p)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-teal-300 font-bold border border-slate-700 cursor-pointer shadow-sm"
                            title="Ver movimientos auditables en Kárdex"
                          >
                            📜 Kárdex
                          </button>
                          <button
                            onClick={() => setPresentacionesModalItem(p)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 font-bold border border-slate-700 cursor-pointer shadow-sm"
                            title="Gestionar presentaciones fraccionadas (Cajas, Metros, etc.)"
                          >
                            🏷️ Presentaciones
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: CLIENTES & CUENTAS POR COBRAR (CRÉDITOS)
            ══════════════════════════════════════════════════════════════════ */}
        {tab === "clientes" && (
          <div className="flex-1 bg-slate-900/80 rounded-3xl border border-slate-800 p-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-white">Directorio de Clientes & Créditos</h3>
                <p className="text-xs text-slate-400">Gestión de cuentas por cobrar, límites de crédito y abonos.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {clientes.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">{c.documento}</span>
                    {c.saldoPendiente > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                        Deuda Activa
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300">
                        Al Día
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm text-white">{c.nombre}</div>
                  <div className="text-xs text-slate-400">📞 {c.telefono}</div>
                  <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Saldo por Cobrar:</span>
                      <span className="font-mono font-black text-base text-amber-300">${c.saldoPendiente.toFixed(2)}</span>
                    </div>
                    {c.saldoPendiente > 0 && (
                      <button
                        onClick={() => {
                          setClienteAbonoSel(c);
                          setMontoAbono(String(c.saldoPendiente));
                        }}
                        className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer shadow-sm"
                      >
                        Abonar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4: CIERRE DE CAJA (CIERRE Z) CON ARQUEO CIEGO
            ══════════════════════════════════════════════════════════════════ */}
        {tab === "cierre" && (
          <div className="max-w-2xl mx-auto w-full bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-5">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-white">Cierre de Turno de Mostrador (Cierre Z)</h3>
                <p className="text-xs text-slate-400">Arqueo ciego de caja: cuenta físicamente el dinero para auditar sobrantes o faltantes.</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold font-mono">
                Arqueo Ciego
              </span>
            </div>

            {cajaCerradaMsg ? (
              <div className="p-4 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-center space-y-2">
                <IconCheckCircle size={32} className="text-teal-400 mx-auto" />
                <h4 className="font-bold text-white text-base">{cajaCerradaMsg}</h4>
                <p className="text-xs text-slate-300">El turno ha sido cerrado y auditado. El reporte Z fue guardado.</p>
                <button
                  onClick={() => { setCajaCerradaMsg(null); setTab("pos"); }}
                  className="mt-3 px-5 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-teal-400"
                >
                  Abrir Nuevo Turno
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">💵 Efectivo USD ($)</label>
                    <input
                      type="number" step="0.01" placeholder="0.00" value={desgloseCaja.usd}
                      onChange={(e) => setDesgloseCaja((prev) => ({ ...prev, usd: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-mono text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">🇻🇪 Efectivo Bs</label>
                    <input
                      type="number" step="0.01" placeholder="0.00" value={desgloseCaja.ves}
                      onChange={(e) => setDesgloseCaja((prev) => ({ ...prev, ves: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-mono text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">💳 Punto de Venta (Bs)</label>
                    <input
                      type="number" step="0.01" placeholder="0.00" value={desgloseCaja.punto}
                      onChange={(e) => setDesgloseCaja((prev) => ({ ...prev, punto: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-mono text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">📲 Pago Móvil (Bs)</label>
                    <input
                      type="number" step="0.01" placeholder="0.00" value={desgloseCaja.pagoMovil}
                      onChange={(e) => setDesgloseCaja((prev) => ({ ...prev, pagoMovil: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-mono text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">⚡ Zelle / USDT ($)</label>
                    <input
                      type="number" step="0.01" placeholder="0.00" value={desgloseCaja.zelle}
                      onChange={(e) => setDesgloseCaja((prev) => ({ ...prev, zelle: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-mono text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">🇨🇴 Pesos COP</label>
                    <input
                      type="number" step="1" placeholder="0" value={desgloseCaja.cop}
                      onChange={(e) => setDesgloseCaja((prev) => ({ ...prev, cop: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-mono text-sm text-white"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    const totalUSDContado = (Number(desgloseCaja.usd) || 0) + (Number(desgloseCaja.zelle) || 0) +
                      ((Number(desgloseCaja.ves) || 0) + (Number(desgloseCaja.punto) || 0) + (Number(desgloseCaja.pagoMovil) || 0)) / tasaActivaBs +
                      ((Number(desgloseCaja.cop) || 0) / tasaCop);

                    setCajaCerradaMsg(`Cierre Z Generado · Total Contado: $${totalUSDContado.toFixed(2)} USD`);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer shadow-lg"
                >
                  Cerrar Turno & Auditar Caja
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ── MODAL DE COBRO MIXTO DE MOSTRADOR ── */}
      {modalCobro && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-['Outfit'] font-black text-lg text-white">Cobro en Mostrador</h3>
              <button onClick={() => setModalCobro(false)} className="text-slate-400 hover:text-white"><IconClose size={18} /></button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Total a Cobrar:</span>
                <span className="font-mono text-xl font-black text-teal-400">${totalUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono text-slate-300">
                <span>En Bolívares (Bs):</span>
                <span className="font-bold">Bs. {totalBs.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span>En Pesos (COP):</span>
                <span>COP ${totalCopCalculado.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">1. Método de Pago</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  ["EFECTIVO_USD", "USD Efectivo", "USD"],
                  ["EFECTIVO_BS", "Bs. Efectivo", "VES"],
                  ["PAGO_MOVIL", "Pago Móvil", "VES"],
                  ["PUNTO_VENTA", "Punto Débito", "VES"],
                  ["ZELLE", "Zelle / USDT", "USD"],
                  ["COP_EFECTIVO", "Pesos COP", "COP"],
                ].map(([id, label, mon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setMetodoPagoSel(id);
                      setMonedaRecibida(mon as any);
                      setMonedaVuelto(mon as any);
                      if (mon === "USD") setMontoRecibido(totalUSD.toFixed(2));
                      else if (mon === "VES") setMontoRecibido(totalBs.toFixed(2));
                      else if (mon === "COP") setMontoRecibido(Math.round(totalCopCalculado).toString());
                    }}
                    className={`py-2 px-2 rounded-xl font-bold border transition-all text-center cursor-pointer ${
                      metodoPagoSel === id ? "bg-teal-500/20 border-teal-400 text-white shadow-sm font-black" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2. Moneda Recibida</label>
                <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-[10px]">
                  {(["USD", "VES", "COP"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMonedaRecibida(m);
                        if (m === "USD") setMontoRecibido(totalUSD.toFixed(2));
                        else if (m === "VES") setMontoRecibido(totalBs.toFixed(2));
                        else if (m === "COP") setMontoRecibido(Math.round(totalCopCalculado).toString());
                      }}
                      className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                        monedaRecibida === m ? "bg-teal-500 text-slate-950" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {m === "USD" ? "$ USD" : m === "VES" ? "Bs." : "COP"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="number" step="any"
                  placeholder={`Ej. ${monedaRecibida === "USD" ? totalUSD.toFixed(2) : monedaRecibida === "VES" ? totalBs.toFixed(2) : Math.round(totalCopCalculado)}`}
                  value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 font-mono text-white text-sm font-bold focus:border-teal-400 focus:outline-none"
                  autoFocus
                />
                <select
                  value={monedaVuelto}
                  onChange={(e) => setMonedaVuelto(e.target.value as any)}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none"
                  title="Moneda en la que se entregará el vuelto"
                >
                  <option value="USD">Vuelto en USD ($)</option>
                  <option value="VES">Vuelto en Bolívares (Bs)</option>
                  <option value="COP">Vuelto en Pesos (COP)</option>
                </select>
              </div>

              {/* Botones de Monto Rápido */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (monedaRecibida === "USD") setMontoRecibido(totalUSD.toFixed(2));
                    else if (monedaRecibida === "VES") setMontoRecibido(totalBs.toFixed(2));
                    else if (monedaRecibida === "COP") setMontoRecibido(Math.round(totalCopCalculado).toString());
                  }}
                  className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 font-bold text-[10px] border border-teal-500/30 cursor-pointer"
                >
                  Monto Exacto
                </button>
                {monedaRecibida === "USD" && [10, 20, 50, 100].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setMontoRecibido(String(b))}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] border border-slate-700 cursor-pointer"
                  >
                    ${b}
                  </button>
                ))}
                {monedaRecibida === "VES" && [50, 100, 200, 500].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setMontoRecibido(String(b))}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] border border-slate-700 cursor-pointer"
                  >
                    Bs. {b}
                  </button>
                ))}
                {monedaRecibida === "COP" && [20000, 50000, 100000].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setMontoRecibido(String(b))}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] border border-slate-700 cursor-pointer"
                  >
                    {b / 1000}k COP
                  </button>
                ))}
              </div>

              {/* Cálculo Inteligente de Vuelto */}
              {(() => {
                const val = parseFloat(montoRecibido);
                if (isNaN(val) || val <= 0) return null;
                const recibidoEquivUSD =
                  monedaRecibida === "USD" ? val :
                  monedaRecibida === "VES" ? val / tasaActivaBs :
                  val / tasaCop;
                const diffUSD = recibidoEquivUSD - totalUSD;

                if (diffUSD > 0.005) {
                  return (
                    <div className="p-3 rounded-2xl bg-teal-500/15 border border-teal-500/40 space-y-1">
                      <div className="flex items-center justify-between text-xs font-black font-mono text-teal-300">
                        <span>VUELTO A ENTREGAR:</span>
                        <span className="text-base">
                          {monedaVuelto === "USD" ? `$${diffUSD.toFixed(2)} USD` :
                           monedaVuelto === "VES" ? `Bs. ${(diffUSD * tasaActivaBs).toFixed(2)}` :
                           `COP $${Math.round(diffUSD * tasaCop).toLocaleString()}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-teal-400/80 border-t border-teal-500/20 pt-1">
                        <span>Equivalencias del vuelto:</span>
                        <span>
                          ${diffUSD.toFixed(2)} ≈ Bs. {(diffUSD * tasaActivaBs).toFixed(2)} ≈ COP ${Math.round(diffUSD * tasaCop).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Opción Ticket de Regalo / Cambio */}
            <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                  <IconGift size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Emitir Ticket de Regalo / Cambio</div>
                  <div className="text-[10px] text-slate-400">Imprime comprobante térmico sin montos de dinero para obsequios (30 días de garantía)</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={emitirTicketRegaloCobro}
                onChange={(e) => setEmitirTicketRegaloCobro(e.target.checked)}
                className="w-5 h-5 rounded accent-teal-500 cursor-pointer"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setModalCobro(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => ejecutarCobro(false)}
                className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black cursor-pointer shadow-lg"
              >
                Confirmar e Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RECIBO FINAL CON BOTÓN DE IMPRESIÓN TÉRMICA ── */}
      {ventaReciente && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
              <IconCheckCircle size={28} />
            </div>
            <h3 className="font-['Outfit'] font-black text-xl text-white">¡Venta Exitosa!</h3>
            <p className="text-xs text-slate-400 font-mono">Comprobante N° {ventaReciente.numero}</p>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs space-y-1 font-mono text-left">
              <div className="flex justify-between font-bold text-white">
                <span>Total Pagado:</span>
                <span className="text-teal-400">${ventaReciente.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Bolívares:</span>
                <span>Bs. {ventaReciente.totalBs.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Método:</span>
                <span>{ventaReciente.metodoPago}</span>
              </div>
              {ventaReciente.vuelto != null && ventaReciente.vuelto > 0 && (
                <div className="flex justify-between text-teal-300 font-bold border-t border-slate-700 pt-1">
                  <span>Vuelto:</span>
                  <span>{ventaReciente.vuelto.toFixed(2)} {ventaReciente.monedaVuelto}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => imprimirTicketComercio(ventaReciente, nombreLocal, tasaActivaBs, tasaCop)}
                className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
              >
                <IconFileText size={15} />
                <span>Ticket Venta 80mm</span>
              </button>
              <button
                onClick={() => imprimirTicketRegalo(ventaReciente, nombreLocal)}
                className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
                title="Imprimir comprobante sin precios para regalo con 30 días de garantía"
              >
                <IconGift size={15} />
                <span>Ticket Regalo (30d)</span>
              </button>
              <button
                onClick={() => setVentaReciente(null)}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AGREGAR PRODUCTO AL INVENTARIO ── */}
      {modalNuevoProducto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-['Outfit'] font-black text-lg text-white">Nuevo Producto ({perfilActivo.toUpperCase()})</h3>
              <button onClick={() => setModalNuevoProducto(false)} className="text-slate-400 hover:text-white"><IconClose size={18} /></button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const nombre = String(fd.get("nombre"));
                const codigo = String(fd.get("codigo") || `COD-${Date.now().toString().slice(-4)}`);
                const precio = Number(fd.get("precio")) || 1;
                const costo = Number(fd.get("costo")) || 0.5;
                const stock = Number(fd.get("stock")) || 10;
                const unidadMedida = String(fd.get("unidadMedida") || "UNIDAD");
                const codigoOem = String(fd.get("codigoOem") || "") || undefined;
                const precioMayorista = fd.get("precioMayorista") ? Number(fd.get("precioMayorista")) : undefined;
                const cantidadMinimaMayorista = fd.get("cantidadMinimaMayorista") ? Number(fd.get("cantidadMinimaMayorista")) : undefined;

                let backendId: number | undefined = undefined;

                if (user?.tenantId && perfilActivo === "ferreteria") {
                  try {
                    const guardado = await crearRepuesto(user.tenantId, {
                      codigoSku: codigo,
                      codigoOriginalOem: codigoOem,
                      descripcion: nombre,
                      precioVenta: precio,
                      costoUnitario: costo,
                      stockActual: stock,
                      unidadBase: unidadMedida,
                      precioMayorista,
                      cantidadMinimaMayorista,
                    });
                    backendId = guardado.id;
                    mostrarToast("Artículo registrado exitosamente en base de datos PostgreSQL", "success");
                  } catch (err: any) {
                    console.warn("Error persistiendo en backend repuestos:", err);
                    mostrarToast("Registrado localmente", "info");
                  }
                }

                const nuevo: ProductoComercio = {
                  id: backendId ? `rep-${backendId}` : String(Date.now()),
                  backendId,
                  codigo,
                  codigoOem,
                  nombre,
                  categoria: String(fd.get("categoria") || (perfilActivo === "ferreteria" ? "Repuestos & Ferretería" : "General")),
                  rubro: perfilActivo,
                  precio,
                  costo,
                  stock,
                  stockMinimo: Number(fd.get("stockMinimo")) || 5,
                  principioActivo: String(fd.get("principioActivo") || "") || undefined,
                  lote: String(fd.get("lote") || "") || undefined,
                  fechaVencimiento: String(fd.get("fechaVencimiento") || "") || undefined,
                  unidadMedida,
                  ubicacion: String(fd.get("ubicacion") || "") || undefined,
                  precioMayorista,
                  cantidadMinimaMayorista,
                };

                setProductos((prev) => [nuevo, ...prev]);
                setModalNuevoProducto(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Nombre del Producto / Artículo</label>
                <input required name="nombre" placeholder="Ej. Martillo de Uña 16oz / Bujía Iridium FR7DC+" className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Código SKU / Referencia</label>
                  <input name="codigo" placeholder="Ej. TORN-38 / MAR-16OZ" className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Categoría</label>
                  <input name="categoria" placeholder="Ej. Herramientas / Repuestos / Plomería" className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Precio Detal ($)</label>
                  <input required name="precio" type="number" step="0.01" placeholder="0.00" className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Costo de Compra ($)</label>
                  <input name="costo" type="number" step="0.01" placeholder="0.00" className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Stock Inicial</label>
                  <input required name="stock" type="number" placeholder="10" className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono" />
                </div>
              </div>

              {perfilActivo === "farmacia" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-400 block mb-1">Principio Activo</label>
                    <input name="principioActivo" placeholder="Ej. Paracetamol" className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-emerald-400 block mb-1">Lote / Vencimiento</label>
                    <div className="flex gap-1">
                      <input name="lote" placeholder="Lote" className="w-1/2 px-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono" />
                      <input name="fechaVencimiento" placeholder="MM/AAAA" className="w-1/2 px-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono" />
                    </div>
                  </div>
                </div>
              )}

              {perfilActivo === "ferreteria" && (
                <div className="space-y-3 p-3.5 bg-slate-800/50 rounded-2xl border border-slate-700">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-teal-400 block mb-1">Unidad de Medida Base</label>
                      <select name="unidadMedida" className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white">
                        <option value="UNIDAD">Pieza / Unidad (UNIDAD)</option>
                        <option value="METRO">Metro (METRO)</option>
                        <option value="KILOGRAMO">Kilogramo (KILOGRAMO)</option>
                        <option value="SACO">Saco / Bulto (SACO)</option>
                        <option value="GALON">Galón / Litro (GALON)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-teal-400 block mb-1">Código OEM / Fabricante</label>
                      <input name="codigoOem" placeholder="Ej. 04465-0K090" className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-emerald-400 block mb-1">Precio Mayorista ($) (Opcional)</label>
                      <input name="precioMayorista" type="number" step="0.01" placeholder="Ej. 1.80" className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-emerald-400 block mb-1">Cant. Mínima Mayorista</label>
                      <input name="cantidadMinimaMayorista" type="number" step="1" placeholder="Ej. 10" className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-teal-400 block mb-1">Ubicación en Almacén / Estante</label>
                    <input name="ubicacion" placeholder="Ej. Pasillo 3 - Gaveta 4" className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white" />
                  </div>
                </div>
              )}

              <div className="pt-3 flex gap-2">
                <button type="button" onClick={() => setModalNuevoProducto(false)} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-black cursor-pointer hover:bg-teal-400 shadow-md">Guardar Artículo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL REGISTRAR ABONO A CRÉDITO ── */}
      {clienteAbonoSel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-['Outfit'] font-black text-lg text-white">Registrar Abono a Crédito</h3>
              <button onClick={() => setClienteAbonoSel(null)} className="text-slate-400 hover:text-white cursor-pointer"><IconClose size={18} /></button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
              <div className="text-sm font-bold text-white">{clienteAbonoSel.nombre}</div>
              <div className="text-xs text-slate-400 font-mono">Doc: {clienteAbonoSel.documento}</div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-700/50">
                <span className="text-slate-400">Deuda Total:</span>
                <span className="font-mono text-base font-black text-amber-300">${clienteAbonoSel.saldoPendiente.toFixed(2)} USD</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monto a Abonar (USD)</label>
              <div className="flex gap-2">
                <input
                  type="number" step="0.01" max={clienteAbonoSel.saldoPendiente}
                  value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 font-mono text-white text-sm font-bold"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setMontoAbono(String(clienteAbonoSel.saldoPendiente))}
                  className="px-3 py-2 rounded-xl bg-teal-500/20 text-teal-300 font-bold text-xs border border-teal-500/30 cursor-pointer"
                >
                  Totalidad
                </button>
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                ≈ Bs. {((Number(montoAbono) || 0) * tasaActivaBs).toFixed(2)} | COP ${((Number(montoAbono) || 0) * tasaCop).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Forma de Pago del Abono</label>
              <select
                value={metodoAbono}
                onChange={(e) => setMetodoAbono(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:outline-none"
              >
                <option value="PAGO_MOVIL">Pago Móvil (Bolívares)</option>
                <option value="EFECTIVO_USD">Efectivo Divisas (USD)</option>
                <option value="PUNTO_VENTA">Punto de Venta (Débito)</option>
                <option value="ZELLE">Zelle / Binance USDT</option>
                <option value="COP_EFECTIVO">Pesos Colombianos (COP)</option>
              </select>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setClienteAbonoSel(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const val = parseFloat(montoAbono);
                  if (!isNaN(val) && val > 0) {
                    setClientes((prev) => {
                      const updated = prev.map((it) => it.id === clienteAbonoSel.id ? { ...it, saldoPendiente: Math.max(0, it.saldoPendiente - val) } : it);
                      try { localStorage.setItem("aurora_comercio_clientes", JSON.stringify(updated)); } catch {}
                      return updated;
                    });
                    setClienteAbonoSel(null);
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
              >
                Confirmar Abono
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL KÁRDEX AUDITABLE DE FERRETERÍA / REPUESTOS ── */}
      {kardexModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold uppercase">Kárdex de Movimientos</span>
                <h3 className="font-['Outfit'] font-black text-lg text-white mt-1">{kardexModalItem.nombre}</h3>
                <p className="text-xs text-slate-400 font-mono">SKU: {kardexModalItem.codigo} · Stock Actual: {kardexModalItem.stock} {kardexModalItem.unidadMedida || 'und'}</p>
              </div>
              <button onClick={() => setKardexModalItem(null)} className="text-slate-400 hover:text-white cursor-pointer"><IconClose size={18} /></button>
            </div>

            {kardexCargando ? (
              <div className="py-8 text-center text-slate-400 text-xs">Cargando movimientos de Kárdex...</div>
            ) : kardexMovimientos.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No hay movimientos registrados en base de datos para este ítem todavía.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-800 text-slate-300 sticky top-0 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Fecha</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5 text-right">Cant.</th>
                      <th className="p-2.5 text-right">Stock Ant ➔ Nvo</th>
                      <th className="p-2.5">Motivo / Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {kardexMovimientos.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="p-2.5 text-[11px] text-slate-400">{new Date(m.fechaRegistro).toLocaleString()}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            m.tipo === "VENTA" ? "bg-emerald-500/20 text-emerald-300" :
                            m.tipo === "COMPRA" ? "bg-cyan-500/20 text-cyan-300" :
                            "bg-amber-500/20 text-amber-300"
                          }`}>
                            {m.tipo}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-white">{m.cantidad}</td>
                        <td className="p-2.5 text-right text-slate-400">{m.stockAnterior} ➔ <span className="text-teal-400 font-bold">{m.stockNuevo}</span></td>
                        <td className="p-2.5 font-sans text-xs text-slate-400">{m.motivo || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="pt-2 flex justify-end">
              <button onClick={() => setKardexModalItem(null)} className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer">
                Cerrar Kárdex
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PRESENTACIONES FRACCIONADAS (CAJA, METRO, KILO, SACO) ── */}
      {presentacionesModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase">Presentaciones de Venta</span>
                <h3 className="font-['Outfit'] font-black text-lg text-white mt-1">{presentacionesModalItem.nombre}</h3>
                <p className="text-xs text-slate-400">Unidad Base: <strong className="text-teal-300">{presentacionesModalItem.unidadMedida || 'UNIDAD'}</strong> (Stock Base: {presentacionesModalItem.stock})</p>
              </div>
              <button onClick={() => setPresentacionesModalItem(null)} className="text-slate-400 hover:text-white cursor-pointer"><IconClose size={18} /></button>
            </div>

            {/* Listado de presentaciones existentes */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300">Presentaciones Activas:</div>
              {presentacionesCargando ? (
                <div className="py-4 text-center text-slate-400 text-xs">Cargando presentaciones...</div>
              ) : presentacionesLista.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-slate-400 text-xs">
                  No hay presentaciones configuradas aún. Por defecto se vende en su unidad base.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {presentacionesLista.map((pres) => (
                    <div key={pres.id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-white">📦 {pres.nombrePresentacion}</div>
                        <div className="text-[10px] text-slate-400">Factor: {pres.factorConversion} {presentacionesModalItem.unidadMedida || 'u'} base</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-xs text-teal-400">${pres.precioVenta.toFixed(2)}</div>
                        <button
                          onClick={() => {
                            agregarAlCarrito(presentacionesModalItem, pres);
                            setPresentacionesModalItem(null);
                            mostrarToast(`Agregado al carrito: ${pres.nombrePresentacion}`, "success");
                          }}
                          className="mt-1 px-2 py-0.5 rounded bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-[10px] cursor-pointer"
                        >
                          Vender
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulario para crear una nueva presentación */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!user?.tenantId || !presentacionesModalItem.backendId) {
                  mostrarToast("Requiere un tenant y producto sincronizado para crear presentaciones", "info");
                  return;
                }
                const fd = new FormData(e.currentTarget);
                const nombre = String(fd.get("nombrePresentacion") || "").trim();
                const factor = Number(fd.get("factorConversion")) || 1;
                const precio = Number(fd.get("precioVenta")) || 1;
                try {
                  const nueva = await crearPresentacionRepuesto(user.tenantId, presentacionesModalItem.backendId, nombre, factor, precio);
                  setPresentacionesLista((prev) => [...prev, nueva]);
                  (e.target as HTMLFormElement).reset();
                  mostrarToast("Presentación agregada exitosamente", "success");
                } catch (err: any) {
                  mostrarToast(err.message || "Error al crear presentación", "error");
                }
              }}
              className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2 text-xs"
            >
              <div className="font-bold text-slate-300 text-[11px]">Crear Nueva Presentación Fraccionada:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-slate-400 block mb-0.5">Nombre (ej. Caja 100u, Rollo 50m)</label>
                  <input required name="nombrePresentacion" placeholder="Caja 100u" className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block mb-0.5">Factor Conv. (u base)</label>
                  <input required name="factorConversion" type="number" step="0.01" placeholder="100" className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block mb-0.5">Precio Venta ($)</label>
                  <input required name="precioVenta" type="number" step="0.01" placeholder="18.50" className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs" />
                </div>
              </div>
              <button type="submit" className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer shadow">
                + Guardar Presentación
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL MATRIZ DE TALLAS PARA CALZADO ── */}
      {calzadoModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <IconShoe size={22} />
                </div>
                <div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold uppercase tracking-wider">
                    Curva de Tallas & Stock
                  </span>
                  <h3 className="font-['Outfit'] font-black text-lg text-white mt-0.5 leading-tight">
                    {calzadoModalItem.nombre}
                  </h3>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-slate-500">{calzadoModalItem.codigo}</span>
                    {calzadoModalItem.color && <span>• Color: {calzadoModalItem.color}</span>}
                    {calzadoModalItem.genero && <span className="capitalize">• {calzadoModalItem.genero}</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCalzadoModalItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <IconClose size={18} />
              </button>
            </div>

            {/* Matriz de Tallas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Selecciona la Talla Deseada:</label>
                <span className="text-[10px] text-slate-400">
                  Total disponible: {calzadoModalItem.stock} pares
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {calzadoModalItem.variantesTalla?.map((v) => {
                  const esAgotada = v.stock <= 0;
                  const esSeleccionada = tallaModalSel === v.talla;
                  return (
                    <button
                      key={v.talla}
                      type="button"
                      disabled={esAgotada}
                      onClick={() => {
                        setTallaModalSel(v.talla);
                        if (cantTallaModal > v.stock) setCantTallaModal(1);
                      }}
                      className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                        esAgotada
                          ? "bg-slate-800/30 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed"
                          : esSeleccionada
                          ? "bg-blue-500 text-slate-950 font-black border-blue-400 shadow-lg shadow-blue-500/25 scale-105"
                          : "bg-slate-800/80 border-slate-700/70 text-slate-200 hover:border-blue-500/50 hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-sm font-black font-mono leading-none">{v.talla}</span>
                      <span className={`text-[9px] mt-1 font-bold ${
                        esSeleccionada
                          ? "text-slate-950 font-extrabold"
                          : esAgotada
                          ? "text-slate-600"
                          : v.stock <= 2
                          ? "text-amber-400"
                          : "text-slate-400"
                      }`}>
                        {esAgotada ? "Agotado" : `${v.stock} par${v.stock > 1 ? "es" : ""}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de Cantidad y Resumen */}
            {(() => {
              const varianteSel = calzadoModalItem.variantesTalla?.find((v) => v.talla === tallaModalSel);
              const maxStock = varianteSel?.stock || 0;
              const subtotal = calzadoModalItem.precio * cantTallaModal;

              return (
                <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Talla Seleccionada</span>
                      <div className="text-sm font-black text-white flex items-center gap-1.5">
                        <span>Talla {tallaModalSel || "Ninguna"}</span>
                        {varianteSel && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            varianteSel.stock <= 2 ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"
                          }`}>
                            {varianteSel.stock} en inventario
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Precio Unitario</span>
                      <div className="text-base font-black font-mono text-blue-400">
                        ${calzadoModalItem.precio.toFixed(2)} USD
                      </div>
                    </div>
                  </div>

                  {/* Cantidad Stepper */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <span className="text-xs text-slate-300 font-bold">Cantidad de pares:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCantTallaModal(Math.max(1, cantTallaModal - 1))}
                        disabled={cantTallaModal <= 1}
                        className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white font-bold text-sm cursor-pointer flex items-center justify-center transition-colors"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-sm text-white">{cantTallaModal}</span>
                      <button
                        type="button"
                        onClick={() => setCantTallaModal(Math.min(maxStock, cantTallaModal + 1))}
                        disabled={cantTallaModal >= maxStock}
                        className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white font-bold text-sm cursor-pointer flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <span className="text-xs font-bold text-slate-300">Subtotal:</span>
                    <span className="font-mono font-black text-lg text-emerald-400">
                      ${subtotal.toFixed(2)} USD
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Acciones */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCalzadoModalItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!tallaModalSel}
                onClick={() => {
                  if (!tallaModalSel) return;
                  agregarAlCarrito(calzadoModalItem, {
                    talla: tallaModalSel,
                    color: calzadoModalItem.color,
                    cantidad: cantTallaModal,
                  });
                  mostrarToast(`Añadido: ${calzadoModalItem.nombre} [Talla ${tallaModalSel}] x${cantTallaModal}`, "success");
                  setCalzadoModalItem(null);
                }}
                className="flex-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 disabled:opacity-40 text-slate-950 font-black text-xs cursor-pointer shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                <span>Añadir al Carrito (Talla {tallaModalSel || "—"})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MUESTRARIO DE TONOS DE MAQUILLAJE ── */}
      {maquillajeModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <IconLipstick size={22} />
                </div>
                <div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 font-bold uppercase tracking-wider">
                    Muestrario Cosmético
                  </span>
                  <h3 className="font-['Outfit'] font-black text-lg text-white mt-0.5 leading-tight">
                    {maquillajeModalItem.nombre}
                  </h3>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-slate-500">{maquillajeModalItem.codigo}</span>
                    {maquillajeModalItem.acabadoMaquillaje && <span>• Acabado: {maquillajeModalItem.acabadoMaquillaje}</span>}
                    {maquillajeModalItem.paoMeses && <span>• PAO: {maquillajeModalItem.paoMeses}M</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setMaquillajeModalItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <IconClose size={18} />
              </button>
            </div>

            {/* Muestrario de Swatches */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Selecciona el Tono / Swatch:</label>
                <span className="text-[10px] text-slate-400">
                  {maquillajeModalItem.tonosCosmeticos?.length || 0} tonos disponibles
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {maquillajeModalItem.tonosCosmeticos?.map((t) => {
                  const esAgotado = t.stock <= 0;
                  const esSeleccionado = tonoModalSel?.nombre === t.nombre;
                  return (
                    <button
                      key={t.nombre}
                      type="button"
                      disabled={esAgotado}
                      onClick={() => {
                        setTonoModalSel({ nombre: t.nombre, hex: t.hex });
                        if (cantTonoModal > t.stock) setCantTonoModal(1);
                      }}
                      className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                        esAgotado
                          ? "bg-slate-800/30 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed"
                          : esSeleccionado
                          ? "bg-pink-500/10 border-pink-400 ring-2 ring-pink-500/50 shadow-lg shadow-pink-500/10"
                          : "bg-slate-800/80 border-slate-700/70 hover:border-pink-500/40 hover:bg-slate-800"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full border-2 shrink-0 shadow-md transition-transform ${
                          esSeleccionado ? "border-white scale-110 ring-2 ring-pink-400" : "border-slate-600"
                        }`}
                        style={{ backgroundColor: t.hex }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center justify-between">
                          <span>{t.nombre}</span>
                          <span className="font-mono text-[10px] text-slate-400">{t.hex}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className={esAgotado ? "text-red-400 font-bold" : t.stock <= 2 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                            {esAgotado ? "Agotado" : `${t.stock} disponibles`}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de Cantidad y Resumen */}
            {(() => {
              const tonoObj = maquillajeModalItem.tonosCosmeticos?.find((t) => t.nombre === tonoModalSel?.nombre);
              const maxStock = tonoObj?.stock || 0;
              const subtotal = maquillajeModalItem.precio * cantTonoModal;

              return (
                <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tono Seleccionado</span>
                      <div className="text-sm font-black text-white flex items-center gap-2 mt-0.5">
                        {tonoModalSel && (
                          <div
                            className="w-4 h-4 rounded-full border border-white/60 inline-block shadow-sm"
                            style={{ backgroundColor: tonoModalSel.hex }}
                          />
                        )}
                        <span>{tonoModalSel?.nombre || "Ninguno"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Precio Unitario</span>
                      <div className="text-base font-black font-mono text-pink-400">
                        ${maquillajeModalItem.precio.toFixed(2)} USD
                      </div>
                    </div>
                  </div>

                  {/* Cantidad Stepper */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <span className="text-xs text-slate-300 font-bold">Cantidad de unidades:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCantTonoModal(Math.max(1, cantTonoModal - 1))}
                        disabled={cantTonoModal <= 1}
                        className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white font-bold text-sm cursor-pointer flex items-center justify-center transition-colors"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-sm text-white">{cantTonoModal}</span>
                      <button
                        type="button"
                        onClick={() => setCantTonoModal(Math.min(maxStock, cantTonoModal + 1))}
                        disabled={cantTonoModal >= maxStock}
                        className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white font-bold text-sm cursor-pointer flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <span className="text-xs font-bold text-slate-300">Subtotal:</span>
                    <span className="font-mono font-black text-lg text-emerald-400">
                      ${subtotal.toFixed(2)} USD
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Acciones */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMaquillajeModalItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!tonoModalSel}
                onClick={() => {
                  if (!tonoModalSel) return;
                  agregarAlCarrito(maquillajeModalItem, {
                    tono: tonoModalSel,
                    cantidad: cantTonoModal,
                  });
                  mostrarToast(`Añadido: ${maquillajeModalItem.nombre} [${tonoModalSel.nombre}] x${cantTonoModal}`, "success");
                  setMaquillajeModalItem(null);
                }}
                className="flex-2 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 disabled:opacity-40 text-slate-950 font-black text-xs cursor-pointer shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                <span>Añadir al Carrito ({tonoModalSel?.nombre || "—"})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CALCULADORA FERRETERA DE MATERIALES DE OBRA ── */}
      {modalCalculadora && (() => {
        const areaNum = Math.max(0.1, Number(calcAreaM2) || 0);
        const espesorNum = Math.max(1, Number(calcEspesorCm) || 10);

        // Cálculos según tipo de obra
        let bloquesRequeridos = 0;
        let sacosCemento = 0;
        let m3Arena = 0;
        let m3Piedra = 0;

        if (calcTipoObra === "pared") {
          // Pared de bloques 15x20x30 cm: 12.5 bloques/m2 + 5% desperdicio = ~13 bloques/m2
          bloquesRequeridos = Math.ceil(areaNum * 13);
          // ~0.35 sacos de cemento por m2 de pared
          sacosCemento = Math.ceil(areaNum * 0.35);
          // ~0.03 m3 arena lavada por m2
          m3Arena = Number((areaNum * 0.03).toFixed(2));
        } else if (calcTipoObra === "friso") {
          // Friso/revoque (2 caras de 1.5cm promedio): ~0.25 sacos cemento/m2, 0.035 m3 arena/m2
          sacosCemento = Math.ceil(areaNum * 0.25);
          m3Arena = Number((areaNum * 0.035).toFixed(2));
        } else if (calcTipoObra === "piso") {
          // Losa de concreto vaciada: V = m2 * (espesor / 100) m3
          const volumenM3 = areaNum * (espesorNum / 100);
          // Concreto 210 kg/cm2: ~7.5 sacos cemento/m3, 0.55 m3 arena/m3, 0.85 m3 piedra/m3
          sacosCemento = Math.ceil(volumenM3 * 7.5);
          m3Arena = Number((volumenM3 * 0.55).toFixed(2));
          m3Piedra = Number((volumenM3 * 0.85).toFixed(2));
        }

        // Búsqueda de productos del catálogo de ferretería
        const prodCemento = productos.find((p) => p.codigo === "FER-001" || p.nombre.toLowerCase().includes("cemento"));
        const prodBloque = productos.find((p) => p.codigo === "FER-004" || p.nombre.toLowerCase().includes("bloque"));
        const prodArena = productos.find((p) => p.codigo === "FER-006" || p.nombre.toLowerCase().includes("arena"));

        const precioCemento = prodCemento?.precio || 8.5;
        const precioBloque = prodBloque?.precio || 0.65;
        const precioArena = prodArena?.precio || 18.0;

        const costoCemento = sacosCemento * precioCemento;
        const costoBloques = bloquesRequeridos * precioBloque;
        const costoArena = m3Arena * precioArena;
        const totalEstimadoUSD = costoCemento + costoBloques + costoArena;
        const totalEstimadoBs = totalEstimadoUSD * tasaActivaBs;

        const volcarAlCarrito = () => {
          let count = 0;
          if (bloquesRequeridos > 0 && prodBloque) {
            agregarAlCarrito(prodBloque, { cantidad: bloquesRequeridos });
            count++;
          }
          if (sacosCemento > 0 && prodCemento) {
            agregarAlCarrito(prodCemento, { cantidad: sacosCemento });
            count++;
          }
          if (m3Arena > 0 && prodArena) {
            agregarAlCarrito(prodArena, { cantidad: Math.ceil(m3Arena) });
            count++;
          }
          mostrarToast(`Calculadora de Obra: ${count} materiales volcados al carrito exitosamente`, "success");
          setModalCalculadora(false);
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <IconCalculator size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold uppercase tracking-wider">
                      Cálculo de Materiales de Construcción
                    </span>
                    <h3 className="font-['Outfit'] font-black text-lg text-white mt-0.5 leading-tight">
                      Calculadora de Obra para Ferretería
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Estima en segundos los insumos de obra y agrégalos en 1 clic al carrito de venta.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setModalCalculadora(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <IconClose size={18} />
                </button>
              </div>

              {/* Selector de Tipo de Obra */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "pared", label: "Pared de Bloques", desc: "15x20x30 cm" },
                  { id: "friso", label: "Friso / Revoque", desc: "Acabado Muros" },
                  { id: "piso", label: "Losa / Vaciado Piso", desc: "Concreto 210kg" },
                ].map((tipo) => (
                  <button
                    key={tipo.id}
                    type="button"
                    onClick={() => setCalcTipoObra(tipo.id as any)}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      calcTipoObra === tipo.id
                        ? "bg-teal-500 text-slate-950 font-black border-teal-400 shadow-md"
                        : "bg-slate-800/70 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{tipo.label}</div>
                    <div className={`text-[10px] mt-0.5 ${calcTipoObra === tipo.id ? "text-slate-950 font-semibold" : "text-slate-400"}`}>
                      {tipo.desc}
                    </div>
                  </button>
                ))}
              </div>

              {/* Dimensiones / Entradas */}
              <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-300 block mb-1">
                    Superficie a Construir (m²):
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={calcAreaM2}
                    onChange={(e) => setCalcAreaM2(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-sm focus:border-teal-500 focus:outline-none"
                    placeholder="30"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Ejemplo: 30 m² de pared o losa</span>
                </div>

                {calcTipoObra === "piso" && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 block mb-1">
                      Espesor de Losa (cm):
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="40"
                      value={calcEspesorCm}
                      onChange={(e) => setCalcEspesorCm(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-sm focus:border-teal-500 focus:outline-none"
                      placeholder="10"
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Estándar residencial: 10 a 15 cm</span>
                  </div>
                )}
              </div>

              {/* Insumos Estimados */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Materiales Necesarios Estimados:</span>
                  <span className="text-[10px] text-slate-400">Incluye 5% de desperdicio técnico</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {bloquesRequeridos > 0 && (
                    <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/60 flex flex-col justify-between">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Bloques de Arcilla</div>
                      <div className="text-xl font-black font-mono text-amber-300 my-1">
                        {bloquesRequeridos} <span className="text-xs font-sans text-slate-400">unidades</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        ${precioBloque.toFixed(2)} c/u ≈ ${(bloquesRequeridos * precioBloque).toFixed(2)}
                      </div>
                    </div>
                  )}
                  {sacosCemento > 0 && (
                    <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/60 flex flex-col justify-between">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Cemento Gris</div>
                      <div className="text-xl font-black font-mono text-teal-300 my-1">
                        {sacosCemento} <span className="text-xs font-sans text-slate-400">sacos</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        ${precioCemento.toFixed(2)} c/u ≈ ${(sacosCemento * precioCemento).toFixed(2)}
                      </div>
                    </div>
                  )}
                  {m3Arena > 0 && (
                    <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/60 flex flex-col justify-between">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Arena Lavada</div>
                      <div className="text-xl font-black font-mono text-cyan-300 my-1">
                        {m3Arena} <span className="text-xs font-sans text-slate-400">m³</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        ${precioArena.toFixed(2)} /m³ ≈ ${(m3Arena * precioArena).toFixed(2)}
                      </div>
                    </div>
                  )}
                  {m3Piedra > 0 && (
                    <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/60 flex flex-col justify-between">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Piedra Picada</div>
                      <div className="text-xl font-black font-mono text-indigo-300 my-1">
                        {m3Piedra} <span className="text-xs font-sans text-slate-400">m³</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Insumo de vaciado
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Presupuestado */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/80 border border-teal-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-teal-300 uppercase font-bold tracking-wider">Presupuesto Estimado</span>
                  <div className="font-mono font-black text-xl text-white">
                    ${totalEstimadoUSD.toFixed(2)} USD
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    ≈ Bs. {totalEstimadoBs.toFixed(2)} (Tasa activa)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={volcarAlCarrito}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-400 hover:to-cyan-300 text-slate-950 font-black text-xs cursor-pointer shadow-lg transition-all flex items-center gap-1.5"
                >
                  <IconShoppingCart size={16} />
                  <span>Volcar Materiales al Carrito</span>
                </button>
              </div>

              {/* Botón Cerrar */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setModalCalculadora(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL REGISTRO DE FACTURA DE COMPRA A PROVEEDOR ── */}
      {modalCompraProveedor && (
        <ModalCompraProveedorFerreteria
          tenantId={user?.tenantId || 1}
          productos={productos.filter((p) => p.rubro === "ferreteria")}
          proveedores={proveedoresRepuesto}
          onClose={() => setModalCompraProveedor(false)}
          onCompraExitosa={() => {
            setModalCompraProveedor(false);
            cargarRepuestosBackend();
            mostrarToast("Factura de compra procesada. Stock y costo promedio actualizados en Kárdex.", "success");
          }}
          onNuevoProveedor={(nuevo) => setProveedoresRepuesto((prev) => [...prev, nuevo])}
        />
      )}

      {/* Toast flotante */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 ${
            toast.tipo === "success" ? "bg-teal-950/95 border-teal-500 text-teal-200" :
            toast.tipo === "error" ? "bg-red-950/95 border-red-500 text-red-200" :
            "bg-slate-900/95 border-cyan-500 text-cyan-200"
          }`}>
            <span>{toast.tipo === "success" ? "✅" : toast.tipo === "error" ? "❌" : "ℹ️"}</span>
            <span>{toast.mensaje}</span>
          </div>
        </div>
      )}

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTE: MODAL DE FACTURA DE COMPRA A PROVEEDOR (FERRETERÍA & REPUESTOS)
// ══════════════════════════════════════════════════════════════════════════
interface ModalCompraProveedorProps {
  tenantId: number;
  productos: ProductoComercio[];
  proveedores: ProveedorRepuesto[];
  onClose: () => void;
  onCompraExitosa: () => void;
  onNuevoProveedor: (p: ProveedorRepuesto) => void;
}

function ModalCompraProveedorFerreteria({
  tenantId,
  productos,
  proveedores,
  onClose,
  onCompraExitosa,
  onNuevoProveedor,
}: ModalCompraProveedorProps) {
  const [proveedorSelId, setProveedorSelId] = useState<string>(
    proveedores.length > 0 ? String(proveedores[0].id) : ""
  );
  const [nuevoProvModal, setNuevoProvModal] = useState(false);
  const [nombreNuevoProv, setNombreNuevoProv] = useState("");
  const [rifNuevoProv, setRifNuevoProv] = useState("");
  const [creandoProv, setCreandoProv] = useState(false);

  const [numeroFactura, setNumeroFactura] = useState(`FAC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  
  interface LineaCompraItem {
    repuestoId: number;
    nombre: string;
    cantidad: string;
    costoUnitario: string;
  }

  const [lineas, setLineas] = useState<LineaCompraItem[]>([]);
  const [repuestoSelId, setRepuestoSelId] = useState<string>(
    productos.length > 0 && productos[0].backendId ? String(productos[0].backendId) : ""
  );
  const [cantidadInput, setCantidadInput] = useState("10");
  const [costoInput, setCostoInput] = useState("");
  const [guardandoCompra, setGuardandoCompra] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalFactura = useMemo(() => {
    return lineas.reduce((acc, l) => acc + (Number(l.cantidad) || 0) * (Number(l.costoUnitario) || 0), 0);
  }, [lineas]);

  const handleAgregarLinea = () => {
    const rId = Number(repuestoSelId);
    const prod = productos.find((p) => p.backendId === rId);
    if (!prod || !rId) return;
    const cant = Number(cantidadInput) || 1;
    const cost = Number(costoInput) || prod.costo || 1;
    setLineas((prev) => [
      ...prev,
      {
        repuestoId: rId,
        nombre: prod.nombre,
        cantidad: String(cant),
        costoUnitario: String(cost),
      },
    ]);
    setCostoInput("");
  };

  const handleCrearProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevoProv.trim()) return;
    setCreandoProv(true);
    try {
      const nuevo = await crearProveedorRepuesto(tenantId, {
        nombre: nombreNuevoProv.trim(),
        rif: rifNuevoProv.trim() || undefined,
        activo: true,
      });
      onNuevoProveedor(nuevo);
      setProveedorSelId(String(nuevo.id));
      setNuevoProvModal(false);
      setNombreNuevoProv("");
      setRifNuevoProv("");
    } catch (err: any) {
      setErrorMsg(err.message || "Error al crear proveedor");
    } finally {
      setCreandoProv(false);
    }
  };

  const handleRegistrarCompra = async () => {
    setErrorMsg(null);
    if (!proveedorSelId) {
      setErrorMsg("Seleccione o registre un proveedor");
      return;
    }
    if (!numeroFactura.trim()) {
      setErrorMsg("Indique el número de factura");
      return;
    }
    if (lineas.length === 0) {
      setErrorMsg("Debe agregar al menos un ítem a la factura");
      return;
    }
    setGuardandoCompra(true);
    try {
      await registrarCompraRepuesto(tenantId, {
        proveedorId: Number(proveedorSelId),
        numeroFactura: numeroFactura.trim(),
        items: lineas.map((l) => ({
          repuestoId: l.repuestoId,
          cantidad: Number(l.cantidad),
          costoUnitario: Number(l.costoUnitario),
        })),
      });
      onCompraExitosa();
    } catch (err: any) {
      setErrorMsg(err.message || "Error registrando compra en el servidor");
    } finally {
      setGuardandoCompra(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase">Entrada de Almacén</span>
            <h3 className="font-['Outfit'] font-black text-lg text-white mt-1">Factura de Compra a Proveedor</h3>
            <p className="text-xs text-slate-400">Incrementa stock, actualiza costo unitario y deja asiento en Kárdex.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><IconClose size={18} /></button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Proveedor y Factura */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-slate-400">Proveedor</label>
              <button
                type="button"
                onClick={() => setNuevoProvModal(!nuevoProvModal)}
                className="text-[10px] text-cyan-400 font-bold hover:underline cursor-pointer"
              >
                + Nuevo Proveedor
              </button>
            </div>
            {nuevoProvModal ? (
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <input
                  placeholder="Nombre de la Distribuidora / Proveedor"
                  value={nombreNuevoProv}
                  onChange={(e) => setNombreNuevoProv(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                />
                <input
                  placeholder="RIF / Cédula (ej. J-12345678-0)"
                  value={rifNuevoProv}
                  onChange={(e) => setRifNuevoProv(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCrearProveedor}
                    disabled={creandoProv}
                    className="flex-1 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    {creandoProv ? "Guardando..." : "Guardar Proveedor"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNuevoProvModal(false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-700 text-slate-300 text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <select
                value={proveedorSelId}
                onChange={(e) => setProveedorSelId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold"
              >
                {proveedores.length === 0 ? (
                  <option value="">(No hay proveedores registrados aún)</option>
                ) : (
                  proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.rif ? `(${p.rif})` : ""}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Nº Factura / Control</label>
            <input
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              placeholder="FAC-000123"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono font-bold"
            />
          </div>
        </div>

        {/* Agregar ítems a la factura */}
        <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2">
          <div className="text-[11px] font-bold text-slate-300">Añadir Ítems de Repuesto / Ferretería:</div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
            <div className="sm:col-span-6">
              <label className="text-[9px] text-slate-400 block mb-0.5">Artículo</label>
              <select
                value={repuestoSelId}
                onChange={(e) => setRepuestoSelId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              >
                {productos.map((p) => (
                  <option key={p.id} value={p.backendId || ""}>
                    {p.codigo} - {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[9px] text-slate-400 block mb-0.5">Cantidad</label>
              <input
                type="number"
                step="0.01"
                value={cantidadInput}
                onChange={(e) => setCantidadInput(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[9px] text-slate-400 block mb-0.5">Costo Unit. ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={costoInput}
                onChange={(e) => setCostoInput(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleAgregarLinea}
                className="w-full py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md"
              >
                + Añadir
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de ítems agregados */}
        <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-800 text-slate-300 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-2.5">Ítem</th>
                <th className="p-2.5 text-right">Cant.</th>
                <th className="p-2.5 text-right">Costo Unit.</th>
                <th className="p-2.5 text-right">Subtotal</th>
                <th className="p-2.5 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {lineas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500 font-sans">
                    Añade al menos un producto para procesar la entrada de almacén.
                  </td>
                </tr>
              ) : (
                lineas.map((l, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-2.5 font-sans font-semibold text-white">{l.nombre}</td>
                    <td className="p-2.5 text-right font-bold text-teal-300">{l.cantidad}</td>
                    <td className="p-2.5 text-right">${Number(l.costoUnitario).toFixed(2)}</td>
                    <td className="p-2.5 text-right font-bold text-white">${((Number(l.cantidad) || 0) * (Number(l.costoUnitario) || 0)).toFixed(2)}</td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => setLineas((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300 cursor-pointer"
                      >
                        <IconTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Resumen Total y Botón Procesar */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Total Factura:</span>
            <div className="font-mono font-black text-xl text-teal-400">${totalFactura.toFixed(2)} USD</div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRegistrarCompra}
              disabled={guardandoCompra || lineas.length === 0}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
            >
              {guardandoCompra ? "Procesando Factura..." : "Procesar Factura y Actualizar Kárdex"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

