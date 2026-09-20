package com.auroraplus.modules.construccion.repositories;

import com.auroraplus.modules.construccion.entities.InsumoConstruccionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InsumoConstruccionRepository extends JpaRepository<InsumoConstruccionEntity, Long> {
    List<InsumoConstruccionEntity> findByTenantIdOrderByCodigoAsc(Long tenantId);
    Optional<InsumoConstruccionEntity> findByTenantIdAndId(Long tenantId, Long id);
}
