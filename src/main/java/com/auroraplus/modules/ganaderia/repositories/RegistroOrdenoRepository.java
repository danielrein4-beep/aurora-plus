package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.RegistroOrdeno;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface RegistroOrdenoRepository extends JpaRepository<RegistroOrdeno, Long> {
    @Query("SELECT r FROM RegistroOrdeno r JOIN FETCH r.animal WHERE r.animal.id = :animalId ORDER BY r.fecha DESC")
    List<RegistroOrdeno> findByAnimalIdOrderByFechaDesc(@Param("animalId") Long animalId);

    @Query("SELECT r FROM RegistroOrdeno r JOIN FETCH r.animal WHERE r.tenantId = :tenantId AND r.fecha BETWEEN :desde AND :hasta ORDER BY r.fecha DESC")
    List<RegistroOrdeno> findByTenantIdAndFechaBetween(@Param("tenantId") Long tenantId, @Param("desde") LocalDate desde, @Param("hasta") LocalDate hasta);
}
