import { useState, useEffect, useMemo, useRef } from "react";
import {
  ResponsiveContainer, ComposedChart, Area, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ReferenceLine,
} from "recharts";
import {
  diagnosticosFrecuentesSalud, obtenerCanalEndemico,
  diagnosticosFrecuentesRed, obtenerCanalEndemicoRed, desglosePorClinicaRed,
  importarHistoricoExcel, type ResultadoImportacionHistorica,
  type DiagnosticoFrecuente, type CanalEndemico as CanalEndemicoData, type CasosPorClinica,
} from "../api";
import { generarPdfCanalEndemico, type PuntoCanalPdf } from "../utils/pdfReports";
import { IconDownload } from "../Icons";

interface Props {
  /** "medico": el médico ve solo su propio canal (aislado por tenant). "red": vista consolidada de toda la plataforma (solo super-admin). */
  modo: "medico" | "red";
  clinicaNombre?: string;
  doctorNombre?: string;
}

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const ANIOS_PROYECCION = 3;

type Granularidad = "semana" | "mes" | "anio";

type ZonaCanal = "exito" | "seguridad" | "alarma" | "epidemia" | "sin_historial";

const ZONA_INFO: Record<ZonaCanal, { color: string; texto: string; badge: string }> = {
  exito: { color: "#22c55e", texto: "Zona de éxito", badge: "🟢" },
  seguridad: { color: "#3b82f6", texto: "Zona de seguridad", badge: "🔵" },
  alarma: { color: "#f97316", texto: "Zona de alarma", badge: "🟠" },
  epidemia: { color: "#ef4444", texto: "Zona de epidemia", badge: "🔴" },
  sin_historial: { color: "#64748b", texto: "Sin historial suficiente para comparar", badge: "⚪" },
};

/** El mismo criterio Q1/Mediana/Q3 en un solo lugar — sin historial real, no se inventa una zona (evita el falso "epidemia" cuando el umbral es puro cero). */
function calcularZona(casos: number, q1: number, mediana: number, q3: number, hayHistorial: boolean): ZonaCanal {
  if (!hayHistorial) return "sin_historial";
  if (casos <= q1) return "exito";
  if (casos <= mediana) return "seguridad";
  if (casos <= q3) return "alarma";
  return "epidemia";
}

interface PuntoCanal {
  periodo: number;
  etiqueta: string;
  zonaExito: number;
  zonaSeguridad: number;
  zonaAlarma: number;
  zonaEpidemia: number;
  minimo: number;
  percentil25: number;
  mediana: number;
  percentil75: number;
  maximo: number;
  casosActual: number;
}

