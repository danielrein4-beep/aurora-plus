import { avisar } from "../avisos";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  obtenerInteligenciaNegocio, obtenerInteligenciaComercio, obtenerInteligenciaSalud, obtenerDetalleComercioInteligencia,
  obtenerMercadoGanaderoSuperAdmin, suspenderFincaMercado, reactivarFincaMercado,
  type InteligenciaNegocio, type InteligenciaComercio, type InteligenciaSalud, type DetalleComercioInteligencia,
  type PanelMercadoSuperAdmin,
  type Semaforo,
} from "../api";
import CanalEndemico from "./CanalEndemico";

type Pestana = "NEGOCIO" | "COMERCIO" | "SALUD" | "MERCADO";

const PERIODOS = [
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
  { dias: 365, label: "12 meses" },
];

const RUBROS: Record<string, string> = {
  comercio: "Comercio", retail: "Retail", farmacia: "Farmacia", ferreteria: "Ferretería", repuestos: "Repuestos",
  salud: "Salud", odontologia: "Odontología", horeca: "Restaurante", ganaderia: "Ganadería", construccion: "Construcción",
  logistica: "Logística", minero: "Minería", moda: "Moda", "tamanaco-comercial": "Tamanaco",
};

const ESTADO_PAGO: Record<string, { texto: string; clase: string }> = {
  AL_DIA: { texto: "Al día", clase: "bg-emerald-50 text-emerald-700" },
  POR_VENCER: { texto: "Por vencer", clase: "bg-amber-50 text-amber-700" },
  VENCIDO: { texto: "Vencido", clase: "bg-rose-50 text-rose-700" },
  SIN_PAGOS: { texto: "Prueba / cortesía", clase: "bg-slate-100 text-slate-600" },
};

const SEMAFORO: Record<Semaforo, { texto: string; punto: string; fondo: string }> = {
  VERDE: { texto: "Sano", punto: "bg-emerald-500", fondo: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  AMARILLO: { texto: "En observación", punto: "bg-amber-400", fondo: "bg-amber-50 text-amber-700 border-amber-200" },
  ROJO: { texto: "En riesgo", punto: "bg-rose-500", fondo: "bg-rose-50 text-rose-700 border-rose-200" },
};

const numero = new Intl.NumberFormat("es-VE");
const dinero = new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function rubro(modulo: string | null) {
  return modulo ? RUBROS[modulo] ?? modulo : "Sin rubro";
}

function haceCuanto(iso: string | null): string {
  if (!iso) return "Nunca";
  const d = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  return d === 0 ? "Hoy" : d === 1 ? "Ayer" : `Hace ${d} días`;
}

/** Nombres de diagnósticos: el mismo catálogo CIE-10 del buscador, cargado solo al abrir Salud. */
function useCatalogoCie10(activo: boolean) {
  const [nombres, setNombres] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!activo || nombres.size > 0) return;
    import("../data/cie10.json").then((mod) => {
      const lista = ((mod as { default?: unknown }).default ?? mod) as { codigo: string; descripcion: string }[];
      setNombres(new Map(lista.map((d) => [d.codigo, d.descripcion])));
    }).catch(() => {});
  }, [activo, nombres.size]);
  return nombres;
}

