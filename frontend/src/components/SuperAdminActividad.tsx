import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import {
  obtenerResumenActividadSuperAdmin,
  obtenerDetalleActividadSuperAdmin,
  type ResumenActividadVertical,
  type DetalleActividadVertical,
  type TenantActividad,
} from "../api";
import CanalEndemico from "./CanalEndemico";

/** Mismas verticales que el directorio de tenants, con los textos ya acentuados. */
const VERTICALES = [
  { id: "salud", tag: "SAL", label: "Salud & MediClinic" },
  { id: "ganaderia", tag: "GAN", label: "Ganadería & Agro" },
  { id: "horeca", tag: "HOR", label: "Gastronomía / HORECA" },
  { id: "repuestos", tag: "COM", label: "Comercio & Retail" },
  { id: "minero", tag: "MIN", label: "Minería & Balanzas" },
  { id: "moda", tag: "MOD", label: "Moda & Calzado" },
  { id: "tamanaco-comercial", tag: "TAM", label: "Tamanaco Enterprise" },
];

const PERIODOS = [
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
  { dias: 365, label: "12 meses" },
];

/** Un negocio sin movimiento en este lapso se marca como "en riesgo" de abandono. */
const DIAS_RIESGO = 14;

const numero = new Intl.NumberFormat("es-VE");
const moneda = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function textoUltimaActividad(iso: string | null): string {
  const d = diasDesde(iso);
  if (d === null) return "Nunca";
  if (d === 0) return "Hoy";
  if (d === 1) return "Ayer";
  return `Hace ${d} días`;
}

function registrosPeriodoTenant(t: TenantActividad): number {
  return Object.values(t.metricas).reduce((acc, m) => acc + (m.periodo ?? 0), 0);
}

