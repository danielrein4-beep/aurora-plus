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

    /**
     * Vista previa del período abierto (sin cerrarlo). El arqueo es ciego: solo el dueño ve lo que
     * debería haber; el cajero cuenta y declara sin saber la cifra, si no podría "cuadrar" a la medida.
     * El esperado es solo el efectivo, igual que calcula el cierre.
     */
    @GetMapping("/resumen-periodo-abierto")
    public ResponseEntity<Map<String, Object>> resumenPeriodoAbierto(@RequestParam Long tenantId, @RequestParam String moneda) {
        Optional<ArqueoCaja> ultimoArqueo = arqueoCajaRepository.findTopByTenantIdAndMonedaOrderByFechaArqueoDesc(tenantId, moneda);
        LocalDateTime desde = ultimoArqueo.map(ArqueoCaja::getFechaArqueo).orElse(LocalDateTime.of(2000, 1, 1, 0, 0));
        LocalDateTime ahora = LocalDateTime.now();
        List<MovimientoCaja> movimientos = movimientoCajaRepository.findByTenantIdAndMonedaAndFechaRegistroBetweenOrderByFechaRegistroAsc(tenantId, moneda, desde, ahora);

        Map<String, Object> respuesta = new java.util.HashMap<>();
        respuesta.put("desde", desde);
        respuesta.put("hasta", ahora);
        respuesta.put("cantidadMovimientos", movimientos.size());
        String rol = com.auroraplus.core.auth.AuthContext.getRol();
        boolean ciego = !"DUENO_ADMIN".equals(rol) && !"ADMINISTRADOR_FINCA".equals(rol);
        respuesta.put("arqueoCiego", ciego);
        if (ciego) return ResponseEntity.ok(respuesta);

        BigDecimal ingresos = movimientoCajaRepository.sumarMontoPorTipoYMonedaEntreFechas(tenantId, moneda, MovimientoCaja.TipoMovimiento.INGRESO, desde, ahora);
        BigDecimal egresos = movimientoCajaRepository.sumarMontoPorTipoYMonedaEntreFechas(tenantId, moneda, MovimientoCaja.TipoMovimiento.EGRESO, desde, ahora);
        BigDecimal ingresosEfectivo = movimientoCajaRepository.sumarEfectivoPorTipoYMonedaEntreFechas(tenantId, moneda, MovimientoCaja.TipoMovimiento.INGRESO, desde, ahora);
        BigDecimal egresosEfectivo = movimientoCajaRepository.sumarEfectivoPorTipoYMonedaEntreFechas(tenantId, moneda, MovimientoCaja.TipoMovimiento.EGRESO, desde, ahora);
        respuesta.put("totalIngresos", ingresos);
        respuesta.put("totalEgresos", egresos);
        respuesta.put("montoEsperadoEnCaja", ingresosEfectivo.subtract(egresosEfectivo));
        respuesta.put("movimientos", movimientos);
        return ResponseEntity.ok(respuesta);
    }

    /** Cierre de caja: el cajero declara lo que tiene físicamente, el sistema calcula el descuadre. */
    @PostMapping("/cerrar-caja")
    public ResponseEntity<ArqueoCaja> cerrarCaja(@RequestParam Long tenantId, @RequestParam(required = false) String idCajero,
                                                  @RequestParam BigDecimal montoDeclarado, @RequestParam String moneda) {
        com.auroraplus.core.auth.AuthContext.exigirRol("DUENO_ADMIN", "CAJERO_VENDEDOR", "ADMINISTRADOR_FINCA", "RECEPCIONISTA");
        // Quién cierra sale de la sesión: antes el navegador podía poner el nombre de cualquier cajero.
        String cajero = com.auroraplus.core.auth.AuthContext.getUsername();
        return ResponseEntity.ok(tesoreriaService.procesarArqueoCiego(tenantId, cajero != null ? cajero : idCajero, montoDeclarado, moneda));
    }

    /** Historial de cierres del tenant, más recientes primero — antes devolvía TODOS los tenants sin filtrar. */
    @GetMapping("/historial-cierres")
    public List<ArqueoCaja> historialCierres(@RequestParam Long tenantId) {
        return arqueoCajaRepository.findByTenantIdOrderByFechaArqueoDesc(tenantId);
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
