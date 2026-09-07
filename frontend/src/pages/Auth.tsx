import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import AuroraLogo from "../AuroraLogo";
import { AuroraGradientDef, IconLock } from "../Icons";
import { useAuth } from "../context/AuthContext";

type Mode = "login" | "register";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ nombre: "", email: "", password: "", confirmar: "", remember: true, terms: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const { login, isLoggedIn, user } = useAuth();

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
        await login(form.email, form.password);
        navigate("/dashboard");
      }
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "No se pudo iniciar sesión" });
    } finally {
      setEnviando(false);
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

      {/* ── CONTENEDOR PRINCIPAL: TARJETA LIQUID GLASS ULTRA PREMIUM ── */}
      <div className="relative z-10 w-full max-w-4xl apple-glass rounded-[32px] p-6 sm:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.7)] border border-white/15">
        
        {/* Barra superior de la tarjeta */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-8 mb-8 border-b border-white/10">
          <button onClick={() => navigate("/")} className="flex items-center gap-3.5 group">
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

          {/* Toggle pill mode: Iniciar sesión / Crear cuenta */}
          <div className="apple-glass-pill rounded-full p-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setMode("login"); setErrors({}); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 ${
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
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 flex items-center gap-1.5 ${
                mode === "register"
                  ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                  : "text-white/50 hover:text-white"
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${mode === "register" ? "bg-[#ff3b80] animate-pulse" : "bg-white/30"}`} />
              Registrarse
            </button>
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
              {/* Barra de acento bicolor estilo futurista */}
              <div className="h-1 w-20 bg-gradient-to-r from-[#ff3b80] via-[#a855f7] to-[#00f2fe] rounded-full mt-2 shadow-[0_0_12px_rgba(255,59,128,0.5)]" />
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
                  <button type="button" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
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
    </div>
  );
}
