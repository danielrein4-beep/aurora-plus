package com.auroraplus.modules.comercio.services;

import com.auroraplus.core.financiero.entities.TasaCambio;
import com.auroraplus.core.financiero.repositories.TasaCambioRepository;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.comercio.entities.LibroVenta;
import com.auroraplus.modules.comercio.repositories.LibroVentaRepository;
import com.auroraplus.modules.repuestos.entities.CompraRepuesto;
import com.auroraplus.modules.repuestos.repositories.CompraRepuestoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Libros de compras y ventas para el contador. Los montos se guardan en la moneda base del
 * negocio; aquí se expresan en bolívares con la tasa BCV del día de cada operación (la guardada
 * al cobrar o al registrar la compra; si falta, la tasa vigente registrada en esa fecha).
 */
@Service
public class LibroFiscalService {

    @Autowired
    private LibroVentaRepository libroVentaRepository;

    @Autowired
    private CompraRepuestoRepository compraRepuestoRepository;

    @Autowired
    private TasaCambioRepository tasaCambioRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    public record RenglonVenta(LocalDateTime fecha, String numeroTicket, String numeroControl, String clienteNombre,
                               String clienteRif, BigDecimal tasaBcv, boolean tasaEstimada,
                               BigDecimal exento, BigDecimal baseImponible, BigDecimal alicuotaIva, BigDecimal iva,
                               BigDecimal igtf, BigDecimal delivery, BigDecimal total,
                               boolean ivaQuitado, String ivaQuitadoPor, boolean esCredito) {}

    public record RenglonCompra(LocalDateTime fecha, String proveedor, String proveedorRif, String numeroFactura,
                                String numeroControl, BigDecimal tasaBcv, boolean tasaEstimada, boolean sinFacturaFiscal,
                                BigDecimal exento, BigDecimal baseImponible, BigDecimal alicuotaIva, BigDecimal iva,
                                BigDecimal ivaRetenido, BigDecimal total) {}

    public record Libro<T>(String monedaBase, LocalDate desde, LocalDate hasta, List<T> renglones) {}

    @Transactional(readOnly = true)
    public Libro<RenglonVenta> libroVentas(Long tenantId, LocalDate desde, LocalDate hasta) {
        List<TasaCambio> tasas = historialTasas(tenantId);
        String monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
        List<RenglonVenta> renglones = new ArrayList<>();
        for (LibroVenta v : libroVentaRepository.findByTenantIdAndFechaBetweenOrderByFechaAsc(tenantId, desde.atStartOfDay(), hasta.plusDays(1).atStartOfDay().minusNanos(1))) {
            BigDecimal tasa = v.getTasaBcv() != null ? v.getTasaBcv() : tasaEn(tasas, monedaBase, v.getFecha());
            renglones.add(new RenglonVenta(v.getFecha(), v.getNumeroTicket(), v.getNumeroControl(), v.getClienteNombre(), v.getClienteRif(),
                tasa, v.getTasaBcv() == null, v.getMontoExento(), v.getBaseImponible(), v.getAlicuotaIva(), v.getMontoIva(),
                v.getMontoIgtf(), v.getMontoDelivery(), v.getTotal(), Boolean.TRUE.equals(v.getIvaQuitado()), v.getIvaQuitadoPor(),
                Boolean.TRUE.equals(v.getEsCredito())));
        }
        return new Libro<>(monedaBase, desde, hasta, renglones);
    }

    @Transactional(readOnly = true)
    public Libro<RenglonCompra> libroCompras(Long tenantId, LocalDate desde, LocalDate hasta) {
        List<TasaCambio> tasas = historialTasas(tenantId);
        String monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
        LocalDateTime ini = desde.atStartOfDay();
        LocalDateTime fin = hasta.plusDays(1).atStartOfDay();
        List<RenglonCompra> renglones = new ArrayList<>();
        List<CompraRepuesto> compras = new ArrayList<>(compraRepuestoRepository.listarConProveedor(tenantId));
        compras.sort((a, b) -> a.getFechaCompra().compareTo(b.getFechaCompra()));
        for (CompraRepuesto c : compras) {
            if (c.getFechaCompra().isBefore(ini) || !c.getFechaCompra().isBefore(fin)) continue;
            BigDecimal tasa = c.getTasaBcv() != null ? c.getTasaBcv() : tasaEn(tasas, monedaBase, c.getFechaCompra());
            boolean sinFactura = c.getBaseImponible() == null && c.getMontoIva() == null && c.getMontoExento() == null;
            renglones.add(new RenglonCompra(c.getFechaCompra(), c.getProveedor().getNombre(), c.getProveedor().getRif(),
                c.getNumeroFactura(), c.getNumeroControl(), tasa, c.getTasaBcv() == null, sinFactura,
                sinFactura ? BigDecimal.ZERO : cero(c.getMontoExento()), cero(c.getBaseImponible()), cero(c.getAlicuotaIva()),
                cero(c.getMontoIva()), cero(c.getIvaRetenido()),
                // Con factura fiscal el total es el de la factura (base + exento + IVA); sin ella, el costo registrado.
                sinFactura ? c.getTotal() : cero(c.getMontoExento()).add(cero(c.getBaseImponible())).add(cero(c.getMontoIva()))));
        }
        return new Libro<>(monedaBase, desde, hasta, renglones);
    }

    /** Tasa base→Bs vigente en una fecha (para guardarla al registrar una compra). */
    public BigDecimal tasaBcvVigente(Long tenantId, LocalDateTime fecha) {
        return tasaEn(historialTasas(tenantId), motorFinancieroService.obtenerMonedaBase(tenantId), fecha != null ? fecha : LocalDateTime.now());
    }

    private List<TasaCambio> historialTasas(Long tenantId) {
        String base = motorFinancieroService.obtenerMonedaBase(tenantId);
        if ("VES".equals(base)) return List.of();
        List<TasaCambio> tasas = new ArrayList<>(tasaCambioRepository.findByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(tenantId, base, "VES"));
        // Las tasas registradas por una compra son el precio de esa compra, no la tasa oficial.
        tasas.removeIf(t -> "COMPRA".equals(t.getOrigenApi()) || t.getTasa() == null || t.getTasa().signum() <= 0);
        return tasas;
    }

    /** La última tasa registrada hasta esa fecha; prefiere la BCV si hay varias referencias. Null si no hay ninguna. */
    private static BigDecimal tasaEn(List<TasaCambio> tasasDesc, String monedaBase, LocalDateTime fecha) {
        if ("VES".equals(monedaBase)) return BigDecimal.ONE;
        TasaCambio vigente = null;
        LocalDateTime finDelDia = fecha.toLocalDate().plusDays(1).atStartOfDay();
        for (TasaCambio t : tasasDesc) {
            if (t.getFechaActualizacion() == null || !t.getFechaActualizacion().isBefore(finDelDia)) continue;
            if ("BCV".equalsIgnoreCase(t.getOrigenApi())) { vigente = t; break; }
            if (vigente == null) vigente = t;
        }
        if (vigente == null && !tasasDesc.isEmpty()) vigente = tasasDesc.get(tasasDesc.size() - 1); // la más antigua conocida
        return vigente != null ? vigente.getTasa().setScale(6, RoundingMode.HALF_UP) : null;
    }

    private static BigDecimal cero(BigDecimal v) { return v != null ? v : BigDecimal.ZERO; }
}
