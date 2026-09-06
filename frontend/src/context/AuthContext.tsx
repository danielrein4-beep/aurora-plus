import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface PaymentRecord {
  id: string;
  fecha: string;
  monto: string;
  metodo: string;
  referencia: string;
  estado: "aprobado" | "pendiente" | "rechazado";
}

export interface User {
  nombre: string;
  email: string;
  empresa?: string;
  industry?: string;
  modules?: string[];
  trialStart?: string;
  plan?: string;
  planStatus?: "trial" | "active" | "expired";
  payments?: PaymentRecord[];
}

interface AuthContextType {
  user: User | null;
  login: (email: string, nombre: string) => void;
  completeOnboarding: (data: Partial<User>) => void;
  reportPayment: (payment: Omit<PaymentRecord, "id" | "fecha" | "estado">) => void;
  logout: () => void;
  isLoggedIn: boolean;
  trialDaysLeft: number;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "aurora_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Persist every change to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = (email: string, nombre: string) => {
    setUser({
      email,
      nombre,
      empresa: "Mi Empresa C.A.",
      industry: "clinica",
      modules: ["expedientes", "agenda", "farmacia", "factura"],
      trialStart: new Date().toISOString(),
      plan: "Estándar",
      planStatus: "trial",
      payments: [],
    });
  };

  const completeOnboarding = (data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  const reportPayment = (payment: Omit<PaymentRecord, "id" | "fecha" | "estado">) => {
    setUser((prev) => {
      if (!prev) return null;
      const newPayment: PaymentRecord = {
        id: `PAY-${Date.now().toString().slice(-6)}`,
        fecha: new Date().toLocaleDateString("es-ES"),
        estado: "aprobado",
        ...payment,
      };
      return {
        ...prev,
        planStatus: "active",
        payments: [newPayment, ...(prev.payments || [])],
      };
    });
  };

  const logout = () => setUser(null);

  const trialDaysLeft = (() => {
    if (!user?.trialStart) return 14;
    const start = new Date(user.trialStart).getTime();
    const elapsed = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
    return Math.max(0, 14 - elapsed);
  })();

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        completeOnboarding,
        reportPayment,
        logout,
        isLoggedIn: !!user,
        trialDaysLeft,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
