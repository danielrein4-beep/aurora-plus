import { useState } from "react";
import { IconWarning } from "../../Icons";
import { registrarBajaGanaderia, type AnimalGanaderia } from "../../api";
import { fechaLocalISO } from "../ReportesCampoGanaderia";
import { useConfirmar } from "./DialogoConfirmar";
import type { Notificar } from "./tipos";

/** Causas frecuentes en fincas venezolanas; "Robo / abigeato" no cuenta como mortalidad. */
export const CAUSAS_BAJA = [
  "Enfermedad",
  "Parto / distocia",
  "Accidente o fractura",
  "Mordedura de culebra",
  "Rayo",
  "Intoxicación por plantas",
  "Ahogado",
  "Desnutrición / sequía",
  "Causa desconocida",
  "Robo / abigeato",
] as const;

interface Props {
  animalesActivos: AnimalGanaderia[];
  /** Animal preseleccionado al abrir desde su ficha. */
  animalIdInicial?: number;
  notificar: Notificar;
  /** Baja guardada: el padre saca al animal del hato activo con su nuevo estado. */
  onRegistrada: (animalId: number, estado: "MUERTO" | "ROBADO") => void;
  onCerrar: () => void;
}

/**
 * Baja de un animal por muerte o robo (abigeato): fecha, causa y observaciones (necropsia,
 * denuncia...). Queda la constancia y la mortalidad del hato se calcula con estas bajas.
 */
export default function ModalBaja({ animalesActivos, animalIdInicial, notificar, onRegistrada, onCerrar }: Props) {
  const { confirmar, dialogo } = useConfirmar();
  const [busqueda, setBusqueda] = useState("");
  const [animalId, setAnimalId] = useState<number>(animalIdInicial ?? 0);
  const [fecha, setFecha] = useState(fechaLocalISO());
  const [causa, setCausa] = useState("");
  const [otraCausa, setOtraCausa] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);

  const termino = busqueda.trim().toLowerCase();
  const opciones = termino
    ? animalesActivos.filter(a => a.id === animalId || a.arete.toLowerCase().includes(termino) || (a.nombre || "").toLowerCase().includes(termino))
    : animalesActivos;
  const animal = animalesActivos.find(a => a.id === animalId);
  const motivo = causa === "OTRA" ? otraCausa.trim() : causa;
  const esRobo = motivo.toLowerCase().startsWith("robo");

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animal) {
      notificar("Selecciona el animal que se da de baja.");
      return;
    }
    if (!motivo) {
      notificar("Indica la causa de la baja.");
      return;
    }
    const ok = await confirmar(
      `¿Dar de baja a ${animal.arete}${animal.nombre ? ` (${animal.nombre})` : ""} por "${motivo}"? Sale del hato activo y de su potrero.`,
      { accion: "Dar de baja", peligro: true });
    if (!ok) return;
    setGuardando(true);
    try {
      await registrarBajaGanaderia({ animalId: animal.id, fecha, motivo, observaciones: observaciones.trim() || undefined });
      onRegistrada(animal.id, esRobo ? "ROBADO" : "MUERTO");
      notificar(`${animal.arete} dado de baja (${motivo}).`);
      onCerrar();
    } catch (err) {
      notificar(`No se pudo registrar la baja: ${err instanceof Error ? err.message : "revisa tu conexión"}`);
    } finally {
      setGuardando(false);
    }
  };

  const campo = "w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-teal-600 focus:outline-none";
  const etiqueta = "text-xs font-semibold text-slate-600 block mb-1";

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      {dialogo}
      <form onSubmit={guardar} className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl p-6 space-y-4 text-left my-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><IconWarning size={18} /></span>
            <div>
              <h3 className="font-['Outfit'] font-black text-lg text-slate-900">Muerte o pérdida</h3>
              <p className="text-xs text-slate-500">El animal sale del hato activo y queda la constancia.</p>
            </div>
          </div>
          <button type="button" onClick={onCerrar} className="text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Cerrar">✕</button>
        </div>

        <div>
          <label className={etiqueta}>Animal *</label>
          {!animalIdInicial && (
            <input
              type="search"
              value={busqueda}
              onChange={e => {
                setBusqueda(e.target.value);
                const t = e.target.value.trim().toLowerCase();
                const unico = t ? animalesActivos.filter(a => a.arete.toLowerCase().includes(t) || (a.nombre || "").toLowerCase().includes(t)) : [];
                if (unico.length === 1) setAnimalId(unico[0].id);
              }}
              placeholder="Buscar por arete o nombre..."
              className={`${campo} mb-2`}
            />
          )}
          <select required value={animalId || ""} onChange={e => setAnimalId(Number(e.target.value))} className={campo}>
            <option value="">Selecciona el animal...</option>
            {opciones.map(a => (
              <option key={a.id} value={a.id}>
                {a.arete}{a.nombre ? ` · ${a.nombre}` : ""} · {a.tipoAnimal}{a.potrero?.nombre ? ` · ${a.potrero.nombre}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={etiqueta}>Fecha *</label>
            <input type="date" required max={fechaLocalISO()} value={fecha} onChange={e => setFecha(e.target.value)} className={campo} />
          </div>
          <div>
            <label className={etiqueta}>Causa *</label>
            <select required value={causa} onChange={e => setCausa(e.target.value)} className={campo}>
              <option value="">Selecciona...</option>
              {CAUSAS_BAJA.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="OTRA">Otra causa...</option>
            </select>
          </div>
        </div>

        {causa === "OTRA" && (
          <div>
            <label className={etiqueta}>¿Cuál? *</label>
            <input required value={otraCausa} onChange={e => setOtraCausa(e.target.value)} placeholder="Ej. Ataque de perros" className={campo} />
          </div>
        )}

        <div>
          <label className={etiqueta}>Observaciones</label>
          <textarea
            rows={3}
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            placeholder={esRobo ? "Ej. Número de denuncia, potrero, cómo se detectó..." : "Ej. Dónde se encontró, síntomas, resultado de la necropsia..."}
            className={campo}
          />
        </div>

        {esRobo && (
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
            Un robo sale del hato pero no cuenta en la mortalidad. Guarda el número de denuncia en las observaciones.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCerrar} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="px-5 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 !text-white cursor-pointer disabled:opacity-50">
            {guardando ? "Guardando..." : "Registrar baja"}
          </button>
        </div>
      </form>
    </div>
  );
}
