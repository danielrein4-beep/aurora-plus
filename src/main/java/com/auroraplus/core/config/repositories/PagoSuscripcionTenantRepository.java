package com.auroraplus.core.config.repositories;

import com.auroraplus.core.config.entities.PagoSuscripcionTenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PagoSuscripcionTenantRepository extends JpaRepository<PagoSuscripcionTenant, Long> {
    List<PagoSuscripcionTenant> findAllByOrderByFechaPagoDesc();
    List<PagoSuscripcionTenant> findByTenantIdOrderByFechaPagoDesc(Long tenantId);

    @Query("SELECT COALESCE(SUM(p.monto), 0) FROM PagoSuscripcionTenant p WHERE p.estado = 'CONFIRMADO' AND p.fechaPago >= :desde")
    BigDecimal sumarIngresosDesde(@Param("desde") LocalDateTime desde);
}
