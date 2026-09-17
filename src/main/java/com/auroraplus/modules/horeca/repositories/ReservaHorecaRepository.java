package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.ReservaHoreca;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReservaHorecaRepository extends JpaRepository<ReservaHoreca, Long> {

    List<ReservaHoreca> findByTenantIdAndFechaHoraBetweenOrderByFechaHoraAsc(Long tenantId, LocalDateTime desde, LocalDateTime hasta);
}
