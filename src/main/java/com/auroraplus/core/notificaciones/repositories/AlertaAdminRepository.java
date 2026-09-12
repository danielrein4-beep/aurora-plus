package com.auroraplus.core.notificaciones.repositories;

import com.auroraplus.core.notificaciones.entities.AlertaAdmin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertaAdminRepository extends JpaRepository<AlertaAdmin, Long> {

    List<AlertaAdmin> findByTenantIdOrderByFechaCreacionDesc(Long tenantId);

    List<AlertaAdmin> findByTenantIdAndLeidaFalseOrderByFechaCreacionDesc(Long tenantId);
}
