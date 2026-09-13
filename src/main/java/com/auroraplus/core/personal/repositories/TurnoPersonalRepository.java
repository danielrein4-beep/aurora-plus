package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.TurnoPersonal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TurnoPersonalRepository extends JpaRepository<TurnoPersonal, Long> {
    List<TurnoPersonal> findByTenantIdAndEmpleadoId(Long tenantId, Long empleadoId);
}
