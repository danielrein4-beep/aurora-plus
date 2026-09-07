package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.Comanda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ComandaRepository extends JpaRepository<Comanda, Long> {

    List<Comanda> findByTenantIdOrderByFechaAperturaDesc(Long tenantId);

    List<Comanda> findByTenantIdAndEstadoOrderByFechaAperturaDesc(Long tenantId, Comanda.EstadoComanda estado);

    List<Comanda> findByTenantIdAndEstadoAndFechaCierreBetween(Long tenantId, Comanda.EstadoComanda estado, LocalDateTime desde, LocalDateTime hasta);
}
