package com.auroraplus.core.auth.repositories;

import com.auroraplus.core.auth.entities.VerificacionContactoSuperAdmin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VerificacionContactoSuperAdminRepository extends JpaRepository<VerificacionContactoSuperAdmin, Long> {
    List<VerificacionContactoSuperAdmin> findByAdminIdAndCanalAndEstado(Long adminId, String canal, String estado);

    java.util.Optional<VerificacionContactoSuperAdmin> findTopByAdminIdAndCanalOrderByCreadaEnDesc(Long adminId, String canal);
}
