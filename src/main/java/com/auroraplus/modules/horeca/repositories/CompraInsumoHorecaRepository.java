package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.CompraInsumoHoreca;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CompraInsumoHorecaRepository extends JpaRepository<CompraInsumoHoreca, Long> {
    // JOIN FETCH explícito: proveedor e items son LAZY, y el Hibernate6Module
    // global (ver JacksonConfig) serializa cualquier relación LAZY no
    // inicializada como null en vez de cargarla — sin esto, el frontend
    // (historial de facturas por proveedor) siempre recibía proveedor/items
    // en null, aunque los datos sí existieran en la base.
    @Query("SELECT DISTINCT c FROM CompraInsumoHoreca c " +
           "JOIN FETCH c.proveedor " +
           "LEFT JOIN FETCH c.items i " +
           "LEFT JOIN FETCH i.articulo " +
           "WHERE c.tenantId = :tenantId ORDER BY c.fechaCompra DESC")
    List<CompraInsumoHoreca> findByTenantIdOrderByFechaCompraDesc(@Param("tenantId") Long tenantId);
}
