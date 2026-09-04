package com.auroraplus.modules.tamanacocomercial.repositories;

import com.auroraplus.modules.tamanacocomercial.entities.CierreSemana;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface CierreSemanaRepository extends JpaRepository<CierreSemana, Long> {
    Optional<CierreSemana> findByFechaInicioSemanaAndFechaFinSemana(LocalDate inicio, LocalDate fin);
}
