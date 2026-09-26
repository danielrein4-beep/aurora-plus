import React, { useEffect, useState } from "react";
import { obtenerFichaEstetica, guardarFichaEstetica, type FichaEstetica } from "../../api";
import { Aviso, Boton, Campo, Cargando, claseInput, formatearFecha, mensajeError } from "./comun";

const FOTOTIPOS = [
  { v: "I", t: "I · Muy clara, siempre se quema" },
  { v: "II", t: "II · Clara, se quema con facilidad" },
  { v: "III", t: "III · Intermedia, a veces se quema" },
  { v: "IV", t: "IV · Morena clara, rara vez se quema" },
  { v: "V", t: "V · Morena, casi nunca se quema" },
  { v: "VI", t: "VI · Negra, nunca se quema" },
];
const BIOTIPOS = ["Normal", "Seca", "Grasa", "Mixta"];
const SENSIBILIDAD = ["Baja", "Media", "Alta"];
const EXPOSICION = ["Poca", "Moderada", "Alta"];
const LESIONES = [
  "Acné activo", "Cicatrices de acné", "Manchas / melasma", "Hiperpigmentación post-inflamatoria", "Rosácea",
  "Cuperosis", "Deshidratación", "Flacidez", "Arrugas finas", "Poros dilatados", "Estrías", "Celulitis",
];

type Estado = {
  nivel: "BASICO" | "DETALLADO";
  fototipo: string; biotipo: string; sensibilidad: string; lesiones: string[]; zonasAfectadas: string;
  objetivo: string; rutinaDomiciliaria: string; exposicionSolar: string; medicacionActual: string;
  alergiasCosmeticos: string; usaIsotretinoina: boolean; embarazoLactancia: boolean; herpesRecurrente: boolean;
  marcapasosImplantes: boolean; derivarDermatologo: boolean; observaciones: string;
};

function desdeApi(f: FichaEstetica): Estado {
  return {
    nivel: f.nivel === "DETALLADO" ? "DETALLADO" : "BASICO",
    fototipo: f.fototipo ?? "", biotipo: f.biotipo ?? "", sensibilidad: f.sensibilidad ?? "",
    lesiones: f.lesiones ? f.lesiones.split("|").filter(Boolean) : [],
    zonasAfectadas: f.zonas_afectadas ?? "", objetivo: f.objetivo ?? "", rutinaDomiciliaria: f.rutina_domiciliaria ?? "",
    exposicionSolar: f.exposicion_solar ?? "", medicacionActual: f.medicacion_actual ?? "",
    alergiasCosmeticos: f.alergias_cosmeticos ?? "", usaIsotretinoina: !!f.usa_isotretinoina,
    embarazoLactancia: !!f.embarazo_lactancia, herpesRecurrente: !!f.herpes_recurrente,
    marcapasosImplantes: !!f.marcapasos_implantes, derivarDermatologo: !!f.derivar_dermatologo,
    observaciones: f.observaciones ?? "",
  };
}

/** Contraindicaciones marcadas, para mostrarlas como alerta en la ficha y al registrar una sesión. */
export function alertasDeFicha(f: FichaEstetica | null): string[] {
  if (!f) return [];
  const a: string[] = [];
  if (f.usa_isotretinoina) a.push("Toma isotretinoína: evitar peelings medios, láser y depilación con cera.");
  if (f.embarazo_lactancia) a.push("Embarazo o lactancia: evitar ácidos fuertes, retinoides y aparatología.");
  if (f.herpes_recurrente) a.push("Herpes recurrente: riesgo de brote tras peeling o láser en la zona peribucal.");
  if (f.marcapasos_implantes) a.push("Marcapasos o implantes metálicos: no usar radiofrecuencia ni electroestimulación.");
  if (f.alergias_cosmeticos) a.push(`Alergias: ${f.alergias_cosmeticos}`);
  if (f.derivar_dermatologo) a.push("Marcada para derivar al dermatólogo.");
  return a;
}

