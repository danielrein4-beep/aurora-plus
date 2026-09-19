import React, { useState } from "react";

function SvgClose({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SvgCopy({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function SvgExternal({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function SvgCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SvgQr({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  );
}

interface Props {
  tenantId: number;
  nombreNegocio?: string;
  onClose: () => void;
}

export default function ModalCatalogoQR({ tenantId, nombreNegocio, onClose }: Props) {
  const [copiado, setCopiado] = useState(false);
  const urlPublica = `${window.location.origin}/catalogo/${tenantId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(urlPublica)}&color=0f172a&bgcolor=f8fafc`;

  const handleCopiar = () => {
    navigator.clipboard.writeText(urlPublica);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-500 flex items-center justify-center">
              <SvgQr className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Outfit'] font-black text-base sm:text-lg text-slate-900 dark:text-white">
                Mi Catálogo Online & QR
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {nombreNegocio || "Tienda Comercial"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <SvgClose className="w-5 h-5" />
          </button>
        </div>

        {/* Contenedor del QR */}
        <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center">
          <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
            <img
              src={qrUrl}
              alt="Codigo QR Catalogo"
              className="w-44 h-44 object-contain rounded-lg"
            />
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-3">
            Escanea desde cualquier teléfono para abrir la tienda
          </span>
        </div>

        {/* Enlace y Botones */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
            Enlace Público de la Tienda
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={urlPublica}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 font-mono text-xs select-all"
            />
            <button
              type="button"
              onClick={handleCopiar}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-sm transition-all"
            >
              {copiado ? <SvgCheck className="w-4 h-4" /> : <SvgCopy className="w-4 h-4" />}
              <span>{copiado ? "Copiado" : "Copiar"}</span>
            </button>
          </div>
        </div>

        {/* Acciones de Navegación */}
        <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => window.open(urlPublica, "_blank")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
          >
            <SvgExternal className="w-4 h-4" />
            <span>Abrir en Nueva Pestaña</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
