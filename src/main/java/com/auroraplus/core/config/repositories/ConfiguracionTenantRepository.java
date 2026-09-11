package com.auroraplus.core.config.repositories;

import com.auroraplus.core.config.entities.ConfiguracionTenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConfiguracionTenantRepository extends JpaRepository<ConfiguracionTenant, Long> {

    // El token del portal de laboratorio es público (lo escanea cualquiera con
    // el QR, sin login) — por eso esta búsqueda es por token, no por tenantId,
    // y deliberadamente NO pasa por el filtro de tenant (no hay tenant
    // resuelto todavía en este punto, es lo que estamos averiguando).
    @Query("SELECT c FROM ConfiguracionTenant c WHERE c.tokenPortalLaboratorio = :token")
    Optional<ConfiguracionTenant> findByTokenPortalLaboratorio(@Param("token") String token);
}
