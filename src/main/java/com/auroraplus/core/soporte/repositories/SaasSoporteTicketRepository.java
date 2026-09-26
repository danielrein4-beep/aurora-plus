package com.auroraplus.core.soporte.repositories;

import com.auroraplus.core.soporte.entities.SaasSoporteTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SaasSoporteTicketRepository extends JpaRepository<SaasSoporteTicket, Long> {
    List<SaasSoporteTicket> findAllByOrderByFechaActualizacionDesc();
    List<SaasSoporteTicket> findByTenantIdOrderByFechaActualizacionDesc(Long tenantId);
    List<SaasSoporteTicket> findByEstadoOrderByFechaActualizacionDesc(String estado);

    /** Pagos reportados por el cliente que el equipo de Aurora aún no ha verificado. */
    boolean existsByTenantIdAndCategoriaAndEstadoInAndFechaCreacionAfter(Long tenantId, String categoria,
                                                                        java.util.Collection<String> estados, java.time.LocalDateTime desde);

    List<SaasSoporteTicket> findByCategoriaAndEstadoInOrderByFechaCreacionAsc(String categoria, java.util.Collection<String> estados);
}
