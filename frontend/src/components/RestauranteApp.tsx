import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import {
  AuroraGradientDef,
  IconRestaurant, IconCustomize, IconUsers, IconUser, IconHourglass, IconCard, IconFileText,
  IconCheck, IconTrash, IconRefresh, IconCheckCircle, IconWarning, IconSearch, IconClose,
  IconBolt, IconBank, IconChart, IconDownload, IconLock, IconRocket, IconChevronLeft, IconChevronRight,
  IconSettings, IconShoppingBag, IconUtensils, IconTruck, IconScissors, IconPrinter, IconEdit,
  IconNote, IconReceipt, IconCoins, IconTerminal, IconCalendar, IconPhone,
} from "../Icons";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useAuth } from "../context/AuthContext";
import { generarClaveIdempotencia, encolarAccion, listarPendientes, procesarCola, esFalloDeConexion, type AccionPendienteAgregarItem, type AccionPendienteCobrarComanda } from "../offlineQueueHoreca";
import { listarImpresoras, vincularImpresora, imprimirEnEstacion, type ImpresoraGuardada } from "../impresorasCocina";
import {
  mapaDeMesas, crearMesa, editarMesa, eliminarMesa, actualizarPosicionMesa, abrirComanda, agregarItemComanda, actualizarEstadoItem, obtenerTableroKds, type ItemKds,
  dividirCuenta, cerrarComandaMixto, anularComanda, anularItemComanda, listarEscandallos, crearEscandallo, editarEscandallo, eliminarEscandallo, cambiarActivoEscandallo, cambiarRequiereCocinaEscandallo, agregarIngredienteEscandallo, editarIngredienteEscandallo, eliminarIngredienteEscandallo, recalcularCostoEscandallo,
  listarIngredientesEscandallo, listarFastBar,
  listarProveedoresHoreca, crearProveedorHoreca, editarProveedorHoreca, listarArticulos, crearArticulo, entradaArticulo,
  listarMeseros, crearMesero, editarMesero, desactivarMesero, reactivarMesero, type MeseroHoreca, type MeseroConEstado,
  listarEmpleadosRrhh, type EmpleadoRrhh, editarEmpleadoRrhh, liquidarPeriodoRrhh, type TipoControlEmpleado, type LiquidacionPeriodoRrhh,
  type PeriodicidadPago, pagarNomina, listarPagosNomina, descargarReciboNominaPdf, type PagoNomina,
  listarReservasDia, crearReserva, editarReserva, cambiarEstadoReserva, type ReservaHoreca, type EstadoReserva,
  obtenerEstadoBinancePay, guardarBinancePay, pagarComandaConBinance, obtenerComanda, type EstadoBinancePay, type OrdenBinancePay,
  editarArticulo, ajustarStockArticulo, eliminarArticulo, importarArticulosLote,
  registrarCompraInsumo, listarComprasInsumo, alertasVencimiento, listarTodosLotesConVencimiento, obtenerItemsComanda, resumenPeriodoAbierto, monedaBase, descargarTicketComanda, descargarTicketEscPos,
  obtenerMonedaBaseNegocio, actualizarMonedaBaseNegocio, cotizacionCobro,
  obtenerOrigenTasaActiva, actualizarOrigenTasaActiva, type OrigenTasaActiva,
  obtenerZonasCocina, actualizarZonasCocina, obtenerZonasMesa, actualizarZonasMesa,
  extraerFacturaOcr,
  tasaVigente, actualizarTasa, actualizarTasaExterna, ApiError, registrarMovimiento, listarMovimientos, abonarMovimiento,
  cerrarCaja, historialCierres, descargarCierrePdf, utilidadDiaria, reporteTickets,
  abrirTurno, turnoAbierto, historialTurnos, registrarEgresoTurno, cerrarTurno,
  listarClientes, crearCliente, editarCliente, eliminarCliente, metricasCliente, ticketsCliente,
  type Mesa, type MapaMesaEntrada, type Comanda, type ItemComanda, type EstadoItemComanda,
  type EscandalloReceta, type DetalleReceta, type FastBarTrago, type ProveedorHoreca,
  type Articulo, type ItemCompraInsumo, type CompraInsumoHoreca, type LoteArticulo, type TasaCambio, type MovimientoCaja,
  type ResumenPeriodoAbierto, type ArqueoCaja, type PagoParcial, type ResumenUtilidadProducto, type ReporteTicket, type Turno,
  type ItemImportacionArticulo, type ResultadoImportacionArticulos, type Cliente, type MetricasCliente, type InventarioKpis,
  type FacturaExtraidaOcr,
} from "../api";

type Pagina = "general" | "resumen" | "salon" | "cocina" | "reservas" | "recetas" | "compras" | "inventario" | "clientes" | "administracion" | "estadisticas" | "reportes" | "configuracion";

interface NavItem { id: Pagina; label: string; Icon: (p: { size?: number }) => React.ReactNode; premium?: boolean }
interface NavGrupo { titulo: string; items: NavItem[] }

// Salón & Mesas y Cocina (KDS) activados para el piloto.
const NAV_GRUPOS: NavGrupo[] = [
  {
    titulo: "Operación",
    items: [
      { id: "general", label: "Vista General", Icon: IconCustomize },
      { id: "resumen", label: "Resumen General", Icon: IconChart },
      { id: "salon", label: "Salón & Mesas", Icon: IconRestaurant },
      { id: "cocina", label: "Cocina (KDS)", Icon: IconHourglass },
      { id: "reservas", label: "Reservas", Icon: IconCalendar },
      { id: "recetas", label: "Recetas & Escandallo", Icon: IconFileText },
    ],
  },
  {
    titulo: "Gestión",
    items: [
      { id: "compras", label: "Compras & Proveedores", Icon: IconUsers },
      { id: "inventario", label: "Inventario", Icon: IconWarning },
      { id: "clientes", label: "Clientes", Icon: IconUser },
      { id: "administracion", label: "Administración", Icon: IconBank },
      { id: "reportes", label: "Reportes Operativos", Icon: IconChart },
      { id: "estadisticas", label: "Estadísticas", Icon: IconRocket },
      { id: "configuracion", label: "Configuración", Icon: IconCustomize },
    ],
  },
];

// Lista plana — usada donde no importa el agrupamiento (ej. título del header por página activa)
const NAV: NavItem[] = NAV_GRUPOS.flatMap((g) => g.items);

// Plan de licencia actual del tenant. Mientras no exista todavía un plan real
// consultado al backend, el negocio opera en Plan Pro para el piloto — los
// módulos Premium (Salón & Mesas, Cocina KDS) quedan visibles en el sidebar
// (ver `sidebarItemsVisibles`).
type PlanLicencia = "BASE" | "PRO";
const PLAN_ACTUAL: string = "PRO" as PlanLicencia;

/** Entradas del sidebar visibles para el plan actual — un ítem Premium desaparece del DOM por completo en Plan Base, no queda como "entrada fantasma" bloqueada. */
const sidebarItemsVisibles = (items: NavItem[]): NavItem[] =>
  PLAN_ACTUAL === ("PRO" as PlanLicencia) ? items : items.filter((n) => !n.premium);

const ESTACIONES = ["COCINA", "PARRILLA", "BAR", "COCINA_FRIA"];
// NUNCA usar toISOString() para "hoy" — siempre da la fecha en UTC, no la
// del negocio. En Venezuela (UTC-4), a partir de las 8pm locales ya es "de
// madrugada" en UTC: "Hoy" terminaba apuntando al día siguiente y las ventas
// de esa noche quedaban invisibles en Estadísticas/Reportes hasta la
// medianoche real. Se arma con los componentes de fecha LOCALES en su lugar.
const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

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
const VENTAS_HOY_KEY = `aurora_horeca_ventas_${hoy()}`;
const MODO_CLASICO_KEY = "aurora_horeca_modo_clasico";

// pendienteSync: marca un ítem agregado mientras no había conexión —
// todavía no tiene un id real del servidor (id negativo temporal), se
// muestra igual en la comanda para que el mesero pueda seguir trabajando,
// y se reconcilia con el id real apenas la cola offline logra sincronizarlo.
interface ItemLocal extends ItemComanda { pendienteSync?: boolean }

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
      .horeca-clasico .dark\\:text-white\\/90 { color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; }
      .horeca-clasico .dark\\:text-white\\/80 { color: #1e293b !important; -webkit-text-fill-color: #1e293b !important; }
      .horeca-clasico .dark\\:text-white\\/70 { color: #334155 !important; -webkit-text-fill-color: #334155 !important; }
      .horeca-clasico .dark\\:text-white\\/60 { color: #475569 !important; -webkit-text-fill-color: #475569 !important; }
      .horeca-clasico .dark\\:text-white\\/50 { color: #64748b !important; -webkit-text-fill-color: #64748b !important; }
      .horeca-clasico .dark\\:text-white\\/40 { color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; }
      .horeca-clasico .dark\\:text-white\\/30 { color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; }
      .horeca-clasico .dark\\:text-white { color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; }
      /* Un solo tono sólido de marca (#35d7c3), sin el degradado azul→verde→morado
         de antes — ese era exactamente el look genérico de "app de IA" que ya se
         quitó del resto del sitio (ver .btn-cyber-neon en index.css). */
      .horeca-clasico .btn-cyber-neon {
        background: #35D7C3 !important;
        border: 1px solid rgba(53, 215, 195, .72) !important;
        box-shadow: 0 4px 14px rgba(53,215,195,0.35) !important;
        color: #062323 !important;
      }
      .horeca-clasico .text-teal-600, .horeca-clasico .text-teal-500,
      .horeca-clasico .text-teal-300, .horeca-clasico .text-teal-400 { color: #0d9488 !important; -webkit-text-fill-color: #0d9488 !important; }
      .horeca-clasico .text-aurora {
        color: #0d9488 !important;
        background: none !important; -webkit-background-clip: unset !important; background-clip: unset !important;
        -webkit-text-fill-color: #0d9488 !important;
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
  // Venta Rápida ya no es una pantalla aparte con su propio overlay — vive
  // fusionada directo en la Vista General (ver VistaGeneral). Este candado
  // solo se dispara desde ahí cuando falta registrar la tasa BCV del día.
  const [bloqueoTasa, setBloqueoTasa] = useState(false);
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
  // No todo negocio Horeca prepara platos con receta (una bodega o una venta
  // de productos empacados no la usa) — a diferencia de Salón/Cocina, esto
  // no es un gate de plan, es una preferencia del propio negocio, por eso el
  // default es "activo" (comportamiento de siempre) hasta que alguien lo
  // apague a propósito desde Configuración.
  const recetasActivas = config.modulosActivos?.recetas !== false;

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
  // Todos los <Modal> de este módulo se renderizan con un portal directo a
  // document.body (para escapar de cualquier ancestro con backdrop-filter,
  // ver ModalTasaRequerida/ComandaDetalle) — eso también los saca del
  // subárbol de este <div className="horeca-clasico">, así que ninguno de
  // los overrides de EstiloClasico (que dependen de un ancestro con esa
  // clase) les llegaba: quedaban con texto blanco sobre fondo blanco. Se
  // replica la clase en <body> mientras este módulo esté montado en Modo
  // Clásico, y se retira siempre al salir para no afectar al Hub u otras
  // verticales que comparten el mismo <body>.
  useEffect(() => {
    document.body.classList.toggle("horeca-clasico", modoClasico);
    return () => { document.body.classList.remove("horeca-clasico"); };
  }, [modoClasico]);

  // Sincronización atómica de ítems por comanda con el backend (GET /api/horeca/comandas/{id}/items),
  // eliminando la persistencia dual en localStorage para evitar descuadres en recargas o multisesión.
  const [itemsPorComanda, setItemsPorComanda] = useState<Record<number, ItemLocal[]>>({});

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

  // Abrir el módulo nunca cambia la moneda ni reinterpreta el inventario.

  const [mapa, setMapa] = useState<MapaMesaEntrada[] | null>(null);
  const [escandallos, setEscandallos] = useState<EscandalloReceta[] | null>(null);
  const [fastbar, setFastbar] = useState<FastBarTrago[] | null>(null);
  const [proveedores, setProveedores] = useState<ProveedorHoreca[] | null>(null);
  const [articulos, setArticulos] = useState<Articulo[] | null>(null);
  // Edición rápida desde una tarjeta del catálogo del POS: refleja el
  // artículo actualizado en memoria (el PUT ya lo devuelve completo) sin
  // esperar un refetch completo de recargarTodo().
  const actualizarArticuloEnEstado = (actualizado: Articulo) =>
    setArticulos((prev) => (prev || []).map((a) => (a.id === actualizado.id ? actualizado : a)));
  const [lotesPorVencer, setLotesPorVencer] = useState<LoteArticulo[] | null>(null);
  const [kdsCounts, setKdsCounts] = useState<number>(0);
  const [tasaBcv, setTasaBcv] = useState<TasaCambio | null>(null);
  const [tasaCop, setTasaCop] = useState<TasaCambio | null>(null);
  // Cada origen (BCV, USDT, PERSONALIZADA) es una serie independiente en el backend —
  // se consulta por separado para que el toggle de TasaBadge muestre lo que de verdad
  // quedó guardado en cada una, no un valor en caché local que puede desincronizarse.
  const [tasaPorOrigen, setTasaPorOrigen] = useState<Record<"BCV" | "USDT" | "PERSONALIZADA", TasaCambio | null>>({
    BCV: null, USDT: null, PERSONALIZADA: null
  });
  // Cuál de las tres gobierna el cobro en el POS: decisión de negocio (Configuración >
  // Tasa activa para el POS), no una preferencia de este navegador.
  const [origenTasaActiva, setOrigenTasaActiva] = useState<OrigenTasaActiva>("USDT");
  useEffect(() => {
    obtenerOrigenTasaActiva().then((r) => setOrigenTasaActiva(r.origenTasaActiva)).catch(() => {});
  }, [tenantId]);

  // Zonas/estaciones de cocina — configurables por negocio en Configuración
  // (antes eran las mismas 4 fijas para todos). Arranca con las clásicas
  // mientras llega la respuesta real, para no dejar la Cocina/KDS en blanco
  // un instante.
  const [zonasCocina, setZonasCocina] = useState<string[]>(ESTACIONES);
  const recargarZonasCocina = () => {
    obtenerZonasCocina().then((r) => setZonasCocina(r.zonas)).catch(() => {});
  };
  useEffect(() => { recargarZonasCocina(); }, [tenantId]);

  // Zonas físicas de mesas (Salón & Mesas) — mismo criterio que zonasCocina arriba.
  const [zonasMesa, setZonasMesa] = useState<string[]>(["SALON_PRINCIPAL", "TERRAZA", "BARRA"]);
  const recargarZonasMesa = () => {
    obtenerZonasMesa().then((r) => setZonasMesa(r.zonas)).catch(() => {});
  };
  useEffect(() => { recargarZonasMesa(); }, [tenantId]);

  const recargarTodo = () => {
    mapaDeMesas().then(setMapa).catch(() => setMapa([]));
    listarEscandallos().then(setEscandallos).catch(() => setEscandallos([]));
    listarFastBar(tenantId).then(setFastbar).catch(() => setFastbar([]));
    listarProveedoresHoreca().then(setProveedores).catch(() => setProveedores([]));
    listarArticulos().then(setArticulos).catch(() => setArticulos([]));
    alertasVencimiento(tenantId, 7).then(setLotesPorVencer).catch(() => setLotesPorVencer([]));
    tasaVigente(tenantId, "USD", "VES").then(setTasaBcv).catch(() => setTasaBcv(null));
    tasaVigente(tenantId, "USD", "COP").then(setTasaCop).catch(() => setTasaCop(null));
    (["BCV", "USDT", "PERSONALIZADA"] as const).forEach((origen) => {
      tasaVigente(tenantId, "USD", "VES", origen)
        .then((t) => setTasaPorOrigen((prev) => ({ ...prev, [origen]: t })))
        .catch(() => setTasaPorOrigen((prev) => ({ ...prev, [origen]: null })));
    });
    cargarVentasHoy();
    Promise.all(zonasCocina.map((e) => obtenerTableroKds(e).catch(() => [])))
      .then((listas) => setKdsCounts(listas.reduce((sum, l) => sum + l.filter((i) => i.estadoItem !== "ENTREGADO").length, 0)))
      .catch(() => setKdsCounts(0));
  };

  useEffect(() => { recargarTodo(); }, [tenantId]);

  // ── Cola offline (Salón & Mesas) ──────────────────────────────────────
  // Ver offlineQueueHoreca.ts para el alcance exacto (agregar ítem + cobrar
  // una mesa YA abierta). Este bloque es el "motor": detecta conexión,
  // reintenta la cola, y reconcilia los ítems agregados sin conexión
  // (que quedaron con un id negativo temporal) con el id real que
  // devuelve el servidor al sincronizar.
  const [enLineaHoreca, setEnLineaHoreca] = useState(navigator.onLine);
  const [pendientesOffline, setPendientesOffline] = useState(0);
  const [erroresSyncOffline, setErroresSyncOffline] = useState<{ descripcion: string; mensaje: string }[]>([]);
  const [sincronizandoOffline, setSincronizandoOffline] = useState(false);

  const actualizarContadorPendientes = () => setPendientesOffline(listarPendientes(tenantId).length);
  useEffect(() => { actualizarContadorPendientes(); }, [tenantId]);

  const sincronizarColaOffline = async () => {
    if (!navigator.onLine || sincronizandoOffline) return;
    setSincronizandoOffline(true);
    try {
      const resultado = await procesarCola(tenantId, {
        agregar_item: async (a: AccionPendienteAgregarItem) => {
          const real = await agregarItemComanda(a.comandaId, { ...a.payload, claveIdempotencia: a.claveIdempotencia });
          const tempId = Number(a.id);
          setItemsPorComanda((prev) => ({
            ...prev,
            [a.comandaId]: (prev[a.comandaId] || []).map((it) => (it.id === tempId ? { ...real, pendienteSync: false } : it)),
          }));
          return real;
        },
        cobrar_comanda: async (a: AccionPendienteCobrarComanda) => {
          const real = await cerrarComandaMixto(a.comandaId, a.payload.pagos, a.payload.monedaVuelto, a.claveIdempotencia);
          recargarTodo();
          return real;
        },
      });
      actualizarContadorPendientes();
      if (resultado.fallidasDefinitivo.length > 0) {
        setErroresSyncOffline((prev) => [
          ...prev,
          ...resultado.fallidasDefinitivo.map((f) => ({ descripcion: f.accion.descripcion, mensaje: f.mensaje })),
        ]);
      }
    } finally {
      setSincronizandoOffline(false);
    }
  };

  useEffect(() => {
    const alVolverLinea = () => { setEnLineaHoreca(true); sincronizarColaOffline(); };
    const alPerderLinea = () => setEnLineaHoreca(false);
    window.addEventListener("online", alVolverLinea);
    window.addEventListener("offline", alPerderLinea);
    // Respaldo del evento "online": algunos navegadores/routers no lo
    // disparan de forma confiable tras un corte breve — este intervalo
    // reintenta solo, sin depender de que el evento llegue.
    const intervalo = setInterval(() => { if (navigator.onLine) sincronizarColaOffline(); }, 20000);
    return () => {
      window.removeEventListener("online", alVolverLinea);
      window.removeEventListener("offline", alPerderLinea);
      clearInterval(intervalo);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // Sin tasa BCV del día, un cobro mixto en Bs o el total bimoneda del
  // carrito estarían calculando con una tasa vencida o en cero — bloquea
  // Venta Rápida hasta que se registre, en vez de dejar operar con números
  // que no cuadran.
  const tasaValida = tasaBcv != null && Number(tasaBcv.tasa) > 0;

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

  // h-screen + overflow-hidden en la raíz: la terminal de caja (Vista
  // General) nunca debe scrollear la página completa — solo sus paneles
  // internos. El resto de las páginas sigue scrolleando normal dentro de
  // <main>, que mantiene su propio overflow-y-auto.
  return (
    <div className={`h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] flex ${modoClasico ? "horeca-clasico" : ""}`}>
      {/* Sin esto, todo ícono con stroke="url(#aurora-icon-grad)" (editar,
          ajustar stock, eliminar, reabastecer, etc.) queda con trazo
          irresoluble — invisible, no solo "difícil de ver" — porque
          RestauranteApp es la única vista de la app que nunca montaba el
          <defs> compartido que declara ese gradiente. */}
      <AuroraGradientDef />
      {modoClasico && <EstiloClasico />}
      {/* SIDEBAR */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-300/60 dark:border-white/10 flex flex-col p-4 space-y-1">
        <div className="px-2 pb-4 mb-2 border-b border-slate-300/60 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div className="font-['Outfit'] font-black text-lg text-aurora">Aurora Horeca</div>
            {/* El badge "N en cocina" depende del módulo KDS, que está
                detrás del paywall Pro — en Plan Base no debe existir en
                el DOM, ni siquiera oculto por CSS. */}
            {PLAN_ACTUAL === ("PRO" as PlanLicencia) && kdsCounts > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-mono font-bold">{kdsCounts} en cocina</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider mt-0.5">{config.nombreLocal}</div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
          {NAV_GRUPOS.map((grupo) => (
            <div key={grupo.titulo} className="space-y-1">
              <div className="px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/25">{grupo.titulo}</div>
              {sidebarItemsVisibles(grupo.items).filter((n) => n.id !== "recetas" || recetasActivas).map((n) => {
                const alertaVencimiento = n.id === "inventario" && (lotesPorVencer || []).length > 0;
                return (
                  <button
                    key={n.id}
                    onClick={() => irA(n.id)}
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
      <main className={`flex-1 flex flex-col min-h-0 ${pagina === "general" ? "overflow-hidden" : "overflow-y-auto"}`}>
        {/* relative + z-30: el header usa backdrop-blur, que crea su propio contexto de
            apilamiento — sin un z-index explícito acá, el popover de la tasa (aunque
            tenga su propio z-index alto) queda atrapado dentro de ese contexto y las
            tarjetas de la Vista General (que vienen después en el DOM) lo tapan. */}
        <header className="relative z-30 h-16 border-b border-slate-300/60 dark:border-white/10 flex items-center justify-between px-6 bg-white/30 dark:bg-black/10 backdrop-blur-md">
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
            {(!enLineaHoreca || pendientesOffline > 0) && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${!enLineaHoreca ? "bg-red-500/15 text-red-500" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}`}
                title={!enLineaHoreca ? "Sin conexión — tus acciones se guardan localmente" : `${pendientesOffline} acción(es) por sincronizar`}>
                <span className={`w-1.5 h-1.5 rounded-full ${!enLineaHoreca ? "bg-red-500" : "bg-amber-500 animate-pulse"}`} />
                {!enLineaHoreca ? "Sin conexión" : `${pendientesOffline} por sincronizar`}
              </div>
            )}
            <div className="text-xs text-right hidden sm:block">
              <div className="font-bold text-slate-900 dark:text-white">{config.nombreLocal}</div>
            </div>
            <TasaBadge
              tenantId={tenantId}
              tasaPorOrigen={tasaPorOrigen}
              tasaCop={tasaCop}
              origenTasaActiva={origenTasaActiva}
              onActualizadaPorOrigen={(origen, t) => setTasaPorOrigen((prev) => ({ ...prev, [origen]: t }))}
              onActualizadaCop={setTasaCop}
            />
            <button onClick={recargarTodo} className="p-2 rounded-xl border border-slate-300/60 dark:border-white/10 hover:bg-white/10 text-slate-600 dark:text-white/60 cursor-pointer" title="Actualizar datos">
              <IconRefresh size={16} />
            </button>
          </div>
        </header>

        {!enLineaHoreca && (
          <div className="px-6 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
            <IconWarning size={14} />
            <span>Sin conexión — puedes seguir agregando platos y cobrando mesas ya abiertas; se guardan en este dispositivo y se sincronizan solos al volver la señal. Abrir una mesa nueva o anular requieren conexión.</span>
          </div>
        )}
        {enLineaHoreca && pendientesOffline > 0 && (
          <div className="px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><IconRefresh size={14} className={sincronizandoOffline ? "animate-spin" : ""} /> Sincronizando {pendientesOffline} acción(es) guardadas sin conexión…</span>
            <button onClick={sincronizarColaOffline} disabled={sincronizandoOffline} className="font-bold underline cursor-pointer disabled:opacity-50">Reintentar ahora</button>
          </div>
        )}
        {erroresSyncOffline.length > 0 && (
          <div className="px-6 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-600 dark:text-red-300 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold">{erroresSyncOffline.length} acción(es) guardadas sin conexión NO se pudieron aplicar — revisa manualmente:</span>
              <button onClick={() => setErroresSyncOffline([])} className="text-[10px] font-semibold underline cursor-pointer flex-shrink-0">Descartar</button>
            </div>
            {erroresSyncOffline.map((e, i) => <div key={i}>• {e.descripcion}: {e.mensaje}</div>)}
          </div>
        )}

        {/* Vista General (POS puro) es la única página que gestiona su propio
            alto y scroll interno de punta a punta — el wrapper acá no le
            mete padding/max-width/space-y que le robarían pantalla al
            catálogo y la comanda. El resto de las páginas (Inventario,
            Reportes, Resumen General, etc.) sigue con el contenedor
            gerencial de siempre, con scroll de página normal. */}
        {pagina === "general" ? (
          <div className="flex-1 min-h-0 flex flex-col p-4">
            <VistaGeneral
              tenantId={tenantId} escandallos={escandallos} fastbar={fastbar} articulos={articulos} tasaBcv={tasaBcv} tasaCop={tasaCop}
              ventasHoy={ventasHoy} nombreLocal={config.nombreLocal} tasaValida={tasaValida}
              cargosPorDefecto={{ ...CARGOS_POR_DEFECTO, ...(config.cargosPorDefecto || {}) }}
              impuestosPorDefecto={{ ...IMPUESTOS_POR_DEFECTO, ...(config.impuestosPorDefecto || {}) }}
              recetasActivas={recetasActivas}
              onVenta={(monto, metodo) => { registrarVenta(monto, metodo); }}
              onRegistrarTasa={() => setBloqueoTasa(true)}
              onArticuloActualizado={actualizarArticuloEnEstado} />
          </div>
        ) : (
        <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto min-h-0">
          {pagina === "resumen" && <ResumenGeneral tenantId={tenantId} tasaCop={tasaCop} tasaBcv={tasaBcv} />}
          {pagina === "salon" && (esPremium("salon")
            ? <BloqueoPremium modulo="Salón & Mesas" />
            : <Salon tenantId={tenantId} mapa={mapa} itemsPorComanda={itemsPorComanda} setItemsPorComanda={setItemsPorComanda}
                escandallos={escandallos} articulos={articulos} onVenta={registrarVenta} onCambio={recargarTodo} zonasCocina={zonasCocina} zonasMesa={zonasMesa} onZonasMesaGuardadas={recargarZonasMesa} nombreLocal={config.nombreLocal}
                onAccionEncolada={actualizarContadorPendientes} />
          )}
          {pagina === "cocina" && (esPremium("cocina") ? <BloqueoPremium modulo="Cocina (KDS)" /> : <Cocina tenantId={tenantId} onCambio={recargarTodo} zonasCocina={zonasCocina} onZonasCocinaGuardadas={recargarZonasCocina} nombreLocal={config.nombreLocal} />)}
          {pagina === "reservas" && <Reservas mapa={mapa} />}
          {pagina === "recetas" && (recetasActivas
            ? <Recetas tenantId={tenantId} escandallos={escandallos} articulos={articulos} tasaCop={tasaCop} tasaBcv={tasaBcv} onCambio={recargarTodo} zonasCocina={zonasCocina} />
            : (
              <div className="apple-glass rounded-2xl p-10 text-center space-y-3">
                <IconFileText size={28} />
                <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-lg">Recetas & Escandallo está desactivado</h3>
                <p className="text-sm text-slate-500 dark:text-white/40 max-w-md mx-auto">
                  Este negocio no lo necesita (ej. bodega o venta de productos empacados). Actívalo en Configuración si en algún momento empiezas a preparar platos con receta.
                </p>
                <button onClick={() => setPagina("configuracion")} className="g-aurora text-white text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer">
                  Ir a Configuración
                </button>
              </div>
            )
          )}
          {pagina === "compras" && (
            <ComprasProveedores tenantId={tenantId} proveedores={proveedores} articulos={articulos} onCambio={recargarTodo} />
          )}
          {pagina === "inventario" && <Inventario tenantId={tenantId} articulos={articulos} onCambio={recargarTodo} />}
          {pagina === "clientes" && <Clientes tenantId={tenantId} />}
          {pagina === "administracion" && <Administracion tenantId={tenantId} monedasActivas={{ ...MONEDAS_POR_DEFECTO, ...(config.monedasActivas || {}) }} />}
          {pagina === "estadisticas" && <ResumenFinanciero tenantId={tenantId} />}
          {pagina === "reportes" && <ReportesOperativos tenantId={tenantId} />}
          {pagina === "configuracion" && <Configuracion tenantId={tenantId} config={config} onGuardar={guardarConfig} onZonasCocinaGuardadas={recargarZonasCocina} onZonasMesaGuardadas={recargarZonasMesa} />}
        </div>
        )}
      </main>

      {bloqueoTasa && (
        <ModalTasaRequerida
          tenantId={tenantId}
          onCancelar={() => setBloqueoTasa(false)}
          onRegistrada={() => {
            // El panel de Venta Rápida vive embebido en la Vista General —
            // al registrar la tasa alcanza con refrescar tasaBcv para que
            // se desbloquee solo ahí mismo, sin overlay aparte.
            setBloqueoTasa(false);
            recargarTodo();
          }}
        />
      )}

      {moduloPremiumClic && (
        <ModalPremium modulo={NAV.find((n) => n.id === moduloPremiumClic)?.label || ""} onClose={() => setModuloPremiumClic(null)} />
      )}
    </div>
  );
}

/**
 * Indicador de tasa de cambio en el header — clickeable: abre un popover
 * de edición rápida con auto-focus y actualiza el valor en el propio
 * header al confirmar, sin recargar la página ni navegar fuera de la
 * vista actual (Ventas, Inventario, Reportes, etc.).
 */
const fmtTasa = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ══════════════════════════════════════════════════════════════════════════
// IMPRESIÓN TÉRMICA UNIVERSAL (58mm / 80mm)
// ══════════════════════════════════════════════════════════════════════════
function imprimirTicketTermicoDirecto(datos: {
  nombreLocal: string;
  comandaId: number;
  fecha: string;
  canal?: string;
  cliente?: { nombre: string; telefono?: string; direccion?: string };
  lineas: { nombre: string; cantidad: number; precio: number; notas?: string }[];
  subtotal: number;
  total: number;
  totalBs?: number;
  totalCop?: number;
  metodoPago: string;
  recibido?: number;
  vuelto?: number;
  monedaVuelto?: string;
}) {
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
        <title>Ticket COM-${datos.comandaId}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body {
            font-family: 'Courier New', Courier, monospace, sans-serif;
            font-size: 12px;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 10px 8px;
            width: 76mm;
            line-height: 1.3;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .right { text-align: right; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .item-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .item-notes { font-size: 10px; font-style: italic; margin-left: 8px; color: #333; }
          .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 4px; }
          .footer { font-size: 10px; text-align: center; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 15px;">${datos.nombreLocal}</div>
        <div class="center" style="font-size: 10px; text-transform: uppercase;">Aurora Horeca · Sistema POS</div>
        <div class="divider"></div>
        <div><strong>Ticket:</strong> COM-${datos.comandaId}</div>
        <div><strong>Fecha:</strong> ${datos.fecha}</div>
        <div><strong>Modalidad:</strong> ${datos.canal === "DELIVERY_PROPIO" ? "DELIVERY" : datos.canal === "SALON" ? "SALÓN" : "PARA LLEVAR"}</div>
        ${datos.cliente?.nombre ? `<div><strong>Cliente:</strong> ${datos.cliente.nombre}</div>` : ""}
        ${datos.cliente?.telefono ? `<div><strong>Teléfono:</strong> ${datos.cliente.telefono}</div>` : ""}
        ${datos.cliente?.direccion ? `<div><strong>Dirección:</strong> ${datos.cliente.direccion}</div>` : ""}
        <div class="divider"></div>
        <div style="margin-bottom: 4px; font-size: 11px;"><strong>CANT DESCRIPCIÓN         TOTAL</strong></div>
        ${datos.lineas.map((l) => `
          <div class="item-row">
            <span style="flex: 1;">${l.cantidad}x ${l.nombre}</span>
            <span class="right bold">$${(l.precio * l.cantidad).toFixed(2)}</span>
          </div>
          ${l.notas ? `<div class="item-notes">↳ Nota: ${l.notas}</div>` : ""}
        `).join("")}
        <div class="divider"></div>
        <div class="total-row">
          <span>TOTAL USD:</span>
          <span>$${datos.total.toFixed(2)}</span>
        </div>
        ${datos.totalBs ? `
          <div class="item-row bold" style="font-size: 13px;">
            <span>TOTAL Bs:</span>
            <span>Bs. ${datos.totalBs.toFixed(2)}</span>
          </div>
        ` : ""}
        ${datos.totalCop ? `
          <div class="item-row bold">
            <span>TOTAL COP:</span>
            <span>COP $${datos.totalCop.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
          </div>
        ` : ""}
        <div class="divider"></div>
        <div><strong>Método de Pago:</strong> ${datos.metodoPago.replace("_", " ")}</div>
        ${datos.recibido != null ? `<div><strong>Recibido:</strong> $${datos.recibido.toFixed(2)}</div>` : ""}
        ${datos.vuelto != null && datos.vuelto > 0.004 ? `<div class="bold" style="font-size: 12px; margin-top: 2px;">VUELTO: ${datos.vuelto.toFixed(2)} ${datos.monedaVuelto || "USD"}</div>` : ""}
        <div class="divider"></div>
        <div class="footer">¡Muchas gracias por su preferencia!<br>Generado con Aurora HORECA</div>
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
// MODAL DIVIDIR CUENTA (SPLIT BILL)
// ══════════════════════════════════════════════════════════════════════════
function ModalDividirCuenta({
  total,
  tasaBs,
  tasaCop,
  onClose,
  onSeleccionarParte,
}: {
  total: number;
  tasaBs: number;
  tasaCop: number;
  onClose: () => void;
  onSeleccionarParte: (montoPersona: number, indexPersona: number, totalPersonas: number) => void;
}) {
  const [numPersonas, setNumPersonas] = useState(2);
  const montoPorPersona = total / numPersonas;

  return (
    <Modal onClose={onClose} titulo="Dividir Cuenta (Split Bill)">
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-white/50">
          Divide el consumo total en partes iguales. Puedes cobrar a cada comensal por separado con su propio método de pago (Zelle, Pago Móvil, Efectivo, etc.).
        </p>

        <div className="bg-slate-100/70 dark:bg-white/5 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-white/40 font-semibold">Total de la orden:</span>
          <span className="font-mono font-bold text-lg text-slate-900 dark:text-white">${fmtNumero(total, "USD")}</span>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-white/60 mb-2">
            ¿Entre cuántas personas dividen?
          </label>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNumPersonas(n)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all ${
                  numPersonas === n
                    ? "bg-teal-600 text-white shadow-md scale-105"
                    : "bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-white/80 hover:bg-slate-300 dark:hover:bg-white/15"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/25 space-y-1 text-center">
          <div className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">
            Cada persona paga ({numPersonas} partes)
          </div>
          <div className="font-mono font-black text-2xl text-teal-600 dark:text-teal-400">
            ${montoPorPersona.toFixed(2)}
          </div>
          <div className="flex justify-center gap-3 text-xs font-mono font-semibold text-slate-600 dark:text-white/70 pt-1">
            {tasaBs > 0 && <span>≈ Bs. {(montoPorPersona * tasaBs).toFixed(2)}</span>}
            {tasaCop > 0 && <span>≈ COP ${(montoPorPersona * tasaCop).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider">
            Cobrar comensales:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {Array.from({ length: numPersonas }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSeleccionarParte(montoPorPersona, idx + 1, numPersonas);
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 hover:bg-teal-500/15 border border-slate-300/50 dark:border-white/10 transition-colors text-left cursor-pointer group"
              >
                <div>
                  <div className="font-bold text-xs text-slate-800 dark:text-white group-hover:text-teal-500">
                    Comensal #{idx + 1}
                  </div>
                  <div className="text-[10px] text-slate-400">Porción 1/{numPersonas}</div>
                </div>
                <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                  ${montoPorPersona.toFixed(2)} →
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full apple-glass-btn text-xs font-semibold py-2.5 rounded-xl cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MULTI-TASA BADGE (BCV / USDT / COP / PERSONALIZADA)
// ══════════════════════════════════════════════════════════════════════════
function TasaBadge({ tenantId, tasaPorOrigen, tasaCop, origenTasaActiva, onActualizadaPorOrigen, onActualizadaCop }: {
  tenantId: number;
  tasaPorOrigen: Record<"BCV" | "USDT" | "PERSONALIZADA", TasaCambio | null>;
  tasaCop: TasaCambio | null;
  // Cuál gobierna el cobro en el POS: decisión de negocio (Configuración > Tasa activa),
  // no una preferencia de este navegador — así todas las terminales del mismo negocio
  // ven y cobran con la misma tasa.
  origenTasaActiva: "USDT" | "BCV" | "PERSONALIZADA";
  onActualizadaPorOrigen: (origen: "BCV" | "USDT" | "PERSONALIZADA", t: TasaCambio) => void;
  onActualizadaCop: (t: TasaCambio) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const tipoActivo = origenTasaActiva;

  const [tasaCopVal, setTasaCopVal] = useState("");
  const [tasaPersVal, setTasaPersVal] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [actualizandoExterna, setActualizandoExterna] = useState<"BCV" | "USDT" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Solo COP y Propia son campos que el negocio escribe a mano — BCV y USDT/P2P vienen de
  // una fuente pública (ver refrescarExterna), así que se prellenan pero no se editan.
  useEffect(() => {
    if (!abierto) return;
    setTasaPersVal(tasaPorOrigen.PERSONALIZADA ? String(Number(tasaPorOrigen.PERSONALIZADA.tasa)) : "");
    setTasaCopVal(tasaCop ? String(Number(tasaCop.tasa)) : "");
    setError(null);
  }, [abierto, tasaPorOrigen, tasaCop]);

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

  // Refleja SIEMPRE lo persistido en el backend para el origen activo — nunca lo que
  // haya en los inputs del popover (esos son borrador hasta que se guarda).
  const tasaActivaNumero = useMemo(() => {
    const vigente = tasaPorOrigen[tipoActivo];
    return vigente ? Number(vigente.tasa) : 0;
  }, [tipoActivo, tasaPorOrigen]);

  // BCV y USDT/P2P no las escribe el negocio: se consultan en vivo de su fuente pública real
  // (BCV oficial / Binance P2P) y se guardan tal cual — nunca un número tecleado a mano.
  const refrescarExterna = async (tipo: "BCV" | "USDT") => {
    setActualizandoExterna(tipo);
    setError(null);
    try {
      const fuente = tipo === "USDT" ? "BINANCE" : "BCV";
      const nueva = await actualizarTasaExterna(fuente, "VES");
      onActualizadaPorOrigen(tipo, {
        id: nueva.id, tenantId, monedaOrigen: nueva.monedaOrigen, monedaDestino: nueva.monedaDestino,
        tasa: nueva.tasa, origen: nueva.origenApi, fechaActualizacion: nueva.fechaActualizacion
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo consultar la tasa pública.");
    } finally {
      setActualizandoExterna(null);
    }
  };

  const actualizar = async () => {
    const vCop = Number(tasaCopVal);
    const vPers = Number(tasaPersVal);

    if (vCop <= 0 && vPers <= 0) {
      setError("Ingresa al menos una tasa mayor a cero");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const tareas: Promise<void>[] = [];
      if (vPers > 0) {
        tareas.push(actualizarTasa(tenantId, { monedaOrigen: "USD", monedaDestino: "VES", tasa: vPers, origen: "PERSONALIZADA" })
          .then((t) => onActualizadaPorOrigen("PERSONALIZADA", t)));
      }
      if (vCop > 0) {
        tareas.push(actualizarTasa(tenantId, { monedaOrigen: "USD", monedaDestino: "COP", tasa: vCop, origen: "MANUAL" })
          .then(onActualizadaCop));
      }
      await Promise.all(tareas);
      setAbierto(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar la tasa");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        title="Ver o refrescar las tasas (USDT / BCV / COP / Propia)"
        className={`flex items-center gap-2 text-[11px] font-mono font-bold px-3 py-1.5 rounded-full cursor-pointer border transition-all shadow-sm ${
          tasaActivaNumero > 0
            ? tipoActivo === "USDT"
              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/25"
              : "text-teal-600 dark:text-teal-400 bg-teal-500/15 border-teal-500/30 hover:bg-teal-500/25"
            : "text-amber-500 bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/20"
        }`}
      >
        <span className="flex items-center gap-1">
          <span className="text-[10px] px-1 rounded bg-black/10 dark:bg-white/10 uppercase tracking-wider font-sans">
            {tipoActivo}
          </span>
          <span>{tasaActivaNumero > 0 ? `Bs. ${fmtTasa(tasaActivaNumero)}` : "Sin tasa"}</span>
          {tasaCop && (
            <span className="text-slate-400 dark:text-white/40 font-normal">
              · COP {fmtTasa(Number(tasaCop.tasa))}
            </span>
          )}
        </span>
        <IconSettings size={12} className="opacity-80" />
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 z-[9999] w-84 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-200 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
            <div>
              <p className="text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-wider font-['Outfit']">
                Tasas de Cambio Operativas
              </p>
              <p className="text-[10px] text-slate-500 dark:text-white/40">
                Selecciona cuál rige el punto de venta hoy
              </p>
            </div>
            <button
              onClick={() => setAbierto(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <IconClose size={14} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 bg-slate-100 dark:bg-white/5 rounded-xl p-2.5">
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase">Gobierna el cobro en POS</p>
              <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">
                {tipoActivo === "USDT" ? "USDT (P2P)" : tipoActivo === "BCV" ? "BCV Oficial" : "Propia"}
              </p>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-white/40 text-right max-w-[130px]">
              Se cambia en Configuración → Tasa activa para el POS
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* USDT/P2P y BCV Oficial son cifras públicas que el negocio no controla — se
                consultan en vivo con un clic, nunca se tipean. */}
            <div className="flex items-center gap-2">
              <span className="w-24 text-[10px] font-semibold text-slate-600 dark:text-white/70 flex items-center gap-1">
                <IconCoins size={12} className="text-emerald-500 shrink-0" />
                <span>USDT / P2P:</span>
              </span>
              <span className="flex-1 font-mono font-bold text-slate-800 dark:text-white">
                {tasaPorOrigen.USDT ? `Bs. ${fmtTasa(Number(tasaPorOrigen.USDT.tasa))}` : "Sin consultar"}
              </span>
              <button
                type="button"
                onClick={() => void refrescarExterna("USDT")}
                disabled={actualizandoExterna !== null}
                title="Consultar en vivo (Binance P2P)"
                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 disabled:opacity-50 cursor-pointer"
              >
                <IconRefresh size={12} className={actualizandoExterna === "USDT" ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-24 text-[10px] font-semibold text-slate-600 dark:text-white/70 flex items-center gap-1">
                <IconBank size={12} className="text-teal-500 shrink-0" />
                <span>BCV Oficial:</span>
              </span>
              <span className="flex-1 font-mono font-bold text-slate-800 dark:text-white">
                {tasaPorOrigen.BCV ? `Bs. ${fmtTasa(Number(tasaPorOrigen.BCV.tasa))}` : "Sin consultar"}
              </span>
              <button
                type="button"
                onClick={() => void refrescarExterna("BCV")}
                disabled={actualizandoExterna !== null}
                title="Consultar en vivo (BCV oficial)"
                className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 disabled:opacity-50 cursor-pointer"
              >
                <IconRefresh size={12} className={actualizandoExterna === "BCV" ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-24 text-[10px] font-semibold text-slate-600 dark:text-white/70 flex items-center gap-1">
                <span className="text-[9px] font-extrabold px-1 rounded bg-sky-500/20 text-sky-500">COP</span>
                <span>Pesos COP:</span>
              </span>
              <input
                value={tasaCopVal}
                onChange={(e) => setTasaCopVal(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                placeholder="Ej. 4180"
                className="input-horeca flex-1 py-1.5 text-xs font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400">COP</span>
            </div>

            {tipoActivo === "PERSONALIZADA" && (
              <div className="flex items-center gap-2 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                <span className="w-24 text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <IconEdit size={12} className="text-amber-500 shrink-0" />
                  <span>Tasa Propia:</span>
                </span>
                <input
                  value={tasaPersVal}
                  onChange={(e) => setTasaPersVal(e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej. 66.00"
                  className="input-horeca flex-1 py-1.5 text-xs font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400">Bs</span>
              </div>
            )}
          </div>

          {error && <p className="text-[10px] text-red-500">{error}</p>}

          <button
            onClick={actualizar}
            disabled={guardando}
            className="w-full btn-cyber-neon text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-60 shadow-md"
          >
            {guardando ? "Guardando…" : "Guardar COP / Propia"}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Tasa del día requerida para operar el POS (USDT P2P o BCV oficial). Ninguna de las dos se
 * tipea: son cifras públicas que el negocio no controla, así que este modal las consulta en
 * vivo con un clic — nunca ofrece un campo numérico para "inventarlas".
 */
function ModalTasaRequerida({ tenantId, onCancelar, onRegistrada }: {
  tenantId: number; onCancelar: () => void; onRegistrada: () => void;
}) {
  const [tipo, setTipo] = useState<"USDT" | "BCV">("USDT");
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consultarYAplicar = async () => {
    setConsultando(true);
    setError(null);
    try {
      await actualizarOrigenTasaActiva(tipo);
      const fuente = tipo === "USDT" ? "BINANCE" : "BCV";
      await actualizarTasaExterna(fuente, "VES");
      onRegistrada();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo consultar la tasa pública.");
    } finally {
      setConsultando(false);
    }
  };

  return (
    <Modal onClose={onCancelar} titulo="Tasa del día requerida (POS)">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0"><IconWarning size={20} /></div>
          <p className="text-sm text-slate-600 dark:text-white/70">
            Para calcular totales y vueltos en bolívares, elige qué referencia pública consultar hoy:
            <strong> USDT P2P</strong> (San Cristóbal / Frontera) o <strong>BCV Oficial</strong>.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setTipo("USDT")}
            className={`py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
              tipo === "USDT" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 dark:text-white/60"
            }`}
          >
            <IconCoins size={13} />
            <span>Tasa USDT P2P</span>
          </button>
          <button
            type="button"
            onClick={() => setTipo("BCV")}
            className={`py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
              tipo === "BCV" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 dark:text-white/60"
            }`}
          >
            <IconBank size={13} />
            <span>Tasa BCV Oficial</span>
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={() => void consultarYAplicar()} disabled={consultando} className="w-full btn-cyber-neon text-white text-sm font-bold py-3 rounded-xl cursor-pointer disabled:opacity-60">
          {consultando ? "Consultando…" : `Consultar ${tipo === "USDT" ? "Binance P2P" : "BCV oficial"} y continuar`}
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
function KpiCard({ label, val, sub, color, onClick }: { label: React.ReactNode; val: React.ReactNode; sub?: React.ReactNode; color: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`apple-glass rounded-2xl p-5 border-l-4 transition-all flex flex-col justify-between min-h-[115px] ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`} style={{ borderLeftColor: color }}>
      <div>
        <div className="text-xs text-slate-500 dark:text-white/40 font-medium">{label}</div>
        <div className="mt-1">{val}</div>
      </div>
      {sub && <div className="text-[11px] text-slate-400 mt-2">{sub}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// VISTA GENERAL
// ══════════════════════════════════════════════════════════════════════════
/**
 * Vista General = terminal de caja pura, sin nada gerencial encima. Cero
 * KPIs, cero tarjetas de resumen — esa analítica vive en "Resumen General"
 * (ver ResumenGeneral más abajo). El espacio entero, de punta a punta,
 * es catálogo + comanda + cobro para que el cajero cobre lo más rápido
 * posible sin que nada le compita por la pantalla.
 */
function VistaGeneral({
  tenantId, escandallos, fastbar, articulos, tasaBcv, tasaCop, ventasHoy, nombreLocal, tasaValida,
  cargosPorDefecto, impuestosPorDefecto, recetasActivas, onVenta, onRegistrarTasa, onArticuloActualizado,
}: {
  tenantId: number; escandallos: EscandalloReceta[] | null; fastbar: FastBarTrago[] | null; articulos: Articulo[] | null;
  tasaBcv: TasaCambio | null; tasaCop: TasaCambio | null; ventasHoy: { total: number; moneda: string } | null; nombreLocal: string;
  tasaValida: boolean; cargosPorDefecto: typeof CARGOS_POR_DEFECTO; impuestosPorDefecto: typeof IMPUESTOS_POR_DEFECTO; recetasActivas: boolean;
  onVenta: (monto: number, metodo: string) => void; onRegistrarTasa: () => void;
  onArticuloActualizado: (articulo: Articulo) => void;
}) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <VentaRapida
        embebido tenantId={tenantId} escandallos={recetasActivas ? escandallos : []} fastbar={fastbar} articulos={articulos}
        tasaBcv={tasaBcv} tasaCop={tasaCop} ventasHoy={ventasHoy} nombreLocal={nombreLocal}
        tasaValida={tasaValida} cargosPorDefecto={cargosPorDefecto} impuestosPorDefecto={impuestosPorDefecto}
        onRegistrarTasa={onRegistrarTasa} onVenta={onVenta}
        onArticuloActualizado={onArticuloActualizado}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SALÓN & MESAS
// ══════════════════════════════════════════════════════════════════════════
function Salon({ tenantId, mapa, itemsPorComanda, setItemsPorComanda, escandallos, articulos, onVenta, onCambio, zonasCocina, zonasMesa, onZonasMesaGuardadas, nombreLocal, onAccionEncolada }: {
  tenantId: number; mapa: MapaMesaEntrada[] | null;
  itemsPorComanda: Record<number, ItemLocal[]>; setItemsPorComanda: (fn: (prev: Record<number, ItemLocal[]>) => Record<number, ItemLocal[]>) => void;
  escandallos: EscandalloReceta[] | null; articulos: Articulo[] | null; onVenta: (monto: number, metodo: string) => void; onCambio: () => void; zonasCocina: string[]; zonasMesa: string[]; onZonasMesaGuardadas: () => void; nombreLocal: string;
  onAccionEncolada: () => void;
}) {
  const { user } = useAuth();
  // Editar zonas y gestionar meseros son configuración del negocio, no
  // operación diaria — reservado al dueño, igual que el backend
  // (ModuloTenantController/MeseroHorecaController exigen DUENO_ADMIN).
  const esDueno = user?.rol === "DUENO_ADMIN";
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
  const [subpagina, setSubpagina] = useState<"mesas" | "meseros">("mesas");
  const [editandoZonasMesa, setEditandoZonasMesa] = useState(false);
  const [nuevaZonaMesa, setNuevaZonaMesa] = useState("");
  const [guardandoZonaMesa, setGuardandoZonaMesa] = useState(false);
  const [errorZonaMesa, setErrorZonaMesa] = useState<string | null>(null);

  const agregarZonaMesa = async () => {
    const nombre = nuevaZonaMesa.trim().toUpperCase().replace(/\s+/g, "_");
    if (!nombre || zonasMesa.includes(nombre)) { setNuevaZonaMesa(""); return; }
    setGuardandoZonaMesa(true);
    setErrorZonaMesa(null);
    try {
      await actualizarZonasMesa([...zonasMesa, nombre]);
      onZonasMesaGuardadas();
      setNuevaZonaMesa("");
    } catch (e) {
      setErrorZonaMesa(e instanceof Error ? e.message : "No se pudo agregar la zona");
    } finally {
      setGuardandoZonaMesa(false);
    }
  };

  const eliminarZonaMesa = async (zona: string) => {
    if (zonasMesa.length <= 1) { setErrorZonaMesa("Debe quedar al menos una zona"); return; }
    setGuardandoZonaMesa(true);
    setErrorZonaMesa(null);
    try {
      await actualizarZonasMesa(zonasMesa.filter((z) => z !== zona));
      onZonasMesaGuardadas();
    } catch (e) {
      setErrorZonaMesa(e instanceof Error ? e.message : "No se pudo eliminar la zona");
    } finally {
      setGuardandoZonaMesa(false);
    }
  };

  useEffect(() => {
    if (comandaActiva?.id) {
      obtenerItemsComanda(tenantId, comandaActiva.id)
        .then((itemsBackend) => {
          setItemsPorComanda((prev) => ({ ...prev, [comandaActiva.id]: itemsBackend }));
        })
        .catch(() => {});
    }
  }, [comandaActiva?.id, tenantId, setItemsPorComanda]);

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
      const comanda = await abrirComanda({
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
      <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/5 text-xs w-fit">
        {[{ id: "mesas", label: "Mesas" }, { id: "meseros", label: "Meseros" }].map((t) => (
          <button key={t.id} onClick={() => setSubpagina(t.id as typeof subpagina)}
            className={`px-4 py-2 rounded-full font-bold transition-all cursor-pointer ${subpagina === t.id ? "bg-teal-600 text-white shadow-xs" : "text-slate-600 dark:text-white/60"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {subpagina === "meseros" ? (
        <MeserosPanel />
      ) : (
      <>
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
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 dark:text-white/30 uppercase tracking-wider mb-1">Número</label>
              <input value={nuevaMesa.numero} onChange={(e) => setNuevaMesa({ ...nuevaMesa, numero: e.target.value })} type="number" placeholder="Número de mesa" className="input-horeca w-full" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 dark:text-white/30 uppercase tracking-wider mb-1">Capacidad</label>
              <input value={nuevaMesa.capacidad} onChange={(e) => setNuevaMesa({ ...nuevaMesa, capacidad: e.target.value })} type="number" placeholder="Capacidad (pax)" className="input-horeca w-full" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 dark:text-white/30 uppercase tracking-wider mb-1">Zona</label>
              <select value={nuevaMesa.zona} onChange={(e) => setNuevaMesa({ ...nuevaMesa, zona: e.target.value })} className="input-horeca w-full">
                {zonasMesa.map((z) => <option key={z} value={z}>{labelDeZona(z)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 dark:text-white/30 uppercase tracking-wider mb-1">Forma</label>
              <select value={nuevaMesa.forma} onChange={(e) => setNuevaMesa({ ...nuevaMesa, forma: e.target.value })} className="input-horeca w-full">
                <option value="RECTANGULAR">Cuadrada</option>
                <option value="CIRCULAR">Redonda</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-semibold text-slate-400 dark:text-white/30 uppercase tracking-wider">Zonas disponibles</label>
              {esDueno && (
                <button type="button" onClick={() => setEditandoZonasMesa((v) => !v)}
                  className={`text-[10px] font-semibold cursor-pointer ${editandoZonasMesa ? "text-teal-600 dark:text-teal-400" : "text-slate-400 hover:text-teal-600 dark:hover:text-teal-400"}`}>
                  {editandoZonasMesa ? "✓ Listo" : "✎ Editar zonas"}
                </button>
              )}
            </div>
            {editandoZonasMesa && esDueno && (
              <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-slate-100/60 dark:bg-white/5">
                {zonasMesa.map((z) => (
                  <div key={z} className="flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-xs font-semibold bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-white/60">
                    {labelDeZona(z)}
                    <button type="button" onClick={() => eliminarZonaMesa(z)} disabled={guardandoZonaMesa} title="Eliminar zona"
                      className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 cursor-pointer disabled:opacity-40">
                      <IconClose size={10} />
                    </button>
                  </div>
                ))}
                <input
                  value={nuevaZonaMesa}
                  onChange={(e) => setNuevaZonaMesa(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") agregarZonaMesa(); }}
                  placeholder="Ej. VIP"
                  className="input-horeca text-xs !py-1.5 !w-28"
                />
                <button type="button" onClick={agregarZonaMesa} disabled={guardandoZonaMesa || !nuevaZonaMesa.trim()}
                  className="apple-glass-btn text-xs font-semibold px-2.5 py-1.5 rounded-full cursor-pointer disabled:opacity-50">
                  + Agregar
                </button>
              </div>
            )}
            {errorZonaMesa && <p className="text-xs text-red-500 mt-1">{errorZonaMesa}</p>}
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
        <PlanoMesas tenantId={tenantId} mapa={mapa} onAbrirMesa={setAbriendo} onVerComanda={setComandaActiva} onEditarMesa={setMesaEditando} onCambio={onCambio} zonasMesa={zonasMesa}
          editandoZonasMesa={editandoZonasMesa} setEditandoZonasMesa={setEditandoZonasMesa}
          nuevaZonaMesa={nuevaZonaMesa} setNuevaZonaMesa={setNuevaZonaMesa}
          agregarZonaMesa={agregarZonaMesa} eliminarZonaMesa={eliminarZonaMesa}
          guardandoZonaMesa={guardandoZonaMesa} errorZonaMesa={errorZonaMesa} esDueno={esDueno} />
      )}

      {mesaEditando && (
        <EditarMesaModal tenantId={tenantId} mesa={mesaEditando} onClose={() => setMesaEditando(null)} onCambio={onCambio} zonasMesa={zonasMesa} />
      )}

      {/* Modal: abrir comanda */}
      {abriendo && (
        <Modal onClose={() => setAbriendo(null)} titulo={`Abrir Mesa ${abriendo.mesa.numero}`}>
          <div className="space-y-3">
            <Campo label="Mesero">
              <BuscadorMesero valor={formApertura.mesero} onCambiar={(nombre) => setFormApertura({ ...formApertura, mesero: nombre })} />
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
          articulos={articulos}
          zonasCocina={zonasCocina}
          nombreLocal={nombreLocal}
          onAgregarItem={(item) => setItemsPorComanda((prev) => ({ ...prev, [comandaActiva.id]: [...(prev[comandaActiva.id] || []), item] }))}
          onActualizarItem={(item) => setItemsPorComanda((prev) => ({ ...prev, [comandaActiva.id]: (prev[comandaActiva.id] || []).map((it) => it.id === item.id ? item : it) }))}
          onCerrar={(monto, metodo) => { onVenta(monto, metodo); onCambio(); }}
          onClose={() => setComandaActiva(null)}
          onAccionEncolada={onAccionEncolada}
        />
      )}
      </>
      )}
    </div>
  );
}

/**
 * Campo de mesero al abrir una comanda — autocompleta con el directorio del
 * negocio (datalist nativo del navegador, sin dropdown propio que mantener),
 * pero sigue aceptando cualquier texto: Comanda.mesero es libre a propósito,
 * así que un mesero de medio turno sin dar de alta no bloquea la venta.
 */
function BuscadorMesero({ valor, onCambiar }: { valor: string; onCambiar: (nombre: string) => void }) {
  const [meseros, setMeseros] = useState<MeseroHoreca[]>([]);
  useEffect(() => { listarMeseros().then((r) => setMeseros(r.map((e) => e.mesero).filter((m) => m.activo))).catch(() => setMeseros([])); }, []);
  return (
    <>
      <input
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder="Nombre del mesero"
        list="lista-meseros-horeca"
        className="input-horeca"
      />
      <datalist id="lista-meseros-horeca">
        {meseros.map((m) => <option key={m.id} value={m.nombre} />)}
      </datalist>
    </>
  );
}

/** Alta/edición/baja de meseros — directorio propio del negocio, ver MeseroHoreca.
 * Opcionalmente cada mesero se puede vincular a un Empleado de RRHH: cuando
 * está vinculado, la tarjeta muestra en vivo si está fichado ahora mismo
 * (contra el reloj checador real), sin duplicar ningún dato. */
function MeserosPanel() {
  const { user } = useAuth();
  const esDueno = user?.rol === "DUENO_ADMIN";
  const [meseros, setMeseros] = useState<MeseroConEstado[] | null>(null);
  const [empleados, setEmpleados] = useState<EmpleadoRrhh[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<MeseroHoreca | null>(null);
  const [form, setForm] = useState({ nombre: "", telefono: "", empleadoId: "" });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = () => listarMeseros().then(setMeseros).catch(() => setMeseros([]));
  useEffect(() => {
    cargar();
    listarEmpleadosRrhh().then((r) => setEmpleados(r.filter((e) => e.activo))).catch(() => setEmpleados([]));
  }, []);

  const abrirNuevo = () => { setEditando(null); setForm({ nombre: "", telefono: "", empleadoId: "" }); setMostrarForm(true); };
  const abrirEditar = (m: MeseroHoreca) => { setEditando(m); setForm({ nombre: m.nombre, telefono: m.telefono || "", empleadoId: m.empleadoId ? String(m.empleadoId) : "" }); setMostrarForm(true); };

  const guardar = async () => {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setGuardando(true);
    setError(null);
    const datos = { nombre: form.nombre.trim(), telefono: form.telefono.trim() || undefined, empleadoId: form.empleadoId ? Number(form.empleadoId) : null };
    try {
      if (editando) await editarMesero(editando.id, datos);
      else await crearMesero(datos);
      setMostrarForm(false);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el mesero");
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async (m: MeseroHoreca) => {
    try {
      if (m.activo) await desactivarMesero(m.id);
      else await reactivarMesero(m.id);
      cargar();
    } catch {
      alert("No se pudo actualizar el mesero — revisa tu conexión e inténtalo de nuevo.");
    }
  };

  const activos = (meseros || []).filter((e) => e.mesero.activo);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-white/40">
          {activos.length} meseros activos
          {activos.some((e) => e.enTurno) && <span className="ml-2 text-teal-600 dark:text-teal-400 font-semibold">· {activos.filter((e) => e.enTurno).length} en turno ahora</span>}
        </p>
        {esDueno && <button onClick={abrirNuevo} className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">+ Nuevo mesero</button>}
      </div>
      {!esDueno && <p className="text-xs text-slate-400">Solo el dueño/administrador puede crear, editar o desactivar meseros.</p>}

      {mostrarForm && esDueno && (
        <div className="apple-glass rounded-2xl p-5 space-y-3">
          <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">{editando ? "Editar mesero" : "Nuevo mesero"}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="Nombre"><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Juan Pérez" className="input-horeca" /></Campo>
            <Campo label="Teléfono (opcional)"><input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="0412-1234567" className="input-horeca" /></Campo>
          </div>
          <Campo label="Vincular con empleado de RRHH (opcional)">
            <select value={form.empleadoId} onChange={(e) => setForm({ ...form, empleadoId: e.target.value })} className="input-horeca w-full">
              <option value="">Sin vincular — solo directorio</option>
              {empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}{e.cargo ? ` — ${e.cargo}` : ""}</option>)}
            </select>
            {empleados.length === 0 && <p className="text-[10px] text-slate-400 mt-1">No tienes empleados registrados en RRHH todavía — puedes crear el mesero igual, sin vincular.</p>}
            {form.empleadoId && <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-1">Al vincularlo, esta tarjeta mostrará en vivo si está fichado (entrada marcada) ahora mismo.</p>}
          </Campo>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button onClick={guardar} disabled={guardando} className="btn-cyber-neon text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button onClick={() => setMostrarForm(false)} className="apple-glass-btn text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer">Cancelar</button>
          </div>
        </div>
      )}

      {meseros === null ? (
        <p className="text-xs text-slate-400">Cargando…</p>
      ) : meseros.length === 0 ? (
        <div className="apple-glass rounded-2xl p-8 text-center">
          <p className="text-slate-500 dark:text-white/40 text-sm">Aún no tienes meseros registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {meseros.map(({ mesero: m, enTurno, cargoEmpleado }) => (
            <div key={m.id} className={`apple-glass rounded-2xl p-5 space-y-1.5 ${!m.activo ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{m.nombre}</h4>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {m.activo && m.empleadoId && (
                    enTurno ? (
                      <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" /> EN TURNO
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-300/50 dark:bg-white/10 text-slate-500 dark:text-white/40">FUERA DE TURNO</span>
                    )
                  )}
                  {!m.activo && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-300/60 dark:bg-white/10 text-slate-600 dark:text-white/60 uppercase">Inactivo</span>}
                </div>
              </div>
              {cargoEmpleado && <div className="text-[11px] text-slate-400">{cargoEmpleado}</div>}
              {m.telefono && <div className="text-xs text-slate-500 dark:text-white/40">Tel: {m.telefono}</div>}
              {esDueno && (
                <div className="flex gap-3 pt-1.5">
                  <button onClick={() => abrirEditar(m)} className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 cursor-pointer">Editar</button>
                  <button onClick={() => alternarActivo(m)} className="text-[11px] font-semibold text-slate-500 dark:text-white/50 hover:text-red-500 cursor-pointer">
                    {m.activo ? "Desactivar" : "Reactivar"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// EDITAR / ELIMINAR MESA
// ══════════════════════════════════════════════════════════════════════════
function EditarMesaModal({ tenantId, mesa, onClose, onCambio, zonasMesa }: { tenantId: number; mesa: Mesa; onClose: () => void; onCambio: () => void; zonasMesa: string[] }) {
  const [form, setForm] = useState({ numero: String(mesa.numero), capacidad: mesa.capacidad != null ? String(mesa.capacidad) : "", zona: mesa.zona || zonasMesa[0], forma: mesa.forma || "RECTANGULAR" });
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
              {zonasMesa.map((z) => <option key={z} value={z}>{labelDeZona(z)}</option>)}
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
            <button onClick={() => setConfirmarEliminar(true)} className="text-red-500 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
              <IconTrash size={13} />
              <span>Eliminar esta mesa</span>
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
// Colores por zona de mesa, asignados por posición (no hay campo de color en
// backend — es solo texto libre, ver Mesa.zona). Alcanza y sobra para las
// pocas zonas que un negocio suele tener; si agrega más de 6, se repiten.
// Sin ámbar/naranja a propósito: ese color ya está reservado para el estado
// "Ocupada" en el plano — si una zona lo usara también, un punto naranja se
// podría confundir con mesa ocupada en vez de con la zona.
const PALETA_ZONAS = ["#0ea5e9", "#22c55e", "#a855f7", "#ec4899", "#ef4444", "#14b8a6", "#6366f1", "#84cc16"];
function colorDeZona(zona: string, zonasMesa: string[]): string {
  const idx = Math.max(0, zonasMesa.indexOf(zona));
  return PALETA_ZONAS[idx % PALETA_ZONAS.length];
}
function labelDeZona(zona: string): string {
  return zona.charAt(0) + zona.slice(1).toLowerCase().replace(/_/g, " ");
}

function PlanoMesas({ tenantId, mapa, onAbrirMesa, onVerComanda, onEditarMesa, onCambio, zonasMesa,
  editandoZonasMesa, setEditandoZonasMesa, nuevaZonaMesa, setNuevaZonaMesa, agregarZonaMesa, eliminarZonaMesa, guardandoZonaMesa, errorZonaMesa, esDueno,
}: {
  tenantId: number; mapa: MapaMesaEntrada[]; onAbrirMesa: (m: MapaMesaEntrada) => void; onVerComanda: (c: Comanda) => void; onEditarMesa: (m: Mesa) => void; onCambio: () => void; zonasMesa: string[];
  editandoZonasMesa: boolean; setEditandoZonasMesa: (fn: (v: boolean) => boolean) => void; nuevaZonaMesa: string; setNuevaZonaMesa: (v: string) => void;
  agregarZonaMesa: () => void; eliminarZonaMesa: (zona: string) => void; guardandoZonaMesa: boolean; errorZonaMesa: string | null; esDueno: boolean;
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
        if (pos) actualizarPosicionMesa(tenantId, arrastrando, { posX: Math.round(pos.x), posY: Math.round(pos.y), ancho: ANCHO_DEFECTO, alto: ANCHO_DEFECTO }).catch(() => alert("No se pudo guardar la nueva posición de la mesa — al recargar la página volverá a su lugar anterior."));
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
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30">Zonas</p>
            {esDueno && (
              <button type="button" onClick={() => setEditandoZonasMesa((v) => !v)}
                className={`text-[10px] font-semibold cursor-pointer ${editandoZonasMesa ? "text-teal-600 dark:text-teal-400" : "text-slate-400 hover:text-teal-600 dark:hover:text-teal-400"}`}>
                {editandoZonasMesa ? "✓ Listo" : "✎ Editar"}
              </button>
            )}
          </div>
          {editandoZonasMesa && esDueno ? (
            <div className="space-y-2">
              {zonasMesa.map((z) => (
                <div key={z} className="flex items-center justify-between gap-1 pl-2 pr-1 py-1 rounded-lg text-xs font-semibold bg-slate-100/60 dark:bg-white/5 text-slate-600 dark:text-white/60">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorDeZona(z, zonasMesa) }} /> {labelDeZona(z)}</span>
                  <button type="button" onClick={() => eliminarZonaMesa(z)} disabled={guardandoZonaMesa} title="Eliminar zona"
                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 cursor-pointer disabled:opacity-40 flex-shrink-0">
                    <IconClose size={10} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <input
                  value={nuevaZonaMesa}
                  onChange={(e) => setNuevaZonaMesa(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") agregarZonaMesa(); }}
                  placeholder="Ej. BARRA VIP"
                  className="input-horeca text-xs !py-1.5 flex-1 min-w-0"
                />
                <button type="button" onClick={agregarZonaMesa} disabled={guardandoZonaMesa || !nuevaZonaMesa.trim()}
                  className="apple-glass-btn text-xs font-semibold px-2.5 py-1.5 rounded-full cursor-pointer disabled:opacity-50 flex-shrink-0">
                  +
                </button>
              </div>
              {errorZonaMesa && <p className="text-[10px] text-red-500">{errorZonaMesa}</p>}
            </div>
          ) : (
            <div className="space-y-1.5">
              {zonasMesa.map((z) => (
                <div key={z} className="flex items-center gap-2 text-xs text-slate-700 dark:text-white/70">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorDeZona(z, zonasMesa) }} /> {labelDeZona(z)}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setModoEdicion((v) => !v)}
          className={`w-full text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-all ${
            modoEdicion ? "bg-teal-600 text-white" : "apple-glass-btn text-slate-700 dark:text-white/70"
          }`}
        >
          {modoEdicion ? (
            <span className="inline-flex items-center justify-center gap-1.5">
              <IconCheck size={14} />
              <span>Listo (ver salón)</span>
            </span>
          ) : (
            <span className="inline-flex items-center justify-center gap-1.5">
              <IconEdit size={14} />
              <span>Editar plano</span>
            </span>
          )}
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
          const zonaColor = m.mesa.zona ? colorDeZona(m.mesa.zona, zonasMesa) : "#94a3b8";
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
              <span className="absolute top-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: zonaColor }} title={m.mesa.zona ? labelDeZona(m.mesa.zona) : undefined} />
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

const MONEDAS_ALTERNAS: Record<string, string> = { USD: "USD", VES: "Bs", COP: "COP" };

function nuevaFilaPago(moneda: string, auto: boolean): FilaPago {
  return { id: `${Date.now()}-${Math.random()}`, metodoPago: "EFECTIVO", moneda, monto: "", auto };
}

function PanelCobroMixto({ tenantId, total, monedaBase = "USD", tasasExternas, procesando, error, onCobrar, montosDivididos }: {
  tenantId: number; total: number; monedaBase?: string;
  tasasExternas?: { VES?: number | null; COP?: number | null };
  procesando: boolean; error: string | null;
  onCobrar: (pagos: PagoParcial[], monedaVuelto: string) => void;
  // Si "Dividir cuenta" ya calculó cuánto le toca a cada quien, se usa como
  // arranque: una fila por persona con su monto fijo — antes esa división
  // era solo un número mostrado en pantalla, y había que retipear cada parte
  // a mano en el cobro.
  montosDivididos?: number[] | null;
}) {
  // La primera fila nace "auto" y ya trae el total completo puesto — el caso
  // más común (pago 100% en efectivo, en la moneda base) queda a un solo
  // clic en "Cobrar", sin que el cajero tenga que escribir ni tocar "todo".
  // Cualquier fila agregada después también nace "auto" y se recalcula sola
  // con lo que falta (convertido a su moneda con la tasa vigente) cada vez
  // que cambia cualquier otra fila. En cuanto el cajero escribe algo directo
  // en una fila, deja de seguir el pendiente y queda fija como manual.
  const otrasMonedas = Object.keys(MONEDAS_ALTERNAS).filter((m) => m !== monedaBase);
  const filasDeDivision = (): FilaPago[] | null =>
    montosDivididos && montosDivididos.length > 1
      ? montosDivididos.map((m) => ({ ...nuevaFilaPago(monedaBase, false), monto: m.toFixed(2) }))
      : null;
  const [filas, setFilas] = useState<FilaPago[]>(() => filasDeDivision() || [nuevaFilaPago(monedaBase, true)]);
  const [tasas, setTasas] = useState<Record<string, number | null>>(() => ({
    VES: tasasExternas?.VES ?? null,
    COP: tasasExternas?.COP ?? null,
  }));
  const [monedaVuelto, setMonedaVuelto] = useState(monedaBase);

  // Si "Dividir cuenta" se calcula DESPUÉS de que este panel ya se montó
  // (orden normal: primero se abre el cobro, luego se pide dividir), hay que
  // reemplazar las filas cuando llega — el useState de arriba solo corre una
  // vez al montar.
  useEffect(() => {
    const nuevas = filasDeDivision();
    if (nuevas) setFilas(nuevas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montosDivididos]);

  const [errorTasas, setErrorTasas] = useState<string | null>(null);
  useEffect(() => {
    let vigente = true;
    setTasas({});
    cotizacionCobro().then((r) => {
      if (!vigente) return;
      if (r.monedaBase !== monedaBase) throw new Error("Cambió la moneda del negocio. Recarga la venta.");
      setTasas(r.factores);
      setErrorTasas(null);
    }).catch((e) => { if (vigente) setErrorTasas(e.message || "No se pudo consultar la tasa"); });
    return () => { vigente = false; };
  }, [tenantId, monedaBase, tasasExternas?.VES, tasasExternas?.COP]);

  // Si cambia monedaBase o total y la primera fila es auto, mantener sincronizada
  useEffect(() => {
    setFilas((prev) => {
      if (prev.length === 1 && prev[0].auto && prev[0].moneda !== monedaBase) {
        return [{ ...prev[0], moneda: monedaBase, monto: total > 0.004 ? total.toFixed(2) : "" }];
      }
      return prev;
    });
  }, [monedaBase, total]);

  const aBase = (monto: number, moneda: string) => {
    if (!monto) return 0;
    if (moneda === monedaBase) return monto;
    const tasa = tasas[moneda];
    return tasa ? monto / tasa : 0;
  };
  const deBase = (montoBase: number, moneda: string) => {
    if (moneda === monedaBase) return montoBase;
    const tasa = tasas[moneda];
    return tasa ? montoBase * tasa : 0;
  };

  // Recalcula en vivo las filas "auto" con lo que falta, cada vez que cambia
  // una fila manual, el total o alguna tasa — sin que el cajero tenga que
  // tocar nada, sea el restante en Bs, en COP o en la moneda base.
  const firmaManual = JSON.stringify(filas.filter((f) => !f.auto).map((f) => `${f.monto}|${f.moneda}`));
  const firmaTasas = JSON.stringify(tasas);
  // Firma de las filas AUTO (id + su moneda) — sin esto, agregar una fila
  // nueva (auto, recién creada con monto "") o cambiarle la moneda a una ya
  // existente no cambiaba ninguna de las otras dependencias del efecto
  // (firmaManual solo mira las filas manuales, firmaTasas el mapa de
  // tasas), así que el recálculo nunca se disparaba: la fila quedaba en
  // "" (mostrando el placeholder "0.00") en vez de convertir el restante.
  const firmaAuto = JSON.stringify(filas.filter((f) => f.auto).map((f) => `${f.id}|${f.moneda}`));
  useEffect(() => {
    setFilas((prev) => {
      const sumaManualBase = prev.filter((f) => !f.auto).reduce((s, f) => s + aBase(Number(f.monto) || 0, f.moneda), 0);
      const faltaBase = total - sumaManualBase;
      let cambio = false;
      const siguiente = prev.map((f) => {
        if (!f.auto) return f;
        const valor = faltaBase > 0.004 && (f.moneda === monedaBase || Number(tasas[f.moneda]) > 0) ? deBase(faltaBase, f.moneda).toFixed(2) : "";
        if (valor === f.monto) return f;
        cambio = true;
        return { ...f, monto: valor };
      });
      return cambio ? siguiente : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaManual, firmaAuto, total, firmaTasas, monedaBase]);

  const totalIngresadoBase = filas.reduce((s, f) => s + aBase(Number(f.monto) || 0, f.moneda), 0);
  const pendienteBase = Math.max(0, total - totalIngresadoBase);
  const vueltoBase = Math.max(0, totalIngresadoBase - total);
  const sinTasa = filas.some(f => f.moneda !== monedaBase && !(Number(tasas[f.moneda]) > 0))
    || (vueltoBase > 0.004 && monedaVuelto !== monedaBase && !(Number(tasas[monedaVuelto]) > 0));
  const cubierto = !errorTasas && !sinTasa && total > 0 && totalIngresadoBase >= total - 0.005;

  const actualizarMonto = (id: string, monto: string) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, monto, auto: false } : f)));
  const actualizarMetodo = (id: string, metodoPago: string) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, metodoPago } : f)));
  const actualizarMoneda = (id: string, moneda: string) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, moneda, monto: "", auto: true } : { ...f, auto: false })));
  const agregarFila = () => setFilas((prev) => {
    // La fila nueva nace en la primera moneda alterna disponible que ninguna otra fila ya esté usando (típicamente Bs).
    const enUso = new Set(prev.map((f) => f.moneda));
    const monedaSugerida = otrasMonedas.find((m) => !enUso.has(m)) || otrasMonedas[0] || monedaBase;
    return [...prev.map(f => ({ ...f, auto: false })), nuevaFilaPago(monedaSugerida, true)];
  });
  const quitarFila = (id: string) => setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev));
  const completarConPendiente = (id: string) => setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, auto: true } : { ...f, auto: false })));

  const handleCobrar = () => {
    if (!cubierto || procesando) return;
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

  const resumenMonedaAlterna = filas.length === 1 && filas[0].moneda !== monedaBase && Number(filas[0].monto) > 0
    ? `${MONEDAS_ALTERNAS[filas[0].moneda] || filas[0].moneda} ${Number(filas[0].monto).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null;

  return (
    <div className="space-y-3 pt-3 border-t border-slate-300/50 dark:border-white/10">
      <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Cobro (uno o varios métodos)</p>
      {(errorTasas || sinTasa) && <p role="alert" className="text-xs text-amber-700">{errorTasas || "Falta una tasa para la moneda seleccionada. Regístrala en Configuración antes de cobrar."}</p>}

      <div className="space-y-2">
        {filas.map((f) => (
          // flex-wrap: en un contenedor angosto (el carrito del POS, 300-420px)
          // no cabe método + moneda + monto en una sola línea sin comprimir el
          // texto — con min-w en cada control, lo que no cabe pasa a una
          // segunda línea en vez de recortarse.
          <div key={f.id} className="flex flex-wrap items-center gap-2">
            <select value={f.metodoPago} onChange={(e) => actualizarMetodo(f.id, e.target.value)} className="input-horeca flex-1 min-w-[140px] text-sm py-2.5">
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="BILLETERA_DIGITAL">Billetera digital</option>
            </select>
            <select value={f.moneda} onChange={(e) => actualizarMoneda(f.id, e.target.value)} className="input-horeca w-24 flex-shrink-0 text-sm py-2.5">
              <option value={monedaBase}>{monedaBase}</option>
              {otrasMonedas.map((m) => <option key={m} value={m}>{MONEDAS_ALTERNAS[m]}</option>)}
            </select>
            <div className="relative flex-1 min-w-[100px]">
              <input
                value={f.monto}
                onChange={(e) => actualizarMonto(f.id, e.target.value)}
                type="number" step="0.01" min="0" placeholder="0.00"
                title={f.auto ? "Se calcula sola con lo que falta — escribe aquí para fijarla a mano" : undefined}
                className={`input-horeca w-full text-sm py-2.5 ${f.auto ? "text-teal-600 dark:text-teal-300" : ""}`}
              />
              {f.auto && f.monto && (
                <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold bg-teal-500 text-white rounded-full px-1 leading-tight">auto</span>
              )}
            </div>
            <button type="button" onClick={() => completarConPendiente(f.id)} title="Rellenar con lo que falta" className="text-xs font-semibold text-teal-600 dark:text-teal-300 px-2 py-1 cursor-pointer whitespace-nowrap flex-shrink-0">todo</button>
            {filas.length > 1 && (
              <button type="button" onClick={() => quitarFila(f.id)} className="text-slate-400 hover:text-red-500 cursor-pointer flex-shrink-0"><IconTrash size={15} /></button>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={agregarFila} className="text-sm text-teal-600 dark:text-teal-300 font-semibold cursor-pointer">+ Agregar otro método de pago</button>

      <div className="apple-glass rounded-xl p-3.5 space-y-1.5 text-sm">
        <div className="flex justify-between"><span className="text-slate-500 dark:text-white/40">Total a cobrar</span><span className="font-mono font-bold text-slate-900 dark:text-white">{simbolo}{fmtNumero(total, monedaBase)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500 dark:text-white/40">Ingresado</span><span className="font-mono text-slate-700 dark:text-white/70">{simbolo}{fmtNumero(totalIngresadoBase, monedaBase)}</span></div>
        {resumenMonedaAlterna && (
          <div className="flex justify-between text-xs text-slate-500 dark:text-white/50 pt-1 border-t border-slate-200/50 dark:border-white/5">
            <span>En moneda seleccionada</span>
            <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{resumenMonedaAlterna}</span>
          </div>
        )}
        {!cubierto ? (
          <div className="flex flex-wrap justify-between gap-x-2 text-amber-600 dark:text-amber-400 font-semibold">
            <span className="flex-shrink-0">Pendiente</span>
            <span className="font-mono text-right">{simbolo}{fmtNumero(pendienteBase, monedaBase)}{formatearEnOtras(pendienteBase) ? ` · ${formatearEnOtras(pendienteBase)}` : ""}</span>
          </div>
        ) : (
          <div className="flex flex-wrap justify-between gap-x-2 text-teal-600 dark:text-teal-400 font-semibold">
            <span className="flex-shrink-0">Vuelto</span>
            <span className="font-mono text-right">{simbolo}{fmtNumero(vueltoBase, monedaBase)}{formatearEnOtras(vueltoBase) ? ` · ${formatearEnOtras(vueltoBase)}` : ""}</span>
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
        className="w-full btn-cyber-neon text-white text-base font-bold py-4 rounded-xl cursor-pointer disabled:opacity-50">
        {procesando ? "Procesando…" : cubierto ? `Cobrar y Cerrar ${simbolo}${fmtNumero(total, monedaBase)}${resumenMonedaAlterna ? ` · ${resumenMonedaAlterna}` : ""}` : "Completa el pago para cobrar"}
      </button>
    </div>
  );
}

/**
 * Buscador con filtro en vivo para agregar un plato a la comanda — combina
 * recetas (escandallos) y cualquier artículo del inventario en una sola
 * lista, filtrando a medida que se escribe (mismo patrón que BuscadorArticulo
 * de Compras). Reemplaza el <select> plano, que no dejaba escribir para
 * acercarse al producto en catálogos largos.
 */
function BuscadorPlatoComanda({ escandallos, articulos, itemSel, onSeleccionar }: {
  escandallos: EscandalloReceta[] | null; articulos: Articulo[] | null; itemSel: string; onSeleccionar: (val: string) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement | null>(null);

  const escandallosActivos = useMemo(() => (escandallos || []).filter((e) => e.activo !== false), [escandallos]);
  const [tipoSel, idSelStr] = itemSel.split(":");
  const escandalloSel = tipoSel === "escandallo" ? escandallosActivos.find((e) => String(e.id) === idSelStr) : undefined;
  const articuloSel = tipoSel === "articulo" ? (articulos || []).find((a) => String(a.id) === idSelStr) : undefined;
  const nombreSeleccionado = escandalloSel?.nombrePlato || articuloSel?.nombre || "";

  useEffect(() => {
    if (!abierto) return;
    const handler = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [abierto]);

  const q = busqueda.trim().toLowerCase();
  const recetasFiltradas = useMemo(
    () => (q ? escandallosActivos.filter((e) => e.nombrePlato.toLowerCase().includes(q)) : escandallosActivos),
    [escandallosActivos, q]
  );
  const articulosFiltrados = useMemo(
    () => (q ? (articulos || []).filter((a) => a.nombre.toLowerCase().includes(q)) : (articulos || [])),
    [articulos, q]
  );

  return (
    <div className="relative" ref={contenedorRef}>
      <input
        value={abierto ? busqueda : nombreSeleccionado}
        onChange={(e) => { setBusqueda(e.target.value); if (!abierto) setAbierto(true); }}
        onFocus={() => { setBusqueda(""); setAbierto(true); }}
        placeholder="Buscar plato o artículo…"
        className="input-horeca w-full"
      />
      {abierto && (
        <div className="absolute z-20 mt-1 w-full min-w-[260px] bg-white dark:bg-slate-800 rounded-xl border border-slate-300/60 dark:border-white/10 max-h-64 overflow-y-auto shadow-lg">
          <button
            type="button"
            onClick={() => { onSeleccionar(""); setBusqueda(""); setAbierto(false); }}
            className="w-full text-left px-3 py-2 hover:bg-teal-500/10 text-xs cursor-pointer text-slate-500 dark:text-white/50 italic border-b border-slate-100 dark:border-white/5"
          >
            — Plato libre (escribir nombre) —
          </button>
          {recetasFiltradas.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/30">Recetas</p>
              {recetasFiltradas.map((e) => (
                <button key={`escandallo:${e.id}`} type="button"
                  onClick={() => { onSeleccionar(`escandallo:${e.id}`); setBusqueda(""); setAbierto(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-teal-500/10 text-xs cursor-pointer flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800 dark:text-white/80 truncate">{e.nombrePlato}</span>
                  <span className="text-slate-400 flex-shrink-0">${Number(e.precioVenta).toFixed(2)}</span>
                </button>
              ))}
            </>
          )}
          {articulosFiltrados.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/30">Inventario (cualquier artículo)</p>
              {articulosFiltrados.map((a) => {
                const sinStock = Number(a.stockActual) <= 0;
                return (
                  <button key={`articulo:${a.id}`} type="button" disabled={sinStock}
                    onClick={() => { if (sinStock) return; onSeleccionar(`articulo:${a.id}`); setBusqueda(""); setAbierto(false); }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 ${sinStock ? "opacity-40 cursor-not-allowed" : "hover:bg-teal-500/10 cursor-pointer"}`}
                  >
                    <span className="font-semibold text-slate-800 dark:text-white/80 truncate">{a.nombre}</span>
                    <span className="text-slate-400 flex-shrink-0 whitespace-nowrap">
                      ${Number(a.precioVenta || 0).toFixed(2)}{sinStock ? " · sin stock" : ` · stock ${Number(a.stockActual)}`}
                    </span>
                  </button>
                );
              })}
            </>
          )}
          {recetasFiltradas.length === 0 && articulosFiltrados.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">Sin resultados — usa "Plato libre" arriba.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ComandaDetalle({ tenantId, comanda, items, escandallos, articulos, onAgregarItem, onActualizarItem, onCerrar, onClose, zonasCocina, nombreLocal, onAccionEncolada }: {
  tenantId: number; comanda: Comanda; items: ItemLocal[]; escandallos: EscandalloReceta[] | null; articulos: Articulo[] | null;
  onAgregarItem: (item: ItemLocal) => void; onActualizarItem: (item: ItemLocal) => void; onCerrar: (monto: number, metodo: string) => void; onClose: () => void; zonasCocina: string[]; nombreLocal: string;
  onAccionEncolada: () => void;
}) {
  const { user } = useAuth();
  // Anular un ítem individual (y no solo la comanda completa) es una acción
  // sensible — un mesero solo no puede "arreglar" la cuenta después de cobrar
  // en efectivo. Mismo criterio que el backend (AuthContext.exigirRol).
  const puedeAnular = user?.rol === "DUENO_ADMIN" || user?.rol === "CAJERO_VENDEDOR";
  // "escandallo:12" (receta) | "articulo:34" (cualquier cosa del inventario,
  // ej. una lata de refresco que no pasa por receta) | "" (plato libre a mano).
  const [itemSel, setItemSel] = useState<string>("");
  const [nombrePlato, setNombrePlato] = useState("");
  const [precioManual, setPrecioManual] = useState("");
  const [estacionManual, setEstacionManual] = useState(zonasCocina[0]);
  const [cantidad, setCantidad] = useState("1");
  const [notaNuevoItem, setNotaNuevoItem] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numeroPersonas, setNumeroPersonas] = useState("2");
  const [division, setDivision] = useState<number[] | null>(null);
  const [modoDivision, setModoDivision] = useState<"partes_iguales" | "por_plato">("partes_iguales");
  const [personaPorItem, setPersonaPorItem] = useState<Record<number, number>>({});
  const [anulandoItemId, setAnulandoItemId] = useState<number | null>(null);
  const [motivoAnularItem, setMotivoAnularItem] = useState("");
  const [procesandoAnulacionItem, setProcesandoAnulacionItem] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);
  const [moneda, setMoneda] = useState("USD");
  // Binance Pay — additivo a propósito: si el negocio no lo activó en
  // Configuración, ninguno de estos estados se usa y el resto del cobro
  // (efectivo/tarjeta/etc.) sigue exactamente igual que siempre.
  const [binanceActivo, setBinanceActivo] = useState(false);
  const [ordenBinance, setOrdenBinance] = useState<OrdenBinancePay | null>(null);
  const [generandoBinance, setGenerandoBinance] = useState(false);
  const [errorBinance, setErrorBinance] = useState<string | null>(null);
  const [binancePagado, setBinancePagado] = useState(false);
  // Confirmación tras cobrar — antes la modal se cerraba sola apenas se
  // procesaba el pago y el PDF se abría automático (sin gesto del usuario),
  // así que el navegador lo bloqueaba en silencio: parecía que "no dejaba
  // cobrar" aunque el pago sí se hubiera hecho. Ahora se queda una pantalla
  // de confirmación con botones reales para ver/imprimir el ticket.
  const [cobroHecho, setCobroHecho] = useState<{ metodoPago: string; pendienteSync?: boolean } | null>(null);
  const [abriendoTicket, setAbriendoTicket] = useState(false);
  const [imprimiendoEscPos, setImprimiendoEscPos] = useState(false);

  const [tasaBcvLocal, setTasaBcvLocal] = useState<TasaCambio | null>(null);
  const [tasaCopLocal, setTasaCopLocal] = useState<TasaCambio | null>(null);

  useEffect(() => {
    obtenerMonedaBaseNegocio().then((r) => setMoneda(r.monedaBase)).catch(() => setError("No se pudo consultar la moneda del negocio"));
    tasaVigente(tenantId, "USD", "VES").then(setTasaBcvLocal).catch(() => setTasaBcvLocal(null));
    tasaVigente(tenantId, "USD", "COP").then(setTasaCopLocal).catch(() => setTasaCopLocal(null));
    obtenerEstadoBinancePay().then((r) => setBinanceActivo(r.activo)).catch(() => setBinanceActivo(false));
  }, [tenantId]);

  // Mientras hay una orden Binance Pay esperando, se consulta cada 4s si la
  // comanda ya quedó PAGADA (el cierre real lo hace el webhook del backend,
  // no este polling — esto solo actualiza la pantalla para que el cajero no
  // tenga que estar recargando a mano).
  useEffect(() => {
    if (!ordenBinance || binancePagado) return;
    const intervalo = setInterval(() => {
      obtenerComanda(tenantId, comanda.id).then((c) => {
        if (c.estado === "PAGADA") {
          setBinancePagado(true);
          onCerrar(totalLocal, "BILLETERA_DIGITAL");
          setCobroHecho({ metodoPago: "BILLETERA_DIGITAL" });
        }
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenBinance, binancePagado, comanda.id, tenantId]);

  const handlePagarBinance = async () => {
    setGenerandoBinance(true);
    setErrorBinance(null);
    try {
      const orden = await pagarComandaConBinance(comanda.id);
      setOrdenBinance(orden);
    } catch (e) {
      setErrorBinance(e instanceof Error ? e.message : "No se pudo generar el cobro con Binance Pay");
    } finally {
      setGenerandoBinance(false);
    }
  };

  // Los ítems ANULADOS quedan visibles (auditoría) pero nunca cuentan en el
  // total a cobrar — el backend ya los descontó de comanda.totalConsumo al
  // anularlos; acá se replica el mismo filtro para que el total mostrado y
  // el que se le pasa al panel de cobro coincidan siempre.
  const itemsActivos = items.filter((i) => i.estadoItem !== "ANULADO");
  const totalLocal = itemsActivos.reduce((s, i) => s + Number(i.precioUnitario) * i.cantidad, 0);

  const [tipoSel, idSelStr] = itemSel.split(":");
  const escandallo = tipoSel === "escandallo" ? escandallos?.find((e) => String(e.id) === idSelStr) : undefined;
  const articuloSel = tipoSel === "articulo" ? articulos?.find((a) => String(a.id) === idSelStr) : undefined;

  // Núcleo compartido de "agregar un ítem a la comanda" — extraído de
  // handleAgregar para que Propina y Descuento (más abajo) reutilicen
  // exactamente el mismo camino (incluida la cola offline y el manejo de
  // errores) en vez de duplicar esa lógica. Devuelve true si quedó agregado
  // (online o encolado sin conexión), false si fue un rechazo real.
  const agregarItemAComanda = async (datosItem: {
    escandalloId?: number; articuloId?: number; nombrePlato: string; estacionCocina: string; cantidad: number; precioUnitario: number; notas?: string;
  }): Promise<boolean> => {
    const clave = generarClaveIdempotencia();
    try {
      const item = await agregarItemComanda(comanda.id, { ...datosItem, claveIdempotencia: clave });
      onAgregarItem(item);
      return true;
    } catch (e) {
      if (esFalloDeConexion(e)) {
        // Sin conexión: se agrega de una vez en pantalla (con un id temporal
        // negativo) para que el mesero pueda seguir tomando el pedido sin
        // esperar, y se encola para mandarla en cuanto vuelva la señal — ver
        // offlineQueueHoreca.ts.
        const tempId = -Date.now();
        onAgregarItem({
          id: tempId, tenantId, nombrePlato: datosItem.nombrePlato, estacionCocina: datosItem.estacionCocina,
          estadoItem: "PENDIENTE", cantidad: datosItem.cantidad, precioUnitario: datosItem.precioUnitario,
          fechaCreacion: new Date().toISOString(), notas: datosItem.notas, pendienteSync: true,
        } as ItemLocal);
        encolarAccion(tenantId, {
          tipo: "agregar_item", id: String(tempId), claveIdempotencia: clave, comandaId: comanda.id,
          descripcion: `${datosItem.cantidad}× ${datosItem.nombrePlato} (Mesa ${comanda.numeroMesa ?? comanda.id})`,
          creadaEn: Date.now(), payload: datosItem,
        });
        onAccionEncolada();
        return true;
      }
      setError(e instanceof Error ? e.message : "No se pudo agregar el ítem");
      return false;
    }
  };

  const handleAgregar = async () => {
    setError(null);
    const cant = parseInt(cantidad, 10) || 1;
    if (!escandallo && !articuloSel && !nombrePlato.trim()) { setError("Elige una receta, un artículo del inventario, o escribe el nombre del plato"); return; }
    if (articuloSel && cant > Number(articuloSel.stockActual)) {
      setError(`Solo hay ${Number(articuloSel.stockActual)} ${articuloSel.unidadMedida || "unidades"} de "${articuloSel.nombre}" en inventario`);
      return;
    }
    setAgregando(true);
    const ok = await agregarItemAComanda({
      escandalloId: escandallo?.id,
      articuloId: articuloSel?.id,
      nombrePlato: escandallo ? escandallo.nombrePlato : articuloSel ? articuloSel.nombre : nombrePlato.trim(),
      estacionCocina: escandallo ? escandallo.estacionCocina : estacionManual,
      cantidad: cant,
      precioUnitario: escandallo ? escandallo.precioVenta : articuloSel ? articuloSel.precioVenta : Number(precioManual) || 0,
      notas: notaNuevoItem.trim() || undefined,
    });
    if (ok) { setItemSel(""); setNombrePlato(""); setPrecioManual(""); setCantidad("1"); setNotaNuevoItem(""); }
    setAgregando(false);
  };

  // Propina y descuento se agregan como un ítem más de la comanda (mismo
  // mecanismo de arriba), marcado con estacionCocina "CARGOS" — el mismo
  // valor centinela que ya usa Venta Rápida para que nunca aparezca como
  // plato fantasma en el KDS (ver ESTACIONES). Así, sin tocar el backend,
  // hereda gratis: aparece en el total, se puede anular con motivo, y sale
  // en el reporte de ventas por mesonero (Resumen General) igual que
  // cualquier otro renglón de la comanda.
  const [mostrarPropina, setMostrarPropina] = useState(false);
  const [tipoPropina, setTipoPropina] = useState<"porcentaje" | "monto">("porcentaje");
  const [valorPropina, setValorPropina] = useState("10");
  const [agregandoPropina, setAgregandoPropina] = useState(false);
  const [mostrarDescuento, setMostrarDescuento] = useState(false);
  const [motivoDescuento, setMotivoDescuento] = useState("");
  const [tipoDescuento, setTipoDescuento] = useState<"porcentaje" | "monto">("porcentaje");
  const [valorDescuento, setValorDescuento] = useState("");
  const [agregandoDescuento, setAgregandoDescuento] = useState(false);

  const handleAgregarPropina = async () => {
    setError(null);
    const valor = Number(valorPropina);
    if (!valor || valor <= 0) { setError("Indica un valor de propina mayor a cero"); return; }
    const monto = tipoPropina === "porcentaje" ? totalLocal * (valor / 100) : valor;
    setAgregandoPropina(true);
    const ok = await agregarItemAComanda({
      nombrePlato: "Propina", estacionCocina: "CARGOS", cantidad: 1,
      precioUnitario: Number(monto.toFixed(2)),
      notas: tipoPropina === "porcentaje" ? `${valor}% del consumo` : "Monto fijo",
    });
    if (ok) { setMostrarPropina(false); setValorPropina("10"); }
    setAgregandoPropina(false);
  };

  const handleAgregarDescuento = async () => {
    setError(null);
    const valor = Number(valorDescuento);
    if (!valor || valor <= 0) { setError("Indica un valor de descuento mayor a cero"); return; }
    if (!motivoDescuento.trim()) { setError("Indica el motivo del descuento"); return; }
    const monto = tipoDescuento === "porcentaje" ? totalLocal * (valor / 100) : valor;
    if (monto > totalLocal) { setError("El descuento no puede ser mayor al total de la comanda"); return; }
    setAgregandoDescuento(true);
    const ok = await agregarItemAComanda({
      nombrePlato: `Descuento: ${motivoDescuento.trim()}`, estacionCocina: "CARGOS", cantidad: 1,
      precioUnitario: -Number(monto.toFixed(2)),
      notas: tipoDescuento === "porcentaje" ? `${valor}% del consumo` : "Monto fijo",
    });
    if (ok) { setMostrarDescuento(false); setMotivoDescuento(""); setValorDescuento(""); }
    setAgregandoDescuento(false);
  };

  const handleAnularItem = async (itemId: number) => {
    if (!motivoAnularItem.trim()) { setError("Indica el motivo de la anulación"); return; }
    setProcesandoAnulacionItem(true);
    setError(null);
    try {
      const actualizado = await anularItemComanda(itemId, { motivo: motivoAnularItem.trim(), usuario: user?.nombre });
      onActualizarItem(actualizado);
      setAnulandoItemId(null);
      setMotivoAnularItem("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo anular el ítem");
    } finally {
      setProcesandoAnulacionItem(false);
    }
  };

  // División por plato: cada quien paga exactamente lo que pidió, en vez de
  // partes iguales — se calcula 100% en el navegador (no hay endpoint nuevo)
  // y se alimenta al mismo PanelCobroMixto que ya sabe recibir un arreglo de
  // montos ya divididos. El residuo de redondeo se lo lleva la última
  // persona con ítems asignados, igual que hace el backend en dividirCuenta.
  const handleDividirPorPlato = () => {
    setError(null);
    const asignados = itemsActivos.filter((it) => personaPorItem[it.id]);
    if (asignados.length !== itemsActivos.length) {
      setError("Asigna una persona a cada plato antes de dividir por ítem");
      return;
    }
    const personas = Array.from(new Set(itemsActivos.map((it) => personaPorItem[it.id]))).sort((a, b) => a - b);
    if (personas.length < 2) { setError("Asigna al menos 2 personas distintas para dividir por ítem"); return; }
    const centavosPorPersona: Record<number, number> = {};
    for (const p of personas) centavosPorPersona[p] = 0;
    for (const it of itemsActivos) {
      centavosPorPersona[personaPorItem[it.id]] += Math.round(Number(it.precioUnitario) * it.cantidad * 100);
    }
    const totalCentavos = Math.round(totalLocal * 100);
    const sumaAsignada = Object.values(centavosPorPersona).reduce((a, b) => a + b, 0);
    // Absorbe cualquier diferencia de redondeo (siempre debería ser 0, es solo defensivo).
    centavosPorPersona[personas[personas.length - 1]] += totalCentavos - sumaAsignada;
    setDivision(personas.map((p) => centavosPorPersona[p] / 100));
  };

  const handleDividir = async () => {
    try {
      const partes = await dividirCuenta(comanda.id, parseInt(numeroPersonas, 10) || 1);
      setDivision(partes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo dividir la cuenta");
    }
  };

  const handleCerrar = async (pagos: PagoParcial[], monedaVuelto: string) => {
    setCerrando(true);
    setErrorCierre(null);
    const clave = generarClaveIdempotencia();
    try {
      const resultado = await cerrarComandaMixto(comanda.id, pagos, monedaVuelto, clave);
      onCerrar(totalLocal, resultado.comanda.metodoPago || "MIXTO");
      // No se abre el PDF solo ni se cierra la modal acá — eso pasaba antes
      // "de una" (sin clic del usuario) y el navegador lo bloqueaba en
      // silencio. Ahora queda la pantalla de confirmación con el botón real.
      setCobroHecho({ metodoPago: resultado.comanda.metodoPago || "MIXTO" });
    } catch (e) {
      if (esFalloDeConexion(e)) {
        // Sin conexión: el cobro NO se marca como confirmado con el servidor
        // (la mesa sigue "ocupada" hasta sincronizar, a propósito — evita que
        // alguien abra otra comanda en la misma mesa creyendo que ya está
        // libre). Igual se puede imprimir/entregar el ticket ya mismo, porque
        // el ticket se arma con los datos locales, no con la respuesta del
        // servidor. onCerrar() (que actualiza ventas del día, etc.) se
        // dispara recién cuando la cola logre sincronizar este cobro.
        encolarAccion(tenantId, {
          tipo: "cobrar_comanda", id: clave, claveIdempotencia: clave, comandaId: comanda.id,
          descripcion: `Cobro Mesa ${comanda.numeroMesa ?? comanda.id} ($${totalLocal.toFixed(2)})`,
          creadaEn: Date.now(), payload: { pagos, monedaVuelto },
        });
        onAccionEncolada();
        setCobroHecho({ metodoPago: pagos.length === 1 ? pagos[0].metodoPago : "MIXTO", pendienteSync: true });
      } else {
        setErrorCierre(e instanceof Error ? e.message : "No se pudo cerrar la comanda");
      }
    } finally {
      setCerrando(false);
    }
  };

  const verTicket = async () => {
    setAbriendoTicket(true);
    setErrorCierre(null);
    try {
      const blob = await descargarTicketComanda(tenantId, comanda.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      setErrorCierre(e instanceof Error ? e.message : "No se pudo generar el ticket en PDF");
    } finally {
      setAbriendoTicket(false);
    }
  };

  // Impresora térmica por Web Serial — mismo patrón que VentaRapida.imprimirEscPos:
  // requiere gesto del usuario (el clic) para pedir permiso del puerto USB/serial.
  const imprimirEscPos = async () => {
    setImprimiendoEscPos(true);
    setErrorCierre(null);
    try {
      const nav = navigator as Navigator & { serial?: { requestPort: () => Promise<any> } };
      if (!nav.serial) {
        throw new Error("Este navegador no soporta impresión térmica directa (Web Serial) — usa Chrome o Edge, o imprime el PDF.");
      }
      const bytes = await descargarTicketEscPos(tenantId, comanda.id);
      const port = await nav.serial.requestPort();
      await port.open({ baudRate: 9600 });
      const writer = port.writable.getWriter();
      await writer.write(bytes);
      writer.releaseLock();
      await port.close();
    } catch (e) {
      setErrorCierre(e instanceof Error ? e.message : "No se pudo imprimir en la térmica");
    } finally {
      setImprimiendoEscPos(false);
    }
  };

  if (cobroHecho) {
    return (
      <Modal onClose={onClose} titulo="Mesa cobrada">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${cobroHecho.pendienteSync ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-teal-500/15 text-teal-600 dark:text-teal-400"}`}>
              <IconCheckCircle size={22} />
            </div>
            <div>
              <div className="font-['Outfit'] font-bold text-slate-900 dark:text-white">{cobroHecho.pendienteSync ? "Cobro guardado (sin conexión)" : "Cobro exitoso"}</div>
              <div className="text-xs text-slate-500 dark:text-white/40">Mesa {comanda.numeroMesa ?? "s/n"} · COM-{comanda.id}</div>
            </div>
          </div>
          {cobroHecho.pendienteSync && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-lg p-2.5 leading-relaxed">
              Sin conexión — este cobro quedó guardado en este dispositivo y se enviará solo apenas vuelva la señal. Puedes imprimir/entregar el ticket ya mismo con total confianza.
            </p>
          )}
          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-300/50 dark:border-white/10">
            <span>Total cobrado</span><span className="font-mono">${totalLocal.toFixed(2)}</span>
          </div>
          <div className="text-xs text-slate-700 dark:text-white/80 font-medium">Pagado con: <span className="font-bold text-slate-900 dark:text-white">{cobroHecho.metodoPago.replace(/_/g, " ")}</span></div>

          {errorCierre && <p className="text-xs text-red-500">{errorCierre}</p>}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                const tBs = tasaBcvLocal && Number(tasaBcvLocal.tasa) > 0 ? totalLocal * Number(tasaBcvLocal.tasa) : undefined;
                const tCop = tasaCopLocal && Number(tasaCopLocal.tasa) > 0 ? totalLocal * Number(tasaCopLocal.tasa) : undefined;
                imprimirTicketTermicoDirecto({
                  nombreLocal,
                  comandaId: comanda.id,
                  fecha: new Date().toLocaleString("es-VE"),
                  canal: comanda.canal,
                  lineas: itemsActivos.map((it) => ({ nombre: it.nombrePlato, cantidad: it.cantidad, precio: Number(it.precioUnitario) })),
                  subtotal: totalLocal,
                  total: totalLocal,
                  totalBs: tBs,
                  totalCop: tCop,
                  metodoPago: cobroHecho.metodoPago,
                });
              }}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-3 rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-1.5 transition-all"
              title="Imprime en impresora térmica de 58mm u 80mm en 1 clic"
            >
              <IconPrinter size={15} />
              <span>Ticket 80mm</span>
            </button>
            <button onClick={verTicket} disabled={abriendoTicket}
              className="flex-1 g-aurora text-white text-xs font-semibold py-3 rounded-xl cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5">
              <IconFileText size={15} />
              <span>{abriendoTicket ? "Generando…" : "PDF"}</span>
            </button>
            <button onClick={imprimirEscPos} disabled={imprimiendoEscPos} title="Imprime directo a impresora térmica USB por Web Serial"
              className="flex-1 apple-glass-btn text-xs font-semibold py-3 rounded-xl cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5">
              <IconTerminal size={15} />
              <span>{imprimiendoEscPos ? "Imprimiendo…" : "Térmica USB"}</span>
            </button>
          </div>
          <button onClick={onClose} className="w-full btn-cyber-neon text-white text-sm font-bold py-3 rounded-xl cursor-pointer">Listo, cerrar mesa</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} titulo={`Comanda — Mesa ${comanda.numeroMesa ?? "s/n"} (${comanda.canal})`} ancho="max-w-2xl">
      <div className="space-y-5">
        <div className="text-xs text-slate-500 dark:text-white/40">Mesero: <strong className="text-slate-800 dark:text-white/80">{comanda.mesero}</strong></div>

        {/* Items */}
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400">Sin ítems agregados todavía.</p>
          ) : items.map((it) => {
            const anulado = it.estadoItem === "ANULADO";
            const esCargo = it.estacionCocina === "CARGOS";
            const esDescuento = esCargo && Number(it.precioUnitario) < 0;
            const montoLinea = Number(it.precioUnitario) * it.cantidad;
            return (
            <div key={it.id} className={`rounded-xl px-3.5 py-2.5 text-sm ${anulado ? "bg-red-500/5 border border-red-500/20" : "bg-slate-100/60 dark:bg-white/5"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className={anulado ? "opacity-60" : ""}>
                  <span className={`font-semibold text-slate-900 dark:text-white ${anulado ? "line-through" : ""}`}>{esCargo ? it.nombrePlato : `${it.cantidad}× ${it.nombrePlato}`}</span>
                  <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded-full ${anulado ? "bg-red-500/15 text-red-500" : esDescuento ? "bg-teal-500/15 text-teal-600 dark:text-teal-300" : esCargo ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-teal-500/15 text-teal-600 dark:text-teal-300"}`}>
                    {anulado ? "ANULADO" : esDescuento ? "DESCUENTO" : esCargo ? "PROPINA" : it.estadoItem}
                  </span>
                  {it.pendienteSync && <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400" title="Guardado sin conexión, se sincroniza solo">⏳ sin sincronizar</span>}
                  {it.notas && !anulado && <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">↳ {it.notas}</div>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`font-mono ${anulado ? "line-through opacity-60 text-slate-600 dark:text-white/60" : esDescuento ? "text-teal-600 dark:text-teal-400" : "text-slate-600 dark:text-white/60"}`}>
                    {montoLinea < 0 ? "-" : ""}${Math.abs(montoLinea).toFixed(2)}
                  </span>
                  {!anulado && !it.pendienteSync && puedeAnular && (
                    <button onClick={() => { setAnulandoItemId(anulandoItemId === it.id ? null : it.id); setMotivoAnularItem(""); setError(null); }}
                      title="Anular este ítem" className="w-6 h-6 rounded-full flex items-center justify-center text-red-400 hover:bg-red-500/15 hover:text-red-500 cursor-pointer">
                      <IconClose size={12} />
                    </button>
                  )}
                </div>
              </div>
              {anulado && (
                <div className="text-[10px] text-red-500/80 mt-1">
                  Anulado{it.usuarioAnulacion ? ` por ${it.usuarioAnulacion}` : ""}: {it.motivoAnulacion}
                </div>
              )}
              {anulandoItemId === it.id && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-red-500/20">
                  <input value={motivoAnularItem} onChange={(e) => setMotivoAnularItem(e.target.value)} autoFocus
                    placeholder="Motivo de la anulación (obligatorio)" className="input-horeca text-xs flex-1 !py-1.5" />
                  <button onClick={() => handleAnularItem(it.id)} disabled={procesandoAnulacionItem}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500 text-white cursor-pointer disabled:opacity-60 flex-shrink-0">
                    {procesandoAnulacionItem ? "Anulando…" : "Confirmar"}
                  </button>
                  <button onClick={() => { setAnulandoItemId(null); setMotivoAnularItem(""); }} className="text-xs font-semibold text-slate-500 cursor-pointer flex-shrink-0">Cancelar</button>
                </div>
              )}
            </div>
            );
          })}
          <div className="flex items-center justify-between pt-2 border-t border-slate-300/50 dark:border-white/10 font-bold text-slate-900 dark:text-white">
            <span>Total</span><span className="font-mono">${totalLocal.toFixed(2)}</span>
          </div>
        </div>

        {/* Agregar item */}
        <div className="apple-glass rounded-xl p-4 space-y-2.5">
          <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Agregar plato o artículo</p>
          <Campo label="Buscar plato o artículo">
            <BuscadorPlatoComanda escandallos={escandallos} articulos={articulos} itemSel={itemSel} onSeleccionar={setItemSel} />
          </Campo>
          {articuloSel && (
            <p className="text-[10px] text-slate-400">
              Se descuenta directo del inventario — quedan {Number(articuloSel.stockActual)} {articuloSel.unidadMedida || "unidades"} de "{articuloSel.nombre}".
            </p>
          )}
          {!itemSel && (
            <div className="grid grid-cols-3 gap-2">
              <Campo label="Nombre del plato">
                <input value={nombrePlato} onChange={(e) => setNombrePlato(e.target.value)} placeholder="Nombre del plato" className="input-horeca w-full" />
              </Campo>
              <Campo label="Precio">
                <input value={precioManual} onChange={(e) => setPrecioManual(e.target.value)} placeholder="Precio $" type="number" step="0.01" className="input-horeca w-full" />
              </Campo>
              <Campo label="Estación de cocina">
                <select value={estacionManual} onChange={(e) => setEstacionManual(e.target.value)} className="input-horeca w-full" title="A qué estación de cocina va este plato">
                  {zonasCocina.map((e) => <option key={e} value={e}>{e.replace(/_/g, " ")}</option>)}
                </select>
              </Campo>
            </div>
          )}
          <Campo label="Nota para cocina (opcional)">
            <input value={notaNuevoItem} onChange={(e) => setNotaNuevoItem(e.target.value)} placeholder='Ej. "Sin cebolla", "Término 3/4", "Extra queso"' className="input-horeca w-full" />
          </Campo>
          <div className="flex items-end gap-2">
            <Campo label="Cantidad">
              <input value={cantidad} onChange={(e) => setCantidad(e.target.value)} type="number" min="1" className="input-horeca w-20" />
            </Campo>
            <button onClick={handleAgregar} disabled={agregando} className="flex-1 g-aurora text-white text-xs font-semibold py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
              {agregando ? "Agregando…" : "+ Agregar a la comanda"}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* Propina y descuento — botones rápidos que agregan un renglón más a la comanda */}
        <div className="flex gap-2">
          <button type="button" onClick={() => { setMostrarPropina((v) => !v); setMostrarDescuento(false); }}
            className={`flex-1 text-xs font-semibold py-2 rounded-xl cursor-pointer transition-all ${mostrarPropina ? "bg-teal-600 text-white" : "apple-glass-btn text-slate-700 dark:text-white/70"}`}>
            + Propina
          </button>
          <button type="button" onClick={() => { setMostrarDescuento((v) => !v); setMostrarPropina(false); }}
            className={`flex-1 text-xs font-semibold py-2 rounded-xl cursor-pointer transition-all ${mostrarDescuento ? "bg-teal-600 text-white" : "apple-glass-btn text-slate-700 dark:text-white/70"}`}>
            + Descuento
          </button>
        </div>

        {mostrarPropina && (
          <div className="apple-glass rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Agregar propina</p>
            <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/5 text-xs w-fit">
              {([{ id: "porcentaje", label: "% del consumo" }, { id: "monto", label: "Monto fijo $" }] as const).map((t) => (
                <button key={t.id} type="button" onClick={() => setTipoPropina(t.id)}
                  className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${tipoPropina === t.id ? "bg-teal-600 text-white" : "text-slate-600 dark:text-white/60"}`}>
                  {t.label}
                </button>
              ))}
            </div>
            {tipoPropina === "porcentaje" && (
              <div className="flex gap-1.5">
                {[10, 15, 20].map((p) => (
                  <button key={p} type="button" onClick={() => setValorPropina(String(p))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${valorPropina === String(p) ? "bg-teal-600 text-white" : "bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-white/60"}`}>
                    {p}%
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <Campo label={tipoPropina === "porcentaje" ? "Porcentaje" : "Monto ($)"}>
                <input value={valorPropina} onChange={(e) => setValorPropina(e.target.value)} type="number" min="0" step="0.01" className="input-horeca w-28" />
              </Campo>
              <button onClick={handleAgregarPropina} disabled={agregandoPropina} className="flex-1 g-aurora text-white text-xs font-semibold py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
                {agregandoPropina ? "Agregando…" : "Agregar propina"}
              </button>
            </div>
          </div>
        )}

        {mostrarDescuento && (
          <div className="apple-glass rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Aplicar descuento</p>
            <Campo label="Motivo">
              <input value={motivoDescuento} onChange={(e) => setMotivoDescuento(e.target.value)} placeholder='Ej. "Cliente frecuente", "Cortesía", "Promoción"' className="input-horeca w-full" />
            </Campo>
            <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/5 text-xs w-fit">
              {([{ id: "porcentaje", label: "% del consumo" }, { id: "monto", label: "Monto fijo $" }] as const).map((t) => (
                <button key={t.id} type="button" onClick={() => setTipoDescuento(t.id)}
                  className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${tipoDescuento === t.id ? "bg-teal-600 text-white" : "text-slate-600 dark:text-white/60"}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <Campo label={tipoDescuento === "porcentaje" ? "Porcentaje" : "Monto ($)"}>
                <input value={valorDescuento} onChange={(e) => setValorDescuento(e.target.value)} type="number" min="0" step="0.01" className="input-horeca w-28" />
              </Campo>
              <button onClick={handleAgregarDescuento} disabled={agregandoDescuento} className="flex-1 g-aurora text-white text-xs font-semibold py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
                {agregandoDescuento ? "Aplicando…" : "Aplicar descuento"}
              </button>
            </div>
          </div>
        )}

        {/* Dividir cuenta */}
        <div className="apple-glass rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/5 text-xs w-fit">
            {([{ id: "partes_iguales", label: "Partes iguales" }, { id: "por_plato", label: "Por plato" }] as const).map((m) => (
              <button key={m.id} onClick={() => { setModoDivision(m.id); setDivision(null); setError(null); }}
                className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${modoDivision === m.id ? "bg-teal-600 text-white" : "text-slate-600 dark:text-white/60"}`}>
                {m.label}
              </button>
            ))}
          </div>
          {modoDivision === "partes_iguales" ? (
            <div className="flex items-center gap-2">
              <input value={numeroPersonas} onChange={(e) => setNumeroPersonas(e.target.value)} type="number" min="1" className="input-horeca w-20" />
              <button onClick={handleDividir} className="apple-glass-btn text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">Dividir cuenta</button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400">Asigna un número de persona a cada plato — cada quien paga lo que pidió.</p>
              {itemsActivos.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-700 dark:text-white/70 truncate">{it.cantidad}× {it.nombrePlato}</span>
                  <input
                    value={personaPorItem[it.id] ?? ""}
                    onChange={(e) => setPersonaPorItem((prev) => ({ ...prev, [it.id]: parseInt(e.target.value, 10) || 0 }))}
                    type="number" min="1" placeholder="N° persona" className="input-horeca w-24 !py-1"
                  />
                </div>
              ))}
              <button onClick={handleDividirPorPlato} className="apple-glass-btn text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">Calcular división por plato</button>
            </div>
          )}
          {division && <p className="text-xs text-teal-600 dark:text-teal-300 font-semibold">{division.map((d, i) => `Persona ${i + 1}: $${d.toFixed(2)}`).join(" · ")}</p>}
        </div>

        {/* Binance Pay — solo aparece si el negocio lo activó en Configuración. */}
        {items.length > 0 && binanceActivo && (
          <div className="apple-glass rounded-xl p-4 space-y-2.5 border border-amber-500/25">
            <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider flex items-center gap-1.5">
              <IconCoins size={14} className="text-amber-500" /> Cobrar con Binance Pay
            </p>
            {!ordenBinance ? (
              <button onClick={handlePagarBinance} disabled={generandoBinance}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
                {generandoBinance ? "Generando cobro…" : `Generar cobro Binance Pay — $${totalLocal.toFixed(2)}`}
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                {ordenBinance.qrcodeLink && <img src={ordenBinance.qrcodeLink} alt="QR de pago Binance" className="w-40 h-40 rounded-lg border border-slate-300/50 dark:border-white/10" />}
                {ordenBinance.checkoutUrl && (
                  <a href={ordenBinance.checkoutUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-amber-600 dark:text-amber-400 underline">
                    Abrir en Binance →
                  </a>
                )}
                <p className="text-[11px] text-slate-500 dark:text-white/40 flex items-center gap-1.5">
                  <IconHourglass size={12} /> Esperando confirmación del cliente — esto se actualiza solo, no cierres esta ventana.
                </p>
              </div>
            )}
            {errorBinance && <p className="text-xs text-red-500">{errorBinance}</p>}
          </div>
        )}

        {/* Cerrar comanda */}
        {items.length > 0 && (
          <PanelCobroMixto tenantId={tenantId} total={totalLocal} monedaBase={moneda} procesando={cerrando} error={errorCierre} onCobrar={handleCerrar} montosDivididos={division} />
        )}
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COCINA (KDS)
// ══════════════════════════════════════════════════════════════════════════
function Cocina({ tenantId, onCambio, zonasCocina, onZonasCocinaGuardadas, nombreLocal }: { tenantId: number; onCambio: () => void; zonasCocina: string[]; onZonasCocinaGuardadas: () => void; nombreLocal: string }) {
  const { user } = useAuth();
  const esDueno = user?.rol === "DUENO_ADMIN";
  const [estacion, setEstacion] = useState(zonasCocina[0]);
  const [items, setItems] = useState<ItemKds[] | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  // Impresión por estación (Web Serial) — ver impresorasCocina.ts. Cada
  // zona guarda SU PROPIA impresora vinculada, para que Parrilla y Bar
  // impriman en dispositivos físicos distintos sin que nadie tenga que
  // andar leyendo una tablet en plena hora pico.
  const [impresoras, setImpresoras] = useState<ImpresoraGuardada[]>([]);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [errorImpresion, setErrorImpresion] = useState<string | null>(null);
  useEffect(() => { setImpresoras(listarImpresoras(tenantId)); }, [tenantId, estacion]);
  const impresoraDeEstacion = impresoras.find((i) => i.estacion === estacion);

  const handleVincularImpresora = async () => {
    setErrorImpresion(null);
    try {
      await vincularImpresora(tenantId, estacion);
      setImpresoras(listarImpresoras(tenantId));
    } catch (e) {
      setErrorImpresion(e instanceof Error ? e.message : "No se pudo vincular la impresora");
    }
  };

  const handleImprimirEstacion = async () => {
    setErrorImpresion(null);
    setImprimiendo(true);
    try {
      await imprimirEnEstacion(tenantId, estacion, nombreLocal, (items || []).map((i) => ({
        cantidad: Number(i.cantidad), nombrePlato: i.nombrePlato, numeroMesa: i.numeroMesa, mesero: i.mesero, notas: i.notas,
      })));
    } catch (e) {
      setErrorImpresion(e instanceof Error ? e.message : "No se pudo imprimir");
    } finally {
      setImprimiendo(false);
    }
  };
  // Edición de zonas justo acá — antes solo vivía en Configuración, escondida
  // de donde el dueño realmente la necesita (cada negocio tiene sus propias
  // estaciones, "Bar" no le sirve a todo el mundo).
  const [editandoZonas, setEditandoZonas] = useState(false);
  const [nuevaZona, setNuevaZona] = useState("");
  const [guardandoZona, setGuardandoZona] = useState(false);
  const [errorZona, setErrorZona] = useState<string | null>(null);

  const agregarZona = async () => {
    const nombre = nuevaZona.trim().toUpperCase().replace(/\s+/g, "_");
    if (!nombre || zonasCocina.includes(nombre)) { setNuevaZona(""); return; }
    setGuardandoZona(true);
    setErrorZona(null);
    try {
      await actualizarZonasCocina([...zonasCocina, nombre]);
      onZonasCocinaGuardadas();
      setNuevaZona("");
    } catch (e) {
      setErrorZona(e instanceof Error ? e.message : "No se pudo agregar la zona");
    } finally {
      setGuardandoZona(false);
    }
  };

  const eliminarZona = async (zona: string) => {
    if (zonasCocina.length <= 1) { setErrorZona("Debe quedar al menos una zona"); return; }
    setGuardandoZona(true);
    setErrorZona(null);
    try {
      await actualizarZonasCocina(zonasCocina.filter((z) => z !== zona));
      onZonasCocinaGuardadas();
    } catch (e) {
      setErrorZona(e instanceof Error ? e.message : "No se pudo eliminar la zona");
    } finally {
      setGuardandoZona(false);
    }
  };

  // Si las zonas configuradas cambian (ej. las trajo el fetch después del
  // primer render, o el dueño acaba de editarlas en Configuración) y la
  // pestaña activa ya no existe, se cae a la primera disponible.
  useEffect(() => {
    if (zonasCocina.length > 0 && !zonasCocina.includes(estacion)) setEstacion(zonasCocina[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zonasCocina]);

  const cargar = () => {
    obtenerTableroKds(estacion).then(setItems).catch(() => setItems([]));
  };
  useEffect(() => { cargar(); }, [estacion, tenantId]);
  // Repinta el temporizador de cada tarjeta sin tener que re-consultar el backend.
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const minutosEnEspera = (item: ItemKds) => Math.max(0, Math.floor((ahora - new Date(item.fechaCreacion).getTime()) / 60000));
  const estiloPorTiempo = (min: number) =>
    min >= 10 ? "bg-red-500/15 border border-red-500/40 hover:bg-red-500/25"
    : min >= 5 ? "bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25"
    : "bg-slate-100/60 dark:bg-white/5 border border-transparent hover:bg-teal-500/10";
  const colorTexto = (min: number) => (min >= 10 ? "text-red-600 dark:text-red-300" : min >= 5 ? "text-amber-600 dark:text-amber-300" : "text-slate-500 dark:text-white/40");

  const avanzar = async (item: ItemKds) => {
    const siguiente: Record<EstadoItemComanda, EstadoItemComanda | null> = {
      PENDIENTE: "PREPARANDO", PREPARANDO: "LISTO", LISTO: "ENTREGADO", ENTREGADO: null, ANULADO: null,
    };
    const next = siguiente[item.estadoItem];
    if (!next) return;
    try {
      await actualizarEstadoItem(item.id, next);
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
        {zonasCocina.map((e) => (
          editandoZonas && esDueno ? (
            <div key={e} className="flex items-center gap-1 pl-4 pr-1.5 py-1.5 rounded-full text-xs font-semibold bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-white/60">
              {e.replace(/_/g, " ")}
              <button type="button" onClick={() => eliminarZona(e)} disabled={guardandoZona} title="Eliminar zona"
                className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 cursor-pointer disabled:opacity-40">
                <IconClose size={11} />
              </button>
            </div>
          ) : (
            <button key={e} onClick={() => setEstacion(e)}
              className={`px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition-all ${estacion === e ? "g-aurora text-white" : "bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-white/50"}`}>
              {e.replace(/_/g, " ")}
            </button>
          )
        ))}
        {editandoZonas && esDueno && (
          <div className="flex items-center gap-1.5">
            <input
              value={nuevaZona}
              onChange={(ev) => setNuevaZona(ev.target.value)}
              onKeyDown={(ev) => { if (ev.key === "Enter") agregarZona(); }}
              placeholder="Ej. SUSHI"
              className="input-horeca text-xs !py-2 !w-32"
            />
            <button type="button" onClick={agregarZona} disabled={guardandoZona || !nuevaZona.trim()}
              className="apple-glass-btn text-xs font-semibold px-3 py-2 rounded-full cursor-pointer disabled:opacity-50">
              + Agregar
            </button>
          </div>
        )}
        {esDueno && (
          <button
            type="button"
            onClick={() => setEditandoZonas((v) => !v)}
            className={`px-3 py-2 rounded-full text-xs font-semibold cursor-pointer transition-all ${editandoZonas ? "bg-teal-600 text-white" : "text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"}`}
          >
            {editandoZonas ? "✓ Listo" : "✎ Editar zonas"}
          </button>
        )}
      </div>
      {errorZona && <p className="text-xs text-red-500">{errorZona}</p>}

      {/* Impresión térmica de esta estación — cada zona tiene su propia
          impresora vinculada (ver impresorasCocina.ts), para que Parrilla y
          Bar impriman en dispositivos físicos distintos. */}
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={handleImprimirEstacion} disabled={imprimiendo || (items || []).length === 0}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50">
          <IconPrinter size={14} />
          {imprimiendo ? "Imprimiendo…" : `Imprimir estación ${estacion.replace(/_/g, " ")}`}
        </button>
        <button type="button" onClick={handleVincularImpresora} className="text-[11px] font-semibold text-slate-500 dark:text-white/50 hover:text-teal-600 dark:hover:text-teal-400 cursor-pointer">
          {impresoraDeEstacion ? `Impresora vinculada (${impresoraDeEstacion.etiqueta}) — cambiar` : "Vincular impresora a esta estación"}
        </button>
      </div>
      {errorImpresion && <p className="text-xs text-red-500">{errorImpresion}</p>}

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
                    <div className="text-[10px] text-slate-500 dark:text-white/40 mt-0.5">
                      {i.numeroMesa != null ? `Mesa ${i.numeroMesa}` : i.canal === "RECOGER_EN_TIENDA" ? "Mostrador" : i.canal === "DELIVERY_PROPIO" ? "Delivery" : "Sin mesa"}
                      {i.mesero && ` · ${i.mesero}`}
                    </div>
                    {i.notas && <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">↳ {i.notas}</div>}
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
// RESERVAS DE MESA
// ══════════════════════════════════════════════════════════════════════════
const ESTILO_ESTADO_RESERVA: Record<EstadoReserva, string> = {
  PENDIENTE: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  CONFIRMADA: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  CANCELADA: "bg-red-500/15 text-red-500 line-through",
  COMPLETADA: "bg-slate-300/50 dark:bg-white/10 text-slate-500 dark:text-white/50",
};
const LABEL_ESTADO_RESERVA: Record<EstadoReserva, string> = {
  PENDIENTE: "Pendiente", CONFIRMADA: "Confirmada", CANCELADA: "Cancelada", COMPLETADA: "Completada",
};

function Reservas({ mapa }: { mapa: MapaMesaEntrada[] | null }) {
  const [fechaSel, setFechaSel] = useState(hoy());
  const [reservas, setReservas] = useState<ReservaHoreca[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<ReservaHoreca | null>(null);
  const [form, setForm] = useState({ nombreCliente: "", telefono: "", hora: "20:00", numeroPersonas: "2", numeroMesaSugerida: "", notas: "" });
  const [guardando, setGuardando] = useState(false);

  const cargar = () => listarReservasDia(fechaSel).then(setReservas).catch(() => setReservas([]));
  useEffect(() => { cargar(); }, [fechaSel]);

  const abrirNueva = () => {
    setEditando(null);
    setForm({ nombreCliente: "", telefono: "", hora: "20:00", numeroPersonas: "2", numeroMesaSugerida: "", notas: "" });
    setMostrarForm(true);
  };
  const abrirEditar = (r: ReservaHoreca) => {
    setEditando(r);
    const fh = new Date(r.fechaHora);
    setForm({
      nombreCliente: r.nombreCliente, telefono: r.telefono || "",
      hora: `${String(fh.getHours()).padStart(2, "0")}:${String(fh.getMinutes()).padStart(2, "0")}`,
      numeroPersonas: String(r.numeroPersonas), numeroMesaSugerida: r.numeroMesaSugerida ? String(r.numeroMesaSugerida) : "", notas: r.notas || "",
    });
    setMostrarForm(true);
  };

  const guardar = async () => {
    setError(null);
    if (!form.nombreCliente.trim()) { setError("El nombre del cliente es obligatorio"); return; }
    if (!form.hora) { setError("Indica la hora de la reserva"); return; }
    setGuardando(true);
    const datos = {
      nombreCliente: form.nombreCliente.trim(),
      telefono: form.telefono.trim() || undefined,
      fechaHora: `${fechaSel}T${form.hora}:00`,
      numeroPersonas: parseInt(form.numeroPersonas, 10) || 1,
      numeroMesaSugerida: form.numeroMesaSugerida ? parseInt(form.numeroMesaSugerida, 10) : undefined,
      notas: form.notas.trim() || undefined,
    };
    try {
      if (editando) await editarReserva(editando.id, datos);
      else await crearReserva(datos);
      setMostrarForm(false);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la reserva");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (r: ReservaHoreca, nuevoEstado: EstadoReserva) => {
    try {
      await cambiarEstadoReserva(r.id, nuevoEstado);
      cargar();
    } catch {
      alert("No se pudo actualizar la reserva — revisa tu conexión e inténtalo de nuevo.");
    }
  };

  const reservasOrdenadas = (reservas || []).slice().sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  const fechaBonita = new Date(fechaSel + "T00:00:00").toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => setFechaSel((f) => sumarDiasStr(f, -1))}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300/60 dark:border-white/10 text-xs font-bold hover:bg-white/10 text-slate-700 dark:text-white/80 cursor-pointer flex items-center gap-1">
            <IconChevronLeft size={14} /> <span className="hidden sm:inline">Anterior</span>
          </button>
          <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300/60 dark:border-white/10 bg-white/40 dark:bg-black/20 text-xs font-bold text-slate-800 dark:text-white">
            <IconCalendar size={14} className="text-teal-500 shrink-0" />
            <input type="date" value={fechaSel} onChange={(e) => e.target.value && setFechaSel(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold focus:outline-none cursor-pointer text-slate-800 dark:text-white" />
          </div>
          <button type="button" onClick={() => setFechaSel((f) => sumarDiasStr(f, 1))}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300/60 dark:border-white/10 text-xs font-bold hover:bg-white/10 text-slate-700 dark:text-white/80 cursor-pointer flex items-center gap-1">
            <span className="hidden sm:inline">Siguiente</span> <IconChevronRight size={14} />
          </button>
          <button type="button" onClick={() => setFechaSel(hoy())}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 cursor-pointer">
            Hoy
          </button>
        </div>
        <button onClick={abrirNueva} className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">+ Nueva reserva</button>
      </div>

      <p className="text-sm text-slate-500 dark:text-white/40 capitalize">{fechaBonita} · {reservasOrdenadas.filter((r) => r.estado !== "CANCELADA").length} reserva(s)</p>

      {mostrarForm && (
        <div className="apple-glass rounded-2xl p-5 space-y-3">
          <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">{editando ? "Editar reserva" : "Nueva reserva"}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="Nombre del cliente"><input value={form.nombreCliente} onChange={(e) => setForm({ ...form, nombreCliente: e.target.value })} placeholder="Ej. Familia Rodríguez" className="input-horeca" /></Campo>
            <Campo label="Teléfono (opcional)"><input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="0412-1234567" className="input-horeca" /></Campo>
            <Campo label="Hora"><input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} className="input-horeca" /></Campo>
            <Campo label="Número de personas"><input type="number" min="1" value={form.numeroPersonas} onChange={(e) => setForm({ ...form, numeroPersonas: e.target.value })} className="input-horeca" /></Campo>
            <Campo label="Mesa sugerida (opcional)">
              <select value={form.numeroMesaSugerida} onChange={(e) => setForm({ ...form, numeroMesaSugerida: e.target.value })} className="input-horeca w-full">
                <option value="">Sin asignar todavía</option>
                {(mapa || []).map((m) => <option key={m.mesa.id} value={m.mesa.numero}>Mesa {m.mesa.numero}{m.mesa.capacidad ? ` (${m.mesa.capacidad}p)` : ""}</option>)}
              </select>
            </Campo>
            <Campo label="Notas (opcional)"><input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder='Ej. "Cumpleaños, pidió torta"' className="input-horeca" /></Campo>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button onClick={guardar} disabled={guardando} className="btn-cyber-neon text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
              {guardando ? "Guardando…" : "Guardar reserva"}
            </button>
            <button onClick={() => setMostrarForm(false)} className="apple-glass-btn text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer">Cancelar</button>
          </div>
        </div>
      )}

      {reservas === null ? (
        <p className="text-xs text-slate-400">Cargando…</p>
      ) : reservasOrdenadas.length === 0 ? (
        <div className="apple-glass rounded-2xl p-8 text-center">
          <p className="text-slate-500 dark:text-white/40 text-sm">No hay reservas para este día. Usa "+ Nueva reserva" para agendar una.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {reservasOrdenadas.map((r) => (
            <div key={r.id} className={`apple-glass rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap ${r.estado === "CANCELADA" ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-4">
                <div className="text-center flex-shrink-0 w-14">
                  <div className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">{new Date(r.fechaHora).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{r.nombreCliente}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${ESTILO_ESTADO_RESERVA[r.estado]}`}>{LABEL_ESTADO_RESERVA[r.estado]}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-white/40 flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="flex items-center gap-1"><IconUsers size={12} /> {r.numeroPersonas} pax</span>
                    {r.telefono && <span className="flex items-center gap-1"><IconPhone size={12} /> {r.telefono}</span>}
                    {r.numeroMesaSugerida && <span className="px-1.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10">Mesa {r.numeroMesaSugerida}</span>}
                  </div>
                  {r.notas && <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">↳ {r.notas}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {r.estado === "PENDIENTE" && (
                  <button onClick={() => cambiarEstado(r, "CONFIRMADA")} className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 cursor-pointer">Confirmar</button>
                )}
                {(r.estado === "PENDIENTE" || r.estado === "CONFIRMADA") && (
                  <button onClick={() => cambiarEstado(r, "COMPLETADA")} className="text-[11px] font-semibold text-slate-500 dark:text-white/50 cursor-pointer">Llegó</button>
                )}
                {r.estado !== "CANCELADA" && r.estado !== "COMPLETADA" && (
                  <button onClick={() => cambiarEstado(r, "CANCELADA")} className="text-[11px] font-semibold text-red-500 hover:text-red-600 cursor-pointer">Cancelar</button>
                )}
                <button onClick={() => abrirEditar(r)} className="text-[11px] font-semibold text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white cursor-pointer">Editar</button>
              </div>
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
function Recetas({
  tenantId, escandallos, articulos, onCambio, tasaCop, tasaBcv, zonasCocina,
}: {
  tenantId: number;
  escandallos: EscandalloReceta[] | null;
  articulos: Articulo[] | null;
  onCambio: () => void;
  tasaCop?: TasaCambio | null;
  tasaBcv?: TasaCambio | null;
  zonasCocina: string[];
}) {
  const [monedaReceta, setMonedaReceta] = useState("USD");
  useEffect(() => { obtenerMonedaBaseNegocio().then(r => { if (r?.monedaBase) setMonedaReceta(r.monedaBase); }); }, [tenantId]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ nombrePlato: "", estacionCocina: zonasCocina[0] || "COCINA", precioVenta: "", requiereCocina: true });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editandoReceta, setEditandoReceta] = useState<EscandalloReceta | null>(null);
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
      const nueva = await crearEscandallo(tenantId, { nombrePlato: form.nombrePlato.trim(), estacionCocina: form.estacionCocina, precioVenta: Number(form.precioVenta), requiereCocina: form.requiereCocina });
      setForm({ nombrePlato: "", estacionCocina: "COCINA", precioVenta: "", requiereCocina: true });
      setMostrarForm(false);
      onCambio();
      // Abrir inmediatamente el modal para cargar ingredientes
      if (nueva && nueva.id) {
        setEditandoReceta(nueva);
      }
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
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Catálogo de Recetas & Escandallos</h3>
          <p className="text-xs text-slate-500 dark:text-white/50">{(escandallos || []).length} recetas registradas · costeo en vivo según inventario</p>
        </div>
        <button onClick={() => setMostrarForm((v) => !v)} className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
          {mostrarForm ? "Cancelar" : "+ Nueva receta"}
        </button>
      </div>

      {mostrarForm && (
        <div className="apple-glass rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={form.nombrePlato} onChange={(e) => setForm({ ...form, nombrePlato: e.target.value })} placeholder="Nombre del plato" className="input-horeca" />
            <select value={form.estacionCocina} onChange={(e) => setForm({ ...form, estacionCocina: e.target.value })} className="input-horeca">
              {zonasCocina.map((e) => <option key={e} value={e}>{e.replace(/_/g, " ")}</option>)}
            </select>
            <input value={form.precioVenta} onChange={(e) => setForm({ ...form, precioVenta: e.target.value })} type="number" step="0.01" placeholder={`Precio de venta (${monedaReceta || "cargando"})`} className="input-horeca" />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/60 cursor-pointer w-fit">
            <input type="checkbox" checked={form.requiereCocina} onChange={(e) => setForm({ ...form, requiereCocina: e.target.checked })} className="cursor-pointer" />
            Necesita preparación de cocina (desmarcar para bebida embotellada, snack o combo sin cocción)
          </label>
          <button onClick={crear} disabled={guardando} className="btn-cyber-neon text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {guardando ? "Creando…" : "Crear receta y configurar escandallo"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-amber-600 dark:text-amber-400 apple-glass rounded-xl p-3">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(escandallos || []).map((e) => {
          const costoNum = Number(e.costoTotalProduccion || 0);
          const tieneCosto = costoNum > 0;
          const precioNum = Number(e.precioVenta || 0);
          const margen = precioNum - costoNum;
          const margenPct = precioNum > 0 ? (margen / precioNum) * 100 : 0;
          const inactivo = e.activo === false;

          return (
            <div key={e.id} onClick={() => setEditandoReceta(e)}
              className={`apple-glass rounded-2xl p-5 hover-card cursor-pointer space-y-2.5 transition-all ${inactivo ? "opacity-50 border-dashed" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate" title={e.nombrePlato}>
                  {e.nombrePlato}
                  {inactivo && <span className="ml-1.5 text-[9px] font-normal text-slate-400">(oculta)</span>}
                </h4>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-white/40">{e.estacionCocina}</span>
                  {/* Botón de edición explícito */}
                  <button onClick={(ev) => { ev.stopPropagation(); setEditandoReceta(e); }}
                    title="Editar datos, ingredientes y escandallo"
                    className="text-slate-400 hover:text-sky-500 cursor-pointer p-1 rounded-lg hover:bg-sky-500/10 transition-colors">
                    <IconEdit size={13} />
                  </button>
                  <button onClick={(ev) => alternarActivo(ev, e)} disabled={eliminandoId === e.id}
                    title={inactivo ? "Mostrar de nuevo en Venta Rápida" : "Ocultar de Venta Rápida (sin borrar)"}
                    className="text-slate-400 hover:text-teal-500 cursor-pointer p-1 rounded-lg hover:bg-teal-500/10 transition-colors disabled:opacity-40">
                    {inactivo ? <IconCheckCircle size={13} /> : <IconClose size={13} />}
                  </button>
                  <button onClick={(ev) => eliminar(ev, e)} disabled={eliminandoId === e.id} title="Eliminar receta"
                    className="text-slate-400 hover:text-red-500 cursor-pointer p-1 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-40">
                    <IconTrash size={13} />
                  </button>
                </div>
              </div>

              {/* Precios y Costos — con aviso explícito cuando tiene 0 ingredientes */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/50">
                  Precio: <strong className="text-slate-900 dark:text-white">${precioNum.toFixed(2)}</strong>
                </span>
                <span className="text-right">
                  {tieneCosto ? (
                    <span className="text-slate-500 dark:text-white/50">
                      Costo: <strong className="text-slate-900 dark:text-white font-mono">${costoNum.toFixed(2)}</strong>
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                      Costo: sin calcular · falta cargar ingredientes
                    </span>
                  )}
                </span>
              </div>

              {/* Margen */}
              <div className="flex items-center justify-between text-xs">
                {tieneCosto ? (
                  <div className={`font-semibold ${margen >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                    Margen: ${margen.toFixed(2)} <span className="text-[10px] font-normal opacity-80">({margenPct.toFixed(1)}%)</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 dark:text-white/30 italic">
                    Margen: pendiente de insumos
                  </span>
                )}
                <span className="text-[10px] text-sky-500/80 hover:underline">Ver escandallo →</span>
              </div>

              <div className="pt-1">
                <button onClick={(ev) => alternarRequiereCocina(ev, e)} disabled={eliminandoId === e.id}
                  title="Si se desmarca, esta venta no pasa por el tablero de cocina — queda entregada de una vez"
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer disabled:opacity-40 transition-colors ${
                    e.requiereCocina !== false ? "bg-sky-500/15 text-sky-600 dark:text-sky-300" : "bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-white/40"
                  }`}>
                  {e.requiereCocina !== false ? (
                    <span className="inline-flex items-center gap-1">
                      <IconHourglass size={10} />
                      <span>Pasa por cocina</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <IconBolt size={10} />
                      <span>Entrega directa</span>
                    </span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editandoReceta && (
        <ModalEditarReceta
          tenantId={tenantId}
          escandallo={editandoReceta}
          articulos={articulos}
          escandallos={escandallos}
          tasaCop={tasaCop}
          tasaBcv={tasaBcv}
          onClose={() => setEditandoReceta(null)}
          onCambio={onCambio}
          zonasCocina={zonasCocina}
        />
      )}
    </div>
  );
}

function ModalEditarReceta({
  tenantId, escandallo, articulos, escandallos, onClose, onCambio, tasaCop, tasaBcv, zonasCocina,
}: {
  tenantId: number;
  escandallo: EscandalloReceta;
  articulos: Articulo[] | null;
  escandallos: EscandalloReceta[] | null;
  onClose: () => void;
  onCambio: () => void;
  tasaCop?: TasaCambio | null;
  tasaBcv?: TasaCambio | null;
  zonasCocina: string[];
}) {
  const [monedaReceta, setMonedaReceta] = useState("");
  const [articuloCosteando, setArticuloCosteando] = useState<Articulo | null>(null);
  useEffect(() => { obtenerMonedaBaseNegocio().then(r => setMonedaReceta(r.monedaBase)).catch(() => setError("No se pudo consultar la moneda de costeo")); }, [tenantId]);
  const [receta, setReceta] = useState<EscandalloReceta>(escandallo);
  const [ingredientes, setIngredientes] = useState<DetalleReceta[] | null>(null);

  // Tasas de cambio activas para conversión lógica (USD base del plato)
  const [tasaCopEstado, setTasaCopEstado] = useState<number>(() => {
    if (tasaCop && Number(tasaCop.tasa) > 0) return Number(tasaCop.tasa);
    try {
      const g = localStorage.getItem("aurora_tasa_cop_val");
      if (g && Number(g) > 0) return Number(g);
    } catch {}
    return 4000;
  });

  const [tasaVesEstado, setTasaVesEstado] = useState<number>(() => {
    if (tasaBcv && Number(tasaBcv.tasa) > 0) return Number(tasaBcv.tasa);
    try {
      const g = localStorage.getItem("aurora_tasa_usdt_val");
      if (g && Number(g) > 0) return Number(g);
    } catch {}
    return 60;
  });

  useEffect(() => {
    if (tasaCop && Number(tasaCop.tasa) > 0) {
      setTasaCopEstado(Number(tasaCop.tasa));
    } else {
      tasaVigente(tenantId, "USD", "COP")
        .then((t) => { if (t && Number(t.tasa) > 0) setTasaCopEstado(Number(t.tasa)); })
        .catch(() => {});
    }
    if (tasaBcv && Number(tasaBcv.tasa) > 0) {
      setTasaVesEstado(Number(tasaBcv.tasa));
    } else {
      tasaVigente(tenantId, "USD", "VES")
        .then((t) => { if (t && Number(t.tasa) > 0) setTasaVesEstado(Number(t.tasa)); })
        .catch(() => {});
    }
  }, [tenantId, tasaCop, tasaBcv]);

  // Detección inteligente de la moneda de compra del insumo
  const detectarMonedaInsumo = (art: Articulo): "COP" | "USD" | "VES" => {
    const m = (art.monedaCosto || "").toUpperCase().trim();
    if (m === "COP" || m === "VES" || m === "USD") return m as any;
    const cost = Number(art.costoUnitarioOriginal || art.costoUnitario || 0);
    if (cost >= 100) return "COP";
    return "USD";
  };

  // Normalizar monto en COP (si se guardó con punto de miles como 1.450 en vez de 1450)
  const normalizarMontoInsumo = (art: Articulo, moneda: "COP" | "USD" | "VES"): number => {
    let val = Number(art.costoUnitarioOriginal || art.costoUnitario || 0);
    if (moneda === "COP" && val > 0 && val < 50) {
      val = Math.round(val * 1000);
    }
    return val;
  };

  // Convertir costo a la moneda del plato (USD) dividiendo lógicamente entre la tasa de cambio
  const convertirCostoAMonedaPlato = (montoOriginal: number, moneda: "COP" | "USD" | "VES"): number => {
    if (moneda === "COP") {
      const tasa = tasaCopEstado > 0 ? tasaCopEstado : 4000;
      return montoOriginal / tasa;
    }
    if (moneda === "VES") {
      const tasa = tasaVesEstado > 0 ? tasaVesEstado : 60;
      return montoOriginal / tasa;
    }
    return montoOriginal;
  };

  // Formulario de edición de datos de la receta
  const [nombrePlato, setNombrePlato] = useState(escandallo.nombrePlato || "");
  const [estacionCocina, setEstacionCocina] = useState(escandallo.estacionCocina || "COCINA");
  const [precioVenta, setPrecioVenta] = useState(String(escandallo.precioVenta ?? ""));
  const [requiereCocina, setRequiereCocina] = useState(escandallo.requiereCocina ?? true);
  const [guardandoPlato, setGuardandoPlato] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edición en línea de una fila de ingrediente
  const [editandoDetalleId, setEditandoDetalleId] = useState<number | null>(null);
  const [editPesoNeto, setEditPesoNeto] = useState("");
  const [editMerma, setEditMerma] = useState("0");
  const [guardandoDetalle, setGuardandoDetalle] = useState(false);

  // Formulario para nuevo ingrediente
  const [tipoNuevo, setTipoNuevo] = useState<"articulo" | "subreceta">("articulo");
  const [nuevoArticuloId, setNuevoArticuloId] = useState("");
  const [monedaCompraSel, setMonedaCompraSel] = useState<"COP" | "USD" | "VES">("COP");
  const [costoCompraSel, setCostoCompraSel] = useState<string>("");
  const [nuevoSubRecetaId, setNuevoSubRecetaId] = useState("");
  const [nuevoPesoNeto, setNuevoPesoNeto] = useState("");
  const [nuevoMerma, setNuevoMerma] = useState("0");
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

  const onSelectArticulo = (artId: string) => {
    setNuevoArticuloId(artId);
    const art = (articulos || []).find((a) => String(a.id) === artId);
    if (art) {
      const m = detectarMonedaInsumo(art);
      setMonedaCompraSel(m);
      const val = normalizarMontoInsumo(art, m);
      setCostoCompraSel(String(val));
    } else {
      setCostoCompraSel("");
    }
  };

  const cargarIngredientes = () => {
    listarIngredientesEscandallo(tenantId, escandallo.id)
      .then(setIngredientes)
      .catch(() => setIngredientes([]));
  };

  useEffect(() => {
    cargarIngredientes();
  }, [escandallo.id]);

  // Guardar datos básicos de la receta (nombre, precio, estación, cocina)
  const guardarDatosPlato = async () => {
    if (!nombrePlato.trim() || !precioVenta) {
      setError("Nombre del plato y precio de venta son obligatorios");
      return;
    }
    setGuardandoPlato(true);
    setError(null);
    try {
      const actualizada = await editarEscandallo(tenantId, receta.id, {
        nombrePlato: nombrePlato.trim(),
        estacionCocina,
        precioVenta: Number(precioVenta),
        requiereCocina,
      });
      setReceta(actualizada);
      setMensajeExito("Datos de la receta guardados correctamente");
      setTimeout(() => setMensajeExito(null), 3000);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar la receta");
    } finally {
      setGuardandoPlato(false);
    }
  };

  // Iniciar edición en línea de un ingrediente
  const iniciarEdicionDetalle = (d: DetalleReceta) => {
    setEditandoDetalleId(d.id);
    setEditPesoNeto(d.pesoNeto != null ? String(d.pesoNeto) : String(d.cantidadRequerida));
    setEditMerma(d.porcentajeMerma != null ? String(d.porcentajeMerma) : "0");
    setError(null);
  };

  const cancelarEdicionDetalle = () => {
    setEditandoDetalleId(null);
    setEditPesoNeto("");
    setEditMerma("0");
  };

  // Guardar edición de un ingrediente
  const guardarEdicionDetalle = async (detalleId: number) => {
    const neto = parseFloat(editPesoNeto);
    const merma = parseFloat(editMerma) || 0;
    if (isNaN(neto) || neto <= 0) {
      setError("La cantidad/peso debe ser mayor a cero");
      return;
    }
    setGuardandoDetalle(true);
    setError(null);
    try {
      const actualizada = await editarIngredienteEscandallo(tenantId, receta.id, detalleId, {
        pesoNeto: neto,
        porcentajeMerma: merma,
      });
      setReceta(actualizada);
      setEditandoDetalleId(null);
      cargarIngredientes();
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo editar el ingrediente");
    } finally {
      setGuardandoDetalle(false);
    }
  };

  // Eliminar un ingrediente
  const eliminarDetalle = async (detalleId: number, nombreInsumo: string) => {
    if (!window.confirm(`¿Quitar "${nombreInsumo}" de esta receta?`)) return;
    setError(null);
    try {
      const actualizada = await eliminarIngredienteEscandallo(tenantId, receta.id, detalleId);
      setReceta(actualizada);
      cargarIngredientes();
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el ingrediente");
    }
  };

  // Agregar nuevo ingrediente directo o sub-receta
  const agregarNuevoIngrediente = async () => {
    const neto = parseFloat(nuevoPesoNeto);
    const merma = parseFloat(nuevoMerma) || 0;

    if (isNaN(neto) || neto <= 0) {
      setError("Indica una cantidad mayor a cero");
      return;
    }

    if (tipoNuevo === "articulo") {
      const art = (articulos || []).find((a) => String(a.id) === nuevoArticuloId);
      if (!art) { setError("Selecciona un insumo de inventario"); return; }
      setGuardandoNuevo(true);
      setError(null);
      try {
        const costoCompraNum = parseFloat(costoCompraSel) || normalizarMontoInsumo(art, monedaCompraSel);
        const unitUsd = convertirCostoAMonedaPlato(costoCompraNum, monedaCompraSel);

        // Si la moneda o costo difiere de lo que tenía el insumo, sincronizarlo
        if (art.monedaCosto !== monedaCompraSel || Number(art.costoUnitario) !== unitUsd) {
          editarArticulo(art.id, {
            costoUnitario: unitUsd,
            monedaCosto: monedaCompraSel,
          }).catch(() => {});
          art.monedaCosto = monedaCompraSel;
          art.costoUnitario = unitUsd;
          art.costoUnitarioOriginal = costoCompraNum;
        }

        const actualizada = await agregarIngredienteEscandallo(tenantId, receta.id, {
          ingredienteSku: art.sku,
          pesoNeto: neto,
          porcentajeMerma: merma,
        });
        setReceta(actualizada);
        setNuevoArticuloId("");
        setNuevoPesoNeto("");
        setNuevoMerma("0");
        setCostoCompraSel("");
        cargarIngredientes();
        onCambio();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo agregar el ingrediente");
      } finally {
        setGuardandoNuevo(false);
      }
    } else {
      const subId = Number(nuevoSubRecetaId);
      if (!subId) { setError("Selecciona una sub-receta"); return; }
      setGuardandoNuevo(true);
      setError(null);
      try {
        const actualizada = await agregarIngredienteEscandallo(tenantId, receta.id, {
          subEscandalloId: subId,
          cantidadRequerida: neto,
        });
        setReceta(actualizada);
        setNuevoSubRecetaId("");
        setNuevoPesoNeto("");
        setNuevoMerma("0");
        cargarIngredientes();
        onCambio();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo agregar la sub-receta");
      } finally {
        setGuardandoNuevo(false);
      }
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // CÁLCULO DE COSTEO EN VIVO (HOJA DE CÁLCULO EN TIEMPO REAL)
  // ══════════════════════════════════════════════════════════════════════════
  const calcularMetricasLinea = (d: DetalleReceta) => {
    const isEditing = d.id === editandoDetalleId;
    let cantBruta = Number(d.cantidadRequerida || 0);
    let unitCost = 0;
    let unidad = "";
    let nombre = "";
    let esSubReceta = false;
    let articuloOrigen: Articulo | undefined;

    if (d.subReceta) {
      esSubReceta = true;
      const sub = (escandallos || []).find((s) => s.id === d.subReceta?.id) || d.subReceta;
      unitCost = Number(sub?.costoTotalProduccion || 0);
      unidad = "ración/unidad";
      nombre = sub?.nombrePlato || "Sub-receta";
    } else {
      const art = (articulos || []).find((a) => a.sku === d.ingredienteSku);
      // costoUnitario del artículo YA está normalizado a la moneda base del negocio
      // (ver ArticuloController) — no hace falta re-detectar ni reconvertir su
      // moneda de compra acá; eso solo serviría para mostrar el detalle original,
      // que ya se ve en la columna "Costo unitario" vía costoUnitarioOriginal.
      articuloOrigen = art;
      unitCost = Number(art?.costoUnitario || 0);
      unidad = art?.unidadMedida || "ud";
      nombre = art?.nombre || d.ingredienteSku || "Artículo";
    }

    if (isEditing) {
      const neto = parseFloat(editPesoNeto) || 0;
      const merma = parseFloat(editMerma) || 0;
      if (neto > 0) {
        cantBruta = merma < 100 ? neto / (1 - merma / 100) : neto;
      }
    }

    const costoLinea = cantBruta * unitCost;

    return {
      nombre,
      unidad,
      unitCost,
      cantBruta,
      costoLinea,
      esSubReceta,
      articuloOrigen,
      isEditing,
    };
  };

  const desgloseLineas = useMemo(() => {
    return (ingredientes || []).map(calcularMetricasLinea);
  }, [ingredientes, editandoDetalleId, editPesoNeto, editMerma, articulos, escandallos, tasaCopEstado, tasaVesEstado]);

  const costoTotalEnVivo = useMemo(() => {
    return desgloseLineas.reduce((acc, curr) => acc + curr.costoLinea, 0);
  }, [desgloseLineas]);

  const costosRevisados = !!monedaReceta && desgloseLineas.every(l => l.esSubReceta || l.articuloOrigen?.monedaValoracion === monedaReceta);
  const precioNumEnVivo = parseFloat(precioVenta) || 0;
  const margenEnVivo = precioNumEnVivo - costoTotalEnVivo;
  const margenPctEnVivo = precioNumEnVivo > 0 ? (margenEnVivo / precioNumEnVivo) * 100 : 0;
  const tieneIngredientes = (ingredientes || []).length > 0;

  // Vista previa de costo del nuevo insumo antes de agregarlo
  const previewNuevo = useMemo(() => {
    const neto = parseFloat(nuevoPesoNeto) || 0;
    const merma = parseFloat(nuevoMerma) || 0;
    if (neto <= 0) return null;
    const cantBruta = merma < 100 ? neto / (1 - merma / 100) : neto;

    if (tipoNuevo === "articulo") {
      const art = (articulos || []).find((a) => String(a.id) === nuevoArticuloId);
      if (!art) return null;
      const costoCompraNum = parseFloat(costoCompraSel) || normalizarMontoInsumo(art, monedaCompraSel);
      const unitUsd = convertirCostoAMonedaPlato(costoCompraNum, monedaCompraSel);
      return {
        cantBruta,
        unit: unitUsd,
        costo: cantBruta * unitUsd,
        unidad: art.unidadMedida || "ud",
        monedaCompra: monedaCompraSel,
        costoCompra: costoCompraNum,
      };
    } else {
      const sub = (escandallos || []).find((s) => String(s.id) === nuevoSubRecetaId);
      if (!sub) return null;
      const unit = Number(sub.costoTotalProduccion || 0);
      return {
        cantBruta: neto,
        unit,
        costo: neto * unit,
        unidad: "ración",
        monedaCompra: "USD" as const,
        costoCompra: unit,
      };
    }
  }, [tipoNuevo, nuevoArticuloId, nuevoSubRecetaId, nuevoPesoNeto, nuevoMerma, articulos, escandallos, costoCompraSel, monedaCompraSel, tasaCopEstado, tasaVesEstado]);

  return (
    <Modal onClose={onClose} titulo={`Editar Receta & Escandallo — ${receta.nombrePlato}`} ancho="max-w-4xl">
      <div className="space-y-5">
        {articuloCosteando && <ModalEditarArticulo tenantId={tenantId} articulo={articuloCosteando} onClose={() => setArticuloCosteando(null)} onGuardado={() => { setArticuloCosteando(null); onCambio(); }} />}
        {/* Notificaciones */}
        {error && <div className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</div>}
        {mensajeExito && <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">{mensajeExito}</div>}

        {/* 1. SECCIÓN: DATOS BÁSICOS DEL PLATO */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Datos del Plato</span>
            <button onClick={guardarDatosPlato} disabled={guardandoPlato}
              className="btn-cyber-neon text-white text-xs font-semibold px-4 py-1.5 rounded-lg cursor-pointer disabled:opacity-50">
              {guardandoPlato ? "Guardando…" : "Guardar cambios del plato"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-white/50 mb-1">Nombre del plato</label>
              <input value={nombrePlato} onChange={(e) => setNombrePlato(e.target.value)} className="input-horeca w-full" placeholder="Ej. Torta de Chocolate" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-white/50 mb-1">Estación de Cocina</label>
              <select value={estacionCocina} onChange={(e) => setEstacionCocina(e.target.value)} className="input-horeca w-full">
                {zonasCocina.map((est) => <option key={est} value={est}>{est.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-white/50 mb-1">Precio de venta ({monedaReceta || "cargando"})</label>
              <input value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} type="number" step="0.01" className="input-horeca w-full font-bold" placeholder="0.00" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/60 cursor-pointer pt-1">
            <input type="checkbox" checked={requiereCocina} onChange={(e) => setRequiereCocina(e.target.checked)} className="cursor-pointer" />
            <span>Pasa por tablero de cocina KDS (desmarcar para bebidas o despacho directo)</span>
          </label>
        </div>

        {/* 2. SECCIÓN: TABLERO DE COSTEO EN VIVO (HOJA DE CÁLCULO) */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm text-slate-900">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Costeo en Tiempo Real</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {tieneIngredientes ? `${desgloseLineas.length} insumo(s) costeados` : "Sin ingredientes"}
            </span>
          </div>

          {!tieneIngredientes ? (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between">
              <div>
                <strong className="text-amber-700 text-sm block">Costo: sin calcular · falta cargar ingredientes</strong>
                <span className="text-xs text-slate-600">Agrega abajo los ingredientes del inventario para ver el costo exacto y margen en vivo.</span>
              </div>
              <span className="text-xs bg-amber-200 text-amber-800 px-3 py-1 rounded-full font-mono">Margen pendiente</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Costo Total */}
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                <span className="text-[11px] text-slate-500 uppercase font-semibold block">Costo de Producción</span>
                <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                  {costosRevisados ? fmtCostoEnMoneda(costoTotalEnVivo, monedaReceta) : "Revisar costos"}
                </div>
                <span className="text-[10px] text-slate-500">Calculado desde inventario real</span>
              </div>

              {/* Precio de Venta */}
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                <span className="text-[11px] text-slate-500 uppercase font-semibold block">Precio de Venta</span>
                <div className="text-xl font-bold font-mono text-teal-600 mt-1">
                  {fmtCostoEnMoneda(precioNumEnVivo, monedaReceta)}
                </div>
                <span className="text-[10px] text-slate-500">Definido en el plato</span>
              </div>

              {/* Margen Resultante */}
              <div className={`rounded-xl p-3 border shadow-sm ${
                margenEnVivo >= 0
                  ? (margenPctEnVivo >= 40 ? "bg-emerald-50 border-emerald-300" : "bg-amber-50 border-amber-300")
                  : "bg-red-50 border-red-300"
              }`}>
                <span className="text-[11px] text-slate-600 uppercase font-semibold block">Margen de Ganancia</span>
                <div className={`text-xl font-bold font-mono mt-1 flex items-baseline gap-2 ${
                  margenEnVivo >= 0 ? (margenPctEnVivo >= 40 ? "text-emerald-600" : "text-amber-600") : "text-red-600"
                }`}>
                  <span>{costosRevisados ? fmtCostoEnMoneda(margenEnVivo, monedaReceta) : "Pendiente"}</span>
                  <span className="text-xs font-semibold">{costosRevisados ? `(${fmtNumero(margenPctEnVivo)}%)` : ""}</span>
                </div>
                <span className="text-[10px] text-slate-600">
                  {!costosRevisados ? "Confirma la moneda y tasa de los ingredientes" : margenEnVivo < 0 ? "El costo supera el precio de venta" : "Margen bruto por ración"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 3. SECCIÓN: TABLA DE INGREDIENTES CON EDICIÓN Y ELIMINACIÓN */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              Ingredientes & Desglose ({desgloseLineas.length})
            </span>
            <span className="text-[11px] text-slate-400">Puedes editar cantidades o quitar ingredientes directamente</span>
          </div>

          {ingredientes === null ? (
            <p className="text-xs text-slate-400 py-4 text-center">Cargando escandallo…</p>
          ) : ingredientes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-400 space-y-1">
              <p className="text-sm font-medium">Esta receta aún no tiene ingredientes cargados.</p>
              <p className="text-xs text-slate-500">Utiliza el formulario siguiente para agregar insumos desde tu inventario.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50">
                    <th className="py-2.5 px-3">Insumo / Artículo</th>
                    <th className="py-2.5 px-3">Costo Unitario</th>
                    <th className="py-2.5 px-3">Cantidad / Merma</th>
                    <th className="py-2.5 px-3 text-right">Costo Línea</th>
                    <th className="py-2.5 px-3 text-center w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                  {ingredientes.map((d) => {
                    const met = calcularMetricasLinea(d);
                    const isEditing = d.id === editandoDetalleId;

                    return (
                      <tr key={d.id} className={isEditing ? "bg-[#35d7c3]/5 dark:bg-[#35d7c3]/10" : "hover:bg-slate-50 dark:hover:bg-white/5"}>
                        {/* Nombre del insumo */}
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                          <div>{met.nombre}</div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {met.esSubReceta ? "Sub-receta" : `SKU: ${d.ingredienteSku}`}
                          </span>
                        </td>

                        {/* Costo unitario */}
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-white/60">
                          {met.articuloOrigen?.costoUnitarioOriginal != null
                            ? fmtCostoEnMoneda(met.articuloOrigen.costoUnitarioOriginal, met.articuloOrigen.monedaCosto)
                            : fmtCostoEnMoneda(met.unitCost, monedaReceta)} / {met.unidad}
                          <div className="text-[10px] text-slate-500 mt-1">{met.esSubReceta || met.articuloOrigen?.monedaValoracion === monedaReceta
                            ? `Valorado en ${fmtCostoEnMoneda(met.unitCost, monedaReceta)}` : "Moneda de valoración por confirmar"}</div>
                          {met.articuloOrigen && <button type="button" className="text-teal-700 underline text-xs mt-1" onClick={() => setArticuloCosteando(met.articuloOrigen!)}>Revisar costo y tasa</button>}
                        </td>

                        {/* Cantidad requerida (modo vista o modo edición) */}
                        <td className="py-2.5 px-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <div>
                                <input value={editPesoNeto} onChange={(e) => setEditPesoNeto(e.target.value)}
                                  type="number" step="0.001" className="input-horeca w-20 py-1 text-xs font-mono" placeholder="Cant" />
                                <span className="text-[9px] text-slate-400 block">Neto ({met.unidad})</span>
                              </div>
                              {!met.esSubReceta && (
                                <div>
                                  <input value={editMerma} onChange={(e) => setEditMerma(e.target.value)}
                                    type="number" step="0.1" className="input-horeca w-16 py-1 text-xs font-mono" placeholder="% merma" />
                                  <span className="text-[9px] text-slate-400 block">% Merma</span>
                                </div>
                              )}
                              <span className="text-[10px] font-mono text-teal-500">
                                → Bruto: {met.cantBruta.toFixed(3)}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="font-mono font-bold text-slate-800 dark:text-white">
                                {Number(d.cantidadRequerida).toFixed(3)} {met.unidad}
                              </span>
                              {d.porcentajeMerma != null && Number(d.porcentajeMerma) > 0 && (
                                <span className="text-[10px] text-amber-500 ml-1.5 font-medium">
                                  ({Number(d.porcentajeMerma).toFixed(1)}% merma)
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Costo de la línea en vivo */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {met.esSubReceta || met.articuloOrigen?.monedaValoracion === monedaReceta ? fmtCostoEnMoneda(met.costoLinea, monedaReceta) : "Por revisar"}
                        </td>

                        {/* Acciones */}
                        <td className="py-2.5 px-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => guardarEdicionDetalle(d.id)} disabled={guardandoDetalle}
                                title="Guardar cantidad"
                                className="text-emerald-500 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-500/10 cursor-pointer disabled:opacity-40">
                                <IconCheck size={14} />
                              </button>
                              <button onClick={cancelarEdicionDetalle}
                                title="Cancelar"
                                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-500/10 cursor-pointer">
                                <IconClose size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => iniciarEdicionDetalle(d)}
                                title="Editar cantidad o merma"
                                className="text-slate-400 hover:text-teal-500 p-1.5 rounded-lg hover:bg-teal-500/10 cursor-pointer">
                                <IconEdit size={13} />
                              </button>
                              <button onClick={() => eliminarDetalle(d.id, met.nombre)}
                                title="Eliminar ingrediente de la receta"
                                className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 cursor-pointer">
                                <IconTrash size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 4. SECCIÓN: AGREGAR NUEVO INGREDIENTE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              + Agregar Ingrediente o Sub-receta
            </span>
            <div className="flex gap-2 text-xs">
              <button onClick={() => { setTipoNuevo("articulo"); setError(null); }}
                className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                  tipoNuevo === "articulo" ? "btn-cyber-neon" : "bg-slate-100 text-slate-600"
                }`}>
                Insumo de Inventario
              </button>
              <button onClick={() => { setTipoNuevo("subreceta"); setError(null); }}
                className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                  tipoNuevo === "subreceta" ? "btn-cyber-neon" : "bg-slate-100 text-slate-600"
                }`}>
                Sub-receta
              </button>
            </div>
          </div>

          {tipoNuevo === "articulo" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-white/50 mb-1">Insumo del inventario</label>
                  <select
                    value={nuevoArticuloId}
                    onChange={(e) => onSelectArticulo(e.target.value)}
                    className="input-horeca w-full text-xs font-medium"
                  >
                    <option value="">— Elegir insumo de inventario —</option>
                    {(articulos || []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} ({fmtCostoEnMoneda(a.costoUnitarioOriginal ?? a.costoUnitario, a.monedaCosto || monedaReceta)} / {a.unidadMedida})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-white/50 mb-1">Peso neto / cant.</label>
                  <input value={nuevoPesoNeto} onChange={(e) => setNuevoPesoNeto(e.target.value)}
                    type="number" step="0.001" placeholder="Ej. 0.500" className="input-horeca w-full text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-white/50 mb-1">% Merma cocina</label>
                  <input value={nuevoMerma} onChange={(e) => setNuevoMerma(e.target.value)}
                    type="number" step="0.1" placeholder="% Merma" className="input-horeca w-full text-xs" />
                </div>
              </div>

              {/* Panel interactivo: Moneda de compra y división lógica automática */}
              {nuevoArticuloId && (() => {
                const artSel = (articulos || []).find((a) => String(a.id) === nuevoArticuloId);
                if (!artSel) return null;
                const costoCompraNum = parseFloat(costoCompraSel) || 0;
                const unitUsd = convertirCostoAMonedaPlato(costoCompraNum, monedaCompraSel);
                const unidad = artSel.unidadMedida || "ud";

                return (
                  <div className="bg-slate-100/80 dark:bg-white/5 border border-slate-300/60 dark:border-white/10 rounded-xl p-3 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-white/80">
                        Moneda en que compramos este insumo:
                      </span>
                      {/* Selector de Moneda de Compra */}
                      <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-white/10 p-0.5 rounded-lg text-xs">
                        {(["COP", "USD", "VES"] as const).map((mon) => (
                          <button
                            key={mon}
                            type="button"
                            onClick={() => {
                              setMonedaCompraSel(mon);
                              if (mon === "COP" && Number(costoCompraSel) < 50 && Number(costoCompraSel) > 0) {
                                setCostoCompraSel(String(Math.round(Number(costoCompraSel) * 1000)));
                              }
                            }}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              monedaCompraSel === mon
                                ? "bg-teal-600 text-white shadow-xs"
                                : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            {mon === "VES" ? "BS (VES)" : mon}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-white/50 mb-1">
                          Costo de compra en {monedaCompraSel} ({unidad}):
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step={monedaCompraSel === "COP" ? "1" : "0.01"}
                            value={costoCompraSel}
                            onChange={(e) => setCostoCompraSel(e.target.value)}
                            placeholder={monedaCompraSel === "COP" ? "Ej. 1450" : "Ej. 1.45"}
                            className="input-horeca w-full text-xs font-mono font-bold"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                            {monedaCompraSel} / {unidad}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white/60 dark:bg-black/20 p-2.5 rounded-lg border border-slate-200 dark:border-white/5 text-[11px] space-y-1">
                        <div className="text-slate-500 dark:text-white/50 font-medium">Conversión lógica a moneda del plato ({monedaReceta}):</div>
                        <div className="font-mono font-bold text-teal-600 dark:text-teal-400">
                          {monedaCompraSel === "COP" && (
                            <>
                              {fmtNumero(costoCompraNum, "COP")} COP ÷ {tasaCopEstado.toLocaleString("es-CO")} = <strong>{fmtCostoEnMoneda(unitUsd, monedaReceta)} / {unidad}</strong>
                            </>
                          )}
                          {monedaCompraSel === "VES" && (
                            <>
                              Bs. {costoCompraNum.toFixed(2)} ÷ {tasaVesEstado.toFixed(2)} = <strong>{fmtCostoEnMoneda(unitUsd, monedaReceta)} / {unidad}</strong>
                            </>
                          )}
                          {monedaCompraSel === monedaReceta && (
                            <>
                              <strong>{fmtCostoEnMoneda(unitUsd, monedaReceta)} / {unidad}</strong> (misma moneda del plato)
                            </>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {monedaCompraSel === "COP" && `Tasa activa aplicada: 1 ${monedaReceta} = ${tasaCopEstado.toLocaleString("es-CO")} COP`}
                          {monedaCompraSel === "VES" && `Tasa activa aplicada: 1 ${monedaReceta} = ${tasaVesEstado.toFixed(2)} Bs`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-white/40 mb-1">Sub-receta</label>
                <select value={nuevoSubRecetaId} onChange={(e) => setNuevoSubRecetaId(e.target.value)} className="input-horeca w-full text-xs">
                  <option value="">— Elegir sub-receta —</option>
                  {(escandallos || []).filter((s) => s.id !== receta.id).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombrePlato} (Costo ración: {fmtCostoEnMoneda(s.costoTotalProduccion, monedaReceta)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-white/40 mb-1">Cantidad de raciones</label>
                <input value={nuevoPesoNeto} onChange={(e) => setNuevoPesoNeto(e.target.value)}
                  type="number" step="0.01" placeholder="Ej. 1" className="input-horeca w-full text-xs" />
              </div>
            </div>
          )}

          {/* Vista previa en tiempo real antes de guardar */}
          {previewNuevo && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs bg-teal-500/10 border border-teal-500/20 rounded-xl px-3 py-2 text-teal-700 dark:text-teal-300">
              <span>
                Cálculo previo: <strong>{previewNuevo.cantBruta.toFixed(3)} {previewNuevo.unidad}</strong> × {fmtCostoEnMoneda(previewNuevo.unit, monedaReceta)}
                {previewNuevo.monedaCompra !== monedaReceta && (
                  <span className="opacity-80 font-normal"> ({previewNuevo.monedaCompra === "COP" ? `${fmtNumero(previewNuevo.costoCompra, "COP")} COP` : `Bs. ${previewNuevo.costoCompra}`} convertidos)</span>
                )}
              </span>
              <span className="font-mono font-bold">
                Impacto en costo del plato: +{fmtCostoEnMoneda(previewNuevo.costo, monedaReceta)}
              </span>
            </div>
          )}

          <button onClick={agregarNuevoIngrediente} disabled={guardandoNuevo}
            className="w-full g-aurora text-white text-xs font-semibold py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {guardandoNuevo ? "Agregando…" : "+ Agregar ingrediente al escandallo"}
          </button>
        </div>
      </div>
    </Modal>
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
  const [proveedorDetalle, setProveedorDetalle] = useState<ProveedorHoreca | null>(null);

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
            <p className="text-sm text-slate-500 dark:text-white/40">{(proveedores || []).length} proveedor{(proveedores || []).length === 1 ? "" : "es"} registrado{(proveedores || []).length === 1 ? "" : "s"}</p>
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
              <button
                type="button"
                key={p.id}
                onClick={() => setProveedorDetalle(p)}
                className="apple-glass rounded-2xl p-5 space-y-1.5 text-left cursor-pointer hover:ring-2 hover:ring-teal-500/40 transition-shadow"
              >
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{p.nombre}</h4>
                {p.rif && <div className="text-xs text-slate-500 dark:text-white/40">RIF: {p.rif}</div>}
                {p.telefono && <div className="text-xs text-slate-500 dark:text-white/40">Tel: {p.telefono}</div>}
                {p.contacto && <div className="text-xs text-slate-500 dark:text-white/40">Contacto: {p.contacto}</div>}
                <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold pt-1">Ver historial de compras →</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {proveedorDetalle && (
        <ModalDetalleProveedor tenantId={tenantId} proveedor={proveedorDetalle} onClose={() => setProveedorDetalle(null)} onCambio={onCambio} />
      )}
    </div>
  );
}

function ModalDetalleProveedor({ tenantId, proveedor, onClose, onCambio }: {
  tenantId: number; proveedor: ProveedorHoreca; onClose: () => void; onCambio: () => void;
}) {
  const [compras, setCompras] = useState<CompraInsumoHoreca[] | null>(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    nombre: proveedor.nombre, rif: proveedor.rif || "", telefono: proveedor.telefono || "",
    contacto: proveedor.contacto || "", direccion: proveedor.direccion || "",
  });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
  const [proveedorActual, setProveedorActual] = useState(proveedor);
  const [cuentasPorPagar, setCuentasPorPagar] = useState<MovimientoCaja[] | null>(null);
  const [abonando, setAbonando] = useState<MovimientoCaja | null>(null);

  // Guarda TODAS las CXP de este proveedor (pagadas o no) — el saldo real de
  // cada compra vive acá, no en CompraInsumoHoreca.montoPagado (que es solo
  // una foto del momento de la compra, ver comentario en esa entidad). Si no
  // se guardaran también las ya pagadas, tras pagar una desaparecería de esta
  // lista y el historial volvería a mostrarla como pendiente por error.
  const cargarCxp = () => {
    listarMovimientos(tenantId, "CXP")
      .then((todas) => setCuentasPorPagar(todas.filter((m) =>
        m.moduloOrigen === "HORECA" && m.referenciaTipo === "CompraInsumoHoreca"
        && (compras || []).some((c) => c.id === m.referenciaId)
      )))
      .catch(() => setCuentasPorPagar([]));
  };

  const guardarEdicion = async () => {
    if (!form.nombre.trim()) { setErrorEdicion("El nombre es obligatorio"); return; }
    setGuardandoEdicion(true);
    setErrorEdicion(null);
    try {
      const actualizado = await editarProveedorHoreca(proveedorActual.id, {
        nombre: form.nombre.trim(),
        rif: form.rif.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        contacto: form.contacto.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
      });
      setProveedorActual(actualizado);
      setEditando(false);
      onCambio();
    } catch (e) {
      setErrorEdicion(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  useEffect(() => {
    listarComprasInsumo(tenantId)
      .then((todas) => setCompras(todas.filter((c) => c.proveedor.id === proveedorActual.id)))
      .catch(() => setCompras([]));
  }, [tenantId, proveedorActual.id]);

  useEffect(() => {
    if (compras === null) return;
    cargarCxp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compras]);

  // Si la compra tiene una CXP vinculada, esa es la verdad (aunque ya esté
  // PAGADA — en ese caso el saldo es 0). Si nunca tuvo CXP (se pagó completa
  // en el momento de la compra), se usa total - montoPagado.
  const pendienteDeCompra = (c: CompraInsumoHoreca): number => {
    const cxp = (cuentasPorPagar || []).find((m) => m.referenciaId === c.id);
    if (cxp) return cxp.estado === "PAGADO" ? 0 : Number(cxp.saldoPendiente ?? 0);
    return Number(c.total) - Number(c.montoPagado || 0);
  };

  const totalComprado = (compras || []).reduce((s, c) => s + Number(c.total), 0);
  const totalPendiente = (compras || []).reduce((s, c) => s + pendienteDeCompra(c), 0);

  // Productos que este proveedor nos ha despachado alguna vez — únicos, más recientes primero.
  const productosDespachados = useMemo(() => {
    const vistos = new Map<number, { nombre: string; ultimaFecha: string }>();
    for (const c of compras || []) {
      for (const item of c.items || []) {
        const existente = vistos.get(item.articulo.id);
        if (!existente || new Date(c.fechaCompra) > new Date(existente.ultimaFecha)) {
          vistos.set(item.articulo.id, { nombre: item.articulo.nombre, ultimaFecha: c.fechaCompra });
        }
      }
    }
    return Array.from(vistos.values()).sort((a, b) => new Date(b.ultimaFecha).getTime() - new Date(a.ultimaFecha).getTime());
  }, [compras]);

  return (
    <Modal onClose={onClose} titulo={proveedorActual.nombre} ancho="max-w-2xl">
      <div className="space-y-4">
        {editando ? (
          <div className="apple-glass rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo label="Nombre / Razón social">
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-horeca" />
              </Campo>
              <Campo label="RIF">
                <input value={form.rif} onChange={(e) => setForm({ ...form, rif: e.target.value })} placeholder="J-12345678-9" className="input-horeca" />
              </Campo>
              <Campo label="Teléfono">
                <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="input-horeca" />
              </Campo>
              <Campo label="Nombre del representante">
                <input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} className="input-horeca" />
              </Campo>
              <Campo label="Dirección fiscal">
                <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="input-horeca sm:col-span-2" />
              </Campo>
            </div>
            {errorEdicion && <p className="text-xs text-red-500">{errorEdicion}</p>}
            <div className="flex gap-2">
              <button onClick={guardarEdicion} disabled={guardandoEdicion} className="btn-cyber-neon text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-60">
                {guardandoEdicion ? "Guardando…" : "Guardar cambios"}
              </button>
              <button onClick={() => setEditando(false)} className="apple-glass-btn text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer">Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {proveedorActual.rif && <div><span className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-white/40">RIF</span><span className="text-slate-800 dark:text-white/80 font-semibold">{proveedorActual.rif}</span></div>}
            {proveedorActual.telefono && <div><span className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-white/40">Teléfono</span><span className="text-slate-800 dark:text-white/80 font-semibold">{proveedorActual.telefono}</span></div>}
            {proveedorActual.contacto && <div><span className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-white/40">Representante</span><span className="text-slate-800 dark:text-white/80 font-semibold">{proveedorActual.contacto}</span></div>}
            {proveedorActual.direccion && <div className="col-span-2 sm:col-span-4"><span className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-white/40">Dirección fiscal</span><span className="text-slate-800 dark:text-white/80 font-semibold">{proveedorActual.direccion}</span></div>}
            <button type="button" onClick={() => { setForm({ nombre: proveedorActual.nombre, rif: proveedorActual.rif || "", telefono: proveedorActual.telefono || "", contacto: proveedorActual.contacto || "", direccion: proveedorActual.direccion || "" }); setEditando(true); }}
              className="col-span-2 sm:col-span-4 text-[10px] font-semibold text-teal-600 dark:text-teal-400 text-left cursor-pointer">
              ✎ Editar datos del proveedor
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="apple-glass rounded-xl p-3.5 text-center">
            <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider">Total comprado</div>
            <div className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">{compras ? `$${totalComprado.toFixed(2)}` : "…"}</div>
          </div>
          <div className="apple-glass rounded-xl p-3.5 text-center">
            <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider">Le debemos</div>
            <div className={`font-['Outfit'] font-black text-lg ${totalPendiente > 0 ? "text-amber-500" : "text-teal-600 dark:text-teal-400"}`}>
              {compras ? `$${totalPendiente.toFixed(2)}` : "…"}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-2">Productos que nos despacha</h4>
          {compras === null ? (
            <p className="text-xs text-slate-400">Cargando…</p>
          ) : productosDespachados.length === 0 ? (
            <p className="text-xs text-slate-400">Sin compras registradas todavía.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {productosDespachados.map((p) => (
                <span key={p.nombre} className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100/60 dark:bg-white/5 text-slate-600 dark:text-white/60">{p.nombre}</span>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-2">Historial de facturas</h4>
          {compras === null ? (
            <p className="text-xs text-slate-400">Cargando…</p>
          ) : compras.length === 0 ? (
            <p className="text-xs text-slate-400">Sin compras registradas todavía.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {[...compras].sort((a, b) => new Date(b.fechaCompra).getTime() - new Date(a.fechaCompra).getTime()).map((c) => {
                const pendiente = pendienteDeCompra(c);
                return (
                  <div key={c.id} className="bg-slate-100/60 dark:bg-white/5 rounded-xl px-3 py-2 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-white/60">
                        {new Date(c.fechaCompra).toLocaleDateString("es-VE")} — Factura {c.numeroFactura || "s/n"}
                      </span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">${Number(c.total).toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {(c.items || []).map((it) => `${it.articulo.nombre} x${Number(it.cantidad)}`).join(" · ") || "—"}
                    </div>
                    {pendiente > 0.009 ? (
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          Debe ${pendiente.toFixed(2)}
                          {(() => {
                            const cxp = (cuentasPorPagar || []).find((m) => m.referenciaId === c.id);
                            return cxp?.fechaVencimiento ? ` · vence ${new Date(cxp.fechaVencimiento + "T00:00:00").toLocaleDateString("es-VE")}` : "";
                          })()}
                        </div>
                        {(() => {
                          const cxp = (cuentasPorPagar || []).find((m) => m.referenciaId === c.id);
                          return cxp ? (
                            <button
                              type="button"
                              onClick={() => setAbonando(cxp)}
                              className="text-teal-600 dark:text-teal-400 font-semibold cursor-pointer text-[10px]"
                            >
                              Pagar →
                            </button>
                          ) : null;
                        })()}
                      </div>
                    ) : (
                      <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">✓ Pagada</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button onClick={onClose} className="w-full g-aurora text-white text-xs font-semibold py-2.5 rounded-xl cursor-pointer">Cerrar</button>
      </div>
      {abonando && (
        <ModalAbonarCuenta
          tenantId={tenantId}
          cuenta={abonando}
          tipoLabel="proveedor"
          onClose={() => setAbonando(null)}
          onAbonado={() => {
            setAbonando(null);
            listarComprasInsumo(tenantId).then((todas) => setCompras(todas.filter((c) => c.proveedor.id === proveedorActual.id)));
            cargarCxp();
            onCambio();
          }}
        />
      )}
    </Modal>
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

// ══════════════════════════════════════════════════════════════════════════
// CLIENTES (CRM) — Fase 3. Lista + buscador + panel de detalle con métricas
// y el historial de tickets del cliente.
// ══════════════════════════════════════════════════════════════════════════
function Clientes({ tenantId }: { tenantId: number }) {
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<Cliente | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", identificacionRif: "", telefono: "", correo: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = (q: string) => {
    listarClientes(tenantId, q || undefined).then(setClientes).catch(() => setClientes([]));
  };
  useEffect(() => {
    const id = setTimeout(() => cargar(busqueda), 250); // pequeño debounce para no golpear el backend en cada tecla
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, busqueda]);

  const crear = async () => {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setGuardando(true);
    setError(null);
    try {
      await crearCliente(tenantId, {
        nombre: form.nombre.trim(),
        identificacionRif: form.identificacionRif.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        correo: form.correo.trim() || undefined,
      });
      setForm({ nombre: "", identificacionRif: "", telefono: "", correo: "" });
      setMostrarForm(false);
      cargar(busqueda);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el cliente");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="relative w-full sm:w-80">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 pointer-events-none flex items-center justify-center">
            <IconSearch size={16} className="text-slate-400" />
          </span>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o cédula/RIF…"
            className="input-horeca w-full text-xs"
            style={{ paddingLeft: "2.75rem", paddingRight: busqueda ? "2.25rem" : "0.875rem" }}
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1"
              title="Limpiar búsqueda"
            >
              <IconClose size={14} />
            </button>
          )}
        </div>
        <button onClick={() => setMostrarForm((v) => !v)} className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
          {mostrarForm ? "Cancelar" : "+ Nuevo cliente"}
        </button>
      </div>

      {mostrarForm && (
        <div className="apple-glass rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo label="Nombre"><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-horeca" placeholder="Nombre completo" /></Campo>
            <Campo label="Cédula / RIF (opcional)"><input value={form.identificacionRif} onChange={(e) => setForm({ ...form, identificacionRif: e.target.value })} className="input-horeca" placeholder="V-12345678" /></Campo>
            <Campo label="Teléfono (opcional)"><input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="input-horeca" /></Campo>
            <Campo label="Correo (opcional)"><input value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} className="input-horeca" /></Campo>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={crear} disabled={guardando} className="btn-cyber-neon text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {guardando ? "Guardando…" : "Guardar cliente"}
          </button>
        </div>
      )}

      {clientes === null ? (
        <p className="text-xs text-slate-400">Cargando…</p>
      ) : clientes.length === 0 ? (
        <p className="text-xs text-slate-400">Sin clientes {busqueda ? "que coincidan con la búsqueda" : "registrados todavía"}.</p>
      ) : (
        <div className="apple-glass rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 dark:text-white/40 uppercase text-[10px] tracking-wider border-b border-slate-300/50 dark:border-white/10">
                <th className="py-2.5 px-4">Nombre</th><th className="py-2.5 px-4">Cédula/RIF</th><th className="py-2.5 px-4">Teléfono</th><th className="py-2.5 px-4">Registrado</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} onClick={() => setSeleccionado(c)} className="border-b border-slate-200/50 dark:border-white/5 hover:bg-teal-500/5 cursor-pointer">
                  <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-white/80">{c.nombre}</td>
                  <td className="py-2.5 px-4 text-slate-500 dark:text-white/50">{c.identificacionRif || "—"}</td>
                  <td className="py-2.5 px-4 text-slate-500 dark:text-white/50">{c.telefono || "—"}</td>
                  <td className="py-2.5 px-4 text-slate-500 dark:text-white/50">{new Date(c.fechaRegistro).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {seleccionado && (
        <ModalDetalleCliente tenantId={tenantId} cliente={seleccionado} onClose={() => setSeleccionado(null)} onCambio={() => cargar(busqueda)} />
      )}
    </div>
  );
}

function ModalDetalleCliente({ tenantId, cliente, onClose, onCambio }: { tenantId: number; cliente: Cliente; onClose: () => void; onCambio: () => void }) {
  const [metricas, setMetricas] = useState<MetricasCliente | null>(null);
  const [tickets, setTickets] = useState<Comanda[] | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    metricasCliente(tenantId, cliente.id).then(setMetricas).catch(() => setMetricas(null));
    ticketsCliente(tenantId, cliente.id).then(setTickets).catch(() => setTickets([]));
  }, [tenantId, cliente.id]);

  const eliminar = async () => {
    if (!window.confirm(`¿Eliminar a "${cliente.nombre}"? Esto no se puede deshacer.`)) return;
    setEliminando(true);
    setError(null);
    try {
      await eliminarCliente(tenantId, cliente.id);
      onCambio();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar — puede tener ventas asociadas");
      setEliminando(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo={cliente.nombre} ancho="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {cliente.identificacionRif && <div><span className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-white/40">Cédula/RIF</span><span className="text-slate-800 dark:text-white/80 font-semibold">{cliente.identificacionRif}</span></div>}
          {cliente.telefono && <div><span className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-white/40">Teléfono</span><span className="text-slate-800 dark:text-white/80 font-semibold">{cliente.telefono}</span></div>}
          {cliente.correo && <div><span className="block text-[10px] uppercase tracking-wider text-slate-500 dark:text-white/40">Correo</span><span className="text-slate-800 dark:text-white/80 font-semibold">{cliente.correo}</span></div>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="apple-glass rounded-xl p-3.5 text-center">
            <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider">Total gastado</div>
            <div className="font-['Outfit'] font-black text-lg text-teal-600 dark:text-teal-400">{metricas ? `$${Number(metricas.totalGastado).toFixed(2)}` : "…"}</div>
          </div>
          <div className="apple-glass rounded-xl p-3.5 text-center">
            <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider">Órdenes totales</div>
            <div className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">{metricas?.cantidadVisitas ?? "…"}</div>
          </div>
          <div className="apple-glass rounded-xl p-3.5 text-center">
            <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider">Última compra</div>
            <div className="font-['Outfit'] font-black text-sm text-slate-900 dark:text-white">{metricas?.fechaUltimaCompra ? new Date(metricas.fechaUltimaCompra).toLocaleDateString() : "—"}</div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-2">Historial de tickets</h4>
          {tickets === null ? (
            <p className="text-xs text-slate-400">Cargando…</p>
          ) : tickets.length === 0 ? (
            <p className="text-xs text-slate-400">Sin compras registradas todavía.</p>
          ) : (
            <div className="max-h-52 overflow-y-auto space-y-1.5">
              {tickets.map((t) => (
                <div key={t.id} className="flex items-center justify-between bg-slate-100/60 dark:bg-white/5 rounded-xl px-3 py-2 text-xs">
                  <span className="text-slate-600 dark:text-white/60">{t.fechaCierre ? new Date(t.fechaCierre).toLocaleString() : "—"}</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">${Number(t.totalConsumo).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button onClick={eliminar} disabled={eliminando} className="flex-1 apple-glass-btn text-red-500 text-xs font-semibold py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {eliminando ? "Eliminando…" : "Eliminar cliente"}
          </button>
          <button onClick={onClose} className="flex-1 g-aurora text-white text-xs font-semibold py-2.5 rounded-xl cursor-pointer">Cerrar</button>
        </div>
      </div>
    </Modal>
  );
}

function generarSku(nombre: string): string {
  const base = nombre.trim().toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // quita tildes
    .replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${base || "ART"}-${Date.now().toString().slice(-5)}`;
}

/** Margen de utilidad bruta % = (precio - costo) / precio × 100 — null si no hay precio de venta cargado. */
function calcularMargen(costo: number, precio: number): number | null {
  if (!precio || precio <= 0) return null;
  return ((precio - costo) / precio) * 100;
}

// costoUnitario/precioVenta de Articulo son SIEMPRE en la moneda base del
// tenant en todo el sistema (así se usan para margen, kardex, catálogo del
// POS, etc.) — pero un negocio puede comprar mercancía pagando en otra
// moneda. El monto que escribe el cajero se manda tal cual junto con la
// moneda elegida; es el backend (ArticuloController, con
// MotorFinancieroService) el que convierte a la moneda base antes de
// guardar — así solo hay un lugar haciendo esa conversión (antes el
// frontend convertía a USD fijo acá mismo, lo que rompía en cuanto un
// negocio configuraba una moneda base distinta a USD).
/** Formato puramente numérico con separador de miles en punto (ej. "60.000" para COP, "10.700", "20" o "20,50" para USD/VES). */
function fmtNumero(monto: number | null | undefined, moneda?: string | null): string {
  const num = Number(monto) || 0;
  const m = (moneda || "").toUpperCase().trim();
  const tieneDecimales = num % 1 !== 0;
  return num.toLocaleString("es-CO", {
    minimumFractionDigits: moneda ? 2 : (tieneDecimales ? 2 : 0),
    maximumFractionDigits: moneda ? 2 : (tieneDecimales ? 3 : 0),
  });
}

/** Formato unificado con separador de miles en puntos y código al final: "60.000 COP", "200 USD", "100.000 BS". Muestra decimales solo si los tiene (ej. "1.250,50 COP"). Para COP nunca muestra centavos. */
function fmtCostoEnMoneda(monto: number | null | undefined, moneda?: string | null): string {
  const num = Number(monto) || 0;
  const m = (moneda || "USD").toUpperCase().trim();
  const etiqueta = (m === "VES" || m === "BS") ? "BS" : m;
  const tieneDecimales = num % 1 !== 0;
  const str = num.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  return `${str} ${etiqueta}`;
}

/**
 * Filtro defensivo para categorías de artículo: descarta vacíos y valores
 * puramente numéricos ("1", "2.5") — basura que puede colarse desde una
 * importación de Excel mal mapeada o un formulario con la categoría en
 * blanco, y que de otro modo aparece como un chip de filtro fantasma
 * (ej. "1") junto a las categorías reales.
 */
function esCategoriaValida(c: string | null | undefined): c is string {
  const t = c?.trim();
  return !!t && isNaN(Number(t));
}

function BadgeMargen({ margen }: { margen: number | null }) {
  if (margen === null) return <span className="text-[10px] text-slate-400">Sin precio de venta</span>;
  const color = margen < 0 ? "text-red-500 bg-red-500/10" : margen < 20 ? "text-amber-600 dark:text-amber-400 bg-amber-500/10" : "text-teal-600 dark:text-teal-400 bg-teal-500/10";
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color}`}>Margen {margen.toFixed(1)}%</span>;
}

/**
 * Modal de edición rápida de un artículo — componente compartido entre
 * Inventario (FilaArticuloCompacta) y la cuadrícula de catálogo del POS, para
 * que ajustar un precio no dependa de en qué pantalla esté el operador.
 * `onGuardado` recibe el artículo ya actualizado (el PUT lo devuelve
 * completo) para que quien lo use pueda reflejarlo al instante sin
 * recargar ni volver a pedirlo al backend.
 */
function ModalEditarArticulo({ tenantId, articulo, onClose, onGuardado }: {
  tenantId: number; articulo: Articulo; onClose: () => void; onGuardado: (actualizado: Articulo) => void;
}) {
  const [form, setForm] = useState({
    nombre: articulo.nombre, categoria: articulo.categoria || "", unidadMedida: articulo.unidadMedida || "unidad",
    costoUnitario: String(articulo.costoUnitarioOriginal ?? articulo.costoUnitario), precioVenta: String(articulo.precioVenta ?? 0),
    sku: articulo.sku || "",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [base, setBase] = useState("");
  const [monedaCompra, setMonedaCompra] = useState(articulo.monedaCosto || "");
  const [tasaCompra, setTasaCompra] = useState("");
  useEffect(() => {
    obtenerMonedaBaseNegocio().then(r => {
      setBase(r.monedaBase);
      if (!monedaCompra) setMonedaCompra(r.monedaBase);
      if (articulo.monedaValoracion === r.monedaBase && Number(articulo.costoUnitario) > 0 && articulo.costoUnitarioOriginal != null)
        setTasaCompra(String(Number(articulo.costoUnitarioOriginal) / Number(articulo.costoUnitario)));
    }).catch(() => setError("No se pudo consultar la moneda principal"));
  }, [tenantId]);
  const costoBase = monedaCompra === base ? Number(form.costoUnitario)
    : Number(tasaCompra) > 0 ? Number(form.costoUnitario) / Number(tasaCompra) : null;
  const margen = costoBase == null ? null : calcularMargen(costoBase, Number(form.precioVenta) || 0);
  const monedaArticulo = (articulo.monedaCosto || "USD").toUpperCase();
  const etiquetaMoneda = monedaCompra === "VES" ? "Bs." : monedaCompra;

  const guardar = async () => {
    if (!form.nombre.trim()) { setError("El nombre no puede quedar vacío"); return; }
    if (!form.categoria.trim()) { setError("La categoría no puede quedar vacía"); return; }
    if (!form.costoUnitario || Number(form.costoUnitario) < 0) { setError("El costo unitario es obligatorio"); return; }
    if (!form.precioVenta || Number(form.precioVenta) <= 0) { setError("El precio de venta es obligatorio"); return; }
    if (!base || costoBase == null) { setError("Indica la moneda y la tasa de adquisición para calcular el costo"); return; }
    setGuardando(true);
    setError(null);
    try {
      const actualizado = await editarArticulo(articulo.id, {
        nombre: form.nombre.trim(), categoria: form.categoria.trim(), unidadMedida: form.unidadMedida.trim(),
        costoUnitario: Number(form.costoUnitario), monedaCosto: monedaCompra,
        unidadesOrigenPorBase: monedaCompra === base ? 1 : Number(tasaCompra), precioVenta: Number(form.precioVenta),
        sku: form.sku.trim() || undefined,
      });
      onGuardado(actualizado);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
      setGuardando(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo="Editar artículo">
      <div className="space-y-3">
        <Campo label="Nombre del artículo">
          <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-horeca text-sm font-bold" placeholder="Nombre" autoFocus />
        </Campo>
        <div className="grid grid-cols-2 gap-2">
          <Campo label="Categoría">
            <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="input-horeca text-xs" placeholder="Categoría" />
          </Campo>
          <Campo label="Unidad de medida">
            <select value={form.unidadMedida} onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })} className="input-horeca text-xs">
              {["kg", "g", "l", "ml", "unidad"].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Campo label={`Costo de adquisición (${etiquetaMoneda})`}>
            <input value={form.costoUnitario} onChange={(e) => setForm({ ...form, costoUnitario: e.target.value })} type="number" step="0.01" min="0" className="input-horeca text-xs" placeholder={`Costo unitario (${etiquetaMoneda})`} />
          </Campo>
          <Campo label={`Precio de venta (${base || "cargando"})`}>
            <input value={form.precioVenta} onChange={(e) => setForm({ ...form, precioVenta: e.target.value })} type="number" step="0.01" min="0" className="input-horeca text-xs" placeholder={`Precio de venta (${etiquetaMoneda})`} />
          </Campo>
        </div>
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-2">
          <Campo label="Moneda de adquisición">
            <select className="input-horeca" value={monedaCompra} onChange={e => { setMonedaCompra(e.target.value); setTasaCompra(""); }}>
              {["USD", "COP", "VES"].map(m => <option key={m} value={m}>{m === "VES" ? "Bs." : m}</option>)}
            </select>
          </Campo>
          {base && monedaCompra !== base && <Campo label={`1 ${base} equivale a cuántos ${monedaCompra}`}>
            <input type="number" min="0.000001" step="any" className="input-horeca" value={tasaCompra} onChange={e => setTasaCompra(e.target.value)} />
          </Campo>}
          <p className="text-xs text-slate-600">Costo para recetas: {costoBase == null ? "Indica la tasa de compra" : fmtCostoEnMoneda(costoBase, base)} por {form.unidadMedida}.</p>
          <p className="text-xs text-slate-500">La corrección queda registrada en el historial de inventario. Las ventas anteriores conservan sus importes.</p>
        </div>
        <Campo label="Código de barras / SKU">
          <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input-horeca text-xs font-mono" placeholder="Código de barras / SKU" />
        </Campo>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-white/40">Margen:</span>
          <BadgeMargen margen={margen} />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={guardar} disabled={guardando} className="flex-1 g-aurora text-white text-sm font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
          <button onClick={onClose} className="flex-1 apple-glass-btn text-sm font-semibold py-2.5 rounded-xl cursor-pointer">Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}

function GestionArticulos({ tenantId, articulos, onCambio }: { tenantId: number; articulos: Articulo[] | null; onCambio: () => void }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarImportar, setMostrarImportar] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  // Moneda base real del negocio (Configuración > Moneda principal) — el
  // costo por defecto se asume tecleado en esta moneda, no en USD fijo.
  const [monedaBaseTenant, setMonedaBaseTenant] = useState("USD");
  useEffect(() => { monedaBase(tenantId).then(setMonedaBaseTenant).catch(() => {}); }, [tenantId]);
  const [form, setForm] = useState({
    nombre: "", unidadMedida: "kg", categoria: "", costoUnitario: "", precioVenta: "", cantidadInicial: "", fechaVencimiento: "",
    // Al cargar cantidad inicial, por defecto se asume que fue una compra
    // real (el caso más común al operar el día a día) — el dueño puede
    // destildarlo si en realidad está solo digitalizando stock que ya tenía.
    registrarGasto: true, metodoPago: "EFECTIVO", moneda: "USD", tasaCambioAplicada: "",
  });
  // El selector de moneda de la compra arranca en la moneda base real del
  // negocio en cuanto se conoce (en vez de asumir USD) — solo la primera vez,
  // para no pisar lo que el usuario ya haya elegido a mano.
  useEffect(() => { setForm((f) => (f.moneda === "USD" ? { ...f, moneda: monedaBaseTenant } : f)); }, [monedaBaseTenant]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Avisa ANTES de crear si ya existe un artículo con nombre parecido — la
  // causa más común de duplicados es escribir el mismo insumo dos veces sin
  // darse cuenta de que ya estaba cargado.
  const posibleDuplicado = form.nombre.trim().length > 2
    ? (articulos || []).find((a) => a.nombre.trim().toLowerCase() === form.nombre.trim().toLowerCase())
    : null;

  const [factoresCompra, setFactoresCompra] = useState<Record<string, number | null>>({});
  useEffect(() => { cotizacionCobro().then(r => { setMonedaBaseTenant(r.monedaBase); setFactoresCompra(r.factores); }).catch(() => setError("No se pudo consultar la tasa de compra")); }, [tenantId]);
  const factorCompra = form.moneda === monedaBaseTenant ? 1 : Number(form.tasaCambioAplicada) || Number(factoresCompra[form.moneda]);
  const costoNormalizado = factorCompra > 0 ? Number(form.costoUnitario) / factorCompra : null;
  const margenForm = costoNormalizado == null ? null : calcularMargen(costoNormalizado, Number(form.precioVenta) || 0);
  const esParBsCop = (form.moneda === "VES" && monedaBaseTenant === "COP") || (form.moneda === "COP" && monedaBaseTenant === "VES");

  const crear = async () => {
    if (!form.nombre.trim()) { setError("El nombre del artículo es obligatorio"); return; }
    if (!form.categoria.trim()) { setError("La categoría es obligatoria"); return; }
    if (!form.costoUnitario || Number(form.costoUnitario) < 0) { setError("El costo unitario es obligatorio"); return; }
    if (!form.precioVenta || Number(form.precioVenta) <= 0) { setError("El precio de venta es obligatorio"); return; }
    if (!(factorCompra > 0)) { setError("Indica la tasa de esta compra antes de guardar"); return; }
    setGuardando(true);
    setError(null);
    try {
      // El costo se escribe en la moneda elegida para la compra (form.moneda,
      // solo relevante si hay cantidad inicial + "registrar gasto"; si no, se
      // asume tecleado en la moneda base del negocio) — se manda tal cual, es
      // el backend (ArticuloController) el que lo convierte a la moneda base
      // del tenant antes de guardarlo.
      const monedaArticulo = form.moneda || monedaBaseTenant || "COP";
      const costoIngresado = Number(form.costoUnitario);
      const tasaCompra = form.tasaCambioAplicada && Number(form.tasaCambioAplicada) > 0
        ? Number(form.tasaCambioAplicada)
        : undefined;
      const nuevo = await crearArticulo({
        sku: generarSku(form.nombre),
        nombre: form.nombre.trim(),
        unidadMedida: form.unidadMedida,
        categoria: form.categoria.trim(),
        costoUnitario: costoIngresado,
        precioVenta: Number(form.precioVenta),
        monedaCosto: monedaArticulo,
        unidadesOrigenPorBase: factorCompra,
        cantidadInicial: Number(form.cantidadInicial) || 0,
        metodoPagoInicial: form.registrarGasto ? form.metodoPago : undefined,
        fechaVencimientoInicial: form.fechaVencimiento || undefined,
      });
      setForm({ nombre: "", unidadMedida: "kg", categoria: "", costoUnitario: "", precioVenta: "", cantidadInicial: "", fechaVencimiento: "", registrarGasto: true, metodoPago: "EFECTIVO", moneda: monedaArticulo, tasaCambioAplicada: "" });
      setMostrarForm(false);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el artículo");
    } finally {
      setGuardando(false);
    }
  };

  const categorias = useMemo(() => Array.from(new Set((articulos || []).map((a) => a.categoria || "General"))).filter(esCategoriaValida).sort(), [articulos]);

  const articulosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (articulos || []).filter((a) => {
      if (categoriaFiltro && (a.categoria || "General") !== categoriaFiltro) return false;
      if (!q) return true;
      return a.nombre.toLowerCase().includes(q) || a.sku.toLowerCase().includes(q);
    });
  }, [articulos, categoriaFiltro, busqueda]);

  const valorInventarioPorMoneda = useMemo(() => {
    const totales: Record<string, number> = {};
    for (const a of articulos || []) {
      const m = (a.monedaCosto || monedaBaseTenant || "USD").toUpperCase();
      const costo = a.costoUnitarioOriginal != null ? Number(a.costoUnitarioOriginal) : Number(a.costoUnitario);
      const stock = Number(a.stockActual) || 0;
      totales[m] = (totales[m] || 0) + (costo * stock);
    }
    return totales;
  }, [articulos, monedaBaseTenant]);

  const renderValorTotal = useMemo(() => {
    const monedas = Object.keys(valorInventarioPorMoneda);
    if (monedas.length === 0) {
      const mDef = (monedaBaseTenant || "COP").toUpperCase();
      return (
        <div className="flex items-center gap-2">
          <span className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white">0</span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20">
            {(mDef === "VES" || mDef === "BS") ? "BS" : mDef}
          </span>
        </div>
      );
    }

    if (monedas.length === 1) {
      const m = monedas[0];
      const num = valorInventarioPorMoneda[m] || 0;
      const tieneDec = num % 1 !== 0;
      const str = num.toLocaleString("es-CO", {
        minimumFractionDigits: tieneDec ? 2 : 0,
        maximumFractionDigits: 2,
      });
      const etiqueta = (m === "VES" || m === "BS") ? "BS" : m;
      const badgeStyle =
        etiqueta === "COP"
          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30"
          : etiqueta === "USD"
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
          : "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30";

      return (
        <div className="flex items-center gap-2.5">
          <span className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white tracking-tight">
            {str}
          </span>
          <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-md border tracking-wider uppercase ${badgeStyle}`}>
            {etiqueta}
          </span>
        </div>
      );
    }

    const NOMBRE_MONEDA: Record<string, string> = {
      COP: "Insumos comprados en pesos colombianos",
      USD: "Insumos comprados en dólares",
      BS: "Insumos comprados en bolívares",
      VES: "Insumos comprados en bolívares",
    };

    return (
      <div className="space-y-1.5 pt-0.5">
        {monedas.map((m) => {
          const num = valorInventarioPorMoneda[m] || 0;
          const tieneDec = num % 1 !== 0;
          const str = num.toLocaleString("es-CO", {
            minimumFractionDigits: tieneDec ? 2 : 0,
            maximumFractionDigits: 2,
          });
          const etiqueta = (m === "VES" || m === "BS") ? "BS" : m;
          const badgeStyle =
            etiqueta === "COP"
              ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30"
              : etiqueta === "USD"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
              : "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30";

          return (
            <div key={m} className="bg-slate-100/60 dark:bg-white/5 rounded-xl px-3 py-1.5 border border-slate-200/50 dark:border-white/5 flex items-center justify-between gap-3"
              title={NOMBRE_MONEDA[etiqueta] || `Insumos comprados en ${etiqueta}`}>
              <div className="flex items-baseline gap-1.5">
                <span className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white tracking-tight">
                  {str}
                </span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border tracking-wider uppercase ${badgeStyle}`}>
                  {etiqueta}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-white/40 text-right truncate max-w-[45%]">
                {NOMBRE_MONEDA[etiqueta] || `Insumos comprados en ${etiqueta}`}
              </span>
            </div>
          );
        })}
      </div>
    );
  }, [valorInventarioPorMoneda, monedaBaseTenant]);

  const alertasStock = (articulos || []).filter((a) => Number(a.stockActual) <= 0 || (a.stockMinimo != null && Number(a.stockActual) <= Number(a.stockMinimo))).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Valor Total en Inventario" val={renderValorTotal} sub="Costo × stock actual" color="#0ea5e9" />
        <KpiCard
          label="Total de Artículos"
          val={
            <div className="flex items-center gap-2.5">
              <span className="font-['Outfit'] font-black text-2xl text-slate-900 dark:text-white tracking-tight">
                {(articulos || []).length}
              </span>
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md border tracking-wider uppercase bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30">
                artículos
              </span>
            </div>
          }
          sub={`Artículos distintos en ${categorias.length} categoría${categorias.length === 1 ? "" : "s"}`}
          color="#35d7c3"
        />
        <KpiCard label="Alertas de Stock" val={String(alertasStock)} sub="Bajo mínimo o agotado" color={alertasStock > 0 ? "#ef4444" : "#64748b"} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="relative w-full sm:w-72">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 pointer-events-none flex items-center justify-center">
            <IconSearch size={16} className="text-slate-400" />
          </span>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o SKU…"
            className="input-horeca w-full text-xs"
            style={{ paddingLeft: "2.75rem", paddingRight: busqueda ? "2.25rem" : "0.875rem" }}
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1"
              title="Limpiar búsqueda"
            >
              <IconClose size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMostrarImportar(true)} className="apple-glass-btn text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5">
            <IconDownload size={14} /> Importar Excel
          </button>
          <button onClick={() => setMostrarForm((v) => !v)} className="g-aurora text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">
            {mostrarForm ? "Cancelar" : "+ Nuevo artículo"}
          </button>
        </div>
      </div>

      {categorias.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <button type="button" onClick={() => setCategoriaFiltro(null)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer flex-shrink-0 ${
              categoriaFiltro === null ? "bg-teal-600 text-white" : "bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-white/60"
            }`}>Todas</button>
          {categorias.map((c) => (
            <button key={c} type="button" onClick={() => setCategoriaFiltro((prev) => (prev === c ? null : c))}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer flex-shrink-0 ${
                categoriaFiltro === c ? "bg-teal-600 text-white" : "bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-white/60"
              }`}>{c}</button>
          ))}
        </div>
      )}

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
            <Campo label="Categoría">
              <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ej. Insumos secos" className="input-horeca" />
            </Campo>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-300/50 dark:border-white/10">
            <Campo label="Moneda de compra">
              <select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} className="input-horeca">
                <option value="COP">COP (Pesos colombianos)</option>
                <option value="USD">USD (Dólares)</option>
                <option value="VES">BS (Bolívares VES)</option>
              </select>
            </Campo>
            <Campo label={`Costo unitario (${form.moneda === "VES" ? "BS" : form.moneda})`}>
              <input value={form.costoUnitario} onChange={(e) => setForm({ ...form, costoUnitario: e.target.value })} type="number" step="0.01" min="0" placeholder="0.00" className="input-horeca" />
            </Campo>
            <Campo label={`Precio de venta (${monedaBaseTenant})`}>
              <input value={form.precioVenta} onChange={(e) => setForm({ ...form, precioVenta: e.target.value })} type="number" step="0.01" min="0" placeholder="0.00" className="input-horeca" />
            </Campo>
            <Campo label={`Cantidad inicial (${form.unidadMedida})`}>
              <input value={form.cantidadInicial} onChange={(e) => setForm({ ...form, cantidadInicial: e.target.value })} type="number" step="0.001" min="0" placeholder="0" className="input-horeca" />
              <p className="text-[10px] text-slate-400 mt-1">Físicamente en stock ahora mismo.</p>
            </Campo>
          </div>
          {form.moneda !== monedaBaseTenant && (
            <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 space-y-2">
              <Campo label={`Tasa de compra: 1 ${monedaBaseTenant} = X ${form.moneda}`}>
                <input type="number" step="any" min="0.000001" className="input-horeca"
                  value={form.tasaCambioAplicada} placeholder={factoresCompra[form.moneda] ? String(factoresCompra[form.moneda]) : "Indica la tasa"}
                  onChange={e => setForm({ ...form, tasaCambioAplicada: e.target.value })} />
              </Campo>
              <p className="text-xs text-slate-600">Costo para recetas: {costoNormalizado == null ? "Falta tasa" : fmtCostoEnMoneda(costoNormalizado, monedaBaseTenant)}. Se divide el costo de compra entre esta tasa.</p>
            </div>
          )}
          {Number(form.cantidadInicial) > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-300/50 dark:border-white/10">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-white/60 cursor-pointer">
                <input type="checkbox" checked={form.registrarGasto} onChange={(e) => setForm({ ...form, registrarGasto: e.target.checked })} className="cursor-pointer" />
                Esto fue una compra — registrar el gasto en caja
              </label>
              {form.registrarGasto && (
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="¿Cómo la pagaste?">
                    <select value={form.metodoPago} onChange={(e) => setForm({ ...form, metodoPago: e.target.value })} className="input-horeca">
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TARJETA">Tarjeta</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="BILLETERA_DIGITAL">Billetera digital</option>
                    </select>
                  </Campo>
                  <Campo label="Moneda del pago">
                    <p className="input-horeca">{form.moneda === "VES" ? "Bs." : form.moneda}</p>
                    <p className="text-xs text-slate-500">Se registra el importe pagado en la moneda de compra.</p>
                  </Campo>
                </div>
              )}
            </div>
          )}
          {(form.costoUnitario || form.precioVenta) && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-white/40">Margen de utilidad bruta:</span>
              <BadgeMargen margen={margenForm} />
            </div>
          )}
          <Campo label="Fecha de vencimiento (opcional)">
            <input value={form.fechaVencimiento} onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })} type="date" className="input-horeca sm:w-64" />
          </Campo>
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

      {articulosFiltrados.length === 0 ? (
        <p className="text-xs text-slate-400">Sin artículos {busqueda || categoriaFiltro ? "que coincidan con el filtro" : "cargados todavía"}.</p>
      ) : (
        <div className="apple-glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 dark:text-white/40 uppercase text-[10px] tracking-wider border-b border-slate-300/50 dark:border-white/10">
                  <th className="py-2 pl-3 pr-2 font-semibold">Producto</th>
                  <th className="py-2 px-2 font-semibold">SKU</th>
                  <th className="py-2 px-2 font-semibold text-right">Cantidad</th>
                  <th className="py-2 px-2 font-semibold text-right">Costo</th>
                  <th className="py-2 px-2 font-semibold text-right">Precio</th>
                  <th className="py-2 px-2 font-semibold text-right">Margen / Ganancia</th>
                  <th className="py-2 px-2 font-semibold text-right">Valor en inventario</th>
                  <th className="py-2 pl-2 pr-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {articulosFiltrados.map((a) => (
                  <FilaArticuloCompacta key={a.id} tenantId={tenantId} articulo={a} onCambio={onCambio} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
    precioVenta: ["precio de venta", "precio venta", "precio", "pvp", "precio publico"],
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
          precioVenta: columna.precioVenta && fila[columna.precioVenta] !== "" ? Number(fila[columna.precioVenta]) : undefined,
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
      const res = await importarArticulosLote(filas);
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
              <p className="text-[11px] text-slate-400 mt-1">.xlsx, .xls o .csv — columnas: SKU, Nombre, Unidad, Costo, Precio de Venta, Stock Inicial (Categoría opcional)</p>
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
                        <th className="py-1.5 px-2 text-right">Costo</th><th className="py-1.5 px-2 text-right">Precio venta</th><th className="py-1.5 px-2 text-right">Stock inicial</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.slice(0, 8).map((f, i) => (
                        <tr key={i} className="border-t border-slate-200/50 dark:border-white/5">
                          <td className="py-1.5 px-2 font-mono">{f.sku}</td>
                          <td className="py-1.5 px-2">{f.nombre}</td>
                          <td className="py-1.5 px-2">{f.unidadMedida || "—"}</td>
                          <td className="py-1.5 px-2 text-right">{f.costoUnitario ?? "—"}</td>
                          <td className="py-1.5 px-2 text-right">{f.precioVenta ?? "—"}</td>
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

/** Fila de la tabla compacta de Inventario — una línea por artículo, máxima densidad. */
function FilaArticuloCompacta({ tenantId, articulo, onCambio }: { tenantId: number; articulo: Articulo; onCambio: () => void }) {
  const [modo, setModo] = useState<"ver" | "editar" | "ajustar" | "reabastecer">("ver");
  const [stockReal, setStockReal] = useState(String(Number(articulo.stockActual)));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monedaCosto = articulo.monedaCosto || "USD";
  const costoEnMoneda = articulo.costoUnitarioOriginal ?? Number(articulo.costoUnitario);
  const precioVenta = Number(articulo.precioVenta ?? 0);
  const valorInventario = costoEnMoneda * Number(articulo.stockActual);
  const margenActual = calcularMargen(costoEnMoneda, precioVenta);
  const gananciaUnitaria = precioVenta > 0 && costoEnMoneda > 0 ? (precioVenta - costoEnMoneda) : 0;
  const sinStock = Number(articulo.stockActual) <= 0;
  const stockBajo = !sinStock && articulo.stockMinimo != null && Number(articulo.stockActual) <= Number(articulo.stockMinimo);

  const guardarAjuste = async () => {
    if (stockReal === "" || Number(stockReal) < 0) { setError("Indicá el stock real contado"); return; }
    setGuardando(true);
    setError(null);
    try {
      await ajustarStockArticulo(articulo.id, { stockReal: Number(stockReal) });
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
      await eliminarArticulo(articulo.id);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
      setGuardando(false);
    }
  };

  return (
    <>
      <tr className={`border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors ${
        sinStock ? "border-l-2 border-l-red-400" : stockBajo ? "border-l-2 border-l-amber-400" : "border-l-2 border-l-transparent"
      }`}>
        <td className="py-2.5 pl-3 pr-2">
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 dark:text-white/80 truncate max-w-[220px]">{articulo.nombre}</div>
            <div className="text-[10px] text-slate-400 dark:text-white/30">{articulo.categoria || "Sin categoría"}</div>
          </div>
        </td>
        <td className="py-2.5 px-2 font-mono text-slate-400 dark:text-white/30 whitespace-nowrap">{articulo.sku || "—"}</td>
        <td className="py-2.5 px-2 text-right whitespace-nowrap">
          <span className={`font-semibold ${sinStock ? "text-red-500" : stockBajo ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-white/70"}`}>
            {Number(articulo.stockActual).toFixed(2)} {articulo.unidadMedida}
          </span>
          {sinStock && <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-red-400">Agotado</span>}
          {stockBajo && <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-amber-500">Bajo mínimo</span>}
        </td>
        {/* Costo/Precio/Valor en $0 se atenúan a propósito — con catálogos
            recién cargados o sin precio definido todavía, la mitad de la
            tabla puede estar en cero; que compitan visualmente con los
            datos reales solo agrega ruido. */}
        <td className={`py-2.5 px-2 text-right font-mono whitespace-nowrap ${costoEnMoneda === 0 ? "text-slate-300 dark:text-white/15" : "text-slate-600 dark:text-white/60"}`}>{fmtCostoEnMoneda(costoEnMoneda, monedaCosto)}</td>
        <td className={`py-2.5 px-2 text-right font-mono whitespace-nowrap ${precioVenta === 0 ? "text-slate-300 dark:text-white/15" : "text-slate-600 dark:text-white/60"}`}>{fmtCostoEnMoneda(precioVenta, monedaCosto)}</td>
        <td className="py-2.5 px-2 text-right whitespace-nowrap">
          {margenActual !== null ? (
            <div className="inline-flex flex-col items-end">
              <span className={`inline-flex items-center font-mono font-black text-xs px-2 py-0.5 rounded-lg border ${
                margenActual >= 30
                  ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30"
                  : margenActual >= 15
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  : margenActual > 0
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  : "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
              }`}>
                {margenActual >= 0 ? `+${margenActual.toFixed(1)}%` : `${margenActual.toFixed(1)}%`}
              </span>
              {gananciaUnitaria !== 0 && (
                <span className="text-[10px] font-mono text-slate-400 dark:text-white/40 mt-0.5 font-medium">
                  {gananciaUnitaria > 0 ? `+${fmtCostoEnMoneda(gananciaUnitaria, monedaCosto)}` : fmtCostoEnMoneda(gananciaUnitaria, monedaCosto)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 dark:text-white/30 italic">Sin precio</span>
          )}
        </td>
        <td className={`py-2.5 px-2 text-right font-mono whitespace-nowrap ${valorInventario === 0 ? "text-slate-300 dark:text-white/15 font-semibold" : "text-slate-800 dark:text-white/80 font-semibold"}`}>{fmtCostoEnMoneda(valorInventario, monedaCosto)}</td>
        <td className="py-2.5 pl-2 pr-3">
          <div className="flex items-center justify-end gap-1.5">
            <button onClick={() => setModo("reabastecer")} title="Añadir inventario (reabastecer)"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 cursor-pointer transition-colors"><IconDownload size={16} /></button>
            <button onClick={() => setModo("ajustar")} title="Corregir stock (conteo físico)"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-500/20 cursor-pointer transition-colors"><IconRefresh size={16} /></button>
            <button onClick={() => setModo("editar")} title="Editar artículo"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/20 cursor-pointer transition-colors"><IconCustomize size={16} /></button>
            <button onClick={eliminar} disabled={guardando} title="Eliminar artículo"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 cursor-pointer disabled:opacity-40 transition-colors"><IconTrash size={16} /></button>
          </div>
        </td>
      </tr>
      {modo === "ver" && error && (
        <tr className="border-b border-slate-100 dark:border-white/5 bg-red-50 dark:bg-red-500/5">
          <td colSpan={8} className="px-3 py-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-red-600 dark:text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer flex-shrink-0">Cerrar</button>
          </td>
        </tr>
      )}
      {modo === "ajustar" && (
        <tr className="border-b border-slate-200/50 dark:border-white/5 bg-slate-50 dark:bg-white/5">
          <td colSpan={8} className="px-3 py-2">
            <p className="text-[10px] text-slate-500 dark:text-white/40 mb-1.5">Sistema dice: {Number(articulo.stockActual)} {articulo.unidadMedida}. Escribí lo que realmente hay contado.</p>
            <div className="flex gap-2 max-w-md">
              <input value={stockReal} onChange={(e) => setStockReal(e.target.value)} type="number" step="0.001" min="0" className="input-horeca text-sm font-bold flex-1" placeholder="Stock real" autoFocus />
              <button onClick={guardarAjuste} disabled={guardando} className="g-aurora text-white text-xs font-semibold px-4 rounded-lg cursor-pointer disabled:opacity-60">
                {guardando ? "Guardando…" : "Corregir"}
              </button>
              <button onClick={() => { setModo("ver"); setError(null); }} className="apple-glass-btn text-xs font-semibold px-4 rounded-lg cursor-pointer">Cancelar</button>
            </div>
            {error && <p className="text-[10px] text-red-500 mt-1.5">{error}</p>}
          </td>
        </tr>
      )}

      {modo === "editar" && (
        <ModalEditarArticulo tenantId={tenantId} articulo={articulo} onClose={() => setModo("ver")} onGuardado={() => { setModo("ver"); onCambio(); }} />
      )}
      {modo === "reabastecer" && (
        <ModalReabastecerArticulo tenantId={tenantId} articulo={articulo} onClose={() => setModo("ver")} onReabastecido={() => { setModo("ver"); onCambio(); }} />
      )}
    </>
  );
}

/**
 * Reabastecimiento express: a diferencia de "Ajustar stock" (que corrige a
 * un total contado a mano), esto SUMA una cantidad recién llegada, con su
 * propio costo y — si el insumo vence — su propio lote, en un solo paso
 * desde la tarjeta del artículo, sin pasar por Compras & Proveedores.
 */
function ModalReabastecerArticulo({ tenantId, articulo, onClose, onReabastecido }: {
  tenantId: number; articulo: Articulo; onClose: () => void; onReabastecido: () => void;
}) {
  const [cantidad, setCantidad] = useState("");
  const [costoUnitario, setCostoUnitario] = useState(String(articulo.costoUnitarioOriginal ?? articulo.costoUnitario));
  const [precioVenta, setPrecioVenta] = useState(String(articulo.precioVenta ?? 0));
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  // Moneda base real del negocio — arranca en la moneda del artículo o moneda base
  const [monedaBaseTenant, setMonedaBaseTenant] = useState("USD");
  const [moneda, setMoneda] = useState(articulo.monedaCosto || "COP");
  useEffect(() => {
    monedaBase(tenantId).then((m) => {
      setMonedaBaseTenant(m);
      if (!articulo.monedaCosto) setMoneda(m);
    }).catch(() => {});
  }, [tenantId, articulo.monedaCosto]);
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [tasaPropiaCompra, setTasaPropiaCompra] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const margen = calcularMargen(Number(costoUnitario) || 0, Number(precioVenta) || 0);

  const guardar = async () => {
    if (!cantidad || Number(cantidad) <= 0) { setError("Indica la cantidad que llegó"); return; }
    if (!costoUnitario || Number(costoUnitario) <= 0) { setError("El costo unitario es obligatorio: no se puede reabastecer sin registrar cuánto costó"); return; }
    if (!precioVenta || Number(precioVenta) <= 0) { setError("El precio de venta es obligatorio"); return; }
    setGuardando(true);
    setError(null);
    try {
      // El costo se manda tal cual lo tecleó el usuario junto con `moneda` — es
      // el backend (ArticuloController) el que lo convierte a la moneda base
      // del tenant antes de guardarlo. unidadesOrigenPorBase es opcional: si el
      // proveedor cobró a una tasa negociada distinta de la tasa registrada del
      // sistema, se puede fijar acá para ESTA compra puntual; si se omite, usa
      // la tasa vigente registrada (comportamiento de siempre).
      await entradaArticulo(articulo.id, {
        cantidad: Number(cantidad), costoUnitario: Number(costoUnitario),
        motivo: "Reabastecimiento rápido", fechaVencimiento: fechaVencimiento || undefined,
        metodoPago, moneda,
        unidadesOrigenPorBase: tasaPropiaCompra ? Number(tasaPropiaCompra) : undefined,
      });
      // El precio de venta no es parte del movimiento de stock — se actualiza
      // aparte solo si cambió, así el reabastecimiento sirve también para
      // corregir de una vez artículos que quedaron sin precio (ej. cargados
      // por Excel sin esa columna).
      if (Number(precioVenta) !== Number(articulo.precioVenta ?? 0)) {
        await editarArticulo(articulo.id, { precioVenta: Number(precioVenta) });
      }
      onReabastecido();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la entrada");
      setGuardando(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo={`Reabastecer · ${articulo.nombre}`}>
      <div className="space-y-3">
        <p className="text-xs text-slate-500">Stock actual: {Number(articulo.stockActual).toFixed(2)} {articulo.unidadMedida}</p>
        <div className="grid grid-cols-2 gap-3">
          <Campo label={`Cantidad a sumar (${articulo.unidadMedida})`}>
            <input value={cantidad} onChange={(e) => setCantidad(e.target.value)} type="number" step="0.001" min="0.001" placeholder="0" className="input-horeca" autoFocus />
          </Campo>
          <Campo label={`Costo unitario (${moneda === "VES" ? "BS" : moneda})`}>
            <input value={costoUnitario} onChange={(e) => setCostoUnitario(e.target.value)} type="number" step="0.01" min="0" placeholder="0.00" className="input-horeca" />
          </Campo>
        </div>
        {moneda !== monedaBaseTenant && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-400">El costo se guarda convertido a {monedaBaseTenant} — por defecto con la tasa vigente registrada. Si el proveedor te cobró a otra tasa negociada, indícala aquí solo para esta compra:</p>
            <Campo label={`Tasa de esta compra (1 ${monedaBaseTenant} = ? ${moneda === "VES" ? "BS" : moneda}) — opcional`}>
              <input value={tasaPropiaCompra} onChange={(e) => setTasaPropiaCompra(e.target.value)} type="number" step="0.0001" min="0" placeholder="Usar tasa vigente registrada" className="input-horeca" />
            </Campo>
          </div>
        )}
        <Campo label={`Precio de venta (${monedaBaseTenant})`}>
          <input value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} type="number" step="0.01" min="0" placeholder="0.00" className="input-horeca" />
        </Campo>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-500">Margen:</span>
          <BadgeMargen margen={margen} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="¿Cómo pagaste esta compra?">
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="input-horeca">
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="BILLETERA_DIGITAL">Billetera digital</option>
            </select>
          </Campo>
          <Campo label="Moneda">
            <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className="input-horeca">
              <option value="COP">COP</option>
              <option value="USD">USD</option>
              <option value="VES">BS</option>
            </select>
          </Campo>
        </div>
        <p className="text-[10px] text-slate-400">Esto registra el gasto real en caja (Ingresos & Gastos), igual que cualquier otra salida de dinero.</p>
        <Campo label="Fecha de vencimiento (opcional)">
          <input value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} type="date" className="input-horeca" />
        </Campo>
        {fechaVencimiento && (
          <p className={`text-[11px] font-semibold ${diasParaVencerTexto(fechaVencimiento).color}`}>
            {diasParaVencerTexto(fechaVencimiento).texto} — Aurora crea el lote y avisará en Vencimientos.
          </p>
        )}
        {cantidad && costoUnitario && (
          <p className="text-xs text-slate-500">
            Nuevo stock: <strong className="text-slate-900">{(Number(articulo.stockActual) + Number(cantidad)).toFixed(2)} {articulo.unidadMedida}</strong>
            {" · "}Costo de esta entrada: <strong className="text-slate-900">{fmtCostoEnMoneda(Number(cantidad) * Number(costoUnitario), moneda)}</strong>
          </p>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={guardar} disabled={guardando} className="flex-1 g-aurora text-white text-sm font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {guardando ? "Registrando…" : "Reabastecer"}
          </button>
          <button onClick={onClose} className="flex-1 apple-glass-btn text-sm font-semibold py-2.5 rounded-xl cursor-pointer">Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Reduce el tamaño de la foto de la factura ANTES de mandarla a la IA — un
 * teléfono moderno toma fotos de 8-15 MB en 4000px+ de ancho, y ni la subida
 * ni la lectura de Gemini necesitan esa resolución para leer texto impreso.
 * Achicar a ~1600px de lado máximo en JPEG calidad 82% recorta el tamaño del
 * archivo en 80-95% típicamente, sin perder legibilidad, y acelera bastante
 * la respuesta. No toca PDFs — solo tiene sentido para imágenes.
 */
async function comprimirImagenFactura(archivo: File): Promise<File> {
  if (!archivo.type.startsWith("image/")) return archivo;
  const LADO_MAXIMO = 1600;
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    if (escala >= 1 && archivo.size < 1_500_000) return archivo; // ya es chica, no vale la pena reprocesar
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return archivo;
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return archivo;
    return new File([blob], archivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return archivo; // si algo falla comprimiendo, se sube la original tal cual
  }
}

/**
 * Buscador con dropdown para el proveedor de la compra — mismo patrón que
 * BuscadorArticulo. Se puede escribir un nombre nuevo y crearlo ahí mismo
 * (sin depender de que la IA lo haya leído de una foto): a veces el proveedor
 * llega en persona o por teléfono, sin factura para escanear todavía.
 */
function BuscadorProveedor({ proveedores, proveedorId, onSeleccionar, onCrear, creando }: {
  proveedores: ProveedorHoreca[] | null; proveedorId: string;
  onSeleccionar: (id: string) => void; onCrear: (nombre: string) => void; creando: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement | null>(null);

  const seleccionado = (proveedores || []).find((p) => String(p.id) === proveedorId) || null;

  useEffect(() => {
    if (!abierto) return;
    const handler = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [abierto]);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return (proveedores || []).slice(0, 30);
    return (proveedores || []).filter((p) => p.nombre.toLowerCase().includes(q)).slice(0, 30);
  }, [proveedores, busqueda]);

  const nombreNuevo = busqueda.trim();
  const yaExiste = resultados.some((p) => p.nombre.toLowerCase() === nombreNuevo.toLowerCase());

  return (
    <div className="relative" ref={contenedorRef}>
      <input
        value={abierto ? busqueda : (seleccionado ? seleccionado.nombre : "")}
        onChange={(e) => { setBusqueda(e.target.value); if (!abierto) setAbierto(true); }}
        onFocus={() => { setBusqueda(""); setAbierto(true); }}
        placeholder="Buscar o escribir un proveedor nuevo…"
        className="input-horeca w-full"
      />
      {abierto && (
        <div className="absolute z-20 mt-1 w-full min-w-[220px] bg-white dark:bg-slate-800 rounded-xl border border-slate-300/60 dark:border-white/10 max-h-52 overflow-y-auto shadow-lg">
          {resultados.length === 0 && !nombreNuevo && (
            <p className="px-3 py-2 text-xs text-slate-400">Sin resultados.</p>
          )}
          {resultados.map((p) => (
            <button key={p.id} type="button"
              onClick={() => { onSeleccionar(String(p.id)); setBusqueda(""); setAbierto(false); }}
              className="w-full text-left px-3 py-2 hover:bg-teal-500/10 text-xs cursor-pointer">
              <span className="font-semibold text-slate-800 dark:text-white/80">{p.nombre}</span>
            </button>
          ))}
          {nombreNuevo.length >= 2 && !yaExiste && (
            <button type="button" disabled={creando}
              onClick={() => { onCrear(nombreNuevo); setBusqueda(""); setAbierto(false); }}
              className="w-full text-left px-3 py-2 hover:bg-teal-500/10 text-xs cursor-pointer text-teal-600 dark:text-teal-400 font-semibold border-t border-slate-200/60 dark:border-white/10 disabled:opacity-60">
              {creando ? "Creando…" : `+ Crear proveedor "${nombreNuevo}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface FilaCompra {
  articuloId: string; cantidad: string; costoUnitario: string; fechaVencimiento: string;
  // Nombre leído de la foto — SIEMPRE editable mientras no se haya vinculado
  // (articuloId vacío) o se haya creado el artículo. La IA NUNCA decide sola
  // qué artículo es: como mucho, propone (ver articuloSugeridoId/Nombre) y el
  // usuario elige explícitamente usar la sugerencia o crear uno nuevo con el
  // nombre que deje escrito acá.
  descripcionOcr?: string;
  // Precio de venta que el usuario teclea ahí mismo al crear el artículo nuevo
  // (opcional — solo tiene sentido si el ítem se vende tal cual, ej. una lata
  // de refresco; un insumo de receta se cobra vía el escandallo, no aquí).
  precioVentaNuevo?: string;
  // Coincidencia que la IA encontró por texto en tu inventario — solo una
  // PROPUESTA, nunca se aplica sola. El usuario debe apretar "Usar este" para
  // que articuloId quede vinculado a él.
  articuloSugeridoId?: string;
  articuloSugeridoNombre?: string;
}
const filaVacia = (): FilaCompra => ({ articuloId: "", cantidad: "", costoUnitario: "", fechaVencimiento: "" });

/** Buscador con dropdown para elegir un artículo por nombre o SKU — reemplaza el <select> plano de una lista larga de inventario en la factura de compra. */
function BuscadorArticulo({ articulos, articuloId, onSeleccionar }: {
  articulos: Articulo[] | null; articuloId: string; onSeleccionar: (id: string) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement | null>(null);

  const seleccionado = (articulos || []).find((a) => String(a.id) === articuloId) || null;

  useEffect(() => {
    if (!abierto) return;
    const handler = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [abierto]);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return (articulos || []).slice(0, 30);
    return (articulos || []).filter((a) => a.nombre.toLowerCase().includes(q) || a.sku.toLowerCase().includes(q)).slice(0, 30);
  }, [articulos, busqueda]);

  return (
    <div className="relative" ref={contenedorRef}>
      <input
        value={abierto ? busqueda : (seleccionado ? `${seleccionado.nombre} (${seleccionado.sku})` : "")}
        onChange={(e) => { setBusqueda(e.target.value); if (!abierto) setAbierto(true); }}
        onFocus={() => { setBusqueda(""); setAbierto(true); }}
        placeholder="Buscar artículo por nombre o SKU…"
        className="input-horeca w-full"
      />
      {abierto && (
        <div className="absolute z-20 mt-1 w-full min-w-[220px] bg-white dark:bg-slate-800 rounded-xl border border-slate-300/60 dark:border-white/10 max-h-52 overflow-y-auto shadow-lg">
          {resultados.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">Sin resultados.</p>
          ) : (
            resultados.map((a) => (
              <button key={a.id} type="button"
                onClick={() => { onSeleccionar(String(a.id)); setBusqueda(""); setAbierto(false); }}
                className="w-full text-left px-3 py-2 hover:bg-teal-500/10 text-xs cursor-pointer flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-800 dark:text-white/80 truncate">{a.nombre}</span>
                <span className="text-slate-400 font-mono flex-shrink-0">{a.sku}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function RegistrarCompra({ tenantId, proveedores, articulos, onCambio }: {
  tenantId: number; proveedores: ProveedorHoreca[] | null; articulos: Articulo[] | null; onCambio: () => void;
}) {
  const [proveedorId, setProveedorId] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  // Moneda en la que el proveedor cobró ESTA factura (ej. proveedor que cobra en
  // bolívares) — se aplica a todos los costos unitarios de la lista; el backend
  // los convierte a la moneda base del tenant antes de guardar.
  const [monedaFactura, setMonedaFactura] = useState("USD");
  const [filas, setFilas] = useState<FilaCompra[]>([filaVacia()]);
  const [montoPagadoAhora, setMontoPagadoAhora] = useState("");
  const [monedaPago, setMonedaPago] = useState("USD");
  const [diasCredito, setDiasCredito] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  const [leyendoFoto, setLeyendoFoto] = useState(false);
  const [avisoOcr, setAvisoOcr] = useState<string | null>(null);
  // Separado de `error` a propósito: un fallo al leer la foto (ej. falta la
  // API key de Gemini) no debe quedar pegado como si fuera un error al
  // registrar la compra — confunde, porque aparecen en momentos distintos.
  const [errorOcr, setErrorOcr] = useState<string | null>(null);
  // Nombre que la IA leyó en la foto cuando no coincide con ningún proveedor ya
  // registrado — permite crearlo sin salir de esta pantalla.
  const [proveedorSugerido, setProveedorSugerido] = useState<string | null>(null);
  const [creandoProveedor, setCreandoProveedor] = useState(false);
  // Índice de la fila cuyo artículo se está creando al vuelo (null = ninguna).
  const [creandoArticuloIdx, setCreandoArticuloIdx] = useState<number | null>(null);
  const inputFotoRef = useRef<HTMLInputElement | null>(null);

  // Crea el artículo con lo mínimo indispensable (nombre + SKU autogenerado +
  // unidad "UND" por defecto) para no frenar la carga de la factura — el
  // usuario completa categoría, precio de venta, etc. después desde Inventario.
  const crearArticuloDeFila = async (idx: number, descripcion: string, precioVenta: string | undefined) => {
    setCreandoArticuloIdx(idx);
    setError(null);
    try {
      const sku = `AUTO-${Date.now().toString(36).toUpperCase()}`;
      const nuevo = await crearArticulo({
        sku, nombre: descripcion, unidadMedida: "UND",
        precioVenta: precioVenta && Number(precioVenta) > 0 ? Number(precioVenta) : undefined,
      });
      setFilas((prev) => prev.map((f, i) => (i === idx ? {
        ...f, articuloId: String(nuevo.id), descripcionOcr: undefined, precioVentaNuevo: undefined,
        articuloSugeridoId: undefined, articuloSugeridoNombre: undefined,
      } : f)));
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el artículo");
    } finally {
      setCreandoArticuloIdx(null);
    }
  };

  const crearProveedor = async (nombre: string) => {
    if (!nombre.trim()) return;
    setCreandoProveedor(true);
    setError(null);
    try {
      const nuevo = await crearProveedorHoreca(tenantId, { nombre: nombre.trim() });
      setProveedorId(String(nuevo.id));
      setProveedorSugerido(null);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el proveedor");
    } finally {
      setCreandoProveedor(false);
    }
  };

  const actualizarFila = (idx: number, campo: keyof FilaCompra, valor: string) => {
    setFilas((prev) => prev.map((f, i) => (i === idx ? { ...f, [campo]: valor } : f)));
  };
  const agregarFila = () => setFilas((prev) => [...prev, filaVacia()]);

  // Busca el artículo cuyo nombre o SKU más se acerque a la descripción leída por IA —
  // coincidencia simple por inclusión de texto, nunca exacta (la IA transcribe con variaciones).
  const buscarArticuloPorDescripcion = (descripcion: string): Articulo | null => {
    const q = descripcion.trim().toLowerCase();
    if (!q || !articulos) return null;
    return (
      articulos.find((a) => a.nombre.toLowerCase() === q) ||
      articulos.find((a) => a.nombre.toLowerCase().includes(q) || q.includes(a.nombre.toLowerCase())) ||
      articulos.find((a) => a.sku.toLowerCase() === q) ||
      null
    );
  };

  const subirFotoFactura = async (file: File) => {
    setLeyendoFoto(true);
    setErrorOcr(null);
    setAvisoOcr(null);
    try {
      const archivoOptimizado = await comprimirImagenFactura(file);
      const datos = await extraerFacturaOcr(archivoOptimizado);

      if (datos.numeroFactura) setNumeroFactura(datos.numeroFactura);

      if (datos.proveedor && proveedores) {
        const pNombre = datos.proveedor.trim().toLowerCase();
        const match = proveedores.find(
          (p) => p.nombre.toLowerCase() === pNombre || p.nombre.toLowerCase().includes(pNombre) || pNombre.includes(p.nombre.toLowerCase())
        );
        if (match) setProveedorId(String(match.id));
        else setProveedorSugerido(datos.proveedor.trim());
      }

      const nuevasFilas: FilaCompra[] = (datos.items || [])
        .filter((it) => it.descripcion)
        .map((it) => {
          const encontrado = buscarArticuloPorDescripcion(it.descripcion);
          return {
            // Nunca se vincula solo — articuloId arranca SIEMPRE vacío; el
            // usuario elige "Usar este" (sugerencia) o "+ Crear artículo".
            articuloId: "",
            cantidad: it.cantidad ? String(it.cantidad) : "",
            costoUnitario: it.precioUnitario ? String(it.precioUnitario) : "",
            fechaVencimiento: "",
            descripcionOcr: it.descripcion,
            precioVentaNuevo: encontrado?.precioVenta ? String(encontrado.precioVenta) : undefined,
            articuloSugeridoId: encontrado ? String(encontrado.id) : undefined,
            articuloSugeridoNombre: encontrado ? encontrado.nombre : undefined,
          };
        });

      if (nuevasFilas.length === 0) {
        setErrorOcr("La foto no arrojó ítems legibles — cárgalos manualmente o probá con una foto más clara.");
      } else {
        setFilas(nuevasFilas);
        const conSugerencia = nuevasFilas.filter((f) => f.articuloSugeridoId).length;
        setAvisoOcr(
          `Se leyeron ${nuevasFilas.length} artículos. ${conSugerencia > 0 ? `${conSugerencia} tienen una posible coincidencia en tu inventario — revísala y confírmala.` : ""} Nada se vincula ni se crea solo: revisa cada nombre, cantidad y costo antes de guardar.`
        );
      }
    } catch (e) {
      setErrorOcr(e instanceof Error ? e.message : "No se pudo leer la factura");
    } finally {
      setLeyendoFoto(false);
      if (inputFotoRef.current) inputFotoRef.current.value = "";
    }
  };
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
        monedaCosto: monedaFactura !== "USD" ? monedaFactura : undefined,
      });
    }
    if (items.length === 0) { setError("Agrega al menos un artículo con cantidad y costo"); return; }
    setGuardando(true);
    try {
      await registrarCompraInsumo(tenantId, {
        proveedorId: Number(proveedorId), numeroFactura: numeroFactura.trim(), items,
        montoPagadoAhora: montoPagadoAhora ? Number(montoPagadoAhora) : undefined,
        monedaPago: montoPagadoAhora ? monedaPago : undefined,
        diasCredito: diasCredito ? Number(diasCredito) : undefined,
      });
      // Si el usuario tecleó/ajustó un precio de venta para algún artículo de la
      // lista, se guarda aparte — registrarCompraInsumo solo toca costo/stock.
      for (const f of filas) {
        if (f.articuloId && f.precioVentaNuevo && Number(f.precioVentaNuevo) > 0) {
          await editarArticulo(Number(f.articuloId), { precioVenta: Number(f.precioVentaNuevo) }).catch(() => {});
        }
      }
      setFilas([filaVacia()]);
      setNumeroFactura("");
      setMontoPagadoAhora("");
      setDiasCredito("");
      setMonedaFactura("USD");
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

      <div className="flex items-center gap-3 flex-wrap">
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
          className="flex items-center gap-2 apple-glass-btn text-xs font-semibold py-2 px-3.5 rounded-xl cursor-pointer disabled:opacity-60"
        >
          <IconFileText size={14} />
          {leyendoFoto ? "Leyendo factura…" : "Cargar con foto de la factura"}
        </button>
        <span className="text-[10px] text-slate-400">Sube una foto o PDF y Aurora completa los artículos, cantidades y costos — siempre revisa antes de guardar.</span>
      </div>
      {avisoOcr && <p className="text-xs text-teal-600 dark:text-teal-400">{avisoOcr}</p>}
      {errorOcr && <p className="text-xs text-red-500">{errorOcr}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1">
          <label className="block text-[10px] font-semibold text-slate-400 dark:text-white/30 uppercase tracking-wider mb-1">Proveedor</label>
          <BuscadorProveedor
            proveedores={proveedores}
            proveedorId={proveedorId}
            onSeleccionar={(id) => { setProveedorId(id); setProveedorSugerido(null); }}
            onCrear={crearProveedor}
            creando={creandoProveedor}
          />
          {proveedorSugerido && (
            <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs">
              <span className="text-amber-600 dark:text-amber-400">
                La foto dice "<strong>{proveedorSugerido}</strong>" — no está registrado todavía.
              </span>
              <button
                type="button"
                onClick={() => crearProveedor(proveedorSugerido)}
                disabled={creandoProveedor}
                className="apple-glass-btn font-semibold py-1 px-2.5 rounded-lg cursor-pointer disabled:opacity-60"
              >
                {creandoProveedor ? "Creando…" : `+ Crear proveedor "${proveedorSugerido}"`}
              </button>
            </div>
          )}
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 dark:text-white/30 uppercase tracking-wider mb-1">N.º de factura</label>
          <input value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} placeholder="N.º de factura" className="input-horeca w-full" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 dark:text-white/30 uppercase tracking-wider mb-1">Moneda de la factura</label>
          <select value={monedaFactura} onChange={(e) => setMonedaFactura(e.target.value)} className="input-horeca w-full">
            {["USD", "VES", "COP"].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Artículos comprados</p>
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_auto] gap-2 px-0.5">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-white/30 uppercase tracking-wider">Artículo</span>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-white/30 uppercase tracking-wider">Cantidad</span>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-white/30 uppercase tracking-wider">Costo unitario ({monedaFactura})</span>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-white/30 uppercase tracking-wider">Precio de venta (opcional)</span>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-white/30 uppercase tracking-wider">Vencimiento (opcional)</span>
          <span />
        </div>
        {filas.map((f, idx) => (
          <div key={idx} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_1.2fr_auto] gap-2 items-center">
            <div>
              {f.articuloId || f.descripcionOcr === undefined ? (
                // Ya vinculado a un artículo (elegido a mano o confirmado por el usuario),
                // o una fila manual sin lectura de foto — el buscador es el control normal.
                <BuscadorArticulo articulos={articulos} articuloId={f.articuloId} onSeleccionar={(id) => {
                  const seleccionado = (articulos || []).find((a) => String(a.id) === id);
                  setFilas((prev) => prev.map((row, i) => (i === idx ? {
                    ...row, articuloId: id, descripcionOcr: undefined,
                    precioVentaNuevo: seleccionado?.precioVenta ? String(seleccionado.precioVenta) : row.precioVentaNuevo,
                  } : row)));
                }} />
              ) : (
                // Recién leído de la foto y SIN vincular todavía — el nombre es un campo de
                // texto editable de una, nunca un valor ya decidido. La IA como mucho propone
                // (articuloSugeridoId) pero el usuario debe apretar "Usar este" para aplicarlo.
                <input
                  value={f.descripcionOcr}
                  onChange={(e) => actualizarFila(idx, "descripcionOcr", e.target.value)}
                  placeholder="Nombre del artículo"
                  className="input-horeca w-full font-semibold"
                />
              )}
              {!f.articuloId && f.descripcionOcr && f.descripcionOcr.trim().length >= 3 && (() => {
                // Búsqueda en vivo mientras escribe — por si ya existe algo parecido
                // en el inventario y no hace falta crear uno nuevo (evita duplicados
                // como "LATA COCA COLA 12X355" vs "LATA COCA COLA 355ML").
                const q = f.descripcionOcr.trim().toLowerCase();
                const similares = (articulos || [])
                  .filter((a) => String(a.id) !== f.articuloSugeridoId && a.nombre.toLowerCase().includes(q))
                  .slice(0, 4);
                if (similares.length === 0) return null;
                return (
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="text-slate-400 whitespace-nowrap">¿Ya la tienes?</span>
                    {similares.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setFilas((prev) => prev.map((row, i) => (i === idx ? {
                            ...row, articuloId: String(a.id), descripcionOcr: undefined,
                            articuloSugeridoId: undefined, articuloSugeridoNombre: undefined,
                            precioVentaNuevo: a.precioVenta ? String(a.precioVenta) : row.precioVentaNuevo,
                          } : row)));
                        }}
                        className="apple-glass-btn font-semibold py-1 px-2 rounded-lg cursor-pointer"
                      >
                        {a.nombre}
                      </button>
                    ))}
                  </div>
                );
              })()}
              {!f.articuloId && f.articuloSugeridoId && (
                <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-amber-600 dark:text-amber-400">¿Es este? <strong>{f.articuloSugeridoNombre}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      const seleccionado = (articulos || []).find((a) => String(a.id) === f.articuloSugeridoId);
                      setFilas((prev) => prev.map((row, i) => (i === idx ? {
                        ...row, articuloId: f.articuloSugeridoId!, descripcionOcr: undefined,
                        articuloSugeridoId: undefined, articuloSugeridoNombre: undefined,
                        precioVentaNuevo: seleccionado?.precioVenta ? String(seleccionado.precioVenta) : row.precioVentaNuevo,
                      } : row)));
                    }}
                    className="text-teal-600 dark:text-teal-400 font-semibold cursor-pointer"
                  >
                    Usar este
                  </button>
                </div>
              )}
              {!f.articuloId && f.descripcionOcr !== undefined && (
                <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs">
                  <button
                    type="button"
                    onClick={() => crearArticuloDeFila(idx, f.descripcionOcr!.trim(), f.precioVentaNuevo)}
                    disabled={creandoArticuloIdx === idx || !f.descripcionOcr.trim()}
                    className="apple-glass-btn font-semibold py-1 px-2.5 rounded-lg cursor-pointer disabled:opacity-60"
                  >
                    {creandoArticuloIdx === idx ? "Creando…" : `+ Crear artículo "${f.descripcionOcr}"`}
                  </button>
                </div>
              )}
            </div>
            <input value={f.cantidad} onChange={(e) => actualizarFila(idx, "cantidad", e.target.value)} type="number" step="0.001" placeholder="Cantidad" className="input-horeca" />
            <input value={f.costoUnitario} onChange={(e) => actualizarFila(idx, "costoUnitario", e.target.value)} type="number" step="0.01" placeholder={`Costo unit. ${monedaFactura}`} className="input-horeca" />
            <div>
              {/* Precio de venta: SIEMPRE visible y opcional, sin importar si el artículo
                  ya existe, se acaba de emparejar o todavía ni se ha elegido/creado —
                  no depender de ningún otro estado de la fila para decidir si se muestra. */}
              <input
                value={f.precioVentaNuevo || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d*$/.test(v)) actualizarFila(idx, "precioVentaNuevo", v);
                }}
                type="text" inputMode="decimal"
                placeholder="$ (opcional)"
                className="input-horeca w-full"
              />
              {f.precioVentaNuevo && Number(f.precioVentaNuevo) > 0 && f.costoUnitario && monedaFactura === "USD" && (
                (() => {
                  const margen = calcularMargen(Number(f.costoUnitario), Number(f.precioVentaNuevo));
                  return margen !== null ? (
                    <p className={`text-[10px] mt-1 font-semibold ${margen < 0 ? "text-red-500" : margen < 20 ? "text-amber-500" : "text-teal-600 dark:text-teal-400"}`}>
                      Margen: {margen.toFixed(0)}%
                    </p>
                  ) : null;
                })()
              )}
            </div>
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

      <div className="pt-2 border-t border-slate-300/50 dark:border-white/10 space-y-3">
        <div className="text-xs text-slate-500 dark:text-white/40">
          Total: <strong className="text-slate-900 dark:text-white">{totalCompra.toFixed(2)} {monedaFactura}</strong>
          {conVencimiento > 0 && <span className="ml-2 text-amber-500">· {conVencimiento} con fecha de vencimiento</span>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 max-w-sm">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1">¿Cuánto le pagás al proveedor ahora?</label>
            <input value={montoPagadoAhora} onChange={(e) => setMontoPagadoAhora(e.target.value)} type="number" step="0.01" min="0" placeholder="0.00 — déjalo vacío si es todo a crédito" className="input-horeca" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1">Moneda</label>
            <select value={monedaPago} onChange={(e) => setMonedaPago(e.target.value)} className="input-horeca">
              {["USD", "VES", "COP"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        {montoPagadoAhora && Number(montoPagadoAhora) > 0 && (
          Number(montoPagadoAhora) >= totalCompra && monedaPago === "USD" ? (
            <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">✓ Factura pagada de una vez — no queda cuenta por pagar.</p>
          ) : (
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Queda pendiente por pagar al proveedor — se registra como Cuenta por Pagar (visible en Administración).
            </p>
          )
        )}
        {!(montoPagadoAhora && Number(montoPagadoAhora) >= totalCompra && monedaPago === "USD") && (
          <div className="max-w-[200px]">
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1">Días de crédito (opcional)</label>
            <input
              value={diasCredito}
              onChange={(e) => setDiasCredito(e.target.value)}
              type="number" step="1" min="0"
              placeholder="Ej. 5 — según la factura"
              className="input-horeca"
            />
            {diasCredito && Number(diasCredito) > 0 && (
              <p className="text-[10px] mt-1 text-slate-400">
                Vence el {new Date(Date.now() + Number(diasCredito) * 86400000).toLocaleDateString("es-VE")}
              </p>
            )}
          </div>
        )}
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
  const [lotes, setLotes] = useState<LoteArticulo[] | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "30" | "15" | "7">("todos");

  useEffect(() => {
    listarTodosLotesConVencimiento(tenantId).then(setLotes).catch(() => setLotes([]));
  }, [tenantId]);

  const diasRestantes = (fecha: string) => {
    const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
    const venc = new Date(fecha + "T00:00:00");
    return Math.round((venc.getTime() - hoy0.getTime()) / 86400000);
  };

  // Siempre se muestran TODOS los lotes con fecha de vencimiento — antes la
  // pantalla solo traía lo que ya estaba por vencer en la ventana elegida
  // (7/15/30 días) y si nada calzaba se veía "todo en orden" aunque hubiera
  // insumos perecederos normales. Ahora la urgencia es solo un color/badge
  // sobre la lista completa, y los botones 7/15/30 filtran esa misma lista
  // sin ocultar el resto de los productos (el filtro "Todos" siempre existe).
  const urgencia = (d: number) => (d < 0 ? "vencido" : d <= 7 ? "critico" : d <= 15 ? "proximo" : d <= 30 ? "atencion" : "normal");
  const estilos: Record<string, string> = {
    vencido: "border-red-500/60 bg-red-500/10 text-red-600 dark:text-red-300",
    critico: "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    proximo: "border-yellow-500/40 bg-yellow-500/5 text-yellow-700 dark:text-yellow-300",
    atencion: "border-teal-500/40 bg-teal-500/5 text-teal-600 dark:text-teal-300",
    normal: "border-slate-300/40 dark:border-white/10 bg-transparent text-slate-500 dark:text-white/50",
  };
  const etiquetas: Record<string, (d: number) => string> = {
    vencido: (d) => `Vencido hace ${Math.abs(d)} día${Math.abs(d) === 1 ? "" : "s"}`,
    critico: (d) => (d === 0 ? "Vence hoy" : `Vence en ${d} día${d === 1 ? "" : "s"}`),
    proximo: (d) => `Vence en ${d} días`,
    atencion: (d) => `Vence en ${d} días`,
    normal: (d) => `Vence en ${d} días`,
  };

  const lotesOrdenados = lotes ? [...lotes].sort((a, b) => diasRestantes(a.fechaVencimiento) - diasRestantes(b.fechaVencimiento)) : null;
  const lotesFiltrados = lotesOrdenados?.filter((l) => {
    if (filtro === "todos") return true;
    const d = diasRestantes(l.fechaVencimiento);
    return d <= Number(filtro);
  }) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500 dark:text-white/40">Todos los insumos perecederos, ordenados del más próximo a vencer al más lejano.</p>
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/5 text-xs">
          {(["todos", "30", "15", "7"] as const).map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${filtro === f ? "bg-teal-600 text-white" : "text-slate-600 dark:text-white/60"}`}>
              {f === "todos" ? "Todos" : `${f} días`}
            </button>
          ))}
        </div>
      </div>

      {lotesFiltrados === null ? (
        <p className="text-sm text-slate-400">Cargando alertas…</p>
      ) : lotesFiltrados.length === 0 ? (
        <div className="apple-glass rounded-2xl p-8 text-center flex flex-col items-center gap-2">
          <IconCheckCircle size={28} />
          <p className="text-slate-500 dark:text-white/40 text-sm">{filtro === "todos" ? "Aún no tienes insumos con fecha de vencimiento registrada." : `Sin insumos por vencer en los próximos ${filtro} días.`}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {lotesFiltrados.map((l) => {
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
// Valores de fábrica de cargos e impuestos — el negocio los ajusta una vez
// acá y desde ese momento aparecen como chips listos para aplicar (o no) en
// cada venta, sin tener que escribir el monto/porcentaje cada vez.
const CARGOS_POR_DEFECTO = { propinaPct: 10, deliveryMonto: 2, empaqueMonto: 0.5, comisionPct: 3 };
const IMPUESTOS_POR_DEFECTO = { ivaPct: 16, igtfPct: 3 };
// USD siempre está disponible como moneda de cobro/gasto (sin importar cuál
// sea la moneda base del negocio) — VES/COP se pueden apagar si el negocio
// no opera con esa moneda (ej. lejos de la frontera colombiana).
const MONEDAS_POR_DEFECTO = { VES: true, COP: true };

function Configuracion({ tenantId, config, onGuardar, onZonasCocinaGuardadas, onZonasMesaGuardadas }: { tenantId: number; config: any; onGuardar: (c: any) => void; onZonasCocinaGuardadas: () => void; onZonasMesaGuardadas: () => void }) {
  const [form, setForm] = useState({
    ...config,
    cargosPorDefecto: { ...CARGOS_POR_DEFECTO, ...(config.cargosPorDefecto || {}) },
    impuestosPorDefecto: { ...IMPUESTOS_POR_DEFECTO, ...(config.impuestosPorDefecto || {}) },
    modulosActivos: { recetas: true, ...(config.modulosActivos || {}) },
    monedasActivas: { ...MONEDAS_POR_DEFECTO, ...(config.monedasActivas || {}) },
  });
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

      <MonedaBaseNegocio />
      <OrigenTasaActivaConfig tenantId={tenantId} />
      <ZonasCocinaConfig onGuardado={onZonasCocinaGuardadas} />
      <ZonasMesaConfig onGuardado={onZonasMesaGuardadas} />
      <BinancePayConfig />

      <div className="apple-glass rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base">Cargos por defecto</h3>
          <p className="text-slate-500 dark:text-white/40 text-xs mt-0.5">Valores listos para agregar con un clic al cerrar una venta — el cajero puede ajustarlos ahí si un caso puntual lo requiere.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Propina sugerida (%)">
            <input type="number" step="0.5" min="0" value={form.cargosPorDefecto.propinaPct}
              onChange={(e) => setForm({ ...form, cargosPorDefecto: { ...form.cargosPorDefecto, propinaPct: Number(e.target.value) } })} className="input-horeca" />
          </Campo>
          <Campo label="Comisión de pago (%)">
            <input type="number" step="0.5" min="0" value={form.cargosPorDefecto.comisionPct}
              onChange={(e) => setForm({ ...form, cargosPorDefecto: { ...form.cargosPorDefecto, comisionPct: Number(e.target.value) } })} className="input-horeca" />
          </Campo>
          <Campo label="Delivery ($)">
            <input type="number" step="0.25" min="0" value={form.cargosPorDefecto.deliveryMonto}
              onChange={(e) => setForm({ ...form, cargosPorDefecto: { ...form.cargosPorDefecto, deliveryMonto: Number(e.target.value) } })} className="input-horeca" />
          </Campo>
          <Campo label="Empaque ($)">
            <input type="number" step="0.10" min="0" value={form.cargosPorDefecto.empaqueMonto}
              onChange={(e) => setForm({ ...form, cargosPorDefecto: { ...form.cargosPorDefecto, empaqueMonto: Number(e.target.value) } })} className="input-horeca" />
          </Campo>
        </div>
      </div>

      <div className="apple-glass rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base">Impuestos</h3>
          <p className="text-slate-500 dark:text-white/40 text-xs mt-0.5">El cajero decide en cada venta si aplica IVA y/o IGTF — acá solo se define el porcentaje que se usa cuando los active.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="IVA (%)">
            <input type="number" step="0.5" min="0" value={form.impuestosPorDefecto.ivaPct}
              onChange={(e) => setForm({ ...form, impuestosPorDefecto: { ...form.impuestosPorDefecto, ivaPct: Number(e.target.value) } })} className="input-horeca" />
          </Campo>
          <Campo label="IGTF (%)">
            <input type="number" step="0.5" min="0" value={form.impuestosPorDefecto.igtfPct}
              onChange={(e) => setForm({ ...form, impuestosPorDefecto: { ...form.impuestosPorDefecto, igtfPct: Number(e.target.value) } })} className="input-horeca" />
          </Campo>
        </div>
        <p className="text-[10px] text-slate-400">IGTF aplica típicamente a pagos en divisas (efectivo USD, tarjeta internacional) — actívalo según el método de pago de cada venta, no todas lo requieren.</p>
      </div>

      <div className="apple-glass rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base">Módulos del negocio</h3>
          <p className="text-slate-500 dark:text-white/40 text-xs mt-0.5">No todos los Horeca preparan platos con receta — apágalo si no aplica y desaparece del menú y del catálogo de venta.</p>
        </div>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <div className="text-sm font-semibold text-slate-800 dark:text-white/80">Recetas & Escandallo</div>
            <div className="text-[11px] text-slate-500 dark:text-white/40">Para cocinas que arman platos a partir de ingredientes. Una bodega o venta de productos empacados no lo necesita.</div>
          </div>
          <button type="button" onClick={() => setForm({ ...form, modulosActivos: { ...form.modulosActivos, recetas: !form.modulosActivos.recetas } })}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer flex-shrink-0 ${form.modulosActivos.recetas ? "bg-teal-600" : "bg-slate-300 dark:bg-white/15"}`}>
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${form.modulosActivos.recetas ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </label>
      </div>

      <div className="apple-glass rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base">Monedas activas</h3>
          <p className="text-slate-500 dark:text-white/40 text-xs mt-0.5">USD siempre está disponible para cobros y gastos. Apaga las que tu negocio no use — dejan de pedirse en cobros y desaparecen de los totales.</p>
        </div>
        {([["VES", "Bolívares (VES)"], ["COP", "Pesos colombianos (COP)"]] as const).map(([clave, label]) => (
          <label key={clave} className="flex items-center justify-between gap-3 cursor-pointer">
            <div className="text-sm font-semibold text-slate-800 dark:text-white/80">{label}</div>
            <button type="button" onClick={() => setForm({ ...form, monedasActivas: { ...form.monedasActivas, [clave]: !form.monedasActivas[clave] } })}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer flex-shrink-0 ${form.monedasActivas[clave] ? "bg-teal-600" : "bg-slate-300 dark:bg-white/15"}`}>
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${form.monedasActivas[clave] ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </label>
        ))}
      </div>

      <TasasDeCambio tenantId={tenantId} monedasActivas={form.monedasActivas} />
    </div>
  );
}

/**
 * Moneda principal del negocio — a diferencia de "Monedas activas" (que solo
 * decide cuáles aparecen como opción), esto es la moneda en la que el motor
 * financiero entero valora todo: precios, costos, caja. Antes solo un
 * super-admin la podía cambiar; ahora el propio Dueño/Administrador puede.
 */
function MonedaBaseNegocio() {
  const [monedaBase, setMonedaBaseState] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerMonedaBaseNegocio().then((r) => setMonedaBaseState(r.monedaBase)).catch(() => setMonedaBaseState("USD"));
  }, []);

  const cambiar = async (nueva: string) => {
    if (nueva === monedaBase) return;
    setGuardando(true);
    setError(null);
    try {
      const r = await actualizarMonedaBaseNegocio(nueva);
      setMonedaBaseState(r.monedaBase);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar la moneda principal");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="apple-glass rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base">Moneda principal del negocio</h3>
        <p className="text-slate-500 dark:text-white/40 text-xs mt-0.5">
          En qué moneda opera tu negocio de fondo: precios, costos y caja se valoran en esta. Cambiarla no convierte los montos ya guardados — solo cambia con qué se mide todo de ahora en adelante.
        </p>
      </div>
      <div className="flex items-center gap-2">
        {["USD", "VES", "COP"].map((m) => (
          <button key={m} type="button" onClick={() => cambiar(m)} disabled={guardando || monedaBase === null}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50 ${
              monedaBase === m ? "bg-teal-600 text-white" : "bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-300/60 dark:hover:bg-white/15"
            }`}>
            {m}
          </button>
        ))}
        {guardando && <span className="text-[11px] text-slate-400">Guardando…</span>}
        {guardado && <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">✓ Guardado</span>}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/**
 * Zonas/estaciones de cocina (Salón & Mesas, Cocina KDS, Recetas): antes eran fijas
 * (COCINA/PARRILLA/BAR/COCINA_FRIA) para cualquier negocio — un fast-food con solo mostrador
 * o una cevichería con una zona propia no tenían forma de ajustarlas. `onGuardado` refresca la
 * copia que usan Salón/Cocina/Recetas en el componente raíz, para que el cambio se vea de una
 * sin recargar la página entera.
 */
function ZonasCocinaConfig({ onGuardado }: { onGuardado: () => void }) {
  const [zonas, setZonas] = useState<string[] | null>(null);
  const [nueva, setNueva] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerZonasCocina().then((r) => setZonas(r.zonas)).catch(() => setZonas(["COCINA", "PARRILLA", "BAR", "COCINA_FRIA"]));
  }, []);

  const guardar = async (nuevasZonas: string[]) => {
    setGuardando(true);
    setError(null);
    try {
      const r = await actualizarZonasCocina(nuevasZonas);
      setZonas(r.zonas);
      setGuardado(true);
      onGuardado();
      setTimeout(() => setGuardado(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar las zonas");
    } finally {
      setGuardando(false);
    }
  };

  const agregar = () => {
    const nombre = nueva.trim().toUpperCase().replace(/\s+/g, "_");
    if (!nombre || !zonas) return;
    if (zonas.includes(nombre)) { setNueva(""); return; }
    guardar([...zonas, nombre]);
    setNueva("");
  };

  const eliminar = (zona: string) => {
    if (!zonas) return;
    if (zonas.length <= 1) { setError("Debe quedar al menos una zona de cocina"); return; }
    guardar(zonas.filter((z) => z !== zona));
  };

  const renombrar = (zonaVieja: string, nombreNuevo: string) => {
    if (!zonas) return;
    const limpio = nombreNuevo.trim().toUpperCase().replace(/\s+/g, "_");
    if (!limpio || limpio === zonaVieja) return;
    guardar(zonas.map((z) => (z === zonaVieja ? limpio : z)));
  };

  return (
    <div className="apple-glass rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base">Zonas de cocina</h3>
        <p className="text-slate-500 dark:text-white/40 text-xs mt-0.5">
          Las estaciones que ves en Cocina (KDS) y al asignar un plato en Recetas — arma las que realmente tiene tu negocio, no todos tienen las mismas 4.
        </p>
      </div>
      {zonas === null ? (
        <p className="text-xs text-slate-400">Cargando…</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {zonas.map((z) => (
            <div key={z} className="flex items-center gap-1.5 bg-slate-200/60 dark:bg-white/10 rounded-full pl-3 pr-1.5 py-1.5">
              <input
                defaultValue={z.replace(/_/g, " ")}
                onBlur={(e) => renombrar(z, e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                disabled={guardando}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-white/80 outline-none w-24"
              />
              <button
                type="button"
                onClick={() => eliminar(z)}
                disabled={guardando}
                title="Eliminar zona"
                className="w-5 h-5 rounded-full flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-red-500/20 hover:text-red-500 cursor-pointer disabled:opacity-40"
              >
                <IconClose size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") agregar(); }}
          placeholder="Ej. CEVICHERIA"
          className="input-horeca text-xs max-w-[200px]"
        />
        <button type="button" onClick={agregar} disabled={guardando || !nueva.trim()} className="apple-glass-btn text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer disabled:opacity-50">
          + Agregar zona
        </button>
        {guardando && <span className="text-[11px] text-slate-400">Guardando…</span>}
        {guardado && <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">✓ Guardado</span>}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/** Igual que ZonasCocinaConfig, pero para las zonas físicas de mesas (Salón & Mesas) — ver Mesa.zona. */
function ZonasMesaConfig({ onGuardado }: { onGuardado: () => void }) {
  const [zonas, setZonas] = useState<string[] | null>(null);
  const [nueva, setNueva] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerZonasMesa().then((r) => setZonas(r.zonas)).catch(() => setZonas(["SALON_PRINCIPAL", "TERRAZA", "BARRA"]));
  }, []);

  const guardar = async (nuevasZonas: string[]) => {
    setGuardando(true);
    setError(null);
    try {
      const r = await actualizarZonasMesa(nuevasZonas);
      setZonas(r.zonas);
      setGuardado(true);
      onGuardado();
      setTimeout(() => setGuardado(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar las zonas");
    } finally {
      setGuardando(false);
    }
  };

  const agregar = () => {
    const nombre = nueva.trim().toUpperCase().replace(/\s+/g, "_");
    if (!nombre || !zonas) return;
    if (zonas.includes(nombre)) { setNueva(""); return; }
    guardar([...zonas, nombre]);
    setNueva("");
  };

  const eliminar = (zona: string) => {
    if (!zonas) return;
    if (zonas.length <= 1) { setError("Debe quedar al menos una zona de mesas"); return; }
    guardar(zonas.filter((z) => z !== zona));
  };

  const renombrar = (zonaVieja: string, nombreNuevo: string) => {
    if (!zonas) return;
    const limpio = nombreNuevo.trim().toUpperCase().replace(/\s+/g, "_");
    if (!limpio || limpio === zonaVieja) return;
    guardar(zonas.map((z) => (z === zonaVieja ? limpio : z)));
  };

  return (
    <div className="apple-glass rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base">Zonas de mesas</h3>
        <p className="text-slate-500 dark:text-white/40 text-xs mt-0.5">
          Las áreas físicas del local que ves al crear una mesa en Salón & Mesas (Salón, Terraza, Barra…) — arma las que realmente tiene tu local.
        </p>
      </div>
      {zonas === null ? (
        <p className="text-xs text-slate-400">Cargando…</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {zonas.map((z) => (
            <div key={z} className="flex items-center gap-1.5 bg-slate-200/60 dark:bg-white/10 rounded-full pl-3 pr-1.5 py-1.5">
              <input
                defaultValue={z.replace(/_/g, " ")}
                onBlur={(e) => renombrar(z, e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                disabled={guardando}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-white/80 outline-none w-24"
              />
              <button
                type="button"
                onClick={() => eliminar(z)}
                disabled={guardando}
                title="Eliminar zona"
                className="w-5 h-5 rounded-full flex items-center justify-center text-slate-500 dark:text-white/50 hover:bg-red-500/20 hover:text-red-500 cursor-pointer disabled:opacity-40"
              >
                <IconClose size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") agregar(); }}
          placeholder="Ej. VIP"
          className="input-horeca text-xs max-w-[200px]"
        />
        <button type="button" onClick={agregar} disabled={guardando || !nueva.trim()} className="apple-glass-btn text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer disabled:opacity-50">
          + Agregar zona
        </button>
        {guardando && <span className="text-[11px] text-slate-400">Guardando…</span>}
        {guardado && <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">✓ Guardado</span>}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/**
 * Binance Pay del negocio — cada tenant cobra a SU PROPIA cuenta Binance
 * Merchant, Aurora Plus nunca toca el dinero. El Secret Key se guarda
 * cifrado en el servidor y nunca se vuelve a mostrar completo una vez
 * guardado (por eso el campo se muestra vacío al recargar: en blanco =
 * "no cambiar el que ya está guardado").
 */
function BinancePayConfig() {
  const [estado, setEstado] = useState<EstadoBinancePay | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const cargar = () => obtenerEstadoBinancePay().then((r) => { setEstado(r); setApiKey(r.apiKey || ""); }).catch(() => setEstado({ configurado: false, activo: false, apiKey: null }));
  useEffect(() => { cargar(); }, []);

  const guardar = async (activo: boolean) => {
    setGuardando(true);
    setError(null);
    try {
      await guardarBinancePay({ apiKey: apiKey.trim() || undefined, secretKey: secretKey.trim() || undefined, activo });
      setSecretKey("");
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la configuración de Binance Pay");
    } finally {
      setGuardando(false);
    }
  };

  if (!estado) return null;

  return (
    <div className="apple-glass rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
          <IconCoins size={18} className="text-amber-500" /> Binance Pay
        </h3>
        <p className="text-slate-500 dark:text-white/40 text-xs mt-0.5">
          Cobra directo a TU cuenta Binance Merchant — Aurora Plus nunca ve ni toca el dinero. Necesitas abrir una cuenta Binance Merchant y generar tus propias credenciales API.
        </p>
      </div>
      <Campo label="API Key">
        <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Tu API Key de Binance Merchant" className="input-horeca" />
      </Campo>
      <Campo label={estado.configurado ? "Secret Key (dejar en blanco para no cambiarla)" : "Secret Key"}>
        <input value={secretKey} onChange={(e) => setSecretKey(e.target.value)} type="password" placeholder={estado.configurado ? "•••••••• (ya guardada)" : "Tu Secret Key de Binance Merchant"} className="input-horeca" />
      </Campo>
      {estado.configurado && (
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${estado.activo ? "bg-teal-500" : "bg-slate-400"}`} />
          <span className="text-slate-600 dark:text-white/60">{estado.activo ? "Activo — el botón de cobro aparece en las comandas" : "Guardado pero inactivo"}</span>
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => guardar(true)} disabled={guardando} className="btn-cyber-neon text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
          {guardando ? "Guardando…" : guardado ? "✓ Guardado" : "Guardar y activar"}
        </button>
        {estado.activo && (
          <button onClick={() => guardar(false)} disabled={guardando} className="apple-glass-btn text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer">
            Desactivar
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Cuál de las tres tasas gobierna el cobro en el POS: BCV oficial, USDT/P2P (ambas se
 * consultan solas de su fuente pública, el negocio no las escribe) o Propia (la única que sí
 * define el negocio). Antes esto vivía como un toggle en localStorage del navegador — cada
 * terminal podía terminar cobrando con una tasa distinta. Ahora es una decisión de negocio
 * (Dueño/Administrador), igual que la moneda principal.
 */
function OrigenTasaActivaConfig({ tenantId }: { tenantId: number }) {
  const [origen, setOrigen] = useState<OrigenTasaActiva | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Valor vigente de la tasa Propia — es la única de las tres que el negocio escribe a mano,
  // así que este campo vive aquí mismo: antes solo se podía elegir "Propia" en Configuración
  // pero el número había que ir a teclearlo en el badge del header, sin ninguna pista de que
  // hubiera que hacerlo ahí.
  const [tasaPropiaVal, setTasaPropiaVal] = useState("");
  const [tasaPropiaVigente, setTasaPropiaVigente] = useState<TasaCambio | null>(null);
  const [guardandoPropia, setGuardandoPropia] = useState(false);
  const [guardadoPropia, setGuardadoPropia] = useState(false);

  useEffect(() => {
    obtenerOrigenTasaActiva().then((r) => setOrigen(r.origenTasaActiva)).catch(() => setOrigen("USDT"));
    tasaVigente(tenantId, "USD", "VES", "PERSONALIZADA")
      .then((t) => { setTasaPropiaVigente(t); setTasaPropiaVal(String(Number(t.tasa))); })
      .catch(() => setTasaPropiaVigente(null));
  }, [tenantId]);

  const cambiar = async (nuevo: OrigenTasaActiva) => {
    if (nuevo === origen) return;
    setGuardando(true);
    setError(null);
    try {
      const r = await actualizarOrigenTasaActiva(nuevo);
      setOrigen(r.origenTasaActiva);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar la tasa activa");
    } finally {
      setGuardando(false);
    }
  };

  const guardarTasaPropia = async () => {
    const valor = Number(tasaPropiaVal);
    if (!valor || valor <= 0) { setError("Ingresa una tasa propia válida mayor a cero"); return; }
    setGuardandoPropia(true);
    setError(null);
    try {
      const t = await actualizarTasa(tenantId, { monedaOrigen: "USD", monedaDestino: "VES", tasa: valor, origen: "PERSONALIZADA" });
      setTasaPropiaVigente(t);
      setGuardadoPropia(true);
      setTimeout(() => setGuardadoPropia(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la tasa propia");
    } finally {
      setGuardandoPropia(false);
    }
  };

  const OPCIONES: { id: OrigenTasaActiva; label: string; Icon: typeof IconCoins }[] = [
    { id: "USDT", label: "USDT / P2P", Icon: IconCoins },
    { id: "BCV", label: "BCV Oficial", Icon: IconBank },
    { id: "PERSONALIZADA", label: "Propia", Icon: IconEdit },
  ];

  return (
    <div className="apple-glass rounded-2xl p-6 space-y-4">
      <div>
        <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base">Tasa activa para el POS</h3>
        <p className="text-slate-500 dark:text-white/40 text-xs mt-0.5">
          Cuál referencia usa la caja para calcular totales y vueltos en bolívares. BCV y USDT/P2P se consultan solas de su fuente pública — solo Propia la define este negocio.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OPCIONES.map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={() => cambiar(id)} disabled={guardando || origen === null}
            className={`py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 ${
              origen === id ? "bg-teal-600 text-white" : "bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-300/60 dark:hover:bg-white/15"
            }`}>
            <Icon size={13} />
            <span>{label}</span>
          </button>
        ))}
        {guardando && <span className="text-[11px] text-slate-400 self-center">Guardando…</span>}
        {guardado && <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold self-center">✓ Guardado</span>}
      </div>

      {origen === "PERSONALIZADA" && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3.5 space-y-2">
          <label className="block text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
            Tu tasa propia (1 USD = ? Bs)
          </label>
          <div className="flex items-center gap-2">
            <input
              value={tasaPropiaVal}
              onChange={(e) => setTasaPropiaVal(e.target.value)}
              type="number" step="0.01" min="0" placeholder="Ej. 66.00"
              className="input-horeca flex-1 font-mono font-bold"
            />
            <button onClick={() => void guardarTasaPropia()} disabled={guardandoPropia}
              className="btn-cyber-neon text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-60 whitespace-nowrap">
              {guardandoPropia ? "Guardando…" : "Guardar tasa propia"}
            </button>
          </div>
          {tasaPropiaVigente && (
            <p className="text-[10px] text-amber-700 dark:text-amber-300/80">
              Vigente: Bs. {Number(tasaPropiaVigente.tasa).toFixed(2)} · actualizada {new Date(tasaPropiaVigente.fechaActualizacion).toLocaleString("es-VE")}
            </p>
          )}
          {guardadoPropia && <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">✓ Tasa propia guardada</p>}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function TasasDeCambio({ tenantId, monedasActivas }: { tenantId: number; monedasActivas: typeof MONEDAS_POR_DEFECTO }) {
  // Las tasas se piden SIEMPRE respecto a la moneda base real del negocio
  // (Configuración > Moneda principal), no fijas en USD: un negocio que
  // opera en COP necesita registrar "COP → USD" y "COP → VES", no al revés
  // — es la dirección que de verdad usa el motor de conversión al valorar
  // todo en la moneda base (MotorFinancieroService.convertirAMonedaBase).
  const [monedaBaseTenant, setMonedaBaseTenant] = useState<string | null>(null);
  useEffect(() => { monedaBase(tenantId).then(setMonedaBaseTenant).catch(() => setMonedaBaseTenant("USD")); }, [tenantId]);

  const TODAS_LAS_MONEDAS = ["USD", "VES", "COP"];
  const monedasHabilitadas = TODAS_LAS_MONEDAS.filter((m) => m === "USD" || monedasActivas[m as keyof typeof monedasActivas]);
  const NOMBRE_MONEDA: Record<string, string> = { USD: "Dólar", VES: "Bolívar", COP: "Peso colombiano" };
  const PARES = monedaBaseTenant
    ? monedasHabilitadas
        .filter((m) => m !== monedaBaseTenant)
        .map((m) => ({ origen: monedaBaseTenant, destino: m, label: `${NOMBRE_MONEDA[monedaBaseTenant] || monedaBaseTenant} → ${NOMBRE_MONEDA[m] || m}` }))
    : [];

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (monedaBaseTenant) cargar(); }, [tenantId, monedaBaseTenant, JSON.stringify(monedasActivas)]);

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
const CATEGORIA_RECETAS = "__RECETAS__";
const CATEGORIA_FASTBAR = "__FASTBAR__";

function VentaRapida({ tenantId, escandallos, fastbar, articulos, tasaBcv, tasaCop, ventasHoy, nombreLocal, cargosPorDefecto, impuestosPorDefecto, onVenta, onCerrar, embebido, tasaValida, onRegistrarTasa, onArticuloActualizado }: {
  tenantId: number; escandallos: EscandalloReceta[] | null; fastbar: FastBarTrago[] | null; articulos: Articulo[] | null;
  tasaBcv: TasaCambio | null; tasaCop: TasaCambio | null; ventasHoy: { total: number; moneda: string } | null; nombreLocal: string;
  onVenta: (monto: number, metodo: string) => void; onCerrar?: () => void;
  // Embebido: se monta directo en la Vista General (sin overlay de pantalla
  // completa ni header propio, que duplicarían lo que el dashboard ya
  // muestra) en vez de como modal flotante independiente.
  embebido?: boolean; tasaValida?: boolean; onRegistrarTasa?: () => void;
  // Edición rápida desde la tarjeta del catálogo: el padre actualiza su
  // lista de artículos en memoria con lo que devuelve el PUT, sin volver a
  // pedirla al backend.
  onArticuloActualizado?: (articulo: Articulo) => void;
  // Valores de fábrica configurados en Configuración — el cajero solo
  // decide si los activa en esta venta puntual, no los vuelve a escribir.
  cargosPorDefecto?: typeof CARGOS_POR_DEFECTO; impuestosPorDefecto?: typeof IMPUESTOS_POR_DEFECTO;
}) {
  interface LineaCarrito {
    key: string;
    nombre: string;
    precio: number;
    cantidad: number;
    escandalloId?: number;
    articuloId?: number;
    fastBarTragoId?: number;
    estacionCocina?: string;
    notas?: string;
  }
  interface ReciboVenta {
    comandaId: number; lineas: LineaCarrito[]; total: number; metodoPago: string; fecha: string;
    totalRecibido?: number; vuelto?: number; monedaVuelto?: string;
  }
  interface ItemCatalogo {
    key: string; tipo: "articulo" | "receta" | "fastbar"; id: number; nombre: string; precio: number; categoria: string;
    unidadMedida?: string; stockActual?: number; estacionCocina?: string; sku?: string;
  }

  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [canalVenta, setCanalVenta] = useState<"RECOGER_EN_TIENDA" | "SALON" | "DELIVERY_PROPIO">("RECOGER_EN_TIENDA");
  const [mesaNumero, setMesaNumero] = useState<string>("");
  const [datosDelivery, setDatosDelivery] = useState({ direccion: "", telefono: "", repartidor: "" });
  const [lineaEditandoNota, setLineaEditandoNota] = useState<string | null>(null);
  const [textoNotaTemp, setTextoNotaTemp] = useState<string>("");
  const [mostrarDividirCuenta, setMostrarDividirCuenta] = useState(false);
  // Cargos e impuestos: se guardan como interruptores, no como líneas fijas
  // del carrito — así el monto (% sobre el subtotal de productos) siempre
  // queda correcto aunque el cajero siga agregando o quitando platos
  // después de activarlos.
  const cargosCfg = cargosPorDefecto ?? CARGOS_POR_DEFECTO;
  const impuestosCfg = impuestosPorDefecto ?? IMPUESTOS_POR_DEFECTO;
  const [cargosActivos, setCargosActivos] = useState<Record<"propina" | "delivery" | "empaque" | "comision", boolean>>({
    propina: false, delivery: false, empaque: false, comision: false,
  });
  const [impuestosActivos, setImpuestosActivos] = useState<Record<"iva" | "igtf", boolean>>({ iva: false, igtf: false });
  // Por debajo de "lg" no hay espacio para catálogo + comanda lado a lado
  // (el panel derecho necesita 300-420px mínimo) — se muestra un panel a la
  // vez con una pestaña para cambiar, en vez de aplastar el grid.
  const [vistaMobile, setVistaMobile] = useState<"catalogo" | "carrito">("catalogo");
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [paginaCatalogo, setPaginaCatalogo] = useState(1);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recibo, setRecibo] = useState<ReciboVenta | null>(null);
  const [abriendoTicket, setAbriendoTicket] = useState(false);
  const [imprimiendoEscPos, setImprimiendoEscPos] = useState(false);
  const [moneda, setMoneda] = useState("");
  const [factoresVenta, setFactoresVenta] = useState<Record<string, number | null>>({});
  useEffect(() => { cotizacionCobro().then(r => { setMoneda(r.monedaBase); setFactoresVenta(r.factores); }).catch(() => setError("No se pudo consultar la moneda y las tasas de cobro")); }, [tenantId, tasaBcv, tasaCop]);
  const [mostrarProductoLibre, setMostrarProductoLibre] = useState(false);
  const [articuloEditando, setArticuloEditando] = useState<Articulo | null>(null);
  const [nombreLibre, setNombreLibre] = useState("");
  const [precioLibre, setPrecioLibre] = useState("");
  const [cantidadLibre, setCantidadLibre] = useState("1");
  const [turno, setTurno] = useState<Turno | null | undefined>(undefined);
  const busquedaRef = useRef<HTMLInputElement | null>(null);

  // CRM (opcional, Fase 3): vincular un cliente a la venta no es requisito —
  // sin seleccionar nada, la venta queda anónima exactamente igual que
  // siempre. Nada de esto toca el flujo hasta que el cajero abre el
  // buscador de cliente a propósito.
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  // Flujo por cédula: se escribe primero la cédula/RIF — si ya existe un
  // cliente con esa identificación, se autocompletan nombre y teléfono; si
  // no existe, al salir del campo se registra de una vez en Clientes (con
  // lo que haya, nombre/teléfono son opcionales). Todo en línea, sin abrir
  // ninguna ventana aparte.
  const [cedulaCliente, setCedulaCliente] = useState("");
  const [nombreClienteInline, setNombreClienteInline] = useState("");
  const [telefonoClienteInline, setTelefonoClienteInline] = useState("");
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [guardandoCliente, setGuardandoCliente] = useState(false);


  // Estado del turno de caja para el header operativo — solo lectura acá,
  // la apertura/cierre real sigue viviendo en Administración > Control de Caja.
  useEffect(() => { turnoAbierto(tenantId, moneda).then(setTurno).catch(() => setTurno(null)); }, [tenantId, moneda]);
  // Auto-focus para que un escáner de código de barras (que solo "teclea"
  // rápido + Enter) pueda disparar sin que el cajero tenga que hacer clic.
  useEffect(() => { busquedaRef.current?.focus(); }, []);

  // Catálogo unificado (recetas + Fast-Bar + inventario) para la cuadrícula
  // del panel izquierdo — cada tarjeta agrega al carrito con un solo clic.
  const catalogo = useMemo<ItemCatalogo[]>(() => {
    const recetas: ItemCatalogo[] = (escandallos || [])
      .filter((e) => e.activo !== false)
      .map((e) => ({ key: `receta-${e.id}`, tipo: "receta", id: e.id, nombre: e.nombrePlato, precio: Number(e.precioVenta), categoria: CATEGORIA_RECETAS, estacionCocina: e.estacionCocina }));
    const tragos: ItemCatalogo[] = (fastbar || [])
      .map((t) => ({ key: `fastbar-${t.id}`, tipo: "fastbar", id: t.id, nombre: t.nombreTrago, precio: Number(t.precioVenta), categoria: CATEGORIA_FASTBAR }));
    // Vende al precio de venta configurado en Inventario — solo cae al costo
    // como respaldo en artículos viejos que todavía no tienen un precio de
    // venta cargado, para no mostrar una tarjeta en $0.00.
    const insumos: ItemCatalogo[] = (articulos || [])
      .map((a) => {
        const valVenta = Number(a.precioVenta);
        // precioVenta es el precio configurado en la moneda principal.
        const precioUsd = valVenta;
        return {
          key: `articulo-${a.id}`,
          tipo: "articulo",
          id: a.id,
          nombre: a.nombre,
          precio: Number(precioUsd.toFixed(2)),
          categoria: a.categoria || "General",
          unidadMedida: a.unidadMedida || "unidad",
          stockActual: Number(a.stockActual),
          sku: a.sku,
        };
      });
    return [...recetas, ...tragos, ...insumos];
  }, [escandallos, fastbar, articulos, tasaCop, tasaBcv]);

  const categoriasTabs = useMemo(() => {
    const tabs: { key: string | null; label: string }[] = [{ key: null, label: "Todas" }];
    if ((escandallos || []).some((e) => e.activo !== false)) tabs.push({ key: CATEGORIA_RECETAS, label: "Recetas" });
    if ((fastbar || []).length > 0) tabs.push({ key: CATEGORIA_FASTBAR, label: "Fast-Bar" });
    Array.from(new Set((articulos || []).map((a) => a.categoria || "General"))).filter(esCategoriaValida).sort()
      .forEach((c) => tabs.push({ key: c, label: c }));
    return tabs;
  }, [escandallos, fastbar, articulos]);

  const catalogoFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return catalogo.filter((item) => {
      if (categoriaFiltro && item.categoria !== categoriaFiltro) return false;
      if (!q) return true;
      return item.nombre.toLowerCase().includes(q) || (item.sku || "").toLowerCase().includes(q);
    }).sort((a, b) => Number(b.sku?.toLowerCase() === q) - Number(a.sku?.toLowerCase() === q));
  }, [catalogo, categoriaFiltro, busqueda]);

  // Paginado del catálogo — antes todo el resultado se amontonaba en un
  // solo scroll infinito sin ninguna referencia de cuánto faltaba; ahora
  // se navega de a páginas con un indicador "Página X/Y" visible siempre.
  const PRODUCTOS_POR_PAGINA = 12;
  const totalPaginasCatalogo = Math.max(1, Math.ceil(catalogoFiltrado.length / PRODUCTOS_POR_PAGINA));
  useEffect(() => { setPaginaCatalogo(1); }, [busqueda, categoriaFiltro]);
  useEffect(() => {
    if (paginaCatalogo > totalPaginasCatalogo) setPaginaCatalogo(totalPaginasCatalogo);
  }, [paginaCatalogo, totalPaginasCatalogo]);
  const catalogoPagina = useMemo(
    () => catalogoFiltrado.slice((paginaCatalogo - 1) * PRODUCTOS_POR_PAGINA, paginaCatalogo * PRODUCTOS_POR_PAGINA),
    [catalogoFiltrado, paginaCatalogo]
  );

  // Busca por cédula/RIF a medida que se escribe — si hay un cliente ya
  // registrado con esa identificación exacta, se autocompleta nombre y
  // teléfono. Si no aparece nada, se deja que el cajero siga escribiendo
  // libremente (es un cliente nuevo).
  useEffect(() => {
    if (clienteSel) return;
    const cedula = cedulaCliente.trim();
    if (!cedula) return;
    setBuscandoCliente(true);
    const id = setTimeout(() => {
      listarClientes(tenantId, cedula)
        .then((r) => {
          const match = r.find((c) => (c.identificacionRif || "").trim().toLowerCase() === cedula.toLowerCase());
          if (match) {
            setClienteSel(match);
            setNombreClienteInline(match.nombre || "");
            setTelefonoClienteInline(match.telefono || "");
          }
        })
        .catch(() => {})
        .finally(() => setBuscandoCliente(false));
    }, 300);
    return () => clearTimeout(id);
  }, [tenantId, cedulaCliente, clienteSel]);

  // Al salir de CUALQUIERA de los tres campos (cédula, nombre o teléfono): si
  // quedó algo escrito en al menos uno y no matcheó ningún cliente existente,
  // se registra de una vez en Clientes — antes solo la cédula disparaba esto,
  // dejando fuera del CRM a cualquier venta donde el cajero solo apuntara el
  // nombre o el teléfono del cliente.
  const confirmarClienteNuevo = async () => {
    const cedula = cedulaCliente.trim();
    const nombre = nombreClienteInline.trim();
    const telefono = telefonoClienteInline.trim();
    // Dispara con cédula o nombre (el backend exige al menos uno de los dos
    // para dar de alta un Cliente) — teléfono solo no alcanza, se manda igual
    // como dato adicional si cae en cualquiera de los otros dos casos.
    if (clienteSel || (!cedula && !nombre)) return;
    setGuardandoCliente(true);
    try {
      const nuevo = await crearCliente(tenantId, {
        nombre: nombre || undefined,
        identificacionRif: cedula || undefined,
        telefono: telefono || undefined,
      });
      setClienteSel(nuevo);
      // No se pisa el campo con el nombre de relleno que puso el backend
      // (ej. "Cliente V-30111222") cuando no se escribió nombre — eso se
      // vería como un dato real cuando no lo es. El campo se queda tal cual
      // estaba (vacío, si no se tipeó nada).
    } catch {
      // Si falla (ej. cédula duplicada por una carrera con otra pestaña) la
      // venta sigue igual sin cliente asociado — no bloquea el cobro.
    } finally {
      setGuardandoCliente(false);
    }
  };

  const limpiarCliente = () => {
    setClienteSel(null);
    setCedulaCliente("");
    setNombreClienteInline("");
    setTelefonoClienteInline("");
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
  // Escribir la cantidad directo (ej. una cotización de 100 unidades) sin
  // tener que darle a "+" cien veces — mismo carrito, solo otra forma de
  // llegar al mismo número.
  // Mientras se edita se deja pasar 0 tal cual (input vacío) — forzar un
  // mínimo en cada tecla pisaba lo que la persona estaba por escribir (borrar
  // el "1" de una y ponerse a teclear "1945" terminaba en "01945", porque el
  // valor ya se había re-normalizado a 0.001 a mitad de la escritura).
  const establecerCantidad = (key: string, valor: number) => {
    setCarrito((prev) => prev.map((l) => (l.key === key ? { ...l, cantidad: valor } : l)));
  };
  // Al salir del campo si quedó en 0 (vacío o borrado del todo) se repone en
  // 1 — así nunca queda una línea "fantasma" en 0 en el carrito.
  const confirmarCantidad = (key: string) => {
    setCarrito((prev) => prev.map((l) => (l.key === key && l.cantidad <= 0 ? { ...l, cantidad: 1 } : l)));
  };
  const quitarLinea = (key: string) => setCarrito((prev) => prev.filter((l) => l.key !== key));

  // Click en la tarjeta del catálogo = agregado instantáneo al carrito
  // (cantidad 1) — mismo camino que usaría un escáner de código de barras.
  const agregarDesdeTarjeta = (item: ItemCatalogo) => {
    setError(null);
    if (item.tipo === "articulo") {
      const yaEnCarrito = carrito.find((l) => l.key === item.key)?.cantidad || 0;
      if (yaEnCarrito + 1 > (item.stockActual ?? 0)) {
        setError(`Solo hay ${item.stockActual} ${item.unidadMedida} disponibles de ${item.nombre} en inventario`);
        return;
      }
    }
    agregarConCantidad({
      key: item.key, nombre: item.nombre, precio: item.precio,
      articuloId: item.tipo === "articulo" ? item.id : undefined,
      escandalloId: item.tipo === "receta" ? item.id : undefined,
      fastBarTragoId: item.tipo === "fastbar" ? item.id : undefined,
      estacionCocina: item.tipo === "receta" ? item.estacionCocina : item.tipo === "fastbar" ? "BAR" : undefined,
    }, 1);
    setBusqueda("");
  };

  // Producto libre: para lo que no está en el catálogo (o necesita un precio
  // distinto al de inventario) — descripción y precio siguen siendo obligatorios.
  const agregarProductoLibre = () => {
    setError(null);
    const nombre = nombreLibre.trim();
    if (!nombre) { setError("La descripción del producto es obligatoria"); return; }
    if (!precioLibre || Number(precioLibre) <= 0) { setError("El precio es obligatorio"); return; }
    const cant = parseFloat(cantidadLibre);
    if (!cant || cant <= 0) { setError("Indica una cantidad válida (acepta decimales: kg, L, etc.)"); return; }
    agregarConCantidad({ key: `manual-${Date.now()}`, nombre, precio: Number(precioLibre), estacionCocina: "COCINA" }, cant);
    setNombreLibre(""); setPrecioLibre(""); setCantidadLibre("1"); setMostrarProductoLibre(false);
  };

  const subtotalProductos = carrito.reduce((s, l) => s + l.precio * l.cantidad, 0);

  // Cargos: delivery/empaque son montos fijos por venta; propina/comisión
  // son porcentaje sobre el subtotal de productos (nunca sobre otro cargo).
  // Se marcan con estacionCocina "CARGOS" — un valor que no existe en
  // ESTACIONES — para que nunca aparezcan como plato fantasma en el KDS.
  const cargosLineas: LineaCarrito[] = [];
  if (cargosActivos.propina) cargosLineas.push({ key: "cargo-propina", nombre: `Propina (${cargosCfg.propinaPct}%)`, precio: subtotalProductos * (cargosCfg.propinaPct / 100), cantidad: 1, estacionCocina: "CARGOS" });
  if (cargosActivos.comision) cargosLineas.push({ key: "cargo-comision", nombre: `Comisión de pago (${cargosCfg.comisionPct}%)`, precio: subtotalProductos * (cargosCfg.comisionPct / 100), cantidad: 1, estacionCocina: "CARGOS" });
  if (cargosActivos.delivery) cargosLineas.push({ key: "cargo-delivery", nombre: "Delivery", precio: cargosCfg.deliveryMonto, cantidad: 1, estacionCocina: "CARGOS" });
  if (cargosActivos.empaque) cargosLineas.push({ key: "cargo-empaque", nombre: "Empaque", precio: cargosCfg.empaqueMonto, cantidad: 1, estacionCocina: "CARGOS" });
  const subtotalConCargos = subtotalProductos + cargosLineas.reduce((s, l) => s + l.precio, 0);

  // Impuestos: el cajero decide en cada venta si esta transacción los lleva
  // (ej. IGTF solo aplica a ciertos pagos en divisas) — el % es el que se
  // configuró una vez en Configuración, no se reescribe cada vez.
  const impuestosLineas: LineaCarrito[] = [];
  if (impuestosActivos.iva) impuestosLineas.push({ key: "impuesto-iva", nombre: `IVA (${impuestosCfg.ivaPct}%)`, precio: subtotalConCargos * (impuestosCfg.ivaPct / 100), cantidad: 1, estacionCocina: "CARGOS" });
  if (impuestosActivos.igtf) impuestosLineas.push({ key: "impuesto-igtf", nombre: `IGTF (${impuestosCfg.igtfPct}%)`, precio: subtotalConCargos * (impuestosCfg.igtfPct / 100), cantidad: 1, estacionCocina: "CARGOS" });

  const lineasParaCobrar = [...carrito, ...cargosLineas, ...impuestosLineas];
  const total = subtotalConCargos + impuestosLineas.reduce((s, l) => s + l.precio, 0);

  const cobrar = async (pagos: PagoParcial[], monedaVuelto: string) => {
    if (carrito.length === 0 || !moneda) return;
    setError(null);
    setProcesando(true);
    try {
      const comanda = await abrirComanda({
        mesero: canalVenta === "SALON" ? (mesaNumero ? `Mesa ${mesaNumero}` : "Salón") : "Mostrador",
        canal: canalVenta,
        numeroMesa: canalVenta === "SALON" && mesaNumero ? Number(mesaNumero) : undefined,
        nombreCliente: clienteSel?.nombre || (canalVenta === "DELIVERY_PROPIO" && datosDelivery.telefono ? `Cliente ${datosDelivery.telefono}` : undefined),
        telefonoCliente: clienteSel?.telefono || (canalVenta === "DELIVERY_PROPIO" ? datosDelivery.telefono : undefined),
        direccionEntrega: canalVenta === "DELIVERY_PROPIO" ? datosDelivery.direccion : undefined,
        mensajero: canalVenta === "DELIVERY_PROPIO" ? datosDelivery.repartidor : undefined,
        clienteId: clienteSel?.id,
      });
      for (const linea of lineasParaCobrar) {
        await agregarItemComanda(comanda.id, {
          escandalloId: linea.escandalloId,
          articuloId: linea.articuloId,
          fastBarTragoId: linea.fastBarTragoId,
          nombrePlato: linea.nombre,
          estacionCocina: linea.estacionCocina,
          cantidad: linea.cantidad,
          precioUnitario: linea.precio,
          notas: linea.notas,
        });
      }
      const resultado = await cerrarComandaMixto(comanda.id, pagos, monedaVuelto);
      const metodoResumen = resultado.comanda.metodoPago || "MIXTO";
      onVenta(total, metodoResumen);
      setRecibo({
        comandaId: comanda.id, lineas: lineasParaCobrar, total, metodoPago: metodoResumen, fecha: new Date().toLocaleString(),
        totalRecibido: resultado.totalRecibidoBase, vuelto: resultado.vueltoEnMonedaVuelto, monedaVuelto: resultado.monedaVuelto,
      });
      setCarrito([]);
      setCargosActivos({ propina: false, delivery: false, empaque: false, comision: false });
      setImpuestosActivos({ iva: false, igtf: false });
      limpiarCliente();
      setMesaNumero(""); setDatosDelivery({ direccion: "", telefono: "", repartidor: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo procesar la venta");
    } finally {
      setProcesando(false);
    }
  };

  // Cotización/presupuesto: un PDF con el mismo carrito, pero sin abrir
  // comanda ni tocar inventario o caja — el cliente todavía no compró nada,
  // solo se lleva un precio por escrito. Válida un número de días fijo
  // porque los precios en el negocio cambian con el tipo de cambio.
  const generarCotizacion = () => {
    if (lineasParaCobrar.length === 0) return;
    const doc = new jsPDF();
    const hoyFmt = new Date().toLocaleDateString("es-VE");
    const vencimiento = new Date(); vencimiento.setDate(vencimiento.getDate() + 7);

    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text(nombreLocal, 14, 18);
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text("Cotización de venta", 14, 26);
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`Fecha: ${hoyFmt}    Válida hasta: ${vencimiento.toLocaleDateString("es-VE")}`, 14, 32);
    if (clienteSel) doc.text(`Cliente: ${clienteSel.nombre}${clienteSel.identificacionRif ? " · " + clienteSel.identificacionRif : ""}`, 14, 37);
    doc.setTextColor(0);

    let y = clienteSel ? 46 : 42;
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("Cant.", 14, y); doc.text("Descripción", 32, y); doc.text("P. Unit.", 150, y, { align: "right" }); doc.text("Subtotal", 196, y, { align: "right" });
    y += 2; doc.setDrawColor(200); doc.line(14, y, 196, y); y += 6;
    doc.setFont("helvetica", "normal");
    lineasParaCobrar.forEach((l) => {
      doc.text(String(l.cantidad), 14, y);
      doc.text(l.nombre, 32, y, { maxWidth: 110 });
      doc.text(`$${l.precio.toFixed(2)}`, 150, y, { align: "right" });
      doc.text(`$${(l.precio * l.cantidad).toFixed(2)}`, 196, y, { align: "right" });
      y += 7;
    });
    y += 2; doc.line(140, y, 196, y); y += 7;
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("Total:", 150, y, { align: "right" }); doc.text(`${fmtCostoEnMoneda(total, moneda)}`, 196, y, { align: "right" });
    if (tasaBcv && Number(tasaBcv.tasa) > 0) {
      y += 6; doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(`≈ Bs. ${(total * Number(factoresVenta.VES)).toFixed(2)} (tasa BCV ${Number(tasaBcv.tasa).toFixed(2)})`, 196, y, { align: "right" });
    }
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text("Esta cotización no constituye una venta ni afecta inventario o caja — los precios pueden variar según el tipo de cambio vigente al momento de la compra.", 14, 285, { maxWidth: 182 });

    doc.save(`cotizacion_${nombreLocal.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
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
    <div className={embebido
      // flex-1 min-h-0 (no un h-[Npx] fijo): toma exactamente el espacio que
      // le sobra al contenedor h-[calc(100vh-250px)] de la Vista General,
      // sin desbordarse ni depender de un número mágico que colapsa en
      // pantallas más chicas.
      ? "apple-glass rounded-2xl flex flex-col flex-1 min-h-0 overflow-hidden"
      : "fixed inset-0 z-40 bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col"}>
      {/* HEADER OPERATIVO — solo en el overlay de pantalla completa; embebida
          en la Vista General, el dashboard ya trae su propio header con la
          tasa y ventas del día, repetirlo ahí sería ruido duplicado. */}
      {!embebido && (
        <header className="h-14 flex-shrink-0 border-b border-slate-300/60 dark:border-white/10 flex items-center justify-between px-5 bg-white/50 dark:bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={onCerrar} title="Salir de Venta Rápida"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200/70 dark:bg-white/10 hover:bg-teal-600 hover:text-white text-slate-700 dark:text-white/80 transition-all flex items-center gap-1.5 cursor-pointer border border-slate-300/60 dark:border-white/10 flex-shrink-0">
              <IconClose size={14} /> Salir
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <IconBolt size={16} className="text-teal-500 flex-shrink-0" />
              <span className="font-['Outfit'] font-black text-sm text-slate-900 dark:text-white truncate">Venta Rápida</span>
              <span className="text-[11px] text-slate-400 dark:text-white/30 truncate hidden sm:inline">{nombreLocal}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <div className="text-right hidden md:block">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-white/30 font-semibold">Turno de caja</div>
              {turno === undefined ? (
                <div className="text-[11px] text-slate-400">Cargando…</div>
              ) : turno ? (
                <div className="text-[11px] font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 justify-end">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" /> Abierto · {turno.idCajero}
                </div>
              ) : (
                <div className="text-[11px] font-bold text-amber-500 flex items-center gap-1 justify-end">
                  <IconWarning size={11} /> Sin turno abierto
                </div>
              )}
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-white/30 font-semibold">Tasa</div>
              <div className="text-[11px] font-bold font-mono text-emerald-500">
                {tasaBcv && Number(tasaBcv.tasa) > 0 ? `Bs. ${Number(tasaBcv.tasa).toFixed(2)}` : "Sin tasa"}
                {tasaCop && Number(tasaCop.tasa) > 0 && ` · COP ${Number(tasaCop.tasa).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-white/30 font-semibold">Ventas del día</div>
              <div className="text-[11px] font-bold font-mono text-slate-900 dark:text-white">
                ${(ventasHoy?.total ?? 0).toFixed(2)}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Selector de panel en móvil/tablet angosto — abajo de "lg" no cabe catálogo + comanda lado a lado */}
      <div className="lg:hidden flex-shrink-0 flex border-b border-slate-300/60 dark:border-white/10">
        <button type="button" onClick={() => setVistaMobile("catalogo")}
          className={`flex-1 py-2.5 text-xs font-bold cursor-pointer transition-colors ${
            vistaMobile === "catalogo" ? "text-teal-600 dark:text-teal-400 border-b-2 border-teal-600" : "text-slate-400 dark:text-white/40 border-b-2 border-transparent"
          }`}>Catálogo</button>
        <button type="button" onClick={() => setVistaMobile("carrito")}
          className={`flex-1 py-2.5 text-xs font-bold cursor-pointer transition-colors ${
            vistaMobile === "carrito" ? "text-teal-600 dark:text-teal-400 border-b-2 border-teal-600" : "text-slate-400 dark:text-white/40 border-b-2 border-transparent"
          }`}>Comanda{carrito.length > 0 && ` · ${carrito.length} · ${fmtCostoEnMoneda(total, moneda)}`}</button>
      </div>

      {/* CUERPO: grid de 12 columnas en pantallas grandes — catálogo (7) +
          comanda/cobro (5), más ancho que antes para que los montos y el
          cobro mixto respiren; debajo de "lg" sigue siendo un panel a la
          vez (flex, sin grid) por el selector de pestañas móvil. */}
      <div className="flex-1 flex min-h-0 lg:grid lg:grid-cols-12">
        {/* PANEL IZQUIERDO — CATÁLOGO */}
        <div className={`${vistaMobile === "catalogo" ? "flex" : "hidden"} lg:flex lg:col-span-6 flex-1 min-w-0 min-h-0 flex-col p-4 gap-3 overflow-hidden`}>
          <div className="relative shrink-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 pointer-events-none flex items-center justify-center"><IconSearch size={16} className="text-slate-400 dark:text-slate-400" /></span>
            <input
              ref={busquedaRef}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (catalogoFiltrado.length >= 1) agregarDesdeTarjeta(catalogoFiltrado[0]);
              }}
              placeholder="Buscar o escanear código de barras… ej. Torta de Queso, Doritos, Mojito"
              className="input-horeca w-full text-xs"
              style={{ paddingLeft: "2.75rem", paddingRight: busqueda ? "2.25rem" : "0.875rem" }}
            />
            {busqueda && (
              <button type="button" onClick={() => setBusqueda("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 cursor-pointer">
                <IconClose size={14} className="text-slate-400 hover:text-red-500" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-shrink-0">
            {categoriasTabs.map((tab) => (
              <button key={tab.key ?? "todas"} type="button" onClick={() => setCategoriaFiltro(tab.key)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer flex-shrink-0 transition-colors ${
                  categoriaFiltro === tab.key ? "bg-teal-600 text-white" : "bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-300/60 dark:hover:bg-white/15"
                }`}>{tab.label}</button>
            ))}
            <button type="button" onClick={() => setMostrarProductoLibre(true)}
              className="text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer flex-shrink-0 bg-amber-500/15 text-amber-600 dark:text-amber-300 hover:bg-amber-500/25 ml-auto">
              + Producto libre
            </button>
          </div>

          {error && <p className="text-xs text-red-500 flex-shrink-0">{error}</p>}

          <div className="flex-1 overflow-y-auto min-h-0">
            {catalogoFiltrado.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center px-6">
                <p className="text-xs text-slate-400">Sin resultados en el catálogo — usa "+ Producto libre" para venderlo igual.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
                {catalogoPagina.map((item) => {
                  const sinStock = item.tipo === "articulo" && (item.stockActual ?? 0) <= 0;
                  return (
                    // relative: la tarjeta sigue siendo un solo <button> para
                    // el agregado rápido; el ícono de edición va como
                    // hermano posicionado encima, no anidado (un <button>
                    // dentro de otro <button> es HTML inválido).
                    <div key={item.key} className="relative">
                      <button type="button" disabled={sinStock} onClick={() => agregarDesdeTarjeta(item)}
                        className={`w-full apple-glass rounded-xl p-3.5 text-left transition-all border border-transparent ${
                          sinStock ? "opacity-40 cursor-not-allowed" : "hover:border-teal-500/40 hover:scale-[1.02] cursor-pointer active:scale-[0.98]"
                        }`}>
                        <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full inline-block mb-1.5 ${
                          item.tipo === "receta" ? "bg-purple-500/15 text-purple-600 dark:text-purple-300"
                          : item.tipo === "fastbar" ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                          : "bg-teal-500/15 text-teal-600 dark:text-teal-300"
                        }`}>{item.tipo === "receta" ? "RECETA" : item.tipo === "fastbar" ? "FAST-BAR" : "INVENTARIO"}</div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2 min-h-[2.2em] pr-4">{item.nombre}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">{fmtCostoEnMoneda(item.precio, moneda)}</span>
                          {item.tipo === "articulo" && (
                            <span className={`text-[9px] font-mono ${sinStock ? "text-red-500" : "text-slate-400 dark:text-white/40"}`}>
                              {sinStock ? "Sin stock" : `${item.stockActual} ${item.unidadMedida}`}
                            </span>
                          )}
                        </div>
                      </button>
                      {item.tipo === "articulo" && (
                        <button type="button" title="Editar artículo" onClick={(e) => {
                          e.stopPropagation();
                          const completo = (articulos || []).find((a) => a.id === item.id);
                          if (completo) setArticuloEditando(completo);
                        }}
                          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/80 dark:bg-black/40 flex items-center justify-center text-slate-400 hover:text-teal-600 dark:hover:text-teal-300 opacity-70 hover:opacity-100 cursor-pointer transition-opacity">
                          <IconCustomize size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Paginación del catálogo — fuera del área con scroll (shrink-0),
              siempre visible con el indicador "Página X/Y" para saber
              cuánto falta y poder navegar sin depender del scroll. */}
          {catalogoFiltrado.length > PRODUCTOS_POR_PAGINA && (
            <div className="flex items-center justify-between shrink-0 pt-2">
              <button type="button" onClick={() => setPaginaCatalogo((p) => Math.max(1, p - 1))} disabled={paginaCatalogo <= 1}
                className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-300/60 dark:hover:bg-white/15 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                ← Anterior
              </button>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-white/40">Página {paginaCatalogo}/{totalPaginasCatalogo}</span>
              <button type="button" onClick={() => setPaginaCatalogo((p) => Math.min(totalPaginasCatalogo, p + 1))} disabled={paginaCatalogo >= totalPaginasCatalogo}
                className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-300/60 dark:hover:bg-white/15 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                Siguiente →
              </button>
            </div>
          )}
        </div>

        {/* PANEL DERECHO — COMANDA ACTIVA
            flex flex-col h-full: sin h-full (y min-h-0, la vuelta clásica de
            flexbox) el hijo "flex-1 overflow-y-auto" de abajo no tiene un
            límite real de alto contra el cual hacer scroll — en vez de
            desplazarse, empuja/aplasta el pie de totales y cobro. */}
        {/* overflow-y-auto de respaldo en el panel entero: en un viewport
            bajo, cabecera (cliente) + piso de la lista (150px) + pie de
            cobro (shrink-0, nunca se comprime) pueden sumar más alto que
            el panel disponible. Sin esto, lo que no entra queda cortado
            por el overflow-hidden del contenedor raíz del POS — el botón
            "Cobrar y Cerrar" desaparece de la vista aunque siga en el DOM.
            Con esto, en vez de desaparecer, el panel completo se puede
            desplazar hasta él. */}
        <div className={`${vistaMobile === "carrito" ? "flex" : "hidden"} lg:flex lg:col-span-6 flex-1 min-w-0 lg:border-l border-slate-300/60 dark:border-white/10 flex-col h-full min-h-0 overflow-y-auto bg-white/30 dark:bg-black/10`}>
          {/* Selector de Modalidad / Canal de Venta */}
          <div className="p-3 border-b border-slate-300/50 dark:border-white/10 flex-shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex gap-1 bg-slate-200/70 dark:bg-white/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setCanalVenta("RECOGER_EN_TIENDA"); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  canalVenta === "RECOGER_EN_TIENDA" ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm" : "text-slate-500 dark:text-white/60"
                }`}
              >
                <IconShoppingBag size={14} />
                <span>Para Llevar</span>
              </button>
              <button
                type="button"
                onClick={() => setCanalVenta("SALON")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  canalVenta === "SALON" ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm" : "text-slate-500 dark:text-white/60"
                }`}
              >
                <IconUtensils size={14} />
                <span>En Mesa</span>
              </button>
              <button
                type="button"
                onClick={() => { setCanalVenta("DELIVERY_PROPIO"); setCargosActivos((prev) => ({ ...prev, delivery: true })); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  canalVenta === "DELIVERY_PROPIO" ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm" : "text-slate-500 dark:text-white/60"
                }`}
              >
                <IconTruck size={14} />
                <span>Delivery</span>
              </button>
            </div>

            {/* Opciones contextuales del canal */}
            {canalVenta === "SALON" && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-white/60">Número de Mesa:</span>
                <input
                  value={mesaNumero}
                  onChange={(e) => setMesaNumero(e.target.value)}
                  type="number"
                  placeholder="Ej. 4"
                  className="input-horeca w-24 py-1 text-xs font-mono font-bold"
                />
              </div>
            )}
            {canalVenta === "DELIVERY_PROPIO" && (
              <div className="mt-2 space-y-1.5">
                <input
                  value={datosDelivery.direccion}
                  onChange={(e) => setDatosDelivery({ ...datosDelivery, direccion: e.target.value })}
                  placeholder="Dirección de entrega (ej. Barrio Obrero, Carrera 19)"
                  className="input-horeca w-full py-1 text-xs"
                />
                <div className="flex gap-2">
                  <input
                    value={datosDelivery.telefono}
                    onChange={(e) => setDatosDelivery({ ...datosDelivery, telefono: e.target.value })}
                    placeholder="Teléfono / WhatsApp"
                    className="input-horeca flex-1 py-1 text-xs"
                  />
                  <input
                    value={datosDelivery.repartidor}
                    onChange={(e) => setDatosDelivery({ ...datosDelivery, repartidor: e.target.value })}
                    placeholder="Repartidor / Mensajero"
                    className="input-horeca flex-1 py-1 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cabecera: cliente CRM — todo en línea, sin ventana aparte.
              Cédula primero: si ya existe, autocompleta nombre/teléfono; si
              no, se registra sola al salir del campo. Nombre y teléfono
              siempre quedan editables y son opcionales. */}
          <div className="p-4 border-b border-slate-300/50 dark:border-white/10 flex-shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Cliente (opcional)</p>
              {clienteSel && (
                <button onClick={limpiarCliente} className="text-[10px] font-semibold text-slate-400 hover:text-red-500 cursor-pointer flex items-center gap-1">
                  <IconClose size={11} /> Quitar
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="relative col-span-1">
                <input
                  value={cedulaCliente}
                  onChange={(e) => { setCedulaCliente(e.target.value); if (clienteSel) { setClienteSel(null); setNombreClienteInline(""); setTelefonoClienteInline(""); } }}
                  onBlur={confirmarClienteNuevo}
                  placeholder="Cédula / RIF" className="input-horeca w-full text-xs"
                />
                {clienteSel && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500" title="Cliente existente"><IconCheckCircle size={13} /></span>}
                {(buscandoCliente || guardandoCliente) && !clienteSel && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">…</span>}
              </div>
              <input value={telefonoClienteInline} onChange={(e) => setTelefonoClienteInline(e.target.value)}
                onBlur={() => { if (clienteSel) editarCliente(tenantId, clienteSel.id, { telefono: telefonoClienteInline.trim() || undefined }).then(setClienteSel).catch(() => alert("No se pudo guardar el teléfono del cliente — revisa tu conexión e inténtalo de nuevo.")); else confirmarClienteNuevo(); }}
                placeholder="Teléfono (opcional)" className="input-horeca w-full text-xs" />
            </div>
            <input value={nombreClienteInline} onChange={(e) => setNombreClienteInline(e.target.value)}
              onBlur={() => { if (clienteSel && nombreClienteInline.trim()) editarCliente(tenantId, clienteSel.id, { nombre: nombreClienteInline.trim() }).then(setClienteSel).catch(() => alert("No se pudo guardar el nombre del cliente — revisa tu conexión e inténtalo de nuevo.")); else confirmarClienteNuevo(); }}
              placeholder="Nombre y apellido (opcional)" className="input-horeca w-full text-xs" />
          </div>

          {/* Cuerpo: líneas del carrito — flex-1 lo deja crecer con el
              espacio disponible, min-h-[150px] le pone un piso real para
              que nunca quede aplastado a casi nada aunque el pie de cobro
              (shrink-0, nunca se comprime) sea alto. */}
          <div className="flex-1 overflow-y-auto min-h-[150px] p-4 space-y-2.5">
            <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base mb-1.5">Comanda activa</h3>
            {carrito.length === 0 ? (
              <p className="text-sm text-slate-400">Toca un producto del catálogo para agregarlo aquí.</p>
            ) : (
              carrito.map((l) => (
                <div key={l.key} className="bg-slate-100/60 dark:bg-white/5 rounded-xl px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    {/* Nombre: flex-1 truncate — un nombre largo ("COCA COLA
                        255ML") nunca empuja ni deforma los botones de cantidad. */}
                    <div className="flex-1 min-w-0 truncate">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{l.nombre}</div>
                      <div className="text-xs text-slate-500 dark:text-white/40 font-mono">${l.precio.toFixed(2)} c/u</div>
                    </div>
                    {/* Botones de cantidad: shrink-0, tamaño grande y cómodo de
                        presionar — mantienen su tamaño fijo sin comprimirse ni
                        deformarse verticalmente. El campo de cantidad es
                        editable directo (no solo +/-) para poder escribir un
                        número grande de una vez (ej. una cotización). */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => cambiarCantidad(l.key, -1)} className="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-white/10 text-sm font-bold cursor-pointer shrink-0">−</button>
                      <input
                        value={l.cantidad === 0 ? "" : l.cantidad}
                        onChange={(e) => establecerCantidad(l.key, e.target.value === "" ? 0 : Number(e.target.value))}
                        onBlur={() => confirmarCantidad(l.key)}
                        type="number" step="0.001" min="0"
                        title="Escribí la cantidad directo (ej. para una cotización grande)"
                        className="text-sm font-bold w-14 text-center shrink-0 bg-transparent border border-slate-300/60 dark:border-white/15 rounded-lg py-1"
                      />
                      <button onClick={() => cambiarCantidad(l.key, 1)} className="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-white/10 text-sm font-bold cursor-pointer shrink-0">+</button>
                      <button onClick={() => quitarLinea(l.key)} title="Quitar de la venta"
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white cursor-pointer shrink-0 ml-0.5">
                        <IconTrash size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Notas y Modificadores de cocina */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {l.notas ? (
                      <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px] px-2.5 py-1 rounded-lg">
                        <span className="flex items-center gap-1">
                          <IconNote size={12} className="text-amber-500 shrink-0" />
                          <span>{l.notas}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setCarrito((prev) => prev.map((it) => it.key === l.key ? { ...it, notas: undefined } : it))}
                          className="hover:text-red-500 text-slate-400 font-bold ml-1 cursor-pointer"
                          title="Quitar nota"
                        >×</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setLineaEditandoNota(l.key); setTextoNotaTemp(""); }}
                        className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1 cursor-pointer bg-teal-500/5 hover:bg-teal-500/10 px-2 py-0.5 rounded-lg border border-teal-500/20"
                      >
                        + Nota de cocina
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pie: totales + cobrar — shrink-0 obligatorio: nunca se
              comprime, así el carrito largo scrollea por dentro en vez de
              aplastar este bloque contra el borde. */}
          <div className="shrink-0 p-4 border-t border-slate-300/50 dark:border-white/10 space-y-3">
            {carrito.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {/* Cargos e impuestos: chips de un clic — el monto ya sale
                    calculado con los valores de Configuración, el cajero solo
                    decide si esta venta puntual los lleva. */}
                {([
                  ["propina", `Propina ${cargosCfg.propinaPct}%`],
                  ["comision", `Comisión ${cargosCfg.comisionPct}%`],
                  ["delivery", `Delivery $${cargosCfg.deliveryMonto.toFixed(2)}`],
                  ["empaque", `Empaque $${cargosCfg.empaqueMonto.toFixed(2)}`],
                ] as const).map(([clave, label]) => (
                  <button key={clave}
                    onClick={() => setCargosActivos((prev) => ({ ...prev, [clave]: !prev[clave] }))}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                      cargosActivos[clave] ? "bg-teal-600 border-teal-600 text-white" : "border-slate-300/60 dark:border-white/15 text-slate-500 dark:text-white/50"
                    }`}>
                    {cargosActivos[clave] ? "✓ " : "+ "}{label}
                  </button>
                ))}
                {([
                  ["iva", `IVA ${impuestosCfg.ivaPct}%`],
                  ["igtf", `IGTF ${impuestosCfg.igtfPct}%`],
                ] as const).map(([clave, label]) => (
                  <button key={clave}
                    onClick={() => setImpuestosActivos((prev) => ({ ...prev, [clave]: !prev[clave] }))}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                      impuestosActivos[clave] ? "bg-amber-600 border-amber-600 text-white" : "border-slate-300/60 dark:border-white/15 text-slate-500 dark:text-white/50"
                    }`}>
                    {impuestosActivos[clave] ? "✓ " : "+ "}{label}
                  </button>
                ))}
              </div>
            )}

            <div>
              {(cargosLineas.length > 0 || impuestosLineas.length > 0) && (
                <div className="space-y-0.5 mb-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/40">
                    <span>Subtotal</span><span className="font-mono">${subtotalProductos.toFixed(2)}</span>
                  </div>
                  {[...cargosLineas, ...impuestosLineas].map((l) => (
                    <div key={l.key} className="flex items-center justify-between text-xs text-slate-500 dark:text-white/40">
                      <span>{l.nombre}</span><span className="font-mono">${l.precio.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between font-black text-2xl text-slate-900 dark:text-white">
                <span className="text-sm font-bold text-slate-500 dark:text-white/40">Total</span><span className="font-mono">{fmtCostoEnMoneda(total, moneda)}</span>
              </div>
              {Number(factoresVenta.VES) > 0 && moneda !== "VES" && (
                <div className="flex items-center justify-between text-sm text-teal-600 dark:text-teal-400 font-mono font-bold mt-0.5">
                  <span className="text-[11px] font-semibold text-slate-400">≈ Bs</span><span>{fmtNumero(total * Number(factoresVenta.VES), "VES")}</span>
                </div>
              )}
              {Number(factoresVenta.COP) > 0 && moneda !== "COP" && (
                <div className="flex items-center justify-between text-sm text-sky-600 dark:text-sky-400 font-mono font-bold mt-0.5">
                  <span className="text-[11px] font-semibold text-slate-400">≈ COP</span><span>{(total * Number(factoresVenta.COP)).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
            {carrito.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <button onClick={generarCotizacion}
                    className="flex-1 text-[11px] font-bold text-slate-500 dark:text-white/50 hover:text-teal-600 dark:hover:text-teal-300 cursor-pointer py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-white/5 text-center flex items-center justify-center gap-1.5">
                    <IconFileText size={13} className="text-slate-400" />
                    <span>Cotización PDF</span>
                  </button>
                  <button onClick={() => setMostrarDividirCuenta(true)}
                    className="flex-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 cursor-pointer py-1.5 px-2 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-center flex items-center justify-center gap-1.5">
                    <IconScissors size={13} className="text-teal-500" />
                    <span>Dividir Cuenta</span>
                  </button>
                </div>
                <PanelCobroMixto tenantId={tenantId} total={total} monedaBase={moneda} tasasExternas={{ VES: tasaBcv ? Number(tasaBcv.tasa) : null, COP: tasaCop ? Number(tasaCop.tasa) : null }} procesando={procesando} error={error} onCobrar={cobrar} />
              </>
            )}
          </div>
        </div>
      </div>

      {articuloEditando && (
        <ModalEditarArticulo
          tenantId={tenantId}
          articulo={articuloEditando}
          onClose={() => setArticuloEditando(null)}
          onGuardado={(actualizado) => { onArticuloActualizado?.(actualizado); setArticuloEditando(null); }}
        />
      )}

      {mostrarProductoLibre && (
        <Modal onClose={() => setMostrarProductoLibre(false)} titulo="Producto libre">
          <div className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-white/40">Para algo que no está en el catálogo — la descripción y el precio son obligatorios.</p>
            <input value={nombreLibre} onChange={(e) => setNombreLibre(e.target.value)} placeholder="Descripción del producto" className="input-horeca w-full" autoFocus />
            <div className="flex items-center gap-2">
              <input value={cantidadLibre} onChange={(e) => setCantidadLibre(e.target.value)} type="number" min="0.001" step="0.001" placeholder="Cant." className="input-horeca w-24 flex-shrink-0" />
              <input value={precioLibre} onChange={(e) => setPrecioLibre(e.target.value)} type="number" step="0.01" placeholder="Precio de venta $" className="input-horeca flex-1"
                onKeyDown={(e) => e.key === "Enter" && agregarProductoLibre()} />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={agregarProductoLibre} className="w-full g-aurora text-white text-sm font-bold py-3 rounded-xl cursor-pointer">+ Agregar a la comanda</button>
          </div>
        </Modal>
      )}

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

            {/* Identificador único de la venta — mismo folio ("COM-<id>")
                que usa el reporte de tickets y que se necesita para anular,
                reclamar o auditar esta venta puntual más adelante. */}
            <div className="flex items-center justify-between bg-slate-100/60 dark:bg-white/5 rounded-lg px-3 py-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-white/30">Nro. de venta</span>
              <span className="font-mono font-bold text-sm text-slate-800 dark:text-white/90">COM-{recibo.comandaId}</span>
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
                <span>Total</span><span className="font-mono">{fmtCostoEnMoneda(recibo.total, moneda)}</span>
              </div>
              {Number(factoresVenta.VES) > 0 && moneda !== "VES" && (
                <div className="flex items-center justify-between text-xs text-teal-600 dark:text-teal-400 font-mono mt-0.5">
                  <span>≈ Bs</span><span>{fmtNumero(recibo.total * Number(factoresVenta.VES), "VES")}</span>
                </div>
              )}
              {Number(factoresVenta.COP) > 0 && moneda !== "COP" && (
                <div className="flex items-center justify-between text-xs text-sky-600 dark:text-sky-400 font-mono mt-0.5">
                  <span>≈ COP</span><span>{(recibo.total * Number(factoresVenta.COP)).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
            <div className="text-xs text-slate-700 dark:text-white/80 font-medium">Pagado con: <span className="font-bold text-slate-900 dark:text-white">{recibo.metodoPago.replace("_", " ")}</span></div>

            {/* Recibido/vuelto: sin esto el recibo en pantalla no coincide con
                lo que el cajero de verdad hizo — un hueco contable grave para
                el arqueo de caja del día. */}
            {recibo.totalRecibido != null && (
              <div className="text-xs text-slate-700 dark:text-white/80 font-medium">Recibido: <span className="font-bold text-slate-900 dark:text-white font-mono">{fmtCostoEnMoneda(recibo.totalRecibido, moneda)}</span></div>
            )}
            {recibo.vuelto != null && recibo.vuelto > 0.004 && (
              <div className="text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                Vuelto entregado: <span className="font-mono">{fmtCostoEnMoneda(recibo.vuelto, recibo.monedaVuelto)}</span>
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  if (!recibo) return;
                  const tBs = tasaBcv && Number(tasaBcv.tasa) > 0 ? recibo.total * Number(factoresVenta.VES) : undefined;
                  const tCop = tasaCop && Number(tasaCop.tasa) > 0 ? recibo.total * Number(factoresVenta.COP) : undefined;
                  imprimirTicketTermicoDirecto({
                    nombreLocal,
                    comandaId: recibo.comandaId,
                    fecha: recibo.fecha,
                    canal: canalVenta,
                    cliente: clienteSel ? { nombre: clienteSel.nombre, telefono: clienteSel.telefono || undefined, direccion: datosDelivery.direccion } : undefined,
                    lineas: recibo.lineas.map((l) => ({ nombre: l.nombre, cantidad: l.cantidad, precio: l.precio, notas: l.notas })),
                    subtotal: recibo.total,
                    total: recibo.total,
                    totalBs: tBs,
                    totalCop: tCop,
                    metodoPago: recibo.metodoPago,
                    recibido: recibo.totalRecibido,
                    vuelto: recibo.vuelto,
                    monedaVuelto: recibo.monedaVuelto,
                  });
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-3 rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-1.5 transition-all"
                title="Imprime en impresora térmica de 58mm u 80mm en 1 clic"
              >
                <IconPrinter size={15} />
                <span>Ticket 80mm</span>
              </button>
              <button onClick={verTicket} disabled={abriendoTicket}
                className="flex-1 g-aurora text-white text-xs font-semibold py-3 rounded-xl cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5">
                <IconFileText size={15} />
                <span>{abriendoTicket ? "Generando…" : "PDF"}</span>
              </button>
              <button onClick={imprimirEscPos} disabled={imprimiendoEscPos} title="Imprime directo a impresora térmica USB por Web Serial"
                className="flex-1 btn-cyber-neon text-white text-xs font-semibold py-3 rounded-xl cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5">
                <IconTerminal size={15} />
                <span>{imprimiendoEscPos ? "Imprimiendo…" : "ESC/POS"}</span>
              </button>
              <button onClick={() => setRecibo(null)} className="flex-1 apple-glass-btn text-xs font-semibold py-3 rounded-xl cursor-pointer">
                Nueva venta
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Notas / Modificadores de cocina para un ítem del carrito */}
      {lineaEditandoNota && (
        <Modal onClose={() => setLineaEditandoNota(null)} titulo="Nota / Modificador de Cocina">
          <div className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-white/40">
              Instrucciones directas para cocina o comanda (ej. sin cebolla, término 3/4, extra salsa).
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Sin cebolla", "Término 3/4", "Bien cocido", "Término medio",
                "Extra queso", "Salsa aparte", "Sin sal", "Para llevar", "Picante aparte", "Sin hielo",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setTextoNotaTemp((prev) => prev ? `${prev}, ${chip}` : chip)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-200/70 dark:bg-white/10 hover:bg-teal-600 hover:text-white text-slate-700 dark:text-white/80 transition-colors cursor-pointer"
                >
                  + {chip}
                </button>
              ))}
            </div>
            <input
              value={textoNotaTemp}
              onChange={(e) => setTextoNotaTemp(e.target.value)}
              placeholder="Escribe la nota especial…"
              className="input-horeca w-full text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setCarrito((prev) => prev.map((it) => it.key === lineaEditandoNota ? { ...it, notas: textoNotaTemp.trim() || undefined } : it));
                  setLineaEditandoNota(null);
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCarrito((prev) => prev.map((it) => it.key === lineaEditandoNota ? { ...it, notas: textoNotaTemp.trim() || undefined } : it));
                  setLineaEditandoNota(null);
                }}
                className="flex-1 g-aurora text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer"
              >
                Guardar nota
              </button>
              <button
                onClick={() => setLineaEditandoNota(null)}
                className="apple-glass-btn text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de División de Cuenta (Split Bill) */}
      {mostrarDividirCuenta && (
        <ModalDividirCuenta
          total={total}
          tasaBs={tasaBcv ? Number(tasaBcv.tasa) : 0}
          tasaCop={tasaCop ? Number(tasaCop.tasa) : 0}
          onClose={() => setMostrarDividirCuenta(false)}
          onSeleccionarParte={(montoParte, index, totalPartes) => {
            alert(`Comensal #${index} de ${totalPartes} pagará $${montoParte.toFixed(2)}. Puedes registrar su pago en el panel de cobro.`);
          }}
        />
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
  const { user } = useAuth();
  const puedeAnular = user?.rol === "DUENO_ADMIN" || user?.rol === "CAJERO_VENDEDOR";
  const [fechaInicio, setFechaInicio] = useState(() => sumarDiasStr(hoy(), -7));
  const [fechaFin, setFechaFin] = useState(hoy());
  const [metodoPago, setMetodoPago] = useState("");
  const [estado, setEstado] = useState<"PAGADA" | "ABIERTA" | "ANULADA" | "">("PAGADA");
  const [tickets, setTickets] = useState<ReporteTicket[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Anulación: comandaId cuya fila tiene abierto el campo de motivo — nunca
  // se anula con un solo clic, siempre hay que escribir por qué.
  const [anulandoId, setAnulandoId] = useState<number | null>(null);
  const [motivoAnular, setMotivoAnular] = useState("");
  const [procesandoAnulacion, setProcesandoAnulacion] = useState(false);

  const confirmarAnulacion = async (comandaId: number) => {
    if (!motivoAnular.trim()) { setError("Indica el motivo de la anulación"); return; }
    setProcesandoAnulacion(true);
    setError(null);
    try {
      await anularComanda(comandaId, { motivo: motivoAnular.trim(), usuario: user?.nombre });
      setAnulandoId(null);
      setMotivoAnular("");
      buscar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo anular la venta");
    } finally {
      setProcesandoAnulacion(false);
    }
  };

  const buscar = () => {
    setCargando(true);
    setError(null);
    reporteTickets({
      fechaInicio: fechaInicio || undefined, fechaFin: fechaFin || undefined,
      metodoPago: metodoPago || undefined, estado: estado || undefined,
    })
      .then(setTickets)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar el reporte"))
      .finally(() => setCargando(false));
  };
  useEffect(() => { buscar(); }, [tenantId]);

  const totales = (tickets || []).filter(t => t.estado === "PAGADA").reduce((acc, t) => {
    for (const p of t.pagos || []) acc[p.moneda] = (acc[p.moneda] || 0) + Number(p.monto);
    if (t.monedaVuelto && t.vuelto) acc[t.monedaVuelto] = (acc[t.monedaVuelto] || 0) - Number(t.vuelto);
    return acc;
  }, {} as Record<string, number>);

  // Toma el JSON YA renderizado en la tabla (no vuelve a pedirle nada al
  // backend) y arma el .xlsx en el navegador — el servidor no sabe que esto
  // pasó, ni carga con generarlo.
  const exportarExcel = () => {
    if (!tickets || tickets.length === 0) return;
    const filas = tickets.map((t) => ({
      "Fecha": new Date(t.fecha).toLocaleString(),
      "Nro. Ticket": t.numeroTicket,
      "Total ticket": Number(t.totalBase ?? t.totalUsd),
      "Moneda ticket": t.monedaBase || "Por confirmar",
      "Recibido": (t.pagos || []).map(p => fmtCostoEnMoneda(p.monto, p.moneda)).join(" + ") || "Sin desglose histórico",
      "Vuelto": t.vuelto != null ? Number(t.vuelto) : "",
      "Moneda vuelto": t.monedaVuelto || "",

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

      <p className="text-xs text-slate-500">Recibido muestra la moneda entregada por el cliente. El vuelto se descuenta al calcular los cobros netos. Los registros antiguos sin moneda confirmada requieren revisión.</p>
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
                  <th className="py-2 px-3 text-right">Total del ticket</th>
                  <th className="py-2 px-3 text-right">Recibido / vuelto</th>
                  <th className="py-2 px-3">Método de Pago</th>
                  <th className="py-2 px-3">Estado</th>
                  <th className="py-2 pl-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <Fragment key={t.comandaId}>
                    <tr className="border-b border-slate-200/50 dark:border-white/5">
                      <td className="py-2 pr-3 text-slate-600 dark:text-white/60 whitespace-nowrap">{new Date(t.fecha).toLocaleString()}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-800 dark:text-white/80">{t.numeroTicket}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800 dark:text-white/80">{fmtCostoEnMoneda(t.totalBase ?? t.totalUsd, t.monedaBase || "moneda por confirmar")}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-white/60">{t.pagos?.length ? <div className="space-y-1">{t.pagos.map((p, i) => <div key={i}>
                        <span>{fmtCostoEnMoneda(p.monto, p.moneda)}</span>
                        <span className="block text-[10px]">{p.metodoPago.replace(/_/g, " ")}</span>
                        {t.monedaBase && p.moneda !== t.monedaBase && <span className="block text-[10px] text-slate-500">Equivalente guardado: {fmtCostoEnMoneda(p.equivalenteBase, t.monedaBase)}</span>}
                      </div>)}{Number(t.vuelto) > 0 && <div className="text-amber-700">Vuelto: {fmtCostoEnMoneda(t.vuelto, t.monedaVuelto)}</div>}</div> : <span>Sin desglose histórico</span>}</td>
                      <td className="py-2 px-3 text-slate-600 dark:text-white/60">{(t.metodoPago || "-").replace("_", " ")}</td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.estado === "PAGADA" ? "bg-teal-500/15 text-teal-600 dark:text-teal-300"
                          : t.estado === "ANULADA" ? "bg-red-500/15 text-red-500"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                        }`}>{t.estado}</span>
                      </td>
                      <td className="py-2 pl-3 text-right">
                        {t.estado !== "ANULADA" && puedeAnular && (
                          <button
                            onClick={() => { setAnulandoId(anulandoId === t.comandaId ? null : t.comandaId); setMotivoAnular(""); setError(null); }}
                            className="text-[11px] font-semibold text-red-500 hover:text-red-600 cursor-pointer"
                          >
                            Anular
                          </button>
                        )}
                      </td>
                    </tr>
                    {anulandoId === t.comandaId && (
                      <tr className="border-b border-slate-200/50 dark:border-white/5 bg-red-500/5">
                        <td colSpan={7} className="px-3 py-2.5">
                          <div className="flex items-center gap-2 max-w-lg ml-auto">
                            <input
                              value={motivoAnular} onChange={(e) => setMotivoAnular(e.target.value)} autoFocus
                              placeholder={`Motivo de la anulación de ${t.numeroTicket} (obligatorio)`}
                              className="input-horeca text-xs flex-1"
                            />
                            <button onClick={() => confirmarAnulacion(t.comandaId)} disabled={procesandoAnulacion}
                              className="text-xs font-bold px-3 py-2 rounded-lg bg-red-500 text-white cursor-pointer disabled:opacity-60 flex-shrink-0">
                              {procesandoAnulacion ? "Anulando…" : "Confirmar anulación"}
                            </button>
                            <button onClick={() => { setAnulandoId(null); setMotivoAnular(""); }} className="text-xs font-semibold text-slate-500 cursor-pointer flex-shrink-0">Cancelar</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold text-slate-800 dark:text-white">
                  <td colSpan={7} className="py-3">Cobros netos por moneda (ventas pagadas): {Object.entries(totales).map(([m, v]) => fmtCostoEnMoneda(v, m)).join(" · ") || "Sin desglose disponible"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const DIAS_SEMANA_CORTOS = ["L", "M", "X", "J", "V", "S", "D"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const fmtFechaLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ══════════════════════════════════════════════════════════════════════════
// RESUMEN GENERAL — el dashboard gerencial vive acá, separado por completo
// de la Vista General (que ahora es una terminal de caja pura). KPIs de
// ventas de hoy/semana en tiempo real + un calendario para auditar
// cualquier día anterior sin mezclar analítica con el flujo de cobro.
// ══════════════════════════════════════════════════════════════════════════
// RESUMEN GENERAL — división rigurosa de ventas por moneda (USD, COP, VES)
// KPIs consolidados con conversión lógica real a USD para evitar sumar montos
// brutos en pesos o bolívares como si fueran dólares.
// ══════════════════════════════════════════════════════════════════════════
function ResumenGeneral({
  tenantId, tasaCop, tasaBcv,
}: {
  tenantId: number;
  tasaCop?: TasaCambio | null;
  tasaBcv?: TasaCambio | null;
}) {
  const [ticketsHoy, setTicketsHoy] = useState<ReporteTicket[] | null>(null);
  const [ticketsSemana, setTicketsSemana] = useState<ReporteTicket[] | null>(null);
  const [ticketDetalle, setTicketDetalle] = useState<ReporteTicket | null>(null);

  const hoy = useMemo(() => new Date(), []);
  const hoyStr = fmtFechaLocal(hoy);
  const [vista, setVista] = useState(() => ({ anio: hoy.getFullYear(), mes: hoy.getMonth() }));
  const [fechaSel, setFechaSel] = useState(hoyStr);
  const [ticketsDia, setTicketsDia] = useState<ReporteTicket[] | null>(null);

  const tasaCopNum = (tasaCop && Number(tasaCop.tasa) > 0) ? Number(tasaCop.tasa) : 3100;
  const tasaBcvNum = (tasaBcv && Number(tasaBcv.tasa) > 0) ? Number(tasaBcv.tasa) : 65.5;

  useEffect(() => {
    const diaSemana = hoy.getDay(); // 0 = domingo
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((diaSemana + 6) % 7));
    const lunesStr = fmtFechaLocal(lunes);

    reporteTickets({ fechaInicio: hoyStr, fechaFin: hoyStr, estado: "PAGADA" })
      .then(setTicketsHoy)
      .catch(() => setTicketsHoy([]));

    reporteTickets({ fechaInicio: lunesStr, fechaFin: hoyStr, estado: "PAGADA" })
      .then(setTicketsSemana)
      .catch(() => setTicketsSemana([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  useEffect(() => {
    setTicketsDia(null);
    reporteTickets({ fechaInicio: fechaSel, fechaFin: fechaSel, estado: "PAGADA" })
      .then(setTicketsDia)
      .catch(() => setTicketsDia([]));
  }, [tenantId, fechaSel]);

  const calcularMetricasMoneda = (lista: ReporteTicket[] | null) => {
    if (!lista) return null;
    let usd = 0;
    let cop = 0;
    let ves = 0;
    let consolidadoUsd = 0;
    let countUsd = 0;
    let countCop = 0;
    let countVes = 0;

    lista.forEach((t) => {
      const valUsd = Number(t.totalUsd || 0);

      if (t.pagos && t.pagos.length > 0) {
        let ticketTieneCop = false;
        let ticketTieneUsd = false;
        let ticketTieneVes = false;

        t.pagos.forEach((p) => {
          const m = (p.moneda || "USD").toUpperCase();
          const monto = Number(p.monto || 0);
          if (m === "COP") {
            cop += monto;
            ticketTieneCop = true;
          } else if (m === "VES" || m === "BS") {
            ves += monto;
            ticketTieneVes = true;
          } else {
            usd += monto;
            ticketTieneUsd = true;
          }
        });

        if (ticketTieneCop) countCop++;
        if (ticketTieneUsd) countUsd++;
        if (ticketTieneVes) countVes++;

        // Consolidar a USD
        const equiv = (valUsd < 100 && valUsd > 0) ? valUsd : (t.pagos.reduce((acc, p) => {
          const m = (p.moneda || "USD").toUpperCase();
          if (m === "COP") return acc + (Number(p.monto || 0) / tasaCopNum);
          if (m === "VES" || m === "BS") return acc + (Number(p.monto || 0) / tasaBcvNum);
          return acc + Number(p.monto || 0);
        }, 0));
        consolidadoUsd += equiv;
      } else {
        const mon = (t.monedaPago || "USD").toUpperCase();
        if (mon === "COP") {
          const montoCop = Number(t.montoOriginal || t.totalCop || (valUsd >= 100 ? valUsd : valUsd * tasaCopNum));
          cop += montoCop;
          countCop++;
          const equiv = (valUsd < 100 && valUsd > 0) ? valUsd : (montoCop / tasaCopNum);
          consolidadoUsd += equiv;
        } else if (mon === "VES" || mon === "BS") {
          const montoVes = Number(t.montoOriginal || t.totalBs || valUsd * tasaBcvNum);
          ves += montoVes;
          countVes++;
          const equiv = valUsd > 0 ? valUsd : (montoVes / tasaBcvNum);
          consolidadoUsd += equiv;
        } else {
          usd += valUsd;
          countUsd++;
          consolidadoUsd += valUsd;
        }
      }
    });

    return {
      usd,
      cop,
      ves,
      consolidadoUsd,
      totalTickets: lista.length,
      countUsd,
      countCop,
      countVes,
    };
  };

  const metricasHoy = useMemo(() => calcularMetricasMoneda(ticketsHoy), [ticketsHoy, tasaCopNum, tasaBcvNum]);
  const metricasSemana = useMemo(() => calcularMetricasMoneda(ticketsSemana), [ticketsSemana, tasaCopNum, tasaBcvNum]);
  const metricasDiaSel = useMemo(() => calcularMetricasMoneda(ticketsDia), [ticketsDia, tasaCopNum, tasaBcvNum]);

  // Ventas por mesonero del día seleccionado — cuántos tickets cerró cada uno
  // y cuánto sumaron, para el resumen operativo diario.
  const ventasPorMesero = useMemo(() => {
    const mapa = new Map<string, { tickets: number; totalUsd: number; propinas: number }>();
    for (const t of ticketsDia || []) {
      const nombre = t.mesero?.trim() || "Sin asignar";
      const actual = mapa.get(nombre) || { tickets: 0, totalUsd: 0, propinas: 0 };
      actual.tickets += 1;
      actual.totalUsd += Number(t.totalUsd || 0);
      actual.propinas += Number(t.propina || 0);
      mapa.set(nombre, actual);
    }
    return Array.from(mapa.entries()).map(([mesero, v]) => ({ mesero, ...v })).sort((a, b) => b.totalUsd - a.totalUsd);
  }, [ticketsDia]);

  const resolverMontoTicket = (t: ReporteTicket) => {
    const valUsd = Number(t.totalUsd || 0);

    if (t.pagos && t.pagos.length === 1) {
      const p = t.pagos[0];
      const m = (p.moneda || "USD").toUpperCase();
      const monto = Number(p.monto || 0);
      if (m === "COP") {
        const equiv = (valUsd < 100 && valUsd > 0) ? valUsd : (monto / tasaCopNum);
        return {
          principal: `${fmtNumero(monto, "COP")} COP`,
          equivalente: `≈ $${equiv.toFixed(2)} USD`,
          colorClase: "text-teal-600 dark:text-teal-400",
          tag: "COP",
        };
      }
      if (m === "VES" || m === "BS") {
        const equiv = valUsd > 0 ? valUsd : (monto / tasaBcvNum);
        return {
          principal: `Bs. ${fmtNumero(monto, "VES")}`,
          equivalente: `≈ $${equiv.toFixed(2)} USD`,
          colorClase: "text-sky-600 dark:text-sky-400",
          tag: "VES",
        };
      }
      return {
        principal: `$${monto.toFixed(2)} USD`,
        equivalente: undefined,
        colorClase: "text-slate-900 dark:text-white",
        tag: "USD",
      };
    }

    if (t.pagos && t.pagos.length > 1) {
      const desglose = t.pagos.map((p) => {
        const m = (p.moneda || "USD").toUpperCase();
        return m === "COP" ? `${fmtNumero(p.monto, "COP")} COP` : m === "VES" ? `Bs. ${fmtNumero(p.monto, "VES")}` : `$${Number(p.monto).toFixed(2)}`;
      }).join(" + ");
      return {
        principal: `$${valUsd.toFixed(2)} USD`,
        equivalente: `Mixto: ${desglose}`,
        colorClase: "text-purple-600 dark:text-purple-400",
        tag: "MIXTO",
      };
    }

    const mon = (t.monedaPago || "USD").toUpperCase();
    if (mon === "COP") {
      const montoCop = Number(t.montoOriginal || t.totalCop || (valUsd >= 100 ? valUsd : valUsd * tasaCopNum));
      const equivUsd = (valUsd < 100 && valUsd > 0) ? valUsd : (montoCop / tasaCopNum);
      return {
        principal: `${fmtNumero(montoCop, "COP")} COP`,
        equivalente: `≈ $${equivUsd.toFixed(2)} USD`,
        colorClase: "text-teal-600 dark:text-teal-400",
        tag: "COP",
      };
    }
    if (mon === "VES" || mon === "BS") {
      const montoVes = Number(t.montoOriginal || t.totalBs || valUsd * tasaBcvNum);
      const equivUsd = valUsd > 0 ? valUsd : (montoVes / tasaBcvNum);
      return {
        principal: `Bs. ${fmtNumero(montoVes, "VES")}`,
        equivalente: `≈ $${equivUsd.toFixed(2)} USD`,
        colorClase: "text-sky-600 dark:text-sky-400",
        tag: "VES",
      };
    }
    return {
      principal: `$${valUsd.toFixed(2)} USD`,
      equivalente: t.totalCop ? `≈ ${fmtNumero(t.totalCop, "COP")} COP` : undefined,
      colorClase: "text-slate-900 dark:text-white",
      tag: "USD",
    };
  };

  const primerDiaMes = new Date(vista.anio, vista.mes, 1);
  const diasEnMes = new Date(vista.anio, vista.mes + 1, 0).getDate();
  const offsetInicio = (primerDiaMes.getDay() + 6) % 7; // semana empieza en lunes
  const celdas: (number | null)[] = [...Array(offsetInicio).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)];
  const fechaCelda = (dia: number) => `${vista.anio}-${String(vista.mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

  const cambiarMes = (delta: number) => setVista(({ anio, mes }) => {
    const d = new Date(anio, mes + delta, 1);
    return { anio: d.getFullYear(), mes: d.getMonth() };
  });

  const fechaSelObj = new Date(fechaSel + "T00:00:00");
  const fechaSelLegible = fechaSelObj.toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Tarjetas Superiores: Ventas divididas estrictamente por moneda */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ventas de la Semana */}
        <div className="apple-glass rounded-2xl p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">
              Ventas de la Semana (Consolidado)
            </span>
            <span className="text-[10px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2.5 py-0.5 rounded-full">
              Lunes a hoy · {metricasSemana ? metricasSemana.totalTickets : 0} tickets
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-['Outfit'] font-black text-3xl text-sky-600 dark:text-sky-400">
              {metricasSemana ? `$${metricasSemana.consolidadoUsd.toFixed(2)}` : "…"}
            </span>
            <span className="text-xs text-slate-400 font-semibold">USD base</span>
          </div>

          {/* Desglose dividido por moneda */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-3 gap-2">
            <div className="bg-slate-100/70 dark:bg-white/5 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 font-bold uppercase">En Dólares</div>
              <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                ${metricasSemana ? fmtNumero(metricasSemana.usd, "USD") : "0"} USD
              </div>
            </div>
            <div className="bg-slate-100/70 dark:bg-white/5 rounded-xl p-2.5">
              <div className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase">En Pesos (COP)</div>
              <div className="font-mono font-bold text-xs text-teal-700 dark:text-teal-300 truncate">
                {metricasSemana ? fmtNumero(metricasSemana.cop, "COP") : "0"} COP
              </div>
            </div>
            <div className="bg-slate-100/70 dark:bg-white/5 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 font-bold uppercase">En Bolívares</div>
              <div className="font-mono font-bold text-xs text-slate-900 dark:text-white truncate">
                Bs. {metricasSemana ? fmtNumero(metricasSemana.ves, "VES") : "0.00"}
              </div>
            </div>
          </div>
        </div>

        {/* Ventas del Día */}
        <div className="apple-glass rounded-2xl p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider">
              Ventas del Día (Hoy)
            </span>
            <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full">
              {metricasHoy ? metricasHoy.totalTickets : 0} ticket{metricasHoy?.totalTickets === 1 ? "" : "s"} hoy
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-['Outfit'] font-black text-3xl text-emerald-600 dark:text-emerald-400">
              {metricasHoy ? `$${metricasHoy.consolidadoUsd.toFixed(2)}` : "…"}
            </span>
            <span className="text-xs text-slate-400 font-semibold">USD base</span>
          </div>

          {/* Desglose dividido por moneda */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-3 gap-2">
            <div className="bg-slate-100/70 dark:bg-white/5 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 font-bold uppercase">En Dólares</div>
              <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                ${metricasHoy ? fmtNumero(metricasHoy.usd, "USD") : "0"} USD
              </div>
            </div>
            <div className="bg-slate-100/70 dark:bg-white/5 rounded-xl p-2.5">
              <div className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase">En Pesos (COP)</div>
              <div className="font-mono font-bold text-xs text-teal-700 dark:text-teal-300 truncate">
                {metricasHoy ? fmtNumero(metricasHoy.cop, "COP") : "0"} COP
              </div>
            </div>
            <div className="bg-slate-100/70 dark:bg-white/5 rounded-xl p-2.5">
              <div className="text-[10px] text-slate-400 font-bold uppercase">En Bolívares</div>
              <div className="font-mono font-bold text-xs text-slate-900 dark:text-white truncate">
                Bs. {metricasHoy ? fmtNumero(metricasHoy.ves, "VES") : "0.00"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
        {/* Calendario histórico */}
        <div className="apple-glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => cambiarMes(-1)} className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 cursor-pointer text-slate-500 dark:text-white/60"><IconChevronLeft size={16} /></button>
            <span className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">{MESES[vista.mes]} {vista.anio}</span>
            <button onClick={() => cambiarMes(1)} className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 cursor-pointer text-slate-500 dark:text-white/60"><IconChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold text-center text-slate-400 dark:text-white/30 mb-1.5">
            {DIAS_SEMANA_CORTOS.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celdas.map((dia, i) => {
              if (dia === null) return <div key={i} />;
              const fecha = fechaCelda(dia);
              const esHoy = fecha === hoyStr;
              const esSel = fecha === fechaSel;
              const esFuturo = fecha > hoyStr;
              return (
                <button key={i} type="button" disabled={esFuturo} onClick={() => setFechaSel(fecha)}
                  className={`aspect-square rounded-lg text-xs font-semibold transition-colors ${
                    esFuturo ? "text-slate-300 dark:text-white/15 cursor-not-allowed"
                    : esSel ? "bg-teal-600 text-white cursor-pointer"
                    : esHoy ? "border border-teal-500 text-teal-600 dark:text-teal-400 cursor-pointer"
                    : "text-slate-600 dark:text-white/60 hover:bg-slate-200/60 dark:hover:bg-white/10 cursor-pointer"
                  }`}>
                  {dia}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle del día seleccionado */}
        <div className="apple-glass rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFechaSel((f) => sumarDiasStr(f, -1))}
                className="apple-glass-btn text-xs font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"
              >
                <IconChevronLeft size={13} /> Anterior
              </button>
              <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-base capitalize">{fechaSelLegible}</h3>
              <button
                type="button"
                onClick={() => setFechaSel((f) => sumarDiasStr(f, 1))}
                disabled={fechaSel >= hoyStr}
                className="apple-glass-btn text-xs font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente <IconChevronRight size={13} />
              </button>
              {fechaSel !== hoyStr && (
                <button
                  type="button"
                  onClick={() => setFechaSel(hoyStr)}
                  className="text-xs font-semibold text-teal-600 dark:text-teal-400 cursor-pointer px-2"
                >
                  Hoy
                </button>
              )}
            </div>
            {metricasDiaSel && metricasDiaSel.totalTickets > 0 && (
              <span className="text-xs font-semibold text-slate-500 dark:text-white/60">
                {metricasDiaSel.totalTickets} transacción{metricasDiaSel.totalTickets === 1 ? "" : "es"}
              </span>
            )}
          </div>

          {/* Cuadrícula de totales dividida por moneda para el día */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="apple-glass rounded-xl p-3">
              <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider font-bold">Consolidado</div>
              <div className="font-['Outfit'] font-black text-lg text-teal-600 dark:text-teal-400">
                ${metricasDiaSel ? metricasDiaSel.consolidadoUsd.toFixed(2) : "0.00"}
              </div>
              <div className="text-[9px] text-slate-400">USD base</div>
            </div>
            <div className="apple-glass rounded-xl p-3">
              <div className="text-[10px] text-teal-600 dark:text-teal-400 uppercase tracking-wider font-bold">Pesos (COP)</div>
              <div className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white truncate">
                {metricasDiaSel ? fmtNumero(metricasDiaSel.cop, "COP") : "0"}
              </div>
              <div className="text-[9px] text-slate-400">COP recaudado</div>
            </div>
            <div className="apple-glass rounded-xl p-3">
              <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider font-bold">Dólares (USD)</div>
              <div className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">
                ${metricasDiaSel ? fmtNumero(metricasDiaSel.usd, "USD") : "0"}
              </div>
              <div className="text-[9px] text-slate-400">USD en efectivo</div>
            </div>
            <div className="apple-glass rounded-xl p-3">
              <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider font-bold">Bolívares (VES)</div>
              <div className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white truncate">
                Bs. {metricasDiaSel ? fmtNumero(metricasDiaSel.ves, "VES") : "0.00"}
              </div>
              <div className="text-[9px] text-slate-400">VES recaudado</div>
            </div>
          </div>

          {ventasPorMesero.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider mb-2">Ventas por mesonero</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ventasPorMesero.map((v) => (
                  <div key={v.mesero} className="flex items-center justify-between bg-slate-100/60 dark:bg-white/5 rounded-xl px-3.5 py-2.5 text-xs">
                    <span className="font-semibold text-slate-800 dark:text-white/80">{v.mesero}</span>
                    <span className="text-right">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">${v.totalUsd.toFixed(2)}</span>
                      <span className="text-slate-400 ml-1.5">· {v.tickets} ticket{v.tickets === 1 ? "" : "s"}</span>
                      {v.propinas > 0 && <span className="block text-teal-600 dark:text-teal-400 font-semibold mt-0.5">Propinas: ${v.propinas.toFixed(2)}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Listado de tickets del día con moneda real */}
          {ticketsDia === null ? (
            <p className="text-xs text-slate-400">Cargando…</p>
          ) : ticketsDia.length === 0 ? (
            <p className="text-xs text-slate-400">Sin ventas registradas este día.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {ticketsDia.map((t) => {
                const infoMonto = resolverMontoTicket(t);
                return (
                  <button
                    type="button"
                    key={t.comandaId}
                    onClick={() => setTicketDetalle(t)}
                    className="w-full flex items-center justify-between bg-slate-100/60 dark:bg-white/5 hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-xl px-3.5 py-2.5 text-xs text-left cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-white/80">{t.numeroTicket}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 uppercase">
                          {infoMonto.tag}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(t.fecha).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })} · {(t.metodoPago || "—").replace("_", " ")}{t.mesero ? ` · ${t.mesero}` : ""}
                      </div>
                      <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">Ver detalles →</div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className={`font-mono font-bold text-sm ${infoMonto.colorClase}`}>
                        {infoMonto.principal}
                      </div>
                      {infoMonto.equivalente && (
                        <div className="text-[10px] font-mono text-slate-400">
                          {infoMonto.equivalente}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {ticketDetalle && (
        <ModalDetalleTicket tenantId={tenantId} ticket={ticketDetalle} onClose={() => setTicketDetalle(null)} />
      )}
    </div>
  );
}

function ModalDetalleTicket({ tenantId, ticket, onClose }: {
  tenantId: number; ticket: ReporteTicket; onClose: () => void;
}) {
  const [items, setItems] = useState<ItemComanda[] | null>(null);

  useEffect(() => {
    obtenerItemsComanda(tenantId, ticket.comandaId).then(setItems).catch(() => setItems([]));
  }, [tenantId, ticket.comandaId]);

  return (
    <Modal onClose={onClose} titulo={ticket.numeroTicket}>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{new Date(ticket.fecha).toLocaleString("es-VE")}</span>
          <span className="font-semibold">{(ticket.canal || "—").replace(/_/g, " ")} · {(ticket.metodoPago || "—").replace(/_/g, " ")}</span>
        </div>
        {ticket.mesero && (
          <p className="text-xs text-slate-500">Atendido por: <strong className="text-slate-900">{ticket.mesero}</strong></p>
        )}
        {items === null ? (
          <p className="text-xs text-slate-400">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-400">Sin ítems registrados para esta comanda.</p>
        ) : (
          <div className="space-y-1.5">
            {items.map((it) => {
              const anulado = it.estadoItem === "ANULADO";
              return (
              <div key={it.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${anulado ? "bg-red-500/5" : "bg-slate-100/60"}`}>
                <span className={anulado ? "text-red-500/70 line-through" : "text-slate-700"}>
                  {it.nombrePlato} <span className="text-slate-400">x{Number(it.cantidad)}</span>
                  {anulado && <span className="ml-1.5 no-underline text-[10px] font-semibold">(anulado{it.motivoAnulacion ? `: ${it.motivoAnulacion}` : ""})</span>}
                </span>
                <span className={`font-mono font-semibold ${anulado ? "text-red-500/70 line-through" : "text-slate-900"}`}>${(Number(it.cantidad) * Number(it.precioUnitario)).toFixed(2)}</span>
              </div>
              );
            })}
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
          <span>Total</span>
          <span>${Number(ticket.totalUsd).toFixed(2)}</span>
        </div>
        <button onClick={onClose} className="w-full g-aurora text-white text-xs font-semibold py-2.5 rounded-xl cursor-pointer">Cerrar</button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// RESUMEN FINANCIERO — dashboard gerencial. Todos los números son reales
// (Reportes Operativos + Resumen Diario + Movimientos de caja ya
// existentes), no hay datos simulados: no hacía falta, los endpoints ya
// estaban construidos.
// ══════════════════════════════════════════════════════════════════════════
type RangoEstadistica = "DIA" | "7_DIAS" | "MES" | "ANO";

function sumarDiasStr(fechaStr: string, dias: number): string {
  const [y, m, d] = fechaStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + dias);
  const y2 = dt.getFullYear();
  const m2 = String(dt.getMonth() + 1).padStart(2, "0");
  const d2 = String(dt.getDate()).padStart(2, "0");
  return `${y2}-${m2}-${d2}`;
}

interface MovimientoCajaConEquivalente extends MovimientoCaja {
  montoEquivalente?: number | null;
  montoEquivalenteBase?: number | null;
}

function ResumenFinanciero({ tenantId }: { tenantId: number }) {
  const [ticketDetalle, setTicketDetalle] = useState<ReporteTicket | null>(null);
  const [rango, setRango] = useState<RangoEstadistica>("DIA");
  const [fechaSel, setFechaSel] = useState(() => hoy());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avisoErrorSilencioso, setAvisoErrorSilencioso] = useState<string | null>(null);
  const [ultimaSinc, setUltimaSinc] = useState<string | null>(null);
  const [monedaBaseNegocio, setMonedaBaseNegocio] = useState<string>("");

  const [ventasTotal, setVentasTotal] = useState(0);
  const [egresosTotal, setEgresosTotal] = useState(0);
  const [utilidadTotal, setUtilidadTotal] = useState<number | null>(null);
  const [ticketsCount, setTicketsCount] = useState(0);

  const [topProductos, setTopProductos] = useState<ResumenUtilidadProducto[]>([]);
  const [tendencia, setTendencia] = useState<{ etiqueta: string; ventas: number; pedidos?: number }[]>([]);
  const [horasTopData, setHorasTopData] = useState<{ hora: number; label: string; ventas: number; pedidos: number }[]>([]);
  const [horaPico, setHoraPico] = useState<{ hora: number; label: string; ventas: number; pedidos: number } | null>(null);
  const [ticketsPeriodo, setTicketsPeriodo] = useState<ReporteTicket[]>([]);

  // Mecanismo de invalidación lógica:
  // AbortController y generationRef descartan respuestas en vuelo desfasadas antes de mutar estado
  // (invalidación lógica de renderizado; no cancela peticiones a nivel de red ya que la señal no se propaga a fetch).
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const ejecucionEnCursoRef = useRef(false);
  const datosUtilidadRef = useRef<{ utilidadTotal: number | null; topProductos: ResumenUtilidadProducto[] }>({
    utilidadTotal: null,
    topProductos: [],
  });

  // Calcular fechas de inicio y fin según el rango activo
  const { fechaInicio, fechaFin, etiquetaPeriodo } = useMemo(() => {
    const [y, m, d] = fechaSel.split("-").map(Number);
    const NOMBRES_MESES = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    if (rango === "DIA") {
      const dt = new Date(y, m - 1, d);
      const diaSemana = dt.toLocaleDateString("es-VE", { weekday: "long" });
      const diaNum = dt.getDate();
      const mesNom = NOMBRES_MESES[dt.getMonth()];
      return {
        fechaInicio: fechaSel,
        fechaFin: fechaSel,
        etiquetaPeriodo: `${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)}, ${diaNum} de ${mesNom} ${y}`,
      };
    }

    if (rango === "7_DIAS") {
      const fInicio = sumarDiasStr(fechaSel, -6);
      return {
        fechaInicio: fInicio,
        fechaFin: fechaSel,
        etiquetaPeriodo: `Últimos 7 Días (${fInicio} al ${fechaSel})`,
      };
    }

    if (rango === "MES") {
      const fInicio = `${y}-${String(m).padStart(2, "0")}-01`;
      const ultimoDia = new Date(y, m, 0).getDate();
      const fFin = `${y}-${String(m).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
      return {
        fechaInicio: fInicio,
        fechaFin: fFin,
        etiquetaPeriodo: `Mes de ${NOMBRES_MESES[m - 1]} ${y}`,
      };
    }

    // ANO
    return {
      fechaInicio: `${y}-01-01`,
      fechaFin: `${y}-12-31`,
      etiquetaPeriodo: `Año Fiscal ${y}`,
    };
  }, [rango, fechaSel]);

  // Multimoneda: totalBase para tickets; no asume USD
  const obtenerTotalTicket = (t: ReporteTicket): number => {
    if (t.totalBase !== undefined && t.totalBase !== null) return Number(t.totalBase);
    return 0;
  };

  // Multimoneda: montoEquivalente / montoEquivalenteBase para egresos; no mezcla nominales COP/VES/USD
  const obtenerMontoEgreso = (m: MovimientoCajaConEquivalente, baseCur: string): number => {
    if (m.montoEquivalente !== undefined && m.montoEquivalente !== null) return Number(m.montoEquivalente);
    if (m.montoEquivalenteBase !== undefined && m.montoEquivalenteBase !== null) return Number(m.montoEquivalenteBase);
    if (m.moneda && baseCur && m.moneda.toUpperCase() === baseCur.toUpperCase()) {
      return Number(m.monto || 0);
    }
    return 0;
  };

  const cargarDatos = (silencioso = false) => {
    // Si es un sondeo silencioso y ya hay una solicitud en curso, omitir para no solapar
    if (silencioso && ejecucionEnCursoRef.current) {
      return;
    }

    // Invalidación lógica de la solicitud anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentGen = ++generationRef.current;

    ejecucionEnCursoRef.current = true;

    // En carga inicial o cambio de filtros (!silencioso):
    // Limpiar indicadores inmediatamente para no mostrar datos del período anterior bajo el nuevo encabezado
    if (!silencioso) {
      setCargando(true);
      setError(null);
      setAvisoErrorSilencioso(null);
      setVentasTotal(0);
      setTicketsCount(0);
      setTicketsPeriodo([]);
      setEgresosTotal(0);
      setHorasTopData([]);
      setHoraPico(null);
      setTendencia([]);
      setTopProductos([]);
      setUtilidadTotal(null);
      setUltimaSinc(null);
      datosUtilidadRef.current = { utilidadTotal: null, topProductos: [] };
    }

    (async () => {
      try {
        // En polling silencioso de 60s: consultar ÚNICAMENTE tickets y movimientos (sin utilidadDiaria ni tasas extra)
        // En carga inicial/filtros: consultar también monedaBase real del tenant (sin asumir USD)
        const ticketsPromise = reporteTickets({ fechaInicio, fechaFin, estado: "PAGADA" });
        const egresosPromise = listarMovimientos(tenantId, "EGRESO") as Promise<MovimientoCajaConEquivalente[]>;
        const monedaPromise = !silencioso ? monedaBase(tenantId) : Promise.resolve(monedaBaseNegocio);

        const [ticketsLista, egresosLista, mBaseRes] = await Promise.all([
          ticketsPromise,
          egresosPromise,
          monedaPromise,
        ]);

        if (currentGen !== generationRef.current || controller.signal.aborted) return;

        const baseCur = mBaseRes || monedaBaseNegocio;

        // Cálculos multimoneda en variables locales
        const localVentasTotal = ticketsLista.reduce((s, t) => s + obtenerTotalTicket(t), 0);
        const localTicketsCount = ticketsLista.length;
        const localTicketsPeriodo = [...ticketsLista].sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );

        const egresosFiltrados = egresosLista.filter((m) => {
          const f = m.fechaRegistro.slice(0, 10);
          return f >= fechaInicio && f <= fechaFin;
        });
        const localEgresosTotal = egresosFiltrados.reduce((s, m) => s + obtenerMontoEgreso(m, baseCur), 0);

        // Horas Top de Venta
        const horasMap: Record<number, { hora: number; label: string; ventas: number; pedidos: number }> = {};
        for (let h = 0; h < 24; h++) {
          const ampm = h >= 12 ? "PM" : "AM";
          const h12 = h % 12 === 0 ? 12 : h % 12;
          horasMap[h] = { hora: h, label: `${h12}:00 ${ampm}`, ventas: 0, pedidos: 0 };
        }
        ticketsLista.forEach((t) => {
          const h = new Date(t.fecha).getHours();
          if (horasMap[h]) {
            horasMap[h].ventas += obtenerTotalTicket(t);
            horasMap[h].pedidos += 1;
          }
        });
        const localHorasTopData = Object.values(horasMap)
          .filter((h) => (h.hora >= 8 && h.hora <= 23) || h.ventas > 0)
          .sort((a, b) => a.hora - b.hora);

        const horasConVentas = localHorasTopData.filter((h) => h.ventas > 0);
        const localHoraPico = horasConVentas.length > 0
          ? [...horasConVentas].sort((a, b) => b.ventas - a.ventas)[0]
          : null;

        // Tendencia según el rango activo
        let localTendencia: { etiqueta: string; ventas: number; pedidos?: number }[] = [];
        if (rango === "DIA") {
          localTendencia = localHorasTopData.map((h) => ({
            etiqueta: h.label,
            ventas: Number(h.ventas.toFixed(2)),
            pedidos: h.pedidos,
          }));
        } else if (rango === "7_DIAS") {
          const porDia: Record<string, { ventas: number; pedidos: number }> = {};
          for (let i = 0; i < 7; i++) {
            const dStr = sumarDiasStr(fechaInicio, i);
            porDia[dStr] = { ventas: 0, pedidos: 0 };
          }
          ticketsLista.forEach((t) => {
            const dia = t.fecha.slice(0, 10);
            if (dia in porDia) {
              porDia[dia].ventas += obtenerTotalTicket(t);
              porDia[dia].pedidos += 1;
            }
          });
          localTendencia = Object.entries(porDia).map(([f, v]) => ({
            etiqueta: new Date(f + "T00:00:00").toLocaleDateString("es-VE", { day: "2-digit", month: "short" }),
            ventas: Number(v.ventas.toFixed(2)),
            pedidos: v.pedidos,
          }));
        } else if (rango === "MES") {
          const [yM, mM] = fechaSel.split("-").map(Number);
          const diasEnMes = new Date(yM, mM, 0).getDate();
          const porDiaMes: Record<string, { ventas: number; pedidos: number }> = {};
          for (let d = 1; d <= diasEnMes; d++) {
            const dStr = `${yM}-${String(mM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            porDiaMes[dStr] = { ventas: 0, pedidos: 0 };
          }
          ticketsLista.forEach((t) => {
            const dia = t.fecha.slice(0, 10);
            if (dia in porDiaMes) {
              porDiaMes[dia].ventas += obtenerTotalTicket(t);
              porDiaMes[dia].pedidos += 1;
            }
          });
          localTendencia = Object.entries(porDiaMes).map(([f, v]) => ({
            etiqueta: f.slice(8, 10),
            ventas: Number(v.ventas.toFixed(2)),
            pedidos: v.pedidos,
          }));
        } else {
          const MESES_ABR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
          const porMes: Record<number, { ventas: number; pedidos: number }> = {};
          for (let i = 0; i < 12; i++) porMes[i] = { ventas: 0, pedidos: 0 };
          ticketsLista.forEach((t) => {
            const mIdx = new Date(t.fecha).getMonth();
            if (porMes[mIdx]) {
              porMes[mIdx].ventas += obtenerTotalTicket(t);
              porMes[mIdx].pedidos += 1;
            }
          });
          localTendencia = Object.entries(porMes).map(([mIdx, v]) => ({
            etiqueta: MESES_ABR[Number(mIdx)],
            ventas: Number(v.ventas.toFixed(2)),
            pedidos: v.pedidos,
          }));
        }

        // Utilidad y Top Productos:
        // En polling silencioso de 60s NO se ejecutan llamadas a utilidadDiaria.
        // Se calculan únicamente durante carga inicial, cambio de filtros o refresco manual (!silencioso).
        let localUtilidadTotal = datosUtilidadRef.current.utilidadTotal;
        let localTopProductos = datosUtilidadRef.current.topProductos;

        if (!silencioso) {
          const fechasConTickets = [...new Set(ticketsLista.map((t) => t.fecha.slice(0, 10)))];
          if (fechasConTickets.length > 0) {
            const utilidadesArr = await Promise.all(
              fechasConTickets.slice(0, 31).map((f) => utilidadDiaria(tenantId, f))
            );
            if (currentGen !== generationRef.current || controller.signal.aborted) return;

            let uTotal = 0;
            const mapaProds: Record<string, ResumenUtilidadProducto> = {};
            utilidadesArr.flat().forEach((p) => {
              uTotal += p.utilidad;
              if (!mapaProds[p.nombrePlato]) {
                mapaProds[p.nombrePlato] = { ...p };
                return;
              }
              mapaProds[p.nombrePlato].cantidadVendida += p.cantidadVendida;
              mapaProds[p.nombrePlato].ingresoTotal += p.ingresoTotal;
              mapaProds[p.nombrePlato].costoTotal += p.costoTotal;
              mapaProds[p.nombrePlato].utilidad += p.utilidad;
            });
            localUtilidadTotal = uTotal;
            localTopProductos = Object.values(mapaProds).sort((a, b) => b.cantidadVendida - a.cantidadVendida).slice(0, 5);
          } else {
            // Sin tickets en el período: estado vacío honesto, sin llamar a utilidadDiaria ni asumir datos falsos
            localTopProductos = [];
            localUtilidadTotal = 0;
          }
          datosUtilidadRef.current = { utilidadTotal: localUtilidadTotal, topProductos: localTopProductos };
        }

        // Comprobación final de vigencia antes de aplicar estado de forma atómica
        if (currentGen !== generationRef.current || controller.signal.aborted) return;

        setMonedaBaseNegocio(baseCur);
        setVentasTotal(localVentasTotal);
        setTicketsCount(localTicketsCount);
        setTicketsPeriodo(localTicketsPeriodo);
        setEgresosTotal(localEgresosTotal);
        setHorasTopData(localHorasTopData);
        setHoraPico(localHoraPico);
        setTendencia(localTendencia);
        setTopProductos(localTopProductos);
        setUtilidadTotal(localUtilidadTotal);

        setError(null);
        setAvisoErrorSilencioso(null);
        setUltimaSinc(new Date().toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      } catch (e: any) {
        if (currentGen !== generationRef.current || controller.signal.aborted) return;

        if (silencioso) {
          // En sondeo silencioso fallido: conservar datos anteriores y avisar discretamente sin vaciar
          setAvisoErrorSilencioso("No se pudo actualizar automáticamente");
        } else {
          // En carga inicial o cambio de filtros fallido: limpiar indicadores para no mostrar datos del período anterior
          setVentasTotal(0);
          setTicketsCount(0);
          setTicketsPeriodo([]);
          setEgresosTotal(0);
          setHorasTopData([]);
          setHoraPico(null);
          setTendencia([]);
          setTopProductos([]);
          setUtilidadTotal(null);
          setUltimaSinc(null);
          datosUtilidadRef.current = { utilidadTotal: null, topProductos: [] };
          setError(e instanceof Error ? e.message : "No se pudieron cargar los indicadores");
          setAvisoErrorSilencioso(null);
        }
      } finally {
        if (currentGen === generationRef.current) {
          ejecucionEnCursoRef.current = false;
          if (!silencioso) {
            setCargando(false);
          }
        }
      }
    })();
  };

  // Carga al montar o cambiar de filtros (inmediata), y sondeo periódico cada 60 segundos
  useEffect(() => {
    cargarDatos(false);
    const interval = setInterval(() => {
      cargarDatos(true);
    }, 60000);

    return () => {
      clearInterval(interval);
      generationRef.current++;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [tenantId, rango, fechaInicio, fechaFin]);

  // Controles de navegación de fecha
  const irAnterior = () => {
    if (rango === "DIA") {
      setFechaSel((prev) => sumarDiasStr(prev, -1));
    } else if (rango === "7_DIAS") {
      setFechaSel((prev) => sumarDiasStr(prev, -7));
    } else if (rango === "MES") {
      const [y, m, d] = fechaSel.split("-").map(Number);
      const dt = new Date(y, m - 2, Math.min(d, 28));
      const y2 = dt.getFullYear();
      const m2 = String(dt.getMonth() + 1).padStart(2, "0");
      setFechaSel(`${y2}-${m2}-01`);
    } else {
      const [y] = fechaSel.split("-").map(Number);
      setFechaSel(`${y - 1}-01-01`);
    }
  };

  const irSiguiente = () => {
    if (rango === "DIA") {
      setFechaSel((prev) => sumarDiasStr(prev, 1));
    } else if (rango === "7_DIAS") {
      setFechaSel((prev) => sumarDiasStr(prev, 7));
    } else if (rango === "MES") {
      const [y, m, d] = fechaSel.split("-").map(Number);
      const dt = new Date(y, m, Math.min(d, 28));
      const y2 = dt.getFullYear();
      const m2 = String(dt.getMonth() + 1).padStart(2, "0");
      setFechaSel(`${y2}-${m2}-01`);
    } else {
      const [y] = fechaSel.split("-").map(Number);
      setFechaSel(`${y + 1}-01-01`);
    }
  };

  const irHoy = () => {
    setFechaSel(hoy());
  };

  const ticketPromedio = ticketsCount > 0 ? ventasTotal / ticketsCount : 0;

  return (
    <div className="space-y-5">
      {/* Barra de Control de Tiempo y Rango */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 apple-glass rounded-2xl p-4 border border-slate-300/50 dark:border-white/10">
        {/* Selector de Rango */}
        <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-white/5 p-1 rounded-xl text-xs flex-wrap">
          {[
            { id: "DIA", label: "Día a Día" },
            { id: "7_DIAS", label: "Últimos 7 Días" },
            { id: "MES", label: "Último Mes" },
            { id: "ANO", label: "Año" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRango(tab.id as RangoEstadistica)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                rango === tab.id
                  ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm"
                  : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Navegador entre días / fecha */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={irAnterior}
            title={rango === "DIA" ? "Día anterior" : rango === "MES" ? "Mes anterior" : rango === "ANO" ? "Año anterior" : "7 días atrás"}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300/60 dark:border-white/10 text-xs font-bold hover:bg-white/10 text-slate-700 dark:text-white/80 cursor-pointer flex items-center gap-1"
          >
            <IconChevronLeft size={14} />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300/60 dark:border-white/10 bg-white/40 dark:bg-black/20 text-xs font-bold text-slate-800 dark:text-white">
            <IconCalendar size={14} className="text-teal-500 shrink-0" />
            <input
              type="date"
              value={fechaSel}
              onChange={(e) => e.target.value && setFechaSel(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold focus:outline-none cursor-pointer text-slate-800 dark:text-white"
            />
          </div>

          <button
            type="button"
            onClick={irSiguiente}
            title={rango === "DIA" ? "Día siguiente" : rango === "MES" ? "Mes siguiente" : rango === "ANO" ? "Año siguiente" : "7 días adelante"}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300/60 dark:border-white/10 text-xs font-bold hover:bg-white/10 text-slate-700 dark:text-white/80 cursor-pointer flex items-center gap-1"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <IconChevronRight size={14} />
          </button>

          <button
            type="button"
            onClick={irHoy}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              fechaSel === hoy()
                ? "bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30"
                : "bg-slate-200/70 dark:bg-white/10 hover:bg-teal-600 hover:text-white text-slate-700 dark:text-white/80"
            }`}
          >
            Hoy
          </button>

          <button
            type="button"
            onClick={() => cargarDatos(false)}
            className="p-1.5 rounded-xl border border-slate-300/60 dark:border-white/10 hover:bg-white/10 text-slate-600 dark:text-white/60 cursor-pointer transition-transform"
            title="Actualizar datos en vivo"
          >
            <div className={cargando ? "animate-spin text-teal-500" : ""}>
              <IconRefresh size={15} />
            </div>
          </button>
        </div>
      </div>

      {/* Subtítulo del período y badge de Actualización automática con indicador dinámico */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-2">
        <div className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider flex items-center gap-2">
          <span>Período:</span>
          <span className="text-teal-600 dark:text-teal-400 normal-case font-extrabold text-sm">{etiquetaPeriodo}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-xl border ${
            avisoErrorSilencioso
              ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
              : "text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20"
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              avisoErrorSilencioso ? "bg-amber-500" : "bg-teal-500 animate-pulse"
            }`} />
            Actualización automática
          </span>
          {ultimaSinc && (
            <span className="text-[11px] text-slate-400 dark:text-white/40 font-mono">
              Sinc: {ultimaSinc}
            </span>
          )}
          {cargando && <span className="text-xs text-teal-500 animate-pulse font-semibold ml-1">Actualizando…</span>}
          {avisoErrorSilencioso && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg font-medium border border-amber-500/20">
              {avisoErrorSilencioso}
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</p>}

      {/* Tarjetas KPI del Período con soporte multimoneda */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ventas Totales"
          val={monedaBaseNegocio ? `${monedaBaseNegocio} ${ventasTotal.toFixed(2)}` : `${ventasTotal.toFixed(2)}`}
          sub={`${ticketsCount} transacción${ticketsCount === 1 ? "" : "es"} en el período`}
          color="#0ea5e9"
        />
        <KpiCard
          label="Egresos Operativos"
          val={monedaBaseNegocio ? `${monedaBaseNegocio} ${egresosTotal.toFixed(2)}` : `${egresosTotal.toFixed(2)}`}
          sub="Salidas de caja registradas"
          color="#ef4444"
        />
        <KpiCard
          label="Utilidad Bruta Estimada"
          val={utilidadTotal !== null ? (monedaBaseNegocio ? `${monedaBaseNegocio} ${utilidadTotal.toFixed(2)}` : `${utilidadTotal.toFixed(2)}`) : "No disponible"}
          sub={utilidadTotal !== null ? "Ganancia sobre costos de insumos" : "Cálculo no disponible"}
          color="#22c55e"
        />
        <KpiCard
          label="Ticket Promedio"
          val={monedaBaseNegocio ? `${monedaBaseNegocio} ${ticketPromedio.toFixed(2)}` : `${ticketPromedio.toFixed(2)}`}
          sub="Monto promedio por pedido"
          color="#a855f7"
        />
      </div>

      {/* FILA 1: Tendencia del Período + HORAS TOP DE VENTA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Gráfico 1: Tendencia de Ingresos */}
        <div className="apple-glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">
                {rango === "DIA"
                  ? "Facturación por Horas del Día"
                  : rango === "7_DIAS"
                  ? "Tendencia de Ingresos — Últimos 7 Días"
                  : rango === "MES"
                  ? "Evolución Diaria del Mes"
                  : "Facturación Mensual del Año"}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-white/40">Total facturado en {monedaBaseNegocio || "moneda base"}</p>
            </div>
            <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-lg">
              {monedaBaseNegocio ? `${monedaBaseNegocio} ` : ""}{ventasTotal.toFixed(2)}
            </span>
          </div>
          {tendencia.length === 0 || ventasTotal === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
              Sin ventas registradas en este período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={tendencia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
                <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={((v: any) => [`${monedaBaseNegocio ? `${monedaBaseNegocio} ` : ""}${Number(v).toFixed(2)}`, "Ventas"]) as any}
                  contentStyle={{ fontSize: 11, borderRadius: 10, background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
                <Line type="monotone" dataKey="ventas" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3, fill: "#0ea5e9" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gráfico 2: Horas Top de Venta */}
        <div className="apple-glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">
                Horas Top de Venta
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-white/40">Distribución de facturación por hora</p>
            </div>
            {horaPico && horaPico.ventas > 0 ? (
              <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-lg">
                Pico: {horaPico.label} ({monedaBaseNegocio ? `${monedaBaseNegocio} ` : ""}{horaPico.ventas.toFixed(2)})
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Sin hora pico</span>
            )}
          </div>

          {horasTopData.length === 0 || ventasTotal === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
              Sin ventas registradas en este período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={horasTopData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={rango === "DIA" ? 1 : 2} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={((v: any, name: any, item: any) => {
                    if (name === "ventas") return [`${monedaBaseNegocio ? `${monedaBaseNegocio} ` : ""}${Number(v).toFixed(2)} (${item.payload.pedidos} pedidos)`, "Facturado"];
                    return [v, name];
                  }) as any}
                  contentStyle={{ fontSize: 11, borderRadius: 10, background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
                <Bar dataKey="ventas" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {horaPico && (
            <div className="mt-3 pt-3 border-t border-slate-300/40 dark:border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-white/50">
                Franja más concurrida: <strong className="text-slate-800 dark:text-white">{horaPico.label}</strong>
              </span>
              <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                {horaPico.pedidos} comanda{horaPico.pedidos === 1 ? "" : "s"} registrada{horaPico.pedidos === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* FILA 2: Top 5 Productos + Comandas / Tickets del Período */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Gráfico 3: Top 5 Productos más Vendidos */}
        <div className="apple-glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">
              Top 5 Productos más Vendidos
            </h3>
            <span className="text-[11px] text-slate-400">Unidades facturadas</span>
          </div>

          {topProductos.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
              Sin registros de productos con costo en este período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProductos} layout="vertical" margin={{ left: 10, right: 16 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="nombrePlato" width={110} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={((v: any, _name: any, item: any) => [
                    `${v} unidades (${monedaBaseNegocio ? `${monedaBaseNegocio} ` : ""}${(item.payload.ingresoTotal || 0).toFixed(2)})`,
                    "Vendido",
                  ]) as any}
                  contentStyle={{ fontSize: 11, borderRadius: 10, background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
                <Bar dataKey="cantidadVendida" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Lista de Comandas & Tickets del Período */}
        <div className="apple-glass rounded-2xl p-5 flex flex-col min-h-[280px]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">
                Tickets & Comandas Registradas
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-white/40">Detalle de operaciones del período</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-white/70 bg-slate-200/60 dark:bg-white/10 px-2.5 py-1 rounded-xl">
              {ticketsPeriodo.length} tickets
            </span>
          </div>

          {ticketsPeriodo.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              No hay tickets registrados para esta fecha.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {ticketsPeriodo.map((t) => (
                <button
                  type="button"
                  key={t.comandaId}
                  onClick={() => setTicketDetalle(t)}
                  className="w-full flex items-center justify-between bg-slate-100/60 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl px-3.5 py-2.5 text-xs text-left cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-300 flex items-center justify-center shrink-0 font-bold text-[11px]">
                      {t.canal === "DELIVERY_PROPIO" ? (
                        <IconTruck size={14} />
                      ) : t.canal === "SALON" ? (
                        <IconUtensils size={14} />
                      ) : (
                        <IconShoppingBag size={14} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 dark:text-white/90 truncate flex items-center gap-1.5">
                        <span>{t.numeroTicket}</span>
                        {t.numeroMesa && (
                          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">
                            Mesa #{t.numeroMesa}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{new Date(t.fecha).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span>•</span>
                        <span>{(t.metodoPago || "EFECTIVO").replace("_", " ")}</span>
                        <span>•</span>
                        <span>{t.canal === "DELIVERY_PROPIO" ? "Delivery" : t.canal === "SALON" ? "En Mesa" : "Para Llevar"}</span>
                        {t.mesero && <><span>•</span><span>{t.mesero}</span></>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-extrabold text-slate-900 dark:text-white">
                      {t.monedaBase || monedaBaseNegocio || ""} {obtenerTotalTicket(t).toFixed(2)}
                    </div>
                    {t.totalBs && (t.monedaBase || monedaBaseNegocio) !== "VES" && (
                      <div className="text-[10px] font-mono text-teal-600 dark:text-teal-400">
                        Bs. {Number(t.totalBs).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {ticketDetalle && (
        <ModalDetalleTicket tenantId={tenantId} ticket={ticketDetalle} onClose={() => setTicketDetalle(null)} />
      )}
    </div>
  );
}


// ADMINISTRACIÓN — ingresos/gastos + cuentas x cobrar/pagar + cierre de caja, unidos
// ══════════════════════════════════════════════════════════════════════════
function Administracion({ tenantId, monedasActivas }: { tenantId: number; monedasActivas: typeof MONEDAS_POR_DEFECTO }) {
  const [tab, setTab] = useState<"turnos" | "finanzas" | "cuentas" | "cierre" | "resumen" | "nomina">("finanzas");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/5 text-xs w-fit flex-wrap">
        {[
          { id: "finanzas", label: "Ingresos & Gastos" },
          { id: "turnos", label: "Control de Caja (Turnos)" },
          { id: "cuentas", label: "Cuentas x Cobrar/Pagar" },
          { id: "cierre", label: "Cierre de Caja" },
          { id: "resumen", label: "Resumen Diario" },
          { id: "nomina", label: "Nómina de Personal" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-2 rounded-full font-bold transition-all cursor-pointer ${tab === t.id ? "bg-teal-600 text-white shadow-xs" : "text-slate-600 dark:text-white/60"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "turnos" && <TurnosCaja tenantId={tenantId} />}
      {tab === "finanzas" && <Finanzas tenantId={tenantId} monedasActivas={monedasActivas} />}
      {tab === "cuentas" && <CuentasPorCobrarPagar tenantId={tenantId} />}
      {tab === "cierre" && <CierreDeCaja tenantId={tenantId} />}
      {tab === "resumen" && <ResumenDiario tenantId={tenantId} />}
      {tab === "nomina" && <NominaPersonal tenantId={tenantId} monedasActivas={monedasActivas} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// NÓMINA DE PERSONAL — liquida horas fichadas (reloj checador de RRHH) en un
// período y calcula cuánto se debe pagar, según cómo se configuró CADA
// empleado (por hora / salario fijo / solo control). No inventa un motor de
// nómina nuevo: reutiliza RelojChecadorService.liquidarPeriodo, que ya
// existía en RRHH pero no tenía ninguna pantalla que lo mostrara.
// ══════════════════════════════════════════════════════════════════════════
const LABEL_TIPO_CONTROL: Record<TipoControlEmpleado, string> = {
  POR_HORA: "Por hora", SALARIO_FIJO: "Salario fijo", SOLO_CONTROL: "Solo control (sin pago)",
};
const LABEL_PERIODICIDAD: Record<PeriodicidadPago, string> = {
  SEMANAL: "Semanal", QUINCENAL: "Quincenal", MENSUAL: "Mensual",
};

function formatMontoNomina(monto: number, moneda: string | null | undefined): string {
  const m = moneda || "USD";
  return m === "USD" ? `$${monto.toFixed(2)}` : `${monto.toFixed(2)} ${m}`;
}

function NominaPersonal({ tenantId, monedasActivas }: { tenantId: number; monedasActivas: typeof MONEDAS_POR_DEFECTO }) {
  const monedasNomina = ["USD", ...(Object.keys(monedasActivas) as (keyof typeof monedasActivas)[]).filter((m) => monedasActivas[m])];
  const [desde, setDesde] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; });
  const [hasta, setHasta] = useState(hoy());
  const [empleados, setEmpleados] = useState<EmpleadoRrhh[] | null>(null);
  const [liquidacion, setLiquidacion] = useState<LiquidacionPeriodoRrhh | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editandoPagoId, setEditandoPagoId] = useState<number | null>(null);
  const [formPago, setFormPago] = useState<{ tipoControl: TipoControlEmpleado; tarifaPorHora: string; salarioFijo: string; monedaSalario: string; periodicidadPago: PeriodicidadPago }>({ tipoControl: "SOLO_CONTROL", tarifaPorHora: "", salarioFijo: "", monedaSalario: "USD", periodicidadPago: "MENSUAL" });
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [pagos, setPagos] = useState<PagoNomina[]>([]);
  const [pagandoId, setPagandoId] = useState<number | null>(null);
  const [descargandoReciboId, setDescargandoReciboId] = useState<number | null>(null);

  const cargarEmpleados = () => listarEmpleadosRrhh().then((r) => setEmpleados(r.filter((e) => e.activo))).catch(() => setEmpleados([]));
  const cargarPagos = () => listarPagosNomina(tenantId).then(setPagos).catch(() => setPagos([]));
  useEffect(() => { cargarEmpleados(); cargarPagos(); }, [tenantId]);

  const calcular = () => {
    setCargando(true);
    setError(null);
    liquidarPeriodoRrhh(tenantId, `${desde}T00:00:00`, `${hasta}T23:59:59`)
      .then(setLiquidacion)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo calcular la nómina"))
      .finally(() => setCargando(false));
  };
  useEffect(() => { calcular(); }, [tenantId]);

  const abrirEditarPago = (emp: EmpleadoRrhh) => {
    setEditandoPagoId(emp.id);
    setFormPago({
      tipoControl: emp.tipoControl,
      tarifaPorHora: emp.tarifaPorHora != null ? String(emp.tarifaPorHora) : "",
      salarioFijo: emp.salarioFijo != null ? String(emp.salarioFijo) : "",
      monedaSalario: emp.monedaSalario || "USD",
      periodicidadPago: emp.periodicidadPago || "MENSUAL",
    });
  };

  const guardarPago = async (emp: EmpleadoRrhh) => {
    if (formPago.tipoControl === "POR_HORA" && !formPago.tarifaPorHora) { setError("Indica la tarifa por hora"); return; }
    if (formPago.tipoControl === "SALARIO_FIJO" && !formPago.salarioFijo) { setError("Indica el monto del salario"); return; }
    setGuardandoPago(true);
    setError(null);
    try {
      await editarEmpleadoRrhh(emp.id, {
        nombre: emp.nombre, cedula: emp.cedula || undefined, cargo: emp.cargo || undefined,
        tipoControl: formPago.tipoControl,
        tarifaPorHora: formPago.tipoControl === "POR_HORA" ? Number(formPago.tarifaPorHora) : undefined,
        salarioFijo: formPago.tipoControl === "SALARIO_FIJO" ? Number(formPago.salarioFijo) : undefined,
        monedaSalario: formPago.tipoControl === "SALARIO_FIJO" ? formPago.monedaSalario : undefined,
        periodicidadPago: formPago.periodicidadPago,
      });
      setEditandoPagoId(null);
      cargarEmpleados();
      calcular();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la forma de pago");
    } finally {
      setGuardandoPago(false);
    }
  };

  // Un pago ya hecho que se solapa con [desde,hasta] bloquea el botón "Pagar"
  // para ese empleado — el backend también lo rechaza, esto solo evita el
  // viaje redondo y muestra de una vez el recibo ya emitido.
  const pagoDelPeriodo = (empleadoId: number) =>
    pagos.find((p) => p.empleadoId === empleadoId && p.periodoDesde <= hasta && p.periodoHasta >= desde);

  const pagarEmpleado = async (emp: EmpleadoRrhh, monto: number, moneda: string, horasTrabajadas: number) => {
    if (!window.confirm(`¿Confirmas el pago de ${formatMontoNomina(monto, moneda)} a ${emp.nombre} por el período ${desde} a ${hasta}? Esto registrará el gasto en caja y no se puede deshacer.`)) return;
    setPagandoId(emp.id);
    setError(null);
    try {
      await pagarNomina(tenantId, {
        empleadoId: emp.id, periodoDesde: desde, periodoHasta: hasta,
        horasTrabajadas: emp.tipoControl === "POR_HORA" ? horasTrabajadas : undefined,
        monto, moneda,
      });
      cargarPagos();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el pago");
    } finally {
      setPagandoId(null);
    }
  };

  const descargarRecibo = async (pagoId: number) => {
    setDescargandoReciboId(pagoId);
    try {
      const blob = await descargarReciboNominaPdf(tenantId, pagoId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el recibo");
    } finally {
      setDescargandoReciboId(null);
    }
  };

  // Combina el directorio completo (para que salga el que aún no fichó nada
  // en el período, con 0 horas) con lo que sí calculó la liquidación.
  const filas = (empleados || []).map((emp) => {
    const linea = liquidacion?.empleados.find((l) => l.empleadoId === emp.id);
    return {
      empleado: emp,
      horasTrabajadas: linea?.horasTrabajadas ?? 0,
      totalPagar: linea?.totalPagar ?? null,
      monedaPago: linea?.monedaPago ?? null,
    };
  });
  // No se suman montos de distinta moneda entre sí — se agrupan por moneda
  // para no mezclar, por ejemplo, salarios en USD con salarios en VES.
  const totalesPorMoneda = filas.reduce<Record<string, number>>((acc, f) => {
    if (f.totalPagar != null) {
      const m = f.monedaPago || "USD";
      acc[m] = (acc[m] || 0) + f.totalPagar;
    }
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="apple-glass rounded-2xl p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Período a liquidar</p>
        <div className="flex items-end gap-2 flex-wrap">
          <Campo label="Desde"><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="input-horeca" /></Campo>
          <Campo label="Hasta"><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="input-horeca" /></Campo>
          <button onClick={calcular} disabled={cargando} className="g-aurora text-white text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {cargando ? "Calculando…" : "Calcular"}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {empleados === null ? (
        <p className="text-xs text-slate-400">Cargando personal…</p>
      ) : empleados.length === 0 ? (
        <div className="apple-glass rounded-2xl p-8 text-center">
          <p className="text-slate-500 dark:text-white/40 text-sm">Aún no tienes personal registrado con reloj checador (RRHH).</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filas.map(({ empleado: emp, horasTrabajadas, totalPagar, monedaPago }) => (
            <div key={emp.id} className="apple-glass rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{emp.nombre}</div>
                  <div className="text-xs text-slate-500 dark:text-white/40 flex items-center gap-2 flex-wrap mt-0.5">
                    {emp.cargo && <span>{emp.cargo}</span>}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${emp.tipoControl === "POR_HORA" ? "bg-teal-500/15 text-teal-600 dark:text-teal-400" : emp.tipoControl === "SALARIO_FIJO" ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" : "bg-slate-300/50 dark:bg-white/10 text-slate-500 dark:text-white/50"}`}>
                      {LABEL_TIPO_CONTROL[emp.tipoControl]}
                      {emp.tipoControl === "POR_HORA" && emp.tarifaPorHora ? ` · $${Number(emp.tarifaPorHora).toFixed(2)}/h` : ""}
                      {emp.tipoControl === "SALARIO_FIJO" && emp.salarioFijo ? ` · ${formatMontoNomina(Number(emp.salarioFijo), emp.monedaSalario)}` : ""}
                    </span>
                    {emp.tipoControl !== "SOLO_CONTROL" && (
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-white/30">
                        Se le paga: {LABEL_PERIODICIDAD[emp.periodicidadPago] || "Mensual"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 dark:text-white/40">{horasTrabajadas.toFixed(2)} horas fichadas</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white">{totalPagar != null ? formatMontoNomina(totalPagar, monedaPago) : "—"}</div>
                </div>
                <button onClick={() => abrirEditarPago(emp)} className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 cursor-pointer flex-shrink-0">
                  Elegir cómo se le paga
                </button>
              </div>
              {editandoPagoId === emp.id && (
                <div className="mt-3 pt-3 border-t border-slate-300/50 dark:border-white/10 flex items-end gap-2 flex-wrap">
                  <Campo label="Forma de pago">
                    <select value={formPago.tipoControl} onChange={(e) => setFormPago({ ...formPago, tipoControl: e.target.value as TipoControlEmpleado })} className="input-horeca">
                      <option value="POR_HORA">Por hora fichada</option>
                      <option value="SALARIO_FIJO">Salario fijo (monto pactado por período)</option>
                      <option value="SOLO_CONTROL">Solo control de asistencia (sin pago)</option>
                    </select>
                  </Campo>
                  {formPago.tipoControl === "POR_HORA" && (
                    <Campo label="Tarifa por hora ($)">
                      <input type="number" step="0.01" min="0" value={formPago.tarifaPorHora} onChange={(e) => setFormPago({ ...formPago, tarifaPorHora: e.target.value })} className="input-horeca w-28" />
                    </Campo>
                  )}
                  {formPago.tipoControl === "SALARIO_FIJO" && (
                    <>
                      <Campo label="Monto del salario">
                        <input type="number" step="0.01" min="0" value={formPago.salarioFijo} onChange={(e) => setFormPago({ ...formPago, salarioFijo: e.target.value })} className="input-horeca w-28" />
                      </Campo>
                      <Campo label="Moneda">
                        <select value={formPago.monedaSalario} onChange={(e) => setFormPago({ ...formPago, monedaSalario: e.target.value })} className="input-horeca">
                          {monedasNomina.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </Campo>
                    </>
                  )}
                  {formPago.tipoControl !== "SOLO_CONTROL" && (
                    <Campo label="Cada cuánto se le paga">
                      <select value={formPago.periodicidadPago} onChange={(e) => setFormPago({ ...formPago, periodicidadPago: e.target.value as PeriodicidadPago })} className="input-horeca">
                        <option value="SEMANAL">Semanal</option>
                        <option value="QUINCENAL">Quincenal</option>
                        <option value="MENSUAL">Mensual</option>
                      </select>
                    </Campo>
                  )}
                  <button onClick={() => guardarPago(emp)} disabled={guardandoPago} className="btn-cyber-neon text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
                    {guardandoPago ? "Guardando…" : "Guardar"}
                  </button>
                  <button onClick={() => setEditandoPagoId(null)} className="apple-glass-btn text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer">Cancelar</button>
                </div>
              )}
              {totalPagar != null && totalPagar > 0 && (() => {
                const pagoExistente = pagoDelPeriodo(emp.id);
                return (
                  <div className="mt-3 pt-3 border-t border-slate-300/50 dark:border-white/10 flex items-center justify-between gap-2 flex-wrap">
                    {pagoExistente ? (
                      <>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Pagado el {new Date(pagoExistente.fechaPago).toLocaleDateString("es-VE")} · {formatMontoNomina(pagoExistente.monto, pagoExistente.moneda)}
                        </span>
                        <button onClick={() => descargarRecibo(pagoExistente.id)} disabled={descargandoReciboId === pagoExistente.id}
                          className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 cursor-pointer disabled:opacity-60">
                          {descargandoReciboId === pagoExistente.id ? "Generando…" : "Descargar recibo"}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => pagarEmpleado(emp, totalPagar, monedaPago || "USD", horasTrabajadas)} disabled={pagandoId === emp.id}
                        className="g-aurora text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-60">
                        {pagandoId === emp.id ? "Pagando…" : `Pagar ${formatMontoNomina(totalPagar, monedaPago)}`}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
          <div className="apple-glass rounded-2xl p-4 flex items-center justify-between font-bold text-slate-900 dark:text-white flex-wrap gap-2">
            <span>Total a pagar en el período</span>
            <span className="font-mono flex items-center gap-3">
              {Object.keys(totalesPorMoneda).length === 0
                ? "$0.00"
                : Object.entries(totalesPorMoneda).map(([moneda, monto]) => (
                    <span key={moneda}>{formatMontoNomina(monto, moneda)}</span>
                  ))}
            </span>
          </div>
        </div>
      )}
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
  const [modoArqueo, setModoArqueo] = useState<"DIRECTO" | "DESGLOSADO">("DESGLOSADO");
  const [desgloseArqueo, setDesgloseArqueo] = useState({
    usd: "", ves: "", punto: "", pagoMovil: "", zelle: "", cop: ""
  });
  const [cerrando, setCerrando] = useState(false);
  const [ultimoCierre, setUltimoCierre] = useState<Turno | null>(null);

  // Tasas reales del negocio para convertir el arqueo desglosado — nunca un valor fijo
  // inventado (65.50 / 4180 no son cifras reales, eran solo un placeholder que además
  // podía desincronizarse de lo que en verdad se cobró en el POS).
  const [tasaVesArqueo, setTasaVesArqueo] = useState<number | null>(null);
  const [tasaCopArqueo, setTasaCopArqueo] = useState<number | null>(null);
  useEffect(() => {
    tasaVigente(tenantId, "USD", "VES").then((t) => setTasaVesArqueo(Number(t.tasa))).catch(() => setTasaVesArqueo(null));
    tasaVigente(tenantId, "USD", "COP").then((t) => setTasaCopArqueo(Number(t.tasa))).catch(() => setTasaCopArqueo(null));
  }, [tenantId]);

  const totalDesgloseCalculado = useMemo(() => {
    const usd = Number(desgloseArqueo.usd) || 0;
    const zelle = Number(desgloseArqueo.zelle) || 0;
    const ves = (Number(desgloseArqueo.ves) || 0) + (Number(desgloseArqueo.punto) || 0) + (Number(desgloseArqueo.pagoMovil) || 0);
    const cop = Number(desgloseArqueo.cop) || 0;

    const tasaVes = tasaVesArqueo ?? 0;
    const tasaCop = tasaCopArqueo ?? 0;

    if (moneda === "USD") {
      return usd + zelle + (tasaVes > 0 ? ves / tasaVes : 0) + (tasaCop > 0 ? cop / tasaCop : 0);
    } else if (moneda === "VES") {
      return ves + (usd + zelle) * tasaVes + (tasaCop > 0 ? (cop / tasaCop) * tasaVes : 0);
    } else {
      return cop + (usd + zelle) * tasaCop;
    }
  }, [desgloseArqueo, moneda, tasaVesArqueo, tasaCopArqueo]);

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
    if (montoDeclaradoFinal < 0) { setError("Indica lo contado físicamente en caja"); return; }
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
            <p className="text-xs text-slate-500 dark:text-white/40">Monto base: {fmtCostoEnMoneda(turno.montoBase, moneda)}</p>
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

          <div className="apple-glass rounded-2xl p-5 space-y-4 border border-amber-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Cierre de caja (Cierre Z)</h4>
                <p className="text-slate-500 dark:text-white/40 text-xs">Arqueo a ciegas: cuenta el dinero físico y declara lo que hay para auditar faltantes o sobrantes.</p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Arqueo Ciego
              </span>
            </div>

            {/* Selector de modo de declaración */}
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-xl text-xs w-fit">
              <button
                type="button"
                onClick={() => setModoArqueo("DESGLOSADO")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  modoArqueo === "DESGLOSADO" ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-300 shadow-sm" : "text-slate-500 dark:text-white/50"
                }`}
              >
                <IconReceipt size={13} />
                <span>Desglose por Método</span>
              </button>
              <button
                type="button"
                onClick={() => setModoArqueo("DIRECTO")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  modoArqueo === "DIRECTO" ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-300 shadow-sm" : "text-slate-500 dark:text-white/50"
                }`}
              >
                Monto Directo
              </button>
            </div>

            {modoArqueo === "DESGLOSADO" ? (
              <div className="space-y-3 bg-slate-50 dark:bg-white/[0.02] p-4 rounded-xl border border-slate-200 dark:border-white/5">
                <p className="text-[11px] font-semibold text-slate-600 dark:text-white/60">
                  Introduce lo contado físicamente en cada método para calcular el total sin errores:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-white/40 mb-1 flex items-center gap-1.5">
                      <IconCoins size={12} className="text-emerald-500" />
                      <span>Efectivo USD ($)</span>
                    </label>
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={desgloseArqueo.usd}
                      onChange={(e) => setDesgloseArqueo((prev) => ({ ...prev, usd: e.target.value }))}
                      className="input-horeca w-full text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-white/40 mb-1 flex items-center gap-1.5">
                      <span className="text-[9px] font-extrabold px-1 rounded bg-teal-500/20 text-teal-600 dark:text-teal-400">Bs</span>
                      <span>Efectivo Bolívares (Bs)</span>
                    </label>
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={desgloseArqueo.ves}
                      onChange={(e) => setDesgloseArqueo((prev) => ({ ...prev, ves: e.target.value }))}
                      className="input-horeca w-full text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-white/40 mb-1 flex items-center gap-1.5">
                      <IconCard size={12} className="text-sky-500" />
                      <span>Punto de Venta (Lote Bs)</span>
                    </label>
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={desgloseArqueo.punto}
                      onChange={(e) => setDesgloseArqueo((prev) => ({ ...prev, punto: e.target.value }))}
                      className="input-horeca w-full text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-white/40 mb-1 flex items-center gap-1.5">
                      <IconPhone size={12} className="text-indigo-500" />
                      <span>Pago Móvil (Bs)</span>
                    </label>
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={desgloseArqueo.pagoMovil}
                      onChange={(e) => setDesgloseArqueo((prev) => ({ ...prev, pagoMovil: e.target.value }))}
                      className="input-horeca w-full text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-white/40 mb-1 flex items-center gap-1.5">
                      <IconBolt size={12} className="text-amber-500" />
                      <span>Zelle ($)</span>
                    </label>
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={desgloseArqueo.zelle}
                      onChange={(e) => setDesgloseArqueo((prev) => ({ ...prev, zelle: e.target.value }))}
                      className="input-horeca w-full text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-white/40 mb-1 flex items-center gap-1.5">
                      <span className="text-[9px] font-extrabold px-1 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400">COP</span>
                      <span>Pesos Colombianos (COP)</span>
                    </label>
                    <input
                      type="number" step="1" min="0" placeholder="0"
                      value={desgloseArqueo.cop}
                      onChange={(e) => setDesgloseArqueo((prev) => ({ ...prev, cop: e.target.value }))}
                      className="input-horeca w-full text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-white/10">
                  <span className="text-xs font-bold text-slate-600 dark:text-white/70">
                    Total declarado acumulado:
                  </span>
                  <span className="font-mono font-black text-base text-teal-600 dark:text-teal-400">
                    {fmtCostoEnMoneda(totalDesgloseCalculado, moneda)}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <input
                  value={montoDeclarado}
                  onChange={(e) => setMontoDeclarado(e.target.value)}
                  type="number"
                  step="0.01"
                  placeholder={`Monto contado total en ${moneda}`}
                  className="input-horeca"
                />
              </div>
            )}

            <button
              onClick={cerrar}
              disabled={cerrando}
              className="btn-cyber-neon text-white text-sm font-bold px-5 py-3 rounded-xl cursor-pointer disabled:opacity-60 w-full shadow-lg"
            >
              {cerrando ? "Cerrando turno y auditando…" : `Cerrar turno y generar Cierre Z (${fmtCostoEnMoneda(montoDeclaradoFinal, moneda)})`}
            </button>
          </div>
        </div>
      )}

      {ultimoCierre && (
        <Modal onClose={() => setUltimoCierre(null)} titulo="Cierre Z registrado">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500 dark:text-white/40 text-xs">Esperado</span><div className="font-mono font-bold text-slate-900 dark:text-white">{fmtCostoEnMoneda(ultimoCierre.montoEsperado, ultimoCierre.moneda)}</div></div>
              <div><span className="text-slate-500 dark:text-white/40 text-xs">Declarado</span><div className="font-mono font-bold text-slate-900 dark:text-white">{fmtCostoEnMoneda(ultimoCierre.montoDeclarado, ultimoCierre.moneda)}</div></div>
            </div>
            <div className={`rounded-xl p-3 text-center font-mono font-bold ${
              Number(ultimoCierre.descuadre) === 0 ? "bg-teal-500/15 text-teal-600 dark:text-teal-300"
              : Number(ultimoCierre.descuadre) > 0 ? "bg-sky-500/15 text-sky-600 dark:text-sky-300"
              : "bg-red-500/15 text-red-500"
            }`}>
              {Number(ultimoCierre.descuadre) === 0 ? "Caja cuadrada exacta"
                : Number(ultimoCierre.descuadre) > 0 ? `Sobrante: +${fmtCostoEnMoneda(ultimoCierre.descuadre, ultimoCierre.moneda)}`
                : `Faltante: ${fmtCostoEnMoneda(ultimoCierre.descuadre, ultimoCierre.moneda)}`}
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
                    <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-white/60">{fmtNumero(t.montoBase, t.moneda)}</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-white/60">{t.montoEsperado != null ? fmtNumero(t.montoEsperado, t.moneda) : "—"}</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-600 dark:text-white/60">{t.montoDeclarado != null ? fmtNumero(t.montoDeclarado, t.moneda) : "—"}</td>
                    <td className={`py-2 pl-2 text-right font-mono font-bold ${
                      t.descuadre == null ? "text-slate-400" : Number(t.descuadre) === 0 ? "text-teal-600 dark:text-teal-400" : "text-red-500"
                    }`}>
                      {t.descuadre != null ? fmtNumero(t.descuadre, t.moneda) : (t.estado === "ABIERTO" ? "Abierto" : "—")}
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
  const [fecha, setFecha] = useState(() => hoy());
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
                  <td className="py-2 pr-2 font-semibold text-slate-800 dark:text-white/80">{f.nombrePlato}</td>
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
    historialCierres(tenantId).then(setHistorial).catch(() => setHistorial([]));
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
              <div className="font-['Outfit'] font-black text-lg text-teal-600 dark:text-teal-400">{fmtNumero(resumen.totalIngresos, moneda)}</div>
            </div>
            <div className="bg-slate-100/60 dark:bg-white/5 rounded-xl p-3.5">
              <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider">Egresos</div>
              <div className="font-['Outfit'] font-black text-lg text-red-500">{fmtNumero(resumen.totalEgresos, moneda)}</div>
            </div>
            <div className="bg-slate-100/60 dark:bg-white/5 rounded-xl p-3.5">
              <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider">Esperado en caja</div>
              <div className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">{fmtNumero(resumen.montoEsperadoEnCaja, moneda)}</div>
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
                <div className={`text-[11px] mt-0.5 ${a.diferencia == null || Number(a.diferencia) === 0 ? "text-teal-600 dark:text-teal-400" : "text-amber-500"}`}>
                  Declarado: {fmtCostoEnMoneda(a.montoDeclarado, a.moneda)} · Esperado: {a.montoEsperado != null ? fmtCostoEnMoneda(a.montoEsperado, a.moneda) : "—"}
                  {a.diferencia != null && Number(a.diferencia) !== 0 && ` · Diferencia: ${fmtCostoEnMoneda(a.diferencia, a.moneda)}`}
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
function Finanzas({ tenantId, monedasActivas }: { tenantId: number; monedasActivas: typeof MONEDAS_POR_DEFECTO }) {
  // USD es la base, siempre disponible; VES/COP solo si el negocio los activó en Configuración.
  const monedasHabilitadas = ["USD", ...(Object.keys(monedasActivas) as (keyof typeof monedasActivas)[]).filter((m) => monedasActivas[m])];
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

  // Cada moneda se suma aparte — nunca se mezcla USD con VES/COP en un solo
  // número (eso daba totales sin sentido, ej. "$10,087" sumando 2 dólares
  // con 10 mil bolívares como si fueran la misma unidad).
  const porMoneda = (tipo: "INGRESO" | "EGRESO") =>
    (movimientos || []).filter((m) => m.tipo === tipo).reduce<Record<string, number>>((acc, m) => {
      acc[m.moneda] = (acc[m.moneda] || 0) + Number(m.monto);
      return acc;
    }, {});
  const ingresosPorMoneda = porMoneda("INGRESO");
  const egresosPorMoneda = porMoneda("EGRESO");
  // Siempre se muestran las monedas activas del negocio (aunque todavía no
  // tengan movimientos, en $0.00) más cualquier otra moneda que sí tenga
  // historial real — la plata registrada nunca se esconde, aunque después
  // hayan desactivado esa moneda en Configuración.
  const monedasConMovimiento = Array.from(new Set([
    ...monedasHabilitadas, ...Object.keys(ingresosPorMoneda), ...Object.keys(egresosPorMoneda),
  ])).sort();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="apple-glass rounded-2xl p-5 border-l-4" style={{ borderLeftColor: "#10b981" }}>
          <div className="text-xs text-slate-500 dark:text-white/40 mb-2">Total Ingresos</div>
          <div className="space-y-1">
            {monedasConMovimiento.map((moneda) => (
              <div key={moneda} className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-white/30">{moneda}</span>
                <span className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">{fmtNumero(ingresosPorMoneda[moneda] || 0, moneda)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="apple-glass rounded-2xl p-5 border-l-4" style={{ borderLeftColor: "#ef4444" }}>
          <div className="text-xs text-slate-500 dark:text-white/40 mb-2">Total Gastos</div>
          <div className="space-y-1">
            {monedasConMovimiento.map((moneda) => (
              <div key={moneda} className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-white/30">{moneda}</span>
                <span className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">{fmtNumero(egresosPorMoneda[moneda] || 0, moneda)}</span>
              </div>
            ))}
          </div>
        </div>
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
            {monedasHabilitadas.map((m) => <option key={m} value={m}>{m}</option>)}
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
                {m.tipo === "INGRESO" ? "+" : "−"}{fmtCostoEnMoneda(m.monto, m.moneda)}
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
  const [verPagadas, setVerPagadas] = useState(false);
  const [abonando, setAbonando] = useState<MovimientoCaja | null>(null);

  const cargar = () => {
    listarMovimientos(tenantId, "CXC").then(setCxc).catch(() => setCxc([]));
    listarMovimientos(tenantId, "CXP").then(setCxp).catch(() => setCxp([]));
  };
  useEffect(cargar, [tenantId]);

  const todos = tab === "CXC" ? cxc : cxp;
  // Datos viejos (de antes de este campo) no traen `estado` — se tratan como
  // pendientes por defecto, no como ya pagadas, para no esconder deuda real.
  const pendientes = (todos || []).filter((m) => m.estado !== "PAGADO");
  const pagadas = (todos || []).filter((m) => m.estado === "PAGADO");
  const activos = verPagadas ? pagadas : pendientes;

  const totalesPorMoneda = pendientes.reduce<Record<string, number>>((acc, m) => {
    const saldo = m.saldoPendiente != null ? Number(m.saldoPendiente) : Number(m.monto);
    acc[m.moneda] = (acc[m.moneda] || 0) + saldo;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/60 dark:bg-white/5 text-xs w-fit">
          <button onClick={() => { setTab("CXP"); setVerPagadas(false); }}
            className={`px-5 py-2 rounded-full font-bold transition-all cursor-pointer ${tab === "CXP" ? "bg-red-500 text-white" : "text-slate-600 dark:text-white/60"}`}>
            Por Pagar ({cxp ? cxp.filter((m) => m.estado !== "PAGADO").length : 0})
          </button>
          <button onClick={() => { setTab("CXC"); setVerPagadas(false); }}
            className={`px-5 py-2 rounded-full font-bold transition-all cursor-pointer ${tab === "CXC" ? "bg-teal-600 text-white" : "text-slate-600 dark:text-white/60"}`}>
            Por Cobrar ({cxc ? cxc.filter((m) => m.estado !== "PAGADO").length : 0})
          </button>
        </div>
        <button onClick={() => setVerPagadas((v) => !v)} className="text-xs font-semibold text-slate-500 dark:text-white/40 hover:text-teal-600 dark:hover:text-teal-400 cursor-pointer">
          {verPagadas ? "← Ver pendientes" : `Ver saldadas (${pagadas.length}) →`}
        </button>
      </div>

      {!verPagadas && Object.keys(totalesPorMoneda).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(totalesPorMoneda).map(([moneda, total]) => (
            <div key={moneda} className="apple-glass rounded-xl px-5 py-3">
              <div className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider">Pendiente en {moneda}</div>
              <div className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">{fmtNumero(total, moneda)}</div>
            </div>
          ))}
        </div>
      )}

      {todos === null ? (
        <p className="text-xs text-slate-400">Cargando…</p>
      ) : activos.length === 0 ? (
        <div className="apple-glass rounded-2xl p-8 text-center">
          <p className="text-slate-500 dark:text-white/40 text-sm">
            {verPagadas ? "Todavía no hay cuentas saldadas." : tab === "CXP" ? "Sin cuentas por pagar pendientes." : "Sin cuentas por cobrar pendientes."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activos.map((m) => {
            const saldo = m.saldoPendiente != null ? Number(m.saldoPendiente) : Number(m.monto);
            const pagadoParcial = saldo > 0 && saldo < Number(m.monto);
            return (
              <div key={m.id} className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 border-l-4 apple-glass ${m.estado === "PAGADO" ? "border-slate-300/50 dark:border-white/10 opacity-60" : tab === "CXP" ? "border-red-500/50" : "border-teal-500/50"}`}>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{m.concepto}</div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(m.fechaRegistro).toLocaleString()}
                    {m.estado === "PAGADO" && " · Saldada"}
                    {pagadoParcial && ` · Abonado ${fmtCostoEnMoneda(Number(m.monto) - saldo, m.moneda)} de ${fmtCostoEnMoneda(m.monto, m.moneda)}`}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {fmtCostoEnMoneda(m.estado === "PAGADO" ? m.monto : saldo, m.moneda)}
                  </span>
                  {m.estado !== "PAGADO" && (
                    <button onClick={() => setAbonando(m)} className="text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap">
                      Registrar abono
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {abonando && (
        <ModalAbonarCuenta tenantId={tenantId} cuenta={abonando} tipoLabel={tab === "CXP" ? "proveedor" : "cliente"}
          onClose={() => setAbonando(null)} onAbonado={() => { setAbonando(null); cargar(); }} />
      )}
    </div>
  );
}

function ModalAbonarCuenta({ tenantId, cuenta, tipoLabel, onClose, onAbonado }: {
  tenantId: number; cuenta: MovimientoCaja; tipoLabel: string; onClose: () => void; onAbonado: () => void;
}) {
  const saldo = cuenta.saldoPendiente != null ? Number(cuenta.saldoPendiente) : Number(cuenta.monto);
  const [monto, setMonto] = useState(saldo.toFixed(2));
  const [moneda, setMoneda] = useState(cuenta.moneda);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    if (!monto || Number(monto) <= 0) { setError("Indica cuánto se abona"); return; }
    setGuardando(true);
    setError(null);
    try {
      await abonarMovimiento(tenantId, cuenta.id, { monto: Number(monto), moneda });
      onAbonado();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el abono");
      setGuardando(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo="Registrar abono">
      <div className="space-y-3">
        <p className="text-xs text-slate-500">{cuenta.concepto}</p>
        <p className="text-xs text-slate-500">Saldo pendiente: <strong className="text-slate-900">{fmtCostoEnMoneda(saldo, cuenta.moneda)}</strong></p>
        <div className="grid grid-cols-2 gap-3">
          <Campo label={`Monto que le pagás al ${tipoLabel} ahora`}>
            <input value={monto} onChange={(e) => setMonto(e.target.value)} type="number" step="0.01" min="0.01" className="input-horeca" autoFocus />
          </Campo>
          <Campo label="Moneda">
            <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className="input-horeca">
              {["USD", "VES", "COP"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Campo>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={guardar} disabled={guardando} className="flex-1 g-aurora text-white text-sm font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-60">
            {guardando ? "Registrando…" : "Registrar abono"}
          </button>
          <button onClick={onClose} className="flex-1 apple-glass-btn text-sm font-semibold py-2.5 rounded-xl cursor-pointer">Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTES COMPARTIDOS
// ══════════════════════════════════════════════════════════════════════════
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  // Sin variante dark: a propósito — Campo se usa exclusivamente dentro de
  // Modal, que es siempre de fondo claro sólido (ver comentario en Modal).
  // text-white/40 sobre esa tarjeta blanca queda casi invisible.
  return (
    <div>
      <label className="block text-slate-500 text-[11px] font-medium uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ titulo, onClose, children, ancho }: { titulo: string; onClose: () => void; children: React.ReactNode; ancho?: string }) {
  // Fondo blanco sólido a propósito — look administrativo/profesional pedido
  // explícitamente por el negocio (no el navy oscuro que usa el resto del
  // sitio marketing/Centro Financiero). Sin variante dark: en la tarjeta ni
  // en el título, para no depender del tema global ni de Modo Clásico —
  // ver aviso anterior sobre .horeca-clasico forzando texto oscuro sobre
  // fondo oscuro cuando este modal SÍ era dark.
  // Portal a document.body: cualquier ancestro con backdrop-filter/filter/
  // transform (ej. .apple-glass, que trae backdrop-filter: blur(...)) crea
  // un containing block nuevo para position: fixed y "atrapa" al modal
  // dentro de esa caja, cortándolo o descentrándolo. Renderizar el modal
  // fuera de ese árbol, directo bajo <body>, lo vuelve un overlay de viewport real sin
  // importar qué ancestro lo dispare.
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
