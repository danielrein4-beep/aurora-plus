package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.DetalleVentaAnimal;
import com.auroraplus.modules.ganaderia.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
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
    private MovimientoCajaRepository movimientoCajaRepository;

    @GetMapping("/costos/animal/{animalId}")
    public Map<String, Object> costoAnimal(@PathVariable Long animalId) {
        Animal animal = animalRepository.findById(animalId).orElseThrow(() -> new RuntimeException("Animal no encontrado"));

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
            for (var venta : ventaAnimalRepository.findAllByOrderByFechaDesc()) {
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
    public Map<String, Object> rentabilidad(@RequestParam Long tenantId, @RequestParam(required = false) LocalDateTime desde,
                                             @RequestParam(required = false) LocalDateTime hasta) {
        LocalDateTime d = desde != null ? desde : LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime h = hasta != null ? hasta : LocalDateTime.now();

        List<MovimientoCaja> movimientos = movimientoCajaRepository
            .findByTenantIdAndMonedaAndFechaRegistroBetweenOrderByFechaRegistroAsc(tenantId, "USD", d, h);

        BigDecimal ingresos = sumaPorTipo(movimientos, MovimientoCaja.TipoMovimiento.INGRESO);
        BigDecimal egresos = sumaPorTipo(movimientos, MovimientoCaja.TipoMovimiento.EGRESO);
        BigDecimal cxpPendiente = sumaPorTipo(movimientos, MovimientoCaja.TipoMovimiento.CXP);

        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("desde", d);
        resultado.put("hasta", h);
        resultado.put("totalIngresos", ingresos);
        resultado.put("totalEgresosOperativos", egresos);
        resultado.put("totalComprasACredito", cxpPendiente);
        resultado.put("gananciaOperativaNeta", ingresos.subtract(egresos).setScale(2, RoundingMode.HALF_UP));
        resultado.put("cantidadMovimientos", movimientos.size());
        return resultado;
    }

    private BigDecimal sumaPorTipo(List<MovimientoCaja> movimientos, MovimientoCaja.TipoMovimiento tipo) {
        return movimientos.stream()
            .filter(m -> m.getTipo() == tipo)
            .map(MovimientoCaja::getMonto)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
    }
}
