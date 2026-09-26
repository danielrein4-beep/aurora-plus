import { avisar } from "../avisos";
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

function SvgClose({ className = "w-5 h-5", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SvgCopy({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function SvgExternal({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function SvgCheck({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SvgQr({ className = "w-5 h-5", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  );
}

function SvgPhone({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function SvgStore({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v4a3 3 0 01-3 3 3 3 0 01-3-3 3 3 0 01-3 3 3 3 0 01-3-3 3 3 0 01-3-3V3zm1 7v10a1 1 0 001 1h14a1 1 0 001-1V10" />
    </svg>
  );
}

function SvgUsers({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 014-4h2a4 4 0 014 4v2H9zm0-8a4 4 0 100-8 4 4 0 000 8zm7-4a3 3 0 110 6" />
    </svg>
  );
}

function SvgUpload({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

interface Props {
  tenantId: number;
  nombreNegocio?: string;
  onClose: () => void;
  esDuenoAdmin?: boolean;
  onIrAEquipoRoles?: () => void;
  /** true = se dibuja como contenido de una pantalla (sin overlay ni botón de cerrar). */
  embebido?: boolean;
  /** Sección a mostrar; en modo embebido la controla la pantalla que lo contiene. */
  seccion?: "qr" | "perfil" | "pago_movil";
}

export default function ModalCatalogoQR({ tenantId, nombreNegocio, onClose, esDuenoAdmin, onIrAEquipoRoles, embebido, seccion }: Props) {
  const [tab, setTab] = useState<"qr" | "perfil" | "pago_movil">(seccion ?? "qr");
  useEffect(() => { if (seccion) setTab(seccion); }, [seccion]);
  const [copiado, setCopiado] = useState(false);

  // Perfil Tienda
  const [nombreEmpresa, setNombreEmpresa] = useState(nombreNegocio || "");
  const [slugCatalogo, setSlugCatalogo] = useState("");
  const [logoBase64, setLogoBase64] = useState("");
  const [personalizacionTiendaActiva, setPersonalizacionTiendaActiva] = useState(false);
  const [colorAcentoTienda, setColorAcentoTienda] = useState("#0f766e");
  const [bannerBase64, setBannerBase64] = useState("");
  const [estiloBannerTienda, setEstiloBannerTienda] = useState<"COMPACTO" | "VITRINA">("COMPACTO");
  const [telefonoWhatsapp, setTelefonoWhatsapp] = useState("");
  const [emailContacto, setEmailContacto] = useState("");
  const [slogan, setSlogan] = useState("");
  const [costoEnvioDelivery, setCostoEnvioDelivery] = useState("0");
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState<string | null>(null);
  const [errorPerfil, setErrorPerfil] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  // Formulario Pago Movil
  const [banco, setBanco] = useState("0102 - Banco de Venezuela");
  const [telefono, setTelefono] = useState("");
  const [documento, setDocumento] = useState("");
  const [titular, setTitular] = useState("");
  const [pagoMovilActivo, setPagoMovilActivo] = useState(true);

  // Métodos de pago adicionales — cada uno con su propio "activo": el catálogo
  // público solo muestra los que el dueño de verdad configuró y activó.
  const [zelleActivo, setZelleActivo] = useState(false);
  const [zelleCorreo, setZelleCorreo] = useState("");
  const [zelleTitular, setZelleTitular] = useState("");
  const [binanceManualActivo, setBinanceManualActivo] = useState(false);
  const [binancePayId, setBinancePayId] = useState("");
  const [bancolombiaActivo, setBancolombiaActivo] = useState(false);
  const [bancolombiaCuenta, setBancolombiaCuenta] = useState("");
  const [bancolombiaTipoCuenta, setBancolombiaTipoCuenta] = useState("Ahorros");
  const [bancolombiaTitular, setBancolombiaTitular] = useState("");
  const [bancolombiaDocumento, setBancolombiaDocumento] = useState("");

  const [guardandoPm, setGuardandoPm] = useState(false);
  const [mensajePm, setMensajePm] = useState<string | null>(null);
  const [errorPm, setErrorPm] = useState(false);

  // El catálogo público ya solo resuelve por slug (ver CatalogoPublicoController.
  // resolverLicencia) — un link armado con el tenantId numérico como fallback
  // daría 404. Mientras el slug real todavía no cargó del backend, mejor no
  // mostrar ningún link que con uno roto.
  const urlPublica = slugCatalogo ? `${window.location.origin}/catalogo/${slugCatalogo}` : "";
  const qrUrl = urlPublica
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(urlPublica)}&color=0f172a&bgcolor=f8fafc`
    : "";

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
        if (data.activo != null) setPagoMovilActivo(Boolean(data.activo));
        setZelleActivo(Boolean(data.zelleActivo));
        if (data.zelleCorreo) setZelleCorreo(data.zelleCorreo);
        if (data.zelleTitular) setZelleTitular(data.zelleTitular);
        setBinanceManualActivo(Boolean(data.binanceManualActivo));
        if (data.binancePayId) setBinancePayId(data.binancePayId);
        setBancolombiaActivo(Boolean(data.bancolombiaActivo));
        if (data.bancolombiaCuenta) setBancolombiaCuenta(data.bancolombiaCuenta);
        if (data.bancolombiaTipoCuenta) setBancolombiaTipoCuenta(data.bancolombiaTipoCuenta);
        if (data.bancolombiaTitular) setBancolombiaTitular(data.bancolombiaTitular);
        if (data.bancolombiaDocumento) setBancolombiaDocumento(data.bancolombiaDocumento);
      })
      .catch(() => avisar("No se pudieron cargar tus métodos de pago. Si guardas así, podrías borrar lo que ya tenías. Cierra y vuelve a abrir.", "error"));

    // Cargar perfil de la tienda
    fetch(`/api/comercio/catalogo/perfil-tienda`, {
      headers: { Authorization: `Bearer ${obtenerTokenSesion()}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.nombreEmpresa) setNombreEmpresa(data.nombreEmpresa);
        if (data.slugCatalogo) setSlugCatalogo(data.slugCatalogo);
        if (data.logoBase64) setLogoBase64(data.logoBase64);
        setPersonalizacionTiendaActiva(Boolean(data.personalizacionTiendaActiva));
        if (data.colorAcentoTienda) setColorAcentoTienda(data.colorAcentoTienda);
        if (data.bannerBase64) setBannerBase64(data.bannerBase64);
        if (data.estiloBannerTienda === "VITRINA") setEstiloBannerTienda("VITRINA");
        if (data.telefonoWhatsapp) setTelefonoWhatsapp(data.telefonoWhatsapp);
        if (data.emailContacto) setEmailContacto(data.emailContacto);
        if (data.domicilioFiscal) setSlogan(data.domicilioFiscal);
        if (data.costoEnvioDelivery != null) setCostoEnvioDelivery(String(data.costoEnvioDelivery));
      })
      .catch(() => avisar("No se pudo cargar el perfil de tu tienda. Si guardas así, podrías borrar lo que ya tenías. Cierra y vuelve a abrir.", "error"));
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
      avisar("La imagen no debe superar los 2MB.");
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

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // El banner se difumina hacia blanco en los bordes (mismo tratamiento del Hero
    // de la landing) para fundirse con el fondo del catálogo — eso solo se ve bien
    // con transparencia real, así que se exige PNG y no cualquier formato.
    if (file.type !== "image/png") {
      setErrorPerfil(true);
      setMensajePerfil("El banner debe ser una imagen PNG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorPerfil(true);
      setMensajePerfil("El banner no debe superar los 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setBannerBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoPerfil(true);
    setMensajePerfil(null);
    setErrorPerfil(false);
    try {
      const res = await fetch(`/api/comercio/catalogo/perfil-tienda`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${obtenerTokenSesion()}` },
        body: JSON.stringify({
          nombreEmpresa: nombreEmpresa.trim(),
          slugCatalogo: slugCatalogo.trim(),
          logoBase64: logoBase64,
          colorAcentoTienda,
          bannerBase64,
          estiloBannerTienda,
          telefonoWhatsapp: telefonoWhatsapp.trim(),
          emailContacto: emailContacto.trim(),
          domicilioFiscal: slogan.trim(),
          costoEnvioDelivery: Number(costoEnvioDelivery) || 0
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.slugCatalogo) setSlugCatalogo(data.slugCatalogo);
        setErrorPerfil(false);
        setMensajePerfil("Perfil y enlace del catalogo actualizados con exito.");
        setTimeout(() => setMensajePerfil(null), 4000);
      } else {
        setErrorPerfil(true);
        setMensajePerfil(data.error || "No se pudo guardar la configuracion de la tienda.");
      }
    } catch {
      setErrorPerfil(true);
      setMensajePerfil("No se pudo conectar con el servidor para guardar la tienda.");
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const handleGuardarPagoMovil = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoPm(true);
    setMensajePm(null);
    setErrorPm(false);
    try {
      const res = await fetch(`/api/comercio/catalogo/pago-movil`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${obtenerTokenSesion()}` },
        body: JSON.stringify({
          banco: banco.trim(),
          telefono: telefono.trim(),
          documento: documento.trim(),
          titular: titular.trim(),
          activo: pagoMovilActivo,
          zelleActivo,
          zelleCorreo: zelleCorreo.trim(),
          zelleTitular: zelleTitular.trim(),
          binanceManualActivo,
          binancePayId: binancePayId.trim(),
          bancolombiaActivo,
          bancolombiaCuenta: bancolombiaCuenta.trim(),
          bancolombiaTipoCuenta,
          bancolombiaTitular: bancolombiaTitular.trim(),
          bancolombiaDocumento: bancolombiaDocumento.trim()
        })
      });
      if (res.ok) {
        setMensajePm("Métodos de pago actualizados con éxito.");
        setTimeout(() => setMensajePm(null), 4000);
      } else {
        throw new Error("Error al guardar");
      }
    } catch {
      setErrorPm(true);
      setMensajePm("No se pudieron guardar los métodos de pago.");
    } finally {
      setGuardandoPm(false);
    }
  };

  return (
    <div className={embebido ? "" : "fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"}>
      <div className={embebido
        ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-sm"
        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-scale-up"}>
        {/* Embebido en la pantalla de Configuración: la cabecera, las pestañas y el acceso a
            Equipo los pone esa pantalla (menú lateral), no el modal. */}
        {!embebido && (<>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-sm" style={{ backgroundColor: "#0f172a", color: "#ffffff" }}>
              {tab === "qr" ? <SvgQr className="w-4 h-4" /> : tab === "perfil" ? <SvgStore className="w-4 h-4" /> : <SvgPhone className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-['Outfit'] font-black text-base sm:text-lg text-slate-900 dark:text-white">
                {tab === "qr" ? "Catálogo Online & QR" : tab === "perfil" ? "Personalizar Tienda & Logo" : "Pagos"}
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
            Pagos
          </button>
        </div>

        {/* Equipo & Roles vive a nivel de cuenta (Dashboard.tsx), no dentro de
            Comercio — sirve igual para cualquier rubro (Horeca, Ganaderia, etc).
            En vez de duplicar esa logica aqui, este es solo un acceso directo. */}
        {esDuenoAdmin && onIrAEquipoRoles && (
          <button
            type="button"
            onClick={onIrAEquipoRoles}
            className="w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="flex items-center gap-2"><SvgUsers className="w-3.5 h-3.5" /> Equipo & Roles</span>
            <span className="text-slate-400">→</span>
          </button>
        )}

        </>)}

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
                className="px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
              >
                {copiado ? (
                  <SvgCheck className="w-3.5 h-3.5" style={{ color: "#ffffff" }} />
                ) : (
                  <SvgCopy className="w-3.5 h-3.5" style={{ color: "#ffffff" }} />
                )}
                <span style={{ color: "#ffffff" }}>{copiado ? "Copiado" : "Copiar"}</span>
              </button>
            </div>

            <div className="flex gap-2">
              <a
                href={urlPublica}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:opacity-90"
                style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
              >
                <SvgExternal className="w-4 h-4" style={{ color: "#ffffff" }} />
                <span style={{ color: "#ffffff" }}>Abrir Catálogo en Nueva Pestaña</span>
              </a>
            </div>
          </div>
        )}

        {/* TAB 2: Personalizar Perfil & Logo */}
        {tab === "perfil" && (
          <form onSubmit={handleGuardarPerfil} className="space-y-4">
            {mensajePerfil && (
              <div className={`p-3 rounded-xl border text-xs font-bold text-center ${
                errorPerfil
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              }`}>
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

            {personalizacionTiendaActiva ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Color de acento del catálogo</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={colorAcentoTienda} onChange={(e) => setColorAcentoTienda(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white p-1" />
                    <span className="font-mono text-xs text-slate-500">{colorAcentoTienda}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Banner de portada</label>
                  {bannerBase64 && (
                    <div className="relative mb-2 h-24 w-full rounded-lg overflow-hidden bg-white">
                      <img src={bannerBase64} alt="Vista previa del banner" className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white" />
                      <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white to-transparent" />
                      <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white to-transparent" />
                    </div>
                  )}
                  <input ref={bannerInputRef} type="file" accept="image/png" onChange={handleBannerChange} className="hidden" />
                  <button type="button" onClick={() => bannerInputRef.current?.click()} className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    {bannerBase64 ? "Cambiar banner" : "Subir banner"}
                  </button>
                  {bannerBase64 && <button type="button" onClick={() => setBannerBase64("")} className="ml-3 text-[11px] text-rose-500 hover:underline">Eliminar banner</button>}
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Solo formato PNG. Medida ideal: 1600 x 400 px (imagen ancha y baja, relación 4:1). Se difumina hacia blanco en los bordes para fundirse con el catálogo. Máx. 2MB.
                  </p>
                  {bannerBase64 && (
                    <div className="mt-3">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Estilo de portada</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEstiloBannerTienda("COMPACTO")}
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${estiloBannerTienda === "COMPACTO" ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
                        >
                          Compacto
                        </button>
                        <button
                          type="button"
                          onClick={() => setEstiloBannerTienda("VITRINA")}
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${estiloBannerTienda === "VITRINA" ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
                        >
                          Vitrina
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {estiloBannerTienda === "VITRINA"
                          ? "Portada grande a pantalla completa con tu nombre superpuesto, estilo editorial de moda."
                          : "Banner pequeño arriba del catálogo, con el foco en el producto."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <strong className="block text-slate-800 dark:text-white mb-1">Personalización de tienda</strong>
                Personaliza el color y el banner de tu tienda. Disponible en el plan superior; contacta a soporte para activarlo.
              </div>
            )}

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
                Enlace Personalizado del Catalogo (Slug Branded)
              </label>
              <div className="flex items-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 focus-within:border-slate-900 dark:focus-within:border-white">
                <span className="text-xs text-slate-400 font-mono select-none mr-1 truncate max-w-[200px] sm:max-w-none">
                  {typeof window !== 'undefined' ? `${window.location.origin}/catalogo/` : '/catalogo/'}
                </span>
                <input
                  type="text"
                  value={slugCatalogo}
                  onChange={(e) => setSlugCatalogo(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="daniel-reina"
                  className="bg-transparent flex-1 text-xs text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Enlace exclusivo para tus clientes. Protege el ID de base de datos contra accesos secuenciales indebidos.
              </p>
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

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Costo de Envío por Delivery (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costoEnvioDelivery}
                onChange={(e) => setCostoEnvioDelivery(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono font-medium focus:outline-none focus:border-slate-900 dark:focus:border-white"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Se suma automáticamente al total cuando el cliente elige "Delivery" en el catálogo. Déjalo en 0 si el envío es gratis o se cobra aparte.
              </p>
            </div>

            <button
              type="submit"
              disabled={guardandoPerfil}
              className="w-full py-3 rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-50"
              style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
            >
              <span style={{ color: "#ffffff" }}>
                {guardandoPerfil ? "Guardando Cambios..." : "Guardar Perfil de Tienda"}
              </span>
            </button>

            {/* Repetido aquí abajo — el modal ahora tiene scroll propio y este mensaje
                vive arriba del formulario, así que si el dueño está viendo el botón
                (al fondo) nunca se enteraba de un error o de que sí guardó. */}
            {mensajePerfil && (
              <div className={`p-3 rounded-xl border text-xs font-bold text-center ${
                errorPerfil
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              }`}>
                {mensajePerfil}
              </div>
            )}
          </form>
        )}

        {/* TAB 3: Pagos — Pago Móvil + métodos adicionales, cada uno con su propio
            interruptor. El catálogo público solo muestra al cliente los que estén
            activos Y tengan datos reales guardados (ver CatalogoPublicoController). */}
        {tab === "pago_movil" && (
          <form onSubmit={handleGuardarPagoMovil} className="space-y-4">
            {mensajePm && (
              <div className={`p-2.5 rounded-xl border text-xs font-bold text-center ${
                errorPm
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              }`}>
                {mensajePm}
              </div>
            )}

            {/* Pago Móvil */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-slate-800 dark:text-white">Pago Móvil</span>
                <input type="checkbox" checked={pagoMovilActivo} onChange={(e) => setPagoMovilActivo(e.target.checked)} className="w-4 h-4 accent-slate-900" />
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
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Teléfono afiliado. Ej: 04141234567"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
              />
              <input
                type="text"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Cédula o RIF. Ej: V-12345678"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
              />
              <input
                type="text"
                value={titular}
                onChange={(e) => setTitular(e.target.value)}
                placeholder="Nombre del titular"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            {/* Zelle */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-slate-800 dark:text-white">Zelle</span>
                <input type="checkbox" checked={zelleActivo} onChange={(e) => setZelleActivo(e.target.checked)} className="w-4 h-4 accent-slate-900" />
              </label>
              <input
                type="email"
                value={zelleCorreo}
                onChange={(e) => setZelleCorreo(e.target.value)}
                placeholder="Correo registrado en Zelle"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
              />
              <input
                type="text"
                value={zelleTitular}
                onChange={(e) => setZelleTitular(e.target.value)}
                placeholder="Nombre del titular"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            {/* Binance Pay */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-slate-800 dark:text-white">Binance Pay (USDT)</span>
                <input type="checkbox" checked={binanceManualActivo} onChange={(e) => setBinanceManualActivo(e.target.checked)} className="w-4 h-4 accent-slate-900" />
              </label>
              <input
                type="text"
                value={binancePayId}
                onChange={(e) => setBinancePayId(e.target.value)}
                placeholder="Tu Binance Pay ID"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
              />
            </div>

            {/* Bancolombia */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-slate-800 dark:text-white">Bancolombia</span>
                <input type="checkbox" checked={bancolombiaActivo} onChange={(e) => setBancolombiaActivo(e.target.checked)} className="w-4 h-4 accent-slate-900" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={bancolombiaCuenta}
                  onChange={(e) => setBancolombiaCuenta(e.target.value)}
                  placeholder="Número de cuenta"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                />
                <select
                  value={bancolombiaTipoCuenta}
                  onChange={(e) => setBancolombiaTipoCuenta(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                >
                  <option value="Ahorros">Ahorros</option>
                  <option value="Corriente">Corriente</option>
                </select>
              </div>
              <input
                type="text"
                value={bancolombiaTitular}
                onChange={(e) => setBancolombiaTitular(e.target.value)}
                placeholder="Nombre del titular"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <input
                type="text"
                value={bancolombiaDocumento}
                onChange={(e) => setBancolombiaDocumento(e.target.value)}
                placeholder="Cédula o NIT"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={guardandoPm}
              className="w-full py-3 rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-50"
              style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
            >
              <span style={{ color: "#ffffff" }}>
                {guardandoPm ? "Guardando..." : "Guardar Métodos de Pago"}
              </span>
            </button>

            {mensajePm && (
              <div className={`p-2.5 rounded-xl border text-xs font-bold text-center ${
                errorPm
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              }`}>
                {mensajePm}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
