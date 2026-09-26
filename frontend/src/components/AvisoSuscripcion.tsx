import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { leerSesion, obtenerEstadoSuscripcion, type EstadoSuscripcion } from "../api";

// Rutas donde no se muestra: el Hub ya tiene su propio aviso, y las páginas públicas no son del cliente.
const SIN_AVISO = ["/", "/dashboard", "/auth", "/precios", "/soluciones", "/industrias", "/nosotros", "/terminos", "/privacidad", "/onboarding", "/resetear-clave"];
const DIAS_DE_AVISO = 7;

/**
 * Aviso flotante en todas las verticales cuando el plan (o la prueba) está por vencer o ya venció.
 * Los días son los mismos que ve el super admin (de hoy a la fecha de vencimiento del servidor).
 * Se puede cerrar por hoy; "Pagar" lleva a Aurora Hub > Facturación & Pagos con el reporte abierto.
 */
export default function AvisoSuscripcion() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [estado, setEstado] = useState<EstadoSuscripcion | null>(null);
  const [cerrado, setCerrado] = useState(false);
  const claveCerrado = `aurora_aviso_suscripcion_${new Date().toISOString().slice(0, 10)}`;

  const visible = !SIN_AVISO.includes(pathname) && !pathname.startsWith("/catalogo") && !pathname.startsWith("/tienda")
    && !pathname.startsWith("/lab") && !pathname.startsWith("/odonto-paciente");

  useEffect(() => {
    if (!visible || !leerSesion()?.token) return;
    try { if (sessionStorage.getItem(claveCerrado)) { setCerrado(true); return; } } catch { /* sin almacenamiento */ }
    obtenerEstadoSuscripcion().then(setEstado).catch(() => setEstado(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible || cerrado || !estado || !estado.fechaVencimiento) return null;
  if (!estado.vencida && estado.diasRestantes > DIAS_DE_AVISO) return null;

  const fmt = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("es-VE", { day: "numeric", month: "long" });
  // Ya reportó su pago: no se le pide pagar otra vez ni se le suspende mientras lo verificamos.
  const pagoEnVerificacion = (estado.reportes || []).some((r) => r.estado === "EN_VERIFICACION");
  if (pagoEnVerificacion) {
    return (
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1rem)] max-w-xl">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-lg border text-sm bg-sky-50 border-sky-200 text-sky-900">
          <span className="flex-1 leading-snug">Recibimos el reporte de tu pago y lo estamos verificando. Mientras tanto sigues trabajando con normalidad.</span>
          <button type="button" onClick={() => { setCerrado(true); try { sessionStorage.setItem(claveCerrado, "1"); } catch { /* sin almacenamiento */ } }}
            aria-label="Cerrar aviso" className="shrink-0 opacity-70 hover:opacity-100 cursor-pointer px-1">×</button>
        </div>
      </div>
    );
  }
  const texto = estado.vencida
    ? `Tu plan venció el ${fmt(estado.fechaVencimiento)}. Puedes seguir trabajando hasta el ${estado.accesoHasta ? fmt(estado.accesoHasta) : "fin de la gracia"}.`
    : estado.diasRestantes === 0
      ? `${estado.enPrueba ? "Tu prueba gratis" : "Tu plan"} vence hoy.`
      : `${estado.enPrueba ? "Tu prueba gratis" : "Tu plan"} vence en ${estado.diasRestantes} ${estado.diasRestantes === 1 ? "día" : "días"} (${fmt(estado.fechaVencimiento)}).`;

  const cerrar = () => {
    setCerrado(true);
    try { sessionStorage.setItem(claveCerrado, "1"); } catch { /* sin almacenamiento */ }
  };

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1rem)] max-w-xl">
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-lg border text-sm ${
        estado.vencida ? "bg-rose-600 border-rose-700 text-white" : "bg-amber-50 border-amber-300 text-amber-900"
      }`}>
        <span className="flex-1 leading-snug">{texto}</span>
        <button
          type="button"
          onClick={() => navigate("/dashboard?tab=billing&pagar=1")}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${estado.vencida ? "bg-white text-rose-700" : "bg-amber-600 text-white"}`}
        >
          {estado.enPrueba ? "Activar mi plan" : "Pagar"}
        </button>
        <button type="button" onClick={cerrar} aria-label="Cerrar aviso" className="shrink-0 opacity-70 hover:opacity-100 cursor-pointer px-1">×</button>
      </div>
    </div>
  );
}
