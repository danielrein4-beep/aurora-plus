package com.auroraplus.modules.construccion.repositories;

import com.auroraplus.modules.construccion.entities.ProyectoConstruccionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProyectoConstruccionRepository extends JpaRepository<ProyectoConstruccionEntity, Long> {
    List<ProyectoConstruccionEntity> findByTenantIdOrderByIdDesc(Long tenantId);
    Optional<ProyectoConstruccionEntity> findByTenantIdAndId(Long tenantId, Long id);
    Optional<ProyectoConstruccionEntity> findByTenantIdAndCodigo(Long tenantId, String codigo);
}
