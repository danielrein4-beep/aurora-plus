package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.AplicacionMedicamento;
import com.auroraplus.modules.ganaderia.entities.AplicacionVacuna;
import com.auroraplus.modules.ganaderia.entities.DetalleVentaAnimal;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.AplicacionMedicamentoRepository;
import com.auroraplus.modules.ganaderia.repositories.AplicacionVacunaRepository;
import com.auroraplus.modules.ganaderia.repositories.DetalleVentaAnimalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Rentabilidad DIRECTA de un animal: lo que costó comprarlo/valorizarlo más
 * la sanidad que se le aplicó a ÉL específicamente, contra lo que se vendió.
 * Deliberadamente NO incluye gastos operativos generales (mano de obra,
 * alimentación, mantenimiento de potreros) porque esos no se registran por
 * animal individual — se ven en el resumen financiero del hato completo
 * (ver GanaderiaFinanzasController). Mezclar ambos daría una cifra falsa de
 * precisión que el sistema no puede respaldar con datos reales.
 */
@Service
public class RentabilidadAnimalService {

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private AplicacionVacunaRepository aplicacionVacunaRepository;

    @Autowired
    private AplicacionMedicamentoRepository aplicacionMedicamentoRepository;

    @Autowired
    private DetalleVentaAnimalRepository detalleVentaAnimalRepository;

    public static class RentabilidadAnimal {
        public Animal animal;
        public BigDecimal costoAdquisicion;
        public BigDecimal costoVacunas;
        public BigDecimal costoMedicamentos;
        public BigDecimal costoTotalDirecto;
        public BigDecimal ingresoVenta; // null si todavía no se ha vendido
        public BigDecimal utilidadDirecta; // null si todavía no se ha vendido
        public String nota;
    }

    public RentabilidadAnimal calcular(Long tenantId, Long animalId) {
        Animal animal = animalRepository.findById(animalId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!animal.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
        }

        BigDecimal costoAdquisicion = animal.getCostoAdquisicion() != null ? animal.getCostoAdquisicion() : BigDecimal.ZERO;

        BigDecimal costoVacunas = aplicacionVacunaRepository.findByAnimalIdOrderByFechaAplicacionDesc(animalId).stream()
            .map(AplicacionVacuna::getCosto).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal costoMedicamentos = aplicacionMedicamentoRepository.findByAnimalIdOrderByFechaAplicacionDesc(animalId).stream()
            .map(AplicacionMedicamento::getCosto).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);

        RentabilidadAnimal r = new RentabilidadAnimal();
        r.animal = animal;
        r.costoAdquisicion = costoAdquisicion;
        r.costoVacunas = costoVacunas;
        r.costoMedicamentos = costoMedicamentos;
        r.costoTotalDirecto = costoAdquisicion.add(costoVacunas).add(costoMedicamentos);

        Optional<DetalleVentaAnimal> venta = detalleVentaAnimalRepository.findByAnimalId(animalId);
        if (venta.isPresent()) {
            r.ingresoVenta = venta.get().getPrecioVenta();
            r.utilidadDirecta = r.ingresoVenta.subtract(r.costoTotalDirecto);
        }

        r.nota = "Utilidad DIRECTA: costo de adquisición + sanidad aplicada a este animal específico, contra su venta. "
            + "NO incluye gastos operativos generales (mano de obra, alimentación, mantenimiento) — esos se ven en el "
            + "resumen financiero del hato completo, porque no se registran por animal individual.";
        return r;
    }

    /** Rentabilidad de todos los animales VENDIDOS del tenant — base del reporte y su exportación a Excel. */
    public List<RentabilidadAnimal> calcularParaVendidos(Long tenantId) {
        return animalRepository.findByEstado("VENDIDO").stream()
            .filter(a -> a.getTenantId().equals(tenantId))
            .map(a -> calcular(tenantId, a.getId()))
            .toList();
    }
}
