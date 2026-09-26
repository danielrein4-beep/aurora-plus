package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.modules.ganaderia.entities.AplicacionVacuna;
import com.auroraplus.modules.ganaderia.entities.Vacuna;
import com.auroraplus.modules.ganaderia.repositories.AplicacionVacunaRepository;
import com.auroraplus.modules.ganaderia.repositories.VacunaRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaSanidadService;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/ganaderia/vacunas")
public class VacunaController {

    @Autowired
    private VacunaRepository vacunaRepository;

    @Autowired
    private AplicacionVacunaRepository aplicacionVacunaRepository;

    @Autowired
    private GanaderiaSanidadService ganaderiaSanidadService;

    @Autowired
    private com.auroraplus.modules.ganaderia.services.GanaderiaReportesPdfService reportesPdfService;

    /** Constancia PDF de vacunación: animales vacunados, vacuna, lote, próxima dosis y retiros. */
    @GetMapping(value = "/constancia/pdf", produces = org.springframework.http.MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> constanciaPdf(@RequestParam LocalDate desde,
                                                @RequestParam(required = false) LocalDate hasta,
                                                @RequestParam(required = false) Long vacunaId) throws Exception {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        LocalDate h = hasta != null ? hasta : desde;
        byte[] pdf = reportesPdfService.constanciaVacunacion(tenantId, desde, h, vacunaId);
        return ResponseEntity.ok()
            .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"constancia-vacunacion-" + desde + ".pdf\"")
            .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
            .body(pdf);
    }

    @Autowired
    private com.auroraplus.modules.ganaderia.repositories.AnimalRepository animalRepository;

    // P0: el tenant SIEMPRE sale de TenantContext (JWT verificado) — antes se aceptaba un
    // tenantId opcional por query que, si el cliente lo omitía, caía a findAll() y devolvía
    // el catálogo de TODOS los tenants mezclado; y si lo mandaba, confiaba en un valor que
    // el propio cliente controla, permitiendo leer el catálogo de cualquier otro tenant.
    @GetMapping
    public List<Vacuna> listar() {
        return vacunaRepository.findByTenantId(GanaderiaTenantAccess.requireTenant());
    }

    @PostMapping
    public ResponseEntity<Vacuna> crear(@RequestBody Vacuna vacuna) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        return ResponseEntity.ok(ganaderiaSanidadService.crearVacuna(tenantId, vacuna));
    }

    public static class AplicacionRequest {
        public Long animalId;
        public Long vacunaId;
        public LocalDate fechaAplicacion;
        public String lote;
        public String veterinarioResponsable;
        public BigDecimal costo;
    }

    public static class AplicacionLoteRequest {
        public List<Long> animalIds;
        public Long vacunaId;
        public LocalDate fechaAplicacion;
        public String lote;
        public String veterinarioResponsable;
        public BigDecimal costo;
    }

    @PostMapping("/aplicar")
    public ResponseEntity<AplicacionVacuna> aplicar(@RequestBody AplicacionRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        return ResponseEntity.ok(ganaderiaSanidadService.aplicarVacuna(tenantId, request.animalId, request.vacunaId,
            request.fechaAplicacion, request.lote, request.veterinarioResponsable, request.costo));
    }

    /**
     * Aplicación masiva de vacuna / tratamiento en lote.
     * VERIFICA ESTRICTAMENTE CADA ANIMALID CONTRA EL TENANTID PARA PREVENIR ACCESO CRUZADO (IDOR).
     */
    @PostMapping("/aplicar-lote")
    public ResponseEntity<List<AplicacionVacuna>> aplicarLote(@RequestBody AplicacionLoteRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        return ResponseEntity.ok(ganaderiaSanidadService.aplicarVacunaLote(tenantId, request.animalIds, request.vacunaId,
            request.fechaAplicacion, request.lote, request.veterinarioResponsable, request.costo));
    }

    @GetMapping("/animal/{animalId}")
    public List<AplicacionVacuna> historialAnimal(@PathVariable Long animalId) {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        animalRepository.findById(animalId).filter(a -> tenantId.equals(a.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        return aplicacionVacunaRepository.findByAnimalIdOrderByFechaAplicacionDesc(animalId);
    }

    @GetMapping("/refuerzos-pendientes")
    public List<AplicacionVacuna> refuerzosPendientes(
                                                        @RequestParam(required = false) LocalDate desde,
                                                        @RequestParam(required = false) LocalDate hasta) {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        LocalDate d = desde != null ? desde : LocalDate.now();
        LocalDate h = hasta != null ? hasta : LocalDate.now().plusDays(30);
        return aplicacionVacunaRepository.findRefuerzosPendientes(tenantId, d, h);
    }
}
