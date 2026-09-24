package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.Animal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AnimalRepository extends JpaRepository<Animal, Long> {

    /** Bloquea el animal hasta terminar la venta: una segunda venta simultánea espera y ve que ya no está ACTIVO. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT a FROM Animal a WHERE a.id = :id")
    java.util.Optional<Animal> buscarConBloqueo(@org.springframework.data.repository.query.Param("id") Long id);
    Optional<Animal> findByArete(String arete);
    List<Animal> findByPotreroIdAndEstado(Long potreroId, String estado);
    List<Animal> findByEstado(String estado);

    // ── Métodos tenant-scoped (P0) — usar siempre estos en lugar de findAll/findByEstado ──
    List<Animal> findByTenantId(Long tenantId);
    List<Animal> findByTenantIdAndEstado(Long tenantId, String estado);
    Optional<Animal> findByAreteAndTenantId(String arete, Long tenantId);
    List<Animal> findByPotreroIdAndEstadoAndTenantId(Long potreroId, String estado, Long tenantId);
}
