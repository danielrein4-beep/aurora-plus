package com.auroraplus.modules.pacientesapp.repositories;

import com.auroraplus.modules.pacientesapp.entities.PlanCompartido;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PlanCompartidoRepository extends JpaRepository<PlanCompartido, Long> {
    Optional<PlanCompartido> findByTenantIdAndConsultaId(Long tenantId, Long consultaId);
    List<PlanCompartido> findByTenantIdAndPacienteIdOrderByFechaConsultaDesc(Long tenantId, Long pacienteId);
}
