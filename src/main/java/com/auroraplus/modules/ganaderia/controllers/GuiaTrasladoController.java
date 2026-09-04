package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.DetalleGuiaTraslado;
import com.auroraplus.modules.ganaderia.entities.GuiaTraslado;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.GuiaTrasladoRepository;
import com.auroraplus.modules.ganaderia.services.GuiaTrasladoPdfService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** Guía de movilización de ganado — documento legal exigido para transportar animales fuera de la finca. */
@RestController
@RequestMapping("/api/ganaderia/guias-traslado")
public class GuiaTrasladoController {

    @Autowired
    private GuiaTrasladoRepository guiaTrasladoRepository;

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private GuiaTrasladoPdfService guiaTrasladoPdfService;

    public static class GuiaRequest {
        public String numeroGuia;
        public LocalDate fecha;
        public String origen;
        public String destino;
        public String motivo;
        public String transportista;
        public String placaVehiculo;
        public String responsable;
        public List<Long> animalIds;
    }

    @GetMapping
    public List<GuiaTraslado> listar() {
        return guiaTrasladoRepository.findAllByOrderByFechaDesc();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<GuiaTraslado> crear(@RequestParam Long tenantId, @RequestBody GuiaRequest request) {
        if (request.animalIds == null || request.animalIds.isEmpty()) {
            throw new RuntimeException("La guía debe incluir al menos un animal");
        }

        GuiaTraslado guia = new GuiaTraslado();
        guia.setTenantId(tenantId);
        guia.setNumeroGuia(request.numeroGuia);
        guia.setFecha(request.fecha != null ? request.fecha : LocalDate.now());
        guia.setOrigen(request.origen);
        guia.setDestino(request.destino);
        guia.setMotivo(request.motivo);
        guia.setTransportista(request.transportista);
        guia.setPlacaVehiculo(request.placaVehiculo);
        guia.setResponsable(request.responsable);

        for (Long animalId : request.animalIds) {
            Animal animal = animalRepository.findById(animalId)
                .orElseThrow(() -> new RuntimeException("Animal no encontrado: " + animalId));
            if (!animal.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
            }
            DetalleGuiaTraslado detalle = new DetalleGuiaTraslado();
            detalle.setTenantId(tenantId);
            detalle.setAnimal(animal);
            guia.addAnimal(detalle);
        }

        return ResponseEntity.ok(guiaTrasladoRepository.save(guia));
    }

    @GetMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> pdf(@PathVariable Long id) throws Exception {
        GuiaTraslado guia = guiaTrasladoRepository.findById(id).orElseThrow(() -> new RuntimeException("Guía no encontrada"));
        byte[] pdf = guiaTrasladoPdfService.generarGuiaPdf(guia);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"guia-" + guia.getNumeroGuia() + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }
}
