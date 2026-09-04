package com.auroraplus.core.financiero.repositories;

import com.auroraplus.core.financiero.entities.TasaCambio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TasaCambioRepository extends JpaRepository<TasaCambio, Long> {
    Optional<TasaCambio> findTopByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(
        Long tenantId, String monedaOrigen, String monedaDestino);

    List<TasaCambio> findByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(
        Long tenantId, String monedaOrigen, String monedaDestino);
}
