package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.EventoReproductivo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EventoReproductivoRepository extends JpaRepository<EventoReproductivo, Long> {
    @Query("SELECT e FROM EventoReproductivo e JOIN FETCH e.hembra WHERE e.hembra.id = :hembraId ORDER BY e.fecha DESC")
    List<EventoReproductivo> findByHembraIdOrderByFechaDesc(@Param("hembraId") Long hembraId);

    /** Servicios y diagnósticos de las hembras preñadas activas, el más reciente primero (para saber de qué padrote está cada una). */
    @Query("SELECT e FROM EventoReproductivo e JOIN FETCH e.hembra h LEFT JOIN FETCH e.semental " +
           "WHERE e.tenantId = :tenantId AND h.tenantId = :tenantId AND h.estado = 'ACTIVO' AND h.estadoReproductivo = 'PREÑADA' " +
           "AND e.tipo IN ('SERVICIO', 'DIAGNOSTICO_PRENEZ') ORDER BY e.fecha DESC, e.id DESC")
    List<EventoReproductivo> findEventosPrenezActual(@Param("tenantId") Long tenantId);

    List<EventoReproductivo> findByTenantIdAndFechaProbablePartoBetween(Long tenantId, java.time.LocalDate desde, java.time.LocalDate hasta);
}
