package com.auroraplus.core.reportes;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class ReporteExcelService {
    public byte[] generarReporteBase(String titulo) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Reporte");
            Row row = sheet.createRow(0);
            Cell cell = row.createCell(0);
            cell.setCellValue(titulo);
            workbook.write(out);
            return out.toByteArray();
        }
    }
}
