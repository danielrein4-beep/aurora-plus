import { useState, useEffect, useMemo } from "react";
import {
  IconRestaurant, IconCustomize, IconUsers, IconHourglass, IconCard, IconFileText,
  IconCheck, IconTrash, IconRefresh, IconCheckCircle, IconWarning, IconSearch, IconClose,
} from "../Icons";
import { useAuth } from "../context/AuthContext";
import {
  mapaDeMesas, crearMesa, abrirComanda, agregarItemComanda, actualizarEstadoItem, obtenerTableroKds,
  dividirCuenta, cerrarComanda, listarEscandallos, crearEscandallo, agregarIngredienteEscandallo,
  listarIngredientesEscandallo, listarFastBar, crearTragoFastBar, venderTragoRapido,
  listarProveedoresHoreca, crearProveedorHoreca, listarArticulos, crearArticulo,
  registrarCompraInsumo, alertasVencimiento,
  type MapaMesaEntrada, type Comanda, type ItemComanda, type EstadoItemComanda,
  type EscandalloReceta, type DetalleReceta, type FastBarTrago, type ProveedorHoreca,
  type Articulo, type ItemCompraInsumo, type LoteArticulo,
} from "../api";

type Pagina = "general" | "salon" | "cocina" | "recetas" | "fastbar" | "compras" | "vencimientos" | "configuracion";

const NAV: { id: Pagina; label: string; Icon: (p: { size?: number }) => JSX.Element }[] = [
  { id: "general", label: "Vista General", Icon: IconCustomize },
  { id: "salon", label: "Salón & Mesas", Icon: IconRestaurant },
  { id: "cocina", label: "Cocina (KDS)", Icon: IconHourglass },
  { id: "recetas", label: "Recetas & Escandallo", Icon: IconFileText },
  { id: "fastbar", label: "Fast-Bar", Icon: IconCard },
  { id: "compras", label: "Compras & Proveedores", Icon: IconUsers },
  { id: "vencimientos", label: "Vencimientos", Icon: IconWarning },
  { id: "configuracion", label: "Configuración", Icon: IconCustomize },
];

const ESTACIONES = ["COCINA", "PARRILLA", "BAR", "COCINA_FRIA"];
const hoy = () => new Date().toISOString().slice(0, 10);

const CONFIG_KEY = "aurora_horeca_config_perfil";
const ITEMS_LOCALES_KEY = "aurora_horeca_items_por_comanda";
const VENTAS_HOY_KEY = `aurora_horeca_ventas_${hoy()}`;

interface ItemLocal extends ItemComanda {}

