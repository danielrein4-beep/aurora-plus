package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.DetalleNomina;
import com.auroraplus.core.personal.entities.NominaEmpleado;
import com.auroraplus.core.personal.repositories.DetalleNominaRepository;
import com.auroraplus.core.personal.services.NominaEmpleadoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/personal/nomina/empleados")
public class NominaEmpleadoController {

    @Autowired
    private NominaEmpleadoService nominaEmpleadoService;

    @Autowired
    private DetalleNominaRepository detalleNominaRepository;

    @GetMapping("/{id}")
    public NominaEmpleado obtener(@PathVariable Long id) {
        return nominaEmpleadoService.obtener(TenantContext.getCurrentTenant(), id);
    }

    @GetMapping("/{id}/detalles")
    public List<DetalleNomina> detalles(@PathVariable Long id) {
        Long tenantId = TenantContext.getCurrentTenant();
        nominaEmpleadoService.obtener(tenantId, id); // valida acceso (propio si es EMPLEADO)
        return detalleNominaRepository.findByTenantIdAndNominaEmpleadoId(tenantId, id);
    }
}
