package com.auroraplus.core.auditoria;

import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.config.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;
import java.util.regex.Pattern;

/**
 * Red de seguridad para la bitácora de auditoría: cualquier POST/PUT/PATCH/DELETE
 * que responda 2xx y que NINGÚN código haya registrado ya a mano (ver
 * RegistroAuditoriaService) queda igual anotado aquí, con una descripción genérica
 * derivada de la ruta. Así ningún crear/editar/eliminar de ninguna vertical queda
 * sin rastro, sin depender de que cada controller lo haya instrumentado uno por uno
 * — incluye endpoints nuevos que se agreguen después sin tocar este archivo.
 *
 * Se registra DESPUÉS de servir la respuesta (afterCompletion) y debe correr
 * mientras AuthContext/TenantContext todavía estén resueltos — por eso en
 * WebConfig se agrega DESPUÉS de TenantInterceptor (Spring ejecuta
 * afterCompletion en orden inverso al de registro).
 */
@Component
public class AuditoriaAutoInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(AuditoriaAutoInterceptor.class);

    @Autowired
    private RegistroAuditoriaService registroAuditoriaService;

    private static final Pattern SEGMENTO_NUMERICO = Pattern.compile("^\\d+$");

    private static final Map<String, String> MODULO_POR_PREFIJO = Map.ofEntries(
        Map.entry("horeca", "HORECA"),
        Map.entry("ganaderia", "GANADERIA"),
        Map.entry("salud", "SALUD"),
        Map.entry("repuestos", "COMERCIO"),
        Map.entry("retail", "COMERCIO"),
        Map.entry("comercio", "COMERCIO"),
        Map.entry("personal", "PERSONAL"),
        Map.entry("tamanaco-comercial", "TAMANACO_COMERCIAL"),
        Map.entry("auth", "AUTH")
    );

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        try {
            registrarSiCorresponde(request, response);
        } catch (Exception e) {
            // La auditoría automática NUNCA debe tumbar ni ensuciar una respuesta ya enviada.
            log.warn("No se pudo generar el registro automático de auditoría para {} {}: {}",
                request.getMethod(), request.getRequestURI(), e.getMessage());
        } finally {
            registroAuditoriaService.limpiarFlagDeRequest();
        }
    }

    private void registrarSiCorresponde(HttpServletRequest request, HttpServletResponse response) {
        String metodo = request.getMethod();
        String accion = switch (metodo) {
            case "POST" -> "CREAR";
            case "PUT", "PATCH" -> "EDITAR";
            case "DELETE" -> "ELIMINAR";
            default -> null;
        };
        if (accion == null) return;
        if (response.getStatus() < 200 || response.getStatus() >= 300) return;
        if (registroAuditoriaService.yaRegistradoEnEstaRequest()) return;

        String uri = request.getRequestURI();
        if (!uri.startsWith("/api/")) return;
        if (uri.startsWith("/api/auditoria") || uri.startsWith("/api/super-admin") || uri.startsWith("/api/public")) return;
        // Login/registro no tienen tenant resuelto todavía — nada que auditar bajo un tenant.
        if (uri.startsWith("/api/auth/login") || uri.startsWith("/api/auth/registro-negocio")
            || uri.startsWith("/api/auth/olvide-clave") || uri.startsWith("/api/auth/resetear-clave")) return;

        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) return;

        String[] segmentos = uri.substring("/api/".length()).split("/");
        if (segmentos.length == 0 || segmentos[0].isBlank()) return;

        String prefijo = segmentos[0];
        String modulo = MODULO_POR_PREFIJO.getOrDefault(prefijo, prefijo.toUpperCase().replace('-', '_'));
        String entidad = segmentos.length > 1 ? segmentos[1] : prefijo;

        String entidadId = null;
        for (int i = segmentos.length - 1; i >= 0; i--) {
            if (SEGMENTO_NUMERICO.matcher(segmentos[i]).matches()) {
                entidadId = segmentos[i];
                break;
            }
        }

        registroAuditoriaService.registrar(tenantId, modulo, accion, entidad, entidadId,
            metodo + " " + uri);
    }
}
