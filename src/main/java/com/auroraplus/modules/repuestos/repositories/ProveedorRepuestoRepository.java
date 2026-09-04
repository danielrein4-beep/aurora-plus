package com.auroraplus.modules.repuestos.repositories;

import com.auroraplus.modules.repuestos.entities.ProveedorRepuesto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProveedorRepuestoRepository extends JpaRepository<ProveedorRepuesto, Long> {
}
