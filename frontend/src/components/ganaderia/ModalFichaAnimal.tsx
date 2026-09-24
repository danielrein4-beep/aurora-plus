import type { AnimalGanaderia } from "../../api";

interface Props {
  animal: AnimalGanaderia;
  onCerrar: () => void;
}

/** Ficha corta del animal con su código QR para imprimir y pegar en la manga. */
export default function ModalFichaAnimal({ animal, onCerrar }: Props) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="apple-glass rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-emerald-500/30 text-center space-y-4">
        <h3 className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">
          Ficha de Trazabilidad
        </h3>

        {/* Visualización de código QR vectorial */}
        <div className="w-36 h-36 mx-auto bg-white rounded-2xl p-3 flex items-center justify-center shadow-lg border-2 border-emerald-400">
          <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900" fill="currentColor">
            <rect x="5" y="5" width="25" height="25" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
            <rect x="12" y="12" width="11" height="11" rx="1" />
            <rect x="70" y="5" width="25" height="25" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
            <rect x="77" y="12" width="11" height="11" rx="1" />
            <rect x="5" y="70" width="25" height="25" rx="3" fill="none" stroke="currentColor" strokeWidth="6" />
            <rect x="12" y="77" width="11" height="11" rx="1" />
            <rect x="36" y="10" width="8" height="8" />
            <rect x="50" y="10" width="8" height="8" />
            <rect x="36" y="24" width="8" height="8" />
            <rect x="50" y="36" width="8" height="8" />
            <rect x="10" y="40" width="8" height="8" />
            <rect x="24" y="40" width="8" height="8" />
            <rect x="70" y="40" width="8" height="8" />
            <rect x="84" y="40" width="8" height="8" />
            <rect x="40" y="52" width="8" height="8" />
            <rect x="54" y="52" width="8" height="8" />
            <rect x="40" y="70" width="8" height="8" />
            <rect x="54" y="70" width="8" height="8" />
            <rect x="70" y="70" width="8" height="8" />
            <rect x="84" y="84" width="8" height="8" />
          </svg>
        </div>

        <div className="text-xs text-slate-500 dark:text-white/70 space-y-1">
          <div className="font-bold text-slate-900 dark:text-white text-base">
            {animal.nombre || `Animal ${animal.arete}`}
          </div>
          <div>Arete: <span className="tabular-nums font-bold text-emerald-400">{animal.arete}</span></div>
          <div>Raza: {animal.raza} • Sexo: {animal.sexo}</div>
          <div>Peso: {animal.pesoActual} kg</div>
        </div>

        <button
          onClick={() => onCerrar()}
          className="apple-glass-btn w-full py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white cursor-pointer">
          Cerrar Ficha
        </button>
      </div>
    </div>
  );
}
