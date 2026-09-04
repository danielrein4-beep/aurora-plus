package com.auroraplus.modules.tamanacocomercial.repositories;

import com.auroraplus.modules.tamanacocomercial.entities.CambioMoneda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CambioMonedaRepository extends JpaRepository<CambioMoneda, Long> {

    List<CambioMoneda> findAllByOrderByFechaDescIdDesc();
}
