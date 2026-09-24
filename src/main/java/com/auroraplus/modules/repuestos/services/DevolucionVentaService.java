package com.auroraplus.modules.repuestos.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.sync.IdempotenciaService;
import com.auroraplus.modules.repuestos.entities.MovimientoRepuesto;
import com.auroraplus.modules.repuestos.entities.RepuestoItem;
import com.auroraplus.modules.repuestos.repositories.MovimientoRepuestoRepository;
import com.auroraplus.modules.repuestos.repositories.RepuestoItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Devolución (total o parcial) de un ticket del POS de Comercio. Antes no había forma de
 * deshacer una venta: quedaba un "ajuste de stock" y dinero que salía de caja sin rastro.
 *
 * - La mercancía vuelve al inventario con su propio movimiento de kárdex (DEVOLUCION),
 *   ligado a la línea vendida: no se puede devolver más de lo que se vendió.
 * - El dinero: si la venta quedó a crédito, primero se rebaja lo que el cliente aún debe;
 *   lo que sobre sale de caja como EGRESO con su método (el arqueo solo cuenta el efectivo).
 * - Los reportes de ventas y utilidad restan las devoluciones.
 */
@Service
public class DevolucionVentaService {

    @Autowired private MovimientoRepuestoRepository movimientoRepuestoRepository;
    @Autowired private RepuestoItemRepository repuestoItemRepository;
    @Autowired private MovimientoCajaRepository movimientoCajaRepository;
    @Autowired private MotorFinancieroService motorFinancieroService;
    @Autowired private IdempotenciaService idempotenciaService;
    @Autowired private AlmacenService almacenService;

    public record LineaVendida(Long movimientoId, Long repuestoId, String codigoSku, String descripcion,
                               BigDecimal cantidad, BigDecimal total, BigDecimal devuelto) {}

    public record LineaDevolucion(Long movimientoId, BigDecimal cantidad) {}

    public record ResultadoDevolucion(boolean yaProcesada, BigDecimal montoDevuelto, BigDecimal rebajadoDeCredito,
                                      BigDecimal reembolsadoEnCaja, String monedaReembolso) {}

    public List<LineaVendida> lineasDeTicket(Long tenantId, String numeroTicket) {
        if (numeroTicket == null || numeroTicket.isBlank()) throw new RuntimeException("Falta el número del ticket");
        String t = numeroTicket.trim();
        List<LineaVendida> lineas = new ArrayList<>();
        for (MovimientoRepuesto m : movimientoRepuestoRepository.buscarLineasDeTicket(tenantId, "Venta " + t + " (%", "Venta " + t + ":%")) {
            lineas.add(new LineaVendida(m.getId(), m.getRepuesto().getId(), m.getRepuesto().getCodigoSku(), m.getRepuesto().getDescripcion(),
                m.getCantidad(), m.getTotal(), movimientoRepuestoRepository.sumarDevuelto(m.getId())));
        }
        return lineas;
    }

