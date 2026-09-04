package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.MovimientoInsumo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MovimientoInsumoRepository extends JpaRepository<MovimientoInsumo, Long> {
    @Query("SELECT m FROM MovimientoInsumo m JOIN FETCH m.insumo WHERE m.insumo.id = :insumoId ORDER BY m.fechaRegistro DESC")
    List<MovimientoInsumo> findByInsumoIdOrderByFechaRegistroDesc(@Param("insumoId") Long insumoId);
}
