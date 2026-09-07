import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { leerSesion, borrarSesion, loginDirecto, registrarNegocio, obtenerMiNegocio, type RegistroNegocio } from "../api";

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
  tenantId?: number;
  rol?: string;
  modules?: string[];
  hasCompletedOnboarding?: boolean;
  // true solo hasta que entra por primera vez a su módulo — después de eso el
  // Hub deja de mostrar la pantalla de bienvenida/launcher y va directo al
  // espacio de trabajo, para no estorbar en el uso diario.
  primerIngreso?: boolean;
  trialStart?: string;
  plan?: string;
  planStatus?: "trial" | "active" | "expired";
  metodoPagoPreferido?: string;
  payments?: PaymentRecord[];
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  completarRegistro: (datos: RegistroNegocio & { modules?: string[]; metodoPagoPreferido?: string }) => Promise<void>;
  completeOnboarding: (data: Partial<User>) => void;
  marcarPrimerIngresoCompletado: () => void;
  reportPayment: (payment: Omit<PaymentRecord, "id" | "fecha" | "estado">) => void;
  logout: () => void;
  isLoggedIn: boolean;
  trialDaysLeft: number;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "aurora_session_user";
const VISITADOS_KEY = "aurora_tenants_visitados";

function haVisitadoTenant(tenantId: number): boolean {
  try {
    const lista: number[] = JSON.parse(localStorage.getItem(VISITADOS_KEY) || "[]");
    return lista.includes(tenantId);
  } catch {
    return false;
  }
}

function marcarTenantVisitado(tenantId: number) {
  try {
    const lista: number[] = JSON.parse(localStorage.getItem(VISITADOS_KEY) || "[]");
    if (!lista.includes(tenantId)) {
      localStorage.setItem(VISITADOS_KEY, JSON.stringify([...lista, tenantId]));
    }
  } catch {
    localStorage.setItem(VISITADOS_KEY, JSON.stringify([tenantId]));
  }
}

// El backend agrupa varios verticales bajo un mismo "moduloPrincipal" — este
// mapa decide qué plantilla de Dashboard usar para cada uno. Un módulo real
// que todavía no tiene su propia plantilla cae en "clinica" por defecto (ver
// VERTICAL_METADATA en Dashboard.tsx), así que agregar aquí una vertical
// nueva no rompe nada, solo mejora qué tan preciso se ve el panel.
const MODULO_A_INDUSTRIA: Record<string, string> = {
  salud: "clinica",
  horeca: "restaurante",
  ganaderia: "finca",
  repuestos: "ferreteria",
  moda: "ferreteria",
  minero: "mineria",
  "tamanaco-comercial": "mineria",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const sesion = leerSesion();
      // Sin token real ya no hay sesión — evita quedar con un usuario "fantasma"
      // en localStorage sin forma de llamar al backend.
      if (!sesion) return null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    const sesion = await loginDirecto(email, password);
    let empresa = email;
    let industry = "clinica";
    try {
      const negocio = await obtenerMiNegocio();
      empresa = negocio.nombreEmpresa || empresa;
      industry = MODULO_A_INDUSTRIA[negocio.moduloPrincipal] || "clinica";
    } catch {
      // Si mi-negocio falla igual dejamos entrar — el dashboard mostrará
      // valores por defecto en vez de bloquear el login por completo.
    }
    setUser({
      email: sesion.username,
      nombre: sesion.username,
      empresa,
      industry,
      tenantId: sesion.tenantId,
      rol: sesion.rol,
      modules: [],
      hasCompletedOnboarding: true,
      primerIngreso: !haVisitadoTenant(sesion.tenantId),
      trialStart: new Date().toISOString(),
      plan: "Estándar",
      planStatus: "trial",
      payments: [],
    });
  };

  // Registro de autoservicio real: crea el tenant + usuario en el backend
  // (POST /api/auth/registro-negocio) y entra de una con el token que devuelve.
  const completarRegistro = async (datos: RegistroNegocio & { modules?: string[]; metodoPagoPreferido?: string }) => {
    const sesion = await registrarNegocio(datos);
    const industry = MODULO_A_INDUSTRIA[datos.moduloPrincipal] || "clinica";
    setUser({
      email: sesion.username,
      nombre: sesion.username,
      empresa: datos.nombreEmpresa,
      industry,
      tenantId: sesion.tenantId,
      rol: sesion.rol,
      modules: datos.modules || [],
      hasCompletedOnboarding: true,
      primerIngreso: true,
      trialStart: new Date().toISOString(),
      plan: "Estándar",
      planStatus: "trial",
      metodoPagoPreferido: datos.metodoPagoPreferido,
      payments: [],
    });
  };

  const completeOnboarding = (data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data, hasCompletedOnboarding: true } : null));
  };

  const marcarPrimerIngresoCompletado = () => {
    setUser((prev) => {
      if (!prev) return null;
      if (prev.tenantId) marcarTenantVisitado(prev.tenantId);
      return { ...prev, primerIngreso: false };
    });
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

  const logout = () => {
    setUser(null);
    borrarSesion();
    localStorage.removeItem(STORAGE_KEY);
  };

  const trialDaysLeft = (() => {
    if (!user?.trialStart) return 30;
    const start = new Date(user.trialStart).getTime();
    const elapsed = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - elapsed);
  })();

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        completarRegistro,
        completeOnboarding,
        marcarPrimerIngresoCompletado,
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
