package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.DespachoComercial;
import com.auroraplus.modules.tamanacocomercial.entities.Gasto;
import com.auroraplus.modules.tamanacocomercial.repositories.DespachoComercialRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.GastoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tamanaco-comercial/finanzas")
public class FinanzasController {

    @Autowired
    private DespachoComercialRepository despachoComercialRepository;

    @Autowired
    private GastoRepository gastoRepository;

    @GetMapping("/reporte")
    public Map<String, Object> generarReporte(@RequestParam String fechaInicio, @RequestParam String fechaFin) {
        LocalDate inicio = LocalDate.parse(fechaInicio);
        LocalDate fin = LocalDate.parse(fechaFin);

        List<DespachoComercial> despachos = despachoComercialRepository.findByFechaDespachoBetween(
            inicio.atStartOfDay(), fin.atTime(23, 59, 59));

        BigDecimal totalToneladas = despachos.stream()
                .map(d -> d.getPeso() != null ? d.getPeso() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Gasto> gastos = gastoRepository.findByFechaBetween(inicio, fin);

        Map<String, BigDecimal> gastosPorMoneda = new HashMap<>();
        gastosPorMoneda.put("USD", BigDecimal.ZERO);
        gastosPorMoneda.put("COP", BigDecimal.ZERO);
        gastosPorMoneda.put("VES", BigDecimal.ZERO);

        for (Gasto g : gastos) {
            if (g.getMonto() != null && g.getMoneda() != null) {
                String mon = g.getMoneda().toUpperCase();
                gastosPorMoneda.merge(mon, g.getMonto(), BigDecimal::add);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("totalToneladas", totalToneladas);
        response.put("gastosPorMoneda", gastosPorMoneda);
        response.put("cantidadDespachos", despachos.size());

        return response;
    }
}
