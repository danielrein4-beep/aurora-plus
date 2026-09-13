package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.AuditoriaPersonal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AuditoriaPersonalRepository extends JpaRepository<AuditoriaPersonal, Long> {
    List<AuditoriaPersonal> findByTenantIdOrderByFechaDesc(Long tenantId);
}
