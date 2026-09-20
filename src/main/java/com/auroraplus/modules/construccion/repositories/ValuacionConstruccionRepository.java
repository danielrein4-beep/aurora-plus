package com.auroraplus.modules.construccion.repositories;

import com.auroraplus.modules.construccion.entities.ValuacionConstruccionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ValuacionConstruccionRepository extends JpaRepository<ValuacionConstruccionEntity, Long> {
    List<ValuacionConstruccionEntity> findByTenantIdAndProyectoIdOrderByNumeroValuacionDesc(Long tenantId, Long proyectoId);
    Optional<ValuacionConstruccionEntity> findByTenantIdAndId(Long tenantId, Long id);
}
