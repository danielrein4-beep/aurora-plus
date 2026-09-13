package com.auroraplus.modules.veterinaria.repositories;

import com.auroraplus.modules.veterinaria.entities.ConsultaVeterinaria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ConsultaVeterinariaRepository extends JpaRepository<ConsultaVeterinaria, Long> {

    List<ConsultaVeterinaria> findByMascotaIdOrderByFechaHoraDesc(Long mascotaId);

    List<ConsultaVeterinaria> findByVeterinarioIdOrderByFechaHoraDesc(Long veterinarioId);

    List<ConsultaVeterinaria> findByTenantIdAndMascotaIdOrderByFechaHoraDesc(Long tenantId, Long mascotaId);

    @Query("SELECT c FROM ConsultaVeterinaria c WHERE c.fechaHora BETWEEN :inicio AND :fin ORDER BY c.fechaHora DESC")
    List<ConsultaVeterinaria> buscarPorRangoFechas(@Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);
}
