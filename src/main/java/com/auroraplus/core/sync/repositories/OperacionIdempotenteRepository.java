package com.auroraplus.core.sync.repositories;

import com.auroraplus.core.sync.entities.OperacionIdempotente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OperacionIdempotenteRepository extends JpaRepository<OperacionIdempotente, Long> {
    Optional<OperacionIdempotente> findByTenantIdAndClaveIdempotencia(Long tenantId, String claveIdempotencia);
}
