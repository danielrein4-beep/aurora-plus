import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-slate-200/80 border border-slate-300 flex items-center justify-center text-slate-500 mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1 className="font-['Outfit'] font-black text-4xl text-slate-900 tracking-tight mb-2">404</h1>
      <p className="text-slate-600 font-medium text-sm max-w-sm mb-6">
        La pagina que buscas no existe o ha sido movida a otra direccion.
      </p>
      <Link
        to="/"
        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
