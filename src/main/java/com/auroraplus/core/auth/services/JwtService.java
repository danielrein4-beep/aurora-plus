package com.auroraplus.core.auth.services;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/**
 * Firma y valida los JWT que reemplazan al header "X-Tenant-ID" de libre
 * confianza: a partir de ahora, el tenantId+rol de cada request se leen de un
 * token firmado por el servidor (ver AuthInterceptor), no de lo que el
 * cliente diga directamente. Stateless a propósito — sin sesiones de
 * servidor, compatible con el POS offline-first ya construido (el token se
 * guarda localmente y se reusa hasta expirar).
 */
@Service
public class JwtService {

    // JWT_SECRET debe configurarse en producción (ver .env.example) — este
    // valor por defecto es SOLO para desarrollo local, documentado a propósito
    // (no es un secreto real: está en el código fuente).
    @Value("${jwt.secret:aurora-plus-desarrollo-local-clave-temporal-cambiar-en-produccion-1234567890}")
    private String secretConfigurado;

    @Value("${jwt.expiracion-horas-tenant:12}")
    private long expiracionHorasTenant;

    @Value("${jwt.expiracion-horas-super-admin:8}")
    private long expiracionHorasSuperAdmin;

    @Value("${app.frontend.url:http://localhost:8443}")
    private String urlFrontend;

    private static final String SECRETO_DE_DESARROLLO = "aurora-plus-desarrollo-local-clave-temporal-cambiar-en-produccion-1234567890";

    /**
     * Fuera de localhost (un servidor real) no se arranca con el secreto de desarrollo: está en el
     * código fuente, y con él cualquiera firmaría sesiones de cualquier negocio o de super-admin.
     */
    @jakarta.annotation.PostConstruct
    void validarSecreto() {
        boolean esLocal = urlFrontend == null || urlFrontend.contains("localhost") || urlFrontend.contains("127.0.0.1");
        if (!esLocal && (SECRETO_DE_DESARROLLO.equals(secretConfigurado) || secretConfigurado.length() < 32)) {
            throw new IllegalStateException("JWT_SECRET no está configurado (o es muy corto) en un servidor que no es local. "
                + "Define la variable de entorno JWT_SECRET con al menos 32 caracteres aleatorios antes de arrancar.");
        }
    }

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(secretConfigurado.getBytes(StandardCharsets.UTF_8));
    }

    public String generarTokenTenant(Long tenantId, String username, String rol, int tokenVersion) {
        Instant ahora = Instant.now();
        return Jwts.builder()
            .subject(username)
            .claim("tipo", "TENANT")
            .claim("tenantId", tenantId)
            .claim("rol", rol)
            .claim("tokenVersion", tokenVersion)
            .issuedAt(Date.from(ahora))
            .expiration(Date.from(ahora.plusSeconds(expiracionHorasTenant * 3600)))
            .signWith(signingKey())
            .compact();
    }

    /** Nombre reservado del usuario con que el super-admin entra a un negocio (ningún negocio puede usarlo). */
    public static final String USUARIO_SOPORTE = "soporte-superadmin";

    /**
     * Token para entrar como soporte a un negocio: dura 30 minutos (no 12 horas) y lleva quién lo
     * emitió y la versión de su sesión, para revocarlo si ese admin se desactiva o cambia su clave.
     */
    public String generarTokenImpersonacion(Long tenantId, String adminUsername, int adminTokenVersion) {
        Instant ahora = Instant.now();
        return Jwts.builder()
            .subject(USUARIO_SOPORTE)
            .claim("tipo", "TENANT")
            .claim("tenantId", tenantId)
            .claim("rol", "DUENO_ADMIN")
            .claim("impersonadoPor", adminUsername)
            .claim("adminTokenVersion", adminTokenVersion)
            .issuedAt(Date.from(ahora))
            .expiration(Date.from(ahora.plusSeconds(30 * 60)))
            .signWith(signingKey())
            .compact();
    }

    public String generarTokenSuperAdmin(String username) {
        return generarTokenSuperAdmin(username, 0);
    }

    public String generarTokenSuperAdmin(String username, int tokenVersion) {
        Instant ahora = Instant.now();
        return Jwts.builder()
            .subject(username)
            .claim("tipo", "SUPER_ADMIN")
            .claim("tokenVersion", tokenVersion)
            .issuedAt(Date.from(ahora))
            .expiration(Date.from(ahora.plusSeconds(expiracionHorasSuperAdmin * 3600)))
            .signWith(signingKey())
            .compact();
    }

    /** Lanza JwtException si el token es inválido, está corrupto, mal firmado o expiró. */
    public Claims validarYParsear(String token) throws JwtException {
        return Jwts.parser()
            .verifyWith(signingKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
