import { useState } from "react";
import { IconEdit } from "../../Icons";
import { actualizarAnimalGanaderia, moverAnimalGanaderia, type AnimalGanaderia, type PotreroGanaderia } from "../../api";
import type { Notificar } from "./tipos";
import SelectorRaza from "./SelectorRaza";

interface Props {
  animal: AnimalGanaderia;
  potreros: PotreroGanaderia[];
  notificar: Notificar;
  /** Datos ya guardados (incluye el potrero nuevo si se movió). */
  onActualizado: (actualizado: AnimalGanaderia) => void;
  onCerrar: () => void;
}

/** Edición de la ficha de un animal; si cambia de potrero lo mueve y queda en su kardex. */
export default function ModalEditarAnimal({ animal, potreros, notificar, onActualizado, onCerrar }: Props) {
  // Precargado con los datos reales del animal.
  const [formEditarAnimal, setFormEditarAnimal] = useState({
    nombre: animal.nombre || "",
    raza: animal.raza || "",
    tipoAnimal: animal.tipoAnimal || "VACA",
    pesoActual: Number(animal.pesoActual) || 0,
    lote: animal.lote || "",
    potreroId: animal.potrero?.id || 0,
    estadoReproductivo: (animal.estadoReproductivo as any) || "VACIA",
    estadoProductivo: (animal.estadoProductivo as any) || "SECA",
  });

  // Guarda los cambios del animal (PUT) y, si cambió de potrero, lo mueve por separado
  // (POST /mover) para que quede el kardex de ubicación correcto.
  const handleGuardarEdicionAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const datos: any = {
        nombre: formEditarAnimal.nombre.trim() || undefined,
        raza: formEditarAnimal.raza.trim() || undefined,
        tipoAnimal: formEditarAnimal.tipoAnimal,
        pesoActual: Number(formEditarAnimal.pesoActual) || undefined,
        lote: formEditarAnimal.lote.trim() || undefined,
      };
      if (animal.sexo === "HEMBRA") {
        datos.estadoReproductivo = formEditarAnimal.estadoReproductivo;
        datos.estadoProductivo = formEditarAnimal.estadoProductivo;
      }

      const actualizado = await actualizarAnimalGanaderia(animal.id, datos);

      const potreroCambio = formEditarAnimal.potreroId && formEditarAnimal.potreroId !== animal.potrero?.id;
      if (potreroCambio) {
        await moverAnimalGanaderia(animal.id, Number(formEditarAnimal.potreroId), "Edición de ficha del animal");
        const potreroNuevo = potreros.find(p => p.id === Number(formEditarAnimal.potreroId));
        actualizado.potrero = potreroNuevo;
      }

      onActualizado(actualizado);
      notificar(`Animal arete ${animal.arete} actualizado.`);
      onCerrar();
    } catch {
      notificar(`No se pudo actualizar el animal arete ${animal.arete} — revisa tu conexión e inténtalo de nuevo.`);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/60 backdrop-blur-md">
      <div className="apple-glass rounded-3xl p-5 sm:p-8 my-2 sm:my-0 min-w-0 max-w-lg w-full border border-emerald-500/30 text-left space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
              <IconEdit size={18} />
              <span>Editar Animal</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/60 mt-1">
              Arete: <strong className="text-emerald-400">{animal.arete}</strong> (no editable — es la identidad del animal)
            </p>
          </div>
          <button
            onClick={() => onCerrar()}
            className="text-slate-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleGuardarEdicionAnimal} className="space-y-4 text-xs">
          <div className="grid [&>*]:min-w-0 grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Nombre</label>
              <input
                type="text"
                value={formEditarAnimal.nombre}
                onChange={e => setFormEditarAnimal({ ...formEditarAnimal, nombre: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Raza</label>
              <SelectorRaza
                value={formEditarAnimal.raza}
                onChange={raza => setFormEditarAnimal({ ...formEditarAnimal, raza })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid [&>*]:min-w-0 grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Categoría</label>
              <select
                value={formEditarAnimal.tipoAnimal}
                onChange={e => setFormEditarAnimal({ ...formEditarAnimal, tipoAnimal: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                {(animal.sexo === "HEMBRA"
                  ? ["VACA", "NOVILLA", "MAUTA", "BECERRA"]
                  : ["TORO", "NOVILLO", "MAUTE", "TERNERO"]
                ).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Peso Actual (kg)</label>
              <input
                type="number"
                onFocus={e => e.target.select()}
                value={formEditarAnimal.pesoActual}
                onChange={e => setFormEditarAnimal({ ...formEditarAnimal, pesoActual: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid [&>*]:min-w-0 grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Potrero Asignado</label>
              <select
                value={formEditarAnimal.potreroId}
                onChange={e => setFormEditarAnimal({ ...formEditarAnimal, potreroId: Number(e.target.value) })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                <option value={0}>Sin potrero</option>
                {potreros.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Lote</label>
              <input
                type="text"
                value={formEditarAnimal.lote}
                onChange={e => setFormEditarAnimal({ ...formEditarAnimal, lote: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {animal.sexo === "HEMBRA" && (
            <div className="grid [&>*]:min-w-0 grid-cols-2 gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <div>
                <label className="text-slate-400 block mb-1">Estado Reproductivo</label>
                <select
                  value={formEditarAnimal.estadoReproductivo}
                  onChange={e => setFormEditarAnimal({ ...formEditarAnimal, estadoReproductivo: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                  <option value="VACIA">Vacía</option>
                  <option value="PREÑADA">Preñada</option>
                  <option value="EN_ESPERA">En Espera (Celo / IA)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Estado Productivo</label>
                <select
                  value={formEditarAnimal.estadoProductivo}
                  onChange={e => setFormEditarAnimal({ ...formEditarAnimal, estadoProductivo: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white">
                  <option value="SECA">Seca</option>
                  <option value="ORDEÑO">En Ordeño</option>
                  <option value="CRIANDO">Criando / Amamantando</option>
                </select>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onCerrar()}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-cyber-neon text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer">
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
