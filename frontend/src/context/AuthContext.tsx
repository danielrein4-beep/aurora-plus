import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  leerSesion,
  guardarSesion,
  borrarSesion,
  loginDirecto,
  registrarNegocio,
  obtenerMiNegocio,
  ApiError,
  type RegistroNegocio,
  type SesionAurora,
} from "../api";

const MENSAJE_SIN_CONEXION = "No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo en un momento.";

/** true si el backend respondió con un rechazo real (credenciales, validación, etc. — siempre trae
 * un status HTTP < 500). false si nunca hubo respuesta real del backend (falla de red/DNS, o un
 * 502/503 de un proxy que no llegó a producir una respuesta genuina de la app) — en ese caso NO se
 * sabe si las credenciales son correctas o no, así que nunca se puede "dejar entrar de todos modos".
 */
function esRechazoRealDelBackend(err: unknown): err is ApiError {
  return err instanceof ApiError && typeof err.status === "number" && err.status < 500;
}

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

export interface CuentaRegistrada {
  email: string;
  password?: string;
  nombre: string;
  empresa: string;
  industry: string;
  moduloPrincipal: string;
  tenantId: number;
  rol: string;
  modules?: string[];
  metodoPagoPreferido?: string;
  fechaRegistro: string;
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
const CUENTAS_REGISTRADAS_KEY = "aurora_registered_accounts";

function obtenerCuentasLocales(): CuentaRegistrada[] {
  try {
    const raw = localStorage.getItem(CUENTAS_REGISTRADAS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function guardarCuentaLocal(cuenta: CuentaRegistrada) {
  try {
    const cuentas = obtenerCuentasLocales().filter((c) => c.email.toLowerCase() !== cuenta.email.toLowerCase());
    cuentas.push(cuenta);
    localStorage.setItem(CUENTAS_REGISTRADAS_KEY, JSON.stringify(cuentas));
  } catch {}
}

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
// Farmacia/Ferretería/Repuestos NO entran acá a propósito: comparten el mismo
// motor (Aurora Retail) pero cada una necesita distinguirse de las otras dos
// dentro de la app (FEFO/Principio Activo en Farmacia, catálogo de cruce en
// Repuestos, fraccionado en Ferretería) — así que su "industry" es su propio
// nombre de módulo tal cual, no una categoría compartida. Ver el fallback más
// abajo y RetailApp.tsx.
const MODULO_A_INDUSTRIA: Record<string, string> = {
  salud: "clinica",
  horeca: "restaurante",
  ganaderia: "finca",
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
    const usuarioAnterior = user;
    let sesion: SesionAurora;
    let empresa = email;
    let industry = "clinica";
    let nombreUsuario = email.includes("@") ? email.split("@")[0] : email;
    let modulosUsuario: string[] = [];

    // Buscar cuenta local SOLO para completar nombre/empresa en la UI si el backend no puede
    // resolverlo (obtenerMiNegocio falla) — nunca para decidir si el login es válido.
    const cuentaLocal = obtenerCuentasLocales().find((c) => c.email.toLowerCase() === email.toLowerCase());

    try {
      sesion = await loginDirecto(email, password);
    } catch (err) {
      // Un rechazo real del backend (usuario/contraseña incorrectos, cuenta inactiva, etc.) se
      // muestra tal cual. Solo si NUNCA hubo respuesta real del backend (sin conexión, 502/503 de
      // un proxy) se informa que es un problema de conexión — nunca se inventa una sesión: no hay
      // forma de saber si esas credenciales son válidas sin preguntarle al backend real.
      if (esRechazoRealDelBackend(err)) throw err;
      throw new Error(MENSAJE_SIN_CONEXION);
    }

    try {
      const negocio = await obtenerMiNegocio();
      empresa = negocio.nombreEmpresa || empresa;
      industry = MODULO_A_INDUSTRIA[negocio.moduloPrincipal] || negocio.moduloPrincipal || "clinica";
    } catch {
      // La autenticación ya fue válida — esto solo completa metadata de UI.
      if (cuentaLocal) {
        empresa = cuentaLocal.empresa || empresa;
        industry = cuentaLocal.industry || industry;
        nombreUsuario = cuentaLocal.nombre || nombreUsuario;
        modulosUsuario = cuentaLocal.modules || [];
      }
    }

    const nuevoUsuario: User = {
      email: sesion.username,
      nombre: nombreUsuario,
      empresa,
      industry,
      tenantId: sesion.tenantId,
      rol: sesion.rol,
      modules: modulosUsuario,
      hasCompletedOnboarding: true,
      primerIngreso: !haVisitadoTenant(sesion.tenantId),
      trialStart: new Date().toISOString(),
      plan: "Estándar",
      planStatus: "trial",
      payments: [],
    };
    setUser(nuevoUsuario);

    if (typeof window !== "undefined" && usuarioAnterior && usuarioAnterior.tenantId !== nuevoUsuario.tenantId) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevoUsuario)); } catch {}
      window.location.href = "/dashboard";
    }
  };

  // Registro de autoservicio — SIEMPRE contra el backend real, ver esRechazoRealDelBackend arriba.
  const completarRegistro = async (datos: RegistroNegocio & { modules?: string[]; metodoPagoPreferido?: string }) => {
    // El registro SIEMPRE crea el tenant contra el backend real. Un rechazo real (ej. "Ya existe
    // una cuenta con este correo") se muestra tal cual; una falla de conexión real avisa que no
    // hay conexión — nunca se finge que se creó una cuenta que en realidad no existe en el backend.
    let sesion: SesionAurora;
    try {
      sesion = await registrarNegocio(datos);
    } catch (err) {
      if (esRechazoRealDelBackend(err)) throw err;
      throw new Error(MENSAJE_SIN_CONEXION);
    }

    const industry = MODULO_A_INDUSTRIA[datos.moduloPrincipal] || datos.moduloPrincipal || "clinica";
    const nombreUsuario = datos.username?.includes("@") ? datos.username.split("@")[0] : datos.username || "Usuario";

    // Guardar cuenta registrada localmente
    guardarCuentaLocal({
      email: datos.emailContacto || datos.username,
      password: datos.password,
      nombre: nombreUsuario,
      empresa: datos.nombreEmpresa || "Clínica & Consultorios Médicos",
      industry,
      moduloPrincipal: datos.moduloPrincipal || "salud",
      tenantId: sesion.tenantId,
      rol: sesion.rol || "MEDICO",
      modules: datos.modules || [],
      metodoPagoPreferido: datos.metodoPagoPreferido,
      fechaRegistro: new Date().toISOString(),
    });

    setUser({
      email: sesion.username,
      nombre: nombreUsuario,
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
    setUser((prev) => {
      const updated: User = prev ? { ...prev, ...data, hasCompletedOnboarding: true } : {
        email: "demo@auroraplus.com",
        nombre: "Usuario Demo",
        empresa: data.empresa || "Clínica & Consultorios Médicos",
        industry: "clinica",
        tenantId: 1,
        rol: "MEDICO",
        hasCompletedOnboarding: true,
        trialStart: new Date().toISOString(),
        plan: "Estándar",
        planStatus: "trial",
        payments: [],
        ...data,
      };
      return updated;
    });
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
    // Recarga real de página (no solo navegación de React Router): los módulos como Mediclinic
    // guardan caché por tenant en localStorage usando `useState(() => ...)`, que solo se lee al
    // MONTAR el componente. Si el siguiente login ocurre en la misma pestaña sin recargar, ese
    // estado queda pegado del usuario anterior — un médico veía el perfil/caja del médico que
    // había usado el navegador antes que él. Forzar la recarga garantiza que todo se re-lea desde
    // cero para la cuenta que entra después.
    if (typeof window !== "undefined") {
      window.location.href = "/auth";
    }
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
