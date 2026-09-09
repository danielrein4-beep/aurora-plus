import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  IconRetail, IconHardware, IconPrescription, IconBox, IconSearch, IconUsers, IconUser,
  IconCard, IconTrash, IconRefresh, IconCheck, IconCheckCircle, IconClose, IconBank, IconDownload,
} from "../Icons";
import { useAuth } from "../context/AuthContext";
import {
  type Articulo, listarArticulos, crearArticulo, editarArticulo, eliminarArticulo, entradaArticulo,
  type PresentacionArticulo, listarPresentaciones, crearPresentacion,
  type ProveedorRetail, listarProveedoresRetail, crearProveedorRetail,
  type CompraRetail, listarComprasRetail, registrarCompraRetail, type ItemCompraRetail,
  buscarArticulosRetail, registrarVentaRetail, listarVentasRetail, type VentaRetail, type ItemVentaRetail,
  type CruceRepuesto, listarCrucesPorArticulo, crearCruceRepuesto, eliminarCruceRepuesto,
  type Cliente, listarClientes, crearCliente,
  type MovimientoCaja, registrarMovimiento, listarMovimientos,
  obtenerMonedaBaseNegocio, actualizarMonedaBaseNegocio,
} from "../api";

type Pagina = "pos" | "inventario" | "compras" | "proveedores" | "clientes" | "caja";
type Vertical = "farmacia" | "ferreteria" | "repuestos";

const VERTICAL_INFO: Record<Vertical, { nombre: string; Icon: (p: { size?: number }) => React.ReactNode }> = {
  farmacia: { nombre: "Aurora Retail · Farmacia", Icon: IconPrescription },
  ferreteria: { nombre: "Aurora Retail · Ferretería", Icon: IconHardware },
  repuestos: { nombre: "Aurora Retail · Repuestos", Icon: IconRetail },
};

const NAV: { id: Pagina; label: string; Icon: (p: { size?: number }) => React.ReactNode }[] = [
  { id: "pos", label: "Punto de Venta", Icon: IconCard },
  { id: "inventario", label: "Inventario", Icon: IconBox },
  { id: "compras", label: "Compras", Icon: IconDownload },
  { id: "proveedores", label: "Proveedores", Icon: IconHardware },
  { id: "clientes", label: "Clientes", Icon: IconUsers },
  { id: "caja", label: "Caja", Icon: IconBank },
];

