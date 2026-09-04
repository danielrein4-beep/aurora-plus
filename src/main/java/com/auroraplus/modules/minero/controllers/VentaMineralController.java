package com.auroraplus.modules.minero.controllers;

import com.auroraplus.modules.minero.entities.VentaMineral;
import com.auroraplus.modules.minero.repositories.VentaMineralRepository;
import com.auroraplus.modules.minero.services.VentaMineralService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/minero/ventas")
public class VentaMineralController {

    @Autowired
    private VentaMineralService ventaMineralService;

    @Autowired
    private VentaMineralRepository ventaMineralRepository;

    public static class ItemVentaRequest {
        public String producto;
        public BigDecimal cantidad;
        public BigDecimal precioUnitario;
        public Long transformacionId;
    }

    public static class VentaRequest {
        public String numeroFactura;
        public String comprador;
        public List<ItemVentaRequest> items;
        public String monedaPago;
        public BigDecimal montoRecibido;
        // Opcional: clave generada por el POS al crear la venta offline, para
        // que un reintento tras reconectar no la duplique (ver IdempotenciaService).
        public String claveIdempotencia;
    }

    @GetMapping
    public List<VentaMineral> listar() {
        return ventaMineralRepository.findAllByOrderByFechaDesc();
    }

    @PostMapping
    public ResponseEntity<VentaMineral> registrar(@RequestParam Long tenantId, @RequestBody VentaRequest request) {
        List<VentaMineralService.ItemVentaMineral> items = request.items.stream().map(i -> {
            VentaMineralService.ItemVentaMineral item = new VentaMineralService.ItemVentaMineral();
            item.producto = i.producto;
            item.cantidad = i.cantidad;
            item.precioUnitario = i.precioUnitario;
            item.transformacionId = i.transformacionId;
            return item;
        }).toList();

        return ResponseEntity.ok(ventaMineralService.registrarVenta(
            tenantId, request.numeroFactura, request.comprador, items, request.monedaPago, request.montoRecibido,
            request.claveIdempotencia));
    }
}
