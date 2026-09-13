package com.auroraplus.core.personal.repositories;

import com.auroraplus.core.personal.entities.Empleado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

// Bean nombrado explícitamente: ya existe core.rrhh.repositories.EmpleadoRepository (mismo
// nombre simple de clase, distinto paquete) — mismo criterio ya usado en TesoreriaController.
@Repository("personalEmpleadoRepository")
public interface EmpleadoRepository extends JpaRepository<Empleado, Long> {
    List<Empleado> findByTenantId(Long tenantId);
    Optional<Empleado> findByTenantIdAndId(Long tenantId, Long id);
    Optional<Empleado> findByTenantIdAndUsuarioId(Long tenantId, Long usuarioId);
}
