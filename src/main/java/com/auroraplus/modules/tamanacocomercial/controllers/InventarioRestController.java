package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.InventarioPatio;
import com.auroraplus.modules.tamanacocomercial.repositories.DespachoComercialRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.InventarioPatioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Control de Inventario y Stock de Mineral en Patio, independiente del catálogo
 * de ProductoComercial/MovimientoStock (InventarioController). No modifica
 * DespachoComercial, salvo una consulta agregada de conciliación informativa.
 */
@RestController
@RequestMapping("/api/tamanaco-comercial/inventario-patio")
public class InventarioRestController {

    @Autowired
    private InventarioPatioRepository inventarioPatioRepository;

    @Autowired
    private DespachoComercialRepository despachoComercialRepository;

    private static final BigDecimal UMBRAL_STOCK_BAJO_PORCENTAJE = new BigDecimal("0.20");

    @GetMapping("/pilas")
    public ResponseEntity<List<InventarioPatio>> listarPilas() {
        return ResponseEntity.ok(inventarioPatioRepository.findAllByOrderByMinaAscPilaAcopioAsc());
    }

    @PostMapping("/pilas")
    public ResponseEntity<?> crearPila(@RequestParam Long tenantId, @RequestBody InventarioPatio pila) {
        if (pila.getMina() == null || pila.getMina().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "La mina es obligatoria"));
        }
        if (pila.getPilaAcopio() == null || pila.getPilaAcopio().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El nombre de la pila de acopio es obligatorio"));
        }
        pila.setTenantId(tenantId);
        pila.setToneladasEntrada(pila.getToneladasEntrada() != null ? pila.getToneladasEntrada() : BigDecimal.ZERO);
        pila.setToneladasSalida(pila.getToneladasSalida() != null ? pila.getToneladasSalida() : BigDecimal.ZERO);
        pila.recalcularStock();
        return ResponseEntity.status(HttpStatus.CREATED).body(inventarioPatioRepository.save(pila));
    }

    @PutMapping("/pilas/{id}")
    public ResponseEntity<?> actualizarPila(@PathVariable Long id, @RequestBody InventarioPatio datos) {
        return inventarioPatioRepository.findById(id).map(p -> {
            if (datos.getPilaAcopio() != null) p.setPilaAcopio(datos.getPilaAcopio());
            if (datos.getCapacidadMaximaTon() != null) p.setCapacidadMaximaTon(datos.getCapacidadMaximaTon());
            return ResponseEntity.ok(inventarioPatioRepository.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/pilas/{id}")
    public ResponseEntity<?> eliminarPila(@PathVariable Long id) {
        if (!inventarioPatioRepository.existsById(id)) return ResponseEntity.notFound().build();
        inventarioPatioRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/pilas/{id}/movimiento")
    public ResponseEntity<?> registrarMovimiento(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        InventarioPatio pila = inventarioPatioRepository.findById(id).orElse(null);
        if (pila == null) return ResponseEntity.notFound().build();

        String tipo = body.get("tipo") != null ? body.get("tipo").toString() : null;
        BigDecimal toneladas = body.get("toneladas") != null ? new BigDecimal(body.get("toneladas").toString()) : null;

        if (tipo == null || (!tipo.equals("ENTRADA") && !tipo.equals("SALIDA"))) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tipo de movimiento inválido (use ENTRADA o SALIDA)"));
        }
        if (toneladas == null || toneladas.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Las toneladas deben ser mayores a cero"));
        }

        if (tipo.equals("ENTRADA")) {
            pila.setToneladasEntrada((pila.getToneladasEntrada() != null ? pila.getToneladasEntrada() : BigDecimal.ZERO).add(toneladas));
        } else {
            BigDecimal stockDisponible = pila.getStockActual() != null ? pila.getStockActual() : BigDecimal.ZERO;
            if (toneladas.compareTo(stockDisponible) > 0) {
                return ResponseEntity.badRequest().body(Map.of("error",
                        "No hay suficiente stock en la pila. Disponible: " + stockDisponible + " ton"));
            }
            pila.setToneladasSalida((pila.getToneladasSalida() != null ? pila.getToneladasSalida() : BigDecimal.ZERO).add(toneladas));
        }

        pila.recalcularStock();
        pila.setFechaUltimoMovimiento(LocalDateTime.now());
        return ResponseEntity.ok(inventarioPatioRepository.save(pila));
    }

    @GetMapping("/stock-actual")
    public ResponseEntity<Map<String, Object>> stockActual() {
        List<InventarioPatio> pilas = inventarioPatioRepository.findAllByOrderByMinaAscPilaAcopioAsc();

        BigDecimal stockTotalTon = BigDecimal.ZERO;
        BigDecimal totalEntradaTon = BigDecimal.ZERO;
        BigDecimal totalSalidaTon = BigDecimal.ZERO;
        int pilasBajoStock = 0;

        Map<String, BigDecimal> recepcionesPorMinaCache = new HashMap<>();
        List<Map<String, Object>> pilasDTO = new ArrayList<>();

        for (InventarioPatio p : pilas) {
            BigDecimal entrada = p.getToneladasEntrada() != null ? p.getToneladasEntrada() : BigDecimal.ZERO;
            BigDecimal salida = p.getToneladasSalida() != null ? p.getToneladasSalida() : BigDecimal.ZERO;
            BigDecimal stock = p.getStockActual() != null ? p.getStockActual() : entrada.subtract(salida);
            BigDecimal capacidad = (p.getCapacidadMaximaTon() != null && p.getCapacidadMaximaTon().compareTo(BigDecimal.ZERO) > 0)
                ? p.getCapacidadMaximaTon() : new BigDecimal("500.0000");
            BigDecimal porcentajeOcupacion = capacidad.compareTo(BigDecimal.ZERO) > 0
                ? stock.divide(capacidad, 6, RoundingMode.HALF_UP).multiply(new BigDecimal("100"))
                    .max(BigDecimal.ZERO).min(new BigDecimal("100"))
                : BigDecimal.ZERO;
            boolean stockBajo = stock.compareTo(capacidad.multiply(UMBRAL_STOCK_BAJO_PORCENTAJE)) <= 0;

            stockTotalTon = stockTotalTon.add(stock);
            totalEntradaTon = totalEntradaTon.add(entrada);
            totalSalidaTon = totalSalidaTon.add(salida);
            if (stockBajo) pilasBajoStock++;

            BigDecimal recepcionesMina = recepcionesPorMinaCache.computeIfAbsent(p.getMina(),
                    m -> { BigDecimal s = despachoComercialRepository.sumPesoByMina(m); return s != null ? s : BigDecimal.ZERO; });

            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", p.getId());
            dto.put("mina", p.getMina());
            dto.put("pilaAcopio", p.getPilaAcopio());
            dto.put("toneladasEntrada", entrada);
            dto.put("toneladasSalida", salida);
            dto.put("stockActual", stock);
            dto.put("capacidadMaximaTon", capacidad);
            dto.put("porcentajeOcupacion", porcentajeOcupacion.setScale(1, RoundingMode.HALF_UP));
            dto.put("stockBajo", stockBajo);
            dto.put("recepcionesDespachosMina", recepcionesMina);
            dto.put("fechaUltimoMovimiento", p.getFechaUltimoMovimiento());
            pilasDTO.add(dto);
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("stockTotalTon", stockTotalTon.setScale(2, RoundingMode.HALF_UP));
        respuesta.put("totalEntradaTon", totalEntradaTon.setScale(2, RoundingMode.HALF_UP));
        respuesta.put("totalSalidaTon", totalSalidaTon.setScale(2, RoundingMode.HALF_UP));
        respuesta.put("totalPilas", pilas.size());
        respuesta.put("pilasBajoStock", pilasBajoStock);
        respuesta.put("pilas", pilasDTO);

        return ResponseEntity.ok(respuesta);
    }
}
