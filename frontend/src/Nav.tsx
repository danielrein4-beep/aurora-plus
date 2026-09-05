import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AuroraLogo from "./AuroraLogo";
import { useAuth } from "./context/AuthContext";
import ThemeToggle from "./components/ThemeToggle";

const LINKS = [
  { label: "Inicio",      path: "/" },
  { label: "Soluciones",  path: "/soluciones" },
  { label: "Industrias",  path: "/industrias" },
  { label: "Precios",     path: "/precios" },
  { label: "Nosotros",    path: "/nosotros" },
];

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isLoggedIn, user, logout } = useAuth();

  return (
    <nav className="nav-glass fixed top-0 left-0 right-0 z-50 border-b border-black/5 dark:border-white/5 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <button onClick={() => navigate("/")} className="flex items-center gap-3 group cursor-pointer">
          <AuroraLogo size={38} animated />
          <div className="text-left">
            <div className="font-['Outfit'] font-bold text-base leading-none tracking-tight text-aurora">
              Aurora Plus
            </div>
            <div className="text-slate-400 dark:text-white/30 text-[10px] leading-none tracking-widest uppercase mt-0.5">
              Software Administrativo
            </div>
          </div>
        </button>

        {/* Desktop links en Cápsula Liquid Glass (Solo Texto, sin emojis) */}
        <div className="hidden md:flex items-center gap-1 apple-glass-pill rounded-full p-1 border border-black/10 dark:border-white/15 bg-white/40 dark:bg-white/[0.04] backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
          {LINKS.map((l) => (
            <button
              key={l.path}
              onClick={() => navigate(l.path)}
              className={`px-5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 cursor-pointer ${
                pathname === l.path
                  ? "bg-white/80 dark:bg-white/18 text-slate-900 dark:text-white font-semibold shadow-[0_2px_14px_rgba(0,0,0,0.1),inset_0_1px_1.5px_rgba(255,255,255,0.8)] border border-white/60 dark:border-white/25 backdrop-blur-md"
                  : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8 hover:shadow-sm"
              }`}>
              {l.label}
            </button>
          ))}
        </div>

        {/* CTA & Theme Switcher */}
        <div className="hidden md:flex items-center gap-3">
          {/* Liquid Glass Theme Switcher */}
          <ThemeToggle />

          {isLoggedIn ? (
            <>
              <button onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-white/60 hover:text-slate-950 dark:hover:text-white transition-colors px-2 py-1.5 cursor-pointer">
                <span className="w-7 h-7 rounded-lg g-aurora flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {user?.nombre?.charAt(0).toUpperCase() ?? "U"}
                </span>
                <span className="font-medium">{user?.nombre?.split(" ")[0]}</span>
              </button>
              <button onClick={() => { logout(); navigate("/"); }}
                className="text-sm text-slate-400 dark:text-white/35 hover:text-slate-700 dark:hover:text-white/70 transition-colors px-3 py-2 cursor-pointer">
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate("/auth")}
                className="apple-glass-btn text-xs font-semibold text-slate-800 dark:text-white/90 hover:text-black dark:hover:text-white px-4 py-2 rounded-full cursor-pointer">
                Iniciar sesión
              </button>
              <button onClick={() => navigate("/onboarding")}
                className="btn-cyber-neon text-white text-xs font-bold px-5 py-2 rounded-full cursor-pointer tracking-wide shadow-md">
                Solicitar demo
              </button>
            </>
          )}
        </div>

        {/* Mobile controls (Theme Toggle + Menu trigger) */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle className="scale-90" />
          <button className="p-2 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white cursor-pointer" onClick={() => setMobileOpen(!mobileOpen)}>
            <div className="w-5 space-y-1.5">
              <span className={`block h-0.5 bg-current transition-all origin-center ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block h-0.5 bg-current transition-all ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
              <span className={`block h-0.5 bg-current transition-all origin-center ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-[rgba(6,6,18,0.97)] px-4 py-4 space-y-1">
          {LINKS.map((l) => (
            <button key={l.path}
              onClick={() => { navigate(l.path); setMobileOpen(false); }}
              className={`block w-full text-left px-4 py-3 text-sm rounded-lg transition-all ${
                pathname === l.path ? "text-white bg-white/10" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}>
              {l.label}
            </button>
          ))}
          <div className="pt-3 space-y-2 border-t border-white/5 mt-3">
            {isLoggedIn ? (
              <>
                <button onClick={() => { navigate("/dashboard"); setMobileOpen(false); }}
                  className="w-full text-sm text-white/70 py-2 flex items-center justify-center gap-2">
                  <span className="w-6 h-6 rounded-lg g-aurora flex items-center justify-center text-xs font-bold text-white">
                    {user?.nombre?.charAt(0).toUpperCase() ?? "U"}
                  </span>
                  Mi cuenta
                </button>
                <button onClick={() => { logout(); navigate("/"); setMobileOpen(false); }}
                  className="w-full text-sm text-white/35 py-2">
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { navigate("/auth"); setMobileOpen(false); }}
                  className="w-full text-sm text-white/50 py-2">Ingresar</button>
                <button onClick={() => { navigate("/precios"); setMobileOpen(false); }}
                  className="w-full g-aurora text-white text-sm font-semibold py-3 rounded-xl">
                  Solicitar demo gratis
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
