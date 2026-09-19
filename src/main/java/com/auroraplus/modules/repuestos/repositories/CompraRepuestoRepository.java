package com.auroraplus.modules.repuestos.repositories;

import com.auroraplus.modules.repuestos.entities.CompraRepuesto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CompraRepuestoRepository extends JpaRepository<CompraRepuesto, Long> {
    List<CompraRepuesto> findAllByOrderByFechaCompraDesc();
    List<CompraRepuesto> findByTenantIdOrderByFechaCompraDesc(Long tenantId);

    // El proveedor es LAZY (ver Hibernate6Module: los proxies no inicializados
    // serializan como null, a propósito, para no disparar fetches ocultos en
    // todo el proyecto) — para la vista de historial de compras SÍ hace falta
    // el nombre del proveedor, así que se trae con JOIN FETCH explícito acá.
    // Aislado por tenant: sin esto, el historial de compras de un negocio
    // mezclaba las facturas de todos los tenants.
    @Query("SELECT c FROM CompraRepuesto c JOIN FETCH c.proveedor WHERE c.tenantId = :tenantId ORDER BY c.fechaCompra DESC")
    List<CompraRepuesto> listarConProveedor(@Param("tenantId") Long tenantId);
}
