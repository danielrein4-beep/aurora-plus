package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.SeguimientoMeta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SeguimientoMetaRepository extends JpaRepository<SeguimientoMeta, Long> {
    List<SeguimientoMeta> findByTenantIdAndMetaId(Long tenantId, Long metaId);
}
