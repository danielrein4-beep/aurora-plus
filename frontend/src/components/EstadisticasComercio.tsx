import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid, PieChart, Pie, Legend } from "recharts";
import { obtenerEstadisticasComercio, ApiError, type MovimientoCaja, type LineaEstadisticaComercio } from "../api";

// Estadísticas de Comercio, al estilo de las de Restaurante: ventas del período, horas pico,
// días fuertes, productos más vendidos, métodos de pago y lo que no se mueve. Todo sale de las
// ventas reales del Kárdex (cada venta descuenta inventario ahí, también las de antes del historial
// del POS y los pedidos web). El método de pago se toma del historial del POS cuando existe.

export interface VentaParaEstadistica {
  numero: string;
  fecha: string;
  /** Fecha y hora real del servidor (AAAA-MM-DDTHH:mm:ss); si no está, se intenta leer `fecha`. */
  fechaISO?: string;
  total: number;
  utilidad?: number;
  metodoPago: string;
  esCredito: boolean;
  lineas: { productoId: string; nombre: string; cantidad: number; precio: number; costo?: number }[];
}

export interface ProductoParaEstadistica {
  id: string;
  nombre: string;
  categoria?: string;
  stock: number;
}

type Rango = "HOY" | "SEMANA" | "MES" | "ANIO";

const RANGOS: { id: Rango; etiqueta: string }[] = [
  { id: "HOY", etiqueta: "Hoy" },
  { id: "SEMANA", etiqueta: "Últimos 7 días" },
  { id: "MES", etiqueta: "Últimos 30 días" },
  { id: "ANIO", etiqueta: "Este año" },
];

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const COLORES = ["#0f766e", "#14b8a6", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"];

const ETIQUETA_METODO: Record<string, string> = {
  EFECTIVO_USD: "Efectivo divisas",
  EFECTIVO_BS: "Efectivo Bs",
  PAGO_MOVIL: "Pago Móvil",
  PUNTO_VENTA: "Punto de venta",
  ZELLE: "Zelle / USDT",
  COP_EFECTIVO: "Pesos COP",
  CREDITO_CUENTA: "Crédito",
  MIXTO: "Pago mixto",
};

/** Lee la fecha de una venta: primero la del servidor; si no, el texto local "dd/mm/aaaa, hh:mm:ss a. m.". */
function fechaDeVenta(v: VentaParaEstadistica): Date | null {
  if (v.fechaISO) {
    const d = new Date(v.fechaISO);
    if (!isNaN(d.getTime())) return d;
  }
  const m = v.fecha?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap])?/i);
  if (!m) return null;
  let h = Number(m[4]);
  const pm = m[7]?.toLowerCase() === "p";
  const am = m[7]?.toLowerCase() === "a";
  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), h, Number(m[5]), Number(m[6] || 0));
}

function inicioDelRango(r: Rango): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (r === "SEMANA") d.setDate(d.getDate() - 6);
  if (r === "MES") d.setDate(d.getDate() - 29);
  if (r === "ANIO") { d.setMonth(0, 1); }
  return d;
}

