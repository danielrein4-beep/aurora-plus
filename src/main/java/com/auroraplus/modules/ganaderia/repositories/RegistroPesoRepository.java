package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.RegistroPeso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RegistroPesoRepository extends JpaRepository<RegistroPeso, Long> {
    @Query("SELECT r FROM RegistroPeso r JOIN FETCH r.animal WHERE r.animal.id = :animalId ORDER BY r.fecha ASC")
    List<RegistroPeso> findByAnimalIdOrderByFechaAsc(@Param("animalId") Long animalId);
}
