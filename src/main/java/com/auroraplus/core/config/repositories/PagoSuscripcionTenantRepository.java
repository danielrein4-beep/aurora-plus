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

    // Solo dólares: antes sumaba bolívares y pesos como si fueran dólares e inflaba los ingresos.
    @Query("SELECT COALESCE(SUM(p.monto), 0) FROM PagoSuscripcionTenant p WHERE p.estado = 'CONFIRMADO' AND p.moneda IN ('USD', 'USDT') AND p.fechaPago >= :desde")
    BigDecimal sumarIngresosDesde(@Param("desde") LocalDateTime desde);

    @Query("SELECT COALESCE(SUM(p.monto), 0) FROM PagoSuscripcionTenant p WHERE p.estado = 'CONFIRMADO' AND p.moneda IN ('USD', 'USDT') AND p.fechaPago >= :desde AND p.fechaPago <= :hasta")
    BigDecimal sumarIngresosRango(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);
}
