package com.auroraplus.core.personal.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.personal.entities.AjusteNomina;
import com.auroraplus.core.personal.services.AjusteNominaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/personal/nomina/ajustes")
public class AjusteNominaController {

    @Autowired
    private AjusteNominaService ajusteNominaService;

    public static class CorreccionRequest {
        public Long nominaEmpleadoId;
        public BigDecimal montoAjuste;
        public String motivo;
    }

    @PostMapping("/correccion")
    public AjusteNomina corregir(@RequestBody CorreccionRequest request) {
        return ajusteNominaService.corregir(TenantContext.getCurrentTenant(), request.nominaEmpleadoId, request.montoAjuste, request.motivo);
    }

    @PostMapping("/reverso")
    public AjusteNomina reversar(@RequestBody Map<String, Object> request) {
        Long nominaEmpleadoId = Long.valueOf(String.valueOf(request.get("nominaEmpleadoId")));
        String motivo = String.valueOf(request.get("motivo"));
        return ajusteNominaService.reversar(TenantContext.getCurrentTenant(), nominaEmpleadoId, motivo);
    }
}