export default function FichaPiel({ pacienteId, onGuardada }: { pacienteId: number; onGuardada?: (f: FichaEstetica) => void }) {
  const [ficha, setFicha] = useState<FichaEstetica | null>(null);
  const [form, setForm] = useState<Estado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    setOk(false);
    obtenerFichaEstetica(pacienteId)
      .then((f) => { if (activo) { setFicha(f); setForm(desdeApi(f)); } })
      .catch((e) => activo && setError(mensajeError(e, "No se pudo cargar la ficha.")))
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, [pacienteId]);

  if (cargando) return <Cargando texto="Cargando ficha…" />;
  if (!form) return <Aviso>{error ?? "No se pudo cargar la ficha."}</Aviso>;

  const set = <K extends keyof Estado>(k: K, v: Estado[K]) => { setForm({ ...form, [k]: v }); setOk(false); };
  const alternarLesion = (l: string) =>
    set("lesiones", form.lesiones.includes(l) ? form.lesiones.filter((x) => x !== l) : [...form.lesiones, l]);
  const detallado = form.nivel === "DETALLADO";

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await guardarFichaEstetica({
        pacienteId, nivel: form.nivel, fototipo: form.fototipo, biotipo: form.biotipo, sensibilidad: form.sensibilidad,
        lesiones: form.lesiones.join("|"), zonasAfectadas: form.zonasAfectadas, objetivo: form.objetivo,
        rutinaDomiciliaria: form.rutinaDomiciliaria, exposicionSolar: form.exposicionSolar,
        medicacionActual: form.medicacionActual, alergiasCosmeticos: form.alergiasCosmeticos,
        usaIsotretinoina: form.usaIsotretinoina, embarazoLactancia: form.embarazoLactancia,
        herpesRecurrente: form.herpesRecurrente, marcapasosImplantes: form.marcapasosImplantes,
        derivarDermatologo: form.derivarDermatologo, observaciones: form.observaciones,
      });
      const actualizada = await obtenerFichaEstetica(pacienteId);
      setFicha(actualizada);
      setForm(desdeApi(actualizada));
      setOk(true);
      onGuardada?.(actualizada);
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar la ficha."));
    } finally {
      setGuardando(false);
    }
  };

  const casilla = (k: "usaIsotretinoina" | "embarazoLactancia" | "herpesRecurrente" | "marcapasosImplantes" | "derivarDermatologo", texto: string) => (
    <label key={k} className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5">
      <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} className="w-4 h-4 accent-[#9E4A63]" />
      <span className="text-sm text-slate-700 dark:text-white/80">{texto}</span>
    </label>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-semibold">
          {(["BASICO", "DETALLADO"] as const).map((n) => (
            <button
              key={n}
              onClick={() => set("nivel", n)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${form.nivel === n ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-white/50"}`}
            >
              {n === "BASICO" ? "Ficha básica" : "Ficha de cosmiatría"}
            </button>
          ))}
        </div>
        {ficha && !ficha.nueva && ficha.fecha_actualizacion && (
          <span className="text-[11px] text-slate-400">Actualizada el {formatearFecha(ficha.fecha_actualizacion)}</span>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Campo label="Biotipo de piel">
          <select className={claseInput} value={form.biotipo} onChange={(e) => set("biotipo", e.target.value)}>
            <option value="">Sin evaluar</option>
            {BIOTIPOS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </Campo>
        <Campo label="Sensibilidad">
          <select className={claseInput} value={form.sensibilidad} onChange={(e) => set("sensibilidad", e.target.value)}>
            <option value="">Sin evaluar</option>
            {SENSIBILIDAD.map((b) => <option key={b}>{b}</option>)}
          </select>
        </Campo>
        <Campo label="Exposición al sol">
          <select className={claseInput} value={form.exposicionSolar} onChange={(e) => set("exposicionSolar", e.target.value)}>
            <option value="">Sin evaluar</option>
            {EXPOSICION.map((b) => <option key={b}>{b}</option>)}
          </select>
        </Campo>
      </div>

      {detallado && (
        <Campo label="Fototipo (Fitzpatrick)">
          <select className={claseInput} value={form.fototipo} onChange={(e) => set("fototipo", e.target.value)}>
            <option value="">Sin evaluar</option>
            {FOTOTIPOS.map((f) => <option key={f.v} value={f.v}>{f.t}</option>)}
          </select>
        </Campo>
      )}

      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-600 dark:text-white/60">Qué se observa en la piel</span>
        <div className="flex flex-wrap gap-2">
          {LESIONES.map((l) => {
            const activa = form.lesiones.includes(l);
            return (
              <button
                key={l}
                onClick={() => alternarLesion(l)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                  activa
                    ? "bg-[#9E4A63] border-[#9E4A63] text-[#ffffff]"
                    : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:border-[#9E4A63]/50"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Campo label="Zonas a tratar">
          <input className={claseInput} value={form.zonasAfectadas} onChange={(e) => set("zonasAfectadas", e.target.value)} placeholder="Rostro, cuello, abdomen…" />
        </Campo>
        <Campo label="Qué quiere lograr la clienta">
          <input className={claseInput} value={form.objetivo} onChange={(e) => set("objetivo", e.target.value)} placeholder="Unificar el tono, reducir manchas…" />
        </Campo>
      </div>

      <Campo label="Alergias a cosméticos o productos">
        <input className={claseInput} value={form.alergiasCosmeticos} onChange={(e) => set("alergiasCosmeticos", e.target.value)} placeholder="Ninguna conocida" />
      </Campo>

      {detallado && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo label="Medicación actual" ayuda="Anticonceptivos, antibióticos, retinoides, corticoides…">
              <textarea className={claseInput} rows={2} value={form.medicacionActual} onChange={(e) => set("medicacionActual", e.target.value)} />
            </Campo>
            <Campo label="Rutina en casa" ayuda="Qué productos usa hoy.">
              <textarea className={claseInput} rows={2} value={form.rutinaDomiciliaria} onChange={(e) => set("rutinaDomiciliaria", e.target.value)} />
            </Campo>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-white/60">Contraindicaciones</span>
            <div className="grid sm:grid-cols-2 gap-2">
              {casilla("usaIsotretinoina", "Toma o tomó isotretinoína (últimos 6 meses)")}
              {casilla("embarazoLactancia", "Embarazo o lactancia")}
              {casilla("herpesRecurrente", "Herpes labial recurrente")}
              {casilla("marcapasosImplantes", "Marcapasos o implantes metálicos")}
            </div>
          </div>
        </>
      )}

      <Campo label="Observaciones">
        <textarea className={claseInput} rows={3} value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} />
      </Campo>

      {casilla("derivarDermatologo", "Derivar al dermatólogo (el caso excede lo cosmético)")}

      {error && <Aviso onCerrar={() => setError(null)}>{error}</Aviso>}
      {ok && <Aviso tipo="ok">Ficha guardada.</Aviso>}

      <div className="flex justify-end">
        <Boton onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar ficha"}</Boton>
      </div>
    </div>
  );
}
