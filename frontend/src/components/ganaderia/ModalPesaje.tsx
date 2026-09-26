import { useState } from "react";
import { registrarPesoGanaderia, obtenerGdpGanaderia, type AnimalGanaderia } from "../../api";
import { encolarAccionGanaderia, esFalloDeConexion, generarClaveIdempotencia } from "../../offlineQueueGanaderia";
import ModalBasculaBluetooth from "../ModalBasculaBluetooth";
import type { Notificar } from "./tipos";

interface Props {
  animal: AnimalGanaderia;
  tenantId: number;
  notificar: Notificar;
  /** Peso guardado (o encolado sin señal): el padre actualiza el peso del animal. */
  onPesado: (peso: number) => void;
  /** Se guardó en la cola offline: el padre refresca el contador de pendientes. */
  onEncolado: () => void;
  onCerrar: () => void;
}

/** Pesaje de un animal, a mano o con la balanza Bluetooth, y su ganancia diaria (GDP). */
export default function ModalPesaje({ animal, tenantId, notificar, onPesado, onEncolado, onCerrar }: Props) {
  const [pesoNuevo, setPesoNuevo] = useState<number>(animal.pesoActual || 400);
  const [gdpData, setGdpData] = useState<any>(null);
  const [modalBasculaAbierto, setModalBasculaAbierto] = useState(false);

  // Manejador: Registrar pesaje con soporte offline y balanza digital
  const handleGuardarPesaje = async (e: React.FormEvent) => {
    e.preventDefault();
    // Misma clave en el primer intento y en la cola: si el servidor guardó y la señal se cortó
    // antes de la respuesta, el reenvío no duplica el pesaje.
    const claveIdempotencia = generarClaveIdempotencia();
    try {
      await registrarPesoGanaderia(tenantId, animal.id, Number(pesoNuevo), undefined, claveIdempotencia);
      const resGdp = await obtenerGdpGanaderia(animal.id).catch(() => null);
      if (resGdp) setGdpData(resGdp);
      onPesado(Number(pesoNuevo));
      notificar(`Pesaje registrado: ${pesoNuevo} kg.`);
      setTimeout(() => {
        onCerrar();
      }, 1500);
    } catch (err) {
      if (esFalloDeConexion(err)) {
        encolarAccionGanaderia(tenantId, {
          tipo: "registrar_peso",
          id: generarClaveIdempotencia(),
          claveIdempotencia,
          descripcion: `Pesaje ${animal.nombre || animal.arete}: ${pesoNuevo} kg`,
          creadaEn: Date.now(),
          payload: {
            animalId: animal.id,
            peso: Number(pesoNuevo),
            nombreAnimal: animal.nombre,
            arete: animal.arete,
          }
        });
        onEncolado();
        onPesado(Number(pesoNuevo));
        notificar(`Pesaje guardado en Modo Campo (sin conexion). Se sincronizara automaticamente.`);
        setTimeout(() => {
          onCerrar();
        }, 1500);
        return;
      }
      notificar("No se pudo registrar el pesaje en este momento.");
    }
  };

  return (
    <>
      <ModalBasculaBluetooth
        abierto={modalBasculaAbierto}
        onCerrar={() => setModalBasculaAbierto(false)}
        onCapturarPeso={(pesoCapturado) => {
          setPesoNuevo(pesoCapturado);
          notificar(`Peso capturado de balanza: ${pesoCapturado} kg`);
        }}
        animalNombre={animal.nombre}
        animalArete={animal.arete}
        pesoAnterior={animal.pesoActual}
      />

      <div className="fixed inset-0 z-[2000] flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/60 backdrop-blur-md">
        <div className="apple-glass rounded-3xl p-5 sm:p-8 my-2 sm:my-0 min-w-0 max-w-md w-full border border-emerald-500/30 text-left space-y-4">
          <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
            Pesaje: {animal.nombre || animal.arete}
          </h3>
          <p className="text-xs text-slate-500 dark:text-white/60">
            Arete: <strong className="text-emerald-400">{animal.arete}</strong> • Raza: {animal.raza}
          </p>

          <form onSubmit={handleGuardarPesaje} className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-400 block">Nuevo Peso (kg) *</label>
                <button
                  type="button"
                  onClick={() => setModalBasculaAbierto(true)}
                  className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19l6-6-6-6m6 6l-6-6 6 6-6 6" />
                  </svg>
                  <span>Conectar Balanza Digital</span>
                </button>
              </div>
              <input
                type="number"
                onFocus={e => e.target.select()}
                step="0.5"
                required
                value={pesoNuevo}
                onChange={e => setPesoNuevo(Number(e.target.value))}
                className="w-full p-3 rounded-2xl bg-white/5 border border-white/15 text-emerald-400 font-['Outfit'] font-black text-3xl text-center"
              />
            </div>

            {gdpData && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                <div className="text-emerald-400 font-bold">Ganancia Diaria de Peso (GDP):</div>
                <div className="font-['Outfit'] font-black text-lg text-white">
                  {gdpData.gdpKgDia ? `+${gdpData.gdpKgDia} kg/día` : "Calculando..."}
                </div>
                <div className="text-[10px] text-slate-400">Total acumulado: +{gdpData.gananciaTotalKg} kg en {gdpData.dias} días</div>
              </div>
            )}

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => onCerrar()}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                Cerrar
              </button>
              <button
                type="submit"
                className="btn-cyber-neon text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer">
                Registrar Pesaje
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
