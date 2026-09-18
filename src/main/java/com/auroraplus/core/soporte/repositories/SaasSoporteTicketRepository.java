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
}