export default function RetailApp({ onSalir }: { onSalir: () => void }) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || 1;
  const vertical: Vertical = (["farmacia", "ferreteria", "repuestos"] as const).includes(user?.industry as Vertical)
    ? (user!.industry as Vertical)
    : "ferreteria";
  const info = VERTICAL_INFO[vertical];

  const [pagina, setPagina] = useState<Pagina>("pos");
  const [articulos, setArticulos] = useState<Articulo[] | null>(null);
  const [proveedores, setProveedores] = useState<ProveedorRetail[] | null>(null);
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [monedaBaseTenant, setMonedaBaseTenant] = useState("USD");

  const cargarArticulos = () => listarArticulos().then(setArticulos).catch(() => setArticulos([]));
  const cargarProveedores = () => listarProveedoresRetail().then(setProveedores).catch(() => setProveedores([]));
  const cargarClientes = () => listarClientes(tenantId).then(setClientes).catch(() => setClientes([]));

  useEffect(() => {
    cargarArticulos();
    cargarProveedores();
    cargarClientes();
    obtenerMonedaBaseNegocio().then((r) => setMonedaBaseTenant(r.monedaBase)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  return (
    <div className="h-screen w-screen flex bg-slate-100 dark:bg-[#0a0e14] text-slate-900 dark:text-white overflow-hidden">
      <aside className="w-56 flex-shrink-0 border-r border-slate-300/50 dark:border-white/10 flex flex-col p-3 gap-1">
        <div className="flex items-center gap-2 px-2 py-3 mb-2">
          <info.Icon size={22} />
          <span className="font-['Outfit'] font-bold text-sm leading-tight">{info.nombre}</span>
        </div>
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setPagina(n.id)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
              pagina === n.id ? "bg-teal-500/15 text-teal-600 dark:text-teal-300" : "text-slate-500 dark:text-white/50 hover:bg-slate-200/60 dark:hover:bg-white/5"
            }`}
          >
            <n.Icon size={16} /> {n.label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onSalir} className="px-3 py-2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer text-left">
          ← Volver al Hub
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        {pagina === "pos" && (
          <PuntoDeVenta tenantId={tenantId} vertical={vertical} monedaBaseTenant={monedaBaseTenant} clientes={clientes} onVenta={cargarArticulos} />
        )}
        {pagina === "inventario" && (
          <Inventario tenantId={tenantId} vertical={vertical} monedaBaseTenant={monedaBaseTenant} articulos={articulos} onCambio={cargarArticulos} />
        )}
        {pagina === "compras" && (
          <Compras tenantId={tenantId} articulos={articulos} proveedores={proveedores} onCambio={cargarArticulos} />
        )}
        {pagina === "proveedores" && <Proveedores tenantId={tenantId} proveedores={proveedores} onCambio={cargarProveedores} />}
        {pagina === "clientes" && <Clientes tenantId={tenantId} clientes={clientes} onCambio={cargarClientes} />}
        {pagina === "caja" && <Caja tenantId={tenantId} monedaBaseTenant={monedaBaseTenant} onMonedaBaseCambiada={setMonedaBaseTenant} />}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTES COMPARTIDOS
// ══════════════════════════════════════════════════════════════════════════
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-slate-500 text-[11px] font-medium uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ titulo, onClose, children, ancho }: { titulo: string; onClose: () => void; children: React.ReactNode; ancho?: string }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`bg-white text-slate-900 rounded-3xl p-6 w-full ${ancho || "max-w-md"} max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200`}>
        <div className="flex items-center justify-between mb-4">
          <div role="heading" aria-level={3} className="font-['Outfit'] font-bold text-lg text-slate-900">{titulo}</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 cursor-pointer"><IconClose size={18} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

function calcularMargen(costo: number, precio: number): number | null {
  if (!precio) return null;
  return ((precio - costo) / precio) * 100;
}

// ══════════════════════════════════════════════════════════════════════════
// PUNTO DE VENTA — POS de mostrador: buscar/escanear, armar carrito, cobrar.
// ══════════════════════════════════════════════════════════════════════════
interface LineaCarrito {
  key: string; articulo: Articulo; cantidad: number; presentacion?: PresentacionArticulo;
}

function PuntoDeVenta({ tenantId, vertical, monedaBaseTenant, clientes, onVenta }: {
  tenantId: number; vertical: Vertical; monedaBaseTenant: string; clientes: Cliente[] | null; onVenta: () => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Articulo[]>([]);
  const [presentacionesPorArticulo, setPresentacionesPorArticulo] = useState<Record<number, PresentacionArticulo[]>>({});
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [clienteId, setClienteId] = useState<number | "">("");
  const [esCredito, setEsCredito] = useState(false);
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [monedaPago, setMonedaPago] = useState(monedaBaseTenant);
  const [montoRecibido, setMontoRecibido] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recibo, setRecibo] = useState<{ venta: VentaRetail; items: ItemVentaRetail[] } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setMonedaPago(monedaBaseTenant); }, [monedaBaseTenant]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const buscar = async () => {
    const q = busqueda.trim();
    if (!q) { setResultados([]); return; }
    try {
      const r = await buscarArticulosRetail(tenantId, q);
      setResultados(r);
      // Lectura de scanner: si hay exactamente un resultado (típico de un
      // código de barras exacto), se agrega directo al carrito sin obligar
      // a un segundo click — así el flujo con lector físico queda fluido.
      if (r.length === 1) {
        agregarAlCarrito(r[0]);
        setBusqueda("");
        setResultados([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo buscar");
    }
  };

  const cargarPresentaciones = (articuloId: number) => {
    if (presentacionesPorArticulo[articuloId]) return;
    listarPresentaciones(articuloId).then((p) => setPresentacionesPorArticulo((prev) => ({ ...prev, [articuloId]: p }))).catch(() => {});
  };

  const agregarAlCarrito = (articulo: Articulo, presentacion?: PresentacionArticulo) => {
    cargarPresentaciones(articulo.id);
    const key = `${articulo.id}_${presentacion?.id || "base"}`;
    setCarrito((prev) => {
      const existente = prev.find((l) => l.key === key);
      if (existente) return prev.map((l) => (l.key === key ? { ...l, cantidad: l.cantidad + 1 } : l));
      return [...prev, { key, articulo, presentacion, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (key: string, cantidad: number) => {
    setCarrito((prev) => prev.map((l) => (l.key === key ? { ...l, cantidad: Math.max(0.001, cantidad) } : l)));
  };
  const quitarLinea = (key: string) => setCarrito((prev) => prev.filter((l) => l.key !== key));

  const precioLinea = (l: LineaCarrito) => {
    const p = l.presentacion ? (l.presentacion.precioVenta ?? l.presentacion.unidadesPorPresentacion * l.articulo.precioVenta) : l.articulo.precioVenta;
    return p * l.cantidad;
  };
  const total = carrito.reduce((s, l) => s + precioLinea(l), 0);

  const cobrar = async () => {
    if (carrito.length === 0) { setError("Agrega al menos un artículo"); return; }
    if (esCredito && !clienteId) { setError("Una venta a crédito (fiado) necesita un cliente"); return; }
    setProcesando(true);
    setError(null);
    try {
      const r = await registrarVentaRetail(tenantId, {
        clienteId: clienteId ? Number(clienteId) : undefined,
        items: carrito.map((l) => ({ articuloId: l.articulo.id, cantidad: l.cantidad, presentacionId: l.presentacion?.id })),
        esCredito,
        metodoPago,
        monedaPago: esCredito ? undefined : monedaPago,
        montoRecibido: esCredito || monedaPago === monedaBaseTenant ? undefined : Number(montoRecibido),
      });
      setRecibo(r);
      setCarrito([]);
      setClienteId("");
      setEsCredito(false);
      setMontoRecibido("");
      onVenta();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo procesar la venta");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 h-full">
      <div className="lg:col-span-3 flex flex-col gap-3 min-h-0">
        <div className="relative">
          <input
            ref={inputRef}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
            placeholder={
              vertical === "repuestos" ? "Código de barras, nombre o código OEM…" :
              vertical === "farmacia" ? "Código de barras, nombre o principio activo…" :
              "Código de barras, nombre o SKU…"
            }
            className="input-horeca w-full pl-10 text-sm py-3"
            autoFocus
          />
          <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="apple-glass rounded-2xl p-3 flex-1 overflow-y-auto space-y-2">
          {resultados.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8">Escanea o escribe para buscar en el catálogo.</p>
          )}
          {resultados.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-100/60 dark:bg-white/5">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">{a.nombre}</div>
                <div className="text-[11px] text-slate-400">
                  SKU {a.sku} · Stock {Number(a.stockActual).toFixed(2)} {a.unidadMedida}
                  {vertical === "farmacia" && a.principioActivo && ` · ${a.principioActivo}`}
                </div>
              </div>
              <div className="text-sm font-bold">${Number(a.precioVenta).toFixed(2)}</div>
              <div className="flex items-center gap-1.5">
                {(presentacionesPorArticulo[a.id] || []).map((p) => (
                  <button key={p.id} onClick={() => agregarAlCarrito(a, p)}
                    className="text-[10px] font-semibold px-2 py-1.5 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-300 cursor-pointer">
                    {p.nombre}
                  </button>
                ))}
                <button onClick={() => agregarAlCarrito(a)} className="w-9 h-9 rounded-full bg-teal-500 text-white flex items-center justify-center cursor-pointer font-bold">+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 apple-glass rounded-2xl p-4 flex flex-col min-h-0">
        <h3 className="font-['Outfit'] font-bold text-base mb-3">Venta actual</h3>
        <div className="flex-1 overflow-y-auto space-y-2 mb-3">
          {carrito.length === 0 && <p className="text-xs text-slate-400 text-center py-6">El carrito está vacío</p>}
          {carrito.map((l) => (
            <div key={l.key} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{l.articulo.nombre}{l.presentacion ? ` (${l.presentacion.nombre})` : ""}</div>
                <div className="text-[11px] text-slate-400">${precioLinea(l).toFixed(2)}</div>
              </div>
              <input type="number" step="0.001" min="0.001" value={l.cantidad}
                onChange={(e) => cambiarCantidad(l.key, Number(e.target.value) || 0)}
                className="w-16 text-center input-horeca py-1 text-xs" />
              <button onClick={() => quitarLinea(l.key)} className="text-red-400 hover:text-red-500 cursor-pointer"><IconTrash size={14} /></button>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-300/50 dark:border-white/10 pt-3 space-y-2">
          <div className="flex items-center justify-between font-bold text-lg">
            <span>Total</span><span>${total.toFixed(2)}</span>
          </div>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : "")} className="input-horeca w-full text-xs">
            <option value="">Cliente (opcional)</option>
            {(clientes || []).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input type="checkbox" checked={esCredito} onChange={(e) => setEsCredito(e.target.checked)} />
            Fiado — venta a crédito (requiere cliente)
          </label>
          {!esCredito && (
            <div className="grid grid-cols-2 gap-2">
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="input-horeca text-xs">
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
              <select value={monedaPago} onChange={(e) => setMonedaPago(e.target.value)} className="input-horeca text-xs">
                {["USD", "VES", "COP"].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
          {!esCredito && monedaPago !== monedaBaseTenant && (
            <input value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)} type="number" step="0.01"
              placeholder={`Monto recibido en ${monedaPago}`} className="input-horeca w-full text-xs" />
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={cobrar} disabled={procesando || carrito.length === 0}
            className="w-full btn-cyber-neon text-white text-sm font-bold py-3 rounded-xl cursor-pointer disabled:opacity-50">
            {procesando ? "Procesando…" : esCredito ? "Registrar venta a crédito" : "Cobrar"}
          </button>
        </div>
      </div>

      {recibo && (
        <Modal titulo="Venta registrada" onClose={() => setRecibo(null)}>
          <div className="space-y-2">
            {recibo.items.map((it) => (
              <div key={it.id} className="flex justify-between text-sm">
                <span>{it.articulo.nombre} x{it.cantidad}</span>
                <span>${(it.precioUnitario * it.cantidad).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total</span><span>{recibo.venta.moneda} {Number(recibo.venta.total).toFixed(2)}</span>
            </div>
            <button onClick={() => setRecibo(null)} className="w-full g-aurora text-white text-sm font-semibold py-2.5 rounded-xl cursor-pointer mt-2">Cerrar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// INVENTARIO
// ══════════════════════════════════════════════════════════════════════════
function Inventario({ tenantId, vertical, monedaBaseTenant, articulos, onCambio }: {
  tenantId: number; vertical: Vertical; monedaBaseTenant: string; articulos: Articulo[] | null; onCambio: () => void;
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [articuloEditando, setArticuloEditando] = useState<Articulo | null>(null);
  const [cruceDeArticulo, setCruceDeArticulo] = useState<Articulo | null>(null);
  const [presentacionesDeArticulo, setPresentacionesDeArticulo] = useState<Articulo | null>(null);
  const [reabastecer, setReabastecer] = useState<Articulo | null>(null);

  const [form, setForm] = useState({
    nombre: "", sku: "", unidadMedida: "unidad", categoria: "", costoUnitario: "", precioVenta: "",
    stockMinimo: "", codigoBarras: "", principioActivo: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const articulosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return articulos || [];
    return (articulos || []).filter((a) =>
      a.nombre.toLowerCase().includes(q) || a.sku.toLowerCase().includes(q) || (a.codigoBarras || "").toLowerCase().includes(q)
    );
  }, [articulos, busqueda]);

  const crear = async () => {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    if (!form.sku.trim()) { setError("El SKU es obligatorio"); return; }
    setGuardando(true);
    setError(null);
    try {
      await crearArticulo(tenantId, {
        sku: form.sku.trim(),
        nombre: form.nombre.trim(),
        unidadMedida: form.unidadMedida,
        categoria: form.categoria.trim() || "General",
        costoUnitario: Number(form.costoUnitario) || 0,
        precioVenta: Number(form.precioVenta) || 0,
        stockMinimo: form.stockMinimo ? Number(form.stockMinimo) : undefined,
        codigoBarras: form.codigoBarras.trim() || undefined,
        principioActivo: vertical === "farmacia" ? (form.principioActivo.trim() || undefined) : undefined,
      });
      setForm({ nombre: "", sku: "", unidadMedida: "unidad", categoria: "", costoUnitario: "", precioVenta: "", stockMinimo: "", codigoBarras: "", principioActivo: "" });
      setMostrarForm(false);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el artículo");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-['Outfit'] font-bold text-xl">Inventario</h2>
        <button onClick={() => setMostrarForm(true)} className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
          + Nuevo artículo
        </button>
      </div>

      <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, SKU o código de barras…" className="input-horeca w-full" />

      <div className="apple-glass rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-300/50 dark:border-white/10">
              <th className="py-2 px-3">Artículo</th>
              <th className="py-2 px-3 text-right">Stock</th>
              <th className="py-2 px-3 text-right">Costo</th>
              <th className="py-2 px-3 text-right">Precio</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {articulosFiltrados.map((a) => {
              const margen = calcularMargen(Number(a.costoUnitario), Number(a.precioVenta));
              const sinStock = Number(a.stockActual) <= 0;
              const bajoMinimo = !sinStock && a.stockMinimo != null && Number(a.stockActual) <= Number(a.stockMinimo);
              return (
                <tr key={a.id} className="border-b border-slate-200/50 dark:border-white/5">
                  <td className="py-2 px-3">
                    <div className="font-semibold">{a.nombre}</div>
                    <div className="text-[10px] text-slate-400">
                      SKU {a.sku}{a.codigoBarras ? ` · ${a.codigoBarras}` : ""}{vertical === "farmacia" && a.principioActivo ? ` · ${a.principioActivo}` : ""}
                    </div>
                  </td>
                  <td className={`py-2 px-3 text-right font-semibold ${sinStock ? "text-red-500" : bajoMinimo ? "text-amber-500" : ""}`}>
                    {Number(a.stockActual).toFixed(2)} {a.unidadMedida}
                  </td>
                  <td className="py-2 px-3 text-right font-mono">${Number(a.costoUnitario).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono">
                    ${Number(a.precioVenta).toFixed(2)}
                    {margen != null && <span className="text-[10px] text-slate-400 ml-1">({margen.toFixed(0)}%)</span>}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setReabastecer(a)} title="Reabastecer" className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 flex items-center justify-center cursor-pointer"><IconDownload size={13} /></button>
                      {vertical === "ferreteria" && (
                        <button onClick={() => setPresentacionesDeArticulo(a)} title="Presentaciones (pricing por volumen)" className="w-7 h-7 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-300 flex items-center justify-center cursor-pointer"><IconBox size={13} /></button>
                      )}
                      {vertical === "repuestos" && (
                        <button onClick={() => setCruceDeArticulo(a)} title="Catálogo de cruce (OEM/vehículos)" className="w-7 h-7 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300 flex items-center justify-center cursor-pointer"><IconRefresh size={13} /></button>
                      )}
                      <button onClick={() => setArticuloEditando(a)} title="Editar" className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 flex items-center justify-center cursor-pointer"><IconCheckCircle size={13} /></button>
                      <button onClick={() => { if (confirm(`¿Eliminar "${a.nombre}"?`)) eliminarArticulo(tenantId, a.id).then(onCambio).catch((e) => alert(e.message)); }}
                        title="Eliminar" className="w-7 h-7 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center cursor-pointer"><IconTrash size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {mostrarForm && (
        <Modal titulo="Nuevo artículo" onClose={() => setMostrarForm(false)}>
          <div className="space-y-3">
            <Campo label="Nombre"><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-horeca w-full" autoFocus /></Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="SKU"><input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input-horeca w-full" /></Campo>
              <Campo label="Código de barras (opcional)"><input value={form.codigoBarras} onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })} className="input-horeca w-full" /></Campo>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Unidad de medida"><input value={form.unidadMedida} onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })} className="input-horeca w-full" /></Campo>
              <Campo label="Categoría"><input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="input-horeca w-full" /></Campo>
            </div>
            {vertical === "farmacia" && (
              <Campo label="Principio activo (para ofrecer genéricos)"><input value={form.principioActivo} onChange={(e) => setForm({ ...form, principioActivo: e.target.value })} className="input-horeca w-full" /></Campo>
            )}
            <div className="grid grid-cols-3 gap-3">
              <Campo label={`Costo unitario (${monedaBaseTenant})`}><input value={form.costoUnitario} onChange={(e) => setForm({ ...form, costoUnitario: e.target.value })} type="number" step="0.01" className="input-horeca w-full" /></Campo>
              <Campo label={`Precio de venta (${monedaBaseTenant})`}><input value={form.precioVenta} onChange={(e) => setForm({ ...form, precioVenta: e.target.value })} type="number" step="0.01" className="input-horeca w-full" /></Campo>
              <Campo label="Stock mínimo"><input value={form.stockMinimo} onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })} type="number" step="0.01" className="input-horeca w-full" /></Campo>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={crear} disabled={guardando} className="w-full btn-cyber-neon text-white text-sm font-bold py-3 rounded-xl cursor-pointer disabled:opacity-60">
              {guardando ? "Guardando…" : "Crear artículo"}
            </button>
          </div>
        </Modal>
      )}

      {articuloEditando && (
        <EditarArticuloModal tenantId={tenantId} vertical={vertical} articulo={articuloEditando} onClose={() => setArticuloEditando(null)} onGuardado={() => { setArticuloEditando(null); onCambio(); }} />
      )}
      {reabastecer && (
        <ReabastecerModal tenantId={tenantId} monedaBaseTenant={monedaBaseTenant} articulo={reabastecer} onClose={() => setReabastecer(null)} onGuardado={() => { setReabastecer(null); onCambio(); }} />
      )}
      {presentacionesDeArticulo && (
        <PresentacionesModal tenantId={tenantId} articulo={presentacionesDeArticulo} onClose={() => setPresentacionesDeArticulo(null)} />
      )}
      {cruceDeArticulo && (
        <CrucesModal tenantId={tenantId} articulo={cruceDeArticulo} onClose={() => setCruceDeArticulo(null)} />
      )}
    </div>
  );
}

function EditarArticuloModal({ tenantId, vertical, articulo, onClose, onGuardado }: {
  tenantId: number; vertical: Vertical; articulo: Articulo; onClose: () => void; onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(articulo.nombre);
  const [codigoBarras, setCodigoBarras] = useState(articulo.codigoBarras || "");
  const [principioActivo, setPrincipioActivo] = useState(articulo.principioActivo || "");
  const [precioVenta, setPrecioVenta] = useState(String(articulo.precioVenta));
  const [stockMinimo, setStockMinimo] = useState(articulo.stockMinimo != null ? String(articulo.stockMinimo) : "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await editarArticulo(tenantId, articulo.id, {
        nombre: nombre.trim(),
        precioVenta: Number(precioVenta),
        stockMinimo: stockMinimo ? Number(stockMinimo) : undefined,
        codigoBarras,
        principioActivo: vertical === "farmacia" ? principioActivo : undefined,
      });
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={`Editar · ${articulo.nombre}`} onClose={onClose}>
      <div className="space-y-3">
        <Campo label="Nombre"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className="input-horeca w-full" /></Campo>
        <Campo label="Código de barras"><input value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} className="input-horeca w-full" /></Campo>
        {vertical === "farmacia" && (
          <Campo label="Principio activo"><input value={principioActivo} onChange={(e) => setPrincipioActivo(e.target.value)} className="input-horeca w-full" /></Campo>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Precio de venta"><input value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} type="number" step="0.01" className="input-horeca w-full" /></Campo>
          <Campo label="Stock mínimo"><input value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} type="number" step="0.01" className="input-horeca w-full" /></Campo>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={guardar} disabled={guardando} className="w-full g-aurora text-white text-sm font-semibold py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </Modal>
  );
}

function ReabastecerModal({ tenantId, monedaBaseTenant, articulo, onClose, onGuardado }: {
  tenantId: number; monedaBaseTenant: string; articulo: Articulo; onClose: () => void; onGuardado: () => void;
}) {
  const [cantidad, setCantidad] = useState("");
  const [costoUnitario, setCostoUnitario] = useState(String(articulo.costoUnitario));
  const [moneda, setMoneda] = useState(monedaBaseTenant);
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    if (!cantidad || Number(cantidad) <= 0) { setError("Indica la cantidad que llegó"); return; }
    setGuardando(true);
    setError(null);
    try {
      await entradaArticulo(tenantId, articulo.id, {
        cantidad: Number(cantidad), costoUnitario: Number(costoUnitario), moneda, metodoPago,
        motivo: "Reabastecimiento",
      });
      onGuardado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la entrada");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={`Reabastecer · ${articulo.nombre}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-500">Stock actual: {Number(articulo.stockActual).toFixed(2)} {articulo.unidadMedida}</p>
        <div className="grid grid-cols-2 gap-3">
          <Campo label={`Cantidad (${articulo.unidadMedida})`}><input value={cantidad} onChange={(e) => setCantidad(e.target.value)} type="number" step="0.001" className="input-horeca w-full" autoFocus /></Campo>
          <Campo label={`Costo unitario (${moneda})`}><input value={costoUnitario} onChange={(e) => setCostoUnitario(e.target.value)} type="number" step="0.01" className="input-horeca w-full" /></Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="¿Cómo se pagó?">
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="input-horeca w-full">
              <option value="EFECTIVO">Efectivo</option><option value="TARJETA">Tarjeta</option><option value="TRANSFERENCIA">Transferencia</option>
            </select>
          </Campo>
          <Campo label="Moneda">
            <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className="input-horeca w-full">
              {["USD", "VES", "COP"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Campo>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={guardar} disabled={guardando} className="w-full g-aurora text-white text-sm font-semibold py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
          {guardando ? "Guardando…" : "Registrar entrada"}
        </button>
      </div>
    </Modal>
  );
}

function PresentacionesModal({ tenantId, articulo, onClose }: { tenantId: number; articulo: Articulo; onClose: () => void }) {
  const [presentaciones, setPresentaciones] = useState<PresentacionArticulo[] | null>(null);
  const [nombre, setNombre] = useState("");
  const [unidades, setUnidades] = useState("");
  const [precio, setPrecio] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cargar = () => listarPresentaciones(articulo.id).then(setPresentaciones).catch(() => setPresentaciones([]));
  useEffect(() => { cargar(); }, [articulo.id]);

  const agregar = async () => {
    if (!nombre.trim() || !unidades) { setError("Nombre y unidades por presentación son obligatorios"); return; }
    setError(null);
    try {
      await crearPresentacion(tenantId, articulo.id, { nombre: nombre.trim(), unidadesPorPresentacion: Number(unidades), precioVenta: precio ? Number(precio) : undefined });
      setNombre(""); setUnidades(""); setPrecio("");
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar");
    }
  };

  return (
    <Modal titulo={`Presentaciones · ${articulo.nombre}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-500">Precio por unidad suelta: ${Number(articulo.precioVenta).toFixed(2)} — define un precio propio para la presentación cerrada si es distinto al cálculo automático.</p>
        {(presentaciones || []).map((p) => (
          <div key={p.id} className="flex items-center justify-between text-sm bg-slate-100/60 dark:bg-white/5 rounded-lg px-3 py-2">
            <span>{p.nombre} ({p.unidadesPorPresentacion} {articulo.unidadMedida})</span>
            <span className="font-semibold">${(p.precioVenta ?? p.unidadesPorPresentacion * articulo.precioVenta).toFixed(2)}</span>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
          <Campo label="Nombre"><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Caja x24" className="input-horeca w-full text-xs" /></Campo>
          <Campo label={`Unidades (${articulo.unidadMedida})`}><input value={unidades} onChange={(e) => setUnidades(e.target.value)} type="number" step="0.0001" className="input-horeca w-full text-xs" /></Campo>
          <Campo label="Precio (opcional)"><input value={precio} onChange={(e) => setPrecio(e.target.value)} type="number" step="0.01" className="input-horeca w-full text-xs" /></Campo>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={agregar} className="w-full g-aurora text-white text-sm font-semibold py-2.5 rounded-xl cursor-pointer">+ Agregar presentación</button>
      </div>
    </Modal>
  );
}

function CrucesModal({ tenantId, articulo, onClose }: { tenantId: number; articulo: Articulo; onClose: () => void }) {
  const [cruces, setCruces] = useState<CruceRepuesto[] | null>(null);
  const [codigoOem, setCodigoOem] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cargar = () => listarCrucesPorArticulo(articulo.id, tenantId).then(setCruces).catch(() => setCruces([]));
  useEffect(() => { cargar(); }, [articulo.id]);

  const agregar = async () => {
    if (!codigoOem.trim() || !marca.trim() || !modelo.trim()) { setError("Código OEM, marca y modelo son obligatorios"); return; }
    setError(null);
    try {
      await crearCruceRepuesto(tenantId, articulo.id, { codigoOem: codigoOem.trim(), marcaVehiculo: marca.trim(), modeloVehiculo: modelo.trim() });
      setCodigoOem(""); setMarca(""); setModelo("");
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar");
    }
  };

  return (
    <Modal titulo={`Catálogo de cruce · ${articulo.nombre}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-500">Para qué vehículos y con qué códigos OEM cruza esta pieza — el POS los encuentra buscando por cualquiera de estos códigos.</p>
        {(cruces || []).map((c) => (
          <div key={c.id} className="flex items-center justify-between text-sm bg-slate-100/60 dark:bg-white/5 rounded-lg px-3 py-2">
            <span>{c.codigoOem} — {c.marcaVehiculo} {c.modeloVehiculo}</span>
            <button onClick={() => eliminarCruceRepuesto(c.id, tenantId).then(cargar)} className="text-red-400 hover:text-red-500 cursor-pointer"><IconTrash size={13} /></button>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
          <Campo label="Código OEM"><input value={codigoOem} onChange={(e) => setCodigoOem(e.target.value)} className="input-horeca w-full text-xs" /></Campo>
          <Campo label="Marca"><input value={marca} onChange={(e) => setMarca(e.target.value)} className="input-horeca w-full text-xs" /></Campo>
          <Campo label="Modelo"><input value={modelo} onChange={(e) => setModelo(e.target.value)} className="input-horeca w-full text-xs" /></Campo>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={agregar} className="w-full g-aurora text-white text-sm font-semibold py-2.5 rounded-xl cursor-pointer">+ Agregar cruce</button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PROVEEDORES
// ══════════════════════════════════════════════════════════════════════════
function Proveedores({ tenantId, proveedores, onCambio }: { tenantId: number; proveedores: ProveedorRetail[] | null; onCambio: () => void }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [rif, setRif] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);

  const crear = async () => {
    if (!nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setError(null);
    try {
      await crearProveedorRetail(tenantId, { nombre: nombre.trim(), rif: rif.trim() || undefined, telefono: telefono.trim() || undefined });
      setNombre(""); setRif(""); setTelefono("");
      setMostrarForm(false);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el proveedor");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-['Outfit'] font-bold text-xl">Proveedores</h2>
        <button onClick={() => setMostrarForm(true)} className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">+ Nuevo proveedor</button>
      </div>
      <div className="apple-glass rounded-2xl divide-y divide-slate-200/50 dark:divide-white/5">
        {(proveedores || []).map((p) => (
          <div key={p.id} className="p-3 flex items-center justify-between text-sm">
            <div>
              <div className="font-semibold">{p.nombre}</div>
              <div className="text-[11px] text-slate-400">{p.rif || "Sin RIF"} · {p.telefono || "Sin teléfono"}</div>
            </div>
          </div>
        ))}
      </div>
      {mostrarForm && (
        <Modal titulo="Nuevo proveedor" onClose={() => setMostrarForm(false)}>
          <div className="space-y-3">
            <Campo label="Nombre"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className="input-horeca w-full" autoFocus /></Campo>
            <Campo label="RIF (opcional)"><input value={rif} onChange={(e) => setRif(e.target.value)} className="input-horeca w-full" /></Campo>
            <Campo label="Teléfono (opcional)"><input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="input-horeca w-full" /></Campo>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={crear} className="w-full g-aurora text-white text-sm font-semibold py-2.5 rounded-xl cursor-pointer">Crear</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPRAS
// ══════════════════════════════════════════════════════════════════════════
interface FilaCompra { articuloId: string; cantidad: string; costoUnitario: string }

function Compras({ tenantId, articulos, proveedores, onCambio }: {
  tenantId: number; articulos: Articulo[] | null; proveedores: ProveedorRetail[] | null; onCambio: () => void;
}) {
  const [compras, setCompras] = useState<CompraRetail[] | null>(null);
  const [proveedorId, setProveedorId] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [filas, setFilas] = useState<FilaCompra[]>([{ articuloId: "", cantidad: "", costoUnitario: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { listarComprasRetail(tenantId).then(setCompras).catch(() => setCompras([])); }, [tenantId]);

  const actualizarFila = (idx: number, campo: keyof FilaCompra, valor: string) => {
    setFilas((prev) => prev.map((f, i) => (i === idx ? { ...f, [campo]: valor } : f)));
  };

  const registrar = async () => {
    if (!proveedorId) { setError("Selecciona un proveedor"); return; }
    const items: ItemCompraRetail[] = filas
      .filter((f) => f.articuloId && f.cantidad && f.costoUnitario)
      .map((f) => ({ articuloId: Number(f.articuloId), cantidad: Number(f.cantidad), costoUnitario: Number(f.costoUnitario) }));
    if (items.length === 0) { setError("Agrega al menos un ítem"); return; }
    setGuardando(true);
    setError(null);
    try {
      await registrarCompraRetail(tenantId, { proveedorId: Number(proveedorId), numeroFactura: numeroFactura.trim() || "S/N", items });
      setFilas([{ articuloId: "", cantidad: "", costoUnitario: "" }]);
      setNumeroFactura("");
      setProveedorId("");
      listarComprasRetail(tenantId).then(setCompras).catch(() => {});
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la compra");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-['Outfit'] font-bold text-xl">Compras a proveedor</h2>
      <div className="apple-glass rounded-2xl p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="input-horeca">
            <option value="">— Selecciona proveedor —</option>
            {(proveedores || []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <input value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} placeholder="N° de factura" className="input-horeca" />
        </div>
        {filas.map((f, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-2">
            <select value={f.articuloId} onChange={(e) => actualizarFila(idx, "articuloId", e.target.value)} className="input-horeca text-xs">
              <option value="">Artículo…</option>
              {(articulos || []).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
            <input value={f.cantidad} onChange={(e) => actualizarFila(idx, "cantidad", e.target.value)} type="number" step="0.001" placeholder="Cantidad" className="input-horeca text-xs" />
            <input value={f.costoUnitario} onChange={(e) => actualizarFila(idx, "costoUnitario", e.target.value)} type="number" step="0.01" placeholder="Costo unitario" className="input-horeca text-xs" />
          </div>
        ))}
        <button onClick={() => setFilas((prev) => [...prev, { articuloId: "", cantidad: "", costoUnitario: "" }])} className="text-xs font-semibold text-teal-600 cursor-pointer">+ Agregar ítem</button>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={registrar} disabled={guardando} className="w-full btn-cyber-neon text-white text-sm font-bold py-3 rounded-xl cursor-pointer disabled:opacity-60">
          {guardando ? "Guardando…" : "Registrar compra"}
        </button>
      </div>

      <div className="apple-glass rounded-2xl divide-y divide-slate-200/50 dark:divide-white/5">
        {(compras || []).map((c) => (
          <div key={c.id} className="p-3 flex items-center justify-between text-sm">
            <div>
              <div className="font-semibold">{c.proveedor?.nombre || "Proveedor eliminado"} — Factura {c.numeroFactura}</div>
              <div className="text-[11px] text-slate-400">{new Date(c.fechaCompra).toLocaleDateString()}</div>
            </div>
            <div className="font-bold">${Number(c.total).toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CLIENTES
// ══════════════════════════════════════════════════════════════════════════
function Clientes({ tenantId, clientes, onCambio }: { tenantId: number; clientes: Cliente[] | null; onCambio: () => void }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [identificacionRif, setIdentificacionRif] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);

  const crear = async () => {
    setError(null);
    try {
      await crearCliente(tenantId, { nombre: nombre.trim() || undefined, identificacionRif: identificacionRif.trim() || undefined, telefono: telefono.trim() || undefined });
      setNombre(""); setIdentificacionRif(""); setTelefono("");
      setMostrarForm(false);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el cliente");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-['Outfit'] font-bold text-xl">Clientes</h2>
        <button onClick={() => setMostrarForm(true)} className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">+ Nuevo cliente</button>
      </div>
      <div className="apple-glass rounded-2xl divide-y divide-slate-200/50 dark:divide-white/5">
        {(clientes || []).map((c) => (
          <div key={c.id} className="p-3 flex items-center gap-3 text-sm">
            <IconUser size={16} />
            <div>
              <div className="font-semibold">{c.nombre}</div>
              <div className="text-[11px] text-slate-400">{c.identificacionRif || "Sin cédula/RIF"} · {c.telefono || "Sin teléfono"}</div>
            </div>
          </div>
        ))}
      </div>
      {mostrarForm && (
        <Modal titulo="Nuevo cliente" onClose={() => setMostrarForm(false)}>
          <div className="space-y-3">
            <Campo label="Nombre"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className="input-horeca w-full" autoFocus /></Campo>
            <Campo label="Cédula / RIF"><input value={identificacionRif} onChange={(e) => setIdentificacionRif(e.target.value)} className="input-horeca w-full" /></Campo>
            <Campo label="Teléfono"><input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="input-horeca w-full" /></Campo>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={crear} className="w-full g-aurora text-white text-sm font-semibold py-2.5 rounded-xl cursor-pointer">Crear</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CAJA — ingresos/gastos + moneda base del negocio
// ══════════════════════════════════════════════════════════════════════════
function Caja({ tenantId, monedaBaseTenant, onMonedaBaseCambiada }: {
  tenantId: number; monedaBaseTenant: string; onMonedaBaseCambiada: (m: string) => void;
}) {
  const [movimientos, setMovimientos] = useState<MovimientoCaja[] | null>(null);
  const [form, setForm] = useState({ tipo: "EGRESO" as "INGRESO" | "EGRESO", monto: "", moneda: monedaBaseTenant, concepto: "" });
  const [guardandoMoneda, setGuardandoMoneda] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = () => listarMovimientos(tenantId).then(setMovimientos).catch(() => setMovimientos([]));
  useEffect(() => { cargar(); }, [tenantId]);

  const registrar = async () => {
    if (!form.monto || Number(form.monto) <= 0) { setError("El monto debe ser mayor a cero"); return; }
    setError(null);
    try {
      await registrarMovimiento(tenantId, { tipo: form.tipo, monto: Number(form.monto), moneda: form.moneda, concepto: form.concepto || form.tipo });
      setForm({ ...form, monto: "", concepto: "" });
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el movimiento");
    }
  };

  const cambiarMonedaBase = async (nueva: string) => {
    if (nueva === monedaBaseTenant) return;
    setGuardandoMoneda(true);
    try {
      const r = await actualizarMonedaBaseNegocio(nueva);
      onMonedaBaseCambiada(r.monedaBase);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo cambiar la moneda base");
    } finally {
      setGuardandoMoneda(false);
    }
  };

  const porMoneda = (tipo: "INGRESO" | "EGRESO") =>
    (movimientos || []).filter((m) => m.tipo === tipo).reduce<Record<string, number>>((acc, m) => {
      acc[m.moneda] = (acc[m.moneda] || 0) + Number(m.monto);
      return acc;
    }, {});
  const ingresos = porMoneda("INGRESO");
  const egresos = porMoneda("EGRESO");

  return (
    <div className="space-y-4">
      <h2 className="font-['Outfit'] font-bold text-xl">Caja</h2>

      <div className="apple-glass rounded-2xl p-5 space-y-2">
        <h3 className="font-semibold text-sm">Moneda principal del negocio</h3>
        <div className="flex items-center gap-2">
          {["USD", "VES", "COP"].map((m) => (
            <button key={m} onClick={() => cambiarMonedaBase(m)} disabled={guardandoMoneda}
              className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${monedaBaseTenant === m ? "bg-teal-600 text-white" : "bg-slate-200/70 dark:bg-white/10"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="apple-glass rounded-2xl p-5">
          <div className="text-xs text-slate-500 mb-2">Ingresos</div>
          {Object.entries(ingresos).map(([m, v]) => <div key={m} className="flex justify-between text-sm"><span>{m}</span><span className="font-bold">{v.toFixed(2)}</span></div>)}
        </div>
        <div className="apple-glass rounded-2xl p-5">
          <div className="text-xs text-slate-500 mb-2">Egresos</div>
          {Object.entries(egresos).map(([m, v]) => <div key={m} className="flex justify-between text-sm"><span>{m}</span><span className="font-bold">{v.toFixed(2)}</span></div>)}
        </div>
      </div>

      <div className="apple-glass rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold text-sm">Registrar movimiento</h3>
        <div className="grid grid-cols-4 gap-2">
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as "INGRESO" | "EGRESO" })} className="input-horeca text-xs">
            <option value="EGRESO">Egreso</option><option value="INGRESO">Ingreso</option>
          </select>
          <input value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} type="number" step="0.01" placeholder="Monto" className="input-horeca text-xs" />
          <select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} className="input-horeca text-xs">
            {["USD", "VES", "COP"].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} placeholder="Concepto" className="input-horeca text-xs" />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={registrar} className="w-full g-aurora text-white text-sm font-semibold py-2.5 rounded-xl cursor-pointer">Registrar</button>
      </div>
    </div>
  );
}
