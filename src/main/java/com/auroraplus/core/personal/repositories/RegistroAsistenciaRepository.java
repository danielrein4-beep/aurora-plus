package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.RegistroAsistencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

// Bean nombrado explícitamente: ya existe core.rrhh.repositories.RegistroAsistenciaRepository.
@Repository("personalRegistroAsistenciaRepository")
public interface RegistroAsistenciaRepository extends JpaRepository<RegistroAsistencia, Long> {
    List<RegistroAsistencia> findByTenantIdAndEmpleadoId(Long tenantId, Long empleadoId);

    List<RegistroAsistencia> findByTenantIdAndEmpleadoIdAndFechaHoraEntradaGreaterThanEqualAndFechaHoraEntradaLessThan(
        Long tenantId, Long empleadoId, LocalDateTime desde, LocalDateTime hastaExclusivo);
}
