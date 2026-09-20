import React from "react";
import { IconCalendar } from "../../Icons";

export default function PortalReservasPublico() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
        <IconCalendar size={32} className="text-rose-400" />
      </div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 text-xs font-semibold mb-4 border border-rose-500/20">
        <span>Portal de Citas en Preparación</span>
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Portal de Reservas en Línea</h1>
      <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
        El servicio de reservas públicas para salones de belleza estará disponible próximamente en producción.
      </p>
      <a
        href="/"
        className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm border border-white/10 transition-all"
      >
        Ir a Aurora Plus
      </a>
    </div>
  );
}
