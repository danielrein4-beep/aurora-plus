package com.auroraplus.core.config.repositories;

import com.auroraplus.core.config.entities.ModuloTenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ModuloTenantRepository extends JpaRepository<ModuloTenant, Long> {
    List<ModuloTenant> findByTenantId(Long tenantId);
    List<ModuloTenant> findByTenantIdAndActivoTrue(Long tenantId);
    Optional<ModuloTenant> findByTenantIdAndModuloNombre(Long tenantId, String moduloNombre);
}
