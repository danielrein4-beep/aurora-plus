package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.config.entities.ComisionPlataforma;
import com.auroraplus.core.config.repositories.ComisionPlataformaRepository;
import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.OfertaCompra;
import com.auroraplus.modules.ganaderia.entities.PublicacionVenta;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.OfertaCompraRepository;
import com.auroraplus.modules.ganaderia.repositories.PublicacionVentaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Registro interno de negociación de venta de animales (no un portal público
 * — decisión explícita del usuario). Al aceptar una oferta, Aurora+ cobra una
 * comisión de intermediación (1%-2%, definida por el usuario) registrada como
 * cuenta por cobrar de la plataforma, no como movimiento de caja del tenant.
 */
@RestController
@RequestMapping("/api/ganaderia")
public class PublicacionVentaController {

    // Rango acordado con el usuario: pequeña y razonable, entre 1% y 2%.
    private static final BigDecimal COMISION_MINIMA = new BigDecimal("1.0");
    private static final BigDecimal COMISION_MAXIMA = new BigDecimal("2.0");
    private static final BigDecimal COMISION_DEFAULT = new BigDecimal("1.5");

    @Autowired
    private PublicacionVentaRepository publicacionVentaRepository;

    @Autowired
    private OfertaCompraRepository ofertaCompraRepository;

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private ComisionPlataformaRepository comisionPlataformaRepository;

    public static class PublicacionRequest {
        public Long animalId;
        public BigDecimal precioSolicitado;
        public String descripcion;
    }

    @GetMapping("/publicaciones")
    public List<PublicacionVenta> listarPublicaciones(@RequestParam(required = false, defaultValue = "ACTIVA") String estado) {
        return publicacionVentaRepository.findByEstado(estado);
    }

    @PostMapping("/publicaciones")
    public ResponseEntity<PublicacionVenta> publicar(@RequestParam Long tenantId, @RequestBody PublicacionRequest request) {
        Animal animal = animalRepository.findById(request.animalId).orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!animal.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
        }
        if (!"ACTIVO".equals(animal.getEstado())) {
            throw new RuntimeException("Solo se pueden publicar animales activos");
        }

        PublicacionVenta publicacion = new PublicacionVenta();
        publicacion.setTenantId(tenantId);
        publicacion.setAnimal(animal);
        publicacion.setPrecioSolicitado(request.precioSolicitado);
        publicacion.setDescripcion(request.descripcion);

        return ResponseEntity.ok(publicacionVentaRepository.save(publicacion));
    }

    public static class OfertaRequest {
        public Long publicacionId;
        public String nombreComprador;
        public String telefonoComprador;
        public BigDecimal montoOfertado;
    }

    @PostMapping("/ofertas")
    public ResponseEntity<OfertaCompra> registrarOferta(@RequestParam Long tenantId, @RequestBody OfertaRequest request) {
        PublicacionVenta publicacion = publicacionVentaRepository.findById(request.publicacionId)
            .orElseThrow(() -> new RuntimeException("Publicación no encontrada"));
        if (!publicacion.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Publicación no pertenece a este tenant");
        }
        if (!"ACTIVA".equals(publicacion.getEstado())) {
            throw new RuntimeException("Esta publicación ya no está activa");
        }

        OfertaCompra oferta = new OfertaCompra();
        oferta.setTenantId(tenantId);
        oferta.setPublicacion(publicacion);
        oferta.setNombreComprador(request.nombreComprador);
        oferta.setTelefonoComprador(request.telefonoComprador);
        oferta.setMontoOfertado(request.montoOfertado);

        return ResponseEntity.ok(ofertaCompraRepository.save(oferta));
    }

    @GetMapping("/publicaciones/{publicacionId}/ofertas")
    public List<OfertaCompra> listarOfertas(@PathVariable Long publicacionId) {
        return ofertaCompraRepository.findByPublicacionIdOrderByMontoOfertadoDesc(publicacionId);
    }

    /** Acepta una oferta: cierra la publicación y genera la comisión de intermediación de Aurora+. */
    @PostMapping("/ofertas/{ofertaId}/aceptar")
    @Transactional
    public ResponseEntity<OfertaCompra> aceptarOferta(@PathVariable Long ofertaId, @RequestParam Long tenantId,
                                                        @RequestParam(required = false) BigDecimal porcentajeComision) {
        OfertaCompra oferta = ofertaCompraRepository.findById(ofertaId).orElseThrow(() -> new RuntimeException("Oferta no encontrada"));
        if (!oferta.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Oferta no pertenece a este tenant");
        }
        if (!"PENDIENTE".equals(oferta.getEstado())) {
            throw new RuntimeException("Esta oferta ya fue procesada (estado actual: " + oferta.getEstado() + ")");
        }

        BigDecimal porcentaje = porcentajeComision != null ? porcentajeComision : COMISION_DEFAULT;
        if (porcentaje.compareTo(COMISION_MINIMA) < 0 || porcentaje.compareTo(COMISION_MAXIMA) > 0) {
            throw new RuntimeException("El porcentaje de comisión debe estar entre " + COMISION_MINIMA + "% y " + COMISION_MAXIMA + "%");
        }

        oferta.setEstado("ACEPTADA");
        ofertaCompraRepository.save(oferta);

        PublicacionVenta publicacion = oferta.getPublicacion();
        publicacion.setEstado("VENDIDA");
        publicacionVentaRepository.save(publicacion);

        BigDecimal montoComision = oferta.getMontoOfertado()
            .multiply(porcentaje)
            .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);

        ComisionPlataforma comision = new ComisionPlataforma();
        comision.setTenantId(tenantId);
        comision.setOrigen("ganaderia-oferta-compra");
        comision.setReferenciaId(oferta.getId());
        comision.setMontoBase(oferta.getMontoOfertado());
        comision.setPorcentaje(porcentaje);
        comision.setMontoComision(montoComision);
        comision.setPagada(false);
        comision.setFecha(LocalDateTime.now());
        comisionPlataformaRepository.save(comision);

        return ResponseEntity.ok(oferta);
    }

    @PostMapping("/ofertas/{ofertaId}/rechazar")
    public ResponseEntity<OfertaCompra> rechazarOferta(@PathVariable Long ofertaId, @RequestParam Long tenantId) {
        OfertaCompra oferta = ofertaCompraRepository.findById(ofertaId).orElseThrow(() -> new RuntimeException("Oferta no encontrada"));
        if (!oferta.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Oferta no pertenece a este tenant");
        }
        oferta.setEstado("RECHAZADA");
        return ResponseEntity.ok(ofertaCompraRepository.save(oferta));
    }
}
