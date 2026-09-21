package com.auroraplus.modules.construccion.repositories;

import com.auroraplus.modules.construccion.entities.MantenimientoMaquinariaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MantenimientoMaquinariaRepository extends JpaRepository<MantenimientoMaquinariaEntity, Long> {
    List<MantenimientoMaquinariaEntity> findByTenantIdAndMaquinariaIdOrderByFechaMantenimientoDesc(Long tenantId, Long maquinariaId);
    Optional<MantenimientoMaquinariaEntity> findByTenantIdAndId(Long tenantId, Long id);
}
