package com.auroraplus.modules.pacientesapp.repositories;

import com.auroraplus.modules.pacientesapp.entities.SolicitudCitaApp;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SolicitudCitaAppRepository extends JpaRepository<SolicitudCitaApp, Long> {
    List<SolicitudCitaApp> findByPacienteIdOrderByFechaDescHoraInicioDesc(Long pacienteAppId);
    Optional<SolicitudCitaApp> findByIdAndPacienteId(Long id, Long pacienteAppId);
    Optional<SolicitudCitaApp> findByIdAndTenantId(Long id, Long tenantId);
    List<SolicitudCitaApp> findByTenantIdAndEstadoInOrderByFechaAscHoraInicioAsc(Long tenantId, Collection<SolicitudCitaApp.Estado> estados);
    List<SolicitudCitaApp> findByTenantIdAndFechaAndEstado(Long tenantId, LocalDate fecha, SolicitudCitaApp.Estado estado);
    long countByPacienteIdAndEstado(Long pacienteAppId, SolicitudCitaApp.Estado estado);
}
