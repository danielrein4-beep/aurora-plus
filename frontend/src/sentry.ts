import * as Sentry from "@sentry/react";

// Monitoreo de errores en producción — sin esto, si algo se rompe para un
// cliente real, el dueño se entera porque te escribe a ti, no porque el
// sistema te avise. Queda apagado (no hace nada, cero overhead) hasta que
// exista una cuenta Sentry real y su DSN se configure como variable de
// entorno VITE_SENTRY_DSN al construir el frontend — no hay ningún DSN
// hardcodeado en el código fuente.
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Ojo al subir esto: cada "transacción" de rendimiento consume cuota del
    // plan de Sentry. 0.1 = 10% de las sesiones, suficiente para detectar
    // patrones sin gastar la cuota gratuita en un par de días.
    tracesSampleRate: 0.1,
  });
}
