package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.GastoGanaderia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface GastoGanaderiaRepository extends JpaRepository<GastoGanaderia, Long> {
    List<GastoGanaderia> findAllByOrderByFechaDesc();
    List<GastoGanaderia> findByTenantIdAndFechaBetween(Long tenantId, LocalDate desde, LocalDate hasta);
}