    @Transactional
    public ResultadoDevolucion devolver(Long tenantId, String numeroTicket, List<LineaDevolucion> lineas, String motivo,
                                        String monedaReembolso, String metodoReembolso, String clave) {
        if (lineas == null || lineas.isEmpty()) throw new RuntimeException("Indica qué productos se devuelven");
        if (motivo == null || motivo.isBlank()) throw new RuntimeException("Indica el motivo de la devolución");
        String claveIdem = clave != null && !clave.isBlank() ? "pos-devolucion:" + clave.trim() : null;
        if (claveIdem != null && idempotenciaService.obtenerSiYaProcesada(tenantId, claveIdem).isPresent()) {
            return new ResultadoDevolucion(true, null, null, null, null);
        }

        List<LineaVendida> delTicket = lineasDeTicket(tenantId, numeroTicket);
        if (delTicket.isEmpty()) throw new RuntimeException("No se encontró el ticket " + numeroTicket);
        Long primerMovimiento = delTicket.get(0).movimientoId();

        BigDecimal montoDevuelto = BigDecimal.ZERO;
        Long primeraDevolucion = null;
        for (LineaDevolucion ld : lineas) {
            if (ld.cantidad() == null || ld.cantidad().signum() <= 0) continue;
            LineaVendida vendida = delTicket.stream().filter(l -> l.movimientoId().equals(ld.movimientoId())).findFirst()
                .orElseThrow(() -> new RuntimeException("Esa línea no pertenece al ticket " + numeroTicket));

            // Con el repuesto bloqueado: dos devoluciones simultáneas de la misma línea no pasan las dos.
            RepuestoItem repuesto = repuestoItemRepository.buscarConBloqueoPesimista(vendida.repuestoId())
                .orElseThrow(() -> new RuntimeException("Repuesto no encontrado"));
            if (!repuesto.getTenantId().equals(tenantId)) throw new RuntimeException("Violación de seguridad: Repuesto no pertenece a este tenant");
            BigDecimal disponible = vendida.cantidad().subtract(movimientoRepuestoRepository.sumarDevuelto(vendida.movimientoId()));
            if (ld.cantidad().compareTo(disponible) > 0) {
                throw new RuntimeException("De " + vendida.codigoSku() + " solo quedan " + disponible.stripTrailingZeros().toPlainString()
                    + " por devolver en este ticket");
            }
            MovimientoRepuesto venta = movimientoRepuestoRepository.findById(vendida.movimientoId()).orElseThrow();
            BigDecimal monto = vendida.total() == null || vendida.cantidad().signum() == 0 ? BigDecimal.ZERO
                : vendida.total().multiply(ld.cantidad()).divide(vendida.cantidad(), 2, RoundingMode.HALF_UP);

            BigDecimal stockAnterior = repuesto.getStockActual();
            BigDecimal stockNuevo = stockAnterior.add(ld.cantidad());
            repuesto.setStockActual(stockNuevo);
            repuestoItemRepository.save(repuesto);
            almacenService.alinear(tenantId, repuesto.getId(), stockNuevo);

            MovimientoRepuesto dev = new MovimientoRepuesto();
            dev.setTenantId(tenantId);
            dev.setRepuesto(repuesto);
            dev.setTipo(MovimientoRepuesto.TipoMovimiento.DEVOLUCION);
            dev.setCantidad(ld.cantidad());
            dev.setStockAnterior(stockAnterior);
            dev.setStockNuevo(stockNuevo);
            dev.setMotivo(truncar("Devolución " + numeroTicket.trim() + ": " + motivo.trim(), 250));
            dev.setClienteId(venta.getClienteId());
            dev.setTotal(monto);
            dev.setCostoUnitario(venta.getCostoUnitario()); // mismo costo con que salió: la utilidad se revierte exacta
            dev.setMovimientoOrigenId(vendida.movimientoId());
            dev = movimientoRepuestoRepository.save(dev);
            if (primeraDevolucion == null) primeraDevolucion = dev.getId();
            montoDevuelto = montoDevuelto.add(monto);
        }
        if (primeraDevolucion == null) throw new RuntimeException("Indica cuántas unidades se devuelven");

        // Dinero: primero se rebaja la deuda pendiente del ticket (si fue a crédito).
        BigDecimal porReembolsar = montoDevuelto;
        BigDecimal rebajado = BigDecimal.ZERO;
        for (MovimientoCaja cxc : movimientoCajaRepository.findByTenantIdAndTipoAndReferenciaTipoAndReferenciaId(
                tenantId, MovimientoCaja.TipoMovimiento.CXC, "VentaRepuesto", primerMovimiento)) {
            if (porReembolsar.signum() <= 0) break;
            MovimientoCaja cuenta = movimientoCajaRepository.buscarConBloqueo(cxc.getId()).orElseThrow();
            if ("PAGADO".equals(cuenta.getEstado())) continue;
            BigDecimal saldo = cuenta.getSaldoPendiente() != null ? cuenta.getSaldoPendiente() : cuenta.getMonto();
            BigDecimal quita = saldo.min(porReembolsar);
            if (quita.signum() <= 0) continue;
            cuenta.setSaldoPendiente(saldo.subtract(quita).setScale(2, RoundingMode.HALF_UP));
            if (cuenta.getSaldoPendiente().compareTo(new BigDecimal("0.01")) < 0) cuenta.setEstado("PAGADO");
            cuenta.setConcepto(truncar(cuenta.getConcepto() + " · rebajado " + quita + " por devolución", 250));
            movimientoCajaRepository.save(cuenta);
            rebajado = rebajado.add(quita);
            porReembolsar = porReembolsar.subtract(quita);
        }

        String monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
        String moneda = monedaReembolso != null && !monedaReembolso.isBlank() ? monedaReembolso.trim().toUpperCase() : monedaBase;
        BigDecimal reembolso = BigDecimal.ZERO;
        if (porReembolsar.signum() > 0) {
            reembolso = moneda.equals(monedaBase) ? porReembolsar
                : motorFinancieroService.convertirMoneda(tenantId, porReembolsar, monedaBase, moneda);
            String metodo = metodoReembolso != null && !metodoReembolso.isBlank() ? metodoReembolso.trim().toUpperCase() : "EFECTIVO";
            motorFinancieroService.registrarMovimientoEnMoneda(tenantId, MovimientoCaja.TipoMovimiento.EGRESO, reembolso, moneda,
                    truncar("Devolución ticket " + numeroTicket.trim() + " · " + motivo.trim(), 250), "COMERCIO", "DevolucionPOS", primeraDevolucion)
                .setMetodoPago(metodo);
        }

        if (claveIdem != null) idempotenciaService.registrar(tenantId, claveIdem, "devolucion_pos", primeraDevolucion);
        return new ResultadoDevolucion(false, montoDevuelto, rebajado, reembolso, moneda);
    }

    private static String truncar(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}
