package com.auroraplus.core.inventario.repositories;

import com.auroraplus.core.inventario.entities.Kardex;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface KardexRepository extends JpaRepository<Kardex, Long> {
    @Query("SELECT k FROM Kardex k JOIN FETCH k.articulo WHERE k.articulo.id = :articuloId ORDER BY k.id DESC")
    List<Kardex> findByArticuloIdOrderByIdDesc(@Param("articuloId") Long articuloId);
}
