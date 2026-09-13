package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.modules.ganaderia.entities.Animal;
import com.auroraplus.modules.ganaderia.entities.RegistroOrdeno;
import com.auroraplus.modules.ganaderia.entities.TanqueLeche;
import com.auroraplus.modules.ganaderia.entities.VentaLecheTanque;
import com.auroraplus.modules.ganaderia.repositories.AnimalRepository;
import com.auroraplus.modules.ganaderia.repositories.RegistroOrdenoRepository;
import com.auroraplus.modules.ganaderia.repositories.TanqueLecheRepository;
import com.auroraplus.modules.ganaderia.repositories.VentaLecheTanqueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ganaderia/ordeno")
public class RegistroOrdenoController {

    @Autowired
    private RegistroOrdenoRepository registroOrdenoRepository;

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private TanqueLecheRepository tanqueLecheRepository;

    @Autowired
    private VentaLecheTanqueRepository ventaLecheTanqueRepository;

    public static class RegistroRequest {
        public Long animalId;
        public LocalDate fecha;
        public String turno;
        public BigDecimal cantidadLitros;
        public BigDecimal precioVentaLitro; // opcional — sin esto, el registro solo cuenta producción, no ingreso
        public BigDecimal porcentajeGrasa;
        public BigDecimal porcentajeProteina;
        public String destino; // "TANQUE" (default) o "VENTA_DIRECTA"
    }

    @PostMapping
    public ResponseEntity<RegistroOrdeno> registrar(@RequestParam Long tenantId, @RequestBody RegistroRequest request) {
        Animal animal = animalRepository.findById(request.animalId)
            .orElseThrow(() -> new RuntimeException("Animal no encontrado"));
        if (!animal.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Animal no pertenece a este tenant");
        }
        if (request.cantidadLitros == null || request.cantidadLitros.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La cantidad de litros debe ser mayor a cero");
        }

        String dest = (request.destino != null && !request.destino.trim().isEmpty())
            ? request.destino.trim().toUpperCase()
            : "TANQUE";

        RegistroOrdeno registro = new RegistroOrdeno();
        registro.setTenantId(tenantId);
        registro.setAnimal(animal);
        // Snapshot del grupo de ordeño ACTUAL del animal — si más adelante se reasigna a otro
        // grupo, este registro histórico no cambia (ver RegistroOrdeno.grupoOrdeno).
        registro.setGrupoOrdeno(animal.getGrupoOrdeno());
        registro.setFecha(request.fecha != null ? request.fecha : LocalDate.now());
        registro.setTurno(request.turno);
        registro.setCantidadLitros(request.cantidadLitros);
        registro.setPrecioVentaLitro(request.precioVentaLitro);
        registro.setPorcentajeGrasa(request.porcentajeGrasa);
        registro.setPorcentajeProteina(request.porcentajeProteina);
        registro.setDestino(dest);

        RegistroOrdeno guardado = registroOrdenoRepository.save(registro);

        // Si el destino es TANQUE, sumar litros al stock del tanque de leche de la finca
        if ("TANQUE".equalsIgnoreCase(dest)) {
            TanqueLeche tanque = tanqueLecheRepository.findByTenantId(tenantId)
                .orElseGet(() -> {
                    TanqueLeche nuevo = new TanqueLeche();
                    nuevo.setTenantId(tenantId);
                    nuevo.setStockActualLitros(BigDecimal.ZERO);
                    nuevo.setCapacidadLitros(BigDecimal.valueOf(2000.00));
                    nuevo.setTemperaturaCelsius(BigDecimal.valueOf(4.0));
                    return nuevo;
                });
            tanque.setStockActualLitros(tanque.getStockActualLitros().add(request.cantidadLitros));
            tanque.setUltimaActualizacion(LocalDateTime.now());
            tanqueLecheRepository.save(tanque);
        }

        return ResponseEntity.ok(guardado);
    }

    @GetMapping("/animal/{animalId}")
    public List<RegistroOrdeno> historialAnimal(@PathVariable Long animalId) {
        return registroOrdenoRepository.findByAnimalIdOrderByFechaDesc(animalId);
    }

