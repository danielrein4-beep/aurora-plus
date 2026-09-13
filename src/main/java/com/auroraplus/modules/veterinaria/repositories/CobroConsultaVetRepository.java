package com.auroraplus.modules.veterinaria.repositories;

import com.auroraplus.modules.veterinaria.entities.CobroConsultaVet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CobroConsultaVetRepository extends JpaRepository<CobroConsultaVet, Long> {

    Optional<CobroConsultaVet> findByClaveIdempotencia(String claveIdempotencia);

    List<CobroConsultaVet> findByMascotaIdOrderByFechaHoraDesc(Long mascotaId);

    List<CobroConsultaVet> findByPropietarioIdOrderByFechaHoraDesc(Long propietarioId);

    List<CobroConsultaVet> findByFechaHoraBetweenOrderByFechaHoraDesc(LocalDateTime inicio, LocalDateTime fin);
}
