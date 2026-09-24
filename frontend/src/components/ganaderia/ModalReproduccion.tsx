import { useState } from "react";
import { registrarEventoReproductivoGanaderia, type AnimalGanaderia } from "../../api";
import { fechaLocalISO } from "../ReportesCampoGanaderia";
import type { Notificar } from "./tipos";

interface Props {
  animalesActivos: AnimalGanaderia[];
  /** Tipo y resultado con que abre según el botón elegido (servicio, aborto, secado...). */
  valoresIniciales?: { tipo?: string; resultado?: string };
  tenantId: number;
  notificar: Notificar;
  onCerrar: () => void;
}

/** Evento reproductivo de una hembra: servicio, palpación, aborto o secado. */
export default function ModalReproduccion({ animalesActivos, valoresIniciales, tenantId, notificar, onCerrar }: Props) {
  // Formulario reproducción
  const [formRepro, setFormRepro] = useState({
    hembraId: animalesActivos.find(a => a.sexo === "HEMBRA")?.id ?? 0,
    tipo: "DIAGNOSTICO_PRENEZ",
    fecha: fechaLocalISO(),
    resultado: "PREÑADA_CONFIRMADA",
    fechaProbableParto: fechaLocalISO(new Date(Date.now() + 180 * 86400000)),
    sementalReferenciaExterna: "",
    ...valoresIniciales,
  });

  // Manejador: Registrar evento reproductivo
  const handleGuardarRepro = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registrarEventoReproductivoGanaderia(tenantId, {
        hembraId: Number(formRepro.hembraId),
        tipo: formRepro.tipo,
        fecha: formRepro.fecha,
        resultado: formRepro.resultado,
        fechaProbableParto: formRepro.fechaProbableParto,
        sementalReferenciaExterna: formRepro.sementalReferenciaExterna,
      });
    } catch {
      notificar(`No se pudo registrar el evento reproductivo — revisa tu conexión e inténtalo de nuevo.`);
      return;
    }
    notificar(`Evento reproductivo registrado en el expediente.`);
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-md w-full border border-purple-500/30 text-left space-y-4">
        <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
          Registro Reproductivo
        </h3>
        <form onSubmit={handleGuardarRepro} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Hembra</label>
            <select
              value={formRepro.hembraId}
              onChange={e => setFormRepro({ ...formRepro, hembraId: Number(e.target.value) })}
              className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
              {animalesActivos.filter(a => a.sexo === "HEMBRA").map(a => (
                <option key={a.id} value={a.id}>{a.arete} - {a.nombre || a.tipoAnimal}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Tipo de Evento</label>
            <select
              value={formRepro.tipo}
              onChange={e => setFormRepro({ ...formRepro, tipo: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-bold">
              <option value="DIAGNOSTICO_PRENEZ">Diagnóstico de Preñez (Palpación / Eco)</option>
              <option value="SERVICIO">Servicio / Inseminación Artificial</option>
              <option value="PARTO">Parto / Nacimiento</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Semental / Pajuela de IA</label>
            <input
              type="text"
              placeholder="Ej. Toro Tamarindo o pajuela Gyr lechero"
              value={formRepro.sementalReferenciaExterna}
              onChange={e => setFormRepro({ ...formRepro, sementalReferenciaExterna: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Fecha Estimada de Parto</label>
            <input
              type="date"
              value={formRepro.fechaProbableParto}
              onChange={e => setFormRepro({ ...formRepro, fechaProbableParto: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white tabular-nums"
            />
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onCerrar()}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-cyber-neon text-white font-bold px-6 py-2 rounded-xl cursor-pointer">
              Guardar Evento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
