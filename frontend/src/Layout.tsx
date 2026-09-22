import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import Nav from "./Nav";
import { AuroraGradientDef } from "./Icons";
import SuperAdminPortal from "./components/SuperAdminPortal";
import "./marketing-shell.css";

const FOOTER_GROUPS = [
  {
    title: "Plataforma",
    links: [
      { label: "Soluciones", to: "/soluciones" },
      { label: "Industrias", to: "/industrias" },
      { label: "Planes y precios", to: "/precios" },
    ],
  },
  {
    title: "Aurora Plus",
    links: [
      { label: "Nosotros", to: "/nosotros" },
      { label: "Contacto", to: "/nosotros" },
      { label: "Iniciar sesión", to: "/auth" },
    ],
  },
  {
    title: "Información",
    links: [
      { label: "Privacidad", to: "/privacidad" },
      { label: "Términos de uso", to: "/terminos" },
      { label: "Soporte", to: "/nosotros" },
    ],
  },
];

export default function Layout() {
  const location = useLocation();
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const clicksRef = useRef(0);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preserve the existing private administration shortcuts.
  const handleFooterLogoClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.altKey || event.shiftKey) {
      setShowSuperAdmin(true);
      return;
    }
    clicksRef.current += 1;
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    if (clicksRef.current >= 5) {
      clicksRef.current = 0;
      setShowSuperAdmin(true);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clicksRef.current = 0;
      }, 3500);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && ["a", "s"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        setShowSuperAdmin((previous) => !previous);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  return (
    <div className="marketing-shell min-h-full antialiased flex flex-col">
      <AuroraGradientDef />
      <Nav />
      <div key={location.pathname} className="animate-page-enter flex-1">
        <Outlet />
      </div>

      <footer className="marketing-footer">
        <div className="marketing-footer__inner">
          <div className="marketing-footer__main">
            <div className="marketing-footer__intro">
              <button type="button" onClick={handleFooterLogoClick} className="marketing-footer__brand" title="Aurora Plus - Administración">
                <span className="marketing-footer__monogram" aria-hidden="true">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M6 25 16 5l10 20M10.5 17h11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter" />
                  </svg>
                </span>
                <span>Aurora <span className="marketing-footer__brand-plus">Plus</span></span>
              </button>
              <p className="marketing-footer__claim">Más claridad.<br />Mejores decisiones.</p>
              <p className="marketing-footer__description">Software para conectar la operación de tu empresa.</p>
            </div>

            {FOOTER_GROUPS.map((group) => (
              <nav className="marketing-footer__group" key={group.title} aria-label={group.title}>
                <h2>{group.title}</h2>
                {group.links.map((link) => (
                  <Link key={link.label} to={link.to}>{link.label}</Link>
                ))}
              </nav>
            ))}
          </div>
          <div className="marketing-footer__legal">
            <p>© {new Date().getFullYear()} Aurora Plus. Todos los derechos reservados.</p>
            <span>Software administrativo</span>
          </div>
        </div>
      </footer>

      {showSuperAdmin && <SuperAdminPortal onClose={() => setShowSuperAdmin(false)} />}
    </div>
  );
}
