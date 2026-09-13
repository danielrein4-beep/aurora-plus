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

    /**
     * Registra una tasa nueva (queda historial — nunca se sobreescribe la anterior).
     *
     * Si el par es USD/VES y el tenant eligió que esa tasa la gobierne el BCV
     * (LicenciaTenant.origenTasaUsdVes = "BCV"), se rechaza una carga MANUAL — si no, cualquier
     * cajero podría pisar en silencio la tasa oficial que el dueño decidió seguir, sin que nadie
     * note por qué el sistema empezó a usar un número distinto. Para volver a cargar manual hay
     * que cambiar la preferencia primero (PATCH /origen-usd-ves).
     */
    @PostMapping
    public ResponseEntity<TasaCambio> actualizar(@RequestParam Long tenantId, @RequestBody ActualizarTasaRequest request) {
        if (request.tasa == null || request.tasa.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La tasa debe ser mayor a cero");
        }
        boolean esUsdVes = "USD".equals(request.monedaOrigen) && "VES".equals(request.monedaDestino);
        if (esUsdVes) {
            String origenActual = licenciaTenantRepository.findByTenantId(tenantId)
                .map(LicenciaTenant::getOrigenTasaUsdVes).orElse("MANUAL");
            // Rechaza CUALQUIER carga por este endpoint mientras el tenant esté en modo BCV — sin
            // importar qué "origen" declare el llamador — porque el punto es que solo
            // TasaBcvAutomaticaJob (que llama al motor directo, no pasa por acá) escriba este par.
            if ("BCV".equals(origenActual)) {
                throw new RuntimeException("Este negocio eligió regirse por la tasa BCV automática — cambia la preferencia a manual en Configuración si quieres cargar una tasa a mano.");
            }
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

    /** Quién gobierna la tasa USD->VES de este negocio hoy: MANUAL o BCV (ver TasaBcvAutomaticaJob). */
    @GetMapping("/origen-usd-ves")
    public String origenUsdVes(@RequestParam Long tenantId) {
        return licenciaTenantRepository.findByTenantId(tenantId)
            .map(LicenciaTenant::getOrigenTasaUsdVes)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
    }

    public static class OrigenUsdVesRequest {
        public String origen; // MANUAL | BCV
    }

    /**
     * Cambia si la tasa USD->VES la teclea el negocio (MANUAL, el default de siempre) o si se
     * actualiza sola desde el BCV una vez al día (BCV). No dispara una actualización inmediata:
     * el cambio surte efecto en la próxima corrida de TasaBcvAutomaticaJob (8:30 am).
     */
    @PatchMapping("/origen-usd-ves")
    public ResponseEntity<LicenciaTenant> cambiarOrigenUsdVes(@RequestParam Long tenantId, @RequestBody OrigenUsdVesRequest request) {
        if (!"MANUAL".equals(request.origen) && !"BCV".equals(request.origen)) {
            throw new RuntimeException("Origen inválido: use MANUAL o BCV");
        }
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
        licencia.setOrigenTasaUsdVes(request.origen);
        return ResponseEntity.ok(licenciaTenantRepository.save(licencia));
    }
}
