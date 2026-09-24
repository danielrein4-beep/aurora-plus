package com.auroraplus.core.financiero.controllers;

import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.financiero.entities.TasaCambio;
import com.auroraplus.core.financiero.repositories.TasaCambioRepository;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.financiero.services.TasaExternaService;
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

    @Autowired
    private TasaExternaService tasaExternaService;

    @GetMapping("/cotizacion-cobro")
    public java.util.Map<String, Object> cotizacionCobro() {
        Long tenant = com.auroraplus.core.config.TenantContext.getCurrentTenant();
        String base = motorFinancieroService.obtenerMonedaBase(tenant);
        java.util.Map<String, BigDecimal> factores = new java.util.LinkedHashMap<>();
        for (String moneda : List.of("USD", "VES", "COP")) {
            try { factores.put(moneda, motorFinancieroService.factorConversion(tenant, base, moneda)); }
            catch (RuntimeException sinTasa) { factores.put(moneda, null); }
        }
        return java.util.Map.of("monedaBase", base, "factores", factores);
    }

    public static class ActualizarTasaRequest {
        public String monedaOrigen;
        public String monedaDestino;
        public BigDecimal tasa;
        public String origen; // MANUAL, BCV, TRM... por defecto MANUAL
    }

    /** Registra una tasa nueva (queda historial — nunca se sobreescribe la anterior). */
    @PostMapping
    public ResponseEntity<TasaCambio> actualizar(@RequestBody ActualizarTasaRequest request) {
        Long tenantId = TenantContext.getCurrentTenant();
        com.auroraplus.core.auth.AuthContext.exigirRol("DUENO_ADMIN", "CAJERO_VENDEDOR", "ADMINISTRADOR_FINCA");
        if (request.tasa == null || request.tasa.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La tasa debe ser mayor a cero");
        }
        return ResponseEntity.ok(motorFinancieroService.actualizarTasa(
            tenantId, request.monedaOrigen, request.monedaDestino, request.tasa, request.origen));
    }

    /**
     * Refresca la tasa USD/VES consultando en vivo una fuente pública — BCV
     * oficial o Binance P2P — y la registra como tasa nueva. Ninguna de las
     * dos la escribe el negocio a mano: son cifras que vienen de afuera, a
     * diferencia de la tasa "PERSONALIZADA" (esa sí la define el negocio). Si
     * la fuente falla, no se escribe nada: la tasa vigente sigue siendo la
     * última registrada.
     *
     * `fuente` decide qué API externa se consulta (BCV o BINANCE); el origen
     * que queda guardado es el concepto de negocio, no el nombre del
     * proveedor de datos — BINANCE se guarda con origen "USDT" (la tasa
     * paralela vía P2P, como la conoce el negocio), no "BINANCE".
     *
     * Este refresco es bajo demanda; TasaBcvAutomaticaJob (en
     * feature/astra-hero-redesign al momento de escribir esto) además
     * refresca la serie "BCV" sola una vez al día por tenant — son dos
     * caminos de escritura sobre la misma serie, no duplicados.
     */
    @PostMapping("/actualizar-externa")
    public ResponseEntity<TasaCambio> actualizarExterna(@RequestParam String fuente,
                                                          @RequestParam(defaultValue = "VES") String monedaDestino) {
        Long tenantId = TenantContext.getCurrentTenant();
        com.auroraplus.core.auth.AuthContext.exigirRol("DUENO_ADMIN", "CAJERO_VENDEDOR", "ADMINISTRADOR_FINCA");
        String origenGuardado;
        BigDecimal tasa;
        switch (fuente.toUpperCase()) {
            case "BCV" -> { tasa = tasaExternaService.obtenerBcv(); origenGuardado = "BCV"; }
            case "BINANCE" -> { tasa = tasaExternaService.obtenerBinance(); origenGuardado = "USDT"; }
            default -> throw new RuntimeException("Fuente de tasa externa no soportada: " + fuente + " (use BCV o BINANCE)");
        }
        // BCV y Binance cotizan dólar→bolívar: guardarlas como otro par (p. ej. USD→COP) cobraría mal.
        if (!"VES".equalsIgnoreCase(monedaDestino)) {
            throw new RuntimeException("Las tasas de " + fuente.toUpperCase() + " son de dólar a bolívar (VES)");
        }
        return ResponseEntity.ok(motorFinancieroService.actualizarTasa(tenantId, "USD", "VES", tasa, origenGuardado));
    }

    /**
     * Tasa vigente (la más reciente) entre dos monedas para este tenant. Con
     * `origen` (BCV, USDT, PERSONALIZADA...) filtra a la más reciente de ESE
     * origen específico — cada origen se rastrea como una serie propia, para
     * que un negocio pueda mantener, por ejemplo, su tasa BCV de referencia y
     * su tasa USDT de cobro en el POS simultáneamente, sin que guardar una
     * pise la lectura de la otra. Sin `origen`, mantiene el comportamiento
     * histórico: la más reciente sin importar de qué origen vino.
     */
    @GetMapping("/vigente")
    public TasaCambio vigente(@RequestParam String monedaOrigen, @RequestParam String monedaDestino,
                               @RequestParam(required = false) String origen) {
        Long tenantId = TenantContext.getCurrentTenant();
        if (origen != null && !origen.isBlank()) {
            return tasaCambioRepository.findTopByTenantIdAndMonedaOrigenAndMonedaDestinoAndOrigenApiOrderByFechaActualizacionDesc(
                    tenantId, monedaOrigen, monedaDestino, origen)
                .orElseThrow(() -> new RuntimeException("No hay tasa " + origen + " registrada entre " + monedaOrigen + " y " + monedaDestino));
        }
        return tasaCambioRepository.findTopByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(
                tenantId, monedaOrigen, monedaDestino)
            .orElseThrow(() -> new RuntimeException("No hay tasa registrada entre " + monedaOrigen + " y " + monedaDestino));
    }

    /** Historial completo de fluctuación entre dos monedas. */
    @GetMapping("/historial")
    public List<TasaCambio> historial(@RequestParam String monedaOrigen, @RequestParam String monedaDestino) {
        Long tenantId = TenantContext.getCurrentTenant();
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
    public ResponseEntity<BigDecimal> convertir(@RequestBody ConvertirRequest request) {
        Long tenantId = TenantContext.getCurrentTenant();
        if (request.monedaDestino == null || request.monedaDestino.isBlank()) {
            return ResponseEntity.ok(motorFinancieroService.convertirAMonedaBase(tenantId, request.monto, request.monedaOrigen));
        }
        return ResponseEntity.ok(motorFinancieroService.convertirMoneda(tenantId, request.monto, request.monedaOrigen, request.monedaDestino));
    }

    /** Moneda base configurada para el tenant — la que usan por defecto sus reportes y su caja. */
    @GetMapping("/moneda-base")
    public String monedaBase() {
        Long tenantId = TenantContext.getCurrentTenant();
        return licenciaTenantRepository.findByTenantId(tenantId)
            .map(LicenciaTenant::getMonedaBase)
            .orElseThrow(() -> new RuntimeException("Tenant no encontrado: " + tenantId));
    }
}
