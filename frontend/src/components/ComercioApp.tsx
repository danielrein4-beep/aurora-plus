import { avisar } from "../avisos";
import AsistenteIaModal from "./AsistenteIaModal";
import jsPDF from "jspdf";
import EstadisticasComercio from "./EstadisticasComercio";
import ModalCatalogoQR from "./ModalCatalogoQR";
import PedidosWebPanel from "./PedidosWebPanel";
import BitacoraAuditoria from "./BitacoraAuditoria";
import DevolucionesComercio from "./DevolucionesComercio";
import { useState, useMemo, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import {
  IconHardware, IconPrescription, IconRetail, IconCard, IconSearch, IconTrash,
  IconCheck, IconWarning, IconClose, IconUsers, IconFileText, IconHourglass,
  IconDownload, IconRefresh, IconCheckCircle, IconBank, IconChart, IconBox, IconLock,
  IconSettings, IconCoins, IconEdit, IconShoppingBag, IconTruck, AuroraGradientDef,
  IconChevronLeft, IconChevronRight, IconReceipt, IconChartTrend, IconWallet,
  IconMail,
} from "../Icons";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import { useBarcodeScanner, decodificarCodigoPesado } from "../hooks/useBarcodeScanner";
import { comprimirImagenFactura } from "../utils/imageCompression";
import { useNavigate } from "react-router-dom";
import { obtenerEmpresaKpis, type EmpresaKpiResponse } from "../api";
import PersonalPage from "../pages/Personal";
import PersonalRoute from "./PersonalRoute";
import {
  listarRepuestos,
  crearRepuesto,
  actualizarRepuesto,
  eliminarRepuesto,
  ajustarStockRepuesto,
  listarPresentacionesRepuesto,
  crearPresentacionRepuesto,
  despacharPorPresentacion,
  cobrarTicketPos,
  venderRepuestoPorVolumen,
  historialMovimientosRepuesto,
  listarProveedoresRepuesto,
  crearProveedorRepuesto,
  actualizarProveedorRepuesto,
  listarComprasRepuesto,
  registrarCompraRepuesto,
  importarRepuestosLote,
  obtenerUtilidadRepuestos,
  type UtilidadPeriodoRepuesto,
  extraerFacturaOcr,
  crearCliente,
  listarMovimientos, registrarMovimiento, abonarMovimiento, registrarCuentaManual,
  abrirTurno,
  turnoAbierto,
  historialTurnos,
  registrarEgresoTurno,
  cerrarTurno,
  tasaVigente, actualizarTasa, actualizarTasaExternaTenant, ApiError, monedaBaseGuardada, fijarMonedaBaseApi,
  obtenerOrigenTasaActiva, actualizarOrigenTasaActiva,
  type RepuestoItem,
  type PresentacionRepuesto,
  type MovimientoRepuesto,
  type ProveedorRepuesto,
  type CompraRepuesto,
  type MovimientoCaja,
  type Turno,
  type TasaCambio,
  type OrigenTasaActiva,
  type FacturaExtraidaOcr,
  type ItemImportacionRepuesto,
  type ResultadoImportacionRepuestos,
  obtenerMiNegocio,
  obtenerMonedaBaseNegocio, actualizarMonedaBaseNegocio,
  subirComprobanteMovimientoCaja,
  listarCuentasBancarias, crearCuentaBancaria, actualizarCuentaBancaria,
  ingresarSaldoCuentaBancaria, retirarSaldoCuentaBancaria, transferirEntreCuentasBancarias,
  eliminarCuentaBancaria,
  type CuentaBancaria, type TipoCuentaBancaria,
  listarAlmacenes, crearAlmacen, obtenerDistribucionAlmacen, trasladarStockAlmacen,
  listarUbicacionesAlmacen, fijarUbicacionAlmacen,
  type Almacen, type StockAlmacen,
  listarClientes, editarCliente,
  guardarVentaMostrador, guardarVentasMostradorLote, listarVentasMostrador,
  type Cliente as ClienteServidor, type VentaMostradorRequest,
  obtenerFacturacionFiscal, actualizarFacturacionFiscal, siguienteNumeroControlFiscal,
  obtenerDatosFiscalesNegocio, actualizarDatosFiscalesNegocio,
  type FacturacionFiscalConfig, type ModoFacturacionFiscal, type DatosFiscalesNegocio,
  obtenerImpuestosNegocio, type ImpuestosNegocio, type DesgloseFiscalTicket,
} from "../api";
import ArqueoCajaMultimoneda from "./ArqueoCajaMultimoneda";
import ImpuestosCargosComercio from "./ImpuestosCargosComercio";
import LibrosFiscalesComercio from "./LibrosFiscalesComercio";

// ── Moneda base del negocio ────────────────────────────────────────────────
// CONVENCIÓN INTERNA: en todo este archivo, la moneda "USD" significa "la moneda base del
// negocio", sea dólar o euro. En modo euro ("EUR") el negocio trabaja SOLO en euros: sin
// bolívares, sin pesos, sin tasas. La traducción se hace en dos bordes nada más:
//   · hacia el servidor  → aExterna("USD") devuelve la moneda real ("EUR" en modo euro)
//   · desde el servidor  → aInterna("EUR") vuelve a "USD"
// y en pantalla se usan SIM() y CODIGO() en vez de "$" y "USD" fijos.
// MONEDA_BASE se fija al renderizar ComercioApp (ver ahí), antes de dibujar cualquier hijo.
let MONEDA_BASE = "USD";
const modoEuro = () => MONEDA_BASE === "EUR";
const SIM = () => (MONEDA_BASE === "EUR" ? "€" : "$");
const CODIGO = () => (MONEDA_BASE === "EUR" ? "EUR" : "USD");
// "EUR" solo puede venir de un negocio en modo euro, así que no depende del orden de carga.
const aInterna = (moneda: string): string => (moneda === "EUR" ? "USD" : moneda);
const aExterna = (moneda: string): string => (moneda === "USD" ? MONEDA_BASE : moneda);
/** Símbolo + monto para cualquier moneda (interna). Reemplaza al patrón `prefijoMoneda(m)`. */
const prefijoMoneda = (moneda: string): string => (aInterna(moneda) === "USD" ? SIM() : moneda + " ");

// Huella de lo que se guarda en el servidor de un cliente — si no cambia, no se vuelve a enviar.
function firmaCliente(c: ClienteComercio): string {
  return JSON.stringify([c.nombre, c.documento, c.telefono, c.direccion || "", c.saldoPendiente, c.limiteCredito]);
}

function datosClienteParaServidor(c: ClienteComercio) {
  return {
    nombre: c.nombre,
    identificacionRif: c.documento && c.documento !== "-" ? c.documento : undefined,
    telefono: c.telefono && c.telefono !== "-" ? c.telefono : undefined,
    direccion: c.direccion || undefined,
    limiteCredito: c.limiteCredito,
    saldoPendiente: c.saldoPendiente,
  };
}

function clienteDesdeServidor(c: ClienteServidor): ClienteComercio {
  return {
    id: `cl-${c.id}`,
    backendId: c.id,
    nombre: c.nombre,
    documento: c.identificacionRif || "-",
    telefono: c.telefono || "-",
    direccion: c.direccion || undefined,
    saldoPendiente: Number(c.saldoPendiente ?? 0),
    limiteCredito: Number(c.limiteCredito ?? 200),
    fechaRegistro: c.fechaRegistro ? c.fechaRegistro.split("T")[0] : undefined,
  };
}

function ventaARequest(v: VentaComercio): VentaMostradorRequest {
  return {
    numero: v.numero,
    clienteNombre: v.cliente?.nombre,
    clienteDocumento: v.cliente?.documento,
    total: v.total,
    utilidad: v.utilidad,
    metodoPago: v.metodoPago,
    esCredito: v.esCredito,
    detalleJson: JSON.stringify(v),
  };
}

// Días restantes hasta la fecha de vencimiento (negativo = ya venció). Mismo
// cálculo que RestauranteApp.diasParaVencer — se compara a medianoche local
// para no contar "hoy" como vencido por la hora del día.
function diasParaVencerComercio(fechaVencimiento: string): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVencimiento + "T00:00:00");
  return Math.round((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function textoVencimientoComercio(fechaVencimiento: string): { texto: string; color: string } {
  const d = diasParaVencerComercio(fechaVencimiento);
  if (d < 0) return { texto: `Vencido hace ${Math.abs(d)} día${Math.abs(d) === 1 ? "" : "s"}`, color: "text-rose-600 dark:text-rose-400" };
  if (d === 0) return { texto: "Vence hoy", color: "text-rose-600 dark:text-rose-400" };
  if (d <= 7) return { texto: `Vence en ${d} día${d === 1 ? "" : "s"}`, color: "text-amber-600 dark:text-amber-400" };
  if (d <= 30) return { texto: `Vence en ${d} días`, color: "text-amber-500 dark:text-amber-300" };
  return { texto: `Vence el ${new Date(fechaVencimiento + "T00:00:00").toLocaleDateString("es-VE")}`, color: "text-slate-500 dark:text-slate-400" };
}

// ══════════════════════════════════════════════════════════════════════════
// TIPOS Y MODELOS
// ══════════════════════════════════════════════════════════════════════════
// "comercio" es el nombre unificado para tenants nuevos (Ferretería/Repuestos/Retail
// bajo una sola identidad — ver comentario en ComercioApp más abajo); "ferreteria",
// "repuestos" y "retail" se mantienen como alias para tenants ya registrados con esos
// valores. Todos los cuatro se ven y funcionan exactamente igual. Farmacia es la
// única rama realmente distinta.
export type PerfilComercio = "ferreteria" | "farmacia" | "retail" | "repuestos" | "comercio";

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
  cantidadMinimaMayorista?: number;
  presentaciones?: PresentacionRepuesto[];
  visible?: boolean; // false = oculto del catálogo público (no del inventario/POS)
  ordenVisualizacion?: number; // menor = aparece primero en el catálogo público
  descripcionLarga?: string; // descripción de venta para el catálogo público
  imagenBase64?: string; // foto del producto (data-URI)
  grupoVariante?: string; // junta este SKU con otros (mismo zapato, otra talla) en una sola tarjeta pública
  atributoVariante?: string; // etiqueta de este SKU dentro del grupo (ej. "Talla 38")
  colorVariante?: string; // segunda faceta de variante (ej. "Rojo") — selector de color, luego talla
  exentoIva?: boolean; // no lleva IVA (cesta básica, medicinas...)
}

export interface LineaCarritoComercio {
  productoId: string;
  codigo: string;
  nombre: string;
  precio: number;
  costo?: number;
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
}

export interface CuentaComercio {
  id: string;
  tipo: "CXP" | "CXC";
  entidadNombre: string;
  entidadDocumento?: string;
  concepto: string;
  numeroDocumento?: string;
  montoOriginal: number;
  saldoPendiente: number;
  moneda: "USD" | "VES" | "COP";
  estado: "PENDIENTE" | "PAGADO";
  fechaRegistro: string;
  fechaVencimiento?: string;
  referenciaTipo?: "VENTA" | "COMPRA" | "SERVICIO" | "MANUAL";
  referenciaId?: string;
}

export interface ClienteComercio {
  id: string;
  backendId?: number; // id real en el servidor (tabla clientes); sin esto, el cliente aún no se ha guardado allá
  nombre: string;
  documento: string; // V-12345678 o J-12345678-0
  telefono: string;
  direccion?: string;
  saldoPendiente: number;
  limiteCredito: number;
  fechaRegistro?: string;
  totalCompras?: number;
  montoTotalComprado?: number;
  utilidadGenerada?: number;
  ultimaCompra?: string;
}

export interface PagoMixtoItem {
  id: string;
  metodo: string;
  moneda: "USD" | "VES" | "COP";
  montoOriginal: number;
  montoUSD: number;
  referencia?: string;
}

export interface VentaComercio {
  id: string;
  numero: string;
  cliente: ClienteComercio;
  lineas: LineaCarritoComercio[];
  fecha: string;
  /** Fecha y hora real (del servidor o del momento del cobro), para las estadísticas por hora y día. */
  fechaISO?: string;
  total: number;
  totalBs: number;
  totalCop: number;
  costoTotal?: number;
  utilidad?: number;
  metodoPago: string;
  esCredito: boolean;
  recibido?: number;
  monedaRecibida?: string;
  vuelto?: number;
  monedaVuelto?: string;
  desglosePagos?: Array<{ moneda: string; monto: number; label?: string }>;
  pagosMixtos?: PagoMixtoItem[];
  emailCliente?: string;
  /** Desglose fiscal que calculó el servidor al cobrar (IVA, IGTF, delivery). */
  fiscal?: DesgloseFiscalTicket & { ivaQuitado?: boolean };
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

/** Cliente genérico de mostrador: existe en todo negocio, no es un dato de demostración. */
/**
 * Número de ticket único: el servidor lo usa como clave permanente contra el doble cobro, así que
 * no puede repetirse nunca. Antes eran 6 dígitos al azar y hacia los mil tickets se repetía uno,
 * y esa venta no descontaba stock ni entraba a caja. Milisegundos + 4 caracteres al azar.
 */
function nuevoNumeroTicket(): string {
  const azar = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "0");
  return `TKT-${Date.now().toString(36).toUpperCase()}${azar}`;
}

const CONSUMIDOR_FINAL: ClienteComercio = { id: "c-1", nombre: "Consumidor Final", documento: "V-00000000", telefono: "—", saldoPendiente: 0, limiteCredito: 0 };

// Datos de demostración de versiones anteriores. Ya no se muestran; solo sirven para reconocerlos
// en cachés viejos del navegador y no subirlos al servidor como si fueran reales.
const CLIENTES_INICIALES: ClienteComercio[] = [
  { id: "c-1", nombre: "Consumidor Final", documento: "V-00000000", telefono: "—", saldoPendiente: 0, limiteCredito: 0 },
  { id: "c-2", nombre: "Taller Mecánico Hermanos Ramos", documento: "J-31456789-2", telefono: "0414-7581290", saldoPendiente: 145.50, limiteCredito: 500 },
  { id: "c-3", nombre: "Constructora Andina C.A.", documento: "J-40982314-1", telefono: "0424-7128901", saldoPendiente: 380.00, limiteCredito: 1200 },
  { id: "c-4", nombre: "Dr. Marcos Peñaloza", documento: "V-14567890", telefono: "0412-6543210", saldoPendiente: 0, limiteCredito: 200 },
];

export const VENTAS_INICIALES: VentaComercio[] = [
  {
    id: "v-seed-1",
    numero: "TKT-382910",
    cliente: { id: "c-2", nombre: "Taller Mecánico Hermanos Ramos", documento: "J-31456789-2", telefono: "0414-7581290", saldoPendiente: 145.50, limiteCredito: 500 },
    fecha: "18/09/2026, 10:30:15 AM",
    lineas: [
      { productoId: "f-3", codigo: "ACEI-20W50", nombre: "Aceite Motor 20W-50 Mineral 1L", precio: 5.50, costo: 3.20, cantidad: 4, unidadMedida: "Litro" },
      { productoId: "f-4", codigo: "FILT-PH8A", nombre: "Filtro de Aceite PH-8A Blindado", precio: 6.80, costo: 3.90, cantidad: 2, unidadMedida: "Pza" }
    ],
    total: 35.60,
    totalBs: 35.60 * 36.5,
    totalCop: 35.60 * 4000,
    costoTotal: 20.60,
    utilidad: 15.00,
    metodoPago: "PUNTO_VENTA",
    esCredito: false,
    recibido: 35.60,
    monedaRecibida: "USD"
  },
  {
    id: "v-seed-2",
    numero: "TKT-382945",
    cliente: { id: "c-2", nombre: "Taller Mecánico Hermanos Ramos", documento: "J-31456789-2", telefono: "0414-7581290", saldoPendiente: 145.50, limiteCredito: 500 },
    fecha: "19/09/2026, 03:45:00 PM",
    lineas: [
      { productoId: "f-1", codigo: "TORN-38", nombre: 'Tornillo Drywall 6x1" (Caja 100u)', precio: 2.80, costo: 1.50, cantidad: 5, unidadMedida: "Caja" },
      { productoId: "f-6", codigo: "BOMB-LED9", nombre: "Bombillo LED 9W Luz Blanca E27", precio: 1.95, costo: 0.90, cantidad: 4, unidadMedida: "Pza" }
    ],
    total: 21.80,
    totalBs: 21.80 * 36.5,
    totalCop: 21.80 * 4000,
    costoTotal: 11.10,
    utilidad: 10.70,
    metodoPago: "CREDITO_CUENTA",
    esCredito: true,
    recibido: 0,
    monedaRecibida: "USD"
  },
  {
    id: "v-seed-3",
    numero: "TKT-383012",
    cliente: { id: "c-3", nombre: "Constructora Andina C.A.", documento: "J-40982314-1", telefono: "0424-7128901", saldoPendiente: 380.00, limiteCredito: 1200 },
    fecha: "20/09/2026, 09:12:30 AM",
    lineas: [
      { productoId: "f-2", codigo: "DISC-45", nombre: 'Disco de Corte Metal 4.5" Extra Fino', precio: 1.20, costo: 0.65, cantidad: 20, unidadMedida: "Pza" },
      { productoId: "f-5", codigo: "TEFL-34", nombre: 'Teflón Industrial Alta Densidad 3/4"', precio: 0.85, costo: 0.35, cantidad: 10, unidadMedida: "Rollo" }
    ],
    total: 32.50,
    totalBs: 32.50 * 36.5,
    totalCop: 32.50 * 4000,
    costoTotal: 16.50,
    utilidad: 16.00,
    metodoPago: "PAGO_MOVIL",
    esCredito: false,
    recibido: 32.50 * 36.5,
    monedaRecibida: "VES"
  },
  {
    id: "v-seed-4",
    numero: "TKT-383150",
    cliente: { id: "c-4", nombre: "Dr. Marcos Peñaloza", documento: "V-14567890", telefono: "0412-6543210", saldoPendiente: 0, limiteCredito: 200 },
    fecha: "20/09/2026, 06:20:10 PM",
    lineas: [
      { productoId: "m-1", codigo: "ACET-500", nombre: "Acetaminofén 500mg (Caja 20 Tab)", precio: 1.50, costo: 0.70, cantidad: 2, unidadMedida: "Caja" },
      { productoId: "m-2", codigo: "IBUP-400", nombre: "Ibuprofeno 400mg (Caja 10 Tab)", precio: 2.10, costo: 1.10, cantidad: 1, unidadMedida: "Caja" }
    ],
    total: 5.10,
    totalBs: 5.10 * 36.5,
    totalCop: 5.10 * 4000,
    costoTotal: 2.50,
    utilidad: 2.60,
    metodoPago: "PUNTO_VENTA",
    esCredito: false,
    recibido: 5.10,
    monedaRecibida: "USD"
  }
];


// ══════════════════════════════════════════════════════════════════════════
// NOTA DE ENTREGA PDF — NORMATIVA SENIAT (Providencias 00071 / 0102)
// ══════════════════════════════════════════════════════════════════════════
function generarNotaEntregaPDF(
  venta: VentaComercio,
  nombreLocal: string,
  tasaActivaBs: number,
  tasaCop: number,
  descargar = true,
  // Si viene un numeroControl real (reservado vía siguienteNumeroControlFiscal,
  // ver FacturacionFiscalComercio), el documento se imprime como FACTURA fiscal
  // de verdad en vez de Nota de Entrega — nunca se inventa este número acá.
  datosFiscales?: { rif?: string; razonSocial?: string; numeroControl?: string }
): jsPDF {
  const esFactura = !!datosFiscales?.numeroControl;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 14;
  const colRight = W - margin;
  let y = 15;

  // ─── Encabezado Corporativo ───────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(datosFiscales?.razonSocial || nombreLocal, margin, y);
  if (esFactura && datosFiscales?.rif) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`RIF: ${datosFiscales.rif}`, margin, y + 5);
  }

  // Recuadro NOTA DE ENTREGA / FACTURA (esquina superior derecha)
  const ndX = W - 72;
  doc.setDrawColor(30, 150, 130);
  doc.setLineWidth(0.6);
  doc.rect(ndX, y - 8, 58, 24, "S");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 150, 130);
  doc.text(esFactura ? "FACTURA" : "NOTA DE ENTREGA", ndX + 29, y - 2, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(esFactura ? `N° Control: ${datosFiscales!.numeroControl}` : `Control N°: ND-${venta.numero}`, ndX + 29, y + 4, { align: "center" });
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-VE")}`, ndX + 29, y + 9, { align: "center" });
  doc.text(`Hora: ${new Date().toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}`, ndX + 29, y + 14, { align: "center" });
  doc.text(`Condición: ${venta.esCredito ? "A CRÉDITO (CXC)" : "CONTADO"}`, ndX + 29, y + 19, { align: "center" });

  y += 28;

  // ─── Datos del Cliente ──────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text("RECEPTOR:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(venta.cliente.nombre || "CONSUMIDOR FINAL", margin + 20, y);
  y += 5;
  doc.text(`C.I./RIF: ${venta.cliente.documento || "-"}`, margin, y);
  if (venta.cliente.telefono && venta.cliente.telefono !== "-") {
    doc.text(`Tel: ${venta.cliente.telefono}`, margin + 70, y);
  }
  if (venta.emailCliente) {
    doc.text(`Email: ${venta.emailCliente}`, margin + 120, y);
  }
  y += 7;

  // ─── Línea separadora ──────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, colRight, y);
  y += 5;

  // ─── Encabezado tabla de renglones ─────────────────────────────────
  doc.setFillColor(240, 250, 248);
  doc.rect(margin, y - 4, colRight - margin, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 120, 110);
  doc.text("Cant.", margin + 2, y);
  doc.text("Código", margin + 14, y);
  doc.text("Descripción", margin + 35, y);
  doc.text(`P. Unit. (${CODIGO()})`, margin + 110, y, { align: "right" });
  doc.text(`Subtotal ${CODIGO()}`, modoEuro() ? colRight - 2 : margin + 145, y, { align: "right" });
  if (!modoEuro()) doc.text("Subtotal Bs.", colRight - 2, y, { align: "right" });
  y += 3;
  doc.setDrawColor(180, 220, 215);
  doc.line(margin, y, colRight, y);
  y += 4;

  // ─── Renglones ─────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(8);
  venta.lineas.forEach((item) => {
    const subtotalUSD = item.precio * item.cantidad;
    const subtotalBs = subtotalUSD * tasaActivaBs;
    const nombre = item.nombre.length > 38 ? item.nombre.substring(0, 35) + "..." : item.nombre;
    doc.text(String(item.cantidad), margin + 2, y);
    doc.text(item.productoId || "-", margin + 14, y);
    doc.text(nombre, margin + 35, y);
    doc.text(`${SIM()}${item.precio.toFixed(2)}`, margin + 110, y, { align: "right" });
    doc.text(`${SIM()}${subtotalUSD.toFixed(2)}`, modoEuro() ? colRight - 2 : margin + 145, y, { align: "right" });
    if (!modoEuro()) doc.text(`Bs.${subtotalBs.toFixed(2)}`, colRight - 2, y, { align: "right" });
    y += 6;
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
  });

  y += 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, colRight, y);
  y += 6;

  // ─── Bloque de Totales ─────────────────────────────────────────────
  // En bolívares no se cobra IGTF: el total en Bs sale del subtotal sin IGTF.
  const totalBs = (venta.fiscal ? venta.fiscal.subtotal : venta.total) * tasaActivaBs;
  const totalCop = venta.total * tasaCop;
  const totX = colRight - 60;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const f = venta.fiscal;
  const lineaTotal = (etiqueta: string, monto: number) => {
    doc.text(etiqueta, totX, y);
    doc.text(`${SIM()}${monto.toFixed(2)}`, colRight - 2, y, { align: "right" });
    y += 5;
  };
  if (f && (f.alicuotaIva > 0 || f.iva > 0 || f.igtf > 0 || f.delivery > 0 || f.ivaQuitado)) {
    if (f.exento > 0) lineaTotal("Exento:", f.exento);
    lineaTotal(f.alicuotaIva > 0 || f.ivaQuitado ? "Base imponible:" : `Subtotal ${CODIGO()}:`, f.baseImponible);
    if (f.alicuotaIva > 0) lineaTotal(`IVA ${f.alicuotaIva}%:`, f.iva);
    if (f.igtf > 0) lineaTotal("IGTF (pago en divisas):", f.igtf);
  } else {
    lineaTotal(`Subtotal ${CODIGO()}:`, venta.total);
  }
  if (!modoEuro()) {
  doc.text(`Tasa BCV aplicada:`, totX, y);
  doc.text(`Bs.${tasaActivaBs.toFixed(2)}/USD`, colRight - 2, y, { align: "right" });
  y += 5;
  doc.text("Total en Bolívares:", totX, y);
  doc.text(`Bs.${totalBs.toFixed(2)}`, colRight - 2, y, { align: "right" });
  y += 5;
  }
  if (tasaCop > 0) {
    doc.text("Equivalente COP:", totX, y);
    doc.text(`COP ${Math.round(totalCop).toLocaleString("en-US")}`, colRight - 2, y, { align: "right" });
    y += 5;
  }

  // TOTAL resaltado
  doc.setFillColor(30, 150, 130);
  doc.rect(totX - 2, y - 4, colRight - totX + 4, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("TOTAL A PAGAR:", totX, y + 1);
  doc.text(`${SIM()}${venta.total.toFixed(2)} USD`, colRight - 2, y + 1, { align: "right" });
  y += 12;

  // ─── Detalle de Formas de Pago ─────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  doc.text("FORMAS DE PAGO RECIBIDAS:", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  if (venta.pagosMixtos && venta.pagosMixtos.length > 0) {
    venta.pagosMixtos.forEach((p) => {
      const ref = p.referencia ? ` (Ref: ${p.referencia})` : "";
      const montoFmt = p.moneda === "USD" ? `${SIM()}${p.montoOriginal.toFixed(2)} ${CODIGO()}` :
        p.moneda === "VES" ? `Bs.${p.montoOriginal.toFixed(2)}` :
        `COP ${Math.round(p.montoOriginal).toLocaleString("en-US")}`;
      doc.text(`• ${p.metodo}${ref}: ${montoFmt} → ${SIM()}${p.montoUSD.toFixed(2)} ${CODIGO()}`, margin + 3, y);
      y += 5;
    });
  } else {
    const metLabel: Record<string,string> = {
      EFECTIVO_USD: `Efectivo ${CODIGO()}`, EFECTIVO_BS: "Efectivo Bs.", PAGO_MOVIL: "Pago Móvil",
      PUNTO_VENTA: "Punto Débito", ZELLE: "Zelle / USDT", COP_EFECTIVO: "Pesos COP",
      CREDITO_CUENTA: "Crédito (CXC)"
    };
    doc.text(`• ${metLabel[venta.metodoPago] || venta.metodoPago}: ${SIM()}${venta.total.toFixed(2)} ${CODIGO()}`, margin + 3, y);
    y += 5;
  }

  if (venta.esCredito) {
    doc.setTextColor(180, 100, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`⚠ PENDIENTE CXC: ${SIM()}${venta.total.toFixed(2)} USD — Cliente: ${venta.cliente.nombre}`, margin, y);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    y += 6;
  }

  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, colRight, y);
  y += 8;

  // ─── Leyenda SENIAT ────────────────────────────────────────────────
  // (El bloque de firmas "Entregado/Recibido Conforme" se quitó a pedido del
  // dueño — muchos comercios entregan la nota sin exigir firma física.)
  // Si ES factura fiscal real (Formato Libre con N° Control asignado), NO se
  // imprime el descargo "no constituye Factura Fiscal" — sería falso y
  // contradictorio con el número de control que sí tiene.
  doc.setFontSize(6.5);
  doc.setTextColor(90, 90, 90);
  doc.setFont("helvetica", "italic");
  const leyenda = esFactura
    ? "Factura elaborada bajo el régimen de Formato Libre autorizado por el SENIAT. Reclamos dentro de las 48 horas siguientes a la recepción."
    : "Documento no sujeto a retención ni constituye Factura Fiscal conforme a las normativas del SENIAT (Providencias 00071 y 0102). Comprobante para soporte de entrega, inventario y recepción de mercancía. Reclamos dentro de las 48 horas siguientes a la recepción.";
  const lines = doc.splitTextToSize(leyenda, colRight - margin);
  doc.text(lines, margin, y);

  if (descargar) {
    doc.save(`${esFactura ? "Factura_" + datosFiscales!.numeroControl : "NotaEntrega_ND-" + venta.numero}_${venta.cliente.nombre.replace(/\s+/g, "_")}.pdf`);
  }
  return doc;
}

/** Envoltorio async: reserva el siguiente N° de control fiscal SOLO si el negocio
 * tiene Formato Libre activo (ver FacturacionFiscalComercio) — si no, genera la
 * Nota de Entrega normal, exactamente como antes de que existiera esta función. */
async function descargarNotaEntregaOFactura(venta: VentaComercio, nombreLocal: string, tasaActivaBs: number, tasaCop: number) {
  try {
    const [{ numeroControl }, datosFiscales] = await Promise.all([
      siguienteNumeroControlFiscal(),
      numeroControl_cache_datosFiscales ?? obtenerDatosFiscalesNegocio(),
    ]);
    numeroControl_cache_datosFiscales = datosFiscales;
    if (numeroControl) {
      generarNotaEntregaPDF(venta, nombreLocal, tasaActivaBs, tasaCop, true, { rif: datosFiscales.rif, razonSocial: datosFiscales.razonSocial, numeroControl });
      return;
    }
  } catch {
    // Si falla la reserva del número fiscal (ej. rango agotado), no se pierde la
    // venta ni el comprobante — se degrada a Nota de Entrega normal.
  }
  generarNotaEntregaPDF(venta, nombreLocal, tasaActivaBs, tasaCop, true);
}
// Cache simple en memoria del módulo — los datos fiscales del negocio no cambian
// mientras dura la sesión, evita pedirlos de nuevo en cada venta impresa.
let numeroControl_cache_datosFiscales: DatosFiscalesNegocio | null = null;

// ══════════════════════════════════════════════════════════════════════════
// ENVÍO POR CORREO — mailto: 1-clic con adjunto de datos
// ══════════════════════════════════════════════════════════════════════════
function enviarNotaEntregaPorCorreo(
  venta: VentaComercio,
  nombreLocal: string,
  tasaActivaBs: number,
  tasaCop: number
) {
  // Generar y descargar el PDF primero
  generarNotaEntregaPDF(venta, nombreLocal, tasaActivaBs, tasaCop, true);

  const email = venta.emailCliente || "";
  const asunto = encodeURIComponent(`Nota de Entrega ND-${venta.numero} — ${nombreLocal}`);

  const pagoStr = venta.pagosMixtos && venta.pagosMixtos.length > 0
    ? venta.pagosMixtos.map(p => {
        const ref = p.referencia ? ` (Ref: ${p.referencia})` : "";
        const m = p.moneda === "USD" ? `${SIM()}${p.montoOriginal.toFixed(2)} ${CODIGO()}` :
          p.moneda === "VES" ? `Bs.${p.montoOriginal.toFixed(2)}` :
          `COP ${Math.round(p.montoOriginal).toLocaleString("en-US")}`;
        return `  - ${p.metodo}${ref}: ${m} → ${SIM()}${p.montoUSD.toFixed(2)} ${CODIGO()}`;
      }).join("\n")
    : `  - ${venta.metodoPago}: ${SIM()}${venta.total.toFixed(2)} USD`;

  const lineasStr = venta.lineas.map(l =>
    `  ${l.cantidad}x ${l.nombre} @ ${SIM()}${l.precio.toFixed(2)} = ${SIM()}${(l.precio * l.cantidad).toFixed(2)} USD`
  ).join("\n");

  const cuerpo = encodeURIComponent(
`Estimado/a ${venta.cliente.nombre},

Adjunto encontrará (o puede descargar a continuación) su Nota de Entrega N° ND-${venta.numero} emitida el ${new Date().toLocaleDateString("es-VE")} por ${nombreLocal}.

═══════════════════════════════════════
  NOTA DE ENTREGA — ND-${venta.numero}
  Fecha: ${venta.fecha}
  Cond.: ${venta.esCredito ? "A CRÉDITO" : "CONTADO"}
═══════════════════════════════════════

PRODUCTOS:
${lineasStr}

──────────────────────────────────────
TOTAL:          ${SIM()}${venta.total.toFixed(2)} ${CODIGO()}
${modoEuro() ? "" : `En Bolívares:   Bs.${(venta.total * tasaActivaBs).toFixed(2)} (Tasa: ${tasaActivaBs.toFixed(2)})`}
${tasaCop > 0 ? `En Pesos COP:   COP ${Math.round(venta.total * tasaCop).toLocaleString("en-US")}\n` : ""}
FORMAS DE PAGO:
${pagoStr}
──────────────────────────────────────

Si tiene alguna consulta o reclamo, comuníquese dentro de las 48 horas.

Atentamente,
${nombreLocal}

──────────────────────────────────────
NOTA LEGAL: Este correo y su documento adjunto no constituyen Factura Fiscal conforme a las normativas del SENIAT. Son documentos internos de entrega y recepción de mercancía.`
  );

  window.location.href = `mailto:${email}?subject=${asunto}&body=${cuerpo}`;
}

// ══════════════════════════════════════════════════════════════════════════
// IMPRESIÓN TÉRMICA UNIVERSAL PARA COMERCIO (80mm / 58mm)
// ══════════════════════════════════════════════════════════════════════════
// Sugerencia de qué pedir como "atributo" de variante según palabras clave en la
// categoría escrita — no reemplaza un sistema de categorías configurable, solo evita
// que el dueño tenga que adivinar si acá va una talla, un modelo o un color.
// Fecha LOCAL en formato YYYY-MM-DD — nunca usar Date.toISOString().slice(0,10)
// para "hoy": toISOString() convierte a UTC primero, así que en Venezuela
// (UTC-4) cualquier venta hecha después de las 8pm local cae en el día
// SIGUIENTE en UTC. Reportes que piden "hoy" con la fecha UTC (Utilidad Real,
// Costo Real) terminaban pidiéndole al backend un día que todavía no
// arrancaba en su zona horaria, y como no había ventas registradas ahí,
// mostraban "—" aunque sí hubiera ventas reales esa noche.
function fechaLocalISO(fecha: Date = new Date()): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const SUGERENCIAS_ATRIBUTO_POR_CATEGORIA: { patrones: string[]; etiqueta: string; placeholder: string }[] = [
  { patrones: ["zapato", "calzado", "tenis", "bota", "sandalia"], etiqueta: "Talla del calzado", placeholder: "Ej. 38, 39, 40…" },
  { patrones: ["celular", "telefono", "teléfono", "smartphone"], etiqueta: "Modelo del teléfono", placeholder: "Ej. iPhone 13, Galaxy A54…" },
  { patrones: ["ropa", "camisa", "camiseta", "chaqueta", "pantalon", "pantalón", "blusa", "vestido", "franela"], etiqueta: "Talla de la prenda", placeholder: "Ej. S, M, L, XL…" },
  { patrones: ["perfume", "fragancia", "colonia"], etiqueta: "Presentación", placeholder: "Ej. 50ml, 100ml…" },
];

function sugerirAtributoPorCategoria(categoria: string): { etiqueta: string; placeholder: string } {
  const c = categoria.trim().toLowerCase();
  if (c) {
    for (const s of SUGERENCIAS_ATRIBUTO_POR_CATEGORIA) {
      if (s.patrones.some((p) => c.includes(p))) return { etiqueta: s.etiqueta, placeholder: s.placeholder };
    }
  }
  return { etiqueta: "Esta variante es…", placeholder: "Ej. Talla 38, Rojo, Modelo X…" };
}

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
            <span class="right bold">${SIM()}${(l.precio * l.cantidad).toFixed(2)}</span>
          </div>
          ${l.lote ? `<div class="item-sub">↳ Lote: ${l.lote} (Vence: ${l.fechaVencimiento || "N/A"})</div>` : ""}
          ${l.unidadMedida ? `<div class="item-sub">↳ Unidad: ${l.unidadMedida}</div>` : ""}
        `).join("")}
        <div class="divider"></div>
        <div class="total-row">
          <span>TOTAL USD:</span>
          <span>${SIM()}${venta.total.toFixed(2)}</span>
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
            <span>COP ${SIM()}${venta.totalCop.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
          </div>
        ` : ""}
        <div class="divider"></div>
        <div><strong>Método:</strong> ${venta.esCredito ? "VENTA A CRÉDITO " : venta.metodoPago.replace("_", " ")}</div>
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
// VISTA GENERAL (DASHBOARD): panel de control diario para el dueño — en este
// orden, a propósito, porque es el orden en que un administrador necesita
// decidir algo al abrir la pantalla en la mañana:
//   1. Rentabilidad de HOY (no solo ventas — ver nota más abajo)
//   2. Pulso de la semana
//   3. Lo que requiere acción YA (stock bajo)
//   4. Accesos directos a lo que se usa todos los días
// Lee datos que ya viven en el componente padre (productos, ingresos de
// caja) — solo pide al backend la utilidad real (RepuestosReporteService),
// que nadie más ya tiene cargada.
// ══════════════════════════════════════════════════════════════════════════
/** Ventas, costo, margen y resultado del mes, sin salir de Comercio. Son los mismos números de
 * Aurora Finanzas (endpoint /api/empresa/kpis), filtrados a esta vertical cuando el negocio tiene
 * varias; el consolidado de todas las verticales queda a un clic. Si el usuario no tiene permiso
 * (solo dueño/administración), la franja no aparece. */
function ResumenFinancieroComercio() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState<EmpresaKpiResponse | null>(null);

  useEffect(() => {
    const hoy = new Date();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    obtenerEmpresaKpis(iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), iso(hoy))
      .then(setDatos)
      .catch(() => setDatos(null));
  }, []);

  if (!datos) return null;
  const variasVerticales = datos.porModulo.length > 1;
  const propio = datos.porModulo.find((m) => m.modulo === "REPUESTOS");
  const ventas = variasVerticales && propio ? propio.ventasBrutas : datos.consolidado.ventasBrutas;
  const costo = variasVerticales && propio ? propio.costoVentas : datos.consolidado.costoVentas;
  const margen = ventas - costo;
  const fmt = (v: number) => `${SIM()}${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const tarjetas = [
    { titulo: "Ventas del mes", valor: fmt(ventas), nota: "Ventas brutas registradas" },
    { titulo: "Costo de ventas", valor: fmt(costo), nota: "Costo de lo vendido" },
    {
      titulo: "Margen bruto",
      valor: fmt(margen),
      nota: ventas > 0 ? `${((margen / ventas) * 100).toFixed(1)}% sobre ventas` : "Sin ventas aún",
      // El margen se lee de un vistazo: verde si deja ganancia, rojo si se vende a perdida.
      tono: ventas > 0 ? (margen >= 0 ? "positivo" : "negativo") : undefined,
    },
    {
      titulo: variasVerticales ? "Resultado del negocio" : "Resultado estimado",
      valor: fmt(datos.consolidado.resultadoEstimado),
      nota: variasVerticales ? "Todas tus verticales, menos gastos" : "Margen menos gastos registrados",
    },
  ];

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Resumen financiero del mes</h3>
        <button type="button" onClick={() => navigate("/finanzas")} className="text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer">
          Ver consolidado en Aurora Finanzas →
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tarjetas.map((t) => (
          <div key={t.titulo} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t.titulo}</div>
            <div className="mt-1 font-['Outfit'] font-black text-xl text-slate-900 dark:text-white truncate">{t.valor}</div>
            {"tono" in t && t.tono ? (
              <span
                className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  t.tono === "positivo"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                    : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30"
                }`}
              >
                {t.tono === "positivo" ? "▲" : "▼"} {t.nota}
              </span>
            ) : (
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t.nota}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardGeneralComercio({
  productos,
  ingresosCaja,
  ventas,
  cuentas,
  tasaActivaBs,
  tasaCop,
  esAdmin,
  nombreNegocio,
  tenantId,
  onIrAInventario,
  onIrAPos,
  onIrAProveedores,
  onIrAUtilidad,
  onIrACuentas,
}: {
  productos: ProductoComercio[];
  ingresosCaja: MovimientoCaja[];
  ventas: VentaComercio[];
  cuentas: CuentaComercio[];
  tasaActivaBs: number;
  tasaCop: number;
  esAdmin: boolean;
  nombreNegocio: string;
  tenantId?: number;
  onIrAInventario: () => void;
  onIrAPos: () => void;
  onIrAProveedores: () => void;
  onIrAUtilidad: () => void;
  onIrACuentas: () => void;
}) {
  const sumarPorMoneda = (movimientos: MovimientoCaja[]) => {
    const acc: Record<string, number> = {};
    for (const m of movimientos) acc[m.moneda] = (acc[m.moneda] || 0) + Number(m.monto);
    return acc;
  };

  const { ventasHoy, ventasSemana, cambioSemanaPct } = useMemo(() => {
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const inicioSemana = new Date(inicioHoy);
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    const inicioSemanaPasada = new Date(inicioSemana);
    inicioSemanaPasada.setDate(inicioSemanaPasada.getDate() - 7);

    // Todo convertido a USD solo para este comparativo (el desglose por moneda que
    // se muestra en la tarjeta sigue intacto) — comparar "semana pasada vs esta
    // semana" necesita un solo número, no un mapa de monedas distintas.
    const aUSD = (m: MovimientoCaja) => {
      const monto = Number(m.monto) || 0;
      if (m.moneda === "USD") return monto;
      if (m.moneda === "VES") return tasaActivaBs > 0 ? monto / tasaActivaBs : 0;
      if (m.moneda === "COP") return tasaCop > 0 ? monto / tasaCop : 0;
      return 0;
    };
    const totalSemanaUSD = ingresosCaja
      .filter((m) => new Date(m.fechaRegistro) >= inicioSemana)
      .reduce((acc, m) => acc + aUSD(m), 0);
    const totalSemanaPasadaUSD = ingresosCaja
      .filter((m) => { const f = new Date(m.fechaRegistro); return f >= inicioSemanaPasada && f < inicioSemana; })
      .reduce((acc, m) => acc + aUSD(m), 0);
    // null = sin base de comparación real (nunca se inventa un "+100%" contra cero).
    const cambioSemanaPct = totalSemanaPasadaUSD > 0
      ? ((totalSemanaUSD - totalSemanaPasadaUSD) / totalSemanaPasadaUSD) * 100
      : null;

    return {
      ventasHoy: sumarPorMoneda(ingresosCaja.filter((m) => new Date(m.fechaRegistro) >= inicioHoy)),
      ventasSemana: sumarPorMoneda(ingresosCaja.filter((m) => new Date(m.fechaRegistro) >= inicioSemana)),
      cambioSemanaPct,
    };
  }, [ingresosCaja, tasaActivaBs, tasaCop]);

  // Función robusta para determinar si una venta fue realizada el día de hoy
  const esFechaDeHoy = (fechaStr?: string): boolean => {
    if (!fechaStr) return false;
    const hoy = new Date();
    const dHoy = hoy.getDate();
    const mHoy = hoy.getMonth() + 1;
    const yHoy = hoy.getFullYear();

    const parsed = new Date(fechaStr);
    if (!isNaN(parsed.getTime())) {
      if (parsed.getDate() === dHoy && (parsed.getMonth() + 1) === mHoy && parsed.getFullYear() === yHoy) {
        return true;
      }
    }

    const hoyDdmmyyyy = `${dHoy.toString().padStart(2, "0")}/${mHoy.toString().padStart(2, "0")}/${yHoy}`;
    const hoyYyyymmdd = `${yHoy}-${mHoy.toString().padStart(2, "0")}-${dHoy.toString().padStart(2, "0")}`;
    return fechaStr.includes(hoyDdmmyyyy) || fechaStr.includes(hoyYyyymmdd);
  };

  // Cálculo integral de ventas hoy: cantidad de tickets, desglose por moneda cobrada y consolidado
  const {
    cantidadVentasHoy,
    totalConsolidadoUSD,
    totalConsolidadoBs,
    totalConsolidadoCop,
    cobradoUSD,
    cobradoBs,
    cobradoCop,
  } = useMemo(() => {
    const listaHoy = (ventas || []).filter((v) => esFechaDeHoy(v.fecha));
    const cant = listaHoy.length;

    let totUSD = 0;
    let cUSD = 0;
    let cBs = 0;
    let cCop = 0;

    listaHoy.forEach((v) => {
      totUSD += v.total || 0;
      if (v.desglosePagos && v.desglosePagos.length > 0) {
        v.desglosePagos.forEach((p) => {
          if (p.moneda === "USD") cUSD += p.monto;
          else if (p.moneda === "VES") cBs += p.monto;
          else if (p.moneda === "COP") cCop += p.monto;
        });
      } else {
        const mon = v.monedaRecibida || (
          v.metodoPago === "COP_EFECTIVO" ? "COP" :
          (v.metodoPago === "EFECTIVO_BS" || v.metodoPago === "PAGO_MOVIL" || v.metodoPago === "PUNTO_VENTA") ? "VES" : "USD"
        );
        if (mon === "USD") cUSD += (v.recibido || v.total || 0);
        else if (mon === "VES") cBs += (v.recibido || v.totalBs || (v.total * tasaActivaBs));
        else if (mon === "COP") cCop += (v.recibido || v.totalCop || (v.total * tasaCop));
      }
    });

    // Si además hay movimientos de caja backend hoy y no había ventas locales
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const ingresosHoy = (ingresosCaja || []).filter((m) => new Date(m.fechaRegistro) >= inicioHoy);
    if (cant === 0 && ingresosHoy.length > 0) {
      ingresosHoy.forEach((m) => {
        const monto = Number(m.monto) || 0;
        if (m.moneda === "USD") { cUSD += monto; totUSD += monto; }
        else if (m.moneda === "VES") { cBs += monto; totUSD += (tasaActivaBs > 0 ? monto / tasaActivaBs : 0); }
        else if (m.moneda === "COP") { cCop += monto; totUSD += (tasaCop > 0 ? monto / tasaCop : 0); }
      });
    }

    const totBs = tasaActivaBs > 0 ? totUSD * tasaActivaBs : 0;
    const totCop = tasaCop > 0 ? totUSD * tasaCop : 0;

    return {
      cantidadVentasHoy: cant > 0 ? cant : ingresosHoy.length,
      totalConsolidadoUSD: totUSD,
      totalConsolidadoBs: totBs,
      totalConsolidadoCop: totCop,
      cobradoUSD: cUSD,
      cobradoBs: cBs,
      cobradoCop: cCop,
    };
  }, [ventas, ingresosCaja, tasaActivaBs, tasaCop]);

  const productosBajoStock = useMemo(
    () => productos.filter((p) => p.stock <= p.stockMinimo).sort((a, b) => a.stock / Math.max(a.stockMinimo, 1) - b.stock / Math.max(b.stockMinimo, 1)),
    [productos]
  );
  // Agotado (stock 0) es una urgencia distinta de "bajo mínimo" (todavía queda
  // algo) — separados para que el dueño vea de un vistazo cuántos ya no puede
  // vender en absoluto, no solo cuántos están por debajo del umbral.
  const productosAgotados = useMemo(() => productosBajoStock.filter((p) => p.stock <= 0), [productosBajoStock]);
  const productosSinCosto = useMemo(() => productos.filter((p) => !p.costo || p.costo <= 0).length, [productos]);

  // Cuentas por pagar pendientes, más próximas a vencer primero (sin fecha = al
  // final) — resumen rápido en el dashboard; el detalle completo y "Pagar/Abonar"
  // real siguen viviendo solo en Administración > Cuentas por Cobrar & Pagar.
  const cuentasPorPagarProximas = useMemo(
    () => cuentas
      .filter((c) => c.tipo === "CXP" && c.estado !== "PAGADO" && c.saldoPendiente > 0)
      .sort((a, b) => {
        if (!a.fechaVencimiento && !b.fechaVencimiento) return 0;
        if (!a.fechaVencimiento) return 1;
        if (!b.fechaVencimiento) return -1;
        return new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime();
      })
      .slice(0, 5),
    [cuentas]
  );
  const diasParaVencerCuenta = (fecha: string): number => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const venc = new Date(fecha + "T00:00:00");
    return Math.round((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Ventas de hoy, más reciente primero — antes solo se veía el total consolidado
  // en la tarjeta de arriba, sin ningún detalle de "qué se vendió y cuándo", así
  // que después de cobrar no había dónde confirmarlo de un vistazo en Vista General.
  // Mismo criterio de respaldo que ya usa el total consolidado (arriba): si no hay
  // ventas locales (`ventas`) pero SÍ hay ingresos de caja de hoy —caso típico
  // justo después de recargar la página, antes de que el historial de ventas
  // termine de cargar—, se muestra el detalle desde ahí para que ambos coincidan.
  const ventasHoyOrdenadas = useMemo(
    () => (ventas || []).filter((v) => esFechaDeHoy(v.fecha)).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [ventas]
  );
  // Fila expandida en "Ventas de Hoy" — clic para ver el detalle (productos,
  // cliente, desglose de pago) sin salir de Vista General ni ir al POS.
  const [ventaHoyExpandidaId, setVentaHoyExpandidaId] = useState<string | number | null>(null);
  // Capturas de pago que se acaban de subir en esta sesión — el prop
  // `ingresosCaja` no se vuelve a pedir al backend después de subir, así que
  // sin esto la miniatura no aparecería hasta refrescar la página.
  const [capturasPagoSubidas, setCapturasPagoSubidas] = useState<Record<number, string>>({});
  const [subiendoComprobanteId, setSubiendoComprobanteId] = useState<number | null>(null);
  const [errorComprobanteId, setErrorComprobanteId] = useState<number | null>(null);
  // Visor propio en vez de <a target="_blank"> — Chrome bloquea navegar una
  // pestaña nueva directo a una imagen "data:" (protección anti-phishing), así
  // que el link se quedaba abriendo una pestaña que nunca cargaba nada.
  const [comprobanteAmpliado, setComprobanteAmpliado] = useState<string | null>(null);

  const ingresosHoyOrdenados = useMemo(() => {
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    return (ingresosCaja || [])
      .filter((m) => new Date(m.fechaRegistro) >= inicioHoy)
      .sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());
  }, [ingresosCaja]);

  const fmtMonedas = (obj: Record<string, number>) => {
    const entradas = Object.entries(obj);
    if (entradas.length === 0) return "$0.00";
    return entradas.map(([m, v]) => `${prefijoMoneda(m)}${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" · ");
  };

  // Utilidad real de HOY — no es lo mismo que ventas (ver conversación con el
  // dueño: "no veo algo que indique la utilidad"). Solo se pide si el usuario
  // puede verla (mismo criterio que el backend, ReporteRepuestoController).
  const [utilidadHoy, setUtilidadHoy] = useState<UtilidadPeriodoRepuesto | null>(null);
  const [cargandoUtilidad, setCargandoUtilidad] = useState(esAdmin);
  useEffect(() => {
    if (!esAdmin) { setCargandoUtilidad(false); return; }
    const hoy = fechaLocalISO();
    obtenerUtilidadRepuestos(hoy, hoy)
      .then(setUtilidadHoy)
      .catch(() => setUtilidadHoy(null))
      .finally(() => setCargandoUtilidad(false));
  }, [esAdmin]);

  // Checklist de primeros pasos — solo se muestra mientras falte alguno. Un
  // negocio recién creado con todo en cero no debe sentirse "vacío" sino
  // guiado — mismo lenguaje visual que ya usa Ganadería para su onboarding.
  const tieneProductos = productos.length > 0;
  const tieneCosto = productos.some((p) => p.costo > 0);
  const tieneVentaRegistrada = ingresosCaja.length > 0;
  const pasosCompletados = (tieneProductos ? 1 : 0) + (tieneCosto ? 1 : 0) + (tieneVentaRegistrada ? 1 : 0);
  const mostrarChecklist = pasosCompletados < 3;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── CHECKLIST DE PRIMEROS PASOS (solo mientras el negocio está empezando) ── */}
      {mostrarChecklist && (
        <section className="rounded-3xl p-6 border border-teal-500/30 bg-gradient-to-br from-teal-500/5 via-white to-white dark:from-teal-500/10 dark:via-slate-900 dark:to-slate-900 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Outfit'] font-black text-base text-slate-900 dark:text-white">Primeros pasos para tu negocio</h3>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-400 font-bold border border-teal-500/30">
                  {pasosCompletados} de 3
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Completa esto y tu panel empezará a mostrar ventas, costos y utilidad real.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { paso: 1, hecho: tieneProductos, titulo: "Registra tu primer producto", detalle: tieneProductos ? `${productos.length} producto${productos.length === 1 ? "" : "s"} en tu catálogo.` : "Dale de alta a lo que vendes, con su precio de venta.", accion: "+ Nuevo Producto", onClick: onIrAInventario },
              { paso: 2, hecho: tieneCosto, titulo: "Registra tu primera compra", detalle: tieneCosto ? "Ya tienes costo real registrado — tu margen se calcula solo." : "Sin esto no podemos calcular cuánto ganas de verdad.", accion: "Registrar Compra", onClick: onIrAProveedores },
              { paso: 3, hecho: tieneVentaRegistrada, titulo: "Haz tu primera venta", detalle: tieneVentaRegistrada ? "Ya estás vendiendo — sigue así." : "Cóbrale a tu primer cliente desde el mostrador.", accion: "Ir al POS", onClick: onIrAPos },
            ].map((p) => (
              <div key={p.paso} className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${p.hecho ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-teal-500/40"}`}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Paso {p.paso}</span>
                    <span className={`text-[10px] font-bold ${p.hecho ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {p.hecho ? "Completado" : "Pendiente"}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{p.titulo}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.detalle}</p>
                </div>
                <button
                  type="button"
                  onClick={p.onClick}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${p.hecho ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25" : "bg-teal-600 text-white hover:bg-teal-500 shadow-sm"}`}
                >
                  {p.accion}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 1. RENTABILIDAD DE HOY — tarjeta héroe (Ventas) + cinta secundaria (Utilidad / Alertas) ── */}
      <section className="space-y-2.5">
        <h3 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider px-0.5">Hoy</h3>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Tarjeta héroe: Ventas de Hoy Multi-Moneda */}
          <div className="lg:col-span-7 self-start bg-white dark:bg-slate-900 rounded-2xl p-5 border border-teal-200 dark:border-teal-500/30 shadow-sm space-y-3.5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 px-2.5 py-0.5 rounded-full">
                    Ventas de Hoy
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                    {cantidadVentasHoy === 0
                      ? "Sin ventas hoy"
                      : cantidadVentasHoy === 1
                      ? "1 venta hoy"
                      : `${cantidadVentasHoy} ventas hoy`}
                  </span>
                </div>

                {/* Total Consolidado */}
                <div className="mt-2 font-['Outfit'] font-black text-3xl text-teal-700 dark:text-teal-400 tracking-tight">
                  {SIM()}{totalConsolidadoUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                  <span className="text-xs font-bold text-slate-400 font-sans uppercase">Vendido Hoy</span>
                </div>
                {cantidadVentasHoy > 0 && (
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                    Ticket promedio: <span className="text-slate-700 dark:text-slate-200 font-mono">{SIM()}{(totalConsolidadoUSD / cantidadVentasHoy).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {/* Equivalencias oficiales — COP solo si el negocio configuró esa tasa;
                    mostrarla siempre a un negocio que nunca cobra en pesos es ruido puro. */}
                <div className={`flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 pt-0.5 flex-wrap ${modoEuro() ? "hidden" : ""}`}>
                  <span>Equivalente:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    Bs. {totalConsolidadoBs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {tasaCop > 0 && (
                    <>
                      <span>·</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        COP {SIM()}{Math.round(totalConsolidadoCop).toLocaleString()}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0 border border-teal-200 dark:border-teal-500/30">
                <IconChart size={18} />
              </div>
            </div>

            {/* Desglose real por tipo de moneda recibida */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Cobrado por moneda:
              </div>
              <div className={`grid gap-2 ${modoEuro() ? "grid-cols-1" : tasaCop > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
                {/* Dólares (o Euros en modo euro) */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-0.5">
                    <span>{modoEuro() ? "Euros" : "Dólares"}</span>
                    <span className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">{SIM()} {CODIGO()}</span>
                  </div>
                  <div className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 truncate">
                    {SIM()}{cobradoUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Bolívares (no existen en modo euro) */}
                <div className={`p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 ${modoEuro() ? "hidden" : ""}`}>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-0.5">
                    <span>Bolívares</span>
                    <span className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">Bs.</span>
                  </div>
                  <div className="font-mono font-black text-sm text-cyan-600 dark:text-cyan-400 truncate">
                    Bs. {cobradoBs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Pesos COP — solo si el negocio configuró una tasa USD->COP */}
                {tasaCop > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-0.5">
                      <span>Pesos COP</span>
                      <span className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">COP $</span>
                    </div>
                    <div className="font-mono font-black text-sm text-amber-600 dark:text-amber-400 truncate">
                      COP {SIM()}{Math.round(cobradoCop).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cinta secundaria: Utilidad Real + Requiere atención */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
            {esAdmin ? (
              <button type="button" onClick={onIrAUtilidad} className="text-left flex items-center justify-between gap-3 cursor-pointer group">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Utilidad Real</span>
                  {cargandoUtilidad ? (
                    <div className="text-xs text-slate-400">Calculando…</div>
                  ) : utilidadHoy && utilidadHoy.ventasBrutas > 0 ? (
                    <>
                      <div className="font-['Outfit'] font-black text-xl text-emerald-700 dark:text-emerald-400 truncate">
                        {prefijoMoneda(utilidadHoy.moneda)}{utilidadHoy.utilidad.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {utilidadHoy.margenPct !== null && (
                        <div className="text-[10px] text-slate-400 truncate">{utilidadHoy.margenPct.toFixed(1)}% de margen{utilidadHoy.coberturaPct < 100 ? ` · ${utilidadHoy.coberturaPct.toFixed(0)}% con costo conocido` : ""}</div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 mt-1">{tieneVentaRegistrada ? "Sin ventas hoy" : "Se calcula cuando registres tu primera venta con costo"}</div>
                  )}
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors"><IconCoins size={15} className="text-emerald-600 dark:text-emerald-400" /></div>
              </button>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Utilidad Real</span>
                  <div className="text-[11px] text-slate-400">Solo Dueño/Admin</div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => document.getElementById("alertas-inventario-bajo")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              disabled={productosBajoStock.length === 0}
              className={`w-full pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-left ${productosBajoStock.length > 0 ? "cursor-pointer" : "cursor-default"}`}
            >
              <div className="min-w-0">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${productosBajoStock.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`}>Requiere tu atención</span>
                <div className={`font-['Outfit'] font-black text-sm truncate ${productosBajoStock.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                  {productosBajoStock.length > 0
                    ? `${productosBajoStock.length} producto${productosBajoStock.length === 1 ? "" : "s"} bajo mínimo${productosAgotados.length > 0 ? ` (${productosAgotados.length} agotado${productosAgotados.length === 1 ? "" : "s"})` : ""} — ver →`
                    : "Todo en orden"}
                </div>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${productosBajoStock.length > 0 ? "bg-amber-500/15 group-hover:bg-amber-500/25" : "bg-emerald-500/10"}`}>
                {productosBajoStock.length > 0 ? <IconWarning size={15} className="text-amber-600 dark:text-amber-400" /> : <IconCheckCircle size={15} className="text-emerald-600 dark:text-emerald-400" />}
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. ACCESOS RÁPIDOS — lo que se usa todos los días, un clic ── */}
      <section className="space-y-2.5">
        <h3 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider px-0.5">Accesos rápidos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <button type="button" onClick={onIrAPos} className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl py-3 px-3.5 border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 transition-colors cursor-pointer text-left">
            <div className="w-8 h-8 rounded-md bg-teal-500/10 flex items-center justify-center"><IconCard size={16} className="text-teal-600 dark:text-teal-400" /></div>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Nueva Venta</span>
          </button>
          <button type="button" onClick={onIrAInventario} className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl py-3 px-3.5 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-colors cursor-pointer text-left">
            <div className="w-8 h-8 rounded-md bg-cyan-500/10 flex items-center justify-center"><IconBox size={16} className="text-cyan-600 dark:text-cyan-400" /></div>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Inventario</span>
          </button>
          <button type="button" onClick={onIrAProveedores} className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl py-3 px-3.5 border border-slate-200 dark:border-slate-800 hover:border-slate-400 transition-colors cursor-pointer text-left">
            <div className="w-8 h-8 rounded-md bg-slate-500/10 flex items-center justify-center"><IconTruck size={16} className="text-slate-600 dark:text-slate-300" /></div>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Registrar Compra</span>
          </button>
          {esAdmin ? (
            <button type="button" onClick={onIrAUtilidad} className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl py-3 px-3.5 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 transition-colors cursor-pointer text-left">
              <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center"><IconCoins size={16} className="text-emerald-600 dark:text-emerald-400" /></div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Ver Utilidad</span>
            </button>
          ) : (
            <button type="button" onClick={onIrAInventario} className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl py-3 px-3.5 border border-slate-200 dark:border-slate-800 hover:border-slate-400 transition-colors cursor-pointer text-left">
              <div className="w-8 h-8 rounded-md bg-slate-500/10 flex items-center justify-center"><IconBank size={16} className="text-slate-600 dark:text-slate-300" /></div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{productos.length} Productos</span>
            </button>
          )}
        </div>
      </section>

      {/* ── 3. PULSO DE LA SEMANA ── */}
      <section className="space-y-2.5">
        <h3 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider px-0.5">Esta semana</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Ventas de la Semana</span>
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center"><IconChart size={17} className="text-cyan-600 dark:text-cyan-400" /></div>
            </div>
            {(() => {
              const entradas = Object.entries(ventasSemana);
              const [primero, ...resto] = entradas;
              return (
                <div className="flex items-baseline gap-3 flex-wrap">
                  <div className="font-['Outfit'] font-black text-2xl text-teal-600 dark:text-teal-400 truncate">
                    {primero ? `${prefijoMoneda(primero[0])}${primero[1].toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
                  </div>
                  {resto.length > 0 && (
                    <div className="flex items-baseline gap-3 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                      {resto.map(([m, v]) => (
                        <span key={m} className="font-['Outfit'] font-bold text-sm text-indigo-500 dark:text-indigo-400 truncate">
                          {m} {v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {cambioSemanaPct != null && (
              <div className={`inline-flex items-center gap-1 text-[11px] font-bold ${cambioSemanaPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
                <span>{cambioSemanaPct >= 0 ? "▲" : "▼"}</span>
                <span>{Math.abs(cambioSemanaPct).toFixed(1)}% vs semana pasada</span>
              </div>
            )}
          </div>

          <button type="button" onClick={onIrAInventario} className="text-left bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 cursor-pointer hover:border-teal-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Productos en Stock</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center"><IconBox size={17} className="text-emerald-600 dark:text-emerald-400" /></div>
            </div>
            <div className="font-['Outfit'] font-black text-2xl text-emerald-600 dark:text-emerald-400">{productos.length}</div>
          </button>

          <div className={`rounded-2xl p-5 border shadow-sm space-y-2 ${productosSinCosto > 0 ? "bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Sin costo registrado</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${productosSinCosto > 0 ? "bg-amber-500/15" : "bg-slate-500/10"}`}><IconCoins size={17} className={productosSinCosto > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-500"} /></div>
            </div>
            {tieneProductos ? (
              <>
                <div className={`font-['Outfit'] font-black text-2xl ${productosSinCosto > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>{productosSinCosto}</div>
                <p className="text-[11px] text-slate-400">{productosSinCosto > 0 ? "Su margen no se puede calcular todavía." : "Todo tu catálogo tiene costo real."}</p>
              </>
            ) : (
              <>
                <div className="font-['Outfit'] font-black text-2xl text-slate-300 dark:text-slate-600">—</div>
                <p className="text-[11px] text-slate-400">Aún no tienes productos registrados.</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── 3.5 VENTAS DE HOY (detalle, no solo el total) — más reciente primero ── */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-['Outfit'] font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <IconReceipt size={15} className="text-teal-600 dark:text-teal-400" /> Ventas de Hoy
            {(ventasHoyOrdenadas.length > 0 || ingresosHoyOrdenados.length > 0) && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold">
                {ventasHoyOrdenadas.length > 0 ? ventasHoyOrdenadas.length : ingresosHoyOrdenados.length}
              </span>
            )}
          </h3>
          {esAdmin && (
            <button type="button" onClick={onIrAPos} className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer">
              Ir al POS →
            </button>
          )}
        </div>
        {ventasHoyOrdenadas.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {ventasHoyOrdenadas.map((v) => {
              const abierta = ventaHoyExpandidaId === v.id;
              return (
                <div key={v.id}>
                  <button
                    type="button"
                    onClick={() => setVentaHoyExpandidaId(abierta ? null : v.id)}
                    className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(v.fecha).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase">
                          {v.metodoPago}
                        </span>
                        {v.esCredito && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase">
                            Crédito
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                        {v.cliente?.nombre || "Cliente de mostrador"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <div className="font-['Outfit'] font-black text-sm text-teal-600 dark:text-teal-400">{SIM()}{v.total.toFixed(2)}</div>
                        <div className={`text-[10px] text-slate-400 font-mono ${modoEuro() ? "hidden" : ""}`}>Bs. {v.totalBs.toFixed(2)}</div>
                      </div>
                      <IconChevronRight size={13} className={`text-slate-400 transition-transform ${abierta ? "rotate-90" : ""}`} />
                    </div>
                  </button>

                  {abierta && (
                    <div className="px-3.5 pb-3.5 bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
                      <div className="pt-2.5 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Productos ({v.lineas.length})</div>
                        {v.lineas.map((linea, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                            <span className="truncate">{linea.cantidad}x {linea.nombre}</span>
                            <span className="font-mono flex-shrink-0 ml-2">{SIM()}{(linea.precio * linea.cantidad).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {v.pagosMixtos && v.pagosMixtos.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pago mixto</div>
                          {v.pagosMixtos.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                              <span>{p.metodo}{p.referencia ? ` (Ref: ${p.referencia})` : ""}</span>
                              <span className="font-mono">{SIM()}{p.montoUSD.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400">
                          {v.cliente?.documento && v.cliente.documento !== "-" ? `C.I./RIF: ${v.cliente.documento}` : "Sin documento registrado"}
                        </span>
                        {v.utilidad != null && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Utilidad: {SIM()}{v.utilidad.toFixed(2)}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={onIrAPos}
                        className="w-full py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                      >
                        Ver Nota de Entrega / Ticket en POS →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : ingresosHoyOrdenados.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {ingresosHoyOrdenados.map((m) => {
              const abierta = ventaHoyExpandidaId === m.id;
              return (
                <div key={m.id}>
                  <button
                    type="button"
                    onClick={() => setVentaHoyExpandidaId(abierta ? null : m.id)}
                    className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(m.fechaRegistro).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase">
                          {m.moneda}
                        </span>
                        {/* Canal de venta — POS (mostrador) o WEB (pedido confirmado del
                            catálogo público). Ventas viejas, de antes de esta trazabilidad,
                            no muestran nada en vez de adivinar. */}
                        {m.referenciaTipo === "WEB" ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 uppercase flex items-center gap-1">
                            <IconShoppingBag size={9} /> Web
                          </span>
                        ) : m.referenciaTipo === "POS" ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-600 dark:text-teal-400 uppercase flex items-center gap-1">
                            <IconCard size={9} /> POS
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                        {m.concepto || "Ingreso de caja"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="font-['Outfit'] font-black text-sm text-teal-600 dark:text-teal-400">
                        {prefijoMoneda(m.moneda)}{Number(m.monto).toFixed(2)}
                      </div>
                      <IconChevronRight size={13} className={`text-slate-400 transition-transform ${abierta ? "rotate-90" : ""}`} />
                    </div>
                  </button>

                  {abierta && (
                    <div className="px-3.5 pb-3.5 pt-2.5 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                        <span className="text-slate-400">Fecha completa:</span>
                        <span className="font-mono">{new Date(m.fechaRegistro).toLocaleString("es-VE")}</span>
                      </div>
                      {m.moduloOrigen && (
                        <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                          <span className="text-slate-400">Origen:</span>
                          <span className="font-mono">{m.moduloOrigen}{m.referenciaTipo ? ` · ${m.referenciaTipo}` : ""}</span>
                        </div>
                      )}

                      {/* Comprobante de pago — se ancla al movimiento de caja real (no al
                          ticket local) para que nunca se pierda al cambiar de dispositivo. */}
                      {(m.capturaPagoBase64 || capturasPagoSubidas[m.id]) ? (
                        <button
                          type="button"
                          onClick={() => setComprobanteAmpliado(m.capturaPagoBase64 || capturasPagoSubidas[m.id])}
                          className="flex items-center gap-2 pt-1 cursor-pointer"
                        >
                          <img
                            src={m.capturaPagoBase64 || capturasPagoSubidas[m.id]}
                            alt="Comprobante de pago"
                            className="h-10 w-10 rounded-lg object-cover border border-slate-300 dark:border-slate-600"
                          />
                          <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 underline">Ver comprobante de pago</span>
                        </button>
                      ) : (
                        <label className="flex items-center gap-2 pt-1 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={subiendoComprobanteId === m.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file || !tenantId) return;
                              setSubiendoComprobanteId(m.id);
                              const reader = new FileReader();
                              reader.onload = async () => {
                                try {
                                  const capturaBase64 = typeof reader.result === "string" ? reader.result : "";
                                  await subirComprobanteMovimientoCaja(tenantId, m.id, capturaBase64);
                                  setCapturasPagoSubidas((prev) => ({ ...prev, [m.id]: capturaBase64 }));
                                  setErrorComprobanteId(null);
                                } catch {
                                  setErrorComprobanteId(m.id);
                                } finally {
                                  setSubiendoComprobanteId(null);
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 underline">
                            {subiendoComprobanteId === m.id ? "Subiendo..." : "+ Adjuntar comprobante de pago"}
                          </span>
                        </label>
                      )}
                      {errorComprobanteId === m.id && (
                        <p className="text-[10px] text-rose-500">No se pudo subir el comprobante, intenta de nuevo.</p>
                      )}

                      <p className="text-[10px] text-slate-400 pt-1">
                        Este registro viene directo de caja; para ver el ticket/Nota de Entrega completa entra al POS.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            Todavía no has registrado ninguna venta hoy.
          </div>
        )}
      </section>

      {cuentasPorPagarProximas.length > 0 && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-['Outfit'] font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <IconWallet size={15} className="text-rose-500" /> Cuentas por Pagar Próximas a Vencer
            </h3>
            <button type="button" onClick={onIrACuentas} className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer">
              Ver Cuentas →
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {cuentasPorPagarProximas.map((c) => {
              const dias = c.fechaVencimiento ? diasParaVencerCuenta(c.fechaVencimiento) : null;
              const vencida = dias != null && dias < 0;
              return (
                <div key={c.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{c.entidadNombre}</div>
                    <div className="text-[11px] text-slate-400 truncate">{c.concepto}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                      {prefijoMoneda(c.moneda)}{c.saldoPendiente.toFixed(2)}
                    </div>
                    <div className={`text-[10px] font-bold ${vencida ? "text-rose-600 dark:text-rose-400" : dias != null ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>
                      {dias == null ? "Sin fecha" : vencida ? `Vencida (${Math.abs(dias)}d)` : dias === 0 ? "Vence hoy" : `Vence en ${dias}d`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 4. LO QUE REQUIERE ACCIÓN ── */}
      <section id="alertas-inventario-bajo" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden scroll-mt-4">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-['Outfit'] font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <IconWarning size={15} className="text-amber-500" /> Alertas de Inventario Bajo
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10">
              <span className="font-['Outfit'] font-black text-sm text-amber-600 dark:text-amber-400">{productosBajoStock.length - productosAgotados.length}</span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Bajo mínimo</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10">
              <span className="font-['Outfit'] font-black text-sm text-rose-600 dark:text-rose-400">{productosAgotados.length}</span>
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Agotados</span>
            </div>
            <button type="button" onClick={onIrAInventario} className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer">
              Ver Inventario →
            </button>
          </div>
        </div>
        {productosBajoStock.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <IconCheckCircle size={14} className="text-emerald-500" />
            {tieneProductos ? "Todo el inventario está por encima del mínimo configurado." : "Registra tu primer producto para empezar a monitorear stock."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                  <th className="p-3">Código</th>
                  <th className="p-3">Producto</th>
                  <th className="p-3 text-right">Stock Actual</th>
                  <th className="p-3 text-right">Stock Mínimo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {productosBajoStock.map((p) => {
                  const agotado = p.stock <= 0;
                  return (
                    <tr key={p.id}>
                      <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{p.codigo}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {p.nombre}
                        {agotado && <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 uppercase">Agotado</span>}
                      </td>
                      <td className={`p-3 text-right font-bold ${agotado ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"}`}>{p.stock} {p.unidadMedida || ""}</td>
                      <td className="p-3 text-right text-slate-500 dark:text-slate-400">{p.stockMinimo}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {comprobanteAmpliado && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setComprobanteAmpliado(null)}
        >
          <img
            src={comprobanteAmpliado}
            alt="Comprobante de pago en tamaño completo"
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: COMERCIO & RETAIL APP
// ══════════════════════════════════════════════════════════════════════════
// Componente aislado para reloj en vivo: evita re-renderizar todo el árbol de ComercioApp cada segundo
function RelojEnVivoHeader() {
  const [hora, setHora] = useState(() =>
    new Date().toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setHora(
        new Date().toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700/60 shadow-inner">
      {hora}
    </span>
  );
}

export default function ComercioApp({ onSalir, onIrAEquipoRoles }: { onSalir: () => void; onIrAEquipoRoles?: () => void }) {
  const { user } = useAuth();

  // Rubro Activo: fijo al que el tenant realmente contrató (user.industry), nunca
  // elegible por el usuario — antes había un switcher de 3 pestañas que dejaba a
  // CUALQUIER tenant saltar entre Ferretería/Farmacia/Retail viendo el mismo
  // catálogo (tabla repuestos_items) solo con otra etiqueta encima. Cada rubro
  // debe verse estrictamente separado, igual que MediClinic o Ganadería.
  const perfilActivo: PerfilComercio =
    user?.industry === "farmacia" ? "farmacia" :
    user?.industry === "retail" ? "retail" :
    user?.industry === "repuestos" ? "repuestos" :
    user?.industry === "comercio" ? "comercio" :
    "ferreteria";

  const tenantId = user?.tenantId;
  const [logoNegocio, setLogoNegocio] = useState<string | null>(null);
  const [logoNoDisponible, setLogoNoDisponible] = useState(false);

  // La marca pertenece al tenant y se lee desde el servidor: nunca se guarda
  // como una preferencia local de este navegador. Si todavía no hay logo (o
  // el archivo no es válido), el monograma A+ conserva una identidad sobria.
  useEffect(() => {
    if (!tenantId) return;
    obtenerMiNegocio()
      .then((marca) => {
        setLogoNegocio(marca.logoBase64 || null);
        setLogoNoDisponible(false);
      })
      .catch(() => {
        setLogoNegocio(null);
        setLogoNoDisponible(false);
      });
  }, [tenantId]);

  // Ferretería, Repuestos, Retail y Comercio son una sola identidad visual — un
  // solo nombre, un solo ícono, un solo set de campos — desde que se unificaron
  // bajo "Comercio". Solo Farmacia sigue siendo genuinamente distinta (lotes,
  // vencimiento, principio activo). Usar este flag en vez de repetir la
  // comparación de 4 valores en cada punto donde antes había una rama por rubro.
  const esFarmacia = perfilActivo === "farmacia";
  const esComercio = !esFarmacia;

  // Tasas de cambio reales — misma metodología que usa Aurora Horeca (mismo
  // motor genérico /api/financiero/tasas + /api/config/mi-negocio/origen-tasa):
  // BCV y USDT se consultan en vivo de su fuente pública real, cada una se
  // guarda como serie propia, y "origenTasaActiva" decide cuál gobierna el
  // cobro. Se guarda un historial en el servidor, nunca solo en el navegador.
  // El popover de edición vive en TasaBadgeComercio (más abajo en este archivo).
  const [origenTasaActiva, setOrigenTasaActiva] = useState<OrigenTasaActiva | null>(null);
  const [tasaVes, setTasaVes] = useState<TasaCambio | null>(null);
  const [tasaCopReal, setTasaCopReal] = useState<TasaCambio | null>(null);

  // Moneda base del negocio: "USD" (por defecto) o "EUR" (modo euro: solo euros, sin tasas).
  const [monedaBase, setMonedaBase] = useState<string>(() => monedaBaseGuardada());
  const esEuro = monedaBase === "EUR";
  MONEDA_BASE = monedaBase; // antes de dibujar cualquier hijo: ver la convención arriba
  useEffect(() => {
    if (!user?.tenantId) return;
    obtenerMonedaBaseNegocio().then((r) => { const b = r.monedaBase || "USD"; if (b !== monedaBaseGuardada()) { fijarMonedaBaseApi(b); window.location.reload(); return; } setMonedaBase(b); }).catch(() => setMonedaBase("USD"));
  }, [user?.tenantId]);

  useEffect(() => {
    if (!user?.tenantId || esEuro) return;
    obtenerOrigenTasaActiva().then((r) => setOrigenTasaActiva(r.origenTasaActiva)).catch(() => setOrigenTasaActiva("USDT"));
    tasaVigente(user.tenantId, "USD", "COP").then(setTasaCopReal).catch(() => setTasaCopReal(null));
  }, [user?.tenantId, esEuro]);
  useEffect(() => {
    if (!user?.tenantId || !origenTasaActiva || esEuro) return;
    tasaVigente(user.tenantId, "USD", "VES", origenTasaActiva).then(setTasaVes).catch(() => setTasaVes(null));
  }, [user?.tenantId, origenTasaActiva, esEuro]);

  // En modo euro no existen tasas: en cero, todo lo que dependa de ellas (Bs, COP) queda apagado.
  const tasaActivaBs = !esEuro && tasaVes ? Number(tasaVes.tasa) : 0;
  const tasaCop = !esEuro && tasaCopReal ? Number(tasaCopReal.tasa) : 0;

  // Tabs de Navegación
  const [tab, setTab] = useState<"general" | "pos" | "pedidos_web" | "inventario" | "proveedores" | "clientes" | "administracion" | "estadisticas" | "cierre" | "auditoria" | "configuracion">("general");
  // Configuración es una pantalla con secciones (antes era un modal llamado "Catálogo Online & QR"
  // donde además vivían pagos y perfil de tienda, imposible de adivinar por su nombre).
  const [seccionConfig, setSeccionConfig] = useState<SeccionConfiguracion>("tienda");
  // Submódulos dentro de "Administración" — antes CXC/CXP e Ingresos&Gastos eran dos
  // entradas separadas en el sidebar; se agrupan porque ambas son la misma función de
  // negocio (control administrativo del dinero), no dos cosas distintas.
  const [subTabAdmin, setSubTabAdmin] = useState<"cxc_cxp" | "ingresos_gastos" | "cuentas_bancarias" | "personal" | "libros">("ingresos_gastos");

  // Las cuentas por cobrar/pagar viven en el backend real (ver cargarCuentas más abajo,
  // definida después junto a cargarIngresosCaja/cargarGastosCaja) — arranca vacío y se
  // hidrata por useEffect cuando hay tenant activo (sin datos de demostración).
  const [cuentas, setCuentas] = useState<CuentaComercio[]>([]);

  const guardarCuentas = (nuevas: CuentaComercio[]) => {
    setCuentas(nuevas);
  };
  // Dentro de "Cierres & Reportes": arqueo de caja (todos) vs. utilidad real por
  // producto (solo Dueño/Administrador — mismo criterio que el backend, ver
  // ReporteRepuestoController.exigirRol).
  const [subCierre, setSubCierre] = useState<"caja" | "utilidad" | "devoluciones">("caja");
  const [ticketADevolver, setTicketADevolver] = useState("");
  const puedeDevolver = user?.rol === "DUENO_ADMIN" || user?.rol === "ENCARGADO_INVENTARIO";
  // "Administración" se expande en el propio sidebar y muestra sus submódulos
  // ahí mismo (Ingresos & Gastos / CXC-CXP / Cuentas Bancarias) — mismo patrón
  // que el "Cuentas" de Fina, en vez de pestañas horizontales dentro del panel.
  const [administracionExpandida, setAdministracionExpandida] = useState(false);
  // El sidebar de w-64 fijo aplastaba todo el contenido en pantallas angostas
  // (celular) — no había forma de navegar sin hacer scroll horizontal. En
  // móvil ahora vive fuera de flujo (fixed) y entra/sale con un botón
  // hamburguesa; en desktop (lg:) sigue fijo en el layout como siempre.
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [modalIaVisible, setModalIaVisible] = useState(false);

  // Estado del Catálogo y Clientes
  // El catálogo arranca vacío y lo llena el servidor (cargarRepuestosBackend). Antes arrancaba
  // con productos de demostración que, si el servidor fallaba, se podían vender en el POS.
  const [productos, setProductos] = useState<ProductoComercio[]>([]);

  const productosDelRubro = useMemo(() => productos.filter((p) => p.rubro === perfilActivo), [productos, perfilActivo]);

  const productosBajoStockInventario = useMemo(
    () => productosDelRubro.filter((p) => p.stock <= p.stockMinimo).sort((a, b) => a.stock / Math.max(a.stockMinimo, 1) - b.stock / Math.max(b.stockMinimo, 1)),
    [productosDelRubro]
  );
  const productosAgotadosInventario = useMemo(() => productosBajoStockInventario.filter((p) => p.stock <= 0), [productosBajoStockInventario]);

  // Solo artículos con fecha de vencimiento configurada y dentro de los próximos 30 días
  // (o ya vencidos) — el resto del inventario (sin fecha) no tiene nada que alertar.
  const productosPorVencerInventario = useMemo(
    () => productosDelRubro
      .filter((p) => p.fechaVencimiento && diasParaVencerComercio(p.fechaVencimiento) <= 30)
      .sort((a, b) => diasParaVencerComercio(a.fechaVencimiento!) - diasParaVencerComercio(b.fechaVencimiento!)),
    [productosDelRubro]
  );

  // Solo "Consumidor Final" hasta que el servidor devuelve los clientes reales (antes aparecían
  // clientes inventados con deudas, como "Constructora Andina").
  const [clientes, setClientes] = useState<ClienteComercio[]>([CONSUMIDOR_FINAL]);

  const [ventas, setVentas] = useState<VentaComercio[]>([]);

  const [clienteSel, setClienteSel] = useState<ClienteComercio>(clientes[0]);

  // Estados de Registro Rápido HORECA y CRM en Mostrador
  const [cedulaClienteInput, setCedulaClienteInput] = useState("");
  const [nombreClienteInput, setNombreClienteInput] = useState("");
  const [telefonoClienteInput, setTelefonoClienteInput] = useState("");
  const [mostrarSelectorClientes, setMostrarSelectorClientes] = useState(false);
  const [clienteHistorialModal, setClienteHistorialModal] = useState<ClienteComercio | null>(null);
  const [busquedaClienteTab, setBusquedaClienteTab] = useState("");

  const limpiarClienteAMostrador = () => {
    const consumFinal = clientes.find((c) => c.id === "c-1") || clientes[0];
    setClienteSel(consumFinal);
    setCedulaClienteInput("");
    setNombreClienteInput("");
    setTelefonoClienteInput("");
    setMostrarSelectorClientes(false);
  };

  const manejarCambioCedula = (valor: string) => {
    setCedulaClienteInput(valor);
    const valLimpio = valor.trim().toUpperCase();
    if (!valLimpio) {
      const consumFinal = clientes.find((c) => c.id === "c-1") || clientes[0];
      setClienteSel(consumFinal);
      setNombreClienteInput("");
      setTelefonoClienteInput("");
      return;
    }
    const encontrado = clientes.find((c) => c.documento.toUpperCase() === valLimpio);
    if (encontrado) {
      setClienteSel(encontrado);
      setNombreClienteInput(encontrado.nombre);
      setTelefonoClienteInput(encontrado.telefono && encontrado.telefono !== "-" ? encontrado.telefono : "");
    } else {
      setClienteSel({
        id: "c-provisional",
        nombre: nombreClienteInput || "",
        documento: valor,
        telefono: telefonoClienteInput || "",
        saldoPendiente: 0,
        limiteCredito: 200,
      });
    }
  };

  const seleccionarClienteDesdeLista = (c: ClienteComercio) => {
    setClienteSel(c);
    if (c.id === "c-1") {
      setCedulaClienteInput("");
      setNombreClienteInput("");
      setTelefonoClienteInput("");
    } else {
      setCedulaClienteInput(c.documento);
      setNombreClienteInput(c.nombre);
      setTelefonoClienteInput(c.telefono && c.telefono !== "-" ? c.telefono : "");
    }
    setMostrarSelectorClientes(false);
  };

  const comprasClienteSel = useMemo(() => {
    if (!clienteSel || clienteSel.id === "c-1") return [];
    return ventas.filter(
      (v) =>
        v.cliente.id === clienteSel.id ||
        (v.cliente.documento && clienteSel.documento && v.cliente.documento.toUpperCase() === clienteSel.documento.toUpperCase())
    );
  }, [ventas, clienteSel]);

  // Carrito de Mostrador
  const [carrito, setCarrito] = useState<LineaCarritoComercio[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSel, setCategoriaSel] = useState("Todos");

  // Modales
  const [modalCobro, setModalCobro] = useState(false);
  const [metodoPagoSel, setMetodoPagoSel] = useState("EFECTIVO_USD");
  const [monedaRecibida, setMonedaRecibida] = useState<"USD" | "VES" | "COP">("USD");
  const [montoRecibido, setMontoRecibido] = useState("");
  const [monedaVuelto, setMonedaVuelto] = useState<"USD" | "VES" | "COP">("USD");
  const [ventaReciente, setVentaReciente] = useState<VentaComercio | null>(null);
  // ─── Pago Mixto ───────────────────────────────────────────────────────
  const [modoCobro, setModoCobro] = useState<"unico" | "mixto">("unico");
  const [pagosMixtos, setPagosMixtos] = useState<PagoMixtoItem[]>([]);
  // ─── Impuestos y cargos (Configuración > Impuestos y cargos) ─────────
  // El cálculo que vale lo hace el servidor al cobrar; aquí se repite solo para mostrarlo.
  const [impuestos, setImpuestos] = useState<ImpuestosNegocio | null>(null);
  // Como en Restaurante: el cajero decide en cada venta si lleva IVA, IGTF o delivery. Arrancan
  // según Configuración > Impuestos y cargos, y se pueden activar aunque ahí estén apagados.
  const [aplicaIvaVenta, setAplicaIvaVenta] = useState(false);
  const [aplicaIgtfVenta, setAplicaIgtfVenta] = useState(false);
  const [conDelivery, setConDelivery] = useState(false);
  const [montoDelivery, setMontoDelivery] = useState("");
  const [pagoMixtoMetodo, setPagoMixtoMetodo] = useState("EFECTIVO_USD");
  const [pagoMixtoMoneda, setPagoMixtoMoneda] = useState<"USD" | "VES" | "COP">("USD");
  const [pagoMixtoMonto, setPagoMixtoMonto] = useState("");
  const [pagoMixtoRef, setPagoMixtoRef] = useState("");
  // ─── Email cliente ───────────────────────────────────────────────────
  const [emailClienteModal, setEmailClienteModal] = useState("");
  const [enviarEmailAlConfirmar, setEnviarEmailAlConfirmar] = useState(false);
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
  const [modalImportarInventario, setModalImportarInventario] = useState(false);
  const [proveedoresRepuesto, setProveedoresRepuesto] = useState<ProveedorRepuesto[]>([]);
  const [ingresosCaja, setIngresosCaja] = useState<MovimientoCaja[]>([]);
  const [gastosCaja, setGastosCaja] = useState<MovimientoCaja[]>([]);
  const [formGasto, setFormGasto] = useState({ tipo: "EGRESO" as "INGRESO" | "EGRESO", monto: "", moneda: "USD" as "USD" | "VES" | "COP", concepto: "" });
  const [guardandoGasto, setGuardandoGasto] = useState(false);
  const [cargandoCompra, setCargandoCompra] = useState(false);
  const [toast, setToast] = useState<{ tipo: "success" | "error" | "info"; mensaje: string } | null>(null);
  const [editarModalItem, setEditarModalItem] = useState<ProductoComercio | null>(null);
  // Ubicación del artículo en el almacén principal, para poder cambiarla desde "Editar Producto".
  const [ubicacionEdicion, setUbicacionEdicion] = useState<{ almacenId: number; valor: string } | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  // Foto del producto para el catálogo público — aparte del resto del formulario (que es
  // no controlado, vía FormData) porque necesita previsualización inmediata al elegir el
  // archivo, antes de guardar nada.
  const [editarImagenBase64, setEditarImagenBase64] = useState<string | undefined>(undefined);

  const handleEditarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      mostrarToast("La imagen no debe superar los 2MB.", "error");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setEditarImagenBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Sugerencia de qué pedir como "atributo" según palabras clave en la categoría escrita
  // (zapatos → Talla, celulares → Modelo, ropa → Talla) — no es un motor de categorías
  // configurable, solo evita que el dueño tenga que adivinar qué escribir ahí. Vive fuera
  // del componente porque no depende de ningún estado.
  const [categoriaEnEdicion, setCategoriaEnEdicion] = useState("");
  const [editarTab, setEditarTab] = useState<"datos" | "catalogo">("datos");
  const [ajustarStockModalItem, setAjustarStockModalItem] = useState<ProductoComercio | null>(null);
  const [almacenModalItem, setAlmacenModalItem] = useState<ProductoComercio | null>(null);
  const [guardandoAjuste, setGuardandoAjuste] = useState(false);
  const [comprasRepuesto, setComprasRepuesto] = useState<CompraRepuesto[] | null>(null);
  const [cargandoCompras, setCargandoCompras] = useState(false);
  const [proveedorDetalle, setProveedorDetalle] = useState<ProveedorRepuesto | null>(null);
  const [busquedaProveedor, setBusquedaProveedor] = useState("");
  const [modalNuevoProveedor, setModalNuevoProveedor] = useState(false);

  
  const mostrarToast = (mensaje: string, tipo: "success" | "error" | "info" = "success") => {
    setToast({ tipo, mensaje });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Clientes y ventas: el servidor es la fuente de verdad ──────────────────
  // Antes vivían solo en el localStorage del navegador: abrir el sistema desde otro
  // equipo, o limpiar datos, borraba el historial y los saldos de crédito. Al entrar:
  // (1) se sube UNA vez lo que este navegador tenía y el servidor no (idempotente por
  // número de venta / documento), (2) el servidor pasa a mandar. Si el servidor no
  // responde, se sigue con lo local y se avisa — nunca se finge que quedó guardado.
  const [sincronizacionListo, setSincronizacionListo] = useState(false);
  const clientesSincronizados = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user?.tenantId) return;
    const tenantId = user.tenantId;
    let cancelado = false;
    const leerLocal = <T,>(clave: string): T[] => {
      try { const g = localStorage.getItem(clave); return g ? (JSON.parse(g) as T[]) : []; } catch { return []; }
    };
    (async () => {
      try {
        const [clientesSrv, ventasSrv] = await Promise.all([listarClientes(tenantId), listarVentasMostrador(tenantId)]);
        let clientesFinal = clientesSrv;
        let ventasFinal = ventasSrv;

        // El caché local no está separado por negocio: solo se migra si es de este mismo tenant
        // (o si nunca se marcó dueño, que es el caso de los datos anteriores a este cambio).
        const dueno = localStorage.getItem("aurora_comercio_owner");
        if (!dueno || dueno === String(tenantId)) {
          const numerosDemo = new Set(VENTAS_INICIALES.map((v) => v.numero));
          const pendientes = leerLocal<VentaComercio>("aurora_comercio_ventas")
            .filter((v) => v.numero && !numerosDemo.has(v.numero) && !ventasSrv.some((s) => s.numero === v.numero));
          if (pendientes.length > 0) {
            await guardarVentasMostradorLote(tenantId, pendientes.map(ventaARequest));
            ventasFinal = await listarVentasMostrador(tenantId);
          }

          const documentosDemo = new Set(CLIENTES_INICIALES.map((c) => c.documento.toUpperCase()));
          let creoClientes = false;
          for (const c of leerLocal<ClienteComercio>("aurora_comercio_clientes")) {
            const doc = (c.documento || "").toUpperCase();
            if (c.id === "c-1" || documentosDemo.has(doc)) continue;
            if (clientesSrv.some((s) => (s.identificacionRif || "").toUpperCase() === doc && doc !== "")) continue;
            await crearCliente(tenantId, datosClienteParaServidor(c));
            creoClientes = true;
          }
          if (creoClientes) clientesFinal = await listarClientes(tenantId);
          localStorage.setItem("aurora_comercio_owner", String(tenantId));
        }
        if (cancelado) return;

        const listaClientes = [CONSUMIDOR_FINAL, ...clientesFinal.map(clienteDesdeServidor)];
        clientesSincronizados.current = new Map(listaClientes.filter((c) => c.id !== "c-1").map((c) => [c.id, firmaCliente(c)]));
        const listaVentas: VentaComercio[] = [];
        for (const v of ventasFinal) {
          try { listaVentas.push({ ...(JSON.parse(v.detalleJson) as VentaComercio), fechaISO: v.fechaRegistro }); } catch { /* detalle ilegible: se omite esa venta */ }
        }
        setClientes(listaClientes);
        setVentas(listaVentas);
        try {
          localStorage.setItem("aurora_comercio_clientes", JSON.stringify(listaClientes));
          localStorage.setItem("aurora_comercio_ventas", JSON.stringify(listaVentas));
        } catch { /* caché lleno: no afecta al servidor */ }
        setSincronizacionListo(true);
      } catch (err) {
        console.warn("No se pudo sincronizar clientes/ventas con el servidor:", err);
        if (!cancelado) mostrarToast("No se pudo conectar con el servidor para cargar clientes y ventas. Se muestra lo guardado en este equipo.", "error");
      }
    })();
    return () => { cancelado = true; };
  }, [user?.tenantId]);

  // Cualquier cambio en un cliente (nuevo, saldo tras una venta a crédito, abono, cobro)
  // se envía al servidor aquí, en un solo lugar, en vez de en cada sitio que lo modifica.
  useEffect(() => {
    if (!user?.tenantId || !sincronizacionListo) return;
    const tenantId = user.tenantId;
    for (const c of clientes) {
      if (c.id === "c-1") continue;
      const firma = firmaCliente(c);
      if (clientesSincronizados.current.get(c.id) === firma) continue;
      clientesSincronizados.current.set(c.id, firma);
      const operacion = c.backendId
        ? editarCliente(tenantId, c.backendId, datosClienteParaServidor(c))
        : crearCliente(tenantId, datosClienteParaServidor(c));
      operacion
        .then((guardado) => {
          if (!c.backendId) setClientes((prev) => prev.map((x) => (x.id === c.id ? { ...x, backendId: guardado.id } : x)));
        })
        .catch((err) => {
          clientesSincronizados.current.delete(c.id); // se reintenta con el próximo cambio
          mostrarToast(`No se pudo guardar al cliente "${c.nombre}" en el servidor: ${err instanceof Error ? err.message : "error desconocido"}`, "error");
        });
    }
  }, [clientes, sincronizacionListo]);

  useEffect(() => {
    setUbicacionEdicion(null);
    if (!editarModalItem?.backendId || !user?.tenantId) return;
    const tenantId = user.tenantId;
    const repuestoId = editarModalItem.backendId;
    Promise.all([listarAlmacenes(tenantId), obtenerDistribucionAlmacen(tenantId, repuestoId)])
      .then(([almacenesData, dist]) => {
        const principal = almacenesData.find((a) => a.esPrincipal) || almacenesData[0];
        if (!principal) return;
        const fila = dist.distribucion.find((d) => d.almacenId === principal.id);
        setUbicacionEdicion({ almacenId: principal.id, valor: fila?.ubicacion || "" });
      })
      .catch(() => { /* sin almacenes: el campo no aparece y se sigue editando lo demás */ });
  }, [editarModalItem?.backendId, user?.tenantId]);

  const cargarRepuestosBackend = async () => {
    if (!user?.tenantId) return;
    setCargandoBackend(true);
    try {
      const items = await listarRepuestos();
      // Ubicación física real (pasillo/estante) por almacén — antes era un texto fijo
      // "Almacén Central" que no reflejaba nada. Si falla, el inventario carga igual.
      const [almacenesData, ubicacionesData] = await Promise.all([
        listarAlmacenes(user.tenantId).catch(() => [] as Almacen[]),
        listarUbicacionesAlmacen(user.tenantId).catch(() => [] as StockAlmacen[]),
      ]);
      const nombreAlmacen = new Map(almacenesData.map((a) => [a.id, a.nombre]));
      const ubicacionPorRepuesto = new Map<number, string>();
      for (const u of ubicacionesData) {
        if (!u.ubicacion) continue;
        const texto = `${nombreAlmacen.get(u.almacenId) || "Almacén"}: ${u.ubicacion}`;
        const previo = ubicacionPorRepuesto.get(u.repuestoId);
        ubicacionPorRepuesto.set(u.repuestoId, previo ? `${previo} · ${texto}` : texto);
      }
      if (Array.isArray(items)) {
        const itemsTenant = items.filter((r) => r.tenantId === user.tenantId);
        {
          const mapeados: ProductoComercio[] = itemsTenant.map((r) => ({
            id: `rep-${r.id}`,
            backendId: r.id,
            codigo: r.codigoSku,
            codigoOem: r.codigoOriginalOem || "",
            nombre: r.descripcion,
            categoria: r.categoria || "General",
            rubro: perfilActivo,
            precio: r.precioVenta,
            costo: r.costoUnitario || 0,
            stock: r.stockActual,
            stockMinimo: r.stockMinimo ?? 5,
            unidadMedida: r.unidadBase || "UNIDAD",
            codigoParte: r.codigoOriginalOem || undefined,
            precioMayorista: r.precioMayorista || undefined,
            cantidadMinimaMayorista: r.cantidadMinimaMayorista || undefined,
            ubicacion: ubicacionPorRepuesto.get(r.id),
            visible: r.visible !== false,
            ordenVisualizacion: r.ordenVisualizacion ?? 0,
            descripcionLarga: r.descripcionLarga || undefined,
            imagenBase64: r.imagenBase64 || undefined,
            grupoVariante: r.grupoVariante || undefined,
            atributoVariante: r.atributoVariante || undefined,
            colorVariante: r.colorVariante || undefined,
            fechaVencimiento: r.fechaVencimiento || undefined,
            exentoIva: r.exentoIva === true,
          }));
          setProductos((prev) => {
            const otros = prev.filter((p) => p.rubro !== perfilActivo);
            return [...otros, ...mapeados];
          });
        }
      }
    } catch (err) {
      console.warn("No se pudo conectar a /api/repuestos/items", err);
      mostrarToast("No se pudo cargar tu inventario. Revisa la conexión y vuelve a intentar.", "error");
    } finally {
      setCargandoBackend(false);
    }
  };

  // Ingresos de caja (ventas ya cobradas) para las tarjetas de la Vista General — es
  // lectura en segundo plano para un panel informativo, no una acción del usuario, así
  // que un fallo silencioso acá solo deja las tarjetas en $0. Se reconsulta después de
  // cada venta (ver ejecutarCobro) para que "Ventas de Hoy" refleje el cobro recién hecho.
  const cargarIngresosCaja = () => {
    if (!user?.tenantId) return;
    listarMovimientos(user.tenantId, "INGRESO").then(setIngresosCaja).catch(() => setIngresosCaja([]));
  };

  // Gastos sueltos (alquiler, papelería, servicios) que no salen del POS —
  // antes esta pestaña no existía y no había dónde anotarlos.
  const cargarGastosCaja = () => {
    if (!user?.tenantId) return;
    listarMovimientos(user.tenantId, "EGRESO").then(setGastosCaja).catch(() => setGastosCaja([]));
  };

  // Cuentas por cobrar/pagar reales del motor financiero — antes esta pestaña se
  // alimentaba de localStorage y nunca reflejaba lo que el backend ya registraba
  // (ventas a crédito, compras a proveedor a crédito), así que dos dispositivos del
  // mismo negocio veían listas distintas y todo se perdía si se limpiaba el navegador.
  const movimientoACuenta = (m: MovimientoCaja): CuentaComercio => {
    const marcador = m.tipo === "CXC" ? "— Cliente: " : "— Proveedor: ";
    const idx = m.concepto.lastIndexOf(marcador);
    return {
      id: `mc-${m.id}`,
      tipo: m.tipo as "CXP" | "CXC",
      entidadNombre: idx >= 0 ? m.concepto.slice(idx + marcador.length) : m.concepto,
      concepto: m.concepto,
      numeroDocumento: m.referenciaId != null ? String(m.referenciaId) : undefined,
      montoOriginal: m.monto,
      saldoPendiente: m.saldoPendiente ?? m.monto,
      moneda: (m.moneda as "USD" | "VES" | "COP") || "USD",
      estado: (m.estado as "PENDIENTE" | "PAGADO") || "PENDIENTE",
      fechaRegistro: m.fechaRegistro,
      fechaVencimiento: m.fechaVencimiento || undefined,
      referenciaId: m.referenciaId != null ? String(m.referenciaId) : undefined,
    };
  };

  const cargarCuentas = () => {
    if (!user?.tenantId) return;
    Promise.all([
      listarMovimientos(user.tenantId, "CXC"),
      listarMovimientos(user.tenantId, "CXP"),
    ])
      .then(([cxc, cxp]) => { cuentasCargadasRef.current = true; setCuentas([...cxc, ...cxp].map(movimientoACuenta)); })
      .catch(() => avisar("No se pudieron cargar las cuentas por cobrar y pagar. Revisa la conexión.", "error"));
  };
  const cuentasCargadasRef = useRef(false);

  // La deuda de cada cliente es la suma de sus cuentas por cobrar pendientes en el servidor.
  // Antes era un número aparte que el navegador sumaba al vender a crédito y restaba al abonar,
  // sin tocar la caja ni la CXC: quedaban dos saldos distintos del mismo cliente.
  const aMonedaBase = (monto: number, moneda: string) =>
    moneda === "VES" ? (tasaActivaBs > 0 ? monto / tasaActivaBs : 0)
    : moneda === "COP" ? (tasaCop > 0 ? monto / tasaCop : 0)
    : monto;
  const cxcPendientesDe = (nombre: string) => {
    const clave = nombre.trim().toLowerCase();
    return cuentas
      .filter((c) => c.tipo === "CXC" && c.estado !== "PAGADO" && c.saldoPendiente > 0.005 && c.entidadNombre.trim().toLowerCase() === clave)
      .sort((a, b) => (a.fechaRegistro || "").localeCompare(b.fechaRegistro || ""));
  };
  useEffect(() => {
    if (!cuentasCargadasRef.current) return;
    setClientes((prev) => {
      let cambio = false;
      const nuevos = prev.map((c) => {
        const saldo = Math.round(cxcPendientesDe(c.nombre).reduce((s, cta) => s + aMonedaBase(cta.saldoPendiente, cta.moneda), 0) * 100) / 100;
        if (Math.abs(saldo - (c.saldoPendiente || 0)) < 0.005) return c;
        cambio = true;
        return { ...c, saldoPendiente: saldo };
      });
      return cambio ? nuevos : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentas, tasaActivaBs, tasaCop]);

  // Abono desde la ficha del cliente: se aplica a sus cuentas por cobrar, de la más vieja a la
  // más nueva, con abonarMovimiento (que también registra el ingreso en caja).
  const [abonandoCliente, setAbonandoCliente] = useState(false);
  const registrarAbonoCliente = async (cliente: ClienteComercio, monto: number) => {
    if (!user?.tenantId || abonandoCliente) return;
    const pendientes = cxcPendientesDe(cliente.nombre);
    if (pendientes.length === 0) {
      avisar("Este cliente no tiene cuentas por cobrar pendientes en el servidor.", "error");
      return;
    }
    setAbonandoCliente(true);
    let restante = monto;
    let aplicado = 0;
    try {
      for (const cta of pendientes) {
        if (restante <= 0.005) break;
        const saldoBase = aMonedaBase(cta.saldoPendiente, cta.moneda);
        if (saldoBase <= 0) continue;
        const parteBase = Math.min(restante, saldoBase);
        const factor = cta.moneda === "VES" ? tasaActivaBs : cta.moneda === "COP" ? tasaCop : 1;
        const parte = Math.min(cta.saldoPendiente, Math.round(parteBase * factor * 100) / 100);
        await abonarMovimiento(user.tenantId, Number(cta.id.slice(3)), { monto: parte, moneda: cta.moneda });
        restante -= parteBase;
        aplicado += parteBase;
      }
      avisar(`Abono de ${SIM()}${aplicado.toFixed(2)} registrado en las cuentas por cobrar de ${cliente.nombre} y en caja.`, "exito");
      setClienteAbonoSel(null);
    } catch (err: any) {
      avisar(`${aplicado > 0 ? `Se registraron ${SIM()}${aplicado.toFixed(2)}, pero el resto falló: ` : ""}${err?.message || "No se pudo registrar el abono en el servidor."}`, "error");
    } finally {
      setAbonandoCliente(false);
      cargarCuentas();
      cargarIngresosCaja();
    }
  };

  const registrarGasto = async () => {
    if (!user?.tenantId) return;
    if (!formGasto.monto || Number(formGasto.monto) <= 0) { mostrarToast("Ingresa un monto válido", "error"); return; }
    if (!formGasto.concepto.trim()) { mostrarToast("Describe el concepto del movimiento", "error"); return; }
    setGuardandoGasto(true);
    try {
      await registrarMovimiento(user.tenantId, { tipo: formGasto.tipo, monto: Number(formGasto.monto), moneda: formGasto.moneda, concepto: formGasto.concepto.trim() });
      setFormGasto({ ...formGasto, monto: "", concepto: "" });
      cargarGastosCaja();
      if (formGasto.tipo === "INGRESO") cargarIngresosCaja();
      mostrarToast("Movimiento registrado");
    } catch (e) {
      mostrarToast(e instanceof Error ? e.message : "No se pudo registrar el movimiento", "error");
    } finally {
      setGuardandoGasto(false);
    }
  };

  // Historial de Compras a Proveedor (mismo patrón que la vista "Compras & Proveedores"
  // de Horeca) — antes solo existía el modal para REGISTRAR una compra, sin forma de ver
  // el historial ya registrado. El backend ya filtra por tenant (ver
  // CompraRepuestoRepository.listarConProveedor); el filtro de acá queda como defensa extra.
  const cargarComprasRepuesto = () => {
    if (!user?.tenantId) return;
    setCargandoCompras(true);
    listarComprasRepuesto()
      .then((compras) => setComprasRepuesto(compras.filter((c) => c.tenantId === user.tenantId)))
      .catch(() => setComprasRepuesto([]))
      .finally(() => setCargandoCompras(false));
  };

  useEffect(() => {
    if (user?.tenantId) {
      cargarRepuestosBackend();
      listarProveedoresRepuesto().then(setProveedoresRepuesto)
        .catch(() => avisar("No se pudo cargar la lista de proveedores. Revisa la conexión.", "error"));
      cargarIngresosCaja();
      cargarGastosCaja();
      cargarCuentas();
      if (esComercio) cargarComprasRepuesto();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.tenantId, perfilActivo]);

  useEffect(() => {
    if (kardexModalItem?.backendId) {
      setKardexCargando(true);
      const tid = user?.tenantId || 1;
      historialMovimientosRepuesto(kardexModalItem.backendId, tid)
        .then(setKardexMovimientos)
        .catch(() => setKardexMovimientos([]))
        .finally(() => setKardexCargando(false));
    }
  }, [kardexModalItem, user?.tenantId]);

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
        if (modalCobro) {
          setModalCobro(false);
          setModoCobro("unico");
          setPagosMixtos([]);
          setPagoMixtoMonto("");
          setPagoMixtoRef("");
          setEmailClienteModal("");
          setEnviarEmailAlConfirmar(false);
        } else if (modalNuevoProducto) setModalNuevoProducto(false);
        else if (kardexModalItem) setKardexModalItem(null);
        else if (presentacionesModalItem) setPresentacionesModalItem(null);
        else if (modalCompraProveedor) setModalCompraProveedor(false);
        else if (ventaReciente) setVentaReciente(null);
        else if (busqueda) setBusqueda("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [carrito.length, modalCobro, modalNuevoProducto, kardexModalItem, presentacionesModalItem, modalCompraProveedor, ventaReciente, busqueda]);


  // Filtro de productos según perfil y búsqueda
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideRubro = p.rubro === perfilActivo;
      const coincideCat = categoriaSel === "Todos" || p.categoria === categoriaSel;
      const b = busqueda.toLowerCase().trim();
      const coincideBusqueda =
        !b ||
        p.nombre.toLowerCase().includes(b) ||
        p.codigo.toLowerCase().includes(b) ||
        (p.principioActivo && p.principioActivo.toLowerCase().includes(b)) ||
        (p.ubicacion && p.ubicacion.toLowerCase().includes(b)) ||
        (p.codigoParte && p.codigoParte.toLowerCase().includes(b)) ||
        (p.lote && p.lote.toLowerCase().includes(b));

      return coincideRubro && coincideCat && coincideBusqueda;
    });
  }, [productos, perfilActivo, categoriaSel, busqueda]);

  // Categorías según perfil
  const categoriasDisponibles = useMemo(() => {
    const cats = new Set(productos.filter((p) => p.rubro === perfilActivo).map((p) => p.categoria));
    return ["Todos", ...Array.from(cats)];
  }, [productos, perfilActivo]);

  // Impuestos del negocio: se releen al entrar al POS por si el dueño los cambió en Configuración.
  // En modo euro no aplican (ni IVA venezolano ni IGTF).
  useEffect(() => {
    if (!user?.tenantId || modoEuro() || tab !== "pos") return;
    obtenerImpuestosNegocio()
      .then((cfg) => { setImpuestos(cfg); setAplicaIvaVenta(!!cfg.cobraIva); setAplicaIgtfVenta(!!cfg.igtfActivo); })
      .catch(() => setImpuestos(null));
  }, [user?.tenantId, tab]);

  // Cálculos de Totales del Carrito — misma cuenta que CalculoFiscalVenta en el servidor.
  const desgloseFiscal = useMemo(() => {
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const exentos = new Set(productos.filter((p) => p.exentoIva).map((p) => p.id));
    let gravado = 0;
    let exento = 0;
    for (const l of carrito) {
      const monto = r2(l.precio * l.cantidad);
      if (exentos.has(l.productoId)) exento += monto;
      else gravado += monto;
    }
    const porDefecto = !!impuestos?.cobraIva;
    const cobraIva = !modoEuro() && (aplicaIvaVenta || porDefecto);
    const alicuota = cobraIva ? (impuestos?.alicuotaIva && impuestos.alicuotaIva > 0 ? impuestos.alicuotaIva : 16) : 0;
    const factor = 1 + alicuota / 100;
    const aplica = cobraIva && aplicaIvaVenta;
    const delivery = conDelivery ? Math.max(0, parseFloat(montoDelivery) || 0) : 0;
    const g = gravado + delivery;
    let base: number;
    let iva: number;
    if (cobraIva && impuestos?.preciosIncluyenIva !== false) {
      base = r2(g / factor);
      iva = aplica ? r2(r2(g) - base) : 0;
    } else {
      base = r2(g);
      iva = aplica ? r2(base * (factor - 1)) : 0;
    }
    const ex = r2(exento);
    const subtotal = r2(ex + base + iva);
    const alicuotaIgtf = !modoEuro() && aplicaIgtfVenta ? (impuestos?.alicuotaIgtf && impuestos.alicuotaIgtf > 0 ? impuestos.alicuotaIgtf : 3) : 0;
    return { cobraIva, alicuota, exento: ex, base, iva, delivery: r2(delivery), subtotal, alicuotaIgtf, ivaQuitado: porDefecto && !aplicaIvaVenta };
  }, [carrito, productos, impuestos, aplicaIvaVenta, aplicaIgtfVenta, conDelivery, montoDelivery]);

  /** IGTF sobre lo pagado en divisas, nunca más que el subtotal. */
  const igtfSobre = (pagadoEnDivisas: number) =>
    desgloseFiscal.alicuotaIgtf > 0
      ? Math.round(Math.min(Math.max(0, pagadoEnDivisas), desgloseFiscal.subtotal) * desgloseFiscal.alicuotaIgtf) / 100
      : 0;

  // IGTF según cómo paga: todo en divisas, nada en bolívares, o la parte en divisas del pago mixto.
  const igtfCobro = useMemo(() => {
    if (!desgloseFiscal.alicuotaIgtf) return 0;
    if (modoCobro === "mixto") return igtfSobre(pagosMixtos.filter((p) => p.moneda !== "VES").reduce((a, p) => a + p.montoUSD, 0));
    return monedaRecibida !== "VES" ? igtfSobre(desgloseFiscal.subtotal) : 0;
  }, [desgloseFiscal, modoCobro, pagosMixtos, monedaRecibida]);

  // totalUSD = lo que se cobra con la forma de pago elegida (incluye IGTF si es en divisas).
  const totalUSD = useMemo(() => Math.round((desgloseFiscal.subtotal + igtfCobro) * 100) / 100, [desgloseFiscal, igtfCobro]);
  // En bolívares nunca hay IGTF; en pesos (divisa) sí.
  // Alias para ejecutarCobro, que redefine totalUSD localmente (a crédito no hay IGTF).
  const totalUSDCobro = totalUSD;
  const totalBs = useMemo(() => desgloseFiscal.subtotal * tasaActivaBs, [desgloseFiscal, tasaActivaBs]);
  const totalCopCalculado = useMemo(() => (desgloseFiscal.subtotal + igtfSobre(desgloseFiscal.subtotal)) * tasaCop, [desgloseFiscal, tasaCop]);

  // Agregar al carrito con soporte de presentaciones y precio mayorista dinámico
  const agregarAlCarrito = (p: ProductoComercio, presentacion?: PresentacionRepuesto) => {
    setCarrito((prev) => {
      const lineId = presentacion ? `${p.id}-pres-${presentacion.id}` : p.id;
      const idx = prev.findIndex((item) => (item.presentacionId ? `${item.productoId}-pres-${item.presentacionId}` : item.productoId) === lineId);

      const precioUnitario = presentacion ? presentacion.precioVenta : p.precio;
      const unidadTxt = presentacion ? presentacion.nombrePresentacion : (p.unidadMedida || "Pza");

      if (idx >= 0) {
        const copy = [...prev];
        const nuevaCant = copy[idx].cantidad + 1;
        copy[idx].cantidad = nuevaCant;
        // Si no es presentación fraccionada y el repuesto tiene escala mayorista
        if (!presentacion && p.precioMayorista && p.cantidadMinimaMayorista) {
          if (nuevaCant >= p.cantidadMinimaMayorista) {
            copy[idx].precio = p.precioMayorista;
            copy[idx].esMayorista = true;
          } else {
            copy[idx].precio = copy[idx].precioOriginalDetal || p.precio;
            copy[idx].esMayorista = false;
          }
        }
        return copy;
      }

      const esMayoreo = !presentacion && !!p.precioMayorista && !!p.cantidadMinimaMayorista && 1 >= p.cantidadMinimaMayorista;
      const costoUnitario = presentacion
        ? (p.costo ? p.costo * (presentacion.factorConversion || 1) : 0)
        : (p.costo || 0);

      return [
        ...prev,
        {
          productoId: p.id,
          backendId: p.backendId,
          codigo: p.codigo,
          nombre: presentacion ? `${p.nombre} (${presentacion.nombrePresentacion})` : p.nombre,
          precio: esMayoreo ? (p.precioMayorista || precioUnitario) : precioUnitario,
          costo: costoUnitario,
          precioOriginalDetal: precioUnitario,
          precioMayorista: p.precioMayorista,
          cantidadMinimaMayorista: p.cantidadMinimaMayorista,
          esMayorista: esMayoreo,
          cantidad: 1,
          unidadMedida: unidadTxt,
          lote: p.lote,
          fechaVencimiento: p.fechaVencimiento,
          presentacionId: presentacion?.id,
          nombrePresentacion: presentacion?.nombrePresentacion,
          factorConversion: presentacion?.factorConversion,
        },
      ];
    });
  };

  const cambiarCantidad = (id: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          const itemKey = item.presentacionId ? `${item.productoId}-pres-${item.presentacionId}` : item.productoId;
          if (itemKey === id || item.productoId === id) {
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

  const quitarDelCarrito = (id: string) => {
    setCarrito((prev) => prev.filter((item) => (item.presentacionId ? `${item.productoId}-pres-${item.presentacionId}` : item.productoId) !== id));
  };

  // Lectura de código de barras "zero-click": el hook detecta la ráfaga del
  // lector sin importar dónde esté el foco (ver useBarcodeScanner). Solo
  // queda activo en la pestaña POS — en Inventario/Clientes/Cierre un
  // escaneo accidental no debe intentar cobrar nada.
  const manejarCodigoEscaneado = (codigo: string) => {
    const pesado = decodificarCodigoPesado(codigo);
    const claveBusqueda = (pesado ? pesado.plu : codigo).toLowerCase();

    const producto = productos.find((p) => {
      if (p.rubro !== perfilActivo) return false;
      return p.codigo.toLowerCase() === claveBusqueda
        || p.codigo.toLowerCase().endsWith(claveBusqueda)
        || (p.codigoParte ? p.codigoParte.toLowerCase() === claveBusqueda : false);
    });

    if (!producto) {
      mostrarToast(`Código escaneado (${codigo}) no coincide con ningún producto del catálogo.`, "error");
      return;
    }

    agregarAlCarrito(producto);
    if (pesado && pesado.pesoKg !== 1) {
      cambiarCantidad(producto.id, pesado.pesoKg - 1);
    }
    setBusqueda(""); // limpia dígitos que el lector haya tecleado de paso en el buscador enfocado
    mostrarToast(`${producto.nombre} agregado${pesado ? ` (${pesado.pesoKg.toFixed(3)} kg)` : ""} por escaneo.`, "success");
  };

  useBarcodeScanner(manejarCodigoEscaneado, tab === "pos");

  // Número del ticket en curso: se mantiene mientras el carrito y los pagos no cambien, así un
  // reintento (p. ej. tras un corte de red) reusa el mismo número y el servidor reconoce que
  // ese ticket ya se cobró en vez de cobrarlo otra vez.
  const ticketEnCursoRef = useRef<{ numero: string; firma: string } | null>(null);

  // Finalizar Cobro
  const ejecutarCobro = async (esCredito = false) => {
    if (carrito.length === 0) return;
    // A crédito no se paga nada ahora, así que no hay IGTF (el servidor hace lo mismo).
    const totalUSD = esCredito ? desgloseFiscal.subtotal : totalUSDCobro;

    const firmaCobro = JSON.stringify({
      lineas: carrito.map((l) => [l.backendId, l.presentacionId ?? null, l.cantidad]),
      esCredito, modoCobro, monedaRecibida, montoRecibido,
      pagos: pagosMixtos.map((p) => [p.moneda, p.montoOriginal]),
      fiscal: [aplicaIvaVenta, aplicaIgtfVenta, conDelivery, montoDelivery],
    });
    if (!ticketEnCursoRef.current || ticketEnCursoRef.current.firma !== firmaCobro) {
      ticketEnCursoRef.current = { numero: nuevoNumeroTicket(), firma: firmaCobro };
    }
    const numRecibo = ticketEnCursoRef.current.numero;
    
    // Calcular monto recibido en USD equivalente
    let recibidoEnUSD = totalUSD;
    const ingresado = parseFloat(montoRecibido);
    if (modoCobro === "mixto") {
      recibidoEnUSD = pagosMixtos.reduce((acc, p) => acc + p.montoUSD, 0);
    } else if (!isNaN(ingresado) && ingresado > 0) {
      if (monedaRecibida === "USD") recibidoEnUSD = ingresado;
      else if (monedaRecibida === "VES" && tasaActivaBs > 0) recibidoEnUSD = ingresado / tasaActivaBs;
      else if (monedaRecibida === "COP" && tasaCop > 0) recibidoEnUSD = ingresado / tasaCop;
    }

    const vueltoUSD = Math.max(0, recibidoEnUSD - totalUSD);
    let vueltoFinal = vueltoUSD;
    if (monedaVuelto === "VES") vueltoFinal = vueltoUSD * tasaActivaBs;
    if (monedaVuelto === "COP") vueltoFinal = vueltoUSD * tasaCop;

    // Determinar cliente real para la venta (estilo HORECA con auto-registro)
    let clienteParaVenta = clienteSel;
    const cedulaLimpia = cedulaClienteInput.trim().toUpperCase();
    const nombreLimpio = nombreClienteInput.trim();
    const hayDatosManuales = (cedulaLimpia && cedulaLimpia !== "V-00000000") || nombreLimpio.length > 0;

    if (hayDatosManuales) {
      const doc = cedulaLimpia || `CLI-${Date.now().toString().slice(-4)}`;
      const nom = nombreLimpio || `Cliente ${doc}`;
      const existente = clientes.find((c) => c.documento.toUpperCase() === doc.toUpperCase());

      if (existente) {
        clienteParaVenta = existente;
      } else {
        // Auto-registro transparente de nuevo cliente al cobrar (saldoPendiente inicia en 0 para evitar duplicación al sumar crédito)
        const nuevoCliente: ClienteComercio = {
          id: `c-${Date.now()}`,
          nombre: nom,
          documento: doc,
          telefono: telefonoClienteInput.trim() || "-",
          saldoPendiente: 0,
          limiteCredito: 200,
          fechaRegistro: new Date().toISOString().split("T")[0],
        };
        clienteParaVenta = nuevoCliente;
        // El alta en el servidor la hace la sincronización de clientes (ver el efecto que
        // observa `clientes`) una vez que la venta se confirma — no antes.
      }
    } else if (esCredito && clienteParaVenta.id === "c-1") {
      // Si por alguna razón forzó crédito sin datos, crear ficha de crédito
      const doc = `CR-${Date.now().toString().slice(-4)}`;
      const nuevoCliente: ClienteComercio = {
        id: `c-${Date.now()}`,
        nombre: "Cliente a Crédito Mostrador",
        documento: doc,
        telefono: "-",
        saldoPendiente: 0,
        limiteCredito: 200,
        fechaRegistro: new Date().toISOString().split("T")[0],
      };
      clienteParaVenta = nuevoCliente;
    }

    // Cálculo exacto de costos y utilidad de la venta
    const costoTotal = carrito.reduce((acc, l) => acc + (l.costo || 0) * l.cantidad, 0);
    // Sin impuestos ni delivery: el IVA y el IGTF no son ganancia del negocio.
    const utilidad = desgloseFiscal.exento + desgloseFiscal.base - desgloseFiscal.delivery - costoTotal;

    const nuevaVenta: VentaComercio = {
      id: String(Date.now()),
      numero: numRecibo,
      cliente: clienteParaVenta,
      lineas: [...carrito],
      fecha: new Date().toLocaleString(),
      fechaISO: new Date().toISOString(),
      total: totalUSD,
      totalBs,
      totalCop: totalCopCalculado,
      costoTotal,
      utilidad,
      metodoPago: esCredito ? "CREDITO_CUENTA" : (modoCobro === "mixto" ? "PAGO_MIXTO" : metodoPagoSel),
      esCredito,
      recibido: esCredito ? 0 : (modoCobro === "mixto" ? recibidoEnUSD : (ingresado || (monedaRecibida === "VES" ? totalBs : monedaRecibida === "COP" ? totalCopCalculado : totalUSD))),
      monedaRecibida: esCredito ? "USD" : (modoCobro === "mixto" ? "USD" : monedaRecibida),
      vuelto: vueltoFinal,
      monedaVuelto,
      pagosMixtos: modoCobro === "mixto" ? [...pagosMixtos] : undefined,
      emailCliente: emailClienteModal.trim() || undefined,
    };

    // Registrar en backend Spring Boot para Ferretería & Retail si hay tenant activo.
    // REGLA DE ORO: el inventario real vive en el backend (con bloqueo pesimista contra
    // sobreventa concurrente, ver RepuestoConversionService). Si el backend RECHAZA la
    // venta (ej. "Stock insuficiente"), la venta NO se completó — antes este catch solo
    // mostraba un toast de advertencia y de todos modos seguía como si hubiera sido
    // exitosa (limpiaba el carrito y mostraba "¡Venta Exitosa!"), dejando creer al
    // cajero que vendió algo que el sistema en realidad bloqueó. Ahora un fallo de
    // sincronización DETIENE el cobro por completo: no se limpia el carrito, no se
    // descuenta stock local, y se muestra el motivo exacto para que el cajero corrija
    // la cantidad o cancele.
    // Un producto que no está guardado en el servidor no se puede vender: antes esas líneas se
    // omitían en silencio (o, si ninguna estaba guardada, la venta quedaba solo en este navegador,
    // sin stock, caja ni libro fiscal).
    const sinGuardar = carrito.filter((l) => !l.backendId);
    if (!user?.tenantId || sinGuardar.length > 0) {
      avisar(!user?.tenantId
        ? "La sesión no tiene un negocio asociado. Cierra sesión y vuelve a entrar."
        : `Estos productos no están guardados en el servidor: ${sinGuardar.map((l) => l.nombre).join(", ")}. Recarga el inventario o guárdalos antes de venderlos.`, "error");
      return;
    }
    if (user?.tenantId) {
      try {
        // Todo el ticket en una sola operación: si una línea falla (p. ej. stock), no queda nada
        // descontado ni cobrado. El pago mixto entra a caja en cada moneda real, y el crédito
        // funciona también para presentaciones fraccionadas.
        const lineas = carrito
          .filter((item) => item.backendId)
          .map((item) => ({ repuestoId: Number(item.backendId), presentacionId: item.presentacionId ?? null, cantidad: item.cantidad }));
        let yaEstabaCobrada = false;
        if (lineas.length > 0) {
          const esMixto = modoCobro === "mixto" && !esCredito;
          const resultado = await cobrarTicketPos({
            numeroTicket: numRecibo,
            lineas,
            monedaPago: esMixto ? undefined : monedaRecibida,
            metodoPago: esMixto || esCredito ? undefined : metodoPagoSel,
            montoRecibido: esMixto ? undefined : (ingresado || undefined),
            pagos: esMixto ? pagosMixtos.map((p) => ({ moneda: p.moneda, monto: p.montoOriginal, metodo: p.metodo })) : undefined,
            vuelto: esMixto && vueltoFinal > 0 ? vueltoFinal : undefined,
            monedaVuelto: esMixto && vueltoFinal > 0 ? monedaVuelto : undefined,
            montoPagadoAhora: esCredito ? 0 : undefined,
            diasCredito: esCredito ? 15 : undefined,
            nombreCliente: esCredito ? clienteParaVenta.nombre : undefined,
            // Con el cliente ya guardado, el servidor aplica su precio mayorista y enlaza la venta y la CXC a su ficha.
            clienteId: clienteParaVenta.backendId,
            aplicaIva: modoEuro() ? undefined : aplicaIvaVenta,
            aplicaIgtf: modoEuro() ? undefined : aplicaIgtfVenta,
            delivery: desgloseFiscal.delivery > 0 ? desgloseFiscal.delivery : undefined,
            clienteRif: clienteParaVenta.documento && clienteParaVenta.documento !== "V-00000000" && !clienteParaVenta.documento.startsWith("CLI-") && !clienteParaVenta.documento.startsWith("CR-")
              ? clienteParaVenta.documento : undefined,
          });
          yaEstabaCobrada = resultado.yaProcesado;
          if (resultado.desglose) {
            // El total que vale es el del servidor (calcula IVA e IGTF con su propia configuración).
            nuevaVenta.fiscal = { ...resultado.desglose, ivaQuitado: desgloseFiscal.ivaQuitado };
            if (Math.abs(resultado.desglose.total - nuevaVenta.total) > 0.009) {
              mostrarToast(`El total final quedó en ${SIM()}${resultado.desglose.total.toFixed(2)} (impuestos recalculados por el servidor).`, "info");
              nuevaVenta.total = resultado.desglose.total;
              nuevaVenta.totalBs = resultado.desglose.subtotal * tasaActivaBs;
            }
          }
        }
        ticketEnCursoRef.current = null;
        cargarRepuestosBackend();
        cargarIngresosCaja();
        mostrarToast(yaEstabaCobrada
          ? "Esta venta ya estaba registrada: no se cobró dos veces"
          : "Venta registrada y sincronizada en base de datos (Kárdex y Caja actualizados)", "success");
      } catch (err: any) {
        console.error("Fallo al sincronizar venta en backend:", err);
        cargarRepuestosBackend(); // refresca el stock real por si otra venta concurrente ya lo cambió
        avisar(`No se pudo completar la venta: ${err instanceof Error ? err.message : "error desconocido"}\n\nEl carrito NO se vació — ajusta la cantidad o cancela.`);
        return;
      }
    }

    // Llegar aquí significa que el backend confirmó la venta (o no hay tenant activo,
    // ej. modo demo). Recién ahora la venta entra al historial — antes se agregaba
    // ANTES de la confirmación, así que una venta rechazada (ej. stock insuficiente)
    // quedaba en el historial como si se hubiera hecho.
    setVentas((prev) => {
      const updated = [nuevaVenta, ...prev];
      try {
        localStorage.setItem("aurora_comercio_ventas", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (user?.tenantId) {
      guardarVentaMostrador(user.tenantId, ventaARequest(nuevaVenta)).catch((err) => {
        // El cobro y el inventario ya quedaron bien; solo falta el detalle. Queda en este equipo
        // y se sube solo la próxima vez que se abra el sistema (ver la migración al cargar).
        mostrarToast(`La venta se cobró, pero su detalle no se pudo guardar en el servidor (${err instanceof Error ? err.message : "error"}). Se reintentará al recargar.`, "error");
      });
    }

    // Descontar el stock mostrado localmente.
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

    // Actualizar o registrar cliente en CRM e histórico de compras (contado y crédito)
    if (clienteParaVenta && clienteParaVenta.id !== "c-1") {
      setClientes((prev) => {
        const index = prev.findIndex(
          (c) => c.id === clienteParaVenta.id || (c.documento && c.documento.toUpperCase() === clienteParaVenta.documento.toUpperCase())
        );
        let lista = [...prev];
        if (index >= 0) {
          const actual = lista[index];
          lista[index] = {
            ...actual,
            nombre: clienteParaVenta.nombre || actual.nombre,
            telefono: clienteParaVenta.telefono !== "-" ? clienteParaVenta.telefono : actual.telefono,
            saldoPendiente: esCredito ? (actual.saldoPendiente || 0) + totalUSD : (actual.saldoPendiente || 0),
            totalCompras: (actual.totalCompras || 0) + 1,
            montoTotalComprado: (actual.montoTotalComprado || 0) + totalUSD,
            utilidadGenerada: (actual.utilidadGenerada || 0) + utilidad,
            ultimaCompra: new Date().toLocaleDateString("es-VE"),
          };
        } else {
          const nuevoParaGuardar: ClienteComercio = {
            ...clienteParaVenta,
            saldoPendiente: esCredito ? totalUSD : 0,
            totalCompras: 1,
            montoTotalComprado: totalUSD,
            utilidadGenerada: utilidad,
            ultimaCompra: new Date().toLocaleDateString("es-VE"),
          };
          lista = [nuevoParaGuardar, ...lista];
        }
        try {
          localStorage.setItem("aurora_comercio_clientes", JSON.stringify(lista));
        } catch {}
        return lista;
      });
    }

    // La CXC de una venta a crédito ya se registró en el backend real dentro del loop de
    // arriba (RepuestoConversionService.registrarCobroVenta) — cargarCuentas() más abajo
    // refresca la lista desde ahí, no hace falta fabricarla localmente.
    if (esCredito) {
      mostrarToast(`Venta a crédito cargada a Cuentas por Cobrar (CXC) de ${clienteParaVenta.nombre} por ${SIM()}${totalUSD.toFixed(2)}`, "success");
      if (user?.tenantId) cargarCuentas();
    }

        setVentaReciente(nuevaVenta);
    setCarrito([]);
    setModalCobro(false);
    setMontoRecibido("");
    // Limpiar estados de pago mixto y email para la próxima venta
    setModoCobro("unico");
    setPagosMixtos([]);
    setPagoMixtoMonto("");
    setPagoMixtoRef("");
    setEmailClienteModal("");
    setEnviarEmailAlConfirmar(false);
    setAplicaIvaVenta(!!impuestos?.cobraIva);
    setAplicaIgtfVenta(!!impuestos?.igtfActivo);
    setConDelivery(false);
    setMontoDelivery("");
    limpiarClienteAMostrador();
  };

  // Generar Cotización PDF / Proforma
  const nombreLocal = user?.empresa || (
    "Mi negocio"
  );

  // Cotización en PDF, como en Restaurante (antes bajaba un .txt): el mismo carrito con su IVA,
  // delivery e IGTF, sin tocar inventario ni caja. Vale 7 días porque los precios cambian con la tasa.
  const generarCotizacion = () => {
    if (carrito.length === 0) return;
    const doc = new jsPDF();
    const hoyFmt = new Date().toLocaleDateString("es-VE");
    const vence = new Date(); vence.setDate(vence.getDate() + 7);
    const num = `COT-${Date.now().toString().slice(-6)}`;
    const m = (n: number) => `${SIM()}${n.toFixed(2)}`;

    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text(nombreLocal, 14, 18);
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text(`Cotización ${num}`, 14, 26);
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`Fecha: ${hoyFmt}    Válida hasta: ${vence.toLocaleDateString("es-VE")}`, 14, 32);
    const tieneCliente = clienteSel && clienteSel.id !== "c-1";
    if (tieneCliente) doc.text(`Cliente: ${clienteSel.nombre}${clienteSel.documento ? " · " + clienteSel.documento : ""}`, 14, 37);
    doc.setTextColor(0);

    let y = tieneCliente ? 46 : 42;
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("Cant.", 14, y); doc.text("Descripción", 32, y); doc.text("P. Unit.", 150, y, { align: "right" }); doc.text("Subtotal", 196, y, { align: "right" });
    y += 2; doc.setDrawColor(200); doc.line(14, y, 196, y); y += 6;
    doc.setFont("helvetica", "normal");
    carrito.forEach((l) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.text(String(l.cantidad), 14, y);
      doc.text(l.nombre, 32, y, { maxWidth: 110 });
      doc.text(m(l.precio), 150, y, { align: "right" });
      doc.text(m(l.precio * l.cantidad), 196, y, { align: "right" });
      y += 7;
    });

    y += 2; doc.line(120, y, 196, y); y += 6;
    const renglon = (etiqueta: string, valor: string) => { doc.text(etiqueta, 150, y, { align: "right" }); doc.text(valor, 196, y, { align: "right" }); y += 5.5; };
    const f = desgloseFiscal;
    if (f.exento > 0) renglon("Exento de IVA:", m(f.exento));
    renglon(f.cobraIva ? "Base imponible:" : "Subtotal:", m(f.base - (f.cobraIva ? 0 : f.delivery)));
    if (f.cobraIva) renglon(f.ivaQuitado ? "IVA (no aplica):" : `IVA ${f.alicuota}%:`, m(f.iva));
    if (f.delivery > 0) renglon(f.cobraIva ? "Delivery (en la base):" : "Delivery:", m(f.delivery));
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    renglon("Total:", m(f.subtotal));
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    if (f.alicuotaIgtf > 0) renglon(`Pagando en divisas (+IGTF ${f.alicuotaIgtf}%):`, m(f.subtotal + igtfSobre(f.subtotal)));
    if (!modoEuro() && tasaActivaBs > 0) renglon(`≈ En bolívares (tasa ${tasaActivaBs.toFixed(2)}):`, `Bs. ${(f.subtotal * tasaActivaBs).toFixed(2)}`);

    doc.setFontSize(8); doc.setTextColor(120);
    doc.text("Esta cotización no es una venta ni afecta inventario o caja. Los precios pueden variar según el tipo de cambio vigente al momento de la compra.", 14, 285, { maxWidth: 182 });
    doc.save(`Cotizacion_${num}_${(tieneCliente ? clienteSel.nombre : nombreLocal).replace(/\s+/g, "_")}.pdf`);
  };


  const saludo = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  })();



  const fechaHoyCap = useMemo(() => {
    const f = new Date().toLocaleDateString("es-VE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return f.charAt(0).toUpperCase() + f.slice(1);
  }, []);

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-['Inter'] selection:bg-teal-500 selection:text-white overflow-hidden">
      {/* Sin esto, cualquier ícono "viejo estilo" (IconCard, IconBox, IconTrash...) que
          usa un degradado SVG compartido (ver Icons.tsx, const s = {stroke: url(#GRAD)})
          queda invisible — el navegador no encuentra el <defs> del degradado en esta página. */}
      <AuroraGradientDef />

      {/* ══════════════════════ SIDEBAR (drawer en móvil, fijo en desktop) ══════════════════════ */}
      {sidebarAbierto && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarAbierto(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`w-64 flex-shrink-0 h-screen flex flex-col bg-[#fcfdfd] border-r border-slate-200 shadow-none fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          sidebarAbierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Identidad de la empresa: logo real si fue configurado; A+ como
            respaldo institucional, sin íconos genéricos de rubro. */}
        <button
          onClick={onSalir}
          className="flex items-center gap-3 text-left group cursor-pointer px-5 py-4 border-b border-slate-200"
          title="Volver al Hub General"
        >
          <div className="w-10 h-10 rounded-md border border-slate-200 bg-white text-slate-700 flex items-center justify-center overflow-hidden group-hover:border-teal-300 transition-colors flex-shrink-0">
            {logoNegocio && !logoNoDisponible ? (
              <img
                src={logoNegocio}
                alt={`Logo de ${nombreLocal}`}
                className="h-full w-full object-contain p-1.5"
                onError={() => setLogoNoDisponible(true)}
              />
            ) : (
              <span className="font-semibold tracking-[-0.06em] text-sm" aria-label="Aurora Plus">A+</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-['IBM_Plex_Sans'] font-semibold text-sm text-slate-900 leading-tight tracking-tight truncate">
              {nombreLocal}
            </div>
            <div className="text-[10px] text-slate-400 tracking-[0.02em] truncate font-medium mt-1">
              by <span className="font-semibold text-slate-600">A+</span>
            </div>
          </div>
        </button>

        {/* Navegación principal, agrupada (Operación / Gestión) — mismo patrón que Aurora Horeca */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {([
            {
              titulo: "Operación",
              items: [
                { id: "general" as const, Icon: IconChart, etiqueta: "Vista General" },
                { id: "pos" as const, Icon: IconCard, etiqueta: "POS Mostrador" },
                { id: "inventario" as const, Icon: IconBox, etiqueta: "Inventario & Stock" },
                ...(esComercio ? [{ id: "pedidos_web" as const, Icon: IconShoppingBag, etiqueta: "Pedidos Web" }] : []),
              ],
            },
            {
              titulo: "Gestión",
              items: [
                ...(esComercio ? [{ id: "proveedores" as const, Icon: IconTruck, etiqueta: "Proveedores" }] : []),
                { id: "clientes" as const, Icon: IconUsers, etiqueta: "Clientes & Crédito" },
                { id: "administracion" as const, Icon: IconWallet, etiqueta: "Administración" },
                { id: "estadisticas" as const, Icon: IconChart, etiqueta: "Estadísticas" },
                { id: "cierre" as const, Icon: IconLock, etiqueta: "Cierres & Reportes" },
                ...(user?.rol === "DUENO_ADMIN" ? [{ id: "auditoria" as const, Icon: IconFileText, etiqueta: "Bitácora de Auditoría" }] : []),
              ],
            },
          ]).map((grupo) => (
            <div key={grupo.titulo} className="space-y-1.5">
              <div className="px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {grupo.titulo}
              </div>
              {grupo.items.map((item) => item.id === "administracion" ? (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => setAdministracionExpandida((v) => !v)}
                    className={`sidebar-glare w-full flex items-center gap-3 border-l-2 px-3 py-2.5 rounded-md font-medium text-[13px] transition-colors cursor-pointer ${
                      tab === item.id
                        ? "sidebar-glare--active bg-teal-50/80 text-teal-900 border-teal-700"
                        : "text-slate-800 border-transparent hover:bg-slate-100/70 hover:text-slate-900"
                    }`}
                  >
                    <span className={tab === item.id ? "text-teal-700" : "text-slate-500"}><item.Icon size={15} /></span>
                    <span className="flex-1 text-left">{item.etiqueta}</span>
                    <IconChevronRight size={12} className={`text-slate-400 transition-transform ${administracionExpandida ? "rotate-90" : ""}`} />
                  </button>
                  {administracionExpandida && (
                    <div className="mt-1 ml-4 pl-3 border-l border-slate-200 space-y-0.5">
                      {([
                        { subTab: "ingresos_gastos" as const, etiqueta: "Ingresos & Gastos" },
                        { subTab: "cxc_cxp" as const, etiqueta: "Cuentas por Cobrar & Pagar" },
                        { subTab: "cuentas_bancarias" as const, etiqueta: "Cuentas Bancarias" },
                        { subTab: "personal" as const, etiqueta: "Personal & Nómina" },
                        // Libros en bolívares para el contador venezolano: no aplica en modo euro.
                        ...(!modoEuro() && user?.rol === "DUENO_ADMIN" ? [{ subTab: "libros" as const, etiqueta: "Libros de Compras y Ventas" }] : []),
                      ]).map((sub) => (
                        <button
                          key={sub.subTab}
                          type="button"
                          onClick={() => { setTab("administracion"); setSubTabAdmin(sub.subTab); setSidebarAbierto(false); }}
                          className={`w-full text-left px-3 py-2 rounded-md font-medium text-[12.5px] transition-colors cursor-pointer ${
                            tab === "administracion" && subTabAdmin === sub.subTab
                              ? "text-teal-800 bg-teal-50/70"
                              : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                          }`}
                        >
                          {sub.etiqueta}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  key={item.id}
                  onClick={() => { setTab(item.id); setSidebarAbierto(false); }}
                  className={`sidebar-glare w-full flex items-center gap-3 border-l-2 px-3 py-2.5 rounded-md font-medium text-[13px] transition-colors cursor-pointer ${
                    tab === item.id
                      ? "sidebar-glare--active bg-teal-50/80 text-teal-900 border-teal-700"
                      : "text-slate-800 border-transparent hover:bg-slate-100/70 hover:text-slate-900"
                  }`}
                >
                  <span className={tab === item.id ? "text-teal-700" : "text-slate-500"}><item.Icon size={15} /></span>
                  <span>{item.etiqueta}</span>
                </button>
              ))}
            </div>
          ))}

                  <div className="pt-3 mt-3 border-t border-slate-100">
          <button
            type="button"
            title="Mi tienda, catálogo y QR, métodos de pago, facturación fiscal y equipo"
            onClick={() => { setTab("configuracion"); setSidebarAbierto(false); }}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg font-semibold text-[13px] cursor-pointer transition-colors ${tab === "configuracion" ? "bg-teal-50/80 text-teal-900" : "text-slate-800 hover:bg-slate-50 hover:text-slate-900"}`}
          >
            <IconSettings size={16} />
            <span className="flex-1 text-left">Configuración</span>
          </button>
          <button
            type="button"
            title="Atención y ventas automatizadas por WhatsApp, conectadas a tu inventario en tiempo real"
            onClick={() => { setModalIaVisible(true); setSidebarAbierto(false); }}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg font-semibold text-[13px] cursor-pointer text-slate-800 hover:bg-slate-50 hover:text-slate-900 transition-colors mt-1"
          >
            <div className="w-4 h-4 flex items-center justify-center text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="flex-1 text-left">Atención por WhatsApp</span>
            <span className="text-[8px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
              24/7
            </span>
          </button>
        </div>
        </nav>

        {/* Salir al Hub (y Soporte, por si escondieron el botón flotante) */}
        <div className="p-4 border-t border-slate-100 space-y-1">
          <button
            onClick={() => { window.dispatchEvent(new Event("aurora:abrir-soporte")); setSidebarAbierto(false); }}
            className="w-full flex items-center gap-2 text-xs font-semibold px-2.5 py-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer text-left"
          >
            <span className="text-slate-400"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg></span>
            Soporte Aurora
          </button>
          <button
            onClick={onSalir}
            className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer text-left"
          >
            ← Salir al Hub
          </button>
        </div>
      </aside>

      {/* ══════════════════════ COLUMNA DERECHA: TOPBAR + CONTENIDO ══════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

                {/* ── TOPBAR PROFESIONAL: SALUDO, FECHA & HORA EN VIVO, TASAS Y TEMA ── */}
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarAbierto(true)}
              className="lg:hidden p-2 -ml-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex-shrink-0"
              aria-label="Abrir menú"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Saludo Profesional + Nombre del Comercio + Fecha y Hora en Vivo */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" title="Sistema en línea" />
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                  {saludo} <span className="text-slate-300 dark:text-slate-600 font-normal">—</span> <span className="text-teal-600 dark:text-teal-400">{nombreLocal}</span>
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
                <span className="capitalize">{fechaHoyCap}</span>
                <span className="text-slate-400 font-bold">·</span>
                <RelojEnVivoHeader />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            {user?.tenantId && !esEuro && (
              <TasaBadgeComercio
                tenantId={user.tenantId}
                origenTasaActiva={origenTasaActiva}
                tasaVes={tasaVes}
                tasaCop={tasaCopReal}
                onOrigenCambiado={(o) => setOrigenTasaActiva(o)}
                onActualizadaVes={setTasaVes}
                onActualizadaCop={setTasaCopReal}
              />
            )}

            <ThemeToggle />
          </div>
        </header>

        {/* ── CONTENIDO SEGÚN LA PESTAÑA SELECCIONADA ── */}
        <main className="flex-1 w-full p-4 sm:p-6 overflow-y-auto flex flex-col">

          {/* ══════════════════════════════════════════════════════════════════
              TAB 0: VISTA GENERAL (DASHBOARD)
              ══════════════════════════════════════════════════════════════════ */}
          {tab === "general" && <ResumenFinancieroComercio />}
          {tab === "general" && (
            <DashboardGeneralComercio
              productos={productos.filter((p) => p.rubro === perfilActivo)}
              ingresosCaja={ingresosCaja}
              ventas={ventas}
              cuentas={cuentas}
              tasaActivaBs={tasaActivaBs}
              tasaCop={tasaCop}
              esAdmin={user?.rol === "DUENO_ADMIN"}
              nombreNegocio={user?.empresa || "tu negocio"}
              tenantId={user?.tenantId}
              onIrAInventario={() => setTab("inventario")}
              onIrAPos={() => setTab("pos")}
              onIrAProveedores={() => setTab("proveedores")}
              onIrAUtilidad={() => { setTab("cierre"); setSubCierre("utilidad"); }}
              onIrACuentas={() => { setTab("administracion"); setSubTabAdmin("cxc_cxp"); setAdministracionExpandida(true); }}
            />
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: POS MOSTRADOR ULTRA RÁPIDO
            ══════════════════════════════════════════════════════════════════ */}
        {tab === "pos" && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:h-[calc(100vh-115px)]">

            {/* Columna Izquierda (7 cols): Catálogo, Buscador & Categorías */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col lg:h-full bg-white/60 dark:bg-slate-900/60 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 lg:overflow-hidden shadow-xl">
              
              {/* Barra de Búsqueda Reactiva */}
              <div className="relative mb-3 flex-shrink-0">
                <IconSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={
                    esFarmacia
                      ? " Buscar por medicamento, principio activo (ej. Acetaminofén), lote o escanear código..."
                      : " Buscar por producto, código de parte (ej. TORN-38, Hilux), medida o escanear código de barra..."
                  }
                  className="w-full pl-10 pr-20 py-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300/80 dark:border-slate-700/80 focus:border-teal-500 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none shadow-inner"
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {busqueda && (
                    <button onClick={() => setBusqueda("")} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white mr-1 cursor-pointer">
                      <IconClose size={16} />
                    </button>
                  )}
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold" title="Presiona F2 para buscar rápido">
                    F2
                  </kbd>
                </div>
              </div>

              {/* Categorías Rápidas */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 flex-shrink-0 scrollbar-none">
                {categoriasDisponibles.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaSel(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      categoriaSel === cat
                        ? "bg-teal-500 text-slate-950 shadow-md"
                        : "bg-slate-100/70 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid de Productos */}
              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
                {productosFiltrados.map((p) => {
                  const bajoStock = p.stock <= p.stockMinimo;
                  return (
                    <button
                      key={p.id}
                      onClick={() => agregarAlCarrito(p)}
                      className="group bg-slate-100/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 p-3 rounded-2xl border border-slate-300/60 dark:border-slate-700/50 hover:border-teal-500/50 transition-all text-left flex flex-col justify-between cursor-pointer hover:scale-[1.02] shadow-sm relative overflow-hidden"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-mono text-slate-500 dark:text-slate-400">{p.codigo}</span>
                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                            p.stock <= 0 ? "bg-red-500/20 text-red-400" :
                            bajoStock ? "bg-amber-500/20 text-amber-400" :
                            "bg-teal-500/20 text-teal-400"
                          }`}>
                            Stock: {p.stock} {p.unidadMedida || "und"}
                          </span>
                        </div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-teal-300 transition-colors line-clamp-2">
                          {p.nombre}
                        </div>
                        {p.principioActivo && (
                          <div className="text-[10px] text-emerald-400 font-semibold truncate">
                             {p.principioActivo}
                          </div>
                        )}
                        {p.codigoOem && (
                          <div className="text-[9px] text-cyan-400 font-mono truncate">
                            OEM: {p.codigoOem}
                          </div>
                        )}
                        {p.precioMayorista && p.cantidadMinimaMayorista && (
                          <div className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 truncate">
                            ️ Mayoreo: {SIM()}{p.precioMayorista.toFixed(2)} (≥{p.cantidadMinimaMayorista} {p.unidadMedida || "u"})
                          </div>
                        )}
                        {p.lote && (
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                            Lote: {p.lote} · Vence: {p.fechaVencimiento}
                          </div>
                        )}
                        {p.ubicacion && (
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                             {p.ubicacion}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-300/60 dark:border-slate-700/40 flex items-baseline justify-between">
                        <div>
                          <div className="font-mono font-black text-sm text-teal-400">
                            {SIM()}{p.precio.toFixed(2)}
                          </div>
                          <div className={`text-[10px] font-mono text-slate-500 dark:text-slate-400 ${modoEuro() ? "hidden" : ""}`}>
                            ≈ Bs. {(p.precio * tasaActivaBs).toFixed(2)}
                          </div>
                        </div>
                        <span className="w-6 h-6 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center text-xs font-black group-hover:bg-teal-500 group-hover:text-slate-950 transition-colors">
                          +
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Columna Derecha (5 cols): Carrito de Venta & Cobro */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col lg:h-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xl lg:overflow-hidden">
              
              {/* Cliente en Mostrador - Registro Rápido HORECA & Autocompletado */}
              <div className="flex-shrink-0 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Cliente en Mostrador
                    </label>
                    {clienteSel.id !== "c-1" && clienteSel.id !== "c-provisional" && (
                      <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                        <IconCheckCircle size={10} /> Registrado
                      </span>
                    )}
                    {cedulaClienteInput.trim() && !clientes.some(c => c.documento.toUpperCase() === cedulaClienteInput.trim().toUpperCase()) && (
                      <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-600 dark:text-teal-400 font-bold border border-teal-500/30">
                        Nuevo (se guardará al cobrar)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(clienteSel.id !== "c-1" || cedulaClienteInput || nombreClienteInput) && (
                      <button
                        type="button"
                        onClick={limpiarClienteAMostrador}
                        className="text-[10px] font-semibold text-slate-400 hover:text-red-500 cursor-pointer flex items-center gap-0.5 transition-colors"
                        title="Restablecer a Consumidor Final"
                      >
                        <IconClose size={11} /> Consumidor Final
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMostrarSelectorClientes(!mostrarSelectorClientes)}
                      className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      {mostrarSelectorClientes ? "Cerrar Lista" : "Directorio"}
                    </button>
                  </div>
                </div>

                {mostrarSelectorClientes ? (
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 space-y-1.5">
                    <div className="text-[10px] text-slate-500 font-semibold">Seleccionar cliente existente:</div>
                    <select
                      value={clienteSel.id}
                      onChange={(e) => {
                        const sel = clientes.find((c) => c.id === e.target.value) || clientes[0];
                        seleccionarClienteDesdeLista(sel);
                      }}
                      className="w-full bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white rounded-xl px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 focus:outline-none"
                    >
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} ({c.documento})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <input
                        value={cedulaClienteInput}
                        onChange={(e) => manejarCambioCedula(e.target.value)}
                        placeholder="Cédula / RIF (ej. V-12345678)"
                        className="w-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white rounded-xl px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-teal-500 font-mono"
                      />
                      <input
                        value={telefonoClienteInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTelefonoClienteInput(val);
                          setClienteSel((prev) => ({
                            ...prev,
                            telefono: val || "-"
                          }));
                        }}
                        placeholder="Teléfono (opcional)"
                        className="w-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white rounded-xl px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <input
                      value={nombreClienteInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNombreClienteInput(val);
                        setClienteSel((prev) => ({
                          ...prev,
                          nombre: val || (prev.id === "c-1" ? "Consumidor Final" : "")
                        }));
                      }}
                      placeholder="Nombre y Apellido / Razón Social"
                      className="w-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white rounded-xl px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}

                {/* Sub-barra de métricas rápidas: compras previas y saldo por cobrar */}
                <div className="flex items-center justify-between text-[10px] pt-0.5">
                  {clienteSel.id !== "c-1" && comprasClienteSel.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setClienteHistorialModal(clienteSel)}
                      className="text-teal-600 dark:text-teal-400 hover:text-teal-500 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Ver qué productos ha comprado anteriormente"
                    >
                      <IconReceipt size={12} />
                      <span>{comprasClienteSel.length} compra{comprasClienteSel.length > 1 ? "s" : ""}</span>
                      <span className="text-[9px] underline">· Ver qué ha comprado</span>
                    </button>
                  ) : (
                    <span className="text-slate-400 text-[10px]">
                      {clienteSel.id === "c-1" ? "Consumidor Final mostrador" : "Sin compras registradas aún"}
                    </span>
                  )}

                  {clienteSel.saldoPendiente > 0 && (
                    <div className="text-right">
                      <span className="text-[9px] text-amber-500 dark:text-amber-400 font-bold">
                        Deuda: <span className="font-mono text-xs font-black text-amber-600 dark:text-amber-300">{SIM()}{clienteSel.saldoPendiente.toFixed(2)}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de Ítems en Venta */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px]">
                {carrito.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-center p-4">
                    <IconCard size={28} className="mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs">El carrito está vacío.</p>
                    <p className="text-[10px] text-slate-700 dark:text-slate-300 mt-0.5">Toca un producto del catálogo o escanea para vender.</p>
                  </div>
                ) : (
                  carrito.map((l) => {
                    const lineKey = l.presentacionId ? `${l.productoId}-pres-${l.presentacionId}` : l.productoId;
                    return (
                      <div key={lineKey} className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-300/60 dark:border-slate-700/50 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                              <span>{l.nombre}</span>
                              {l.esMayorista && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                  MAYORISTA
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              {SIM()}{l.precio.toFixed(2)} c/u {l.esMayorista && <span className="text-emerald-400 font-semibold">(Escala Mayor)</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => cambiarCantidad(lineKey, -1)} className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold text-xs cursor-pointer">−</button>
                            <span className="w-5 text-center font-bold text-xs font-mono">{l.cantidad}</span>
                            <button onClick={() => cambiarCantidad(lineKey, 1)} className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold text-xs cursor-pointer">+</button>
                            <button onClick={() => quitarDelCarrito(lineKey)} className="w-6 h-6 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center ml-1 cursor-pointer">
                              <IconTrash size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                          {l.lote && <span className="font-mono text-emerald-400">Lote: {l.lote}</span>}
                          {l.unidadMedida && <span>Unidad: {l.unidadMedida}</span>}
                          <span className="font-mono font-bold text-slate-900 dark:text-white ml-auto">{SIM()}{(l.precio * l.cantidad).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Totalizador & Acciones Comerciales */}
              <div className="flex-shrink-0 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                {/* Cargos e impuestos en un clic, como en Restaurante: el cajero decide si esta venta los lleva */}
                {carrito.length > 0 && !modoEuro() && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {([
                      ["iva", `IVA ${impuestos?.alicuotaIva && impuestos.alicuotaIva > 0 ? impuestos.alicuotaIva : 16}%`, aplicaIvaVenta, () => setAplicaIvaVenta((v) => !v)],
                      ["igtf", `IGTF ${impuestos?.alicuotaIgtf && impuestos.alicuotaIgtf > 0 ? impuestos.alicuotaIgtf : 3}%`, aplicaIgtfVenta, () => setAplicaIgtfVenta((v) => !v)],
                      ["delivery", "Delivery", conDelivery, () => {
                        const nuevo = !conDelivery;
                        setConDelivery(nuevo);
                        if (nuevo && !montoDelivery && (impuestos?.costoEnvioDelivery ?? 0) > 0) setMontoDelivery(String(impuestos!.costoEnvioDelivery));
                      }],
                    ] as const).map(([clave, etiqueta, activo, alternar]) => (
                      <button key={clave} type="button" onClick={alternar}
                        className={`text-[11px] font-bold px-3 py-1 rounded-full border cursor-pointer transition-colors ${
                          activo
                            ? clave === "delivery" ? "bg-teal-600 border-teal-600 text-white" : "bg-amber-600 border-amber-600 text-white"
                            : "border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400"
                        }`}>
                        {activo ? "✓ " : "+ "}{etiqueta}
                      </button>
                    ))}
                    {conDelivery && (
                      <span className="flex items-center gap-1 text-xs">
                        <span className="text-slate-500">{SIM()}</span>
                        <input
                          type="number" min={0} step={0.5} value={montoDelivery} placeholder="0.00" autoFocus={!montoDelivery}
                          onChange={(e) => setMontoDelivery(e.target.value)}
                          className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                        />
                      </span>
                    )}
                  </div>
                )}
                {desgloseFiscal.ivaQuitado && carrito.length > 0 && (
                  <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-300">
                    Venta sin IVA: quedará marcada en el libro de ventas con tu usuario.
                  </div>
                )}
                <div className="space-y-1 bg-slate-100/60 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-300/60 dark:border-slate-700/40">
                  {(desgloseFiscal.cobraIva || desgloseFiscal.delivery > 0 || desgloseFiscal.alicuotaIgtf > 0) && carrito.length > 0 && (
                    <div className="space-y-0.5 pb-1.5 mb-1 border-b border-slate-300/60 dark:border-slate-700/50 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {desgloseFiscal.exento > 0 && (
                        <div className="flex justify-between"><span>Exento de IVA</span><span>{SIM()}{desgloseFiscal.exento.toFixed(2)}</span></div>
                      )}
                      <div className="flex justify-between"><span>{desgloseFiscal.cobraIva ? "Base imponible" : "Subtotal"}</span><span>{SIM()}{(desgloseFiscal.base - (desgloseFiscal.cobraIva ? 0 : desgloseFiscal.delivery)).toFixed(2)}</span></div>
                      {desgloseFiscal.cobraIva && (
                        <div className="flex justify-between"><span>IVA {desgloseFiscal.ivaQuitado ? "(quitado)" : `${desgloseFiscal.alicuota}%`}</span><span>{SIM()}{desgloseFiscal.iva.toFixed(2)}</span></div>
                      )}
                      {desgloseFiscal.delivery > 0 && (
                        <div className="flex justify-between"><span>Delivery{desgloseFiscal.cobraIva ? " (en la base)" : ""}</span><span>{SIM()}{desgloseFiscal.delivery.toFixed(2)}</span></div>
                      )}
                      {desgloseFiscal.alicuotaIgtf > 0 && (
                        <div className="flex justify-between"><span>IGTF {desgloseFiscal.alicuotaIgtf}% (si paga en divisas)</span><span>{SIM()}{igtfSobre(desgloseFiscal.subtotal).toFixed(2)}</span></div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">TOTAL {CODIGO()}:</span>
                    <span className="font-mono font-black text-xl text-teal-400">{SIM()}{desgloseFiscal.subtotal.toFixed(2)}</span>
                  </div>
                  {desgloseFiscal.alicuotaIgtf > 0 && carrito.length > 0 && (
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 dark:text-slate-400">Pagando en divisas (+IGTF):</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{SIM()}{(desgloseFiscal.subtotal + igtfSobre(desgloseFiscal.subtotal)).toFixed(2)}</span>
                    </div>
                  )}
                  <div className={`flex items-center justify-between text-xs font-mono ${modoEuro() ? "hidden" : ""}`}>
                    <span className="text-slate-500 dark:text-slate-400">Total Bolívares (Bs):</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">Bs. {totalBs.toFixed(2)}</span>
                  </div>
                  <div className={`flex items-center justify-between text-xs font-mono ${modoEuro() ? "hidden" : ""}`}>
                    <span className="text-slate-500 dark:text-slate-400">Total Pesos (COP):</span>
                    <span className="text-slate-600 dark:text-slate-300 font-bold">COP {SIM()}{totalCopCalculado.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                {/* Botones de Acción de Venta */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={generarCotizacion}
                    disabled={carrito.length === 0}
                    className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Descargar presupuesto formal para cliente"
                  >
                    <IconFileText size={14} />
                    <span>Cotización PDF</span>
                  </button>

                                    <button
                    type="button"
                    onClick={() => {
                      if (carrito.length === 0) return;
                      const cedulaLimpia = cedulaClienteInput.trim().toUpperCase();
                      const nombreLimpio = nombreClienteInput.trim();
                      const tieneCliente = (clienteSel && clienteSel.id !== "c-1" && clienteSel.id !== "c-provisional") || cedulaLimpia.length > 0 || nombreLimpio.length > 0;

                      if (!tieneCliente) {
                        mostrarToast("Para vender a crédito debes indicar los datos del cliente (Cédula o Nombre) en el mostrador arriba.", "info");
                        return;
                      }
                      ejecutarCobro(true);
                    }}
                    disabled={carrito.length === 0}
                    className="py-2.5 px-3.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 border border-amber-400 dark:border-amber-500/40 text-amber-900 dark:text-amber-300 disabled:opacity-40 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                    title="Cargar esta venta a Cuentas por Cobrar (CXC)"
                  >
                    <IconWallet size={14} className="text-amber-700 dark:text-amber-400 flex-shrink-0" />
                    <span>A Crédito (CXC)</span>
                  </button>
                </div>

                <button
                  onClick={() => setModalCobro(true)}
                  disabled={carrito.length === 0}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-black text-sm cursor-pointer hover:opacity-95 disabled:opacity-40 shadow-[0_0_20px_rgba(45,212,191,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  <span> Cobrar en Mostrador ({SIM()}{desgloseFiscal.subtotal.toFixed(2)})</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-950/25 text-[10px] font-mono text-slate-950 font-black">
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
          <div className="flex-1 bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Control de Inventario & Stock</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {esComercio
                    ? "Kárdex auditable, presentaciones fraccionadas, escala mayorista y compras a proveedores."
                    : "Catálogo de productos, existencias, lotes y precios de venta."}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {esComercio && (
                  <>
                    <button
                      onClick={() => cargarRepuestosBackend()}
                      disabled={cargandoBackend}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
                      title="Sincronizar catálogo con base de datos"
                    >
                      <IconRefresh size={14} className={cargandoBackend ? "animate-spin" : ""} />
                      <span>{cargandoBackend ? "Sincronizando..." : "Sincronizar DB"}</span>
                    </button>
                    <button
                      onClick={() => setModalImportarInventario(true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
                      title="Cargar varios artículos de una vez desde un Excel/CSV"
                    >
                      <IconDownload size={14} />
                      <span>Importar Excel/CSV</span>
                    </button>
                    <button
                      onClick={() => setModalCompraProveedor(true)}
                      className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer shadow-md flex items-center gap-1.5 transition-colors"
                    >
                      <IconBox size={14} />
                      <span>Registrar Compra (Proveedor)</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setModalNuevoProducto(true)}
                  className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-teal-400 shadow-md transition-colors"
                >
                  + Nuevo {esComercio ? "Producto / Artículo" : "Producto"}
                </button>
              </div>
            </div>

            {(productosBajoStockInventario.length > 0 || productosPorVencerInventario.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <IconWarning size={14} className="text-amber-500" />
                    <h4 className="font-['Outfit'] font-black text-xs text-slate-900 dark:text-white">Alertas de Inventario Bajo</h4>
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full" title="Bajo mínimo">
                        {productosBajoStockInventario.length - productosAgotadosInventario.length} bajo
                      </span>
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full" title="Agotados (stock 0)">
                        {productosAgotadosInventario.length} agotados
                      </span>
                    </div>
                  </div>
                  {productosBajoStockInventario.length === 0 ? (
                    <div className="p-5 text-center text-[11px] text-slate-400 flex items-center justify-center gap-2">
                      <IconCheckCircle size={13} className="text-emerald-500" /> Todo el inventario está por encima del mínimo.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[9px] sticky top-0 bg-white dark:bg-slate-900">
                            <th className="p-2.5">Código</th>
                            <th className="p-2.5">Producto</th>
                            <th className="p-2.5 text-right">Stock</th>
                            <th className="p-2.5 text-right">Mínimo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {productosBajoStockInventario.map((p) => {
                            const agotado = p.stock <= 0;
                            return (
                              <tr key={p.id}>
                                <td className="p-2.5 font-mono text-slate-500 dark:text-slate-400">{p.codigo}</td>
                                <td className="p-2.5 font-bold text-slate-900 dark:text-white">{p.nombre}</td>
                                <td className={`p-2.5 text-right font-bold ${agotado ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"}`}>{p.stock} {p.unidadMedida || ""}</td>
                                <td className="p-2.5 text-right text-slate-500 dark:text-slate-400">{p.stockMinimo}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <IconHourglass size={14} className="text-amber-500" />
                    <h4 className="font-['Outfit'] font-black text-xs text-slate-900 dark:text-white">Alertas de Vencimiento</h4>
                    <span className="ml-auto text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">{productosPorVencerInventario.length}</span>
                  </div>
                  {productosPorVencerInventario.length === 0 ? (
                    <div className="p-5 text-center text-[11px] text-slate-400 flex items-center justify-center gap-2">
                      <IconCheckCircle size={13} className="text-emerald-500" /> Sin artículos por vencer en los próximos 30 días.
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[9px] sticky top-0 bg-white dark:bg-slate-900">
                            <th className="p-2.5">Código</th>
                            <th className="p-2.5">Producto</th>
                            <th className="p-2.5 text-right">Stock</th>
                            <th className="p-2.5 text-right">Vencimiento</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {productosPorVencerInventario.map((p) => {
                            const info = textoVencimientoComercio(p.fechaVencimiento!);
                            return (
                              <tr key={p.id}>
                                <td className="p-2.5 font-mono text-slate-500 dark:text-slate-400">{p.codigo}</td>
                                <td className="p-2.5 font-bold text-slate-900 dark:text-white">{p.nombre}</td>
                                <td className="p-2.5 text-right text-slate-500 dark:text-slate-400">{p.stock} {p.unidadMedida || ""}</td>
                                <td className={`p-2.5 text-right font-bold ${info.color}`}>{info.texto}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider sticky top-0 text-[11px]">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Producto</th>
                    <th className="p-3">Categoría</th>
                    {esFarmacia && <th className="p-3">Principio Activo</th>}
                    {esFarmacia && <th className="p-3">Lote / Vence</th>}
                    {esComercio && <th className="p-3">Unidad / Ubicación</th>}
                    {esComercio && <th className="p-3">Escala Mayorista</th>}
                    <th className="p-3 text-right">Stock</th>
                    {esComercio && <th className="p-3 text-right">Último Costo</th>}
                    <th className="p-3 text-right">Precio {CODIGO()}</th>
                    <th className={`p-3 text-right ${modoEuro() ? "hidden" : ""}`}>Precio Bs</th>
                    {esComercio && <th className="p-3 text-right">Margen</th>}
                    {esComercio && <th className="p-3 text-center">Gestión</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  {productos.filter((p) => p.rubro === perfilActivo).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-slate-500 dark:text-slate-400">
                        <div>{p.codigo}</div>
                        {p.codigoOem && <div className="text-[10px] text-cyan-400 font-mono">OEM: {p.codigoOem}</div>}
                      </td>
                      <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">
                        {p.nombre}
                        {esComercio && p.fechaVencimiento && (
                          <div className={`text-[10px] font-bold ${textoVencimientoComercio(p.fechaVencimiento).color}`}>
                            {textoVencimientoComercio(p.fechaVencimiento).texto}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-sans text-slate-500 dark:text-slate-400">{p.categoria}</td>
                      {esFarmacia && <td className="p-3 text-emerald-400">{p.principioActivo || "—"}</td>}
                      {esFarmacia && <td className="p-3 text-slate-600 dark:text-slate-300">{p.lote || "—"} ({p.fechaVencimiento || "—"})</td>}
                      {esComercio && <td className="p-3 text-slate-600 dark:text-slate-300">{p.unidadMedida || "Pza"} · {p.ubicacion || "Sin ubicación"}</td>}
                      {esComercio && (
                        <td className="p-3 text-emerald-400 text-xs">
                          {p.precioMayorista && p.cantidadMinimaMayorista
                            ? `${SIM()}${p.precioMayorista.toFixed(2)} (≥${p.cantidadMinimaMayorista} ${p.unidadMedida || 'u'})`
                            : "—"}
                        </td>
                      )}
                      <td className={`p-3 text-right font-bold ${p.stock <= p.stockMinimo ? "text-amber-400" : "text-teal-400"}`}>
                        {p.stock}
                      </td>
                      {esComercio && (
                        <td className="p-3 text-right text-slate-500 dark:text-slate-400 font-mono">
                          {SIM()}{p.costo.toFixed(2)}
                        </td>
                      )}
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-white">{SIM()}{p.precio.toFixed(2)}</td>
                      <td className={`p-3 text-right text-slate-600 dark:text-slate-300 ${modoEuro() ? "hidden" : ""}`}>Bs. {(p.precio * tasaActivaBs).toFixed(2)}</td>
                      {esComercio && (
                        <td className="p-3 text-right">
                          {p.costo > 0 ? (() => {
                            const margenUnit = p.precio - p.costo;
                            const margenPct = (margenUnit / p.costo) * 100;
                            const color = margenPct < 0
                              ? "text-rose-400"
                              : margenPct < 15
                                ? "text-amber-400"
                                : "text-emerald-400";
                            return (
                              <span className={`font-bold ${color}`} title={`+${SIM()}${margenUnit.toFixed(2)} por unidad sobre el último costo`}>
                                {margenPct >= 0 ? "+" : ""}{margenPct.toFixed(1)}%
                              </span>
                            );
                          })() : (
                            <span className="text-slate-400 dark:text-slate-600" title="Sin costo registrado todavía — registra una compra para calcular el margen">—</span>
                          )}
                        </td>
                      )}
                      {esComercio && (
                        <td className="p-3 text-center space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setKardexModalItem(p)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] text-teal-300 font-bold border border-slate-300 dark:border-slate-700 cursor-pointer shadow-sm"
                            title="Ver movimientos auditables en Kárdex"
                          >
                             Kárdex
                          </button>
                          <button
                            onClick={() => setPresentacionesModalItem(p)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] text-cyan-300 font-bold border border-slate-300 dark:border-slate-700 cursor-pointer shadow-sm"
                            title="Gestionar presentaciones fraccionadas (Cajas, Metros, etc.)"
                          >
                            ️ Presentaciones
                          </button>
                          <button
                            onClick={() => setAlmacenModalItem(p)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] text-indigo-400 font-bold border border-slate-300 dark:border-slate-700 cursor-pointer shadow-sm"
                            title="Ver en qué almacén está el stock y trasladar entre ubicaciones"
                            disabled={!p.backendId}
                          >
                            Almacenes
                          </button>
                          <button
                            onClick={() => setAjustarStockModalItem(p)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] text-amber-400 font-bold border border-slate-300 dark:border-slate-700 cursor-pointer shadow-sm"
                            title="Corregir stock tras un conteo físico"
                            disabled={!p.backendId}
                          >
                            Ajustar
                          </button>
                          <button
                            onClick={() => { setEditarModalItem(p); setEditarImagenBase64(p.imagenBase64); setCategoriaEnEdicion(p.categoria === "General" ? "" : p.categoria || ""); setEditarTab("datos"); }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] text-slate-500 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-700 cursor-pointer shadow-sm"
                            title="Editar datos del producto"
                            disabled={!p.backendId}
                          >
                            Editar
                          </button>
                          <button
                            onClick={async () => {
                              if (!p.backendId || !user?.tenantId) return;
                              if (!confirm(`¿Eliminar "${p.nombre}" del catálogo? Esta acción no se puede deshacer.`)) return;
                              try {
                                await eliminarRepuesto(p.backendId, user.tenantId);
                                setProductos((prev) => prev.filter((x) => x.id !== p.id));
                                mostrarToast("Producto eliminado del catálogo.", "success");
                              } catch (err: any) {
                                mostrarToast(err?.message || "No se pudo eliminar el producto.", "error");
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[10px] text-rose-400 font-bold border border-rose-500/30 cursor-pointer shadow-sm"
                            title="Eliminar producto del catálogo"
                            disabled={!p.backendId}
                          >
                            <IconTrash size={11} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {esComercio && (
              <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">Compras & Proveedores — Historial</h4>
                  <button
                    onClick={() => cargarComprasRepuesto()}
                    disabled={cargandoCompras}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-700 cursor-pointer flex items-center gap-1"
                  >
                    <IconRefresh size={11} className={cargandoCompras ? "animate-spin" : ""} />
                    <span>Actualizar</span>
                  </button>
                </div>
                {cargandoCompras && comprasRepuesto === null ? (
                  <div className="py-4 text-center text-slate-500 dark:text-slate-400 text-xs">Cargando historial de compras...</div>
                ) : !comprasRepuesto || comprasRepuesto.length === 0 ? (
                  <div className="py-4 text-center text-slate-500 dark:text-slate-400 text-xs rounded-xl bg-slate-100/60 dark:bg-slate-800/40">
                    Todavía no hay compras a proveedor registradas. Usá "Registrar Compra (Proveedor)" arriba.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Fecha</th>
                          <th className="p-2.5">Proveedor</th>
                          <th className="p-2.5">N° Factura</th>
                          <th className="p-2.5 text-right">Total</th>
                          <th className="p-2.5 text-right">Ítems</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                        {comprasRepuesto.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 text-[11px] text-slate-500 dark:text-slate-400">{new Date(c.fechaCompra).toLocaleDateString()}</td>
                            <td className="p-2.5 font-sans font-bold text-slate-900 dark:text-white">{c.proveedor?.nombre || "—"}</td>
                            <td className="p-2.5">{c.numeroFactura || "—"}</td>
                            <td className="p-2.5 text-right font-bold text-teal-500 dark:text-teal-400">{SIM()}{c.total.toFixed(2)}</td>
                            <td className="p-2.5 text-right text-slate-500 dark:text-slate-400">{c.items?.length ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: PROVEEDORES — ficha completa por proveedor + historial de
            compras (mismo patrón que "Compras & Proveedores" de Aurora
            Horeca, adaptado a la estética y al modelo de datos de Comercio:
            ProveedorRepuesto/CompraRepuesto en vez de ProveedorHoreca).
            ══════════════════════════════════════════════════════════════════ */}
        {tab === "proveedores" && esComercio && (
          <div className="flex-1 bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Proveedores</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ficha de contacto y compras registradas por cada proveedor de tu inventario.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={busquedaProveedor}
                    onChange={(e) => setBusquedaProveedor(e.target.value)}
                    placeholder="Buscar por nombre o RIF..."
                    className="pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs w-56"
                  />
                </div>
                <button
                  onClick={() => setModalNuevoProveedor(true)}
                  className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-teal-400 shadow-md transition-colors flex items-center gap-1.5"
                >
                  <IconTruck size={14} />
                  + Nuevo Proveedor
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {proveedoresRepuesto.length === 0 ? (
                <div className="py-10 text-center text-slate-500 dark:text-slate-400 text-xs rounded-2xl bg-slate-100/60 dark:bg-slate-800/40">
                  Todavía no hay proveedores registrados. Usá "+ Nuevo Proveedor" arriba, o registrá uno directamente al cargar una compra.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {proveedoresRepuesto
                    .filter((p) => {
                      const q = busquedaProveedor.trim().toLowerCase();
                      if (!q) return true;
                      return p.nombre.toLowerCase().includes(q) || (p.rif || "").toLowerCase().includes(q);
                    })
                    .map((p) => {
                      const comprasDeEste = (comprasRepuesto || []).filter((c) => c.proveedor?.id === p.id);
                      const totalCompradoEste = comprasDeEste.reduce((acc, c) => acc + (c.total || 0), 0);
                      const ultimaCompraEste = comprasDeEste.length > 0
                        ? [...comprasDeEste].sort((a, b) => new Date(b.fechaCompra).getTime() - new Date(a.fechaCompra).getTime())[0]
                        : null;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setProveedorDetalle(p)}
                          className="text-left p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 transition-colors cursor-pointer space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white truncate">{p.nombre}</div>
                            <span className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                              p.activo ? "bg-teal-500/20 text-teal-600 dark:text-teal-400" : "bg-slate-400/20 text-slate-500 dark:text-slate-400"
                            }`}>
                              {p.activo ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{p.rif || "Sin RIF registrado"}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{p.contacto || "—"} {p.telefono ? `· ${p.telefono}` : ""}</div>
                          {comprasDeEste.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                              <div>
                                <span className="text-slate-400 dark:text-slate-500 block">Comprado</span>
                                <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{SIM()}{totalCompradoEste.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 dark:text-slate-500 block">Última compra</span>
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{ultimaCompraEste ? new Date(ultimaCompraEste.fechaCompra).toLocaleDateString("es-VE") : "—"}</span>
                              </div>
                            </div>
                          )}
                          <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 dark:text-slate-500">{comprasDeEste.length} compra{comprasDeEste.length === 1 ? "" : "s"} registrada{comprasDeEste.length === 1 ? "" : "s"}</span>
                            <span className="text-cyan-600 dark:text-cyan-400 font-bold">Ver ficha →</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: CLIENTES & CUENTAS POR COBRAR (CRÉDITOS)
            ══════════════════════════════════════════════════════════════════ */}
                {tab === "clientes" && (() => {
          const clientesFiltrados = clientes.filter((c) => {
            const b = busquedaClienteTab.trim().toLowerCase();
            if (!b) return true;
            return (
              c.nombre.toLowerCase().includes(b) ||
              c.documento.toLowerCase().includes(b) ||
              (c.telefono && c.telefono.toLowerCase().includes(b))
            );
          });

          const totalCarteraCobrar = clientes.reduce((s, c) => s + (c.saldoPendiente || 0), 0);
          const clientesConDeuda = clientes.filter((c) => c.saldoPendiente > 0).length;

          // Activo = compró en los últimos 30 días — mismo criterio que la ficha
          // individual de cada cliente, calculado una sola vez acá para las tarjetas
          // globales de arriba.
          const clientesActivosCount = clientes.filter((c) => {
            const compras = ventas.filter((v) => v.cliente.id === c.id || (v.cliente.documento && c.documento && v.cliente.documento.toUpperCase() === c.documento.toUpperCase()));
            if (compras.length === 0) return false;
            const f = new Date(compras[0].fecha);
            if (isNaN(f.getTime())) return true;
            return Math.floor((Date.now() - f.getTime()) / 86400000) <= 30;
          }).length;

          return (
            <div className="flex-1 bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Directorio de Clientes, Historial & Créditos</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Historial de compras, tickets emitidos, frecuencia de visita, cálculo de utilidad y cuentas por cobrar.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar por cédula, nombre o tlf..."
                      value={busquedaClienteTab}
                      onChange={(e) => setBusquedaClienteTab(e.target.value)}
                      className="bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white rounded-xl pl-8 pr-3 py-2 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-teal-500 w-64"
                    />
                    <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Métricas Globales de Cartera y CRM */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block">Clientes Activos</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{clientesActivosCount}</span>
                  <span className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70 block mt-0.5">Compraron en 30 días</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Clientes Inactivos</span>
                  <span className="text-lg font-black text-slate-500 dark:text-slate-400">{clientes.length - clientesActivosCount}</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Sin compras en 30 días</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Clientes Registrados</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">{clientes.length}</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">En base de datos</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Ventas Registradas</span>
                  <span className="text-lg font-black text-teal-600 dark:text-teal-400">{ventas.length} tickets</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Histórico general</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Cartera por Cobrar</span>
                  <span className="text-lg font-black text-amber-500 dark:text-amber-400">{SIM()}{totalCarteraCobrar.toFixed(2)}</span>
                  <span className={`text-[9px] text-slate-400 block mt-0.5 ${modoEuro() ? "hidden" : ""}`}>Bs. {(totalCarteraCobrar * tasaActivaBs).toFixed(2)}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Clientes con Crédito</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">{clientesConDeuda}</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Con saldo pendiente</span>
                </div>
              </div>

              {/* Grid de Clientes con Historial y Métricas */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {clientesFiltrados.map((c) => {
                  const compras = ventas.filter(
                    (v) =>
                      v.cliente.id === c.id ||
                      (v.cliente.documento && c.documento && v.cliente.documento.toUpperCase() === c.documento.toUpperCase())
                  );
                  const totalCompradoUSD = compras.reduce((acc, v) => acc + (v.total || 0), 0);
                  const utilidadTotal = compras.reduce((acc, v) => acc + (v.utilidad || 0), 0);
                  const ultimaVenta = compras[0];
                  const ticketPromedio = compras.length > 0 ? totalCompradoUSD / compras.length : 0;

                  // Producto que más se repite en las compras de este cliente (por unidades),
                  // no por número de tickets — sirve para saber qué ofrecerle primero.
                  const productoFavorito = (() => {
                    const acc: Record<string, number> = {};
                    for (const v of compras) for (const l of v.lineas || []) acc[l.nombre] = (acc[l.nombre] || 0) + l.cantidad;
                    const entradas = Object.entries(acc);
                    return entradas.length > 0 ? entradas.sort((a, b) => b[1] - a[1])[0][0] : null;
                  })();

                  // "Activo" = compró en los últimos 30 días. Si la fecha guardada no se
                  // puede interpretar (formato local viejo), no se castiga al cliente
                  // marcándolo inactivo sin certeza — se asume activo si tiene historial.
                  const fechaUltima = ultimaVenta ? new Date(ultimaVenta.fecha) : null;
                  const diasDesdeUltima = fechaUltima && !isNaN(fechaUltima.getTime())
                    ? Math.floor((Date.now() - fechaUltima.getTime()) / 86400000)
                    : null;
                  const clienteActivo = compras.length === 0 ? null : diasDesdeUltima == null ? true : diasDesdeUltima <= 30;

                  return (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-300/70 dark:border-slate-700/60 space-y-3 flex flex-col justify-between hover:border-teal-500/40 transition-all shadow-sm"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                            {c.documento}
                          </span>
                          {c.saldoPendiente > 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                              Deuda: {SIM()}{c.saldoPendiente.toFixed(2)}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                              Solvente
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <div className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{c.nombre}</div>
                            {clienteActivo != null && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${clienteActivo ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-slate-400/15 text-slate-500 dark:text-slate-400"}`}>
                                {clienteActivo ? "Activo" : "Inactivo"}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tlf: {c.telefono || "Sin teléfono"}</div>
                        </div>

                        {/* Indicadores de Compras y Utilidad */}
                        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase font-bold">Compras</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                              {compras.length} {compras.length === 1 ? "vez" : "veces"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase font-bold">Facturado</span>
                            <span className="text-xs font-black text-teal-600 dark:text-teal-400 font-mono">
                              {SIM()}{totalCompradoUSD.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase font-bold">Utilidad</span>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                              +{SIM()}{utilidadTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {compras.length > 0 && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
                            <div className="flex items-center justify-between">
                              <span>Última compra:</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300">{ultimaVenta.fecha.split(",")[0]}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Ticket promedio:</span>
                              <span className="font-mono text-slate-700 dark:text-slate-300">{SIM()}{ticketPromedio.toFixed(2)}</span>
                            </div>
                            {productoFavorito && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex-shrink-0">Producto favorito:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{productoFavorito}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-300/60 dark:border-slate-700/50 flex items-center gap-2">
                        <button
                          onClick={() => setClienteHistorialModal(c)}
                          className="flex-1 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-700/70 hover:bg-teal-500 hover:text-slate-950 text-slate-800 dark:text-white font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
                          title="Ver todos los tickets y productos comprados"
                        >
                          <IconReceipt size={13} />
                          <span>Ver Historial</span>
                        </button>
                        {c.saldoPendiente > 0 && (
                          <button
                            onClick={() => {
                              setClienteAbonoSel(c);
                              setMontoAbono(String(c.saldoPendiente));
                            }}
                            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-sm"
                          >
                            Abonar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: ADMINISTRACIÓN — Ingresos & Gastos / CXC-CXP / Cuentas Bancarias
            son submódulos navegables desde el propio sidebar (desplegable bajo
            "Administración"), no pestañas horizontales duplicadas acá.
            ══════════════════════════════════════════════════════════════════ */}
        {tab === "administracion" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {subTabAdmin === "libros" ? (
              <LibrosFiscalesComercio nombreNegocio={user?.empresa || "Mi Comercio"} mostrarToast={mostrarToast} />
            ) : subTabAdmin === "personal" ? (
              <PersonalRoute embebido>
                <PersonalPage embedded />
              </PersonalRoute>
            ) : subTabAdmin === "cuentas_bancarias" && user?.tenantId ? (
              <CuentasBancariasComercio tenantId={user.tenantId} mostrarToast={mostrarToast} />
            ) : subTabAdmin === "cxc_cxp" ? (
              <CuentasPorCobrarPagarComercio
                cuentas={cuentas}
                guardarCuentas={guardarCuentas}
                tasaActivaBs={tasaActivaBs}
                tasaCop={tasaCop}
                clientes={clientes}
                setClientes={setClientes}
                proveedores={proveedoresRepuesto}
                ingresosCaja={ingresosCaja}
                setIngresosCaja={setIngresosCaja}
                gastosCaja={gastosCaja}
                setGastosCaja={setGastosCaja}
                mostrarToast={mostrarToast}
                cargarIngresosCaja={cargarIngresosCaja}
                cargarGastosCaja={cargarGastosCaja}
                cargarCuentas={cargarCuentas}
                tenantId={user?.tenantId}
              />
            ) : (
              <IngresosGastosComercio
                ingresosCaja={ingresosCaja}
                gastosCaja={gastosCaja}
                formGasto={formGasto}
                setFormGasto={setFormGasto}
                registrarGasto={registrarGasto}
                guardandoGasto={guardandoGasto}
              />
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4: CIERRE & REPORTES — TURNOS DE CAJA CON ARQUEO REAL
            (mismo motor /api/financiero/turnos que usa Aurora Horeca)
            ══════════════════════════════════════════════════════════════════ */}
        {tab === "estadisticas" && (
          <EstadisticasComercio
            ventas={ventas}
            productos={productosDelRubro}
            gastos={gastosCaja}
            simbolo={SIM()}
            tasaBs={tasaActivaBs}
            tasaCop={tasaCop}
          />
        )}

        {tab === "cierre" && user?.tenantId && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/60 w-fit">
              <button
                onClick={() => setSubCierre("caja")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  subCierre === "caja" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Arqueo de Caja
              </button>
              {user?.rol === "DUENO_ADMIN" && (
                <button
                  onClick={() => setSubCierre("utilidad")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    subCierre === "utilidad" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Utilidad Real
                </button>
              )}
              {puedeDevolver && (
                <button
                  onClick={() => setSubCierre("devoluciones")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    subCierre === "devoluciones" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Devoluciones
                </button>
              )}
            </div>

            {subCierre === "caja" ? (
              <ArqueoCajaMultimoneda
                tenantId={user.tenantId}
                tasaUsdVes={tasaActivaBs}
                tasaUsdCop={tasaCop}
                monedas={modoEuro() ? ["USD"] : ["USD", "VES", "COP"]}
              />
            ) : subCierre === "devoluciones" && puedeDevolver ? (
              <DevolucionesComercio
                ticketInicial={ticketADevolver}
                onDevuelto={(mensaje) => { mostrarToast(mensaje, "success"); cargarRepuestosBackend(); cargarIngresosCaja(); }}
              />
            ) : (
              <UtilidadComercio />
            )}
          </div>
        )}

        {tab === "pedidos_web" && user?.tenantId && (
          <PedidosWebPanel
            tenantId={user.tenantId}
            tasaVes={tasaActivaBs}
            nombreNegocio={nombreLocal}
            onPedidoConfirmado={() => { cargarRepuestosBackend(); cargarIngresosCaja(); }}
            onVerQrModal={() => { setSeccionConfig("qr"); setTab("configuracion"); }}
          />
        )}

        {tab === "configuracion" && user?.tenantId && (
          <ConfiguracionComercio
            tenantId={user.tenantId}
            nombreNegocio={user?.empresa || "Mi Comercio"}
            esDuenoAdmin={user?.rol === "DUENO_ADMIN"}
            onIrAEquipoRoles={onIrAEquipoRoles}
            seccion={seccionConfig}
            onSeccion={setSeccionConfig}
            mostrarToast={mostrarToast}
          />
        )}

        {tab === "auditoria" && user?.rol === "DUENO_ADMIN" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <BitacoraAuditoria moduloSugerido="COMERCIO" />
          </div>
        )}

        </main>
      </div>

      {/* ── MODAL DE COBRO MIXTO DE MOSTRADOR ── */}
      {modalIaVisible && user?.tenantId && (
        <AsistenteIaModal
          tenantId={user.tenantId}
          nombreNegocio={user?.empresa || "Mi Comercio"}
          onClose={() => setModalIaVisible(false)}
        />
      )}

      {modalCobro && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => {
            setModalCobro(false);
            setModoCobro("unico");
            setPagosMixtos([]);
            setPagoMixtoMonto("");
            setPagoMixtoRef("");
            setEmailClienteModal("");
            setEnviarEmailAlConfirmar(false);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl cursor-default overflow-y-auto max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Cabecera ── */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Cobro en Mostrador</h3>
              <button
                onClick={() => {
                  setModalCobro(false);
                  setModoCobro("unico");
                  setPagosMixtos([]);
                  setPagoMixtoMonto("");
                  setPagoMixtoRef("");
                  setEmailClienteModal("");
                  setEnviarEmailAlConfirmar(false);
                }}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            {/* ── Selector Modo Pago ── */}
            <div className="flex rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 text-xs font-black">
              {(["unico", "mixto"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setModoCobro(m);
                    setPagosMixtos([]);
                    setPagoMixtoMonto("");
                    setPagoMixtoRef("");
                  }}
                  className={`flex-1 py-2 transition-all cursor-pointer ${
                    modoCobro === m
                      ? "bg-teal-500 text-slate-950"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {m === "unico" ? "Pago Unico" : "Dividir Pago (Mixto)"}
                </button>
              ))}
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-300/70 dark:border-slate-700/60 space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                <span>Total a Cobrar:</span>
                <span className="font-mono text-xl font-black text-teal-400">{SIM()}{totalUSD.toFixed(2)}</span>
              </div>
              {igtfCobro > 0 && (
                <div className="flex justify-between items-center text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span>Incluye IGTF {desgloseFiscal.alicuotaIgtf}% por pago en divisas:</span>
                  <span>{SIM()}{igtfCobro.toFixed(2)}</span>
                </div>
              )}
              <div className={`flex justify-between items-center text-xs font-mono text-slate-600 dark:text-slate-300 ${modoEuro() ? "hidden" : ""}`}>
                <span>En Bolívares (Bs):</span>
                <span className="font-bold">Bs. {totalBs.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between items-center text-xs font-mono text-slate-500 dark:text-slate-400 ${modoEuro() ? "hidden" : ""}`}>
                <span>En Pesos (COP):</span>
                <span>COP {SIM()}{totalCopCalculado.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            {/* ── Sección Pago Único (oculta en modo mixto) ── */}
            {modoCobro === "unico" && (
            <>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">1. Método de Pago</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  ["EFECTIVO_USD", ` ${CODIGO()} Efectivo`, "USD"],
                  ["EFECTIVO_BS", " Bs Efectivo", "VES"],
                  ["PAGO_MOVIL", " Pago Móvil", "VES"],
                  ["PUNTO_VENTA", " Punto Débito", "VES"],
                  ["ZELLE", "Zelle / USDT", "USD"],
                  ["COP_EFECTIVO", " Pesos COP", "COP"],
                ].filter(([id]) => !modoEuro() || id === "EFECTIVO_USD" || id === "PUNTO_VENTA").map(([i, l, m]) => [i, l, modoEuro() ? "USD" : m]).map(([id, label, mon]) => (
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
                      metodoPagoSel === id ? "bg-teal-500/20 border-teal-400 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">2. Moneda Recibida</label>
                <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-300 dark:border-slate-700 text-[10px]">
                  {(["USD", "VES", "COP"] as const).filter((m) => !modoEuro() || m === "USD").map((m) => (
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
                        monedaRecibida === m ? "bg-teal-500 text-slate-950" : "text-slate-500 dark:text-slate-400 hover:text-white"
                      }`}
                    >
                      {m === "USD" ? `${SIM()} ${CODIGO()}` : m === "VES" ? "Bs." : "COP"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="number" step="any"
                  placeholder={`Ej. ${monedaRecibida === "USD" ? totalUSD.toFixed(2) : monedaRecibida === "VES" ? totalBs.toFixed(2) : Math.round(totalCopCalculado)}`}
                  value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white text-sm font-bold focus:border-teal-400 focus:outline-none"
                  autoFocus
                />
                <select
                  value={monedaVuelto}
                  onChange={(e) => setMonedaVuelto(e.target.value as any)}
                  className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                  title="Moneda en la que se entregará el vuelto"
                >
                  <option value="USD">Vuelto en {CODIGO()} ({SIM()})</option>
                  {!modoEuro() && <option value="VES">Vuelto en Bolívares (Bs)</option>}
                  {!modoEuro() && <option value="COP">Vuelto en Pesos (COP)</option>}
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
                  Exacto
                </button>
                {monedaRecibida === "USD" && [10, 20, 50, 100].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setMontoRecibido(String(b))}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[10px] border border-slate-300 dark:border-slate-700 cursor-pointer"
                  >
                    ${b}
                  </button>
                ))}
                {monedaRecibida === "VES" && [50, 100, 200, 500].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setMontoRecibido(String(b))}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[10px] border border-slate-300 dark:border-slate-700 cursor-pointer"
                  >
                    Bs. {b}
                  </button>
                ))}
                {monedaRecibida === "COP" && [20000, 50000, 100000].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setMontoRecibido(String(b))}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[10px] border border-slate-300 dark:border-slate-700 cursor-pointer"
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
                  monedaRecibida === "VES" ? (tasaActivaBs > 0 ? val / tasaActivaBs : 0) :
                  (tasaCop > 0 ? val / tasaCop : 0);
                const diffUSD = recibidoEquivUSD - totalUSD;

                if (diffUSD > 0.005) {
                  return (
                    <div className="p-3 rounded-2xl bg-teal-500/15 border border-teal-500/40 space-y-1">
                      <div className="flex items-center justify-between text-xs font-black font-mono text-teal-300">
                        <span>VUELTO A ENTREGAR:</span>
                        <span className="text-base">
                          {monedaVuelto === "USD" ? `${SIM()}${diffUSD.toFixed(2)} ${CODIGO()}` :
                           monedaVuelto === "VES" ? `Bs. ${(diffUSD * tasaActivaBs).toFixed(2)}` :
                           `COP ${SIM()}${Math.round(diffUSD * tasaCop).toLocaleString()}`}
                        </span>
                      </div>
                      <div className={`flex items-center justify-between text-[10px] font-mono text-teal-400/80 border-t border-teal-500/20 pt-1 ${modoEuro() ? "hidden" : ""}`}>
                        <span>Equivalencias del vuelto:</span>
                        <span>
                          {SIM()}{diffUSD.toFixed(2)} ≈ Bs. {(diffUSD * tasaActivaBs).toFixed(2)} ≈ COP {SIM()}{Math.round(diffUSD * tasaCop).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  setModalCobro(false);
                  setModoCobro("unico");
                  setPagosMixtos([]);
                  setPagoMixtoMonto("");
                  setPagoMixtoRef("");
                  setEmailClienteModal("");
                  setEnviarEmailAlConfirmar(false);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
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
            </>
            )}


            {/* ── Sección PAGO MIXTO ── */}
            {modoCobro === "mixto" && (() => {
              const totalCubierto = pagosMixtos.reduce((a, p) => a + p.montoUSD, 0);
              const restante = Math.max(0, totalUSD - totalCubierto);
              const cubierto100 = restante <= 0.005;
              const vueltoMixto = Math.max(0, totalCubierto - totalUSD);

              const sugerirMonto = (mon: "USD" | "VES" | "COP") => {
                if (mon === "USD") return restante.toFixed(2);
                if (mon === "VES" && tasaActivaBs > 0) return (restante * tasaActivaBs).toFixed(2);
                if (mon === "COP" && tasaCop > 0) return String(Math.round(restante * tasaCop));
                return "";
              };

              const metodosRapidos: [string, string, "USD"|"VES"|"COP"][] = [
                ["EFECTIVO_USD", `${SIM()} ${CODIGO()} Efectivo`, "USD"],
                ["EFECTIVO_BS", "Bs Efectivo", "VES"],
                ["PAGO_MOVIL", "Pago Móvil", "VES"],
                ["PUNTO_VENTA", "Punto Débito", "VES"],
                ["ZELLE", "Zelle/USDT", "USD"],
                ["COP_EFECTIVO", "Pesos COP", "COP"],
              ];

              const agregarPago = () => {
                const monto = parseFloat(pagoMixtoMonto);
                if (isNaN(monto) || monto <= 0) return;
                let montoUSD = monto;
                if (pagoMixtoMoneda === "VES" && tasaActivaBs > 0) montoUSD = monto / tasaActivaBs;
                if (pagoMixtoMoneda === "COP" && tasaCop > 0) montoUSD = monto / tasaCop;
                setPagosMixtos(prev => [...prev, {
                  id: `pm-${Date.now()}`,
                  metodo: pagoMixtoMetodo,
                  moneda: pagoMixtoMoneda,
                  montoOriginal: monto,
                  montoUSD,
                  referencia: pagoMixtoRef.trim() || undefined,
                }]);
                setPagoMixtoMonto("");
                setPagoMixtoRef("");
              };

              return (
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-4 bg-slate-50 dark:bg-slate-800/50">

                  {/* Barra de estado financiero */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div className="text-slate-500">Total</div>
                      <div className="font-mono font-black text-sm text-slate-900 dark:text-white">{SIM()}{totalUSD.toFixed(2)}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div className="text-slate-500">Cubierto</div>
                      <div className="font-mono font-black text-sm text-teal-500">{SIM()}{totalCubierto.toFixed(2)}</div>
                    </div>
                    <div className={`p-2 rounded-xl border ${
                      cubierto100
                        ? "bg-teal-500/10 border-teal-400 text-teal-600 dark:text-teal-300"
                        : "bg-amber-500/10 border-amber-400 text-amber-600 dark:text-amber-300"
                    }`}>
                      <div className="text-[9px]">{cubierto100 ? "Cubierto" : "Restante"}</div>
                      <div className="font-mono font-black text-sm">
                        {cubierto100 ? (vueltoMixto > 0.005 ? `Vuelto ${SIM()}${vueltoMixto.toFixed(2)}` : "100% Cubierto") : `${SIM()}${restante.toFixed(2)}`}
                      </div>
                    </div>
                  </div>

                  {/* Lista de pagos registrados */}
                  {pagosMixtos.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pagos registrados:</div>
                      {pagosMixtos.map((p) => {
                        const fmtOrig = p.moneda === "USD" ? `${SIM()}${p.montoOriginal.toFixed(2)} USD` :
                          p.moneda === "VES" ? `Bs.${p.montoOriginal.toFixed(2)}` :
                          `COP ${Math.round(p.montoOriginal).toLocaleString("en-US")}`;
                        return (
                          <div key={p.id} className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-white">{p.metodo.replace(/_/g, " ")}</span>
                              {p.referencia && <span className="text-slate-400 ml-1">(Ref: {p.referencia})</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-600 dark:text-slate-300">{fmtOrig}</span>
                              <span className="font-mono font-black text-teal-500">{SIM()}{p.montoUSD.toFixed(2)}</span>
                              <button type="button" onClick={() => setPagosMixtos(prev => prev.filter(x => x.id !== p.id))} className="text-red-400 hover:text-red-600 font-black cursor-pointer">×</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Formulario Añadir Pago */}
                  {!cubierto100 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">+ Añadir pago:</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {metodosRapidos.map(([id, label, mon]) => (
                          <button key={id} type="button"
                            onClick={() => {
                              setPagoMixtoMetodo(id);
                              setPagoMixtoMoneda(mon);
                              setPagoMixtoMonto(sugerirMonto(mon));
                            }}
                            className={`py-2 px-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center ${
                              pagoMixtoMetodo === id ? "bg-teal-500/20 border-teal-400 text-teal-600 dark:text-teal-300" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-teal-400"
                            }`}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pagoMixtoMonto}
                          onChange={(e) => setPagoMixtoMonto(e.target.value)}
                          placeholder={`Monto en ${pagoMixtoMoneda}`}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-teal-400"
                        />
                        <input
                          type="text"
                          value={pagoMixtoRef}
                          onChange={(e) => setPagoMixtoRef(e.target.value)}
                          placeholder="Ref. (opcional)"
                          className="w-28 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-400"
                        />
                        <button type="button" onClick={agregarPago}
                          className="px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs cursor-pointer">
                          + Agregar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Botón confirmar mixto */}
                  <button
                    disabled={!cubierto100}
                    onClick={() => ejecutarCobro(false)}
                    className={`w-full py-3 rounded-xl text-xs font-black cursor-pointer transition-all ${
                      cubierto100
                        ? "bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-lg"
                        : "bg-slate-300 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {cubierto100 ? "Confirmar Pago Mixto e Imprimir" : `Faltan ${SIM()}${restante.toFixed(2)} por cubrir`}
                  </button>
                </div>
              );
            })()}

            {/* ── Email opcional ── */}
            <div className="pt-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Email del cliente (opcional)</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailClienteModal}
                  onChange={(e) => setEmailClienteModal(e.target.value)}
                  placeholder="cliente@email.com"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-400"
                />
                <label className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                  <input type="checkbox" checked={enviarEmailAlConfirmar} onChange={(e) => setEnviarEmailAlConfirmar(e.target.checked)} className="rounded" />
                  Enviar al confirmar
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL HISTORIAL DETALLADO DE COMPRAS DEL CLIENTE ── */}
      {clienteHistorialModal && (() => {
        const clienteActual = clienteHistorialModal;
        const compras = ventas.filter(
          (v) =>
            v.cliente.id === clienteActual.id ||
            (v.cliente.documento && clienteActual.documento && v.cliente.documento.toUpperCase() === clienteActual.documento.toUpperCase())
        );
        const totalGastado = compras.reduce((acc, v) => acc + (v.total || 0), 0);
        const utilidadTotal = compras.reduce((acc, v) => acc + (v.utilidad || 0), 0);

        return (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setClienteHistorialModal(null)}
          >
            <div
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 cursor-default max-h-[90vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabecera del Cliente */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
                      Historial de Compras: {clienteActual.nombre}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{clienteActual.documento}</span>
                    <span>·</span>
                    <span>Tlf: {clienteActual.telefono || "Sin teléfono"}</span>
                    {clienteActual.saldoPendiente > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-amber-500 font-bold">Deuda: {SIM()}{clienteActual.saldoPendiente.toFixed(2)}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setClienteHistorialModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <IconClose size={16} />
                </button>
              </div>

              {/* Resumen KPIs del Cliente */}
              <div className="grid grid-cols-3 gap-3 flex-shrink-0">
                <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Compras Realizadas</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {compras.length} {compras.length === 1 ? "ticket" : "tickets"}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-center">
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 uppercase font-bold block">Total Consumido</span>
                  <span className="text-base font-black text-teal-700 dark:text-teal-300 font-mono">
                    {SIM()}{totalGastado.toFixed(2)}
                  </span>
                  <span className={`text-[9px] text-slate-400 block font-mono ${modoEuro() ? "hidden" : ""}`}>Bs. {(totalGastado * tasaActivaBs).toFixed(2)}</span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold block">Utilidad Aportada</span>
                  <span className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">
                    +{SIM()}{utilidadTotal.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-400 block">
                    {totalGastado > 0 ? `Margen: ${((utilidadTotal / totalGastado) * 100).toFixed(1)}%` : "Margen 0%"}
                  </span>
                </div>
              </div>

              {/* Lista Detallada de Tickets y Productos */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {compras.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <IconReceipt size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-sm font-bold">Este cliente aún no registra compras.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Al realizar una venta en mostrador seleccionando o tipeando este cliente, quedará guardada aquí con todos sus productos.
                    </p>
                  </div>
                ) : (
                  compras.map((v) => (
                    <div
                      key={v.id}
                      className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-300/70 dark:border-slate-700/60 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-slate-900 dark:text-white">{v.numero}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{v.fecha}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                            v.esCredito
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30"
                              : "bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/30"
                          }`}>
                            {v.metodoPago}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="font-mono font-black text-sm text-teal-600 dark:text-teal-400">{SIM()}{v.total.toFixed(2)}</span>
                            <span className={`text-[10px] text-slate-400 font-mono block ${modoEuro() ? "hidden" : ""}`}>Bs. {v.totalBs.toFixed(2)}</span>
                          </div>
                          {puedeDevolver && v.numero.startsWith("TKT-") && (
                            <button
                              onClick={() => { setTicketADevolver(v.numero); setClienteHistorialModal(null); setTab("cierre"); setSubCierre("devoluciones"); }}
                              className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-800/50 text-[10px] font-bold text-rose-700 dark:text-rose-300 cursor-pointer transition-colors"
                              title="Devolver productos de esta venta"
                            >
                              Devolver
                            </button>
                          )}
                          <button
                            onClick={() => imprimirTicketComercio(v, nombreLocal, tasaActivaBs, tasaCop)}
                            className="px-2.5 py-1 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-[10px] font-bold text-slate-800 dark:text-white flex items-center gap-1 cursor-pointer transition-colors"
                            title="Re-imprimir ticket 80mm"
                          >
                            <IconReceipt size={12} />
                            <span>Ticket</span>
                          </button>
                          <button
                            onClick={() => descargarNotaEntregaOFactura(v, nombreLocal, tasaActivaBs, tasaCop)}
                            className="px-2.5 py-1 rounded-xl bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:hover:bg-indigo-800/60 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Descargar Nota de Entrega PDF (SENIAT)"
                          >
                            <IconDownload size={12} />
                            <span>Nota PDF</span>
                          </button>
                          {v.emailCliente && (
                            <button
                              onClick={() => {
                                enviarNotaEntregaPorCorreo(v, nombreLocal, tasaActivaBs, tasaCop);
                                mostrarToast("PDF descargado y correo abierto", "success");
                              }}
                              className="px-2.5 py-1 rounded-xl bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 text-[10px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                              title="Enviar Nota de Entrega por correo"
                            >
                              <IconMail size={11} /><span>Correo</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Desglose de Productos en este Ticket */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Productos comprados ({v.lineas.length}):
                        </div>
                        <div className="space-y-1">
                          {v.lineas.map((item, idx) => {
                            const subtotal = item.precio * item.cantidad;
                            const costoLinea = (item.costo || 0) * item.cantidad;
                            const utilidadLinea = subtotal - costoLinea;

                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800"
                              >
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="font-bold text-slate-900 dark:text-white truncate">
                                    <span className="text-teal-500 font-mono mr-1.5">{item.cantidad}x</span>
                                    {item.nombre}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    Cod: {item.codigo} · Unit: ${item.precio.toFixed(2)} {item.costo ? `· Costo: ${item.costo.toFixed(2)}` : ""}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="font-mono font-bold text-slate-900 dark:text-white">{SIM()}{subtotal.toFixed(2)}</div>
                                  {utilidadLinea > 0 && (
                                    <div className="text-[9px] text-emerald-500 font-mono">Utilidad: +{SIM()}{utilidadLinea.toFixed(2)}</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Resumen Financiero del Ticket */}
                      {v.costoTotal != null && v.utilidad != null && (
                        <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>Costo mercadería: {SIM()}{v.costoTotal.toFixed(2)}</span>
                          <span className="text-emerald-500 font-bold">Utilidad neta ticket: +{SIM()}{v.utilidad.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Pie con botón cerrar */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end flex-shrink-0">
                <button
                  onClick={() => setClienteHistorialModal(null)}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs cursor-pointer shadow-md"
                >
                  Cerrar Historial
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL RECIBO FINAL CON BOTÓN DE IMPRESIÓN TÉRMICA ── */}
      {ventaReciente && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={() => setVentaReciente(null)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 text-center cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
              <IconCheckCircle size={28} />
            </div>
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">¡Venta Exitosa!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Comprobante N° {ventaReciente.numero}</p>

            <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-300/60 dark:border-slate-700/50 text-xs space-y-1 font-mono text-left">
              <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                <span>Total Pagado:</span>
                <span className="text-teal-400">{SIM()}{ventaReciente.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span className={modoEuro() ? "hidden" : ""}>Bolívares:</span>
                <span className={modoEuro() ? "hidden" : ""}>Bs. {ventaReciente.totalBs.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Método:</span>
                <span className={ventaReciente.esCredito ? "text-amber-500 font-bold" : ""}>
                  {ventaReciente.esCredito ? "VENTA A CRÉDITO (CXC)" : ventaReciente.metodoPago}
                </span>
              </div>
              {ventaReciente.esCredito && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 font-sans space-y-1">
                  <div className="font-bold">Cargado a Cuentas por Cobrar:</div>
                  <div>Cliente: {ventaReciente.cliente.nombre} ({ventaReciente.cliente.documento})</div>
                  <div className="font-mono font-bold text-amber-600 dark:text-amber-400">Saldo por cobrar: {SIM()}{ventaReciente.total.toFixed(2)} USD</div>
                </div>
              )}
              {ventaReciente.vuelto != null && ventaReciente.vuelto > 0 && (
                <div className="flex justify-between text-teal-300 font-bold border-t border-slate-300 dark:border-slate-700 pt-1">
                  <span>Vuelto:</span>
                  <span>{ventaReciente.vuelto.toFixed(2)} {ventaReciente.monedaVuelto}</span>
                </div>
              )}
            </div>

            {/* Sección Email en modal ventaReciente */}
            {ventaReciente.emailCliente && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{ventaReciente.emailCliente}</span>
                <button
                  onClick={() => {
                    const v = ventaReciente!;
                    enviarNotaEntregaPorCorreo(v, nombreLocal, tasaActivaBs, tasaCop);
                    mostrarToast("PDF descargado y cliente de correo abierto", "success");
                  }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-black text-xs cursor-pointer"
                >
                  Enviar por Correo
                </button>
              </div>
            )}

            <div className="flex gap-2 pt-2 flex-wrap">
              <button
                onClick={() => imprimirTicketComercio(ventaReciente, nombreLocal, tasaActivaBs, tasaCop)}
                className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
              >
                Imprimir Ticket 80mm
              </button>
              <button
                onClick={() => descargarNotaEntregaOFactura(ventaReciente, nombreLocal, tasaActivaBs, tasaCop)}
                className="flex-1 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs cursor-pointer shadow-lg"
              >
                Nota de Entrega PDF
              </button>
              {ventaReciente.esCredito && (
                <button
                  onClick={() => {
                    setVentaReciente(null);
                    setSubTabAdmin("cxc_cxp");
                    setTab("administracion");
                  }}
                  className="px-3 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md"
                  title="Ver esta cuenta en el Panel Administrativo"
                >
                  Ver en CxC
                </button>
              )}
              <button
                onClick={() => setVentaReciente(null)}
                className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AGREGAR PRODUCTO AL INVENTARIO ── */}
      {modalNuevoProducto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={() => setModalNuevoProducto(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Nuevo Producto ({esFarmacia ? "FARMACIA" : "COMERCIO"})</h3>
              <button onClick={() => setModalNuevoProducto(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"><IconClose size={18} /></button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const nombre = String(fd.get("nombre"));
                const codigo = String(fd.get("codigo") || `COD-${Date.now().toString().slice(-4)}`);
                const precio = Number(fd.get("precio")) || 1;
                // Sin fallback a un número inventado: si el dueño no escribe costo, se
                // guarda 0 (= "sin costo real todavía"), no un $0.50 fantasma que hacía
                // que "Sin costo registrado" y el margen mintieran mostrando datos falsos
                // como si fueran reales.
                const costo = Number(fd.get("costo")) || 0;
                const stock = Number(fd.get("stock")) || 10;
                const unidadMedida = String(fd.get("unidadMedida") || "UNIDAD");
                const codigoOem = String(fd.get("codigoOem") || "") || undefined;
                const precioMayorista = fd.get("precioMayorista") ? Number(fd.get("precioMayorista")) : undefined;
                const cantidadMinimaMayorista = fd.get("cantidadMinimaMayorista") ? Number(fd.get("cantidadMinimaMayorista")) : undefined;
                const fechaVencimiento = String(fd.get("fechaVencimiento") || "") || undefined;
                const exentoIva = fd.get("exentoIva") === "on";

                let backendId: number | undefined = undefined;

                if (user?.tenantId) {
                  try {
                    const guardado = await crearRepuesto(user.tenantId, {
                      codigoSku: codigo,
                      codigoOriginalOem: codigoOem || undefined,
                      descripcion: nombre,
                      precioVenta: precio,
                      costoUnitario: costo,
                      stockActual: stock,
                      unidadBase: unidadMedida,
                      precioMayorista,
                      cantidadMinimaMayorista,
                      fechaVencimiento,
                      exentoIva,
                    });
                    backendId = guardado.id;
                    const ubicacionInicial = String(fd.get("ubicacion") || "").trim();
                    if (ubicacionInicial) {
                      // La ubicación vive por almacén en el backend — se guarda en el principal.
                      try {
                        const principal = (await listarAlmacenes(user.tenantId)).find((a) => a.esPrincipal);
                        if (principal) await fijarUbicacionAlmacen(user.tenantId, { repuestoId: guardado.id, almacenId: principal.id, ubicacion: ubicacionInicial });
                      } catch {
                        mostrarToast("Artículo creado, pero no se pudo guardar su ubicación. Agrégala desde 'Almacenes'.", "info");
                      }
                    }
                    mostrarToast("Artículo registrado.", "success");
                  } catch (err: any) {
                    // Antes quedaba "registrado localmente" y desaparecía al recargar: no se finge el guardado.
                    mostrarToast(err?.message ? `No se guardó el artículo: ${err.message}` : "No se guardó el artículo. Revisa la conexión e intenta de nuevo.", "error");
                    return;
                  }
                }

                const nuevo: ProductoComercio = {
                  id: backendId ? `rep-${backendId}` : String(Date.now()),
                  backendId,
                  codigo,
                  codigoOem,
                  nombre,
                  categoria: String(fd.get("categoria") || (esComercio ? "Repuestos & Ferretería" : "General")),
                  rubro: perfilActivo,
                  precio,
                  costo,
                  stock,
                  exentoIva,
                  stockMinimo: Number(fd.get("stockMinimo")) || 5,
                  principioActivo: String(fd.get("principioActivo") || "") || undefined,
                  unidadMedida,
                  ubicacion: String(fd.get("ubicacion") || "") || undefined,
                  precioMayorista,
                  cantidadMinimaMayorista,
                  fechaVencimiento,
                };

                setProductos((prev) => [nuevo, ...prev]);
                setModalNuevoProducto(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Nombre del Producto / Artículo</label>
                <input required name="nombre" placeholder="Ej. Martillo de Uña 16oz / Bujía Iridium FR7DC+" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Código SKU / Referencia</label>
                  <input name="codigo" placeholder="Ej. TORN-38 / MAR-16OZ" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Categoría</label>
                  <input name="categoria" placeholder="Ej. Herramientas / Repuestos / Plomería" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Precio Detal ($)</label>
                  <input required name="precio" type="number" step="0.01" placeholder="0.00" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Costo de Compra ($)</label>
                  <input name="costo" type="number" step="0.01" placeholder="0.00" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Stock Inicial</label>
                  <input required name="stock" type="number" placeholder="10" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
                </div>
              </div>

              {esFarmacia && (
                <div className="p-3 bg-slate-100/60 dark:bg-slate-800/50 rounded-xl border border-slate-300 dark:border-slate-700 space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-400 block mb-1">Principio Activo</label>
                    <input name="principioActivo" placeholder="Ej. Paracetamol 500mg" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs" />
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5">
                    <IconWarning size={12} className="flex-shrink-0" />
                    <span>Trazabilidad de Lote y Vencimiento (FEFO) se gestionará en el módulo especializado de Farmacia.</span>
                  </div>
                </div>
              )}

              {esComercio && (
                <div className="space-y-3 p-3.5 bg-slate-100/60 dark:bg-slate-800/50 rounded-2xl border border-slate-300 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-teal-400 block mb-1">Unidad de Medida Base</label>
                      <select name="unidadMedida" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                        <option value="UNIDAD">Pieza / Unidad (UNIDAD)</option>
                        <option value="METRO">Metro (METRO)</option>
                        <option value="KILOGRAMO">Kilogramo (KILOGRAMO)</option>
                        <option value="SACO">Saco / Bulto (SACO)</option>
                        <option value="GALON">Galón / Litro (GALON)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-teal-400 block mb-1">Código de Fabricante / OEM (Opcional)</label>
                      <input name="codigoOem" placeholder="Ej. 04465-0K090 — solo si aplica a tu rubro" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-emerald-400 block mb-1">Precio Mayorista ($) (Opcional)</label>
                      <input name="precioMayorista" type="number" step="0.01" placeholder="Ej. 1.80" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-emerald-400 block mb-1">Cant. Mínima Mayorista</label>
                      <input name="cantidadMinimaMayorista" type="number" step="1" placeholder="Ej. 10" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
                    </div>
                  </div>
                  {!modoEuro() && (
                    <label className="flex items-start gap-2 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-300/60 dark:border-slate-700/60 cursor-pointer">
                      <input name="exentoIva" type="checkbox" className="w-4 h-4 mt-0.5 accent-teal-600 cursor-pointer" />
                      <span>
                        <span className="block text-xs font-bold text-slate-900 dark:text-white">Exento de IVA</span>
                        <span className="block text-[10.5px] text-slate-500 dark:text-slate-400">Alimentos de la cesta básica, medicinas y otros que no pagan IVA. Solo cuenta si tu negocio cobra IVA.</span>
                      </span>
                    </label>
                  )}
                  <div>
                    <label className="text-[10px] font-bold text-teal-400 block mb-1">Ubicación en Almacén / Estante</label>
                    <input name="ubicacion" placeholder="Ej. Pasillo 3 - Gaveta 4" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-amber-500 block mb-1">Fecha de Vencimiento (Opcional)</label>
                    <input name="fechaVencimiento" type="date" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Solo si el artículo caduca (pinturas, adhesivos, químicos). Te avisaremos en Inventario cuando se acerque.</p>
                  </div>
                </div>
              )}

              <div className="pt-3 flex gap-2">
                <button type="button" onClick={() => setModalNuevoProducto(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold cursor-pointer">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-black cursor-pointer hover:bg-teal-400 shadow-md">Guardar Artículo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL REGISTRAR ABONO A CRÉDITO ── */}
      {clienteAbonoSel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={() => setClienteAbonoSel(null)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Registrar Abono a Crédito</h3>
              <button onClick={() => setClienteAbonoSel(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white cursor-pointer"><IconClose size={18} /></button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-300/70 dark:border-slate-700/60 space-y-1">
              <div className="text-sm font-bold text-slate-900 dark:text-white">{clienteAbonoSel.nombre}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">Doc: {clienteAbonoSel.documento}</div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-300/60 dark:border-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400">Deuda Total:</span>
                <span className="font-mono text-base font-black text-amber-300">{SIM()}{clienteAbonoSel.saldoPendiente.toFixed(2)} USD</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Monto a Abonar ({CODIGO()})</label>
              <div className="flex gap-2">
                <input
                  type="number" step="0.01" max={clienteAbonoSel.saldoPendiente}
                  value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white text-sm font-bold"
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
              <div className={`text-[10px] font-mono text-slate-500 dark:text-slate-400 ${modoEuro() ? "hidden" : ""}`}>
                ≈ Bs. {((Number(montoAbono) || 0) * tasaActivaBs).toFixed(2)} | COP {SIM()}{((Number(montoAbono) || 0) * tasaCop).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Forma de Pago del Abono</label>
              <select
                value={metodoAbono}
                onChange={(e) => setMetodoAbono(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
              >
                {!modoEuro() && <option value="PAGO_MOVIL">Pago Móvil (Bolívares)</option>}
                <option value="EFECTIVO_USD">{modoEuro() ? "Efectivo (EUR)" : "Efectivo Divisas (USD)"}</option>
                <option value="PUNTO_VENTA">Punto de Venta (Débito)</option>
                {!modoEuro() && <option value="ZELLE">Zelle / Binance USDT</option>}
                {!modoEuro() && <option value="COP_EFECTIVO">Pesos Colombianos (COP)</option>}
              </select>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setClienteAbonoSel(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={abonandoCliente}
                onClick={() => {
                  const val = parseFloat(montoAbono);
                  if (isNaN(val) || val <= 0) { avisar("Indica un monto válido.", "error"); return; }
                  if (val > clienteAbonoSel.saldoPendiente + 0.005) { avisar("El abono no puede ser mayor que la deuda.", "error"); return; }
                  registrarAbonoCliente(clienteAbonoSel, val);
                }}
                className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg disabled:opacity-60"
              >
                {abonandoCliente ? "Registrando…" : "Confirmar Abono"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL KÁRDEX AUDITABLE DE COMERCIO ── */}
      {kardexModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={() => setKardexModalItem(null)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold uppercase">Kárdex de Movimientos</span>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white mt-1">{kardexModalItem.nombre}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">SKU: {kardexModalItem.codigo} · Stock Actual: {kardexModalItem.stock} {kardexModalItem.unidadMedida || 'und'}</p>
              </div>
              <button onClick={() => setKardexModalItem(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white cursor-pointer"><IconClose size={18} /></button>
            </div>

            {kardexCargando ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">Cargando movimientos de Kárdex...</div>
            ) : kardexMovimientos.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                No hay movimientos registrados en base de datos para este ítem todavía.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Fecha</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5 text-right">Cant.</th>
                      <th className="p-2.5 text-right">Stock Ant ➔ Nvo</th>
                      <th className="p-2.5">Motivo / Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                    {kardexMovimientos.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 text-[11px] text-slate-500 dark:text-slate-400">{new Date(m.fechaRegistro).toLocaleString()}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            m.tipo === "VENTA" ? "bg-emerald-500/20 text-emerald-300" :
                            m.tipo === "COMPRA" ? "bg-cyan-500/20 text-cyan-300" :
                            "bg-amber-500/20 text-amber-300"
                          }`}>
                            {m.tipo}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">{m.cantidad}</td>
                        <td className="p-2.5 text-right text-slate-500 dark:text-slate-400">{m.stockAnterior} ➔ <span className="text-teal-400 font-bold">{m.stockNuevo}</span></td>
                        <td className="p-2.5 font-sans text-xs text-slate-500 dark:text-slate-400">{m.motivo || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="pt-2 flex justify-end">
              <button onClick={() => setKardexModalItem(null)} className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                Cerrar Kárdex
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR PRODUCTO ── */}
      {editarModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={() => setEditarModalItem(null)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 cursor-default max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Editar Producto</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">SKU: {editarModalItem.codigo}</p>
              </div>
              <button onClick={() => setEditarModalItem(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white cursor-pointer"><IconClose size={18} /></button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editarModalItem.backendId || !user?.tenantId) return;
                const fd = new FormData(e.currentTarget);
                const nombre = String(fd.get("nombre") || editarModalItem.nombre);
                const precio = Number(fd.get("precio")) || editarModalItem.precio;
                const unidadMedida = String(fd.get("unidadMedida") || editarModalItem.unidadMedida || "UNIDAD");
                const codigoOem = String(fd.get("codigoOem") || "") || undefined;
                const stockMinimo = Number(fd.get("stockMinimo")) || editarModalItem.stockMinimo;
                const precioMayorista = fd.get("precioMayorista") ? Number(fd.get("precioMayorista")) : undefined;
                const cantidadMinimaMayorista = fd.get("cantidadMinimaMayorista") ? Number(fd.get("cantidadMinimaMayorista")) : undefined;
                const categoria = String(fd.get("categoria") || "").trim() || undefined;
                const visible = fd.get("visible") === "on";
                const ordenVisualizacion = Number(fd.get("ordenVisualizacion")) || 0;
                const descripcionLarga = String(fd.get("descripcionLarga") || "").trim();
                // "" (vacío) SÍ se manda — a diferencia de los demás campos opcionales,
                // acá vacío es una elección real ("borrar la foto/descripción"), no
                // "no toqué este campo". Ver RepuestoItemController.actualizar: cualquier
                // valor no-null se aplica, incluida la cadena vacía.
                const imagenBase64 = editarImagenBase64 ?? "";
                const grupoVariante = String(fd.get("grupoVariante") || "").trim();
                const atributoVariante = String(fd.get("atributoVariante") || "").trim();
                const colorVariante = String(fd.get("colorVariante") || "").trim();
                const fechaVencimiento = String(fd.get("fechaVencimiento") || "") || undefined;
                // En modo euro la casilla no se muestra: no se manda y el servidor conserva lo que había.
                const exentoIva = modoEuro() ? undefined : fd.get("exentoIva") === "on";

                setGuardandoEdicion(true);
                try {
                  await actualizarRepuesto(editarModalItem.backendId, {
                    descripcion: nombre,
                    precioVenta: precio,
                    unidadBase: unidadMedida,
                    codigoOriginalOem: codigoOem,
                    stockMinimo,
                    precioMayorista,
                    cantidadMinimaMayorista,
                    categoria,
                    visible,
                    ordenVisualizacion,
                    descripcionLarga,
                    imagenBase64,
                    grupoVariante,
                    atributoVariante,
                    colorVariante,
                    fechaVencimiento,
                    exentoIva,
                  });
                  setProductos((prev) => prev.map((p) => p.id === editarModalItem.id ? {
                    ...p, nombre, precio, unidadMedida, codigoOem, stockMinimo, precioMayorista, cantidadMinimaMayorista,
                    categoria: categoria || "General", visible, ordenVisualizacion, descripcionLarga, imagenBase64,
                    grupoVariante: grupoVariante || undefined, atributoVariante: atributoVariante || undefined,
                    colorVariante: colorVariante || undefined,
                    fechaVencimiento: fechaVencimiento || p.fechaVencimiento,
                    exentoIva: exentoIva ?? p.exentoIva,
                  } : p));
                  const ubicacionNueva = String(fd.get("ubicacion") ?? "").trim();
                  if (ubicacionEdicion && fd.has("ubicacion") && ubicacionNueva !== ubicacionEdicion.valor) {
                    try {
                      await fijarUbicacionAlmacen(user.tenantId, { repuestoId: editarModalItem.backendId, almacenId: ubicacionEdicion.almacenId, ubicacion: ubicacionNueva });
                      cargarRepuestosBackend();
                    } catch (err: any) {
                      mostrarToast(`Producto actualizado, pero la ubicación no se guardó: ${err?.message || "error del servidor"}`, "error");
                      setEditarModalItem(null);
                      return;
                    }
                  }
                  mostrarToast("Producto actualizado correctamente.", "success");
                  setEditarModalItem(null);
                } catch (err: any) {
                  mostrarToast(err?.message || "No se pudo actualizar el producto.", "error");
                } finally {
                  setGuardandoEdicion(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              {/* Dos pestañas en vez de un formulario larguísimo — todos los campos siguen
                  montados en el DOM (solo se ocultan con CSS), así que cambiar de pestaña
                  nunca pierde lo que ya escribiste en la otra. */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 w-fit sticky top-0 z-10">
                <button
                  type="button"
                  onClick={() => setEditarTab("datos")}
                  className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    editarTab === "datos"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Datos del Producto
                </button>
                {esComercio && (
                  <button
                    type="button"
                    onClick={() => setEditarTab("catalogo")}
                    className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      editarTab === "catalogo"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Catálogo Público
                  </button>
                )}
              </div>

              <div className={editarTab === "datos" ? "space-y-3" : "hidden"}>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Nombre del Producto</label>
                  <input required name="nombre" defaultValue={editarModalItem.nombre} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Precio Detal ($)</label>
                    <input required name="precio" type="number" step="0.01" defaultValue={editarModalItem.precio} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Stock Mínimo (alerta)</label>
                    <input name="stockMinimo" type="number" defaultValue={editarModalItem.stockMinimo} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
                  </div>
                </div>
                {esComercio && (
                  <div className="space-y-3 p-3.5 bg-slate-100/60 dark:bg-slate-800/50 rounded-2xl border border-slate-300 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-teal-400 block mb-1">Unidad de Medida Base</label>
                        <select name="unidadMedida" defaultValue={editarModalItem.unidadMedida || "UNIDAD"} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                          <option value="UNIDAD">Pieza / Unidad (UNIDAD)</option>
                          <option value="METRO">Metro (METRO)</option>
                          <option value="KILOGRAMO">Kilogramo (KILOGRAMO)</option>
                          <option value="SACO">Saco / Bulto (SACO)</option>
                          <option value="GALON">Galón / Litro (GALON)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-teal-400 block mb-1">Código de Fabricante / OEM (Opcional)</label>
                        <input name="codigoOem" defaultValue={editarModalItem.codigoOem || ""} placeholder="Solo si aplica a tu rubro" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-emerald-400 block mb-1">Precio Mayorista ($) (Opcional)</label>
                        <input name="precioMayorista" type="number" step="0.01" defaultValue={editarModalItem.precioMayorista ?? ""} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-emerald-400 block mb-1">Cant. Mínima Mayorista</label>
                        <input name="cantidadMinimaMayorista" type="number" step="1" defaultValue={editarModalItem.cantidadMinimaMayorista ?? ""} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
                      </div>
                    </div>
                  {!modoEuro() && (
                    <label className="flex items-start gap-2 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-300/60 dark:border-slate-700/60 cursor-pointer">
                      <input name="exentoIva" type="checkbox" defaultChecked={!!editarModalItem.exentoIva} className="w-4 h-4 mt-0.5 accent-teal-600 cursor-pointer" />
                      <span>
                        <span className="block text-xs font-bold text-slate-900 dark:text-white">Exento de IVA</span>
                        <span className="block text-[10.5px] text-slate-500 dark:text-slate-400">Alimentos de la cesta básica, medicinas y otros que no pagan IVA. Solo cuenta si tu negocio cobra IVA.</span>
                      </span>
                    </label>
                  )}
                    {ubicacionEdicion && (
                      <div>
                        <label className="text-[10px] font-bold text-teal-400 block mb-1">Ubicación en Almacén Principal</label>
                        <input name="ubicacion" key={`ub-${ubicacionEdicion.almacenId}-${ubicacionEdicion.valor}`} defaultValue={ubicacionEdicion.valor} maxLength={120} placeholder="Ej. Pasillo 3, Estante B" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">La de otros almacenes se cambia desde el botón "Almacenes".</p>
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] font-bold text-amber-500 block mb-1">Fecha de Vencimiento (Opcional)</label>
                      <input name="fechaVencimiento" type="date" defaultValue={editarModalItem.fechaVencimiento || ""} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Solo si el artículo caduca. Te avisaremos en Inventario cuando se acerque.</p>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  El stock actual y el costo no se editan aquí — se actualizan solos a través de compras, ventas y ajustes (Kárdex), para mantener la auditoría.
                </p>
              </div>

              {esComercio && (
                <div className={editarTab === "catalogo" ? "space-y-3 p-3.5 bg-slate-100/60 dark:bg-slate-800/50 rounded-2xl border border-slate-300 dark:border-slate-700" : "hidden"}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Categoría</label>
                      <input
                        name="categoria"
                        placeholder="Ej. Celulares, Perfumes, Zapatos…"
                        defaultValue={editarModalItem.categoria === "General" ? "" : editarModalItem.categoria}
                        onChange={(e) => setCategoriaEnEdicion(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Orden (menor = primero)</label>
                      <input name="ordenVisualizacion" type="number" step="1" defaultValue={editarModalItem.ordenVisualizacion ?? 0} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="visible" defaultChecked={editarModalItem.visible !== false} className="w-4 h-4 rounded accent-teal-500" />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Visible en el catálogo público (desmarca para ocultarlo sin borrarlo del inventario)
                    </span>
                  </label>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      Descripción para el cliente (distinta del nombre)
                    </label>
                    <textarea
                      name="descripcionLarga"
                      rows={3}
                      placeholder="Ej. Martillo de uña forjado en acero, mango antideslizante, garantía de 6 meses…"
                      defaultValue={editarModalItem.descripcionLarga || ""}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Foto del producto</label>
                    <div className="flex items-center gap-3">
                      {editarImagenBase64 ? (
                        <img src={editarImagenBase64} alt="" className="w-16 h-16 rounded-xl object-cover border border-slate-300 dark:border-slate-700 shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                          <IconBox size={20} />
                        </div>
                      )}
                      <div className="flex-1 space-y-1.5">
                        <input type="file" accept="image/*" onChange={handleEditarFoto} className="w-full text-[11px] text-slate-600 dark:text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-teal-500 file:text-slate-950 file:font-bold file:text-[11px] file:cursor-pointer cursor-pointer" />
                        {editarImagenBase64 && (
                          <button type="button" onClick={() => setEditarImagenBase64("")} className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer">
                            Quitar foto
                          </button>
                        )}
                        <p className="text-[9px] text-slate-400">JPG o PNG, máx. 2MB.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-300 dark:border-slate-700 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Variantes (tallas, colores) — opcional
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      El inventario sigue siendo un producto por talla/color, cada uno con su propio stock. Esto solo los junta en una sola tarjeta del catálogo público con selector — primero modelo (Grupo), después Color, después Talla, como en cualquier tienda de ropa/calzado.
                    </p>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">1. Modelo / Grupo (igual en todas las variantes)</label>
                      <input
                        name="grupoVariante"
                        placeholder="Ej. zapato-nike-air-max"
                        defaultValue={editarModalItem.grupoVariante || ""}
                        className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">2. Color (opcional)</label>
                        <input
                          name="colorVariante"
                          placeholder="Ej. Rojo, Azul…"
                          defaultValue={editarModalItem.colorVariante || ""}
                          className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                          3. {sugerirAtributoPorCategoria(categoriaEnEdicion).etiqueta}
                        </label>
                        <input
                          name="atributoVariante"
                          placeholder={sugerirAtributoPorCategoria(categoriaEnEdicion).placeholder}
                          defaultValue={editarModalItem.atributoVariante || ""}
                          className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setEditarModalItem(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={guardandoEdicion} className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-60">
                  {guardandoEdicion ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL AJUSTAR STOCK (CORRECCIÓN POR CONTEO FÍSICO) ── */}
      {almacenModalItem && user?.tenantId && (
        <ModalAlmacenesComercio
          tenantId={user.tenantId}
          producto={almacenModalItem}
          onClose={() => setAlmacenModalItem(null)}
          onCambio={cargarRepuestosBackend}
          mostrarToast={mostrarToast}
        />
      )}

      {ajustarStockModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={() => setAjustarStockModalItem(null)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 dark:text-amber-300 font-bold uppercase">Ajuste de Inventario</span>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white mt-1">{ajustarStockModalItem.nombre}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Stock en sistema: {ajustarStockModalItem.stock} {ajustarStockModalItem.unidadMedida || 'und'}</p>
              </div>
              <button onClick={() => setAjustarStockModalItem(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white cursor-pointer"><IconClose size={18} /></button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!ajustarStockModalItem.backendId || !user?.tenantId) return;
                const fd = new FormData(e.currentTarget);
                const stockReal = Number(fd.get("stockReal"));
                const motivo = String(fd.get("motivo") || "");
                if (Number.isNaN(stockReal) || stockReal < 0) {
                  mostrarToast("Ingresá un stock real válido.", "error");
                  return;
                }
                setGuardandoAjuste(true);
                try {
                  const actualizado = await ajustarStockRepuesto(ajustarStockModalItem.backendId, user.tenantId, { stockReal, motivo });
                  setProductos((prev) => prev.map((p) => p.id === ajustarStockModalItem.id ? { ...p, stock: actualizado.stockActual } : p));
                  mostrarToast("Stock ajustado y registrado en el Kárdex.", "success");
                  setAjustarStockModalItem(null);
                } catch (err: any) {
                  mostrarToast(err?.message || "No se pudo ajustar el stock.", "error");
                } finally {
                  setGuardandoAjuste(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Stock Real Contado</label>
                <input required name="stockReal" type="number" step="0.01" defaultValue={ajustarStockModalItem.stock} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Motivo del Ajuste</label>
                <input name="motivo" placeholder="Ej. Conteo físico mensual, mercancía dañada..." className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                El sistema calcula la diferencia solo y la deja registrada en el Kárdex para auditar después. No genera ingreso ni egreso de caja.
              </p>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setAjustarStockModalItem(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={guardandoAjuste} className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-60">
                  {guardandoAjuste ? "Guardando..." : "Confirmar Ajuste"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL PRESENTACIONES FRACCIONADAS (CAJA, METRO, KILO, SACO) ── */}
      {presentacionesModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={() => setPresentacionesModalItem(null)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase">Presentaciones de Venta</span>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white mt-1">{presentacionesModalItem.nombre}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Unidad Base: <strong className="text-teal-300">{presentacionesModalItem.unidadMedida || 'UNIDAD'}</strong> (Stock Base: {presentacionesModalItem.stock})</p>
              </div>
              <button onClick={() => setPresentacionesModalItem(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white cursor-pointer"><IconClose size={18} /></button>
            </div>

            {/* Listado de presentaciones existentes */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Presentaciones Activas:</div>
              {presentacionesCargando ? (
                <div className="py-4 text-center text-slate-500 dark:text-slate-400 text-xs">Cargando presentaciones...</div>
              ) : presentacionesLista.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-300/60 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 text-xs">
                  No hay presentaciones configuradas aún. Por defecto se vende en su unidad base.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {presentacionesLista.map((pres) => (
                    <div key={pres.id} className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">{pres.nombrePresentacion}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Factor: {pres.factorConversion} {presentacionesModalItem.unidadMedida || 'u'} base</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-xs text-teal-400">{SIM()}{pres.precioVenta.toFixed(2)}</div>
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
              className="p-3.5 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-300/70 dark:border-slate-700/60 space-y-2 text-xs"
            >
              <div className="font-bold text-slate-600 dark:text-slate-300 text-[11px]">Crear Nueva Presentación Fraccionada:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 block mb-0.5">Nombre (ej. Caja 100u, Rollo 50m)</label>
                  <input required name="nombrePresentacion" placeholder="Caja 100u" className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 block mb-0.5">Factor Conv. (u base)</label>
                  <input required name="factorConversion" type="number" step="0.01" placeholder="100" className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 block mb-0.5">Precio Venta ($)</label>
                  <input required name="precioVenta" type="number" step="0.01" placeholder="18.50" className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs" />
                </div>
              </div>
              <button type="submit" className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer shadow">
                + Guardar Presentación
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL REGISTRO DE FACTURA DE COMPRA A PROVEEDOR ── */}
      {modalCompraProveedor && (
        <ModalCompraProveedorComercio
          tenantId={user?.tenantId || 1}
          productos={productos.filter((p) => p.rubro === perfilActivo)}
          proveedores={proveedoresRepuesto}
          onClose={() => setModalCompraProveedor(false)}
          onCompraExitosa={() => {
            setModalCompraProveedor(false);
            cargarRepuestosBackend();
            cargarComprasRepuesto();
            cargarCuentas();
            mostrarToast("Factura de compra procesada. Stock y costo promedio actualizados en Kárdex.", "success");
          }}
          onNuevoProveedor={(nuevo) => setProveedoresRepuesto((prev) => [...prev, nuevo])}
        />
      )}

      {/* ── MODAL IMPORTACIÓN MASIVA DE INVENTARIO (Excel/CSV) ── */}
      {modalImportarInventario && user?.tenantId && (
        <ModalImportarInventarioComercio
          tenantId={user.tenantId}
          onClose={() => setModalImportarInventario(false)}
          onImportado={() => cargarRepuestosBackend()}
        />
      )}

      {/* ── MODAL ALTA DE PROVEEDOR (pestaña Proveedores) ── */}
      {modalNuevoProveedor && (
        <ModalFormularioProveedorComercio
          tenantId={user?.tenantId || 1}
          onClose={() => setModalNuevoProveedor(false)}
          onGuardado={(nuevo) => {
            setProveedoresRepuesto((prev) => [...prev, nuevo]);
            setModalNuevoProveedor(false);
            mostrarToast("Proveedor registrado correctamente.", "success");
          }}
        />
      )}

      {/* ── MODAL FICHA DE PROVEEDOR: datos + historial de compras + edición ── */}
      {proveedorDetalle && (
        <ModalDetalleProveedorComercio
          proveedor={proveedorDetalle}
          compras={(comprasRepuesto || []).filter((c) => c.proveedor?.id === proveedorDetalle.id)}
          onClose={() => setProveedorDetalle(null)}
          onActualizado={(actualizado) => {
            setProveedoresRepuesto((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
            setProveedorDetalle(actualizado);
            mostrarToast("Proveedor actualizado.", "success");
          }}
        />
      )}

      {/* Toast flotante */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 ${
            toast.tipo === "success" ? "bg-teal-950/95 border-teal-500 text-teal-200" :
            toast.tipo === "error" ? "bg-red-950/95 border-red-500 text-red-200" :
            "bg-white/95 dark:bg-slate-900/95 border-cyan-500 text-cyan-200"
          }`}>
            {toast.tipo === "success" ? <IconCheckCircle size={15} className="flex-shrink-0" /> :
             toast.tipo === "error" ? <IconClose size={15} className="flex-shrink-0" /> :
             <IconWarning size={15} className="flex-shrink-0" />}
            <span>{toast.mensaje}</span>
          </div>
        </div>
      )}

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTE: BADGE DE TASA DE CAMBIO ACTIVA — misma metodología que usa
// Aurora Horeca (ver TasaExternaService + LicenciaTenant.origenTasaActiva en
// el backend, módulo compartido core.financiero): BCV y USDT no se teclean a
// mano, se consultan en vivo de su fuente pública real bajo demanda ("Actualizar").
// Solo "Propia" sigue siendo 100% manual. COP no tiene fuente automática — se
// mantiene manual siempre.
// ══════════════════════════════════════════════════════════════════════════
function TasaBadgeComercio({ tenantId, origenTasaActiva, tasaVes, tasaCop, onOrigenCambiado, onActualizadaVes, onActualizadaCop }: {
  tenantId: number; origenTasaActiva: OrigenTasaActiva | null; tasaVes: TasaCambio | null; tasaCop: TasaCambio | null;
  onOrigenCambiado: (o: OrigenTasaActiva) => void; onActualizadaVes: (t: TasaCambio) => void; onActualizadaCop: (t: TasaCambio) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [cambiandoOrigen, setCambiandoOrigen] = useState(false);
  const [actualizandoAhora, setActualizandoAhora] = useState(false);
  const [tasaCopVal, setTasaCopVal] = useState("");
  const [tasaPropiaVal, setTasaPropiaVal] = useState("");
  const [guardandoManual, setGuardandoManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setTasaCopVal(tasaCop ? String(Number(tasaCop.tasa)) : "");
    setTasaPropiaVal(origenTasaActiva === "PERSONALIZADA" && tasaVes ? String(Number(tasaVes.tasa)) : "");
    setError(null);
  }, [abierto, tasaVes, tasaCop, origenTasaActiva]);

  useEffect(() => {
    if (!abierto) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setAbierto(false);
    };
    const handlerEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handlerEsc);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("keydown", handlerEsc); };
  }, [abierto]);

  const elegirOrigen = async (nuevo: OrigenTasaActiva) => {
    if (nuevo === origenTasaActiva) return;
    setCambiandoOrigen(true);
    setError(null);
    try {
      await actualizarOrigenTasaActiva(nuevo);
      onOrigenCambiado(nuevo);
      if (nuevo !== "PERSONALIZADA") {
        // Puede que ese origen todavía no tenga ninguna tasa registrada para este tenant.
        tasaVigente(tenantId, "USD", "VES", nuevo).then(onActualizadaVes).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar la fuente de la tasa");
    } finally {
      setCambiandoOrigen(false);
    }
  };

  const actualizarAhora = async () => {
    if (origenTasaActiva !== "BCV" && origenTasaActiva !== "USDT") return;
    setActualizandoAhora(true);
    setError(null);
    try {
      const fuente = origenTasaActiva === "USDT" ? "BINANCE" : "BCV";
      onActualizadaVes(await actualizarTasaExternaTenant(tenantId, fuente, "VES"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo consultar la tasa pública en este momento");
    } finally {
      setActualizandoAhora(false);
    }
  };

  const guardarManual = async () => {
    const vPropia = Number(tasaPropiaVal);
    const vCop = Number(tasaCopVal);
    if (!(origenTasaActiva === "PERSONALIZADA" && vPropia > 0) && !(vCop > 0)) {
      setError("Ingresá al menos una tasa mayor a cero");
      return;
    }
    setGuardandoManual(true);
    setError(null);
    try {
      const tareas: Promise<void>[] = [];
      if (origenTasaActiva === "PERSONALIZADA" && vPropia > 0) {
        tareas.push(actualizarTasa(tenantId, { monedaOrigen: "USD", monedaDestino: "VES", tasa: vPropia, origen: "PERSONALIZADA" }).then(onActualizadaVes));
      }
      if (vCop > 0) {
        tareas.push(actualizarTasa(tenantId, { monedaOrigen: "USD", monedaDestino: "COP", tasa: vCop, origen: "MANUAL" }).then(onActualizadaCop));
      }
      await Promise.all(tareas);
      setAbierto(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la tasa");
    } finally {
      setGuardandoManual(false);
    }
  };

  const tasaActivaNumero = tasaVes ? Number(tasaVes.tasa) : 0;
  const etiquetaOrigen = origenTasaActiva === "BCV" ? "BCV" : origenTasaActiva === "PERSONALIZADA" ? "PROPIA" : "USDT";

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        title="Cambiar la fuente de la tasa (Binance P2P / BCV oficial / Propia)"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-bold cursor-pointer border transition-all shadow-inner ${
          tasaActivaNumero > 0
            ? "bg-slate-100 dark:bg-slate-800 border-teal-500/30 hover:border-teal-400 text-teal-600 dark:text-teal-400"
            : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${tasaActivaNumero > 0 ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
        {tasaActivaNumero > 0 ? (
          <>
            <span className="text-[10px] px-1 rounded bg-black/5 dark:bg-white/10 uppercase tracking-wider">{etiquetaOrigen}</span>
            <span>Bs. {tasaActivaNumero.toFixed(2)}</span>
          </>
        ) : (
          <span className="underline">Configurar tasa →</span>
        )}
        {tasaCop && (
          <span className="hidden sm:inline text-slate-500 dark:text-slate-400 text-[10px] font-normal">· COP {Number(tasaCop.tasa).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
        )}
        <span className="text-slate-500 dark:text-slate-400 text-[9px]">▼</span>
      </button>

      {abierto && (
        // En el teléfono la píldora queda a la izquierda: el cuadro se abre desde ahí y con el ancho de la
        // pantalla (alineado a la derecha se salía por la izquierda y quedaba cortado).
        <div className="absolute left-0 w-[calc(100vw-2rem)] max-h-[calc(100dvh-8rem)] overflow-y-auto sm:left-auto sm:right-0 sm:w-80 sm:max-h-none sm:overflow-visible mt-2 z-50 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-300 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Fuente de la Tasa (USD → Bs)</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">USDT y BCV vienen de su fuente pública real.</p>
            </div>
            <button onClick={() => setAbierto(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white cursor-pointer"><IconClose size={14} /></button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button type="button" disabled={cambiandoOrigen} onClick={() => elegirOrigen("USDT")}
              className={`py-1.5 text-center text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 disabled:opacity-60 ${origenTasaActiva === "USDT" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
              <IconCoins size={12} /><span>USDT</span>
            </button>
            <button type="button" disabled={cambiandoOrigen} onClick={() => elegirOrigen("BCV")}
              className={`py-1.5 text-center text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 disabled:opacity-60 ${origenTasaActiva === "BCV" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
              <IconBank size={12} /><span>BCV</span>
            </button>
            <button type="button" disabled={cambiandoOrigen} onClick={() => elegirOrigen("PERSONALIZADA")}
              className={`py-1.5 text-center text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 disabled:opacity-60 ${origenTasaActiva === "PERSONALIZADA" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
              <IconEdit size={12} /><span>Propia</span>
            </button>
          </div>

          {origenTasaActiva !== "PERSONALIZADA" ? (
            <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {origenTasaActiva === "BCV" ? "Tasa oficial publicada en bcv.org.ve:" : "Promedio de las mejores ofertas de Binance P2P (USDT/VES):"}
              </p>
              <p className="font-mono font-black text-lg text-teal-600 dark:text-teal-400">
                {tasaActivaNumero > 0 ? `Bs. ${tasaActivaNumero.toFixed(2)}` : "Sin tasa todavía"}
              </p>
              {tasaVes && (
                <p className="text-[10px] text-slate-400">Actualizado: {new Date(tasaVes.fechaActualizacion).toLocaleString()}</p>
              )}
              {origenTasaActiva === "BCV" && (
                <p className="text-[10px] text-teal-700 dark:text-teal-400">La tasa BCV se actualiza sola a las 8:05 a. m., 1:05 p. m. y 5:05 p. m. La USDT se actualiza con el botón.</p>
              )}
              <button type="button" onClick={actualizarAhora} disabled={actualizandoAhora}
                className="w-full py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5">
                <IconRefresh size={12} className={actualizandoAhora ? "animate-spin" : ""} />
                <span>{actualizandoAhora ? "Consultando…" : "Actualizar Ahora"}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
              <span className="w-20 text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1"><IconEdit size={12} className="shrink-0" /><span>Propia:</span></span>
              <input value={tasaPropiaVal} onChange={(e) => setTasaPropiaVal(e.target.value)} type="number" step="0.01" min="0" placeholder="Ej. 66.00"
                className="flex-1 px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-amber-500/40 font-mono font-bold text-xs text-amber-700 dark:text-amber-300" />
              <span className="text-[10px] text-slate-400">Bs</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs">
            <span className="w-20 text-[10px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1"><span className="text-[9px] font-extrabold px-1 rounded bg-sky-500/20 text-sky-500">COP</span><span>Pesos:</span></span>
            <input value={tasaCopVal} onChange={(e) => setTasaCopVal(e.target.value)} type="number" step="0.01" min="0" placeholder="Ej. 4180"
              className="flex-1 px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-xs text-slate-900 dark:text-white" />
            <span className="text-[10px] text-slate-400">COP</span>
          </div>
          <p className="text-[10px] text-slate-400">El peso colombiano no tiene fuente automática — siempre se fija a mano.</p>

          {error && <p className="text-[10px] text-red-500">{error}</p>}

          <button onClick={guardarManual} disabled={guardandoManual}
            className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-60 shadow-md">
            {guardandoManual ? "Guardando…" : origenTasaActiva === "PERSONALIZADA" ? "Guardar Tasa Propia y COP" : "Guardar Tasa COP"}
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTE: INGRESOS & GASTOS — navegable por día/semana/mes, con utilidad
// (ingresos - gastos) calculada automáticamente para el período visible.
// Los movimientos ya viven completos en el componente padre (listarMovimientos
// sin filtro de fecha) — aquí solo se filtran y suman en el cliente, mismo
// criterio que ya usa DashboardGeneralComercio para "ventas de hoy/semana".
// ══════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ADMINISTRATIVO: CUENTAS POR COBRAR & PAGAR (IDÉNTICO AL ESTÁNDAR HORECA)
// ══════════════════════════════════════════════════════════════════════════════
function CuentasPorCobrarPagarComercio({
  cuentas,
  guardarCuentas,
  tasaActivaBs,
  tasaCop,
  clientes,
  setClientes,
  proveedores,
  ingresosCaja,
  setIngresosCaja,
  gastosCaja,
  setGastosCaja,
  mostrarToast,
  cargarIngresosCaja,
  cargarGastosCaja,
  cargarCuentas,
  tenantId,
}: {
  cuentas: CuentaComercio[];
  guardarCuentas: (c: CuentaComercio[]) => void;
  tasaActivaBs: number;
  tasaCop: number;
  clientes: ClienteComercio[];
  setClientes: React.Dispatch<React.SetStateAction<ClienteComercio[]>>;
  proveedores: ProveedorRepuesto[];
  ingresosCaja: MovimientoCaja[];
  setIngresosCaja: React.Dispatch<React.SetStateAction<MovimientoCaja[]>>;
  gastosCaja: MovimientoCaja[];
  setGastosCaja: React.Dispatch<React.SetStateAction<MovimientoCaja[]>>;
  mostrarToast: (m: string, t?: "success" | "error" | "info") => void;
  cargarIngresosCaja: () => void;
  cargarGastosCaja: () => void;
  cargarCuentas: () => void;
  tenantId?: number;
}) {
  const [subTab, setSubTab] = useState<"CXP" | "CXC">("CXP");
  const [verPagadas, setVerPagadas] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [cuentaAbonando, setCuentaAbonando] = useState<CuentaComercio | null>(null);
  const [modalNuevaCxp, setModalNuevaCxp] = useState(false);

  // Filtrado de cuentas
  const cuentasPorTipo = useMemo(() => cuentas.filter((c) => c.tipo === subTab), [cuentas, subTab]);
  const pendientes = useMemo(() => cuentasPorTipo.filter((c) => c.estado !== "PAGADO" && c.saldoPendiente > 0), [cuentasPorTipo]);
  const pagadas = useMemo(() => cuentasPorTipo.filter((c) => c.estado === "PAGADO" || c.saldoPendiente <= 0), [cuentasPorTipo]);
  const listaActiva = verPagadas ? pagadas : pendientes;

  const listaFiltrada = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    if (!b) return listaActiva;
    return listaActiva.filter(
      (c) =>
        c.concepto.toLowerCase().includes(b) ||
        c.entidadNombre.toLowerCase().includes(b) ||
        (c.numeroDocumento && c.numeroDocumento.toLowerCase().includes(b)) ||
        (c.entidadDocumento && c.entidadDocumento.toLowerCase().includes(b))
    );
  }, [listaActiva, busqueda]);

  // Totales
  const totalPendienteUSD = useMemo(() => pendientes.reduce((s, c) => s + c.saldoPendiente, 0), [pendientes]);
  const totalSaldadoUSD = useMemo(() => pagadas.reduce((s, c) => s + c.montoOriginal, 0), [pagadas]);

  const cantCxpPendientes = useMemo(() => cuentas.filter((c) => c.tipo === "CXP" && c.estado !== "PAGADO" && c.saldoPendiente > 0).length, [cuentas]);
  const cantCxcPendientes = useMemo(() => cuentas.filter((c) => c.tipo === "CXC" && c.estado !== "PAGADO" && c.saldoPendiente > 0).length, [cuentas]);

  return (
    <div className="flex-1 bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col space-y-5 animate-fade-in">
      {/* Encabezado Principal y Pestañas estilo HORECA */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
              Panel Administrativo: Cuentas por Cobrar & Pagar
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold border border-teal-500/20">
              Control Contable & Caja
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestión organizada de deudas y créditos. Cada pago o abono se registra automáticamente como egreso o ingreso en tu caja.
          </p>
        </div>

        {/* Pestañas CXP / CXC en Píldora */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => { setSubTab("CXP"); setVerPagadas(false); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === "CXP"
                ? "bg-rose-500 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>Por Pagar (CXP)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              subTab === "CXP" ? "bg-white/20 text-white" : "bg-rose-500/15 text-rose-500"
            }`}>
              {cantCxpPendientes}
            </span>
          </button>
          <button
            onClick={() => { setSubTab("CXC"); setVerPagadas(false); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === "CXC"
                ? "bg-teal-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>Por Cobrar (CXC)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              subTab === "CXC" ? "bg-white/20 text-white" : "bg-teal-500/15 text-teal-600 dark:text-teal-400"
            }`}>
              {cantCxcPendientes}
            </span>
          </button>
        </div>
      </div>

      {/* Barra de Controles: Totales, Buscador y Botón de Nueva Cuenta */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            Total {subTab === "CXP" ? "Por Pagar" : "Por Cobrar"} (USD)
          </span>
          <div className="mt-1">
            <span className={`text-2xl font-black font-mono ${subTab === "CXP" ? "text-rose-500" : "text-teal-600 dark:text-teal-400"}`}>
              {SIM()}{totalPendienteUSD.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 font-mono block mt-0.5">
              ~ Bs. {(totalPendienteUSD * tasaActivaBs).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            Total Saldado Histórico ({pagadas.length})
          </span>
          <div className="mt-1">
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {SIM()}{totalSaldadoUSD.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 font-mono block mt-0.5">
              Cuentas liquidadas con éxito
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Vista Actual:</span>
            <button
              onClick={() => setVerPagadas(!verPagadas)}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
            >
              {verPagadas ? "← Ver Pendientes" : `Ver Saldadas (${pagadas.length}) →`}
            </button>
          </div>
          {subTab === "CXP" && (
            <button
              onClick={() => setModalNuevaCxp(true)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 text-xs font-black cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <span>+ Registrar Cuenta por Pagar</span>
            </button>
          )}
        </div>
      </div>

      {/* Buscador Rápido */}
      <div className="relative">
        <input
          type="text"
          placeholder={`Buscar en ${subTab === "CXP" ? "cuentas por pagar (proveedor, factura, concepto)..." : "cuentas por cobrar (cliente, ticket, concepto)..."}`}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white rounded-xl pl-9 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-teal-500"
        />
        <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>

      {/* Listado de Cuentas */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {listaFiltrada.length === 0 ? (
          <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <IconWallet size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-bold">
              {verPagadas
                ? "No hay cuentas saldadas en esta sección."
                : subTab === "CXP"
                ? "¡Excelente! No tienes cuentas por pagar pendientes."
                : "No tienes cuentas por cobrar pendientes."}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {subTab === "CXP"
                ? "Puedes registrar compras a crédito o nuevas facturas por pagar arriba."
                : "Las ventas a crédito en mostrador se registrarán aquí automáticamente."}
            </p>
          </div>
        ) : (
          listaFiltrada.map((cta) => {
            const esPagada = cta.estado === "PAGADO" || cta.saldoPendiente <= 0;
            const abonado = Math.max(0, cta.montoOriginal - cta.saldoPendiente);
            const pctAbonado = cta.montoOriginal > 0 ? Math.min(100, Math.round((abonado / cta.montoOriginal) * 100)) : 100;
            const esVencida = cta.fechaVencimiento && new Date(cta.fechaVencimiento) < new Date() && !esPagada;

            return (
              <div
                key={cta.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border-l-4 border bg-slate-100/70 dark:bg-slate-800/60 transition-all ${
                  esPagada
                    ? "border-slate-300 dark:border-slate-700 opacity-70 border-l-emerald-500"
                    : subTab === "CXP"
                    ? "border-slate-200 dark:border-slate-700/60 border-l-rose-500 hover:border-rose-500/40"
                    : "border-slate-200 dark:border-slate-700/60 border-l-teal-500 hover:border-teal-500/40"
                }`}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {cta.entidadNombre}
                    </span>
                    {cta.entidadDocumento && (
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded">
                        {cta.entidadDocumento}
                      </span>
                    )}
                    {cta.numeroDocumento && (
                      <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400">
                        #{cta.numeroDocumento}
                      </span>
                    )}
                    {esVencida && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-500 border border-rose-500/30">
                        VENCIDA
                      </span>
                    )}
                    {esPagada && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        SALDADA
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                    {cta.concepto}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-mono">
                    <span>Emisión: {cta.fechaRegistro}</span>
                    {cta.fechaVencimiento && (
                      <span className={esVencida ? "text-rose-500 font-bold" : ""}>
                        Vencimiento: {cta.fechaVencimiento}
                      </span>
                    )}
                    {abonado > 0 && !esPagada && (
                      <span className="text-teal-600 dark:text-teal-400 font-bold">
                        Abonado: {SIM()}{abonado.toFixed(2)} ({pctAbonado}%)
                      </span>
                    )}
                  </div>

                  {/* Barra de Progreso si hubo abono parcial */}
                  {abonado > 0 && !esPagada && (
                    <div className="w-full sm:w-64 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-1">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pctAbonado}%` }} />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700/60">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      {esPagada ? "Total Pagado" : "Saldo Pendiente"}
                    </span>
                    <span className={`font-mono font-black text-base ${
                      esPagada
                        ? "text-emerald-600 dark:text-emerald-400"
                        : subTab === "CXP"
                        ? "text-rose-500"
                        : "text-teal-600 dark:text-teal-400"
                    }`}>
                      {SIM()}{(esPagada ? cta.montoOriginal : cta.saldoPendiente).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      ~ Bs. {((esPagada ? cta.montoOriginal : cta.saldoPendiente) * tasaActivaBs).toFixed(2)}
                    </span>
                  </div>

                  {!esPagada && (
                    <button
                      onClick={() => setCuentaAbonando(cta)}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-md transition-all ${
                        subTab === "CXP"
                          ? "bg-rose-500 hover:bg-rose-600 text-white"
                          : "bg-teal-500 hover:bg-teal-400 text-slate-950 font-black"
                      }`}
                    >
                      {subTab === "CXP" ? "Pagar / Abonar" : "Cobrar / Abonar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Abono / Pago con Registro Contable Automático */}
      {cuentaAbonando && (
        <ModalAbonarCuentaComercio
          cuenta={cuentaAbonando}
          tasaActivaBs={tasaActivaBs}
          onClose={() => setCuentaAbonando(null)}
          onConfirmar={async (montoAbono, monedaAbono, formaPago) => {
            const cta = cuentaAbonando;
            const movimientoId = cta.id.startsWith("mc-") ? Number(cta.id.slice(3)) : NaN;

            if (!tenantId || Number.isNaN(movimientoId)) {
              mostrarToast("No se pudo identificar esta cuenta en el servidor — recarga la pestaña e intenta de nuevo.", "error");
              return;
            }

            // abonarMovimiento ya registra el abono en la propia cuenta (saldo/estado) Y el
            // ingreso/egreso de caja correspondiente en una sola transacción atómica en el
            // backend (MotorFinancieroService.abonarMovimiento) — no hay que duplicarlo acá.
            try {
              await abonarMovimiento(tenantId, movimientoId, { monto: montoAbono, moneda: monedaAbono });
            } catch (err: any) {
              mostrarToast(err?.message || "No se pudo registrar el abono en el servidor.", "error");
              return;
            }

            cargarCuentas();
            const quedaSaldada = montoAbono >= cta.saldoPendiente - 0.005;
            // Cuando la cuenta queda saldada, desaparece de "Pendientes" (por diseño, es la
            // bandeja de lo que falta cobrar/pagar) pero SIGUE registrada — solo se mueve
            // detrás de "Ver Saldadas". Sin este aviso explícito parece que el pago hizo
            // que la cuenta "desapareciera" en vez de archivarse con su historial intacto.
            const avisoSaldada = quedaSaldada ? " La cuenta quedó SALDADA — la ves en \"Ver Saldadas\", no desapareció." : "";
            if (cta.tipo === "CXP") {
              cargarGastosCaja();
              mostrarToast(
                `Pago de ${monedaAbono === "USD" ? "$" : "Bs. "}${montoAbono.toFixed(2)} registrado (${formaPago}). Se contabilizó el egreso en caja automáticamente.${avisoSaldada}`,
                "success"
              );
            } else {
              cargarIngresosCaja();
              mostrarToast(
                `Cobro de ${monedaAbono === "USD" ? "$" : "Bs. "}${montoAbono.toFixed(2)} registrado (${formaPago}). Se contabilizó el ingreso en caja y se actualizó el saldo del cliente.${avisoSaldada}`,
                "success"
              );
            }

            setCuentaAbonando(null);
          }}
        />
      )}

      {/* Modal para Crear Nueva Cuenta por Pagar */}
      {modalNuevaCxp && (
        <ModalNuevaCxpComercio
          proveedores={proveedores}
          onGuardar={async (datos) => {
            if (!tenantId) {
              mostrarToast("No hay negocio activo — inicia sesión de nuevo.", "error");
              return;
            }
            try {
              await registrarCuentaManual(tenantId, { tipo: "CXP", ...datos });
              cargarCuentas();
              setModalNuevaCxp(false);
              mostrarToast("Cuenta por pagar registrada en el panel administrativo.", "success");
            } catch (err: any) {
              mostrarToast(err?.message || "No se pudo registrar la cuenta por pagar.", "error");
            }
          }}
          onClose={() => setModalNuevaCxp(false)}
        />
      )}
    </div>
  );
}

const TIPO_CUENTA_LABELS: Record<TipoCuentaBancaria, string> = {
  EFECTIVO: "Efectivo", BANCO: "Banco", PAGO_MOVIL: "Pago Móvil", BILLETERA_DIGITAL: "Billetera Digital", OTRO: "Otro",
};

/** "Dónde está guardado el dinero" (Caja Efectivo, Cuenta Dólares, cada banco) —
 * independiente del ledger de ventas/gastos por moneda que ya lleva MovimientoCaja. */
type SeccionConfiguracion = "tienda" | "qr" | "pagos" | "fiscal" | "impuestos" | "moneda";

const SECCIONES_CONFIGURACION: { id: SeccionConfiguracion; etiqueta: string; ayuda: string }[] = [
  { id: "tienda", etiqueta: "Mi Tienda", ayuda: "Nombre, logo, colores y banner de tu catálogo online." },
  { id: "qr", etiqueta: "Catálogo y QR", ayuda: "El enlace público de tu tienda y el código QR para imprimir o compartir." },
  { id: "pagos", etiqueta: "Métodos de Pago", ayuda: "Pago Móvil, Zelle, Binance y Bancolombia: solo aparecen a tus clientes los que tengan datos reales cargados." },
  { id: "moneda", etiqueta: "Moneda", ayuda: "En qué moneda trabaja tu negocio. Con euro se trabaja solo en euros: sin bolívares, sin pesos y sin tasas de cambio." },
  { id: "fiscal", etiqueta: "Facturación Fiscal", ayuda: "RIF, razón social y el rango de números de control que te asignó tu imprenta." },
  { id: "impuestos", etiqueta: "Impuestos y cargos", ayuda: "IVA, IGTF y delivery: si se cobran, cómo se muestran los precios y cuánto cuesta el envío." },
];

/** Todo lo que se configura una vez y se deja (no es de uso diario), en un solo lugar y con nombres
 * que se entienden. Reutiliza las pantallas existentes: las de tienda/QR/pagos son las mismas del
 * antiguo modal, ahora embebidas; la fiscal salió de Administración porque es configuración, no operación. */
function ConfiguracionComercio({ tenantId, nombreNegocio, esDuenoAdmin, onIrAEquipoRoles, seccion, onSeccion, mostrarToast }: {
  tenantId: number;
  nombreNegocio: string;
  esDuenoAdmin: boolean;
  onIrAEquipoRoles?: () => void;
  seccion: SeccionConfiguracion;
  onSeccion: (s: SeccionConfiguracion) => void;
  mostrarToast: (m: string, t?: "success" | "error" | "info") => void;
}) {
  const seccionActual = SECCIONES_CONFIGURACION.find((s) => s.id === seccion) || SECCIONES_CONFIGURACION[0];
  const seccionModal = seccion === "tienda" ? "perfil" : seccion === "qr" ? "qr" : "pago_movil";
  const claseBoton = (activo: boolean) =>
    `flex-shrink-0 text-left px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer ${
      activo ? "bg-teal-50/80 dark:bg-teal-500/10 text-teal-900 dark:text-teal-300" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
    }`;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-5xl mx-auto w-full space-y-4">
        <div>
          <h2 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Configuración</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Lo que se ajusta una vez y se deja: tu tienda online, cómo te pagan, tus datos fiscales y tu equipo.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
          <nav className="w-full md:w-56 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible flex-shrink-0">
            {SECCIONES_CONFIGURACION.filter((s) => !(modoEuro() && (s.id === "pagos" || s.id === "fiscal" || s.id === "impuestos"))).map((s) => (
              <button key={s.id} type="button" onClick={() => onSeccion(s.id)} className={claseBoton(seccion === s.id)}>
                {s.etiqueta}
              </button>
            ))}
            {esDuenoAdmin && onIrAEquipoRoles && (
              <button type="button" onClick={onIrAEquipoRoles} className={`${claseBoton(false)} flex items-center justify-between gap-2`}>
                <span>Equipo y Roles</span>
                <span className="text-slate-400">→</span>
              </button>
            )}
          </nav>

          <div className="flex-1 min-w-0 w-full space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">{seccionActual.ayuda}</p>
            {seccion === "fiscal" ? (
              <FacturacionFiscalComercio mostrarToast={mostrarToast} />
            ) : seccion === "impuestos" ? (
              <ImpuestosCargosComercio esDuenoAdmin={esDuenoAdmin} mostrarToast={mostrarToast} />
            ) : seccion === "moneda" ? (
              <MonedaNegocioComercio esDuenoAdmin={esDuenoAdmin} mostrarToast={mostrarToast} />
            ) : (
              <ModalCatalogoQR tenantId={tenantId} nombreNegocio={nombreNegocio} onClose={() => {}} embebido seccion={seccionModal} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Elegir si el negocio trabaja en dólares (con tasas Bs/COP) o solo en euros. El servidor
 * rechaza el cambio si ya hay ventas, movimientos o cuentas registrados (mezclaría monedas). */
function MonedaNegocioComercio({ esDuenoAdmin, mostrarToast }: { esDuenoAdmin: boolean; mostrarToast: (m: string, t?: "success" | "error" | "info") => void }) {
  const [actual, setActual] = useState<string>(() => monedaBaseGuardada());
  const [guardando, setGuardando] = useState(false);

  const cambiar = async (nueva: string) => {
    if (nueva === actual || guardando) return;
    setGuardando(true);
    try {
      const r = await actualizarMonedaBaseNegocio(nueva);
      fijarMonedaBaseApi(r.monedaBase);
      window.location.reload();
    } catch (e) {
      mostrarToast(e instanceof Error ? e.message : "No se pudo cambiar la moneda.", "error");
      setGuardando(false);
    }
  };

  const opciones: { id: string; titulo: string; detalle: string }[] = [
    { id: "USD", titulo: "Dólar (USD)", detalle: "Precios en dólares, con cobro en bolívares o pesos según la tasa del día." },
    { id: "EUR", titulo: "Euro (EUR)", detalle: "Todo en euros. No se muestran bolívares, pesos ni tasas de cambio." },
  ];

  return (
    <div className="max-w-2xl mx-auto w-full space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {opciones.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={!esDuenoAdmin || guardando}
            onClick={() => cambiar(o.id)}
            className={`text-left p-4 rounded-2xl border transition-colors cursor-pointer disabled:cursor-not-allowed ${
              actual === o.id ? "border-teal-500 bg-teal-50/80 dark:bg-teal-500/10" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="font-bold text-sm text-slate-900 dark:text-white">{o.titulo}{actual === o.id ? " · en uso" : ""}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{o.detalle}</div>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        {esDuenoAdmin
          ? "Solo se puede cambiar mientras el negocio no tenga ventas, movimientos ni cuentas registrados: mezclar monedas dejaría los números sin sentido."
          : "Solo el Dueño o Administrador puede cambiar la moneda."}
      </p>
    </div>
  );
}

const MODO_FISCAL_LABELS: Record<ModoFacturacionFiscal, string> = {
  NINGUNA: "Ninguna (Nota de Entrega, no fiscal)",
  FORMATO_LIBRE: "Formato Libre (imprenta autorizada SENIAT)",
  MAQUINA_FISCAL: "Máquina Fiscal (próximamente)",
};

/** Numeración de Factura Fiscal real — apagada por defecto. Mientras el dueño no
 * cargue el rango que le dio su imprenta autorizada, las ventas siguen imprimiendo
 * Nota de Entrega (no fiscal) como siempre; nunca se inventa un número de control. */
function FacturacionFiscalComercio({ mostrarToast }: { mostrarToast: (m: string, t?: "success" | "error" | "info") => void }) {
  const [config, setConfig] = useState<FacturacionFiscalConfig | null>(null);
  const [datosFiscales, setDatosFiscales] = useState<DatosFiscalesNegocio>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modoSeleccionado, setModoSeleccionado] = useState<ModoFacturacionFiscal>("NINGUNA");

  const cargar = () => {
    setCargando(true);
    Promise.all([obtenerFacturacionFiscal(), obtenerDatosFiscalesNegocio()])
      .then(([fiscal, datos]) => {
        setConfig(fiscal);
        setModoSeleccionado(fiscal.modo);
        setDatosFiscales(datos);
      })
      .catch(() => mostrarToast("No se pudo cargar la configuración fiscal.", "error"))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  if (cargando || !config) return <div className="p-8 text-center text-xs text-slate-400">Cargando...</div>;

  return (
    <div className="max-w-2xl mx-auto w-full space-y-4">
      <div>
        <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Facturación Fiscal</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Solo se activa si ya tienes un rango de números de control asignado por una imprenta autorizada por el SENIAT. Sin esto configurado, tus ventas siguen generando Nota de Entrega normal.
        </p>
      </div>

      {/* Datos fiscales del negocio (RIF / Razón Social) */}
      <form
        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setGuardando(true);
          try {
            const actualizado = await actualizarDatosFiscalesNegocio({
              rif: String(fd.get("rif") || "").trim(),
              razonSocial: String(fd.get("razonSocial") || "").trim(),
              domicilioFiscal: datosFiscales.domicilioFiscal,
            });
            setDatosFiscales(actualizado);
            mostrarToast("Datos fiscales guardados.", "success");
          } catch (err: any) {
            mostrarToast(err?.message || "No se pudieron guardar los datos fiscales.", "error");
          } finally {
            setGuardando(false);
          }
        }}
      >
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Datos del Negocio</span>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">RIF</label>
            <input name="rif" defaultValue={datosFiscales.rif || ""} placeholder="J-12345678-9" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Razón Social</label>
            <input name="razonSocial" defaultValue={datosFiscales.razonSocial || ""} placeholder="Ferretería Ejemplo, C.A." className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white" />
          </div>
        </div>
        <button type="submit" disabled={guardando} className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs cursor-pointer disabled:opacity-50">
          Guardar Datos del Negocio
        </button>
      </form>

      {/* Modo de facturación fiscal */}
      <form
        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const serie = String(fd.get("serie") || "").trim();
          const numeroDesde = fd.get("numeroDesde") ? Number(fd.get("numeroDesde")) : undefined;
          const numeroHasta = fd.get("numeroHasta") ? Number(fd.get("numeroHasta")) : undefined;
          setGuardando(true);
          try {
            const actualizado = await actualizarFacturacionFiscal({ modo: modoSeleccionado, serie, numeroDesde, numeroHasta });
            setConfig(actualizado);
            mostrarToast("Configuración fiscal guardada.", "success");
          } catch (err: any) {
            mostrarToast(err?.message || "No se pudo guardar la configuración fiscal.", "error");
          } finally {
            setGuardando(false);
          }
        }}
      >
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Modo de Facturación</span>
        <select
          value={modoSeleccionado}
          onChange={(e) => setModoSeleccionado(e.target.value as ModoFacturacionFiscal)}
          className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
        >
          <option value="NINGUNA">{MODO_FISCAL_LABELS.NINGUNA}</option>
          <option value="FORMATO_LIBRE">{MODO_FISCAL_LABELS.FORMATO_LIBRE}</option>
          <option value="MAQUINA_FISCAL" disabled>{MODO_FISCAL_LABELS.MAQUINA_FISCAL}</option>
        </select>

        {modoSeleccionado === "FORMATO_LIBRE" && (
          <div className="space-y-3 p-3.5 rounded-xl bg-teal-500/5 border border-teal-500/20">
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Ingresa exactamente el rango que te asignó tu imprenta autorizada. Si ya lo configuraste antes, no lo vuelvas a cambiar — sino se reinicia la numeración.
            </p>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Serie (ej. "00")</label>
              <input name="serie" defaultValue={config.serie || ""} placeholder="00" className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Número Desde</label>
                <input name="numeroDesde" type="number" defaultValue={config.numeroActual ?? ""} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Número Hasta</label>
                <input name="numeroHasta" type="number" defaultValue={config.numeroHasta ?? ""} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white font-mono" />
              </div>
            </div>
            {config.modo === "FORMATO_LIBRE" && config.numerosRestantes != null && (
              <p className={`text-[11px] font-bold ${config.numerosRestantes <= 20 ? "text-amber-600 dark:text-amber-400" : "text-teal-600 dark:text-teal-400"}`}>
                Próximo número: {config.serie}-{String(config.numeroActual).padStart(8, "0")} · {config.numerosRestantes} número{config.numerosRestantes === 1 ? "" : "s"} restante{config.numerosRestantes === 1 ? "" : "s"} en este rango
              </p>
            )}
          </div>
        )}

        <button type="submit" disabled={guardando} className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs cursor-pointer disabled:opacity-50">
          {guardando ? "Guardando..." : "Guardar Configuración Fiscal"}
        </button>
      </form>
    </div>
  );
}

function CuentasBancariasComercio({ tenantId, mostrarToast }: { tenantId: number; mostrarToast: (m: string, t?: "success" | "error" | "info") => void }) {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalNueva, setModalNueva] = useState(false);
  const [modalMovimiento, setModalMovimiento] = useState<{ cuenta: CuentaBancaria; tipo: "ingresar" | "retirar" } | null>(null);
  const [modalTransferir, setModalTransferir] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    setCargando(true);
    listarCuentasBancarias(tenantId)
      .then(setCuentas)
      .catch(() => mostrarToast("No se pudieron cargar las cuentas bancarias.", "error"))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, [tenantId]);

  const totalesPorMoneda = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const c of cuentas) if (c.activa) acc[c.moneda] = (acc[c.moneda] || 0) + Number(c.saldo);
    return acc;
  }, [cuentas]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {Object.entries(totalesPorMoneda).map(([m, v]) => (
            <div key={m} className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
              Total {m}: <span className="text-teal-600 dark:text-teal-400">{prefijoMoneda(m)}{v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalTransferir(true)}
            disabled={cuentas.length < 2}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Transferir entre Cuentas
          </button>
          <button
            type="button"
            onClick={() => setModalNueva(true)}
            className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-teal-400 shadow-md transition-colors"
          >
            + Nueva Cuenta
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="p-8 text-center text-xs text-slate-400">Cargando cuentas...</div>
      ) : cuentas.length === 0 ? (
        <div className="p-10 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          Todavía no registras ninguna cuenta. Crea "Caja Efectivo" o el nombre de tu banco para empezar a saber dónde está tu dinero.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cuentas.map((c) => (
            <div key={c.id} className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border shadow-sm space-y-3 ${c.activa ? "border-slate-200 dark:border-slate-800" : "border-slate-200 dark:border-slate-800 opacity-50"}`}>
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center"><IconWallet size={16} className="text-teal-600 dark:text-teal-400" /></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase">
                    {TIPO_CUENTA_LABELS[c.tipo]}
                  </span>
                  {!c.metodoPagoVinculado && (
                    <button
                      type="button"
                      title="Eliminar cuenta"
                      onClick={async () => {
                        if (!window.confirm(`¿Eliminar la cuenta "${c.nombre}"? Esto borra también su historial de movimientos y no se puede deshacer.`)) return;
                        try {
                          await eliminarCuentaBancaria(tenantId, c.id);
                          mostrarToast("Cuenta eliminada.", "success");
                          cargar();
                        } catch (err: any) {
                          mostrarToast(err?.message || "No se pudo eliminar la cuenta.", "error");
                        }
                      }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                    >
                      <IconClose size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">{c.nombre}</div>
                <div className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white truncate">
                  {prefijoMoneda(c.moneda)}{Number(c.saldo).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalMovimiento({ cuenta: c, tipo: "ingresar" })}
                  className="flex-1 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold cursor-pointer transition-colors"
                >
                  + Ingresar
                </button>
                <button
                  type="button"
                  onClick={() => setModalMovimiento({ cuenta: c, tipo: "retirar" })}
                  className="flex-1 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-bold cursor-pointer transition-colors"
                >
                  - Retirar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalNueva && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={() => setModalNueva(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const nombre = String(fd.get("nombre") || "").trim();
              const tipo = String(fd.get("tipo") || "BANCO") as TipoCuentaBancaria;
              const moneda = String(fd.get("moneda") || "USD");
              const saldoInicial = Number(fd.get("saldoInicial")) || 0;
              setGuardando(true);
              try {
                await crearCuentaBancaria(tenantId, { nombre, tipo, moneda, saldoInicial });
                mostrarToast("Cuenta creada correctamente.", "success");
                setModalNueva(false);
                cargar();
              } catch (err: any) {
                mostrarToast(err?.message || "No se pudo crear la cuenta.", "error");
              } finally {
                setGuardando(false);
              }
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 cursor-default shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Nueva Cuenta</h3>
              <button type="button" onClick={() => setModalNueva(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white cursor-pointer"><IconClose size={18} /></button>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Nombre</label>
              <input required name="nombre" placeholder="Ej. Caja Efectivo / Banco Mercantil" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Tipo</label>
                <select name="tipo" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm">
                  {Object.entries(TIPO_CUENTA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Moneda</label>
                <select name="moneda" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm">
                  <option value="USD">{CODIGO()}</option>
                  {!modoEuro() && <option value="VES">VES</option>}
                  {!modoEuro() && <option value="COP">COP</option>}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Saldo Inicial (opcional)</label>
              <input name="saldoInicial" type="number" step="0.01" placeholder="0.00" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-mono" />
            </div>
            <button type="submit" disabled={guardando} className="w-full py-2.5 rounded-xl bg-teal-500 text-slate-950 font-black cursor-pointer hover:bg-teal-400 shadow-md disabled:opacity-50">
              {guardando ? "Creando..." : "Crear Cuenta"}
            </button>
          </form>
        </div>
      )}

      {modalMovimiento && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={() => setModalMovimiento(null)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const monto = Number(fd.get("monto"));
              const concepto = String(fd.get("concepto") || "");
              if (!monto || monto <= 0) return;
              setGuardando(true);
              try {
                if (modalMovimiento.tipo === "ingresar") await ingresarSaldoCuentaBancaria(tenantId, modalMovimiento.cuenta.id, monto, concepto);
                else await retirarSaldoCuentaBancaria(tenantId, modalMovimiento.cuenta.id, monto, concepto);
                mostrarToast(modalMovimiento.tipo === "ingresar" ? "Ingreso registrado." : "Retiro registrado.", "success");
                setModalMovimiento(null);
                cargar();
              } catch (err: any) {
                mostrarToast(err?.message || "No se pudo registrar el movimiento.", "error");
              } finally {
                setGuardando(false);
              }
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 cursor-default shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">
                {modalMovimiento.tipo === "ingresar" ? "Ingresar Saldo" : "Retirar Saldo"} — {modalMovimiento.cuenta.nombre}
              </h3>
              <button type="button" onClick={() => setModalMovimiento(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white cursor-pointer"><IconClose size={18} /></button>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Monto ({modalMovimiento.cuenta.moneda})</label>
              <input required name="monto" type="number" step="0.01" placeholder="0.00" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-mono" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Concepto (opcional)</label>
              <input name="concepto" placeholder="Ej. Depósito de ventas del día" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm" />
            </div>
            <button type="submit" disabled={guardando} className={`w-full py-2.5 rounded-xl font-black cursor-pointer shadow-md disabled:opacity-50 ${modalMovimiento.tipo === "ingresar" ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950" : "bg-rose-500 hover:bg-rose-400 text-white"}`}>
              {guardando ? "Guardando..." : modalMovimiento.tipo === "ingresar" ? "Confirmar Ingreso" : "Confirmar Retiro"}
            </button>
          </form>
        </div>
      )}

      {modalTransferir && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={() => setModalTransferir(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const origenId = Number(fd.get("origenId"));
              const destinoId = Number(fd.get("destinoId"));
              const monto = Number(fd.get("monto"));
              if (!origenId || !destinoId || !monto || monto <= 0) return;
              setGuardando(true);
              try {
                await transferirEntreCuentasBancarias(tenantId, origenId, destinoId, monto);
                mostrarToast("Transferencia realizada correctamente.", "success");
                setModalTransferir(false);
                cargar();
              } catch (err: any) {
                mostrarToast(err?.message || "No se pudo transferir.", "error");
              } finally {
                setGuardando(false);
              }
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 cursor-default shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Transferir entre Cuentas</h3>
              <button type="button" onClick={() => setModalTransferir(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white cursor-pointer"><IconClose size={18} /></button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Solo se puede transferir entre cuentas de la misma moneda.</p>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Desde</label>
              <select required name="origenId" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm">
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.moneda} {Number(c.saldo).toFixed(2)})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Hacia</label>
              <select required name="destinoId" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm">
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.moneda} {Number(c.saldo).toFixed(2)})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Monto</label>
              <input required name="monto" type="number" step="0.01" placeholder="0.00" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-mono" />
            </div>
            <button type="submit" disabled={guardando} className="w-full py-2.5 rounded-xl bg-teal-500 text-slate-950 font-black cursor-pointer hover:bg-teal-400 shadow-md disabled:opacity-50">
              {guardando ? "Transfiriendo..." : "Confirmar Transferencia"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/** Multi-almacén: ver dónde vive el stock de este producto y trasladar entre ubicaciones.
 * No toca el stock total (sigue siendo la fuente de verdad para vender) — solo su reparto. */
function ModalAlmacenesComercio({ tenantId, producto, onClose, onCambio, mostrarToast }: {
  tenantId: number;
  producto: ProductoComercio;
  onClose: () => void;
  onCambio?: () => void;
  mostrarToast: (m: string, t?: "success" | "error" | "info") => void;
}) {
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [distribucion, setDistribucion] = useState<StockAlmacen[]>([]);
  const [sinAsignar, setSinAsignar] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [modalNuevoAlmacen, setModalNuevoAlmacen] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    if (!producto.backendId) return;
    setCargando(true);
    Promise.all([listarAlmacenes(tenantId), obtenerDistribucionAlmacen(tenantId, producto.backendId)])
      .then(([almacenesData, dist]) => {
        setAlmacenes(almacenesData);
        setDistribucion(dist.distribucion);
        setSinAsignar(dist.sinAsignar);
      })
      .catch(() => mostrarToast("No se pudo cargar la distribución por almacén.", "error"))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, [producto.backendId]);

  const cantidadEn = (almacenId: number) => distribucion.find((d) => d.almacenId === almacenId)?.cantidad || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto cursor-default" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Almacenes</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">{producto.nombre}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white cursor-pointer"><IconClose size={18} /></button>
        </div>

        {cargando ? (
          <div className="p-6 text-center text-xs text-slate-400">Cargando...</div>
        ) : (
          <>
            <div className="space-y-2">
              {almacenes.map((a) => (
                <div key={a.id} className="p-3 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconTruck size={13} className="text-indigo-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{a.nombre}</span>
                      {a.esPrincipal && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 uppercase">Principal</span>}
                    </div>
                    <span className="text-sm font-mono font-black text-slate-900 dark:text-white">{cantidadEn(a.id)} {producto.unidadMedida || ""}</span>
                  </div>
                  <input
                    key={`${a.id}-${distribucion.find((d) => d.almacenId === a.id)?.ubicacion ?? ""}`}
                    defaultValue={distribucion.find((d) => d.almacenId === a.id)?.ubicacion || ""}
                    maxLength={120}
                    placeholder="Ubicación en este almacén (ej. Pasillo 3, Estante B)"
                    onBlur={async (e) => {
                      const nueva = e.target.value.trim();
                      const actual = distribucion.find((d) => d.almacenId === a.id)?.ubicacion || "";
                      if (nueva === actual || !producto.backendId) return;
                      try {
                        await fijarUbicacionAlmacen(tenantId, { repuestoId: producto.backendId, almacenId: a.id, ubicacion: nueva });
                        mostrarToast("Ubicación guardada.", "success");
                        cargar();
                        onCambio?.();
                      } catch (err: any) {
                        mostrarToast(err?.message || "No se pudo guardar la ubicación.", "error");
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[11px] text-slate-900 dark:text-white"
                  />
                </div>
              ))}
              {sinAsignar > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Sin asignar a ningún almacén</span>
                  <span className="text-sm font-mono font-black text-amber-600 dark:text-amber-400">{sinAsignar} {producto.unidadMedida || ""}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setModalNuevoAlmacen(true)}
                className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer border border-slate-300 dark:border-slate-700"
              >
                + Nuevo Almacén
              </button>
            </div>

            {almacenes.length >= 2 && (
              <form
                className="space-y-3 p-3.5 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const origenId = Number(fd.get("origenId"));
                  const destinoId = Number(fd.get("destinoId"));
                  const cantidad = Number(fd.get("cantidad"));
                  if (!origenId || !destinoId || !cantidad || cantidad <= 0 || !producto.backendId) return;
                  setGuardando(true);
                  try {
                    await trasladarStockAlmacen(tenantId, { repuestoId: producto.backendId, origenId, destinoId, cantidad });
                    mostrarToast("Traslado realizado correctamente.", "success");
                    cargar();
                    (e.currentTarget as HTMLFormElement).reset();
                  } catch (err: any) {
                    mostrarToast(err?.message || "No se pudo trasladar.", "error");
                  } finally {
                    setGuardando(false);
                  }
                }}
              >
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Trasladar entre Almacenes</span>
                <div className="grid grid-cols-2 gap-2">
                  <select name="origenId" required className="px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white">
                    {almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre} ({cantidadEn(a.id)})</option>)}
                  </select>
                  <select name="destinoId" required className="px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white">
                    {almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre} ({cantidadEn(a.id)})</option>)}
                  </select>
                </div>
                <input name="cantidad" type="number" step="0.01" required placeholder={`Cantidad a trasladar (${producto.unidadMedida || "unidades"})`} className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono" />
                <button type="submit" disabled={guardando} className="w-full py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs cursor-pointer disabled:opacity-50">
                  {guardando ? "Trasladando..." : "Confirmar Traslado"}
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {modalNuevoAlmacen && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 cursor-pointer" onClick={() => setModalNuevoAlmacen(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const nombre = String(fd.get("nombre") || "").trim();
              const direccion = String(fd.get("direccion") || "").trim();
              if (!nombre) return;
              setGuardando(true);
              try {
                await crearAlmacen(tenantId, { nombre, direccion: direccion || undefined });
                mostrarToast("Almacén creado.", "success");
                setModalNuevoAlmacen(false);
                cargar();
              } catch (err: any) {
                mostrarToast(err?.message || "No se pudo crear el almacén.", "error");
              } finally {
                setGuardando(false);
              }
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-2xl cursor-default"
          >
            <h4 className="font-['Outfit'] font-black text-sm text-slate-900 dark:text-white">Nuevo Almacén</h4>
            <input name="nombre" required placeholder="Ej. Sucursal Este" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white" />
            <input name="direccion" placeholder="Dirección (opcional)" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white" />
            <button type="submit" disabled={guardando} className="w-full py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs cursor-pointer disabled:opacity-50">
              {guardando ? "Creando..." : "Crear Almacén"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// Modal de Abono / Pago con Registro Contable
function ModalAbonarCuentaComercio({
  cuenta,
  tasaActivaBs,
  onClose,
  onConfirmar,
}: {
  cuenta: CuentaComercio;
  tasaActivaBs: number;
  onClose: () => void;
  onConfirmar: (monto: number, moneda: "USD" | "VES" | "COP", formaPago: string) => Promise<void>;
}) {
  const [monto, setMonto] = useState(String(cuenta.saldoPendiente));
  const [moneda, setMoneda] = useState<"USD" | "VES" | "COP">(cuenta.moneda || "USD");
  const [formaPago, setFormaPago] = useState("Efectivo Caja");
  const [guardando, setGuardando] = useState(false);

  const saldoUSD = cuenta.saldoPendiente;
  const saldoBs = saldoUSD * tasaActivaBs;

  const montoNum = parseFloat(monto) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montoNum <= 0) return;
    setGuardando(true);
    try {
      await onConfirmar(montoNum, moneda, formaPago);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">
              {cuenta.tipo === "CXP" ? "Registrar Pago a Proveedor" : "Registrar Cobro a Cliente"}
            </h3>
            <span className="text-xs text-slate-500 font-semibold">{cuenta.entidadNombre}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><IconClose size={18} /></button>
        </div>

        <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Concepto de la Cuenta:</span>
          <p className="text-xs font-semibold text-slate-900 dark:text-white">{cuenta.concepto}</p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-500">Saldo pendiente:</span>
            <span className="font-mono font-black text-slate-900 dark:text-white">
              {SIM()}{saldoUSD.toFixed(2)} <span className="text-slate-400 font-normal">(Bs. {saldoBs.toFixed(2)})</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Monto a {cuenta.tipo === "CXP" ? "Pagar" : "Cobrar"}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={cuenta.saldoPendiente}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-sm font-black font-mono text-slate-900 dark:text-white rounded-xl px-3 py-2 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-teal-500"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Moneda</label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as any)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white rounded-xl px-3 py-2 border border-slate-300 dark:border-slate-700 focus:outline-none"
              >
                <option value="USD">{CODIGO()} ({SIM()})</option>
                {!modoEuro() && <option value="VES">Bolívares (Bs)</option>}
                {!modoEuro() && <option value="COP">Pesos (COP)</option>}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Forma de Pago / Destino en Caja</label>
            <select
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white rounded-xl px-3 py-2 border border-slate-300 dark:border-slate-700 focus:outline-none"
            >
              <option value="Efectivo Caja">Efectivo en Caja</option>
              <option value="Punto de Venta">Punto de Venta / Tarjeta</option>
              <option value="Pago Móvil">Pago Móvil</option>
              <option value="Transferencia Bancaria">Transferencia Bancaria</option>
              <option value="Zelle">Zelle / Divisa Digital</option>
            </select>
          </div>

          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-700 dark:text-teal-300">
            <strong className="text-teal-600 dark:text-teal-400">Efecto administrativo:</strong> Al confirmar, se descontará la deuda y se registrará inmediatamente el <strong>{cuenta.tipo === "CXP" ? "EGRESO / GASTO" : "INGRESO"}</strong> en el flujo de caja del negocio.
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || montoNum <= 0}
              className={`flex-1 py-2.5 rounded-xl text-white font-black text-xs cursor-pointer shadow-lg disabled:opacity-50 ${
                cuenta.tipo === "CXP" ? "bg-rose-500 hover:bg-rose-600" : "bg-teal-500 hover:bg-teal-400 text-slate-950 font-black"
              }`}
            >
              {guardando ? "Procesando..." : cuenta.tipo === "CXP" ? "Confirmar Pago" : "Confirmar Cobro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal para Crear Nueva Cuenta por Pagar (CXP)
function ModalNuevaCxpComercio({
  proveedores,
  onClose,
  onGuardar,
}: {
  proveedores: ProveedorRepuesto[];
  onClose: () => void;
  onGuardar: (datos: { monto: number; concepto: string; entidadNombre?: string; diasCredito?: number }) => void | Promise<void>;
}) {
  const [proveedorNombre, setProveedorNombre] = useState(proveedores[0]?.nombre || "");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [diasCredito, setDiasCredito] = useState("15");
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseFloat(monto);
    if (!m || m <= 0) return;

    setGuardando(true);
    try {
      await onGuardar({
        monto: m,
        concepto: concepto.trim() || `Factura ${numeroFactura.trim() || "S/N"}`,
        entidadNombre: proveedorNombre.trim() || "Proveedor Comercial",
        diasCredito: parseInt(diasCredito) || 15,
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Nueva Cuenta por Pagar (CXP)</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><IconClose size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Proveedor / Beneficiario</label>
            <input
              type="text"
              placeholder="Ej. Distribuidora Central, Enelven, Alquiler..."
              value={proveedorNombre}
              onChange={(e) => setProveedorNombre(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white rounded-xl px-3 py-2 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-teal-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Nº Factura / Doc</label>
              <input
                type="text"
                placeholder="Ej. F-10293"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white rounded-xl px-3 py-2 border border-slate-300 dark:border-slate-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Días de Crédito</label>
              <input
                type="number"
                min="0"
                value={diasCredito}
                onChange={(e) => setDiasCredito(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white rounded-xl px-3 py-2 border border-slate-300 dark:border-slate-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Concepto / Descripción</label>
            <input
              type="text"
              placeholder="Ej. Compra de 20 cajas de bujías a crédito"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white rounded-xl px-3 py-2 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-teal-500"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Monto Total USD ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 text-sm font-black font-mono text-slate-900 dark:text-white rounded-xl px-3 py-2 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-teal-500"
              required
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-black text-xs cursor-pointer shadow-md"
            >
              {guardando ? "Guardando…" : "Guardar Cuenta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function IngresosGastosComercio({ ingresosCaja, gastosCaja, formGasto, setFormGasto, registrarGasto, guardandoGasto }: {
  ingresosCaja: MovimientoCaja[];
  gastosCaja: MovimientoCaja[];
  formGasto: { tipo: "INGRESO" | "EGRESO"; monto: string; moneda: "USD" | "VES" | "COP"; concepto: string };
  setFormGasto: (v: { tipo: "INGRESO" | "EGRESO"; monto: string; moneda: "USD" | "VES" | "COP"; concepto: string }) => void;
  registrarGasto: () => void;
  guardandoGasto: boolean;
}) {
  type Modo = "dia" | "semana" | "mes";
  const [modo, setModo] = useState<Modo>("mes");
  const [offset, setOffset] = useState(0); // 0 = período actual, -1 = anterior, +1 = siguiente

  const calcularRango = (m: Modo, o: number) => {
    const hoy = new Date();
    if (m === "dia") {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + o);
      const desde = new Date(d); desde.setHours(0, 0, 0, 0);
      const hasta = new Date(d); hasta.setHours(23, 59, 59, 999);
      const etiqueta = o === 0 ? "Hoy" : d.toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" });
      return { desde, hasta, etiqueta };
    }
    if (m === "semana") {
      const inicioSemanaActual = new Date(hoy); inicioSemanaActual.setDate(hoy.getDate() - hoy.getDay());
      const desde = new Date(inicioSemanaActual); desde.setDate(desde.getDate() + o * 7); desde.setHours(0, 0, 0, 0);
      const hasta = new Date(desde); hasta.setDate(hasta.getDate() + 6); hasta.setHours(23, 59, 59, 999);
      const fmt = (d: Date) => d.toLocaleDateString("es-VE", { day: "numeric", month: "short" });
      const etiqueta = o === 0 ? "Esta semana" : `${fmt(desde)} – ${fmt(hasta)}`;
      return { desde, hasta, etiqueta };
    }
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() + o, 1);
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + o + 1, 0, 23, 59, 59, 999);
    const etiqueta = o === 0 ? "Este mes" : desde.toLocaleDateString("es-VE", { month: "long", year: "numeric" });
    return { desde, hasta, etiqueta };
  };

  const rango = useMemo(() => calcularRango(modo, offset), [modo, offset]);
  // Mismo tamaño de período, inmediatamente antes — para el comparativo "vs
  // período anterior" de las 3 tarjetas de resumen.
  const rangoAnterior = useMemo(() => calcularRango(modo, offset - 1), [modo, offset]);

  const enRangoDe = (r: { desde: Date; hasta: Date }) => (m: MovimientoCaja) => {
    const f = new Date(m.fechaRegistro);
    return f >= r.desde && f <= r.hasta;
  };
  const enRango = enRangoDe(rango);

  const ingresosPeriodo = useMemo(() => ingresosCaja.filter(enRango), [ingresosCaja, rango]);
  const gastosPeriodo = useMemo(() => gastosCaja.filter(enRango), [gastosCaja, rango]);
  const ingresosPeriodoAnterior = useMemo(() => ingresosCaja.filter(enRangoDe(rangoAnterior)), [ingresosCaja, rangoAnterior]);
  const gastosPeriodoAnterior = useMemo(() => gastosCaja.filter(enRangoDe(rangoAnterior)), [gastosCaja, rangoAnterior]);

  const sumarPorMoneda = (movs: MovimientoCaja[]) => {
    const acc: Record<string, number> = {};
    for (const m of movs) acc[m.moneda] = (acc[m.moneda] || 0) + Number(m.monto);
    return acc;
  };
  const totalIngresos = sumarPorMoneda(ingresosPeriodo);
  const totalGastos = sumarPorMoneda(gastosPeriodo);
  const monedas = Array.from(new Set([...Object.keys(totalIngresos), ...Object.keys(totalGastos)]));
  const utilidadPorMoneda: Record<string, number> = {};
  for (const m of monedas) utilidadPorMoneda[m] = (totalIngresos[m] || 0) - (totalGastos[m] || 0);

  const totalIngresosAnterior = sumarPorMoneda(ingresosPeriodoAnterior);
  const totalGastosAnterior = sumarPorMoneda(gastosPeriodoAnterior);

  // % de cambio vs período anterior, calculado solo sobre la moneda principal
  // (la primera / más grande de cada mapa) — null = sin base real de comparación,
  // nunca se inventa un "+100%" contra cero.
  const calcularCambioPct = (actual: Record<string, number>, anterior: Record<string, number>): number | null => {
    const monedaPrincipal = Object.keys(actual)[0];
    if (!monedaPrincipal) return null;
    const valorAnterior = anterior[monedaPrincipal];
    if (!valorAnterior) return null;
    return ((actual[monedaPrincipal] - valorAnterior) / Math.abs(valorAnterior)) * 100;
  };
  const cambioIngresosPct = calcularCambioPct(totalIngresos, totalIngresosAnterior);
  const cambioGastosPct = calcularCambioPct(totalGastos, totalGastosAnterior);
  const utilidadAnteriorPorMoneda: Record<string, number> = {};
  for (const m of new Set([...Object.keys(totalIngresosAnterior), ...Object.keys(totalGastosAnterior)])) {
    utilidadAnteriorPorMoneda[m] = (totalIngresosAnterior[m] || 0) - (totalGastosAnterior[m] || 0);
  }
  const cambioUtilidadPct = calcularCambioPct(utilidadPorMoneda, utilidadAnteriorPorMoneda);

  const badgeCambio = (pct: number | null, invertirColor = false) => {
    if (pct == null) return null;
    // Para Gastos, subir es malo (rojo) y bajar es bueno (verde) — al revés que Ingresos/Utilidad.
    const esBueno = invertirColor ? pct <= 0 : pct >= 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${esBueno ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
        {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% vs anterior
      </span>
    );
  };

  // Antes se unían todas las monedas en un solo texto ("$182.25 · VES 17,320.00")
  // que se cortaba en dos líneas dentro de la tarjeta (el dólar arriba, el
  // bolívar abajo) — parecía un solo número mal escrito. Ahora van una al lado
  // de la otra en la misma línea, con una separación visible y colores
  // distintos, porque son dos montos independientes, no una sola cifra.
  const renderMontos = (obj: Record<string, number>, colorPrimario: string) => {
    const entradas = Object.entries(obj);
    const [primero, ...resto] = entradas;
    return (
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={`font-['Outfit'] font-black text-2xl ${colorPrimario} truncate`}>
          {primero ? `${prefijoMoneda(primero[0])}${primero[1].toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
        </span>
        {resto.length > 0 && (
          <span className="text-sm font-bold text-indigo-500 dark:text-indigo-400 pl-2 border-l-2 border-slate-200 dark:border-slate-700 truncate">
            {resto.map(([m, v]) => `${m} ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" · ")}
          </span>
        )}
      </div>
    );
  };

  const movimientosPeriodo = useMemo(
    () => [...ingresosPeriodo.map((m) => ({ ...m, esIngreso: true })), ...gastosPeriodo.map((m) => ({ ...m, esIngreso: false }))]
      .sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime()),
    [ingresosPeriodo, gastosPeriodo]
  );

  const hayNegativo = monedas.some((m) => utilidadPorMoneda[m] < 0);

  const fmtFechaMov = (iso: string) => {
    const f = new Date(iso);
    const hoy = new Date();
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const hora = f.toLocaleTimeString("es-VE", { hour: "numeric", minute: "2-digit" });
    if (f.toDateString() === hoy.toDateString()) return `Hoy, ${hora}`;
    if (f.toDateString() === ayer.toDateString()) return `Ayer, ${hora}`;
    return `${f.toLocaleDateString("es-VE", { day: "numeric", month: "short" })}, ${hora}`;
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* ── Encabezado + navegador de período ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white shadow-sm shadow-teal-500/30 shrink-0">
            <IconWallet size={20} className="shrink-0" />
          </div>
          <div>
            <h2 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white leading-tight">Ingresos & Gastos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">El dinero que entra y sale de tu negocio, con la utilidad ya calculada.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs w-fit">
          {([["dia", "Día"], ["semana", "Semana"], ["mes", "Mes"]] as [Modo, string][]).map(([id, label]) => (
            <button key={id} onClick={() => { setModo(id); setOffset(0); }}
              className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${modo === id ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-300 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setOffset((o) => o - 1)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-500 dark:text-slate-300" title="Período anterior">
            <IconChevronLeft size={16} />
          </button>
          <div className="px-2 min-w-[10rem] text-center">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 capitalize leading-tight">{rango.etiqueta}</div>
            {offset !== 0 ? (
              <button onClick={() => setOffset(0)} className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer">
                Volver a hoy
              </button>
            ) : (
              <div className="text-[10px] text-slate-400 dark:text-slate-500">Período actual</div>
            )}
          </div>
          <button onClick={() => setOffset((o) => Math.min(o + 1, 0))} disabled={offset >= 0} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent text-slate-500 dark:text-slate-300" title="Período siguiente">
            <IconChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Resumen del período: ingresos, gastos, utilidad ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <IconCoins size={18} />
            </div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ingresos</div>
          </div>
          {renderMontos(totalIngresos, "text-slate-900 dark:text-white")}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            <span>{ingresosPeriodo.length === 0 ? "Sin ingresos en este período" : `${ingresosPeriodo.length} movimiento${ingresosPeriodo.length === 1 ? "" : "s"}`}</span>
            {badgeCambio(cambioIngresosPct)}
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
              <IconReceipt size={18} />
            </div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gastos</div>
          </div>
          {renderMontos(totalGastos, "text-slate-900 dark:text-white")}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            <span>{gastosPeriodo.length === 0 ? "Sin gastos en este período" : `${gastosPeriodo.length} movimiento${gastosPeriodo.length === 1 ? "" : "s"}`}</span>
            {badgeCambio(cambioGastosPct, true)}
          </div>
        </div>
        <div className={`p-5 rounded-2xl border ${hayNegativo ? "bg-rose-500/5 border-rose-500/30" : "bg-emerald-500/5 border-emerald-500/30"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${hayNegativo ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"}`}>
              <IconChartTrend size={18} className="shrink-0" />
            </div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Balance de Caja</div>
          </div>
          {renderMontos(utilidadPorMoneda, hayNegativo ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}
          {cambioUtilidadPct != null && <div className="mt-1">{badgeCambio(cambioUtilidadPct)}</div>}
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Ingresos − Gastos — no es tu ganancia real (no resta el costo de lo vendido, ver "Ver Utilidad")
          </div>
        </div>
      </div>

      {/* ── Registrar movimiento ── */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">Registrar movimiento</h3>
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs w-fit">
          {(["EGRESO", "INGRESO"] as const).map((t) => (
            <button key={t} onClick={() => setFormGasto({ ...formGasto, tipo: t })}
              className={`px-4 py-1.5 rounded-full font-bold transition-all cursor-pointer ${formGasto.tipo === t ? (t === "EGRESO" ? "bg-red-500 text-white" : "bg-teal-500 text-slate-950") : "text-slate-600 dark:text-slate-400"}`}>
              {t === "EGRESO" ? "Gasto" : "Ingreso"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Monto</label>
            <input value={formGasto.monto} onChange={(e) => setFormGasto({ ...formGasto, monto: e.target.value })} type="number" step="0.01" placeholder="0.00"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Moneda</label>
            <select value={formGasto.moneda} onChange={(e) => setFormGasto({ ...formGasto, moneda: e.target.value as "USD" | "VES" | "COP" })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
              <option value="USD">{CODIGO()}</option>
              {!modoEuro() && <option value="VES">VES</option>}
              {!modoEuro() && <option value="COP">COP</option>}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Concepto</label>
            <input value={formGasto.concepto} onChange={(e) => setFormGasto({ ...formGasto, concepto: e.target.value })} placeholder="ej. Alquiler del local"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
          </div>
        </div>
        <button onClick={registrarGasto} disabled={guardandoGasto}
          className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm cursor-pointer disabled:opacity-60">
          {guardandoGasto ? "Guardando…" : `Registrar ${formGasto.tipo === "EGRESO" ? "gasto" : "ingreso"}`}
        </button>
      </div>

      {/* ── Movimientos del período ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider">Movimientos — {rango.etiqueta}</h3>
        </div>
        {movimientosPeriodo.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mx-auto mb-3">
              <IconReceipt size={20} />
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500">Sin movimientos registrados en este período.</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {movimientosPeriodo.map((m) => (
              <div key={`${m.esIngreso ? "i" : "g"}-${m.id}`} className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-900 text-sm">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${m.esIngreso ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-500"}`}>
                  {m.esIngreso ? "↑" : "↓"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white truncate">{m.concepto}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{fmtFechaMov(m.fechaRegistro)}</div>
                </div>
                <div className={`font-mono font-bold shrink-0 ${m.esIngreso ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                  {m.esIngreso ? "+" : "-"}{Number(m.monto).toFixed(2)} {m.moneda}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTE: TURNOS DE CAJA & CIERRE Z (mismo motor /api/financiero/turnos
// que usa Aurora Horeca — apertura con monto base, egresos y arqueo ciego al
// cierre, con historial y auditoría real en el backend, no solo un cálculo
// local que se perdía al recargar la página).
// ══════════════════════════════════════════════════════════════════════════
function TurnoCajaComercio({ tenantId, tasaUsdVes, tasaUsdCop }: { tenantId: number; tasaUsdVes: number; tasaUsdCop: number }) {
  const MONEDAS = (modoEuro() ? ["USD"] : ["USD", "VES", "COP"]) as readonly ("USD" | "VES" | "COP")[];
  const [moneda, setMoneda] = useState<typeof MONEDAS[number]>("USD");
  const [turno, setTurno] = useState<Turno | null | undefined>(undefined); // undefined = cargando
  const [historial, setHistorial] = useState<Turno[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [idCajero, setIdCajero] = useState("");
  const [montoBase, setMontoBase] = useState("");
  const [abriendo, setAbriendo] = useState(false);

  const [montoEgreso, setMontoEgreso] = useState("");
  const [conceptoEgreso, setConceptoEgreso] = useState("");
  const [registrandoEgreso, setRegistrandoEgreso] = useState(false);

  const [montoDeclarado, setMontoDeclarado] = useState("");
  const [modoArqueo, setModoArqueo] = useState<"DIRECTO" | "DESGLOSADO">("DESGLOSADO");
  const [desgloseArqueo, setDesgloseArqueo] = useState({ usd: "", ves: "", punto: "", pagoMovil: "", zelle: "", cop: "" });
  const [cerrando, setCerrando] = useState(false);
  const [ultimoCierre, setUltimoCierre] = useState<Turno | null>(null);

  // El servidor compara contra el EFECTIVO de la moneda del turno (lo que se puede contar en la
  // gaveta). Punto, Pago Móvil, Zelle y las otras monedas se anotan como referencia pero no entran
  // en el monto declarado; antes se sumaban y cada cierre salía con un "sobrante" falso.
  const totalDesgloseCalculado = useMemo(() => {
    if (moneda === "USD") return Number(desgloseArqueo.usd) || 0;
    if (moneda === "VES") return Number(desgloseArqueo.ves) || 0;
    return Number(desgloseArqueo.cop) || 0;
  }, [desgloseArqueo, moneda]);

  const montoDeclaradoFinal = modoArqueo === "DESGLOSADO" ? totalDesgloseCalculado : (Number(montoDeclarado) || 0);

  const cargarTurno = () => {
    setTurno(undefined);
    turnoAbierto(tenantId, moneda).then(setTurno).catch(() => setTurno(null));
  };
  const cargarHistorial = () => { historialTurnos(tenantId).then(setHistorial).catch(() => setHistorial([])); };
  useEffect(() => { cargarTurno(); }, [tenantId, moneda]);
  useEffect(() => { cargarHistorial(); }, [tenantId]);

  const abrir = async () => {
    setError(null);
    if (!idCajero.trim()) { setError("Indicá quién abre la caja"); return; }
    if (montoBase === "" || Number(montoBase) < 0) { setError("Indicá el monto base de apertura"); return; }
    setAbriendo(true);
    try {
      await abrirTurno(tenantId, { idCajero: idCajero.trim(), montoBase: Number(montoBase), moneda });
      setMontoBase("");
      cargarTurno();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir el turno");
    } finally {
      setAbriendo(false);
    }
  };

  const registrarEgreso = async () => {
    if (!turno) return;
    setError(null);
    if (!montoEgreso || Number(montoEgreso) <= 0) { setError("Indicá el monto del egreso"); return; }
    setRegistrandoEgreso(true);
    try {
      await registrarEgresoTurno(tenantId, turno.id, Number(montoEgreso), conceptoEgreso.trim() || undefined);
      setMontoEgreso(""); setConceptoEgreso("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el egreso");
    } finally {
      setRegistrandoEgreso(false);
    }
  };

  const cerrar = async () => {
    if (!turno) return;
    setError(null);
    if (montoDeclaradoFinal < 0) { setError("Indicá lo contado físicamente en caja"); return; }
    if (!window.confirm(`¿Cerrar el turno con monto declarado de ${montoDeclaradoFinal.toFixed(2)} ${moneda}? Esto genera el Cierre Z y no se puede deshacer.`)) return;
    setCerrando(true);
    try {
      const cerrado = await cerrarTurno(tenantId, turno.id, montoDeclaradoFinal);
      setUltimoCierre(cerrado);
      setMontoDeclarado("");
      setDesgloseArqueo({ usd: "", ves: "", punto: "", pagoMovil: "", zelle: "", cop: "" });
      cargarTurno();
      cargarHistorial();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cerrar el turno");
    } finally {
      setCerrando(false);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-sm text-slate-900 dark:text-white";

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-slate-800 text-xs w-fit">
        {MONEDAS.map((m) => (
          <button key={m} onClick={() => setMoneda(m)} className={`px-4 py-1.5 rounded-full font-bold transition-all cursor-pointer ${moneda === m ? "bg-teal-500 text-slate-950" : "text-slate-600 dark:text-slate-400"}`}>
            {m}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {turno === undefined ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">Cargando…</p>
      ) : turno === null ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">Abrir turno de caja ({moneda})</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs">No hay ninguna caja abierta en {moneda} ahora mismo.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Cajero / Responsable</label>
              <input value={idCajero} onChange={(e) => setIdCajero(e.target.value)} placeholder="Nombre de quien abre" className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Monto base de apertura ({moneda})</label>
              <input value={montoBase} onChange={(e) => setMontoBase(e.target.value)} type="number" step="0.01" placeholder="0.00" className={inputCls} />
            </div>
          </div>
          <button onClick={abrir} disabled={abriendo} className="px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-bold cursor-pointer disabled:opacity-60">
            {abriendo ? "Abriendo…" : "Abrir Caja"}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">Caja abierta ({moneda})</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-300">ABIERTO</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Cajero: {turno.idCajero} · Desde {new Date(turno.fechaApertura).toLocaleString()}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Monto base: {Number(turno.montoBase).toFixed(2)} {moneda}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Registrar Egreso</h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Pago a proveedor, gasto menor u otra salida de dinero de esta caja.</p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-3">
              <input value={montoEgreso} onChange={(e) => setMontoEgreso(e.target.value)} type="number" step="0.01" placeholder={`Monto ${moneda}`} className={inputCls} />
              <input value={conceptoEgreso} onChange={(e) => setConceptoEgreso(e.target.value)} placeholder="Concepto (ej. Pago a proveedor)" className={inputCls} />
            </div>
            <button onClick={registrarEgreso} disabled={registrandoEgreso} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer disabled:opacity-60 border border-slate-300 dark:border-slate-700">
              {registrandoEgreso ? "Registrando…" : "− Registrar Egreso"}
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-amber-500/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Cierre de Caja (Cierre Z)</h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Arqueo a ciegas: contá el dinero físico y declará lo que hay para auditar faltantes o sobrantes.</p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex-shrink-0">
                Arqueo Ciego
              </span>
            </div>

            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs w-fit">
              <button
                type="button"
                onClick={() => setModoArqueo("DESGLOSADO")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  modoArqueo === "DESGLOSADO" ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-300 shadow-sm" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Desglose por Método
              </button>
              <button
                type="button"
                onClick={() => setModoArqueo("DIRECTO")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  modoArqueo === "DIRECTO" ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-300 shadow-sm" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Monto Directo
              </button>
            </div>

            {modoArqueo === "DESGLOSADO" ? (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Anota lo contado en cada método. El arqueo compara solo el efectivo en {moneda}; los pagos electrónicos y las otras monedas quedan como referencia.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1"> Efectivo USD ($)</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value={desgloseArqueo.usd}
                      onChange={(e) => setDesgloseArqueo((prev) => ({ ...prev, usd: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1"> Efectivo Bs</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value={desgloseArqueo.ves}
                      onChange={(e) => setDesgloseArqueo((prev) => ({ ...prev, ves: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1"> Punto de Venta (Bs)</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value={desgloseArqueo.punto}
                      onChange={(e) => setDesgloseArqueo((prev) => ({ ...prev, punto: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1"> Pago Móvil (Bs)</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value={desgloseArqueo.pagoMovil}
                      onChange={(e) => setDesgloseArqueo((prev) => ({ ...prev, pagoMovil: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Zelle / USDT ($)</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value={desgloseArqueo.zelle}
                      onChange={(e) => setDesgloseArqueo((prev) => ({ ...prev, zelle: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1"> Pesos COP</label>
                    <input type="number" step="1" min="0" placeholder="0" value={desgloseArqueo.cop}
                      onChange={(e) => setDesgloseArqueo((prev) => ({ ...prev, cop: e.target.value }))} className={inputCls} />
                  </div>
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Efectivo declarado en {moneda}:</span>
                  <span className="font-mono font-black text-base text-teal-600 dark:text-teal-400">{totalDesgloseCalculado.toFixed(2)} {moneda}</span>
                </div>
              </div>
            ) : (
              <input
                value={montoDeclarado}
                onChange={(e) => setMontoDeclarado(e.target.value)}
                type="number" step="0.01"
                placeholder={`Monto contado total en ${moneda}`}
                className={inputCls}
              />
            )}

            <button onClick={cerrar} disabled={cerrando} className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer disabled:opacity-60 shadow-lg">
              {cerrando ? "Cerrando turno y auditando…" : `Cerrar Turno y Generar Cierre Z (${montoDeclaradoFinal.toFixed(2)} ${moneda})`}
            </button>
          </div>
        </div>
      )}

      {ultimoCierre && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={() => setUltimoCierre(null)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Cierre Z Registrado</h3>
              <button onClick={() => setUltimoCierre(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white cursor-pointer"><IconClose size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500 dark:text-slate-400 text-xs">Esperado</span><div className="font-mono font-bold text-slate-900 dark:text-white">{Number(ultimoCierre.montoEsperado).toFixed(2)} {ultimoCierre.moneda}</div></div>
              <div><span className="text-slate-500 dark:text-slate-400 text-xs">Declarado</span><div className="font-mono font-bold text-slate-900 dark:text-white">{Number(ultimoCierre.montoDeclarado).toFixed(2)} {ultimoCierre.moneda}</div></div>
            </div>
            <div className={`rounded-xl p-3 text-center font-mono font-bold ${
              Number(ultimoCierre.descuadre) === 0 ? "bg-teal-500/15 text-teal-600 dark:text-teal-300"
              : Number(ultimoCierre.descuadre) > 0 ? "bg-sky-500/15 text-sky-600 dark:text-sky-300"
              : "bg-red-500/15 text-red-500"
            }`}>
              {Number(ultimoCierre.descuadre) === 0 ? "Caja cuadrada exacta"
                : Number(ultimoCierre.descuadre) > 0 ? `Sobrante: +${Number(ultimoCierre.descuadre).toFixed(2)} ${ultimoCierre.moneda}`
                : `Faltante: ${Number(ultimoCierre.descuadre).toFixed(2)} ${ultimoCierre.moneda}`}
            </div>
            <button onClick={() => setUltimoCierre(null)} className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {historial && historial.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Historial de Turnos</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 pr-2">Apertura</th>
                  <th className="py-2 px-2">Cajero</th>
                  <th className="py-2 px-2">Moneda</th>
                  <th className="py-2 px-2 text-right">Base</th>
                  <th className="py-2 px-2 text-right">Esperado</th>
                  <th className="py-2 px-2 text-right">Declarado</th>
                  <th className="py-2 pl-2 text-right">Descuadre</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{new Date(t.fechaApertura).toLocaleString()}</td>
                    <td className="py-2 px-2 text-slate-600 dark:text-slate-400">{t.idCajero}</td>
                    <td className="py-2 px-2 text-slate-600 dark:text-slate-400">{t.moneda}</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-slate-400">{Number(t.montoBase).toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-slate-400">{t.montoEsperado != null ? Number(t.montoEsperado).toFixed(2) : "—"}</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-slate-400">{t.montoDeclarado != null ? Number(t.montoDeclarado).toFixed(2) : "—"}</td>
                    <td className={`py-2 pl-2 text-right font-mono font-bold ${
                      t.descuadre == null ? "text-slate-400" : Number(t.descuadre) === 0 ? "text-teal-600 dark:text-teal-400" : "text-red-500"
                    }`}>
                      {t.descuadre != null ? Number(t.descuadre).toFixed(2) : (t.estado === "ABIERTO" ? "Abierto" : "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTE: UTILIDAD REAL POR PRODUCTO (COMERCIO) — no es lo mismo que
// ventas: ventas es el ingreso bruto (lo que ya muestra Arqueo de Caja),
// utilidad es lo que queda después de restar el costo real de cada línea
// vendida. Se calcula solo sobre ventas con costo conocido al momento de
// venderse (ver RepuestosReporteService) — si falta cobertura, se avisa en
// vez de inventar un número.
// ══════════════════════════════════════════════════════════════════════════
function UtilidadComercio() {
  type Preset = "hoy" | "semana" | "mes" | "personalizado";

  const hoyISO = () => fechaLocalISO();
  const rangoPreset = (p: Preset): { desde: string; hasta: string } => {
    const hoy = new Date();
    const hasta = hoyISO();
    if (p === "hoy") return { desde: hasta, hasta };
    if (p === "semana") {
      const d = new Date(hoy);
      d.setDate(d.getDate() - 6);
      return { desde: fechaLocalISO(d), hasta };
    }
    if (p === "mes") {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      return { desde: fechaLocalISO(d), hasta };
    }
    return { desde: hasta, hasta };
  };

  const [preset, setPreset] = useState<Preset>("semana");
  const [rango, setRango] = useState(() => rangoPreset("semana"));
  const [datos, setDatos] = useState<UtilidadPeriodoRepuesto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = (r: { desde: string; hasta: string }) => {
    setCargando(true);
    setError(null);
    obtenerUtilidadRepuestos(r.desde, r.hasta)
      .then(setDatos)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo calcular la utilidad."))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(rango); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const aplicarPreset = (p: Preset) => {
    setPreset(p);
    if (p === "personalizado") return; // espera a que el usuario ajuste las fechas y presione Aplicar
    const r = rangoPreset(p);
    setRango(r);
    cargar(r);
  };

  const fmt = (n: number, moneda = datos?.moneda || "USD") =>
    `${prefijoMoneda(moneda)}${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-5">
      {/* Selector de período */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-slate-800 text-xs w-fit">
          {([["hoy", "Hoy"], ["semana", "7 días"], ["mes", "Este mes"], ["personalizado", "Personalizado"]] as [Preset, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => aplicarPreset(id)}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                preset === id ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-300 shadow-sm" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {preset === "personalizado" && (
          <div className="flex items-center gap-2 text-xs">
            <input type="date" value={rango.desde} max={rango.hasta}
              onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white" />
            <span className="text-slate-400">a</span>
            <input type="date" value={rango.hasta} min={rango.desde} max={hoyISO()}
              onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white" />
            <button onClick={() => cargar(rango)} className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold cursor-pointer">
              Aplicar
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {cargando && !error && (
        <div className="text-center py-16 text-slate-400 text-sm">Calculando utilidad…</div>
      )}

      {!cargando && !error && datos && (
        <>
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ventas del período</div>
              <div className="text-lg font-black text-slate-900 dark:text-white font-mono">{fmt(datos.ventasBrutas)}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Costo de ventas</div>
              <div className="text-lg font-black text-slate-600 dark:text-slate-300 font-mono">{fmt(datos.costoVentas)}</div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Utilidad real</div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{fmt(datos.utilidad)}</div>
              {datos.margenPct !== null && (
                <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">{datos.margenPct.toFixed(1)}% de margen</div>
              )}
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cobertura de costos</div>
              <div className={`text-lg font-black font-mono ${datos.coberturaPct >= 90 ? "text-slate-900 dark:text-white" : "text-amber-500"}`}>
                {datos.coberturaPct.toFixed(0)}%
              </div>
              {datos.coberturaPct < 100 && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400/80 mt-0.5">
                  {datos.coberturaPct === 0 ? "Sin costo conocido en este período" : "Parte de las ventas no tiene costo registrado"}
                </div>
              )}
            </div>
          </div>

          {/* Facturación vs Utilidad — mismos dos números que ya están en las tarjetas
              de arriba, pero en un gráfico para comparar de un vistazo qué tan grande
              es la utilidad real frente a lo facturado (sin costo de venta). */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm mb-4">Facturación vs Utilidad</h4>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart
                data={[
                  { name: "Facturación", valor: datos.ventasBrutas },
                  { name: "Utilidad", valor: datos.utilidad },
                ]}
                layout="vertical"
                margin={{ left: 10, right: 16 }}
              >
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={((v: any) => [fmt(Number(v)), ""]) as any}
                  contentStyle={{ fontSize: 11, borderRadius: 10, background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                  <Cell fill="#0ea5e9" />
                  <Cell fill="#10b981" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top 5 por unidades vendidas y por utilidad — mismo patrón visual que
              Horeca (BarChart horizontal de recharts), reutilizando los mismos datos
              de datos.productos que ya trae RepuestosReporteService, sin pedir nada
              nuevo al backend. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">Top 5 Más Vendidos</h4>
                <span className="text-[11px] text-slate-400">Unidades</span>
              </div>
              {datos.productos.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">Sin ventas en este período.</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={[...datos.productos].sort((a, b) => b.cantidadVendida - a.cantidadVendida).slice(0, 5)}
                    layout="vertical"
                    margin={{ left: 10, right: 16 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="descripcion" width={110} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={((v: any) => [`${v} unidades`, "Vendido"]) as any}
                      contentStyle={{ fontSize: 11, borderRadius: 10, background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                    />
                    <Bar dataKey="cantidadVendida" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">Top 5 Mayor Utilidad</h4>
                <span className="text-[11px] text-slate-400">{datos.moneda}</span>
              </div>
              {datos.productos.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">Sin ventas con costo conocido en este período.</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={datos.productos.slice(0, 5)} layout="vertical" margin={{ left: 10, right: 16 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="descripcion" width={110} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={((v: any) => [fmt(Number(v)), "Utilidad"]) as any}
                      contentStyle={{ fontSize: 11, borderRadius: 10, background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                    />
                    <Bar dataKey="utilidad" fill="#10b981" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Desglose por producto */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wider">Utilidad por producto</h4>
            </div>
            {datos.productos.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No hubo ventas en este período.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Producto</th>
                      <th className="p-3 text-right">Cant. vendida</th>
                      <th className="p-3 text-right">Ventas</th>
                      <th className="p-3 text-right">Utilidad</th>
                      <th className="p-3 text-right">Margen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {datos.productos.map((p) => (
                      <tr key={p.repuestoId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 text-slate-500 dark:text-slate-400">{p.codigoSku}</td>
                        <td className="p-3 font-sans font-semibold text-slate-900 dark:text-white">{p.descripcion}</td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-300">{p.cantidadVendida}</td>
                        <td className="p-3 text-right text-slate-700 dark:text-slate-200">{fmt(p.ventasBrutas, datos.moneda)}</td>
                        <td className={`p-3 text-right font-bold ${p.margenPct === null ? "text-slate-400" : "text-emerald-500"}`}>
                          {p.margenPct === null ? "—" : fmt(p.utilidad, datos.moneda)}
                        </td>
                        <td className="p-3 text-right">
                          {p.margenPct === null ? (
                            <span className="text-slate-400 dark:text-slate-600" title="Ninguna venta de este producto en el período tiene costo conocido">Sin costo</span>
                          ) : (
                            <span className={`font-bold ${p.margenPct < 0 ? "text-rose-400" : p.margenPct < 15 ? "text-amber-400" : "text-emerald-500"}`}>
                              {p.margenPct >= 0 ? "+" : ""}{p.margenPct.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTE: MODAL DE FACTURA DE COMPRA A PROVEEDOR (COMERCIO)
// ══════════════════════════════════════════════════════════════════════════
interface ModalCompraProveedorProps {
  tenantId: number;
  productos: ProductoComercio[];
  proveedores: ProveedorRepuesto[];
  onClose: () => void;
  onCompraExitosa: () => void;
  onNuevoProveedor: (p: ProveedorRepuesto) => void;
}

function ModalCompraProveedorComercio({
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

  // Forma de pago de la factura — de contado por defecto (la mayoría de las
  // compras a proveedor en Comercio se pagan de una vez): el total pagado
  // sale de caja como EGRESO real. Si se cambia a "a crédito", solo se paga
  // lo que el usuario indique (o nada) y el resto queda como Cuenta por
  // Pagar (CXP) — mismo patrón que Registrar Compra de Horeca.
  const [pagoDeContado, setPagoDeContado] = useState(true);
  // Datos de la factura fiscal del proveedor, para el libro de compras (opcional).
  const [facturaFiscal, setFacturaFiscal] = useState(false);
  const [fiscalCompra, setFiscalCompra] = useState({ numeroControl: "", baseImponible: "", montoExento: "", alicuotaIva: "16", montoIva: "", ivaRetenido: "" });
  const [montoPagadoParcial, setMontoPagadoParcial] = useState("");
  const [monedaPago, setMonedaPago] = useState("USD");
  const [diasCredito, setDiasCredito] = useState("");

  interface LineaCompraItem {
    repuestoId: number;
    nombre: string;
    cantidad: string;
    costoUnitario: string;
    precioVenta?: string;
    margenPorcentaje?: number;
  }

  const [lineas, setLineas] = useState<LineaCompraItem[]>([]);
  const [repuestoSelId, setRepuestoSelId] = useState<string>(
    productos.length > 0 && productos[0].backendId ? String(productos[0].backendId) : ""
  );
  const [cantidadInput, setCantidadInput] = useState("10");
  const [costoInput, setCostoInput] = useState("");
  const [precioVentaInput, setPrecioVentaInput] = useState("");
  const [guardandoCompra, setGuardandoCompra] = useState(false);

  // Calculadora "compra a granel": el proveedor cobra por peso/bulto (ej. "8 kg de
  // tornillos") pero el negocio vende y controla stock por unidad (ej. 150 tornillos)
  // — antes el dueño tenía que sacar esa cuenta a mano (costo total ÷ unidades que
  // rinde) y meter el resultado en "Costo Unit." de memoria, con el margen de error
  // que eso implica. Solo calcula y rellena Cantidad/Costo Unit. de arriba; no manda
  // nada al backend por su cuenta.
  const [granelAbierto, setGranelAbierto] = useState(false);
  const [granelCantidadComprada, setGranelCantidadComprada] = useState("");
  const [granelUnidadCompra, setGranelUnidadCompra] = useState("Kg");
  const [granelCostoTotal, setGranelCostoTotal] = useState("");
  const [granelUnidadesResultantes, setGranelUnidadesResultantes] = useState("");

  const granelCostoUnitario = useMemo(() => {
    const unidades = Number(granelUnidadesResultantes);
    const costo = Number(granelCostoTotal);
    if (!unidades || unidades <= 0 || !costo || costo <= 0) return null;
    return costo / unidades;
  }, [granelCostoTotal, granelUnidadesResultantes]);

  const aplicarCalculoGranel = () => {
    if (granelCostoUnitario == null) return;
    setCantidadInput(granelUnidadesResultantes);
    // El costo unitario en el sistema se guarda con 2 decimales — con compras a
    // granel de artículos muy baratos (ej. $10 entre 150 unidades = $0.0667) esos
    // 2 decimales pueden perder algo de precisión frente al costo real por unidad;
    // aceptable para el piloto, no crítico a este volumen de montos.
    setCostoInput(granelCostoUnitario.toFixed(2));
    setGranelAbierto(false);
  };

  // Precargar costo y precio de venta actual al seleccionar producto
  useEffect(() => {
    if (repuestoSelId) {
      const p = productos.find((item) => String(item.backendId) === repuestoSelId);
      if (p) {
        if (p.costo && p.costo > 0 && !costoInput) setCostoInput(String(p.costo));
        if (p.precio && p.precio > 0 && !precioVentaInput) setPrecioVentaInput(String(p.precio));
      }
    }
  }, [repuestoSelId]);

  const handleCambioRepuesto = (nuevoId: string) => {
    setRepuestoSelId(nuevoId);
    const p = productos.find((item) => String(item.backendId) === nuevoId);
    if (p) {
      setCostoInput(p.costo && p.costo > 0 ? String(p.costo) : "");
      setPrecioVentaInput(p.precio && p.precio > 0 ? String(p.precio) : "");
    }
  };

  const aplicarMargen = (pct: number) => {
    const cost = Number(costoInput) || 0;
    if (cost > 0) {
      const nuevoPvp = cost * (1 + pct / 100);
      setPrecioVentaInput(nuevoPvp.toFixed(2));
    }
  };
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Carga de factura por foto (OCR con IA) — mismo endpoint genérico
  // /api/ocr/facturas/extraer que ya usa Aurora Horeca, sin cambios de
  // backend. Solo es una PROPUESTA: nada se agrega a la factura sin pasar
  // por acá y quedar visible/editable en la tabla de ítems antes de guardar.
  const [leyendoFoto, setLeyendoFoto] = useState(false);
  const [avisoOcr, setAvisoOcr] = useState<string | null>(null);
  // Separado de errorMsg a propósito: un fallo leyendo la foto no debe
  // confundirse con un error al registrar la compra — son momentos distintos.
  const [errorOcr, setErrorOcr] = useState<string | null>(null);
  // Nombre que la IA leyó en la foto cuando no coincide con ningún proveedor
  // ya registrado — permite crearlo sin salir de este modal.
  const [proveedorSugerido, setProveedorSugerido] = useState<string | null>(null);
  const inputFotoRef = useRef<HTMLInputElement | null>(null);

  const totalFactura = useMemo(() => {
    return lineas.reduce((acc, l) => acc + (Number(l.cantidad) || 0) * (Number(l.costoUnitario) || 0), 0);
  }, [lineas]);

  const handleAgregarLinea = () => {
    const rId = Number(repuestoSelId);
    const prod = productos.find((p) => p.backendId === rId);
    if (!prod || !rId) return;
    const cant = Number(cantidadInput) || 1;
    const cost = Number(costoInput) || prod.costo || 0;
    const pvp = Number(precioVentaInput) || prod.precio || 0;
    const margen = cost > 0 && pvp > 0 ? ((pvp - cost) / cost) * 100 : undefined;

    setLineas((prev) => [
      ...prev,
      {
        repuestoId: rId,
        nombre: prod.nombre,
        cantidad: String(cant),
        costoUnitario: String(cost),
        precioVenta: pvp > 0 ? String(pvp) : undefined,
        margenPorcentaje: margen,
      },
    ]);
    setCostoInput("");
    setPrecioVentaInput("");
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

  // Busca el producto cuyo nombre o código más se acerque a la descripción
  // leída por la IA — coincidencia simple por inclusión de texto, nunca
  // exacta (la IA transcribe con variaciones de tildes/mayúsculas/abreviaturas).
  const buscarProductoPorDescripcion = (descripcion: string) => {
    const q = descripcion.trim().toLowerCase();
    if (!q) return null;
    return (
      productos.find((p) => p.nombre.toLowerCase() === q) ||
      productos.find((p) => p.nombre.toLowerCase().includes(q) || q.includes(p.nombre.toLowerCase())) ||
      productos.find((p) => p.codigo.toLowerCase() === q) ||
      null
    );
  };

  const subirFotoFactura = async (file: File) => {
    setLeyendoFoto(true);
    setErrorOcr(null);
    setAvisoOcr(null);
    try {
      const archivoOptimizado = await comprimirImagenFactura(file);
      const datos: FacturaExtraidaOcr = await extraerFacturaOcr(archivoOptimizado);

      if (datos.numeroFactura) setNumeroFactura(datos.numeroFactura);

      if (datos.proveedor) {
        const pNombre = datos.proveedor.trim().toLowerCase();
        const match = proveedores.find(
          (p) => p.nombre.toLowerCase() === pNombre || p.nombre.toLowerCase().includes(pNombre) || pNombre.includes(p.nombre.toLowerCase())
        );
        if (match) {
          setProveedorSelId(String(match.id));
          setProveedorSugerido(null);
        } else {
          setProveedorSugerido(datos.proveedor.trim());
        }
      }

      let vinculados = 0;
      let sinCoincidencia = 0;
      const nuevasLineas: LineaCompraItem[] = [];
      for (const it of datos.items || []) {
        if (!it.descripcion) continue;
        const encontrado = buscarProductoPorDescripcion(it.descripcion);
        if (encontrado && encontrado.backendId) {
          vinculados++;
          const cUnit = it.precioUnitario ?? encontrado.costo ?? 0;
          const pv = encontrado.precio ?? 0;
          const margenOcr = cUnit > 0 && pv > 0 ? ((pv - cUnit) / cUnit) * 100 : undefined;
          nuevasLineas.push({
            repuestoId: encontrado.backendId,
            nombre: encontrado.nombre,
            cantidad: it.cantidad ? String(it.cantidad) : "1",
            costoUnitario: String(cUnit),
            precioVenta: pv > 0 ? String(pv) : undefined,
            margenPorcentaje: margenOcr,
          });
        } else {
          sinCoincidencia++;
        }
      }
      if (nuevasLineas.length > 0) setLineas((prev) => [...prev, ...nuevasLineas]);

      if (vinculados === 0 && sinCoincidencia === 0) {
        setErrorOcr("La foto no arrojó ítems legibles — cárgalos manualmente o probá con una foto más clara.");
      } else {
        setAvisoOcr(
          `Se leyeron ${vinculados + sinCoincidencia} ítems de la factura. ${vinculados} se agregaron automáticamente por coincidir con tu inventario.` +
          (sinCoincidencia > 0
            ? ` ${sinCoincidencia} no coinciden con ningún producto existente — agrégalos manualmente abajo eligiendo el artículo correcto, o créalos primero desde Inventario.`
            : "") +
          " Revisa cantidades y costos antes de procesar la factura."
        );
      }
    } catch (e) {
      setErrorOcr(e instanceof Error ? e.message : "No se pudo leer la factura");
    } finally {
      setLeyendoFoto(false);
      if (inputFotoRef.current) inputFotoRef.current.value = "";
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
      const montoPagadoAhora = pagoDeContado
        ? totalFactura
        : (montoPagadoParcial ? Number(montoPagadoParcial) : undefined);
      await registrarCompraRepuesto(tenantId, {
        proveedorId: Number(proveedorSelId),
        numeroFactura: numeroFactura.trim(),
        items: lineas.map((l) => ({
          repuestoId: l.repuestoId,
          cantidad: Number(l.cantidad),
          costoUnitario: Number(l.costoUnitario),
          precioVenta: l.precioVenta ? Number(l.precioVenta) : undefined,
        })),
        montoPagadoAhora: montoPagadoAhora && montoPagadoAhora > 0 ? montoPagadoAhora : undefined,
        monedaPago: montoPagadoAhora && montoPagadoAhora > 0 ? monedaPago : undefined,
        diasCredito: !pagoDeContado && diasCredito ? Number(diasCredito) : undefined,
        ...(facturaFiscal ? {
          numeroControl: fiscalCompra.numeroControl.trim() || undefined,
          baseImponible: Number(fiscalCompra.baseImponible) || 0,
          montoExento: Number(fiscalCompra.montoExento) || 0,
          alicuotaIva: Number(fiscalCompra.alicuotaIva) || 0,
          montoIva: Number(fiscalCompra.montoIva) || 0,
          ivaRetenido: Number(fiscalCompra.ivaRetenido) || 0,
        } : {}),
      });
      onCompraExitosa();
    } catch (err: any) {
      setErrorMsg(err.message || "Error registrando compra en el servidor");
    } finally {
      setGuardandoCompra(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase">Entrada de Almacén</span>
            <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white mt-1">Factura de Compra a Proveedor</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Incrementa stock, actualiza costo unitario y deja asiento en Kárdex.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white cursor-pointer"><IconClose size={18} /></button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5">
            <IconWarning size={13} className="flex-shrink-0" /> {errorMsg}
          </div>
        )}

        {/* Carga de factura por foto (OCR con IA) */}
        <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-300/70 dark:border-slate-700/60 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) subirFotoFactura(f); }}
            />
            <button
              type="button"
              onClick={() => inputFotoRef.current?.click()}
              disabled={leyendoFoto}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-bold text-xs cursor-pointer shadow-md"
            >
              <IconFileText size={14} />
              {leyendoFoto ? "Leyendo factura..." : "Cargar con foto de la factura"}
            </button>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Sube una foto o PDF y Aurora completa proveedor, ítems y costos — siempre revisa antes de procesar.</span>
          </div>
          {avisoOcr && <p className="text-[11px] text-teal-600 dark:text-teal-400">{avisoOcr}</p>}
          {errorOcr && <p className="text-[11px] text-red-500">{errorOcr}</p>}
          {proveedorSugerido && (
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="text-amber-600 dark:text-amber-400">
                La foto dice "<strong>{proveedorSugerido}</strong>" — no está registrado todavía.
              </span>
              <button
                type="button"
                onClick={() => {
                  setNuevoProvModal(true);
                  setNombreNuevoProv(proveedorSugerido);
                  setProveedorSugerido(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
              >
                + Crear proveedor "{proveedorSugerido}"
              </button>
            </div>
          )}
        </div>

        {/* Proveedor y Factura */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Proveedor</label>
              <button
                type="button"
                onClick={() => setNuevoProvModal(!nuevoProvModal)}
                className="text-[10px] text-cyan-400 font-bold hover:underline cursor-pointer"
              >
                + Nuevo Proveedor
              </button>
            </div>
            {nuevoProvModal ? (
              <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 space-y-2">
                <input
                  placeholder="Nombre de la Distribuidora / Proveedor"
                  value={nombreNuevoProv}
                  onChange={(e) => setNombreNuevoProv(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                />
                <input
                  placeholder="RIF / Cédula (ej. J-12345678-0)"
                  value={rifNuevoProv}
                  onChange={(e) => setRifNuevoProv(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono"
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
                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <select
                value={proveedorSelId}
                onChange={(e) => setProveedorSelId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold"
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
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Nº Factura / Control</label>
            <input
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              placeholder="FAC-000123"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold"
            />
          </div>
        </div>

        {/* Agregar ítems a la factura con fijación de Precio de Venta y Margen de Ganancia */}
        <div className="p-3.5 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-300/70 dark:border-slate-700/60 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Añadir Ítems:</div>
            {Number(costoInput) > 0 && Number(precioVentaInput) > 0 && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Ganancia estimada:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                  (Number(precioVentaInput) - Number(costoInput)) >= 0
                    ? "bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30"
                    : "bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30"
                }`}>
                  {(Number(precioVentaInput) - Number(costoInput)) >= 0 ? "+" : ""}${(Number(precioVentaInput) - Number(costoInput)).toFixed(2)} / und ({((Number(precioVentaInput) - Number(costoInput)) / Number(costoInput) * 100).toFixed(1)}% margen)
                </span>
              </div>
            )}
          </div>

          {/* ── Calculadora de compra a granel (peso/bulto → costo por unidad) ── */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setGranelAbierto((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/70"
            >
              <span>¿Compraste a granel? (ej. 8 Kg que rinden 150 unidades) — calcular costo por unidad</span>
              <span className="text-slate-400">{granelAbierto ? "Ocultar" : "Mostrar"}</span>
            </button>
            {granelAbierto && (
              <div className="p-3 pt-1 grid grid-cols-2 sm:grid-cols-4 gap-2 items-end border-t border-slate-200 dark:border-slate-700/60">
                <div>
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 block mb-0.5">Cant. comprada</label>
                  <input type="number" step="0.01" placeholder="8" value={granelCantidadComprada} onChange={(e) => setGranelCantidadComprada(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 block mb-0.5">Unidad de compra</label>
                  <input type="text" placeholder="Kg, Bulto, Caja…" value={granelUnidadCompra} onChange={(e) => setGranelUnidadCompra(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 block mb-0.5">Costo total pagado ($)</label>
                  <input type="number" step="0.01" placeholder="10.00" value={granelCostoTotal} onChange={(e) => setGranelCostoTotal(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 block mb-0.5">Unidades que rinde</label>
                  <input type="number" step="1" placeholder="150" value={granelUnidadesResultantes} onChange={(e) => setGranelUnidadesResultantes(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono" />
                </div>
                <div className="col-span-2 sm:col-span-4 flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {granelCostoUnitario != null
                      ? <>Costo por unidad: <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{SIM()}{granelCostoUnitario.toFixed(4)}</span> ({granelCantidadComprada || "?"} {granelUnidadCompra} → {granelUnidadesResultantes} unidades)</>
                      : "Completa costo total y unidades que rinde para calcular"}
                  </span>
                  <button
                    type="button"
                    disabled={granelCostoUnitario == null}
                    onClick={aplicarCalculoGranel}
                    className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-[11px] cursor-pointer shrink-0"
                  >
                    Usar este cálculo
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
            <div className="sm:col-span-4">
              <label className="text-[9px] text-slate-500 dark:text-slate-400 block mb-0.5">Artículo</label>
              <select
                value={repuestoSelId}
                onChange={(e) => handleCambioRepuesto(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
              >
                {productos.map((p) => (
                  <option key={p.id} value={p.backendId || ""}>
                    {p.codigo} - {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[9px] text-slate-500 dark:text-slate-400 block mb-0.5">Cantidad</label>
              <input
                type="number"
                step="0.01"
                value={cantidadInput}
                onChange={(e) => setCantidadInput(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[9px] text-slate-500 dark:text-slate-400 block mb-0.5">Costo Unit. ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={costoInput}
                onChange={(e) => setCostoInput(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[9px] text-teal-600 dark:text-teal-400 font-bold block mb-0.5">PVP Venta ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={precioVentaInput}
                onChange={(e) => setPrecioVentaInput(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-teal-400/60 dark:border-teal-500/60 text-slate-900 dark:text-white text-xs font-mono font-bold"
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

          {/* Atajos rápidos de margen de ganancia */}
          <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/50">
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Margen rápido:</span>
            {[20, 30, 40, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => aplicarMargen(pct)}
                disabled={!costoInput || Number(costoInput) <= 0}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-200/80 hover:bg-teal-500 hover:text-slate-950 dark:bg-slate-700/70 dark:hover:bg-teal-500 dark:hover:text-slate-950 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-30 cursor-pointer"
                title={`Calcular precio de venta con ${pct}% de ganancia sobre costo`}
              >
                +{pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de ítems agregados */}
        <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-2.5">Ítem</th>
                <th className="p-2.5 text-right">Cant.</th>
                <th className="p-2.5 text-right">Costo Unit.</th>
                <th className="p-2.5 text-right">Subtotal Costo</th>
                <th className="p-2.5 text-right">PVP Venta</th>
                <th className="p-2.5 text-right">% Margen</th>
                <th className="p-2.5 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
              {lineas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-500 dark:text-slate-400 font-sans">
                    Añade al menos un producto para procesar la entrada de almacén.
                  </td>
                </tr>
              ) : (
                lineas.map((l, idx) => {
                  const costoNum = Number(l.costoUnitario) || 0;
                  const pvNum = l.precioVenta ? Number(l.precioVenta) : 0;
                  const ganancia = pvNum > 0 && costoNum > 0 ? (pvNum - costoNum) : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-sans font-semibold text-slate-900 dark:text-white">{l.nombre}</td>
                      <td className="p-2.5 text-right font-bold text-teal-600 dark:text-teal-300">{l.cantidad}</td>
                      <td className="p-2.5 text-right">{SIM()}{costoNum.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">{SIM()}{((Number(l.cantidad) || 0) * costoNum).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                        {pvNum > 0 ? `${SIM()}${pvNum.toFixed(2)}` : "—"}
                      </td>
                      <td className="p-2.5 text-right">
                        {l.margenPorcentaje !== undefined ? (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            l.margenPorcentaje >= 0
                              ? "bg-teal-500/20 text-teal-700 dark:text-teal-300"
                              : "bg-red-500/20 text-red-600 dark:text-red-300"
                          }`}>
                            {l.margenPorcentaje >= 0 ? "+" : ""}{l.margenPorcentaje.toFixed(1)}% (+{SIM()}{ganancia.toFixed(2)})
                          </span>
                        ) : "—"}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => setLineas((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-300 cursor-pointer"
                          title="Eliminar ítem"
                        >
                          <IconTrash size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Factura fiscal del proveedor — solo alimenta el libro de compras; no cambia stock ni pagos */}
        {!modoEuro() && (
          <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-300/70 dark:border-slate-700/60 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox" checked={facturaFiscal} className="w-4 h-4 accent-teal-600 cursor-pointer"
                onChange={(e) => {
                  setFacturaFiscal(e.target.checked);
                  if (e.target.checked && !fiscalCompra.baseImponible && totalFactura > 0) {
                    const alic = Number(fiscalCompra.alicuotaIva) || 0;
                    setFiscalCompra((f) => ({ ...f, baseImponible: totalFactura.toFixed(2), montoIva: (totalFactura * alic / 100).toFixed(2) }));
                  }
                }}
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Es factura fiscal con IVA (va al libro de compras)</span>
            </label>
            {facturaFiscal && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  N° de control
                  <input
                    type="text" value={fiscalCompra.numeroControl} placeholder="00-000123"
                    onChange={(e) => setFiscalCompra((f) => ({ ...f, numeroControl: e.target.value }))}
                    className="mt-1 w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </label>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  Base imponible
                  <input
                    type="number" value={fiscalCompra.baseImponible} placeholder="0.00"
                    onChange={(e) => setFiscalCompra((f) => ({ ...f, baseImponible: e.target.value }))}
                    className="mt-1 w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </label>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  Exento
                  <input
                    type="number" value={fiscalCompra.montoExento} placeholder="0.00"
                    onChange={(e) => setFiscalCompra((f) => ({ ...f, montoExento: e.target.value }))}
                    className="mt-1 w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </label>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  Alícuota %
                  <input
                    type="number" value={fiscalCompra.alicuotaIva} placeholder="16"
                    onChange={(e) => setFiscalCompra((f) => ({ ...f, alicuotaIva: e.target.value }))}
                    className="mt-1 w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </label>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  IVA
                  <input
                    type="number" value={fiscalCompra.montoIva} placeholder="0.00"
                    onChange={(e) => setFiscalCompra((f) => ({ ...f, montoIva: e.target.value }))}
                    className="mt-1 w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </label>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  IVA retenido
                  <input
                    type="number" value={fiscalCompra.ivaRetenido} placeholder="0.00"
                    onChange={(e) => setFiscalCompra((f) => ({ ...f, ivaRetenido: e.target.value }))}
                    className="mt-1 w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </label>
                <p className="col-span-2 sm:col-span-3 text-[10.5px] text-slate-500 dark:text-slate-400">
                  Copia los montos tal como están en la factura del proveedor, en {CODIGO()}. El libro los pasa a bolívares con la tasa BCV del día.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Forma de pago — de contado (sale de caja como EGRESO) o a crédito (Cuenta por Pagar) */}
        <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-300/70 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPagoDeContado(true)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                pagoDeContado ? "bg-teal-500 text-slate-950 shadow-md" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              De Contado (se descuenta de Caja)
            </button>
            <button
              type="button"
              onClick={() => setPagoDeContado(false)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                !pagoDeContado ? "bg-amber-500 text-slate-950 shadow-md" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              A Crédito (Cuenta por Pagar)
            </button>
          </div>
          {pagoDeContado ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Se registrará un egreso de caja por</span>
              <span className="text-xs font-mono font-black text-teal-500 dark:text-teal-400">{SIM()}{totalFactura.toFixed(2)}</span>
              <select value={monedaPago} onChange={(e) => setMonedaPago(e.target.value)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-[11px] font-bold">
                {(modoEuro() ? ["USD"] : ["USD", "VES", "COP"]).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] text-slate-500 dark:text-slate-400 block mb-0.5">Abono ahora (opcional)</label>
                <input type="number" step="0.01" placeholder="0.00" value={montoPagadoParcial} onChange={(e) => setMontoPagadoParcial(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono" />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 dark:text-slate-400 block mb-0.5">Moneda del abono</label>
                <select value={monedaPago} onChange={(e) => setMonedaPago(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold">
                  {(modoEuro() ? ["USD"] : ["USD", "VES", "COP"]).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-slate-500 dark:text-slate-400 block mb-0.5">Días de crédito</label>
                <input type="number" placeholder="Ej. 15" value={diasCredito} onChange={(e) => setDiasCredito(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono" />
              </div>
            </div>
          )}
        </div>

        {/* Resumen Total y Botón Procesar */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Factura:</span>
            <div className="font-mono font-black text-xl text-teal-400">{SIM()}{totalFactura.toFixed(2)} USD</div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
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

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTE: MODAL ALTA / EDICIÓN DE PROVEEDOR (COMERCIO)
// Formulario dedicado de la pestaña "Proveedores" — el modal de compra sigue
// teniendo su propio alta rápida ("+ Nuevo Proveedor" inline) para no
// interrumpir el flujo de facturación; este es el alta completa con todos
// los campos de contacto, para cuando el proveedor llega en persona o llama
// por teléfono sin factura que escanear todavía.
// ══════════════════════════════════════════════════════════════════════════
function ModalFormularioProveedorComercio({
  tenantId,
  proveedor,
  onClose,
  onGuardado,
}: {
  tenantId: number;
  proveedor?: ProveedorRepuesto;
  onClose: () => void;
  onGuardado: (p: ProveedorRepuesto) => void;
}) {
  const [nombre, setNombre] = useState(proveedor?.nombre || "");
  const [rif, setRif] = useState(proveedor?.rif || "");
  const [telefono, setTelefono] = useState(proveedor?.telefono || "");
  const [contacto, setContacto] = useState(proveedor?.contacto || "");
  const [direccion, setDireccion] = useState(proveedor?.direccion || "");
  const [activo, setActivo] = useState(proveedor?.activo ?? true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esEdicion = !!proveedor;

  const guardar = async () => {
    if (!nombre.trim()) {
      setError("El nombre del proveedor es obligatorio");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const datos = {
        nombre: nombre.trim(),
        rif: rif.trim() || undefined,
        telefono: telefono.trim() || undefined,
        contacto: contacto.trim() || undefined,
        direccion: direccion.trim() || undefined,
        activo,
      };
      const resultado = esEdicion
        ? await actualizarProveedorRepuesto(proveedor!.id, datos)
        : await crearProveedorRepuesto(tenantId, datos);
      onGuardado(resultado);
    } catch (err: any) {
      setError(err.message || "No se pudo guardar el proveedor");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase">Proveedores</span>
            <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white mt-1">
              {esEdicion ? "Editar Proveedor" : "Nuevo Proveedor"}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white cursor-pointer"><IconClose size={18} /></button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5">
            <IconWarning size={13} className="flex-shrink-0" /> {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Nombre / Razón Social *</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre de la Distribuidora / Proveedor"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">RIF / Cédula</label>
              <input
                value={rif}
                onChange={(e) => setRif(e.target.value)}
                placeholder="J-12345678-0"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Teléfono</label>
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="0414-1234567"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Persona de Contacto</label>
            <input
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              placeholder="Nombre de quien atiende los pedidos"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Dirección</label>
            <input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Dirección de despacho / oficina"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
            />
          </div>
          {esEdicion && (
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="rounded" />
              Proveedor activo
            </label>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
          >
            {guardando ? "Guardando..." : esEdicion ? "Guardar Cambios" : "Registrar Proveedor"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTE: MODAL FICHA DE PROVEEDOR — datos de contacto + historial
// completo de compras a ese proveedor (mismo espíritu que ModalDetalleProveedor
// de Aurora Horeca). El historial ya llega filtrado desde ComercioApp (misma
// lista comprasRepuesto que alimenta "Compras & Proveedores" en Inventario).
// ══════════════════════════════════════════════════════════════════════════
function ModalDetalleProveedorComercio({
  proveedor,
  compras,
  onClose,
  onActualizado,
}: {
  proveedor: ProveedorRepuesto;
  compras: CompraRepuesto[];
  onClose: () => void;
  onActualizado: (p: ProveedorRepuesto) => void;
}) {
  const [editando, setEditando] = useState(false);

  const totalComprado = compras.reduce((acc, c) => acc + (c.total || 0), 0);
  const ultimaCompra = compras.length > 0
    ? [...compras].sort((a, b) => new Date(b.fechaCompra).getTime() - new Date(a.fechaCompra).getTime())[0]
    : null;
  // Producto que más se le compra a este proveedor (por unidades) — para saber
  // qué es lo que de verdad se abastece de él, no solo cuánto se le ha pagado.
  const productoMasComprado = (() => {
    const acc: Record<string, number> = {};
    for (const c of compras) for (const it of c.items || []) {
      const nombre = it.repuesto?.descripcion || "—";
      acc[nombre] = (acc[nombre] || 0) + Number(it.cantidad);
    }
    const entradas = Object.entries(acc);
    return entradas.length > 0 ? entradas.sort((a, b) => b[1] - a[1])[0][0] : null;
  })();

  if (editando) {
    return (
      <ModalFormularioProveedorComercio
        tenantId={proveedor.tenantId}
        proveedor={proveedor}
        onClose={() => setEditando(false)}
        onGuardado={(actualizado) => {
          setEditando(false);
          onActualizado(actualizado);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col cursor-default" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="min-w-0">
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
              proveedor.activo ? "bg-teal-500/20 text-teal-600 dark:text-teal-400" : "bg-slate-400/20 text-slate-500 dark:text-slate-400"
            }`}>
              {proveedor.activo ? "Proveedor Activo" : "Proveedor Inactivo"}
            </span>
            <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white mt-1 truncate">{proveedor.nombre}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{proveedor.rif || "Sin RIF registrado"}</p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white cursor-pointer"><IconClose size={18} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs flex-shrink-0">
          <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Contacto</div>
            <div className="text-slate-700 dark:text-slate-200 font-semibold">{proveedor.contacto || "—"}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Teléfono</div>
            <div className="text-slate-700 dark:text-slate-200 font-semibold font-mono">{proveedor.telefono || "—"}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 col-span-2">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Dirección</div>
            <div className="text-slate-700 dark:text-slate-200 font-semibold">{proveedor.direccion || "—"}</div>
          </div>
          {compras.length > 0 && (
            <>
              <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40">
                <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Última compra</div>
                <div className="text-slate-700 dark:text-slate-200 font-semibold font-mono">{ultimaCompra ? new Date(ultimaCompra.fechaCompra).toLocaleDateString("es-VE") : "—"}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40">
                <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Producto que más se le compra</div>
                <div className="text-slate-700 dark:text-slate-200 font-semibold truncate" title={productoMasComprado || "—"}>{productoMasComprado || "—"}</div>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Historial de Compras</span>
            <span className="text-xs font-mono font-black text-teal-500 dark:text-teal-400">{SIM()}{totalComprado.toFixed(2)} total</span>
          </div>
          {compras.length === 0 ? (
            <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs rounded-xl bg-slate-100/60 dark:bg-slate-800/40">
              Sin compras registradas a este proveedor todavía.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Fecha</th>
                    <th className="p-2.5">N° Factura</th>
                    <th className="p-2.5 text-right">Ítems</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                  {compras.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 text-[11px]">{new Date(c.fechaCompra).toLocaleDateString()}</td>
                      <td className="p-2.5">{c.numeroFactura || "—"}</td>
                      <td className="p-2.5 text-right">{c.items?.length ?? "—"}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">{SIM()}{c.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
          >
            <IconEdit size={13} /> Editar Proveedor
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTE: MODAL IMPORTACIÓN MASIVA DE INVENTARIO (COMERCIO)
// Mismo patrón que ModalImportarInventario de Aurora Horeca (SheetJS parsea
// el Excel/CSV en el navegador, el backend hace upsert por SKU) — adaptado a
// las columnas reales que existe en RepuestoItem (codigoSku/descripcion/
// unidadBase, sin "categoría": ese campo es solo cosmético en el frontend de
// Comercio y no tiene columna en el backend, así que no se ofrece acá para no
// prometer una carga que después se descarta en silencio).
// ══════════════════════════════════════════════════════════════════════════
function ModalImportarInventarioComercio({
  tenantId,
  onClose,
  onImportado,
}: {
  tenantId: number;
  onClose: () => void;
  onImportado: () => void;
}) {
  const ALIAS: Record<string, string[]> = {
    codigoSku: ["sku", "codigo"],
    descripcion: ["nombre", "producto", "descripcion", "articulo"],
    unidadBase: ["unidad de medida", "unidad", "und", "um"],
    costoUnitario: ["costo unitario", "costo", "precio costo"],
    precioVenta: ["precio de venta", "precio venta", "precio", "pvp", "precio publico"],
    stockInicial: ["stock inicial", "stock", "cantidad", "existencia"],
  };
  const normalizar = (s: string) => s.toString().trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [filas, setFilas] = useState<ItemImportacionRepuesto[] | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacionRepuestos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const procesarArchivo = async (file: File) => {
    setError(null);
    setResultado(null);
    setFilas(null);
    setArchivo(file);
    try {
      const buffer = await file.arrayBuffer();
      const libro = XLSX.read(buffer, { type: "array" });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      const filasCrudas: Record<string, unknown>[] = XLSX.utils.sheet_to_json(hoja, { defval: "" });
      if (filasCrudas.length === 0) { setError("El archivo no tiene filas de datos"); return; }

      const encabezados = Object.keys(filasCrudas[0]);
      const columna: Record<string, string> = {};
      for (const [campo, alias] of Object.entries(ALIAS)) {
        const encontrada = encabezados.find((h) => alias.includes(normalizar(h)));
        if (encontrada) columna[campo] = encontrada;
      }
      if (!columna.codigoSku || !columna.descripcion) {
        setError('El archivo debe tener al menos columnas "SKU" y "Nombre" en la primera fila.');
        return;
      }

      const procesadas: ItemImportacionRepuesto[] = filasCrudas
        .map((fila) => ({
          codigoSku: String(fila[columna.codigoSku] ?? "").trim(),
          descripcion: String(fila[columna.descripcion] ?? "").trim(),
          unidadBase: columna.unidadBase ? String(fila[columna.unidadBase] ?? "").trim() || undefined : undefined,
          costoUnitario: columna.costoUnitario && fila[columna.costoUnitario] !== "" ? Number(fila[columna.costoUnitario]) : undefined,
          precioVenta: columna.precioVenta && fila[columna.precioVenta] !== "" ? Number(fila[columna.precioVenta]) : undefined,
          stockInicial: columna.stockInicial && fila[columna.stockInicial] !== "" ? Number(fila[columna.stockInicial]) : undefined,
        }))
        .filter((f) => f.codigoSku && f.descripcion);

      if (procesadas.length === 0) {
        setError("Ninguna fila tiene SKU y Nombre completos — revisa el archivo.");
        return;
      }
      setFilas(procesadas);
    } catch {
      setError("No se pudo leer el archivo — verifica que sea un .xlsx, .xls o .csv válido.");
    }
  };

  const confirmarImportacion = async () => {
    if (!filas || filas.length === 0) return;
    setProcesando(true);
    setError(null);
    try {
      const res = await importarRepuestosLote(tenantId, filas);
      setResultado(res);
      onImportado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo importar el archivo");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase">Inventario</span>
            <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white mt-1">Importar Inventario desde Excel/CSV</h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <IconClose size={18} />
          </button>
        </div>

        {!resultado && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(e) => {
                e.preventDefault(); setArrastrando(false);
                const file = e.dataTransfer.files?.[0];
                if (file) procesarArchivo(file);
              }}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                arrastrando ? "border-teal-500 bg-teal-500/10" : "border-slate-300 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500"
              }`}
            >
              <div className="flex justify-center mb-2 text-slate-400"><IconDownload size={28} /></div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {archivo ? archivo.name : "Arrastra tu archivo aquí o haz click para elegirlo"}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">.xlsx, .xls o .csv — columnas: SKU, Nombre, Unidad, Costo, Precio de Venta, Stock Inicial</p>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) procesarArchivo(f); }} />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5">
                <IconWarning size={13} className="flex-shrink-0" /> {error}
              </div>
            )}

            {filas && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{filas.length} fila{filas.length === 1 ? "" : "s"} detectada{filas.length === 1 ? "" : "s"} — vista previa:</p>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto">
                  <table className="w-full text-[11px] font-mono">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                      <tr className="text-left uppercase text-[10px]">
                        <th className="py-1.5 px-2">SKU</th><th className="py-1.5 px-2 font-sans">Nombre</th><th className="py-1.5 px-2">Unidad</th>
                        <th className="py-1.5 px-2 text-right">Costo</th><th className="py-1.5 px-2 text-right">Precio venta</th><th className="py-1.5 px-2 text-right">Stock inicial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                      {filas.slice(0, 8).map((f, i) => (
                        <tr key={i}>
                          <td className="py-1.5 px-2">{f.codigoSku}</td>
                          <td className="py-1.5 px-2 font-sans">{f.descripcion}</td>
                          <td className="py-1.5 px-2">{f.unidadBase || "—"}</td>
                          <td className="py-1.5 px-2 text-right">{f.costoUnitario ?? "—"}</td>
                          <td className="py-1.5 px-2 text-right">{f.precioVenta ?? "—"}</td>
                          <td className="py-1.5 px-2 text-right">{f.stockInicial ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filas.length > 8 && <p className="text-[10px] text-slate-400 dark:text-slate-500">…y {filas.length - 8} filas más.</p>}
                <button onClick={confirmarImportacion} disabled={procesando}
                  className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black text-sm cursor-pointer shadow-lg">
                  {procesando ? "Importando..." : `Importar ${filas.length} artículo${filas.length === 1 ? "" : "s"}`}
                </button>
              </div>
            )}

            <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar y Salir
              </button>
            </div>
          </>
        )}

        {resultado && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0"><IconCheckCircle size={22} /></div>
              <div>
                <div className="font-['Outfit'] font-bold text-slate-900 dark:text-white">Importación completada</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {resultado.creados} creado{resultado.creados === 1 ? "" : "s"} · {resultado.actualizados} actualizado{resultado.actualizados === 1 ? "" : "s"}
                  {resultado.errores.length > 0 ? ` · ${resultado.errores.length} con error` : ""}
                </div>
              </div>
            </div>
            {resultado.errores.length > 0 && (
              <div className="max-h-32 overflow-y-auto bg-red-500/5 border border-red-500/20 rounded-xl p-3 space-y-1">
                {resultado.errores.map((e, i) => (
                  <p key={i} className="text-[11px] text-red-500">Fila {e.fila}: {e.motivo}</p>
                ))}
              </div>
            )}
            <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

