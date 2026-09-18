package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.modules.ganaderia.entities.GastoGanaderia;
import com.auroraplus.modules.ganaderia.repositories.GastoGanaderiaRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaGastoService;
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

    @GetMapping
    public List<GastoGanaderia> listar(@RequestParam(required = false) Long tenantId) {
        if (tenantId != null) {
            return gastoGanaderiaRepository.findByTenantIdOrderByFechaDesc(tenantId);
        }
        return gastoGanaderiaRepository.findAllByOrderByFechaDesc();
    }

    @PostMapping
    public ResponseEntity<GastoGanaderia> registrar(@RequestParam Long tenantId, @RequestBody GastoRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA");
        GastoGanaderia gasto = ganaderiaGastoService.registrarGasto(tenantId, request.categoria, request.descripcion, request.monto, request.fecha);
        auditoriaService.registrar(tenantId, "GANADERIA", "CREAR", "GastoGanaderia", gasto.getId(), "Registró un gasto — categoría: " + request.categoria);
        return ResponseEntity.ok(gasto);
    }
}
