package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.ReglaNominaVersionada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReglaNominaVersionadaRepository extends JpaRepository<ReglaNominaVersionada, Long> {

    List<ReglaNominaVersionada> findByTenantIdAndTipoReglaOrderByVigenciaDesdeDesc(Long tenantId, String tipoRegla);

    Optional<ReglaNominaVersionada> findByTenantIdAndTipoReglaAndVigenciaHastaIsNull(Long tenantId, String tipoRegla);

    /**
     * La regla vigente A LA FECHA dada — nunca "la más reciente sin importar fecha" (contrato
     * §3). ORDER BY + límite implícito por unicidad de rangos: no deberían solaparse dos
     * vigencias del mismo tipoRegla, pero se ordena por si acaso para quedarnos con la más
     * reciente que aplique.
     */
    @Query("SELECT r FROM ReglaNominaVersionada r WHERE r.tenantId = :tenantId AND r.tipoRegla = :tipoRegla "
        + "AND r.vigenciaDesde <= :fecha AND (r.vigenciaHasta IS NULL OR r.vigenciaHasta >= :fecha) "
        + "ORDER BY r.vigenciaDesde DESC")
    List<ReglaNominaVersionada> buscarVigentesEn(@Param("tenantId") Long tenantId, @Param("tipoRegla") String tipoRegla, @Param("fecha") LocalDate fecha);

    /** Igual criterio que buscarVigentesEn, pero para reglas atadas a un ConceptoNomina puntual (deducciones/aportes). */
    @Query("SELECT r FROM ReglaNominaVersionada r WHERE r.tenantId = :tenantId AND r.conceptoId = :conceptoId "
        + "AND r.vigenciaDesde <= :fecha AND (r.vigenciaHasta IS NULL OR r.vigenciaHasta >= :fecha) "
        + "ORDER BY r.vigenciaDesde DESC")
    List<ReglaNominaVersionada> buscarVigentesPorConceptoEn(@Param("tenantId") Long tenantId, @Param("conceptoId") Long conceptoId, @Param("fecha") LocalDate fecha);
}
