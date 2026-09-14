package com.auroraplus.modules.horeca.services;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Hardening de seguridad pre-piloto — complemento de PilotSecurityHardeningTest, en su propio
 * contexto de Spring con app.simulacion-piloto.habilitada=true (la condición explícita de
 * ambiente seguro). El guard bloquea CUALQUIER tenant con registro en LicenciaTenant, esté
 * activa o inactiva/vencida — solo un tenant sin ninguna fila (sandbox nunca provisionado como
 * negocio real) puede correr la simulación.
 */
@SpringBootTest(properties = "app.simulacion-piloto.habilitada=true")
@ActiveProfiles("test")
class SimulacionHorecaPilotoSeguridadTest {

    @Autowired
    private SimulacionHorecaPilotoService simulacionHorecaPilotoService;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Test
    void simulacionRechazadaContraTenantConLicenciaActiva() {
        long tenantId = 96002L;
        LicenciaTenant licencia = new LicenciaTenant();
        licencia.setTenantId(tenantId);
        licencia.setTipoLicencia(LicenciaTenant.TipoLicencia.COMERCIAL);
        licencia.setActiva(true);
        licencia.setFechaVencimientoPago(LocalDate.now().plusMonths(1));
        licencia.setNombreEmpresa("Negocio piloto real");
        licencia.setModuloPrincipal("horeca");
        licenciaTenantRepository.save(licencia);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
            () -> simulacionHorecaPilotoService.ejecutarSimulacionPiloto(tenantId, 1));
        assertTrue(ex.getMessage().contains("activa"));
    }

    /** Prueba explícita pedida: licencia vencida/inactiva también debe rechazarse, no solo la activa. */
    @Test
    void simulacionRechazadaContraTenantConLicenciaInactivaOVencida() {
        long tenantId = 96004L;
        LicenciaTenant licencia = new LicenciaTenant();
        licencia.setTenantId(tenantId);
        licencia.setTipoLicencia(LicenciaTenant.TipoLicencia.BASICA);
        licencia.setActiva(false);
        licencia.setFechaVencimientoPago(LocalDate.now().minusDays(1));
        licencia.setNombreEmpresa("Negocio con trial vencido");
        licencia.setModuloPrincipal("horeca");
        licenciaTenantRepository.save(licencia);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
            () -> simulacionHorecaPilotoService.ejecutarSimulacionPiloto(tenantId, 1));
        assertTrue(ex.getMessage().contains("inactiva"));
    }

    @Test
    void simulacionPermitidaSoloConAmbienteHabilitadoYSinNingunRegistroDeLicencia() {
        // tenantId nuevo, sin ninguna fila de LicenciaTenant — sandbox nunca provisionado como
        // negocio real, exactamente el caso legítimo de uso de esta simulación de estrés.
        long tenantId = 96003L;

        SimulacionHorecaPilotoService.ResultadoSimulacionHoreca resultado =
            assertDoesNotThrow(() -> simulacionHorecaPilotoService.ejecutarSimulacionPiloto(tenantId, 2));

        assertNotNull(resultado);
        assertTrue(resultado.getTransaccionesExitosas() + resultado.getTransaccionesFallidas() > 0,
            "Debe haber corrido al menos una transacción — la simulación no debe quedar bloqueada por el guard cuando ambas condiciones se cumplen");
    }
}
