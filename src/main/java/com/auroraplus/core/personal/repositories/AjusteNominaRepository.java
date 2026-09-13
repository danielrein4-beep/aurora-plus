package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.AjusteNomina;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AjusteNominaRepository extends JpaRepository<AjusteNomina, Long> {
    List<AjusteNomina> findByTenantIdAndNominaEmpleadoId(Long tenantId, Long nominaEmpleadoId);
}
