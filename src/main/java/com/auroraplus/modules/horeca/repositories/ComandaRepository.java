package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.Comanda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

// JpaSpecificationExecutor: habilita findAll(Specification<Comanda>, ...) —
// lo usa ReporteService para armar el filtro dinámico (fecha/método de
// pago/estado) del módulo de Reportes Operativos sin escribir una query
// distinta por cada combinación de filtros.
@Repository
public interface ComandaRepository extends JpaRepository<Comanda, Long>, JpaSpecificationExecutor<Comanda> {

    List<Comanda> findByTenantIdOrderByFechaAperturaDesc(Long tenantId);

    List<Comanda> findByTenantIdAndEstadoOrderByFechaAperturaDesc(Long tenantId, Comanda.EstadoComanda estado);

    List<Comanda> findByTenantIdAndEstadoAndFechaCierreBetween(Long tenantId, Comanda.EstadoComanda estado, LocalDateTime desde, LocalDateTime hasta);
}
