import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  obtenerDetalleVertical,
  obtenerOperacionRestaurantes,
  obtenerProduccionGanaderia,
  obtenerClinicaOdontologia,
  type DetalleVertical,
  type MetricaVertical,
  type NegocioVertical,
  type OperacionRestaurantes,
  type ProduccionGanaderia,
  type ClinicaOdontologia,
  type ConteoEtiqueta,
} from "../api";
import SuperAdminReporteEnfermedad from "./SuperAdminReporteEnfermedad";
import { VistaSalud, VistaComercio, VistaMercado } from "./SuperAdminInteligencia";
import { generarPdfInformeVertical } from "../utils/pdfInformeVertical";

/** Verticales con página propia en el menú. "otras" agrupa las de pocos negocios. */
export const VERTICALES_SUPERADMIN: { id: string; nombre: string; descripcion: string; color: string; icono: string }[] = [
  { id: "mediclinic", nombre: "Mediclinic", descripcion: "Clínicas y consultorios médicos", color: "#0ea5e9",
    icono: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
  { id: "odontologia", nombre: "Odontología", descripcion: "Consultorios dentales", color: "#14b8a6",
    icono: "M12 3c-2.5 0-3-1-5-1S3 3.5 3 7c0 3 1.5 5 2 8 .4 2.4 1 6 2.5 6s1.5-3 2.5-5.5c.5-1.3 1.5-1.3 2 0C13 18 13 21 14.5 21S16.6 17.4 17 15c.5-3 2-5 2-8 0-3.5-2-5-4-5s-2.5 1-3 1z" },
  { id: "restaurantes", nombre: "Restaurantes", descripcion: "Restaurantes, cafeterías y delivery", color: "#2E9AA0",
    icono: "M3 3v7a3 3 0 003 3v8m0-18v7m3-7v7a3 3 0 01-3 3m12-10c-1.7 0-3 2-3 5s1.3 4 3 4v9" },
  { id: "comercio", nombre: "Comercio", descripcion: "Tiendas, ferreterías, repuestos y farmacias", color: "#6366f1",
    icono: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" },
  { id: "ganaderia", nombre: "Ganadería", descripcion: "Fincas, ordeño, hato y mercado ganadero", color: "#16a34a",
    icono: "M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6" },
  { id: "estetica", nombre: "Estética", descripcion: "Estética y cosmiatría (oculta al público)", color: "#ec4899",
    icono: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.3 6.9L22 12l-6.7 2.1L13 21l-2.3-6.9L4 12l6.7-2.1L13 3z" },
  { id: "otras", nombre: "Otras verticales", descripcion: "Minería, moda y Tamanaco Enterprise", color: "#64748b",
    icono: "M4 6h16M4 12h16M4 18h16" },
];

const OTRAS = [
  { id: "mineria", nombre: "Minería" },
  { id: "moda", nombre: "Moda" },
  { id: "tamanaco", nombre: "Tamanaco Enterprise" },
];

const PERIODOS = [
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
  { dias: 365, label: "12 meses" },
];

const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const numero = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 });
const dinero = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Pestana = "RESUMEN" | "NEGOCIOS" | "CLINICAS" | "REPORTE" | "OPERACION" | "PRODUCCION" | "MERCADO" | "COMERCIOS" | "CLINICA_ODONTO";

const PESTANAS_PROPIAS: Record<string, [Pestana, string][]> = {
  mediclinic: [["CLINICAS", "Clínicas y diagnósticos"], ["REPORTE", "Reporte por enfermedad y canal endémico"]],
  odontologia: [["CLINICA_ODONTO", "Tratamientos y cartera"]],
  restaurantes: [["OPERACION", "Operación: horas pico, platos y canales"]],
  comercio: [["COMERCIOS", "Ventas y comercios"]],
  ganaderia: [["PRODUCCION", "Producción y hato"], ["MERCADO", "Mercado ganadero"]],
};

function etiquetaMes(yyyyMm: string) {
  const [a, m] = yyyyMm.split("-");
  return `${MESES_CORTOS[Number(m) - 1]} ${a.slice(2)}`;
}

function formatoSuma(valor: number | null | undefined, unidad: string | null) {
  if (valor == null) return "";
  if (unidad === "USD") return `$${dinero.format(valor)}`;
  return `${numero.format(valor)} ${unidad ?? ""}`.trim();
}

function haceCuanto(iso: string | null) {
  if (!iso) return "Nunca";
  const d = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  return d === 0 ? "Hoy" : d === 1 ? "Ayer" : `Hace ${d} días`;
}

interface Props {
  verticalId: string;
  /** Abre la ficha del negocio (cobro, módulos, usuarios, soporte, suspender...). */
  onAbrirFicha: (tenantId: number) => void;
}

export default function SuperAdminVertical({ verticalId, onAbrirFicha }: Props) {
  const [otraElegida, setOtraElegida] = useState("mineria");
  const idReal = verticalId === "otras" ? otraElegida : verticalId;
  const info = VERTICALES_SUPERADMIN.find((v) => v.id === verticalId) ?? VERTICALES_SUPERADMIN[0];

  const [dias, setDias] = useState(30);
  const [pestana, setPestana] = useState<Pestana>("RESUMEN");
  const [datos, setDatos] = useState<DetalleVertical | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [recarga, setRecarga] = useState(0);
  /** Diagnóstico/médico con los que se abre el reporte al venir desde "Clínicas". */
  const [destinoReporte, setDestinoReporte] = useState<{ cie10?: string; tenantId?: number; n: number }>({ n: 0 });
  const [exportando, setExportando] = useState(false);

  const exportarPdf = async () => {
    if (!datos) return;
    setExportando(true);
    setError(null);
    try {
      const [restaurantes, ganaderia, odontologia] = await Promise.all([
        idReal === "restaurantes" ? obtenerOperacionRestaurantes(dias) : Promise.resolve(null),
        idReal === "ganaderia" ? obtenerProduccionGanaderia(dias) : Promise.resolve(null),
        idReal === "odontologia" ? obtenerClinicaOdontologia(dias) : Promise.resolve(null),
      ]);
      generarPdfInformeVertical({
        detalle: datos,
        nombre: verticalId === "otras" ? OTRAS.find((o) => o.id === otraElegida)?.nombre ?? datos.nombre : info.nombre,
        descripcion: info.descripcion,
        colorHex: info.color,
        periodoLabel: `últimos ${PERIODOS.find((p) => p.dias === dias)?.label ?? `${dias} días`}`,
        restaurantes, ganaderia, odontologia,
      });
    } catch (e: any) {
      setError(e?.message || "No se pudo generar el informe");
    } finally {
      setExportando(false);
    }
  };

  useEffect(() => { setPestana("RESUMEN"); }, [verticalId]);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    obtenerDetalleVertical(idReal, dias)
      .then((d) => { if (vigente) setDatos(d); })
      .catch((e: Error) => { if (vigente) { setDatos(null); setError(e.message); } })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [idReal, dias, recarga]);

  const pestanas: [Pestana, string][] = [["RESUMEN", "Resumen"], ["NEGOCIOS", "Negocios y control"], ...(PESTANAS_PROPIAS[idReal] ?? [])];

  return (
    <div className="space-y-6">
      {/* CABECERA DE LA VERTICAL */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${info.color}1a`, color: info.color }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={info.icono} />
            </svg>
          </div>
          <div>
            <h2 className="font-['Outfit'] font-black text-2xl text-slate-900">
              {verticalId === "otras" ? OTRAS.find((o) => o.id === otraElegida)?.nombre : info.nombre}
            </h2>
            <p className="text-xs text-slate-500">{info.descripcion}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {verticalId === "otras" && (
            <select value={otraElegida} onChange={(e) => { setOtraElegida(e.target.value); setPestana("RESUMEN"); }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white">
              {OTRAS.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          )}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
            {PERIODOS.map((p) => (
              <button
                key={p.dias}
                onClick={() => setDias(p.dias)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${dias === p.dias ? "text-white" : "text-slate-600 hover:text-slate-900"}`}
                style={dias === p.dias ? { backgroundColor: info.color } : undefined}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={() => setRecarga((r) => r + 1)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
            Actualizar
          </button>
          <button
            onClick={exportarPdf}
            disabled={!datos || exportando}
            className="px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: info.color }}
          >
            {exportando ? "Generando..." : "Informe PDF"}
          </button>
        </div>
      </div>

      {/* PESTAÑAS */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {pestanas.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setPestana(id)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px cursor-pointer ${pestana === id ? "text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            style={pestana === id ? { borderColor: info.color } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
      {cargando && !datos && <div className="text-sm text-slate-400">Cargando {info.nombre}...</div>}

      {datos && pestana === "RESUMEN" && <Resumen datos={datos} color={info.color} onAbrirFicha={onAbrirFicha} />}
      {datos && pestana === "NEGOCIOS" && <Negocios datos={datos} onAbrirFicha={onAbrirFicha} />}

      {pestana === "CLINICAS" && (
        <VistaSalud
          dias={dias}
          onAbrirCanal={(cie10, tenantId) => {
            setDestinoReporte((d) => ({ cie10, tenantId, n: d.n + 1 }));
            setPestana("REPORTE");
          }}
        />
      )}
      {pestana === "REPORTE" && (
        <SuperAdminReporteEnfermedad key={destinoReporte.n} cie10Inicial={destinoReporte.cie10} tenantInicial={destinoReporte.tenantId} />
      )}
      {pestana === "COMERCIOS" && <VistaComercio dias={dias} />}
      {pestana === "MERCADO" && <VistaMercado dias={dias} />}
      {pestana === "OPERACION" && <OperacionRestaurantesVista dias={dias} color={info.color} onAbrirFicha={onAbrirFicha} />}
      {pestana === "PRODUCCION" && <ProduccionGanaderiaVista dias={dias} color={info.color} datos={datos} onAbrirFicha={onAbrirFicha} />}
      {pestana === "CLINICA_ODONTO" && <ClinicaOdontologiaVista dias={dias} color={info.color} />}
    </div>
  );
}

// ───────────────────────────── RESUMEN ─────────────────────────────

function Resumen({ datos, color, onAbrirFicha }: { datos: DetalleVertical; color: string; onAbrirFicha: (id: number) => void }) {
  const { kpis } = datos;
  const conSerie = datos.metricas.filter((m) => m.serie);
  const [metricaGrafico, setMetricaGrafico] = useState(conSerie[0]?.clave ?? "");
  const elegida = conSerie.find((m) => m.clave === metricaGrafico) ?? conSerie[0];
  const verSuma = !!elegida?.serieSuma;

  const serieUso = datos.meses.map((mes, i) => ({
    mes: etiquetaMes(mes),
    cantidad: elegida?.serie?.[i] ?? 0,
    suma: elegida?.serieSuma?.[i] ?? 0,
  }));
  const serieIngresos = datos.meses.map((mes, i) => ({ mes: etiquetaMes(mes), ingresos: datos.serieIngresos[i], altas: datos.serieAltas[i] }));

  const masActivos = [...datos.negocios]
    .map((n) => ({ n, uso: Object.values(n.metricas).reduce((s, m) => s + (m.periodo ?? 0), 0) }))
    .filter((x) => x.uso > 0)
    .sort((a, b) => b.uso - a.uso)
    .slice(0, 6);
  const enRiesgo = datos.negocios.filter((n) => n.enRiesgo).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Kpi titulo="Negocios" valor={numero.format(kpis.negocios)} nota={`${kpis.activos} activos · ${kpis.suspendidos} suspendidos`} />
        <Kpi titulo="Usándolo de verdad" valor={numero.format(kpis.conActividad)} nota={`de ${kpis.activos} activos, en el período`} color="text-emerald-600" />
        <Kpi titulo="En riesgo de abandono" valor={numero.format(kpis.enRiesgo)} nota="Activos sin uso en 14+ días" color={kpis.enRiesgo > 0 ? "text-rose-600" : "text-slate-900"} />
        <Kpi titulo="Por vencer" valor={numero.format(kpis.porVencer)} nota="Licencias en los próximos 7 días" color={kpis.porVencer > 0 ? "text-amber-600" : "text-slate-900"} />
        <Kpi titulo="Ingresos del período" valor={`$${dinero.format(kpis.ingresosPeriodo)}`} nota={`$${dinero.format(kpis.ingresosHistorico)} históricos`} color="text-sky-600" />
        <Kpi titulo="Usuarios" valor={numero.format(kpis.usuarios)} nota={`${kpis.altasPeriodo} negocio(s) nuevo(s) en el período`} />
      </div>

      {/* MÉTRICAS OPERATIVAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {datos.metricas.map((m) => <TarjetaMetrica key={m.clave} m={m} color={color} meses={datos.meses} />)}
        {datos.metricas.length === 0 && <div className="text-sm text-slate-400">Esta vertical todavía no tiene métricas operativas.</div>}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel titulo="Uso mes a mes" className="lg:col-span-2" accion={conSerie.length > 1 && (
          <select value={elegida?.clave} onChange={(e) => setMetricaGrafico(e.target.value)} className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white">
            {conSerie.map((m) => <option key={m.clave} value={m.clave}>{m.etiqueta}</option>)}
          </select>
        )}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serieUso} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip formatter={(v, k) => k === "suma" ? [formatoSuma(Number(v), elegida?.unidadSuma ?? null), elegida?.unidadSuma === "USD" ? "Monto" : "Total"] : [numero.format(Number(v)), elegida?.etiqueta ?? ""]} />
                <Bar dataKey={verSuma ? "suma" : "cantidad"} fill={color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {verSuma && <p className="text-[11px] text-slate-500 mt-2">Muestra el total en {elegida?.unidadSuma === "USD" ? "dólares" : elegida?.unidadSuma} por mes.</p>}
        </Panel>

        <Panel titulo="Ingresos SaaS y altas por mes">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serieIngresos} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip formatter={(v, k) => k === "ingresos" ? [`$${dinero.format(Number(v))}`, "Ingresos"] : [numero.format(Number(v)), "Negocios nuevos"]} />
                <Area type="monotone" dataKey="ingresos" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="altas" stroke="#a855f7" fill="#a855f7" fillOpacity={0.08} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-[11px] text-slate-500 mt-2">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Ingresos</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-violet-500" /> Negocios nuevos</span>
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel titulo="Los que más lo usan" nota="Registros en el período">
          <ListaNegocios filas={masActivos.map(({ n, uso }) => ({ n, detalle: `${numero.format(uso)} registros`, tono: "text-emerald-700" }))} vacio="Nadie registró operaciones en el período." onAbrirFicha={onAbrirFicha} />
        </Panel>
        <Panel titulo="En riesgo de abandono" nota="Licencia activa y sin uso en 14+ días">
          <ListaNegocios filas={enRiesgo.map((n) => ({ n, detalle: haceCuanto(n.ultimaActividad) === "Nunca" ? "Nunca lo ha usado" : `Último uso: ${haceCuanto(n.ultimaActividad).toLowerCase()}`, tono: "text-rose-700" }))} vacio="Ningún negocio en riesgo." onAbrirFicha={onAbrirFicha} />
        </Panel>
      </div>
    </div>
  );
}

function TarjetaMetrica({ m, color, meses }: { m: MetricaVertical; color: string; meses: string[] }) {
  const datos = (m.serie ?? []).map((v, i) => ({ mes: etiquetaMes(meses[i]), v }));
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{m.etiqueta}</div>
      <div className="flex items-end justify-between gap-2 mt-2">
        <div>
          <div className="text-2xl font-bold text-slate-900">{numero.format(m.conFecha ? m.periodo ?? 0 : m.total)}</div>
          <div className="text-[11px] text-slate-500">{m.conFecha ? `en el período · ${numero.format(m.total)} históricos` : "acumulado total"}</div>
          {m.unidadSuma && <div className="text-xs font-bold mt-1" style={{ color }}>{formatoSuma(m.sumaPeriodo, m.unidadSuma)}</div>}
        </div>
        {datos.length > 0 && (
          <div className="w-24 h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={datos}>
                <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── NEGOCIOS ─────────────────────────────

type FiltroNegocios = "TODOS" | "ACTIVOS" | "RIESGO" | "VENCER" | "SUSPENDIDOS";

function Negocios({ datos, onAbrirFicha }: { datos: DetalleVertical; onAbrirFicha: (id: number) => void }) {
  const [filtro, setFiltro] = useState<FiltroNegocios>("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const conFecha = datos.metricas.filter((m) => m.conFecha);

  const filas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return datos.negocios.filter((n) => {
      if (texto && !n.nombre.toLowerCase().includes(texto) && !(n.email ?? "").toLowerCase().includes(texto) && !String(n.tenantId).includes(texto)) return false;
      if (filtro === "ACTIVOS") return n.activa;
      if (filtro === "RIESGO") return n.enRiesgo;
      if (filtro === "VENCER") return n.activa && n.diasRestantes != null && n.diasRestantes >= 0 && n.diasRestantes <= 7;
      if (filtro === "SUSPENDIDOS") return !n.activa;
      return true;
    });
  }, [datos, filtro, busqueda]);

  const exportarCsv = () => {
    const cabecera = ["ID", "Negocio", "Correo", "Módulo", "Plan", "Estado", "Días restantes", "Usuarios", ...conFecha.map((m) => m.etiqueta), "Ingresos históricos USD", "Última actividad"];
    const lineas = filas.map((n) => [
      n.tenantId, n.nombre, n.email ?? "", n.modulo, n.plan, n.activa ? (n.enRiesgo ? "Activo en riesgo" : "Activo") : "Suspendido",
      n.diasRestantes ?? "", n.usuarios, ...conFecha.map((m) => n.metricas[m.clave]?.periodo ?? 0), n.ingresosHistorico, n.ultimaActividad ?? "",
    ]);
    const csv = [cabecera, ...lineas].map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `negocios_${datos.id}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cuenta = (f: FiltroNegocios) => datos.negocios.filter((n) =>
    f === "TODOS" ? true : f === "ACTIVOS" ? n.activa : f === "RIESGO" ? n.enRiesgo : f === "SUSPENDIDOS" ? !n.activa
      : n.activa && n.diasRestantes != null && n.diasRestantes >= 0 && n.diasRestantes <= 7).length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200">
      <div className="p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div className="flex flex-wrap gap-1">
          {([["TODOS", "Todos"], ["ACTIVOS", "Activos"], ["RIESGO", "En riesgo"], ["VENCER", "Por vencer"], ["SUSPENDIDOS", "Suspendidos"]] as [FiltroNegocios, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFiltro(id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${filtro === id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {label} <span className="opacity-70">({cuenta(id)})</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar negocio, correo o ID..." className="px-4 py-2 rounded-xl border border-slate-200 text-sm w-full sm:w-64" />
          <button onClick={exportarCsv} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap">Exportar Excel (CSV)</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold text-slate-500 uppercase">
              <th className="px-5 py-3">Negocio</th>
              <th className="px-3 py-3">Licencia</th>
              <th className="px-3 py-3 text-right">Usuarios</th>
              {conFecha.map((m) => <th key={m.clave} className="px-3 py-3 text-right whitespace-nowrap">{m.etiqueta}</th>)}
              <th className="px-3 py-3 text-right">Pagado</th>
              <th className="px-3 py-3">Última actividad</th>
              <th className="px-5 py-3 text-right">Control</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((n) => (
              <tr key={n.tenantId} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-5 py-3">
                  <button onClick={() => onAbrirFicha(n.tenantId)} className="text-left cursor-pointer group">
                    <div className="font-bold text-slate-900 group-hover:underline">{n.nombre}</div>
                    <div className="text-[11px] text-slate-500 font-mono">#{n.tenantId} · {n.modulo}{n.email ? ` · ${n.email}` : ""}</div>
                  </button>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <EstadoLicencia n={n} />
                  <div className="text-[10px] text-slate-400 mt-1">{n.plan}</div>
                </td>
                <td className="px-3 py-3 text-right font-mono">{n.usuarios}</td>
                {conFecha.map((m) => {
                  const v = n.metricas[m.clave];
                  return (
                    <td key={m.clave} className="px-3 py-3 text-right font-mono">
                      {v?.periodo ? numero.format(v.periodo) : <span className="text-slate-300">0</span>}
                      {m.unidadSuma && v?.sumaPeriodo ? <div className="text-[10px] text-slate-500">{formatoSuma(v.sumaPeriodo, m.unidadSuma)}</div> : null}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-right font-mono text-xs">${dinero.format(n.ingresosHistorico)}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${n.enRiesgo ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {haceCuanto(n.ultimaActividad)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => onAbrirFicha(n.tenantId)} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-[11px] cursor-pointer">
                    Abrir ficha
                  </button>
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr><td colSpan={conFecha.length + 6} className="px-5 py-8 text-center text-slate-400">No hay negocios con este filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 text-[11px] text-slate-500 border-t border-slate-100">
        Los números de cada columna son del período elegido. "Abrir ficha" permite cobrar, dar días de cortesía, gestionar módulos y usuarios, entrar como soporte y suspender o reactivar.
      </p>
    </div>
  );
}

function EstadoLicencia({ n }: { n: NegocioVertical }) {
  if (!n.activa) return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700">Suspendido</span>;
  if (n.diasRestantes != null && n.diasRestantes < 0) return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700">Vencido</span>;
  if (n.diasRestantes != null && n.diasRestantes <= 7) return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800">Vence en {n.diasRestantes} d</span>;
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">Activo{n.diasRestantes != null ? ` · ${n.diasRestantes} d` : ""}</span>;
}

// ─────────────────────── OPERACIÓN DE CADA VERTICAL ───────────────────────

function useCarga<T>(cargar: () => Promise<T>, deps: unknown[]) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let vigente = true;
    setError(null);
    cargar().then((d) => { if (vigente) setDatos(d); }).catch((e: Error) => { if (vigente) setError(e.message); });
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { datos, error };
}

function OperacionRestaurantesVista({ dias, color, onAbrirFicha }: { dias: number; color: string; onAbrirFicha: (id: number) => void }) {
  const { datos, error } = useCarga<OperacionRestaurantes>(() => obtenerOperacionRestaurantes(dias), [dias]);
  if (!datos) return <EstadoCarga error={error} />;
  const horas = datos.porHora.map((n, h) => ({ hora: `${String(h).padStart(2, "0")}h`, comandas: n, ventas: datos.ventasPorHora[h] }));
  const semana = datos.porDiaSemana.map((n, i) => ({ dia: DIAS_SEMANA[i], comandas: n }));
  const horaPico = datos.porHora.indexOf(Math.max(...datos.porHora));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi titulo="Comandas" valor={numero.format(datos.comandas)} nota="Sin anuladas, en el período" />
        <Kpi titulo="Ventas de los restaurantes" valor={`$${dinero.format(datos.ventas)}`} nota="Consumo registrado" color="text-emerald-600" />
        <Kpi titulo="Ticket promedio" valor={`$${dinero.format(datos.ticketPromedio)}`} nota="Por comanda" />
        <Kpi titulo="Hora pico" valor={datos.comandas ? `${String(horaPico).padStart(2, "0")}:00` : "-"} nota={datos.comandas ? `${datos.porHora[horaPico]} comandas` : "Sin comandas"} color="text-teal-700" />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Panel titulo="Comandas por hora del día" className="lg:col-span-2">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={horas} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="hora" tick={{ fontSize: 10, fill: "#64748b" }} interval={1} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip formatter={(v, k) => k === "ventas" ? [`$${dinero.format(Number(v))}`, "Ventas"] : [v, "Comandas"]} />
                <Bar dataKey="comandas" fill={color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel titulo="Por día de la semana">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={semana} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip />
                <Bar dataKey="comandas" name="Comandas" fill={color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Panel titulo="Canales de venta"><Barras filas={datos.canales} color={color} /></Panel>
        <Panel titulo="Métodos de pago"><Barras filas={datos.metodosPago} color={color} /></Panel>
        <Panel titulo="Platos más vendidos">
          <Barras filas={datos.topPlatos.map((p) => ({ etiqueta: p.nombre, n: Number(p.cantidad), detalle: `$${dinero.format(Number(p.ventas))}` }))} color={color} />
        </Panel>
      </div>
      <Panel titulo="Restaurantes que más venden">
        <Barras
          filas={datos.topRestaurantes.map((r) => ({ etiqueta: r.nombre, n: Number(r.ventas), detalle: `${r.comandas} comandas`, formato: (v: number) => `$${dinero.format(v)}`, alTocar: () => onAbrirFicha(r.tenantId) }))}
          color={color}
        />
      </Panel>
    </div>
  );
}

function ProduccionGanaderiaVista({ dias, color, datos: detalle, onAbrirFicha }: { dias: number; color: string; datos: DetalleVertical | null; onAbrirFicha: (id: number) => void }) {
  const { datos, error } = useCarga<ProduccionGanaderia>(() => obtenerProduccionGanaderia(dias), [dias]);
  if (!datos) return <EstadoCarga error={error} />;
  const leche = detalle?.metricas.find((m) => m.clave === "leche");
  const serieLeche = (detalle?.meses ?? []).map((mes, i) => ({ mes: etiquetaMes(mes), litros: leche?.serieSuma?.[i] ?? 0 }));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Kpi titulo="Leche ordeñada" valor={`${numero.format(datos.litros)} L`} nota="En el período" color="text-emerald-600" />
        <Kpi titulo="Ordeños" valor={numero.format(datos.ordenos)} nota={`${datos.vacasOrdenadas} vaca(s)`} />
        <Kpi titulo="Promedio por ordeño" valor={`${numero.format(datos.promedioPorOrdeno)} L`} nota="Por registro" />
        <Kpi titulo="Grasa promedio" valor={`${numero.format(datos.grasaPromedio)}%`} nota="Calidad de la leche" />
        <Kpi titulo="Proteína promedio" valor={`${numero.format(datos.proteinaPromedio)}%`} nota="Calidad de la leche" />
        <Kpi titulo="Animales en hato" valor={numero.format(datos.hatoPorEstado.reduce((s, x) => s + Number(x.n), 0))} nota="Todas las fincas" />
      </div>
      <Panel titulo="Litros de leche por mes" nota="Toda la vertical">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serieLeche} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
              <Tooltip formatter={(v) => [`${numero.format(Number(v))} L`, "Leche"]} />
              <Bar dataKey="litros" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <div className="grid lg:grid-cols-3 gap-6">
        <Panel titulo="Hato por estado"><Barras filas={datos.hatoPorEstado} color={color} /></Panel>
        <Panel titulo="Hato por tipo"><Barras filas={datos.hatoPorTipo} color={color} /></Panel>
        <Panel titulo="Hato por sexo"><Barras filas={datos.hatoPorSexo} color={color} /></Panel>
      </div>
      <Panel titulo="Fincas con más producción" nota="Litros en el período">
        <Barras
          filas={datos.topFincas.map((f) => ({ etiqueta: f.nombre, n: Number(f.litros), detalle: `${f.ordenos} ordeños`, formato: (v: number) => `${numero.format(v)} L`, alTocar: () => onAbrirFicha(f.tenantId) }))}
          color={color}
        />
      </Panel>
    </div>
  );
}

function ClinicaOdontologiaVista({ dias, color }: { dias: number; color: string }) {
  const { datos, error } = useCarga<ClinicaOdontologia>(() => obtenerClinicaOdontologia(dias), [dias]);
  if (!datos) return <EstadoCarga error={error} />;
  const pendiente = Math.max(0, Number(datos.carteraTotal) - Number(datos.carteraPagada));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi titulo="Planes de tratamiento" valor={numero.format(datos.planesPorEstado.reduce((s, p) => s + Number(p.n), 0))} nota="Todos los consultorios" />
        <Kpi titulo="Cartera total" valor={`$${dinero.format(datos.carteraTotal)}`} nota="Suma de los planes" />
        <Kpi titulo="Cobrado" valor={`$${dinero.format(datos.carteraPagada)}`} nota="Abonos recibidos" color="text-emerald-600" />
        <Kpi titulo="Por cobrar" valor={`$${dinero.format(pendiente)}`} nota="Saldo pendiente de los pacientes" color={pendiente > 0 ? "text-amber-600" : "text-slate-900"} />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel titulo="Planes por estado">
          <Barras filas={datos.planesPorEstado.map((p) => ({ etiqueta: p.etiqueta, n: Number(p.n), detalle: `$${dinero.format(Number(p.monto))} · cobrado $${dinero.format(Number(p.pagado))}` }))} color={color} />
        </Panel>
        <Panel titulo="Procedimientos más realizados" nota="En el período">
          <Barras filas={datos.topProcedimientos} color={color} />
        </Panel>
      </div>
    </div>
  );
}

// ───────────────────────────── piezas comunes ─────────────────────────────

function Kpi({ titulo, valor, nota, color = "text-slate-900" }: { titulo: string; valor: string; nota?: string; color?: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{titulo}</div>
      <div className={`text-2xl font-bold mt-2 ${color}`}>{valor}</div>
      {nota && <div className="text-[11px] text-slate-500 mt-1">{nota}</div>}
    </div>
  );
}

function Panel({ titulo, nota, accion, className = "", children }: { titulo: string; nota?: string; accion?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-white rounded-3xl border border-slate-200 p-6 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-slate-900">{titulo}</h3>
          {nota && <p className="text-[11px] text-slate-500">{nota}</p>}
        </div>
        {accion}
      </div>
      {children}
    </div>
  );
}

function Barras({ filas, color }: { filas: (ConteoEtiqueta & { detalle?: string; formato?: (v: number) => string; alTocar?: () => void })[]; color: string }) {
  if (filas.length === 0) return <p className="text-xs text-slate-400">Sin datos en el período.</p>;
  const max = Math.max(1, ...filas.map((f) => Number(f.n)));
  return (
    <div className="space-y-2.5">
      {filas.map((f, i) => (
        <button key={`${f.etiqueta}-${i}`} onClick={f.alTocar} disabled={!f.alTocar} className={`w-full text-left ${f.alTocar ? "cursor-pointer group" : "cursor-default"}`}>
          <div className="flex justify-between gap-2 text-xs">
            <span className={`font-semibold text-slate-700 truncate ${f.alTocar ? "group-hover:underline" : ""}`}>{f.etiqueta}</span>
            <span className="font-mono font-bold text-slate-900 shrink-0">{f.formato ? f.formato(Number(f.n)) : numero.format(Number(f.n))}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-1">
            <div className="h-full rounded-full" style={{ width: `${(Number(f.n) / max) * 100}%`, backgroundColor: color }} />
          </div>
          {f.detalle && <div className="text-[10px] text-slate-500 mt-0.5">{f.detalle}</div>}
        </button>
      ))}
    </div>
  );
}

function ListaNegocios({ filas, vacio, onAbrirFicha }: { filas: { n: NegocioVertical; detalle: string; tono: string }[]; vacio: string; onAbrirFicha: (id: number) => void }) {
  if (filas.length === 0) return <p className="text-xs text-slate-400">{vacio}</p>;
  return (
    <div className="divide-y divide-slate-100">
      {filas.map(({ n, detalle, tono }) => (
        <button key={n.tenantId} onClick={() => onAbrirFicha(n.tenantId)} className="w-full py-2.5 flex items-center justify-between gap-3 text-left cursor-pointer group">
          <div className="min-w-0">
            <div className="font-semibold text-sm text-slate-900 truncate group-hover:underline">{n.nombre}</div>
            <div className="text-[11px] text-slate-500">#{n.tenantId} · {n.plan}</div>
          </div>
          <span className={`text-xs font-bold shrink-0 ${tono}`}>{detalle}</span>
        </button>
      ))}
    </div>
  );
}

function EstadoCarga({ error }: { error: string | null }) {
  return error
    ? <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>
    : <div className="text-sm text-slate-400">Cargando...</div>;
}
