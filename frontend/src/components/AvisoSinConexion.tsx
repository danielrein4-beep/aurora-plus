import { useEffect, useState } from "react";

/**
 * Franja pequeña cuando el teléfono se queda sin señal, para los módulos que no tienen su propio
 * aviso (Ganadería y Restaurante ya muestran el suyo con lo pendiente por enviar). No promete que
 * lo nuevo se guarde: en estos módulos registrar todavía necesita señal.
 */
export default function AvisoSinConexion() {
  const [enLinea, setEnLinea] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const alConectar = () => setEnLinea(true);
    const alDesconectar = () => setEnLinea(false);
    window.addEventListener("online", alConectar);
    window.addEventListener("offline", alDesconectar);
    return () => {
      window.removeEventListener("online", alConectar);
      window.removeEventListener("offline", alDesconectar);
    };
  }, []);

  if (enLinea) return null;
  return (
    <div
      role="status"
      className="fixed top-2 left-1/2 -translate-x-1/2 z-[3000] pointer-events-none max-w-[calc(100vw-32px)] px-3.5 py-2 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold shadow-md text-center"
    >
      Sin conexión. Ves lo último guardado en este teléfono; para registrar algo nuevo necesitas señal.
    </div>
  );
}
