package com.auroraplus.modules.salud.repositories;

import com.auroraplus.modules.salud.entities.CitaMedica;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface CitaMedicaRepository extends JpaRepository<CitaMedica, Long> {

    List<CitaMedica> findByFecha(LocalDate fecha);

    List<CitaMedica> findByMedicoIdAndFecha(Long medicoId, LocalDate fecha);

    List<CitaMedica> findByPacienteIdOrderByFechaDescHoraInicioDesc(Long pacienteId);

    List<CitaMedica> findByFechaBetween(LocalDate inicio, LocalDate fin);

    @Query("SELECT c FROM CitaMedica c WHERE c.medicoId = :medicoId AND c.fecha = :fecha " +
           "AND c.estado NOT IN ('CANCELADA', 'NO_ASISTIO') " +
           "AND ((c.horaInicio < :horaFin AND c.horaFin > :horaInicio))")
    List<CitaMedica> buscarSolapamientos(@Param("medicoId") Long medicoId,
                                         @Param("fecha") LocalDate fecha,
                                         @Param("horaInicio") LocalTime horaInicio,
                                         @Param("horaFin") LocalTime horaFin);
}
