import AsistenteIaModal from "./AsistenteIaModal";
import ModalCatalogoQR from "./ModalCatalogoQR";
import PedidosWebPanel, { type PedidoWeb } from "./PedidosWebPanel";
import BitacoraAuditoria from "./BitacoraAuditoria";
import { useState, useMemo, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  IconHardware, IconPrescription, IconRetail, IconCard, IconSearch, IconTrash,
  IconCheck, IconWarning, IconClose, IconUsers, IconFileText, IconHourglass,
  IconDownload, IconRefresh, IconCheckCircle, IconBank, IconChart, IconBox, IconLock,
  IconSettings, IconCoins, IconEdit, IconShoppingBag, IconTruck,
} from "../Icons";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import { useBarcodeScanner, decodificarCodigoPesado } from "../hooks/useBarcodeScanner";
import { comprimirImagenFactura } from "../utils/imageCompression";
import {
  listarRepuestos,
  crearRepuesto,
  actualizarRepuesto,
  eliminarRepuesto,
  ajustarStockRepuesto,
  listarPresentacionesRepuesto,
  crearPresentacionRepuesto,
  despacharPorPresentacion,
  venderRepuestoPorVolumen,
  historialMovimientosRepuesto,
  listarProveedoresRepuesto,
  crearProveedorRepuesto,
  actualizarProveedorRepuesto,
  listarComprasRepuesto,
  registrarCompraRepuesto,
  importarRepuestosLote,
  extraerFacturaOcr,
  listarMovimientos, registrarMovimiento,
  abrirTurno,
  turnoAbierto,
  historialTurnos,
  registrarEgresoTurno,
  cerrarTurno,
  tasaVigente, actualizarTasa, actualizarTasaExternaTenant, ApiError,
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
} from "../api";

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
  // Ferretería & Repuestos
  { id: "f-1", codigo: "TORN-38", nombre: "Tornillo Drywall 6x1\" (Caja 100u)", categoria: "Tornillería", rubro: "ferreteria", precio: 2.80, costo: 1.50, stock: 45, stockMinimo: 10, unidadMedida: "Caja", ubicacion: "Pasillo 1 - Gaveta 4", codigoParte: "DW-61" },
  { id: "f-2", codigo: "TAL-20V", nombre: "Taladro Percutor Inalámbrico 20V", categoria: "Herramientas", rubro: "ferreteria", precio: 68.00, costo: 45.00, stock: 8, stockMinimo: 3, unidadMedida: "Pza", ubicacion: "Vitrina Central", marca: "DeWalt / Ingco" },
  { id: "f-3", codigo: "CAB-THW12", nombre: "Cable Eléctrico 7 Hilos THW #12 (Metro)", categoria: "Eléctrico", rubro: "ferreteria", precio: 0.95, costo: 0.60, stock: 320, stockMinimo: 50, unidadMedida: "Metro", ubicacion: "Bobina 3" },
  { id: "f-4", codigo: "TUB-PVC4", nombre: "Tubo PVC Aguas Negras 4\" x 3 Mts", categoria: "Plomería", rubro: "ferreteria", precio: 9.50, costo: 6.50, stock: 24, stockMinimo: 5, unidadMedida: "Tubo", ubicacion: "Patio Trasero" },
  { id: "f-5", codigo: "DISC-45", nombre: "Disco de Corte para Metal 4 1/2\"", categoria: "Herramientas", rubro: "ferreteria", precio: 1.25, costo: 0.70, stock: 110, stockMinimo: 20, unidadMedida: "Pza", ubicacion: "Pasillo 2" },
  { id: "f-6", codigo: "CEM-T1", nombre: "Cemento Gris Tipo I 42.5kg", categoria: "Construcción", rubro: "ferreteria", precio: 9.00, costo: 7.20, stock: 65, stockMinimo: 15, unidadMedida: "Saco", ubicacion: "Bodega Principal" },
  { id: "f-7", codigo: "PAS-HILUX", nombre: "Pastillas de Freno Delanteras Hilux / Fortuner", categoria: "Repuestos", rubro: "ferreteria", precio: 22.00, costo: 14.00, stock: 12, stockMinimo: 4, unidadMedida: "Juego", codigoParte: "04465-0K090", marca: "Bendix / Toyota" },
  { id: "f-8", codigo: "BUJ-BOSH", nombre: "Bujía Iridium Doble Platino", categoria: "Repuestos", rubro: "ferreteria", precio: 5.50, costo: 3.20, stock: 38, stockMinimo: 8, unidadMedida: "Pza", codigoParte: "FR7DC+", marca: "Bosch" },

  // Farmacia & Droguería
  { id: "m-1", codigo: "ACT-500", nombre: "Acetaminofén / Paracetamol 500mg x 10 Tab", categoria: "Analgésicos", rubro: "farmacia", precio: 1.20, costo: 0.60, stock: 85, stockMinimo: 20, principioActivo: "Paracetamol", lote: "LT-8842", fechaVencimiento: "2027-10", laboratorio: "Genven / Calox" },
  { id: "m-2", codigo: "IBU-400", nombre: "Ibuprofeno 400mg x 10 Cápsulas Blandas", categoria: "Analgésicos", rubro: "farmacia", precio: 1.80, costo: 0.95, stock: 60, stockMinimo: 15, principioActivo: "Ibuprofeno", lote: "LT-9102", fechaVencimiento: "2026-05", laboratorio: "Elmor / Ibufen" },
  { id: "m-3", codigo: "AMX-500", nombre: "Amoxicilina 500mg x 12 Cápsulas", categoria: "Antibióticos", rubro: "farmacia", precio: 3.50, costo: 2.10, stock: 32, stockMinimo: 10, principioActivo: "Amoxicilina", lote: "LT-7740", fechaVencimiento: "2026-08", laboratorio: "Leti" },
  { id: "m-4", codigo: "LOS-50", nombre: "Losartán Potásico 50mg x 30 Tabletas", categoria: "Cardiovascular", rubro: "farmacia", precio: 4.20, costo: 2.40, stock: 40, stockMinimo: 12, principioActivo: "Losartán", lote: "LT-6211", fechaVencimiento: "2027-12", laboratorio: "Calox" },
  { id: "m-5", codigo: "OME-20", nombre: "Omeprazol 20mg x 14 Cápsulas", categoria: "Gástrico", rubro: "farmacia", precio: 2.40, costo: 1.30, stock: 50, stockMinimo: 15, principioActivo: "Omeprazol", lote: "LT-5541", fechaVencimiento: "2027-03", laboratorio: "Genéricos" },
  { id: "m-6", codigo: "ALC-70", nombre: "Alcohol Antiséptico 70% 500ml", categoria: "Insumos", rubro: "farmacia", precio: 1.60, costo: 0.90, stock: 75, stockMinimo: 15, principioActivo: "Alcohol Isopropílico", lote: "LT-3329", fechaVencimiento: "2028-01", laboratorio: "Bialcohol" },
  { id: "m-7", codigo: "GAS-3X3", nombre: "Gasas Estériles 3\" x 3\" (Sobre 10u)", categoria: "Insumos", rubro: "farmacia", precio: 0.85, costo: 0.40, stock: 120, stockMinimo: 25, lote: "LT-2210", fechaVencimiento: "2028-09", laboratorio: "MedSupply" },
  { id: "m-8", codigo: "CMP-B", nombre: "Complejo B B12 Inyectable x 3 Ampollas", categoria: "Vitaminas", rubro: "farmacia", precio: 5.80, costo: 3.50, stock: 18, stockMinimo: 6, principioActivo: "Vitaminas B1, B6, B12", lote: "LT-1194", fechaVencimiento: "2026-04", laboratorio: "Bayer / Neurobión" },

  // Retail & Minimarket
  { id: "r-1", codigo: "HAR-PAN", nombre: "Harina de Maíz Blanco Precocida 1kg", categoria: "Alimentos", rubro: "retail", precio: 1.15, costo: 0.88, stock: 140, stockMinimo: 30 },
  { id: "r-2", codigo: "ARR-PRIM", nombre: "Arroz Blanco Extra 1kg", categoria: "Alimentos", rubro: "retail", precio: 1.30, costo: 0.95, stock: 95, stockMinimo: 20 },
  { id: "r-3", codigo: "ACE-SOYA", nombre: "Aceite Vegetal Comestible 1 Litro", categoria: "Alimentos", rubro: "retail", precio: 2.50, costo: 1.85, stock: 48, stockMinimo: 15 },
  { id: "r-4", codigo: "REF-COCA2", nombre: "Refresco Sabor Cola 2 Litros", categoria: "Bebidas", rubro: "retail", precio: 2.20, costo: 1.60, stock: 36, stockMinimo: 12 },
  { id: "r-5", codigo: "DET-1KG", nombre: "Detergente Multiusos en Polvo 1kg", categoria: "Limpieza", rubro: "retail", precio: 2.10, costo: 1.45, stock: 40, stockMinimo: 10 },
  { id: "r-6", codigo: "AGU-5L", nombre: "Botellón de Agua Mineral Purificada 5L", categoria: "Bebidas", rubro: "retail", precio: 1.50, costo: 0.90, stock: 28, stockMinimo: 8 },
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
// VISTA GENERAL (DASHBOARD): tarjetas de resumen + alertas de stock bajo —
// lee de datos que ya viven en el componente padre (productos ya cargados,
// ingresos de caja ya cargados), no dispara peticiones propias.
// ══════════════════════════════════════════════════════════════════════════
function DashboardGeneralComercio({ productos, ingresosCaja, onIrAInventario }: {
  productos: ProductoComercio[];
  ingresosCaja: MovimientoCaja[];
  onIrAInventario: () => void;
}) {
  const sumarPorMoneda = (movimientos: MovimientoCaja[]) => {
    const acc: Record<string, number> = {};
    for (const m of movimientos) acc[m.moneda] = (acc[m.moneda] || 0) + Number(m.monto);
    return acc;
  };

  const { ventasHoy, ventasSemana } = useMemo(() => {
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const inicioSemana = new Date(inicioHoy);
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    return {
      ventasHoy: sumarPorMoneda(ingresosCaja.filter((m) => new Date(m.fechaRegistro) >= inicioHoy)),
      ventasSemana: sumarPorMoneda(ingresosCaja.filter((m) => new Date(m.fechaRegistro) >= inicioSemana)),
    };
  }, [ingresosCaja]);

  const productosBajoStock = useMemo(
    () => productos.filter((p) => p.stock <= p.stockMinimo).sort((a, b) => a.stock / Math.max(a.stockMinimo, 1) - b.stock / Math.max(b.stockMinimo, 1)),
    [productos]
  );

  const fmtMonedas = (obj: Record<string, number>) => {
    const entradas = Object.entries(obj);
    if (entradas.length === 0) return "$0.00";
    return entradas.map(([m, v]) => `${m === "USD" ? "$" : m + " "}${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(" · ");
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Vista General</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Resumen de tu negocio en tiempo real</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ventas de Hoy</span>
            <IconChart size={16} className="text-teal-500" />
          </div>
          <div className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white truncate">{fmtMonedas(ventasHoy)}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ventas de la Semana</span>
            <IconChart size={16} className="text-cyan-500" />
          </div>
          <div className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white truncate">{fmtMonedas(ventasSemana)}</div>
        </div>

        <button type="button" onClick={onIrAInventario} className="text-left bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5 cursor-pointer hover:border-teal-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Productos en Stock</span>
            <IconBank size={16} className="text-emerald-500" />
          </div>
          <div className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">{productos.length}</div>
        </button>

        <div className={`rounded-2xl p-5 border shadow-sm space-y-1.5 ${productosBajoStock.length > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${productosBajoStock.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`}>Alertas de Stock Bajo</span>
            <IconWarning size={16} className={productosBajoStock.length > 0 ? "text-amber-500" : "text-slate-400"} />
          </div>
          <div className={`font-['Outfit'] font-black text-xl ${productosBajoStock.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>{productosBajoStock.length}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-['Outfit'] font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <IconWarning size={15} className="text-amber-500" /> Alertas de Inventario Bajo
          </h3>
          <button type="button" onClick={onIrAInventario} className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer">
            Ver Inventario →
          </button>
        </div>
        {productosBajoStock.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <IconCheckCircle size={14} className="text-emerald-500" />
            Todo el inventario está por encima del mínimo configurado.
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
                {productosBajoStock.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{p.codigo}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{p.nombre}</td>
                    <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">{p.stock} {p.unidadMedida || ""}</td>
                    <td className="p-3 text-right text-slate-500 dark:text-slate-400">{p.stockMinimo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: COMERCIO & RETAIL APP
// ══════════════════════════════════════════════════════════════════════════
export default function ComercioApp({ onSalir }: { onSalir: () => void }) {
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
  useEffect(() => {
    if (!user?.tenantId) return;
    obtenerOrigenTasaActiva().then((r) => setOrigenTasaActiva(r.origenTasaActiva)).catch(() => setOrigenTasaActiva("USDT"));
    tasaVigente(user.tenantId, "USD", "COP").then(setTasaCopReal).catch(() => setTasaCopReal(null));
  }, [user?.tenantId]);
  useEffect(() => {
    if (!user?.tenantId || !origenTasaActiva) return;
    tasaVigente(user.tenantId, "USD", "VES", origenTasaActiva).then(setTasaVes).catch(() => setTasaVes(null));
  }, [user?.tenantId, origenTasaActiva]);

  const tasaActivaBs = tasaVes ? Number(tasaVes.tasa) : 0;
  const tasaCop = tasaCopReal ? Number(tasaCopReal.tasa) : 0;

  // Tabs de Navegación
  const [tab, setTab] = useState<"general" | "pos" | "pedidos_web" | "inventario" | "proveedores" | "clientes" | "gastos" | "cierre" | "auditoria">("general");
  const [modalQrVisible, setModalQrVisible] = useState(false);
  const [modalIaVisible, setModalIaVisible] = useState(false);

  // Estado del Catálogo y Clientes
  const [productos, setProductos] = useState<ProductoComercio[]>(() => {
    try {
      const g = localStorage.getItem("aurora_comercio_productos");
      return g ? JSON.parse(g) : PRODUCTOS_INICIALES;
    } catch {
      return PRODUCTOS_INICIALES;
    }
  });

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

  // Modales
  const [modalCobro, setModalCobro] = useState(false);
  const [metodoPagoSel, setMetodoPagoSel] = useState("EFECTIVO_USD");
  const [monedaRecibida, setMonedaRecibida] = useState<"USD" | "VES" | "COP">("USD");
  const [montoRecibido, setMontoRecibido] = useState("");
  const [monedaVuelto, setMonedaVuelto] = useState<"USD" | "VES" | "COP">("USD");
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
  const [modalImportarInventario, setModalImportarInventario] = useState(false);
  const [proveedoresRepuesto, setProveedoresRepuesto] = useState<ProveedorRepuesto[]>([]);
  const [ingresosCaja, setIngresosCaja] = useState<MovimientoCaja[]>([]);
  const [gastosCaja, setGastosCaja] = useState<MovimientoCaja[]>([]);
  const [formGasto, setFormGasto] = useState({ tipo: "EGRESO" as "INGRESO" | "EGRESO", monto: "", moneda: "USD" as "USD" | "VES" | "COP", concepto: "" });
  const [guardandoGasto, setGuardandoGasto] = useState(false);
  const [cargandoCompra, setCargandoCompra] = useState(false);
  const [toast, setToast] = useState<{ tipo: "success" | "error" | "info"; mensaje: string } | null>(null);
  const [editarModalItem, setEditarModalItem] = useState<ProductoComercio | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [ajustarStockModalItem, setAjustarStockModalItem] = useState<ProductoComercio | null>(null);
  const [guardandoAjuste, setGuardandoAjuste] = useState(false);
  const [comprasRepuesto, setComprasRepuesto] = useState<CompraRepuesto[] | null>(null);
  const [cargandoCompras, setCargandoCompras] = useState(false);
  const [proveedorDetalle, setProveedorDetalle] = useState<ProveedorRepuesto | null>(null);
  const [busquedaProveedor, setBusquedaProveedor] = useState("");
  const [modalNuevoProveedor, setModalNuevoProveedor] = useState(false);

  
  const cargarPedidoWebAlPos = (pedido: PedidoWeb) => {
    const linea: LineaCarritoComercio = {
      productoId: "web-" + pedido.id,
      codigo: pedido.numeroPedido,
      nombre: `Pedido Web #${pedido.numeroPedido} (${pedido.clienteNombre})`,
      precio: Number(pedido.totalUsd),
      cantidad: 1,
      unidadMedida: "Pedido",
    };
    setCarrito([linea]);
    setTab("pos");
    mostrarToast(`Pedido #${pedido.numeroPedido} cargado al mostrador POS. Listo para cobrar.`, "success");
  };

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
            categoria: r.codigoOriginalOem ? "Repuestos & Ferretería" : "General",
            rubro: perfilActivo,
            precio: r.precioVenta,
            costo: r.costoUnitario || 0,
            stock: r.stockActual,
            stockMinimo: r.stockMinimo ?? 5,
            unidadMedida: r.unidadBase || "UNIDAD",
            codigoParte: r.codigoOriginalOem || undefined,
            precioMayorista: r.precioMayorista || undefined,
            cantidadMinimaMayorista: r.cantidadMinimaMayorista || undefined,
            ubicacion: "Almacén Central",
          }));
          setProductos((prev) => {
            const otros = prev.filter((p) => p.rubro !== perfilActivo);
            return [...otros, ...mapeados];
          });
        }
      }
    } catch (err) {
      console.warn("No se pudo conectar a /api/repuestos/items", err);
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
      listarProveedoresRepuesto().then(setProveedoresRepuesto).catch(() => {});
      cargarIngresosCaja();
      cargarGastosCaja();
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
        if (modalCobro) setModalCobro(false);
        else if (modalNuevoProducto) setModalNuevoProducto(false);
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

  // Cálculos de Totales del Carrito
  const totalUSD = useMemo(() => {
    return carrito.reduce((acc, l) => acc + l.precio * l.cantidad, 0);
  }, [carrito]);

  const totalBs = useMemo(() => totalUSD * tasaActivaBs, [totalUSD, tasaActivaBs]);
  const totalCopCalculado = useMemo(() => totalUSD * tasaCop, [totalUSD, tasaCop]);

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

      return [
        ...prev,
        {
          productoId: p.id,
          backendId: p.backendId,
          codigo: p.codigo,
          nombre: presentacion ? `${p.nombre} (${presentacion.nombrePresentacion})` : p.nombre,
          precio: esMayoreo ? (p.precioMayorista || precioUnitario) : precioUnitario,
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

  // Finalizar Cobro
  const ejecutarCobro = async (esCredito = false) => {
    if (carrito.length === 0) return;

    const numRecibo = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    
    // Calcular monto recibido en USD equivalente
    let recibidoEnUSD = totalUSD;
    const ingresado = parseFloat(montoRecibido);
    if (!isNaN(ingresado) && ingresado > 0) {
      if (monedaRecibida === "USD") recibidoEnUSD = ingresado;
      else if (monedaRecibida === "VES" && tasaActivaBs > 0) recibidoEnUSD = ingresado / tasaActivaBs;
      else if (monedaRecibida === "COP" && tasaCop > 0) recibidoEnUSD = ingresado / tasaCop;
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
    if (user?.tenantId) {
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
        cargarIngresosCaja();
        mostrarToast("Venta registrada y sincronizada en base de datos (Kárdex y Caja actualizados)", "success");
      } catch (err: any) {
        console.error("Fallo al sincronizar venta en backend:", err);
        cargarRepuestosBackend(); // refresca el stock real por si otra venta concurrente ya lo cambió
        alert(`No se pudo completar la venta: ${err instanceof Error ? err.message : "error desconocido"}\n\nEl carrito NO se vació — ajusta la cantidad o cancela.`);
        return;
      }
    }

    // Llegar aquí significa que el backend confirmó la venta (o no hay tenant activo,
    // ej. modo demo) — recién ahora es seguro descontar el stock mostrado localmente.
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
    esFarmacia ? "Farmacia & Droguería San Cristóbal" : "Comercio El Tornillo"
  );

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-['Inter'] selection:bg-teal-500 selection:text-white overflow-hidden">

      {/* ══════════════════════ SIDEBAR FIJO ══════════════════════ */}
      <aside className="w-64 flex-shrink-0 h-screen flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-lg">
        {/* Logo + Nombre del Negocio */}
        <button
          onClick={onSalir}
          className="flex items-center gap-2.5 text-left group cursor-pointer p-4 border-b border-slate-200 dark:border-slate-800"
          title="Volver al Hub General"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform flex-shrink-0">
            <div className="w-full h-full bg-slate-50 dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
              {esFarmacia ? <IconPrescription size={18} className="text-teal-400" /> :
               <IconHardware size={18} className="text-teal-400" />}
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-['Outfit'] font-black text-sm text-slate-900 dark:text-white leading-tight truncate">
              {nombreLocal}
            </div>
            <div className="text-[9px] text-slate-500 dark:text-slate-400 tracking-wider uppercase truncate">
              Aurora {esFarmacia ? "Farmacia" : "Comercio"}
            </div>
          </div>
        </button>

        {/* Navegación principal, agrupada (Operación / Gestión) — mismo patrón que Aurora Horeca */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {([
            {
              titulo: "Operación",
              items: [
                { id: "general" as const, Icon: IconChart, etiqueta: "Vista General" },
                { id: "pos" as const, Icon: IconCard, etiqueta: "POS Mostrador" },
                { id: "inventario" as const, Icon: IconBox, etiqueta: "Inventario & Stock" },
              ],
            },
            {
              titulo: "Gestión",
              items: [
                ...(esComercio ? [{ id: "proveedores" as const, Icon: IconTruck, etiqueta: "Proveedores" }] : []),
                { id: "clientes" as const, Icon: IconUsers, etiqueta: "Clientes & Crédito" },
                { id: "gastos" as const, Icon: IconBank, etiqueta: "Ingresos & Gastos" },
                { id: "cierre" as const, Icon: IconLock, etiqueta: "Cierres & Reportes" },
                ...(user?.rol === "DUENO_ADMIN" ? [{ id: "auditoria" as const, Icon: IconFileText, etiqueta: "Bitácora de Auditoría" }] : []),
              ],
            },
          ]).map((grupo) => (
            <div key={grupo.titulo} className="space-y-1">
              <div className="px-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-600">
                {grupo.titulo}
              </div>
              {grupo.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    tab === item.id
                      ? "bg-teal-500 text-slate-950 shadow-md"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <item.Icon size={16} />
                  <span>{item.etiqueta}</span>
                </button>
              ))}
            </div>
          ))}

                  <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            title="Tu catálogo digital público con precios y código QR para que tus clientes pidan por WhatsApp"
            onClick={() => setModalQrVisible(true)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-sm cursor-pointer text-teal-600 dark:text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 transition-colors"
          >
            <IconShoppingBag size={16} />
            <span className="flex-1 text-left">Mi Catálogo Online & QR</span>
            <span className="text-[8px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-600 dark:text-teal-300 px-1.5 py-0.5 rounded-full">
              Online
            </span>
          </button>
          <button
            type="button"
            title="Atencion y ventas automatizadas en WhatsApp con IA conectada a tu inventario en tiempo real"
            onClick={() => setModalIaVisible(true)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-sm cursor-pointer text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all mt-2 border border-indigo-500/20 shadow-sm"
          >
            <div className="w-4 h-4 flex items-center justify-center text-indigo-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="flex-1 text-left font-semibold">Asistente IA WhatsApp</span>
            <span className="text-[8px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded-full border border-indigo-500/30">
              24/7
            </span>
          </button>
        </div>
        </nav>

        {/* Salir al Hub */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onSalir}
            className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            ← Salir al Hub
          </button>
        </div>
      </aside>

      {/* ══════════════════════ COLUMNA DERECHA: TOPBAR + CONTENIDO ══════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* ── TOPBAR LIMPIO: SOLO TASAS, TEMA Y PERFIL ── */}
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-end gap-2.5 shadow-sm flex-shrink-0">
          {user?.tenantId && (
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
        </header>

        {/* ── CONTENIDO SEGÚN LA PESTAÑA SELECCIONADA ── */}
        <main className="flex-1 w-full p-4 sm:p-6 overflow-y-auto flex flex-col">

          {/* ══════════════════════════════════════════════════════════════════
              TAB 0: VISTA GENERAL (DASHBOARD)
              ══════════════════════════════════════════════════════════════════ */}
          {tab === "general" && (
            <DashboardGeneralComercio
              productos={productos.filter((p) => p.rubro === perfilActivo)}
              ingresosCaja={ingresosCaja}
              onIrAInventario={() => setTab("inventario")}
            />
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: POS MOSTRADOR ULTRA RÁPIDO
            ══════════════════════════════════════════════════════════════════ */}
        {tab === "pos" && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-115px)]">
            
            {/* Columna Izquierda (7 cols): Catálogo, Buscador & Categorías */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full bg-white/60 dark:bg-slate-900/60 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
              
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
                            ️ Mayoreo: ${p.precioMayorista.toFixed(2)} (≥{p.cantidadMinimaMayorista} {p.unidadMedida || "u"})
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
                            ${p.precio.toFixed(2)}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
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
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xl overflow-hidden">
              
              {/* Selector de Cliente */}
              <div className="flex-shrink-0 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Cliente en Mostrador</label>
                  <select
                    value={clienteSel.id}
                    onChange={(e) => setClienteSel(clientes.find((c) => c.id === e.target.value) || clientes[0])}
                    className="bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white rounded-xl px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 focus:outline-none mt-1"
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
                              ${l.precio.toFixed(2)} c/u {l.esMayorista && <span className="text-emerald-400 font-semibold">(Escala Mayor)</span>}
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
                          <span className="font-mono font-bold text-slate-900 dark:text-white ml-auto">${(l.precio * l.cantidad).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Totalizador & Acciones Comerciales */}
              <div className="flex-shrink-0 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="space-y-1 bg-slate-100/60 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-300/60 dark:border-slate-700/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">TOTAL USD:</span>
                    <span className="font-mono font-black text-xl text-teal-400">${totalUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 dark:text-slate-400">Total Bolívares (Bs):</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">Bs. {totalBs.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 dark:text-slate-400">Total Pesos (COP):</span>
                    <span className="text-slate-600 dark:text-slate-300 font-bold">COP ${totalCopCalculado.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
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
                    <span> Cotización</span>
                  </button>

                  <button
                    onClick={() => ejecutarCobro(true)}
                    disabled={carrito.length === 0 || clienteSel.id === "c-1"}
                    className="py-2 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 disabled:opacity-40 text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Cargar a cuenta por cobrar (crédito)"
                  >
                    <span> A Crédito</span>
                  </button>
                </div>

                <button
                  onClick={() => setModalCobro(true)}
                  disabled={carrito.length === 0}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-black text-sm cursor-pointer hover:opacity-95 disabled:opacity-40 shadow-[0_0_20px_rgba(45,212,191,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  <span> Cobrar en Mostrador (${totalUSD.toFixed(2)})</span>
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
                    <th className="p-3 text-right">Precio USD</th>
                    <th className="p-3 text-right">Precio Bs</th>
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
                      <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">{p.nombre}</td>
                      <td className="p-3 font-sans text-slate-500 dark:text-slate-400">{p.categoria}</td>
                      {esFarmacia && <td className="p-3 text-emerald-400">{p.principioActivo || "—"}</td>}
                      {esFarmacia && <td className="p-3 text-slate-600 dark:text-slate-300">{p.lote || "—"} ({p.fechaVencimiento || "—"})</td>}
                      {esComercio && <td className="p-3 text-slate-600 dark:text-slate-300">{p.unidadMedida || "Pza"} · {p.ubicacion || "Almacén"}</td>}
                      {esComercio && (
                        <td className="p-3 text-emerald-400 text-xs">
                          {p.precioMayorista && p.cantidadMinimaMayorista
                            ? `$${p.precioMayorista.toFixed(2)} (≥${p.cantidadMinimaMayorista} ${p.unidadMedida || 'u'})`
                            : "—"}
                        </td>
                      )}
                      <td className={`p-3 text-right font-bold ${p.stock <= p.stockMinimo ? "text-amber-400" : "text-teal-400"}`}>
                        {p.stock}
                      </td>
                      {esComercio && (
                        <td className="p-3 text-right text-slate-500 dark:text-slate-400 font-mono">
                          ${p.costo.toFixed(2)}
                        </td>
                      )}
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-white">${p.precio.toFixed(2)}</td>
                      <td className="p-3 text-right text-slate-600 dark:text-slate-300">Bs. {(p.precio * tasaActivaBs).toFixed(2)}</td>
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
                            onClick={() => setAjustarStockModalItem(p)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] text-amber-400 font-bold border border-slate-300 dark:border-slate-700 cursor-pointer shadow-sm"
                            title="Corregir stock tras un conteo físico"
                            disabled={!p.backendId}
                          >
                            ⚖️ Ajustar
                          </button>
                          <button
                            onClick={() => setEditarModalItem(p)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] text-slate-500 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-700 cursor-pointer shadow-sm"
                            title="Editar datos del producto"
                            disabled={!p.backendId}
                          >
                            ✏️ Editar
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
                            <td className="p-2.5 text-right font-bold text-teal-500 dark:text-teal-400">${c.total.toFixed(2)}</td>
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
        {tab === "clientes" && (
          <div className="flex-1 bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Directorio de Clientes & Créditos</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Gestión de cuentas por cobrar, límites de crédito y abonos.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {clientes.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-300/70 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{c.documento}</span>
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
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{c.nombre}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400"> {c.telefono}</div>
                  <div className="pt-2 border-t border-slate-300/60 dark:border-slate-700/50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Saldo por Cobrar:</span>
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
            TAB: INGRESOS & GASTOS — gastos sueltos (alquiler, papelería,
            servicios) que no pasan por el POS; las ventas siguen entrando
            solas desde el mostrador, esto es solo para anotar lo demás.
            ══════════════════════════════════════════════════════════════════ */}
        {tab === "gastos" && (
          <div className="max-w-3xl mx-auto w-full space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4" style={{ borderLeftColor: "#10b981" }}>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Ingresos registrados</div>
                <div className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">
                  ${ingresosCaja.filter((m) => m.moneda === "USD").reduce((s, m) => s + Number(m.monto), 0).toFixed(2)}
                </div>
              </div>
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4" style={{ borderLeftColor: "#ef4444" }}>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Gastos registrados</div>
                <div className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">
                  ${gastosCaja.filter((m) => m.moneda === "USD").reduce((s, m) => s + Number(m.monto), 0).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
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
                <input value={formGasto.monto} onChange={(e) => setFormGasto({ ...formGasto, monto: e.target.value })} type="number" step="0.01" placeholder="Monto"
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
                <select value={formGasto.moneda} onChange={(e) => setFormGasto({ ...formGasto, moneda: e.target.value as "USD" | "VES" | "COP" })}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                  <option value="USD">USD</option>
                  <option value="VES">VES</option>
                  <option value="COP">COP</option>
                </select>
                <input value={formGasto.concepto} onChange={(e) => setFormGasto({ ...formGasto, concepto: e.target.value })} placeholder="Concepto (ej. Alquiler del local)"
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm sm:col-span-2" />
              </div>
              <button onClick={registrarGasto} disabled={guardandoGasto}
                className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm cursor-pointer disabled:opacity-60">
                {guardandoGasto ? "Guardando…" : "Registrar"}
              </button>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm mb-3">Últimos gastos registrados</h3>
              {gastosCaja.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Aún no hay gastos registrados.</p>
              ) : (
                <div className="space-y-2">
                  {gastosCaja.slice(0, 15).map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-sm">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{m.concepto}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{new Date(m.fechaRegistro).toLocaleString()}</div>
                      </div>
                      <div className="font-mono font-bold text-red-500">-{Number(m.monto).toFixed(2)} {m.moneda}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4: CIERRE & REPORTES — TURNOS DE CAJA CON ARQUEO REAL
            (mismo motor /api/financiero/turnos que usa Aurora Horeca)
            ══════════════════════════════════════════════════════════════════ */}
        {tab === "cierre" && user?.tenantId && (
          <TurnoCajaComercio tenantId={user.tenantId} tasaUsdVes={tasaActivaBs} tasaUsdCop={tasaCop} />
        )}

        {tab === "pedidos_web" && user?.tenantId && (
          <PedidosWebPanel
            tenantId={user.tenantId}
            tasaVes={tasaActivaBs}
            onCargarAlPos={cargarPedidoWebAlPos}
            onVerQrModal={() => setModalQrVisible(true)}
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
      {modalQrVisible && user?.tenantId && (
        <ModalCatalogoQR
          tenantId={user.tenantId}
          nombreNegocio={user?.empresa || "Mi Comercio"}
          onClose={() => setModalQrVisible(false)}
        />
      )}

      {modalIaVisible && user?.tenantId && (
        <AsistenteIaModal
          tenantId={user.tenantId}
          nombreNegocio={user?.empresa || "Mi Comercio"}
          onClose={() => setModalIaVisible(false)}
        />
      )}

      {modalCobro && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer" onClick={() => setModalCobro(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Cobro en Mostrador</h3>
              <button onClick={() => setModalCobro(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"><IconClose size={18} /></button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-300/70 dark:border-slate-700/60 space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                <span>Total a Cobrar:</span>
                <span className="font-mono text-xl font-black text-teal-400">${totalUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono text-slate-600 dark:text-slate-300">
                <span>En Bolívares (Bs):</span>
                <span className="font-bold">Bs. {totalBs.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono text-slate-500 dark:text-slate-400">
                <span>En Pesos (COP):</span>
                <span>COP ${totalCopCalculado.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">1. Método de Pago</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  ["EFECTIVO_USD", " USD Efectivo", "USD"],
                  ["EFECTIVO_BS", " Bs Efectivo", "VES"],
                  ["PAGO_MOVIL", " Pago Móvil", "VES"],
                  ["PUNTO_VENTA", " Punto Débito", "VES"],
                  ["ZELLE", "⚡ Zelle / USDT", "USD"],
                  ["COP_EFECTIVO", " Pesos COP", "COP"],
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
                        monedaRecibida === m ? "bg-teal-500 text-slate-950" : "text-slate-500 dark:text-slate-400 hover:text-white"
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
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white text-sm font-bold focus:border-teal-400 focus:outline-none"
                  autoFocus
                />
                <select
                  value={monedaVuelto}
                  onChange={(e) => setMonedaVuelto(e.target.value as any)}
                  className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
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
                  ⚡ Exacto
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

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setModalCobro(false)}
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
          </div>
        </div>
      )}

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
                <span className="text-teal-400">${ventaReciente.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Bolívares:</span>
                <span>Bs. {ventaReciente.totalBs.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Método:</span>
                <span>{ventaReciente.metodoPago}</span>
              </div>
              {ventaReciente.vuelto != null && ventaReciente.vuelto > 0 && (
                <div className="flex justify-between text-teal-300 font-bold border-t border-slate-300 dark:border-slate-700 pt-1">
                  <span>Vuelto:</span>
                  <span>{ventaReciente.vuelto.toFixed(2)} {ventaReciente.monedaVuelto}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => imprimirTicketComercio(ventaReciente, nombreLocal, tasaActivaBs, tasaCop)}
                className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
              >
                ️ Imprimir Ticket 80mm
              </button>
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
                const costo = Number(fd.get("costo")) || 0.5;
                const stock = Number(fd.get("stock")) || 10;
                const unidadMedida = String(fd.get("unidadMedida") || "UNIDAD");
                const codigoOem = String(fd.get("codigoOem") || "") || undefined;
                const precioMayorista = fd.get("precioMayorista") ? Number(fd.get("precioMayorista")) : undefined;
                const cantidadMinimaMayorista = fd.get("cantidadMinimaMayorista") ? Number(fd.get("cantidadMinimaMayorista")) : undefined;

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
                  categoria: String(fd.get("categoria") || (esComercio ? "Repuestos & Ferretería" : "General")),
                  rubro: perfilActivo,
                  precio,
                  costo,
                  stock,
                  stockMinimo: Number(fd.get("stockMinimo")) || 5,
                  principioActivo: String(fd.get("principioActivo") || "") || undefined,
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
                      <label className="text-[10px] font-bold text-teal-400 block mb-1">Código OEM / Fabricante</label>
                      <input name="codigoOem" placeholder="Ej. 04465-0K090" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
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
                  <div>
                    <label className="text-[10px] font-bold text-teal-400 block mb-1">Ubicación en Almacén / Estante</label>
                    <input name="ubicacion" placeholder="Ej. Pasillo 3 - Gaveta 4" className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" />
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
                <span className="font-mono text-base font-black text-amber-300">${clienteAbonoSel.saldoPendiente.toFixed(2)} USD</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Monto a Abonar (USD)</label>
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
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                ≈ Bs. {((Number(montoAbono) || 0) * tasaActivaBs).toFixed(2)} | COP ${((Number(montoAbono) || 0) * tasaCop).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Forma de Pago del Abono</label>
              <select
                value={metodoAbono}
                onChange={(e) => setMetodoAbono(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
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
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 cursor-default" onClick={(e) => e.stopPropagation()}>
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
                  });
                  setProductos((prev) => prev.map((p) => p.id === editarModalItem.id ? {
                    ...p, nombre, precio, unidadMedida, codigoOem, stockMinimo, precioMayorista, cantidadMinimaMayorista,
                  } : p));
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
                      <label className="text-[10px] font-bold text-teal-400 block mb-1">Código OEM / Fabricante</label>
                      <input name="codigoOem" defaultValue={editarModalItem.codigoOem || ""} className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono" />
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
                </div>
              )}
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                El stock actual y el costo no se editan aquí — se actualizan solos a través de compras, ventas y ajustes (Kárdex), para mantener la auditoría.
              </p>
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
        <span className="text-[10px] px-1 rounded bg-black/5 dark:bg-white/10 uppercase tracking-wider">{etiquetaOrigen}</span>
        <span>{tasaActivaNumero > 0 ? `Bs. ${tasaActivaNumero.toFixed(2)}` : "Sin tasa"}</span>
        {tasaCop && (
          <span className="text-slate-500 dark:text-slate-400 text-[10px] font-normal">· COP {Number(tasaCop.tasa).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
        )}
        <span className="text-slate-500 dark:text-slate-400 text-[9px]">▼</span>
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 z-50 w-80 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-300 dark:border-slate-700 space-y-3">
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
// COMPONENTE: TURNOS DE CAJA & CIERRE Z (mismo motor /api/financiero/turnos
// que usa Aurora Horeca — apertura con monto base, egresos y arqueo ciego al
// cierre, con historial y auditoría real en el backend, no solo un cálculo
// local que se perdía al recargar la página).
// ══════════════════════════════════════════════════════════════════════════
function TurnoCajaComercio({ tenantId, tasaUsdVes, tasaUsdCop }: { tenantId: number; tasaUsdVes: number; tasaUsdCop: number }) {
  const MONEDAS = ["USD", "VES", "COP"] as const;
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

  const totalDesgloseCalculado = useMemo(() => {
    const usd = Number(desgloseArqueo.usd) || 0;
    const zelle = Number(desgloseArqueo.zelle) || 0;
    const ves = (Number(desgloseArqueo.ves) || 0) + (Number(desgloseArqueo.punto) || 0) + (Number(desgloseArqueo.pagoMovil) || 0);
    const cop = Number(desgloseArqueo.cop) || 0;

    if (moneda === "USD") {
      return usd + zelle + (tasaUsdVes > 0 ? ves / tasaUsdVes : 0) + (tasaUsdCop > 0 ? cop / tasaUsdCop : 0);
    } else if (moneda === "VES") {
      return ves + (usd + zelle) * tasaUsdVes + (tasaUsdCop > 0 ? (cop / tasaUsdCop) * tasaUsdVes : 0);
    } else {
      return cop + (usd + zelle) * tasaUsdCop;
    }
  }, [desgloseArqueo, moneda, tasaUsdVes, tasaUsdCop]);

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
                  Ingresá lo contado físicamente en cada método para calcular el total sin errores:
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
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">⚡ Zelle / USDT ($)</label>
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
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Total declarado acumulado:</span>
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
                      <td className="p-2.5 text-right">${costoNum.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">${((Number(l.cantidad) || 0) * costoNum).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                        {pvNum > 0 ? `$${pvNum.toFixed(2)}` : "—"}
                      </td>
                      <td className="p-2.5 text-right">
                        {l.margenPorcentaje !== undefined ? (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            l.margenPorcentaje >= 0
                              ? "bg-teal-500/20 text-teal-700 dark:text-teal-300"
                              : "bg-red-500/20 text-red-600 dark:text-red-300"
                          }`}>
                            {l.margenPorcentaje >= 0 ? "+" : ""}{l.margenPorcentaje.toFixed(1)}% (+${ganancia.toFixed(2)})
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
              <span className="text-xs font-mono font-black text-teal-500 dark:text-teal-400">${totalFactura.toFixed(2)}</span>
              <select value={monedaPago} onChange={(e) => setMonedaPago(e.target.value)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-[11px] font-bold">
                {["USD", "VES", "COP"].map((m) => <option key={m} value={m}>{m}</option>)}
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
                  {["USD", "VES", "COP"].map((m) => <option key={m} value={m}>{m}</option>)}
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
            <div className="font-mono font-black text-xl text-teal-400">${totalFactura.toFixed(2)} USD</div>
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
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Historial de Compras</span>
            <span className="text-xs font-mono font-black text-teal-500 dark:text-teal-400">${totalComprado.toFixed(2)} total</span>
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
                      <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">${c.total.toFixed(2)}</td>
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

