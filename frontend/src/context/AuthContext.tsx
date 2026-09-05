import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  nombre: string;
  email: string;
  empresa?: string;
  industry?: string;
  trialStart?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, nombre: string) => void;
  completeOnboarding: (data: Partial<User>) => void;
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
    setUser({ email, nombre, trialStart: new Date().toISOString() });
  };

  const completeOnboarding = (data: Partial<User>) => {
    setUser((prev) => prev ? { ...prev, ...data } : null);
  };

  const logout = () => setUser(null);

  const trialDaysLeft = (() => {
    if (!user?.trialStart) return 30;
    const start = new Date(user.trialStart).getTime();
    const elapsed = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - elapsed);
  })();

  return (
    <AuthContext.Provider value={{ user, login, completeOnboarding, logout, isLoggedIn: !!user, trialDaysLeft }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
