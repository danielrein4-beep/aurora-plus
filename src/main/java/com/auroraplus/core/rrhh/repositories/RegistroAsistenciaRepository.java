package com.auroraplus.core.rrhh.repositories;

import com.auroraplus.core.rrhh.entities.RegistroAsistencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RegistroAsistenciaRepository extends JpaRepository<RegistroAsistencia, Long> {

    @Query("SELECT r FROM RegistroAsistencia r JOIN FETCH r.empleado WHERE r.empleado.id = :empleadoId AND r.fechaCheckOut IS NULL")
    Optional<RegistroAsistencia> findTurnoAbierto(@Param("empleadoId") Long empleadoId);

    @Query("SELECT r FROM RegistroAsistencia r JOIN FETCH r.empleado WHERE r.empleado.id = :empleadoId ORDER BY r.fechaCheckIn DESC")
    List<RegistroAsistencia> findByEmpleadoIdOrderByFechaCheckInDesc(@Param("empleadoId") Long empleadoId);

    @Query("SELECT r FROM RegistroAsistencia r JOIN FETCH r.empleado WHERE r.tenantId = :tenantId AND r.fechaCheckIn BETWEEN :desde AND :hasta ORDER BY r.fechaCheckIn ASC")
    List<RegistroAsistencia> findByTenantIdAndFechaCheckInBetween(@Param("tenantId") Long tenantId, @Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);
}
