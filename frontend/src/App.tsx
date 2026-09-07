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
            {/* Auth + onboarding — full screen con transiciones fluidas */}
            <Route path="/auth"       element={<AnimatedRoute><Auth /></AnimatedRoute>} />
            <Route path="/onboarding" element={<AnimatedRoute><Onboarding /></AnimatedRoute>} />
            {/* Protected — requiere sesión activa */}
            <Route path="/dashboard"  element={<ProtectedRoute><AnimatedRoute><Dashboard /></AnimatedRoute></ProtectedRoute>} />
            <Route path="/mediclinic" element={<ProtectedRoute><AnimatedRoute><MediclinicPage /></AnimatedRoute></ProtectedRoute>} />
            <Route path="/restaurante" element={<ProtectedRoute><AnimatedRoute><RestaurantePage /></AnimatedRoute></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
