import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Layout from "./Layout";
import Home from "./pages/Home";
import Soluciones from "./pages/Soluciones";
import Industrias from "./pages/Industrias";
import Precios from "./pages/Precios";
import Nosotros from "./pages/Nosotros";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import MediclinicApp from "./components/MediclinicApp";
import RestauranteApp from "./components/RestauranteApp";
import ComercioApp from "./components/ComercioApp";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

function MediclinicPage() {
  const navigate = useNavigate();
  return <MediclinicApp onSalir={() => navigate("/dashboard")} />;
}

function RestaurantePage() {
  const navigate = useNavigate();
  return <RestauranteApp onSalir={() => navigate("/dashboard")} />;
}

function ComercioPage() {
  const navigate = useNavigate();
  return <ComercioApp onSalir={() => navigate("/dashboard")} />;
}

import PortalPublicoBioanalista from "./pages/PortalPublicoBioanalista";

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
            </Route>
            {/* Portal público para laboratorios sin sesión */}
            <Route path="/lab/:token" element={<PortalPublicoBioanalista />} />
            {/* Auth + onboarding — full screen */}
            <Route path="/auth"       element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            {/* Protected — requiere sesión activa */}
            <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/mediclinic" element={<ProtectedRoute><MediclinicPage /></ProtectedRoute>} />
            <Route path="/restaurante" element={<ProtectedRoute><RestaurantePage /></ProtectedRoute>} />
            <Route path="/comercio"   element={<ProtectedRoute><ComercioPage /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
