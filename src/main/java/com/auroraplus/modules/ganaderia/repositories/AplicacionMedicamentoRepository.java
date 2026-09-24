package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.AplicacionMedicamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface AplicacionMedicamentoRepository extends JpaRepository<AplicacionMedicamento, Long> {
    @Query("SELECT a FROM AplicacionMedicamento a JOIN FETCH a.animal JOIN FETCH a.medicamento WHERE a.animal.id = :animalId ORDER BY a.fechaAplicacion DESC")
    List<AplicacionMedicamento> findByAnimalIdOrderByFechaAplicacionDesc(@Param("animalId") Long animalId);

    @Query("SELECT a FROM AplicacionMedicamento a JOIN FETCH a.animal JOIN FETCH a.medicamento WHERE a.tenantId = :tenantId AND a.fechaFinRetiroLeche >= :hoy AND a.fechaFinRetiroLeche > a.fechaAplicacion")
    List<AplicacionMedicamento> findConRetiroLecheActivo(@Param("tenantId") Long tenantId, @Param("hoy") LocalDate hoy);

    @Query("SELECT a FROM AplicacionMedicamento a JOIN FETCH a.animal JOIN FETCH a.medicamento WHERE a.tenantId = :tenantId AND a.fechaFinRetiroCarne >= :hoy AND a.fechaFinRetiroCarne > a.fechaAplicacion")
    List<AplicacionMedicamento> findConRetiroCarneActivo(@Param("tenantId") Long tenantId, @Param("hoy") LocalDate hoy);

    /** Todo lo de la finca de una vez (margen por animal): evita una consulta por animal. */
    List<AplicacionMedicamento> findByTenantId(Long tenantId);
}
