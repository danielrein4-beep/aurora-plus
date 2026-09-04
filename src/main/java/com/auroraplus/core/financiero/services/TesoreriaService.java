package com.auroraplus.core.financiero.services;

import com.auroraplus.core.financiero.entities.ArqueoCaja;
import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.ArqueoCajaRepository;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class TesoreriaService {

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    @Autowired
    private ArqueoCajaRepository arqueoCajaRepository;

    /**
     * Cierre de caja real: cada arqueo solo cuenta los movimientos ocurridos
     * DESPUÉS del arqueo anterior de ese tenant+moneda (o desde el inicio, si
     * es el primero). Sin este acotamiento por período, un segundo cierre en
     * el mismo día volvería a sumar todo el histórico desde el día 1, dando
     * un descuadre sin sentido — el error que tenía originalmente este método.
     */
    public ArqueoCaja procesarArqueoCiego(Long tenantId, String idCajero, BigDecimal montoDeclaradoFisico, String moneda) {

        LocalDateTime ahora = LocalDateTime.now();
        Optional<ArqueoCaja> ultimoArqueo = arqueoCajaRepository.findTopByTenantIdAndMonedaOrderByFechaArqueoDesc(tenantId, moneda);
        LocalDateTime desde = ultimoArqueo.map(ArqueoCaja::getFechaArqueo).orElse(LocalDateTime.of(2000, 1, 1, 0, 0));

        // 1. Extraer movimientos del período (desde el último cierre hasta ahora)
        BigDecimal totalIngresos = movimientoCajaRepository.sumarMontoPorTipoYMonedaEntreFechas(
            tenantId, moneda, MovimientoCaja.TipoMovimiento.INGRESO, desde, ahora);
        BigDecimal totalEgresos = movimientoCajaRepository.sumarMontoPorTipoYMonedaEntreFechas(
            tenantId, moneda, MovimientoCaja.TipoMovimiento.EGRESO, desde, ahora);

        // 2. Calcular diferencia matemática real del período
        BigDecimal calculoInternoSistema = totalIngresos.subtract(totalEgresos);
        BigDecimal descuadre = montoDeclaradoFisico.subtract(calculoInternoSistema);

        // 3. Generar la entidad
        ArqueoCaja arqueo = new ArqueoCaja();
        arqueo.setTenantId(tenantId);
        arqueo.setIdCajero(idCajero);
        arqueo.setMoneda(moneda);
        arqueo.setMontoDeclarado(montoDeclaradoFisico);
        arqueo.setMontoSistema(calculoInternoSistema);
        arqueo.setDescuadre(descuadre);
        arqueo.setFechaArqueo(ahora);

        // 4. Guardar arqueo en base de datos (marca el fin de este período de caja)
        return arqueoCajaRepository.save(arqueo);
    }
}
