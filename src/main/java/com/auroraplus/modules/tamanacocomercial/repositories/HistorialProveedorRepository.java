package com.auroraplus.modules.tamanacocomercial.repositories;

import com.auroraplus.modules.tamanacocomercial.entities.HistorialProveedor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface HistorialProveedorRepository extends JpaRepository<HistorialProveedor, Long> {
    List<HistorialProveedor> findByProveedorId(Long proveedorId);
    List<HistorialProveedor> findByProveedorIdOrderByFechaDesc(Long proveedorId);
}
