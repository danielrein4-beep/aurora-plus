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
    // Clase "dark" fija: el sitio público quedó oscuro permanente (decisión ya
    // tomada), pero todo el código heredado usa clases dark: de Tailwind que
    // solo se activan bajo un ancestro .dark (ver @custom-variant en index.css).
    // Sin esto, cualquier bg-slate-100/bg-white con su variante dark: se queda
    // pegado al fondo claro mientras el texto de arriba sí se recolorea vía los
    // overrides de .aurora-public-page — texto claro sobre fondo claro,
    // ilegible. Esto activa TODO el sistema dark: de una vez, en vez de tener
    // que perseguir cada caso suelto con !important.
    <div className="dark min-h-full bg-[#050d10] text-[var(--text-primary)] transition-colors duration-500 overflow-x-hidden">
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
            className="flex items-center gap-3 select-none cursor-pointer group transition-transform active:scale-95 p-2 -m-2 rounded-2xl hover:bg-white/5"
            title="Aurora Plus - Administracion"
          >
            <div className="p-1 rounded-xl bg-white/5 border border-white/10 group-hover:border-teal-400/40 transition-colors">
              <AuroraLogo size={28} animated />
            </div>
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

