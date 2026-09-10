import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import AuroraLogo from "../AuroraLogo";
import { AuroraGradientDef, IconLock } from "../Icons";
import { useAuth } from "../context/AuthContext";
import { solicitarRecuperacionClave } from "../api";

type Mode = "login" | "register";

const REMEMBERED_EMAIL_KEY = "aurora_remembered_email";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState(() => {
    let email = "";
    try {
      email = localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
    } catch {}
    return { nombre: "", email, password: "", confirmar: "", remember: true, terms: true };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const { login, isLoggedIn, user } = useAuth();

  const [modalOlvide, setModalOlvide] = useState(false);
  const [emailOlvide, setEmailOlvide] = useState("");
  const [enviandoOlvide, setEnviandoOlvide] = useState(false);
  const [mensajeOlvide, setMensajeOlvide] = useState<string | null>(null);

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nombre.trim() && mode === "register") e.nombre = "Ingresa tu nombre";
    if (!form.email.includes("@")) e.email = "Ingresa un correo electrónico válido";
    if (form.password.length < 6) e.password = "Mínimo 6 caracteres";
    if (mode === "register" && form.password !== form.confirmar) e.confirmar = "Las contraseñas no coinciden";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setEnviando(true);
    try {
      if (mode === "register") {
        // El registro real (crear el negocio en el backend) ocurre al final del
        // onboarding, después de elegir módulo y método de pago — aquí solo se
        // recogen los datos básicos y se pasan a la siguiente pantalla.
        navigate("/onboarding", { state: { nombre: form.nombre, email: form.email, password: form.password } });
      } else {
        if (form.remember) {
          try { localStorage.setItem(REMEMBERED_EMAIL_KEY, form.email); } catch {}
        } else {
          try { localStorage.removeItem(REMEMBERED_EMAIL_KEY); } catch {}
        }
        await login(form.email, form.password);
        navigate("/dashboard");
      }
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "No se pudo iniciar sesión" });
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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center px-4 sm:px-6 py-12 relative overflow-hidden transition-colors duration-300">
      <AuroraGradientDef />

      {/* ── FONDOS ATMOSFÉRICOS: AURORAS BOREALES 3D Y DESTELLOS DE NEÓN ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="aurora-ribbon-1 -top-32 -left-28 opacity-60" />
        <div className="aurora-ribbon-2 -bottom-20 -right-28 opacity-70" />
        <div className="cyber-grid absolute inset-0 opacity-20" />
        
        {/* Luces volumétricas estilo torus (Rosa / Cyan / Púrpura) */}
        <div className="absolute w-[550px] h-[550px] rounded-full blur-[140px] bg-gradient-to-tr from-[#ff007f]/20 via-[#7928ca]/25 to-[#00f2fe]/20 -top-20" />
      </div>

      {/* ── BOTÓN FLOTANTE SUPERIOR: VOLVER A PÁGINA PRINCIPAL ── */}
      <button
        type="button"
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 z-30 apple-glass-pill px-4 py-2 rounded-full text-xs font-semibold text-white/80 hover:text-white hover:border-[#00FFC2]/60 hover:bg-white/10 transition-all duration-300 flex items-center gap-2 cursor-pointer group shadow-xl"
        title="Volver a la página principal">
        <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1 text-[#00FFC2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Volver a la página principal</span>
      </button>

      {/* ── CONTENEDOR PRINCIPAL: TARJETA LIQUID GLASS ULTRA PREMIUM ── */}
      <div className="relative z-10 w-full max-w-4xl apple-glass rounded-[32px] p-6 sm:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.7)] border border-white/15 mt-10 sm:mt-0">
        
        {/* Barra superior de la tarjeta */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-8 mb-8 border-b border-white/10">
          <button onClick={() => navigate("/")} className="flex items-center gap-3.5 group cursor-pointer" title="Ir a la página principal">
            <div className="p-2 rounded-2xl bg-white/5 border border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-300">
              <AuroraLogo size={34} animated />
            </div>
            <div className="text-left">
              <div className="font-['Outfit'] font-black text-lg text-aurora leading-none">
                Aurora Plus
              </div>
              <div className="text-white/35 text-[10px] uppercase tracking-widest mt-1">
                Next-Gen ERP Platform
              </div>
            </div>
          </button>

          {/* Acciones de la barra superior: Volver a inicio + Toggle de modo */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="apple-glass-pill px-3.5 py-1.5 rounded-full text-xs font-semibold text-white/70 hover:text-white hover:border-[#00FFC2]/50 hover:bg-white/10 transition-all duration-300 flex items-center gap-1.5 cursor-pointer group shadow-sm"
              title="Volver al inicio">
              <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 text-[#00FFC2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Inicio</span>
            </button>

            {/* Toggle pill mode: Iniciar sesión / Crear cuenta */}
            <div className="apple-glass-pill rounded-full p-1 flex items-center gap-1">
              <button
                type="button"
                onClick={() => { setMode("login"); setErrors({}); }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                  mode === "login"
                    ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                    : "text-white/50 hover:text-white"
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${mode === "login" ? "bg-teal-500 animate-pulse" : "bg-white/30"}`} />
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setErrors({}); }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                  mode === "register"
                    ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                    : "text-white/50 hover:text-white"
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${mode === "register" ? "bg-[#00FFC2] animate-pulse" : "bg-white/30"}`} />
                Registrarse
              </button>
            </div>
          </div>
        </div>

        {/* Grid Principal: Formulario a la Izquierda + Panel Visual a la Derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Columna Izquierda: Formulario "Join the Future" */}
          <div className="lg:col-span-7">
            <div className="mb-6">
              <h2 className="font-['Outfit'] font-black text-3xl sm:text-4xl text-white tracking-tight">
                {mode === "register" ? "Join the Future" : "Welcome Back"}
              </h2>
              {/* Barra de acento aurora estilo futurista */}
              <div className="h-1 w-20 bg-gradient-to-r from-[#00FFC2] via-[#00C9A7] to-[#0B3D91] rounded-full mt-2 shadow-[0_0_12px_rgba(0,255,194,0.5)]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Alejandro Ramos"
                    value={form.nombre}
                    onChange={(e) => set("nombre", e.target.value)}
                    className="w-full bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 focus:border-teal-400/60 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-all shadow-inner"
                  />
                  {errors.nombre && <p className="text-[#ff3b80] text-xs mt-1">{errors.nombre}</p>}
                </div>
              )}

              <div>
                <label className="block text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="usuario@empresa.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="w-full bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 focus:border-teal-400/60 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-all shadow-inner"
                />
                {errors.email && <p className="text-[#ff3b80] text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className="w-full bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 focus:border-teal-400/60 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-all shadow-inner"
                />
                {errors.password && <p className="text-[#ff3b80] text-xs mt-1">{errors.password}</p>}
                
                {/* Indicador sutil de seguridad */}
                {form.password.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="h-1 flex-1 rounded-full bg-teal-400" />
                    <div className={`h-1 flex-1 rounded-full ${form.password.length >= 6 ? "bg-teal-400" : "bg-white/10"}`} />
                    <div className={`h-1 flex-1 rounded-full ${form.password.length >= 10 ? "bg-teal-400" : "bg-white/10"}`} />
                    <span className="text-[10px] text-white/40 font-mono ml-1">
                      {form.password.length < 6 ? "Débil" : form.password.length < 10 ? "Buena" : "Segura"}
                    </span>
                  </div>
                )}
              </div>

              {mode === "register" && (
                <div>
                  <label className="block text-white/50 text-[11px] font-medium uppercase tracking-wider mb-1">
                    Confirmar Contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={form.confirmar}
                    onChange={(e) => set("confirmar", e.target.value)}
                    className="w-full bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 focus:border-teal-400/60 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-all shadow-inner"
                  />
                  {errors.confirmar && <p className="text-[#ff3b80] text-xs mt-1">{errors.confirmar}</p>}
                </div>
              )}

              {/* Checkboxes de Sesión / Términos */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={mode === "login" ? form.remember : form.terms}
                    onChange={(e) => set(mode === "login" ? "remember" : "terms", e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-teal-400 focus:ring-0 focus:outline-none"
                  />
                  <span className="text-xs text-white/60 hover:text-white/80 transition-colors">
                    {mode === "login" ? "Mantener sesión activa" : "Acepto los términos y condiciones"}
                  </span>
                </label>

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => { setModalOlvide(true); setEmailOlvide(form.email); setMensajeOlvide(null); }}
                    className="text-xs text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
                  >
                    ¿Olvidaste tu clave?
                  </button>
                )}
              </div>

              {errors.submit && (
                <p className="text-[#ff3b80] text-xs text-center -mb-1">{errors.submit}</p>
              )}

              {/* Botón Principal Cyber Neon */}
              <button
                type="submit"
                disabled={enviando}
                className="w-full btn-cyber-neon text-white font-bold py-3.5 rounded-full text-sm mt-4 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                {enviando ? "Verificando…" : mode === "register" ? "Crear cuenta y comenzar →" : "Ingresar a la plataforma →"}
              </button>
            </form>
          </div>

          {/* Columna Derecha: Tarjeta Visual Futurista Apple Glass */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-6">
            <div className="apple-glass rounded-2xl p-6 sm:p-7 relative overflow-hidden border border-white/10 shadow-2xl">
              <div className="line-aurora absolute top-0 left-0 right-0" />
              
              <p className="text-sm sm:text-base text-white/80 leading-relaxed italic mb-4 font-light">
                "Ingresa al futuro de la gestión operativa multi-empresa. Automatiza clínicas, fincas, minería, restaurantes y ferreterías con un motor central inteligente y multi-moneda."
              </p>
              
              <div className="text-xs font-mono text-teal-400 font-semibold tracking-wider">
                // Aurora Plus Next-Gen Enterprise
              </div>

              <div className="mt-6 pt-5 border-t border-white/10 space-y-2 text-xs text-white/50">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>7 Verticales Nativas en la misma sesión</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Motor Financiero Multi-Moneda (USD/VES/COP)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span>Offline-First POS & Idempotencia de Caja</span>
                </div>
              </div>
            </div>

            {/* Badge inferior derecho de seguridad */}
            <div className="flex justify-end">
              <div className="apple-glass-pill rounded-full px-4 py-2 flex items-center gap-2 text-xs text-white/70 shadow-lg">
                <IconLock size={14} />
                <span className="font-medium text-[11px] tracking-wide">Cifrado de Extremo a Extremo (AES-256)</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {modalOlvide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-3xl p-6 bg-[#0a0e17] border border-white/10 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Recuperar contraseña</h3>
              <button
                type="button"
                onClick={() => setModalOlvide(false)}
                className="text-white/40 hover:text-white cursor-pointer text-xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-white/50">
              Ingresa tu correo y te enviamos un enlace para elegir una nueva contraseña.
            </p>
            <form onSubmit={handleSolicitarOlvide} className="space-y-3">
              {mensajeOlvide && (
                <p className="text-xs text-teal-300 bg-teal-500/10 border border-teal-500/20 rounded-xl p-3">{mensajeOlvide}</p>
              )}
              <input
                type="email"
                required
                value={emailOlvide}
                onChange={(e) => setEmailOlvide(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-white text-sm focus:outline-none focus:border-teal-400"
              />
              <button
                type="submit"
                disabled={enviandoOlvide}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-900 text-sm font-bold cursor-pointer disabled:opacity-50"
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
