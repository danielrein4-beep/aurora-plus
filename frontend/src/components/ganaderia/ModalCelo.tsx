import { useState } from "react";
import { IconBulb, IconFire } from "../../Icons";
import { registrarEventoReproductivoGanaderia, type AnimalGanaderia } from "../../api";
import { fechaLocalISO } from "../ReportesCampoGanaderia";
import type { Notificar } from "./tipos";

interface Props {
  animales: AnimalGanaderia[];
  animalesActivos: AnimalGanaderia[];
  tenantId: number;
  notificar: Notificar;
  /** Hembra con el celo registrado: el padre la pasa a EN_ESPERA. */
  onRegistrado: (hembraId: number) => void;
  onCerrar: () => void;
}

/** Celo observado en una hembra: queda programada para inseminación (EN_ESPERA). */
export default function ModalCelo({ animales, animalesActivos, tenantId, notificar, onRegistrado, onCerrar }: Props) {
  // Formulario de Celos (Evento Reproductivo dedicado)
  const [formCelo, setFormCelo] = useState({
    hembraId: animalesActivos.find(a => a.sexo === "HEMBRA")?.id ?? 0,
    fecha: fechaLocalISO(),
    tipoCelo: "NATURAL",
    sintomasCelo: "",
    horaOptimaIA: "",
  });

  // Manejador: Registrar Celo (Evento Reproductivo dedicado)
  const handleGuardarCelo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registrarEventoReproductivoGanaderia(tenantId, {
        hembraId: Number(formCelo.hembraId),
        tipo: "CELO",
        fecha: formCelo.fecha,
        tipoCelo: formCelo.tipoCelo,
        sintomasCelo: formCelo.sintomasCelo,
        horaOptimaIA: formCelo.horaOptimaIA,
      });
      onRegistrado(Number(formCelo.hembraId));
      const hembra = animales.find(a => a.id === Number(formCelo.hembraId));
      notificar(`Celo registrado para hembra ${hembra?.arete || ''}. Estado reproductivo actualizado a 'EN_ESPERA' (programada para IA).`);
    } catch {
      notificar("No se pudo registrar el evento de celo — revisa tu conexión.");
      return;
    }
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-md w-full border border-purple-500/40 text-left space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-rose-400"><IconFire size={20} /></span>
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
              Detección de Celo
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onCerrar()}
            className="text-slate-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleGuardarCelo} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Hembra en Celo *</label>
            <select
              required
              value={formCelo.hembraId}
              onChange={e => setFormCelo({ ...formCelo, hembraId: Number(e.target.value) })}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold">
              {animalesActivos.filter(a => a.sexo === "HEMBRA").map(a => (
                <option key={a.id} value={a.id}>
                  {a.arete} - {a.nombre || a.tipoAnimal} ({a.raza || "Bovino"})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Fecha de Detección</label>
              <input
                type="date"
                required
                value={formCelo.fecha}
                onChange={e => setFormCelo({ ...formCelo, fecha: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white tabular-nums"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Tipo de Celo</label>
              <select
                value={formCelo.tipoCelo}
                onChange={e => setFormCelo({ ...formCelo, tipoCelo: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white">
                <option value="NATURAL">Celo Natural</option>
                <option value="SINCRONIZADO">Sincronizado (IATF / Protocolo)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Signos Clínicos y Síntomas Observados</label>
            <input
              type="text"
              value={formCelo.sintomasCelo}
              onChange={e => setFormCelo({ ...formCelo, sintomasCelo: e.target.value })}
              placeholder="Ej. Acepta monta, moco cristalino filante, vulva edematosa"
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Hora Óptima de Inseminación (Regla AM/PM)</label>
            <input
              type="text"
              value={formCelo.horaOptimaIA}
              onChange={e => setFormCelo({ ...formCelo, horaOptimaIA: e.target.value })}
              placeholder="Ej. Detectado AM → Inseminar PM (12 horas después)"
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white tabular-nums text-[11px]"
            />
            <p className="text-[10px] text-purple-400 mt-1 flex items-start gap-1">
              <IconBulb size={12} className="shrink-0 mt-0.5" /> Al guardar, el estado reproductivo de la hembra cambiará automáticamente a <strong>EN_ESPERA</strong>.
            </p>
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
              className="btn-cyber-neon text-white font-bold px-6 py-2 rounded-xl cursor-pointer shadow-lg shadow-purple-500/20">
              Registrar Celo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
