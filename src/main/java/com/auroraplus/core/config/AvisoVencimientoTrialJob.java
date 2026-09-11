package com.auroraplus.core.config;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Antes, nada avisaba a un negocio que su período de prueba/licencia estaba
 * por vencer — el bloqueo de acceso (ver LicenciaInterceptor) era real, pero
 * llegaba como sorpresa. Corre una vez al día y avisa por correo 5 días
 * antes del vencimiento — una sola vez, no reenvía a diario (ver
 * LicenciaTenantRepository.buscarPorVencerEn).
 */
@Component
public class AvisoVencimientoTrialJob {

    private static final Logger log = LoggerFactory.getLogger(AvisoVencimientoTrialJob.class);
    private static final int DIAS_ANTES_DEL_AVISO = 5;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private CorreoService correoService;

    @Scheduled(cron = "0 0 8 * * *") // todos los días a las 8:00 am, hora del servidor
    public void avisarVencimientosProximos() {
        LocalDate fechaObjetivo = LocalDate.now().plusDays(DIAS_ANTES_DEL_AVISO);
        for (LicenciaTenant licencia : licenciaTenantRepository.buscarPorVencerEn(fechaObjetivo)) {
            try {
                String cuerpo = "<p>Hola,</p>"
                    + "<p>Tu acceso a Aurora Plus para <strong>" + escapar(licencia.getNombreEmpresa()) + "</strong> vence el "
                    + licencia.getFechaVencimientoPago() + " (en " + DIAS_ANTES_DEL_AVISO + " días).</p>"
                    + "<p>Escríbenos a auroraplussoftware@gmail.com para coordinar la renovación y no perder acceso a tu operación.</p>";
                correoService.enviarHtml(licencia.getEmailContacto(), "Tu acceso a Aurora Plus vence pronto", cuerpo);
            } catch (Exception e) {
                // Un correo fallido no debe tumbar el aviso al resto de los tenants del día.
                log.error("No se pudo avisar vencimiento a tenant {}: {}", licencia.getTenantId(), e.getMessage(), e);
            }
        }
    }

    private String escapar(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
