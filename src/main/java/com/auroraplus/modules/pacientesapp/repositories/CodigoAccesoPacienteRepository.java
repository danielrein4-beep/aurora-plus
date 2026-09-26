package com.auroraplus.modules.pacientesapp.repositories;

import com.auroraplus.modules.pacientesapp.entities.CodigoAccesoPaciente;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.Optional;

public interface CodigoAccesoPacienteRepository extends JpaRepository<CodigoAccesoPaciente, Long> {
    Optional<CodigoAccesoPaciente> findFirstByCedulaAndUsadoFalseOrderByCreadoEnDesc(String cedula);
    long countByCedulaAndCreadoEnAfter(String cedula, LocalDateTime desde);
}
