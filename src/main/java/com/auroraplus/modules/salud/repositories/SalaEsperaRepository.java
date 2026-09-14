package com.auroraplus.modules.salud.repositories;

import com.auroraplus.modules.salud.entities.SalaEspera;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalaEsperaRepository extends JpaRepository<SalaEspera, Long> {

    // Hardening piloto P0: findByEstadoInOrderByHoraLlegadaAsc sin tenant se eliminó —
    // exponía en tiempo real la cola de espera (nombres de pacientes) de TODAS las
    // clínicas mezcladas. findByEstado(estado) único sin caller real también se quitó.
    List<SalaEspera> findByTenantIdAndEstadoInOrderByHoraLlegadaAsc(Long tenantId, List<SalaEspera.EstadoEspera> estados);

    Optional<SalaEspera> findByCitaId(Long citaId);
}
