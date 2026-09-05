import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Home from "./pages/Home";
import Soluciones from "./pages/Soluciones";
import Industrias from "./pages/Industrias";
import Precios from "./pages/Precios";
import Nosotros from "./pages/Nosotros";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

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
            {/* Auth + onboarding — full screen */}
            <Route path="/auth"       element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            {/* Protected — requiere sesión activa */}
            <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
