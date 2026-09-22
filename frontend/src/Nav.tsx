import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

const LINKS = [
  { label: "Soluciones", path: "/soluciones" },
  { label: "Industrias", path: "/industrias" },
  { label: "Precios", path: "/precios" },
  { label: "Nosotros", path: "/nosotros" },
];

const VERTICAL_POR_INDUSTRIA: Record<string, { ruta: string; label: string }> = {
  restaurante: { ruta: "/restaurante", label: "Aurora Horeca" },
  comercio: { ruta: "/comercio", label: "Aurora Comercio" },
  ferreteria: { ruta: "/comercio", label: "Aurora Comercio" },
  repuestos: { ruta: "/comercio", label: "Aurora Comercio" },
  farmacia: { ruta: "/comercio", label: "Aurora Comercio" },
  retail: { ruta: "/comercio", label: "Aurora Comercio" },
  finca: { ruta: "/ganaderia", label: "Aurora Ganadería" },
  ganaderia: { ruta: "/ganaderia", label: "Aurora Ganadería" },
  veterinaria: { ruta: "/veterinaria", label: "Aurora Veterinaria" },
  construccion: { ruta: "/construccion", label: "Aurora Construcción" },
};
const VERTICAL_POR_DEFECTO = { ruta: "/mediclinic", label: "Mediclinic Pro" };

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isLoggedIn, user, logout } = useAuth();
  const miSistema = VERTICAL_POR_INDUSTRIA[user?.industry || ""] || VERTICAL_POR_DEFECTO;
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const navClicksRef = useRef(0);
  const navClickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        mobileToggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  useEffect(() => () => {
    if (navClickTimeoutRef.current) clearTimeout(navClickTimeoutRef.current);
  }, []);

  const handleNavLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    setMobileOpen(false);
    if (event.altKey || event.shiftKey) {
      event.preventDefault();
      navigate("/superadmin");
      return;
    }
    navClicksRef.current += 1;
    if (navClickTimeoutRef.current) clearTimeout(navClickTimeoutRef.current);
    if (navClicksRef.current >= 5) {
      event.preventDefault();
      navClicksRef.current = 0;
      navigate("/superadmin");
    } else {
      navClickTimeoutRef.current = setTimeout(() => {
        navClicksRef.current = 0;
      }, 3500);
    }
  };

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate("/");
  };

  const accountActions = (
    <>
      <Link className="marketing-nav__business" to={miSistema.ruta} title={miSistema.label} onClick={() => setMobileOpen(false)}>
        Mi negocio
      </Link>
      <Link className="marketing-nav__button" to="/dashboard" title="Ir al Hub de Empresa" onClick={() => setMobileOpen(false)}>
        Mi cuenta
      </Link>
      <button className="marketing-nav__logout" type="button" onClick={handleLogout}>
        Cerrar sesión
      </button>
    </>
  );

  const visitorActions = (
    <>
      <Link className="marketing-nav__login" to="/auth" onClick={() => setMobileOpen(false)}>
        Iniciar sesión
      </Link>
      <Link className="marketing-nav__button" to="/auth" onClick={() => setMobileOpen(false)}>
        Comenzar
      </Link>
    </>
  );

  return (
    <header className="marketing-nav">
      <div className="marketing-nav__inner">
        <Link to="/" onClick={handleNavLogoClick} className="marketing-nav__brand" aria-label="Aurora Plus, inicio">
          <span className="marketing-nav__monogram" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M6 25 16 5l10 20M10.5 17h11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter" />
            </svg>
          </span>
          <span>Aurora <span className="marketing-nav__brand-plus">Plus</span></span>
        </Link>

        <nav className="marketing-nav__links" aria-label="Navegación principal">
          {LINKS.map((link) => (
            <Link key={link.path} to={link.path} aria-current={pathname === link.path ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="marketing-nav__actions">
          {isLoggedIn ? accountActions : visitorActions}
        </div>

        <button
          ref={mobileToggleRef}
          className="marketing-nav__toggle"
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="marketing-mobile-menu"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          <span>{mobileOpen ? "Cerrar" : "Menú"}</span>
          <span className={`marketing-nav__toggle-lines${mobileOpen ? " is-open" : ""}`} aria-hidden="true">
            <span />
            <span />
          </span>
        </button>
      </div>

      <div className="marketing-nav__mobile" id="marketing-mobile-menu" hidden={!mobileOpen}>
        <nav aria-label="Navegación móvil" className="marketing-nav__mobile-links">
          {LINKS.map((link) => (
            <Link key={link.path} to={link.path} aria-current={pathname === link.path ? "page" : undefined} onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="marketing-nav__mobile-actions">
          {isLoggedIn ? accountActions : visitorActions}
        </div>
      </div>
    </header>
  );
}
