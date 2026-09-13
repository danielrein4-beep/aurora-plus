package com.auroraplus.modules.veterinaria.repositories;

import com.auroraplus.modules.veterinaria.entities.SalaEsperaVet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface SalaEsperaVetRepository extends JpaRepository<SalaEsperaVet, Long> {

    List<SalaEsperaVet> findByEstadoInOrderByHoraLlegadaAsc(Collection<SalaEsperaVet.EstadoEspera> estados);
}
