package com.auroraplus.modules.construccion.repositories;

import com.auroraplus.modules.construccion.entities.IdempotenciaConstruccionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IdempotenciaConstruccionRepository extends JpaRepository<IdempotenciaConstruccionEntity, Long> {
    Optional<IdempotenciaConstruccionEntity> findByTenantIdAndIdempotencyKey(Long tenantId, String idempotencyKey);
}
