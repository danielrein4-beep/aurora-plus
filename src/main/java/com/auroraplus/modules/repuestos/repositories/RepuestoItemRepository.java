package com.auroraplus.modules.repuestos.repositories;

import com.auroraplus.modules.repuestos.entities.RepuestoItem;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RepuestoItemRepository extends JpaRepository<RepuestoItem, Long> {

    Optional<RepuestoItem> findByCodigoSkuAndTenantId(String codigoSku, Long tenantId);

    List<RepuestoItem> findByCodigoOriginalOemAndTenantId(String codigoOriginalOem, Long tenantId);

    /**
     * Toma un bloqueo pesimista (SELECT ... FOR UPDATE) sobre la fila antes de leer
     * stockActual — usado exclusivamente en el camino de venta (RepuestoConversionService),
     * donde dos ventas concurrentes del mismo ítem podrían, con un findById() normal, leer
     * el mismo stockActual, pasar ambas la validación y sobrevender. Con este bloqueo, la
     * segunda transacción espera a que la primera confirme (o revierta) antes de leer el
     * stock, así que siempre ve el valor ya actualizado.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RepuestoItem r WHERE r.id = :id")
    Optional<RepuestoItem> buscarConBloqueoPesimista(@Param("id") Long id);
}
