package com.auroraplus.core.financiero.controllers;

import com.auroraplus.core.financiero.entities.ArqueoCaja;
import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.ArqueoCajaRepository;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.core.financiero.services.TesoreriaPdfService;
import com.auroraplus.core.financiero.services.TesoreriaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Cierre de caja real: cuenta ciega del cajero contra el sistema, acotada
 * al período desde el último cierre (no todo el histórico).
 */
@RestController("coreFinancieroTesoreriaController")
@RequestMapping("/api/financiero/tesoreria")
public class TesoreriaController {

    @Autowired
    private TesoreriaService tesoreriaService;

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    @Autowired
    private ArqueoCajaRepository arqueoCajaRepository;

    @Autowired
    private TesoreriaPdfService tesoreriaPdfService;

    /** Vista previa del período abierto (sin cerrarlo), para que el cajero sepa qué esperar antes de declarar. */
    @GetMapping("/resumen-periodo-abierto")
    public ResponseEntity<Map<String, Object>> resumenPeriodoAbierto(@RequestParam Long tenantId, @RequestParam String moneda) {
        Optional<ArqueoCaja> ultimoArqueo = arqueoCajaRepository.findTopByTenantIdAndMonedaOrderByFechaArqueoDesc(tenantId, moneda);
        LocalDateTime desde = ultimoArqueo.map(ArqueoCaja::getFechaArqueo).orElse(LocalDateTime.of(2000, 1, 1, 0, 0));
        LocalDateTime ahora = LocalDateTime.now();

        BigDecimal ingresos = movimientoCajaRepository.sumarMontoPorTipoYMonedaEntreFechas(tenantId, moneda, MovimientoCaja.TipoMovimiento.INGRESO, desde, ahora);
        BigDecimal egresos = movimientoCajaRepository.sumarMontoPorTipoYMonedaEntreFechas(tenantId, moneda, MovimientoCaja.TipoMovimiento.EGRESO, desde, ahora);
        List<MovimientoCaja> movimientos = movimientoCajaRepository.findByTenantIdAndMonedaAndFechaRegistroBetweenOrderByFechaRegistroAsc(tenantId, moneda, desde, ahora);

        return ResponseEntity.ok(Map.of(
            "desde", desde,
            "hasta", ahora,
            "totalIngresos", ingresos,
            "totalEgresos", egresos,
            "montoEsperadoEnCaja", ingresos.subtract(egresos),
            "cantidadMovimientos", movimientos.size(),
            "movimientos", movimientos
        ));
    }

    /** Cierre de caja: el cajero declara lo que tiene físicamente, el sistema calcula el descuadre. */
    @PostMapping("/cerrar-caja")
    public ResponseEntity<ArqueoCaja> cerrarCaja(@RequestParam Long tenantId, @RequestParam String idCajero,
                                                  @RequestParam BigDecimal montoDeclarado, @RequestParam String moneda) {
        return ResponseEntity.ok(tesoreriaService.procesarArqueoCiego(tenantId, idCajero, montoDeclarado, moneda));
    }

    @GetMapping("/historial-cierres")
    public List<ArqueoCaja> historialCierres() {
        return arqueoCajaRepository.findAll();
    }

    /** PDF del comprobante de un cierre de caja ya registrado, con el desglose completo de sus movimientos. */
    @GetMapping(value = "/cierre/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> cierrePdf(@PathVariable Long id, @RequestParam Long tenantId) throws Exception {
        ArqueoCaja arqueo = arqueoCajaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Cierre de caja no encontrado"));

        if (!arqueo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: cierre no pertenece a este tenant");
        }

        Optional<ArqueoCaja> arqueoAnterior = arqueoCajaRepository
            .findFirstByTenantIdAndMonedaAndFechaArqueoLessThanOrderByFechaArqueoDesc(tenantId, arqueo.getMoneda(), arqueo.getFechaArqueo());
        LocalDateTime desde = arqueoAnterior.map(ArqueoCaja::getFechaArqueo).orElse(LocalDateTime.of(2000, 1, 1, 0, 0));

        List<MovimientoCaja> movimientos = movimientoCajaRepository
            .findByTenantIdAndMonedaAndFechaRegistroBetweenOrderByFechaRegistroAsc(tenantId, arqueo.getMoneda(), desde, arqueo.getFechaArqueo());

        byte[] pdf = tesoreriaPdfService.generarCierrePdf(arqueo, desde, movimientos);

        String nombreArchivo = "cierre-caja-" + arqueo.getId() + "-" + arqueo.getFechaArqueo().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm")) + ".pdf";
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nombreArchivo + "\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }
}
