package com.auroraplus.core.config;

import com.auroraplus.modules.salud.services.CanalEndemicoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * Vista consolidada del Canal Endémico para TODA la red de clínicas Mediclinic
 * — el mismo motor que usa cada médico (CanalEndemicoController), pero aquí
 * corriendo bajo un token SUPER_ADMIN: TenantInterceptor nunca activa el
 * filtro de Hibernate para ese tipo de token, así que las mismas consultas
 * agregan automáticamente a todas las clínicas de la plataforma. Esto es lo
 * que permite generar reportes epidemiológicos reales a partir de datos de
 * muchas clínicas independientes — la vigilancia que hoy nadie más ofrece.
 *
 * Protegido por TenantInterceptor: solo un token SUPER_ADMIN llega aquí.
 */
@RestController
@RequestMapping("/api/super-admin/canal-endemico")
public class SuperAdminCanalEndemicoController {

    @Autowired
    private CanalEndemicoService canalEndemicoService;

    @GetMapping("/diagnosticos-frecuentes")
    public List<CanalEndemicoService.DiagnosticoFrecuente> diagnosticosFrecuentes(
            @RequestParam(defaultValue = "20") int limite) {
        return canalEndemicoService.diagnosticosMasFrecuentes(limite);
    }

    @GetMapping
    public CanalEndemicoService.CanalEndemico obtenerCanalRed(
            @RequestParam String cie10,
            @RequestParam(required = false) Integer anio) {
        int anioConsultado = anio != null ? anio : LocalDate.now().getYear();
        return canalEndemicoService.calcular(cie10, anioConsultado);
    }

    @GetMapping("/desglose-por-clinica")
    public List<CanalEndemicoService.CasosPorTenant> desglosePorClinica(
            @RequestParam String cie10,
            @RequestParam(required = false) Integer anio) {
        int anioConsultado = anio != null ? anio : LocalDate.now().getYear();
        return canalEndemicoService.desglosePorTenant(cie10, anioConsultado);
    }
}
