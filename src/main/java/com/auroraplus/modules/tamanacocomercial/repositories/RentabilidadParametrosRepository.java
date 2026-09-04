package com.auroraplus.modules.tamanacocomercial.repositories;

import com.auroraplus.modules.tamanacocomercial.entities.RentabilidadParametros;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface RentabilidadParametrosRepository extends JpaRepository<RentabilidadParametros, Long> {
    Optional<RentabilidadParametros> findByFechaInicioAndFechaFin(LocalDate fechaInicio, LocalDate fechaFin);
}
