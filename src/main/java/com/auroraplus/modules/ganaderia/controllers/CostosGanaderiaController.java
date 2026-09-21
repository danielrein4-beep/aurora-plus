package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.DetalleVentaAnimal;
import com.auroraplus.modules.ganaderia.repositories.*;
import com.auroraplus.modules.ganaderia.services.GanaderiaFinanzasService;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Costeo por animal y rentabilidad del hato. El costo por animal es directo
 * (adquisición + sanidad con costo registrado) — los gastos operativos
 * (mano de obra, insumos) se muestran a nivel de hato porque prorratearlos
 * por animal exigiría una regla de asignación que el negocio debe definir,
 * no algo para inventar aquí sin pedirlo.
 */
@RestController
@RequestMapping("/api/ganaderia")
public class CostosGanaderiaController {

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private AplicacionVacunaRepository aplicacionVacunaRepository;

    @Autowired
    private AplicacionMedicamentoRepository aplicacionMedicamentoRepository;

    @Autowired
    private VentaAnimalRepository ventaAnimalRepository;

    @Autowired
    private GanaderiaFinanzasService ganaderiaFinanzasService;

    @GetMapping("/costos/animal/{animalId}")
    public Map<String, Object> costoAnimal(@PathVariable Long animalId) {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        Animal animal = animalRepository.findById(animalId)
            .filter(a -> tenantId.equals(a.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));

        BigDecimal costoAdquisicion = animal.getCostoAdquisicion() != null ? animal.getCostoAdquisicion() : BigDecimal.ZERO;

        BigDecimal costoVacunas = aplicacionVacunaRepository.findByAnimalIdOrderByFechaAplicacionDesc(animalId).stream()
            .map(a -> a.getCosto() != null ? a.getCosto() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal costoMedicamentos = aplicacionMedicamentoRepository.findByAnimalIdOrderByFechaAplicacionDesc(animalId).stream()
            .map(a -> a.getCosto() != null ? a.getCosto() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal costoSanidad = costoVacunas.add(costoMedicamentos);
        BigDecimal costoTotal = costoAdquisicion.add(costoSanidad);

        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("animal", animal);
        resultado.put("costoAdquisicion", costoAdquisicion);
        resultado.put("costoVacunas", costoVacunas);
        resultado.put("costoMedicamentos", costoMedicamentos);
        resultado.put("costoSanidadTotal", costoSanidad);
        resultado.put("costoTotalDirecto", costoTotal);
        resultado.put("nota", "No incluye prorrateo de mano de obra ni alimentación — esos son gastos de hato, no asignados por animal.");

        if ("VENDIDO".equals(animal.getEstado())) {
            for (var venta : ventaAnimalRepository.findByTenantIdOrderByFechaDesc(tenantId)) {
                for (DetalleVentaAnimal item : venta.getItems()) {
                    if (item.getAnimal().getId().equals(animalId)) {
                        BigDecimal precioVenta = item.getPrecioVenta();
                        BigDecimal utilidad = precioVenta.subtract(costoTotal);
                        resultado.put("precioVenta", precioVenta);
                        resultado.put("utilidadDirecta", utilidad.setScale(2, RoundingMode.HALF_UP));
                        return resultado;
                    }
                }
            }
        }

        return resultado;
    }

    @GetMapping("/reportes/rentabilidad")
    public GanaderiaFinanzasService.ResumenFinanciero rentabilidad(
            @RequestParam(required = false) java.time.LocalDate desde,
            @RequestParam(required = false) java.time.LocalDate hasta) {
        java.time.LocalDate hastaFinal = hasta != null ? hasta : java.time.LocalDate.now();
        java.time.LocalDate desdeFinal = desde != null ? desde : hastaFinal.minusDays(30);
        if (desdeFinal.isAfter(hastaFinal)) {
            throw new IllegalArgumentException("La fecha inicial no puede ser posterior a la fecha final");
        }
        return ganaderiaFinanzasService.resumenPeriodo(
            GanaderiaTenantAccess.requireTenant(), desdeFinal, hastaFinal);
    }
}
