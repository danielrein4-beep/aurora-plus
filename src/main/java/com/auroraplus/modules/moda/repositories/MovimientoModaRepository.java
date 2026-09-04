package com.auroraplus.modules.moda.repositories;

import com.auroraplus.modules.moda.entities.MovimientoModa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MovimientoModaRepository extends JpaRepository<MovimientoModa, Long> {
    @Query("SELECT m FROM MovimientoModa m JOIN FETCH m.variante WHERE m.variante.id = :varianteId ORDER BY m.fechaRegistro DESC")
    List<MovimientoModa> findByVarianteIdOrderByFechaRegistroDesc(@Param("varianteId") Long varianteId);
}
