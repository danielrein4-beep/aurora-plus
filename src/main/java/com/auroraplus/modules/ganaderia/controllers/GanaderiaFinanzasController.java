package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.reportes.ExcelExportService;
import com.auroraplus.modules.ganaderia.entities.GastoGanaderia;
import com.auroraplus.modules.ganaderia.entities.VentaAnimal;
import com.auroraplus.modules.ganaderia.services.GanaderiaFinanzasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Control financiero del hato completo: todos los gastos operativos (mano de obra, materiales, veterinario...) contra las ventas de animales, en un período. */
@RestController
@RequestMapping("/api/ganaderia/finanzas")
public class GanaderiaFinanzasController {

    @Autowired
    private GanaderiaFinanzasService ganaderiaFinanzasService;

    @Autowired
    private ExcelExportService excelExportService;

    @GetMapping("/resumen-periodo")
    public GanaderiaFinanzasService.ResumenFinanciero resumenPeriodo(
            @RequestParam Long tenantId, @RequestParam LocalDate desde, @RequestParam LocalDate hasta) {
        return ganaderiaFinanzasService.resumenPeriodo(tenantId, desde, hasta);
    }

    @GetMapping("/resumen-periodo/export-excel")
    public ResponseEntity<byte[]> resumenPeriodoExcel(
            @RequestParam Long tenantId, @RequestParam LocalDate desde, @RequestParam LocalDate hasta) throws Exception {
        GanaderiaFinanzasService.ResumenFinanciero r = ganaderiaFinanzasService.resumenPeriodo(tenantId, desde, hasta);

        List<List<Object>> filasGastos = new ArrayList<>();
        for (GastoGanaderia g : r.gastos) {
            filasGastos.add(List.of(g.getFecha().toString(), g.getCategoria(), g.getDescripcion(), g.getMonto()));
        }
        List<List<Object>> filasVentas = new ArrayList<>();
        for (VentaAnimal v : r.ventas) {
            filasVentas.add(List.of(v.getFecha().toString(), v.getNumeroTicket(),
                v.getComprador() != null ? v.getComprador() : "", v.getTotal()));
        }

        // Una sola hoja con gastos primero, un resumen al final y las ventas después —
        // simple de leer sin necesitar varias pestañas para un reporte de este tamaño.
        List<List<Object>> filas = new ArrayList<>(filasGastos);
        filas.add(List.of("", "", "TOTAL GASTOS", r.totalGastos));
        filas.add(List.of());
        filas.add(List.of("VENTAS", "", "", ""));
        filas.addAll(filasVentas);
        filas.add(List.of("", "", "TOTAL INGRESOS", r.totalIngresosVenta));
        filas.add(List.of("", "", "UTILIDAD NETA", r.utilidadNeta));

        byte[] excel = excelExportService.generar("Resumen " + desde + " a " + hasta,
            List.of("Fecha", "Categoría/Ticket", "Descripción/Comprador", "Monto"), filas);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"resumen-financiero-ganaderia.xlsx\"")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(excel);
    }
}
