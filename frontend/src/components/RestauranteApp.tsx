import { useState, useEffect, useMemo, useRef } from "react";
import {
  IconRestaurant, IconCustomize, IconUsers, IconHourglass, IconCard, IconFileText,
  IconCheck, IconTrash, IconRefresh, IconCheckCircle, IconWarning, IconSearch, IconClose,
  IconBolt, IconBank, IconChart, IconDownload, IconLock,
} from "../Icons";
import * as XLSX from "xlsx";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useAuth } from "../context/AuthContext";
import {
  mapaDeMesas, crearMesa, editarMesa, eliminarMesa, actualizarPosicionMesa, abrirComanda, agregarItemComanda, actualizarEstadoItem, obtenerTableroKds,
  dividirCuenta, cerrarComandaMixto, listarEscandallos, crearEscandallo, eliminarEscandallo, cambiarActivoEscandallo, cambiarRequiereCocinaEscandallo, agregarIngredienteEscandallo,
  listarIngredientesEscandallo, listarFastBar, crearTragoFastBar, venderTragoRapido,
  listarProveedoresHoreca, crearProveedorHoreca, listarArticulos, crearArticulo, entradaArticulo,
  editarArticulo, ajustarStockArticulo, eliminarArticulo, importarArticulosLote,
  registrarCompraInsumo, alertasVencimiento, obtenerItemsComanda, resumenPeriodoAbierto, monedaBase, descargarTicketComanda, descargarTicketEscPos,
  tasaVigente, actualizarTasa, registrarMovimiento, listarMovimientos,
  cerrarCaja, historialCierres, descargarCierrePdf, utilidadDiaria, reporteTickets,
  abrirTurno, turnoAbierto, historialTurnos, registrarEgresoTurno, cerrarTurno,
  type Mesa, type MapaMesaEntrada, type Comanda, type ItemComanda, type EstadoItemComanda,
  type EscandalloReceta, type DetalleReceta, type FastBarTrago, type ProveedorHoreca,
  type Articulo, type ItemCompraInsumo, type LoteArticulo, type TasaCambio, type MovimientoCaja,
  type ResumenPeriodoAbierto, type ArqueoCaja, type PagoParcial, type ResumenUtilidadProducto, type ReporteTicket, type Turno,
  type ItemImportacionArticulo, type ResultadoImportacionArticulos,
} from "../api";

type Pagina = "general" | "ventarapida" | "salon" | "cocina" | "recetas" | "fastbar" | "compras" | "inventario" | "administracion" | "reportes" | "configuracion";

interface NavItem { id: Pagina; label: string; Icon: (p: { size?: number }) => JSX.Element; premium?: boolean }
interface NavGrupo { titulo: string; items: NavItem[] }

// Fase actual del negocio: Salón & Mesas y Cocina (KDS) quedan en pausa
// como módulos Premium mientras nos concentramos en Ventas, Administración,
// Logística e Inventario — no se borra nada, solo se bloquea el acceso.
const NAV_GRUPOS: NavGrupo[] = [
  {
    titulo: "Operación",
    items: [
      { id: "general", label: "Vista General", Icon: IconCustomize },
      { id: "ventarapida", label: "Venta Rápida", Icon: IconBolt },
      { id: "salon", label: "Salón & Mesas", Icon: IconRestaurant, premium: true },
      { id: "cocina", label: "Cocina (KDS)", Icon: IconHourglass, premium: true },
      { id: "recetas", label: "Recetas & Escandallo", Icon: IconFileText },
      { id: "fastbar", label: "Fast-Bar", Icon: IconCard },
    ],
  },
  {
    titulo: "Gestión",
    items: [
      { id: "compras", label: "Compras & Proveedores", Icon: IconUsers },
      { id: "inventario", label: "Inventario", Icon: IconWarning },
      { id: "administracion", label: "Administración", Icon: IconBank },
      { id: "reportes", label: "Reportes Operativos", Icon: IconChart },
      { id: "configuracion", label: "Configuración", Icon: IconCustomize },
    ],
  },
];

// Lista plana — usada donde no importa el agrupamiento (ej. título del header por página activa)
const NAV: NavItem[] = NAV_GRUPOS.flatMap((g) => g.items);

const ESTACIONES = ["COCINA", "PARRILLA", "BAR", "COCINA_FRIA"];
const hoy = () => new Date().toISOString().slice(0, 10);

function diasParaVencer(fechaVencimiento: string): number {
  const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVencimiento + "T00:00:00");
  return Math.round((venc.getTime() - hoy0.getTime()) / 86400000);
}

function diasParaVencerTexto(fechaVencimiento: string): { texto: string; color: string } {
  const d = diasParaVencer(fechaVencimiento);
  if (d < 0) return { texto: `Vencido hace ${Math.abs(d)} día${Math.abs(d) === 1 ? "" : "s"}`, color: "text-red-500" };
  if (d === 0) return { texto: "Vence hoy", color: "text-red-500" };
  if (d <= 3) return { texto: `Vence en ${d} día${d === 1 ? "" : "s"}`, color: "text-amber-500" };
  return { texto: `Vence en ${d} días`, color: "text-teal-600 dark:text-teal-400" };
}

const CONFIG_KEY = "aurora_horeca_config_perfil";
const ITEMS_LOCALES_KEY = "aurora_horeca_items_por_comanda";
const VENTAS_HOY_KEY = `aurora_horeca_ventas_${hoy()}`;
const MODO_CLASICO_KEY = "aurora_horeca_modo_clasico";

interface ItemLocal extends ItemComanda {}

// Modo claro por defecto — mismo look "Clásico" blanco de Mediclinic Pro,
// para que todas las verticales abran con la misma identidad visual.
function EstiloClasico() {
  return (
    <style>{`
      .horeca-clasico {
        background: #f8fafc !important;
        color: #0f172a !important;
      }
      .horeca-clasico aside {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
      }
      .horeca-clasico header {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
      }
      .horeca-clasico .apple-glass,
      .horeca-clasico .apple-glass-btn {
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
        backdrop-filter: none !important;
      }
      .horeca-clasico input, .horeca-clasico select, .horeca-clasico textarea {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
        color: #0f172a !important;
      }
      .horeca-clasico .bg-slate-100\\/60, .horeca-clasico .bg-slate-200\\/60 {
        background-color: #f1f5f9 !important;
      }
      .horeca-clasico h1, .horeca-clasico h2, .horeca-clasico h3,
      .horeca-clasico h4, .horeca-clasico strong,
      .horeca-clasico .text-slate-900 { color: #0f172a !important; }
      .horeca-clasico .text-slate-500, .horeca-clasico .text-slate-600 { color: #64748b !important; }
      /* El sitio sigue en tema oscuro por debajo (solo estos overrides simulan
         "claro") — sin esto, las clases dark:text-white/N ganan por
         especificidad sobre las claras y quedan invisibles en fondo blanco. */
      .horeca-clasico .dark\\:text-white\\/80 { color: #1e293b !important; -webkit-text-fill-color: #1e293b !important; }
      .horeca-clasico .dark\\:text-white\\/70 { color: #334155 !important; -webkit-text-fill-color: #334155 !important; }
      .horeca-clasico .dark\\:text-white\\/60 { color: #475569 !important; -webkit-text-fill-color: #475569 !important; }
      .horeca-clasico .dark\\:text-white\\/50 { color: #64748b !important; -webkit-text-fill-color: #64748b !important; }
      .horeca-clasico .dark\\:text-white\\/40 { color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; }
      .horeca-clasico .btn-cyber-neon {
        background: linear-gradient(135deg, #0ea5e9, #0d9488 65%, #8b5cf6) !important;
        box-shadow: 0 4px 14px rgba(14,165,233,0.35) !important;
        color: #fff !important;
      }
      .horeca-clasico .text-teal-600, .horeca-clasico .text-teal-500,
      .horeca-clasico .text-teal-300, .horeca-clasico .text-teal-400 { color: #0d9488 !important; -webkit-text-fill-color: #0d9488 !important; }
      .horeca-clasico .text-aurora {
        background: linear-gradient(90deg, #0ea5e9, #0d9488 70%, #8b5cf6) !important;
        -webkit-background-clip: text !important; background-clip: text !important;
        color: transparent !important; -webkit-text-fill-color: transparent !important;
      }
      .horeca-clasico .bg-teal-500\\/15 { background-color: rgba(14,165,233,0.12) !important; }
      .horeca-clasico .border-teal-500\\/30, .horeca-clasico .border-teal-400\\/60 { border-color: rgba(13,148,136,0.4) !important; }
    `}</style>
  );
}

