import React, { useState, useEffect, useRef } from "react";

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

function SvgStore({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v4a3 3 0 01-3 3 3 3 0 01-3-3 3 3 0 01-3 3 3 3 0 01-3-3 3 3 0 01-3-3V3zm1 7v10a1 1 0 001 1h14a1 1 0 001-1V10" />
    </svg>
  );
}

function SvgUpload({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

interface Props {
  tenantId: number;
  nombreNegocio?: string;
  onClose: () => void;
}

export default function ModalCatalogoQR({ tenantId, nombreNegocio, onClose }: Props) {
  const [tab, setTab] = useState<"qr" | "perfil" | "pago_movil">("qr");
  const [copiado, setCopiado] = useState(false);

  // Perfil Tienda
  const [nombreEmpresa, setNombreEmpresa] = useState(nombreNegocio || "");
  const [logoBase64, setLogoBase64] = useState("");
  const [telefonoWhatsapp, setTelefonoWhatsapp] = useState("");
  const [emailContacto, setEmailContacto] = useState("");
  const [slogan, setSlogan] = useState("");
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    // Cargar config de Pago Movil
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

    // Cargar perfil de la tienda
    fetch(`/api/comercio/catalogo/perfil-tienda`, {
      headers: { Authorization: `Bearer ${obtenerTokenSesion()}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.nombreEmpresa) setNombreEmpresa(data.nombreEmpresa);
        if (data.logoBase64) setLogoBase64(data.logoBase64);
        if (data.telefonoWhatsapp) setTelefonoWhatsapp(data.telefonoWhatsapp);
        if (data.emailContacto) setEmailContacto(data.emailContacto);
        if (data.domicilioFiscal) setSlogan(data.domicilioFiscal);
      })
      .catch(() => {});
  }, [tenantId]);

  const handleCopiar = () => {
    navigator.clipboard.writeText(urlPublica);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen no debe superar los 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoPerfil(true);
    setMensajePerfil(null);
    try {
      const res = await fetch(`/api/comercio/catalogo/perfil-tienda`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${obtenerTokenSesion()}` },
        body: JSON.stringify({
          nombreEmpresa: nombreEmpresa.trim(),
          logoBase64: logoBase64,
          telefonoWhatsapp: telefonoWhatsapp.trim(),
          emailContacto: emailContacto.trim(),
          domicilioFiscal: slogan.trim()
        })
      });
      if (res.ok) {
        setMensajePerfil("Perfil y Logo del catálogo actualizados con éxito.");
        setTimeout(() => setMensajePerfil(null), 4000);
      } else {
        throw new Error("Error al guardar perfil");
      }
    } catch {
      setMensajePerfil("No se pudo guardar la configuración de la tienda.");
    } finally {
      setGuardandoPerfil(false);
    }
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
        setMensajePm("Datos de Pago Móvil actualizados con éxito.");
        setTimeout(() => setMensajePm(null), 4000);
      } else {
        throw new Error("Error al guardar");
      }
    } catch {
      setMensajePm("No se pudieron guardar los datos de Pago Móvil.");
    } finally {
      setGuardandoPm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold">
              {tab === "qr" ? <SvgQr className="w-4 h-4" /> : tab === "perfil" ? <SvgStore className="w-4 h-4" /> : <SvgPhone className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-['Outfit'] font-black text-base sm:text-lg text-slate-900 dark:text-white">
                {tab === "qr" ? "Catálogo Online & QR" : tab === "perfil" ? "Personalizar Tienda & Logo" : "Configuración de Pago Móvil"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {nombreEmpresa || nombreNegocio || "Tienda Comercial"}
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
        <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab("qr")}
            className={`flex-1 py-2 rounded-xl transition-all ${
              tab === "qr"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Enlace & QR
          </button>
          <button
            type="button"
            onClick={() => setTab("perfil")}
            className={`flex-1 py-2 rounded-xl transition-all ${
              tab === "perfil"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Logo & Perfil
          </button>
          <button
            type="button"
            onClick={() => setTab("pago_movil")}
            className={`flex-1 py-2 rounded-xl transition-all ${
              tab === "pago_movil"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Pago Móvil
          </button>
        </div>

        {/* TAB 1: QR & Enlace */}
        {tab === "qr" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center p-5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <img
                src={qrUrl}
                alt="QR Catalogo Digital"
                className="w-44 h-44 rounded-xl border border-slate-300 dark:border-slate-700 p-2 bg-white shadow-md"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-3">
                Escanea para abrir tu catálogo digital
              </span>
              <span className="text-[11px] text-slate-500">
                Imprime o comparte este código en tu mostrador o redes sociales
              </span>
            </div>

            <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="text"
                readOnly
                value={urlPublica}
                className="bg-transparent flex-1 text-xs text-slate-700 dark:text-slate-300 font-mono px-2 outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopiar}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
              >
                {copiado ? <SvgCheck className="w-3.5 h-3.5" /> : <SvgCopy className="w-3.5 h-3.5" />}
                <span>{copiado ? "Copiado" : "Copiar"}</span>
              </button>
            </div>

            <div className="flex gap-2">
              <a
                href={urlPublica}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <SvgExternal className="w-4 h-4" />
                <span>Abrir Catálogo en Nueva Pestaña</span>
              </a>
            </div>
          </div>
        )}

        {/* TAB 2: Personalizar Perfil & Logo */}
        {tab === "perfil" && (
          <form onSubmit={handleGuardarPerfil} className="space-y-4">
            {mensajePerfil && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center">
                {mensajePerfil}
              </div>
            )}

            {/* Selector de Logo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Logo de la Tienda (Cabecera del Catálogo)
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                  {logoBase64 ? (
                    <img src={logoBase64} alt="Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="font-bold text-slate-400 text-base">
                      {(nombreEmpresa || "AP").substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                  >
                    <SvgUpload className="w-3.5 h-3.5" />
                    <span>{logoBase64 ? "Cambiar Logo" : "Subir Logo"}</span>
                  </button>
                  {logoBase64 && (
                    <button
                      type="button"
                      onClick={() => setLogoBase64("")}
                      className="text-[11px] text-rose-500 hover:underline block"
                    >
                      Eliminar logo actual
                    </button>
                  )}
                  <p className="text-[10px] text-slate-400">
                    Formatos recomendados: PNG o JPG con fondo transparente (máx. 2MB).
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nombre Comercial de la Tienda
              </label>
              <input
                type="text"
                required
                value={nombreEmpresa}
                onChange={(e) => setNombreEmpresa(e.target.value)}
                placeholder="Ej: Óptica Visión Real / Ferretería Central"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-slate-900 dark:focus:border-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Teléfono WhatsApp para Recepción de Pedidos
              </label>
              <input
                type="text"
                value={telefonoWhatsapp}
                onChange={(e) => setTelefonoWhatsapp(e.target.value)}
                placeholder="Ej: 04141234567 o 584141234567"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-slate-900 dark:focus:border-white"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Aquí llegarán los pedidos estructurados y mensajes automáticos de tus clientes.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Slogan o Descripción Corta del Negocio
              </label>
              <input
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                placeholder="Ej: Lentes exclusivos, monturas y accesorios con despacho inmediato"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-slate-900 dark:focus:border-white"
              />
            </div>

            <button
              type="submit"
              disabled={guardandoPerfil}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-50"
            >
              {guardandoPerfil ? "Guardando Cambios..." : "Guardar Perfil de Tienda"}
            </button>
          </form>
        )}

        {/* TAB 3: Pago Movil */}
        {tab === "pago_movil" && (
          <form onSubmit={handleGuardarPagoMovil} className="space-y-3">
            {mensajePm && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center">
                {mensajePm}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Banco Receptor
              </label>
              <select
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
              >
                <option value="0102 - Banco de Venezuela">0102 - Banco de Venezuela</option>
                <option value="0108 - Banco Provincial">0108 - Banco Provincial</option>
                <option value="0134 - Banesco">0134 - Banesco</option>
                <option value="0105 - Banco Mercantil">0105 - Banco Mercantil</option>
                <option value="0114 - Bancaribe">0114 - Bancaribe</option>
                <option value="0172 - Bancamiga">0172 - Bancamiga</option>
                <option value="0115 - Banco Exterior">0115 - Banco Exterior</option>
                <option value="0163 - Banco del Tesoro">0163 - Banco del Tesoro</option>
                <option value="0175 - Banco Bicentenario">0175 - Banco Bicentenario</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Teléfono Afiliado
              </label>
              <input
                type="text"
                required
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 04141234567"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cédula o RIF
              </label>
              <input
                type="text"
                required
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Ej: V-12345678 o J-12345678-0"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nombre del Titular
              </label>
              <input
                type="text"
                required
                value={titular}
                onChange={(e) => setTitular(e.target.value)}
                placeholder="Ej: Daniel Reina / Distribuidora C.A."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={guardandoPm}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-50 mt-2"
            >
              {guardandoPm ? "Guardando..." : "Guardar Datos de Pago Móvil"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
