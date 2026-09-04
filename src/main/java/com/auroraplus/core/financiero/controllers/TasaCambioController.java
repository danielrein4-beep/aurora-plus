package com.auroraplus.core.financiero.controllers;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.financiero.entities.TasaCambio;
import com.auroraplus.core.financiero.repositories.TasaCambioRepository;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Gestión de tasas de cambio y moneda base por tenant (Fase 1.2): sin esto no
 * había forma de registrar ni consultar tasas vía API — solo existía la
 * entidad y el motor de conversión, sin controller.
 */
@RestController
@RequestMapping("/api/financiero/tasas")
public class TasaCambioController {

    @Autowired
    private TasaCambioRepository tasaCambioRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    public static class ActualizarTasaRequest {
        public String monedaOrigen;
        public String monedaDestino;
        public BigDecimal tasa;
        public String origen; // MANUAL, BCV, TRM... por defecto MANUAL
    }

    /** Registra una tasa nueva (queda historial — nunca se sobreescribe la anterior). */
    @PostMapping
    public ResponseEntity<TasaCambio> actualizar(@RequestParam Long tenantId, @RequestBody ActualizarTasaRequest request) {
        if (request.tasa == null || request.tasa.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La tasa debe ser mayor a cero");
        }
        return ResponseEntity.ok(motorFinancieroService.actualizarTasa(
            tenantId, request.monedaOrigen, request.monedaDestino, request.tasa, request.origen));
    }

    /** Tasa vigente (la más reciente) entre dos monedas para este tenant. */
    @GetMapping("/vigente")
    public TasaCambio vigente(@RequestParam Long tenantId, @RequestParam String monedaOrigen, @RequestParam String monedaDestino) {
        return tasaCambioRepository.findTopByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(
                tenantId, monedaOrigen, monedaDestino)
            .orElseThrow(() -> new RuntimeException("No hay tasa registrada entre " + monedaOrigen + " y " + monedaDestino));
    }

    /** Historial completo de fluctuación entre dos monedas. */
    @GetMapping("/historial")
    public List<TasaCambio> historial(@RequestParam Long tenantId, @RequestParam String monedaOrigen, @RequestParam String monedaDestino) {
        return tasaCambioRepository.findByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(
            tenantId, monedaOrigen, monedaDestino);
    }

    public static class ConvertirRequest {
        public BigDecimal monto;
        public String monedaOrigen;
        public String monedaDestino; // opcional: si se omite, convierte a la moneda base del tenant
    }

    /** Convierte un monto entre dos monedas (o a la moneda base del tenant si no se indica destino) usando la tasa vigente. */
    @PostMapping("/convertir")
    public ResponseEntity<BigDecimal> convertir(@RequestParam Long tenantId, @RequestBody ConvertirRequest request) {
        if (request.monedaDestino == null || request.monedaDestino.isBlank()) {
            return ResponseEntity.ok(motorFinancieroService.convertirAMonedaBase(tenantId, request.monto, request.monedaOrigen));
        }
        return ResponseEntity.ok(motorFinancieroService.convertirMoneda(tenantId, request.monto, request.monedaOrigen, request.monedaDestino));
    }

    /** Moneda base configurada para el tenant — la que usan por defecto sus reportes y su caja. */
    @GetMapping("/moneda-base")
    public String monedaBase(@RequestParam Long tenantId) {
        return licenciaTenantRepository.findByTenantId(tenantId)
            .map(LicenciaTenant::getMonedaBase)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
    }
}
