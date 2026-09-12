import { useState, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Nav from "./Nav";
import { AuroraGradientDef } from "./Icons";
import SuperAdminPortal from "./components/SuperAdminPortal";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  
  // 5-Clicks Easter Egg Trigger para CEOs de Aurora
  const clicksRef = useRef<number>(0);
  const clickTimeoutRef = useRef<any>(null);

  const handleFooterLogoClick = () => {
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
      }, 2500);
    }
  };

  return (
    <div className="min-h-full bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-500 overflow-x-hidden">
      <AuroraGradientDef />

      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="blob1 absolute -top-48 -left-48 w-[640px] h-[640px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,229,184,0.13) 0%, transparent 70%)" }} />
        <div className="blob2 absolute top-1/2 -right-64 w-[720px] h-[720px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.11) 0%, transparent 70%)" }} />
        <div className="blob3 absolute -bottom-32 left-1/3 w-[560px] h-[560px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(14,165,233,0.09) 0%, transparent 70%)" }} />
      </div>

      <Nav />
      <div key={location.pathname} className="animate-page-enter">
        <Outlet />
      </div>

      {/* Footer con el logo interactivo para CEOs (5 clics) */}
      <footer className="aurora-public-footer border-t py-12 px-4 sm:px-6 relative transition-colors duration-500">
        <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div
            onClick={handleFooterLogoClick}
            className="flex items-center gap-3 select-none cursor-pointer group transition-transform active:scale-95"
            title="Aurora Plus"
          >
            <div>
              <span className="font-['Outfit'] font-bold text-aurora text-sm group-hover:brightness-110 transition-all">
                Aurora Plus
              </span>
              <div className="text-slate-400 dark:text-white/25 text-[10px] tracking-widest uppercase">
                Software Administrativo
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500 dark:text-white/35">
            {[
              { label: "Privacidad", to: "/privacidad" },
              { label: "Términos", to: "/terminos" },
              { label: "Soporte", to: "/nosotros" },
              { label: "Contacto", to: "/nosotros" },
            ].map((l) => (
              <button key={l.label} onClick={() => navigate(l.to)} className="hover:text-slate-900 dark:hover:text-white/80 transition-colors cursor-pointer">{l.label}</button>
            ))}
          </div>
          <p className="text-slate-400 dark:text-white/20 text-xs">© 2026 Aurora Plus. Todos los derechos reservados.</p>
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

