package com.auroraplus.modules.tamanacocomercial.repositories;

import com.auroraplus.modules.tamanacocomercial.entities.VentaComercial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VentaComercialRepository extends JpaRepository<VentaComercial, Long> {
    List<VentaComercial> findAllByOrderByFechaDescIdDesc();
    List<VentaComercial> findByFechaBetweenOrderByFechaDescIdDesc(LocalDateTime desde, LocalDateTime hasta);
    Optional<VentaComercial> findByNumeroTicket(String numeroTicket);

    List<VentaComercial> findByFechaBetweenAndEstado(LocalDateTime desde, LocalDateTime hasta, VentaComercial.EstadoVenta estado);
}
