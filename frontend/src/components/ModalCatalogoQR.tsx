import React, { useState, useEffect } from "react";

// El objeto de sesion completo vive en localStorage["aurora_token"] (JSON.stringify),
// no el JWT crudo — hay que extraer el campo .token antes de mandarlo como Bearer.
function obtenerTokenSesion(): string {
  try {
    const raw = localStorage.getItem("aurora_token");
    if (!raw) return "";
    return JSON.parse(raw).token || "";
  } catch {
    return "";
  }
}

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

function SvgPhone({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

interface Props {
  tenantId: number;
  nombreNegocio?: string;
  onClose: () => void;
}

export default function ModalCatalogoQR({ tenantId, nombreNegocio, onClose }: Props) {
  const [tab, setTab] = useState<"qr" | "pago_movil">("qr");
  const [copiado, setCopiado] = useState(false);

  // Formulario Pago Movil
  const [banco, setBanco] = useState("0102 - Banco de Venezuela");
  const [telefono, setTelefono] = useState("");
  const [documento, setDocumento] = useState("");
  const [titular, setTitular] = useState("");
  const [guardandoPm, setGuardandoPm] = useState(false);
  const [mensajePm, setMensajePm] = useState<string | null>(null);

  const urlPublica = `${window.location.origin}/catalogo/${tenantId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(urlPublica)}&color=0f172a&bgcolor=f8fafc`;

  useEffect(() => {
    fetch(`/api/comercio/catalogo/pago-movil`, {
      headers: { Authorization: `Bearer ${obtenerTokenSesion()}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.banco) setBanco(data.banco);
        if (data.telefono) setTelefono(data.telefono);
        if (data.documento) setDocumento(data.documento);
        if (data.titular) setTitular(data.titular);
      })
      .catch(() => {});
  }, [tenantId]);

  const handleCopiar = () => {
    navigator.clipboard.writeText(urlPublica);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  const handleGuardarPagoMovil = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoPm(true);
    setMensajePm(null);
    try {
      const res = await fetch(`/api/comercio/catalogo/pago-movil`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${obtenerTokenSesion()}` },
        body: JSON.stringify({
          banco: banco.trim(),
          telefono: telefono.trim(),
          documento: documento.trim(),
          titular: titular.trim(),
          activo: true
        })
      });
      if (res.ok) {
        setMensajePm("Datos de Pago Movil actualizados con exito.");
        setTimeout(() => setMensajePm(null), 4000);
      } else {
        throw new Error("Error al guardar");
      }
    } catch {
      setMensajePm("No se pudieron guardar los datos.");
    } finally {
      setGuardandoPm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-500 flex items-center justify-center">
              {tab === "qr" ? <SvgQr className="w-5 h-5" /> : <SvgPhone className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-['Outfit'] font-black text-base sm:text-lg text-slate-900 dark:text-white">
                {tab === "qr" ? "Mi Catálogo Online & QR" : "Configuración de Pago Móvil"}
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

        {/* Segmented Tabs */}
        <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab("qr")}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              tab === "qr"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Enlace & QR
          </button>
          <button
            type="button"
            onClick={() => setTab("pago_movil")}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              tab === "pago_movil"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Datos Pago Móvil
          </button>
        </div>

        {tab === "qr" ? (
          <>
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

            {/* Acciones de Navegacion */}
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
          </>
        ) : (
          <form onSubmit={handleGuardarPagoMovil} className="space-y-3.5">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Estos datos se le mostrarán a tus clientes en el catálogo digital cuando elijan pagar por Pago Móvil.
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Banco Receptor
              </label>
              <input
                type="text"
                required
                placeholder="Ej: 0102 - Banco de Venezuela"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Teléfono de Pago Móvil
              </label>
              <input
                type="tel"
                required
                placeholder="Ej: 04141234567"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Cédula o RIF del Titular
              </label>
              <input
                type="text"
                required
                placeholder="Ej: J-12345678-0 o V-12345678"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Nombre o Razón Social del Titular
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Mi Negocio C.A."
                value={titular}
                onChange={(e) => setTitular(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold"
              />
            </div>

            {mensajePm && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center">
                {mensajePm}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="submit"
                disabled={guardandoPm}
                className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all"
              >
                {guardandoPm ? "Guardando..." : "Guardar Datos de Pago Móvil"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cerrar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
