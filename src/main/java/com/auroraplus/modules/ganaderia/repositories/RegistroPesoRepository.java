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

    /** Todos los pesajes de la finca, por animal y fecha (resumen de engorde en una sola consulta). */
    @Query("SELECT r FROM RegistroPeso r JOIN FETCH r.animal WHERE r.tenantId = :tenantId ORDER BY r.animal.id, r.fecha ASC, r.id ASC")
    List<RegistroPeso> findByTenantIdOrdenado(@Param("tenantId") Long tenantId);
}
