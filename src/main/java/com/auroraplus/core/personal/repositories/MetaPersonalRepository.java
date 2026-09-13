package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.MetaPersonal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MetaPersonalRepository extends JpaRepository<MetaPersonal, Long> {
    List<MetaPersonal> findByTenantIdAndEmpleadoId(Long tenantId, Long empleadoId);
    List<MetaPersonal> findByTenantIdOrderByPeriodoHastaDesc(Long tenantId);
    Optional<MetaPersonal> findByTenantIdAndId(Long tenantId, Long id);
}
