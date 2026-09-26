import { useCallback, useEffect, useRef, useState } from "react";
import { EVENTO_AVISO, type Aviso } from "../avisos";

const ESTILO: Record<Aviso["tipo"], string> = {
  exito: "bg-emerald-600 text-white",
  error: "bg-rose-600 text-white",
  info: "bg-slate-900 text-white",
};

/** Lo que dura la animación de salida (ver .aviso-salir en index.css). */
const DURACION_SALIDA = 240;

type AvisoEnPantalla = Aviso & { saliendo?: boolean };

/**
 * Muestra los avisos de avisar(...) abajo al centro. Entran y salen con una animación suave, se
 * cierran solos, al tocarlos o con la ×.
 */
export default function AvisosGlobales() {
  const [avisos, setAvisos] = useState<AvisoEnPantalla[]>([]);
  const temporizadores = useRef(new Map<number, number>());

  // Primero se marca "saliendo" (se anima) y después se quita de la lista.
  const cerrar = useCallback((id: number) => {
    const t = temporizadores.current.get(id);
    if (t) window.clearTimeout(t);
    temporizadores.current.delete(id);
    setAvisos((prev) => prev.map((a) => (a.id === id ? { ...a, saliendo: true } : a)));
    window.setTimeout(() => setAvisos((prev) => prev.filter((a) => a.id !== id)), DURACION_SALIDA);
  }, []);

  useEffect(() => {
    const alRecibir = (e: Event) => {
      const aviso = (e as CustomEvent<Aviso>).detail;
      setAvisos((prev) => [...prev.slice(-3), aviso]);
      const duracion = aviso.tipo === "error" ? 7000 : 4500;
      temporizadores.current.set(aviso.id, window.setTimeout(() => cerrar(aviso.id), duracion));
    };
    window.addEventListener(EVENTO_AVISO, alRecibir);
    const pendientes = temporizadores.current;
    return () => {
      window.removeEventListener(EVENTO_AVISO, alRecibir);
      pendientes.forEach((t) => window.clearTimeout(t));
    };
  }, [cerrar]);

  if (avisos.length === 0) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-md pointer-events-none" role="status" aria-live="polite">
      {avisos.map((a) => (
        <div
          key={a.id}
          className={`${a.saliendo ? "aviso-salir" : "aviso-entrar"} pointer-events-auto w-full flex items-start gap-2 pl-4 pr-2 py-3 rounded-xl shadow-lg text-sm font-medium ${ESTILO[a.tipo]}`}
        >
          <button type="button" onClick={() => cerrar(a.id)} className="flex-1 text-left whitespace-pre-line cursor-pointer">
            {a.mensaje}
          </button>
          <button
            type="button"
            onClick={() => cerrar(a.id)}
            aria-label="Cerrar aviso"
            className="shrink-0 -my-1 w-7 h-7 rounded-full flex items-center justify-center text-base leading-none opacity-80 hover:opacity-100 hover:bg-white/15 cursor-pointer"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
