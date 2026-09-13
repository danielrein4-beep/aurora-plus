package com.auroraplus.core.financiero.repositories;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MovimientoCajaRepository extends JpaRepository<MovimientoCaja, Long> {

    @Query("SELECT COALESCE(SUM(m.monto), 0) FROM MovimientoCaja m WHERE m.tenantId = :tenantId AND m.moneda = :moneda AND m.tipo = :tipo")
    BigDecimal sumarMontoPorTipoYMoneda(@Param("tenantId") Long tenantId, @Param("moneda") String moneda, @Param("tipo") MovimientoCaja.TipoMovimiento tipo);

    /** Suma acotada a un período — la base real de un cierre de caja diario (no debe sumar todo el histórico). */
    @Query("SELECT COALESCE(SUM(m.monto), 0) FROM MovimientoCaja m WHERE m.tenantId = :tenantId AND m.moneda = :moneda "
        + "AND m.tipo = :tipo AND m.fechaRegistro > :desde AND m.fechaRegistro <= :hasta")
    BigDecimal sumarMontoPorTipoYMonedaEntreFechas(@Param("tenantId") Long tenantId, @Param("moneda") String moneda,
        @Param("tipo") MovimientoCaja.TipoMovimiento tipo, @Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    List<MovimientoCaja> findByTenantIdAndMonedaAndFechaRegistroBetweenOrderByFechaRegistroAsc(
        Long tenantId, String moneda, LocalDateTime desde, LocalDateTime hasta);

    List<MovimientoCaja> findByTenantIdOrderByFechaRegistroDesc(Long tenantId);

    List<MovimientoCaja> findByTenantIdAndTipoOrderByFechaRegistroDesc(Long tenantId, MovimientoCaja.TipoMovimiento tipo);

    /**
     * Para AlertaVencimientoCuentasJob — SIN filtro de tenant a propósito: es un job de fondo
     * (sin request/JWT, TenantContext.getCurrentTenant() es null ahí) que debe barrer TODOS los
     * tenants de una vez; cada fila trae su propio tenantId, que el job usa al crear la alerta.
     * Coincidencia exacta de fecha (no BETWEEN) — mismo criterio que
     * LicenciaTenantRepository.buscarPorVencerEn: dispara una sola vez, el día que corresponde,
     * no todos los días hasta que se pague.
     */
    List<MovimientoCaja> findByTipoAndEstadoAndFechaVencimiento(
        MovimientoCaja.TipoMovimiento tipo, String estado, LocalDate fechaVencimiento);
}
