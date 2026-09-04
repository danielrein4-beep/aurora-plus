package com.auroraplus.modules.tamanacocomercial.controllers;

import com.auroraplus.modules.tamanacocomercial.entities.AnalisisLaboratorio;
import com.auroraplus.modules.tamanacocomercial.entities.DespachoComercial;
import com.auroraplus.modules.tamanacocomercial.entities.Mina;
import com.auroraplus.modules.tamanacocomercial.repositories.AnalisisLaboratorioRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.DespachoComercialRepository;
import com.auroraplus.modules.tamanacocomercial.repositories.MinaRepository;
import com.auroraplus.modules.tamanacocomercial.services.ReporteComercialService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

/**
 * Expone los reportes PDF/Excel de Carbones Tamanaco por HTTP. Vive bajo
 * /api/** por lo que TenantInterceptor ya activó el filtro Hibernate
 * "tenantFilter" para este request antes de llegar aquí: cada
 * repository.findAll() de este controlador solo devuelve filas del tenant
 * que envió el header X-Tenant-ID, sin necesidad de filtrar manualmente por
 * tenantId en cada consulta.
 */
@RestController
@RequestMapping("/api/tamanaco-comercial/reportes")
public class ReporteComercialController {

    @Autowired
    private ReporteComercialService reporteComercialService;

    @Autowired
    private DespachoComercialRepository despachoComercialRepository;

    @Autowired
    private MinaRepository minaRepository;

    @Autowired
    private AnalisisLaboratorioRepository analisisLaboratorioRepository;

    @GetMapping("/despachos/pdf")
    public ResponseEntity<byte[]> despachosPdf(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) throws IOException {

        List<DespachoComercial> despachos = filtrarPorFecha(despachoComercialRepository.findAll(), desde, hasta);
        byte[] pdf = reporteComercialService.generarDespachosPdf(despachos, desde, hasta);

        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.inline().filename("despachos_tamanaco.pdf").build().toString())
            .body(pdf);
    }

    @GetMapping("/despachos/excel")
    public ResponseEntity<byte[]> despachosExcel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) throws IOException {

        List<DespachoComercial> despachos = filtrarPorFecha(despachoComercialRepository.findAll(), desde, hasta);
        byte[] excel = reporteComercialService.generarDespachosExcel(despachos, desde, hasta);

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .header(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment().filename("despachos_tamanaco.xlsx").build().toString())
            .body(excel);
    }

    @GetMapping("/nomina/excel")
    public ResponseEntity<byte[]> nominaExcel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) throws IOException {

        List<DespachoComercial> despachos = filtrarPorFecha(despachoComercialRepository.findAll(), desde, hasta);
        List<Mina> minas = minaRepository.findAll();
        byte[] excel = reporteComercialService.generarNominaExcel(despachos, minas, desde, hasta);

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .header(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment().filename("nomina_tamanaco.xlsx").build().toString())
            .body(excel);
    }

    @GetMapping("/laboratorio/excel")
    public ResponseEntity<byte[]> laboratorioExcel(@RequestParam(required = false) String periodo) throws IOException {
        List<AnalisisLaboratorio> analisis = analisisLaboratorioRepository.findAll();
        byte[] excel = reporteComercialService.generarLaboratorioExcel(analisis, periodo);

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .header(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment().filename("laboratorio_tamanaco.xlsx").build().toString())
            .body(excel);
    }

    private List<DespachoComercial> filtrarPorFecha(List<DespachoComercial> despachos, LocalDate desde, LocalDate hasta) {
        return despachos.stream()
            .filter(d -> {
                if (d.getFechaDespacho() == null) return false;
                LocalDate fecha = d.getFechaDespacho().toLocalDate();
                if (desde != null && fecha.isBefore(desde)) return false;
                if (hasta != null && fecha.isAfter(hasta)) return false;
                return true;
            })
            .toList();
    }
}