export default function RestauranteApp({ onSalir }: { onSalir: () => void }) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || 1;
  const [pagina, setPagina] = useState<Pagina>("general");

  const [config, setConfig] = useState(() => {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? JSON.parse(raw) : { nombreLocal: user?.empresa || "Mi Restaurante", tasaBCV: 56.4, tasaCOP: 4200 };
    } catch {
      return { nombreLocal: user?.empresa || "Mi Restaurante", tasaBCV: 56.4, tasaCOP: 4200 };
    }
  });
  const guardarConfig = (c: any) => {
    setConfig(c);
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); } catch {}
  };

  // Los ítems de una comanda abierta no tienen endpoint de "listar" en el backend
  // (solo el tablero de cocina por estación) — se acumulan aquí al agregarlos,
  // igual que Mediclinic rastrea sus cobros del día localmente.
  const [itemsPorComanda, setItemsPorComanda] = useState<Record<number, ItemLocal[]>>(() => {
    try {
      const raw = localStorage.getItem(ITEMS_LOCALES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  useEffect(() => {
    try { localStorage.setItem(ITEMS_LOCALES_KEY, JSON.stringify(itemsPorComanda)); } catch {}
  }, [itemsPorComanda]);

  const [ventasHoy, setVentasHoy] = useState<{ id: number; monto: number; metodo: string; hora: string }[]>(() => {
    try {
      const raw = localStorage.getItem(VENTAS_HOY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(VENTAS_HOY_KEY, JSON.stringify(ventasHoy)); } catch {}
  }, [ventasHoy]);
  const registrarVenta = (monto: number, metodo: string) => {
    setVentasHoy((prev) => [{ id: Date.now(), monto, metodo, hora: new Date().toLocaleTimeString() }, ...prev]);
  };

  const [mapa, setMapa] = useState<MapaMesaEntrada[] | null>(null);
  const [escandallos, setEscandallos] = useState<EscandalloReceta[] | null>(null);
  const [fastbar, setFastbar] = useState<FastBarTrago[] | null>(null);
  const [proveedores, setProveedores] = useState<ProveedorHoreca[] | null>(null);
  const [articulos, setArticulos] = useState<Articulo[] | null>(null);
  const [lotesPorVencer, setLotesPorVencer] = useState<LoteArticulo[] | null>(null);
  const [kdsCounts, setKdsCounts] = useState<number>(0);

  const recargarTodo = () => {
    mapaDeMesas().then(setMapa).catch(() => setMapa([]));
    listarEscandallos().then(setEscandallos).catch(() => setEscandallos([]));
    listarFastBar(tenantId).then(setFastbar).catch(() => setFastbar([]));
    listarProveedoresHoreca().then(setProveedores).catch(() => setProveedores([]));
    listarArticulos().then(setArticulos).catch(() => setArticulos([]));
    alertasVencimiento(tenantId, 7).then(setLotesPorVencer).catch(() => setLotesPorVencer([]));
    Promise.all(ESTACIONES.map((e) => obtenerTableroKds(e).catch(() => [])))
      .then((listas) => setKdsCounts(listas.reduce((sum, l) => sum + l.filter((i) => i.estadoItem !== "ENTREGADO").length, 0)))
      .catch(() => setKdsCounts(0));
  };

  useEffect(() => { recargarTodo(); }, [tenantId]);

  const totalVentasHoy = ventasHoy.reduce((s, v) => s + v.monto, 0);
  const mesasOcupadas = (mapa || []).filter((m) => m.estado === "OCUPADA").length;
  const comandasAbiertas = (mapa || []).filter((m) => m.comandaAbierta).length;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
      {/* SIDEBAR */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-300/60 dark:border-white/10 flex flex-col p-4 space-y-1">
        <div className="px-2 pb-4 mb-2 border-b border-slate-300/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div className="font-['Outfit'] font-black text-lg text-aurora">Aurora Horeca</div>
            {kdsCounts > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-mono font-bold">{kdsCounts} en cocina</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider mt-0.5">{config.nombreLocal}</div>
        </div>

        {NAV.map((n) => {
          const alertaVencimiento = n.id === "vencimientos" && (lotesPorVencer || []).length > 0;
          return (
            <button
              key={n.id}
              onClick={() => setPagina(n.id)}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                pagina === n.id
                  ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 shadow-sm"
                  : alertaVencimiento
                  ? "text-red-600 dark:text-red-300 hover:bg-red-500/10"
                  : "text-slate-600 dark:text-white/60 hover:bg-slate-200/60 dark:hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2.5"><n.Icon size={16} /><span>{n.label}</span></span>
              {alertaVencimiento && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-500 font-bold">{(lotesPorVencer || []).length}</span>
              )}
            </button>
          );
        })}

        <div className="flex-1" />

        <button
          onClick={onSalir}
          className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-left text-slate-500 dark:text-white/40 hover:bg-slate-200/60 dark:hover:bg-white/5 cursor-pointer"
        >
          ← Volver al Hub
        </button>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 border-b border-slate-300/60 dark:border-white/10 flex items-center justify-between px-6 bg-white/30 dark:bg-black/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={onSalir}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200/70 dark:bg-white/10 hover:bg-teal-600 hover:text-white text-slate-700 dark:text-white/80 transition-all flex items-center gap-1.5 cursor-pointer border border-slate-300/60 dark:border-white/10"
            >
              <span>← Aurora Hub</span>
            </button>
            <h2 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
              {NAV.find((n) => n.id === pagina)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-right hidden sm:block">
              <div className="font-bold text-slate-900 dark:text-white">{config.nombreLocal}</div>
              <div className="text-[11px] text-teal-600 dark:text-teal-400 font-mono">BCV: Bs. {Number(config.tasaBCV).toFixed(2)}</div>
            </div>
            <button onClick={recargarTodo} className="p-2 rounded-xl border border-slate-300/60 dark:border-white/10 hover:bg-white/10 text-slate-600 dark:text-white/60 cursor-pointer" title="Actualizar datos">
              <IconRefresh size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {pagina === "general" && (
            <VistaGeneral mesasOcupadas={mesasOcupadas} totalMesas={(mapa || []).length} comandasAbiertas={comandasAbiertas}
              totalVentasHoy={totalVentasHoy} kdsCounts={kdsCounts} vencimientos={(lotesPorVencer || []).length} onNavegar={setPagina} />
          )}
          {pagina === "salon" && (
            <Salon tenantId={tenantId} mapa={mapa} itemsPorComanda={itemsPorComanda} setItemsPorComanda={setItemsPorComanda}
              escandallos={escandallos} onVenta={registrarVenta} onCambio={recargarTodo} />
          )}
          {pagina === "cocina" && <Cocina onCambio={recargarTodo} />}
          {pagina === "recetas" && <Recetas tenantId={tenantId} escandallos={escandallos} onCambio={recargarTodo} />}
          {pagina === "fastbar" && <FastBar tenantId={tenantId} fastbar={fastbar} onVenta={registrarVenta} onCambio={recargarTodo} />}
          {pagina === "compras" && (
            <ComprasProveedores tenantId={tenantId} proveedores={proveedores} articulos={articulos} onCambio={recargarTodo} />
          )}
          {pagina === "vencimientos" && <Vencimientos tenantId={tenantId} onCambio={recargarTodo} />}
          {pagina === "configuracion" && <Configuracion config={config} onGuardar={guardarConfig} />}
        </div>
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
function KpiCard({ label, val, sub, color, onClick }: { label: string; val: string; sub: string; color: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`apple-glass rounded-2xl p-5 border-l-4 transition-all ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`} style={{ borderLeftColor: color }}>
      <div className="text-xs text-slate-500 dark:text-white/40">{label}</div>
      <div className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white mt-1">{val}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// VISTA GENERAL
// ══════════════════════════════════════════════════════════════════════════
function VistaGeneral({ mesasOcupadas, totalMesas, comandasAbiertas, totalVentasHoy, kdsCounts, vencimientos, onNavegar }: {
  mesasOcupadas: number; totalMesas: number; comandasAbiertas: number; totalVentasHoy: number; kdsCounts: number; vencimientos: number;
  onNavegar: (p: Pagina) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Mesas Ocupadas" val={`${mesasOcupadas}/${totalMesas || "…"}`} sub="Mapa del salón" color="#0ea5e9" onClick={() => onNavegar("salon")} />
        <KpiCard label="Comandas Abiertas" val={String(comandasAbiertas)} sub="Salón, delivery y recoger" color="#a855f7" onClick={() => onNavegar("salon")} />
        <KpiCard label="Ventas del Día" val={`$${totalVentasHoy.toFixed(2)}`} sub="Comandas y Fast-Bar cerrados" color="#10b981" onClick={() => onNavegar("salon")} />
        <KpiCard label="Platos en Cocina" val={String(kdsCounts)} sub="Pendientes + en preparación" color="#f59e0b" onClick={() => onNavegar("cocina")} />
        <KpiCard label="Por Vencer" val={String(vencimientos)} sub="Lotes vencidos o próximos" color={vencimientos > 0 ? "#ef4444" : "#64748b"} onClick={() => onNavegar("vencimientos")} />
      </div>
      <div className="apple-glass rounded-2xl p-6">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">Accesos rápidos</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => onNavegar("salon")} className="apple-glass rounded-xl p-4 text-left hover-card cursor-pointer">
            <IconRestaurant size={20} /><div className="text-sm font-semibold mt-2 text-slate-900 dark:text-white">Abrir mesa / comanda</div>
          </button>
          <button onClick={() => onNavegar("cocina")} className="apple-glass rounded-xl p-4 text-left hover-card cursor-pointer">
            <IconHourglass size={20} /><div className="text-sm font-semibold mt-2 text-slate-900 dark:text-white">Ver tablero de cocina</div>
          </button>
          <button onClick={() => onNavegar("recetas")} className="apple-glass rounded-xl p-4 text-left hover-card cursor-pointer">
            <IconFileText size={20} /><div className="text-sm font-semibold mt-2 text-slate-900 dark:text-white">Registrar receta / costo</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SALÓN & MESAS
// ══════════════════════════════════════════════════════════════════════════
function Salon({ tenantId, mapa, itemsPorComanda, setItemsPorComanda, escandallos, onVenta, onCambio }: {
  tenantId: number; mapa: MapaMesaEntrada[] | null;
  itemsPorComanda: Record<number, ItemLocal[]>; setItemsPorComanda: (fn: (prev: Record<number, ItemLocal[]>) => Record<number, ItemLocal[]>) => void;
  escandallos: EscandalloReceta[] | null; onVenta: (monto: number, metodo: string) => void; onCambio: () => void;
}) {
  const [abriendo, setAbriendo] = useState<MapaMesaEntrada | null>(null);
  const [comandaActiva, setComandaActiva] = useState<Comanda | null>(null);
  const [formApertura, setFormApertura] = useState({ mesero: "", canal: "SALON", nombreCliente: "", telefonoCliente: "", direccionEntrega: "" });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mostrarNuevaMesa, setMostrarNuevaMesa] = useState(false);
  const [nuevaMesa, setNuevaMesa] = useState({ numero: "", capacidad: "", zona: "SALON_PRINCIPAL" });
  const [errorMesa, setErrorMesa] = useState<string | null>(null);
  const [guardandoMesa, setGuardandoMesa] = useState(false);

  const siguienteNumero = (mapa || []).reduce((max, m) => Math.max(max, m.mesa.numero), 0) + 1;

  const handleCrearMesa = async () => {
    setErrorMesa(null);
    setGuardandoMesa(true);
    try {
      await crearMesa(tenantId, {
        numero: Number(nuevaMesa.numero) || siguienteNumero,
        capacidad: nuevaMesa.capacidad ? Number(nuevaMesa.capacidad) : undefined,
        zona: nuevaMesa.zona,
      });
      setNuevaMesa({ numero: "", capacidad: "", zona: "SALON_PRINCIPAL" });
      setMostrarNuevaMesa(false);
      onCambio();
    } catch (e) {
      setErrorMesa(e instanceof Error ? e.message : "No se pudo crear la mesa");
    } finally {
      setGuardandoMesa(false);
    }
  };

  const handleAbrir = async () => {
    if (!abriendo) return;
    if (!formApertura.mesero.trim()) { setError("Indica el nombre del mesero"); return; }
    setGuardando(true);
    setError(null);
    try {
      const comanda = await abrirComanda(tenantId, {
        numeroMesa: abriendo.mesa.numero,
        mesero: formApertura.mesero.trim(),
        canal: formApertura.canal,
        nombreCliente: formApertura.nombreCliente || undefined,
        telefonoCliente: formApertura.telefonoCliente || undefined,
        direccionEntrega: formApertura.canal === "DELIVERY_PROPIO" ? formApertura.direccionEntrega : undefined,
      });
      setItemsPorComanda((prev) => ({ ...prev, [comanda.id]: [] }));
      setAbriendo(null);
      setFormApertura({ mesero: "", canal: "SALON", nombreCliente: "", telefonoCliente: "", direccionEntrega: "" });
      onCambio();
      setComandaActiva(comanda);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir la comanda");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-white/40">{(mapa || []).length} mesas registradas</p>
        <button onClick={() => { setMostrarNuevaMesa((v) => !v); setNuevaMesa({ numero: String(siguienteNumero), capacidad: "", zona: "SALON_PRINCIPAL" }); }}
          className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
          {mostrarNuevaMesa ? "Cancelar" : "+ Nueva mesa"}
        </button>
      </div>

      {mostrarNuevaMesa && (
        <div className="apple-glass rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={nuevaMesa.numero} onChange={(e) => setNuevaMesa({ ...nuevaMesa, numero: e.target.value })} type="number" placeholder="Número de mesa" className="input-horeca" />
            <input value={nuevaMesa.capacidad} onChange={(e) => setNuevaMesa({ ...nuevaMesa, capacidad: e.target.value })} type="number" placeholder="Capacidad (pax)" className="input-horeca" />
            <select value={nuevaMesa.zona} onChange={(e) => setNuevaMesa({ ...nuevaMesa, zona: e.target.value })} className="input-horeca">
              <option value="SALON_PRINCIPAL">Salón principal</option>
              <option value="TERRAZA">Terraza</option>
              <option value="BARRA">Barra</option>
            </select>
          </div>
          {errorMesa && <p className="text-xs text-red-500">{errorMesa}</p>}
          <button onClick={handleCrearMesa} disabled={guardandoMesa} className="btn-cyber-neon text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {guardandoMesa ? "Guardando…" : "Guardar mesa"}
          </button>
        </div>
      )}

      {mapa === null ? (
        <p className="text-sm text-slate-400">Cargando mapa de mesas…</p>
      ) : mapa.length === 0 ? (
        <div className="apple-glass rounded-2xl p-8 text-center">
          <p className="text-slate-500 dark:text-white/40 text-sm">Aún no tienes mesas registradas. Usa "+ Nueva mesa" arriba para agregar la primera.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {mapa.map((m) => (
            <button
              key={m.mesa.id}
              onClick={() => (m.estado === "OCUPADA" && m.comandaAbierta ? setComandaActiva(m.comandaAbierta) : setAbriendo(m))}
              className={`aspect-square rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 border-2 transition-all cursor-pointer hover:scale-[1.03] ${
                m.estado === "OCUPADA"
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-300"
                  : "bg-teal-500/10 border-teal-500/30 text-teal-600 dark:text-teal-300"
              }`}
            >
              <IconRestaurant size={22} />
              <span className="font-['Outfit'] font-black text-lg">Mesa {m.mesa.numero}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider">{m.estado}</span>
              {m.mesa.capacidad != null && <span className="text-[10px] opacity-70">{m.mesa.capacidad} pax</span>}
            </button>
          ))}
        </div>
      )}

      {/* Modal: abrir comanda */}
      {abriendo && (
        <Modal onClose={() => setAbriendo(null)} titulo={`Abrir Mesa ${abriendo.mesa.numero}`}>
          <div className="space-y-3">
            <Campo label="Mesero">
              <input value={formApertura.mesero} onChange={(e) => setFormApertura({ ...formApertura, mesero: e.target.value })}
                placeholder="Nombre del mesero" className="input-horeca" />
            </Campo>
            <Campo label="Canal">
              <select value={formApertura.canal} onChange={(e) => setFormApertura({ ...formApertura, canal: e.target.value })} className="input-horeca">
                <option value="SALON">Salón (mesa)</option>
                <option value="DELIVERY_PROPIO">Delivery propio</option>
                <option value="RECOGER_EN_TIENDA">Recoger en tienda</option>
              </select>
            </Campo>
            {formApertura.canal !== "SALON" && (
              <>
                <Campo label="Cliente">
                  <input value={formApertura.nombreCliente} onChange={(e) => setFormApertura({ ...formApertura, nombreCliente: e.target.value })} placeholder="Nombre del cliente" className="input-horeca" />
                </Campo>
                <Campo label="Teléfono">
                  <input value={formApertura.telefonoCliente} onChange={(e) => setFormApertura({ ...formApertura, telefonoCliente: e.target.value })} placeholder="Teléfono de contacto" className="input-horeca" />
                </Campo>
              </>
            )}
            {formApertura.canal === "DELIVERY_PROPIO" && (
              <Campo label="Dirección de entrega">
                <input value={formApertura.direccionEntrega} onChange={(e) => setFormApertura({ ...formApertura, direccionEntrega: e.target.value })} placeholder="Dirección" className="input-horeca" />
              </Campo>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={handleAbrir} disabled={guardando} className="w-full g-aurora text-white font-semibold py-2.5 rounded-xl text-sm cursor-pointer disabled:opacity-60">
              {guardando ? "Abriendo…" : "Abrir Comanda"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: comanda activa */}
      {comandaActiva && (
        <ComandaDetalle
          tenantId={tenantId}
          comanda={comandaActiva}
          items={itemsPorComanda[comandaActiva.id] || []}
          escandallos={escandallos}
          onAgregarItem={(item) => setItemsPorComanda((prev) => ({ ...prev, [comandaActiva.id]: [...(prev[comandaActiva.id] || []), item] }))}
          onCerrar={(monto, metodo) => { onVenta(monto, metodo); setComandaActiva(null); onCambio(); }}
          onClose={() => setComandaActiva(null)}
        />
      )}
    </div>
  );
}

function ComandaDetalle({ tenantId, comanda, items, escandallos, onAgregarItem, onCerrar, onClose }: {
  tenantId: number; comanda: Comanda; items: ItemLocal[]; escandallos: EscandalloReceta[] | null;
  onAgregarItem: (item: ItemLocal) => void; onCerrar: (monto: number, metodo: string) => void; onClose: () => void;
}) {
  const [escandalloSel, setEscandalloSel] = useState<string>("");
  const [nombrePlato, setNombrePlato] = useState("");
  const [precioManual, setPrecioManual] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [agregando, setAgregando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numeroPersonas, setNumeroPersonas] = useState("2");
  const [division, setDivision] = useState<number[] | null>(null);
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [cerrando, setCerrando] = useState(false);

  const totalLocal = items.reduce((s, i) => s + Number(i.precioUnitario) * i.cantidad, 0);

  const handleAgregar = async () => {
    setError(null);
    const cant = parseInt(cantidad, 10) || 1;
    const escandallo = escandallos?.find((e) => String(e.id) === escandalloSel);
    if (!escandallo && !nombrePlato.trim()) { setError("Elige una receta o escribe el nombre del plato"); return; }
    setAgregando(true);
    try {
      const item = await agregarItemComanda(tenantId, comanda.id, {
        escandalloId: escandallo?.id,
        nombrePlato: escandallo ? escandallo.nombrePlato : nombrePlato.trim(),
        estacionCocina: escandallo?.estacionCocina,
        cantidad: cant,
        precioUnitario: escandallo ? escandallo.precioVenta : Number(precioManual) || 0,
      });
      onAgregarItem(item);
      setEscandalloSel(""); setNombrePlato(""); setPrecioManual(""); setCantidad("1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar el ítem");
    } finally {
      setAgregando(false);
    }
  };

  const handleDividir = async () => {
    try {
      const partes = await dividirCuenta(tenantId, comanda.id, parseInt(numeroPersonas, 10) || 1);
      setDivision(partes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo dividir la cuenta");
    }
  };

  const handleCerrar = async () => {
    setCerrando(true);
    setError(null);
    try {
      await cerrarComanda(tenantId, comanda.id, { metodoPago });
      onCerrar(totalLocal, metodoPago);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cerrar la comanda");
    } finally {
      setCerrando(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo={`Comanda — Mesa ${comanda.numeroMesa ?? "s/n"} (${comanda.canal})`} ancho="max-w-2xl">
      <div className="space-y-5">
        <div className="text-xs text-slate-500 dark:text-white/40">Mesero: <strong className="text-slate-800 dark:text-white/80">{comanda.mesero}</strong></div>

        {/* Items */}
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400">Sin ítems agregados todavía.</p>
          ) : items.map((it, idx) => (
            <div key={idx} className="flex items-center justify-between bg-slate-100/60 dark:bg-white/5 rounded-xl px-3.5 py-2.5 text-sm">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">{it.cantidad}× {it.nombrePlato}</span>
                <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-300">{it.estadoItem}</span>
              </div>
              <span className="font-mono text-slate-600 dark:text-white/60">${(Number(it.precioUnitario) * it.cantidad).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-slate-300/50 dark:border-white/10 font-bold text-slate-900 dark:text-white">
            <span>Total</span><span className="font-mono">${totalLocal.toFixed(2)}</span>
          </div>
        </div>

        {/* Agregar item */}
        <div className="apple-glass rounded-xl p-4 space-y-2.5">
          <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Agregar plato</p>
          <select value={escandalloSel} onChange={(e) => setEscandalloSel(e.target.value)} className="input-horeca">
            <option value="">— Plato libre (escribir nombre) —</option>
            {(escandallos || []).map((e) => (
              <option key={e.id} value={e.id}>{e.nombrePlato} · ${Number(e.precioVenta).toFixed(2)}</option>
            ))}
          </select>
          {!escandalloSel && (
            <div className="grid grid-cols-2 gap-2">
              <input value={nombrePlato} onChange={(e) => setNombrePlato(e.target.value)} placeholder="Nombre del plato" className="input-horeca" />
              <input value={precioManual} onChange={(e) => setPrecioManual(e.target.value)} placeholder="Precio $" type="number" step="0.01" className="input-horeca" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input value={cantidad} onChange={(e) => setCantidad(e.target.value)} type="number" min="1" className="input-horeca w-20" />
            <button onClick={handleAgregar} disabled={agregando} className="flex-1 g-aurora text-white text-xs font-semibold py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
              {agregando ? "Agregando…" : "+ Agregar a la comanda"}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* Dividir cuenta */}
        <div className="flex items-center gap-2">
          <input value={numeroPersonas} onChange={(e) => setNumeroPersonas(e.target.value)} type="number" min="1" className="input-horeca w-20" />
          <button onClick={handleDividir} className="apple-glass-btn text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">Dividir cuenta</button>
          {division && <span className="text-xs text-teal-600 dark:text-teal-300">{division.map((d) => `$${d.toFixed(2)}`).join(" · ")}</span>}
        </div>

        {/* Cerrar comanda */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-300/50 dark:border-white/10">
          <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="input-horeca flex-1">
            <option value="EFECTIVO">Efectivo</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="BILLETERA_DIGITAL">Billetera digital</option>
          </select>
          <button onClick={handleCerrar} disabled={cerrando || items.length === 0} className="btn-cyber-neon text-white text-xs font-bold px-5 py-3 rounded-xl cursor-pointer disabled:opacity-50">
            {cerrando ? "Cerrando…" : `Cobrar y Cerrar $${totalLocal.toFixed(2)}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COCINA (KDS)
// ══════════════════════════════════════════════════════════════════════════
function Cocina({ onCambio }: { onCambio: () => void }) {
  const [estacion, setEstacion] = useState(ESTACIONES[0]);
  const [items, setItems] = useState<ItemComanda[] | null>(null);

  const cargar = () => {
    obtenerTableroKds(estacion).then(setItems).catch(() => setItems([]));
  };
  useEffect(() => { cargar(); }, [estacion]);

  const avanzar = async (item: ItemComanda) => {
    const siguiente: Record<EstadoItemComanda, EstadoItemComanda | null> = {
      PENDIENTE: "PREPARANDO", PREPARANDO: "LISTO", LISTO: "ENTREGADO", ENTREGADO: null,
    };
    const next = siguiente[item.estadoItem];
    if (!next) return;
    try {
      await actualizarEstadoItem(item.tenantId, item.id, next);
      cargar();
      onCambio();
    } catch {}
  };

  const columnas: { estado: EstadoItemComanda; label: string; color: string }[] = [
    { estado: "PENDIENTE", label: "Pendiente", color: "border-amber-500/40" },
    { estado: "PREPARANDO", label: "Preparando", color: "border-sky-500/40" },
    { estado: "LISTO", label: "Listo", color: "border-teal-500/40" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        {ESTACIONES.map((e) => (
          <button key={e} onClick={() => setEstacion(e)}
            className={`px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition-all ${estacion === e ? "g-aurora text-white" : "bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-white/50"}`}>
            {e.replace("_", " ")}
          </button>
        ))}
      </div>

      {items === null ? (
        <p className="text-sm text-slate-400">Cargando tablero…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {columnas.map((col) => (
            <div key={col.estado} className={`apple-glass rounded-2xl p-4 border-t-4 ${col.color} space-y-2.5 min-h-[200px]`}>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{col.label}</h4>
              {items.filter((i) => i.estadoItem === col.estado).length === 0 ? (
                <p className="text-xs text-slate-400">Sin platos</p>
              ) : items.filter((i) => i.estadoItem === col.estado).map((i) => (
                <button key={i.id} onClick={() => avanzar(i)} className="w-full text-left bg-slate-100/60 dark:bg-white/5 rounded-xl p-3 hover:bg-teal-500/10 cursor-pointer transition-all">
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">{i.cantidad}× {i.nombrePlato}</div>
                  <div className="text-[10px] text-slate-500 dark:text-white/40 mt-1">Toca para avanzar →</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// RECETAS & ESCANDALLO
// ══════════════════════════════════════════════════════════════════════════
function Recetas({ tenantId, escandallos, onCambio }: { tenantId: number; escandallos: EscandalloReceta[] | null; onCambio: () => void }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ nombrePlato: "", estacionCocina: "COCINA", precioVenta: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<EscandalloReceta | null>(null);

  const crear = async () => {
    if (!form.nombrePlato.trim() || !form.precioVenta) { setError("Nombre y precio de venta son obligatorios"); return; }
    setGuardando(true);
    setError(null);
    try {
      await crearEscandallo(tenantId, { nombrePlato: form.nombrePlato.trim(), estacionCocina: form.estacionCocina, precioVenta: Number(form.precioVenta) });
      setForm({ nombrePlato: "", estacionCocina: "COCINA", precioVenta: "" });
      setMostrarForm(false);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la receta");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-white/40">{(escandallos || []).length} recetas registradas</p>
        <button onClick={() => setMostrarForm((v) => !v)} className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
          {mostrarForm ? "Cancelar" : "+ Nueva receta"}
        </button>
      </div>

      {mostrarForm && (
        <div className="apple-glass rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={form.nombrePlato} onChange={(e) => setForm({ ...form, nombrePlato: e.target.value })} placeholder="Nombre del plato" className="input-horeca" />
            <select value={form.estacionCocina} onChange={(e) => setForm({ ...form, estacionCocina: e.target.value })} className="input-horeca">
              {ESTACIONES.map((e) => <option key={e} value={e}>{e.replace("_", " ")}</option>)}
            </select>
            <input value={form.precioVenta} onChange={(e) => setForm({ ...form, precioVenta: e.target.value })} type="number" step="0.01" placeholder="Precio de venta $" className="input-horeca" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={crear} disabled={guardando} className="btn-cyber-neon text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {guardando ? "Guardando…" : "Guardar receta"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(escandallos || []).map((e) => {
          const margen = Number(e.precioVenta) - Number(e.costoTotalProduccion || 0);
          return (
            <div key={e.id} onClick={() => setSeleccionado(e)} className="apple-glass rounded-2xl p-5 hover-card cursor-pointer space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{e.nombrePlato}</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-white/40">{e.estacionCocina}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-white/40">Precio: <strong className="text-slate-900 dark:text-white">${Number(e.precioVenta).toFixed(2)}</strong></span>
                <span className="text-slate-500 dark:text-white/40">Costo: <strong className="text-slate-900 dark:text-white">${Number(e.costoTotalProduccion || 0).toFixed(2)}</strong></span>
              </div>
              <div className={`text-xs font-semibold ${margen >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-500"}`}>
                Margen: ${margen.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      {seleccionado && (
        <IngredientesModal tenantId={tenantId} escandallo={seleccionado} onClose={() => setSeleccionado(null)} onCambio={onCambio} />
      )}
    </div>
  );
}

function IngredientesModal({ tenantId, escandallo, onClose, onCambio }: { tenantId: number; escandallo: EscandalloReceta; onClose: () => void; onCambio: () => void }) {
  const [ingredientes, setIngredientes] = useState<DetalleReceta[] | null>(null);
  const [sku, setSku] = useState("");
  const [pesoNeto, setPesoNeto] = useState("");
  const [merma, setMerma] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => listarIngredientesEscandallo(escandallo.id).then(setIngredientes).catch(() => setIngredientes([]));
  useEffect(() => { cargar(); }, [escandallo.id]);

  const agregar = async () => {
    if (!sku.trim() || !pesoNeto) { setError("SKU del ingrediente y peso neto son obligatorios"); return; }
    setGuardando(true);
    setError(null);
    try {
      await agregarIngredienteEscandallo(tenantId, escandallo.id, { ingredienteSku: sku.trim(), pesoNeto: Number(pesoNeto), porcentajeMerma: Number(merma) || 0 });
      setSku(""); setPesoNeto(""); setMerma("0");
      cargar();
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar el ingrediente");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo={`Ingredientes — ${escandallo.nombrePlato}`}>
      <div className="space-y-3">
        {ingredientes === null ? <p className="text-xs text-slate-400">Cargando…</p> : ingredientes.length === 0 ? (
          <p className="text-xs text-slate-400">Sin ingredientes registrados todavía.</p>
        ) : (
          <div className="space-y-2">
            {ingredientes.map((d) => (
              <div key={d.id} className="flex items-center justify-between bg-slate-100/60 dark:bg-white/5 rounded-xl px-3.5 py-2.5 text-sm">
                <span className="text-slate-900 dark:text-white">{d.subReceta ? `Sub-receta: ${d.subReceta.nombrePlato}` : d.ingredienteSku}</span>
                <span className="font-mono text-xs text-slate-500 dark:text-white/40">{Number(d.cantidadRequerida).toFixed(3)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="apple-glass rounded-xl p-4 space-y-2.5 border-t border-slate-300/50 dark:border-white/10">
          <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Agregar ingrediente directo (SKU del artículo en Inventario)</p>
          <div className="grid grid-cols-3 gap-2">
            <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU artículo" className="input-horeca" />
            <input value={pesoNeto} onChange={(e) => setPesoNeto(e.target.value)} type="number" step="0.001" placeholder="Peso neto" className="input-horeca" />
            <input value={merma} onChange={(e) => setMerma(e.target.value)} type="number" step="0.1" placeholder="% merma" className="input-horeca" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={agregar} disabled={guardando} className="w-full g-aurora text-white text-xs font-semibold py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {guardando ? "Agregando…" : "+ Agregar ingrediente"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// FAST-BAR
// ══════════════════════════════════════════════════════════════════════════
function FastBar({ tenantId, fastbar, onVenta, onCambio }: { tenantId: number; fastbar: FastBarTrago[] | null; onVenta: (monto: number, metodo: string) => void; onCambio: () => void }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ nombreTrago: "", botellaSku: "", mililitrosPorTrago: "", precioVenta: "" });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [vendiendoId, setVendiendoId] = useState<number | null>(null);

  const crear = async () => {
    if (!form.nombreTrago.trim() || !form.precioVenta) { setError("Nombre y precio son obligatorios"); return; }
    setGuardando(true);
    setError(null);
    try {
      await crearTragoFastBar(tenantId, {
        nombreTrago: form.nombreTrago.trim(),
        botellaSku: form.botellaSku || undefined,
        mililitrosPorTrago: form.mililitrosPorTrago ? Number(form.mililitrosPorTrago) : undefined,
        precioVenta: Number(form.precioVenta),
      });
      setForm({ nombreTrago: "", botellaSku: "", mililitrosPorTrago: "", precioVenta: "" });
      setMostrarForm(false);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el trago");
    } finally {
      setGuardando(false);
    }
  };

  const vender = async (trago: FastBarTrago) => {
    setVendiendoId(trago.id);
    try {
      const total = await venderTragoRapido(tenantId, trago.id, 1);
      onVenta(Number(total), "EFECTIVO");
    } catch {} finally {
      setVendiendoId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-white/40">{(fastbar || []).length} tragos en catálogo</p>
        <button onClick={() => setMostrarForm((v) => !v)} className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
          {mostrarForm ? "Cancelar" : "+ Nuevo trago"}
        </button>
      </div>

      {mostrarForm && (
        <div className="apple-glass rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input value={form.nombreTrago} onChange={(e) => setForm({ ...form, nombreTrago: e.target.value })} placeholder="Nombre del trago" className="input-horeca" />
            <input value={form.botellaSku} onChange={(e) => setForm({ ...form, botellaSku: e.target.value })} placeholder="SKU botella (opcional)" className="input-horeca" />
            <input value={form.mililitrosPorTrago} onChange={(e) => setForm({ ...form, mililitrosPorTrago: e.target.value })} type="number" placeholder="ml por trago" className="input-horeca" />
            <input value={form.precioVenta} onChange={(e) => setForm({ ...form, precioVenta: e.target.value })} type="number" step="0.01" placeholder="Precio $" className="input-horeca" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={crear} disabled={guardando} className="btn-cyber-neon text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {guardando ? "Guardando…" : "Guardar trago"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(fastbar || []).map((t) => (
          <div key={t.id} className="apple-glass rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{t.nombreTrago}</h4>
            <div className="text-xs text-slate-500 dark:text-white/40">${Number(t.precioVenta).toFixed(2)} {t.mililitrosPorTrago ? `· ${t.mililitrosPorTrago}ml` : ""}</div>
            <button onClick={() => vender(t)} disabled={vendiendoId === t.id} className="w-full g-aurora text-white text-xs font-semibold py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
              {vendiendoId === t.id ? "Vendiendo…" : "Venta rápida ×1"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPRAS & PROVEEDORES
// ══════════════════════════════════════════════════════════════════════════
function ComprasProveedores({ tenantId, proveedores, articulos, onCambio }: {
  tenantId: number; proveedores: ProveedorHoreca[] | null; articulos: Articulo[] | null; onCambio: () => void;
}) {
  const [tab, setTab] = useState<"compra" | "proveedores" | "articulos">("compra");
  const [mostrarFormProveedor, setMostrarFormProveedor] = useState(false);
  const [formProveedor, setFormProveedor] = useState({ nombre: "", rif: "", telefono: "", contacto: "" });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const crearProveedor = async () => {
    if (!formProveedor.nombre.trim()) { setError("El nombre del proveedor es obligatorio"); return; }
    setGuardando(true);
    setError(null);
    try {
      await crearProveedorHoreca(tenantId, { nombre: formProveedor.nombre.trim(), rif: formProveedor.rif || undefined, telefono: formProveedor.telefono || undefined, contacto: formProveedor.contacto || undefined });
      setFormProveedor({ nombre: "", rif: "", telefono: "", contacto: "" });
      setMostrarFormProveedor(false);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el proveedor");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/5 text-xs w-fit">
        {[
          { id: "compra", label: "Registrar Compra" },
          { id: "proveedores", label: "Proveedores" },
          { id: "articulos", label: "Artículos" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-2 rounded-full font-bold transition-all cursor-pointer ${tab === t.id ? "bg-teal-600 text-white shadow-xs" : "text-slate-600 dark:text-white/60"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "compra" && <RegistrarCompra tenantId={tenantId} proveedores={proveedores} articulos={articulos} onCambio={onCambio} />}

      {tab === "articulos" && <GestionArticulos tenantId={tenantId} articulos={articulos} onCambio={onCambio} />}

      {tab === "proveedores" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-white/40">{(proveedores || []).length} proveedores registrados</p>
            <button onClick={() => setMostrarFormProveedor((v) => !v)} className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
              {mostrarFormProveedor ? "Cancelar" : "+ Nuevo proveedor"}
            </button>
          </div>

          {mostrarFormProveedor && (
            <div className="apple-glass rounded-2xl p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input value={formProveedor.nombre} onChange={(e) => setFormProveedor({ ...formProveedor, nombre: e.target.value })} placeholder="Nombre del proveedor" className="input-horeca" />
                <input value={formProveedor.rif} onChange={(e) => setFormProveedor({ ...formProveedor, rif: e.target.value })} placeholder="RIF" className="input-horeca" />
                <input value={formProveedor.telefono} onChange={(e) => setFormProveedor({ ...formProveedor, telefono: e.target.value })} placeholder="Teléfono" className="input-horeca" />
                <input value={formProveedor.contacto} onChange={(e) => setFormProveedor({ ...formProveedor, contacto: e.target.value })} placeholder="Persona de contacto" className="input-horeca" />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button onClick={crearProveedor} disabled={guardando} className="btn-cyber-neon text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
                {guardando ? "Guardando…" : "Guardar proveedor"}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(proveedores || []).map((p) => (
              <div key={p.id} className="apple-glass rounded-2xl p-5 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{p.nombre}</h4>
                {p.rif && <div className="text-xs text-slate-500 dark:text-white/40">RIF: {p.rif}</div>}
                {p.telefono && <div className="text-xs text-slate-500 dark:text-white/40">Tel: {p.telefono}</div>}
                {p.contacto && <div className="text-xs text-slate-500 dark:text-white/40">Contacto: {p.contacto}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GestionArticulos({ tenantId, articulos, onCambio }: { tenantId: number; articulos: Articulo[] | null; onCambio: () => void }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ sku: "", nombre: "", unidadMedida: "kg", categoria: "" });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const crear = async () => {
    if (!form.sku.trim() || !form.nombre.trim()) { setError("SKU y nombre son obligatorios"); return; }
    setGuardando(true);
    setError(null);
    try {
      await crearArticulo(tenantId, { sku: form.sku.trim(), nombre: form.nombre.trim(), unidadMedida: form.unidadMedida, categoria: form.categoria || undefined });
      setForm({ sku: "", nombre: "", unidadMedida: "kg", categoria: "" });
      setMostrarForm(false);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el artículo");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-white/40">{(articulos || []).length} artículos/insumos en Inventario</p>
        <button onClick={() => setMostrarForm((v) => !v)} className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
          {mostrarForm ? "Cancelar" : "+ Nuevo artículo"}
        </button>
      </div>

      {mostrarForm && (
        <div className="apple-glass rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU" className="input-horeca" />
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del insumo" className="input-horeca" />
            <select value={form.unidadMedida} onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })} className="input-horeca">
              {["kg", "g", "l", "ml", "unidad"].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Categoría (opcional)" className="input-horeca" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={crear} disabled={guardando} className="btn-cyber-neon text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {guardando ? "Guardando…" : "Guardar artículo"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(articulos || []).map((a) => (
          <div key={a.id} className="apple-glass rounded-2xl p-5 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{a.nombre}</h4>
            <div className="text-xs text-slate-500 dark:text-white/40">SKU: {a.sku} · {a.unidadMedida}</div>
            <div className="text-xs text-slate-500 dark:text-white/40">Stock: {Number(a.stockActual).toFixed(2)} · Costo: ${Number(a.costoUnitario).toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FilaCompra { articuloId: string; cantidad: string; costoUnitario: string; fechaVencimiento: string }
const filaVacia = (): FilaCompra => ({ articuloId: "", cantidad: "", costoUnitario: "", fechaVencimiento: "" });

function RegistrarCompra({ tenantId, proveedores, articulos, onCambio }: {
  tenantId: number; proveedores: ProveedorHoreca[] | null; articulos: Articulo[] | null; onCambio: () => void;
}) {
  const [proveedorId, setProveedorId] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [filas, setFilas] = useState<FilaCompra[]>([filaVacia()]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

  const actualizarFila = (idx: number, campo: keyof FilaCompra, valor: string) => {
    setFilas((prev) => prev.map((f, i) => (i === idx ? { ...f, [campo]: valor } : f)));
  };
  const agregarFila = () => setFilas((prev) => [...prev, filaVacia()]);
  const quitarFila = (idx: number) => setFilas((prev) => prev.filter((_, i) => i !== idx));

  const totalCompra = filas.reduce((s, f) => s + (Number(f.cantidad) || 0) * (Number(f.costoUnitario) || 0), 0);
  const conVencimiento = filas.filter((f) => f.fechaVencimiento).length;

  const guardar = async () => {
    setError(null);
    if (!proveedorId) { setError("Selecciona el proveedor"); return; }
    const items: ItemCompraInsumo[] = [];
    for (const f of filas) {
      if (!f.articuloId || !f.cantidad || !f.costoUnitario) continue;
      items.push({
        articuloId: Number(f.articuloId),
        cantidad: Number(f.cantidad),
        costoUnitario: Number(f.costoUnitario),
        fechaVencimiento: f.fechaVencimiento || undefined,
      });
    }
    if (items.length === 0) { setError("Agrega al menos un artículo con cantidad y costo"); return; }
    setGuardando(true);
    try {
      await registrarCompraInsumo(tenantId, { proveedorId: Number(proveedorId), numeroFactura: numeroFactura.trim(), items });
      setFilas([filaVacia()]);
      setNumeroFactura("");
      setExito(true);
      onCambio();
      setTimeout(() => setExito(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la compra");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="apple-glass rounded-2xl p-5 space-y-4">
      <p className="text-xs text-slate-500 dark:text-white/40 max-w-xl">
        Si el insumo tiene fecha de vencimiento, indícala aquí — Aurora crea automáticamente el lote y te avisará en <strong>Vencimientos</strong> cuando esté por caducar.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="input-horeca">
          <option value="">— Selecciona proveedor —</option>
          {(proveedores || []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <input value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} placeholder="N.º de factura" className="input-horeca" />
      </div>

      <div className="space-y-2.5">
        <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Artículos comprados</p>
        {filas.map((f, idx) => (
          <div key={idx} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1.2fr_auto] gap-2 items-center">
            <select value={f.articuloId} onChange={(e) => actualizarFila(idx, "articuloId", e.target.value)} className="input-horeca">
              <option value="">— Artículo —</option>
              {(articulos || []).map((a) => <option key={a.id} value={a.id}>{a.nombre} ({a.sku})</option>)}
            </select>
            <input value={f.cantidad} onChange={(e) => actualizarFila(idx, "cantidad", e.target.value)} type="number" step="0.001" placeholder="Cantidad" className="input-horeca" />
            <input value={f.costoUnitario} onChange={(e) => actualizarFila(idx, "costoUnitario", e.target.value)} type="number" step="0.01" placeholder="Costo unit. $" className="input-horeca" />
            <div>
              <input value={f.fechaVencimiento} onChange={(e) => actualizarFila(idx, "fechaVencimiento", e.target.value)} type="date" className="input-horeca w-full" title="Fecha de vencimiento (opcional)" />
            </div>
            <button onClick={() => quitarFila(idx)} disabled={filas.length === 1} className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 cursor-pointer" title="Quitar fila">
              <IconTrash size={15} />
            </button>
          </div>
        ))}
        <button onClick={agregarFila} className="text-teal-600 dark:text-teal-400 text-xs font-semibold cursor-pointer">+ Agregar otro artículo</button>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-300/50 dark:border-white/10">
        <div className="text-xs text-slate-500 dark:text-white/40">
          Total: <strong className="text-slate-900 dark:text-white">${totalCompra.toFixed(2)}</strong>
          {conVencimiento > 0 && <span className="ml-2 text-amber-500">· {conVencimiento} con fecha de vencimiento</span>}
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <button onClick={guardar} disabled={guardando} className="btn-cyber-neon text-white text-sm font-bold px-6 py-3 rounded-xl cursor-pointer disabled:opacity-60">
        {guardando ? "Registrando…" : exito ? "✓ Compra registrada" : "Registrar Compra"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// VENCIMIENTOS — alertas de lotes por caducar
// ══════════════════════════════════════════════════════════════════════════
function Vencimientos({ tenantId, onCambio }: { tenantId: number; onCambio: () => void }) {
  const [dias, setDias] = useState(7);
  const [lotes, setLotes] = useState<LoteArticulo[] | null>(null);

  const cargar = (d: number) => {
    alertasVencimiento(tenantId, d).then(setLotes).catch(() => setLotes([]));
  };
  useEffect(() => { cargar(dias); }, [dias]);

  const diasRestantes = (fecha: string) => {
    const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
    const venc = new Date(fecha + "T00:00:00");
    return Math.round((venc.getTime() - hoy0.getTime()) / 86400000);
  };

  const urgencia = (d: number) => (d < 0 ? "vencido" : d <= 3 ? "critico" : "proximo");
  const estilos: Record<string, string> = {
    vencido: "border-red-500/60 bg-red-500/10 text-red-600 dark:text-red-300",
    critico: "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    proximo: "border-teal-500/40 bg-teal-500/5 text-teal-600 dark:text-teal-300",
  };
  const etiquetas: Record<string, (d: number) => string> = {
    vencido: (d) => `Vencido hace ${Math.abs(d)} día${Math.abs(d) === 1 ? "" : "s"}`,
    critico: (d) => (d === 0 ? "Vence hoy" : `Vence en ${d} día${d === 1 ? "" : "s"}`),
    proximo: (d) => `Vence en ${d} días`,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500 dark:text-white/40">Lotes vencidos o próximos a vencer, ordenados por urgencia.</p>
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/5 text-xs">
          {[7, 15, 30].map((d) => (
            <button key={d} onClick={() => setDias(d)} className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${dias === d ? "bg-teal-600 text-white" : "text-slate-600 dark:text-white/60"}`}>
              {d} días
            </button>
          ))}
        </div>
      </div>

      {lotes === null ? (
        <p className="text-sm text-slate-400">Cargando alertas…</p>
      ) : lotes.length === 0 ? (
        <div className="apple-glass rounded-2xl p-8 text-center flex flex-col items-center gap-2">
          <IconCheckCircle size={28} />
          <p className="text-slate-500 dark:text-white/40 text-sm">Sin insumos por vencer en los próximos {dias} días. Todo en orden.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {lotes.map((l) => {
            const d = diasRestantes(l.fechaVencimiento);
            const u = urgencia(d);
            return (
              <div key={l.id} className={`flex items-center justify-between rounded-2xl border-l-4 px-5 py-4 ${estilos[u]}`}>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{l.articulo?.nombre || `Artículo #${l.articulo?.id}`}</div>
                  <div className="text-xs opacity-80 mt-0.5">
                    {Number(l.cantidadIngresada).toFixed(2)} {l.articulo?.unidadMedida} · Ref: {l.referenciaCompra || "—"} · Vence: {l.fechaVencimiento}
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 whitespace-nowrap">
                  {etiquetas[u](d)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ══════════════════════════════════════════════════════════════════════════
function Configuracion({ config, onGuardar }: { config: any; onGuardar: (c: any) => void }) {
  const [form, setForm] = useState(config);
  const [guardado, setGuardado] = useState(false);

  const guardar = () => {
    onGuardar(form);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  return (
    <div className="apple-glass rounded-2xl p-6 max-w-lg space-y-4">
      <Campo label="Nombre del local">
        <input value={form.nombreLocal} onChange={(e) => setForm({ ...form, nombreLocal: e.target.value })} className="input-horeca" />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Tasa BCV (Bs.)">
          <input value={form.tasaBCV} onChange={(e) => setForm({ ...form, tasaBCV: e.target.value })} type="number" step="0.01" className="input-horeca" />
        </Campo>
        <Campo label="Tasa COP">
          <input value={form.tasaCOP} onChange={(e) => setForm({ ...form, tasaCOP: e.target.value })} type="number" className="input-horeca" />
        </Campo>
      </div>
      <button onClick={guardar} className="g-aurora text-white text-sm font-semibold px-6 py-3 rounded-xl cursor-pointer">
        {guardado ? "✓ Guardado" : "Guardar configuración"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTES COMPARTIDOS
// ══════════════════════════════════════════════════════════════════════════
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-slate-500 dark:text-white/40 text-[11px] font-medium uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ titulo, onClose, children, ancho }: { titulo: string; onClose: () => void; children: React.ReactNode; ancho?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`apple-glass rounded-3xl p-6 w-full ${ancho || "max-w-md"} max-h-[85vh] overflow-y-auto shadow-2xl border border-white/15`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-['Outfit'] font-bold text-lg text-slate-900 dark:text-white">{titulo}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"><IconClose size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