export default function SuperAdminInteligencia() {
  const [pestana, setPestana] = useState<Pestana>("NEGOCIO");
  const [dias, setDias] = useState(30);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
          {([
            ["NEGOCIO", "Negocio: MRR, churn y clientes"],
            ["COMERCIO", "Comercios"],
            ["SALUD", "Salud y canal endémico"],
            ["MERCADO", "Mercado ganadero"],
          ] as [Pestana, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setPestana(id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${pestana === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {pestana !== "NEGOCIO" && (
          <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
            {PERIODOS.map((p) => (
              <button
                key={p.dias}
                onClick={() => setDias(p.dias)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${dias === p.dias ? "bg-emerald-500 text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {pestana === "NEGOCIO" && <VistaNegocio />}
      {pestana === "COMERCIO" && <VistaComercio dias={dias} />}
      {pestana === "SALUD" && <VistaSalud dias={dias} />}
      {pestana === "MERCADO" && <VistaMercado dias={dias} />}
    </div>
  );
}

// ─────────────────────────── piezas comunes ───────────────────────────

function Kpi({ titulo, valor, nota, color = "text-slate-900" }: { titulo: string; valor: string; nota?: string; color?: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{titulo}</div>
      <div className={`text-3xl font-bold mt-2 ${color}`}>{valor}</div>
      {nota && <div className="text-xs text-slate-500 mt-1">{nota}</div>}
    </div>
  );
}

function Tarjeta({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h3 className="font-bold text-slate-900">{titulo}</h3>
        {nota && <span className="text-xs text-slate-500">{nota}</span>}
      </div>
      {children}
    </div>
  );
}

function useCarga<T>(cargar: () => Promise<T>, deps: unknown[]) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    cargar()
      .then((d) => { if (vigente) setDatos(d); })
      .catch((e: Error) => { if (vigente) { setDatos(null); setError(e.message || "No se pudieron cargar los datos"); } })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { datos, error, cargando };
}

function Estado({ cargando, error }: { cargando: boolean; error: string | null }) {
  if (error) return <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>;
  if (cargando) return <div className="p-8 text-center text-sm text-slate-400">Cargando datos...</div>;
  return null;
}

/** Lista con barra proporcional: se lee de un vistazo quién domina. */
function Ranking({ filas }: { filas: { clave: string; titulo: string; subtitulo?: string; valor: number; etiqueta: string; alTocar?: () => void }[] }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  if (filas.length === 0) return <p className="text-sm text-slate-400">Sin datos en el período.</p>;
  return (
    <div className="space-y-2.5">
      {filas.map((f, i) => (
        <div
          key={f.clave}
          onClick={f.alTocar}
          className={`rounded-xl ${f.alTocar ? "cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-1" : ""}`}
        >
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="text-slate-400 font-mono text-xs mr-2">{i + 1}</span>
              <span className="font-bold text-slate-800">{f.titulo}</span>
              {f.subtitulo && <span className="text-xs text-slate-500 ml-2">{f.subtitulo}</span>}
            </span>
            <span className="font-mono text-xs text-slate-700 whitespace-nowrap">{f.etiqueta}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(f.valor / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────── NEGOCIO ───────────────────────────

export function VistaNegocio() {
  const { datos, error, cargando } = useCarga<InteligenciaNegocio>(() => obtenerInteligenciaNegocio(), []);
  const [filtro, setFiltro] = useState<Semaforo | "TODOS">("TODOS");
  if (!datos) return <Estado cargando={cargando} error={error} />;

  const { resumen, serie, semaforo, clientes } = datos;
  const ultimoConChurn = [...serie].reverse().find((p) => p.churnPct !== null);
  const visibles = clientes.filter((c) => filtro === "TODOS" || c.semaforo === filtro);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi titulo="MRR" valor={dinero.format(resumen.mrr)} nota="Ingreso recurrente de este mes" color="text-emerald-600" />
        <Kpi titulo="ARR" valor={dinero.format(resumen.arr)} nota="MRR x 12, ritmo anual" />
        <Kpi titulo="Clientes pagando" valor={numero.format(resumen.clientesPagando)} nota="Con suscripción cubriendo este mes" />
        <Kpi titulo="Ingreso por cliente" valor={dinero.format(resumen.arpu)} nota="Promedio mensual (ARPU)" />
        <Kpi
          titulo="Churn"
          valor={ultimoConChurn?.churnPct != null ? `${ultimoConChurn.churnPct}%` : "-"}
          nota={ultimoConChurn ? `Clientes perdidos en ${ultimoConChurn.mes}` : "Aún sin meses para comparar"}
          color={ultimoConChurn && (ultimoConChurn.churnPct ?? 0) > 5 ? "text-rose-600" : "text-slate-900"}
        />
      </div>
      {resumen.pagosOtraMoneda > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          {resumen.pagosOtraMoneda} pago(s) en moneda distinta de USD no entran en el MRR.
        </p>
      )}

      <Tarjeta titulo="MRR y clientes pagando, últimos 12 meses" nota="Cada pago se reparte entre los meses que cubre">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serie} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis yAxisId="mrr" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v: number) => `$${v}`} />
              <YAxis yAxisId="clientes" orientation="right" allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
              <Tooltip formatter={(v, nombre) => (nombre === "MRR" ? dinero.format(Number(v)) : numero.format(Number(v)))} />
              <Bar yAxisId="mrr" dataKey="mrr" name="MRR" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Line yAxisId="clientes" dataKey="clientesPagando" name="Clientes pagando" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2 pr-4">Mes</th><th className="py-2 pr-4 text-right">MRR</th><th className="py-2 pr-4 text-right">Pagando</th>
                <th className="py-2 pr-4 text-right">Nuevos</th><th className="py-2 pr-4 text-right">Perdidos</th><th className="py-2 text-right">Churn</th>
              </tr>
            </thead>
            <tbody>
              {[...serie].reverse().slice(0, 6).map((p) => (
                <tr key={p.mes} className="border-b border-slate-50">
                  <td className="py-1.5 pr-4 font-mono">{p.mes}</td>
                  <td className="py-1.5 pr-4 text-right font-mono">{dinero.format(p.mrr)}</td>
                  <td className="py-1.5 pr-4 text-right font-mono">{p.clientesPagando}</td>
                  <td className="py-1.5 pr-4 text-right font-mono text-emerald-700">{p.nuevos > 0 ? `+${p.nuevos}` : "0"}</td>
                  <td className="py-1.5 pr-4 text-right font-mono text-rose-700">{p.perdidos > 0 ? `-${p.perdidos}` : "0"}</td>
                  <td className="py-1.5 text-right font-mono">{p.churnPct != null ? `${p.churnPct}%` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Salud de los clientes" nota="Uso de las últimas 2 semanas, pagos y tickets abiertos">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFiltro("TODOS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${filtro === "TODOS" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}
          >
            Todos ({clientes.length})
          </button>
          {(["ROJO", "AMARILLO", "VERDE"] as Semaforo[]).map((s) => (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer flex items-center gap-2 ${filtro === s ? SEMAFORO[s].fondo : "bg-white text-slate-600 border-slate-200"}`}
            >
              <span className={`w-2 h-2 rounded-full ${SEMAFORO[s].punto}`} />
              {SEMAFORO[s].texto} ({semaforo[s] ?? 0})
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">
                <th className="py-3 pr-4">Negocio</th>
                <th className="py-3 pr-4">Estado</th>
                <th className="py-3 pr-4">Por qué</th>
                <th className="py-3 pr-4">Último uso</th>
                <th className="py-3 pr-4">Pago</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => (
                <tr key={c.tenantId} className="border-b border-slate-50 align-top">
                  <td className="py-3 pr-4">
                    <div className="font-bold text-slate-900">{c.nombreEmpresa ?? `Negocio #${c.tenantId}`}</div>
                    <div className="text-[11px] text-slate-500 font-mono">#{c.tenantId} · {rubro(c.moduloPrincipal)} · {c.plan}</div>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-bold border ${SEMAFORO[c.semaforo].fondo}`}>
                      <span className={`w-2 h-2 rounded-full ${SEMAFORO[c.semaforo].punto}`} />
                      {SEMAFORO[c.semaforo].texto} · {c.puntaje}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs text-slate-600">
                    {c.motivos.length === 0 ? <span className="text-slate-400">Todo en orden</span> : c.motivos.join(" · ")}
                  </td>
                  <td className="py-3 pr-4 text-xs whitespace-nowrap">
                    {haceCuanto(c.ultimaActividad)}
                    <div className="text-[10px] text-slate-400">{c.usoUltimos14} registros en 14 días</div>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${ESTADO_PAGO[c.estadoPago].clase}`}>{ESTADO_PAGO[c.estadoPago].texto}</span>
                    {c.diasParaVencer != null && c.estadoPago !== "VENCIDO" && (
                      <div className="text-[10px] text-slate-400 mt-1">vence en {c.diasParaVencer} días</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </div>
  );
}

// ─────────────────────────── COMERCIO ───────────────────────────

export function VistaComercio({ dias }: { dias: number }) {
  const { datos, error, cargando } = useCarga<InteligenciaComercio>(() => obtenerInteligenciaComercio(dias), [dias]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRubro, setFiltroRubro] = useState("TODOS");
  const [abierto, setAbierto] = useState<number | null>(null);

  const comercios = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (datos?.comercios ?? []).filter((c) =>
      (filtroRubro === "TODOS" || c.moduloPrincipal === filtroRubro)
      && (!texto || (c.nombreEmpresa ?? "").toLowerCase().includes(texto) || String(c.tenantId).includes(texto)));
  }, [datos, busqueda, filtroRubro]);

  if (!datos) return <Estado cargando={cargando} error={error} />;
  const { resumen } = datos;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi titulo="Comercios" valor={numero.format(resumen.comercios)} nota={`${resumen.comerciosConVentas} vendieron en el período`} />
        <Kpi titulo="Ventas" valor={numero.format(resumen.ventasPeriodo)} nota="Tickets cobrados en el POS" />
        <Kpi titulo="Monto vendido" valor={dinero.format(resumen.montoPeriodo)} color="text-emerald-600" />
        <Kpi titulo="Utilidad" valor={dinero.format(resumen.utilidadPeriodo)} nota="Según el costo cargado" />
        <Kpi titulo="Ticket promedio" valor={dinero.format(resumen.ticketPromedio)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tarjeta titulo="Ventas por día" nota="Toda la red de comercios">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={datos.tendencia} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(f: string) => f.substring(5)} minTickGap={24} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip labelFormatter={(f) => `Fecha: ${f}`} formatter={(v, n) => (n === "Monto" ? dinero.format(Number(v)) : numero.format(Number(v)))} />
                  <Area type="monotone" dataKey="monto" name="Monto" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Tarjeta>
        </div>
        <Tarjeta titulo="A qué se dedican">
          <Ranking filas={datos.porRubro.map((r) => ({
            clave: r.rubro,
            titulo: rubro(r.rubro),
            subtitulo: `${r.comercios} comercio(s) · ${r.ventas} ventas`,
            valor: Number(r.monto),
            etiqueta: dinero.format(r.monto),
            alTocar: () => setFiltroRubro(filtroRubro === r.rubro ? "TODOS" : r.rubro),
          }))} />
        </Tarjeta>
      </div>

      <Tarjeta titulo="Productos más vendidos de la red" nota="Por monto vendido">
        <Ranking filas={datos.topProductos.map((p) => ({
          clave: p.nombre,
          titulo: p.nombre,
          subtitulo: `${numero.format(p.cantidad)} unidades · en ${p.comercios} comercio(s)`,
          valor: Number(p.monto),
          etiqueta: dinero.format(p.monto),
        }))} />
      </Tarjeta>

      <div className="bg-white rounded-3xl border border-slate-200">
        <div className="p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">
            Todos los comercios <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs">{comercios.length}</span>
            {filtroRubro !== "TODOS" && (
              <button onClick={() => setFiltroRubro("TODOS")} className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs cursor-pointer">
                {rubro(filtroRubro)} (quitar filtro)
              </button>
            )}
          </h3>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o ID..."
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm w-full sm:w-64"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold text-slate-500 uppercase">
                <th className="px-5 py-3">Comercio</th>
                <th className="px-3 py-3">Qué vende</th>
                <th className="px-3 py-3 text-right">Ventas</th>
                <th className="px-3 py-3 text-right">Monto</th>
                <th className="px-3 py-3 text-right">Ticket prom.</th>
                <th className="px-3 py-3">Más vendido</th>
                <th className="px-5 py-3">Última venta</th>
              </tr>
            </thead>
            <tbody>
              {comercios.map((c) => (
                <FilaComercio key={c.tenantId} c={c} dias={dias} abierto={abierto === c.tenantId} alTocar={() => setAbierto(abierto === c.tenantId ? null : c.tenantId)} />
              ))}
              {comercios.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">No hay comercios que coincidan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilaComercio({ c, dias, abierto, alTocar }: { c: InteligenciaComercio["comercios"][number]; dias: number; abierto: boolean; alTocar: () => void }) {
  const [detalle, setDetalle] = useState<DetalleComercioInteligencia | null>(null);
  useEffect(() => {
    if (!abierto) return;
    setDetalle(null);
    obtenerDetalleComercioInteligencia(c.tenantId, dias).then(setDetalle).catch(() => setDetalle({ topProductos: [], tendencia: [], metodosPago: [] }));
  }, [abierto, c.tenantId, dias]);

  return (
    <>
      <tr onClick={alTocar} className={`border-t border-slate-100 cursor-pointer hover:bg-slate-50 ${abierto ? "bg-emerald-50/40" : ""}`}>
        <td className="px-5 py-3">
          <div className="font-bold text-slate-900">{c.nombreEmpresa ?? `Comercio #${c.tenantId}`}</div>
          <div className="text-[11px] text-slate-500 font-mono">#{c.tenantId} · {rubro(c.moduloPrincipal)} · {c.productos} productos{c.activa === false && " · suspendido"}</div>
        </td>
        <td className="px-3 py-3 text-xs text-slate-600">{c.categorias.length > 0 ? c.categorias.join(", ") : <span className="text-slate-300">Sin categorías</span>}</td>
        <td className="px-3 py-3 text-right font-mono">{numero.format(c.ventasPeriodo)}</td>
        <td className="px-3 py-3 text-right font-mono text-emerald-700">{dinero.format(c.montoPeriodo)}</td>
        <td className="px-3 py-3 text-right font-mono">{dinero.format(c.ticketPromedio)}</td>
        <td className="px-3 py-3 text-xs text-slate-700 max-w-[180px] truncate">{c.topProducto ?? <span className="text-slate-300">-</span>}</td>
        <td className="px-5 py-3 text-xs whitespace-nowrap">{haceCuanto(c.ultimaVenta)}</td>
      </tr>
      {abierto && (
        <tr className="bg-slate-50/60">
          <td colSpan={7} className="px-5 py-5">
            {!detalle ? (
              <p className="text-xs text-slate-400">Cargando detalle...</p>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <div className="text-xs font-bold text-slate-600 mb-3">Sus productos más vendidos</div>
                  <Ranking filas={detalle.topProductos.map((p) => ({
                    clave: p.nombre, titulo: p.nombre, subtitulo: `${numero.format(p.cantidad)} unidades`,
                    valor: Number(p.monto), etiqueta: dinero.format(p.monto),
                  }))} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-600 mb-3">Cómo le pagan</div>
                  <Ranking filas={detalle.metodosPago.map((m) => ({
                    clave: m.metodo, titulo: m.metodo, subtitulo: `${m.ventas} ventas`,
                    valor: Number(m.monto), etiqueta: dinero.format(m.monto),
                  }))} />
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─────────────────────────── SALUD ───────────────────────────

/**
 * `onAbrirCanal`: si se pasa, tocar un diagnóstico o una clínica lo delega (p. ej. a la
 * pestaña "Reporte por enfermedad" de la página de Mediclinic) y esta vista no dibuja su
 * propio canal, para que el Canal Endémico viva en un solo lugar.
 */
export function VistaSalud({ dias, onAbrirCanal }: { dias: number; onAbrirCanal?: (cie10?: string, tenantId?: number) => void }) {
  const { datos, error, cargando } = useCarga<InteligenciaSalud>(() => obtenerInteligenciaSalud(dias), [dias]);
  const nombresCie10 = useCatalogoCie10(true);
  const [busqueda, setBusqueda] = useState("");
  const [clinica, setClinica] = useState<{ id: number; nombre: string } | null>(null);
  const [cie10Canal, setCie10Canal] = useState<string | undefined>(undefined);
  // El diagnóstico que se está mirando ahora; no va en la key para no reiniciar el canal en cada cambio.
  const cie10Actual = useRef<string | undefined>(undefined);
  const canalRef = useRef<HTMLDivElement>(null);

  const nombresClinica = useMemo(() => {
    const m: Record<number, string> = {};
    (datos?.clinicas ?? []).forEach((c) => { m[c.tenantId] = c.nombreEmpresa ?? `Clínica #${c.tenantId}`; });
    return m;
  }, [datos]);

  const clinicas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (datos?.clinicas ?? []).filter((c) =>
      !texto || (c.nombreEmpresa ?? "").toLowerCase().includes(texto) || (c.doctor ?? "").toLowerCase().includes(texto)
      || (c.especialidad ?? "").toLowerCase().includes(texto) || String(c.tenantId).includes(texto));
  }, [datos, busqueda]);

  const verCanal = (nuevaClinica: { id: number; nombre: string } | null, cie10?: string) => {
    if (onAbrirCanal) {
      onAbrirCanal(cie10, nuevaClinica?.id);
      return;
    }
    setClinica(nuevaClinica);
    setCie10Canal(cie10);
    setTimeout(() => canalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const nombreDiagnostico = (codigo: string) => nombresCie10.get(codigo) ?? "";

  if (!datos) return <Estado cargando={cargando} error={error} />;
  const { resumen } = datos;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi titulo="Clínicas y médicos" valor={numero.format(resumen.clinicas)} nota={`${resumen.clinicasConActividad} atendieron en el período`} />
        <Kpi titulo="Consultas" valor={numero.format(resumen.consultasPeriodo)} nota="En el período" color="text-emerald-600" />
        <Kpi titulo="Pacientes" valor={numero.format(resumen.pacientes)} nota="Registrados en toda la red" />
        <Kpi titulo="Diagnóstico más visto" valor={datos.topDiagnosticos[0]?.cie10 ?? "-"} nota={datos.topDiagnosticos[0] ? nombreDiagnostico(datos.topDiagnosticos[0].cie10) : "Sin consultas en el período"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Tarjeta titulo="Diagnósticos más frecuentes de la red" nota="Toca uno para ver su canal endémico">
          <Ranking filas={datos.topDiagnosticos.map((d) => ({
            clave: d.cie10,
            titulo: d.cie10,
            subtitulo: `${nombreDiagnostico(d.cie10)} · ${d.clinicas} clínica(s)`,
            valor: d.casos,
            etiqueta: `${numero.format(d.casos)} casos`,
            alTocar: () => verCanal(null, d.cie10),
          }))} />
        </Tarjeta>
        <Tarjeta titulo="Consultas por día" nota="Toda la red">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={datos.tendencia} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(f: string) => f.substring(5)} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip labelFormatter={(f) => `Fecha: ${f}`} formatter={(v) => [numero.format(Number(v)), "Consultas"]} />
                <Area type="monotone" dataKey="consultas" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Tarjeta>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200">
        <div className="p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">
            Clínicas y médicos <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs">{clinicas.length}</span>
            <span className="ml-2 text-xs font-normal text-slate-500">Toca una para ver su canal endémico</span>
          </h3>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar clínica, médico o especialidad..."
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm w-full sm:w-72"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold text-slate-500 uppercase">
                <th className="px-5 py-3">Clínica / médico</th>
                <th className="px-3 py-3 text-right">Consultas</th>
                <th className="px-3 py-3 text-right">Pacientes</th>
                <th className="px-3 py-3">Lo que más atiende</th>
                <th className="px-5 py-3">Última consulta</th>
              </tr>
            </thead>
            <tbody>
              {clinicas.map((c) => {
                const nombre = c.nombreEmpresa ?? `Clínica #${c.tenantId}`;
                const elegida = clinica?.id === c.tenantId;
                return (
                  <tr
                    key={c.tenantId}
                    onClick={() => verCanal({ id: c.tenantId, nombre }, cie10Actual.current)}
                    className={`border-t border-slate-100 cursor-pointer hover:bg-slate-50 ${elegida ? "bg-sky-50/60" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-900">{nombre}</div>
                      <div className="text-[11px] text-slate-500">
                        {[c.doctor, c.especialidad, rubro(c.moduloPrincipal), c.medicos > 1 ? `${c.medicos} médicos` : null].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono">
                      {numero.format(c.consultasPeriodo)}
                      <div className="text-[10px] text-slate-400">{numero.format(c.consultasTotal)} hist.</div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{numero.format(c.pacientes)}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      {c.topDiagnosticos.length === 0 ? <span className="text-slate-300">-</span> : c.topDiagnosticos.map((d) => (
                        <div key={d.cie10} className="truncate max-w-[260px]" title={nombreDiagnostico(d.cie10)}>
                          <span className="font-bold text-slate-800">{d.cie10}</span> {nombreDiagnostico(d.cie10)} <span className="text-slate-400">({d.casos})</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap">{haceCuanto(c.ultimaConsulta)}</td>
                  </tr>
                );
              })}
              {clinicas.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No hay clínicas que coincidan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!onAbrirCanal && <div ref={canalRef} className="scroll-mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => verCanal(null, cie10Actual.current)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${!clinica ? "bg-sky-500 text-white border-sky-500" : "bg-white text-slate-600 border-slate-200"}`}
          >
            Toda la red
          </button>
          {clinica && (
            <span className="px-4 py-1.5 rounded-xl text-xs font-bold bg-sky-500 text-white">{clinica.nombre}</span>
          )}
          <span className="text-xs text-slate-500">Busca la enfermedad por nombre: gripe, dengue, fiebre...</span>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6">
          <CanalEndemico
            key={`${clinica?.id ?? "red"}-${cie10Canal ?? ""}`}
            modo="red"
            tenantId={clinica?.id}
            clinicaNombre={clinica?.nombre}
            cie10Inicial={cie10Canal}
            nombresClinica={nombresClinica}
            onElegirClinica={(id, cie10) => verCanal({ id, nombre: nombresClinica[id] ?? `Clínica #${id}` }, cie10)}
            onCambioDiagnostico={(cie10) => { cie10Actual.current = cie10; }}
          />
        </div>
      </div>}
    </div>
  );
}

// ─────────────────────────── MERCADO GANADERO ───────────────────────────

const TIPO_SOSPECHA: Record<string, string> = {
  RETIRADA_TRAS_NEGOCIAR: "Retiró tras negociar",
  ANIMAL_SALIO_DEL_HATO: "Animal salió del hato",
  ARETE_EN_HATO_DEL_INTERESADO: "Arete en hato del interesado",
};

export function VistaMercado({ dias }: { dias: number }) {
  const [version, setVersion] = useState(0);
  const { datos, error, cargando } = useCarga<PanelMercadoSuperAdmin>(() => obtenerMercadoGanaderoSuperAdmin(dias), [dias, version]);
  if (!datos) return <Estado cargando={cargando} error={error} />;
  const { resumen, alertas, sospechas, suspendidas } = datos;
  const suspendidasIds = new Set(suspendidas.map((s) => s.tenantId));

  const suspender = async (tenantId: number, nombre: string | null) => {
    const motivo = prompt(`Motivo para suspender a ${nombre ?? "esta finca"} del Mercado Ganadero (lo verá la finca):`);
    if (!motivo || !motivo.trim()) return;
    try { await suspenderFincaMercado(tenantId, motivo.trim()); setVersion((v) => v + 1); }
    catch (e) { avisar(e instanceof Error ? e.message : "No se pudo suspender"); }
  };
  const reactivar = async (tenantId: number, nombre: string | null) => {
    if (!confirm(`¿Devolverle el acceso al mercado a ${nombre ?? "esta finca"}?`)) return;
    try { await reactivarFincaMercado(tenantId); setVersion((v) => v + 1); }
    catch (e) { avisar(e instanceof Error ? e.message : "No se pudo reactivar"); }
  };
  const BotonSuspender = ({ tenantId, nombre, etiqueta }: { tenantId: number | null; nombre: string | null; etiqueta: string }) => {
    if (tenantId == null) return null;
    if (suspendidasIds.has(tenantId)) return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold whitespace-nowrap">{nombre} suspendida</span>;
    return (
      <button onClick={() => suspender(tenantId, nombre)} className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 text-[11px] font-bold hover:bg-rose-50 cursor-pointer whitespace-nowrap">
        {etiqueta}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi titulo="En venta ahora" valor={numero.format(resumen.publicacionesActivas)} />
        <Kpi titulo="Tratos cerrados" valor={numero.format(resumen.tratosPeriodo)} nota={`Volumen ${dinero.format(Number(resumen.volumenPeriodo))}`} color="text-emerald-600" />
        <Kpi titulo="Comisiones generadas" valor={dinero.format(Number(resumen.comisionesGeneradas))} nota={`Por cobrar: ${dinero.format(Number(resumen.comisionesPendientes))} · cobradas: ${dinero.format(Number(resumen.comisionesCobradas))}`} />
        <Kpi titulo="Intentos de contacto" valor={numero.format(resumen.intentosContactoPeriodo)} nota="Datos ocultados en chat o publicaciones" color={resumen.intentosContactoPeriodo > 0 ? "text-rose-600" : "text-slate-900"} />
      </div>

      <Tarjeta titulo="Posibles tratos por fuera" nota="Casos para revisar y cobrar según las condiciones del mercado">
        {sospechas.length === 0 ? (
          <p className="text-sm text-slate-400">No hay casos sospechosos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">
                  <th className="py-2 pr-4">Señal</th><th className="py-2 pr-4">Publicación</th><th className="py-2 pr-4">Vendedor</th><th className="py-2 pr-4">Detalle</th><th className="py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {sospechas.map((s, i) => (
                  <tr key={i} className="border-b border-slate-50 align-top">
                    <td className="py-2.5 pr-4"><span className="px-2 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold whitespace-nowrap">{TIPO_SOSPECHA[s.tipo] ?? s.tipo}</span></td>
                    <td className="py-2.5 pr-4 font-bold text-slate-900">{s.titulo}</td>
                    <td className="py-2.5 pr-4 text-slate-700">{s.vendedor}</td>
                    <td className="py-2.5 pr-4 text-xs text-slate-600">{s.detalle}</td>
                    <td className="py-2.5">
                      <div className="flex flex-col gap-1 items-start">
                        <BotonSuspender tenantId={s.vendedorTenantId} nombre={s.vendedor} etiqueta="Suspender vendedor" />
                        <BotonSuspender tenantId={s.compradorTenantId} nombre={s.comprador} etiqueta="Suspender comprador" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {suspendidas.length > 0 && (
        <Tarjeta titulo="Fincas suspendidas del mercado" nota="No pueden entrar y sus publicaciones no se ven; el resto de Aurora les funciona normal">
          <div className="space-y-2">
            {suspendidas.map((s) => (
              <div key={s.tenantId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3">
                <div>
                  <div className="font-bold text-slate-900">{s.finca ?? `Finca #${s.tenantId}`}</div>
                  <div className="text-xs text-slate-600">{s.motivo}</div>
                  <div className="text-[11px] text-slate-400">{new Date(s.fecha).toLocaleString("es-VE")}{s.suspendidoPor ? ` · por ${s.suspendidoPor}` : ""}</div>
                </div>
                <button onClick={() => reactivar(s.tenantId, s.finca)} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold cursor-pointer">Reactivar</button>
              </div>
            ))}
          </div>
        </Tarjeta>
      )}

      <Tarjeta titulo="Datos de contacto ocultados" nota="Lo que escribieron antes de que el filtro lo tapara">
        {alertas.length === 0 ? (
          <p className="text-sm text-slate-400">Nadie ha intentado pasar datos de contacto en este período.</p>
        ) : (
          <div className="space-y-2">
            {alertas.map((a) => (
              <div key={a.id} className="rounded-2xl border border-slate-100 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-900">
                    {a.finca ?? "Finca"}{a.otraFinca ? ` a ${a.otraFinca}` : ""}
                    <span className="ml-2 font-normal text-slate-500">{a.tipo === "CONTACTO_EN_PUBLICACION" ? "en su publicación" : "en el chat"}{a.titulo ? ` · ${a.titulo}` : ""}</span>
                  </span>
                  <span className="text-slate-400">{new Date(a.fecha).toLocaleString("es-VE")}</span>
                </div>
                <p className="text-sm text-slate-700 mt-1 font-mono break-words">{a.contenido}</p>
                <div className="mt-2"><BotonSuspender tenantId={a.fincaTenantId} nombre={a.finca} etiqueta={`Suspender a ${a.finca ?? "la finca"} del mercado`} /></div>
              </div>
            ))}
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
