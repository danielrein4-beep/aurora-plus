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
import java.util.Optional;

@Repository
public interface MovimientoCajaRepository extends JpaRepository<MovimientoCaja, Long> {

    /** Lee la cuenta bloqueando la fila hasta terminar la transacción: dos abonos simultáneos no pueden pasar ambos. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM MovimientoCaja m WHERE m.id = :id")
    Optional<MovimientoCaja> buscarConBloqueo(@Param("id") Long id);


    Optional<MovimientoCaja> findByIdAndTenantId(Long id, Long tenantId);

    @Query("SELECT COALESCE(SUM(m.monto), 0) FROM MovimientoCaja m WHERE m.tenantId = :tenantId AND m.moneda = :moneda AND m.tipo = :tipo")
    BigDecimal sumarMontoPorTipoYMoneda(@Param("tenantId") Long tenantId, @Param("moneda") String moneda, @Param("tipo") MovimientoCaja.TipoMovimiento tipo);

    /** Suma acotada a un período — la base real de un cierre de caja diario (no debe sumar todo el histórico). */
    @Query("SELECT COALESCE(SUM(m.monto), 0) FROM MovimientoCaja m WHERE m.tenantId = :tenantId AND m.moneda = :moneda "
        + "AND m.tipo = :tipo AND m.fechaRegistro > :desde AND m.fechaRegistro <= :hasta")
    BigDecimal sumarMontoPorTipoYMonedaEntreFechas(@Param("tenantId") Long tenantId, @Param("moneda") String moneda,
        @Param("tipo") MovimientoCaja.TipoMovimiento tipo, @Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    /**
     * Igual que la suma de arriba, pero solo el dinero físico: lo que el cajero puede contar.
     * Los pagos electrónicos (pago móvil, tarjeta, Zelle...) no están en la gaveta. Los
     * movimientos sin método (anteriores a este campo) se cuentan como efectivo, como antes.
     */
    @Query("SELECT COALESCE(SUM(m.monto), 0) FROM MovimientoCaja m WHERE m.tenantId = :tenantId AND m.moneda = :moneda "
        + "AND m.tipo = :tipo AND m.fechaRegistro > :desde AND m.fechaRegistro <= :hasta "
        + "AND (m.metodoPago IS NULL OR UPPER(m.metodoPago) LIKE '%EFECTIVO%' OR UPPER(m.metodoPago) = 'CASH')")
    BigDecimal sumarEfectivoPorTipoYMonedaEntreFechas(@Param("tenantId") Long tenantId, @Param("moneda") String moneda,
        @Param("tipo") MovimientoCaja.TipoMovimiento tipo, @Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    List<MovimientoCaja> findByTenantIdAndMonedaAndFechaRegistroBetweenOrderByFechaRegistroAsc(
        Long tenantId, String moneda, LocalDateTime desde, LocalDateTime hasta);

    List<MovimientoCaja> findByTenantIdOrderByFechaRegistroDesc(Long tenantId);

    List<MovimientoCaja> findByTenantIdAndTipoOrderByFechaRegistroDesc(Long tenantId, MovimientoCaja.TipoMovimiento tipo);

    /** Movimientos nacidos de una operación concreta (p. ej. la cuenta por cobrar de una venta). */
    List<MovimientoCaja> findByTenantIdAndTipoAndReferenciaTipoAndReferenciaId(Long tenantId, MovimientoCaja.TipoMovimiento tipo,
                                                                                String referenciaTipo, Long referenciaId);

    /** CXC/CXP pendientes (con saldo real) cuya fecha de vencimiento ya llegó o llega dentro de `hasta` — para el recordatorio automático diario. */
    @Query("SELECT m FROM MovimientoCaja m WHERE m.tipo = :tipo AND m.estado <> 'PAGADO' "
        + "AND m.saldoPendiente IS NOT NULL AND m.saldoPendiente > 0 "
        + "AND m.fechaVencimiento IS NOT NULL AND m.fechaVencimiento <= :hasta")
    List<MovimientoCaja> findPendientesConVencimientoHasta(@Param("tipo") MovimientoCaja.TipoMovimiento tipo, @Param("hasta") LocalDate hasta);

    /** Trazabilidad de la Capa 1 (docs/finance-contract.md §2.2) — total de movimientos del período, sin distinguir origen. */
    long countByTenantIdAndFechaRegistroGreaterThanEqualAndFechaRegistroLessThan(
        Long tenantId, LocalDateTime desde, LocalDateTime hastaExclusivo);

    /**
     * Movimientos con vertical identificada: moduloOrigen no nulo y distinto de "MANUAL".
     * Nunca se cuenta un movimiento sin origen como si perteneciera a alguna vertical.
     */
    @Query("SELECT COUNT(m) FROM MovimientoCaja m WHERE m.tenantId = :tenantId AND m.fechaRegistro >= :desde AND m.fechaRegistro < :hasta "
        + "AND m.moduloOrigen IS NOT NULL AND m.moduloOrigen <> 'MANUAL'")
    long contarIdentificadosEntreFechas(@Param("tenantId") Long tenantId, @Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);
}
