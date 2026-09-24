package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.RegistroConsumo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RegistroConsumoRepository extends JpaRepository<RegistroConsumo, Long> {
    List<RegistroConsumo> findByPotreroIdOrderByFechaDesc(Long potreroId);

    /** Todo lo de la finca de una vez (margen por animal): evita una consulta por animal. */
    List<RegistroConsumo> findByTenantId(Long tenantId);

    /** Raciones recientes de la finca, la más nueva primero (pantalla de alimento y sal). */
    List<RegistroConsumo> findByTenantIdAndFechaGreaterThanEqualOrderByFechaDescIdDesc(Long tenantId, java.time.LocalDate desde);
}
