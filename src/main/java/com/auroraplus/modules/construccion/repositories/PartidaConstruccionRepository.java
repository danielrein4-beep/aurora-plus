package com.auroraplus.modules.construccion.repositories;

import com.auroraplus.modules.construccion.entities.PartidaConstruccionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PartidaConstruccionRepository extends JpaRepository<PartidaConstruccionEntity, Long> {
    List<PartidaConstruccionEntity> findByTenantIdAndProyectoIdOrderByCodigoCoveninAsc(Long tenantId, Long proyectoId);
    Optional<PartidaConstruccionEntity> findByTenantIdAndId(Long tenantId, Long id);
}
