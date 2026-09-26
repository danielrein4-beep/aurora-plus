package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.AplicacionVacuna;
import com.auroraplus.modules.ganaderia.entities.EventoReproductivo;
import com.auroraplus.modules.ganaderia.repositories.AplicacionVacunaRepository;
import com.auroraplus.modules.ganaderia.repositories.EventoReproductivoRepository;
import com.auroraplus.modules.ganaderia.services.GanaderiaTenantAccess;
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
    public Map<String, Object> alertas(@RequestParam(defaultValue = "15") int diasAdelante) {
        Long tenantId = GanaderiaTenantAccess.requireTenant();
        if (diasAdelante < 1 || diasAdelante > 90) throw new IllegalArgumentException("El rango de alertas debe estar entre 1 y 90 días");
        LocalDate hoy = LocalDate.now();
        LocalDate limite = hoy.plusDays(diasAdelante);

        List<AplicacionVacuna> refuerzosPendientes = aplicacionVacunaRepository.findRefuerzosPendientes(tenantId, hoy, limite);

        // Retiros vigentes por vacuna, de leche o de carne. Antes se reutilizaba la consulta de
        // refuerzos: se escapaban las vacunas sin refuerzo programado y una fecha de retiro vacía
        // tumbaba toda la pantalla de alertas.
        Map<Long, AplicacionVacuna> retiros = new LinkedHashMap<>();
        aplicacionVacunaRepository.findConRetiroLecheActivo(tenantId, hoy).forEach(a -> retiros.put(a.getId(), a));
        aplicacionVacunaRepository.findConRetiroCarneActivo(tenantId, hoy).forEach(a -> retiros.putIfAbsent(a.getId(), a));
        List<AplicacionVacuna> retirosVigentes = new java.util.ArrayList<>(retiros.values());

        // Partos próximos: se recorre el historial reproductivo de todas las hembras con
        // fechaProbableParto en rango — no hay una query dedicada por tenant, se filtra en memoria
        // porque el volumen de eventos reproductivos por hato es bajo (no amerita índice extra).
        List<EventoReproductivo> partosProximos = eventoReproductivoRepository
            .findByTenantIdAndFechaProbablePartoBetween(tenantId, hoy, limite);

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
