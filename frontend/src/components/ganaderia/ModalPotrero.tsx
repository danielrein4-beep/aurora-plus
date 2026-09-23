import { useState } from "react";
import { crearPotreroGanaderia, actualizarPotreroGanaderia, type PotreroGanaderia } from "../../api";
import type { Notificar } from "./tipos";

export interface FormPotrero {
  codigo: string;
  nombre: string;
  areaHectareas: number;
  capacidadAnimales: number;
  tipoPasto: string;
  color: string;
  diasDescansoMinimo: number;
  observaciones: string;
  poligono: [number, number][] | undefined;
}

/** Formulario vacío para un potrero nuevo; `numero` es su posición en la lista. */
export function potreroVacio(numero: number): FormPotrero {
  return {
    codigo: `POT-0${numero}`,
    nombre: "",
    areaHectareas: 15.0,
    capacidadAnimales: 25,
    tipoPasto: "Brachiaria brizantha",
    color: "#10B981",
    diasDescansoMinimo: 28,
    observaciones: "",
    poligono: undefined,
  };
}

interface Props {
  inicial: FormPotrero;
  /** Id del potrero que se edita; null para crear uno nuevo. */
  editandoId: number | null;
  potreros: PotreroGanaderia[];
  tenantId: number;
  notificar: Notificar;
  onGuardado: (potrero: PotreroGanaderia, esEdicion: boolean) => void;
  onCerrar: () => void;
}

/** Alta o edición de un potrero: área, capacidad, pasto, descanso mínimo, color y polígono. */
export default function ModalPotrero({ inicial, editandoId, potreros, tenantId, notificar, onGuardado, onCerrar }: Props) {
  // Formulario nuevo potrero con color distintivo (estilo GanSoft)
  const [formPotrero, setFormPotrero] = useState<FormPotrero>(inicial);

  // Manejador: Crear nuevo potrero con color
  const handleGuardarPotrero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPotrero.nombre.trim()) return;

    const datos: Partial<PotreroGanaderia> = {
      codigo: formPotrero.codigo,
      nombre: formPotrero.nombre,
      areaHectareas: Number(formPotrero.areaHectareas),
      capacidadAnimales: Number(formPotrero.capacidadAnimales),
      tipoPasto: formPotrero.tipoPasto,
      color: formPotrero.color,
      diasDescansoMinimo: Number(formPotrero.diasDescansoMinimo),
      observaciones: formPotrero.observaciones,
      poligono: formPotrero.poligono,
    };

    let guardado: PotreroGanaderia;
    try {
      if (editandoId) {
        guardado = await actualizarPotreroGanaderia(editandoId, tenantId, datos);
      } else {
        guardado = await crearPotreroGanaderia(tenantId, {
          ...datos,
          estado: "ACTIVO",
          ordenRotacion: potreros.length + 1,
        });
      }
    } catch {
      notificar(`No se pudo guardar el potrero ${formPotrero.nombre} — revisa tu conexión e inténtalo de nuevo.`);
      return;
    }

    onGuardado(guardado, editandoId !== null);
    notificar(`Potrero ${guardado.nombre} (${guardado.areaHectareas} ha) guardado en el mapa satelital.`);
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-emerald-500/30 text-left space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
            Agregar Potrero
          </h3>
          <button
            onClick={() => onCerrar()}
            className="text-slate-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleGuardarPotrero} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Código *</label>
              <input
                type="text"
                required
                placeholder="Ej. POT-05"
                value={formPotrero.codigo}
                onChange={e => setFormPotrero({ ...formPotrero, codigo: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Descripción / Nombre *</label>
              <input
                type="text"
                required
                placeholder="Ej. Potrero La Esperanza"
                value={formPotrero.nombre}
                onChange={e => setFormPotrero({ ...formPotrero, nombre: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Pasto Predominante</label>
              <input
                type="text"
                placeholder="Ej. Brachiaria decumbens"
                value={formPotrero.tipoPasto}
                onChange={e => setFormPotrero({ ...formPotrero, tipoPasto: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Color Distintivo en el Mapa</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formPotrero.color}
                  onChange={e => setFormPotrero({ ...formPotrero, color: e.target.value })}
                  className="w-10 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                />
                <div className="flex items-center gap-1.5">
                  {["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444"].map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setFormPotrero({ ...formPotrero, color: c })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        formPotrero.color === c ? "scale-110 border-white" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Superficie (Hectáreas) *</label>
              <input
                type="number"
                onFocus={e => e.target.select()}
                step="0.1"
                required
                value={formPotrero.areaHectareas}
                onChange={e => setFormPotrero({ ...formPotrero, areaHectareas: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Capacidad Animal Máxima</label>
              <input
                type="number"
                onFocus={e => e.target.select()}
                value={formPotrero.capacidadAnimales}
                onChange={e => setFormPotrero({ ...formPotrero, capacidadAnimales: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Observaciones</label>
            <textarea
              rows={2}
              placeholder="Relieve, presencia de agua, tipo de cerca..."
              value={formPotrero.observaciones}
              onChange={e => setFormPotrero({ ...formPotrero, observaciones: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white resize-none"
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
              Guardar Potrero
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
