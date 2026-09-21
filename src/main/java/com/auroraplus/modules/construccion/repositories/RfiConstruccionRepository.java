package com.auroraplus.modules.construccion.repositories;

import com.auroraplus.modules.construccion.entities.RfiConstruccionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RfiConstruccionRepository extends JpaRepository<RfiConstruccionEntity, Long> {
    List<RfiConstruccionEntity> findByTenantIdAndProyectoIdOrderByCreatedAtDesc(Long tenantId, Long proyectoId);
    Optional<RfiConstruccionEntity> findByTenantIdAndId(Long tenantId, Long id);
    Optional<RfiConstruccionEntity> findByTenantIdAndProyectoIdAndNumeroRfi(Long tenantId, Long proyectoId, String numeroRfi);
    long countByTenantIdAndProyectoId(Long tenantId, Long proyectoId);
}
