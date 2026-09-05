package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.modules.ganaderia.entities.GastoGanaderia;
import com.auroraplus.modules.ganaderia.entities.VentaAnimal;
import com.auroraplus.modules.ganaderia.repositories.GastoGanaderiaRepository;
import com.auroraplus.modules.ganaderia.repositories.VentaAnimalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Control financiero del hato completo en un período: todos los gastos
 * operativos (mano de obra, alambre/materiales, veterinario, alimentación...)
 * contra todo lo que entró por venta de animales — la vista de "cómo va el
 * negocio", separada de la rentabilidad por animal individual (ver
 * RentabilidadAnimalService), que es más específica pero no cubre gastos
 * generales no atribuibles a un animal.
 */
@Service
public class GanaderiaFinanzasService {

    @Autowired
    private GastoGanaderiaRepository gastoGanaderiaRepository;

    @Autowired
    private VentaAnimalRepository ventaAnimalRepository;

    public static class ResumenFinanciero {
        public LocalDate desde;
        public LocalDate hasta;
        public BigDecimal totalGastos;
        public Map<String, BigDecimal> gastosPorCategoria;
        public BigDecimal totalIngresosVenta;
        public BigDecimal utilidadNeta;
        public List<GastoGanaderia> gastos;
        public List<VentaAnimal> ventas;
    }

    public ResumenFinanciero resumenPeriodo(Long tenantId, LocalDate desde, LocalDate hasta) {
        List<GastoGanaderia> gastos = gastoGanaderiaRepository.findByTenantIdAndFechaBetween(tenantId, desde, hasta);
        List<VentaAnimal> ventas = ventaAnimalRepository.findByTenantIdAndFechaBetween(
            tenantId, desde.atStartOfDay(), hasta.atTime(23, 59, 59));

        Map<String, BigDecimal> gastosPorCategoria = new LinkedHashMap<>();
        BigDecimal totalGastos = BigDecimal.ZERO;
        for (GastoGanaderia g : gastos) {
            totalGastos = totalGastos.add(g.getMonto());
            gastosPorCategoria.merge(g.getCategoria(), g.getMonto(), BigDecimal::add);
        }

        BigDecimal totalIngresos = ventas.stream()
            .map(VentaAnimal::getTotal)
            .filter(m -> m != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        ResumenFinanciero r = new ResumenFinanciero();
        r.desde = desde;
        r.hasta = hasta;
        r.totalGastos = totalGastos.setScale(2, RoundingMode.HALF_UP);
        r.gastosPorCategoria = gastosPorCategoria;
        r.totalIngresosVenta = totalIngresos.setScale(2, RoundingMode.HALF_UP);
        r.utilidadNeta = totalIngresos.subtract(totalGastos).setScale(2, RoundingMode.HALF_UP);
        r.gastos = gastos;
        r.ventas = ventas;
        return r;
    }
}
