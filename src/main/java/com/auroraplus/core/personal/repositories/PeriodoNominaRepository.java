package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.PeriodoNomina;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PeriodoNominaRepository extends JpaRepository<PeriodoNomina, Long> {
    List<PeriodoNomina> findByTenantId(Long tenantId);
    List<PeriodoNomina> findByTenantIdOrderByFechaInicioDesc(Long tenantId);
    Optional<PeriodoNomina> findByTenantIdAndId(Long tenantId, Long id);
}
