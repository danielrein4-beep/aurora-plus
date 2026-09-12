package com.auroraplus.modules.repuestos.repositories;

import com.auroraplus.modules.repuestos.entities.MovimientoRepuesto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MovimientoRepuestoRepository extends JpaRepository<MovimientoRepuesto, Long> {

    // JOIN FETCH: sin esto, "repuesto" llega null en el kárdex (Hibernate6Module
    // devuelve null en vez de reventar para un proxy LAZY no inicializado), y un
    // kárdex real necesita mostrar el SKU/descripción sin una consulta aparte.
    @Query("SELECT m FROM MovimientoRepuesto m JOIN FETCH m.repuesto WHERE m.repuesto.id = :repuestoId ORDER BY m.fechaRegistro DESC")
    List<MovimientoRepuesto> findByRepuestoIdOrderByFechaRegistroDesc(@Param("repuestoId") Long repuestoId);

    /** Proyección agregada por cliente para la Regla ABC (ver ClasificacionClientesJob). */
    interface ResumenComprasCliente {
        Long getTenantId();
        Long getClienteId();
        java.math.BigDecimal getTotalUltimos90d();
        Long getComprasUltimos30d();
        Long getComprasTotal();
        LocalDateTime getUltimaCompra();
    }

    // Sin TenantContext (job @Scheduled, ver TenantFilterAspect), esta consulta ve
    // los movimientos de TODOS los tenants — pero cada fila del resultado ya trae
    // su propio tenant_id/cliente_id desde el GROUP BY, así que no hay forma de
    // mezclar el historial de un cliente con el de otro tenant.
    @Query(value = "SELECT m.tenant_id AS tenantId, m.cliente_id AS clienteId, "
        + "COALESCE(SUM(m.total) FILTER (WHERE m.fecha_registro >= :desde90), 0) AS totalUltimos90d, "
        + "COUNT(*) FILTER (WHERE m.fecha_registro >= :desde30) AS comprasUltimos30d, "
        + "COUNT(*) AS comprasTotal, "
        + "MAX(m.fecha_registro) AS ultimaCompra "
        + "FROM movimientos_repuesto m "
        + "WHERE m.tipo = 'VENTA' AND m.cliente_id IS NOT NULL "
        + "GROUP BY m.tenant_id, m.cliente_id", nativeQuery = true)
    List<ResumenComprasCliente> resumenComprasPorCliente(@Param("desde90") LocalDateTime desde90, @Param("desde30") LocalDateTime desde30);
}
