import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { obtenerPanoramaVerticales, type PanoramaVertical } from "../api";
import { VERTICALES_SUPERADMIN, LeyendaColores } from "./SuperAdminVertical";
import { COLOR, TEXTO } from "../utils/coloresSignificado";

const PERIODOS = [
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
  { dias: 365, label: "12 meses" },
];

const numero = new Intl.NumberFormat("es-VE");
const dinero = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Mineria, moda y tamanaco viven en la página "Otras verticales". */
const PAGINA_DE: Record<string, string> = { mineria: "otras", moda: "otras", tamanaco: "otras" };

/** Comparación de todas las verticales; cada tarjeta lleva a su página dedicada. */
export default function SuperAdminPanorama({ onAbrirVertical }: { onAbrirVertical: (id: string) => void }) {
  const [dias, setDias] = useState(30);
  const [filas, setFilas] = useState<PanoramaVertical[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setError(null);
    obtenerPanoramaVerticales(dias)
      .then((f) => { if (vigente) setFilas(f); })
      .catch((e: Error) => { if (vigente) setError(e.message); });
    return () => { vigente = false; };
  }, [dias]);

  const color = (id: string) => VERTICALES_SUPERADMIN.find((v) => v.id === (PAGINA_DE[id] ?? id))?.color ?? "#64748b";
  const total = filas.reduce((s, f) => ({ negocios: s.negocios + f.negocios, activos: s.activos + f.activos, uso: s.uso + f.conActividad, riesgo: s.riesgo + f.enRiesgo, ingresos: s.ingresos + Number(f.ingresosPeriodo) }), { negocios: 0, activos: 0, uso: 0, riesgo: 0, ingresos: 0 });
  const grafico = filas.filter((f) => f.negocios > 0).map((f) => ({ nombre: f.nombre, "En uso": f.conActividad, "En riesgo": f.enRiesgo, "Sin actividad": Math.max(0, f.negocios - f.conActividad) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Todas las verticales lado a lado. Toque una para abrir su página con reportes, gráficas y control de negocios.</p>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
          {PERIODOS.map((p) => (
            <button key={p.dias} onClick={() => setDias(p.dias)} className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${dias === p.dias ? "bg-emerald-500 text-white" : "text-slate-600 hover:text-slate-900"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

      <LeyendaColores />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi titulo="Negocios en total" valor={numero.format(total.negocios)} nota={`${total.activos} activos`} />
        <Kpi titulo="Usándolo de verdad" valor={numero.format(total.uso)} nota="Con registros en el período" color={TEXTO.personas} />
        <Kpi titulo="En riesgo de abandono" valor={numero.format(total.riesgo)} nota="Activos sin uso en 14+ días" color="text-rose-600" />
        <Kpi titulo="Ingresos del período" valor={`$${dinero.format(total.ingresos)}`} nota="Suscripciones cobradas" color={TEXTO.dinero} />
        <Kpi titulo="Verticales con negocios" valor={String(filas.filter((f) => f.negocios > 0).length)} nota={`de ${filas.length}`} />
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filas.map((f) => {
          const uso = f.activos > 0 ? Math.round((f.conActividad / f.activos) * 100) : 0;
          return (
            <button
              key={f.id}
              onClick={() => onAbrirVertical(PAGINA_DE[f.id] ?? f.id)}
              className="text-left bg-white rounded-3xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color(f.id) }} />
                  <span className="font-bold text-slate-900">{f.nombre}</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">Abrir</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <Dato titulo="Negocios" valor={numero.format(f.negocios)} />
                <Dato titulo="En uso" valor={numero.format(f.conActividad)} />
                <Dato titulo="En riesgo" valor={numero.format(f.enRiesgo)} alerta={f.enRiesgo > 0} />
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Adopción: {uso}% de los activos lo usan</span>
                  <span>${dinero.format(Number(f.ingresosPeriodo))}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-1">
                  <div className="h-full rounded-full" style={{ width: `${uso}%`, backgroundColor: color(f.id) }} />
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-2">{numero.format(f.registrosPeriodo)} registros en el período</div>
            </button>
          );
        })}
      </div>

      {grafico.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4">Uso de los negocios por vertical</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grafico} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="En uso" stackId="a" fill={COLOR.personas} />
                <Bar dataKey="Sin actividad" stackId="a" fill={COLOR.neutro} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ titulo, valor, nota, color = "text-slate-900" }: { titulo: string; valor: string; nota: string; color?: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{titulo}</div>
      <div className={`text-2xl font-bold mt-2 ${color}`}>{valor}</div>
      <div className="text-[11px] text-slate-500 mt-1">{nota}</div>
    </div>
  );
}

function Dato({ titulo, valor, alerta }: { titulo: string; valor: string; alerta?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-bold text-slate-400 uppercase">{titulo}</div>
      <div className={`text-lg font-bold ${alerta ? "text-rose-600" : "text-slate-900"}`}>{valor}</div>
    </div>
  );
}
