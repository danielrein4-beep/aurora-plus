package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.config.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Fuente única del tenant para Ganadería. El cliente nunca decide la finca por URL. */
public final class GanaderiaTenantAccess {

    private GanaderiaTenantAccess() { }

    public static Long requireTenant() {
        Long tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null || tenantId <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "No hay una finca autenticada en el contexto de seguridad");
        }
        return tenantId;
    }
}
