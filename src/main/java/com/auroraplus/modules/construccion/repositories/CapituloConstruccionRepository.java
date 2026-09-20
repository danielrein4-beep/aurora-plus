package com.auroraplus.modules.construccion.repositories;

import com.auroraplus.modules.construccion.entities.CapituloConstruccionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CapituloConstruccionRepository extends JpaRepository<CapituloConstruccionEntity, Long> {
    List<CapituloConstruccionEntity> findByTenantIdOrderByOrdenAsc(Long tenantId);
    List<CapituloConstruccionEntity> findByTenantIdAndProyectoIdOrderByOrdenAsc(Long tenantId, Long proyectoId);
    Optional<CapituloConstruccionEntity> findByTenantIdAndId(Long tenantId, Long id);
}
