package com.auroraplus.modules.salud.repositories;

import com.auroraplus.modules.salud.entities.BloqueoAgenda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BloqueoAgendaRepository extends JpaRepository<BloqueoAgenda, Long> {

    List<BloqueoAgenda> findByMedicoId(Long medicoId);

    @Query("SELECT b FROM BloqueoAgenda b WHERE b.medicoId = :medicoId " +
           "AND b.fechaInicio <= :fecha AND b.fechaFin >= :fecha")
    List<BloqueoAgenda> buscarBloqueosEnFecha(@Param("medicoId") Long medicoId,
                                             @Param("fecha") LocalDate fecha);
}
