package com.auroraplus.modules.pacientesapp.repositories;

import com.auroraplus.modules.pacientesapp.entities.VinculoPacienteApp;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface VinculoPacienteAppRepository extends JpaRepository<VinculoPacienteApp, Long> {
    List<VinculoPacienteApp> findByPacienteAppId(Long pacienteAppId);
    Optional<VinculoPacienteApp> findByPacienteAppIdAndTenantId(Long pacienteAppId, Long tenantId);
}
