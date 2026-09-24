import { useState } from "react";
import { IconWarning } from "../../Icons";
import { registrarMastitisGanaderia, type AnimalGanaderia } from "../../api";
import { fechaLocalISO } from "../ReportesCampoGanaderia";
import type { Notificar } from "./tipos";

interface Props {
  animales: AnimalGanaderia[];
  animalesActivos: AnimalGanaderia[];
  tenantId: number;
  notificar: Notificar;
  onCerrar: () => void;
}

/** Mastitis con prueba CMT: tratamiento, cuarto afectado y días de retiro de la leche. */
export default function ModalMastitis({ animales, animalesActivos, tenantId, notificar, onCerrar }: Props) {
  // Formulario de Mastitis (Sanidad dedicada con retiro de leche)
  const [formMastitis, setFormMastitis] = useState({
    animalId: animalesActivos.find(a => a.sexo === "HEMBRA")?.id ?? 0,
    fecha: fechaLocalISO(),
    cuartoAfectado: "PD",
    gradoCmt: "GRADO_2",
    farmacoAplicado: "",
    diasRetiroLeche: 0,
    veterinario: "",
    costo: 0,
    notas: "",
  });

  // Manejador: Registrar Mastitis (Sanidad dedicada con retiro de leche)
  const handleGuardarMastitis = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registrarMastitisGanaderia(tenantId, {
        animalId: Number(formMastitis.animalId),
        fecha: formMastitis.fecha,
        cuartoAfectado: formMastitis.cuartoAfectado,
        gradoCmt: formMastitis.gradoCmt,
        farmacoAplicado: formMastitis.farmacoAplicado,
        diasRetiroLeche: Number(formMastitis.diasRetiroLeche),
        veterinario: formMastitis.veterinario,
        costo: Number(formMastitis.costo),
        notas: formMastitis.notas,
      });
      const vaca = animales.find(a => a.id === Number(formMastitis.animalId));
      notificar(`Alerta sanitaria: Mastitis registrada en ${vaca?.arete || 'vaca'}. Cuarto ${formMastitis.cuartoAfectado} en tratamiento. Bloqueo de leche activo por ${formMastitis.diasRetiroLeche} días.`);
    } catch {
      notificar("No se pudo registrar el tratamiento de mastitis — revisa tu conexión.");
      return;
    }
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-rose-500/40 text-left space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-rose-400"><IconWarning size={20} /></span>
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
              Diagnóstico y Tratamiento de Mastitis
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onCerrar()}
            className="text-slate-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleGuardarMastitis} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Vaca Afectada *</label>
            <select
              required
              value={formMastitis.animalId}
              onChange={e => setFormMastitis({ ...formMastitis, animalId: Number(e.target.value) })}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold">
              {animalesActivos.filter(a => a.sexo === "HEMBRA").map(a => (
                <option key={a.id} value={a.id}>
                  {a.arete} - {a.nombre || a.tipoAnimal} ({a.raza || "Bovino"}) · Potrero: {a.potrero?.nombre || "Sin Potrero"}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Cuarto Mamario Afectado *</label>
              <select
                value={formMastitis.cuartoAfectado}
                onChange={e => setFormMastitis({ ...formMastitis, cuartoAfectado: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold">
                <option value="AD">AD (Anterior Derecho)</option>
                <option value="AI">AI (Anterior Izquierdo)</option>
                <option value="PD">PD (Posterior Derecho)</option>
                <option value="PI">PI (Posterior Izquierdo)</option>
                <option value="MULTIPLES">Múltiples Cuartos</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Severidad / Prueba CMT</label>
              <select
                value={formMastitis.gradoCmt}
                onChange={e => setFormMastitis({ ...formMastitis, gradoCmt: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white font-bold">
                <option value="TRAZAS">Trazas (Subclínica leve)</option>
                <option value="GRADO_1">Grado 1 (Gel ligero sin grumos)</option>
                <option value="GRADO_2">Grado 2 (Gel espeso marcado)</option>
                <option value="GRADO_3">Grado 3 (Clínica aguda / Cuajo)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Fármaco Intramamario / Antibiótico</label>
              <input
                type="text"
                required
                value={formMastitis.farmacoAplicado}
                onChange={e => setFormMastitis({ ...formMastitis, farmacoAplicado: e.target.value })}
                placeholder="Ej. Cefalexina Intramamaria"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
              />
            </div>
            <div>
              <label className="text-rose-400 block mb-1 font-bold">Días de Retiro de Leche *</label>
              <input
                type="number"
                onFocus={e => e.target.select()}
                min="1"
                max="30"
                required
                placeholder="Ej. 4"
                value={formMastitis.diasRetiroLeche || ""}
                onChange={e => setFormMastitis({ ...formMastitis, diasRetiroLeche: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-rose-500/40 text-rose-300 tabular-nums font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Veterinario / Técnico</label>
              <input
                type="text"
                value={formMastitis.veterinario}
                onChange={e => setFormMastitis({ ...formMastitis, veterinario: e.target.value })}
                placeholder="Ej. Dr. González"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Costo Estimado Tratamiento (USD)</label>
              <input
                type="number"
                onFocus={e => e.target.select()}
                step="0.5"
                min="0"
                placeholder="0,00"
                value={formMastitis.costo || ""}
                onChange={e => setFormMastitis({ ...formMastitis, costo: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/15 text-white tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Notas Clínicas</label>
            <textarea
              rows={2}
              value={formMastitis.notas}
              onChange={e => setFormMastitis({ ...formMastitis, notas: e.target.value })}
              placeholder="Detalles de síntomas o respuesta al tratamiento..."
              className="w-full p-2 rounded-xl bg-slate-900 border border-white/15 text-white text-xs"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 flex items-center gap-2">
            <IconWarning size={14} />
            <span>La leche de esta vaca quedará bloqueada en las alertas sanitarias y en el modo de ordeño diario durante el período de retiro.</span>
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
              className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer transition-colors shadow-lg shadow-rose-600/30">
              Registrar Tratamiento & Alerta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
