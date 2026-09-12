package com.auroraplus.modules.repuestos.repositories;

import com.auroraplus.modules.repuestos.entities.OrdenCompraSugerida;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrdenCompraSugeridaRepository extends JpaRepository<OrdenCompraSugerida, Long> {

    List<OrdenCompraSugerida> findByTenantIdOrderByFechaCreacionDesc(Long tenantId);

    // Antes de crear un borrador nuevo se verifica que no haya ya uno pendiente
    // para el mismo ítem — sin esto, cada venta que mantenga el stock bajo el
    // mínimo (ej. varias ventas seguidas del mismo producto agotado) generaría
    // un borrador duplicado por cada una.
    Optional<OrdenCompraSugerida> findFirstByTenantIdAndRepuestoIdAndEstado(
        Long tenantId, Long repuestoId, OrdenCompraSugerida.Estado estado);
}
