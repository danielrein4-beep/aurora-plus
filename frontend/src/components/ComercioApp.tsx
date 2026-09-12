import { useState, useMemo, useEffect, useRef } from "react";
import {
  IconHardware, IconPrescription, IconRetail, IconCard, IconSearch, IconTrash,
  IconCheck, IconWarning, IconClose, IconUsers, IconFileText, IconHourglass,
  IconDownload, IconRefresh, IconCheckCircle, IconBank, IconChart, IconBox, IconLock,
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
  listarMovimientos,
  type RepuestoItem,
  type PresentacionRepuesto,
  type MovimientoRepuesto,
  type ProveedorRepuesto,
  type MovimientoCaja,
} from "../api";

// ══════════════════════════════════════════════════════════════════════════
// TIPOS Y MODELOS
// ══════════════════════════════════════════════════════════════════════════
export type PerfilComercio = "ferreteria" | "farmacia" | "retail" | "repuestos";

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
        <div><strong>Método:</strong> ${venta.esCredito ? "VENTA A CRÉDITO 🤝" : venta.metodoPago.replace("_", " ")}</div>
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
    "ferreteria";

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
  const [tab, setTab] = useState<"general" | "pos" | "inventario" | "clientes" | "cierre">("general");

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
  const [proveedoresRepuesto, setProveedoresRepuesto] = useState<ProveedorRepuesto[]>([]);
  const [ingresosCaja, setIngresosCaja] = useState<MovimientoCaja[]>([]);
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
            categoria: r.codigoOriginalOem ? "Repuestos & Ferretería" : "General",
            rubro: perfilActivo,
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

  useEffect(() => {
    if (user?.tenantId) {
      cargarRepuestosBackend();
      listarProveedoresRepuesto().then(setProveedoresRepuesto).catch(() => {});
      cargarIngresosCaja();
    }
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

  // Arqueo Ciego
  const [desgloseCaja, setDesgloseCaja] = useState({ usd: "", ves: "", punto: "", pagoMovil: "", zelle: "", cop: "" });
  const [cajaCerradaMsg, setCajaCerradaMsg] = useState<string | null>(null);

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
    perfilActivo === "ferreteria" ? "Ferretería & Repuestos El Tornillo" :
    perfilActivo === "farmacia" ? "Farmacia & Droguería San Cristóbal" :
    perfilActivo === "repuestos" ? "Repuestos Automotrices El Motor" :
    "Comercio & Minimarket Express"
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
              {perfilActivo === "farmacia" ? <IconPrescription size={18} className="text-teal-400" /> :
               perfilActivo === "ferreteria" || perfilActivo === "repuestos" ? <IconHardware size={18} className="text-teal-400" /> :
               <IconRetail size={18} className="text-teal-400" />}
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-['Outfit'] font-black text-sm text-slate-900 dark:text-white leading-tight truncate">
              {nombreLocal}
            </div>
            <div className="text-[9px] text-slate-500 dark:text-slate-400 tracking-wider uppercase truncate">
              Aurora Retail · {perfilActivo.toUpperCase()}
            </div>
          </div>
        </button>

        {/* Navegación principal */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {([
            { id: "general" as const, Icon: IconChart, etiqueta: "Vista General" },
            { id: "pos" as const, Icon: IconCard, etiqueta: "POS Mostrador" },
            { id: "inventario" as const, Icon: IconBox, etiqueta: "Inventario & Stock" },
            { id: "clientes" as const, Icon: IconUsers, etiqueta: "Clientes & Crédito" },
            { id: "cierre" as const, Icon: IconLock, etiqueta: "Cierres & Reportes" },
          ]).map((item) => (
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

          <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              title="Próximamente: tu catálogo público con precios y código QR para que tus clientes lo vean desde el celular"
              onClick={() => mostrarToast("Catálogo QR — muy pronto vas a poder compartir tus precios con un código QR.", "info")}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-sm cursor-pointer text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-70"
            >
              <IconLock size={16} />
              <span className="flex-1 text-left">Catálogo QR</span>
              <span className="text-[8px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-500 dark:text-violet-300 px-1.5 py-0.5 rounded-full">
                Pronto
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
          {/* Badge de Tasa Flotante */}
          <div className="relative">
            <button
              onClick={() => setPopoverTasa((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-teal-500/30 text-xs font-mono font-bold hover:border-teal-400 transition-all cursor-pointer shadow-inner"
              title="Cambiar tasa activa (USDT / BCV / COP)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-teal-400">{tipoTasaActiva}: Bs. {tasaActivaBs.toFixed(2)}</span>
              <span className="text-slate-500 dark:text-slate-400 text-[10px]">· COP {tasaCop.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              <span className="text-slate-500 dark:text-slate-400 text-[9px]">▼</span>
            </button>

            {popoverTasa && (
              <div className="absolute right-0 mt-2 z-50 w-72 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-300 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Tasa Activa para Venta</span>
                  <button onClick={() => setPopoverTasa(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"><IconClose size={14} /></button>
                </div>

                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
                  <button
                    onClick={() => { setTipoTasaActiva("USDT"); try { localStorage.setItem("aurora_tipo_tasa_activa", "USDT"); } catch {} }}
                    className={`py-1 rounded-lg font-bold ${tipoTasaActiva === "USDT" ? "bg-emerald-600 text-white" : "text-slate-500 dark:text-slate-400"}`}
                  >💎 USDT</button>
                  <button
                    onClick={() => { setTipoTasaActiva("BCV"); try { localStorage.setItem("aurora_tipo_tasa_activa", "BCV"); } catch {} }}
                    className={`py-1 rounded-lg font-bold ${tipoTasaActiva === "BCV" ? "bg-teal-600 text-white" : "text-slate-500 dark:text-slate-400"}`}
                  >🏛️ BCV</button>
                  <button
                    onClick={() => { setTipoTasaActiva("PERSONALIZADA"); try { localStorage.setItem("aurora_tipo_tasa_activa", "PERSONALIZADA"); } catch {} }}
                    className={`py-1 rounded-lg font-bold ${tipoTasaActiva === "PERSONALIZADA" ? "bg-amber-600 text-white" : "text-slate-500 dark:text-slate-400"}`}
                  >✏️ Propia</button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Tasa USDT ($):</span>
                    <input
                      type="number" step="0.01" value={tasaUsdtVal}
                      onChange={(e) => { setTasaUsdtVal(e.target.value); try { localStorage.setItem("aurora_tasa_usdt_val", e.target.value); } catch {} }}
                      className="w-24 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-right text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Tasa BCV ($):</span>
                    <input
                      type="number" step="0.01" value={tasaBcvVal}
                      onChange={(e) => setTasaBcvVal(e.target.value)}
                      className="w-24 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-right text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Pesos COP:</span>
                    <input
                      type="number" step="1" value={tasaCopVal}
                      onChange={(e) => setTasaCopVal(e.target.value)}
                      className="w-24 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-right text-xs"
                    />
                  </div>
                  {tipoTasaActiva === "PERSONALIZADA" && (
                    <div className="flex items-center justify-between gap-2 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                      <span className="text-[11px] text-amber-300 font-bold">Propia (Bs):</span>
                      <input
                        type="number" step="0.01" placeholder="Ej. 66.50" value={tasaPersVal}
                        onChange={(e) => setTasaPersVal(e.target.value)}
                        className="w-24 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-amber-500/40 font-mono text-right text-xs font-bold text-amber-300"
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
        </header>

        {/* ── CONTENIDO SEGÚN LA PESTAÑA SELECCIONADA ── */}
        <main className="flex-1 w-full p-4 sm:p-6 overflow-y-auto flex flex-col">

          {/* ══════════════════════════════════════════════════════════════════
              TAB 0: VISTA GENERAL (DASHBOARD)
              ══════════════════════════════════════════════════════════════════ */}
          {tab === "general" && (
            <DashboardGeneralComercio
              productos={productos}
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
                    perfilActivo === "farmacia"
                      ? "🔍 Buscar por medicamento, principio activo (ej. Acetaminofén), lote o escanear código..."
                      : perfilActivo === "ferreteria"
                      ? "🔍 Buscar por producto, código de parte (ej. TORN-38, Hilux), medida o código de barra..."
                      : "🔍 Buscar producto, marca o escanear código de barras..."
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
                            🌿 {p.principioActivo}
                          </div>
                        )}
                        {p.codigoOem && (
                          <div className="text-[9px] text-cyan-400 font-mono truncate">
                            OEM: {p.codigoOem}
                          </div>
                        )}
                        {p.precioMayorista && p.cantidadMinimaMayorista && (
                          <div className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 truncate">
                            🏷️ Mayoreo: ${p.precioMayorista.toFixed(2)} (≥{p.cantidadMinimaMayorista} {p.unidadMedida || "u"})
                          </div>
                        )}
                        {p.lote && (
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                            Lote: {p.lote} · Vence: {p.fechaVencimiento}
                          </div>
                        )}
                        {p.ubicacion && (
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                            📍 {p.ubicacion}
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
                  {perfilActivo === "ferreteria" || perfilActivo === "repuestos" 
                    ? "Kárdex auditable, presentaciones fraccionadas, escala mayorista y compras a proveedores."
                    : "Catálogo de productos, existencias, lotes y precios de venta."}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(perfilActivo === "ferreteria" || perfilActivo === "repuestos" || perfilActivo === "retail") && (
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
                  + Nuevo {perfilActivo === "ferreteria" || perfilActivo === "repuestos" ? "Repuesto / Artículo" : "Producto"}
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
                    {perfilActivo === "farmacia" && <th className="p-3">Principio Activo</th>}
                    {perfilActivo === "farmacia" && <th className="p-3">Lote / Vence</th>}
                    {perfilActivo === "ferreteria" || perfilActivo === "repuestos" && <th className="p-3">Unidad / Ubicación</th>}
                    {perfilActivo === "ferreteria" || perfilActivo === "repuestos" && <th className="p-3">Escala Mayorista</th>}
                    <th className="p-3 text-right">Stock</th>
                    {perfilActivo === "ferreteria" || perfilActivo === "repuestos" && <th className="p-3 text-right">Último Costo</th>}
                    <th className="p-3 text-right">Precio USD</th>
                    <th className="p-3 text-right">Precio Bs</th>
                    {perfilActivo === "ferreteria" || perfilActivo === "repuestos" && <th className="p-3 text-center">Gestión</th>}
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
                      {perfilActivo === "farmacia" && <td className="p-3 text-emerald-400">{p.principioActivo || "—"}</td>}
                      {perfilActivo === "farmacia" && <td className="p-3 text-slate-600 dark:text-slate-300">{p.lote || "—"} ({p.fechaVencimiento || "—"})</td>}
                      {perfilActivo === "ferreteria" || perfilActivo === "repuestos" && <td className="p-3 text-slate-600 dark:text-slate-300">{p.unidadMedida || "Pza"} · {p.ubicacion || "Almacén"}</td>}
                      {perfilActivo === "ferreteria" || perfilActivo === "repuestos" && (
                        <td className="p-3 text-emerald-400 text-xs">
                          {p.precioMayorista && p.cantidadMinimaMayorista
                            ? `$${p.precioMayorista.toFixed(2)} (≥${p.cantidadMinimaMayorista} ${p.unidadMedida || 'u'})`
                            : "—"}
                        </td>
                      )}
                      <td className={`p-3 text-right font-bold ${p.stock <= p.stockMinimo ? "text-amber-400" : "text-teal-400"}`}>
                        {p.stock}
                      </td>
                      {perfilActivo === "ferreteria" || perfilActivo === "repuestos" && (
                        <td className="p-3 text-right text-slate-500 dark:text-slate-400 font-mono">
                          ${p.costo.toFixed(2)}
                        </td>
                      )}
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-white">${p.precio.toFixed(2)}</td>
                      <td className="p-3 text-right text-slate-600 dark:text-slate-300">Bs. {(p.precio * tasaActivaBs).toFixed(2)}</td>
                      {perfilActivo === "ferreteria" || perfilActivo === "repuestos" && (
                        <td className="p-3 text-center space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setKardexModalItem(p)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] text-teal-300 font-bold border border-slate-300 dark:border-slate-700 cursor-pointer shadow-sm"
                            title="Ver movimientos auditables en Kárdex"
                          >
                            📜 Kárdex
                          </button>
                          <button
                            onClick={() => setPresentacionesModalItem(p)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] text-cyan-300 font-bold border border-slate-300 dark:border-slate-700 cursor-pointer shadow-sm"
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
                  <div className="text-xs text-slate-500 dark:text-slate-400">📞 {c.telefono}</div>
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
            TAB 4: CIERRE DE CAJA (CIERRE Z) CON ARQUEO CIEGO
            ══════════════════════════════════════════════════════════════════ */}
        {tab === "cierre" && (
          <div className="max-w-2xl mx-auto w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Cierre de Turno de Mostrador (Cierre Z)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Arqueo ciego de caja: cuenta físicamente el dinero para auditar sobrantes o faltantes.</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold font-mono">
                Arqueo Ciego
              </span>
            </div>

            {cajaCerradaMsg ? (
              <div className="p-4 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-center space-y-2">
                <IconCheckCircle size={32} className="text-teal-400 mx-auto" />
                <h4 className="font-bold text-slate-900 dark:text-white text-base">{cajaCerradaMsg}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">El turno ha sido cerrado y auditado. El reporte Z fue guardado.</p>
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
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">💵 Efectivo USD ($)</label>
                    <input
                      type="number" step="0.01" placeholder="0.00" value={desgloseCaja.usd}
                      onChange={(e) => setDesgloseCaja((prev) => ({ ...prev, usd: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">🇻🇪 Efectivo Bs</label>
                    <input
                      type="number" step="0.01" placeholder="0.00" value={desgloseCaja.ves}
                      onChange={(e) => setDesgloseCaja((prev) => ({ ...prev, ves: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">💳 Punto de Venta (Bs)</label>
                    <input
                      type="number" step="0.01" placeholder="0.00" value={desgloseCaja.punto}
                      onChange={(e) => setDesgloseCaja((prev) => ({ ...prev, punto: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">📲 Pago Móvil (Bs)</label>
                    <input
                      type="number" step="0.01" placeholder="0.00" value={desgloseCaja.pagoMovil}
                      onChange={(e) => setDesgloseCaja((prev) => ({ ...prev, pagoMovil: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">⚡ Zelle / USDT ($)</label>
                    <input
                      type="number" step="0.01" placeholder="0.00" value={desgloseCaja.zelle}
                      onChange={(e) => setDesgloseCaja((prev) => ({ ...prev, zelle: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">🇨🇴 Pesos COP</label>
                    <input
                      type="number" step="1" placeholder="0" value={desgloseCaja.cop}
                      onChange={(e) => setDesgloseCaja((prev) => ({ ...prev, cop: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-sm text-slate-900 dark:text-white"
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
      </div>

      {/* ── MODAL DE COBRO MIXTO DE MOSTRADOR ── */}
      {modalCobro && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
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
                  ["EFECTIVO_USD", "💵 USD Efectivo", "USD"],
                  ["EFECTIVO_BS", "🇻🇪 Bs Efectivo", "VES"],
                  ["PAGO_MOVIL", "📲 Pago Móvil", "VES"],
                  ["PUNTO_VENTA", "💳 Punto Débito", "VES"],
                  ["ZELLE", "⚡ Zelle / USDT", "USD"],
                  ["COP_EFECTIVO", "🇨🇴 Pesos COP", "COP"],
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 text-center">
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
                🖨️ Imprimir Ticket 80mm
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Nuevo Producto ({perfilActivo.toUpperCase()})</h3>
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
                  categoria: String(fd.get("categoria") || (perfilActivo === "ferreteria" || perfilActivo === "repuestos" ? "Repuestos & Ferretería" : "General")),
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

              {perfilActivo === "farmacia" && (
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

              {perfilActivo === "ferreteria" || perfilActivo === "repuestos" && (
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
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

      {/* ── MODAL KÁRDEX AUDITABLE DE FERRETERÍA / REPUESTOS ── */}
      {kardexModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
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

      {/* ── MODAL PRESENTACIONES FRACCIONADAS (CAJA, METRO, KILO, SACO) ── */}
      {presentacionesModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
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
        <ModalCompraProveedorFerreteria
          tenantId={user?.tenantId || 1}
          productos={productos.filter((p) => p.rubro === perfilActivo)}
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
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

        {/* Agregar ítems a la factura */}
        <div className="p-3.5 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-300/70 dark:border-slate-700/60 space-y-2">
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Añadir Ítems de Repuesto / Ferretería:</div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
            <div className="sm:col-span-6">
              <label className="text-[9px] text-slate-500 dark:text-slate-400 block mb-0.5">Artículo</label>
              <select
                value={repuestoSelId}
                onChange={(e) => setRepuestoSelId(e.target.value)}
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
        <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-2.5">Ítem</th>
                <th className="p-2.5 text-right">Cant.</th>
                <th className="p-2.5 text-right">Costo Unit.</th>
                <th className="p-2.5 text-right">Subtotal</th>
                <th className="p-2.5 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
              {lineas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500 dark:text-slate-400 font-sans">
                    Añade al menos un producto para procesar la entrada de almacén.
                  </td>
                </tr>
              ) : (
                lineas.map((l, idx) => (
                  <tr key={idx} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                    <td className="p-2.5 font-sans font-semibold text-slate-900 dark:text-white">{l.nombre}</td>
                    <td className="p-2.5 text-right font-bold text-teal-300">{l.cantidad}</td>
                    <td className="p-2.5 text-right">${Number(l.costoUnitario).toFixed(2)}</td>
                    <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">${((Number(l.cantidad) || 0) * (Number(l.costoUnitario) || 0)).toFixed(2)}</td>
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

