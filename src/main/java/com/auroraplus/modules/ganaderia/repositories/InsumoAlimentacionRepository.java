package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.InsumoAlimentacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InsumoAlimentacionRepository extends JpaRepository<InsumoAlimentacion, Long> {
    List<InsumoAlimentacion> findByTenantId(Long tenantId);
}
