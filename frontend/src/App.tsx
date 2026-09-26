import AvisosGlobales from "./components/AvisosGlobales";
import AvisoSuscripcion from "./components/AvisoSuscripcion";
import CatalogoPublico from "./pages/CatalogoPublico";
import NotFound from "./pages/NotFound";
import { obtenerDatosImpersonacion, salirDeImpersonacion } from "./api";
import React, { useState, useEffect } from "react";
import SuperAdminPortal from "./components/SuperAdminPortal";
import PortalPublicoBioanalista from "./pages/PortalPublicoBioanalista";
import PortalLaboratorioPaciente from "./pages/PortalLaboratorioPaciente";
import PortalOdontologiaPaciente from "./pages/PortalOdontologiaPaciente";
import { BrowserRouter, Routes, Route, Outlet, useNavigate, useParams, useLocation } from "react-router-dom";
import TenantSoporteWidget from "./components/TenantSoporteWidget";
import AvisoSinConexion from "./components/AvisoSinConexion";
import MercadoGanaderoApp from "./components/mercado/MercadoGanaderoApp";
import Layout from "./Layout";
import Home from "./pages/Home";
import Soluciones from "./pages/Soluciones";
import Industrias from "./pages/Industrias";
import Precios from "./pages/Precios";
import Nosotros from "./pages/Nosotros";
import Terminos from "./pages/Terminos";
import Privacidad from "./pages/Privacidad";
import Auth from "./pages/Auth";
import ResetearClave from "./pages/ResetearClave";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import MediclinicApp from "./components/MediclinicApp";
import VeterinariaApp from "./components/VeterinariaApp";
import EsteticaApp from "./components/EsteticaApp";
import RestauranteApp from "./components/RestauranteApp";
import ComercioApp from "./components/ComercioApp";
import GanaderiaApp from "./components/GanaderiaApp";
import ConstruccionApp from "./components/ConstruccionApp";
import CentroFinanciero from "./pages/CentroFinanciero";
import Auditoria from "./pages/Auditoria";
import Personal from "./pages/Personal";
import ProtectedRoute from "./components/ProtectedRoute";
import PersonalRoute from "./components/PersonalRoute";
import ModuleAccessBar from "./components/ModuleAccessBar";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

// Zona privada: el boton de soporte acompana al tenant en el panel general
// y dentro de cada vertical, para que pueda abrir un ticket sin salir de ella.
function ZonaPrivada() {
  // Ganadería trae su propio botón de soporte (se abre desde su menú): sin esto salían dos
  // burbujas "Soporte Aurora" una encima de la otra.
  const { pathname } = useLocation();
  return (
    <>
      <Outlet />
      {!pathname.startsWith("/ganaderia") && <TenantSoporteWidget />}
      {!pathname.startsWith("/ganaderia") && !pathname.startsWith("/restaurante") && <AvisoSinConexion />}
    </>
  );
}

