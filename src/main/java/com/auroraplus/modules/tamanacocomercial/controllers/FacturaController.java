package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.Factura;
import com.auroraplus.modules.tamanacocomercial.entities.Retencion;
import com.auroraplus.modules.tamanacocomercial.repositories.FacturaRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.RetencionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/tamanaco-comercial/facturas")
public class FacturaController {

    @Autowired
    private FacturaRepository facturaRepository;

    @Autowired
    private RetencionRepository retencionRepository;

    @GetMapping
    public List<Factura> listarFacturas() {
        return facturaRepository.findAllByOrderByFechaEmisionDesc();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> crearFactura(@RequestParam Long tenantId, @RequestBody Factura factura) {

        Factura ultimaFactura = facturaRepository.findTopByOrderByNumeroControlDesc();
        int siguienteNumero = 1;
        if (ultimaFactura != null && ultimaFactura.getNumeroControl() != null) {
            try {
                String[] partes = ultimaFactura.getNumeroControl().split("-");
                if (partes.length == 2) {
                    siguienteNumero = Integer.parseInt(partes[1]) + 1;
                }
            } catch (Exception e) {
                // usa el default
            }
        }
        factura.setTenantId(tenantId);
        factura.setNumeroControl(String.format("00-%06d", siguienteNumero));

        BigDecimal subtotal = factura.getSubtotal() != null ? factura.getSubtotal() : BigDecimal.ZERO;
        BigDecimal porcIva = factura.getPorcentajeIva() != null ? factura.getPorcentajeIva() : BigDecimal.ZERO;
        BigDecimal porcIgtf = (Boolean.TRUE.equals(factura.getAplicaIgtf()))
            ? (factura.getPorcentajeIgtf() != null ? factura.getPorcentajeIgtf() : new BigDecimal("3.0"))
            : BigDecimal.ZERO;

        BigDecimal montoIva = subtotal.multiply(porcIva).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal montoIgtf = subtotal.multiply(porcIgtf).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(montoIva).add(montoIgtf);

        factura.setMontoIva(montoIva);
        factura.setMontoIgtf(montoIgtf);
        factura.setTotal(total);
        factura.setEstado("EMITIDA");

        try {
            Factura guardada = facturaRepository.save(factura);
            return ResponseEntity.status(HttpStatus.CREATED).body(guardada);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Error guardando factura: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Factura> obtenerPorId(@PathVariable Long id) {
        return facturaRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/retencion")
    public ResponseEntity<?> aplicarRetencion(@PathVariable Long id, @RequestParam Long tenantId, @RequestBody Retencion retencion) {
        Optional<Factura> facturaOpt = facturaRepository.findById(id);
        if (facturaOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Factura factura = facturaOpt.get();
        retencion.setTenantId(tenantId);
        retencion.setFactura(factura);
        retencion.setFechaAplicacion(LocalDate.now());

        if ("IVA".equalsIgnoreCase(retencion.getTipo()) && retencion.getPorcentaje() != null) {
            retencion.setMonto(factura.getMontoIva().multiply(retencion.getPorcentaje()).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP));
        }

        retencionRepository.save(retencion);

        factura.setEstado("PAGADA");
        facturaRepository.save(factura);

        return ResponseEntity.ok(Map.of("mensaje", "Retención aplicada con éxito", "factura", factura));
    }
}
