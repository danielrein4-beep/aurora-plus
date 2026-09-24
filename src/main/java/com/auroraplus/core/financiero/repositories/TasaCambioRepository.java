package com.auroraplus.core.financiero.repositories;

import com.auroraplus.core.financiero.entities.TasaCambio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TasaCambioRepository extends JpaRepository<TasaCambio, Long> {

    /**
     * Tasas registradas por una compra a proveedor (origen COMPRA) son el precio al que se compró,
     * no la tasa con la que se cobra: al convertir se prefieren las demás (oficial, manual...).
     */
    @org.springframework.data.jpa.repository.Query("SELECT t FROM TasaCambio t WHERE t.tenantId = :tenantId AND t.monedaOrigen = :origen "
        + "AND t.monedaDestino = :destino AND (t.origenApi IS NULL OR t.origenApi <> 'COMPRA') ORDER BY t.fechaActualizacion DESC")
    java.util.List<TasaCambio> buscarTasasDeCobro(@org.springframework.data.repository.query.Param("tenantId") Long tenantId,
        @org.springframework.data.repository.query.Param("origen") String origen,
        @org.springframework.data.repository.query.Param("destino") String destino,
        org.springframework.data.domain.Pageable pagina);

    Optional<TasaCambio> findTopByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(
        Long tenantId, String monedaOrigen, String monedaDestino);

    // Tasa vigente de UN origen específico (BCV, USDT, PERSONALIZADA...) — sin esto, un
    // negocio que alterna entre varias referencias de tasa (ej. BCV para reportes, USDT
    // para cobrar en el POS) no puede consultar "cuál es la última BCV que registré"
    // independiente de "cuál es la última USDT que registré": todas comparten una sola
    // fila "más reciente" en la práctica, y guardar una pisa la lectura de la otra.
    Optional<TasaCambio> findTopByTenantIdAndMonedaOrigenAndMonedaDestinoAndOrigenApiOrderByFechaActualizacionDesc(
        Long tenantId, String monedaOrigen, String monedaDestino, String origenApi);

    List<TasaCambio> findByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(
        Long tenantId, String monedaOrigen, String monedaDestino);

    // Tasa histórica VIGENTE en un instante dado (la más reciente registrada
    // hasta esa fecha, no la de hoy) — para reportes que recalculan un total
    // en Bs con la tasa del día en que de verdad se cerró cada ticket, no
    // con la tasa actual (que podría ser muy distinta si pasaron semanas).
    Optional<TasaCambio> findTopByTenantIdAndMonedaOrigenAndMonedaDestinoAndFechaActualizacionLessThanEqualOrderByFechaActualizacionDesc(
        Long tenantId, String monedaOrigen, String monedaDestino, LocalDateTime hasta);
}
