package com.auroraplus.modules.salud.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.modules.salud.services.CanalEndemicoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * Canal Endémico de CADA médico/clínica — construido a partir de sus propios
 * diagnósticos CIE-10 ya registrados en consulta (ver CanalEndemicoService).
 * El aislamiento por tenant es automático (TenantFilterAspect): un médico
 * solo ve el comportamiento de SUS propios pacientes, nunca el de otra
 * clínica de la red.
 */
@RestController
@RequestMapping("/api/salud/canal-endemico")
public class CanalEndemicoController {

    @Autowired
    private CanalEndemicoService canalEndemicoService;

    // Bloqueado a propósito para cualquier rol que no sea el médico/dueño —
    // pedido explícito: la recepcionista/secretaria NUNCA debe poder ver ni
    // tocar el Canal Endémico, ni siquiera consultarlo de solo lectura.
    @GetMapping("/diagnosticos-frecuentes")
    public List<CanalEndemicoService.DiagnosticoFrecuente> diagnosticosFrecuentes(
            @RequestParam(defaultValue = "10") int limite) {
        AuthContext.exigirRol("DUENO_ADMIN", "MEDICO");
        return canalEndemicoService.diagnosticosMasFrecuentes(limite);
    }

    @GetMapping
    public CanalEndemicoService.CanalEndemico obtenerCanal(
            @RequestParam String cie10,
            @RequestParam(required = false) Integer anio) {
        AuthContext.exigirRol("DUENO_ADMIN", "MEDICO");
        int anioConsultado = anio != null ? anio : LocalDate.now().getYear();
        return canalEndemicoService.calcular(cie10, anioConsultado);
    }
}
