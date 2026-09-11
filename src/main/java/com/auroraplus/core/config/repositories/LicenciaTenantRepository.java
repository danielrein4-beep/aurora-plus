package com.auroraplus.core.config.repositories;

import com.auroraplus.core.config.entities.LicenciaTenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface LicenciaTenantRepository extends JpaRepository<LicenciaTenant, Long> {
    Optional<LicenciaTenant> findByTenantId(Long tenantId);

    @Query("SELECT COALESCE(MAX(l.tenantId), 0) FROM LicenciaTenant l")
    Long buscarMaximoTenantId();

    // Vence exactamente en esa fecha (no "antes de") a propósito — así el aviso se manda una
    // sola vez, el día que corresponde, en vez de reenviarse todos los días hasta el vencimiento.
    @Query("SELECT l FROM LicenciaTenant l WHERE l.activa = true AND l.fechaVencimientoPago = :fecha AND l.emailContacto IS NOT NULL")
    List<LicenciaTenant> buscarPorVencerEn(@Param("fecha") LocalDate fecha);
}
