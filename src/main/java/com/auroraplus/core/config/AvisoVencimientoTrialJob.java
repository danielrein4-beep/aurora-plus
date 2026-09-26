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
    /** Días antes del vencimiento en que se avisa (con 15 días de prueba, el de 7 ya cae a mitad). */
    private static final int[] DIAS_ANTES_DEL_AVISO = {7, 3, 1};

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private CorreoService correoService;

    @Scheduled(cron = "0 0 8 * * *") // todos los días a las 8:00 am, hora del servidor
    public void avisarVencimientosProximos() {
        for (int dias : DIAS_ANTES_DEL_AVISO) {
            avisar(LocalDate.now().plusDays(dias), dias);
        }
        // El día que vence: se le recuerdan los días de gracia antes de que se pause el acceso.
        avisar(LocalDate.now(), 0);
    }

    private void avisar(LocalDate fechaObjetivo, int dias) {
        for (LicenciaTenant licencia : licenciaTenantRepository.buscarPorVencerEn(fechaObjetivo)) {
            try {
                String cuando = dias == 0 ? "vence hoy" : dias == 1 ? "vence mañana" : "vence en " + dias + " días";
                String cuerpo = "<p>Hola,</p>"
                    + "<p>Tu acceso a Aurora Plus para <strong>" + escapar(licencia.getNombreEmpresa()) + "</strong> " + cuando
                    + " (" + licencia.getFechaVencimientoPago() + ").</p>"
                    + "<p>Para renovar, entra a Aurora Hub &gt; Facturación &amp; Pagos, paga con Pago Móvil, Binance o Zelle y reporta la referencia. "
                    + "Después del vencimiento tienes " + LicenciaService.DIAS_GRACIA + " días de gracia antes de que se pause el acceso; tus datos no se borran.</p>"
                    + "<p>¿Dudas? Escríbenos a auroraplussoftware@gmail.com.</p>";
                String asunto = dias == 0 ? "Tu plan de Aurora Plus vence hoy" : "Tu acceso a Aurora Plus " + cuando;
                correoService.enviarHtml(licencia.getEmailContacto(), asunto, cuerpo);
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