function AnimatedRoute({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-enter min-h-full w-full">{children}</div>;
}

function MediclinicPage() {
  const navigate = useNavigate();
  return <MediclinicApp onSalir={() => navigate("/dashboard")} />;
}

function VeterinariaPage() {
  const navigate = useNavigate();
  return <VeterinariaApp onSalir={() => navigate("/dashboard")} />;
}

function EsteticaPage() {
  const navigate = useNavigate();
  return <EsteticaApp onSalir={() => navigate("/dashboard")} />;
}

function RestaurantePage() {
  const navigate = useNavigate();
  return <RestauranteApp onSalir={() => navigate("/dashboard")} />;
}

function ComercioPage() {
  const navigate = useNavigate();
  return <ComercioApp onSalir={() => navigate("/dashboard")} onIrAEquipoRoles={() => navigate("/dashboard?tab=team")} />;
}

function GanaderiaPage() {
  const navigate = useNavigate();
  return <GanaderiaApp onSalir={() => navigate("/dashboard")} />;
}

function ConstruccionPage() {
  const navigate = useNavigate();
  return <ConstruccionApp onSalir={() => navigate("/dashboard")} />;
}

// Deep link del QR impreso de cada animal: /ganaderia/animal/:animalId
function GanaderiaAnimalPage() {
  const navigate = useNavigate();
  const { animalId } = useParams();
  const id = Number(animalId);
  return <GanaderiaApp onSalir={() => navigate("/dashboard")} deepLinkAnimalId={Number.isFinite(id) ? id : undefined} />;
}


function ImpersonacionBarraFlotante() {
  const [datos, setDatos] = useState<{ tenantNombre: string; tenantId: string } | null>(null);

  useEffect(() => {
    const verificar = () => {
      setDatos(obtenerDatosImpersonacion());
    };
    verificar();
    const interval = setInterval(verificar, 1500);
    return () => clearInterval(interval);
  }, []);

  if (!datos) return null;

  return (
    <aside aria-label="Aviso de soporte tecnico activo" className="fixed top-3 left-1/2 -translate-x-1/2 z-[99999] max-w-3xl w-[94%] sm:w-auto px-4 py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-bold shadow-2xl border-2 border-amber-300 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-xs">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-950 shrink-0">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>
          <strong>MODO SOPORTE TECNICO ACTIVO:</strong> Operando como <span className="underline decoration-slate-900">{datos.tenantNombre}</span> (Tenant #{datos.tenantId})
        </span>
      </div>
      <button
        onClick={() => salirDeImpersonacion()}
        type="button"
        className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-1.5"
      >
        <span>Regresar a SuperAdmin</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </aside>
  );
}

export default function App() {
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);

  useEffect(() => {
    // Si viene de retorno de soporte con ?admin=true
    if (window.location.search.includes("admin=true")) {
      setShowSuperAdminModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Atajo secreto: Ctrl + Shift + S o Ctrl + Shift + A
      if (e.ctrlKey && e.shiftKey && (e.key === "S" || e.key === "s" || e.key === "A" || e.key === "a")) {
        e.preventDefault();
        setShowSuperAdminModal((prev) => !prev);
      }
      if (e.key === "Escape") {
        setShowSuperAdminModal(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ImpersonacionBarraFlotante />
          <AvisosGlobales />
          <AvisoSuscripcion />
          <Routes>
            {/* Public site with shared layout */}
            <Route element={<Layout />}>
              <Route path="/"           element={<Home />} />
              <Route path="/soluciones" element={<Soluciones />} />
              <Route path="/industrias" element={<Industrias />} />
              <Route path="/precios"    element={<Precios />} />
              <Route path="/nosotros"   element={<Nosotros />} />
              <Route path="/terminos"   element={<Terminos />} />
              <Route path="/privacidad" element={<Privacidad />} />
            </Route>
            {/* Portal público para laboratorios sin sesión */}
            <Route path="/lab/:token" element={<PortalPublicoBioanalista />} />
            {/* Portal público donde el PACIENTE sube sus resultados de laboratorio (QR fijo del consultorio) */}
            <Route path="/lab-paciente/:token" element={<PortalLaboratorioPaciente />} />
            <Route path="/odonto-paciente/:token" element={<PortalOdontologiaPaciente />} />
            <Route path="/odonto-paciente" element={<PortalOdontologiaPaciente />} />
            {/* Catalogo digital publico para Retail / Comercio */}
            <Route path="/catalogo/:tenantId" element={<CatalogoPublico />} />
            <Route path="/tienda/:tenantId" element={<CatalogoPublico />} />
            {/* Auth + onboarding — full screen con transiciones fluidas */}
            <Route path="/auth"       element={<AnimatedRoute><Auth /></AnimatedRoute>} />
            <Route path="/resetear-clave" element={<AnimatedRoute><ResetearClave /></AnimatedRoute>} />
            <Route path="/onboarding" element={<AnimatedRoute><Onboarding /></AnimatedRoute>} />
            {/* Protected — requiere sesión activa */}
            {/* Ruta /superadmin eliminada por seguridad: responde 404 a intrusos */}
            <Route path="/superadmin" element={<NotFound />} />
            <Route element={<ZonaPrivada />}>
              <Route path="/dashboard"  element={<ProtectedRoute><AnimatedRoute><Dashboard /></AnimatedRoute></ProtectedRoute>} />
              <Route path="/finanzas" element={<ProtectedRoute><AnimatedRoute><CentroFinanciero /></AnimatedRoute></ProtectedRoute>} />
              <Route path="/auditoria" element={<ProtectedRoute><AnimatedRoute><Auditoria /></AnimatedRoute></ProtectedRoute>} />
              <Route path="/personal" element={<ProtectedRoute><PersonalRoute><AnimatedRoute><Personal /></AnimatedRoute></PersonalRoute></ProtectedRoute>} />
              <Route path="/mediclinic" element={<ProtectedRoute><AnimatedRoute><MediclinicPage /></AnimatedRoute></ProtectedRoute>} />
              <Route path="/veterinaria" element={<ProtectedRoute><AnimatedRoute><VeterinariaPage /></AnimatedRoute></ProtectedRoute>} />
              <Route path="/estetica" element={<ProtectedRoute><AnimatedRoute><EsteticaPage /></AnimatedRoute></ProtectedRoute>} />
              <Route path="/restaurante" element={<ProtectedRoute><AnimatedRoute><RestaurantePage /></AnimatedRoute></ProtectedRoute>} />
              <Route path="/comercio"   element={<ProtectedRoute><AnimatedRoute><ComercioPage /></AnimatedRoute></ProtectedRoute>} />
              <Route path="/ganaderia"  element={<ProtectedRoute><AnimatedRoute><GanaderiaPage /></AnimatedRoute></ProtectedRoute>} />
              <Route path="/ganaderia/animal/:animalId" element={<ProtectedRoute><AnimatedRoute><GanaderiaAnimalPage /></AnimatedRoute></ProtectedRoute>} />
              <Route path="/mercado" element={<ProtectedRoute><AnimatedRoute><MercadoGanaderoApp /></AnimatedRoute></ProtectedRoute>} />
              <Route path="/construccion" element={<ProtectedRoute><AnimatedRoute><ConstruccionPage /></AnimatedRoute></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          {/* Modal Oculto de SuperAdmin (Invocado solo con Atajo Secreto Ctrl+Shift+S) */}
          {showSuperAdminModal && (
            <SuperAdminPortal onClose={() => setShowSuperAdminModal(false)} />
          )}
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
