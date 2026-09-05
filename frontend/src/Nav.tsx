import { useState } from "react";
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

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isLoggedIn, user, logout } = useAuth();

  return (
    <nav className="nav-glass fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[rgba(6,6,18,0.8)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <button onClick={() => navigate("/")} className="flex items-center gap-3 group">
          <AuroraLogo size={38} animated />
          <div>
            <div className="font-['Outfit'] font-bold text-base leading-none tracking-tight text-aurora">
              Aurora Plus
            </div>
            <div className="text-white/30 text-[10px] leading-none tracking-widest uppercase mt-0.5">
              Software Administrativo
            </div>
          </div>
        </button>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <button key={l.path} onClick={() => navigate(l.path)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === l.path
                  ? "text-white bg-white/10"
                  : "text-white/45 hover:text-white/80 hover:bg-white/5"
              }`}>
              {l.label}
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <button onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors px-2 py-1.5">
                <span className="w-7 h-7 rounded-lg g-aurora flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {user?.nombre?.charAt(0).toUpperCase() ?? "U"}
                </span>
                <span>{user?.nombre?.split(" ")[0]}</span>
              </button>
              <button onClick={() => { logout(); navigate("/"); }}
                className="text-sm text-white/35 hover:text-white/70 transition-colors px-3 py-2">
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate("/auth")}
                className="text-sm text-white/50 hover:text-white transition-colors px-3 py-2">
                Ingresar
              </button>
              <button onClick={() => navigate("/precios")}
                className="g-aurora text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity glow-teal">
                Solicitar demo
              </button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2 text-white/60 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
          <div className="w-5 space-y-1.5">
            <span className={`block h-0.5 bg-current transition-all origin-center ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block h-0.5 bg-current transition-all ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
            <span className={`block h-0.5 bg-current transition-all origin-center ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </div>
        </button>
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
