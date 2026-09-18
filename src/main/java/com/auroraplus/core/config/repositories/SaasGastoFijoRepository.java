package com.auroraplus.core.config.repositories;

import com.auroraplus.core.config.entities.SaasGastoFijo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface SaasGastoFijoRepository extends JpaRepository<SaasGastoFijo, Long> {

    List<SaasGastoFijo> findByOrderByActivoDescConceptoAsc();

    List<SaasGastoFijo> findByActivoTrue();

    @Query("SELECT COALESCE(SUM(g.montoUsd), 0) FROM SaasGastoFijo g WHERE g.activo = true AND g.periodicidad = 'MENSUAL'")
    BigDecimal sumTotalMensualActivo();
}
