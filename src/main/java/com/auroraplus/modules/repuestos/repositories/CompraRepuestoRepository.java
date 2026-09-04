package com.auroraplus.modules.repuestos.repositories;

import com.auroraplus.modules.repuestos.entities.CompraRepuesto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CompraRepuestoRepository extends JpaRepository<CompraRepuesto, Long> {
    List<CompraRepuesto> findAllByOrderByFechaCompraDesc();
}
