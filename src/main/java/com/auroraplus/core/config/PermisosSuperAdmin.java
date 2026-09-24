package com.auroraplus.core.config;

import java.util.Set;

/**
 * Qué puede hacer cada rol del equipo de administración sobre /api/super-admin/**.
 * Se evalúa en TenantInterceptor en cada request, así que esconder un botón en
 * el panel nunca es la única barrera.
 *
 * - PROPIETARIO: todo, incluido gestionar el equipo y ver la auditoría global.
 * - SOPORTE: directorio en lectura, tickets, entrar como soporte a un negocio y
 *   gestionar los usuarios de un negocio.
 * - FINANZAS: directorio en lectura, cobros, cortesías, planes, suspensiones,
 *   finanzas del SaaS y comisiones.
 * - ANALISTA: solo lectura del directorio, métricas, actividad y Canal Endémico.
 *
 * Todos pueden gestionar la seguridad de su propia cuenta (/seguridad).
 */
public final class PermisosSuperAdmin {

    public static final Set<String> ROLES = Set.of("PROPIETARIO", "SOPORTE", "FINANZAS", "ANALISTA");

    private PermisosSuperAdmin() {}

    public static boolean permitido(String rol, String metodo, String uri) {
        if ("PROPIETARIO".equals(rol)) return true;
        if (!ROLES.contains(rol)) return false;

        String ruta = uri.substring("/api/super-admin".length());
        boolean lectura = "GET".equalsIgnoreCase(metodo);

        if (ruta.startsWith("/seguridad")) return true;
        if (ruta.startsWith("/equipo") || ruta.startsWith("/tenants/auditoria")) return false;

        // Lectura común a todo el equipo: directorio, analítica y vigilancia epidemiológica.
        if (ruta.startsWith("/actividad") || ruta.startsWith("/canal-endemico")) return lectura;
        if (lectura && (ruta.equals("/tenants") || ruta.equals("/tenants/stats") || ruta.equals("/tenants/analytics")
                || ruta.matches("/tenants/\\d+(/modulos|/usuarios)?"))) {
            return true;
        }

        return switch (rol) {
            case "SOPORTE" -> ruta.startsWith("/soporte")
                || ruta.matches("/tenants/\\d+/impersonate")
                || ruta.matches("/tenants/\\d+/usuarios(/\\d+/toggle-activo)?");
            case "FINANZAS" -> ruta.startsWith("/tenants/pagos")
                || ruta.startsWith("/tenants/finanzas")
                || ruta.startsWith("/comisiones")
                || ruta.equals("/tenants/barrido-suspension")
                || ruta.matches("/tenants/\\d+/(regalar-tiempo|renovar|cambiar-plan|activar|desactivar)");
            default -> false;
        };
    }
}
