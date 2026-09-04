package com.auroraplus.core.rrhh.repositories;

import com.auroraplus.core.rrhh.entities.Empleado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("rrhhEmpleadoRepository")
public interface EmpleadoRepository extends JpaRepository<Empleado, Long> {
}
