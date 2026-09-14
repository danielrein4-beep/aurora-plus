package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.RegistroAsistencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

// Bean nombrado explícitamente: ya existe core.rrhh.repositories.RegistroAsistenciaRepository.
@Repository("personalRegistroAsistenciaRepository")
public interface RegistroAsistenciaRepository extends JpaRepository<RegistroAsistencia, Long> {
    List<RegistroAsistencia> findByTenantIdAndEmpleadoId(Long tenantId, Long empleadoId);

    Optional<RegistroAsistencia> findFirstByTenantIdAndEmpleadoIdAndFechaHoraSalidaIsNullOrderByFechaHoraEntradaDesc(
        Long tenantId, Long empleadoId);

    List<RegistroAsistencia> findByTenantIdAndEmpleadoIdAndFechaHoraEntradaGreaterThanEqualAndFechaHoraEntradaLessThan(
        Long tenantId, Long empleadoId, LocalDateTime desde, LocalDateTime hastaExclusivo);

    List<RegistroAsistencia> findByTenantIdAndFechaHoraEntradaGreaterThanEqualAndFechaHoraEntradaLessThanOrderByFechaHoraEntradaDesc(
        Long tenantId, LocalDateTime desde, LocalDateTime hastaExclusivo);

    /**
     * UPDATE atómico condicionado a "sigue abierto" — la única forma correcta de resolver "dos
     * salidas concurrentes sobre el MISMO registro": el motor de base de datos toma el lock de
     * fila al evaluar el WHERE, así que una segunda transacción concurrente queda bloqueada hasta
     * que la primera confirma, y al reintentar su propio WHERE ya no encuentra
     * fecha_hora_salida IS NULL (la primera ya la cerró) — devuelve 0 filas afectadas en vez de
     * pisar el valor ya guardado. Portable entre H2 y PostgreSQL: es SQL estándar, no depende de
     * sintaxis específica de un motor. clearAutomatically=true para que un findById posterior en
     * la misma transacción relea el estado real de la base y no el objeto ya obsoleto en cache
     * de primer nivel.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE RegistroAsistenciaPersonal r SET r.fechaHoraSalida = :salida, r.marcadorEntradaAbierta = NULL "
        + "WHERE r.id = :id AND r.tenantId = :tenantId AND r.fechaHoraSalida IS NULL")
    int cerrarSiSigueAbierto(@Param("id") Long id, @Param("tenantId") Long tenantId, @Param("salida") LocalDateTime salida);
}
