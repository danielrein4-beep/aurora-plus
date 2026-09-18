package com.auroraplus.core.financiero.services;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Reemplaza la tasa USD->VES tecleada a mano por la tasa real de Binance P2P
 * o del BCV oficial, según lo que cada tenant eligió en
 * LicenciaTenant.metodoTasaAutomatica — y la propaga a TODAS las verticales
 * a la vez, porque todas leen la misma tabla tasas_cambio (ver TasaCambio).
 *
 * Un tenant en MANUAL nunca se toca acá: esa es la tasa "Propia" que el
 * negocio sigue fijando él mismo desde el popover de cada vertical.
 *
 * Corre sin JWT/TenantContext (igual que ClasificacionClientesJob y
 * AvisoVencimientoTrialJob), así que TenantFilterAspect no filtra
 * automáticamente — por eso se consulta explícitamente por tenant activo.
 */
@Component
public class ActualizacionTasasAutomaticasJob {

    private static final Logger log = LoggerFactory.getLogger(ActualizacionTasasAutomaticasJob.class);

    @Autowired
    private TasaCambioAutomaticaService tasaCambioAutomaticaService;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    // Cada 4 horas: ni tan seguido como para arriesgarse a que Binance/el BCV bloqueen la
    // IP del servidor, ni tan espaciado como para operar medio día con una tasa vieja en
    // un contexto de fluctuación diaria. El BCV en la práctica solo publica una vez al día
    // hábil, así que igual queda cubierto sin desperdiciar llamadas.
    @Scheduled(cron = "0 0 */4 * * *")
    public void actualizarTasasAutomaticas() {
        actualizarPorMetodo("BINANCE", tasaCambioAutomaticaService.obtenerTasaBinanceP2P(), "BINANCE_AUTO");
        actualizarPorMetodo("BCV", tasaCambioAutomaticaService.obtenerTasaBcv(), "BCV_AUTO");
    }

    /** Trigger manual — botón "Actualizar ahora" y pruebas, sin esperar la próxima corrida programada. */
    public void ejecutarAhora() {
        actualizarTasasAutomaticas();
    }

    /** Actualiza YA la tasa automática de un solo tenant (si su método no es MANUAL), para el botón "Actualizar ahora" de un negocio puntual. */
    public Optional<BigDecimal> actualizarAhoraParaTenant(Long tenantId, String metodo) {
        Optional<BigDecimal> tasaOpt = "BCV".equals(metodo)
            ? tasaCambioAutomaticaService.obtenerTasaBcv()
            : tasaCambioAutomaticaService.obtenerTasaBinanceP2P();
        tasaOpt.ifPresent(tasa -> motorFinancieroService.actualizarTasa(
            tenantId, "USD", "VES", tasa, "BCV".equals(metodo) ? "BCV_AUTO" : "BINANCE_AUTO"));
        return tasaOpt;
    }

    private void actualizarPorMetodo(String metodo, Optional<BigDecimal> tasaOpt, String origen) {
        if (tasaOpt.isEmpty()) {
            log.warn("No se pudo obtener la tasa automática de {} en esta corrida — los tenants que la siguen quedan con su última tasa vigente hasta el próximo intento.", metodo);
            return;
        }
        BigDecimal tasa = tasaOpt.get();
        List<LicenciaTenant> tenants = licenciaTenantRepository.findByActivaTrueAndMetodoTasaAutomatica(metodo);
        int actualizados = 0;
        for (LicenciaTenant tenant : tenants) {
            try {
                motorFinancieroService.actualizarTasa(tenant.getTenantId(), "USD", "VES", tasa, origen);
                actualizados++;
            } catch (Exception e) {
                log.error("No se pudo actualizar la tasa automática ({}) del tenant {}: {}", metodo, tenant.getTenantId(), e.getMessage(), e);
            }
        }
        log.info("Tasa automática {} = {} aplicada a {} de {} tenants suscritos.", metodo, tasa, actualizados, tenants.size());
    }
}
