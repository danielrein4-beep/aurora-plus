package com.auroraplus.modules.veterinaria.repositories;

import com.auroraplus.modules.veterinaria.entities.Mascota;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MascotaRepository extends JpaRepository<Mascota, Long> {

    List<Mascota> findByActivoTrue();

    List<Mascota> findByTenantIdAndActivoTrue(Long tenantId);

    List<Mascota> findByPropietarioIdAndActivoTrue(Long propietarioId);

    List<Mascota> findByTenantIdAndPropietarioIdAndActivoTrue(Long tenantId, Long propietarioId);

    Optional<Mascota> findByTenantIdAndId(Long tenantId, Long id);

    Optional<Mascota> findByTenantIdAndMicrochip(Long tenantId, String microchip);

    @Query("SELECT m FROM Mascota m WHERE m.activo = true AND (" +
           "LOWER(m.nombre) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(m.raza) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(m.microchip) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(m.propietario.nombres) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(m.propietario.apellidos) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(m.propietario.identificacion) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Mascota> buscarPorFiltro(@Param("query") String query);

    @Query("SELECT m FROM Mascota m WHERE m.tenantId = :tenantId AND m.activo = true AND (" +
           "LOWER(m.nombre) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(m.raza) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(m.microchip) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(m.propietario.nombres) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(m.propietario.apellidos) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(m.propietario.identificacion) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Mascota> buscarPorFiltroYTenant(@Param("tenantId") Long tenantId, @Param("query") String query);
}
