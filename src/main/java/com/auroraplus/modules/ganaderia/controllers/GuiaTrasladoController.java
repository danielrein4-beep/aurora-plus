package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.DetalleGuiaTraslado;
import com.auroraplus.modules.ganaderia.entities.GuiaTraslado;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.GuiaTrasladoRepository;
import com.auroraplus.modules.ganaderia.services.GuiaTrasladoPdfService;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
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
        /** Número de la guía oficial del INSAI (opcional). */
        public String numeroGuiaOficial;
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
        return guiaTrasladoRepository.findByTenantIdOrderByFechaDesc(GanaderiaTenantAccess.requireTenant());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<GuiaTraslado> crear(@RequestBody GuiaRequest request) {
        AuthContext.exigirRol("DUENO_ADMIN", "ADMINISTRADOR_FINCA", "ENCARGADO_FINCA");
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        if (request.animalIds == null || request.animalIds.isEmpty()) {
            throw new RuntimeException("La guía debe incluir al menos un animal");
        }
        if (request.destino == null || request.destino.isBlank()) {
            throw new RuntimeException("Indique el destino del traslado");
        }

        GuiaTraslado guia = new GuiaTraslado();
        guia.setTenantId(tenantId);
        LocalDate dia = request.fecha != null ? request.fecha : LocalDate.now();
        // Número interno de la nota: NM-aaaammdd-n, consecutivo del día en la finca.
        String prefijo = "NM-" + dia.format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE) + "-";
        long delDia = guiaTrasladoRepository.findByTenantIdOrderByFechaDesc(tenantId).stream()
            .filter(g -> g.getNumeroGuia() != null && g.getNumeroGuia().startsWith(prefijo)).count();
        guia.setNumeroGuia(prefijo + (delDia + 1));
        guia.setNumeroGuiaOficial(request.numeroGuiaOficial != null && !request.numeroGuiaOficial.isBlank() ? request.numeroGuiaOficial.trim() : null);
        guia.setFecha(dia);
        guia.setOrigen(request.origen);
        guia.setDestino(request.destino);
        guia.setMotivo(request.motivo);
        guia.setTransportista(request.transportista);
        guia.setPlacaVehiculo(request.placaVehiculo);
        guia.setResponsable(request.responsable);

        // Viajan animales del hato o recién vendidos (la nota acompaña la venta); nunca uno muerto o robado.
        for (Long animalId : new java.util.LinkedHashSet<>(request.animalIds)) {
            Animal animal = animalRepository.findForUpdateByIdAndTenantId(animalId, tenantId)
                .orElseThrow(() -> new RuntimeException("Animal no encontrado: " + animalId));
            if ("MUERTO".equals(animal.getEstado()) || "ROBADO".equals(animal.getEstado())) {
                throw new RuntimeException("El animal " + animal.getArete() + " está dado de baja y no puede movilizarse");
            }
            DetalleGuiaTraslado detalle = new DetalleGuiaTraslado();
            detalle.setTenantId(tenantId);
            detalle.setAnimal(animal);
            guia.addAnimal(detalle);
        }

        return ResponseEntity.ok(guiaTrasladoRepository.save(guia));
    }

    @GetMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> pdf(@PathVariable Long id) throws Exception {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        GuiaTraslado guia = guiaTrasladoRepository.findById(id)
            .filter(g -> tenantId.equals(g.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Guía no encontrada"));
        byte[] pdf = guiaTrasladoPdfService.generarGuiaPdf(guia);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"nota-movilizacion-" + guia.getId() + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }
}
