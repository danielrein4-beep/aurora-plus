package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.DetalleVentaComercial;
import com.auroraplus.modules.tamanacocomercial.entities.MovimientoStock;
import com.auroraplus.modules.tamanacocomercial.entities.ProductoComercial;
import com.auroraplus.modules.tamanacocomercial.entities.VentaComercial;
import com.auroraplus.modules.tamanacocomercial.repositories.MovimientoStockRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.ProductoComercialRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.VentaComercialRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@RestController
@RequestMapping("/api/tamanaco-comercial/ventas")
public class VentaController {

    @Autowired
    private VentaComercialRepository ventaRepository;

    @Autowired
    private ProductoComercialRepository productoRepository;

    @Autowired
    private MovimientoStockRepository movimientoStockRepository;

    public static final BigDecimal TASA_COP_DEFAULT = new BigDecimal("3300.0");
    public static final BigDecimal TASA_VES_DEFAULT = new BigDecimal("925.0");

    @GetMapping
    public ResponseEntity<List<VentaComercial>> listarVentas() {
        return ResponseEntity.ok(ventaRepository.findAllByOrderByFechaDescIdDesc());
    }

    @GetMapping("/hoy")
    public ResponseEntity<List<VentaComercial>> listarVentasHoy() {
        LocalDateTime inicioHoy = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime finHoy = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);
        return ResponseEntity.ok(ventaRepository.findByFechaBetweenOrderByFechaDescIdDesc(inicioHoy, finHoy));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> registrarVenta(@RequestParam Long tenantId, @RequestBody Map<String, Object> payload) {
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> itemsList = (List<Map<String, Object>>) payload.get("items");
            if (itemsList == null || itemsList.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "La venta debe contener al menos un producto"));
            }

            BigDecimal tasaCop = payload.get("tasaCop") != null ? new BigDecimal(payload.get("tasaCop").toString()) : TASA_COP_DEFAULT;
            BigDecimal tasaVes = payload.get("tasaVes") != null ? new BigDecimal(payload.get("tasaVes").toString()) : TASA_VES_DEFAULT;
            String metodoPago = payload.get("metodoPago") != null ? payload.get("metodoPago").toString() : "USD_EFECTIVO";
            String monedaCobro = payload.get("monedaCobro") != null ? payload.get("monedaCobro").toString() : "USD";
            String cliente = payload.get("cliente") != null ? payload.get("cliente").toString() : "Cliente General";
            String notas = payload.get("notas") != null ? payload.get("notas").toString() : "";
            BigDecimal montoRecibido = payload.get("montoRecibido") != null ? new BigDecimal(payload.get("montoRecibido").toString()) : null;
            String numeroTicket = payload.get("numeroTicket") != null ? payload.get("numeroTicket").toString() : null;

            if (numeroTicket != null && !numeroTicket.isBlank()) {
                Optional<VentaComercial> existente = ventaRepository.findByNumeroTicket(numeroTicket);
                if (existente.isPresent()) {
                    return ResponseEntity.ok(existente.get());
                }
            }

            VentaComercial venta = new VentaComercial();
            venta.setTenantId(tenantId);
            venta.setNumeroTicket((numeroTicket != null && !numeroTicket.isBlank()) ? numeroTicket : "TKT-" + (System.currentTimeMillis() % 1000000));
            venta.setCliente(cliente);
            venta.setNotas(notas);
            venta.setMetodoPago(metodoPago);
            venta.setMonedaCobro(monedaCobro);
            venta.setTasaCop(tasaCop);
            venta.setTasaVes(tasaVes);
            venta.setFecha(LocalDateTime.now());
            venta.setEstado(VentaComercial.EstadoVenta.COMPLETADA);

            BigDecimal totalUsd = BigDecimal.ZERO;

            for (Map<String, Object> itemMap : itemsList) {
                Long prodId = ((Number) itemMap.get("productoId")).longValue();
                BigDecimal cantidad = new BigDecimal(itemMap.get("cantidad").toString());

                ProductoComercial prod = productoRepository.findById(prodId).orElse(null);
                if (prod == null) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Producto con ID " + prodId + " no encontrado"));
                }

                BigDecimal precioUnitario = itemMap.get("precioUnitarioUsd") != null
                        ? new BigDecimal(itemMap.get("precioUnitarioUsd").toString())
                        : (prod.getPrecioUsd() != null ? prod.getPrecioUsd() : BigDecimal.ZERO);

                DetalleVentaComercial detalle = new DetalleVentaComercial(prod, cantidad, precioUnitario);
                detalle.setTenantId(tenantId);
                venta.addItem(detalle);

                totalUsd = totalUsd.add(detalle.getSubtotalUsd());

                BigDecimal stockAnt = prod.getStockActual() != null ? prod.getStockActual() : BigDecimal.ZERO;
                BigDecimal nuevoStock = stockAnt.subtract(cantidad).max(BigDecimal.ZERO);
                prod.setStockActual(nuevoStock);
                productoRepository.save(prod);

                MovimientoStock mov = new MovimientoStock();
                mov.setTenantId(tenantId);
                mov.setProducto(prod);
                mov.setTipo("SALIDA");
                mov.setCantidad(cantidad);
                mov.setStockAnterior(stockAnt);
                mov.setStockNuevo(nuevoStock);
                mov.setMotivo("Venta POS - Ticket " + venta.getNumeroTicket());
                mov.setFecha(LocalDateTime.now());
                movimientoStockRepository.save(mov);
            }

            venta.setTotalUsd(totalUsd);
            venta.setTotalCop(totalUsd.multiply(tasaCop));
            venta.setTotalVes(totalUsd.multiply(tasaVes));

            if (montoRecibido != null && montoRecibido.compareTo(BigDecimal.ZERO) > 0) {
                venta.setMontoRecibido(montoRecibido);
                BigDecimal totalEnMonedaCobro = totalUsd;
                if ("COP".equalsIgnoreCase(monedaCobro)) totalEnMonedaCobro = venta.getTotalCop();
                else if ("VES".equalsIgnoreCase(monedaCobro)) totalEnMonedaCobro = venta.getTotalVes();

                venta.setMontoCambio(montoRecibido.subtract(totalEnMonedaCobro).max(BigDecimal.ZERO));
            } else {
                venta.setMontoRecibido(totalUsd);
                venta.setMontoCambio(BigDecimal.ZERO);
            }

            VentaComercial guardada = ventaRepository.save(venta);
            return ResponseEntity.status(HttpStatus.CREATED).body(guardada);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error procesando venta: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}/anular")
    @Transactional
    public ResponseEntity<?> anularVenta(@PathVariable Long id, @RequestParam Long tenantId) {
        VentaComercial v = ventaRepository.findById(id).orElse(null);
        if (v == null) return ResponseEntity.notFound().build();
        if (v.getEstado() == VentaComercial.EstadoVenta.ANULADA) {
            return ResponseEntity.badRequest().body(Map.of("error", "La venta ya está anulada"));
        }

        v.setEstado(VentaComercial.EstadoVenta.ANULADA);

        for (DetalleVentaComercial d : v.getItems()) {
            if (d.getProducto() != null) {
                ProductoComercial prod = d.getProducto();
                BigDecimal stockAnt = prod.getStockActual() != null ? prod.getStockActual() : BigDecimal.ZERO;
                BigDecimal cantidad = d.getCantidad() != null ? d.getCantidad() : BigDecimal.ONE;
                BigDecimal nuevoStock = stockAnt.add(cantidad);
                prod.setStockActual(nuevoStock);
                productoRepository.save(prod);

                MovimientoStock mov = new MovimientoStock();
                mov.setTenantId(tenantId);
                mov.setProducto(prod);
                mov.setTipo("ENTRADA");
                mov.setCantidad(cantidad);
                mov.setStockAnterior(stockAnt);
                mov.setStockNuevo(nuevoStock);
                mov.setMotivo("Anulación de Venta - Ticket " + v.getNumeroTicket());
                mov.setFecha(LocalDateTime.now());
                movimientoStockRepository.save(mov);
            }
        }

        return ResponseEntity.ok(ventaRepository.save(v));
    }

    @GetMapping("/resumen-caja")
    public ResponseEntity<?> resumenCajaHoy() {
        LocalDateTime inicioHoy = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime finHoy = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);
        List<VentaComercial> ventasHoy = ventaRepository.findByFechaBetweenAndEstado(inicioHoy, finHoy, VentaComercial.EstadoVenta.COMPLETADA);

        BigDecimal totalUsd = BigDecimal.ZERO, totalCop = BigDecimal.ZERO, totalVes = BigDecimal.ZERO;
        BigDecimal recaudadoUsd = BigDecimal.ZERO, recaudadoCop = BigDecimal.ZERO, recaudadoVes = BigDecimal.ZERO;

        Map<String, Integer> conteoProductos = new HashMap<>();
        Map<String, BigDecimal> montoPorMetodo = new HashMap<>();

        for (VentaComercial v : ventasHoy) {
            totalUsd = totalUsd.add(v.getTotalUsd() != null ? v.getTotalUsd() : BigDecimal.ZERO);
            totalCop = totalCop.add(v.getTotalCop() != null ? v.getTotalCop() : BigDecimal.ZERO);
            totalVes = totalVes.add(v.getTotalVes() != null ? v.getTotalVes() : BigDecimal.ZERO);

            String metodo = v.getMetodoPago() != null ? v.getMetodoPago() : "USD_EFECTIVO";
            montoPorMetodo.merge(metodo, v.getTotalUsd() != null ? v.getTotalUsd() : BigDecimal.ZERO, BigDecimal::add);

            if ("COP".equalsIgnoreCase(v.getMonedaCobro()) || metodo.contains("COP")) {
                recaudadoCop = recaudadoCop.add(v.getTotalCop() != null ? v.getTotalCop() : BigDecimal.ZERO);
            } else if ("VES".equalsIgnoreCase(v.getMonedaCobro()) || metodo.contains("VES")) {
                recaudadoVes = recaudadoVes.add(v.getTotalVes() != null ? v.getTotalVes() : BigDecimal.ZERO);
            } else {
                recaudadoUsd = recaudadoUsd.add(v.getTotalUsd() != null ? v.getTotalUsd() : BigDecimal.ZERO);
            }

            for (DetalleVentaComercial item : v.getItems()) {
                String key = item.getNombreProducto() + (item.getTamano() != null ? " (" + item.getTamano() + ")" : "");
                int cant = item.getCantidad() != null ? item.getCantidad().intValue() : 1;
                conteoProductos.merge(key, cant, Integer::sum);
            }
        }

        Map<String, Object> resumen = new HashMap<>();
        resumen.put("fecha", LocalDate.now().toString());
        resumen.put("cantidadVentas", ventasHoy.size());
        resumen.put("totalVentasUsd", totalUsd);
        resumen.put("totalVentasCop", totalCop);
        resumen.put("totalVentasVes", totalVes);
        resumen.put("recaudadoUsd", recaudadoUsd);
        resumen.put("recaudadoCop", recaudadoCop);
        resumen.put("recaudadoVes", recaudadoVes);
        resumen.put("montoPorMetodo", montoPorMetodo);
        resumen.put("productosVendidos", conteoProductos);
        resumen.put("tasaCop", TASA_COP_DEFAULT);
        resumen.put("tasaVes", TASA_VES_DEFAULT);

        return ResponseEntity.ok(resumen);
    }
}
