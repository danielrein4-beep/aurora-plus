
import { IconMilk } from "../../Icons";

interface Props {
  precioLecheUSD: number;
  onGuardar: (precio: number) => void;
  onCerrar: () => void;
}

/** Precio base del litro de leche en USD: lo toman el ordeño y los despachos. */
export default function ModalPrecioLeche({ precioLecheUSD, onGuardar, onCerrar }: Props) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="apple-glass modal-siempre-oscuro rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-sky-500/40 text-left space-y-4 shadow-2xl bg-slate-900/95 text-white">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="text-sky-400"><IconMilk size={26} /></span>
            <div>
              <h3 className="font-['Outfit'] font-black text-lg text-white">
                Precio Base de la Leche
              </h3>
              <p className="text-[11px] text-slate-400">Valor de referencia por litro en USD</p>
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
            const precio = parseFloat(String(fd.get("precioLeche") || "0"));
            if (precio > 0) {
              onGuardar(precio);
            }
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="text-[11px] font-bold text-sky-400 block mb-1">
              Precio por Litro (USD $)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 tabular-nums font-bold text-sm">$</span>
              <input
                name="precioLeche"
                type="number"
                onFocus={e => e.target.select()}
                step="0.01"
                min="0.01"
                defaultValue={precioLecheUSD}
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/90 border border-white/15 text-white tabular-nums text-base font-bold focus:border-sky-500 focus:outline-none"
                placeholder="0.55"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Este precio se sincroniza automáticamente en la sala de ordeño, Modo Vaquera Rápida y los despachos de tanque.
            </p>
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
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer">
              Guardar Precio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
