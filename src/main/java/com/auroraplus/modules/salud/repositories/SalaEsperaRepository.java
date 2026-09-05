package com.auroraplus.modules.salud.repositories;

import com.auroraplus.modules.salud.entities.SalaEspera;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalaEsperaRepository extends JpaRepository<SalaEspera, Long> {

    List<SalaEspera> findByEstado(SalaEspera.EstadoEspera estado);

    List<SalaEspera> findByEstadoInOrderByHoraLlegadaAsc(List<SalaEspera.EstadoEspera> estados);

    Optional<SalaEspera> findByCitaId(Long citaId);
}
