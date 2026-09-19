package com.auroraplus.modules.veterinaria.repositories;

import com.auroraplus.modules.veterinaria.entities.CitaVeterinaria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface CitaVeterinariaRepository extends JpaRepository<CitaVeterinaria, Long> {

    List<CitaVeterinaria> findByFecha(LocalDate fecha);

    List<CitaVeterinaria> findByVeterinarioIdAndFecha(Long veterinarioId, LocalDate fecha);

    List<CitaVeterinaria> findByMascotaId(Long mascotaId);

    List<CitaVeterinaria> findByFechaBetweenOrderByFechaAscHoraInicioAsc(LocalDate fechaInicio, LocalDate fechaFin);

    @Query("SELECT c FROM CitaVeterinaria c WHERE c.veterinarioId = :veterinarioId AND c.fecha = :fecha " +
           "AND c.estado NOT IN ('CANCELADA', 'NO_ASISTIO') " +
           "AND ((c.horaInicio < :horaFin AND c.horaFin > :horaInicio))")
    List<CitaVeterinaria> buscarSolapamientos(
            @Param("veterinarioId") Long veterinarioId,
            @Param("fecha") LocalDate fecha,
            @Param("horaInicio") LocalTime horaInicio,
            @Param("horaFin") LocalTime horaFin);
}
