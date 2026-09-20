import React from 'react';
import { IconConstruction } from '../Icons';

interface Props {
  onSalir?: () => void;
}

export default function ConstruccionApp({ onSalir }: Props) {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 shadow-xl shadow-amber-500/10">
        <IconConstruction size={38} className="text-amber-400" />
      </div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold mb-4 border border-amber-500/20">
        <span>En Construcción (Próximamente)</span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
        Vertical de Construcción & Obras Civiles Pro
      </h1>
      <p className="text-sm text-slate-400 max-w-lg mb-8 leading-relaxed">
        Esta vertical se encuentra en desarrollo activo y validación de arquitectura multitenant e idempotencia. La ruta y su interfaz operativa están bloqueadas mientras concluye la auditoría técnica.
      </p>
      {onSalir && (
        <button
          onClick={onSalir}
          className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-all border border-white/10 shadow-lg cursor-pointer"
        >
          Volver al Dashboard
        </button>
      )}
    </div>
  );
}
