package com.auroraplus.core.config;

import com.auroraplus.core.auditoria.services.RegistroAuditoriaService;
import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
public class LicenciaSuspensionScheduler {

    private static final Logger log = LoggerFactory.getLogger(LicenciaSuspensionScheduler.class);

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired(required = false)
    private RegistroAuditoriaService auditoriaService;

    @Autowired
    private LicenciaService licenciaService;

    /**
     * Barrido diario automático a las 00:05 para suspender licencias vencidas.
     */
    @Scheduled(cron = "0 5 0 * * *")
    public void ejecutarBarridoAutomatico() {
        log.info("Iniciando barrido automático de licencias vencidas...");
        int total = suspenderLicenciasVencidas();
        log.info("Barrido automático completado. Tenants suspendidos: {}", total);
    }

    /**
     * Suspende todas las licencias activas cuya fecha de vencimiento sea anterior a hoy.
     * Retorna el número de tenants que fueron suspendidos.
     */
    public int suspenderLicenciasVencidas() {
        LocalDate hoy = LocalDate.now();
        // Se respetan los días de gracia: solo se suspende cuando ya pasaron también esos días.
        List<LicenciaTenant> vencidas = licenciaTenantRepository.buscarVencidasActivas(hoy.minusDays(LicenciaService.DIAS_GRACIA));
        int contador = 0;

        for (LicenciaTenant l : vencidas) {
            // Reportó su pago y falta que lo verifiquemos: no se suspende mientras tanto.
            if (licenciaService.tienePagoReportadoPendiente(l.getTenantId())) {
                log.info("Tenant {} vencido pero con pago reportado en verificación: no se suspende", l.getTenantId());
                continue;
            }
            l.setActiva(false);
            licenciaTenantRepository.save(l);
            contador++;

            if (auditoriaService != null) {
                try {
                    auditoriaService.registrar(
                        l.getTenantId(),
                        "SISTEMA",
                        "SUSPENSION_AUTOMATICA",
                        "LicenciaTenant",
                        l.getTenantId(),
                        "Licencia suspendida automáticamente por vencimiento de pago el " + l.getFechaVencimientoPago()
                    );
                } catch (Exception ex) {
                    log.warn("No se pudo registrar auditoría de suspensión para tenant {}: {}", l.getTenantId(), ex.getMessage());
                }
            }
        }

        return contador;
    }
}
