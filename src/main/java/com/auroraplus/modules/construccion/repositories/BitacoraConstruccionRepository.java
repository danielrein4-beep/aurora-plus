package com.auroraplus.modules.construccion.repositories;

import com.auroraplus.modules.construccion.entities.BitacoraConstruccionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BitacoraConstruccionRepository extends JpaRepository<BitacoraConstruccionEntity, Long> {
    List<BitacoraConstruccionEntity> findByTenantIdAndProyectoIdOrderByFechaDesc(Long tenantId, Long proyectoId);
}
