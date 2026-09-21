package com.auroraplus.modules.construccion.repositories;

import com.auroraplus.modules.construccion.entities.DespachoConstruccionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DespachoConstruccionRepository extends JpaRepository<DespachoConstruccionEntity, Long> {
    List<DespachoConstruccionEntity> findByTenantIdAndProyectoIdOrderByCreatedAtDesc(Long tenantId, Long proyectoId);
    List<DespachoConstruccionEntity> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    Optional<DespachoConstruccionEntity> findByTenantIdAndId(Long tenantId, Long id);
}
