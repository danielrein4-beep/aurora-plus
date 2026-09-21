package com.auroraplus.modules.construccion.repositories;

import com.auroraplus.modules.construccion.entities.RiesgoConstruccionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RiesgoConstruccionRepository extends JpaRepository<RiesgoConstruccionEntity, Long> {
    List<RiesgoConstruccionEntity> findByTenantIdAndProyectoIdOrderByCreatedAtDesc(Long tenantId, Long proyectoId);
    Optional<RiesgoConstruccionEntity> findByTenantIdAndId(Long tenantId, Long id);
    Optional<RiesgoConstruccionEntity> findByTenantIdAndProyectoIdAndCodigo(Long tenantId, Long proyectoId, String codigo);
}
