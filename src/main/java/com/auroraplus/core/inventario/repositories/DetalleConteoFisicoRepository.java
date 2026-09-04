package com.auroraplus.core.inventario.repositories;

import com.auroraplus.core.inventario.entities.DetalleConteoFisico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DetalleConteoFisicoRepository extends JpaRepository<DetalleConteoFisico, Long> {
    @Query("SELECT d FROM DetalleConteoFisico d JOIN FETCH d.articulo WHERE d.conteo.id = :conteoId")
    List<DetalleConteoFisico> findByConteoId(@Param("conteoId") Long conteoId);

    Optional<DetalleConteoFisico> findByConteoIdAndArticuloId(Long conteoId, Long articuloId);
}
