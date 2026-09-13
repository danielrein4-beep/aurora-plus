package com.auroraplus.modules.veterinaria.repositories;

import com.auroraplus.modules.veterinaria.entities.Propietario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PropietarioRepository extends JpaRepository<Propietario, Long> {

    Optional<Propietario> findByIdentificacion(String identificacion);

    List<Propietario> findByActivoTrue();

    List<Propietario> findByTenantIdAndActivoTrue(Long tenantId);

    Optional<Propietario> findByTenantIdAndId(Long tenantId, Long id);

    Optional<Propietario> findByTenantIdAndIdentificacion(Long tenantId, String identificacion);

    @Query("SELECT p FROM Propietario p WHERE LOWER(p.nombres) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(p.apellidos) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(p.identificacion) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Propietario> buscarPorFiltro(@Param("query") String query);

    @Query("SELECT p FROM Propietario p WHERE p.tenantId = :tenantId AND p.activo = true AND (" +
           "LOWER(p.nombres) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(p.apellidos) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(p.identificacion) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Propietario> buscarPorFiltroYTenant(@Param("tenantId") Long tenantId, @Param("query") String query);
}
