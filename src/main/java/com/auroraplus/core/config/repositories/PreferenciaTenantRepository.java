package com.auroraplus.core.config.repositories;

import com.auroraplus.core.config.entities.PreferenciaTenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PreferenciaTenantRepository extends JpaRepository<PreferenciaTenant, PreferenciaTenant.Clave> {
    Optional<PreferenciaTenant> findByTenantIdAndClave(Long tenantId, String clave);
}
