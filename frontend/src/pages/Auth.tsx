import { useState, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import AuroraLogo from "../AuroraLogo";
import SpecularButton from "../components/SpecularButton";
import {
  AuroraGradientDef, IconLock,
  IconRestaurant, IconPrescription, IconHardware, IconClinic,
  IconVet, IconTooth, IconFarm, IconBank,
} from "../Icons";
import { useAuth } from "../context/AuthContext";
import { solicitarRecuperacionClave } from "../api";

type Mode = "login" | "register";

const REMEMBERED_EMAIL_KEY = "aurora_remembered_email";

interface RubroNegocioItem {
  id: string;
  label: string;
  sub: string;
  Icon: (p: { size?: number; className?: string }) => React.ReactNode;
  modulo: string;
  ruta: string;
  nombreDefault: string;
}

const RUBROS_REGISTRO: RubroNegocioItem[] = [
  { id: "restaurante", label: "Restaurante & Cafetería", sub: "Comandas, KDS, mesas y delivery", Icon: IconRestaurant, modulo: "horeca", ruta: "/restaurante", nombreDefault: "Mi Restaurante" },
  { id: "farmacia", label: "Farmacia & Droguería", sub: "Medicamentos, lotes y mostrador", Icon: IconPrescription, modulo: "salud", ruta: "/comercio", nombreDefault: "Mi Farmacia" },
  // modulo:"repuestos" (no "comercio") a propósito: el backend gatea /api/repuestos/*
  // por el segmento de URL (ver LicenciaInterceptor), así que el módulo contratado
  // real DEBE ser "repuestos" para que el tenant pueda usar esos endpoints. "comercio"
  // solo existe como `industria`/user.industry, para la identidad unificada en la UI.
  { id: "comercio", label: "Comercio", sub: "POS mostrador, código de barras e inventario", Icon: IconHardware, modulo: "repuestos", ruta: "/comercio", nombreDefault: "Mi Negocio" },
  { id: "clinica", label: "Clínica & Consultorios", sub: "Historias clínicas y citas", Icon: IconClinic, modulo: "salud", ruta: "/mediclinic", nombreDefault: "Mi Consultorio" },
  { id: "veterinaria", label: "Veterinaria & Mascotas", sub: "Fichas, vacunas y petshop", Icon: IconVet, modulo: "salud", ruta: "/veterinaria", nombreDefault: "Mi Veterinaria" },
  { id: "odontologia", label: "Odontología", sub: "Historia clínica y odontograma FDI", Icon: IconTooth, modulo: "odontologia", ruta: "/mediclinic", nombreDefault: "Mi Consultorio Dental" },
  { id: "finca", label: "Finca & Ganadería", sub: "Potreros, vacunas y animales", Icon: IconFarm, modulo: "ganaderia", ruta: "/dashboard", nombreDefault: "Mi Finca" },
  { id: "otro", label: "Otro Rubro Comercial", sub: "ERP y suite administrativa", Icon: IconBank, modulo: "repuestos", ruta: "/comercio", nombreDefault: "Mi Empresa" },
];

export default function Auth() {
  const authClicksRef = useRef<number>(0);
  const authClickTimeoutRef = useRef<any>(null);

  const handleAuthLogoClick = (e: React.MouseEvent) => {
    if (e.altKey || e.shiftKey) {
      navigate("/superadmin");
      return;
    }
    authClicksRef.current += 1;
    if (authClickTimeoutRef.current) clearTimeout(authClickTimeoutRef.current);

    if (authClicksRef.current >= 5) {
      authClicksRef.current = 0;
      navigate("/superadmin");
    } else {
      authClickTimeoutRef.current = setTimeout(() => {
        authClicksRef.current = 0;
      }, 3500);
      navigate("/");
    }
  };

  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState(() => {
    let email = "";
    try {
      email = localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
    } catch {}
    return {
      nombre: "",
      empresa: "",
      industry: "restaurante",
      email,
      password: "",
      confirmar: "",
      remember: true,
      terms: false,
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const { login, isLoggedIn, user, completarRegistro } = useAuth();

  const [modalOlvide, setModalOlvide] = useState(false);
  const [emailOlvide, setEmailOlvide] = useState("");
  const [enviandoOlvide, setEnviandoOlvide] = useState(false);
  const [mensajeOlvide, setMensajeOlvide] = useState<string | null>(null);

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const rubroActual = RUBROS_REGISTRO.find((r) => r.id === form.industry) || RUBROS_REGISTRO[0];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nombre.trim() && mode === "register") e.nombre = "Ingresa tu nombre completo";
    if (!form.empresa.trim() && mode === "register") e.empresa = "Indica el nombre de tu negocio o local";
    if (mode === "register" && !form.email.includes("@")) {
      e.email = "Ingresa un correo electrónico válido";
    } else if (!form.email.trim()) {
      e.email = "Ingresa tu usuario o correo electrónico";
    }
    if (mode === "register" && form.password.length < 6) e.password = "Mínimo 6 caracteres";
    if (mode === "login" && !form.password) e.password = "Ingresa tu contraseña";
    if (mode === "register" && form.password !== form.confirmar) e.confirmar = "Las contraseñas no coinciden";
    if (mode === "register" && !form.terms) e.terms = "Debes aceptar los términos para continuar";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setEnviando(true);
    try {
      if (mode === "register") {
        // Registra el negocio en backend / local y conecta de inmediato a la vertical correspondiente
        await completarRegistro({
          nombreEmpresa: form.empresa.trim() || rubroActual.nombreDefault,
          moduloPrincipal: rubroActual.modulo,
          industria: rubroActual.id,
          emailContacto: form.email,
          username: form.email,
          password: form.password,
          metodoPagoPreferido: "Pago Móvil / Efectivo",
        });

        // Conexión inmediata a la aplicación de su negocio — el rubro ya queda
        // fijo por user.industry (ver ComercioApp.tsx), no hace falta sembrar nada acá.
        navigate(rubroActual.ruta);
      } else {
        if (form.remember) {
          try { localStorage.setItem(REMEMBERED_EMAIL_KEY, form.email); } catch {}
        } else {
          try { localStorage.removeItem(REMEMBERED_EMAIL_KEY); } catch {}
        }
        await login(form.email, form.password);

        // Conexión directa a la vertical del negocio del usuario
        let rutaDestino = "/dashboard";
        try {
          const rawU = localStorage.getItem("aurora_session_user");
          if (rawU) {
            const u = JSON.parse(rawU);
            if (u.industry === "restaurante") rutaDestino = "/restaurante";
            else if (u.industry === "ferreteria" || u.industry === "repuestos" || u.industry === "retail" || u.industry === "comercio" || u.industry === "farmacia") rutaDestino = "/comercio";
            else if (u.industry === "clinica") rutaDestino = "/mediclinic";
            else if (u.industry === "veterinaria") rutaDestino = "/veterinaria";
          }
        } catch {}

        navigate(rutaDestino);
      }
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "No se pudo procesar la solicitud" });
    } finally {
      setEnviando(false);
    }
  };

  const handleSolicitarOlvide = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviandoOlvide(true);
    setMensajeOlvide(null);
    try {
      await solicitarRecuperacionClave(emailOlvide.trim());
      setMensajeOlvide("Si ese correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada (y spam).");
    } catch (err) {
      setMensajeOlvide(err instanceof Error ? err.message : "No se pudo procesar la solicitud.");
    } finally {
      setEnviandoOlvide(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex items-center justify-center px-4 sm:px-6 py-12 antialiased">
      <AuroraGradientDef />

      {/* ── BOTÓN SUPERIOR: VOLVER A PÁGINA PRINCIPAL ── */}
      <button
        type="button"
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 z-30 bg-white border border-[#E5E5EA] hover:border-[#D1D1D6] px-4 py-2 rounded-full text-xs font-semibold text-[#1D1D1F] transition-colors flex items-center gap-2 cursor-pointer group shadow-sm"
        title="Volver a la página principal">
        <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1 text-[#177E89]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Volver a la página principal</span>
      </button>

      {/* ── CONTENEDOR PRINCIPAL ── */}
      <div className="relative z-10 w-full max-w-4xl bg-white border border-[#E5E5EA] rounded-3xl p-6 sm:p-10 shadow-sm mt-10 sm:mt-0">

        {/* Barra superior de la tarjeta */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-8 mb-8 border-b border-[#E5E5EA]">
          <button onClick={handleAuthLogoClick} className="flex items-center gap-3.5 group cursor-pointer" title="Ir a la página principal">
            <AuroraLogo size={34} animated />
            <div className="text-left">
              <div className="font-bold text-lg leading-none tracking-tight text-[#1D1D1F]">
                Aurora Plus
              </div>
              <div className="text-[#86868B] text-[10px] uppercase tracking-widest mt-1">
                Software Administrativo
              </div>
            </div>
          </button>

          {/* Acciones de la barra superior: Volver a inicio + Toggle de modo */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="bg-[#F5F5F7] border border-[#E5E5EA] hover:bg-[#E5E5EA] px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#1D1D1F] transition-colors flex items-center gap-1.5 cursor-pointer group"
              title="Volver al inicio">
              <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 text-[#177E89]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Inicio</span>
            </button>

            {/* Toggle pill mode: Iniciar sesión / Crear cuenta */}
            <div className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-full p-1 flex items-center gap-1">
              <button
                type="button"
                onClick={() => { setMode("login"); setErrors({}); }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  mode === "login"
                    ? "bg-white text-[#1D1D1F] shadow-sm border border-[#E5E5EA]"
                    : "text-[#86868B] hover:text-[#1D1D1F]"
                }`}>
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setErrors({}); }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  mode === "register"
                    ? "bg-white text-[#1D1D1F] shadow-sm border border-[#E5E5EA]"
                    : "text-[#86868B] hover:text-[#1D1D1F]"
                }`}>
                Registrarse
              </button>
            </div>
          </div>
        </div>

        {/* Grid Principal: Formulario a la Izquierda + Panel Visual a la Derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* Columna Izquierda: Formulario */}
          <div className="lg:col-span-7">
            <div className="mb-6">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F]">
                {mode === "register" ? "Crea tu cuenta" : "Bienvenido de vuelta"}
              </h2>
              <div className="h-1 w-20 bg-[#177E89] rounded-full mt-2" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div>
                    <label className="block text-[#86868B] text-[11px] font-medium uppercase tracking-wider mb-1">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Alejandro Ramos"
                      value={form.nombre}
                      onChange={(e) => set("nombre", e.target.value)}
                      className="w-full bg-white border border-[#E5E5EA] focus:border-[#177E89] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] placeholder-[#86868B] focus:outline-none transition-colors"
                    />
                    {errors.nombre && <p className="text-red-600 text-xs mt-1">{errors.nombre}</p>}
                  </div>

                  <div>
                    <label className="block text-[#86868B] text-[11px] font-medium uppercase tracking-wider mb-1">
                      Nombre de tu Negocio / Local
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Hamburguesas El Catire, Ferretería San Cristóbal, etc."
                      value={form.empresa}
                      onChange={(e) => set("empresa", e.target.value)}
                      className="w-full bg-white border border-[#E5E5EA] focus:border-[#177E89] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] placeholder-[#86868B] focus:outline-none transition-colors"
                    />
                    {errors.empresa && <p className="text-red-600 text-xs mt-1">{errors.empresa}</p>}
                  </div>

                  <div>
                    <label className="block text-[#86868B] text-[11px] font-medium uppercase tracking-wider mb-2">
                      ¿De qué se trata tu negocio?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {RUBROS_REGISTRO.map((r) => {
                        const sel = form.industry === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => set("industry", r.id)}
                            className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                              sel
                                ? "bg-[#177E89]/10 border-[#177E89] text-[#1D1D1F]"
                                : "bg-white hover:bg-[#F5F5F7] border-[#E5E5EA] text-[#6E6E73] hover:text-[#1D1D1F]"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <r.Icon size={22} className={sel ? "text-[#177E89]" : "text-[#86868B]"} />
                              {sel && <span className="w-2 h-2 rounded-full bg-[#177E89]" />}
                            </div>
                            <div className="mt-1.5">
                              <div className="text-xs font-bold leading-tight">{r.label}</div>
                              <div className="text-[10px] text-[#86868B] leading-snug mt-0.5 line-clamp-1">{r.sub}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[#86868B] text-[11px] font-medium uppercase tracking-wider mb-1">
                  {mode === "register" ? "Correo Electrónico" : "Usuario o Correo Electrónico"}
                </label>
                <input
                  type={mode === "register" ? "email" : "text"}
                  placeholder={mode === "register" ? "usuario@empresa.com" : "danielrein4 o correo@empresa.com"}
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="w-full bg-white border border-[#E5E5EA] focus:border-[#177E89] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] placeholder-[#86868B] focus:outline-none transition-colors"
                />
                {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-[#86868B] text-[11px] font-medium uppercase tracking-wider mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className="w-full bg-white border border-[#E5E5EA] focus:border-[#177E89] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] placeholder-[#86868B] focus:outline-none transition-colors"
                />
                {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}

                {/* Indicador sutil de seguridad */}
                {form.password.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className={`h-1 flex-1 rounded-full ${form.password.length >= 1 ? "bg-[#177E89]" : "bg-[#E5E5EA]"}`} />
                    <div className={`h-1 flex-1 rounded-full ${form.password.length >= 6 ? "bg-[#177E89]" : "bg-[#E5E5EA]"}`} />
                    <div className={`h-1 flex-1 rounded-full ${form.password.length >= 10 ? "bg-[#177E89]" : "bg-[#E5E5EA]"}`} />
                    <span className="text-[10px] text-[#86868B] ml-1">
                      {form.password.length < 6 ? "Débil" : form.password.length < 10 ? "Buena" : "Segura"}
                    </span>
                  </div>
                )}
              </div>

              {mode === "register" && (
                <div>
                  <label className="block text-[#86868B] text-[11px] font-medium uppercase tracking-wider mb-1">
                    Confirmar Contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={form.confirmar}
                    onChange={(e) => set("confirmar", e.target.value)}
                    className="w-full bg-white border border-[#E5E5EA] focus:border-[#177E89] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] placeholder-[#86868B] focus:outline-none transition-colors"
                  />
                  {errors.confirmar && <p className="text-red-600 text-xs mt-1">{errors.confirmar}</p>}
                </div>
              )}

              {/* Checkboxes de Sesión / Términos */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={mode === "login" ? form.remember : form.terms}
                    onChange={(e) => set(mode === "login" ? "remember" : "terms", e.target.checked)}
                    className="w-4 h-4 rounded border-[#D1D1D6] accent-[#177E89] focus:ring-0 focus:outline-none"
                  />
                  <span className="text-xs text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">
                    {mode === "login" ? (
                      "Mantener sesión activa"
                    ) : (
                      <>
                        Acepto los{" "}
                        <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-[#177E89] hover:text-[#1D1D1F] underline" onClick={(e) => e.stopPropagation()}>
                          términos
                        </a>{" "}
                        y la{" "}
                        <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-[#177E89] hover:text-[#1D1D1F] underline" onClick={(e) => e.stopPropagation()}>
                          política de privacidad
                        </a>
                      </>
                    )}
                  </span>
                </label>

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => { setModalOlvide(true); setEmailOlvide(form.email); setMensajeOlvide(null); }}
                    className="text-xs text-[#177E89] hover:text-[#1D1D1F] transition-colors cursor-pointer"
                  >
                    ¿Olvidaste tu clave?
                  </button>
                )}
              </div>
              {errors.terms && <p className="text-red-600 text-xs -mt-2">{errors.terms}</p>}

              {errors.submit && (
                <p className="text-red-600 text-xs text-center -mb-1">{errors.submit}</p>
              )}

              {/* Botón Principal */}
              <SpecularButton
                type="submit"
                size="lg"
                radius={999}
                tint="#177E89"
                tintOpacity={1}
                textColor="#f5f5f5"
                lineColor="#5BC0BE"
                baseColor="#177E89"
                shineSize={10}
                shineFade={40}
                intensity={1}
                thickness={1}
                proximity={280}
                className="w-full mt-4"
                disabled={enviando}
              >
                {enviando ? "Configurando tu negocio…" : mode === "register" ? `Crear cuenta y entrar a ${rubroActual.label} →` : "Ingresar a la plataforma →"}
              </SpecularButton>
            </form>
          </div>

          {/* Columna Derecha: Tarjeta Visual */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-6">
            <div className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-2xl p-6 sm:p-7 relative overflow-hidden">
              <p className="text-sm sm:text-base text-[#1D1D1F] leading-relaxed italic mb-4">
                "El bolívar se mueve de la mañana a la tarde y tu caja lo refleja al instante — tú fijas la tasa, no una hoja de cálculo desactualizada."
              </p>

              <div className="text-xs font-semibold tracking-wider text-[#177E89]">
                Aurora Engine Core
              </div>

              <div className="mt-6 pt-5 border-t border-[#E5E5EA] space-y-2 text-xs text-[#6E6E73]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#177E89]" />
                  <span>4 verticales nativas — Clínicas, Restaurantes, Comercio y Ganadería</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#177E89]" />
                  <span>Multi-moneda en vivo (USD · VES · COP)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#177E89]" />
                  <span>POS resiliente a cortes de conexión, caja 100% idempotente</span>
                </div>
              </div>
            </div>

            {/* Badge inferior derecho de seguridad */}
            <div className="flex justify-end">
              <div className="bg-white border border-[#E5E5EA] rounded-full px-4 py-2 flex items-center gap-2 text-xs text-[#6E6E73] shadow-sm">
                <IconLock size={14} />
                <span className="font-medium text-[11px] tracking-wide">Conexión cifrada (HTTPS) · Contraseñas nunca en texto plano</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {modalOlvide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="relative w-full max-w-sm rounded-3xl p-6 bg-white border border-[#E5E5EA] text-[#1D1D1F] space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Recuperar contraseña</h3>
              <button
                type="button"
                onClick={() => setModalOlvide(false)}
                className="text-[#86868B] hover:text-[#1D1D1F] cursor-pointer text-xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-[#86868B]">
              Ingresa tu correo y te enviamos un enlace para elegir una nueva contraseña.
            </p>
            <form onSubmit={handleSolicitarOlvide} className="space-y-3">
              {mensajeOlvide && (
                <p className="text-xs text-[#177E89] bg-[#177E89]/10 border border-[#177E89]/20 rounded-xl p-3">{mensajeOlvide}</p>
              )}
              <input
                type="email"
                required
                value={emailOlvide}
                onChange={(e) => setEmailOlvide(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5EA] bg-white text-[#1D1D1F] text-sm focus:outline-none focus:border-[#177E89]"
              />
              <button
                type="submit"
                disabled={enviandoOlvide}
                className="w-full py-2.5 rounded-xl btn-deep-black text-sm font-semibold cursor-pointer disabled:opacity-50"
              >
                {enviandoOlvide ? "Enviando…" : "Enviar enlace de recuperación"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
