package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.reportes.ExcelExportService;
import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.AplicacionMedicamento;
import com.auroraplus.modules.ganaderia.entities.Medicamento;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.AplicacionMedicamentoRepository;
import com.auroraplus.modules.ganaderia.repositories.MedicamentoRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaSanidadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/ganaderia/sanidad")
public class GanaderiaSanidadController {

    @Autowired
    private GanaderiaSanidadService ganaderiaSanidadService;

    @Autowired
    private ExcelExportService excelExportService;

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private MedicamentoRepository medicamentoRepository;

    @Autowired
    private AplicacionMedicamentoRepository aplicacionMedicamentoRepository;

    public static class MastitisRequest {
        public Long animalId;
        public LocalDate fecha;
        public String cuartoAfectado; // AD, AI, PD, PI, MULTIPLES
        public String gradoCmt; // GRADO_1_TRAZAS, GRADO_2_POSITIVO, GRADO_3_CLINICA
        public String farmacoAplicado;
        public Integer diasRetiroLeche;
        public String veterinario;
        public BigDecimal costo;
        public String notas;
    }

    @PostMapping("/mastitis")
    @Transactional
    public ResponseEntity<AplicacionMedicamento> registrarMastitis(@RequestParam Long tenantId, @RequestBody MastitisRequest request) {
        Animal animal = animalRepository.findById(request.animalId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!animal.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
        }

        LocalDate fecha = request.fecha != null ? request.fecha : LocalDate.now();
        int retiroDias = request.diasRetiroLeche != null ? request.diasRetiroLeche : 3;

        Medicamento med = medicamentoRepository.findAll().stream()
            .filter(m -> tenantId.equals(m.getTenantId()) && m.getNombre().equalsIgnoreCase(request.farmacoAplicado))
            .findFirst()
            .orElseGet(() -> {
                Medicamento nuevo = new Medicamento();
                nuevo.setTenantId(tenantId);
                nuevo.setNombre(request.farmacoAplicado != null && !request.farmacoAplicado.isBlank()
                    ? request.farmacoAplicado : "Tratamiento Mastitis Intramamario");
                nuevo.setTipoTratamiento("ANTIBIOTICO");
                nuevo.setDiasRetiroLeche(retiroDias);
                nuevo.setDiasRetiroCarne(7);
                return medicamentoRepository.save(nuevo);
            });

        AplicacionMedicamento aplicacion = new AplicacionMedicamento();
        aplicacion.setTenantId(tenantId);
        aplicacion.setAnimal(animal);
        aplicacion.setMedicamento(med);
        aplicacion.setFechaAplicacion(fecha);
        aplicacion.setDosis("1 jeringa intramamaria (" + (request.cuartoAfectado != null ? request.cuartoAfectado : "Cuarto afectado") + ")");
        aplicacion.setMotivoDiagnostico("MASTITIS CMT: " + (request.gradoCmt != null ? request.gradoCmt : "POSITIVO")
            + " | Cuarto: " + (request.cuartoAfectado != null ? request.cuartoAfectado : "N/D")
            + (request.notas != null && !request.notas.isBlank() ? " - " + request.notas : ""));
        aplicacion.setVeterinarioResponsable(request.veterinario);
        aplicacion.setCosto(request.costo);
        aplicacion.setFechaFinRetiroLeche(fecha.plusDays(retiroDias));
        aplicacion.setFechaFinRetiroCarne(fecha.plusDays(7));

        return ResponseEntity.ok(aplicacionMedicamentoRepository.save(aplicacion));
    }

    /** Refuerzos de vacuna pendientes + animales todavía en período de retiro de leche/carne — todo en un solo lugar. */
    @GetMapping("/alertas")
    public List<GanaderiaSanidadService.AlertaSanitaria> alertas(@RequestParam Long tenantId) {
        return ganaderiaSanidadService.obtenerAlertasSanitarias(tenantId);
    }

    @GetMapping("/alertas/export-excel")
    public ResponseEntity<byte[]> alertasExcel(@RequestParam Long tenantId) throws Exception {
        List<GanaderiaSanidadService.AlertaSanitaria> alertas = ganaderiaSanidadService.obtenerAlertasSanitarias(tenantId);

        List<List<Object>> filas = new ArrayList<>();
        for (GanaderiaSanidadService.AlertaSanitaria a : alertas) {
            filas.add(List.of(a.tipo, a.animal.getArete(), a.producto, a.fechaRelevante.toString(), a.mensaje));
        }

        byte[] excel = excelExportService.generar("Alertas Sanitarias",
            List.of("Tipo", "Arete", "Producto", "Fecha", "Mensaje"), filas);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"alertas-sanitarias.xlsx\"")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(excel);
    }
}
