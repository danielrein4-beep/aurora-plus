package com.auroraplus.modules.salud.laboratorio.repositories;

import com.auroraplus.modules.salud.laboratorio.entities.ExamenRecibidoPaciente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamenRecibidoPacienteRepository extends JpaRepository<ExamenRecibidoPaciente, Long> {

    // No leídos primero, luego más reciente primero — mismo criterio "estilo
    // Gmail" que pidió el doctor para el inbox.
    List<ExamenRecibidoPaciente> findByTenantIdOrderByLeidoAscFechaHoraRecepcionDesc(Long tenantId);

    List<ExamenRecibidoPaciente> findByTenantIdAndPacienteIdOrderByFechaHoraRecepcionDesc(Long tenantId, Long pacienteId);

    long countByTenantIdAndLeidoFalse(Long tenantId);
}
