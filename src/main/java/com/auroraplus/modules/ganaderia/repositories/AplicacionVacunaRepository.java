package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.AplicacionVacuna;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface AplicacionVacunaRepository extends JpaRepository<AplicacionVacuna, Long> {
    @Query("SELECT a FROM AplicacionVacuna a JOIN FETCH a.animal JOIN FETCH a.vacuna WHERE a.animal.id = :animalId ORDER BY a.fechaAplicacion DESC")
    List<AplicacionVacuna> findByAnimalIdOrderByFechaAplicacionDesc(@Param("animalId") Long animalId);

    @Query("SELECT a FROM AplicacionVacuna a JOIN FETCH a.animal JOIN FETCH a.vacuna WHERE a.tenantId = :tenantId AND a.fechaProximaDosis BETWEEN :desde AND :hasta ORDER BY a.fechaProximaDosis ASC")
    List<AplicacionVacuna> findRefuerzosPendientes(@Param("tenantId") Long tenantId, @Param("desde") LocalDate desde, @Param("hasta") LocalDate hasta);

    // Retiro sanitario todavía activo (el animal aún no es apto para venta/consumo de leche o carne) —
    // base de las alertas de cumplimiento sanitario (ver GanaderiaSanidadService).
    @Query("SELECT a FROM AplicacionVacuna a JOIN FETCH a.animal JOIN FETCH a.vacuna WHERE a.tenantId = :tenantId AND a.fechaFinRetiroLeche >= :hoy")
    List<AplicacionVacuna> findConRetiroLecheActivo(@Param("tenantId") Long tenantId, @Param("hoy") LocalDate hoy);

    @Query("SELECT a FROM AplicacionVacuna a JOIN FETCH a.animal JOIN FETCH a.vacuna WHERE a.tenantId = :tenantId AND a.fechaFinRetiroCarne >= :hoy")
    List<AplicacionVacuna> findConRetiroCarneActivo(@Param("tenantId") Long tenantId, @Param("hoy") LocalDate hoy);
}
