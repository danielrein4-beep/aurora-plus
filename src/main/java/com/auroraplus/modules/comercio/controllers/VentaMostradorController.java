package com.auroraplus.modules.comercio.controllers;

import com.auroraplus.modules.comercio.entities.VentaMostrador;
import com.auroraplus.modules.comercio.repositories.VentaMostradorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/comercio/ventas")
public class VentaMostradorController {

    private static final int LIMITE_LISTADO = 3000;

    @Autowired
    private VentaMostradorRepository ventaRepository;

    public static class VentaRequest {
        public String numero;
        public String clienteNombre;
        public String clienteDocumento;
        public BigDecimal total;
        public BigDecimal utilidad;
        public String metodoPago;
        public Boolean esCredito;
        public String fechaIso; // ISO-8601; si falta se usa "ahora" — ventas migradas del navegador la traen
        public String detalleJson;
    }

    /** Guarda una venta. Idempotente por (tenant, numero): reenviar la misma venta (reintento, o migración
     * del navegador) devuelve la ya guardada en vez de duplicarla. */
    @PostMapping
    @Transactional
    public ResponseEntity<VentaMostrador> guardar(@RequestParam Long tenantId, @RequestBody VentaRequest req) {
        return ResponseEntity.ok(guardarUna(tenantId, req));
    }

    /** Migración única del historial que vivía en el navegador — cada fila se guarda con la misma regla idempotente. */
    @PostMapping("/lote")
    @Transactional
    public ResponseEntity<Map<String, Integer>> guardarLote(@RequestParam Long tenantId, @RequestBody List<VentaRequest> lote) {
        int guardadas = 0;
        List<String> omitidas = new ArrayList<>();
        for (VentaRequest req : lote) {
            try {
                guardarUna(tenantId, req);
                guardadas++;
            } catch (RuntimeException e) {
                omitidas.add(req.numero);
            }
        }
        return ResponseEntity.ok(Map.of("guardadas", guardadas, "omitidas", omitidas.size()));
    }

    @GetMapping
    public List<VentaMostrador> listar(@RequestParam Long tenantId) {
        return ventaRepository.findByTenantIdOrderByFechaRegistroDesc(tenantId, PageRequest.of(0, LIMITE_LISTADO));
    }

    private VentaMostrador guardarUna(Long tenantId, VentaRequest req) {
        if (req.numero == null || req.numero.isBlank()) throw new RuntimeException("La venta no tiene número");
        if (req.detalleJson == null || req.detalleJson.isBlank()) throw new RuntimeException("La venta no tiene detalle");
        return ventaRepository.findByTenantIdAndNumero(tenantId, req.numero).orElseGet(() -> {
            VentaMostrador v = new VentaMostrador();
            v.setTenantId(tenantId);
            v.setNumero(req.numero.trim());
            v.setClienteNombre(req.clienteNombre);
            v.setClienteDocumento(req.clienteDocumento);
            v.setTotal(req.total != null ? req.total : BigDecimal.ZERO);
            v.setUtilidad(req.utilidad);
            v.setMetodoPago(req.metodoPago);
            v.setEsCredito(Boolean.TRUE.equals(req.esCredito));
            v.setDetalleJson(req.detalleJson);
            if (req.fechaIso != null && !req.fechaIso.isBlank()) {
                try { v.setFechaRegistro(LocalDateTime.parse(req.fechaIso.replace("Z", ""))); } catch (Exception ignorada) { /* queda "ahora" */ }
            }
            return ventaRepository.save(v);
        });
    }
}
