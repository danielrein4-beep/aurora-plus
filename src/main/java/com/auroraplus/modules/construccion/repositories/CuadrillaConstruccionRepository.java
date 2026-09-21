package com.auroraplus.modules.construccion.repositories;

import com.auroraplus.modules.construccion.entities.CuadrillaConstruccionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CuadrillaConstruccionRepository extends JpaRepository<CuadrillaConstruccionEntity, Long> {
    List<CuadrillaConstruccionEntity> findByTenantIdAndProyectoId(Long tenantId, Long proyectoId);
    List<CuadrillaConstruccionEntity> findByTenantIdAndProyectoIdOrderByCodigoAsc(Long tenantId, Long proyectoId);
    Optional<CuadrillaConstruccionEntity> findByTenantIdAndId(Long tenantId, Long id);
    Optional<CuadrillaConstruccionEntity> findByTenantIdAndProyectoIdAndCodigo(Long tenantId, Long proyectoId, String codigo);
}
