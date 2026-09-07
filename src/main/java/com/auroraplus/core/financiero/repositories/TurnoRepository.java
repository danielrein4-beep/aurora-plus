package com.auroraplus.core.financiero.repositories;

import com.auroraplus.core.financiero.entities.Turno;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TurnoRepository extends JpaRepository<Turno, Long> {

    Optional<Turno> findByTenantIdAndMonedaAndEstado(Long tenantId, String moneda, Turno.EstadoTurno estado);

    List<Turno> findByTenantIdOrderByFechaAperturaDesc(Long tenantId);
}