export default function SuperAdminActividad() {
  const [vertical, setVertical] = useState("salud");
  const [dias, setDias] = useState(30);
  const [subVistaSalud, setSubVistaSalud] = useState<"ACTIVIDAD" | "CANAL">("ACTIVIDAD");
  const [resumen, setResumen] = useState<ResumenActividadVertical[]>([]);
  const [detalle, setDetalle] = useState<DetalleActividadVertical | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    obtenerResumenActividadSuperAdmin(dias).then(setResumen).catch(() => setResumen([]));
  }, [dias]);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    obtenerDetalleActividadSuperAdmin(vertical, dias)
      .then((d) => { if (vigente) setDetalle(d); })
      .catch((e: Error) => { if (vigente) { setDetalle(null); setError(e.message || "No se pudo cargar la actividad"); } })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [vertical, dias]);

  const tenantsOrdenados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (detalle?.tenants ?? [])
      .filter((t) => !texto || t.nombreEmpresa.toLowerCase().includes(texto) || String(t.tenantId).includes(texto))
      .sort((a, b) => registrosPeriodoTenant(b) - registrosPeriodoTenant(a));
  }, [detalle, busqueda]);

  const resumenVertical = resumen.find((r) => r.vertical === vertical);
  const enRiesgo = (detalle?.tenants ?? []).filter((t) => {
    const d = diasDesde(t.ultimaActividad);
    return t.activa && (d === null || d > DIAS_RIESGO);
  }).length;
  const metricasConFecha = (detalle?.totales ?? []).filter((m) => m.conFecha);
  const verticalInfo = VERTICALES.find((v) => v.id === vertical)!;

  return (
    <div className="space-y-6">
      {/* SELECTOR DE VERTICAL CON RESUMEN */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {VERTICALES.map((v) => {
          const r = resumen.find((x) => x.vertical === v.id);
          const activo = v.id === vertical;
          return (
            <button
              key={v.id}
              onClick={() => { setVertical(v.id); setSubVistaSalud("ACTIVIDAD"); setBusqueda(""); }}
              className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                activo ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/20" : "bg-white border-slate-200 hover:border-emerald-300 text-slate-700"
              }`}
            >
              <div className={`text-[10px] font-mono font-bold ${activo ? "text-white/80" : "text-slate-400"}`}>{v.tag}</div>
              <div className="font-bold text-xs mt-1 leading-tight">{v.label}</div>
              <div className={`text-[11px] mt-2 ${activo ? "text-white/90" : "text-slate-500"}`}>
                {r ? `${r.tenantsConActividad} de ${r.totalTenants} con actividad` : "..."}
              </div>
            </button>
          );
        })}
      </div>

      {/* BARRA DE PERIODO + SUBVISTA SALUD */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        {vertical === "salud" && (
          <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setSubVistaSalud("ACTIVIDAD")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${subVistaSalud === "ACTIVIDAD" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
            >
              Actividad de clínicas
            </button>
            <button
              onClick={() => setSubVistaSalud("CANAL")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${subVistaSalud === "CANAL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
            >
              Canal Endémico de la red
            </button>
          </div>
        )}
      </div>

      {vertical === "salud" && subVistaSalud === "CANAL" ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-6">
          <CanalEndemico modo="red" />
        </div>
      ) : (
        <>
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>
          )}

          {/* KPIS DE LA VERTICAL */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Negocios en la vertical</div>
              <div className="text-3xl font-bold text-slate-900 mt-2">{resumenVertical?.totalTenants ?? "-"}</div>
              <div className="text-xs text-slate-500 mt-1">{verticalInfo.label}</div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 p-5">
              <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">Con actividad</div>
              <div className="text-3xl font-bold text-emerald-600 mt-2">{resumenVertical?.tenantsConActividad ?? "-"}</div>
              <div className="text-xs text-slate-500 mt-1">Registraron algo en el período</div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 p-5">
              <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wide">En riesgo de abandono</div>
              <div className="text-3xl font-bold text-rose-600 mt-2">{detalle ? enRiesgo : "-"}</div>
              <div className="text-xs text-slate-500 mt-1">Licencia activa, sin uso en más de {DIAS_RIESGO} días</div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 p-5">
              <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">Registros del período</div>
              <div className="text-3xl font-bold text-blue-600 mt-2">{resumenVertical ? numero.format(resumenVertical.registrosPeriodo) : "-"}</div>
              <div className="text-xs text-slate-500 mt-1">Suma de todas las operaciones</div>
            </div>
          </div>

          {/* METRICAS OPERATIVAS */}
          {detalle && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {detalle.totales.map((m) => (
                <div key={m.clave} className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs font-bold text-slate-600">{m.etiqueta}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {numero.format(m.conFecha ? m.periodo ?? 0 : m.total)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {m.conFecha ? `en el período · ${numero.format(m.total)} históricos` : "acumulado total"}
                  </div>
                  {m.monto !== null && (
                    <div className="text-[11px] font-mono text-emerald-700 mt-1">Monto: {moneda.format(m.monto)}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TENDENCIA */}
          {detalle && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="font-bold text-slate-900">Tendencia diaria: {detalle.metricaPrincipal}</h3>
                <span className="text-xs text-slate-500">Todos los negocios de la vertical</span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={detalle.serie} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(f: string) => f.substring(5)} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip labelFormatter={(f) => `Fecha: ${f}`} formatter={(v) => [numero.format(Number(v)), detalle.metricaPrincipal]} />
                    <Area type="monotone" dataKey="cantidad" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TABLA POR NEGOCIO */}
          <div className="bg-white rounded-3xl border border-slate-200">
            <div className="p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">
                Actividad por negocio{" "}
                <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs">{tenantsOrdenados.length}</span>
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
                    <th className="px-5 py-3">Negocio</th>
                    <th className="px-3 py-3">Usuarios</th>
                    {metricasConFecha.map((m) => (
                      <th key={m.clave} className="px-3 py-3 text-right whitespace-nowrap">{m.etiqueta}</th>
                    ))}
                    <th className="px-5 py-3">Última actividad</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando && !detalle && (
                    <tr><td colSpan={metricasConFecha.length + 3} className="px-5 py-8 text-center text-slate-400">Cargando actividad...</td></tr>
                  )}
                  {tenantsOrdenados.map((t) => {
                    const d = diasDesde(t.ultimaActividad);
                    const riesgo = t.activa && (d === null || d > DIAS_RIESGO);
                    return (
                      <tr key={t.tenantId} className="border-t border-slate-100">
                        <td className="px-5 py-3">
                          <div className="font-bold text-slate-900">{t.nombreEmpresa}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            #{t.tenantId} · {t.moduloPrincipal} · {t.plan}{!t.activa && " · suspendido"}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono">{t.usuarios}</td>
                        {metricasConFecha.map((m) => {
                          const v = t.metricas[m.clave];
                          return (
                            <td key={m.clave} className="px-3 py-3 text-right font-mono">
                              {v ? numero.format(v.periodo ?? 0) : <span className="text-slate-300">0</span>}
                              {v && <div className="text-[10px] text-slate-400">{numero.format(v.total)} hist.</div>}
                            </td>
                          );
                        })}
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${
                            riesgo ? "bg-rose-50 text-rose-700" : d !== null && d <= 2 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                          }`}>
                            {textoUltimaActividad(t.ultimaActividad)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {!cargando && detalle && tenantsOrdenados.length === 0 && (
                    <tr><td colSpan={metricasConFecha.length + 3} className="px-5 py-8 text-center text-slate-400">No hay negocios que coincidan.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
