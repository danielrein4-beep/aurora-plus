package com.auroraplus.core.config.repositories;

import com.auroraplus.core.config.entities.SaasMovimientoFinanciero;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface SaasMovimientoFinancieroRepository extends JpaRepository<SaasMovimientoFinanciero, Long> {

    List<SaasMovimientoFinanciero> findByFechaMovimientoBetweenOrderByFechaMovimientoDescIdDesc(LocalDate desde, LocalDate hasta);

    List<SaasMovimientoFinanciero> findByTipoAndFechaMovimientoBetweenOrderByFechaMovimientoDescIdDesc(String tipo, LocalDate desde, LocalDate hasta);

    @Query("SELECT COALESCE(SUM(m.montoUsd), 0) FROM SaasMovimientoFinanciero m WHERE m.tipo = :tipo AND m.fechaMovimiento BETWEEN :desde AND :hasta")
    BigDecimal sumMontoPorTipoYRango(@Param("tipo") String tipo, @Param("desde") LocalDate desde, @Param("hasta") LocalDate hasta);

    @Query("SELECT COALESCE(SUM(m.montoUsd), 0) FROM SaasMovimientoFinanciero m WHERE m.tipo = :tipo")
    BigDecimal sumMontoHistoricoPorTipo(@Param("tipo") String tipo);
}
