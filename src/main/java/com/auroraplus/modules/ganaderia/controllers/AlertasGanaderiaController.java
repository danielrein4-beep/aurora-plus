package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.AplicacionVacuna;
import com.auroraplus.modules.ganaderia.entities.EventoReproductivo;
import com.auroraplus.modules.ganaderia.repositories.AplicacionVacunaRepository;
import com.auroraplus.modules.ganaderia.repositories.EventoReproductivoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.Query;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Tablero de alertas: todo lo que requiere atención en los próximos días en
 * un solo lugar — refuerzos de vacuna pendientes, retiros sanitarios todavía
 * vigentes (animal no apto para venta/consumo), y partos próximos. Sin esto,
 * cada alerta viviría enterrada en su propio endpoint y nadie las vería a tiempo.
 */
@RestController
@RequestMapping("/api/ganaderia/alertas")
public class AlertasGanaderiaController {

    @Autowired
    private AplicacionVacunaRepository aplicacionVacunaRepository;

    @Autowired
    private EventoReproductivoRepository eventoReproductivoRepository;

    @GetMapping
    public Map<String, Object> alertas(@RequestParam Long tenantId, @RequestParam(defaultValue = "15") int diasAdelante) {
        LocalDate hoy = LocalDate.now();
        LocalDate limite = hoy.plusDays(diasAdelante);

        List<AplicacionVacuna> refuerzosPendientes = aplicacionVacunaRepository.findRefuerzosPendientes(tenantId, hoy, limite);

        List<AplicacionVacuna> retirosVigentes = aplicacionVacunaRepository.findRefuerzosPendientes(tenantId, LocalDate.of(2000, 1, 1), limite)
            .stream()
            .filter(a -> a.getFechaFinRetiroLeche().isAfter(hoy) || a.getFechaFinRetiroCarne().isAfter(hoy))
            .collect(Collectors.toList());

        // Partos próximos: se recorre el historial reproductivo de todas las hembras con
        // fechaProbableParto en rango — no hay una query dedicada por tenant, se filtra en memoria
        // porque el volumen de eventos reproductivos por hato es bajo (no amerita índice extra).
        List<EventoReproductivo> todosLosEventos = eventoReproductivoRepository.findAll();
        List<EventoReproductivo> partosProximos = todosLosEventos.stream()
            .filter(e -> e.getTenantId().equals(tenantId))
            .filter(e -> e.getFechaProbableParto() != null)
            .filter(e -> !e.getFechaProbableParto().isBefore(hoy) && !e.getFechaProbableParto().isAfter(limite))
            .collect(Collectors.toList());

        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("fechaConsulta", hoy);
        resultado.put("diasAdelante", diasAdelante);
        resultado.put("refuerzosVacunaPendientes", refuerzosPendientes);
        resultado.put("retirosSanitariosVigentes", retirosVigentes);
        resultado.put("partosProximos", partosProximos);
        resultado.put("totalAlertas", refuerzosPendientes.size() + retirosVigentes.size() + partosProximos.size());
        return resultado;
    }
}
