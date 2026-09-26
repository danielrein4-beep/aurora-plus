package com.auroraplus.core.financiero.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.entities.Turno;
import com.auroraplus.core.financiero.services.TurnoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/** Control de Caja por Turnos: apertura con monto base, egresos y Cierre Z (sistema vs. declarado). */
@RestController
@RequestMapping("/api/financiero/turnos")
public class TurnoController {

    @Autowired
    private TurnoService turnoService;

    @PostMapping("/abrir")
    public ResponseEntity<Turno> abrir(@RequestParam String idCajero,
                                        @RequestParam BigDecimal montoBase, @RequestParam String moneda) {
        Long tenantId = TenantContext.getCurrentTenant();
        com.auroraplus.core.auth.AuthContext.exigirRol("DUENO_ADMIN", "CAJERO_VENDEDOR", "ADMINISTRADOR_FINCA", "RECEPCIONISTA", "MESERO");
        return ResponseEntity.ok(turnoService.abrirTurno(tenantId, idCajero, montoBase, moneda));
    }

    @GetMapping("/abierto")
    public ResponseEntity<Turno> abierto(@RequestParam String moneda) {
        Long tenantId = TenantContext.getCurrentTenant();
        Optional<Turno> turno = turnoService.turnoAbierto(tenantId, moneda);
        return turno.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/historial")
    public List<Turno> historial() {
        Long tenantId = TenantContext.getCurrentTenant();
        return turnoService.historial(tenantId);
    }

    @PostMapping("/{id}/egresos")
    public ResponseEntity<MovimientoCaja> registrarEgreso(@PathVariable Long id,
                                                            @RequestParam BigDecimal monto, @RequestParam(required = false) String concepto) {
        Long tenantId = TenantContext.getCurrentTenant();
        com.auroraplus.core.auth.AuthContext.exigirRol("DUENO_ADMIN", "CAJERO_VENDEDOR", "ADMINISTRADOR_FINCA", "RECEPCIONISTA", "MESERO");
        return ResponseEntity.ok(turnoService.registrarEgreso(id, tenantId, monto, concepto));
    }

    @PostMapping("/{id}/cerrar")
    public ResponseEntity<Turno> cerrar(@PathVariable Long id, @RequestParam BigDecimal montoDeclarado) {
        Long tenantId = TenantContext.getCurrentTenant();
        com.auroraplus.core.auth.AuthContext.exigirRol("DUENO_ADMIN", "CAJERO_VENDEDOR", "ADMINISTRADOR_FINCA", "RECEPCIONISTA", "MESERO");
        return ResponseEntity.ok(turnoService.cerrarTurno(id, tenantId, montoDeclarado));
    }
}
