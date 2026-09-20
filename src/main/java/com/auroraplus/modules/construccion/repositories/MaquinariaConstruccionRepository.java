package com.auroraplus.modules.construccion.repositories;

import com.auroraplus.modules.construccion.entities.MaquinariaConstruccionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MaquinariaConstruccionRepository extends JpaRepository<MaquinariaConstruccionEntity, Long> {
    List<MaquinariaConstruccionEntity> findByTenantIdOrderByCodigoAsc(Long tenantId);
    List<MaquinariaConstruccionEntity> findByTenantIdAndProyectoIdOrderByCodigoAsc(Long tenantId, Long proyectoId);
    Optional<MaquinariaConstruccionEntity> findByTenantIdAndId(Long tenantId, Long id);
    Optional<MaquinariaConstruccionEntity> findByTenantIdAndCodigo(Long tenantId, String codigo);
}
