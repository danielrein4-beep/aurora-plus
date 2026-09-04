package com.auroraplus.modules.ganaderia.repositories;

import com.auroraplus.modules.ganaderia.entities.OfertaCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OfertaCompraRepository extends JpaRepository<OfertaCompra, Long> {
    @Query("SELECT o FROM OfertaCompra o JOIN FETCH o.publicacion WHERE o.publicacion.id = :publicacionId ORDER BY o.montoOfertado DESC")
    List<OfertaCompra> findByPublicacionIdOrderByMontoOfertadoDesc(@Param("publicacionId") Long publicacionId);
}
