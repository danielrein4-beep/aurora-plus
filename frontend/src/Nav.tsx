import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AuroraLogo from "./AuroraLogo";
import { useAuth } from "./context/AuthContext";

const LINKS = [
  { label: "Inicio",      path: "/" },
  { label: "Soluciones",  path: "/soluciones" },
  { label: "Industrias",  path: "/industrias" },
  { label: "Precios",     path: "/precios" },
  { label: "Nosotros",    path: "/nosotros" },
];

// Mismo criterio que rutaVertical en Dashboard.tsx — el botón "Mis Sistemas"
// tiene que abrir el módulo real del tenant logueado, no uno fijo. Antes
// mandaba a /mediclinic sin importar la industria (un tenant de Horeca caía
// en el sistema de otro negocio de Salud).
const VERTICAL_POR_INDUSTRIA: Record<string, { ruta: string; label: string; icono: string }> = {
  restaurante: { ruta: "/restaurante", label: "Aurora Horeca", icono: "🍽️" },
  ferreteria: { ruta: "/comercio", label: "Aurora Comercio", icono: "🛒" },
  repuestos: { ruta: "/comercio", label: "Aurora Comercio", icono: "🛒" },
  farmacia: { ruta: "/comercio", label: "Aurora Comercio", icono: "🛒" },
  retail: { ruta: "/comercio", label: "Aurora Comercio", icono: "🛒" },
  finca: { ruta: "/ganaderia", label: "Aurora Ganadería", icono: "🐄" },
  ganaderia: { ruta: "/ganaderia", label: "Aurora Ganadería", icono: "🐄" },
};
const VERTICAL_POR_DEFECTO = { ruta: "/mediclinic", label: "Mediclinic Pro", icono: "🩺" };

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isLoggedIn, user, logout } = useAuth();
  const miSistema = VERTICAL_POR_INDUSTRIA[user?.industry || ""] || VERTICAL_POR_DEFECTO;

  const navClicksRef = useRef<number>(0);
  const navClickTimeoutRef = useRef<any>(null);

  const handleNavLogoClick = (e: React.MouseEvent) => {
    if (e.altKey || e.shiftKey) {
      navigate("/superadmin");
      return;
    }
    navClicksRef.current += 1;
    if (navClickTimeoutRef.current) clearTimeout(navClickTimeoutRef.current);

    if (navClicksRef.current >= 5) {
      navClicksRef.current = 0;
      navigate("/superadmin");
    } else {
      navClickTimeoutRef.current = setTimeout(() => {
        navClicksRef.current = 0;
      }, 3500);
      navigate("/");
    }
  };

  return (
    <nav className="aurora-public-nav fixed top-0 left-0 right-0 z-50 transition-colors duration-500">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">

        {/* Logo */}
        <button onClick={handleNavLogoClick} className="flex items-center gap-3 group cursor-pointer" title="Aurora Plus">
          <AuroraLogo size={38} animated />
          <div className="text-left">
            <div className="font-['IBM_Plex_Sans'] font-bold text-base leading-none tracking-tight text-[#f8f6ef]">
              Aurora Plus
            </div>
            <div className="font-mono text-white/65 text-[9px] leading-none tracking-[0.16em] uppercase mt-1">
              Software Administrativo
            </div>
          </div>
        </button>

        <div className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => (
            <button
              key={l.path}
              onClick={() => navigate(l.path)}
              className={`aurora-nav-link font-['IBM_Plex_Sans'] text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                pathname === l.path
                  ? "is-active text-[#f8f6ef]"
                  : "text-white/70 hover:text-[#35d7c3]"
              }`}>
              {l.label}
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-2.5">
              {/* Acceso directo al módulo del tenant — minimalista a propósito */}
              <button
                onClick={() => navigate(miSistema.ruta)}
                className="aurora-nav-outline text-[11px] font-semibold px-3 py-1.5 rounded-full cursor-pointer"
                title={`Abrir ${miSistema.label}`}
              >
                {miSistema.label} →
              </button>

              {/* Perfil del usuario (Aurora Hub) */}
              <div
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 apple-glass-pill px-3 py-1.5 rounded-full border border-slate-300/60 dark:border-white/10 cursor-pointer hover:border-teal-400/50 transition-colors"
                title="Ir al Hub de Empresa (Facturación, Equipo, Ajustes)"
              >
                <span className="w-6 h-6 rounded-full g-aurora flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm">
                  {user?.nombre?.charAt(0).toUpperCase() ?? "U"}
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-white/90">
                  {user?.nombre || user?.email?.split("@")[0]}
                </span>
              </div>

              {/* Cerrar sesión */}
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="text-xs text-slate-500 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1.5 cursor-pointer font-medium"
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => navigate("/auth")}
                className="aurora-nav-outline text-xs font-bold px-4 py-2 rounded-md cursor-pointer">
                Iniciar sesión
              </button>
              <button onClick={() => navigate("/onboarding")}
                className="aurora-nav-primary text-xs font-bold px-5 py-2 rounded-md cursor-pointer tracking-wide">
                Solicitar demo
              </button>
            </>
          )}
        </div>

        {/* Mobile controls (Menu trigger) */}
        <div className="flex md:hidden items-center gap-2">
          <button className="p-2 text-white/70 hover:text-white cursor-pointer" onClick={() => setMobileOpen(!mobileOpen)}>
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
                <button
                  onClick={() => { navigate(miSistema.ruta); setMobileOpen(false); }}
                  className="aurora-nav-outline w-full text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
                >
                  Entrar a {miSistema.label} →
                </button>
                <button
                  onClick={() => { navigate("/dashboard"); setMobileOpen(false); }}
                  className="w-full apple-glass-btn text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
                >
                  <span>🏢 Aurora Hub (Panel de Empresa)</span>
                </button>
                <div className="text-center text-xs text-white/60 py-1">
                  Usuario: <strong className="text-white">{user?.nombre || user?.email}</strong>
                </div>
                <button onClick={() => { logout(); navigate("/"); setMobileOpen(false); }}
                  className="w-full text-sm text-white/40 hover:text-red-400 py-2">
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
