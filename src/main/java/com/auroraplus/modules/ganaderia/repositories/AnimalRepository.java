package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.Animal;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AnimalRepository extends JpaRepository<Animal, Long> {
    Optional<Animal> findByArete(String arete);
    List<Animal> findByPotreroIdAndEstado(Long potreroId, String estado);
    List<Animal> findByEstado(String estado);

    // ── Métodos tenant-scoped (P0) — usar siempre estos en lugar de findAll/findByEstado ──
    List<Animal> findByTenantId(Long tenantId);
    List<Animal> findByTenantIdAndEstado(Long tenantId, String estado);
    List<Animal> findByTenantIdAndSociedadCebaId(Long tenantId, Long sociedadCebaId);
    Optional<Animal> findByAreteAndTenantId(String arete, Long tenantId);
    List<Animal> findByPotreroIdAndEstadoAndTenantId(Long potreroId, String estado, Long tenantId);

    /** Serializa operaciones críticas por animal (ordeño, traslado, baja). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Animal a WHERE a.id = :id AND a.tenantId = :tenantId")
    Optional<Animal> findForUpdateByIdAndTenantId(@Param("id") Long id, @Param("tenantId") Long tenantId);
}
