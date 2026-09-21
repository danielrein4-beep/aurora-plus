package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.modules.ganaderia.entities.GastoGanaderia;
import com.auroraplus.modules.ganaderia.repositories.GastoGanaderiaRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaGastoService;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/ganaderia/gastos")
public class GastoGanaderiaController {

    @Autowired
    private GanaderiaGastoService ganaderiaGastoService;

    @Autowired
    private GastoGanaderiaRepository gastoGanaderiaRepository;

    @Autowired
    private RegistroAuditoriaService auditoriaService;

    public static class GastoRequest {
        public String categoria;
        public String descripcion;
        public BigDecimal monto;
        public LocalDate fecha;
    }

    // P0: el tenant SIEMPRE sale de TenantContext (JWT verificado) — antes se aceptaba un
    // tenantId opcional por query que, si el cliente lo omitía, caía a findAllByOrderByFechaDesc(),
    // devolviendo los gastos de TODOS los tenants mezclados.
    @GetMapping
    public List<GastoGanaderia> listar() {
        return gastoGanaderiaRepository.findByTenantIdOrderByFechaDesc(GanaderiaTenantAccess.requireTenant());
    }

    @PostMapping
    public ResponseEntity<GastoGanaderia> registrar(@RequestBody GastoRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        GastoGanaderia gasto = ganaderiaGastoService.registrarGasto(tenantId, request.categoria, request.descripcion, request.monto, request.fecha);
        auditoriaService.registrar(tenantId, "GANADERIA", "CREAR", "GastoGanaderia", gasto.getId(), "Registró un gasto — categoría: " + request.categoria);
        return ResponseEntity.ok(gasto);
    }
}
