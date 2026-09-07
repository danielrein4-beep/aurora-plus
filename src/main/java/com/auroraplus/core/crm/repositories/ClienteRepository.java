package com.auroraplus.core.crm.repositories;

import com.auroraplus.core.crm.entities.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    List<Cliente> findByTenantIdOrderByNombreAsc(Long tenantId);

    // Búsqueda rápida por nombre O RIF, insensible a mayúsculas — la que usa
    // tanto la pantalla de Clientes como el buscador dentro de Venta Rápida.
    @Query("SELECT c FROM Cliente c WHERE c.tenantId = :tenantId AND ("
        + "LOWER(c.nombre) LIKE LOWER(CONCAT('%', :q, '%')) "
        + "OR LOWER(COALESCE(c.identificacionRif, '')) LIKE LOWER(CONCAT('%', :q, '%'))) "
        + "ORDER BY c.nombre ASC")
    List<Cliente> buscar(@Param("tenantId") Long tenantId, @Param("q") String q);
}
