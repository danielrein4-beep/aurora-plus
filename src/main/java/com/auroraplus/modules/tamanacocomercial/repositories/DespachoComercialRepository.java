package com.auroraplus.modules.tamanacocomercial.repositories;

import com.auroraplus.modules.tamanacocomercial.entities.DespachoComercial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DespachoComercialRepository extends JpaRepository<DespachoComercial, Long> {

    List<DespachoComercial> findAllByOrderByIdDesc();

    List<DespachoComercial> findByFechaDespachoBetween(LocalDateTime desde, LocalDateTime hasta);

    long countByChoferRefId(Long choferId);

    @Query("SELECT DISTINCT d.chofer FROM DespachoComercial d WHERE d.chofer IS NOT NULL ORDER BY d.chofer")
    List<String> findDistinctChoferes();

    @Query("SELECT DISTINCT d.placa FROM DespachoComercial d WHERE d.placa IS NOT NULL ORDER BY d.placa")
    List<String> findDistinctPlacas();

    @Query("SELECT DISTINCT d.mina FROM DespachoComercial d WHERE d.mina IS NOT NULL ORDER BY d.mina")
    List<String> findDistinctMinas();

    @Query("SELECT COALESCE(SUM(d.peso), 0) FROM DespachoComercial d WHERE d.mina = :mina")
    BigDecimal sumPesoByMina(String mina);
}
