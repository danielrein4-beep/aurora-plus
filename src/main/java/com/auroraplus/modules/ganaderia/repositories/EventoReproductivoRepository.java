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
}
