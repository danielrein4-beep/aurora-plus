package com.auroraplus.core.config;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auth.services.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;

/**
 * Resuelve QUIÉN hace la request a partir de un JWT verificado (ver
 * JwtService) — YA NO confía en el header "X-Tenant-ID" que antes el propio
 * cliente podía mandar con cualquier valor sin ninguna prueba de identidad.
 * Sin un token válido, la petición se rechaza con 401 antes de llegar a
 * cualquier controlador (ver WebConfig — /api/auth/** queda excluido, es la
 * única puerta que no puede exigir ya un token).
 *
 * Dos tipos de token (ver JwtService):
 * - TENANT: trae tenantId+rol — activa el filtro de Hibernate por ese tenant
 *   (aislamiento real de datos entre negocios) y dice qué rol tiene el
 *   usuario dentro de SU negocio.
 * - SUPER_ADMIN: no tiene tenantId (administra la plataforma completa, todos
 *   los tenants) — no se activa ningún filtro, y solo es válido en rutas
 *   /api/super-admin/**.
 */
@Component
public class TenantInterceptor implements HandlerInterceptor {

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JwtService jwtService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            rechazar(response, "Falta el token de autenticación (header Authorization: Bearer <token>)");
            return false;
        }

        String token = authHeader.substring("Bearer ".length());
        Claims claims;
        try {
            claims = jwtService.validarYParsear(token);
        } catch (JwtException | IllegalArgumentException e) {
            rechazar(response, "Token inválido o expirado — inicie sesión de nuevo");
            return false;
        }

        String tipo = claims.get("tipo", String.class);
        boolean esRutaSuperAdmin = request.getRequestURI().startsWith("/api/super-admin/");

        if ("SUPER_ADMIN".equals(tipo)) {
            if (!esRutaSuperAdmin) {
                rechazar(response, "Este token de super-admin no aplica a este recurso");
                return false;
            }
            AuthContext.set(claims.getSubject(), "SUPER_ADMIN");
            return true;
        }

        if (esRutaSuperAdmin) {
            rechazar(response, "Se requiere un token de super-admin para esta ruta");
            return false;
        }

        Number tenantIdRaw = claims.get("tenantId", Number.class);
        if (tenantIdRaw == null) {
            rechazar(response, "Token sin tenantId — token inválido");
            return false;
        }
        Long tenantId = tenantIdRaw.longValue();
        String rol = claims.get("rol", String.class);

        // Casi todos los controllers de este sistema reciben "tenantId" como
        // @RequestParam y lo pasan directo a sus servicios (patrón heredado de
        // antes de tener login, cuando ese valor solo venía del header
        // X-Tenant-ID sin verificar). Reescribir los ~64 controllers para que
        // lean el tenant SOLO de TenantContext es el fix ideal a largo plazo,
        // pero mientras tanto esta comparación cierra el hueco real: si la
        // petición trae un tenantId que NO coincide con el del token, se
        // rechaza aquí — un usuario autenticado del tenant 3 no puede operar
        // sobre el tenant 5 con solo cambiar el parámetro de la URL.
        String tenantIdParam = request.getParameter("tenantId");
        if (tenantIdParam != null && !tenantIdParam.isBlank()) {
            try {
                if (!tenantId.equals(Long.valueOf(tenantIdParam))) {
                    rechazar(response, "El tenantId de la petición no coincide con su sesión");
                    return false;
                }
            } catch (NumberFormatException e) {
                rechazar(response, "tenantId inválido");
                return false;
            }
        }

        AuthContext.set(claims.getSubject(), rol);
        TenantContext.setCurrentTenant(tenantId);

        entityManager.unwrap(Session.class)
            .enableFilter("tenantFilter")
            .setParameter("tenantId", tenantId);

        return true;
    }

    private void rechazar(HttpServletResponse response, String mensaje) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"error\":\"" + mensaje.replace("\"", "'") + "\"}");
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        TenantContext.clear();
        AuthContext.clear();
    }
}
