package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.FincaGanaderia;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FincaGanaderiaRepository extends JpaRepository<FincaGanaderia, Long> {
    Optional<FincaGanaderia> findByTenantId(Long tenantId);
}
