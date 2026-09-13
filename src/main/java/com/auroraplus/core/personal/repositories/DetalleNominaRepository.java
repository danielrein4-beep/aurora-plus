package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.DetalleNomina;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DetalleNominaRepository extends JpaRepository<DetalleNomina, Long> {
    List<DetalleNomina> findByTenantIdAndNominaEmpleadoId(Long tenantId, Long nominaEmpleadoId);
}
