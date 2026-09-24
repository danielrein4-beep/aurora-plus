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

    /** Bloquea la comanda mientras se cobra: dos terminales no pueden cobrar la misma mesa a la vez. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT c FROM Comanda c WHERE c.id = :id")
    java.util.Optional<Comanda> buscarConBloqueo(@org.springframework.data.repository.query.Param("id") Long id);


    List<Comanda> findByTenantIdOrderByFechaAperturaDesc(Long tenantId);

    List<Comanda> findByTenantIdAndEstadoOrderByFechaAperturaDesc(Long tenantId, Comanda.EstadoComanda estado);

    List<Comanda> findByTenantIdAndEstadoAndFechaCierreBetween(Long tenantId, Comanda.EstadoComanda estado, LocalDateTime desde, LocalDateTime hasta);

    // Historial de tickets de un cliente puntual (CRM) — para las métricas
    // agregadas (total gastado, visitas, última compra) y el listado de
    // tickets en su panel de detalle.
    List<Comanda> findByTenantIdAndClienteIdAndEstadoOrderByFechaCierreDesc(Long tenantId, Long clienteId, Comanda.EstadoComanda estado);
}
