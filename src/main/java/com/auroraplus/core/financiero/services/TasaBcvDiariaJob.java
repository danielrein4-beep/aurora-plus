package com.auroraplus.core.financiero.services;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.financiero.entities.TasaCambio;
import com.auroraplus.core.financiero.repositories.TasaCambioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

/**
 * La tasa oficial del BCV se actualiza sola: antes solo se consultaba cuando alguien pulsaba
 * "Actualizar ahora" y, si nadie lo hacía, el sistema seguía con la de días atrás. La USDT
 * sigue siendo manual (se actualiza cuando el negocio quiera) y la personalizada la escribe el dueño.
 *
 * Se consulta la fuente una sola vez y se guarda como serie "BCV" en cada negocio activo (los de
 * modo euro no usan bolívares). Si la fuente falla no se escribe nada: queda la última tasa real.
 */
@Component
public class TasaBcvDiariaJob {

    private static final Logger log = LoggerFactory.getLogger(TasaBcvDiariaJob.class);
    private static final ZoneId CARACAS = ZoneId.of("America/Caracas");

    @Autowired
    private TasaExternaService tasaExternaService;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Autowired
    private TasaCambioRepository tasaCambioRepository;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    /** Apagado en las pruebas automáticas (application-test.properties) para no salir a internet. */
    @Value("${aurora.tasa-bcv.auto:true}")
    private boolean activo;

    /** 8:05 am, 1:00 pm y 5:00 pm de Venezuela: el BCV suele publicar la tasa del día siguiente en la tarde. */
    @Scheduled(cron = "0 5 8,13,17 * * *", zone = "America/Caracas")
    public void actualizarProgramado() {
        if (activo) actualizar();
    }

    /** Al arrancar el servidor, para no esperar hasta el próximo horario si estuvo apagado. */
    @EventListener(ApplicationReadyEvent.class)
    public void actualizarAlArrancar() {
        if (!activo) return;
        // En un hilo aparte: la consulta externa no debe retrasar el arranque.
        Thread hilo = new Thread(this::actualizar, "tasa-bcv-arranque");
        hilo.setDaemon(true);
        hilo.start();
    }

    /** Devuelve cuántos negocios quedaron con una tasa nueva (0 si la fuente falló o no cambió). */
    public int actualizar() {
        BigDecimal tasa;
        try {
            tasa = tasaExternaService.obtenerBcv();
        } catch (RuntimeException e) {
            log.warn("No se pudo consultar la tasa BCV; se mantiene la última registrada: {}", e.getMessage());
            return 0;
        }
        LocalDate hoy = LocalDate.now(CARACAS);
        int actualizados = 0;
        for (LicenciaTenant l : licenciaTenantRepository.findAll()) {
            if (!l.isActiva() || "EUR".equals(l.getMonedaBase()) || l.getTenantId() == null) continue;
            try {
                Optional<TasaCambio> ultima = tasaCambioRepository
                    .findTopByTenantIdAndMonedaOrigenAndMonedaDestinoAndOrigenApiOrderByFechaActualizacionDesc(l.getTenantId(), "USD", "VES", "BCV");
                boolean igualDeHoy = ultima.isPresent() && ultima.get().getTasa() != null
                    && ultima.get().getTasa().compareTo(tasa) == 0
                    && ultima.get().getFechaActualizacion() != null
                    && ultima.get().getFechaActualizacion().toLocalDate().equals(hoy);
                if (igualDeHoy) continue;
                motorFinancieroService.actualizarTasa(l.getTenantId(), "USD", "VES", tasa, "BCV");
                actualizados++;
            } catch (RuntimeException e) {
                log.warn("No se pudo guardar la tasa BCV del negocio {}: {}", l.getTenantId(), e.getMessage());
            }
        }
        log.info("Tasa BCV {} guardada en {} negocio(s)", tasa, actualizados);
        return actualizados;
    }
}
