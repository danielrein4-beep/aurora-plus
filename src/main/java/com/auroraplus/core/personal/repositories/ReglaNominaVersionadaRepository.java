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

    /**
     * La versión ACTUALMENTE abierta (vigenciaHasta IS NULL) de esta combinación exacta
     * (tenantId, conceptoId, tipoRegla) — usada al crear una nueva versión, para cerrar SOLO la
     * anterior de ESTE concepto+tipo. Hallazgo de la revisión de Codex: la query anterior
     * filtraba solo por tipoRegla, así que dos ConceptoNomina con el mismo tipoRegla (ej. dos
     * deducciones "PORCENTAJE_DEL_SUELDO" distintas) se invalidaban mutuamente — crear una
     * versión nueva para el concepto B cerraba por error la regla vigente del concepto A.
     * conceptoId null se compara con IS NULL explícito (las reglas generales sin concepto,
     * ej. DIAS_VACACIONES_ANUAL, no deben chocar entre sí ni con las de concepto).
     */
    @Query("SELECT r FROM ReglaNominaVersionada r WHERE r.tenantId = :tenantId AND r.tipoRegla = :tipoRegla "
        + "AND ((:conceptoId IS NULL AND r.conceptoId IS NULL) OR r.conceptoId = :conceptoId) "
        + "AND r.vigenciaHasta IS NULL")
    Optional<ReglaNominaVersionada> buscarVigenteAbiertaPorConceptoYTipo(
        @Param("tenantId") Long tenantId, @Param("conceptoId") Long conceptoId, @Param("tipoRegla") String tipoRegla);

    /**
     * La regla GENERAL (sin concepto) vigente A LA FECHA dada — nunca "la más reciente sin
     * importar fecha" (contrato §3). r.conceptoId IS NULL explícito: sin esto, una regla de
     * concepto que comparta tipoRegla (ej. dos "PORCENTAJE_DEL_SUELDO", una general y otra de un
     * ConceptoNomina puntual) podría mezclarse aquí — mismo hallazgo de fondo que
     * buscarVigenteAbiertaPorConceptoYTipo.
     */
    @Query("SELECT r FROM ReglaNominaVersionada r WHERE r.tenantId = :tenantId AND r.tipoRegla = :tipoRegla AND r.conceptoId IS NULL "
        + "AND r.vigenciaDesde <= :fecha AND (r.vigenciaHasta IS NULL OR r.vigenciaHasta >= :fecha) "
        + "ORDER BY r.vigenciaDesde DESC")
    List<ReglaNominaVersionada> buscarVigentesEn(@Param("tenantId") Long tenantId, @Param("tipoRegla") String tipoRegla, @Param("fecha") LocalDate fecha);

    /** Igual criterio que buscarVigentesEn, pero para reglas atadas a un ConceptoNomina puntual (deducciones/aportes). */
    @Query("SELECT r FROM ReglaNominaVersionada r WHERE r.tenantId = :tenantId AND r.conceptoId = :conceptoId "
        + "AND r.vigenciaDesde <= :fecha AND (r.vigenciaHasta IS NULL OR r.vigenciaHasta >= :fecha) "
        + "ORDER BY r.vigenciaDesde DESC")
    List<ReglaNominaVersionada> buscarVigentesPorConceptoEn(@Param("tenantId") Long tenantId, @Param("conceptoId") Long conceptoId, @Param("fecha") LocalDate fecha);
}
