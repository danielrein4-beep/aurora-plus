import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ApiError, obtenerCapacidadesPersonal, type CapacidadesPersonal } from "../api";

export default function PersonalRoute({ children }: { children: React.ReactNode }) {
  const [capacidades, setCapacidades] = useState<CapacidadesPersonal | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    obtenerCapacidadesPersonal()
      .then((respuesta) => activo && setCapacidades(respuesta))
      .catch((err) => {
        if (!activo) return;
        setError(err instanceof ApiError ? err.message : "No pudimos verificar el acceso a Personal");
      });
    return () => { activo = false; };
  }, []);

  if (error) {
    return (
      <main className="min-h-screen bg-[#051322] text-white grid place-items-center p-6">
        <section className="max-w-md rounded-2xl border border-white/10 bg-[#0b2341] p-6 text-center">
          <p className="font-['IBM_Plex_Mono'] text-xs uppercase tracking-widest text-[#177E89]">Acceso protegido</p>
          <h1 className="mt-3 font-['IBM_Plex_Sans'] text-xl font-semibold">Personal no está disponible</h1>
          <p className="mt-2 text-sm text-white/65">{error}</p>
          <Link to="/dashboard" className="mt-5 inline-flex rounded-lg bg-[#177E89] px-4 py-2 text-sm font-semibold text-[#051322]">Volver al Hub</Link>
        </section>
      </main>
    );
  }

  if (!capacidades) {
    return <div className="min-h-screen bg-[#051322] text-[#177E89] grid place-items-center font-['IBM_Plex_Mono'] text-sm">Verificando permisos…</div>;
  }

  if (!capacidades.accesoPersonal) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
