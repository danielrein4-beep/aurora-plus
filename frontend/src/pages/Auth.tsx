import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import AuroraLogo from "../AuroraLogo";
import { AuroraGradientDef } from "../Icons";
import { useAuth } from "../context/AuthContext";

type Mode = "login" | "register";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("register");
  const [form, setForm] = useState({ nombre: "", email: "", password: "", confirmar: "", remember: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { login, isLoggedIn } = useAuth();

  if (isLoggedIn) return <Navigate to="/dashboard" replace />;

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nombre.trim() && mode === "register") e.nombre = "Ingresa tu nombre";
    if (!form.email.includes("@")) e.email = "Correo inválido";
    if (form.password.length < 6) e.password = "Mínimo 6 caracteres";
    if (mode === "register" && form.password !== form.confirmar) e.confirmar = "Las contraseñas no coinciden";
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    login(form.email, form.nombre || form.email.split("@")[0]);
    if (mode === "register") {
      navigate("/onboarding");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-full bg-[#060612] text-white flex items-center justify-center px-4 py-16 relative overflow-hidden">
      <AuroraGradientDef />

      {/* Blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="blob1 absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,229,184,0.12) 0%, transparent 70%)" }} />
        <div className="blob2 absolute -bottom-32 -right-48 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 70%)" }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <button onClick={() => navigate("/")} className="flex flex-col items-center gap-3 group">
            <AuroraLogo size={64} animated />
            <span className="font-['Outfit'] font-bold text-xl text-aurora">Aurora Plus</span>
          </button>
          <p className="text-white/35 text-sm mt-1">Software Administrativo</p>
        </div>

        {/* Card */}
        <div className="bg-[#0c0c20] border border-white/5 rounded-3xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/5">
            {(["register", "login"] as Mode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setErrors({}); }}
                className={`flex-1 py-4 text-sm font-semibold transition-all ${
                  mode === m ? "text-white border-b-2 border-teal-400" : "text-white/35 hover:text-white/60"
                }`}>
                {m === "register" ? "Crear cuenta" : "Iniciar sesión"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-white/40 text-xs mb-1.5 tracking-wide uppercase">Nombre completo</label>
                <input type="text" placeholder="Tu nombre"
                  value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
                  className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors ${errors.nombre ? "border-red-500/50" : "border-white/8 focus:border-teal-500/40"}`} />
                {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
              </div>
            )}

            <div>
              <label className="block text-white/40 text-xs mb-1.5 tracking-wide uppercase">Correo electrónico</label>
              <input type="email" placeholder="tu@empresa.com"
                value={form.email} onChange={(e) => set("email", e.target.value)}
                className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors ${errors.email ? "border-red-500/50" : "border-white/8 focus:border-teal-500/40"}`} />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-white/40 text-xs mb-1.5 tracking-wide uppercase">Contraseña</label>
              <input type="password" placeholder="••••••••"
                value={form.password} onChange={(e) => set("password", e.target.value)}
                className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors ${errors.password ? "border-red-500/50" : "border-white/8 focus:border-teal-500/40"}`} />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-white/40 text-xs mb-1.5 tracking-wide uppercase">Confirmar contraseña</label>
                <input type="password" placeholder="••••••••"
                  value={form.confirmar} onChange={(e) => set("confirmar", e.target.value)}
                  className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors ${errors.confirmar ? "border-red-500/50" : "border-white/8 focus:border-teal-500/40"}`} />
                {errors.confirmar && <p className="text-red-400 text-xs mt-1">{errors.confirmar}</p>}
              </div>
            )}

            {mode === "login" && (
              <div className="flex items-center justify-between">
                {/* Chulito — mantener sesión activa */}
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div
                    onClick={() => setForm((f) => ({ ...f, remember: !f.remember }))}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      form.remember
                        ? "g-aurora border-transparent"
                        : "border-white/20 bg-white/5 hover:border-white/35"
                    }`}>
                    {form.remember && (
                      <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                        <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors select-none">
                    Mantener sesión activa
                  </span>
                </label>

                <button type="button" className="text-teal-400 hover:text-teal-300 text-xs transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <button type="submit"
              className="w-full g-aurora glow-teal text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity text-sm mt-2">
              {mode === "register" ? "Crear cuenta y continuar →" : "Ingresar"}
            </button>

            {mode === "register" && (
              <p className="text-white/25 text-xs text-center leading-relaxed">
                Al crear tu cuenta aceptas nuestros{" "}
                <span className="text-teal-400 cursor-pointer hover:text-teal-300">Términos de uso</span>{" "}
                y{" "}
                <span className="text-teal-400 cursor-pointer hover:text-teal-300">Política de privacidad</span>
              </p>
            )}
          </form>
        </div>

        {mode === "register" && (
          <div className="mt-6 bg-teal-500/8 border border-teal-500/15 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-teal-400 text-lg flex-shrink-0">🎁</span>
            <div>
              <div className="text-white/70 text-sm font-medium">1 mes gratis, sin tarjeta</div>
              <div className="text-white/35 text-xs mt-0.5">Crea tu cuenta y activa tu licencia de prueba en 2 minutos.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
