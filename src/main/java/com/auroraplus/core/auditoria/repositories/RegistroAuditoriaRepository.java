package com.auroraplus.core.auditoria.repositories;

import com.auroraplus.core.auditoria.entities.RegistroAuditoria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RegistroAuditoriaRepository extends JpaRepository<RegistroAuditoria, Long> {

    Page<RegistroAuditoria> findByTenantIdOrderByFechaDesc(Long tenantId, Pageable pageable);

    Page<RegistroAuditoria> findByTenantIdAndModuloOrderByFechaDesc(Long tenantId, String modulo, Pageable pageable);

    Page<RegistroAuditoria> findByTenantIdAndAccionOrderByFechaDesc(Long tenantId, String accion, Pageable pageable);

    Page<RegistroAuditoria> findByTenantIdAndModuloAndAccionOrderByFechaDesc(Long tenantId, String modulo, String accion, Pageable pageable);

    Page<RegistroAuditoria> findByModuloOrderByFechaDesc(String modulo, Pageable pageable);

    Page<RegistroAuditoria> findByAccionOrderByFechaDesc(String accion, Pageable pageable);

    Page<RegistroAuditoria> findAllByOrderByFechaDesc(Pageable pageable);
}
