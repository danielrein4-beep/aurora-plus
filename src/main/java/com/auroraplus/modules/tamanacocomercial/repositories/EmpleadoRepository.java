package com.auroraplus.modules.tamanacocomercial.repositories;

import com.auroraplus.modules.tamanacocomercial.entities.Empleado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EmpleadoRepository extends JpaRepository<Empleado, Long> {
    List<Empleado> findAllByOrderByNombreAsc();
    List<Empleado> findByActivoTrueOrderByNombreAsc();
}
