package com.auroraplus.core.config;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class TenantInterceptor implements HandlerInterceptor {

    @Autowired
    private EntityManager entityManager;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String tenantHeader = request.getHeader("X-Tenant-ID");
        Long tenantId;
        if (tenantHeader != null && !tenantHeader.isEmpty()) {
            tenantId = Long.valueOf(tenantHeader);
        } else {
            // Valor por defecto o error si no viaja el header
            tenantId = 1L;
        }
        TenantContext.setCurrentTenant(tenantId);

        entityManager.unwrap(Session.class)
            .enableFilter("tenantFilter")
            .setParameter("tenantId", tenantId);

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        TenantContext.clear();
    }
}
