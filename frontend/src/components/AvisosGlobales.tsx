import { useEffect, useState } from "react";
import { EVENTO_AVISO, type Aviso } from "../avisos";

const ESTILO: Record<Aviso["tipo"], string> = {
  exito: "bg-emerald-600 text-white",
  error: "bg-rose-600 text-white",
  info: "bg-slate-900 text-white",
};

/** Muestra los avisos de avisar(...) abajo al centro; se cierran solos o al tocarlos. */
export default function AvisosGlobales() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    const alRecibir = (e: Event) => {
      const aviso = (e as CustomEvent<Aviso>).detail;
      setAvisos((prev) => [...prev.slice(-3), aviso]);
      const duracion = aviso.tipo === "error" ? 7000 : 4500;
      window.setTimeout(() => setAvisos((prev) => prev.filter((a) => a.id !== aviso.id)), duracion);
    };
    window.addEventListener(EVENTO_AVISO, alRecibir);
    return () => window.removeEventListener(EVENTO_AVISO, alRecibir);
  }, []);

  if (avisos.length === 0) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-md pointer-events-none" role="status" aria-live="polite">
      {avisos.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => setAvisos((prev) => prev.filter((x) => x.id !== a.id))}
          className={`pointer-events-auto w-full text-left px-4 py-3 rounded-xl shadow-lg text-sm font-medium whitespace-pre-line cursor-pointer ${ESTILO[a.tipo]}`}
        >
          {a.mensaje}
        </button>
      ))}
    </div>
  );
}
