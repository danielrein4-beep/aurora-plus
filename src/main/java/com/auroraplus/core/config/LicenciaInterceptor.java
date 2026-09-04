package com.auroraplus.core.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

/**
 * Fase 2.2 del Plan Maestro — Bloqueo automático por falta de pago (Modelo SaaS)
 * y control de acceso por nivel de licencia. Corre después de TenantInterceptor
 * (que ya resolvió el tenant activo en TenantContext) y antes de llegar al
 * controlador: si la licencia no es válida, corta la petición con 402/403 y
 * el controlador nunca se ejecuta.
 */
@Component
public class LicenciaInterceptor implements HandlerInterceptor {

    @Autowired
    private LicenciaService licenciaService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return true; // TenantInterceptor no corrió para esta ruta; no es responsabilidad de este interceptor
        }

        String modulo = extraerModulo(request.getRequestURI());
        LicenciaService.ResultadoValidacion resultado = licenciaService.validarAcceso(tenantId, modulo);

        if (!resultado.permitido) {
            response.setStatus(resultado.codigoHttp);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(objectMapper.writeValueAsString(Map.of("error", resultado.mensaje)));
            return false;
        }

        return true;
    }

    /** Extrae el primer segmento después de /api/ (ej: /api/minero/bocamina -> "minero"). */
    private String extraerModulo(String uri) {
        String sinPrefijo = uri.replaceFirst("^/api/", "");
        int idx = sinPrefijo.indexOf('/');
        return idx > 0 ? sinPrefijo.substring(0, idx) : sinPrefijo;
    }
}
