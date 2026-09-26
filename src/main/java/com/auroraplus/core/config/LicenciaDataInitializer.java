package com.auroraplus.core.config;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Siembra una licencia INDUSTRIAL activa para el tenant 1 (el tenant por
 * defecto usado en desarrollo y en las pruebas manuales de este ERP) al
 * arrancar la aplicación, si no existe una todavía. Sin esto, el Motor de
 * Licenciamiento (Fase 2.2) bloquearía con HTTP 402 cualquier petición a
 * cualquier módulo desde el primer arranque, incluyendo en desarrollo.
 *
 * Para otros tenants, la licencia se crea explícitamente vía
 * POST /api/super-admin/tenants (SuperAdminController) — ese endpoint queda
 * exento del propio bloqueo para poder gestionar licencias.
 */
@Component
public class LicenciaDataInitializer implements CommandLineRunner {

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    private static final Long TENANT_DESARROLLO = 1L;

    /**
     * En el servidor (AURORA_TENANT_DESARROLLO=false en docker-compose) el id 1 se sigue
     * reservando, porque si no el primer cliente real recibiría el id 1 y heredaría lo que el
     * código trata como entorno de pruebas (catálogo de ejemplo). Pero queda inactivo y fuera
     * del panel del super admin.
     */
    @org.springframework.beans.factory.annotation.Value("${AURORA_TENANT_DESARROLLO:true}")
    private boolean tenantDesarrollo;

    @Override
    public void run(String... args) {
        if (licenciaTenantRepository.findByTenantId(TENANT_DESARROLLO).isEmpty()) {
            LicenciaTenant licencia = new LicenciaTenant();
            licencia.setTenantId(TENANT_DESARROLLO);
            licencia.setTipoLicencia(LicenciaTenant.TipoLicencia.INDUSTRIAL);
            licencia.setActiva(tenantDesarrollo);
            licencia.setFechaVencimientoPago(LocalDate.now().plusYears(1));
            licencia.setNombreEmpresa(tenantDesarrollo ? "Tenant de Desarrollo" : "Reservado del sistema");
            licencia.setModuloPrincipal("tamanaco-comercial");
            licencia.setFechaAlta(LocalDate.now());
            licenciaTenantRepository.save(licencia);
        }
    }
}
