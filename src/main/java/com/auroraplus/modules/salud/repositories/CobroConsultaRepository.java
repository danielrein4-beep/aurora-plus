package com.auroraplus.modules.salud.repositories;

import com.auroraplus.modules.salud.entities.CobroConsulta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CobroConsultaRepository extends JpaRepository<CobroConsulta, Long> {

    Optional<CobroConsulta> findByClaveIdempotencia(String claveIdempotencia);

    List<CobroConsulta> findByPacienteIdOrderByFechaHoraDesc(Long pacienteId);

    List<CobroConsulta> findByFechaHoraBetweenOrderByFechaHoraDesc(LocalDateTime inicio, LocalDateTime fin);
}
