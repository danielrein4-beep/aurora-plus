import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import {
  obtenerReporteEnfermedadSuperAdmin,
  obtenerCanalEndemicoRed,
  obtenerCanalEndemicoClinicaRed,
  type ReporteEnfermedad,
} from "../api";
import CanalEndemico from "./CanalEndemico";
import Cie10Buscador from "./Cie10Buscador";
import { generarPdfReporteEnfermedad } from "../utils/pdfReporteEnfermedad";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const numero = new Intl.NumberFormat("es-VE");

/**
 * Reporte por enfermedad del super-admin: busca por nombre o código CIE-10,
 * muestra todos los médicos con casos y, debajo, el Canal Endémico tal cual lo
 * ve el médico en Mediclinic (el componente se usa sin modificarlo).
 */
interface Props {
  /** Enfermedad y médico con los que abre (p. ej. al tocar un diagnóstico en "Clínicas"). */
  cie10Inicial?: string;
  tenantInicial?: number;
}

export default function SuperAdminReporteEnfermedad({ cie10Inicial, tenantInicial }: Props = {}) {
  const anioActual = new Date().getFullYear();
  const [cie10, setCie10] = useState(cie10Inicial ?? "");
  const [descripcion, setDescripcion] = useState("");
  const [anio, setAnio] = useState(anioActual);
  /** null = toda la red. */
  const [alcance, setAlcance] = useState<number | null>(tenantInicial ?? null);
  /** Remonta el canal cuando la enfermedad o el médico se eligen desde aquí (su prop inicial solo se lee al montar). */
  const [versionCanal, setVersionCanal] = useState(0);
  const [reporte, setReporte] = useState<ReporteEnfermedad | null>(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cie10) return;
    let vigente = true;
    setCargando(true);
    setError(null);
    obtenerReporteEnfermedadSuperAdmin(cie10, anio)
      .then((r) => { if (vigente) setReporte(r); })
      .catch((e: Error) => { if (vigente) setError(e.message); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [cie10, anio]);

  const medico = reporte?.medicos.find((m) => m.tenantId === alcance);
  const descripcionFinal = descripcion || reporte?.descripcion || "";
  const nombresClinica = useMemo(
    () => Object.fromEntries((reporte?.medicos ?? []).map((m) => [m.tenantId, m.medico])),
    [reporte]
  );

  const datosGrafico = MESES.map((mes, i) => ({
    mes,
    actual: medico ? medico.porMes[i] : reporte?.porMes[i] ?? 0,
    anterior: medico ? undefined : reporte?.porMesAnterior[i] ?? 0,
  }));

  const elegirEnfermedad = (codigo: string, desc: string) => {
    setCie10(codigo);
    setDescripcion(desc);
    setVersionCanal((v) => v + 1);
  };

  const elegirAlcance = (tenantId: number | null) => {
    setAlcance(tenantId);
    setVersionCanal((v) => v + 1);
  };

  const exportar = async () => {
    if (!reporte) return;
    setExportando(true);
    setError(null);
    try {
      const canal = await (alcance == null
        ? obtenerCanalEndemicoRed(reporte.cie10, anio)
        : obtenerCanalEndemicoClinicaRed(alcance, reporte.cie10, anio)
      ).catch(() => null);
      generarPdfReporteEnfermedad({ reporte, descripcion: descripcionFinal, medico, canal });
    } catch (e: any) {
      setError(e?.message || "No se pudo generar el PDF");
    } finally {
      setExportando(false);
    }
  };

  const casos = medico ? medico.casosAnio : reporte?.totalAnio ?? 0;
  const anterior = medico ? medico.casosAnioAnterior : reporte?.totalAnioAnterior ?? 0;
  const variacion = anterior > 0 ? Math.round(((casos - anterior) / anterior) * 100) : null;

  return (
    <div className="space-y-6">
      {/* CONTROLES */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">Reporte por enfermedad</h3>
            <p className="text-xs text-slate-500 mt-1">
              Busque la enfermedad por nombre o código, vea todos los médicos con casos y el canal endémico de la red o de un médico.
            </p>
          </div>
          <button
            onClick={exportar}
            disabled={!reporte || exportando}
            className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
          >
            {exportando ? "Generando PDF..." : "Exportar reporte PDF"}
          </button>
        </div>
        <div className="grid md:grid-cols-[1fr_140px_260px] gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Enfermedad (nombre o código CIE-10)</label>
            <Cie10Buscador
              key={cie10}
              valorCodigo={cie10}
              valorDescripcion={descripcionFinal}
              onSeleccionar={(d) => elegirEnfermedad(d.codigo, d.descripcion)}
              placeholder="Ej. gripe, dengue, hipertensión, J11"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Año</label>
            <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white">
              {Array.from({ length: 6 }, (_, i) => anioActual - i).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Médico</label>
            <select
              value={alcance ?? ""}
              onChange={(e) => elegirAlcance(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="">Todos los médicos (toda la red)</option>
              {(reporte?.medicos ?? []).map((m) => (
                <option key={m.tenantId} value={m.tenantId}>{m.medico} ({m.casosAnio})</option>
              ))}
            </select>
          </div>
        </div>
        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}
      </div>

      {reporte && (
        <>
          {/* RESUMEN */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Tarjeta titulo={`Casos en ${anio}`} valor={numero.format(casos)} nota={`${numero.format(anterior)} en ${anio - 1}`} color="text-sky-600" />
            <Tarjeta
              titulo="Variación vs año anterior"
              valor={variacion === null ? "—" : `${variacion > 0 ? "+" : ""}${variacion}%`}
              nota={variacion === null ? "sin casos el año anterior" : variacion > 0 ? "más casos" : "menos casos"}
              color={variacion === null ? "text-slate-500" : variacion > 0 ? "text-rose-600" : "text-emerald-600"}
            />
            {medico ? (
              <Tarjeta titulo="Participación en la red" valor={`${medico.participacionPct}%`} nota={`de ${numero.format(reporte.totalAnio)} casos`} color="text-violet-600" />
            ) : (
              <Tarjeta titulo="Médicos con casos" valor={String(reporte.medicosConCasos)} nota={`${reporte.medicos.length} con historial`} color="text-violet-600" />
            )}
            <Tarjeta titulo="Pacientes distintos" valor={numero.format(medico ? medico.pacientesDistintos : reporte.pacientesDistintos)} nota="consultas registradas" color="text-emerald-600" />
          </div>

          {/* POR MES */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4">
              {medico ? `Casos por mes en ${anio} — ${medico.medico}` : `Casos por mes: ${anio} contra ${anio - 1}`}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosGrafico} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {!medico && <Bar dataKey="anterior" name={`${anio - 1}`} fill="#cbd5e1" radius={[4, 4, 0, 0]} />}
                  <Bar dataKey="actual" name={`${anio}`} fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TODOS LOS MEDICOS */}
          <div className="bg-white rounded-3xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                Médicos con casos de {reporte.cie10}{" "}
                <span className="ml-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-xs">{reporte.medicos.length}</span>
              </h3>
              {alcance != null && (
                <button onClick={() => elegirAlcance(null)} className="text-xs font-bold text-sky-700 cursor-pointer">Ver toda la red</button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold text-slate-500 uppercase">
                    <th className="px-5 py-3">Médico</th>
                    <th className="px-3 py-3">Clínica</th>
                    <th className="px-3 py-3 text-right">Casos {anio}</th>
                    <th className="px-3 py-3 text-right">{anio - 1}</th>
                    <th className="px-3 py-3 text-right">Variación</th>
                    <th className="px-3 py-3 text-right">Pacientes</th>
                    <th className="px-3 py-3">Último caso</th>
                    <th className="px-5 py-3 w-48">Participación</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.medicos.map((m) => {
                    const v = m.casosAnioAnterior > 0 ? Math.round(((m.casosAnio - m.casosAnioAnterior) / m.casosAnioAnterior) * 100) : null;
                    return (
                      <tr
                        key={m.tenantId}
                        onClick={() => elegirAlcance(m.tenantId)}
                        className={`border-t border-slate-100 cursor-pointer hover:bg-sky-50/60 ${alcance === m.tenantId ? "bg-sky-50" : ""}`}
                        title="Ver el canal endémico de este médico"
                      >
                        <td className="px-5 py-3">
                          <div className="font-bold text-slate-900">{m.medico}</div>
                          <div className="text-[11px] text-slate-500">{m.especialidad || "Sin especialidad registrada"}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">{m.clinica || "—"}</td>
                        <td className={`px-3 py-3 text-right font-mono font-bold ${m.casosAnio >= 5 ? "text-amber-600" : "text-slate-900"}`}>{m.casosAnio}</td>
                        <td className="px-3 py-3 text-right font-mono text-slate-500">{m.casosAnioAnterior}</td>
                        <td className={`px-3 py-3 text-right font-mono text-xs ${v === null ? "text-slate-400" : v > 0 ? "text-rose-600" : v < 0 ? "text-emerald-600" : "text-slate-500"}`}>
                          {v === null ? "—" : `${v > 0 ? "+" : ""}${v}%`}
                        </td>
                        <td className="px-3 py-3 text-right font-mono">{m.pacientesDistintos}</td>
                        <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">{m.ultimoCaso ? new Date(m.ultimoCaso).toLocaleDateString("es-VE") : "—"}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.min(100, m.participacionPct)}%` }} />
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 w-10 text-right">{m.participacionPct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {reporte.medicos.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">Ningún médico ha registrado casos de esta enfermedad.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {cargando && !reporte && <div className="text-sm text-slate-400">Cargando reporte...</div>}

      {/* CANAL ENDEMICO: el mismo que ve el médico en Mediclinic */}
      <CanalEndemico
        key={versionCanal}
        modo="red"
        tenantId={alcance ?? undefined}
        clinicaNombre={medico?.medico}
        cie10Inicial={cie10 || undefined}
        nombresClinica={nombresClinica}
        onElegirClinica={(tenantId) => elegirAlcance(tenantId)}
        onCambioDiagnostico={(codigo) => {
          if (codigo && codigo !== cie10) {
            setCie10(codigo);
            setDescripcion("");
          }
        }}
      />
    </div>
  );
}

function Tarjeta({ titulo, valor, nota, color }: { titulo: string; valor: string; nota: string; color: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{titulo}</div>
      <div className={`text-3xl font-bold mt-2 ${color}`}>{valor}</div>
      <div className="text-xs text-slate-500 mt-1">{nota}</div>
    </div>
  );
}
