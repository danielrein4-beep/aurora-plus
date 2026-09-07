package com.auroraplus.core.inventario.repositories;

import com.auroraplus.core.inventario.entities.LoteArticulo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface LoteArticuloRepository extends JpaRepository<LoteArticulo, Long> {
    List<LoteArticulo> findByArticuloId(Long articuloId);

    // WHERE lote.cantidadActual > 0: un lote vendido por completo no es una
    // alerta de vencimiento útil — ya no hay nada de ese lote en la bodega
    // que se pueda echar a perder. cantidadActual puede venir NULL en filas
    // viejas todavía no migradas (@PostLoad las backfillea al leerlas, pero
    // esta es una query JPQL directa a la base, que @PostLoad no toca) — por
    // eso el OR IS NULL, tratando "sin dato" como "sin vender todavía".
    @Query("SELECT l FROM LoteArticulo l WHERE l.tenantId = :tenantId AND l.fechaVencimiento IS NOT NULL "
        + "AND l.fechaVencimiento <= :fechaLimite AND (l.cantidadActual IS NULL OR l.cantidadActual > 0) "
        + "ORDER BY l.fechaVencimiento ASC")
    List<LoteArticulo> alertasVencimientoConStock(@Param("tenantId") Long tenantId, @Param("fechaLimite") LocalDate fechaLimite);

    // FEFO: lotes con saldo, del más próximo a vencer al más lejano; los sin
    // fecha de vencimiento (no perecederos) van al final, y entre ellos se
    // desempata por el más antiguo primero (FIFO natural).
    @Query("SELECT l FROM LoteArticulo l WHERE l.articulo.id = :articuloId AND l.tenantId = :tenantId "
        + "AND (l.cantidadActual IS NULL OR l.cantidadActual > 0) "
        + "ORDER BY CASE WHEN l.fechaVencimiento IS NULL THEN 1 ELSE 0 END, l.fechaVencimiento ASC, l.fechaIngreso ASC")
    List<LoteArticulo> findConSaldoParaConsumirFefo(@Param("articuloId") Long articuloId, @Param("tenantId") Long tenantId);
}
