package com.auroraplus.core.financiero.services;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.financiero.entities.ArqueoCaja;
import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.ArqueoCajaRepository;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.core.notificaciones.entities.AlertaAdmin;
import com.auroraplus.core.notificaciones.repositories.AlertaAdminRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class TesoreriaService {

    private static final Logger log = LoggerFactory.getLogger(TesoreriaService.class);

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    @Autowired
    private ArqueoCajaRepository arqueoCajaRepository;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired
    private AlertaAdminRepository alertaAdminRepository;

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
        ArqueoCaja guardado = arqueoCajaRepository.save(arqueo);

        // 5. Auditoría antifraude: el cierre se procesa igual aunque el descuadre
        // exceda el margen de tolerancia del tenant — nunca bloquea al cajero —
        // pero queda una alerta silenciosa para que el dueño la revise después,
        // con el timestamp exacto de cuándo ocurrió.
        generarAlertaSiExcedeMargen(guardado);

        return guardado;
    }

    private void generarAlertaSiExcedeMargen(ArqueoCaja arqueo) {
        try {
            BigDecimal margen = licenciaTenantRepository.findByTenantId(arqueo.getTenantId())
                .map(LicenciaTenant::getMargenToleranciaDescuadre)
                .orElse(new BigDecimal("2.00"));
            if (arqueo.getDescuadre().abs().compareTo(margen) <= 0) return;

            AlertaAdmin alerta = new AlertaAdmin();
            alerta.setTenantId(arqueo.getTenantId());
            alerta.setTipo(AlertaAdmin.Tipo.DESCUADRE_CAJA);
            alerta.setMensaje(String.format(
                "Descuadre de %s %s en el cierre de %s (declarado %s, sistema %s) — supera el margen de tolerancia de %s %s.",
                arqueo.getDescuadre(), arqueo.getMoneda(), arqueo.getIdCajero(),
                arqueo.getMontoDeclarado(), arqueo.getMontoSistema(), margen, arqueo.getMoneda()));
            alertaAdminRepository.save(alerta);
        } catch (Exception e) {
            // Una alerta que falla NUNCA debe tumbar un cierre de caja ya confirmado.
            log.error("No se pudo generar la alerta de descuadre para el arqueo {}: {}", arqueo.getId(), e.getMessage(), e);
        }
    }
}
