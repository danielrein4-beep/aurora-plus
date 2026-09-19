import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AuroraLogo from "./AuroraLogo";
import SpecularButton from "./components/SpecularButton";
import { useAuth } from "./context/AuthContext";

const LINKS = [
  { label: "Inicio",      path: "/" },
  { label: "Soluciones",  path: "/soluciones" },
  { label: "Industrias",  path: "/industrias" },
  { label: "Precios",     path: "/precios" },
  { label: "Nosotros",    path: "/nosotros" },
];

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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-none border-b border-[#E5E5EA] transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 h-18 flex items-center justify-between">

        {/* Logo */}
        <button onClick={handleNavLogoClick} className="flex items-center gap-3 group cursor-pointer" title="Aurora Plus">
          <AuroraLogo size={34} animated />
          <div className="text-left">
            <div className="font-['Inter'] font-bold text-base leading-none tracking-tight text-[#1D1D1F]">
              Aurora Plus
            </div>
            <div className="font-sans text-[#86868B] text-[10px] leading-none tracking-wider uppercase mt-1">
              Software Administrativo
            </div>
          </div>
        </button>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-7">
          {LINKS.map((l) => (
            <button
              key={l.path}
              onClick={() => navigate(l.path)}
              className={`font-sans text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                pathname === l.path
                  ? "text-[#0B3D91] font-bold"
                  : "text-[#86868B] hover:text-[#1D1D1F]"
              }`}>
              {l.label}
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => navigate(miSistema.ruta)}
                className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#E5E5EA] transition-colors cursor-pointer"
                title={`Abrir ${miSistema.label}`}
              >
                {miSistema.label} →
              </button>

              <div
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] cursor-pointer hover:border-[#D1D1D6] transition-colors"
                title="Ir al Hub de Empresa"
              >
                <span className="w-6 h-6 rounded-full bg-[#0B3D91] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {user?.nombre?.charAt(0).toUpperCase() ?? "U"}
                </span>
                <span className="text-xs font-semibold text-[#1D1D1F]">
                  {user?.nombre || user?.email?.split("@")[0]}
                </span>
              </div>

              <button
                onClick={() => { logout(); navigate("/"); }}
                className="text-xs text-[#86868B] hover:text-[#ef4444] transition-colors px-2 py-1.5 cursor-pointer font-medium"
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <SpecularButton
                size="sm"
                radius={999}
                tint="#F5F5F7"
                tintOpacity={0.92}
                blur={14}
                textColor="#1D1D1F"
                lineColor="#ffffff"
                baseColor="#D1D1D6"
                shineSize={10}
                shineFade={40}
                proximity={220}
                onClick={() => navigate("/auth")}
              >
                Iniciar sesión
              </SpecularButton>
              <SpecularButton
                size="sm"
                radius={999}
                tint="#0B3D91"
                tintOpacity={1}
                textColor="#ffffff"
                lineColor="#7ba7f7"
                baseColor="#0B3D91"
                shineSize={12}
                shineFade={45}
                intensity={1.3}
                proximity={220}
                onClick={() => navigate("/onboarding")}
              >
                Solicitar demo
              </SpecularButton>
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-2">
          <button
            className="p-2 text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-lg transition-colors cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Abrir menú"
          >
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
        <div className="md:hidden border-t border-[#E5E5EA] bg-white px-6 py-5 space-y-1 shadow-lg">
          {LINKS.map((l) => (
            <button
              key={l.path}
              onClick={() => { navigate(l.path); setMobileOpen(false); }}
              className={`block w-full text-left px-4 py-3 text-sm rounded-xl font-semibold transition-colors ${
                pathname === l.path ? "text-[#0B3D91] bg-[#F5F5F7]" : "text-[#1D1D1F] hover:bg-[#F5F5F7]"
              }`}>
              {l.label}
            </button>
          ))}
          <div className="pt-4 space-y-2 border-t border-[#E5E5EA] mt-3">
            {isLoggedIn ? (
              <>
                <button
                  onClick={() => { navigate(miSistema.ruta); setMobileOpen(false); }}
                  className="w-full text-sm font-semibold py-2.5 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5EA] flex items-center justify-center gap-2"
                >
                  Entrar a {miSistema.label} →
                </button>
                <button
                  onClick={() => { navigate("/dashboard"); setMobileOpen(false); }}
                  className="w-full text-sm font-semibold py-2.5 rounded-xl bg-[#0B3D91] text-white flex items-center justify-center gap-2"
                >
                  🏢 Panel de Empresa
                </button>
                <button onClick={() => { logout(); navigate("/"); setMobileOpen(false); }}
                  className="w-full text-sm text-[#86868B] hover:text-[#ef4444] py-2 font-medium">
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { navigate("/auth"); setMobileOpen(false); }}
                  className="w-full text-sm font-semibold text-[#1D1D1F] py-2.5 rounded-xl hover:bg-[#F5F5F7]"
                >
                  Ingresar
                </button>
                <button
                  onClick={() => { navigate("/precios"); setMobileOpen(false); }}
                  className="w-full bg-[#0B3D91] text-white text-sm font-semibold py-3 rounded-xl shadow-sm"
                >
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
