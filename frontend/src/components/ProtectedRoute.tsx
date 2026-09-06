import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/auth" replace />;
  if (user && user.hasCompletedOnboarding === false) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

