package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.ganaderia.entities.*;
import com.auroraplus.modules.ganaderia.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Compra de animales a un proveedor: a diferencia de repuestos/moda, cada
 * ítem CREA un Animal nuevo (no sube un contador de stock) porque cada cabeza
 * de ganado es una entidad individual con su propia identidad y trazabilidad.
 */
@Service
public class GanaderiaCompraService {

    @Autowired
    private CompraAnimalRepository compraAnimalRepository;

    @Autowired
    private ProveedorGanaderiaRepository proveedorGanaderiaRepository;

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private PotreroRepository potreroRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    public static class ItemCompraAnimal {
        public String arete;
        public String nombre;
        public String especie;
        public String raza;
        public String sexo;
        public String tipoAnimal;
        public LocalDate fechaNacimiento;
        public BigDecimal pesoInicial;
        public Long potreroId;
        public BigDecimal costo;
    }

    @Transactional
    public CompraAnimal registrarCompra(Long tenantId, Long proveedorId, String numeroFactura, List<ItemCompraAnimal> items) {
        if (items == null || items.isEmpty()) {
            throw new RuntimeException("La compra debe tener al menos un animal");
        }

        ProveedorGanaderia proveedor = proveedorGanaderiaRepository.findById(proveedorId)
            .orElseThrow(() -> new RuntimeException("Proveedor no encontrado"));
        if (!proveedor.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Proveedor no pertenece a este tenant");
        }

        CompraAnimal compra = new CompraAnimal();
        compra.setTenantId(tenantId);
        compra.setProveedor(proveedor);
        compra.setNumeroFactura(numeroFactura);
        compra.setFechaCompra(LocalDateTime.now());

        BigDecimal totalCompra = BigDecimal.ZERO;

        for (ItemCompraAnimal item : items) {
            if (item.arete == null || item.arete.isBlank()) {
                throw new RuntimeException("El arete es obligatorio para cada animal");
            }
            if (item.costo == null || item.costo.compareTo(BigDecimal.ZERO) < 0) {
                throw new RuntimeException("El costo no puede ser negativo");
            }
            if (animalRepository.findByArete(item.arete).isPresent()) {
                throw new RuntimeException("Ya existe un animal con el arete: " + item.arete);
            }

            Potrero potrero = null;
            if (item.potreroId != null) {
                potrero = potreroRepository.findById(item.potreroId)
                    .orElseThrow(() -> new RuntimeException("Potrero no encontrado: " + item.potreroId));
                if (!potrero.getTenantId().equals(tenantId)) {
                    throw new RuntimeException("Violación de seguridad: Potrero no pertenece a este tenant");
                }
            }

            Animal animal = new Animal();
            animal.setTenantId(tenantId);
            animal.setArete(item.arete);
            animal.setNombre(item.nombre);
            animal.setEspecie(item.especie != null ? item.especie : "BOVINO");
            animal.setRaza(item.raza);
            animal.setSexo(item.sexo);
            animal.setTipoAnimal(item.tipoAnimal);
            animal.setFechaNacimiento(item.fechaNacimiento);
            animal.setPesoActual(item.pesoInicial);
            animal.setPotrero(potrero);
            animal.setEstado("ACTIVO");
            animal.setCostoAdquisicion(item.costo);
            animalRepository.save(animal);

            totalCompra = totalCompra.add(item.costo);

            DetalleCompraAnimal detalle = new DetalleCompraAnimal();
            detalle.setTenantId(tenantId);
            detalle.setAnimal(animal);
            detalle.setCosto(item.costo);
            compra.addItem(detalle);
        }

        compra.setTotal(totalCompra);
        CompraAnimal guardada = compraAnimalRepository.save(compra);

        // Igual que en repuestos/moda: comprar genera una deuda (CXP), no un egreso inmediato.
        motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.CXP,
            totalCompra, null, null, "Compra de animales factura " + numeroFactura + " — Proveedor: " + proveedor.getNombre());

        return guardada;
    }
}