    /** Reporte de producción total del hato en un rango de fechas. */
    @GetMapping("/reporte")
    public Map<String, Object> reporte(@RequestParam Long tenantId, @RequestParam LocalDate desde, @RequestParam LocalDate hasta) {
        List<RegistroOrdeno> registros = registroOrdenoRepository.findByTenantIdAndFechaBetween(tenantId, desde, hasta);
        BigDecimal totalLitros = registros.stream()
            .map(RegistroOrdeno::getCantidadLitros)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalIngresos = registros.stream()
            .map(RegistroOrdeno::getMontoVenta)
            .filter(java.util.Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("desde", desde);
        resultado.put("hasta", hasta);
        resultado.put("totalLitros", totalLitros);
        resultado.put("totalIngresos", totalIngresos);
        resultado.put("cantidadRegistros", registros.size());
        resultado.put("registros", registros);
        return resultado;
    }

    /**
     * Producción e ingreso por ordeño, AGRUPADO por día, semana o mes — la
     * misma información del reporte, pero organizada para responder "¿cuánto
     * dio el lote cada día/semana/mes?" sin tener que sumar registro por
     * registro a mano.
     */
    @GetMapping("/ingresos-periodo")
    public List<Map<String, Object>> ingresosPeriodo(@RequestParam Long tenantId, @RequestParam LocalDate desde,
                                                        @RequestParam LocalDate hasta, @RequestParam(defaultValue = "DIA") String agrupacion) {
        List<RegistroOrdeno> registros = registroOrdenoRepository.findByTenantIdAndFechaBetween(tenantId, desde, hasta);

        Map<String, List<RegistroOrdeno>> porBucket = new java.util.TreeMap<>();
        for (RegistroOrdeno r : registros) {
            String clave = switch (agrupacion.toUpperCase()) {
                case "MES" -> r.getFecha().getYear() + "-" + String.format("%02d", r.getFecha().getMonthValue());
                case "SEMANA" -> {
                    java.time.temporal.WeekFields wf = java.time.temporal.WeekFields.ISO;
                    yield r.getFecha().get(wf.weekBasedYear()) + "-S" + String.format("%02d", r.getFecha().get(wf.weekOfWeekBasedYear()));
                }
                default -> r.getFecha().toString();
            };
            porBucket.computeIfAbsent(clave, k -> new java.util.ArrayList<>()).add(r);
        }

        List<Map<String, Object>> resultado = new java.util.ArrayList<>();
        for (Map.Entry<String, List<RegistroOrdeno>> entry : porBucket.entrySet()) {
            BigDecimal litros = entry.getValue().stream().map(RegistroOrdeno::getCantidadLitros)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
            BigDecimal ingresos = entry.getValue().stream().map(RegistroOrdeno::getMontoVenta)
                .filter(java.util.Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);

            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("periodo", entry.getKey());
            fila.put("totalLitros", litros);
            fila.put("totalIngresos", ingresos);
            fila.put("cantidadRegistros", entry.getValue().size());
            resultado.add(fila);
        }
        return resultado;
    }

    public static class DespachoTanqueRequest {
        public LocalDate fecha;
        public BigDecimal litrosVendidos;
        public BigDecimal precioLitroUSD;
        public String compradorOPlanta;
        public String monedaPago; // opcional, default USD
        public String notas;
    }

    public static class ConfigTanqueRequest {
        public BigDecimal capacidadLitros;
        public BigDecimal temperaturaCelsius;
        public BigDecimal stockAjuste;
    }

    @GetMapping("/tanque")
    public ResponseEntity<TanqueLeche> obtenerTanque(@RequestParam Long tenantId) {
        TanqueLeche tanque = tanqueLecheRepository.findByTenantId(tenantId)
            .orElseGet(() -> {
                TanqueLeche nuevo = new TanqueLeche();
                nuevo.setTenantId(tenantId);
                nuevo.setStockActualLitros(BigDecimal.ZERO);
                nuevo.setCapacidadLitros(BigDecimal.valueOf(2000.00));
                nuevo.setTemperaturaCelsius(BigDecimal.valueOf(4.0));
                nuevo.setUltimaActualizacion(LocalDateTime.now());
                return tanqueLecheRepository.save(nuevo);
            });
        return ResponseEntity.ok(tanque);
    }

    @PostMapping("/tanque/despacho")
    public ResponseEntity<?> despacharTanque(@RequestParam Long tenantId, @RequestBody DespachoTanqueRequest req) {
        if (req.litrosVendidos == null || req.litrosVendidos.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body("Los litros a despachar deben ser mayores a cero");
        }
        if (req.precioLitroUSD == null || req.precioLitroUSD.compareTo(BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest().body("El precio por litro no puede ser negativo");
        }
        if (req.compradorOPlanta == null || req.compradorOPlanta.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Debe indicar el comprador o planta receptora");
        }

        TanqueLeche tanque = tanqueLecheRepository.findByTenantId(tenantId)
            .orElseGet(() -> {
                TanqueLeche nuevo = new TanqueLeche();
                nuevo.setTenantId(tenantId);
                nuevo.setStockActualLitros(BigDecimal.ZERO);
                return tanqueLecheRepository.save(nuevo);
            });

        if (tanque.getStockActualLitros().compareTo(req.litrosVendidos) < 0) {
            return ResponseEntity.badRequest().body("Stock insuficiente en tanque. Stock actual: " + tanque.getStockActualLitros() + " L, intentando despachar: " + req.litrosVendidos + " L");
        }

        // Descontar del stock del tanque
        tanque.setStockActualLitros(tanque.getStockActualLitros().subtract(req.litrosVendidos));
        tanque.setUltimaActualizacion(LocalDateTime.now());
        tanqueLecheRepository.save(tanque);

        // Registrar la venta de leche
        VentaLecheTanque venta = new VentaLecheTanque();
        venta.setTenantId(tenantId);
        venta.setFecha(req.fecha != null ? req.fecha : LocalDate.now());
        venta.setLitrosVendidos(req.litrosVendidos);
        venta.setPrecioLitroUSD(req.precioLitroUSD);
        venta.setTotalUSD(req.litrosVendidos.multiply(req.precioLitroUSD).setScale(2, RoundingMode.HALF_UP));
        venta.setCompradorOPlanta(req.compradorOPlanta.trim());
        venta.setMonedaPago(req.monedaPago != null && !req.monedaPago.trim().isEmpty() ? req.monedaPago.trim().toUpperCase() : "USD");
        venta.setNotas(req.notas);
        ventaLecheTanqueRepository.save(venta);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("tanque", tanque);
        resp.put("venta", venta);
        resp.put("mensaje", "Despacho de leche registrado y stock descontado exitosamente");
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/tanque/ventas")
    public List<VentaLecheTanque> listarVentasTanque(@RequestParam Long tenantId) {
        return ventaLecheTanqueRepository.findByTenantIdOrderByFechaDesc(tenantId);
    }

    @Autowired
    private com.auroraplus.modules.ganaderia.services.DespachoLechePdfService despachoLechePdfService;

    @Autowired
    private com.auroraplus.core.config.repositories.LicenciaTenantRepository licenciaTenantRepository;

    @GetMapping(value = "/tanque/ventas/{id}/pdf", produces = org.springframework.http.MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> pdfDespacho(@PathVariable Long id) throws Exception {
        Long tenantId = com.auroraplus.core.config.TenantContext.getCurrentTenant();
        VentaLecheTanque despacho = ventaLecheTanqueRepository.findById(id)
            .filter(v -> tenantId != null && tenantId.equals(v.getTenantId()))
            .orElseThrow(() -> new RuntimeException("Despacho no encontrado"));
        var licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        byte[] pdf = despachoLechePdfService.generarNotaEntregaPdf(despacho, licencia);
        return ResponseEntity.ok()
            .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"nota-entrega-leche-" + id + ".pdf\"")
            .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
            .body(pdf);
    }

    @PutMapping("/tanque/config")
    public ResponseEntity<TanqueLeche> configurarTanque(@RequestParam Long tenantId, @RequestBody ConfigTanqueRequest req) {
        TanqueLeche tanque = tanqueLecheRepository.findByTenantId(tenantId)
            .orElseGet(() -> {
                TanqueLeche nuevo = new TanqueLeche();
                nuevo.setTenantId(tenantId);
                nuevo.setStockActualLitros(BigDecimal.ZERO);
                return nuevo;
            });
        if (req.capacidadLitros != null && req.capacidadLitros.compareTo(BigDecimal.ZERO) > 0) {
            tanque.setCapacidadLitros(req.capacidadLitros);
        }
        if (req.temperaturaCelsius != null) {
            tanque.setTemperaturaCelsius(req.temperaturaCelsius);
        }
        if (req.stockAjuste != null && req.stockAjuste.compareTo(BigDecimal.ZERO) >= 0) {
            tanque.setStockActualLitros(req.stockAjuste);
        }
        tanque.setUltimaActualizacion(LocalDateTime.now());
        return ResponseEntity.ok(tanqueLecheRepository.save(tanque));
    }
}
