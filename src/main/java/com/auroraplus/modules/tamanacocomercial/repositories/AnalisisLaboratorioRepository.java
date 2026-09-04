package com.auroraplus.modules.tamanacocomercial.repositories;

import com.auroraplus.modules.tamanacocomercial.entities.AnalisisLaboratorio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AnalisisLaboratorioRepository extends JpaRepository<AnalisisLaboratorio, Long> {
    List<AnalisisLaboratorio> findByFechaMuestraBetweenOrderByFechaMuestraDesc(LocalDate desde, LocalDate hasta);
    List<AnalisisLaboratorio> findByMinaIgnoreCaseOrderByFechaMuestraDesc(String mina);
    Optional<AnalisisLaboratorio> findTopByMinaOrderByFechaAnalisisDesc(String mina);
    Optional<AnalisisLaboratorio> findFirstByMinaIgnoreCaseAndFechaMuestraBetweenOrderByFechaMuestraDesc(String mina, LocalDate desde, LocalDate hasta);
    Optional<AnalisisLaboratorio> findFirstByMinaIgnoreCaseAndFechaAnalisisBetweenOrderByFechaAnalisisDesc(String mina, LocalDate desde, LocalDate hasta);
}
