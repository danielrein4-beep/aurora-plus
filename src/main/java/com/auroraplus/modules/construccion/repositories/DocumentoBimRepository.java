package com.auroraplus.modules.construccion.repositories;

import com.auroraplus.modules.construccion.entities.DocumentoBimEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentoBimRepository extends JpaRepository<DocumentoBimEntity, Long> {
    List<DocumentoBimEntity> findByTenantIdAndProyectoIdOrderByCodigoAsc(Long tenantId, Long proyectoId);
    List<DocumentoBimEntity> findByTenantIdAndProyectoIdAndDisciplinaOrderByCodigoAsc(Long tenantId, Long proyectoId, String disciplina);
    Optional<DocumentoBimEntity> findByTenantIdAndId(Long tenantId, Long id);
    Optional<DocumentoBimEntity> findByTenantIdAndProyectoIdAndCodigoAndVersion(Long tenantId, Long proyectoId, String codigo, String version);
}