export default function RestauranteApp({ onSalir }: { onSalir: () => void }) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || 1;
  const [pagina, setPagina] = useState<Pagina>("general");
  const [ventaRapidaAbierta, setVentaRapidaAbierta] = useState(false);
  const [bloqueoTasa, setBloqueoTasa] = useState<"ventarapida" | null>(null);
  const [moduloPremiumClic, setModuloPremiumClic] = useState<Pagina | null>(null);

  const [config, setConfig] = useState(() => {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? JSON.parse(raw) : { nombreLocal: user?.empresa || "Mi Restaurante" };
    } catch {
      return { nombreLocal: user?.empresa || "Mi Restaurante" };
    }
  });
  const guardarConfig = (c: any) => {
    setConfig(c);
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); } catch {}
  };

  const [modoClasico, setModoClasico] = useState(() => {
    try {
      const guardado = localStorage.getItem(MODO_CLASICO_KEY);
      return guardado === null ? true : guardado === "1";
    } catch { return true; }
  });
  const alternarModo = () => {
    setModoClasico((v) => {
      const nuevo = !v;
      try { localStorage.setItem(MODO_CLASICO_KEY, nuevo ? "1" : "0"); } catch {}
      return nuevo;
    });
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

  // Ventas del día = ingresos reales de tesorería desde el último cierre de
  // caja (mismo endpoint que usa cualquier vertical) — antes se llevaba un
  // conteo aparte en localStorage que no reflejaba lo que de verdad quedó
  // registrado en caja.
  const [ventasHoy, setVentasHoy] = useState<{ total: number; moneda: string } | null>(null);
  const cargarVentasHoy = () => {
    monedaBase(tenantId)
      .then((moneda) => resumenPeriodoAbierto(tenantId, moneda).then((r) => setVentasHoy({ total: Number(r.totalIngresos), moneda })))
      .catch(() => setVentasHoy(null));
  };
  const registrarVenta = (_monto: number, _metodo: string) => {
    // El cobro ya quedó registrado en tesorería por el propio backend
    // (cerrarComanda / venderTragoRapido) — solo hace falta refrescar. Se
    // recarga todo (no solo ventas) porque la venta puede haber descontado
    // inventario, tanto de recetas como de artículos vendidos directo.
    recargarTodo();
  };

  const [mapa, setMapa] = useState<MapaMesaEntrada[] | null>(null);
  const [escandallos, setEscandallos] = useState<EscandalloReceta[] | null>(null);
  const [fastbar, setFastbar] = useState<FastBarTrago[] | null>(null);
  const [proveedores, setProveedores] = useState<ProveedorHoreca[] | null>(null);
  const [articulos, setArticulos] = useState<Articulo[] | null>(null);
  const [lotesPorVencer, setLotesPorVencer] = useState<LoteArticulo[] | null>(null);
  const [kdsCounts, setKdsCounts] = useState<number>(0);
  const [tasaBcv, setTasaBcv] = useState<TasaCambio | null>(null);

  const recargarTodo = () => {
    mapaDeMesas().then(setMapa).catch(() => setMapa([]));
    listarEscandallos().then(setEscandallos).catch(() => setEscandallos([]));
    listarFastBar(tenantId).then(setFastbar).catch(() => setFastbar([]));
    listarProveedoresHoreca().then(setProveedores).catch(() => setProveedores([]));
    listarArticulos().then(setArticulos).catch(() => setArticulos([]));
    alertasVencimiento(tenantId, 7).then(setLotesPorVencer).catch(() => setLotesPorVencer([]));
    tasaVigente(tenantId, "USD", "VES").then(setTasaBcv).catch(() => setTasaBcv(null));
    cargarVentasHoy();
    Promise.all(ESTACIONES.map((e) => obtenerTableroKds(tenantId, e).catch(() => [])))
      .then((listas) => setKdsCounts(listas.reduce((sum, l) => sum + l.filter((i) => i.estadoItem !== "ENTREGADO").length, 0)))
      .catch(() => setKdsCounts(0));
  };

  useEffect(() => { recargarTodo(); }, [tenantId]);

  const totalVentasHoy = ventasHoy?.total ?? 0;
  const mesasOcupadas = (mapa || []).filter((m) => m.estado === "OCUPADA").length;
  const comandasAbiertas = (mapa || []).filter((m) => m.comandaAbierta).length;

  // Sin tasa BCV del día, un cobro mixto en Bs o el total bimoneda del
  // carrito estarían calculando con una tasa vencida o en cero — bloquea
  // Venta Rápida hasta que se registre, en vez de dejar operar con números
  // que no cuadran.
  const tasaValida = tasaBcv != null && Number(tasaBcv.tasa) > 0;
  const abrirVentaRapida = () => { if (!tasaValida) { setBloqueoTasa("ventarapida"); return; } setVentaRapidaAbierta(true); };

  // Paywall: Salón & Mesas y Cocina (KDS) quedan marcados premium en
  // NAV_GRUPOS — esta es la ÚNICA puerta de entrada para cambiar de página,
  // así que también protege contra que algo intente forzar `pagina` a un
  // módulo premium sin pasar por acá (el switch de abajo vuelve a validar
  // de todas formas, por si acaso).
  const esPremium = (p: Pagina) => NAV.find((n) => n.id === p)?.premium === true;
  const irA = (p: Pagina) => {
    if (esPremium(p)) { setModuloPremiumClic(p); return; }
    setPagina(p);
  };

  return (
    <div className={`min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex ${modoClasico ? "horeca-clasico" : ""}`}>
      {modoClasico && <EstiloClasico />}
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

        <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
          {NAV_GRUPOS.map((grupo) => (
            <div key={grupo.titulo} className="space-y-1">
              <div className="px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/25">{grupo.titulo}</div>
              {grupo.items.map((n) => {
                const alertaVencimiento = n.id === "inventario" && (lotesPorVencer || []).length > 0;
                return (
                  <button
                    key={n.id}
                    onClick={() => (n.id === "ventarapida" ? abrirVentaRapida() : irA(n.id))}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                      n.premium
                        ? "text-slate-400 dark:text-white/30 hover:bg-slate-200/40 dark:hover:bg-white/5"
                        : pagina === n.id
                        ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 shadow-sm"
                        : alertaVencimiento
                        ? "text-red-600 dark:text-red-300 hover:bg-red-500/10"
                        : "text-slate-600 dark:text-white/60 hover:bg-slate-200/60 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2.5"><n.Icon size={16} /><span>{n.label}</span></span>
                    {n.premium ? (
                      <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                        <IconLock size={10} /> PRO
                      </span>
                    ) : alertaVencimiento && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-500 font-bold">{(lotesPorVencer || []).length}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Switch Modo Clásico / Aurora */}
        <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-white/5 border border-slate-300/60 dark:border-white/10 text-xs mb-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-white/70 text-[11px] font-medium">Modo Clásico</span>
            <button
              onClick={alternarModo}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${modoClasico ? "bg-teal-600" : "bg-slate-400/40"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${modoClasico ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

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
              <div className="text-[11px] text-teal-600 dark:text-teal-400 font-mono">
                {tasaBcv ? `BCV: Bs. ${Number(tasaBcv.tasa).toFixed(2)}` : "BCV: sin tasa registrada"}
              </div>
            </div>
            <button onClick={recargarTodo} className="p-2 rounded-xl border border-slate-300/60 dark:border-white/10 hover:bg-white/10 text-slate-600 dark:text-white/60 cursor-pointer" title="Actualizar datos">
              <IconRefresh size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {pagina === "general" && (
            <VistaGeneral mesasOcupadas={mesasOcupadas} totalMesas={(mapa || []).length} comandasAbiertas={comandasAbiertas}
              totalVentasHoy={totalVentasHoy} kdsCounts={kdsCounts} vencimientos={(lotesPorVencer || []).length}
              onNavegar={irA}
              onVentaRapida={abrirVentaRapida} />
          )}
          {pagina === "salon" && (esPremium("salon")
            ? <BloqueoPremium modulo="Salón & Mesas" />
            : tasaValida
              ? <Salon tenantId={tenantId} mapa={mapa} itemsPorComanda={itemsPorComanda} setItemsPorComanda={setItemsPorComanda}
                  escandallos={escandallos} onVenta={registrarVenta} onCambio={recargarTodo} />
              : (
                <div className="apple-glass rounded-2xl p-8 text-center space-y-3">
                  <IconWarning size={28} />
                  <p className="text-sm font-semibold text-slate-700 dark:text-white/70">Falta registrar la tasa BCV del día para operar el salón.</p>
                </div>
              )
          )}
          {pagina === "cocina" && (esPremium("cocina") ? <BloqueoPremium modulo="Cocina (KDS)" /> : <Cocina tenantId={tenantId} onCambio={recargarTodo} />)}
          {pagina === "recetas" && <Recetas tenantId={tenantId} escandallos={escandallos} articulos={articulos} onCambio={recargarTodo} />}
          {pagina === "fastbar" && <FastBar tenantId={tenantId} fastbar={fastbar} onVenta={registrarVenta} onCambio={recargarTodo} />}
          {pagina === "compras" && (
            <ComprasProveedores tenantId={tenantId} proveedores={proveedores} articulos={articulos} onCambio={recargarTodo} />
          )}
          {pagina === "inventario" && <Inventario tenantId={tenantId} articulos={articulos} onCambio={recargarTodo} />}
          {pagina === "administracion" && <Administracion tenantId={tenantId} />}
          {pagina === "reportes" && <ReportesOperativos tenantId={tenantId} />}
          {pagina === "configuracion" && <Configuracion tenantId={tenantId} config={config} onGuardar={guardarConfig} />}
        </div>
      </main>

      {ventaRapidaAbierta && (
        <Modal onClose={() => setVentaRapidaAbierta(false)} titulo="Venta Rápida" ancho="max-w-4xl">
          <VentaRapida tenantId={tenantId} escandallos={escandallos} fastbar={fastbar} articulos={articulos} tasaBcv={tasaBcv}
            onVenta={(monto, metodo) => { registrarVenta(monto, metodo); }} />
        </Modal>
      )}

      {bloqueoTasa && (
        <ModalTasaRequerida
          tenantId={tenantId}
          onCancelar={() => setBloqueoTasa(null)}
          onRegistrada={() => {
            setBloqueoTasa(null);
            recargarTodo();
            setVentaRapidaAbierta(true);
          }}
        />
      )}

      {moduloPremiumClic && (
        <ModalPremium modulo={NAV.find((n) => n.id === moduloPremiumClic)?.label || ""} onClose={() => setModuloPremiumClic(null)} />
      )}
    </div>
  );
}

/** Bloquea Venta Rápida hasta que se registre la tasa BCV del día — sin tasa, un cobro en Bs o el total bimoneda calcularían con un número vencido o en cero. */
function ModalTasaRequerida({ tenantId, onCancelar, onRegistrada }: {
  tenantId: number; onCancelar: () => void; onRegistrada: () => void;
}) {
  const [tasa, setTasa] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    const valor = Number(tasa);
    if (!valor || valor <= 0) { setError("Ingresa una tasa válida mayor a cero"); return; }
    setGuardando(true);
    setError(null);
    try {
      await actualizarTasa(tenantId, { monedaOrigen: "USD", monedaDestino: "VES", tasa: valor, origen: "MANUAL" });
      onRegistrada();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la tasa");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal onClose={onCancelar} titulo="Tasa BCV requerida">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0"><IconWarning size={20} /></div>
          <p className="text-sm text-slate-600 dark:text-white/70">
            No hay tasa BCV registrada hoy (o es $0). Venta Rápida necesita una tasa vigente para calcular
            el total en bolívares y el vuelto en cualquier cobro mixto — regístrala para continuar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-white/40 whitespace-nowrap">1 USD =</span>
          <input value={tasa} onChange={(e) => setTasa(e.target.value)} type="number" step="0.01" min="0" placeholder="Ej. 56.40"
            className="input-horeca flex-1" autoFocus onKeyDown={(e) => e.key === "Enter" && guardar()} />
          <span className="text-xs font-semibold text-slate-500 dark:text-white/40">Bs</span>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={guardar} disabled={guardando} className="w-full btn-cyber-neon text-white text-sm font-bold py-3 rounded-xl cursor-pointer disabled:opacity-60">
          {guardando ? "Guardando…" : "Registrar tasa y continuar"}
        </button>
      </div>
    </Modal>
  );
}

/** Intercepta el click en un módulo Premium (Salón & Mesas, Cocina KDS) en vez de navegar a la vista. */
function ModalPremium({ modulo, onClose }: { modulo: string; onClose: () => void }) {
  return (
    <Modal onClose={onClose} titulo="Módulo Premium">
      <div className="space-y-4 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto"><IconLock size={26} /></div>
        <p className="text-sm text-slate-600 dark:text-white/70">
          <strong className="text-slate-900 dark:text-white">{modulo}</strong> es un módulo Premium. Mejora tu plan para activar la gestión de mesas y pantallas de cocina.
        </p>
        <button onClick={onClose} className="w-full g-aurora text-white text-sm font-bold py-3 rounded-xl cursor-pointer">Entendido</button>
      </div>
    </Modal>
  );
}

/** Bloqueo inline por si `pagina` llega a un módulo premium por cualquier otra vía que no sea el sidebar/ModalPremium — la vista real nunca se monta. */
function BloqueoPremium({ modulo }: { modulo: string }) {
  return (
    <div className="apple-glass rounded-2xl p-10 text-center space-y-3">
      <div className="w-14 h-14 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto"><IconLock size={26} /></div>
      <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-lg">{modulo} — Módulo Premium</h3>
      <p className="text-sm text-slate-500 dark:text-white/40 max-w-md mx-auto">Mejora tu plan para activar la gestión de mesas y pantallas de cocina.</p>
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
function VistaGeneral({ mesasOcupadas, totalMesas, comandasAbiertas, totalVentasHoy, kdsCounts, vencimientos, onNavegar, onVentaRapida }: {
  mesasOcupadas: number; totalMesas: number; comandasAbiertas: number; totalVentasHoy: number; kdsCounts: number; vencimientos: number;
  onNavegar: (p: Pagina) => void; onVentaRapida: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Mesas Ocupadas" val={`${mesasOcupadas}/${totalMesas || "…"}`} sub="Mapa del salón" color="#0ea5e9" onClick={() => onNavegar("salon")} />
        <KpiCard label="Comandas Abiertas" val={String(comandasAbiertas)} sub="Salón, delivery y recoger" color="#a855f7" onClick={() => onNavegar("salon")} />
        <KpiCard label="Ventas del Día" val={`$${totalVentasHoy.toFixed(2)}`} sub="Comandas y Fast-Bar cerrados" color="#10b981" onClick={() => onNavegar("salon")} />
        <KpiCard label="Platos en Cocina" val={String(kdsCounts)} sub="Pendientes + en preparación" color="#f59e0b" onClick={() => onNavegar("cocina")} />
        <KpiCard label="Por Vencer" val={String(vencimientos)} sub="Lotes vencidos o próximos" color={vencimientos > 0 ? "#ef4444" : "#64748b"} onClick={() => onNavegar("inventario")} />
      </div>
      <button onClick={onVentaRapida}
        className="w-full btn-cyber-neon text-white rounded-2xl p-5 flex items-center justify-between cursor-pointer shadow-lg hover:scale-[1.01] transition-all">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center"><IconBolt size={22} /></div>
          <div className="text-left">
            <div className="font-['Outfit'] font-black text-base">Venta Rápida</div>
          </div>
        </div>
        <span className="text-xl">→</span>
      </button>

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
  const [nuevaMesa, setNuevaMesa] = useState({ numero: "", capacidad: "", zona: "SALON_PRINCIPAL", forma: "RECTANGULAR" });
  const [errorMesa, setErrorMesa] = useState<string | null>(null);
  const [guardandoMesa, setGuardandoMesa] = useState(false);
  const [vista, setVista] = useState<"lista" | "plano">("plano");
  const [mesaEditando, setMesaEditando] = useState<Mesa | null>(null);

  const siguienteNumero = (mapa || []).reduce((max, m) => Math.max(max, m.mesa.numero), 0) + 1;

  const handleCrearMesa = async () => {
    setErrorMesa(null);
    setGuardandoMesa(true);
    try {
      await crearMesa(tenantId, {
        numero: Number(nuevaMesa.numero) || siguienteNumero,
        capacidad: nuevaMesa.capacidad ? Number(nuevaMesa.capacidad) : undefined,
        zona: nuevaMesa.zona,
        forma: nuevaMesa.forma,
      });
      setNuevaMesa({ numero: "", capacidad: "", zona: "SALON_PRINCIPAL", forma: "RECTANGULAR" });
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500 dark:text-white/40">{(mapa || []).length} mesas registradas</p>
          <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/5 text-xs">
            <button onClick={() => setVista("plano")} className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${vista === "plano" ? "bg-teal-600 text-white" : "text-slate-600 dark:text-white/60"}`}>Plano</button>
            <button onClick={() => setVista("lista")} className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${vista === "lista" ? "bg-teal-600 text-white" : "text-slate-600 dark:text-white/60"}`}>Lista</button>
          </div>
        </div>
        <button onClick={() => { setMostrarNuevaMesa((v) => !v); setNuevaMesa({ numero: String(siguienteNumero), capacidad: "", zona: "SALON_PRINCIPAL", forma: "RECTANGULAR" }); }}
          className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
          {mostrarNuevaMesa ? "Cancelar" : "+ Nueva mesa"}
        </button>
      </div>

      {mostrarNuevaMesa && (
        <div className="apple-glass rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input value={nuevaMesa.numero} onChange={(e) => setNuevaMesa({ ...nuevaMesa, numero: e.target.value })} type="number" placeholder="Número de mesa" className="input-horeca" />
            <input value={nuevaMesa.capacidad} onChange={(e) => setNuevaMesa({ ...nuevaMesa, capacidad: e.target.value })} type="number" placeholder="Capacidad (pax)" className="input-horeca" />
            <select value={nuevaMesa.zona} onChange={(e) => setNuevaMesa({ ...nuevaMesa, zona: e.target.value })} className="input-horeca">
              <option value="SALON_PRINCIPAL">Salón principal</option>
              <option value="TERRAZA">Terraza</option>
              <option value="BARRA">Barra</option>
            </select>
            <select value={nuevaMesa.forma} onChange={(e) => setNuevaMesa({ ...nuevaMesa, forma: e.target.value })} className="input-horeca">
              <option value="RECTANGULAR">Cuadrada</option>
              <option value="CIRCULAR">Redonda</option>
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
      ) : vista === "lista" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {mapa.map((m) => (
            <div key={m.mesa.id} className="relative group">
              <button
                onClick={() => (m.estado === "OCUPADA" && m.comandaAbierta ? setComandaActiva(m.comandaAbierta) : setAbriendo(m))}
                className={`w-full aspect-square rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 border-2 transition-all cursor-pointer hover:scale-[1.03] ${
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
              <button
                onClick={(e) => { e.stopPropagation(); setMesaEditando(m.mesa); }}
                title="Editar mesa"
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 dark:bg-black/60 border border-slate-300/60 dark:border-white/15 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-teal-600 dark:hover:text-teal-300 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <IconCustomize size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <PlanoMesas tenantId={tenantId} mapa={mapa} onAbrirMesa={setAbriendo} onVerComanda={setComandaActiva} onEditarMesa={setMesaEditando} onCambio={onCambio} />
      )}

      {mesaEditando && (
        <EditarMesaModal tenantId={tenantId} mesa={mesaEditando} onClose={() => setMesaEditando(null)} onCambio={onCambio} />
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

// ══════════════════════════════════════════════════════════════════════════
// EDITAR / ELIMINAR MESA
// ══════════════════════════════════════════════════════════════════════════
function EditarMesaModal({ tenantId, mesa, onClose, onCambio }: { tenantId: number; mesa: Mesa; onClose: () => void; onCambio: () => void }) {
  const [form, setForm] = useState({ numero: String(mesa.numero), capacidad: mesa.capacidad != null ? String(mesa.capacidad) : "", zona: mesa.zona || "SALON_PRINCIPAL", forma: mesa.forma || "RECTANGULAR" });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  const guardar = async () => {
    setError(null);
    setGuardando(true);
    try {
      await editarMesa(tenantId, mesa.id, {
        numero: Number(form.numero) || mesa.numero,
        capacidad: form.capacidad ? Number(form.capacidad) : undefined,
        zona: form.zona,
        forma: form.forma,
      });
      onCambio();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la mesa");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    setError(null);
    setEliminando(true);
    try {
      await eliminarMesa(tenantId, mesa.id);
      onCambio();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la mesa");
      setEliminando(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo={`Editar Mesa ${mesa.numero}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Campo label="Número">
            <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} type="number" className="input-horeca" />
          </Campo>
          <Campo label="Capacidad (pax)">
            <input value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: e.target.value })} type="number" className="input-horeca" />
          </Campo>
          <Campo label="Zona">
            <select value={form.zona} onChange={(e) => setForm({ ...form, zona: e.target.value })} className="input-horeca">
              <option value="SALON_PRINCIPAL">Salón principal</option>
              <option value="TERRAZA">Terraza</option>
              <option value="BARRA">Barra</option>
            </select>
          </Campo>
          <Campo label="Forma">
            <select value={form.forma} onChange={(e) => setForm({ ...form, forma: e.target.value })} className="input-horeca">
              <option value="RECTANGULAR">Cuadrada</option>
              <option value="CIRCULAR">Redonda</option>
            </select>
          </Campo>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={guardar} disabled={guardando} className="w-full g-aurora text-white text-sm font-semibold py-3 rounded-xl cursor-pointer disabled:opacity-60">
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>

        <div className="pt-3 border-t border-slate-300/50 dark:border-white/10">
          {!confirmarEliminar ? (
            <button onClick={() => setConfirmarEliminar(true)} className="text-red-500 text-xs font-semibold cursor-pointer">
              🗑 Eliminar esta mesa
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-white/60">¿Seguro? No se puede deshacer.</span>
              <button onClick={eliminar} disabled={eliminando} className="text-red-500 text-xs font-bold cursor-pointer disabled:opacity-60">
                {eliminando ? "Eliminando…" : "Sí, eliminar"}
              </button>
              <button onClick={() => setConfirmarEliminar(false)} className="text-slate-400 text-xs cursor-pointer">Cancelar</button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PLANO VISUAL DE MESAS — arrastrar y soltar
// ══════════════════════════════════════════════════════════════════════════
const ZONAS_INFO: Record<string, { label: string; color: string }> = {
  SALON_PRINCIPAL: { label: "Salón principal", color: "#0ea5e9" },
  TERRAZA: { label: "Terraza", color: "#22c55e" },
  BARRA: { label: "Barra", color: "#a855f7" },
};

function PlanoMesas({ tenantId, mapa, onAbrirMesa, onVerComanda, onEditarMesa, onCambio }: {
  tenantId: number; mapa: MapaMesaEntrada[]; onAbrirMesa: (m: MapaMesaEntrada) => void; onVerComanda: (c: Comanda) => void; onEditarMesa: (m: Mesa) => void; onCambio: () => void;
}) {
  const ANCHO_DEFECTO = 96;
  const posicionPorDefecto = (idx: number) => ({ x: 24 + (idx % 6) * 120, y: 24 + Math.floor(idx / 6) * 120 });

  // El plano abre en modo "Ver" — arrastrar solo está permitido en modo
  // "Editar", activado a propósito. Así queda estructuralmente imposible
  // mover una mesa por accidente mientras se está tomando una comanda.
  const [modoEdicion, setModoEdicion] = useState(false);
  const [posiciones, setPosiciones] = useState<Record<number, { x: number; y: number }>>({});
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const inicioRef = useRef({ x: 0, y: 0 });
  const seMovioRef = useRef(false);

  useEffect(() => {
    setPosiciones((prev) => {
      const nuevo = { ...prev };
      mapa.forEach((m, idx) => {
        if (nuevo[m.mesa.id]) return;
        nuevo[m.mesa.id] = m.mesa.posX != null && m.mesa.posY != null
          ? { x: m.mesa.posX, y: m.mesa.posY }
          : posicionPorDefecto(idx);
      });
      return nuevo;
    });
  }, [mapa]);

  const sinColocar = mapa.filter((m) => m.mesa.posX == null || m.mesa.posY == null).length;

  const iniciarArrastre = (e: React.MouseEvent, mesaId: number) => {
    if (!modoEdicion || e.button !== 0) return;
    const pos = posiciones[mesaId];
    if (!pos || !contenedorRef.current) return;
    const rect = contenedorRef.current.getBoundingClientRect();
    offsetRef.current = { x: e.clientX - rect.left - pos.x, y: e.clientY - rect.top - pos.y };
    inicioRef.current = { x: e.clientX, y: e.clientY };
    seMovioRef.current = false;
    setArrastrando(mesaId);
  };

  useEffect(() => {
    if (arrastrando == null) return;
    const moverMouse = (e: MouseEvent) => {
      if (!contenedorRef.current) return;
      if (Math.abs(e.clientX - inicioRef.current.x) > 4 || Math.abs(e.clientY - inicioRef.current.y) > 4) {
        seMovioRef.current = true;
      }
      const rect = contenedorRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width - ANCHO_DEFECTO, e.clientX - rect.left - offsetRef.current.x));
      const y = Math.max(0, Math.min(rect.height - ANCHO_DEFECTO, e.clientY - rect.top - offsetRef.current.y));
      setPosiciones((prev) => ({ ...prev, [arrastrando]: { x, y } }));
    };
    const soltarMouse = () => {
      if (seMovioRef.current) {
        const pos = posiciones[arrastrando];
        if (pos) actualizarPosicionMesa(tenantId, arrastrando, { posX: Math.round(pos.x), posY: Math.round(pos.y), ancho: ANCHO_DEFECTO, alto: ANCHO_DEFECTO }).catch(() => {});
      }
      setArrastrando(null);
    };
    window.addEventListener("mousemove", moverMouse);
    window.addEventListener("mouseup", soltarMouse);
    return () => {
      window.removeEventListener("mousemove", moverMouse);
      window.removeEventListener("mouseup", soltarMouse);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrastrando]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
      {/* Leyenda */}
      <div className="apple-glass rounded-2xl p-4 space-y-4 h-fit">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30 mb-2">Estado en vivo</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-white/70"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Libre</div>
            <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-white/70"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Ocupada</div>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30 mb-2">Zonas</p>
          <div className="space-y-1.5">
            {Object.entries(ZONAS_INFO).map(([key, z]) => (
              <div key={key} className="flex items-center gap-2 text-xs text-slate-700 dark:text-white/70">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color }} /> {z.label}
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => setModoEdicion((v) => !v)}
          className={`w-full text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-all ${
            modoEdicion ? "bg-teal-600 text-white" : "apple-glass-btn text-slate-700 dark:text-white/70"
          }`}
        >
          {modoEdicion ? "✓ Listo (ver salón)" : "✏️ Editar plano"}
        </button>
        {modoEdicion && <p className="text-[10px] text-slate-400 leading-relaxed">Arrastrá cada mesa para ubicarla como en tu salón real.</p>}
        {sinColocar > 0 && (
          <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-lg p-2 leading-relaxed">
            {sinColocar} mesa{sinColocar === 1 ? "" : "s"} sin ubicar en el plano. Activá "Editar plano" para acomodarla{sinColocar === 1 ? "" : "s"}.
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={contenedorRef}
        className="relative apple-glass rounded-2xl overflow-hidden"
        style={{ height: 480, backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "24px 24px", cursor: modoEdicion ? "default" : "default" }}
      >
        {mapa.map((m) => {
          const pos = posiciones[m.mesa.id] || { x: 24, y: 24 };
          const esRedonda = m.mesa.forma === "CIRCULAR";
          const zonaColor = ZONAS_INFO[m.mesa.zona || ""]?.color || "#94a3b8";
          const ocupada = m.estado === "OCUPADA";
          return (
            <div
              key={m.mesa.id}
              onMouseDown={(e) => iniciarArrastre(e, m.mesa.id)}
              style={{
                left: pos.x, top: pos.y, width: ANCHO_DEFECTO, height: ANCHO_DEFECTO,
                borderRadius: esRedonda ? "50%" : "20px",
                borderColor: ocupada ? "#f59e0b" : "#14b8a6",
              }}
              className={`absolute border-[3px] flex flex-col items-center justify-center gap-0.5 select-none shadow-md transition-shadow ${
                arrastrando === m.mesa.id ? "shadow-2xl z-10 scale-105" : modoEdicion ? "hover:scale-[1.03]" : "hover:scale-[1.03]"
              } ${modoEdicion ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${
                ocupada ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-teal-500/15 text-teal-700 dark:text-teal-300"
              }`}
              onClick={() => {
                if (seMovioRef.current) { seMovioRef.current = false; return; }
                if (modoEdicion) return;
                (ocupada && m.comandaAbierta) ? onVerComanda(m.comandaAbierta) : onAbrirMesa(m);
              }}
            >
              <span className="absolute top-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: zonaColor }} title={ZONAS_INFO[m.mesa.zona || ""]?.label} />
              <span className="font-['Outfit'] font-black text-sm mt-1">M{m.mesa.numero}</span>
              {m.mesa.capacidad != null && <span className="text-[9px] opacity-80">{m.mesa.capacidad}p</span>}
              {modoEdicion && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEditarMesa(m.mesa); }}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white dark:bg-slate-800 border border-slate-300/60 dark:border-white/15 flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-teal-600 cursor-pointer shadow-sm"
                >
                  <IconCustomize size={10} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COBRO MIXTO — filas dinámicas de pago (uno o varios métodos/monedas a la
// vez: moneda base, Bs/VES o COP), con el pendiente/vuelto calculado en vivo
// en la moneda base del negocio y su equivalente en cada otra moneda, a la
// tasa vigente que el tenant tenga registrada en Configuración.
// ══════════════════════════════════════════════════════════════════════════
interface FilaPago { id: string; metodoPago: string; moneda: string; monto: string; auto: boolean }

const MONEDAS_ALTERNAS: Record<string, string> = { VES: "Bs", COP: "COP" };

function nuevaFilaPago(moneda: string, auto: boolean): FilaPago {
  return { id: `${Date.now()}-${Math.random()}`, metodoPago: "EFECTIVO", moneda, monto: "", auto };
}

function PanelCobroMixto({ tenantId, total, monedaBase, procesando, error, onCobrar }: {
  tenantId: number; total: number; monedaBase: string; procesando: boolean; error: string | null;
  onCobrar: (pagos: PagoParcial[], monedaVuelto: string) => void;
}) {
  // La primera fila es manual (la escribe el cajero); cualquier fila agregada
  // después nace "auto" — mientras nadie la toque a mano, se recalcula sola
  // con lo que falta (convertido a su moneda con la tasa vigente) cada vez
  // que cambia cualquier otra fila. En cuanto el cajero escribe algo directo
  // en ella, deja de seguir el pendiente y queda fija como manual.
  const otrasMonedas = Object.keys(MONEDAS_ALTERNAS).filter((m) => m !== monedaBase);
  const [filas, setFilas] = useState<FilaPago[]>(() => [nuevaFilaPago(monedaBase, false)]);
  const [tasas, setTasas] = useState<Record<string, number | null>>({});
  const [monedaVuelto, setMonedaVuelto] = useState(monedaBase);

  useEffect(() => {
    otrasMonedas.forEach((moneda) => {
      tasaVigente(tenantId, monedaBase, moneda)
        .then((t) => setTasas((prev) => ({ ...prev, [moneda]: Number(t.tasa) })))
        .catch(() => setTasas((prev) => ({ ...prev, [moneda]: null })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, monedaBase]);

  const aBase = (monto: number, moneda: string) => {
    if (!monto) return 0;
    if (moneda === monedaBase) return monto;
    const tasa = tasas[moneda];
    return tasa ? monto / tasa : 0;
  };
  const deBase = (montoBase: number, moneda: string) => {
    if (moneda === monedaBase) return montoBase;
    const tasa = tasas[moneda];
    return tasa ? montoBase * tasa : montoBase;
  };

  // Recalcula en vivo las filas "auto" con lo que falta, cada vez que cambia
  // una fila manual, el total o alguna tasa — sin que el cajero tenga que
  // tocar nada, sea el restante en Bs, en COP o en la moneda base.
  const firmaManual = JSON.stringify(filas.filter((f) => !f.auto).map((f) => `${f.monto}|${f.moneda}`));
  const firmaTasas = JSON.stringify(tasas);
  useEffect(() => {
    setFilas((prev) => {
      const sumaManualBase = prev.filter((f) => !f.auto).reduce((s, f) => s + aBase(Number(f.monto) || 0, f.moneda), 0);
      const faltaBase = total - sumaManualBase;
      let cambio = false;
      const siguiente = prev.map((f) => {
        if (!f.auto) return f;
        const valor = faltaBase > 0.004 ? deBase(faltaBase, f.moneda).toFixed(2) : "";
        if (valor === f.monto) return f;
        cambio = true;
        return { ...f, monto: valor };
      });
      return cambio ? siguiente : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaManual, total, firmaTasas, monedaBase]);

  const totalIngresadoBase = filas.reduce((s, f) => s + aBase(Number(f.monto) || 0, f.moneda), 0);
  const pendienteBase = Math.max(0, total - totalIngresadoBase);
  const vueltoBase = Math.max(0, totalIngresadoBase - total);
  const cubierto = total > 0 && totalIngresadoBase >= total - 0.005;

  const actualizarMonto = (id: string, monto: string) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, monto, auto: false } : f)));
  const actualizarMetodo = (id: string, metodoPago: string) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, metodoPago } : f)));
  const actualizarMoneda = (id: string, moneda: string) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, moneda } : f)));
  const agregarFila = () => setFilas((prev) => {
    // La fila nueva nace en la primera moneda alterna disponible que ninguna otra fila ya esté usando (típicamente Bs).
    const enUso = new Set(prev.map((f) => f.moneda));
    const monedaSugerida = otrasMonedas.find((m) => !enUso.has(m)) || otrasMonedas[0] || monedaBase;
    return [...prev, nuevaFilaPago(monedaSugerida, true)];
  });
  const quitarFila = (id: string) => setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev));
  const completarConPendiente = (id: string) => setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, auto: true } : { ...f, auto: false })));

  const handleCobrar = () => {
    const pagos: PagoParcial[] = filas
      .filter((f) => Number(f.monto) > 0)
      .map((f) => ({ metodoPago: f.metodoPago, moneda: f.moneda, monto: Number(f.monto) }));
    onCobrar(pagos, monedaVuelto);
  };

  const simbolo = monedaBase === "USD" ? "$" : monedaBase + " ";
  const formatearEnOtras = (montoBase: number) =>
    otrasMonedas
      .filter((m) => tasas[m] != null)
      .map((m) => `${MONEDAS_ALTERNAS[m]} ${deBase(montoBase, m).toFixed(2)}`)
      .join(" · ");

  return (
    <div className="space-y-3 pt-3 border-t border-slate-300/50 dark:border-white/10">
      <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Cobro (uno o varios métodos)</p>

      <div className="space-y-2">
        {filas.map((f) => (
          <div key={f.id} className="flex items-center gap-1.5">
            <select value={f.metodoPago} onChange={(e) => actualizarMetodo(f.id, e.target.value)} className="input-horeca flex-[1.3] text-xs">
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="BILLETERA_DIGITAL">Billetera digital</option>
            </select>
            <select value={f.moneda} onChange={(e) => actualizarMoneda(f.id, e.target.value)} className="input-horeca w-[4.5rem] text-xs">
              <option value={monedaBase}>{monedaBase}</option>
              {otrasMonedas.map((m) => <option key={m} value={m}>{MONEDAS_ALTERNAS[m]}</option>)}
            </select>
            <div className="relative w-24 flex-shrink-0">
              <input
                value={f.monto}
                onChange={(e) => actualizarMonto(f.id, e.target.value)}
                type="number" step="0.01" min="0" placeholder="0.00"
                title={f.auto ? "Se calcula sola con lo que falta — escribe aquí para fijarla a mano" : undefined}
                className={`input-horeca w-full text-xs ${f.auto ? "text-teal-600 dark:text-teal-300" : ""}`}
              />
              {f.auto && f.monto && (
                <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold bg-teal-500 text-white rounded-full px-1 leading-tight">auto</span>
              )}
            </div>
            <button type="button" onClick={() => completarConPendiente(f.id)} title="Rellenar con lo que falta" className="text-[10px] font-semibold text-teal-600 dark:text-teal-300 px-1 cursor-pointer whitespace-nowrap">todo</button>
            {filas.length > 1 && (
              <button type="button" onClick={() => quitarFila(f.id)} className="text-slate-400 hover:text-red-500 cursor-pointer flex-shrink-0"><IconTrash size={13} /></button>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={agregarFila} className="text-xs text-teal-600 dark:text-teal-300 font-semibold cursor-pointer">+ Agregar otro método de pago</button>

      <div className="apple-glass rounded-xl p-3 space-y-1 text-xs">
        <div className="flex justify-between"><span className="text-slate-500 dark:text-white/40">Total a cobrar</span><span className="font-mono font-bold text-slate-900 dark:text-white">{simbolo}{total.toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500 dark:text-white/40">Ingresado</span><span className="font-mono text-slate-700 dark:text-white/70">{simbolo}{totalIngresadoBase.toFixed(2)}</span></div>
        {!cubierto ? (
          <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
            <span>Pendiente</span>
            <span className="font-mono">{simbolo}{pendienteBase.toFixed(2)}{formatearEnOtras(pendienteBase) ? ` · ${formatearEnOtras(pendienteBase)}` : ""}</span>
          </div>
        ) : (
          <div className="flex justify-between text-teal-600 dark:text-teal-400 font-semibold">
            <span>Vuelto</span>
            <span className="font-mono">{simbolo}{vueltoBase.toFixed(2)}{formatearEnOtras(vueltoBase) ? ` · ${formatearEnOtras(vueltoBase)}` : ""}</span>
          </div>
        )}
      </div>

      {vueltoBase > 0.004 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-white/40 whitespace-nowrap">Entregar vuelto en</span>
          <select value={monedaVuelto} onChange={(e) => setMonedaVuelto(e.target.value)} className="input-horeca flex-1">
            <option value={monedaBase}>{monedaBase}</option>
            {otrasMonedas.map((m) => <option key={m} value={m}>{MONEDAS_ALTERNAS[m]} ({m})</option>)}
          </select>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button onClick={handleCobrar} disabled={procesando || !cubierto}
        className="w-full btn-cyber-neon text-white text-sm font-bold py-3.5 rounded-xl cursor-pointer disabled:opacity-50">
        {procesando ? "Procesando…" : cubierto ? `Cobrar y Cerrar ${simbolo}${total.toFixed(2)}` : "Completa el pago para cobrar"}
      </button>
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
  const [estacionManual, setEstacionManual] = useState(ESTACIONES[0]);
  const [cantidad, setCantidad] = useState("1");
  const [agregando, setAgregando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numeroPersonas, setNumeroPersonas] = useState("2");
  const [division, setDivision] = useState<number[] | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);
  const [moneda, setMoneda] = useState("USD");

  useEffect(() => { monedaBase(tenantId).then(setMoneda).catch(() => setMoneda("USD")); }, [tenantId]);

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
        estacionCocina: escandallo ? escandallo.estacionCocina : estacionManual,
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

  const handleCerrar = async (pagos: PagoParcial[], monedaVuelto: string) => {
    setCerrando(true);
    setErrorCierre(null);
    try {
      const resultado = await cerrarComandaMixto(tenantId, comanda.id, pagos, monedaVuelto);
      try {
        const blob = await descargarTicketComanda(tenantId, comanda.id);
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } catch {
        // El cobro ya se procesó — si el recibo falla al generarse no debe bloquear el cierre.
      }
      onCerrar(totalLocal, resultado.comanda.metodoPago || "MIXTO");
    } catch (e) {
      setErrorCierre(e instanceof Error ? e.message : "No se pudo cerrar la comanda");
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
            {(escandallos || []).filter((e) => e.activo !== false).map((e) => (
              <option key={e.id} value={e.id}>{e.nombrePlato} · ${Number(e.precioVenta).toFixed(2)}</option>
            ))}
          </select>
          {!escandalloSel && (
            <div className="grid grid-cols-3 gap-2">
              <input value={nombrePlato} onChange={(e) => setNombrePlato(e.target.value)} placeholder="Nombre del plato" className="input-horeca" />
              <input value={precioManual} onChange={(e) => setPrecioManual(e.target.value)} placeholder="Precio $" type="number" step="0.01" className="input-horeca" />
              <select value={estacionManual} onChange={(e) => setEstacionManual(e.target.value)} className="input-horeca" title="A qué estación de cocina va este plato">
                {ESTACIONES.map((e) => <option key={e} value={e}>{e.replace("_", " ")}</option>)}
              </select>
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
        {items.length > 0 && (
          <PanelCobroMixto tenantId={tenantId} total={totalLocal} monedaBase={moneda} procesando={cerrando} error={errorCierre} onCobrar={handleCerrar} />
        )}
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COCINA (KDS)
// ══════════════════════════════════════════════════════════════════════════
function Cocina({ tenantId, onCambio }: { tenantId: number; onCambio: () => void }) {
  const [estacion, setEstacion] = useState(ESTACIONES[0]);
  const [items, setItems] = useState<ItemComanda[] | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  const cargar = () => {
    obtenerTableroKds(tenantId, estacion).then(setItems).catch(() => setItems([]));
  };
  useEffect(() => { cargar(); }, [estacion, tenantId]);
  // Repinta el temporizador de cada tarjeta sin tener que re-consultar el backend.
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const minutosEnEspera = (item: ItemComanda) => Math.max(0, Math.floor((ahora - new Date(item.fechaCreacion).getTime()) / 60000));
  const estiloPorTiempo = (min: number) =>
    min >= 10 ? "bg-red-500/15 border border-red-500/40 hover:bg-red-500/25"
    : min >= 5 ? "bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25"
    : "bg-slate-100/60 dark:bg-white/5 border border-transparent hover:bg-teal-500/10";
  const colorTexto = (min: number) => (min >= 10 ? "text-red-600 dark:text-red-300" : min >= 5 ? "text-amber-600 dark:text-amber-300" : "text-slate-500 dark:text-white/40");

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
              ) : items.filter((i) => i.estadoItem === col.estado).map((i) => {
                const min = minutosEnEspera(i);
                return (
                  <button key={i.id} onClick={() => avanzar(i)} title="Toca para avanzar de estado"
                    className={`w-full text-left rounded-xl p-3 cursor-pointer transition-all ${estiloPorTiempo(min)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">{i.cantidad}× {i.nombrePlato}</div>
                      <div className={`text-[10px] font-mono font-bold whitespace-nowrap ${colorTexto(min)}`}>{min} min</div>
                    </div>
                  </button>
                );
              })}
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
function Recetas({ tenantId, escandallos, articulos, onCambio }: { tenantId: number; escandallos: EscandalloReceta[] | null; articulos: Articulo[] | null; onCambio: () => void }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ nombrePlato: "", estacionCocina: "COCINA", precioVenta: "", requiereCocina: true });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<EscandalloReceta | null>(null);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const eliminar = async (e: React.MouseEvent, escandallo: EscandalloReceta) => {
    e.stopPropagation();
    if (!window.confirm(`¿Eliminar la receta "${escandallo.nombrePlato}"? Si ya tiene ventas, en vez de borrarla se ocultará de Venta Rápida.`)) return;
    setEliminandoId(escandallo.id);
    setError(null);
    try {
      const resultado = await eliminarEscandallo(tenantId, escandallo.id);
      if (resultado && resultado.activo === false) {
        setError(`"${escandallo.nombrePlato}" ya tenía ventas registradas — se ocultó de Venta Rápida en vez de borrarse. Podés reactivarla desde su tarjeta.`);
      }
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la receta");
    } finally {
      setEliminandoId(null);
    }
  };

  const alternarActivo = async (e: React.MouseEvent, escandallo: EscandalloReceta) => {
    e.stopPropagation();
    setEliminandoId(escandallo.id);
    setError(null);
    try {
      await cambiarActivoEscandallo(tenantId, escandallo.id, !escandallo.activo);
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la receta");
    } finally {
      setEliminandoId(null);
    }
  };

  const crear = async () => {
    if (!form.nombrePlato.trim() || !form.precioVenta) { setError("Nombre y precio de venta son obligatorios"); return; }
    setGuardando(true);
    setError(null);
    try {
      await crearEscandallo(tenantId, { nombrePlato: form.nombrePlato.trim(), estacionCocina: form.estacionCocina, precioVenta: Number(form.precioVenta), requiereCocina: form.requiereCocina });
      setForm({ nombrePlato: "", estacionCocina: "COCINA", precioVenta: "", requiereCocina: true });
      setMostrarForm(false);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la receta");
    } finally {
      setGuardando(false);
    }
  };

  const alternarRequiereCocina = async (e: React.MouseEvent, escandallo: EscandalloReceta) => {
    e.stopPropagation();
    setEliminandoId(escandallo.id);
    setError(null);
    try {
      await cambiarRequiereCocinaEscandallo(tenantId, escandallo.id, !escandallo.requiereCocina);
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la receta");
    } finally {
      setEliminandoId(null);
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
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/60 cursor-pointer w-fit">
            <input type="checkbox" checked={form.requiereCocina} onChange={(e) => setForm({ ...form, requiereCocina: e.target.checked })} className="cursor-pointer" />
            Necesita preparación de cocina (desmarcar para bebida embotellada, snack o combo sin cocción)
          </label>
          <button onClick={crear} disabled={guardando} className="btn-cyber-neon text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {guardando ? "Guardando…" : "Guardar receta"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-amber-600 dark:text-amber-400 apple-glass rounded-xl p-3">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(escandallos || []).map((e) => {
          const margen = Number(e.precioVenta) - Number(e.costoTotalProduccion || 0);
          const inactivo = e.activo === false;
          return (
            <div key={e.id} onClick={() => setSeleccionado(e)}
              className={`apple-glass rounded-2xl p-5 hover-card cursor-pointer space-y-2 ${inactivo ? "opacity-50 border-dashed" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{e.nombrePlato}{inactivo && <span className="ml-1.5 text-[9px] font-normal text-slate-400">(oculta)</span>}</h4>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-white/40">{e.estacionCocina}</span>
                  <button onClick={(ev) => alternarActivo(ev, e)} disabled={eliminandoId === e.id}
                    title={inactivo ? "Mostrar de nuevo en Venta Rápida" : "Ocultar de Venta Rápida (sin borrar)"}
                    className="text-slate-400 hover:text-teal-500 cursor-pointer disabled:opacity-40">
                    {inactivo ? <IconCheckCircle size={13} /> : <IconClose size={13} />}
                  </button>
                  <button onClick={(ev) => eliminar(ev, e)} disabled={eliminandoId === e.id} title="Eliminar receta"
                    className="text-slate-400 hover:text-red-500 cursor-pointer disabled:opacity-40">
                    <IconTrash size={13} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-white/40">Precio: <strong className="text-slate-900 dark:text-white">${Number(e.precioVenta).toFixed(2)}</strong></span>
                <span className="text-slate-500 dark:text-white/40">Costo: <strong className="text-slate-900 dark:text-white">${Number(e.costoTotalProduccion || 0).toFixed(2)}</strong></span>
              </div>
              <div className={`text-xs font-semibold ${margen >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-500"}`}>
                Margen: ${margen.toFixed(2)}
              </div>
              <button onClick={(ev) => alternarRequiereCocina(ev, e)} disabled={eliminandoId === e.id}
                title="Si se desmarca, esta venta no pasa por el tablero de cocina — queda entregada de una vez"
                className={`text-[10px] font-bold px-2 py-1 rounded-full cursor-pointer disabled:opacity-40 ${
                  e.requiereCocina !== false ? "bg-sky-500/15 text-sky-600 dark:text-sky-300" : "bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-white/40"
                }`}>
                {e.requiereCocina !== false ? "🍳 Pasa por cocina" : "⚡ Entrega directa"}
              </button>
            </div>
          );
        })}
      </div>

      {seleccionado && (
        <IngredientesModal tenantId={tenantId} escandallo={seleccionado} articulos={articulos} onClose={() => setSeleccionado(null)} onCambio={onCambio} />
      )}
    </div>
  );
}

function IngredientesModal({ tenantId, escandallo, articulos, onClose, onCambio }: { tenantId: number; escandallo: EscandalloReceta; articulos: Articulo[] | null; onClose: () => void; onCambio: () => void }) {
  const [ingredientes, setIngredientes] = useState<DetalleReceta[] | null>(null);
  const [articuloId, setArticuloId] = useState("");
  const [pesoNeto, setPesoNeto] = useState("");
  const [merma, setMerma] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => listarIngredientesEscandallo(tenantId, escandallo.id).then(setIngredientes).catch(() => setIngredientes([]));
  useEffect(() => { cargar(); }, [escandallo.id]);

  const agregar = async () => {
    const articulo = (articulos || []).find((a) => String(a.id) === articuloId);
    if (!articulo || !pesoNeto) { setError("Elige el ingrediente del inventario e indica el peso neto"); return; }
    setGuardando(true);
    setError(null);
    try {
      await agregarIngredienteEscandallo(tenantId, escandallo.id, { ingredienteSku: articulo.sku, pesoNeto: Number(pesoNeto), porcentajeMerma: Number(merma) || 0 });
      setArticuloId(""); setPesoNeto(""); setMerma("0");
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
            {ingredientes.map((d) => {
              const articuloIngrediente = (articulos || []).find((a) => a.sku === d.ingredienteSku);
              return (
                <div key={d.id} className="flex items-center justify-between bg-slate-100/60 dark:bg-white/5 rounded-xl px-3.5 py-2.5 text-sm">
                  <span className="text-slate-900 dark:text-white">{d.subReceta ? `Sub-receta: ${d.subReceta.nombrePlato}` : articuloIngrediente?.nombre || d.ingredienteSku}</span>
                  <span className="font-mono text-xs text-slate-500 dark:text-white/40">{Number(d.cantidadRequerida).toFixed(3)}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="apple-glass rounded-xl p-4 space-y-2.5 border-t border-slate-300/50 dark:border-white/10">
          <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Agregar ingrediente desde Inventario</p>
          <div className="grid grid-cols-3 gap-2">
            <select value={articuloId} onChange={(e) => setArticuloId(e.target.value)} className="input-horeca">
              <option value="">— Ingrediente —</option>
              {(articulos || []).map((a) => <option key={a.id} value={a.id}>{a.nombre} ({a.unidadMedida})</option>)}
            </select>
            <input value={pesoNeto} onChange={(e) => setPesoNeto(e.target.value)} type="number" step="0.001" placeholder="Cantidad" className="input-horeca" />
            <input value={merma} onChange={(e) => setMerma(e.target.value)} type="number" step="0.1" placeholder="% merma" className="input-horeca" />
          </div>
          {(articulos || []).length === 0 && (
            <p className="text-[11px] text-amber-500">Todavía no tienes artículos en Inventario — agrega uno primero para poder elegirlo aquí.</p>
          )}
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
  const [tab, setTab] = useState<"compra" | "proveedores">("compra");
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
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-2 rounded-full font-bold transition-all cursor-pointer ${tab === t.id ? "bg-teal-600 text-white shadow-xs" : "text-slate-600 dark:text-white/60"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "compra" && <RegistrarCompra tenantId={tenantId} proveedores={proveedores} articulos={articulos} onCambio={onCambio} />}

      {tab === "proveedores" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-white/40">{(proveedores || []).length} proveedores registrados</p>
            <button onClick={() => setMostrarFormProveedor((v) => !v)} className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
              {mostrarFormProveedor ? "Cancelar" : "+ Nuevo proveedor"}
            </button>
          </div>

          {mostrarFormProveedor && (
            <div className="apple-glass rounded-2xl p-5 space-y-4">
              <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">Nuevo proveedor</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Campo label="Nombre / Razón social">
                  <input value={formProveedor.nombre} onChange={(e) => setFormProveedor({ ...formProveedor, nombre: e.target.value })} placeholder="Ej. Distribuidora Polar" className="input-horeca" />
                </Campo>
                <Campo label="RIF">
                  <input value={formProveedor.rif} onChange={(e) => setFormProveedor({ ...formProveedor, rif: e.target.value })} placeholder="J-12345678-9" className="input-horeca" />
                </Campo>
                <Campo label="Teléfono">
                  <input value={formProveedor.telefono} onChange={(e) => setFormProveedor({ ...formProveedor, telefono: e.target.value })} placeholder="0412-1234567" className="input-horeca" />
                </Campo>
                <Campo label="Persona de contacto">
                  <input value={formProveedor.contacto} onChange={(e) => setFormProveedor({ ...formProveedor, contacto: e.target.value })} placeholder="Ej. Luis Pérez" className="input-horeca" />
                </Campo>
              </div>
              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
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

// ══════════════════════════════════════════════════════════════════════════
// INVENTARIO — artículos + alertas de vencimiento, unidos en un solo lugar
// ══════════════════════════════════════════════════════════════════════════
function Inventario({ tenantId, articulos, onCambio }: { tenantId: number; articulos: Articulo[] | null; onCambio: () => void }) {
  const [tab, setTab] = useState<"articulos" | "vencimientos">("articulos");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/5 text-xs w-fit">
        {[
          { id: "articulos", label: "Artículos" },
          { id: "vencimientos", label: "Vencimientos" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-2 rounded-full font-bold transition-all cursor-pointer ${tab === t.id ? "bg-teal-600 text-white shadow-xs" : "text-slate-600 dark:text-white/60"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "articulos" && <GestionArticulos tenantId={tenantId} articulos={articulos} onCambio={onCambio} />}
      {tab === "vencimientos" && <Vencimientos tenantId={tenantId} onCambio={onCambio} />}
    </div>
  );
}

function generarSku(nombre: string): string {
  const base = nombre.trim().toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // quita tildes
    .replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${base || "ART"}-${Date.now().toString().slice(-5)}`;
}

function GestionArticulos({ tenantId, articulos, onCambio }: { tenantId: number; articulos: Articulo[] | null; onCambio: () => void }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarImportar, setMostrarImportar] = useState(false);
  const [form, setForm] = useState({ nombre: "", unidadMedida: "kg", categoria: "", costoUnitario: "", cantidadInicial: "", fechaVencimiento: "" });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Avisa ANTES de crear si ya existe un artículo con nombre parecido — la
  // causa más común de duplicados es escribir el mismo insumo dos veces sin
  // darse cuenta de que ya estaba cargado.
  const posibleDuplicado = form.nombre.trim().length > 2
    ? (articulos || []).find((a) => a.nombre.trim().toLowerCase() === form.nombre.trim().toLowerCase())
    : null;

  const crear = async () => {
    if (!form.nombre.trim()) { setError("El nombre del artículo es obligatorio"); return; }
    setGuardando(true);
    setError(null);
    try {
      const nuevo = await crearArticulo(tenantId, {
        sku: generarSku(form.nombre),
        nombre: form.nombre.trim(),
        unidadMedida: form.unidadMedida,
        categoria: form.categoria || undefined,
        costoUnitario: form.costoUnitario ? Number(form.costoUnitario) : undefined,
      });
      if (form.cantidadInicial && Number(form.cantidadInicial) > 0) {
        await entradaArticulo(tenantId, nuevo.id, {
          cantidad: Number(form.cantidadInicial),
          costoUnitario: form.costoUnitario ? Number(form.costoUnitario) : undefined,
          motivo: "Carga inicial de inventario",
          fechaVencimiento: form.fechaVencimiento || undefined,
        });
      }
      setForm({ nombre: "", unidadMedida: "kg", categoria: "", costoUnitario: "", cantidadInicial: "", fechaVencimiento: "" });
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-slate-500 dark:text-white/40">{(articulos || []).length} artículos/insumos en Inventario</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setMostrarImportar(true)} className="apple-glass-btn text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5">
            <IconDownload size={14} /> Importar Excel
          </button>
          <button onClick={() => setMostrarForm((v) => !v)} className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
            {mostrarForm ? "Cancelar" : "+ Nuevo artículo"}
          </button>
        </div>
      </div>

      {mostrarForm && (
        <div className="apple-glass rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Campo label="Nombre del insumo">
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Harina de maíz" className="input-horeca" />
            </Campo>
            <Campo label="Unidad de medida">
              <select value={form.unidadMedida} onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })} className="input-horeca">
                {["kg", "g", "l", "ml", "unidad"].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Campo>
            <Campo label="Categoría (opcional)">
              <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ej. Insumos secos" className="input-horeca" />
            </Campo>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-300/50 dark:border-white/10">
            <Campo label="Costo unitario $ (opcional)">
              <input value={form.costoUnitario} onChange={(e) => setForm({ ...form, costoUnitario: e.target.value })} type="number" step="0.01" placeholder="0.00" className="input-horeca" />
            </Campo>
            <Campo label="Cantidad inicial en stock (opcional)">
              <input value={form.cantidadInicial} onChange={(e) => setForm({ ...form, cantidadInicial: e.target.value })} type="number" step="0.001" placeholder="0" className="input-horeca" />
            </Campo>
            <Campo label="Fecha de vencimiento (opcional)">
              <input value={form.fechaVencimiento} onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })} type="date" className="input-horeca" />
            </Campo>
          </div>
          {form.fechaVencimiento && (
            <p className={`text-[11px] font-semibold ${diasParaVencerTexto(form.fechaVencimiento).color}`}>
              {diasParaVencerTexto(form.fechaVencimiento).texto} — te avisaremos en Vencimientos cuando se acerque.
            </p>
          )}
          {posibleDuplicado && (
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              Ya existe "{posibleDuplicado.nombre}" con {Number(posibleDuplicado.stockActual)} {posibleDuplicado.unidadMedida} en stock — si es el mismo insumo,
              cancelá y usá "Ajustar stock" en esa tarjeta en vez de crear uno nuevo (si no, seguí igual).
            </p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={crear} disabled={guardando} className="btn-cyber-neon text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {guardando ? "Guardando…" : "Guardar artículo"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(articulos || []).map((a) => (
          <TarjetaArticulo key={a.id} tenantId={tenantId} articulo={a} onCambio={onCambio} />
        ))}
      </div>

      {mostrarImportar && (
        <ModalImportarInventario tenantId={tenantId} onClose={() => setMostrarImportar(false)} onImportado={onCambio} />
      )}
    </div>
  );
}

/** Carga masiva de inventario desde Excel/CSV (SheetJS parsea localmente en el navegador) — POST /api/inventario/articulos/importar-lote. */
function ModalImportarInventario({ tenantId, onClose, onImportado }: { tenantId: number; onClose: () => void; onImportado: () => void }) {
  const ALIAS: Record<string, string[]> = {
    sku: ["sku", "codigo"],
    nombre: ["nombre", "producto", "descripcion"],
    unidadMedida: ["unidad de medida", "unidad", "und", "um"],
    categoria: ["categoria"],
    costoUnitario: ["costo unitario", "costo", "precio costo"],
    stockInicial: ["stock inicial", "stock", "cantidad", "existencia"],
  };
  const normalizar = (s: string) => s.toString().trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [filas, setFilas] = useState<ItemImportacionArticulo[] | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacionArticulos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
      if (!columna.sku || !columna.nombre) {
        setError('El archivo debe tener al menos columnas "SKU" y "Nombre" en la primera fila.');
        return;
      }

      const procesadas: ItemImportacionArticulo[] = filasCrudas
        .map((fila) => ({
          sku: String(fila[columna.sku] ?? "").trim(),
          nombre: String(fila[columna.nombre] ?? "").trim(),
          unidadMedida: columna.unidadMedida ? String(fila[columna.unidadMedida] ?? "").trim() || undefined : undefined,
          categoria: columna.categoria ? String(fila[columna.categoria] ?? "").trim() || undefined : undefined,
          costoUnitario: columna.costoUnitario && fila[columna.costoUnitario] !== "" ? Number(fila[columna.costoUnitario]) : undefined,
          stockInicial: columna.stockInicial && fila[columna.stockInicial] !== "" ? Number(fila[columna.stockInicial]) : undefined,
        }))
        .filter((f) => f.sku && f.nombre);

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
      const res = await importarArticulosLote(tenantId, filas);
      setResultado(res);
      onImportado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo importar el archivo");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo="Importar inventario desde Excel/CSV" ancho="max-w-2xl">
      <div className="space-y-4">
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
                arrastrando ? "border-teal-500 bg-teal-500/10" : "border-slate-300/60 dark:border-white/15 hover:border-teal-500/50"
              }`}
            >
              <div className="flex justify-center mb-2 text-slate-400"><IconDownload size={28} /></div>
              <p className="text-sm font-semibold text-slate-700 dark:text-white/70">
                {archivo ? archivo.name : "Arrastra tu archivo aquí o haz click para elegirlo"}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">.xlsx, .xls o .csv — columnas: SKU, Nombre, Unidad, Costo, Stock Inicial (Categoría opcional)</p>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) procesarArchivo(f); }} />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            {filas && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-white/60">{filas.length} fila{filas.length === 1 ? "" : "s"} detectada{filas.length === 1 ? "" : "s"} — vista previa:</p>
                <div className="overflow-x-auto border border-slate-200/60 dark:border-white/10 rounded-xl max-h-48 overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-100/60 dark:bg-white/5 sticky top-0">
                      <tr className="text-left text-slate-400">
                        <th className="py-1.5 px-2">SKU</th><th className="py-1.5 px-2">Nombre</th><th className="py-1.5 px-2">Unidad</th>
                        <th className="py-1.5 px-2 text-right">Costo</th><th className="py-1.5 px-2 text-right">Stock inicial</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.slice(0, 8).map((f, i) => (
                        <tr key={i} className="border-t border-slate-200/50 dark:border-white/5">
                          <td className="py-1.5 px-2 font-mono">{f.sku}</td>
                          <td className="py-1.5 px-2">{f.nombre}</td>
                          <td className="py-1.5 px-2">{f.unidadMedida || "—"}</td>
                          <td className="py-1.5 px-2 text-right">{f.costoUnitario ?? "—"}</td>
                          <td className="py-1.5 px-2 text-right">{f.stockInicial ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filas.length > 8 && <p className="text-[10px] text-slate-400">…y {filas.length - 8} filas más.</p>}
                <button onClick={confirmarImportacion} disabled={procesando}
                  className="w-full btn-cyber-neon text-white text-sm font-bold py-3 rounded-xl cursor-pointer disabled:opacity-60">
                  {procesando ? "Importando…" : `Importar ${filas.length} artículo${filas.length === 1 ? "" : "s"}`}
                </button>
              </div>
            )}
          </>
        )}

        {resultado && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0"><IconCheckCircle size={22} /></div>
              <div>
                <div className="font-['Outfit'] font-bold text-slate-900 dark:text-white">Importación completada</div>
                <div className="text-xs text-slate-500 dark:text-white/40">
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
            <button onClick={onClose} className="w-full g-aurora text-white text-sm font-bold py-3 rounded-xl cursor-pointer">Cerrar</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function TarjetaArticulo({ tenantId, articulo, onCambio }: { tenantId: number; articulo: Articulo; onCambio: () => void }) {
  const [modo, setModo] = useState<"ver" | "editar" | "ajustar">("ver");
  const [form, setForm] = useState({ nombre: articulo.nombre, categoria: articulo.categoria || "", unidadMedida: articulo.unidadMedida || "unidad", costoUnitario: String(articulo.costoUnitario) });
  const [stockReal, setStockReal] = useState(String(Number(articulo.stockActual)));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardarEdicion = async () => {
    if (!form.nombre.trim()) { setError("El nombre no puede quedar vacío"); return; }
    setGuardando(true);
    setError(null);
    try {
      await editarArticulo(tenantId, articulo.id, {
        nombre: form.nombre.trim(), categoria: form.categoria.trim(), unidadMedida: form.unidadMedida.trim(),
        costoUnitario: form.costoUnitario ? Number(form.costoUnitario) : undefined,
      });
      setModo("ver");
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const guardarAjuste = async () => {
    if (stockReal === "" || Number(stockReal) < 0) { setError("Indicá el stock real contado"); return; }
    setGuardando(true);
    setError(null);
    try {
      await ajustarStockArticulo(tenantId, articulo.id, { stockReal: Number(stockReal) });
      setModo("ver");
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo ajustar el stock");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!window.confirm(`¿Eliminar "${articulo.nombre}"? Esto no se puede deshacer.`)) return;
    setGuardando(true);
    setError(null);
    try {
      await eliminarArticulo(tenantId, articulo.id);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
      setGuardando(false);
    }
  };

  if (modo === "editar") {
    return (
      <div className="apple-glass rounded-2xl p-5 space-y-2 border border-teal-500/30">
        <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-horeca text-sm font-bold" placeholder="Nombre" />
        <div className="grid grid-cols-2 gap-2">
          <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="input-horeca text-xs" placeholder="Categoría" />
          <select value={form.unidadMedida} onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })} className="input-horeca text-xs">
            {["kg", "g", "l", "ml", "unidad"].map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <input value={form.costoUnitario} onChange={(e) => setForm({ ...form, costoUnitario: e.target.value })} type="number" step="0.01" className="input-horeca text-xs" placeholder="Costo unitario $" />
        {error && <p className="text-[10px] text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button onClick={guardarEdicion} disabled={guardando} className="flex-1 g-aurora text-white text-xs font-semibold py-2 rounded-lg cursor-pointer disabled:opacity-60">
            {guardando ? "Guardando…" : "Guardar"}
          </button>
          <button onClick={() => { setModo("ver"); setError(null); }} className="flex-1 apple-glass-btn text-xs font-semibold py-2 rounded-lg cursor-pointer">Cancelar</button>
        </div>
      </div>
    );
  }

  if (modo === "ajustar") {
    return (
      <div className="apple-glass rounded-2xl p-5 space-y-2 border border-teal-500/30">
        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{articulo.nombre}</h4>
        <p className="text-[10px] text-slate-500 dark:text-white/40">Sistema dice: {Number(articulo.stockActual)} {articulo.unidadMedida}. Escribí lo que realmente hay contado — el sistema calcula y audita la diferencia solo.</p>
        <input value={stockReal} onChange={(e) => setStockReal(e.target.value)} type="number" step="0.001" min="0" className="input-horeca text-sm font-bold" placeholder="Stock real" autoFocus />
        {error && <p className="text-[10px] text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button onClick={guardarAjuste} disabled={guardando} className="flex-1 g-aurora text-white text-xs font-semibold py-2 rounded-lg cursor-pointer disabled:opacity-60">
            {guardando ? "Guardando…" : "Corregir stock"}
          </button>
          <button onClick={() => { setModo("ver"); setError(null); }} className="flex-1 apple-glass-btn text-xs font-semibold py-2 rounded-lg cursor-pointer">Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="apple-glass rounded-2xl p-5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{articulo.nombre}</h4>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => setModo("ajustar")} title="Corregir stock (conteo físico)" className="text-slate-400 hover:text-teal-500 cursor-pointer"><IconRefresh size={13} /></button>
          <button onClick={() => setModo("editar")} title="Editar nombre/categoría/costo" className="text-slate-400 hover:text-teal-500 cursor-pointer"><IconCustomize size={13} /></button>
          <button onClick={eliminar} disabled={guardando} title="Eliminar artículo" className="text-slate-400 hover:text-red-500 cursor-pointer disabled:opacity-40"><IconTrash size={13} /></button>
        </div>
      </div>
      <div className="text-xs text-slate-500 dark:text-white/40">{articulo.categoria || "Sin categoría"} · {articulo.unidadMedida}</div>
      <div className="text-xs text-slate-500 dark:text-white/40">Stock: {Number(articulo.stockActual).toFixed(2)} · Costo: ${Number(articulo.costoUnitario).toFixed(2)}</div>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
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
              {f.fechaVencimiento && (
                <p className={`text-[10px] mt-1 font-semibold ${diasParaVencerTexto(f.fechaVencimiento).color}`}>
                  {diasParaVencerTexto(f.fechaVencimiento).texto}
                </p>
              )}
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
function Configuracion({ tenantId, config, onGuardar }: { tenantId: number; config: any; onGuardar: (c: any) => void }) {
  const [form, setForm] = useState(config);
  const [guardado, setGuardado] = useState(false);

  const guardar = () => {
    onGuardar(form);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div className="apple-glass rounded-2xl p-6 space-y-4">
        <Campo label="Nombre del local">
          <input value={form.nombreLocal} onChange={(e) => setForm({ ...form, nombreLocal: e.target.value })} className="input-horeca" />
        </Campo>
        <button onClick={guardar} className="g-aurora text-white text-sm font-semibold px-6 py-3 rounded-xl cursor-pointer">
          {guardado ? "✓ Guardado" : "Guardar configuración"}
        </button>
      </div>

      <TasasDeCambio tenantId={tenantId} />
    </div>
  );
}

function TasasDeCambio({ tenantId }: { tenantId: number }) {
  const PARES = [
    { origen: "USD", destino: "VES", label: "Dólar → Bolívar (BCV)" },
    { origen: "USD", destino: "COP", label: "Dólar → Peso colombiano" },
  ];

  const [vigentes, setVigentes] = useState<Record<string, TasaCambio | null>>({});
  const [nuevaTasa, setNuevaTasa] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clave = (o: string, d: string) => `${o}_${d}`;

  const cargar = () => {
    PARES.forEach((p) => {
      tasaVigente(tenantId, p.origen, p.destino)
        .then((t) => setVigentes((prev) => ({ ...prev, [clave(p.origen, p.destino)]: t })))
        .catch(() => setVigentes((prev) => ({ ...prev, [clave(p.origen, p.destino)]: null })));
    });
  };
  useEffect(() => { cargar(); }, [tenantId]);

  const actualizar = async (par: typeof PARES[number]) => {
    const k = clave(par.origen, par.destino);
    const valor = Number(nuevaTasa[k]);
    if (!valor || valor <= 0) { setError("Ingresa una tasa válida mayor a cero"); return; }
    setError(null);
    setGuardando(k);
    try {
      await actualizarTasa(tenantId, { monedaOrigen: par.origen, monedaDestino: par.destino, tasa: valor, origen: "MANUAL" });
      setNuevaTasa((prev) => ({ ...prev, [k]: "" }));
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar la tasa");
    } finally {
      setGuardando(null);
    }
  };

  return (
    <div className="apple-glass rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base">Tasas de cambio del día</h3>
        <p className="text-slate-500 dark:text-white/40 text-xs mt-0.5">Se guarda un historial — nunca se sobreescribe la tasa anterior, siempre se usa la más reciente.</p>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="space-y-3">
        {PARES.map((p) => {
          const k = clave(p.origen, p.destino);
          const vigente = vigentes[k];
          return (
            <div key={k} className="flex items-center gap-3 flex-wrap bg-slate-100/60 dark:bg-white/5 rounded-xl p-3.5">
              <div className="flex-1 min-w-[140px]">
                <div className="text-xs font-semibold text-slate-700 dark:text-white/70">{p.label}</div>
                <div className="text-[11px] text-slate-500 dark:text-white/40 font-mono mt-0.5">
                  {vigente ? `Vigente: ${Number(vigente.tasa).toFixed(2)}` : "Sin tasa registrada"}
                </div>
              </div>
              <input
                value={nuevaTasa[k] || ""}
                onChange={(e) => setNuevaTasa((prev) => ({ ...prev, [k]: e.target.value }))}
                type="number" step="0.01" placeholder="Nueva tasa"
                className="input-horeca w-32"
              />
              <button onClick={() => actualizar(p)} disabled={guardando === k}
                className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
                {guardando === k ? "Guardando…" : "Actualizar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// VENTA RÁPIDA — para lo que no pasa por una mesa (mostrador, para llevar)
// ══════════════════════════════════════════════════════════════════════════
function VentaRapida({ tenantId, escandallos, fastbar, articulos, tasaBcv, onVenta }: {
  tenantId: number; escandallos: EscandalloReceta[] | null; fastbar: FastBarTrago[] | null; articulos: Articulo[] | null;
  tasaBcv: TasaCambio | null; onVenta: (monto: number, metodo: string) => void;
}) {
  interface LineaCarrito { key: string; nombre: string; precio: number; cantidad: number; escandalloId?: number; articuloId?: number; estacionCocina?: string }
  interface ReciboVenta { comandaId: number; lineas: LineaCarrito[]; total: number; metodoPago: string; fecha: string }
  type ResultadoBusqueda =
    | { tipo: "articulo"; id: number; nombre: string; unidadMedida: string; stockActual: number; costoUnitario: number }
    | { tipo: "receta"; id: number; nombre: string; precioVenta: number; estacionCocina: string }
    | { tipo: "fastbar"; id: number; nombre: string; precioVenta: number };

  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<ResultadoBusqueda | null>(null);
  const [cantidadManual, setCantidadManual] = useState("1");
  const [precioManual, setPrecioManual] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recibo, setRecibo] = useState<ReciboVenta | null>(null);
  const [abriendoTicket, setAbriendoTicket] = useState(false);
  const [imprimiendoEscPos, setImprimiendoEscPos] = useState(false);
  const [moneda, setMoneda] = useState("USD");
  const busquedaRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { monedaBase(tenantId).then(setMoneda).catch(() => setMoneda("USD")); }, [tenantId]);
  // Auto-focus para que un escáner de código de barras (que solo "teclea"
  // rápido + Enter) pueda disparar sin que el cajero tenga que hacer clic.
  useEffect(() => { busquedaRef.current?.focus(); }, []);

  const categorias = useMemo(() => Array.from(new Set((articulos || []).map((a) => a.categoria || "General"))).sort(), [articulos]);

  // Un solo buscador para recetas, tragos de Fast-Bar y artículos de
  // inventario — antes las recetas aparecían como botones sueltos arriba,
  // duplicando la forma de encontrar lo mismo. También matchea por SKU (lo
  // que efectivamente lee un escáner de código de barras), priorizando el
  // match exacto de SKU arriba del todo.
  const resultadosBusqueda = useMemo(() => {
    if (seleccion) return [];
    const q = busqueda.trim().toLowerCase();
    if (!q && !categoriaFiltro) return [];
    const dentroCategoria = (a: Articulo) => !categoriaFiltro || (a.categoria || "General") === categoriaFiltro;
    const recetas: ResultadoBusqueda[] = categoriaFiltro ? [] : (escandallos || [])
      .filter((e) => e.activo !== false && e.nombrePlato.toLowerCase().includes(q))
      .map((e) => ({ tipo: "receta", id: e.id, nombre: e.nombrePlato, precioVenta: Number(e.precioVenta), estacionCocina: e.estacionCocina }));
    const tragos: ResultadoBusqueda[] = categoriaFiltro ? [] : (fastbar || [])
      .filter((t) => t.nombreTrago.toLowerCase().includes(q))
      .map((t) => ({ tipo: "fastbar", id: t.id, nombre: t.nombreTrago, precioVenta: Number(t.precioVenta) }));
    const insumos: ResultadoBusqueda[] = (articulos || [])
      .filter((a) => dentroCategoria(a) && (a.nombre.toLowerCase().includes(q) || a.sku.toLowerCase().includes(q)))
      .sort((a, b) => Number(b.sku.toLowerCase() === q) - Number(a.sku.toLowerCase() === q))
      .map((a) => ({ tipo: "articulo", id: a.id, nombre: a.nombre, unidadMedida: a.unidadMedida || "unidad", stockActual: Number(a.stockActual), costoUnitario: Number(a.costoUnitario) }));
    return [...recetas, ...tragos, ...insumos].slice(0, categoriaFiltro ? 24 : 8);
  }, [busqueda, seleccion, escandallos, fastbar, articulos, categoriaFiltro]);

  const elegirResultado = (r: ResultadoBusqueda, autoAgregar = false) => {
    if (autoAgregar && r.tipo !== "articulo") {
      // Flujo de escáner: un solo Enter agrega el trago/receta directo con cantidad 1, sin pasos extra.
      agregarConCantidad({
        key: `${r.tipo}-${r.id}`, nombre: r.nombre, precio: r.precioVenta,
        escandalloId: r.tipo === "receta" ? r.id : undefined,
        estacionCocina: r.tipo === "receta" ? r.estacionCocina : "BAR",
      }, 1);
      setBusqueda("");
      return;
    }
    setSeleccion(r);
    setBusqueda("");
    setPrecioManual(r.tipo === "articulo" ? "" : String(r.precioVenta));
  };

  const agregarConCantidad = (linea: Omit<LineaCarrito, "cantidad">, cant: number) => {
    setCarrito((prev) => {
      const existente = prev.find((l) => l.key === linea.key);
      if (existente) return prev.map((l) => (l.key === linea.key ? { ...l, cantidad: l.cantidad + cant } : l));
      return [...prev, { ...linea, cantidad: cant }];
    });
  };
  const cambiarCantidad = (key: string, delta: number) => {
    setCarrito((prev) => prev.map((l) => (l.key === key ? { ...l, cantidad: Math.max(1, l.cantidad + delta) } : l)).filter((l) => l.cantidad > 0));
  };
  const quitarLinea = (key: string) => setCarrito((prev) => prev.filter((l) => l.key !== key));

  const handleAgregarProducto = () => {
    setError(null);
    const nombre = seleccion ? seleccion.nombre : busqueda.trim();
    if (!nombre) { setError("La descripción del producto es obligatoria — búscalo o escribe qué vas a vender"); return; }
    if (!precioManual || Number(precioManual) <= 0) { setError("El precio es obligatorio"); return; }
    const cant = parseFloat(cantidadManual);
    if (!cant || cant <= 0) { setError("Indica una cantidad válida (acepta decimales: kg, L, etc.)"); return; }
    if (seleccion?.tipo === "articulo") {
      const yaEnCarrito = carrito.find((l) => l.key === `articulo-${seleccion.id}`)?.cantidad || 0;
      if (yaEnCarrito + cant > seleccion.stockActual) {
        setError(`Solo hay ${seleccion.stockActual} ${seleccion.unidadMedida} disponibles de ${seleccion.nombre} en inventario`);
        return;
      }
    }
    agregarConCantidad({
      key: seleccion ? `${seleccion.tipo}-${seleccion.id}` : `manual-${Date.now()}`,
      nombre,
      precio: Number(precioManual),
      articuloId: seleccion?.tipo === "articulo" ? seleccion.id : undefined,
      escandalloId: seleccion?.tipo === "receta" ? seleccion.id : undefined,
      estacionCocina: seleccion?.tipo === "receta" ? seleccion.estacionCocina : seleccion?.tipo === "fastbar" ? "BAR" : seleccion?.tipo === "articulo" ? undefined : "COCINA",
    }, cant);
    setSeleccion(null); setBusqueda(""); setCantidadManual("1"); setPrecioManual("");
  };

  const total = carrito.reduce((s, l) => s + l.precio * l.cantidad, 0);

  const cobrar = async (pagos: PagoParcial[], monedaVuelto: string) => {
    if (carrito.length === 0) return;
    setError(null);
    setProcesando(true);
    try {
      const comanda = await abrirComanda(tenantId, { mesero: "Mostrador", canal: "RECOGER_EN_TIENDA" });
      for (const linea of carrito) {
        await agregarItemComanda(tenantId, comanda.id, {
          escandalloId: linea.escandalloId,
          articuloId: linea.articuloId,
          nombrePlato: linea.nombre,
          estacionCocina: linea.estacionCocina,
          cantidad: linea.cantidad,
          precioUnitario: linea.precio,
        });
      }
      const resultado = await cerrarComandaMixto(tenantId, comanda.id, pagos, monedaVuelto);
      const metodoResumen = resultado.comanda.metodoPago || "MIXTO";
      onVenta(total, metodoResumen);
      setRecibo({ comandaId: comanda.id, lineas: carrito, total, metodoPago: metodoResumen, fecha: new Date().toLocaleString() });
      setCarrito([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo procesar la venta");
    } finally {
      setProcesando(false);
    }
  };

  const verTicket = async () => {
    if (!recibo) return;
    setAbriendoTicket(true);
    try {
      const blob = await descargarTicketComanda(tenantId, recibo.comandaId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el recibo en PDF");
    } finally {
      setAbriendoTicket(false);
    }
  };

  // Impresora térmica por Web Serial: escribe los bytes ESC/POS directo al
  // puerto USB/serial, sin el diálogo de impresión del navegador. Requiere
  // Chrome/Edge sobre HTTPS o localhost y un gesto del usuario (el propio
  // click) para pedir permiso del puerto — no hay forma de saltarse eso.
  const imprimirEscPos = async () => {
    if (!recibo) return;
    setImprimiendoEscPos(true);
    setError(null);
    try {
      const nav = navigator as Navigator & { serial?: { requestPort: () => Promise<any> } };
      if (!nav.serial) {
        throw new Error("Este navegador no soporta impresión térmica directa (Web Serial) — usa Chrome o Edge, o imprime el PDF.");
      }
      const bytes = await descargarTicketEscPos(tenantId, recibo.comandaId);
      const port = await nav.serial.requestPort();
      await port.open({ baudRate: 9600 });
      const writer = port.writable.getWriter();
      await writer.write(bytes);
      writer.releaseLock();
      await port.close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo imprimir en la térmica");
    } finally {
      setImprimiendoEscPos(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
      {/* Buscador único: recetas, Fast-Bar e inventario */}
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-white/40">Busca lo que vas a vender — receta, trago o artículo de inventario — ideal para ventas de mostrador que no pasan por una mesa.</p>

        <div className="apple-glass rounded-xl p-4 space-y-2.5">
          <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Buscar producto (o escanea el código de barras)</p>

          {categorias.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <button type="button" onClick={() => setCategoriaFiltro(null)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer flex-shrink-0 ${
                  categoriaFiltro === null ? "bg-teal-600 text-white" : "bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-white/60"
                }`}>Todas</button>
              {categorias.map((c) => (
                <button key={c} type="button" onClick={() => { setCategoriaFiltro((prev) => (prev === c ? null : c)); setBusqueda(""); setSeleccion(null); }}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer flex-shrink-0 ${
                    categoriaFiltro === c ? "bg-teal-600 text-white" : "bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-white/60"
                  }`}>{c}</button>
              ))}
            </div>
          )}

          <div className="relative">
            <input
              ref={busquedaRef}
              value={seleccion ? seleccion.nombre : busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setSeleccion(null); }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || seleccion) return;
                e.preventDefault();
                if (resultadosBusqueda.length >= 1) elegirResultado(resultadosBusqueda[0], true);
              }}
              placeholder="Escribe o escanea… ej. Torta de Queso, Doritos, Mojito"
              className="input-horeca w-full pr-8"
            />
            {seleccion && (
              <button type="button" onClick={() => { setSeleccion(null); setBusqueda(""); setPrecioManual(""); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 cursor-pointer">
                <IconClose size={14} />
              </button>
            )}
            {!seleccion && (busqueda.trim() || categoriaFiltro) && resultadosBusqueda.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-300/60 dark:border-white/10 max-h-56 overflow-y-auto shadow-lg">
                {resultadosBusqueda.map((r) => (
                  <button key={`${r.tipo}-${r.id}`} type="button" onClick={() => elegirResultado(r)}
                    className="w-full text-left px-3 py-2 hover:bg-teal-500/10 text-xs cursor-pointer flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        r.tipo === "receta" ? "bg-purple-500/15 text-purple-600 dark:text-purple-300"
                        : r.tipo === "fastbar" ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                        : "bg-teal-500/15 text-teal-600 dark:text-teal-300"
                      }`}>{r.tipo === "receta" ? "RECETA" : r.tipo === "fastbar" ? "FAST-BAR" : "INVENTARIO"}</span>
                      <span className="font-semibold text-slate-800 dark:text-white truncate">{r.nombre}</span>
                    </span>
                    <span className="text-slate-400 font-mono flex-shrink-0">
                      {r.tipo === "articulo" ? `${r.stockActual} ${r.unidadMedida}` : `$${r.precioVenta.toFixed(2)}`}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {!seleccion && busqueda.trim() && resultadosBusqueda.length === 0 && (
              <p className="text-[10px] text-slate-400 mt-1">Sin resultados — puedes venderlo igual así, pero no descontará stock ni recetas.</p>
            )}
          </div>
          {seleccion?.tipo === "articulo" && (
            <div className="text-[10px] text-teal-600 dark:text-teal-300">
              En inventario: {seleccion.stockActual} {seleccion.unidadMedida} · Costo ${seleccion.costoUnitario.toFixed(2)} c/u
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="relative w-24 flex-shrink-0">
              <input value={cantidadManual} onChange={(e) => setCantidadManual(e.target.value)} type="number" min="0.001" step="0.001"
                placeholder="Cant." className="input-horeca w-full"
                title={`Cantidad${seleccion?.tipo === "articulo" ? ` (${seleccion.unidadMedida})` : ""} — acepta decimales para kg/L`} />
              {seleccion?.tipo === "articulo" && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 pointer-events-none">{seleccion.unidadMedida}</span>
              )}
            </div>
            <input value={precioManual} onChange={(e) => setPrecioManual(e.target.value)} type="number" step="0.01" placeholder="Precio de venta $" className="input-horeca flex-1" />
            <button onClick={handleAgregarProducto} className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer whitespace-nowrap">
              + Agregar
            </button>
          </div>
        </div>
      </div>

      {/* Carrito / cobro */}
      <div className="apple-glass rounded-2xl p-5 space-y-4 h-fit sticky top-4">
        <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base">Venta actual</h3>
        {carrito.length === 0 ? (
          <p className="text-xs text-slate-400">Agrega productos del catálogo o uno suelto.</p>
        ) : (
          <div className="space-y-2">
            {carrito.map((l) => (
              <div key={l.key} className="flex items-center justify-between gap-2 bg-slate-100/60 dark:bg-white/5 rounded-xl px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{l.nombre}</div>
                  <div className="text-[10px] text-slate-500 dark:text-white/40 font-mono">${l.precio.toFixed(2)} c/u</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => cambiarCantidad(l.key, -1)} className="w-6 h-6 rounded-full bg-slate-200/80 dark:bg-white/10 text-xs cursor-pointer flex-shrink-0">−</button>
                  <span className="text-xs font-bold w-5 text-center flex-shrink-0">{l.cantidad}</span>
                  <button onClick={() => cambiarCantidad(l.key, 1)} className="w-6 h-6 rounded-full bg-slate-200/80 dark:bg-white/10 text-xs cursor-pointer flex-shrink-0">+</button>
                  <button onClick={() => quitarLinea(l.key)} title="Quitar de la venta"
                    className="w-6 h-6 rounded-full flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white cursor-pointer flex-shrink-0 ml-0.5">
                    <IconTrash size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 border-t border-slate-300/50 dark:border-white/10">
          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
            <span>Total</span><span className="font-mono">${total.toFixed(2)}</span>
          </div>
          {tasaBcv && Number(tasaBcv.tasa) > 0 && (
            <div className="flex items-center justify-between text-xs text-teal-600 dark:text-teal-400 font-mono mt-0.5">
              <span>≈ Bs</span><span>{(total * Number(tasaBcv.tasa)).toFixed(2)}</span>
            </div>
          )}
        </div>

        {carrito.length > 0 && (
          <PanelCobroMixto tenantId={tenantId} total={total} monedaBase={moneda} procesando={procesando} error={error} onCobrar={cobrar} />
        )}
      </div>

      {recibo && (
        <Modal onClose={() => setRecibo(null)} titulo="Venta registrada">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0"><IconCheckCircle size={22} /></div>
              <div>
                <div className="font-['Outfit'] font-bold text-slate-900 dark:text-white">Cobro exitoso</div>
                <div className="text-xs text-slate-500 dark:text-white/40">{recibo.fecha}</div>
              </div>
            </div>

            <div className="space-y-1.5">
              {recibo.lineas.map((l) => (
                <div key={l.key} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-white/70">{l.cantidad}× {l.nombre}</span>
                  <span className="font-mono text-slate-900 dark:text-white">${(l.precio * l.cantidad).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-300/50 dark:border-white/10">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>Total</span><span className="font-mono">${recibo.total.toFixed(2)}</span>
              </div>
              {tasaBcv && Number(tasaBcv.tasa) > 0 && (
                <div className="flex items-center justify-between text-xs text-teal-600 dark:text-teal-400 font-mono mt-0.5">
                  <span>≈ Bs</span><span>{(recibo.total * Number(tasaBcv.tasa)).toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="text-xs text-slate-700 dark:text-white/80 font-medium">Pagado con: <span className="font-bold text-slate-900 dark:text-white">{recibo.metodoPago.replace("_", " ")}</span></div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button onClick={verTicket} disabled={abriendoTicket}
                className="flex-1 g-aurora text-white text-xs font-semibold py-3 rounded-xl cursor-pointer disabled:opacity-60">
                {abriendoTicket ? "Generando…" : "🧾 PDF"}
              </button>
              <button onClick={imprimirEscPos} disabled={imprimiendoEscPos} title="Imprime directo a impresora térmica USB por Web Serial, sin diálogo del sistema"
                className="flex-1 btn-cyber-neon text-white text-xs font-semibold py-3 rounded-xl cursor-pointer disabled:opacity-60">
                {imprimiendoEscPos ? "Imprimiendo…" : "🖨️ Térmica"}
              </button>
              <button onClick={() => setRecibo(null)} className="flex-1 apple-glass-btn text-xs font-semibold py-3 rounded-xl cursor-pointer">
                Nueva venta
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// REPORTES OPERATIVOS — Fase 1 del plan de escalamiento: motor de consultas
// de solo lectura (ReporteService/JPA Specifications) sobre las comandas
// pagadas, con exportación a Excel 100% local (SheetJS) — el backend nunca
// genera el .xlsx, solo entrega el JSON ya filtrado.
// ══════════════════════════════════════════════════════════════════════════
function ReportesOperativos({ tenantId }: { tenantId: number }) {
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10);
  });
  const [fechaFin, setFechaFin] = useState(hoy());
  const [metodoPago, setMetodoPago] = useState("");
  const [estado, setEstado] = useState<"PAGADA" | "ABIERTA" | "ANULADA" | "">("PAGADA");
  const [tickets, setTickets] = useState<ReporteTicket[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscar = () => {
    setCargando(true);
    setError(null);
    reporteTickets(tenantId, {
      fechaInicio: fechaInicio || undefined, fechaFin: fechaFin || undefined,
      metodoPago: metodoPago || undefined, estado: estado || undefined,
    })
      .then(setTickets)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar el reporte"))
      .finally(() => setCargando(false));
  };
  useEffect(() => { buscar(); }, [tenantId]);

  const totales = (tickets || []).reduce(
    (acc, t) => ({ usd: acc.usd + Number(t.totalUsd), bs: acc.bs + Number(t.totalBs || 0) }),
    { usd: 0, bs: 0 }
  );

  // Toma el JSON YA renderizado en la tabla (no vuelve a pedirle nada al
  // backend) y arma el .xlsx en el navegador — el servidor no sabe que esto
  // pasó, ni carga con generarlo.
  const exportarExcel = () => {
    if (!tickets || tickets.length === 0) return;
    const filas = tickets.map((t) => ({
      "Fecha": new Date(t.fecha).toLocaleString(),
      "Nro. Ticket": t.numeroTicket,
      "Total USD": Number(t.totalUsd),
      "Total Bs": t.totalBs != null ? Number(t.totalBs) : "",
      "Método de Pago": (t.metodoPago || "-").replace("_", " "),
      "Estado": t.estado,
      "Canal": t.canal,
      "Mesa": t.numeroMesa ?? "-",
    }));
    const hoja = XLSX.utils.json_to_sheet(filas);
    hoja["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 8 }];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Tickets");
    XLSX.writeFile(libro, `reporte-tickets_${fechaInicio}_a_${fechaFin}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <div className="apple-glass rounded-2xl p-5 space-y-3">
        <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base">Filtros</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Campo label="Desde">
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="input-horeca" />
          </Campo>
          <Campo label="Hasta">
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="input-horeca" />
          </Campo>
          <Campo label="Método de pago">
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="input-horeca">
              <option value="">Todos</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="BILLETERA_DIGITAL">Billetera digital</option>
              <option value="MIXTO">Mixto</option>
            </select>
          </Campo>
          <Campo label="Estado">
            <select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} className="input-horeca">
              <option value="">Todos</option>
              <option value="PAGADA">Pagada</option>
              <option value="ABIERTA">Abierta</option>
              <option value="ANULADA">Anulada</option>
            </select>
          </Campo>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={buscar} disabled={cargando} className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {cargando ? "Buscando…" : "Buscar"}
          </button>
          <button onClick={exportarExcel} disabled={!tickets || tickets.length === 0}
            className="apple-glass-btn text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-40 flex items-center gap-1.5">
            <IconDownload size={14} /> Exportar a Excel
          </button>
          {tickets && <span className="text-[11px] text-slate-400">{tickets.length} ticket{tickets.length === 1 ? "" : "s"}</span>}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <div className="apple-glass rounded-2xl p-5">
        {tickets === null ? (
          <p className="text-xs text-slate-400">Cargando…</p>
        ) : tickets.length === 0 ? (
          <p className="text-xs text-slate-400">Sin tickets en este rango/filtro.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 dark:text-white/40 uppercase text-[10px] tracking-wider border-b border-slate-300/50 dark:border-white/10">
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 px-3">Nro. Ticket</th>
                  <th className="py-2 px-3 text-right">Total USD</th>
                  <th className="py-2 px-3 text-right">Total Bs</th>
                  <th className="py-2 px-3">Método de Pago</th>
                  <th className="py-2 pl-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.comandaId} className="border-b border-slate-200/50 dark:border-white/5">
                    <td className="py-2 pr-3 text-slate-600 dark:text-white/60 whitespace-nowrap">{new Date(t.fecha).toLocaleString()}</td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-800 dark:text-white">{t.numeroTicket}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-800 dark:text-white">${Number(t.totalUsd).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-white/60">{t.totalBs != null ? `Bs ${Number(t.totalBs).toFixed(2)}` : "—"}</td>
                    <td className="py-2 px-3 text-slate-600 dark:text-white/60">{(t.metodoPago || "-").replace("_", " ")}</td>
                    <td className="py-2 pl-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.estado === "PAGADA" ? "bg-teal-500/15 text-teal-600 dark:text-teal-300"
                        : t.estado === "ANULADA" ? "bg-red-500/15 text-red-500"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                      }`}>{t.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold text-slate-900 dark:text-white border-t-2 border-slate-300/60 dark:border-white/10">
                  <td className="py-2 pr-3" colSpan={2}>Total</td>
                  <td className="py-2 px-3 text-right font-mono">${totales.usd.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono">Bs {totales.bs.toFixed(2)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// RESUMEN FINANCIERO — dashboard gerencial. Todos los números son reales
// (Reportes Operativos + Resumen Diario + Movimientos de caja ya
// existentes), no hay datos simulados: no hacía falta, los endpoints ya
// estaban construidos.
// ══════════════════════════════════════════════════════════════════════════
function ResumenFinanciero({ tenantId }: { tenantId: number }) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ventasHoy, setVentasHoy] = useState(0);
  const [ventasMes, setVentasMes] = useState(0);
  const [egresosHoy, setEgresosHoy] = useState(0);
  const [utilidadHoy, setUtilidadHoy] = useState(0);
  const [ticketsHoy, setTicketsHoy] = useState(0);
  const [topProductos, setTopProductos] = useState<ResumenUtilidadProducto[]>([]);
  const [tendencia, setTendencia] = useState<{ fecha: string; ventas: number }[]>([]);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);

    const hoy = new Date();
    const hoyStr = hoy.toISOString().slice(0, 10);
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
    const hace6dias = new Date(hoy); hace6dias.setDate(hace6dias.getDate() - 6);
    const hace6diasStr = hace6dias.toISOString().slice(0, 10);

    Promise.all([
      reporteTickets(tenantId, { fechaInicio: hoyStr, fechaFin: hoyStr, estado: "PAGADA" }),
      reporteTickets(tenantId, { fechaInicio: inicioMes, fechaFin: hoyStr, estado: "PAGADA" }),
      reporteTickets(tenantId, { fechaInicio: hace6diasStr, fechaFin: hoyStr, estado: "PAGADA" }),
      utilidadDiaria(tenantId, hoyStr),
      listarMovimientos(tenantId, "EGRESO"),
    ])
      .then(([ticketsHoyLista, ticketsMesLista, tickets7dias, utilidadHoyLista, egresos]) => {
        if (cancelado) return;
        const sumaUsd = (arr: ReporteTicket[]) => arr.reduce((s, t) => s + Number(t.totalUsd), 0);

        setVentasHoy(sumaUsd(ticketsHoyLista));
        setVentasMes(sumaUsd(ticketsMesLista));
        setTicketsHoy(ticketsHoyLista.length);
        setUtilidadHoy(utilidadHoyLista.reduce((s, u) => s + Number(u.utilidad), 0));
        setEgresosHoy(egresos.filter((m) => m.fechaRegistro.slice(0, 10) === hoyStr).reduce((s, m) => s + Number(m.monto), 0));
        setTopProductos([...utilidadHoyLista].sort((a, b) => b.cantidadVendida - a.cantidadVendida).slice(0, 5));

        // Serie de 7 días con huecos rellenados en 0 (para que el gráfico no salte días sin ventas)
        const porDia: Record<string, number> = {};
        for (let i = 0; i < 7; i++) {
          const d = new Date(hace6dias); d.setDate(d.getDate() + i);
          porDia[d.toISOString().slice(0, 10)] = 0;
        }
        tickets7dias.forEach((t) => {
          const dia = t.fecha.slice(0, 10);
          if (dia in porDia) porDia[dia] += Number(t.totalUsd);
        });
        setTendencia(Object.entries(porDia).map(([fecha, ventas]) => ({
          fecha: new Date(fecha + "T00:00:00").toLocaleDateString("es-VE", { day: "2-digit", month: "short" }),
          ventas: Number(ventas.toFixed(2)),
        })));
      })
      .catch((e) => { if (!cancelado) setError(e instanceof Error ? e.message : "No se pudieron cargar los indicadores"); })
      .finally(() => { if (!cancelado) setCargando(false); });

    return () => { cancelado = true; };
  }, [tenantId]);

  const ticketPromedio = ticketsHoy > 0 ? ventasHoy / ticketsHoy : 0;

  if (cargando) return <p className="text-xs text-slate-400">Cargando indicadores…</p>;

  return (
    <div className="space-y-5">
      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Ventas Totales" val={`$${ventasHoy.toFixed(2)}`} sub={`Mes: $${ventasMes.toFixed(2)}`} color="#0ea5e9" />
        <KpiCard label="Egresos Operativos" val={`$${egresosHoy.toFixed(2)}`} sub="Salidas de caja de hoy" color="#ef4444" />
        <KpiCard label="Utilidad Bruta Estimada" val={`$${utilidadHoy.toFixed(2)}`} sub="Ventas de hoy con costo conocido" color="#22c55e" />
        <KpiCard label="Ticket Promedio" val={`$${ticketPromedio.toFixed(2)}`} sub={`${ticketsHoy} ticket${ticketsHoy === 1 ? "" : "s"} hoy`} color="#a855f7" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="apple-glass rounded-2xl p-5">
          <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm mb-4">Top 5 productos más vendidos (hoy)</h3>
          {topProductos.length === 0 ? (
            <p className="text-xs text-slate-400">Sin ventas con costo conocido hoy todavía.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProductos} layout="vertical" margin={{ left: 10, right: 16 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="nombrePlato" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={((v: any) => [`${v} unid.`, "Vendidos"]) as any} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="cantidadVendida" fill="#14b8a6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="apple-glass rounded-2xl p-5">
          <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm mb-4">Tendencia de ingresos — últimos 7 días</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={tendencia}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
              <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={((v: any) => [`$${Number(v).toFixed(2)}`, "Ventas"]) as any} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Line type="monotone" dataKey="ventas" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ADMINISTRACIÓN — ingresos/gastos + cuentas x cobrar/pagar + cierre de caja, unidos
// ══════════════════════════════════════════════════════════════════════════
function Administracion({ tenantId }: { tenantId: number }) {
  const [tab, setTab] = useState<"financiero" | "turnos" | "finanzas" | "cuentas" | "cierre" | "resumen">("financiero");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/5 text-xs w-fit flex-wrap">
        {[
          { id: "financiero", label: "Resumen Financiero" },
          { id: "turnos", label: "Control de Caja (Turnos)" },
          { id: "finanzas", label: "Ingresos & Gastos" },
          { id: "cuentas", label: "Cuentas x Cobrar/Pagar" },
          { id: "cierre", label: "Cierre de Caja" },
          { id: "resumen", label: "Resumen Diario" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-2 rounded-full font-bold transition-all cursor-pointer ${tab === t.id ? "bg-teal-600 text-white shadow-xs" : "text-slate-600 dark:text-white/60"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "financiero" && <ResumenFinanciero tenantId={tenantId} />}
      {tab === "turnos" && <TurnosCaja tenantId={tenantId} />}
      {tab === "finanzas" && <Finanzas tenantId={tenantId} />}
      {tab === "cuentas" && <CuentasPorCobrarPagar tenantId={tenantId} />}
      {tab === "cierre" && <CierreDeCaja tenantId={tenantId} />}
      {tab === "resumen" && <ResumenDiario tenantId={tenantId} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL DE CAJA POR TURNOS — apertura con monto base, egresos y Cierre Z
// (compara lo esperado en sistema — base + ventas − egresos — contra lo que
// el cajero declara tener físicamente).
// ══════════════════════════════════════════════════════════════════════════
function TurnosCaja({ tenantId }: { tenantId: number }) {
  const MONEDAS = ["USD", "VES", "COP"];
  const [moneda, setMoneda] = useState("USD");
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
  const [cerrando, setCerrando] = useState(false);
  const [ultimoCierre, setUltimoCierre] = useState<Turno | null>(null);

  const cargarTurno = () => {
    setTurno(undefined);
    turnoAbierto(tenantId, moneda).then(setTurno).catch(() => setTurno(null));
  };
  const cargarHistorial = () => { historialTurnos(tenantId).then(setHistorial).catch(() => setHistorial([])); };
  useEffect(() => { cargarTurno(); }, [tenantId, moneda]);
  useEffect(() => { cargarHistorial(); }, [tenantId]);

  const abrir = async () => {
    setError(null);
    if (!idCajero.trim()) { setError("Indica quién abre la caja"); return; }
    if (montoBase === "" || Number(montoBase) < 0) { setError("Indica el monto base de apertura"); return; }
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
    if (!montoEgreso || Number(montoEgreso) <= 0) { setError("Indica el monto del egreso"); return; }
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
    if (montoDeclarado === "" || Number(montoDeclarado) < 0) { setError("Indica lo contado físicamente en caja"); return; }
    if (!window.confirm("¿Cerrar el turno? Esto genera el Cierre Z y no se puede deshacer.")) return;
    setCerrando(true);
    try {
      const cerrado = await cerrarTurno(tenantId, turno.id, Number(montoDeclarado));
      setUltimoCierre(cerrado);
      setMontoDeclarado("");
      cargarTurno();
      cargarHistorial();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cerrar el turno");
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/5 text-xs w-fit">
        {MONEDAS.map((m) => (
          <button key={m} onClick={() => setMoneda(m)} className={`px-4 py-1.5 rounded-full font-bold transition-all cursor-pointer ${moneda === m ? "bg-teal-600 text-white" : "text-slate-600 dark:text-white/60"}`}>
            {m}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {turno === undefined ? (
        <p className="text-xs text-slate-400">Cargando…</p>
      ) : turno === null ? (
        <div className="apple-glass rounded-2xl p-5 space-y-3">
          <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">Abrir turno de caja ({moneda})</h3>
          <p className="text-slate-500 dark:text-white/40 text-xs">No hay ninguna caja abierta en {moneda} ahora mismo.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="Cajero / Responsable">
              <input value={idCajero} onChange={(e) => setIdCajero(e.target.value)} placeholder="Nombre de quien abre" className="input-horeca" />
            </Campo>
            <Campo label={`Monto base de apertura (${moneda})`}>
              <input value={montoBase} onChange={(e) => setMontoBase(e.target.value)} type="number" step="0.01" placeholder="0.00" className="input-horeca" />
            </Campo>
          </div>
          <button onClick={abrir} disabled={abriendo} className="btn-cyber-neon text-white text-sm font-bold px-5 py-3 rounded-xl cursor-pointer disabled:opacity-60">
            {abriendo ? "Abriendo…" : "Abrir caja"}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="apple-glass rounded-2xl p-5 space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">Caja abierta ({moneda})</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-300">ABIERTO</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-white/40">Cajero: {turno.idCajero} · Desde {new Date(turno.fechaApertura).toLocaleString()}</p>
            <p className="text-xs text-slate-500 dark:text-white/40">Monto base: {Number(turno.montoBase).toFixed(2)} {moneda}</p>
          </div>

          <div className="apple-glass rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Registrar egreso</h4>
            <p className="text-slate-500 dark:text-white/40 text-xs">Pago a proveedor, gasto menor u otra salida de dinero de esta caja.</p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-3">
              <input value={montoEgreso} onChange={(e) => setMontoEgreso(e.target.value)} type="number" step="0.01" placeholder={`Monto ${moneda}`} className="input-horeca" />
              <input value={conceptoEgreso} onChange={(e) => setConceptoEgreso(e.target.value)} placeholder="Concepto (ej. Pago a proveedor)" className="input-horeca" />
            </div>
            <button onClick={registrarEgreso} disabled={registrandoEgreso} className="apple-glass-btn text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
              {registrandoEgreso ? "Registrando…" : "− Registrar egreso"}
            </button>
          </div>

          <div className="apple-glass rounded-2xl p-5 space-y-3 border border-amber-500/30">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Cierre de caja (Cierre Z)</h4>
            <p className="text-slate-500 dark:text-white/40 text-xs">Contá físicamente el efectivo y escribí lo que hay — el sistema compara contra lo esperado (base + ventas − egresos) y muestra el descuadre.</p>
            <input value={montoDeclarado} onChange={(e) => setMontoDeclarado(e.target.value)} type="number" step="0.01" placeholder={`Monto contado ${moneda}`} className="input-horeca" />
            <button onClick={cerrar} disabled={cerrando} className="btn-cyber-neon text-white text-sm font-bold px-5 py-3 rounded-xl cursor-pointer disabled:opacity-60">
              {cerrando ? "Cerrando…" : "Cerrar turno (Cierre Z)"}
            </button>
          </div>
        </div>
      )}

      {ultimoCierre && (
        <Modal onClose={() => setUltimoCierre(null)} titulo="Cierre Z registrado">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500 dark:text-white/40 text-xs">Esperado</span><div className="font-mono font-bold text-slate-900 dark:text-white">{Number(ultimoCierre.montoEsperado).toFixed(2)} {ultimoCierre.moneda}</div></div>
              <div><span className="text-slate-500 dark:text-white/40 text-xs">Declarado</span><div className="font-mono font-bold text-slate-900 dark:text-white">{Number(ultimoCierre.montoDeclarado).toFixed(2)} {ultimoCierre.moneda}</div></div>
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
            <button onClick={() => setUltimoCierre(null)} className="w-full apple-glass-btn text-xs font-semibold py-3 rounded-xl cursor-pointer">Cerrar</button>
          </div>
        </Modal>
      )}

      {historial && historial.length > 0 && (
        <div className="apple-glass rounded-2xl p-5">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Historial de turnos</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 dark:text-white/40 uppercase text-[10px] tracking-wider border-b border-slate-300/50 dark:border-white/10">
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
                  <tr key={t.id} className="border-b border-slate-200/50 dark:border-white/5">
                    <td className="py-2 pr-2 text-slate-600 dark:text-white/60 whitespace-nowrap">{new Date(t.fechaApertura).toLocaleString()}</td>
                    <td className="py-2 px-2 text-slate-600 dark:text-white/60">{t.idCajero}</td>
                    <td className="py-2 px-2 text-slate-600 dark:text-white/60">{t.moneda}</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-white/60">{Number(t.montoBase).toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-white/60">{t.montoEsperado != null ? Number(t.montoEsperado).toFixed(2) : "—"}</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-white/60">{t.montoDeclarado != null ? Number(t.montoDeclarado).toFixed(2) : "—"}</td>
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

// Utilidad por producto del día: cuánto entró vendiendo cada plato/artículo
// contra cuánto costó (compra o receta) — solo lo que se vendió HOY.
function ResumenDiario({ tenantId }: { tenantId: number }) {
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [filas, setFilas] = useState<ResumenUtilidadProducto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFilas(null);
    setError(null);
    utilidadDiaria(tenantId, fecha)
      .then(setFilas)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar el resumen"));
  }, [tenantId, fecha]);

  const totales = (filas || []).reduce(
    (acc, f) => ({ ingreso: acc.ingreso + Number(f.ingresoTotal), costo: acc.costo + Number(f.costoTotal), utilidad: acc.utilidad + Number(f.utilidad) }),
    { ingreso: 0, costo: 0, utilidad: 0 }
  );

  return (
    <div className="apple-glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base">Utilidad por producto</h3>
          <p className="text-slate-500 dark:text-white/40 text-xs mt-0.5">Solo platos y artículos vendidos con costo conocido (receta o compra) — no incluye cargos manuales sin costo.</p>
        </div>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input-horeca w-40" />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {filas === null ? (
        <p className="text-xs text-slate-400">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="text-xs text-slate-400">Sin ventas con costo conocido en esta fecha.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 dark:text-white/40 uppercase text-[10px] tracking-wider border-b border-slate-300/50 dark:border-white/10">
                <th className="py-2 pr-2">Producto</th>
                <th className="py-2 px-2 text-right">Cant.</th>
                <th className="py-2 px-2 text-right">Ingreso</th>
                <th className="py-2 px-2 text-right">Costo</th>
                <th className="py-2 pl-2 text-right">Utilidad</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.nombrePlato} className="border-b border-slate-200/50 dark:border-white/5">
                  <td className="py-2 pr-2 font-semibold text-slate-800 dark:text-white">{f.nombrePlato}</td>
                  <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-white/60">{f.cantidadVendida}</td>
                  <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-white/60">${Number(f.ingresoTotal).toFixed(2)}</td>
                  <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-white/60">${Number(f.costoTotal).toFixed(2)}</td>
                  <td className={`py-2 pl-2 text-right font-mono font-bold ${Number(f.utilidad) >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-500"}`}>
                    ${Number(f.utilidad).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold text-slate-900 dark:text-white border-t-2 border-slate-300/60 dark:border-white/10">
                <td className="py-2 pr-2">Total</td>
                <td className="py-2 px-2"></td>
                <td className="py-2 px-2 text-right font-mono">${totales.ingreso.toFixed(2)}</td>
                <td className="py-2 px-2 text-right font-mono">${totales.costo.toFixed(2)}</td>
                <td className={`py-2 pl-2 text-right font-mono ${totales.utilidad >= 0 ? "text-teal-600 dark:text-teal-400" : "text-red-500"}`}>${totales.utilidad.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function CierreDeCaja({ tenantId }: { tenantId: number }) {
  const MONEDAS = ["USD", "VES", "COP"];
  const [moneda, setMoneda] = useState("USD");
  const [resumen, setResumen] = useState<ResumenPeriodoAbierto | null>(null);
  const [idCajero, setIdCajero] = useState("");
  const [montoDeclarado, setMontoDeclarado] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historial, setHistorial] = useState<ArqueoCaja[] | null>(null);
  const [descargandoId, setDescargandoId] = useState<number | null>(null);

  const cargarResumen = () => {
    resumenPeriodoAbierto(tenantId, moneda).then(setResumen).catch(() => setResumen(null));
  };
  const cargarHistorial = () => {
    historialCierres().then(setHistorial).catch(() => setHistorial([]));
  };
  useEffect(() => { cargarResumen(); }, [tenantId, moneda]);
  useEffect(() => { cargarHistorial(); }, [tenantId]);

  const descargarPdf = async (arqueoId: number) => {
    setDescargandoId(arqueoId);
    try {
      const blob = await descargarCierrePdf(tenantId, arqueoId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el PDF");
    } finally {
      setDescargandoId(null);
    }
  };

  const confirmarCierre = async () => {
    setError(null);
    if (!idCajero.trim()) { setError("Indica quién está cerrando la caja"); return; }
    if (!montoDeclarado || Number(montoDeclarado) < 0) { setError("Ingresa el monto contado en efectivo"); return; }
    setCerrando(true);
    try {
      const arqueo = await cerrarCaja(tenantId, { idCajero: idCajero.trim(), montoDeclarado: Number(montoDeclarado), moneda });
      setMontoDeclarado("");
      cargarResumen();
      cargarHistorial();
      await descargarPdf(arqueo.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cerrar la caja");
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/5 text-xs w-fit">
        {MONEDAS.map((m) => (
          <button key={m} onClick={() => setMoneda(m)} className={`px-4 py-1.5 rounded-full font-bold transition-all cursor-pointer ${moneda === m ? "bg-teal-600 text-white" : "text-slate-600 dark:text-white/60"}`}>
            {m}
          </button>
        ))}
      </div>

      <div className="apple-glass rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">Período abierto desde el último cierre</h3>
          <p className="text-slate-500 dark:text-white/40 text-xs mt-0.5">
            {resumen ? `Desde ${new Date(resumen.desde).toLocaleString()}` : "Cargando…"}
          </p>
        </div>

        {resumen && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-100/60 dark:bg-white/5 rounded-xl p-3.5">
              <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider">Ingresos</div>
              <div className="font-['Outfit'] font-black text-lg text-teal-600 dark:text-teal-400">{Number(resumen.totalIngresos).toFixed(2)}</div>
            </div>
            <div className="bg-slate-100/60 dark:bg-white/5 rounded-xl p-3.5">
              <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider">Egresos</div>
              <div className="font-['Outfit'] font-black text-lg text-red-500">{Number(resumen.totalEgresos).toFixed(2)}</div>
            </div>
            <div className="bg-slate-100/60 dark:bg-white/5 rounded-xl p-3.5">
              <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider">Esperado en caja</div>
              <div className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">{Number(resumen.montoEsperadoEnCaja).toFixed(2)}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-300/50 dark:border-white/10">
          <Campo label="Cajero / Responsable">
            <input value={idCajero} onChange={(e) => setIdCajero(e.target.value)} placeholder="Nombre de quien cierra" className="input-horeca" />
          </Campo>
          <Campo label={`Efectivo contado (${moneda})`}>
            <input value={montoDeclarado} onChange={(e) => setMontoDeclarado(e.target.value)} type="number" step="0.01" placeholder="0.00" className="input-horeca" />
          </Campo>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={confirmarCierre} disabled={cerrando} className="btn-cyber-neon text-white text-sm font-bold px-6 py-3 rounded-xl cursor-pointer disabled:opacity-60">
          {cerrando ? "Cerrando caja…" : "Cuadrar y Cerrar Caja (genera PDF)"}
        </button>
        <p className="text-[11px] text-slate-400">Al cerrar se genera automáticamente el comprobante en PDF con el desglose de movimientos del período.</p>
      </div>

      <div className="space-y-2">
        <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">Historial de cierres</h3>
        {historial === null ? (
          <p className="text-xs text-slate-400">Cargando…</p>
        ) : historial.length === 0 ? (
          <p className="text-xs text-slate-400">Aún no se ha cerrado ninguna caja.</p>
        ) : (
          historial.map((a) => (
            <div key={a.id} className="flex items-center justify-between apple-glass rounded-xl px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {a.idCajero} · {new Date(a.fechaArqueo).toLocaleString()}
                </div>
                <div className={`text-[11px] mt-0.5 ${Number(a.diferencia) === 0 ? "text-teal-600 dark:text-teal-400" : "text-amber-500"}`}>
                  Declarado: {Number(a.montoDeclarado).toFixed(2)} {a.moneda} · Esperado: {Number(a.montoEsperado).toFixed(2)} {a.moneda}
                  {Number(a.diferencia) !== 0 && ` · Diferencia: ${Number(a.diferencia).toFixed(2)}`}
                </div>
              </div>
              <button onClick={() => descargarPdf(a.id)} disabled={descargandoId === a.id}
                className="text-teal-600 dark:text-teal-400 text-xs font-semibold cursor-pointer disabled:opacity-50">
                {descargandoId === a.id ? "Generando…" : "Ver PDF →"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// INGRESOS & GASTOS
// ══════════════════════════════════════════════════════════════════════════
function Finanzas({ tenantId }: { tenantId: number }) {
  const [movimientos, setMovimientos] = useState<MovimientoCaja[] | null>(null);
  const [form, setForm] = useState({ tipo: "EGRESO" as "INGRESO" | "EGRESO", monto: "", moneda: "USD", concepto: "" });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    listarMovimientos(tenantId).then((lista) => setMovimientos(lista.filter((m) => m.tipo === "INGRESO" || m.tipo === "EGRESO"))).catch(() => setMovimientos([]));
  };
  useEffect(() => { cargar(); }, [tenantId]);

  const registrar = async () => {
    setError(null);
    if (!form.monto || Number(form.monto) <= 0) { setError("Ingresa un monto válido"); return; }
    if (!form.concepto.trim()) { setError("Describe el concepto del movimiento"); return; }
    setGuardando(true);
    try {
      await registrarMovimiento(tenantId, { tipo: form.tipo, monto: Number(form.monto), moneda: form.moneda, concepto: form.concepto.trim() });
      setForm({ tipo: form.tipo, monto: "", moneda: form.moneda, concepto: "" });
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el movimiento");
    } finally {
      setGuardando(false);
    }
  };

  const totalIngresos = (movimientos || []).filter((m) => m.tipo === "INGRESO").reduce((s, m) => s + Number(m.monto), 0);
  const totalEgresos = (movimientos || []).filter((m) => m.tipo === "EGRESO").reduce((s, m) => s + Number(m.monto), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard label="Total Ingresos" val={`$${totalIngresos.toFixed(2)}`} sub="Histórico registrado" color="#10b981" />
        <KpiCard label="Total Gastos" val={`$${totalEgresos.toFixed(2)}`} sub="Histórico registrado" color="#ef4444" />
      </div>

      <div className="apple-glass rounded-2xl p-5 space-y-3">
        <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">Registrar movimiento</h3>
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/5 text-xs w-fit">
          {(["EGRESO", "INGRESO"] as const).map((t) => (
            <button key={t} onClick={() => setForm({ ...form, tipo: t })}
              className={`px-4 py-1.5 rounded-full font-bold transition-all cursor-pointer ${form.tipo === t ? (t === "EGRESO" ? "bg-red-500 text-white" : "bg-teal-600 text-white") : "text-slate-600 dark:text-white/60"}`}>
              {t === "EGRESO" ? "Gasto" : "Ingreso"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} type="number" step="0.01" placeholder="Monto" className="input-horeca" />
          <select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} className="input-horeca">
            {["USD", "VES", "COP"].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} placeholder="Concepto (ej. Pago de electricidad)" className="input-horeca sm:col-span-2" />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={registrar} disabled={guardando} className="g-aurora text-white text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
          {guardando ? "Guardando…" : "Registrar"}
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">Historial</h3>
        {movimientos === null ? (
          <p className="text-xs text-slate-400">Cargando…</p>
        ) : movimientos.length === 0 ? (
          <p className="text-xs text-slate-400">Sin movimientos registrados todavía.</p>
        ) : (
          movimientos.map((m) => (
            <div key={m.id} className="flex items-center justify-between apple-glass rounded-xl px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{m.concepto}</div>
                <div className="text-[10px] text-slate-400">{new Date(m.fechaRegistro).toLocaleString()}</div>
              </div>
              <span className={`font-mono text-sm font-bold ${m.tipo === "INGRESO" ? "text-teal-600 dark:text-teal-400" : "text-red-500"}`}>
                {m.tipo === "INGRESO" ? "+" : "−"}{Number(m.monto).toFixed(2)} {m.moneda}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CUENTAS POR COBRAR / PAGAR
// ══════════════════════════════════════════════════════════════════════════
function CuentasPorCobrarPagar({ tenantId }: { tenantId: number }) {
  const [tab, setTab] = useState<"CXC" | "CXP">("CXP");
  const [cxc, setCxc] = useState<MovimientoCaja[] | null>(null);
  const [cxp, setCxp] = useState<MovimientoCaja[] | null>(null);

  useEffect(() => {
    listarMovimientos(tenantId, "CXC").then(setCxc).catch(() => setCxc([]));
    listarMovimientos(tenantId, "CXP").then(setCxp).catch(() => setCxp([]));
  }, [tenantId]);

  const activos = tab === "CXC" ? cxc : cxp;
  const totalesPorMoneda = (activos || []).reduce<Record<string, number>>((acc, m) => {
    acc[m.moneda] = (acc[m.moneda] || 0) + Number(m.monto);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/5 text-xs w-fit">
        <button onClick={() => setTab("CXP")}
          className={`px-5 py-2 rounded-full font-bold transition-all cursor-pointer ${tab === "CXP" ? "bg-red-500 text-white" : "text-slate-600 dark:text-white/60"}`}>
          Por Pagar ({(cxp || []).length})
        </button>
        <button onClick={() => setTab("CXC")}
          className={`px-5 py-2 rounded-full font-bold transition-all cursor-pointer ${tab === "CXC" ? "bg-teal-600 text-white" : "text-slate-600 dark:text-white/60"}`}>
          Por Cobrar ({(cxc || []).length})
        </button>
      </div>

      {Object.keys(totalesPorMoneda).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(totalesPorMoneda).map(([moneda, total]) => (
            <div key={moneda} className="apple-glass rounded-xl px-5 py-3">
              <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider">Total en {moneda}</div>
              <div className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">{total.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}

      {activos === null ? (
        <p className="text-xs text-slate-400">Cargando…</p>
      ) : activos.length === 0 ? (
        <div className="apple-glass rounded-2xl p-8 text-center">
          <p className="text-slate-500 dark:text-white/40 text-sm">
            {tab === "CXP" ? "Sin cuentas por pagar pendientes." : "Sin cuentas por cobrar pendientes."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activos.map((m) => (
            <div key={m.id} className={`flex items-center justify-between rounded-xl px-4 py-3.5 border-l-4 apple-glass ${tab === "CXP" ? "border-red-500/50" : "border-teal-500/50"}`}>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{m.concepto}</div>
                <div className="text-[10px] text-slate-400">{new Date(m.fechaRegistro).toLocaleString()}</div>
              </div>
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{Number(m.monto).toFixed(2)} {m.moneda}</span>
            </div>
          ))}
        </div>
      )}
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
