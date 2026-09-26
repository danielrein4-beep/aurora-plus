// Modo sin conexión: registra /sw.js (ver sw-plantilla.js), que guarda la app en el teléfono para
// que abra sin señal y muestre lo último que se vio. Solo en la app compilada: en desarrollo
// guardaría archivos viejos y confundiría las pruebas. El navegador solo lo permite en https o
// en localhost (en el iPhone por la red local, 192.168.x.x, no funciona).

export function registrarAppSinConexion() {
  if (!import.meta.env.PROD || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sin https o navegador que no lo soporta: la app funciona igual, solo que sin abrir sin señal.
    });
  });
}

/** Al cerrar sesión se borra lo guardado de las consultas, para no dejar datos del negocio en el teléfono. */
export function borrarDatosGuardados() {
  try {
    if (typeof caches !== "undefined") caches.delete("aurora-datos").catch(() => {});
  } catch {
    // navegador sin almacenamiento de caché: no hay nada que borrar
  }
}
