package com.auroraplus.core.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Rate limiting en memoria para las rutas públicas de autenticación (login,
 * registro, olvidé-clave, resetear-clave — ver RUTAS_LIMITADAS en WebConfig).
 * Sin esto, nada le costaba a un atacante probar miles de contraseñas por
 * segundo contra /api/auth/login. No hace falta Redis ni un límite
 * distribuido: Aurora Plus corre como un único proceso (ver
 * docker-compose.yml), así que un contador en memoria por IP alcanza.
 *
 * Ventana fija de 60s: cada IP+ruta tiene un cupo de LIMITE_PETICIONES por
 * minuto; al agotarlo responde 429 con Retry-After hasta que la ventana
 * expire. No es antibalas contra un atacante con miles de IPs distintas,
 * pero sí eleva mucho el costo de un ataque de fuerza bruta desde una sola
 * máquina, que es el escenario real más probable contra una clínica chica.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final int LIMITE_PETICIONES = 5;
    private static final long VENTANA_MS = 60_000;
    // Un contador sin actividad por más de esto se considera abandonado y se
    // limpia oportunistamente — evita que el mapa crezca sin límite con IPs
    // que ya no vuelven a pegarle al endpoint.
    private static final long TTL_INACTIVIDAD_MS = VENTANA_MS * 10;

    private static class Contador {
        final AtomicInteger peticiones = new AtomicInteger(0);
        volatile long inicioVentana = System.currentTimeMillis();
    }

    private final ConcurrentHashMap<String, Contador> contadores = new ConcurrentHashMap<>();
    private final AtomicLong peticionesTotales = new AtomicLong(0);

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        limpiarOportunistamente();

        String clave = ipCliente(request) + ":" + request.getRequestURI();
        Contador contador = contadores.computeIfAbsent(clave, k -> new Contador());

        long ahora = System.currentTimeMillis();
        int intentos;
        long inicioVentanaActual;
        synchronized (contador) {
            if (ahora - contador.inicioVentana >= VENTANA_MS) {
                contador.inicioVentana = ahora;
                contador.peticiones.set(0);
            }
            intentos = contador.peticiones.incrementAndGet();
            inicioVentanaActual = contador.inicioVentana;
        }

        if (intentos > LIMITE_PETICIONES) {
            long segundosRestantes = Math.max(1, (VENTANA_MS - (ahora - inicioVentanaActual)) / 1000);
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(segundosRestantes));
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(
                "{\"error\":\"Demasiados intentos. Espera " + segundosRestantes + " segundos e inténtalo de nuevo.\"}"
            );
            return false;
        }
        return true;
    }

    // Cada ~500 peticiones a rutas limitadas, purga contadores inactivos hace
    // rato — barato de calcular y evita depender de un @Scheduled aparte solo
    // para esto.
    private void limpiarOportunistamente() {
        if (peticionesTotales.incrementAndGet() % 500 != 0) return;
        long limite = System.currentTimeMillis() - TTL_INACTIVIDAD_MS;
        contadores.entrySet().removeIf(entry -> entry.getValue().inicioVentana < limite);
    }

    // Detrás de Caddy (ver Caddyfile) la IP real del cliente llega en
    // X-Forwarded-For; sin proxy (desarrollo local) se usa la IP directa de
    // la conexión.
    private String ipCliente(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
