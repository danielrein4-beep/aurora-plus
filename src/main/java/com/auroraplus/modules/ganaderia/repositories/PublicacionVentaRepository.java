package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.PublicacionVenta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PublicacionVentaRepository extends JpaRepository<PublicacionVenta, Long> {
    List<PublicacionVenta> findByEstado(String estado);
}
