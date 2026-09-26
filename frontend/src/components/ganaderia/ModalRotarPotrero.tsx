import { useState } from "react";
import { rotarPotreroGanaderia, type PotreroGanaderia } from "../../api";
import { encolarAccionGanaderia, esFalloDeConexion, generarClaveIdempotencia } from "../../offlineQueueGanaderia";
import type { Notificar } from "./tipos";

interface Props {
  origen: PotreroGanaderia;
  potreros: PotreroGanaderia[];
  tenantId: number;
  notificar: Notificar;
  /** Rotación hecha (o encolada sin señal, offline = true): el padre actualiza los potreros. */
  onRotado: (origenId: number, destinoId: number, offline: boolean) => void;
  onCerrar: () => void;
}

/** Mueve el hato de un potrero a otro: el origen entra en descanso y el destino en uso. */
export default function ModalRotarPotrero({ origen, potreros, tenantId, notificar, onRotado, onCerrar }: Props) {
  // El destino por defecto es el primer potrero distinto del origen, nunca un id inventado.
  const [potreroDestinoId, setPotreroDestinoId] = useState<number>(() => potreros.find(p => p.id !== origen.id)?.id ?? 0);

  // Manejador: Rotar potrero
  const handleEjecutarRotacion = async () => {
    // La clave se crea antes del primer intento: si el servidor alcanzó a rotar y la señal se cortó
    // antes de la respuesta, el reenvío desde la cola lleva la misma clave y no rota dos veces.
    const claveIdempotencia = generarClaveIdempotencia();
    const nombreDestino = potreros.find(p => p.id === potreroDestinoId)?.nombre;
    try {
      await rotarPotreroGanaderia(origen.id, tenantId, potreroDestinoId, undefined, claveIdempotencia);
    } catch (err) {
      if (esFalloDeConexion(err)) {
        encolarAccionGanaderia(tenantId, {
          tipo: "rotar_potrero",
          id: generarClaveIdempotencia(),
          claveIdempotencia,
          descripcion: `Rotación de ${origen.nombre} a ${nombreDestino ?? `potrero #${potreroDestinoId}`}`,
          creadaEn: Date.now(),
          payload: {
            potreroOrigenId: origen.id,
            potreroDestinoId: potreroDestinoId,
            nombreOrigen: origen.nombre,
            nombreDestino,
          }
        });
        onRotado(origen.id, potreroDestinoId, true);
        onCerrar();
        notificar(`Rotacion guardada en Modo Campo (offline). Se sincronizara al volver a tener senal.`);
        return;
      }
      notificar(`No se pudo rotar el hato de ${origen.nombre} — revisa tu conexión e inténtalo de nuevo.`);
      return;
    }

    onRotado(origen.id, potreroDestinoId, false);

    notificar(`Hato rotado de ${origen.nombre} al destino.`);
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/60 backdrop-blur-md">
      <div className="apple-glass rounded-3xl p-5 sm:p-8 my-2 sm:my-0 min-w-0 max-w-md w-full border border-emerald-500/30 text-left space-y-4">
        <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
          Rotación de Potrero
        </h3>
        <p className="text-xs text-slate-500 dark:text-white/60">
          Mover el hato del potrero <strong className="text-emerald-400">{origen.nombre}</strong> a un nuevo potrero. El origen pasará automáticamente a estado <strong>EN DESCANSO</strong> para recuperar el pasto.
        </p>

        <div className="space-y-2 text-xs">
          <label className="text-slate-400 block">Seleccionar Potrero Destino:</label>
          <select
            value={potreroDestinoId}
            onChange={e => setPotreroDestinoId(Number(e.target.value))}
            className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-slate-900 dark:text-white font-bold">
            {potreros.filter(p => p.id !== origen.id).map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.tipoPasto || "Pasto"}) • {p.estado}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={() => onCerrar()}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
            Cancelar
          </button>
          <button
            onClick={handleEjecutarRotacion}
            className="btn-cyber-neon text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer">
            Confirmar Rotación
          </button>
        </div>
      </div>
    </div>
  );
}
