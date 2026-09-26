// Guarda la app en el teléfono para que abra sin señal y muestre lo último que se vio.
// vite.config.ts (plugin auroraSinConexion) pone la versión y la lista de archivos al compilar y
// lo publica como /sw.js. Solo se registra en la app compilada, nunca en el servidor de desarrollo.
//
// - La app (html, js, css, imágenes): se guarda completa al instalar; al abrir sin señal sale de aquí.
// - Consultas GET a /api: primero la red; si no hay señal (o tarda demasiado) se responde con la
//   última copia guardada. La copia va atada a la sesión, así que otro usuario en el mismo
//   teléfono nunca ve datos ajenos.
// - Todo lo que escribe (POST, PUT, DELETE) va directo al servidor; lo hecho sin señal lo guardan
//   las colas de cada módulo y lo envían al volver la red.

const VERSION = "__VERSION__";
const ARCHIVOS = __ARCHIVOS__;
const CACHE_APP = "aurora-app-" + VERSION;
const CACHE_DATOS = "aurora-datos";
const CACHE_EXTERNOS = "aurora-externos";
const ESPERA_RED_MS = 8000;

// Consultas que nunca se guardan: la sesión, el panel de administración y lo público.
const API_SIN_GUARDAR = ["/api/auth/", "/api/super-admin", "/api/public/"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_APP);
    // Uno por uno: si falla un archivo no se pierde todo lo demás.
    await Promise.all(["/", ...ARCHIVOS].map((url) => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Se conserva también la versión anterior: una pantalla que quedó abierta desde antes de
    // actualizar todavía puede pedir sus archivos viejos.
    const versiones = (await caches.keys()).filter((k) => k.startsWith("aurora-app-")).sort();
    const conservar = new Set([CACHE_APP, ...versiones.filter((k) => k !== CACHE_APP).slice(-1)]);
    await Promise.all(versiones.filter((k) => !conservar.has(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === "borrar-datos") event.waitUntil(caches.delete(CACHE_DATOS));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/api/")) {
      if (API_SIN_GUARDAR.some((p) => url.pathname.startsWith(p))) return;
      event.respondWith(consultaConRespaldo(event, req));
      return;
    }
    if (req.mode === "navigate") {
      event.respondWith(paginaConRespaldo(req));
      return;
    }
    event.respondWith(archivoDeLaApp(req));
    return;
  }

  // Tipografías de Google: cambian poco, se guardan al primer uso.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(guardadoPrimero(CACHE_EXTERNOS, req));
  }
});

async function paginaConRespaldo(req) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(CACHE_APP)).put("/", res.clone());
    return res;
  } catch {
    // Todas las rutas de la app se sirven con el mismo index.html.
    return (await caches.match("/")) || Response.error();
  }
}

async function archivoDeLaApp(req) {
  const guardado = await caches.match(req);
  if (guardado) return guardado;
  const res = await fetch(req);
  if (res.ok && new URL(req.url).pathname.startsWith("/assets/")) {
    (await caches.open(CACHE_APP)).put(req, res.clone());
  }
  return res;
}

async function guardadoPrimero(nombreCache, req) {
  const guardado = await caches.match(req);
  if (guardado) return guardado;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") (await caches.open(nombreCache)).put(req, res.clone());
  return res;
}

// La copia de una consulta se guarda con una marca de la sesión en la dirección.
function claveDeDatos(req) {
  const auth = req.headers.get("Authorization") || "";
  let h = 0;
  for (let i = 0; i < auth.length; i++) h = (h * 31 + auth.charCodeAt(i)) | 0;
  const url = new URL(req.url);
  url.searchParams.set("__sesion", String(h >>> 0));
  return url.toString();
}

async function consultaConRespaldo(event, req) {
  const clave = claveDeDatos(req);
  const cache = await caches.open(CACHE_DATOS);

  const deLaRed = fetch(req).then((res) => {
    if (res.status === 200) {
      const copia = res.clone();
      event.waitUntil(cache.put(clave, copia).catch(() => {}));
    }
    return res;
  });
  deLaRed.catch(() => {}); // si se respondió con la copia, un fallo posterior de la red no importa

  const guardada = () => cache.match(clave).then((r) => r && marcarComoGuardada(r));

  // Sin señal: directo a la copia. Con señal lenta: si la red no responde a tiempo y hay copia,
  // se usa la copia (la red sigue y la actualiza para la próxima vez).
  try {
    const tiempo = new Promise((resolve) => setTimeout(() => resolve("tarde"), ESPERA_RED_MS));
    const primero = await Promise.race([deLaRed, tiempo]);
    if (primero !== "tarde") return primero;
    const copia = await guardada();
    return copia || (await deLaRed);
  } catch {
    const copia = await guardada();
    if (copia) return copia;
    return Response.error();
  }
}

// La app puede saber que el dato viene de lo guardado en el teléfono.
async function marcarComoGuardada(res) {
  const headers = new Headers(res.headers);
  headers.set("X-Aurora-Sin-Conexion", "1");
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers });
}
