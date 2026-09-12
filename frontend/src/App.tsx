import PortalPublicoBioanalista from "./pages/PortalPublicoBioanalista";
import PortalLaboratorioPaciente from "./pages/PortalLaboratorioPaciente";
import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
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
import RestauranteApp from "./components/RestauranteApp";
import RetailApp from "./components/RetailApp";
import ComercioApp from "./components/ComercioApp";
import GanaderiaApp from "./components/GanaderiaApp";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

function AnimatedRoute({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-enter min-h-full w-full">{children}</div>;
}

function MediclinicPage() {
  const navigate = useNavigate();
  return <MediclinicApp onSalir={() => navigate("/dashboard")} />;
}

function RestaurantePage() {
  const navigate = useNavigate();
  return <RestauranteApp onSalir={() => navigate("/dashboard")} />;
}

function RetailPage() {
  const navigate = useNavigate();
  return <RetailApp onSalir={() => navigate("/dashboard")} />;
}

function ComercioPage() {
  const navigate = useNavigate();
  return <ComercioApp onSalir={() => navigate("/dashboard")} />;
}

function GanaderiaPage() {
  const navigate = useNavigate();
  return <GanaderiaApp onSalir={() => navigate("/dashboard")} />;
}

// Deep link del QR impreso de cada animal: /ganaderia/animal/:animalId
function GanaderiaAnimalPage() {
  const navigate = useNavigate();
  const { animalId } = useParams();
  const id = Number(animalId);
  return <GanaderiaApp onSalir={() => navigate("/dashboard")} deepLinkAnimalId={Number.isFinite(id) ? id : undefined} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
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
            {/* Auth + onboarding — full screen con transiciones fluidas */}
            <Route path="/auth"       element={<AnimatedRoute><Auth /></AnimatedRoute>} />
            <Route path="/resetear-clave" element={<AnimatedRoute><ResetearClave /></AnimatedRoute>} />
            <Route path="/onboarding" element={<AnimatedRoute><Onboarding /></AnimatedRoute>} />
            {/* Protected — requiere sesión activa */}
            <Route path="/dashboard"  element={<ProtectedRoute><AnimatedRoute><Dashboard /></AnimatedRoute></ProtectedRoute>} />
            <Route path="/mediclinic" element={<ProtectedRoute><AnimatedRoute><MediclinicPage /></AnimatedRoute></ProtectedRoute>} />
            <Route path="/restaurante" element={<ProtectedRoute><AnimatedRoute><RestaurantePage /></AnimatedRoute></ProtectedRoute>} />
            <Route path="/retail" element={<ProtectedRoute><AnimatedRoute><RetailPage /></AnimatedRoute></ProtectedRoute>} />
            <Route path="/comercio"   element={<ProtectedRoute><AnimatedRoute><ComercioPage /></AnimatedRoute></ProtectedRoute>} />
            <Route path="/ganaderia"  element={<ProtectedRoute><AnimatedRoute><GanaderiaPage /></AnimatedRoute></ProtectedRoute>} />
            <Route path="/ganaderia/animal/:animalId" element={<ProtectedRoute><AnimatedRoute><GanaderiaAnimalPage /></AnimatedRoute></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
