package com.auroraplus.modules.pacientesapp.services;

import com.auroraplus.core.auth.services.JwtService;
import com.auroraplus.modules.pacientesapp.entities.PacienteApp;
import com.auroraplus.modules.pacientesapp.repositories.PacienteAppRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;

/**
 * Puerta de /api/pacientes/v1/**. Estas rutas no pasan por TenantInterceptor (el
 * paciente no pertenece a ningún negocio): aquí se exige un token de tipo PACIENTE,
 * salvo en la entrada (auth) y el directorio, que se pueden ver sin sesión.
 */
@Component
public class PacienteAppInterceptor implements HandlerInterceptor {

    public static final String ATRIBUTO_PACIENTE = "pacienteAppId";

    @Autowired private PacientesAppConfig config;
    @Autowired private JwtService jwtService;
    @Autowired private PacienteAppRepository pacientes;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        if (!config.habilitada()) {
            responder(response, HttpServletResponse.SC_NOT_FOUND, "No encontrado");
            return false;
        }
        String ruta = request.getRequestURI();
        if (ruta.startsWith("/api/pacientes/v1/auth/") || ruta.startsWith("/api/pacientes/v1/directorio")) {
            return true;
        }

        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            responder(response, HttpServletResponse.SC_UNAUTHORIZED, "Falta la sesión");
            return false;
        }
        Claims claims;
        try {
            claims = jwtService.validarYParsear(auth.substring("Bearer ".length()));
        } catch (JwtException | IllegalArgumentException e) {
            responder(response, HttpServletResponse.SC_UNAUTHORIZED, "Tu sesión venció. Entra de nuevo");
            return false;
        }
        Number id = claims.get("pacienteAppId", Number.class);
        Integer version = claims.get("tokenVersion", Integer.class);
        if (!"PACIENTE".equals(claims.get("tipo", String.class)) || id == null) {
            responder(response, HttpServletResponse.SC_UNAUTHORIZED, "Sesión no válida para la app de pacientes");
            return false;
        }
        PacienteApp p = pacientes.findById(id.longValue()).orElse(null);
        if (p == null || !p.isActivo() || version == null || p.getTokenVersion() != version) {
            responder(response, HttpServletResponse.SC_UNAUTHORIZED, "Tu sesión se cerró. Entra de nuevo");
            return false;
        }
        request.setAttribute(ATRIBUTO_PACIENTE, p.getId());
        return true;
    }

    private void responder(HttpServletResponse response, int status, String mensaje) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"message\":\"" + mensaje.replace("\"", "'") + "\"}");
    }
}
