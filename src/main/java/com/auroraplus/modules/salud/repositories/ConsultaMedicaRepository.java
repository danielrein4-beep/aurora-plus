package com.auroraplus.modules.salud.repositories;

import com.auroraplus.modules.salud.entities.ConsultaMedica;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConsultaMedicaRepository extends JpaRepository<ConsultaMedica, Long> {

    List<ConsultaMedica> findByPacienteIdOrderByFechaHoraDesc(Long pacienteId);

    List<ConsultaMedica> findByMedicoIdOrderByFechaHoraDesc(Long medicoId);

    Optional<ConsultaMedica> findByCitaId(Long citaId);
}
