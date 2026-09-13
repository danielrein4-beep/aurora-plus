package com.auroraplus.modules.veterinaria.repositories;

import com.auroraplus.modules.veterinaria.entities.BloqueoAgendaVet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BloqueoAgendaVetRepository extends JpaRepository<BloqueoAgendaVet, Long> {

    List<BloqueoAgendaVet> findByVeterinarioId(Long veterinarioId);

    @Query("SELECT b FROM BloqueoAgendaVet b WHERE b.veterinarioId = :veterinarioId " +
           "AND :fecha BETWEEN b.fechaInicio AND b.fechaFin")
    List<BloqueoAgendaVet> buscarBloqueosEnFecha(
            @Param("veterinarioId") Long veterinarioId,
            @Param("fecha") LocalDate fecha);
}
