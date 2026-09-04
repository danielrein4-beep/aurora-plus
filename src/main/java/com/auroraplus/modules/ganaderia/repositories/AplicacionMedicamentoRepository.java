package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.AplicacionMedicamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AplicacionMedicamentoRepository extends JpaRepository<AplicacionMedicamento, Long> {
    @Query("SELECT a FROM AplicacionMedicamento a JOIN FETCH a.animal JOIN FETCH a.medicamento WHERE a.animal.id = :animalId ORDER BY a.fechaAplicacion DESC")
    List<AplicacionMedicamento> findByAnimalIdOrderByFechaAplicacionDesc(@Param("animalId") Long animalId);
}
