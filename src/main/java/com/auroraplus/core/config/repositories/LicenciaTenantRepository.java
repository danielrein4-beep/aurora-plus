package com.auroraplus.core.config.repositories;

import com.auroraplus.core.config.entities.LicenciaTenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface LicenciaTenantRepository extends JpaRepository<LicenciaTenant, Long> {
    Optional<LicenciaTenant> findByTenantId(Long tenantId);

    @Query("SELECT COALESCE(MAX(l.tenantId), 0) FROM LicenciaTenant l")
    Long buscarMaximoTenantId();
}
