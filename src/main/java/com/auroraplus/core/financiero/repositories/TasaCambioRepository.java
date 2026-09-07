package com.auroraplus.core.financiero.repositories;

import com.auroraplus.core.financiero.entities.TasaCambio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TasaCambioRepository extends JpaRepository<TasaCambio, Long> {
    Optional<TasaCambio> findTopByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(
        Long tenantId, String monedaOrigen, String monedaDestino);

    List<TasaCambio> findByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(
        Long tenantId, String monedaOrigen, String monedaDestino);

    // Tasa histórica VIGENTE en un instante dado (la más reciente registrada
    // hasta esa fecha, no la de hoy) — para reportes que recalculan un total
    // en Bs con la tasa del día en que de verdad se cerró cada ticket, no
    // con la tasa actual (que podría ser muy distinta si pasaron semanas).
    Optional<TasaCambio> findTopByTenantIdAndMonedaOrigenAndMonedaDestinoAndFechaActualizacionLessThanEqualOrderByFechaActualizacionDesc(
        Long tenantId, String monedaOrigen, String monedaDestino, LocalDateTime hasta);
}
