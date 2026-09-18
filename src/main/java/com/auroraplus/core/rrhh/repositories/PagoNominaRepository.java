package com.auroraplus.core.rrhh.repositories;

import com.auroraplus.core.rrhh.entities.PagoNomina;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PagoNominaRepository extends JpaRepository<PagoNomina, Long> {

    List<PagoNomina> findByTenantIdOrderByFechaPagoDesc(Long tenantId);

    List<PagoNomina> findByTenantIdAndEmpleadoIdOrderByFechaPagoDesc(Long tenantId, Long empleadoId);

    /** Dos rangos [desde,hasta] se solapan si cada uno empieza antes de que el otro termine. */
    @Query("SELECT COUNT(p) > 0 FROM PagoNomina p WHERE p.empleadoId = :empleadoId " +
        "AND p.periodoDesde <= :periodoHasta AND p.periodoHasta >= :periodoDesde")
    boolean existeSolapado(@Param("empleadoId") Long empleadoId,
                            @Param("periodoDesde") LocalDate periodoDesde,
                            @Param("periodoHasta") LocalDate periodoHasta);
}
