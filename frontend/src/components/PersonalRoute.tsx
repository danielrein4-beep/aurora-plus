import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, obtenerCapacidadesPersonal, type CapacidadesPersonal } from "../api";

/** embebido: se muestra dentro de otra pantalla (ej. Administración de Comercio) con estilo claro y sin "Volver al Hub". */
export default function PersonalRoute({ children, embebido = false }: { children: React.ReactNode; embebido?: boolean }) {
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

  const aviso = (titulo: string, texto: string) => embebido ? (
    <div className="max-w-md mx-auto mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
      <h3 className="font-bold text-slate-900 dark:text-white">{titulo}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{texto}</p>
    </div>
  ) : (
    <main className="min-h-screen bg-slate-50 text-slate-900 grid place-items-center p-6">
      <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="font-['IBM_Plex_Mono'] text-xs uppercase tracking-widest text-[#177E89]">Acceso protegido</p>
        <h1 className="mt-3 font-['IBM_Plex_Sans'] text-xl font-semibold">{titulo}</h1>
        <p className="mt-2 text-sm text-slate-500">{texto}</p>
        <Link to="/dashboard" className="mt-5 inline-flex rounded-lg bg-[#177E89] px-4 py-2 text-sm font-semibold text-white">Volver al Hub</Link>
      </section>
    </main>
  );

  if (error) return aviso("Personal no está disponible", error);
  if (!capacidades) {
    if (embebido) return <div className="p-8 text-center text-xs text-slate-400">Verificando permisos…</div>;
    return <div className="min-h-screen bg-slate-50 text-slate-500 grid place-items-center text-sm">Verificando permisos…</div>;
  }

  // Antes rebotaba al Hub sin decir nada y parecía que la tarjeta no hacía nada.
  if (!capacidades.accesoPersonal) {
    return aviso(
      "Gestión de Personal no está activa para ti",
      "Tu negocio no tiene el módulo de Personal activado o tu usuario no tiene permiso de Personal. Pídele al Dueño o Administrador que te lo asigne."
    );
  }
  return <>{children}</>;
}