export default function EstadisticasComercio({ ventas, productos, gastos, simbolo, tasaBs, tasaCop }: {
  ventas: VentaParaEstadistica[];
  productos: ProductoParaEstadistica[];
  gastos: MovimientoCaja[];
  simbolo: string;
  tasaBs: number;
  tasaCop: number;
}) {
  const [rango, setRango] = useState<Rango>("SEMANA");
  const [lineas, setLineas] = useState<LineaEstadisticaComercio[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setLineas(null);
    setError(null);
    obtenerEstadisticasComercio(iso(inicioDelRango(rango)), iso(new Date()))
      .then(setLineas)
      .catch((e) => setError(e instanceof ApiError && e.status === 403
        ? "Las estadísticas las ve solo el Dueño o Administrador del negocio."
        : e instanceof Error ? `No se pudieron cargar las estadísticas: ${e.message}` : "No se pudieron cargar las estadísticas."));
  }, [rango]);

  // Ventas reales del Kárdex agrupadas por ticket; método de pago y crédito, del historial del POS.
  const ventasReales = useMemo<VentaParaEstadistica[]>(() => {
    if (!lineas) return [];
    const delPos = new Map(ventas.map((v) => [v.numero, v]));
    const porTicket = new Map<string, VentaParaEstadistica>();
    for (const l of lineas) {
      const signo = l.devolucion ? -1 : 1;
      const total = (Number(l.total) || 0) * signo;
      const cantidad = (Number(l.cantidad) || 0) * signo;
      let v = porTicket.get(l.ticket);
      if (!v) {
        const pos = delPos.get(l.ticket);
        v = { numero: l.ticket, fecha: "", fechaISO: l.fecha, total: 0, utilidad: 0, metodoPago: pos?.metodoPago || "SIN_DATO", esCredito: pos?.esCredito || false, lineas: [] };
        porTicket.set(l.ticket, v);
      }
      v.total += total;
      if (l.costoUnitario != null && v.utilidad !== undefined) v.utilidad += total - Number(l.costoUnitario) * cantidad;
      else v.utilidad = undefined;
      const precio = cantidad !== 0 ? total / cantidad : 0;
      v.lineas.push({ productoId: `rep-${l.repuestoId}`, nombre: l.descripcion, cantidad, precio, costo: l.costoUnitario ?? undefined });
    }
    // Las devoluciones sueltas (sin su venta en el período) no cuentan como una venta más
    return [...porTicket.values()].filter((v) => v.lineas.some((x) => x.cantidad > 0));
  }, [lineas, ventas]);
  const m = (n: number) => `${simbolo}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const datos = useMemo(() => {
    const desde = inicioDelRango(rango);
    const delPeriodo = ventasReales
      .map((v) => ({ v, f: fechaDeVenta(v) }))
      .filter((x): x is { v: VentaParaEstadistica; f: Date } => !!x.f && x.f >= desde);

    const total = delPeriodo.reduce((s, x) => s + (Number(x.v.total) || 0), 0);
    const conUtilidad = delPeriodo.filter((x) => typeof x.v.utilidad === "number");
    const utilidad = conUtilidad.reduce((s, x) => s + (x.v.utilidad || 0), 0);
    const credito = delPeriodo.filter((x) => x.v.esCredito).reduce((s, x) => s + (Number(x.v.total) || 0), 0);

    // Gastos del período convertidos a la moneda base con la tasa del día
    const aBase = (g: MovimientoCaja) => {
      const monto = Number(g.monto) || 0;
      if (g.moneda === "VES") return tasaBs > 0 ? monto / tasaBs : 0;
      if (g.moneda === "COP") return tasaCop > 0 ? monto / tasaCop : 0;
      return monto;
    };
    const gastosPeriodo = gastos.filter((g) => new Date(g.fechaRegistro) >= desde).reduce((s, g) => s + aBase(g), 0);

    // Tendencia: por hora (hoy), por día (7 y 30 días) o por mes (año)
    let tendencia: { etiqueta: string; ventas: number }[] = [];
    if (rango === "HOY") {
      tendencia = Array.from({ length: 24 }, (_, h) => ({ etiqueta: `${h}h`, ventas: 0 }));
      delPeriodo.forEach((x) => { tendencia[x.f.getHours()].ventas += Number(x.v.total) || 0; });
      tendencia = tendencia.filter((t, h) => h >= 6 && h <= 22 || t.ventas > 0);
    } else if (rango === "ANIO") {
      tendencia = MESES.slice(0, new Date().getMonth() + 1).map((etiqueta) => ({ etiqueta, ventas: 0 }));
      delPeriodo.forEach((x) => { if (tendencia[x.f.getMonth()]) tendencia[x.f.getMonth()].ventas += Number(x.v.total) || 0; });
    } else {
      const dias = rango === "SEMANA" ? 7 : 30;
      tendencia = Array.from({ length: dias }, (_, i) => {
        const d = new Date(desde); d.setDate(d.getDate() + i);
        return { etiqueta: rango === "SEMANA" ? `${DIAS[d.getDay()]} ${d.getDate()}` : `${d.getDate()}/${d.getMonth() + 1}`, ventas: 0 };
      });
      delPeriodo.forEach((x) => {
        const i = Math.floor((new Date(x.f.getFullYear(), x.f.getMonth(), x.f.getDate()).getTime() - desde.getTime()) / 86400000);
        if (tendencia[i]) tendencia[i].ventas += Number(x.v.total) || 0;
      });
    }

    // Horas pico y días fuertes
    const porHora = Array.from({ length: 24 }, (_, h) => ({ etiqueta: `${h}:00`, hora: h, ventas: 0, cantidad: 0 }));
    const porDia = DIAS.map((etiqueta) => ({ etiqueta, ventas: 0, cantidad: 0 }));
    delPeriodo.forEach((x) => {
      const t = Number(x.v.total) || 0;
      porHora[x.f.getHours()].ventas += t; porHora[x.f.getHours()].cantidad += 1;
      porDia[x.f.getDay()].ventas += t; porDia[x.f.getDay()].cantidad += 1;
    });
    const horaPico = [...porHora].sort((a, b) => b.cantidad - a.cantidad || b.ventas - a.ventas)[0];
    const diaFuerte = [...porDia].sort((a, b) => b.ventas - a.ventas)[0];
    const horasVisibles = porHora.filter((h) => (h.hora >= 6 && h.hora <= 22) || h.cantidad > 0);

    // Productos: unidades, ingresos y utilidad
    const porProducto = new Map<string, { nombre: string; unidades: number; ingresos: number; utilidad: number | null }>();
    delPeriodo.forEach((x) => (x.v.lineas || []).forEach((l) => {
      const clave = l.productoId || l.nombre;
      const act = porProducto.get(clave) || { nombre: l.nombre, unidades: 0, ingresos: 0, utilidad: 0 as number | null };
      act.unidades += Number(l.cantidad) || 0;
      act.ingresos += (Number(l.precio) || 0) * (Number(l.cantidad) || 0);
      if (typeof l.costo === "number" && act.utilidad !== null) act.utilidad += ((Number(l.precio) || 0) - l.costo) * (Number(l.cantidad) || 0);
      else act.utilidad = null;
      porProducto.set(clave, act);
    }));
    const lista = [...porProducto.entries()].map(([id, p]) => ({ id, ...p }));
    const topUnidades = [...lista].sort((a, b) => b.unidades - a.unidades).slice(0, 10);
    const topIngresos = [...lista].sort((a, b) => b.ingresos - a.ingresos).slice(0, 10);

    // Métodos de pago
    const metodos = new Map<string, number>();
    delPeriodo.forEach((x) => {
      if (x.v.metodoPago === "SIN_DATO" && !x.v.esCredito) return;
      const clave = x.v.esCredito ? "CREDITO_CUENTA" : x.v.metodoPago || "OTRO";
      metodos.set(clave, (metodos.get(clave) || 0) + (Number(x.v.total) || 0));
    });
    const porMetodo = [...metodos.entries()].map(([clave, valor]) => ({ nombre: ETIQUETA_METODO[clave] || clave, valor: Math.round(valor * 100) / 100 }))
      .sort((a, b) => b.valor - a.valor);

    // Productos con stock que no se vendieron en el período
    const vendidos = new Set(lista.map((p) => p.id));
    const sinMovimiento = productos.filter((p) => p.stock > 0 && !vendidos.has(p.id)).sort((a, b) => b.stock - a.stock).slice(0, 8);

    return {
      cantidad: delPeriodo.length, total, utilidad, hayUtilidad: conUtilidad.length > 0, credito, gastosPeriodo,
      tendencia, horasVisibles, horaPico, porDia, diaFuerte, topUnidades, topIngresos, porMetodo, sinMovimiento,
    };
  }, [ventasReales, productos, gastos, rango, tasaBs, tasaCop]);

  if (error) {
    return <div className="flex-1 p-6"><div className="max-w-md mx-auto mt-10 p-6 rounded-2xl border border-slate-200 bg-white text-center text-sm text-slate-600">{error}</div></div>;
  }
  const ticketPromedio = datos.cantidad > 0 ? datos.total / datos.cantidad : 0;
  const tarjeta = "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5";
  const vacio = <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">Sin ventas en este período.</div>;
  const tooltipDinero = (v: unknown) => [m(Number(v)), "Ventas"] as [string, string];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">Estadísticas</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{lineas === null ? "Cargando…" : "Cómo se mueven tus ventas: cuándo vendes más, qué se vende y qué no."}</p>
        </div>
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
          {RANGOS.map((r) => (
            <button key={r.id} type="button" onClick={() => setRango(r.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${rango === r.id ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800"}`}>
              {r.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {/* Indicadores del período */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { t: "Ventas", v: m(datos.total), n: `${datos.cantidad} ${datos.cantidad === 1 ? "venta" : "ventas"}` },
          { t: "Ticket promedio", v: m(ticketPromedio), n: "Por venta" },
          { t: "Utilidad", v: datos.hayUtilidad ? m(datos.utilidad) : "—", n: datos.hayUtilidad ? (datos.total > 0 ? `${((datos.utilidad / datos.total) * 100).toFixed(1)}% sobre ventas` : "") : "Carga el costo de tus productos" },
          { t: "Gastos", v: m(datos.gastosPeriodo), n: "Registrados en Administración" },
          { t: "Vendido a crédito", v: m(datos.credito), n: datos.total > 0 ? `${((datos.credito / datos.total) * 100).toFixed(0)}% de las ventas` : "" },
        ].map((k) => (
          <div key={k.t} className={tarjeta}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{k.t}</div>
            <div className="mt-1 font-['Outfit'] font-black text-xl text-slate-900 dark:text-white truncate">{k.v}</div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{k.n}</div>
          </div>
        ))}
      </div>

      {/* Tendencia */}
      <div className={tarjeta}>
        <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm mb-4">
          Ventas {rango === "HOY" ? "por hora de hoy" : rango === "ANIO" ? "por mes" : "por día"}
        </h4>
        {datos.cantidad === 0 ? vacio : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={datos.tendencia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} width={50} />
              <Tooltip formatter={tooltipDinero} />
              <Bar dataKey="ventas" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Horas pico y días fuertes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className={tarjeta}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">Horas pico</h4>
            {datos.cantidad > 0 && datos.horaPico && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Más clientes a las {datos.horaPico.hora}:00 ({datos.horaPico.cantidad} {datos.horaPico.cantidad === 1 ? "venta" : "ventas"})
              </span>
            )}
          </div>
          {datos.cantidad === 0 ? vacio : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={datos.horasVisibles}>
                <XAxis dataKey="etiqueta" tick={{ fontSize: 9 }} interval={1} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
                <Tooltip formatter={(v) => [String(v), "Ventas"]} />
                <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                  {datos.horasVisibles.map((h) => (
                    <Cell key={h.hora} fill={datos.horaPico && h.hora === datos.horaPico.hora ? "#f59e0b" : "#14b8a6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={tarjeta}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm">Días de la semana</h4>
            {datos.cantidad > 0 && datos.diaFuerte && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">Tu día más fuerte: {datos.diaFuerte.etiqueta}</span>
            )}
          </div>
          {datos.cantidad === 0 ? vacio : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={datos.porDia}>
                <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={50} />
                <Tooltip formatter={tooltipDinero} />
                <Bar dataKey="ventas" radius={[6, 6, 0, 0]}>
                  {datos.porDia.map((d) => <Cell key={d.etiqueta} fill={datos.diaFuerte && d.etiqueta === datos.diaFuerte.etiqueta ? "#0f766e" : "#99f6e4"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Más vendidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {([
          ["Más vendidos por unidades", datos.topUnidades, "unidades", (v: unknown) => [String(v), "Unidades"] as [string, string]],
          ["Los que más dinero dejan", datos.topIngresos, "ingresos", (v: unknown) => [m(Number(v)), "Ventas"] as [string, string]],
        ] as const).map(([titulo, lista, clave, fmt]) => (
          <div key={titulo} className={tarjeta}>
            <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm mb-4">{titulo}</h4>
            {lista.length === 0 ? vacio : (
              <ResponsiveContainer width="100%" height={Math.max(180, lista.length * 32)}>
                <BarChart data={lista} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={fmt} />
                  <Bar dataKey={clave} fill={clave === "unidades" ? "#14b8a6" : "#0ea5e9"} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        ))}
      </div>

      {/* Métodos de pago y productos sin movimiento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className={tarjeta}>
          <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm mb-4">Cómo te pagan</h4>
          {datos.porMetodo.length === 0 ? <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 text-center px-6">Sin datos de cobro en este período (las ventas anteriores al historial del POS no guardaban el método de pago).</div> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={datos.porMetodo} dataKey="valor" nameKey="nombre" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {datos.porMetodo.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => m(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={tarjeta}>
          <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm mb-1">Sin ventas en este período</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">Productos con existencia que no se vendieron: candidatos a oferta o a no reponer.</p>
          {datos.sinMovimiento.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">Todo lo que tienes en existencia tuvo movimiento.</div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {datos.sinMovimiento.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between text-xs">
                  <span className="text-slate-800 dark:text-slate-200 truncate pr-3">{p.nombre}</span>
                  <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{p.stock} en existencia</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
