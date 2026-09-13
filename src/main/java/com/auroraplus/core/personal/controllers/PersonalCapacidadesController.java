package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.PermisoPersonal;
import com.auroraplus.core.personal.services.PersonalAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/personal/capacidades")
public class PersonalCapacidadesController {

    @Autowired private PersonalAccessService accessService;

    public record Capacidades(
        boolean accesoPersonal,
        boolean asistencia,
        boolean metas,
        boolean nominaAvanzada,
        boolean puedeVerDirectorio,
        boolean puedeVerMontosNomina,
        String rolPersonal,
        Long empleadoId
    ) {}

    @GetMapping
    public Capacidades obtener() {
        Long tenantId = TenantContext.getCurrentTenant();
        boolean dueno = accessService.esDuenoAdmin();
        PermisoPersonal permiso = dueno ? null : accessService.obtenerPermisoPersonalActual(tenantId).orElse(null);
        return new Capacidades(
            accessService.tieneFlag(tenantId, PersonalAccessService.FLAG_PERSONAL) && (dueno || permiso != null),
            accessService.tieneFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA),
            accessService.tieneFlag(tenantId, PersonalAccessService.FLAG_METAS),
            accessService.tieneFlag(tenantId, PersonalAccessService.FLAG_NOMINA_AVANZADA),
            accessService.puedeVerDirectorio(tenantId),
            accessService.puedeVerMontosGenerales(tenantId),
            dueno ? "DUENO_ADMIN" : permiso == null ? null : permiso.getRol().name(),
            permiso == null ? null : permiso.getEmpleadoId()
        );
    }
}
