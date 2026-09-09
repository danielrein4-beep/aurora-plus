package com.auroraplus.core.inventario.repositories;

import com.auroraplus.core.inventario.entities.CruceRepuesto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CruceRepuestoRepository extends JpaRepository<CruceRepuesto, Long> {

    List<CruceRepuesto> findByArticuloIdAndTenantId(Long articuloId, Long tenantId);

    // Búsqueda del POS: el vendedor tipea un código OEM y el sistema le
    // muestra a qué artículo(s) del catálogo corresponde (case-insensitive,
    // coincidencia parcial — el mismo código a veces se transcribe con o sin
    // guiones/espacios entre catálogos de distintos fabricantes).
    @Query("SELECT c FROM CruceRepuesto c WHERE c.tenantId = :tenantId AND LOWER(c.codigoOem) LIKE LOWER(CONCAT('%', :codigo, '%'))")
    List<CruceRepuesto> buscarPorCodigoOem(@Param("tenantId") Long tenantId, @Param("codigo") String codigo);
}
