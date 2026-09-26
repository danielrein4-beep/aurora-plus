package com.auroraplus.core.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
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
    // Los inicios de sesión de un negocio salen todos de la misma IP (el WiFi del local): con 5
    // por minuto, el sexto empleado quedaba bloqueado al abrir el turno. La fuerza bruta contra
    // una cuenta la frena el bloqueo por cuenta de AuthService (8 fallos, 15 minutos).
    private static final int LIMITE_LOGIN = 30;
    private static final java.util.Set<String> RUTAS_LOGIN = java.util.Set.of("/api/auth/login", "/api/auth/login-directo");
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

    @Autowired
    private Environment environment;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        // Perfil test: los @SpringBootTest de integración reutilizan el mismo
        // contexto (y por tanto este mismo bean, con sus contadores) entre
        // clases de test distintas, y varios de ellos registran más de 5
        // clínicas/logins en la misma corrida — el límite pensado para
        // frenar fuerza bruta real contra producción no aplica aquí. Fuera
        // de este perfil el límite sigue activo tal cual.
        if (environment.acceptsProfiles(Profiles.of("test"))) {
            return true;
        }
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

        int limite = RUTAS_LOGIN.contains(request.getRequestURI()) ? LIMITE_LOGIN : LIMITE_PETICIONES;
        if (intentos > limite) {
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

    private String ipCliente(HttpServletRequest request) {
        return ipCliente(request.getRemoteAddr(), request.getHeader("X-Forwarded-For"));
    }

    // Detrás de Caddy (ver Caddyfile) la IP real del cliente llega en
    // X-Forwarded-For. Ese encabezado lo puede escribir cualquiera, así que solo
    // se cree cuando la conexión viene de un proxy nuestro (red interna de Docker
    // o la misma máquina), y se toma la ÚLTIMA IP de la lista: la que agregó ese
    // proxy, no la que inventó el cliente. Antes se tomaba la primera y cualquiera
    // que llegara directo al backend esquivaba el límite cambiando el encabezado.
    public static String ipCliente(String remoteAddr, String forwarded) {
        if (forwarded == null || forwarded.isBlank() || !esProxyInterno(remoteAddr)) {
            return remoteAddr;
        }
        String[] ips = forwarded.split(",");
        for (int i = ips.length - 1; i >= 0; i--) {
            String ip = ips[i].trim();
            if (!ip.isEmpty()) return ip;
        }
        return remoteAddr;
    }

    // Loopback, redes privadas (10/8, 172.16/12, 192.168/16), link-local y
    // IPv6 privadas (fc00::/7). remoteAddr siempre es una IP literal, así que
    // getByName no consulta DNS.
    private static boolean esProxyInterno(String remoteAddr) {
        if (remoteAddr == null || remoteAddr.isBlank()) return false;
        try {
            java.net.InetAddress ip = java.net.InetAddress.getByName(remoteAddr);
            if (ip.isLoopbackAddress() || ip.isSiteLocalAddress() || ip.isLinkLocalAddress()) return true;
            return ip instanceof java.net.Inet6Address && (ip.getAddress()[0] & 0xfe) == 0xfc;
        } catch (java.net.UnknownHostException e) {
            return false;
        }
    }
}
