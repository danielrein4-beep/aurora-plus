package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.GuiaTraslado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GuiaTrasladoRepository extends JpaRepository<GuiaTraslado, Long> {
    List<GuiaTraslado> findAllByOrderByFechaDesc();
}
