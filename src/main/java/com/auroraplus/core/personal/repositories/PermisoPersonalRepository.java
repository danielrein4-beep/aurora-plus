package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.PermisoPersonal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PermisoPersonalRepository extends JpaRepository<PermisoPersonal, Long> {
    Optional<PermisoPersonal> findByTenantIdAndUsuarioId(Long tenantId, Long usuarioId);
}
