package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.AsignacionEmpleado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AsignacionEmpleadoRepository extends JpaRepository<AsignacionEmpleado, Long> {
    List<AsignacionEmpleado> findByTenantIdAndEmpleadoId(Long tenantId, Long empleadoId);

    Optional<AsignacionEmpleado> findByTenantIdAndEmpleadoIdAndVigenciaHastaIsNull(Long tenantId, Long empleadoId);

    /** Resuelve la asignación vigente A LA FECHA dada — nunca "la más reciente sin importar fecha" (ver contrato §3). */
    @Query("SELECT a FROM AsignacionEmpleado a WHERE a.tenantId = :tenantId AND a.empleadoId = :empleadoId "
        + "AND a.vigenciaDesde <= :fecha AND (a.vigenciaHasta IS NULL OR a.vigenciaHasta >= :fecha)")
    Optional<AsignacionEmpleado> buscarVigenteEn(@Param("tenantId") Long tenantId, @Param("empleadoId") Long empleadoId, @Param("fecha") LocalDate fecha);
}
