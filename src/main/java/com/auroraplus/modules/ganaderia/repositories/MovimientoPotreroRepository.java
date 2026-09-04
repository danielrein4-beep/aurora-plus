package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.MovimientoPotrero;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MovimientoPotreroRepository extends JpaRepository<MovimientoPotrero, Long> {
    @Query("SELECT m FROM MovimientoPotrero m JOIN FETCH m.animal WHERE m.animal.id = :animalId ORDER BY m.fechaRegistro DESC")
    List<MovimientoPotrero> findByAnimalIdOrderByFechaRegistroDesc(@Param("animalId") Long animalId);
}
