package com.auroraplus.core.financiero.services;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

/**
 * Actualiza sola la tasa USD->VES de los tenants que eligieron regirse por el BCV (ver
 * LicenciaTenant.origenTasaUsdVes) — la mayoría del mercado opera con tasa paralela y sigue
 * tecleándola manual (TasaCambioController), pero para el que sí se rige por la oficial, esto
 * evita que tenga que entrar todos los días a copiarla del bcv.org.ve a mano.
 *
 * bcv.org.ve no tiene API pública (solo se puede scrapear su HTML, y el sitio se cae/bloquea
 * seguido) — se usa en su lugar un espejo gratuito (ve.dolarapi.com) que ya expone la tasa
 * oficial del BCV como JSON limpio. Si el espejo falla un día, simplemente no se actualiza esa
 * jornada — no hay reintentos ni alerta, porque un tenant en este modo puede seguir operando
 * con la última tasa conocida sin que sea grave (mismo criterio de bajo riesgo que el resto de
 * este job: corre una vez al día, un fallo puntual no bloquea nada).
 */
@Component
public class TasaBcvAutomaticaJob {

    private static final Logger log = LoggerFactory.getLogger(TasaBcvAutomaticaJob.class);
    private static final String ORIGEN_BCV = "BCV";
    private static final URI ENDPOINT_TASA_OFICIAL = URI.create("https://ve.dolarapi.com/v1/dolares/oficial");

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    @Scheduled(cron = "0 30 8 * * *") // todos los días a las 8:30 am, hora del servidor
    public void actualizarTasaBcvDeTenantsSuscritos() {
        List<LicenciaTenant> tenantsConBcvAutomatico = licenciaTenantRepository.findByActivaTrueAndOrigenTasaUsdVes(ORIGEN_BCV);
        if (tenantsConBcvAutomatico.isEmpty()) return;

        BigDecimal tasaOficial;
        try {
            tasaOficial = obtenerTasaOficialDeHoy();
        } catch (Exception e) {
            log.warn("No se pudo obtener la tasa BCV del espejo hoy — se reintenta mañana. Motivo: {}", e.getMessage());
            return;
        }

        for (LicenciaTenant tenant : tenantsConBcvAutomatico) {
            try {
                motorFinancieroService.actualizarTasa(tenant.getTenantId(), "USD", "VES", tasaOficial, ORIGEN_BCV);
            } catch (Exception e) {
                log.error("No se pudo actualizar la tasa BCV del tenant {}: {}", tenant.getTenantId(), e.getMessage(), e);
            }
        }
    }

    private BigDecimal obtenerTasaOficialDeHoy() throws Exception {
        HttpRequest request = HttpRequest.newBuilder(ENDPOINT_TASA_OFICIAL)
            .timeout(Duration.ofSeconds(10))
            .GET()
            .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IllegalStateException("El espejo de tasa oficial respondió " + response.statusCode());
        }
        JsonNode nodo = objectMapper.readTree(response.body());
        BigDecimal promedio = nodo.has("promedio") ? new BigDecimal(nodo.get("promedio").asText()) : null;
        if (promedio == null || promedio.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Respuesta del espejo sin un valor de tasa válido: " + response.body());
        }
        return promedio;
    }
}
