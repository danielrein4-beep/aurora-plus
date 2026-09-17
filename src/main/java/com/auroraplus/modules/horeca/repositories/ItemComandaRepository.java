package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.ItemComanda;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ItemComandaRepository extends JpaRepository<ItemComanda, Long> {

    // CRÍTICO (fuga entre tenants, hallada en producción): este método antes
    // no recibía tenantId — cualquier cuenta podía ver Y modificar el tablero
    // de cocina de CUALQUIER otro tenant, sin validación alguna. El filtro de
    // Hibernate (TenantInterceptor) no cubre esto porque acá no hay ningún
    // otro control — no basta con confiar en el filtro global, cada acceso a
    // datos por tenant debe llevar tenantId explícito en la query.
    // EstadoItemNotIn en vez de EstadoItemNot: un ítem ANULADO tampoco debe
    // aparecer pidiendo preparación en el tablero de cocina, igual que uno
    // ya ENTREGADO. JOIN FETCH de comanda a propósito — sin esto,
    // item.getComanda() vendría null en runtime igual (Hibernate6Module no
    // resuelve lazy fuera de sesión), y el cocinero no vería a qué mesa va
    // cada plato (ver ItemKdsDTO).
    @Query("SELECT i FROM ItemComanda i JOIN FETCH i.comanda c WHERE i.tenantId = :tenantId "
        + "AND i.estacionCocina = :estacionCocina AND i.estadoItem NOT IN :estadosExcluidos "
        + "ORDER BY i.fechaCreacion ASC")
    List<ItemComanda> findByTenantIdAndEstacionCocinaAndEstadoItemNotIn(@Param("tenantId") Long tenantId, @Param("estacionCocina") String estacionCocina, @Param("estadosExcluidos") List<ItemComanda.EstadoItem> estadosExcluidos);

    List<ItemComanda> findByComandaId(Long comandaId);

    // Base de HorecaCosteoProvider (docs/finance-contract.md §3): solo comandas ya PAGADAS
    // dentro del período — una comanda ABIERTA no es venta todavía, y ANULADA no debe sumar.
    List<ItemComanda> findByTenantIdAndComanda_EstadoAndComanda_FechaCierreGreaterThanEqualAndComanda_FechaCierreLessThan(
        Long tenantId, Comanda.EstadoComanda estado, LocalDateTime desde, LocalDateTime hastaExclusivo);

    // Solo los renglones de "Propina" (ver ComandaDetalle.handleAgregarPropina,
    // estacionCocina="CARGOS") de un lote de comandas — batch en vez de un
    // findByComandaId por cada ticket del reporte, para no convertir un
    // reporte de un mes en cientos de queries.
    @Query("SELECT i FROM ItemComanda i WHERE i.tenantId = :tenantId AND i.comanda.id IN :comandaIds "
        + "AND i.estacionCocina = 'CARGOS' AND i.nombrePlato = 'Propina' AND i.estadoItem <> 'ANULADO'")
    List<ItemComanda> findPropinasPorComandaIds(@Param("tenantId") Long tenantId, @Param("comandaIds") List<Long> comandaIds);
}
