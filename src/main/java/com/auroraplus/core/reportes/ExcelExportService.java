package com.auroraplus.core.reportes;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

/**
 * Generador de Excel genérico y reutilizable — cualquier módulo pasa una
 * lista de encabezados y filas de datos, sin tener que lidiar con Apache POI
 * directamente. Primera fila en negrita, columnas auto-ajustadas al contenido.
 */
@Service
public class ExcelExportService {

    public byte[] generar(String tituloHoja, List<String> encabezados, List<List<Object>> filas) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(tituloHoja.length() > 31 ? tituloHoja.substring(0, 31) : tituloHoja);

            CellStyle estiloEncabezado = workbook.createCellStyle();
            Font fuenteEncabezado = workbook.createFont();
            fuenteEncabezado.setBold(true);
            estiloEncabezado.setFont(fuenteEncabezado);

            Row filaEncabezado = sheet.createRow(0);
            for (int i = 0; i < encabezados.size(); i++) {
                Cell celda = filaEncabezado.createCell(i);
                celda.setCellValue(encabezados.get(i));
                celda.setCellStyle(estiloEncabezado);
            }

            int indiceFila = 1;
            for (List<Object> fila : filas) {
                Row row = sheet.createRow(indiceFila++);
                for (int i = 0; i < fila.size(); i++) {
                    Cell celda = row.createCell(i);
                    escribirValor(celda, fila.get(i));
                }
            }

            for (int i = 0; i < encabezados.size(); i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void escribirValor(Cell celda, Object valor) {
        if (valor == null) {
            return;
        }
        if (valor instanceof Number numero) {
            celda.setCellValue(numero.doubleValue());
        } else if (valor instanceof Boolean booleano) {
            celda.setCellValue(booleano);
        } else {
            celda.setCellValue(valor.toString());
        }
    }
}
