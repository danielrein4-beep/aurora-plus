package com.auroraplus.modules.veterinaria.services;

import com.auroraplus.core.config.TenantContext;

/**
 * Punto unico de resolucion del tenant para Veterinaria.
 *
 * El tenant autenticado en el JWT siempre es la autoridad. El parametro se
 * conserva temporalmente para no romper clientes existentes, pero jamas puede
 * seleccionar otra empresa.
 */
public final class VeterinariaTenantGuard {

    private VeterinariaTenantGuard() {
    }

    public static Long resolver(Long tenantSolicitado) {
        Long tenantAutenticado = TenantContext.getCurrentTenant();
        if (tenantAutenticado == null) {
            throw new SecurityException("Tenant no identificado en la sesion");
        }
        if (tenantSolicitado != null && !tenantAutenticado.equals(tenantSolicitado)) {
            throw new SecurityException("No tienes permiso para operar sobre otra empresa");
        }
        return tenantAutenticado;
    }
}
