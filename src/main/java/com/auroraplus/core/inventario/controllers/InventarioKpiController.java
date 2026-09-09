package com.auroraplus.core.inventario.controllers;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.inventario.dto.InventarioKpiDTO;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Panel de KPIs financieros de Inventario — un solo viaje a la base para las
 * cuatro cifras que le importan al dueño del negocio de un vistazo (caja de
 * hoy, capital inmovilizado en bodega, utilidad proyectada si se vendiera
 * todo el stock, y cuántos artículos necesitan reposición ya).
 */
@RestController
@RequestMapping("/api/inventario")
public class InventarioKpiController {

    @Autowired
    private ArticuloRepository articuloRepository;

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @GetMapping("/kpis")
    public InventarioKpiDTO obtenerKpis(@RequestParam Long tenantId) {
        ArticuloRepository.InventarioAgregadoProjection agregados = articuloRepository.calcularAgregadosInventario(tenantId);

        // "Caja hoy" es el NETO de hoy (ingresos - egresos), no solo lo que
        // entró: una venta anulada el mismo día registra su reverso como
        // EGRESO (ver HorecaService.anularComanda) sin tocar el INGRESO
        // original, así que sumar solo INGRESO sobrestima el efectivo real
        // en caja cada vez que hubo una anulación o un vuelto entregado hoy.
        // Se mide en la moneda base del tenant, igual que el resto de
        // Tesorería (resumenPeriodoAbierto), que nunca mezcla monedas en una
        // sola suma sin pasar por una tasa de conversión explícita.
        String monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
        LocalDateTime inicioDeHoy = LocalDate.now().atStartOfDay();
        LocalDateTime ahora = LocalDateTime.now();
        var ingresosHoy = movimientoCajaRepository.sumarMontoPorTipoYMonedaEntreFechas(
            tenantId, monedaBase, MovimientoCaja.TipoMovimiento.INGRESO, inicioDeHoy, ahora);
        var egresosHoy = movimientoCajaRepository.sumarMontoPorTipoYMonedaEntreFechas(
            tenantId, monedaBase, MovimientoCaja.TipoMovimiento.EGRESO, inicioDeHoy, ahora);
        var cajaHoy = ingresosHoy.subtract(egresosHoy);

        return new InventarioKpiDTO(
            cajaHoy,
            agregados.getValorBodega(),
            agregados.getGananciaProyectada(),
            agregados.getAlertasReposicion()
        );
    }
}
