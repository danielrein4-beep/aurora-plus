import { useState } from "react";
import { IconFileText, IconMilk, IconSyringe } from "../Icons";
import {
  descargarReporteOrdenoPdf, descargarConstanciaVacunacionPdf,
  descargarInventarioHatoPdf, descargarReporteEngordePdf, descargarReportePotrerosPdf,
} from "../api";

/** Fecha local YYYY-MM-DD (toISOString daría el día siguiente pasadas las 8 p. m. en Venezuela). */
export function fechaLocalISO(d: Date = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function abrirPdf(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/** Botón institucional para generar y abrir un PDF, con estado de carga y aviso de error. */
export function BotonPdf({ etiqueta, obtener, notificar, variante = "secundario" }: {
  etiqueta: string;
  obtener: () => Promise<Blob>;
  notificar: (msg: string) => void;
  variante?: "primario" | "secundario";
}) {
  const [generando, setGenerando] = useState(false);
  return (
    <button
      type="button"
      disabled={generando}
      onClick={async () => {
        setGenerando(true);
        try {
          abrirPdf(await obtener());
        } catch (e) {
          notificar(`No se pudo generar el PDF: ${e instanceof Error ? e.message : "intente de nuevo"}`);
        } finally {
          setGenerando(false);
        }
      }}
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer transition-colors disabled:opacity-50 ${
        variante === "primario"
          ? "bg-teal-700 hover:bg-teal-800 !text-white"
          : "border border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:text-teal-800"
      }`}
    >
      <IconFileText size={13} />
      <span>{generando ? "Generando..." : etiqueta}</span>
    </button>
  );
}

/** Lunes a domingo de la semana que contiene la fecha dada. */
function semanaDe(fecha: string) {
  const d = new Date(`${fecha}T12:00:00`);
  const dia = d.getDay() || 7;
  const lunes = new Date(d);
  lunes.setDate(d.getDate() - (dia - 1));
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  return { desde: fechaLocalISO(lunes), hasta: fechaLocalISO(domingo) };
}

function formatoCorto(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

interface Props {
  vacunas: Array<{ id: number; nombre: string }>;
  notificar: (msg: string) => void;
}

const inputClase =
  "w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-300/80 dark:border-white/15 text-xs text-slate-900 dark:text-white";
const etiquetaClase = "text-[10px] uppercase font-bold text-slate-500 dark:text-white/40 block mb-1";

export default function ReportesCampoGanaderia({ vacunas, notificar }: Props) {
  const hoy = fechaLocalISO();
  const [modoOrdeno, setModoOrdeno] = useState<"DIARIO" | "SEMANAL" | "RANGO">("DIARIO");
  const [fechaOrdeno, setFechaOrdeno] = useState(hoy);
  const [rangoOrdeno, setRangoOrdeno] = useState({ desde: semanaDe(hoy).desde, hasta: hoy });
  const [vacDesde, setVacDesde] = useState(hoy);
  const [vacHasta, setVacHasta] = useState(hoy);
  const [vacunaId, setVacunaId] = useState<number | "">("");
  const [generando, setGenerando] = useState<"ordeno" | "vacunas" | null>(null);

  const periodoOrdeno =
    modoOrdeno === "DIARIO" ? { desde: fechaOrdeno, hasta: fechaOrdeno }
      : modoOrdeno === "SEMANAL" ? semanaDe(fechaOrdeno)
        : rangoOrdeno;

  const generarOrdeno = async () => {
    setGenerando("ordeno");
    try {
      abrirPdf(await descargarReporteOrdenoPdf(periodoOrdeno.desde, periodoOrdeno.hasta));
    } catch (e) {
      notificar(`No se pudo generar el reporte de ordeño: ${e instanceof Error ? e.message : "intente de nuevo"}`);
    } finally {
      setGenerando(null);
    }
  };

  const generarVacunas = async () => {
    setGenerando("vacunas");
    try {
      abrirPdf(await descargarConstanciaVacunacionPdf(vacDesde, vacHasta < vacDesde ? vacDesde : vacHasta, vacunaId || undefined));
    } catch (e) {
      notificar(`No se pudo generar la constancia: ${e instanceof Error ? e.message : "intente de nuevo"}`);
    } finally {
      setGenerando(null);
    }
  };

  return (
    <div className="apple-glass rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 space-y-5">
      <div className="flex items-center gap-2">
        <IconFileText size={16} className="text-emerald-600 dark:text-emerald-400" />
        <h4 className="font-['Outfit'] font-black text-lg text-slate-900 dark:text-white">Reportes de campo (PDF)</h4>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Ordeño */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <IconMilk size={15} className="text-sky-500" />
            <span>Reporte de ordeño</span>
          </div>
          <div className="apple-glass-pill rounded-full p-1 inline-flex items-center gap-1 text-xs">
            {(["DIARIO", "SEMANAL", "RANGO"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setModoOrdeno(m)}
                className={`px-3 py-1 rounded-full font-bold cursor-pointer transition-all ${
                  modoOrdeno === m ? "bg-emerald-500 text-white" : "text-slate-600 dark:text-white/60"
                }`}>
                {m === "DIARIO" ? "Diario" : m === "SEMANAL" ? "Semanal" : "Rango"}
              </button>
            ))}
          </div>

          {modoOrdeno !== "RANGO" ? (
            <div>
              <label className={etiquetaClase}>{modoOrdeno === "DIARIO" ? "Día" : "Cualquier día de la semana"}</label>
              <input type="date" max={hoy} value={fechaOrdeno} onChange={e => setFechaOrdeno(e.target.value)} className={inputClase} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={etiquetaClase}>Desde</label>
                <input type="date" max={hoy} value={rangoOrdeno.desde} onChange={e => setRangoOrdeno(r => ({ ...r, desde: e.target.value }))} className={inputClase} />
              </div>
              <div>
                <label className={etiquetaClase}>Hasta</label>
                <input type="date" max={hoy} value={rangoOrdeno.hasta} onChange={e => setRangoOrdeno(r => ({ ...r, hasta: e.target.value }))} className={inputClase} />
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-500 dark:text-white/50">
            {periodoOrdeno.desde === periodoOrdeno.hasta
              ? `Ordeño del ${formatoCorto(periodoOrdeno.desde)}`
              : `Del ${formatoCorto(periodoOrdeno.desde)} al ${formatoCorto(periodoOrdeno.hasta)}`}
            {" · litros por turno, por día y por vaca"}
          </div>
          <button
            type="button"
            onClick={generarOrdeno}
            disabled={generando !== null || !periodoOrdeno.desde || !periodoOrdeno.hasta}
            className="btn-cyber-neon text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {generando === "ordeno" ? "Generando..." : "Generar PDF de ordeño"}
          </button>
        </div>

        {/* Vacunación */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <IconSyringe size={15} className="text-amber-500" />
            <span>Constancia de vacunación</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={etiquetaClase}>Vacunados desde</label>
              <input type="date" max={hoy} value={vacDesde} onChange={e => setVacDesde(e.target.value)} className={inputClase} />
            </div>
            <div>
              <label className={etiquetaClase}>Hasta</label>
              <input type="date" max={hoy} value={vacHasta} onChange={e => setVacHasta(e.target.value)} className={inputClase} />
            </div>
          </div>
          <div>
            <label className={etiquetaClase}>Vacuna</label>
            <select value={vacunaId} onChange={e => setVacunaId(e.target.value ? Number(e.target.value) : "")} className={inputClase}>
              <option value="">Todas las vacunas</option>
              {vacunas.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-white/50">
            Animales vacunados, vacuna y lote aplicados, próxima dosis y fechas de retiro, con firma del veterinario.
          </div>
          <button
            type="button"
            onClick={generarVacunas}
            disabled={generando !== null || !vacDesde}
            className="btn-cyber-neon text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {generando === "vacunas" ? "Generando..." : "Generar constancia PDF"}
          </button>
        </div>
      </div>

      {/* Reportes de gestión: foto completa de la finca */}
      <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-2">
        <div className="text-sm font-bold text-slate-900 dark:text-white">Reportes de gestión</div>
        <p className="text-[11px] text-slate-500 dark:text-white/50">
          Inventario del hato por categoría, raza y preñez; engorde (GDP) con los animales estancados; ocupación y descanso de potreros.
        </p>
        <div className="flex flex-wrap gap-2">
          <BotonPdf etiqueta="Inventario del hato" obtener={descargarInventarioHatoPdf} notificar={notificar} />
          <BotonPdf etiqueta="Engorde (GDP)" obtener={() => descargarReporteEngordePdf()} notificar={notificar} />
          <BotonPdf etiqueta="Potreros" obtener={descargarReportePotrerosPdf} notificar={notificar} />
        </div>
        <p className="text-[10px] text-slate-400">La liquidación de cada ceba en sociedad se descarga desde Ceba en sociedad.</p>
      </div>
    </div>
  );
}
