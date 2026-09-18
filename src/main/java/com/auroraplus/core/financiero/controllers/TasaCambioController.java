package com.auroraplus.core.financiero.controllers;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.financiero.entities.TasaCambio;
import com.auroraplus.core.financiero.repositories.TasaCambioRepository;
import com.auroraplus.core.financiero.services.ActualizacionTasasAutomaticasJob;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

    @Autowired
    private ActualizacionTasasAutomaticasJob actualizacionTasasAutomaticasJob;

    private static final Set<String> METODOS_VALIDOS = Set.of("BINANCE", "BCV", "MANUAL");

    /** Qué fuente sigue automáticamente la tasa USD->VES de este tenant: BINANCE, BCV o MANUAL ("Propia"). */
    @GetMapping("/metodo-automatico")
    public Map<String, String> obtenerMetodoAutomatico(@RequestParam Long tenantId) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
        return Map.of("metodo", licencia.getMetodoTasaAutomatica());
    }

    public static class MetodoAutomaticoRequest {
        public String metodo; // BINANCE, BCV o MANUAL
    }

    @PutMapping("/metodo-automatico")
    public Map<String, String> actualizarMetodoAutomatico(@RequestParam Long tenantId, @RequestBody MetodoAutomaticoRequest request) {
        if (request.metodo == null || !METODOS_VALIDOS.contains(request.metodo)) {
            throw new RuntimeException("Método inválido — debe ser BINANCE, BCV o MANUAL");
        }
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
        licencia.setMetodoTasaAutomatica(request.metodo);
        licenciaTenantRepository.save(licencia);
        // Al elegir BINANCE o BCV, se busca la tasa de una vez en vez de esperar hasta la
        // próxima corrida programada (cada 4h) — el negocio ve el cambio reflejado al instante.
        if (!"MANUAL".equals(request.metodo)) {
            actualizacionTasasAutomaticasJob.actualizarAhoraParaTenant(tenantId, request.metodo);
        }
        return Map.of("metodo", request.metodo);
    }

    /** Fuerza ya la búsqueda de la tasa automática vigente de este tenant (botón "Actualizar ahora"), sin esperar la corrida programada. */
    @PostMapping("/metodo-automatico/actualizar-ahora")
    public ResponseEntity<TasaCambio> actualizarAhora(@RequestParam Long tenantId) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
        if ("MANUAL".equals(licencia.getMetodoTasaAutomatica())) {
            throw new RuntimeException("Este negocio tiene la tasa en modo Propia (manual) — no hay fuente automática que actualizar");
        }
        BigDecimal tasa = actualizacionTasasAutomaticasJob.actualizarAhoraParaTenant(tenantId, licencia.getMetodoTasaAutomatica())
            .orElseThrow(() -> new RuntimeException("No se pudo obtener la tasa de " + licencia.getMetodoTasaAutomatica() + " en este momento — intente de nuevo en unos minutos"));
        return vigenteTrasActualizar(tenantId, tasa);
    }

    private ResponseEntity<TasaCambio> vigenteTrasActualizar(Long tenantId, BigDecimal tasaEsperada) {
        return ResponseEntity.ok(tasaCambioRepository.findTopByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(
                tenantId, "USD", "VES")
            .orElseThrow(() -> new RuntimeException("La tasa se actualizó (" + tasaEsperada + ") pero no se pudo releer")));
    }

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
