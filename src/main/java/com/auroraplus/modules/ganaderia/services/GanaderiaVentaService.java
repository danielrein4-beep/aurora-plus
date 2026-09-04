package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.sync.IdempotenciaService;
import com.auroraplus.modules.ganaderia.entities.*;
import com.auroraplus.modules.ganaderia.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/** Venta de animales: marca cada animal como VENDIDO (sale del hato activo) y genera ingreso real en caja. */
@Service
public class GanaderiaVentaService {

    @Autowired
    private VentaAnimalRepository ventaAnimalRepository;

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Autowired
    private IdempotenciaService idempotenciaService;

    public static class ItemVentaAnimal {
        public Long animalId;
        public BigDecimal precioVenta;
    }

    @Transactional
    public VentaAnimal registrarVenta(Long tenantId, String numeroTicket, String comprador, List<ItemVentaAnimal> items) {
        return registrarVenta(tenantId, numeroTicket, comprador, items, null, null, null);
    }

    @Transactional
    public VentaAnimal registrarVenta(Long tenantId, String numeroTicket, String comprador, List<ItemVentaAnimal> items,
                                       String monedaPago, BigDecimal montoRecibido) {
        return registrarVenta(tenantId, numeroTicket, comprador, items, monedaPago, montoRecibido, null);
    }

    /** claveIdempotencia (opcional): evita duplicar la venta si el POS offline reintenta el envío (ver IdempotenciaService). */
    @Transactional
    public VentaAnimal registrarVenta(Long tenantId, String numeroTicket, String comprador, List<ItemVentaAnimal> items,
                                       String monedaPago, BigDecimal montoRecibido, String claveIdempotencia) {
        Optional<Long> existente = idempotenciaService.obtenerSiYaProcesada(tenantId, claveIdempotencia);
        if (existente.isPresent()) {
            return ventaAnimalRepository.findById(existente.get())
                .orElseThrow(() -> new RuntimeException("Operación idempotente inconsistente: venta " + existente.get() + " no encontrada"));
        }

        if (items == null || items.isEmpty()) {
            throw new RuntimeException("La venta debe tener al menos un animal");
        }

        VentaAnimal venta = new VentaAnimal();
        venta.setTenantId(tenantId);
        venta.setNumeroTicket(numeroTicket);
        venta.setComprador(comprador);
        venta.setFecha(LocalDateTime.now());

        BigDecimal totalVenta = BigDecimal.ZERO;

        for (ItemVentaAnimal item : items) {
            if (item.precioVenta == null || item.precioVenta.compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("El precio de venta debe ser mayor a cero");
            }

            Animal animal = animalRepository.findById(item.animalId)
                .orElseThrow(() -> new RuntimeException("Animal no encontrado: " + item.animalId));
            if (!animal.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
            }
            if (!"ACTIVO".equals(animal.getEstado())) {
                throw new RuntimeException("El animal " + animal.getArete() + " no está activo (estado actual: " + animal.getEstado() + ")");
            }

            animal.setEstado("VENDIDO");
            animal.setPotrero(null);
            animalRepository.save(animal);

            totalVenta = totalVenta.add(item.precioVenta);

            DetalleVentaAnimal detalle = new DetalleVentaAnimal();
            detalle.setTenantId(tenantId);
            detalle.setAnimal(animal);
            detalle.setPrecioVenta(item.precioVenta);
            venta.addItem(detalle);
        }

        venta.setTotal(totalVenta);
        VentaAnimal guardada = ventaAnimalRepository.save(venta);

        motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.INGRESO,
            totalVenta, monedaPago, montoRecibido,
            "Venta de animales ticket " + numeroTicket + (comprador != null ? " — Comprador: " + comprador : ""));

        idempotenciaService.registrar(tenantId, claveIdempotencia, "venta_ganaderia", guardada.getId());

        return guardada;
    }
}
