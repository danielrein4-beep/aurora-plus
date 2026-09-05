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

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(secretConfigurado.getBytes(StandardCharsets.UTF_8));
    }

    public String generarTokenTenant(Long tenantId, String username, String rol) {
        Instant ahora = Instant.now();
        return Jwts.builder()
            .subject(username)
            .claim("tipo", "TENANT")
            .claim("tenantId", tenantId)
            .claim("rol", rol)
            .issuedAt(Date.from(ahora))
            .expiration(Date.from(ahora.plusSeconds(expiracionHorasTenant * 3600)))
            .signWith(signingKey())
            .compact();
    }

    public String generarTokenSuperAdmin(String username) {
        Instant ahora = Instant.now();
        return Jwts.builder()
            .subject(username)
            .claim("tipo", "SUPER_ADMIN")
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
