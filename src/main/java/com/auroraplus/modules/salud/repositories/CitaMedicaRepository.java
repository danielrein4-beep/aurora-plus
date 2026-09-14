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

    /** Job interno de recordatorios: recorre tenants para enviar los avisos programados.
     * No se expone a ningún controller ni debe reutilizarse para peticiones de usuario. */
    List<CitaMedica> findByFecha(LocalDate fecha);

    List<CitaMedica> findByTenantIdAndFecha(Long tenantId, LocalDate fecha);

    List<CitaMedica> findByTenantIdAndMedicoIdAndFecha(Long tenantId, Long medicoId, LocalDate fecha);

    List<CitaMedica> findByTenantIdAndPacienteIdOrderByFechaDescHoraInicioDesc(Long tenantId, Long pacienteId);

    List<CitaMedica> findByTenantIdAndFechaBetween(Long tenantId, LocalDate inicio, LocalDate fin);

    java.util.Optional<CitaMedica> findByTenantIdAndId(Long tenantId, Long id);

    @Query("SELECT c FROM CitaMedica c WHERE c.tenantId = :tenantId AND c.medicoId = :medicoId AND c.fecha = :fecha " +
           "AND c.estado NOT IN ('CANCELADA', 'NO_ASISTIO') " +
           "AND ((c.horaInicio < :horaFin AND c.horaFin > :horaInicio))")
    List<CitaMedica> buscarSolapamientos(@Param("tenantId") Long tenantId,
                                         @Param("medicoId") Long medicoId,
                                         @Param("fecha") LocalDate fecha,
                                         @Param("horaInicio") LocalTime horaInicio,
                                         @Param("horaFin") LocalTime horaFin);
}
