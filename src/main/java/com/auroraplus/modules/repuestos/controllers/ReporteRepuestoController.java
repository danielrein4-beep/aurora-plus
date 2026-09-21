package com.auroraplus.modules.repuestos.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.repuestos.services.RepuestosReporteService;
import com.auroraplus.modules.repuestos.services.UtilidadPeriodoRepuesto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * Reportes administrativos de Comercio — utilidad real (no ventas brutas), solo visible
 * para el Dueño/Administrador: es información sobre cuánto gana el negocio por producto,
 * no algo que un cajero o encargado de inventario necesite ver para hacer su trabajo.
 */
@RestController
@RequestMapping("/api/repuestos/reportes")
public class ReporteRepuestoController {

    @Autowired
    private RepuestosReporteService repuestosReporteService;

    @GetMapping("/utilidad")
    public UtilidadPeriodoRepuesto utilidad(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        AuthContext.exigirRol("DUENO_ADMIN");
        if (hasta.isBefore(desde)) {
            throw new RuntimeException("La fecha 'hasta' no puede ser anterior a 'desde'");
        }
        return repuestosReporteService.obtenerUtilidadPorPeriodo(TenantContext.getCurrentTenant(), desde, hasta);
    }
}
