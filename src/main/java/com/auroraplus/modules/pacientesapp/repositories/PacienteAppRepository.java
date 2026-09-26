package com.auroraplus.modules.pacientesapp.repositories;

import com.auroraplus.modules.pacientesapp.entities.PacienteApp;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PacienteAppRepository extends JpaRepository<PacienteApp, Long> {
    Optional<PacienteApp> findByCedula(String cedula);
}
