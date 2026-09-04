package com.auroraplus.modules.tamanacocomercial.repositories;

import com.auroraplus.modules.tamanacocomercial.entities.Nomina;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface NominaRepository extends JpaRepository<Nomina, Long> {
    Optional<Nomina> findByMinaIgnoreCaseAndFechaInicioAndFechaFin(String mina, LocalDate fechaInicio, LocalDate fechaFin);
}
