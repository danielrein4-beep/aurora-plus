const CACHE_NAME = 'tamanaco-cache-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(['/', '/index.html']);
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Si la solicitud es para la página principal o raíz, intentamos ir primero a la red
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Actualizamos la caché con la nueva versión
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    return response;
                })
                .catch(() => caches.match(event.request)) // Si falla, usamos la caché
        );
    } else {
        // Para otros archivos (imágenes, iconos), usamos caché primero
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
    }
});