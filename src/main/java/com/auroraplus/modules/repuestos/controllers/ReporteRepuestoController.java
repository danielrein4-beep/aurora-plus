package com.auroraplus.modules.repuestos.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.modules.repuestos.services.RepuestosReporteService;
import com.auroraplus.modules.repuestos.services.UtilidadPeriodoRepuesto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reportes administrativos de Comercio — utilidad real (no ventas brutas), solo visible
 * para el Dueño/Administrador: es información sobre cuánto gana el negocio por producto,
 * no algo que un cajero o encargado de inventario necesite ver para hacer su trabajo.
 */
@RestController
@RequestMapping("/api/repuestos/reportes")
public class ReporteRepuestoController {

    @Autowired
    private RepuestosReporteService repuestosReporteService;

    @Autowired
    private com.auroraplus.modules.repuestos.repositories.MovimientoRepuestoRepository movimientoRepository;

    private static final Pattern TICKET = Pattern.compile("^Venta (?!directa)([^\\s:,(]+)");

    /** Una línea vendida (o devuelta) con su hora real, para las estadísticas de Comercio. */
    public record LineaEstadistica(LocalDateTime fecha, Long repuestoId, String descripcion, String categoria,
                                   BigDecimal cantidad, BigDecimal total, BigDecimal costoUnitario,
                                   String ticket, boolean devolucion) {}

    /**
     * Todas las ventas del período leídas del Kárdex (movimientos de inventario), que es donde
     * queda toda venta: POS, pedidos web y las anteriores al historial del POS. Las devoluciones
     * vienen marcadas para restarlas. Solo Dueño/Administrador, igual que la utilidad.
     */
    @GetMapping("/estadisticas")
    public List<LineaEstadistica> estadisticas(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        AuthContext.exigirRol("DUENO_ADMIN");
        if (hasta.isBefore(desde)) throw new RuntimeException("La fecha 'hasta' no puede ser anterior a 'desde'");
        Long tenantId = TenantContext.getCurrentTenant();
        LocalDateTime ini = desde.atStartOfDay();
        LocalDateTime fin = hasta.plusDays(1).atStartOfDay();
        List<LineaEstadistica> salida = new ArrayList<>();
        for (var tipo : List.of(com.auroraplus.modules.repuestos.entities.MovimientoRepuesto.TipoMovimiento.VENTA,
                                com.auroraplus.modules.repuestos.entities.MovimientoRepuesto.TipoMovimiento.DEVOLUCION)) {
            for (var m : movimientoRepository.findConRepuestoByTenantIdAndTipoAndFecha(tenantId, tipo, ini, fin)) {
                Matcher t = TICKET.matcher(m.getMotivo() != null ? m.getMotivo() : "");
                String ticket = t.find() ? t.group(1).replaceAll("[:,]$", "") : "MOV-" + m.getId();
                salida.add(new LineaEstadistica(m.getFechaRegistro(), m.getRepuesto().getId(),
                    m.getRepuesto().getDescripcion(), m.getRepuesto().getCategoria(), m.getCantidad(), m.getTotal(),
                    m.getCostoUnitario(), ticket,
                    tipo == com.auroraplus.modules.repuestos.entities.MovimientoRepuesto.TipoMovimiento.DEVOLUCION));
            }
        }
        return salida;
    }

    @GetMapping("/utilidad")
    public UtilidadPeriodoRepuesto utilidad(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        AuthContext.exigirRol("DUENO_ADMIN");
        if (hasta.isBefore(desde)) {
            throw new RuntimeException("La fecha 'hasta' no puede ser anterior a 'desde'");
        }
        return repuestosReporteService.obtenerUtilidadPorPeriodo(TenantContext.getCurrentTenant(), desde, hasta);
    }
}
