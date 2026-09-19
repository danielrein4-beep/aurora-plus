import { useState, useRef, useEffect } from "react";
import AuroraLogo from "./AuroraLogo";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Nav from "./Nav";
import { AuroraGradientDef } from "./Icons";
import SuperAdminPortal from "./components/SuperAdminPortal";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  
  // 5-Clicks Easter Egg Trigger para CEOs de Aurora (o Alt/Shift + Clic)
  const clicksRef = useRef<number>(0);
  const clickTimeoutRef = useRef<any>(null);

  const handleFooterLogoClick = (e: React.MouseEvent) => {
    // Si presiona Alt o Shift, abre de inmediato sin esperar los 5 clics
    if (e.altKey || e.shiftKey) {
      setShowSuperAdmin(true);
      return;
    }

    clicksRef.current += 1;

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    if (clicksRef.current >= 5) {
      clicksRef.current = 0;
      setShowSuperAdmin(true);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clicksRef.current = 0;
      }, 3500);
    }
  };

  // Atajo de teclado global Ctrl+Shift+A o Ctrl+Shift+S para acceder de inmediato
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "S" || e.key === "a" || e.key === "s")) {
        e.preventDefault();
        setShowSuperAdmin((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-full bg-white text-[#1D1D1F] overflow-x-hidden antialiased flex flex-col justify-between">
      <AuroraGradientDef />

      <Nav />
      <div key={location.pathname} className="animate-page-enter flex-1">
        <Outlet />
      </div>

      {/* Footer Apple Aesthetic */}
      <footer className="bg-[#F5F5F7] border-t border-[#E5E5EA] py-12 px-6 sm:px-8 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div
              onClick={handleFooterLogoClick}
              className="flex items-center gap-3 select-none cursor-pointer group p-2 -m-2 rounded-2xl hover:bg-black/5 transition-colors"
              title="Aurora Plus - Administración"
            >
              <div className="p-1 rounded-xl bg-white border border-[#E5E5EA] shadow-sm">
                <AuroraLogo size={28} animated />
              </div>
              <div>
                <span className="font-['Outfit'] font-bold text-[#1D1D1F] text-sm">
                  Aurora Plus
                </span>
                <div className="text-[#86868B] text-[10px] tracking-widest uppercase">
                  Software Administrativo
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-[#86868B]">
              {[
                { label: "Privacidad", to: "/privacidad" },
                { label: "Términos", to: "/terminos" },
                { label: "Soporte", to: "/nosotros" },
                { label: "Contacto", to: "/nosotros" },
              ].map((l) => (
                <button
                  key={l.label}
                  onClick={() => navigate(l.to)}
                  className="hover:text-[#1D1D1F] transition-colors cursor-pointer font-medium"
                >
                  {l.label}
                </button>
              ))}
            </div>
            <p className="text-[#86868B] text-xs">© 2026 Aurora Plus. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Portal Maestro Oculto para CEOs / SuperAdmin */}
      {showSuperAdmin && (
        <SuperAdminPortal onClose={() => setShowSuperAdmin(false)} />
      )}
    </div>
  );
}
