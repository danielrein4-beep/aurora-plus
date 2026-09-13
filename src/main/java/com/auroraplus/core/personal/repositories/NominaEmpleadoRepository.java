package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.NominaEmpleado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface NominaEmpleadoRepository extends JpaRepository<NominaEmpleado, Long> {
    List<NominaEmpleado> findByTenantIdAndPeriodoId(Long tenantId, Long periodoId);
    List<NominaEmpleado> findByTenantIdAndEmpleadoId(Long tenantId, Long empleadoId);
    Optional<NominaEmpleado> findByTenantIdAndId(Long tenantId, Long id);
    Optional<NominaEmpleado> findByTenantIdAndPeriodoIdAndEmpleadoId(Long tenantId, Long periodoId, Long empleadoId);
    long countByTenantIdAndPeriodoIdAndEmpleadoId(Long tenantId, Long periodoId, Long empleadoId);
}
