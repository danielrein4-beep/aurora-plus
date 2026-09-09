package com.auroraplus.core.config;

import jakarta.persistence.EntityManager;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Red de seguridad CENTRALIZADA de aislamiento multi-tenant.
 *
 * TenantInterceptor activa el filtro "tenantFilter" al resolver el JWT, pero
 * esa activación no siempre sobrevive hasta la sesión de Hibernate que
 * termina ejecutando la query real (hallazgo de seguridad documentado en los
 * controllers del módulo salud, donde se parchó a mano, controller por
 * controller, volviendo a activar el filtro justo antes de leer). Ese patrón
 * depende de que cada desarrollador se acuerde de copiarlo en cada endpoint
 * nuevo — el día que alguien lo olvide, ese endpoint queda sin aislamiento
 * entre tenants.
 *
 * Este aspecto reemplaza esa dependencia de la memoria humana: se ejecuta
 * automáticamente antes de CUALQUIER llamada a un repositorio Spring Data en
 * todo el proyecto (no solo salud), así que un controller nuevo queda
 * protegido desde el primer día sin que nadie tenga que escribir nada extra.
 */
@Aspect
@Component
public class TenantFilterAspect {

    @Autowired
    private EntityManager entityManager;

    @Before("execution(* com.auroraplus..repositories.*.*(..))")
    public void asegurarFiltroTenant() {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return; // rutas sin tenant resuelto (login, super-admin) - nada que filtrar
        }
        entityManager.unwrap(Session.class)
            .enableFilter("tenantFilter")
            .setParameter("tenantId", tenantId);
    }
}