export default function CanalEndemico({ modo, clinicaNombre, doctorNombre }: Props) {
  const anioActual = new Date().getFullYear();
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoFrecuente[]>([]);
  const [cie10, setCie10] = useState("");
  const [anio, setAnio] = useState(anioActual);
  const [granularidad, setGranularidad] = useState<Granularidad>("semana");
  const [canal, setCanal] = useState<CanalEndemicoData | null>(null);
  const [desglose, setDesglose] = useState<CasosPorClinica[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultadoImportacion, setResultadoImportacion] = useState<ResultadoImportacionHistorica | null>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const listar = modo === "red" ? diagnosticosFrecuentesRed : diagnosticosFrecuentesSalud;
    listar(20)
      .then((lista) => {
        setDiagnosticos(lista);
        setCie10((actual) => actual || (lista[0]?.cie10 ?? ""));
      })
      .catch(() => {});
  }, [modo]);

  useEffect(() => {
    if (!cie10) return;
    setCargando(true);
    setError(null);
    const obtener = modo === "red" ? obtenerCanalEndemicoRed : obtenerCanalEndemico;
    obtener(cie10, anio)
      .then(setCanal)
      .catch(() => setError("No se pudo cargar el canal endémico para este diagnóstico."))
      .finally(() => setCargando(false));

    if (modo === "red") {
      desglosePorClinicaRed(cie10, anio).then(setDesglose).catch(() => setDesglose([]));
    } else {
      setDesglose([]);
    }
  }, [cie10, anio, modo]);

  const datosCanal: PuntoCanal[] = useMemo(() => {
    if (!canal) return [];
    if (granularidad === "semana") {
      const casosPorSemana = new Map(canal.semanasAnioConsultado.map((p) => [p.semana, p.casos]));
      return canal.corredorHistorico.map((b) => ({
        periodo: b.periodo,
        etiqueta: `S${b.periodo}`,
        // Método estándar OPS: 3 cortes (Q1/Mediana/Q3), no 4 — el mínimo y el máximo
        // históricos NO son límites de zona, solo datos de referencia mostrados aparte.
        zonaExito: b.percentil25,
        zonaSeguridad: Math.max(0, b.mediana - b.percentil25),
        zonaAlarma: Math.max(0, b.percentil75 - b.mediana),
        zonaEpidemia: Math.max(0, b.maximo - b.percentil75),
        minimo: b.minimo,
        percentil25: b.percentil25,
        mediana: b.mediana,
        percentil75: b.percentil75,
        maximo: b.maximo,
        casosActual: casosPorSemana.get(b.periodo) ?? 0,
      }));
    }
    const casosPorMes = new Map(canal.mesesAnioConsultado.map((p) => [p.mes, p.casos]));
    return canal.corredorHistoricoMensual.map((b) => ({
      periodo: b.periodo,
      etiqueta: MESES[b.periodo - 1],
      zonaExito: b.percentil25,
      zonaSeguridad: Math.max(0, b.mediana - b.percentil25),
      zonaAlarma: Math.max(0, b.percentil75 - b.mediana),
      zonaEpidemia: Math.max(0, b.maximo - b.percentil75),
      minimo: b.minimo,
      percentil25: b.percentil25,
      mediana: b.mediana,
      percentil75: b.percentil75,
      maximo: b.maximo,
      casosActual: casosPorMes.get(b.periodo) ?? 0,
    }));
  }, [canal, granularidad]);

  /** El período con más casos del año consultado — el dato más útil para el médico: "tu peor semana/mes vs. lo normal". */
  const periodoDestacado = useMemo(() => {
    if (datosCanal.length === 0) return null;
    return datosCanal.reduce((peor, actual) => (actual.casosActual > peor.casosActual ? actual : peor), datosCanal[0]);
  }, [datosCanal]);

  const casosEsteAnio = canal?.semanasAnioConsultado.reduce((suma, p) => suma + p.casos, 0) ?? 0;

  const datosCanalAnual = useMemo(() => {
    if (!canal) return [];
    const historico = canal.porAnio.map((a) => ({
      anio: String(a.anio),
      casos: a.casos as number | null,
      esAnioConsultado: a.anio === anio,
      esProyeccion: false,
    }));
    const ultimoAnioConDatos = canal.porAnio.length > 0
      ? Math.max(...canal.porAnio.map((a) => a.anio), anio)
      : anio;
    const proyeccion = Array.from({ length: ANIOS_PROYECCION }, (_, i) => ({
      anio: String(ultimoAnioConDatos + i + 1),
      casos: null as number | null,
      esAnioConsultado: false,
      esProyeccion: true,
    }));
    return [...historico, ...proyeccion];
  }, [canal, anio]);

  /** El veredicto en palabras — la parte que un gráfico o una tabla sola nunca dicen por sí solos. */
  const veredicto = useMemo(() => {
    if (!canal) return null;
    if (granularidad === "anio") {
      const b = canal.bandaReferenciaAnual;
      const hay = b.aniosUsados > 0;
      const zona = calcularZona(casosEsteAnio, b.percentil25, b.mediana, b.percentil75, hay);
      return { zona, etiqueta: `el año ${anio}`, casos: casosEsteAnio };
    }
    if (!periodoDestacado) return null;
    const hay = canal.aniosHistoricosUsados > 0;
    const zona = calcularZona(periodoDestacado.casosActual, periodoDestacado.percentil25, periodoDestacado.mediana, periodoDestacado.percentil75, hay);
    return { zona, etiqueta: periodoDestacado.etiqueta, casos: periodoDestacado.casosActual };
  }, [canal, granularidad, casosEsteAnio, periodoDestacado, anio]);

  const aniosDisponibles = useMemo(() => {
    const anios = new Set<number>(canal?.porAnio.map((a) => a.anio) ?? []);
    anios.add(anioActual);
    return Array.from(anios).sort((a, b) => b - a);
  }, [canal, anioActual]);

  const etiquetaGranularidad = granularidad === "semana" ? "Semanal" : granularidad === "mes" ? "Mensual" : "Anual";

  const handleSeleccionarArchivo = () => inputArchivoRef.current?.click();

  const handleArchivoElegido = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite re-seleccionar el mismo archivo si hay que reintentar
    if (!archivo) return;
    setImportando(true);
    setResultadoImportacion(null);
    try {
      const resultado = await importarHistoricoExcel(archivo);
      setResultadoImportacion(resultado);
      // Recargar el canal para reflejar los datos recién importados.
      if (cie10) {
        const obtener = modo === "red" ? obtenerCanalEndemicoRed : obtenerCanalEndemico;
        obtener(cie10, anio).then(setCanal).catch(() => {});
      }
    } catch (err) {
      setResultadoImportacion({ filasImportadas: 0, filasConError: 1, errores: [{ numeroFila: 0, motivo: err instanceof Error ? err.message : "Error al importar el archivo" }] });
    } finally {
      setImportando(false);
    }
  };

  const handleDescargarPdf = () => {
    if (!canal) return;
    let puntos: PuntoCanalPdf[];
    if (granularidad === "anio") {
      const b = canal.bandaReferenciaAnual;
      puntos = datosCanalAnual.map((d) => ({
        etiqueta: d.anio,
        casos: d.casos,
        minimo: b.minimo, q1: b.percentil25, mediana: b.mediana, q3: b.percentil75, maximo: b.maximo,
      }));
    } else {
      puntos = datosCanal.map((p) => ({
        etiqueta: p.etiqueta,
        casos: p.casosActual,
        minimo: p.minimo, q1: p.percentil25, mediana: p.mediana, q3: p.percentil75, maximo: p.maximo,
      }));
    }
    generarPdfCanalEndemico({
      clinicaNombre: clinicaNombre || "Centro Médico Especializado",
      doctorNombre: doctorNombre || "",
      cie10: canal.cie10,
      granularidad: granularidad === "semana" ? "Semanal" : granularidad === "mes" ? "Mensual" : "Anual",
      anio,
      casosEsteAnio,
      totalHistorico: canal.totalCasosHistorico,
      aniosUsados: canal.aniosHistoricosUsados,
      aniosExcluidos: canal.aniosExcluidosPorAtipicos,
      puntos,
      hayHistorial: granularidad === "anio" ? canal.bandaReferenciaAnual.aniosUsados > 0 : canal.aniosHistoricosUsados > 0,
      fecha: new Date().toLocaleDateString("es-VE"),
    });
  };

  return (
    <div className="space-y-5">
      <div className="apple-glass rounded-2xl p-5">
        <h3 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm mb-1">
          {modo === "red" ? "Canal Endémico — Toda la Red" : "Canal Endémico"}
        </h3>
        <p className="text-xs text-slate-500 dark:text-white/50 mb-4">
          {modo === "red"
            ? "Vigilancia epidemiológica consolidada de todas las clínicas de la plataforma, calculada a partir de los diagnósticos CIE-10 de cada consulta."
            : "Comportamiento de tus diagnósticos en el tiempo, comparado con tu propio promedio histórico."}
        </p>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-500 dark:text-white/50">Diagnóstico frecuente</label>
            <select
              value={diagnosticos.some((d) => d.cie10 === cie10) ? cie10 : ""}
              onChange={(e) => setCie10(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#071a2e]/70 text-slate-900 dark:text-white text-xs"
            >
              <option value="">— elegir —</option>
              {diagnosticos.map((d) => (
                <option key={d.cie10} value={d.cie10}>{d.cie10} ({d.totalCasos} casos)</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-500 dark:text-white/50">O escribe un código CIE-10</label>
            <input
              value={cie10}
              onChange={(e) => setCie10(e.target.value.toUpperCase())}
              placeholder="Ej. A90"
              className="px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#071a2e]/70 text-slate-900 dark:text-white text-xs w-28"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-500 dark:text-white/50">Año</label>
            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#071a2e]/70 text-slate-900 dark:text-white text-xs"
            >
              {aniosDisponibles.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-500 dark:text-white/50">Ver canal por</label>
            <div className="flex rounded-xl border border-slate-200/80 dark:border-white/10 overflow-hidden text-xs">
              {(["semana", "mes", "anio"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGranularidad(g)}
                  className={`px-3 py-2 capitalize ${granularidad === g ? "bg-sky-500 text-white" : "bg-white/90 dark:bg-[#071a2e]/70 text-slate-600 dark:text-white/60"}`}
                >
                  {g === "anio" ? "Año" : g}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1 ml-auto">
            <label className="text-[11px] text-slate-500 dark:text-white/50 opacity-0 select-none">Acciones</label>
            <div className="flex gap-2">
              <input ref={inputArchivoRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleArchivoElegido} />
              <button
                type="button"
                onClick={handleSeleccionarArchivo}
                disabled={importando}
                className="px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#071a2e]/70 text-slate-600 dark:text-white/70 text-xs font-medium hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50"
                title="Importar historial epidemiológico desde un archivo Excel (.xlsx)"
              >
                {importando ? "Importando…" : "Importar historial (Excel)"}
              </button>
              <button
                type="button"
                onClick={handleDescargarPdf}
                disabled={!canal}
                className="px-3 py-2 rounded-xl bg-sky-500 text-white text-xs font-medium hover:bg-sky-600 disabled:opacity-50 flex items-center gap-1.5"
                title="Descargar este canal endémico como PDF"
              >
                <IconDownload size={14} />
                PDF
              </button>
            </div>
          </div>
        </div>

        {resultadoImportacion && (
          <div className={`mt-3 rounded-xl px-4 py-2.5 text-[11px] ${resultadoImportacion.filasConError > 0 && resultadoImportacion.filasImportadas === 0 ? "bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300"}`}>
            <p className="font-bold">
              {resultadoImportacion.filasImportadas} fila(s) importada(s)
              {resultadoImportacion.filasConError > 0 && `, ${resultadoImportacion.filasConError} con error`}
            </p>
            {resultadoImportacion.errores.length > 0 && (
              <ul className="mt-1 space-y-0.5 opacity-90">
                {resultadoImportacion.errores.slice(0, 5).map((e, i) => (
                  <li key={i}>Fila {e.numeroFila}: {e.motivo}</li>
                ))}
                {resultadoImportacion.errores.length > 5 && <li>... y {resultadoImportacion.errores.length - 5} más</li>}
              </ul>
            )}
          </div>
        )}
      </div>

      {!cie10 && !cargando && (
        <p className="text-xs text-slate-400 px-1">
          {diagnosticos.length === 0
            ? "Todavía no hay diagnósticos CIE-10 registrados en consultas para generar un canal."
            : "Elige o escribe un diagnóstico para ver su canal endémico."}
        </p>
      )}
      {cargando && <p className="text-xs text-slate-400 px-1">Cargando canal endémico…</p>}
      {error && <p className="text-xs text-red-500 px-1">{error}</p>}

      {canal && !cargando && canal.totalCasosHistorico === 0 && (
        <div className="apple-glass rounded-2xl p-8 text-center">
          <p className="text-sm font-bold text-slate-700 dark:text-white/80 mb-1">Sin casos registrados de {canal.cie10} todavía</p>
          <p className="text-xs text-slate-500 dark:text-white/50 max-w-md mx-auto">
            En cuanto registres una consulta con este diagnóstico (o importes un historial en Excel), el canal empieza a construirse solo, sin nada más que hacer.
          </p>
        </div>
      )}

      {canal && !cargando && canal.totalCasosHistorico > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiMini label={`Casos en ${anio}`} val={String(casosEsteAnio)} />
            <KpiMini label="Total histórico" val={String(canal.totalCasosHistorico)} />
            <KpiMini label="Años de historia usados" val={String(canal.aniosHistoricosUsados)} />
          </div>

          {veredicto && (
            <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ backgroundColor: `${ZONA_INFO[veredicto.zona].color}18`, border: `1px solid ${ZONA_INFO[veredicto.zona].color}40` }}>
              <span className="text-2xl leading-none">{ZONA_INFO[veredicto.zona].badge}</span>
              <div>
                <p className="text-sm font-bold font-['Outfit']" style={{ color: ZONA_INFO[veredicto.zona].color }}>
                  {ZONA_INFO[veredicto.zona].texto}
                </p>
                <p className="text-xs text-slate-600 dark:text-white/60">
                  {veredicto.zona === "sin_historial"
                    ? `${veredicto.casos} caso(s) en ${veredicto.etiqueta} — aún sin años anteriores para saber si esto es mucho o poco.`
                    : `${veredicto.casos} caso(s) en ${veredicto.etiqueta}, comparado con tu propio historial.`}
                </p>
              </div>
            </div>
          )}

          {canal.aniosExcluidosPorAtipicos.length > 0 && (
            <div className="rounded-xl px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
              Se excluyeron del cálculo del rango normal: <strong>{canal.aniosExcluidosPorAtipicos.join(", ")}</strong> — año(s) con un
              brote atípicamente alto, para que no infle el umbral de alerta de los demás años.
            </div>
          )}

          <div className="apple-glass rounded-2xl p-5">
            <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm mb-1">
              Canal Endémico {etiquetaGranularidad} — {canal.cie10}
              {granularidad !== "anio" && ` (${anio})`}
            </h4>

            {granularidad !== "anio" ? (
              <>
                <p className="text-[11px] text-slate-500 dark:text-white/50 mb-4">
                  Bandas = corredor histórico (éxito / seguridad / alerta / epidemia). Línea sólida = casos reales de {anio}.
                  {canal.aniosHistoricosUsados === 0 && " Aún no hay años anteriores para comparar — el corredor se irá formando con el tiempo."}
                </p>
                <div className="flex flex-col lg:flex-row gap-5">
                  <div className="lg:w-[190px] flex-shrink-0 space-y-4">
                    {periodoDestacado && (
                      <div className="rounded-xl p-3 bg-sky-500/10 border border-sky-500/20">
                        <p className="text-[10px] text-sky-700 dark:text-sky-300 font-bold uppercase tracking-wide">
                          {granularidad === "semana" ? "Semana con más casos" : "Mes con más casos"}
                        </p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                          {periodoDestacado.etiqueta} — {periodoDestacado.casosActual} casos
                        </p>
                      </div>
                    )}

                    {periodoDestacado && canal.aniosHistoricosUsados > 0 && (
                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-white/50 mb-1.5">Rango normal en {periodoDestacado.etiqueta}</p>
                        <div className="space-y-1 text-xs">
                          <FilaQuartil label="Máximo" val={periodoDestacado.maximo} />
                          <FilaQuartil label="Percentil 75" val={periodoDestacado.percentil75} />
                          <FilaQuartil label="Mediana" val={periodoDestacado.mediana} destacado />
                          <FilaQuartil label="Percentil 25" val={periodoDestacado.percentil25} />
                          <FilaQuartil label="Mínimo" val={periodoDestacado.minimo} />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <p className="text-[11px] text-slate-500 dark:text-white/50 mb-1">Leyenda</p>
                      <LeyendaItem color="#22c55e" label="Zona de éxito" />
                      <LeyendaItem color="#eab308" label="Zona de seguridad" />
                      <LeyendaItem color="#f97316" label="Zona de alarma" />
                      <LeyendaItem color="#ef4444" label="Zona de epidemia" />
                      <LeyendaItem color="#64748b" label="Mediana histórica" linea />
                      <LeyendaItem color="#0ea5e9" label={`Casos ${anio}`} linea />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={datosCanal} margin={{ left: 0, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
                        <XAxis
                          dataKey="etiqueta"
                          tick={{ fontSize: 10 }}
                          label={{ value: granularidad === "semana" ? "Semana" : "Mes", position: "insideBottom", offset: -2, fontSize: 10 }}
                        />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Area type="monotone" dataKey="zonaExito" stackId="corredor" stroke="none" fill="#22c55e" fillOpacity={0.15} name="Zona de éxito" />
                        <Area type="monotone" dataKey="zonaSeguridad" stackId="corredor" stroke="none" fill="#eab308" fillOpacity={0.15} name="Zona de seguridad" />
                        <Area type="monotone" dataKey="zonaAlarma" stackId="corredor" stroke="none" fill="#f97316" fillOpacity={0.18} name="Zona de alarma" />
                        <Area type="monotone" dataKey="zonaEpidemia" stackId="corredor" stroke="none" fill="#ef4444" fillOpacity={0.2} name="Zona de epidemia" />
                        <Line type="monotone" dataKey="mediana" stroke="#64748b" strokeDasharray="4 3" strokeWidth={1.5} dot={false} name="Mediana histórica" />
                        <Line type="monotone" dataKey="casosActual" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 2 }} name={`Casos ${anio}`} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-[11px] text-slate-500 dark:text-white/50 mb-4">
                  Un año no se repite, así que no arma un corredor por período — la banda de color es el rango histórico (percentil 25 a 75)
                  de los totales de los demás años, para comparar el año resaltado contra su propio historial. Los años en gris al final
                  son una proyección: si el patrón se mantiene, lo esperable es que caigan dentro de esa misma banda.
                  {canal.bandaReferenciaAnual.aniosUsados === 0 && " Todavía no hay otros años con datos para comparar."}
                </p>
                <div className="flex flex-col lg:flex-row gap-5">
                  <div className="lg:w-[190px] flex-shrink-0 space-y-4">
                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-white/50 mb-1.5">Año — casos</p>
                      <div className="space-y-1">
                        {datosCanalAnual.map((d) => (
                          <div
                            key={d.anio}
                            className={`flex justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                              d.esAnioConsultado
                                ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold"
                                : d.esProyeccion
                                ? "bg-slate-100/50 dark:bg-white/5 text-slate-400 dark:text-white/40 italic"
                                : "bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-white/70"
                            }`}
                          >
                            <span>{d.anio}</span>
                            <span>{d.esProyeccion ? "proyección" : d.casos}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {canal.bandaReferenciaAnual.aniosUsados > 0 && (
                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-white/50 mb-1.5">Rango normal histórico</p>
                        <div className="space-y-1 text-xs">
                          <FilaQuartil label="Máximo" val={canal.bandaReferenciaAnual.maximo} />
                          <FilaQuartil label="Percentil 75" val={canal.bandaReferenciaAnual.percentil75} />
                          <FilaQuartil label="Mediana" val={canal.bandaReferenciaAnual.mediana} destacado />
                          <FilaQuartil label="Percentil 25" val={canal.bandaReferenciaAnual.percentil25} />
                          <FilaQuartil label="Mínimo" val={canal.bandaReferenciaAnual.minimo} />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <p className="text-[11px] text-slate-500 dark:text-white/50 mb-1">Leyenda</p>
                      <LeyendaItem color="#a855f7" label="Años anteriores" punto />
                      <LeyendaItem color="#0ea5e9" label="Año consultado" punto />
                      <LeyendaItem color="#eab308" label="Rango normal (p25-p75)" />
                      <LeyendaItem color="#64748b" label="Mediana histórica" linea />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={datosCanalAnual} margin={{ left: 0, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
                        <XAxis dataKey="anio" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        {canal.bandaReferenciaAnual.aniosUsados > 0 && (
                          <>
                            <ReferenceArea y1={canal.bandaReferenciaAnual.percentil25} y2={canal.bandaReferenciaAnual.percentil75} fill="#eab308" fillOpacity={0.15} />
                            <ReferenceLine y={canal.bandaReferenciaAnual.mediana} stroke="#64748b" strokeDasharray="4 3" strokeWidth={1.5} />
                          </>
                        )}
                        <Line type="monotone" dataKey="casos" stroke="#0ea5e9" strokeWidth={2.5} connectNulls={false} dot={(props: any) => {
                          const { cx, cy, payload, index } = props;
                          if (payload.casos == null) return <g key={`dot-${index}`} />;
                          const esActual = payload.esAnioConsultado;
                          return <circle key={`dot-${index}`} cx={cx} cy={cy} r={esActual ? 6 : 4} fill={esActual ? "#0ea5e9" : "#a855f7"} />;
                        }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>

          {modo === "red" && (
            <div className="apple-glass rounded-2xl p-5">
              <h4 className="font-['Outfit'] font-bold text-slate-900 dark:text-white text-sm mb-4">Desglose por clínica — {anio}</h4>
              {desglose.length === 0 ? (
                <p className="text-xs text-slate-400">Ninguna clínica reportó este diagnóstico en {anio}.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500 dark:text-white/50 border-b border-slate-200/60 dark:border-white/10">
                        <th className="py-2 pr-4">Tenant ID</th>
                        <th className="py-2">Casos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {desglose.map((d) => (
                        <tr key={d.tenantId} className="border-b border-slate-100/60 dark:border-white/5">
                          <td className="py-2 pr-4 text-slate-800 dark:text-white">{d.tenantId}</td>
                          <td className="py-2 text-slate-800 dark:text-white">{d.totalCasos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiMini({ label, val }: { label: string; val: string }) {
  return (
    <div className="apple-glass rounded-2xl p-4">
      <p className="text-[11px] text-slate-500 dark:text-white/50">{label}</p>
      <p className="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">{val}</p>
    </div>
  );
}

function FilaQuartil({ label, val, destacado }: { label: string; val: number; destacado?: boolean }) {
  return (
    <div className={`flex justify-between ${destacado ? "font-bold text-slate-800 dark:text-white" : "text-slate-500 dark:text-white/60"}`}>
      <span>{label}</span>
      <span>{val}</span>
    </div>
  );
}

function LeyendaItem({ color, label, linea, punto }: { color: string; label: string; linea?: boolean; punto?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-white/60">
      {linea ? (
        <span className="w-3 h-0.5 flex-shrink-0" style={{ backgroundColor: color }} />
      ) : punto ? (
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      ) : (
        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color, opacity: 0.5 }} />
      )}
      <span>{label}</span>
    </div>
  );
}
