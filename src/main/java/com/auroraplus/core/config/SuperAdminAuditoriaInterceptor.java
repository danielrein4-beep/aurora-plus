package com.auroraplus.core.config;

import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Deja constancia de TODO lo que cambia un super admin (pagos, planes, módulos, acceso total,
 * límites, altas y ediciones de negocios, equipo...) con el nombre de la persona. Antes
 * /api/super-admin/** estaba fuera de la auditoría y casi nada quedaba registrado, y lo poco
 * que sí quedaba decía "SUPER_ADMIN" sin saber quién fue.
 *
 * Solo cuenta escrituras exitosas (POST/PUT/PATCH/DELETE con respuesta < 400). El negocio
 * afectado se toma de la ruta (/api/super-admin/{id}/... o /tenants/{id}/...) o del parámetro
 * tenantId; si la acción es de la plataforma (sin negocio) queda con tenant 0.
 * Se registra en WebConfig DESPUÉS de TenantInterceptor para que AuthContext siga resuelto.
 */
@Component
public class SuperAdminAuditoriaInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(SuperAdminAuditoriaInterceptor.class);
    private static final Pattern TENANT_EN_RUTA = Pattern.compile("^/api/super-admin/(?:tenants/)?(\\d+)(?:/|$)");

    @Autowired
    private RegistroAuditoriaService registroAuditoriaService;

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        try {
            String metodo = request.getMethod();
            if ("GET".equals(metodo) || "HEAD".equals(metodo) || "OPTIONS".equals(metodo)) return;
            if (ex != null || response.getStatus() >= 400) return;
            String ruta = request.getRequestURI();
            // Suplantar, activar y suspender ya se auditan en su propio endpoint, con más detalle.
            if (ruta.endsWith("/impersonate") || ruta.endsWith("/activar") || ruta.endsWith("/desactivar")) return;

            Long tenantId = 0L;
            Matcher m = TENANT_EN_RUTA.matcher(ruta);
            if (m.find()) {
                tenantId = Long.valueOf(m.group(1));
            } else if (request.getParameter("tenantId") != null && request.getParameter("tenantId").matches("\\d+")) {
                tenantId = Long.valueOf(request.getParameter("tenantId"));
            }

            String usuario = com.auroraplus.core.auth.AuthContext.getUsername();
            String accion = ruta.replaceFirst("^/api/super-admin/?", "");
            if (accion.length() > 120) accion = accion.substring(0, 120);
            registroAuditoriaService.registrar(
                tenantId,
                "super-admin:" + (usuario != null ? usuario : "desconocido"),
                metodo,
                "SuperAdmin",
                tenantId,
                metodo + " " + ruta + " por " + (usuario != null ? usuario : "super admin sin identificar")
            );
        } catch (Exception e) {
            // Igual que la auditoría de los negocios: nunca tumba una respuesta ya enviada.
            log.warn("No se pudo auditar la acción de super admin {} {}: {}", request.getMethod(), request.getRequestURI(), e.getMessage());
        }
    }
}
