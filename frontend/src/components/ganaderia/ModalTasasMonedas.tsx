import { IconCoins } from "../../Icons";
import type { MonedasConfig } from "./tipos";

interface Props {
  tasaBCV: number;
  tasaCOP: number;
  monedasConfig: MonedasConfig;
  onGuardar: (tasaBcv: number, tasaCop: number, vesActivo: boolean, copActivo: boolean) => void;
  onCerrar: () => void;
}

/** Monedas activas de la finca (USD siempre) y tasas de cambio a Bs y COP. */
export default function ModalTasasMonedas({ tasaBCV, tasaCOP, monedasConfig, onGuardar, onCerrar }: Props) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="apple-glass modal-siempre-oscuro rounded-3xl p-6 sm:p-7 max-w-md w-full border border-emerald-500/40 text-left space-y-5 shadow-2xl bg-slate-900/95 text-white">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="text-emerald-400"><IconCoins size={20} /></span>
            <div>
              <h3 className="font-['Outfit'] font-black text-lg text-white">
                Configuración de Monedas & Tasas
              </h3>
              <p className="text-[11px] text-slate-400">Activa las monedas operativas de la finca y ajusta sus tasas</p>
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
            const bcv = parseFloat(String(fd.get("tasaBcv") || String(tasaBCV)));
            const cop = parseFloat(String(fd.get("tasaCop") || String(tasaCOP)));
            const vesActivo = fd.get("vesActivo") === "on";
            const copActivo = fd.get("copActivo") === "on";
            onGuardar(bcv > 0 ? bcv : tasaBCV, cop > 0 ? cop : tasaCOP, vesActivo, copActivo);
          }}
          className="space-y-4 text-xs"
        >
          {/* Selector de Monedas Activas */}
          <div className="space-y-2 p-3 rounded-2xl bg-white/5 border border-white/10">
            <label className="text-[11px] font-bold text-slate-300 block">
              Monedas Activas en esta Finca
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-bold text-emerald-400">USD ($)</span>
                  <span className="text-[10px] text-slate-400">Dólar Estadounidense (Moneda Base)</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">Fija</span>
              </div>

              <label className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-bold text-purple-400">VES (Bs.)</span>
                  <span className="text-[10px] text-slate-400">Bolívares (Tasa Oficial / Mercado)</span>
                </div>
                <input
                  name="vesActivo"
                  type="checkbox"
                  defaultChecked={monedasConfig.VES}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-bold text-sky-400">COP ($)</span>
                  <span className="text-[10px] text-slate-400">Pesos Colombianos (Frontera)</span>
                </div>
                <input
                  name="copActivo"
                  type="checkbox"
                  defaultChecked={monedasConfig.COP}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                />
              </label>
            </div>
          </div>

          {/* Inputs de Tasas */}
          <div>
            <label className="text-[11px] font-bold text-emerald-400 block mb-1">
              Tasa Bolívares (Bs. por 1 USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 tabular-nums font-bold text-xs">Bs.</span>
              <input
                name="tasaBcv"
                type="number"
                onFocus={e => e.target.select()}
                step="0.01"
                min="0.01"
                defaultValue={tasaBCV}
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-800/90 border border-white/15 text-white tabular-nums text-sm focus:border-emerald-500 focus:outline-none"
                placeholder="Ej. 850.00"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Usada para liquidar el ordeño y compras de ganado en moneda local. La tasa BCV oficial se carga sola 3 veces al día; aquí solo la cambias si quieres usar una propia.</p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-sky-400 block mb-1">
              Tasa Pesos Colombianos (COP por 1 USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 tabular-nums font-bold text-xs">COP $</span>
              <input
                name="tasaCop"
                type="number"
                onFocus={e => e.target.select()}
                step="1"
                min="1"
                defaultValue={tasaCOP}
                required
                className="w-full pl-14 pr-3 py-2.5 rounded-xl bg-slate-800/90 border border-white/15 text-white tabular-nums text-sm focus:border-sky-500 focus:outline-none"
                placeholder="4150"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Referencia fronteriza para transacciones y compras en efectivo.</p>
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer">
              Guardar Configuración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
