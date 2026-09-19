package com.auroraplus.modules.veterinaria.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.veterinaria.entities.CobroConsultaVet;
import com.auroraplus.modules.veterinaria.entities.Mascota;
import com.auroraplus.modules.veterinaria.entities.Propietario;
import com.auroraplus.modules.veterinaria.services.CobroVeterinariaService;
import com.auroraplus.modules.veterinaria.services.MascotaService;
import com.auroraplus.modules.veterinaria.services.PropietarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/veterinaria/cobros")
public class CobroVeterinariaController {

    @Autowired
    private CobroVeterinariaService cobroVeterinariaService;

    @Autowired
    private MascotaService mascotaService;

    @Autowired
    private PropietarioService propietarioService;

    @PostMapping
    public ResponseEntity<CobroConsultaVet> procesarCobro(
            @RequestParam(required = false) Long tenantId,
            @RequestBody CobroVeterinariaService.CobroRequest req) {

        Long tenantActivo = com.auroraplus.modules.veterinaria.services.VeterinariaTenantGuard.resolver(tenantId);
        if (tenantActivo == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }

        if (req.cajeroUsuario == null || req.cajeroUsuario.isBlank()) {
            req.cajeroUsuario = AuthContext.getUsername() != null ? AuthContext.getUsername() : "Cajero";
        }

        Mascota mascota = null;
        if (req.mascotaId != null) {
            mascota = mascotaService.obtenerPorId(tenantActivo, req.mascotaId).orElse(null);
        }

        Propietario propietario = null;
        if (req.propietarioId != null) {
            propietario = propietarioService.obtenerPorId(tenantActivo, req.propietarioId).orElse(null);
        }

        return ResponseEntity.ok(cobroVeterinariaService.procesarCobro(tenantActivo, req, mascota, propietario));
    }

    @GetMapping("/mascota/{mascotaId}")
    public List<CobroConsultaVet> historialPorMascota(@PathVariable Long mascotaId) {
        return cobroVeterinariaService.historialPorMascota(mascotaId);
    }

    @GetMapping("/propietario/{propietarioId}")
    public List<CobroConsultaVet> historialPorPropietario(@PathVariable Long propietarioId) {
        return cobroVeterinariaService.historialPorPropietario(propietarioId);
    }

    @GetMapping("/reporte")
    public List<CobroConsultaVet> reporteCobros(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fin) {
        return cobroVeterinariaService.listarPorRangoFechas(inicio, fin);
    }
}
