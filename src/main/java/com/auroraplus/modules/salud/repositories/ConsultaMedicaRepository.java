package com.auroraplus.modules.salud.repositories;

import com.auroraplus.modules.salud.entities.ConsultaMedica;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConsultaMedicaRepository extends JpaRepository<ConsultaMedica, Long> {

    List<ConsultaMedica> findByPacienteIdOrderByFechaHoraDesc(Long pacienteId);

    List<ConsultaMedica> findByMedicoIdOrderByFechaHoraDesc(Long medicoId);

    Optional<ConsultaMedica> findByCitaId(Long citaId);

    /** Base de datos para el Canal Endémico (ver CanalEndemicoService) — todas las
     * consultas con un diagnóstico CIE-10 dado. Bajo un token de tenant normal el
     * filtro de Hibernate (TenantFilterAspect) restringe esto a SU clínica; bajo un
     * token SUPER_ADMIN el filtro nunca se activa, así que esta misma consulta
     * agrega automáticamente TODAS las clínicas de la red. */
    List<ConsultaMedica> findByDiagnosticoPrincipalCIE10(String diagnosticoPrincipalCIE10);

    interface DiagnosticoConteo {
        String getCie10();
        Long getTotal();
    }

    @Query("SELECT c.diagnosticoPrincipalCIE10 AS cie10, COUNT(c) AS total FROM ConsultaMedica c " +
           "WHERE c.diagnosticoPrincipalCIE10 IS NOT NULL AND c.diagnosticoPrincipalCIE10 <> '' " +
           "GROUP BY c.diagnosticoPrincipalCIE10 ORDER BY COUNT(c) DESC")
    List<DiagnosticoConteo> contarPorDiagnostico(Pageable pageable);
}
