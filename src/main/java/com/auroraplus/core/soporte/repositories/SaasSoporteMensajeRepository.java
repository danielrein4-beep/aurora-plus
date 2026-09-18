package com.auroraplus.core.soporte.repositories;

import com.auroraplus.core.soporte.entities.SaasSoporteMensaje;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SaasSoporteMensajeRepository extends JpaRepository<SaasSoporteMensaje, Long> {
    List<SaasSoporteMensaje> findByTicketIdOrderByFechaEnvioAsc(Long ticketId);
    long countByTicketIdAndEmisorTipoAndLeidoPorDestinatarioFalse(Long ticketId, String emisorTipo);
}
