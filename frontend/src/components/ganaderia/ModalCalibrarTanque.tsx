import { configurarTanqueLeche, type TanqueLeche } from "../../api";
import { IconSettings } from "../../Icons";
import type { Notificar } from "./tipos";

interface Props {
  tanqueLeche: TanqueLeche | null;
  tenantId: number;
  notificar: Notificar;
  onAjustado: (tanque: TanqueLeche) => void;
  onCerrar: () => void;
}

/** Calibración del tanque: capacidad, temperatura y ajuste del stock con la vara medidora. */
export default function ModalCalibrarTanque({ tanqueLeche, tenantId, notificar, onAjustado, onCerrar }: Props) {
  // Manejador: Ajuste / Calibración de Tanque
  const handleAjustarTanque = async (capacidad: number, temp: number, stockAjuste: number) => {
    try {
      const res = await configurarTanqueLeche(tenantId, {
        capacidadLitros: capacidad,
        temperaturaCelsius: temp,
        stockAjuste: stockAjuste,
      });
      onAjustado(res);
      onCerrar();
      notificar("Tanque de leche calibrado exitosamente.");
    } catch {
      notificar("No se pudo guardar la configuración del tanque.");
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="apple-glass modal-siempre-oscuro rounded-3xl p-6 sm:p-7 max-w-md w-full border border-sky-500/40 text-left space-y-4 shadow-2xl bg-slate-900/95 text-white font-['Inter']">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="text-sky-400"><IconSettings size={20} /></span>
            <div>
              <h3 className="font-['Outfit'] font-black text-lg text-white">
                Calibrar Tanque de Leche
              </h3>
              <p className="text-[11px] text-slate-400">Ajuste técnico de capacidad y vara medidora</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onCerrar()}
            className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer">
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const cap = parseFloat(String(fd.get("capacidad") || "2000"));
            const temp = parseFloat(String(fd.get("temperatura") || "4.0"));
            const stock = parseFloat(String(fd.get("stock") || "0"));
            handleAjustarTanque(cap, temp, stock);
          }}
          className="space-y-3.5 text-xs"
        >
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Capacidad Total del Tanque (Litros)</label>
            <input
              name="capacidad"
              type="number"
              onFocus={e => e.target.select()}
              step="50"
              min="100"
              defaultValue={tanqueLeche?.capacidadLitros ?? 2000}
              required
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white font-mono text-sm focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Temperatura de Enfriamiento (°C)</label>
            <input
              name="temperatura"
              type="number"
              onFocus={e => e.target.select()}
              step="0.1"
              defaultValue={tanqueLeche?.temperaturaCelsius ?? 4.0}
              required
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-white/15 text-white font-mono text-sm focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-sky-400 block mb-1">Stock Actual Calibrado (Litros)</label>
            <input
              name="stock"
              type="number"
              onFocus={e => e.target.select()}
              step="0.5"
              min="0"
              defaultValue={tanqueLeche?.stockActualLitros ?? 0}
              required
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-sky-500/40 text-sky-300 font-mono text-sm font-bold focus:border-sky-400 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">Útil tras aforar la regla o realizar limpieza técnica del tanque.</p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => onCerrar()}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer">
              Guardar Calibración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
