package com.auroraplus.modules.salud.repositories;

import com.auroraplus.modules.salud.entities.CobroConsulta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CobroConsultaRepository extends JpaRepository<CobroConsulta, Long> {

    Optional<CobroConsulta> findByTenantIdAndClaveIdempotencia(Long tenantId, String claveIdempotencia);

    List<CobroConsulta> findByTenantIdAndPacienteIdOrderByFechaHoraDesc(Long tenantId, Long pacienteId);

    List<CobroConsulta> findByTenantIdAndFechaHoraBetweenOrderByFechaHoraDesc(Long tenantId, LocalDateTime inicio, LocalDateTime fin);
}
