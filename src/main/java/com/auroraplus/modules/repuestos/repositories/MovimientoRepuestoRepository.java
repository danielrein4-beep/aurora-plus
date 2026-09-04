package com.auroraplus.modules.repuestos.repositories;

import com.auroraplus.modules.repuestos.entities.MovimientoRepuesto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MovimientoRepuestoRepository extends JpaRepository<MovimientoRepuesto, Long> {

    // JOIN FETCH: sin esto, "repuesto" llega null en el kárdex (Hibernate6Module
    // devuelve null en vez de reventar para un proxy LAZY no inicializado), y un
    // kárdex real necesita mostrar el SKU/descripción sin una consulta aparte.
    @Query("SELECT m FROM MovimientoRepuesto m JOIN FETCH m.repuesto WHERE m.repuesto.id = :repuestoId ORDER BY m.fechaRegistro DESC")
    List<MovimientoRepuesto> findByRepuestoIdOrderByFechaRegistroDesc(@Param("repuestoId") Long repuestoId);
}
