package com.auroraplus.modules.tamanacocomercial.repositories;

import com.auroraplus.modules.tamanacocomercial.entities.DetalleVentaComercial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DetalleVentaComercialRepository extends JpaRepository<DetalleVentaComercial, Long> {
}
