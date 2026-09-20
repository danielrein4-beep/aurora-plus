import React from "react";
import { IconScissors } from "../Icons";

export default function PeluqueriaApp({ onSalir }: { onSalir?: () => void }) {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6 shadow-xl shadow-rose-500/10">
        <IconScissors size={38} className="text-rose-400" />
      </div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 text-xs font-semibold mb-4 border border-rose-500/20">
        <span>Próximamente en Aurora Plus</span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
        Módulo de Peluquería & Salón de Belleza
      </h1>
      <p className="text-sm text-slate-400 max-w-lg mb-8 leading-relaxed">
        Esta vertical se encuentra en desarrollo activo y fase de pruebas de arquitectura multitenant. No se expone en rutas de producción ni release candidates con datos simulados ni tasas fijas.
      </p>
      {onSalir && (
        <button
          onClick={onSalir}
          className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-all border border-white/10 shadow-lg"
        >
          Volver al Dashboard
        </button>
      )}
    </div>
  );
}
