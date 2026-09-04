package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.CambioMoneda;
import com.auroraplus.modules.tamanacocomercial.entities.Gasto;
import com.auroraplus.modules.tamanacocomercial.entities.Ingreso;
import com.auroraplus.modules.tamanacocomercial.repositories.CambioMonedaRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.GastoRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.IngresoRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Tesorería: Ingresos, Cambios de Moneda y Flujo de Caja consolidado.
 * El reporte PDF original usaba OpenPDF/lowagie (no incluido en las dependencias
 * de Aurora+); se reconstruyó aquí con Apache PDFBox, ya usado en el resto del
 * sistema, con un diseño más simple (tabla de texto plano en vez de PdfPTable con
 * estilos ricos), pero con los mismos datos y totales.
 */
@RestController
@RequestMapping("/api/tamanaco-comercial/tesoreria")
public class TesoreriaController {

    @Autowired
    private IngresoRepository ingresoRepository;

    @Autowired
    private GastoRepository gastoRepository;

    @Autowired
    private CambioMonedaRepository cambioMonedaRepository;

    @GetMapping("/ingresos")
    public List<Ingreso> listarIngresos() {
        return ingresoRepository.findAllByOrderByFechaDescIdDesc();
    }

    @PostMapping("/ingresos")
    public ResponseEntity<?> registrarIngreso(@RequestParam Long tenantId, @RequestBody Ingreso ingreso) {
        if (ingreso.getClienteOrigen() == null || ingreso.getClienteOrigen().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El cliente u origen del pago es obligatorio"));
        }
        if (ingreso.getMonto() == null || ingreso.getMonto().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "El monto ingresado debe ser mayor a 0"));
        }
        if (ingreso.getMoneda() == null || ingreso.getMoneda().trim().isEmpty()) {
            ingreso.setMoneda("COP");
        }
        if (ingreso.getMetodoPago() == null || ingreso.getMetodoPago().trim().isEmpty()) {
            ingreso.setMetodoPago("Transferencia Bancaria");
        }
        ingreso.setTenantId(tenantId);
        Ingreso guardado = ingresoRepository.save(ingreso);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    @PutMapping("/ingresos/{id}")
    public ResponseEntity<?> actualizarIngreso(@PathVariable Long id, @RequestBody Ingreso datos) {
        return ingresoRepository.findById(id)
            .map(i -> {
                i.setFecha(datos.getFecha());
                i.setClienteOrigen(datos.getClienteOrigen());
                i.setMonto(datos.getMonto());
                i.setMoneda(datos.getMoneda());
                i.setMetodoPago(datos.getMetodoPago());
                i.setReferencia(datos.getReferencia());
                i.setNotas(datos.getNotas());
                return ResponseEntity.ok(ingresoRepository.save(i));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/ingresos/{id}")
    public ResponseEntity<?> eliminarIngreso(@PathVariable Long id) {
        if (!ingresoRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        ingresoRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("mensaje", "Ingreso eliminado correctamente"));
    }

    @GetMapping("/cambios")
    public List<CambioMoneda> listarCambios() {
        return cambioMonedaRepository.findAllByOrderByFechaDescIdDesc();
    }

    @PostMapping("/cambios")
    public ResponseEntity<?> registrarCambio(@RequestParam Long tenantId, @RequestBody CambioMoneda cambio) {
        if (cambio.getMonedaOrigen() == null || cambio.getMonedaDestino() == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Moneda origen y destino son obligatorias"));
        if (cambio.getMonedaOrigen().equalsIgnoreCase(cambio.getMonedaDestino()))
            return ResponseEntity.badRequest().body(Map.of("error", "Las monedas de origen y destino deben ser distintas"));
        if (cambio.getMontoOrigen() == null || cambio.getMontoOrigen().compareTo(BigDecimal.ZERO) <= 0)
            return ResponseEntity.badRequest().body(Map.of("error", "El monto a entregar debe ser mayor a cero"));
        if (cambio.getMontoDestino() == null || cambio.getMontoDestino().compareTo(BigDecimal.ZERO) <= 0)
            return ResponseEntity.badRequest().body(Map.of("error", "El monto a recibir debe ser mayor a cero"));

        if (cambio.getTasaCambio() == null || cambio.getTasaCambio().compareTo(BigDecimal.ZERO) <= 0) {
            cambio.setTasaCambio(cambio.getMontoOrigen().divide(cambio.getMontoDestino(), 4, RoundingMode.HALF_UP));
        }
        cambio.setTenantId(tenantId);
        return ResponseEntity.status(HttpStatus.CREATED).body(cambioMonedaRepository.save(cambio));
    }

    @PutMapping("/cambios/{id}")
    public ResponseEntity<?> actualizarCambio(@PathVariable Long id, @RequestBody CambioMoneda datos) {
        return cambioMonedaRepository.findById(id)
            .map(c -> {
                c.setFecha(datos.getFecha());
                c.setMonedaOrigen(datos.getMonedaOrigen());
                c.setMontoOrigen(datos.getMontoOrigen());
                c.setMonedaDestino(datos.getMonedaDestino());
                c.setMontoDestino(datos.getMontoDestino());
                if (datos.getTasaCambio() != null && datos.getTasaCambio().compareTo(BigDecimal.ZERO) > 0) {
                    c.setTasaCambio(datos.getTasaCambio());
                } else if (datos.getMontoOrigen() != null && datos.getMontoDestino() != null && datos.getMontoDestino().compareTo(BigDecimal.ZERO) > 0) {
                    c.setTasaCambio(datos.getMontoOrigen().divide(datos.getMontoDestino(), 4, RoundingMode.HALF_UP));
                }
                c.setConcepto(datos.getConcepto());
                c.setReferencia(datos.getReferencia());
                c.setNotas(datos.getNotas());
                return ResponseEntity.ok(cambioMonedaRepository.save(c));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/cambios/{id}")
    public ResponseEntity<?> eliminarCambio(@PathVariable Long id) {
        if (!cambioMonedaRepository.existsById(id))
            return ResponseEntity.notFound().build();
        cambioMonedaRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("mensaje", "Cambio eliminado correctamente"));
    }

    @GetMapping("/flujo-caja")
    public ResponseEntity<?> obtenerFlujoCaja() {
        List<Ingreso> todosIngresos = ingresoRepository.findAll();
        List<Gasto> todosGastos = gastoRepository.findAll();
        List<CambioMoneda> todosCambios = cambioMonedaRepository.findAll();

        BigDecimal totalIngresosCop = sumaPorMoneda(todosIngresos, "COP", Ingreso::getMoneda, Ingreso::getMonto);
        BigDecimal totalIngresosUsd = sumaPorMoneda(todosIngresos, "USD", Ingreso::getMoneda, Ingreso::getMonto);
        BigDecimal totalIngresosVes = sumaPorMoneda(todosIngresos, "VES", Ingreso::getMoneda, Ingreso::getMonto);

        BigDecimal totalGastosCop = sumaPorMoneda(todosGastos, "COP", Gasto::getMoneda, Gasto::getMonto);
        BigDecimal totalGastosUsd = sumaPorMoneda(todosGastos, "USD", Gasto::getMoneda, Gasto::getMonto);
        BigDecimal totalGastosVes = sumaPorMoneda(todosGastos, "VES", Gasto::getMoneda, Gasto::getMonto);

        BigDecimal cambioSalidaCop = sumaPorMoneda(todosCambios, "COP", CambioMoneda::getMonedaOrigen, CambioMoneda::getMontoOrigen);
        BigDecimal cambioEntradaCop = sumaPorMoneda(todosCambios, "COP", CambioMoneda::getMonedaDestino, CambioMoneda::getMontoDestino);
        BigDecimal cambioSalidaUsd = sumaPorMoneda(todosCambios, "USD", CambioMoneda::getMonedaOrigen, CambioMoneda::getMontoOrigen);
        BigDecimal cambioEntradaUsd = sumaPorMoneda(todosCambios, "USD", CambioMoneda::getMonedaDestino, CambioMoneda::getMontoDestino);
        BigDecimal cambioSalidaVes = sumaPorMoneda(todosCambios, "VES", CambioMoneda::getMonedaOrigen, CambioMoneda::getMontoOrigen);
        BigDecimal cambioEntradaVes = sumaPorMoneda(todosCambios, "VES", CambioMoneda::getMonedaDestino, CambioMoneda::getMontoDestino);

        BigDecimal saldoDisponibleCop = totalIngresosCop.subtract(totalGastosCop).add(cambioEntradaCop).subtract(cambioSalidaCop);
        BigDecimal saldoDisponibleUsd = totalIngresosUsd.subtract(totalGastosUsd).add(cambioEntradaUsd).subtract(cambioSalidaUsd);
        BigDecimal saldoDisponibleVes = totalIngresosVes.subtract(totalGastosVes).add(cambioEntradaVes).subtract(cambioSalidaVes);

        List<Map<String, Object>> movimientos = construirLibroDiario(todosIngresos, todosGastos, todosCambios);

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("totalIngresosCop", round2(totalIngresosCop));
        respuesta.put("totalGastosCop", round2(totalGastosCop));
        respuesta.put("saldoDisponibleCop", round2(saldoDisponibleCop));
        respuesta.put("totalIngresosUsd", round2(totalIngresosUsd));
        respuesta.put("totalGastosUsd", round2(totalGastosUsd));
        respuesta.put("saldoDisponibleUsd", round2(saldoDisponibleUsd));
        respuesta.put("totalIngresosVes", round2(totalIngresosVes));
        respuesta.put("totalGastosVes", round2(totalGastosVes));
        respuesta.put("saldoDisponibleVes", round2(saldoDisponibleVes));
        respuesta.put("movimientos", movimientos);

        return ResponseEntity.ok(respuesta);
    }

    private BigDecimal round2(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }

    private <T> BigDecimal sumaPorMoneda(List<T> lista, String moneda, java.util.function.Function<T, String> monedaFn, java.util.function.Function<T, BigDecimal> montoFn) {
        return lista.stream()
            .filter(x -> moneda.equalsIgnoreCase(monedaFn.apply(x)))
            .map(x -> montoFn.apply(x) != null ? montoFn.apply(x) : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<Map<String, Object>> construirLibroDiario(List<Ingreso> ingresos, List<Gasto> gastos, List<CambioMoneda> cambios) {
        List<Map<String, Object>> movimientos = new ArrayList<>();

        for (Ingreso in : ingresos) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", in.getId());
            m.put("tipo", "INGRESO");
            m.put("fecha", in.getFecha().toString());
            m.put("createdAt", in.getCreatedAt() != null ? in.getCreatedAt().toString() : in.getFecha().atStartOfDay().toString());
            m.put("concepto", "Depósito de " + in.getClienteOrigen() + (in.getReferencia() != null ? " (Ref: " + in.getReferencia() + ")" : ""));
            m.put("categoria", "Depósito / Cobro");
            m.put("metodoPago", in.getMetodoPago());
            m.put("moneda", in.getMoneda());
            m.put("monto", in.getMonto());
            m.put("signo", "+");
            movimientos.add(m);
        }

        for (Gasto g : gastos) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", g.getId());
            m.put("tipo", "EGRESO");
            m.put("fecha", g.getFecha().toString());
            m.put("createdAt", g.getCreatedAt() != null ? g.getCreatedAt().toString() : g.getFecha().atStartOfDay().toString());
            m.put("concepto", g.getDescripcion() + (g.getMinaAsociada() != null ? " — " + g.getMinaAsociada() : ""));
            m.put("categoria", g.getCategoria());
            m.put("metodoPago", g.getMetodoPago());
            m.put("moneda", g.getMoneda());
            m.put("monto", g.getMonto());
            m.put("signo", "-");
            movimientos.add(m);
        }

        for (CambioMoneda c : cambios) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", c.getId());
            m.put("tipo", "CAMBIO");
            m.put("fecha", c.getFecha().toString());
            m.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : c.getFecha().atStartOfDay().toString());
            m.put("concepto", c.getConcepto() != null && !c.getConcepto().isBlank() ? c.getConcepto() : "Conversion " + c.getMonedaOrigen() + " a " + c.getMonedaDestino());
            m.put("categoria", "Cambio de Moneda");
            m.put("moneda", c.getMonedaOrigen() + " -> " + c.getMonedaDestino());
            m.put("monto", c.getMontoOrigen());
            m.put("montoDestino", c.getMontoDestino());
            m.put("signo", "~");
            movimientos.add(m);
        }

        movimientos.sort((a, b) -> {
            String ca = (String) a.get("createdAt");
            String cb = (String) b.get("createdAt");
            int comp = cb.compareTo(ca);
            if (comp != 0) return comp;
            return ((Number) b.get("id")).longValue() > ((Number) a.get("id")).longValue() ? 1 : -1;
        });

        return movimientos;
    }

    /**
     * Estado de Caja en PDF (reconstruido con PDFBox; ver nota de clase).
     */
    @GetMapping(value = "/reporte-pdf", produces = "application/pdf")
    public ResponseEntity<byte[]> generarReportePdf(
            @RequestParam(required = false) String fechaInicio,
            @RequestParam(required = false) String fechaFin,
            @RequestParam(required = false, defaultValue = "TODAS") String moneda,
            @RequestParam(required = false, defaultValue = "TODAS") String tipo) throws IOException {

        LocalDate inicio = (fechaInicio != null && !fechaInicio.isEmpty()) ? LocalDate.parse(fechaInicio) : LocalDate.of(2000, 1, 1);
        LocalDate fin = (fechaFin != null && !fechaFin.isEmpty()) ? LocalDate.parse(fechaFin) : LocalDate.now();
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        List<Ingreso> ingresos = ingresoRepository.findAll().stream()
                .filter(i -> i.getFecha() != null && !i.getFecha().isBefore(inicio) && !i.getFecha().isAfter(fin))
                .filter(i -> "TODAS".equalsIgnoreCase(moneda) || moneda.equalsIgnoreCase(i.getMoneda()))
                .sorted(Comparator.comparing(Ingreso::getFecha))
                .collect(Collectors.toList());

        List<Gasto> gastos = gastoRepository.findAll().stream()
                .filter(g -> g.getFecha() != null && !g.getFecha().isBefore(inicio) && !g.getFecha().isAfter(fin))
                .filter(g -> "TODAS".equalsIgnoreCase(moneda) || moneda.equalsIgnoreCase(g.getMoneda()))
                .sorted(Comparator.comparing(Gasto::getFecha))
                .collect(Collectors.toList());

        BigDecimal ingCop = sumaPorMoneda(ingresos, "COP", Ingreso::getMoneda, Ingreso::getMonto);
        BigDecimal ingUsd = sumaPorMoneda(ingresos, "USD", Ingreso::getMoneda, Ingreso::getMonto);
        BigDecimal ingVes = sumaPorMoneda(ingresos, "VES", Ingreso::getMoneda, Ingreso::getMonto);
        BigDecimal gstCop = sumaPorMoneda(gastos, "COP", Gasto::getMoneda, Gasto::getMonto);
        BigDecimal gstUsd = sumaPorMoneda(gastos, "USD", Gasto::getMoneda, Gasto::getMonto);
        BigDecimal gstVes = sumaPorMoneda(gastos, "VES", Gasto::getMoneda, Gasto::getMonto);

        BigDecimal saldoCop = ingCop.subtract(gstCop);
        BigDecimal saldoUsd = ingUsd.subtract(gstUsd);
        BigDecimal saldoVes = ingVes.subtract(gstVes);

        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            float pageHeight = page.getMediaBox().getHeight();

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 16);
                cs.newLineAtOffset(30, pageHeight - 40);
                cs.showText("Carbones Tamanaco - Estado de Tesoreria y Flujo de Caja");
                cs.endText();

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                cs.newLineAtOffset(30, pageHeight - 58);
                cs.showText("Periodo: " + inicio.format(dtf) + " al " + fin.format(dtf) + "   Moneda: " + moneda + "   Tipo: " + tipo);
                cs.endText();

                float y = pageHeight - 90;
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 11);
                cs.newLineAtOffset(30, y);
                cs.showText("Resumen de Saldos Disponibles");
                cs.endText();

                y -= 20;
                String[][] filas = {
                    {"COP", ingCop.toPlainString(), gstCop.toPlainString(), saldoCop.toPlainString()},
                    {"USD", ingUsd.toPlainString(), gstUsd.toPlainString(), saldoUsd.toPlainString()},
                    {"VES", ingVes.toPlainString(), gstVes.toPlainString(), saldoVes.toPlainString()}
                };
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 9);
                cs.beginText();
                cs.newLineAtOffset(30, y);
                cs.showText(String.format("%-8s %18s %18s %18s", "Moneda", "Ingresos", "Egresos", "Saldo"));
                cs.endText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                for (String[] fila : filas) {
                    y -= 15;
                    cs.beginText();
                    cs.newLineAtOffset(30, y);
                    cs.showText(String.format("%-8s %18s %18s %18s", fila[0], fila[1], fila[2], fila[3]));
                    cs.endText();
                }

                y -= 30;
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 11);
                cs.newLineAtOffset(30, y);
                cs.showText("Libro Diario - Detalle de Movimientos");
                cs.endText();

                y -= 18;
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 8);
                cs.beginText();
                cs.newLineAtOffset(30, y);
                cs.showText(String.format("%-11s %-8s %-30s %-12s %10s", "Fecha", "Tipo", "Concepto", "Moneda", "Monto"));
                cs.endText();

                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
                List<Map<String, Object>> filasMov = new ArrayList<>();
                if (!"EGRESO".equalsIgnoreCase(tipo)) {
                    for (Ingreso i : ingresos) {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("fecha", i.getFecha().format(dtf));
                        m.put("tipo", "+ INGRESO");
                        m.put("concepto", i.getClienteOrigen());
                        m.put("moneda", i.getMoneda());
                        m.put("monto", i.getMonto());
                        filasMov.add(m);
                    }
                }
                if (!"INGRESO".equalsIgnoreCase(tipo)) {
                    for (Gasto g : gastos) {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("fecha", g.getFecha().format(dtf));
                        m.put("tipo", "- EGRESO");
                        m.put("concepto", g.getDescripcion());
                        m.put("moneda", g.getMoneda());
                        m.put("monto", g.getMonto());
                        filasMov.add(m);
                    }
                }

                for (Map<String, Object> mv : filasMov) {
                    if (y < 50) break; // límite de una página en esta versión
                    y -= 13;
                    String concepto = mv.get("concepto") != null ? mv.get("concepto").toString() : "";
                    if (concepto.length() > 30) concepto = concepto.substring(0, 27) + "...";
                    cs.beginText();
                    cs.newLineAtOffset(30, y);
                    cs.showText(String.format("%-11s %-8s %-30s %-12s %10s",
                        mv.get("fecha"), mv.get("tipo"), concepto, mv.get("moneda"),
                        ((BigDecimal) mv.get("monto")).setScale(2, RoundingMode.HALF_UP)));
                    cs.endText();
                }

                y -= 20;
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 9);
                cs.newLineAtOffset(30, y);
                cs.showText("Total movimientos: " + filasMov.size());
                cs.endText();
            }

            document.save(out);
            byte[] pdf = out.toByteArray();

            return ResponseEntity.ok()
                .header("Content-Disposition", "inline; filename=estado_caja_" + inicio + "_" + fin + ".pdf")
                .body(pdf);
        }
    }
}
