package com.auroraplus.modules.tamanacocomercial.services;

import com.auroraplus.modules.tamanacocomercial.entities.AnalisisLaboratorio;
import com.auroraplus.modules.tamanacocomercial.entities.DespachoComercial;
import com.auroraplus.modules.tamanacocomercial.entities.Mina;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState;
import org.apache.pdfbox.util.Matrix;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Reportes comerciales (Despachos, Nómina, Laboratorio) para Carbones Tamanaco,
 * con el logo real de la empresa embebido y marca de agua.
 *
 * La marca de agua en Excel se implementa insertando el logo (aclarado a ~12%
 * de opacidad real de píxel, no solo visualmente) como una imagen flotante
 * grande que cubre el área de la tabla — no como "fondo de hoja" (XSSFSheet no
 * expone esa API en POI 5.3.0). Al imprimir opacidad tan baja sobre el propio
 * PNG, el texto de las celdas se sigue leyendo con normalidad por encima.
 */
@Service
public class ReporteComercialService {

    private static final String LOGO_CLASSPATH = "tamanacocomercial/logo-tamanaco.png";
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private byte[] cargarLogoBytes() throws IOException {
        try (InputStream in = new ClassPathResource(LOGO_CLASSPATH).getInputStream()) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            in.transferTo(out);
            return out.toByteArray();
        }
    }

    // ==========================================================================
    // PDF — Reporte de Despachos, con logo en encabezado y marca de agua rotada
    // ==========================================================================
    public byte[] generarDespachosPdf(List<DespachoComercial> despachos, LocalDate desde, LocalDate hasta) throws IOException {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            byte[] logoBytes = cargarLogoBytes();
            PDImageXObject logo = PDImageXObject.createFromByteArray(document, logoBytes, "logo-tamanaco");

            float pageWidth = page.getMediaBox().getWidth();
            float pageHeight = page.getMediaBox().getHeight();

            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {

                // ── Marca de agua: logo rotado 45°, muy transparente, centrado ──
                PDExtendedGraphicsState gsWatermark = new PDExtendedGraphicsState();
                gsWatermark.setNonStrokingAlphaConstant(0.08f);
                contentStream.saveGraphicsState();
                contentStream.setGraphicsStateParameters(gsWatermark);

                float wmSize = 380f;
                java.awt.geom.AffineTransform at = new java.awt.geom.AffineTransform();
                at.translate(pageWidth / 2f, pageHeight / 2f);
                at.rotate(Math.toRadians(45));
                at.translate(-wmSize / 2f, -wmSize / 2f);
                at.scale(wmSize, wmSize);
                contentStream.drawImage(logo, new Matrix(at));

                contentStream.restoreGraphicsState();
            }

            try (PDPageContentStream contentStream = new PDPageContentStream(document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                // ── Logo en encabezado (esquina superior izquierda) ──
                float logoWidth = 50;
                float logoHeight = 50;
                contentStream.drawImage(logo, 30, pageHeight - 30 - logoHeight, logoWidth, logoHeight);

                // ── Título ──
                contentStream.beginText();
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 14);
                contentStream.newLineAtOffset(95, pageHeight - 50);
                contentStream.showText("CARBONES TAMANACO C.A. - REPORTE DE DESPACHOS");
                contentStream.endText();

                String periodoTexto = (desde != null && hasta != null)
                    ? "Periodo: " + desde.format(DATE_FMT) + " al " + hasta.format(DATE_FMT)
                    : "Historico completo";

                contentStream.beginText();
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                contentStream.newLineAtOffset(95, pageHeight - 65);
                contentStream.showText(periodoTexto + " | Emision: " + LocalDate.now().format(DATE_FMT));
                contentStream.endText();

                // ── Tabla ──
                float tableTop = pageHeight - 100;
                float rowHeight = 18f;
                float[] colWidths = {40, 130, 70, 150, 90};
                String[] headers = {"ID", "CHOFER", "PLACA", "MINA", "PESO (TON)"};

                float startX = 30;
                float y = tableTop;

                contentStream.setNonStrokingColor(new java.awt.Color(13, 17, 23));
                contentStream.addRect(startX, y - rowHeight, sum(colWidths), rowHeight);
                contentStream.fill();

                contentStream.setNonStrokingColor(new java.awt.Color(255, 255, 255));
                float x = startX;
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 9);
                for (int i = 0; i < headers.length; i++) {
                    contentStream.beginText();
                    contentStream.newLineAtOffset(x + 4, y - rowHeight + 5);
                    contentStream.showText(headers[i]);
                    contentStream.endText();
                    x += colWidths[i];
                }

                y -= rowHeight;
                contentStream.setNonStrokingColor(new java.awt.Color(0, 0, 0));
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);

                BigDecimal totalPeso = BigDecimal.ZERO;
                for (DespachoComercial d : despachos) {
                    if (y < 60) break; // límite simple de una página para esta versión inicial
                    y -= rowHeight;
                    x = startX;
                    String[] valores = {
                        String.valueOf(d.getId()),
                        d.getChofer() != null ? d.getChofer() : "",
                        d.getPlaca() != null ? d.getPlaca() : "",
                        d.getMina() != null ? d.getMina() : "",
                        d.getPeso() != null ? d.getPeso().setScale(2, RoundingMode.HALF_UP).toString() : "0.00"
                    };
                    for (int i = 0; i < valores.length; i++) {
                        contentStream.beginText();
                        contentStream.newLineAtOffset(x + 4, y + 5);
                        contentStream.showText(valores[i]);
                        contentStream.endText();
                        x += colWidths[i];
                    }
                    if (d.getPeso() != null) totalPeso = totalPeso.add(d.getPeso());
                }

                y -= rowHeight + 10;
                contentStream.beginText();
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 10);
                contentStream.newLineAtOffset(startX, y);
                contentStream.showText("Total camiones: " + despachos.size() + "  |  Total toneladas: "
                    + totalPeso.setScale(2, RoundingMode.HALF_UP));
                contentStream.endText();
            }

            document.save(out);
            return out.toByteArray();
        }
    }

    private float sum(float[] values) {
        float total = 0;
        for (float v : values) total += v;
        return total;
    }

    // ==========================================================================
    // EXCEL — Reporte de Despachos, con logo embebido y marca de agua de fondo
    // ==========================================================================
    public byte[] generarDespachosExcel(List<DespachoComercial> despachos, LocalDate desde, LocalDate hasta) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XSSFSheet sheet = workbook.createSheet("Despachos");
            insertarLogoYMarcaDeAgua(workbook, sheet);

            CellStyle styleTitulo = estiloTitulo(workbook);
            CellStyle styleSubtitulo = estiloSubtitulo(workbook);
            CellStyle styleHeader = estiloHeader(workbook);
            CellStyle styleDataLeft = estiloDataLeft(workbook);
            CellStyle styleDataCenter = clonarConAlineacion(workbook, styleDataLeft, HorizontalAlignment.CENTER);
            CellStyle styleDataNumber = estiloDataNumero(workbook, styleDataLeft);

            int rowIdx = 3; // deja espacio arriba para el logo

            Row rowTitle = sheet.createRow(rowIdx++);
            Cell cellTitle = rowTitle.createCell(2);
            cellTitle.setCellValue("CARBONES TAMANACO C.A. — REPORTE DE DESPACHOS");
            cellTitle.setCellStyle(styleTitulo);
            sheet.addMergedRegion(new CellRangeAddress(3, 3, 2, 6));

            String periodoTexto = (desde != null && hasta != null)
                ? "Periodo: " + desde.format(DATE_FMT) + " al " + hasta.format(DATE_FMT)
                : "Histórico completo";
            Row rowSub = sheet.createRow(rowIdx++);
            Cell cellSub = rowSub.createCell(2);
            cellSub.setCellValue(periodoTexto + " | Emisión: " + LocalDate.now().format(DATE_FMT));
            cellSub.setCellStyle(styleSubtitulo);
            sheet.addMergedRegion(new CellRangeAddress(4, 4, 2, 6));

            rowIdx++;

            Row headerRow = sheet.createRow(rowIdx++);
            String[] headers = {"ID", "FECHA", "CHOFER", "PLACA", "MINA", "PESO NETO (TON)"};
            for (int i = 0; i < headers.length; i++) {
                Cell c = headerRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(styleHeader);
            }

            BigDecimal totalPeso = BigDecimal.ZERO;
            for (DespachoComercial d : despachos) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(d.getId() != null ? d.getId() : 0);
                row.getCell(0).setCellStyle(styleDataCenter);

                row.createCell(1).setCellValue(d.getFechaDespacho() != null ? d.getFechaDespacho().format(DATE_FMT) : "");
                row.getCell(1).setCellStyle(styleDataCenter);

                row.createCell(2).setCellValue(d.getChofer() != null ? d.getChofer() : "");
                row.getCell(2).setCellStyle(styleDataLeft);

                row.createCell(3).setCellValue(d.getPlaca() != null ? d.getPlaca() : "");
                row.getCell(3).setCellStyle(styleDataCenter);

                row.createCell(4).setCellValue(d.getMina() != null ? d.getMina() : "");
                row.getCell(4).setCellStyle(styleDataLeft);

                double peso = d.getPeso() != null ? d.getPeso().doubleValue() : 0.0;
                row.createCell(5).setCellValue(peso);
                row.getCell(5).setCellStyle(styleDataNumber);

                if (d.getPeso() != null) totalPeso = totalPeso.add(d.getPeso());
            }

            Row rowTotal = sheet.createRow(rowIdx);
            Cell cTotLabel = rowTotal.createCell(0);
            cTotLabel.setCellValue("TOTAL GENERAL (" + despachos.size() + " viajes)");
            cTotLabel.setCellStyle(styleHeader);
            Cell cTotVal = rowTotal.createCell(5);
            cTotVal.setCellValue(totalPeso.doubleValue());
            cTotVal.setCellStyle(styleHeader);

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ==========================================================================
    // EXCEL — Reporte de Nómina (agregado simple por mina: viajes, toneladas,
    // tarifa vigente de la Mina, total a pagar), con logo y marca de agua
    // ==========================================================================
    public byte[] generarNominaExcel(List<DespachoComercial> despachos, List<Mina> minas, LocalDate desde, LocalDate hasta) throws IOException {
        Map<String, Mina> tarifasPorMina = new LinkedHashMap<>();
        for (Mina m : minas) {
            tarifasPorMina.put(m.getNombre(), m);
        }

        Map<String, BigDecimal[]> agregadoPorMina = new LinkedHashMap<>(); // [0]=toneladas, [1]=viajes(como escala)
        for (DespachoComercial d : despachos) {
            String mina = d.getMina() != null ? d.getMina() : "SIN MINA";
            BigDecimal[] acumulado = agregadoPorMina.computeIfAbsent(mina, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            acumulado[0] = acumulado[0].add(d.getPeso() != null ? d.getPeso() : BigDecimal.ZERO);
            acumulado[1] = acumulado[1].add(BigDecimal.ONE);
        }

        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XSSFSheet sheet = workbook.createSheet("Nómina");
            insertarLogoYMarcaDeAgua(workbook, sheet);

            CellStyle styleTitulo = estiloTitulo(workbook);
            CellStyle styleSubtitulo = estiloSubtitulo(workbook);
            CellStyle styleHeader = estiloHeader(workbook);
            CellStyle styleDataLeft = estiloDataLeft(workbook);
            CellStyle styleDataCenter = clonarConAlineacion(workbook, styleDataLeft, HorizontalAlignment.CENTER);
            CellStyle styleDataNumber = estiloDataNumero(workbook, styleDataLeft);

            int rowIdx = 3;
            Row rowTitle = sheet.createRow(rowIdx++);
            Cell cellTitle = rowTitle.createCell(2);
            cellTitle.setCellValue("CARBONES TAMANACO C.A. — REPORTE OFICIAL DE LIQUIDACIÓN DE NÓMINA");
            cellTitle.setCellStyle(styleTitulo);
            sheet.addMergedRegion(new CellRangeAddress(3, 3, 2, 6));

            String periodoTexto = (desde != null && hasta != null)
                ? "Periodo: " + desde.format(DATE_FMT) + " al " + hasta.format(DATE_FMT)
                : "Periodo no especificado";
            Row rowSub = sheet.createRow(rowIdx++);
            Cell cellSub = rowSub.createCell(2);
            cellSub.setCellValue(periodoTexto + " | Emisión: " + LocalDate.now().format(DATE_FMT));
            cellSub.setCellStyle(styleSubtitulo);
            sheet.addMergedRegion(new CellRangeAddress(4, 4, 2, 6));

            rowIdx++;
            Row headerRow = sheet.createRow(rowIdx++);
            String[] headers = {"MINA", "VIAJES", "TONELADAS", "TARIFA (COP/TON)", "TOTAL A PAGAR (COP)"};
            for (int i = 0; i < headers.length; i++) {
                Cell c = headerRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(styleHeader);
            }

            BigDecimal totalToneladas = BigDecimal.ZERO;
            BigDecimal totalPagar = BigDecimal.ZERO;
            int totalViajes = 0;

            for (Map.Entry<String, BigDecimal[]> entry : agregadoPorMina.entrySet()) {
                Row row = sheet.createRow(rowIdx++);
                String nombreMina = entry.getKey();
                BigDecimal toneladas = entry.getValue()[0];
                int viajes = entry.getValue()[1].intValue();
                Mina mina = tarifasPorMina.get(nombreMina);
                BigDecimal tarifa = mina != null ? mina.getTarifaCopPorTon() : BigDecimal.ZERO;
                BigDecimal totalMina = toneladas.multiply(tarifa).setScale(2, RoundingMode.HALF_UP);

                row.createCell(0).setCellValue(nombreMina);
                row.getCell(0).setCellStyle(styleDataLeft);
                row.createCell(1).setCellValue(viajes);
                row.getCell(1).setCellStyle(styleDataCenter);
                row.createCell(2).setCellValue(toneladas.doubleValue());
                row.getCell(2).setCellStyle(styleDataNumber);
                row.createCell(3).setCellValue(tarifa.doubleValue());
                row.getCell(3).setCellStyle(styleDataNumber);
                row.createCell(4).setCellValue(totalMina.doubleValue());
                row.getCell(4).setCellStyle(styleDataNumber);

                totalToneladas = totalToneladas.add(toneladas);
                totalPagar = totalPagar.add(totalMina);
                totalViajes += viajes;
            }

            Row rowTotal = sheet.createRow(rowIdx);
            Cell cTotLabel = rowTotal.createCell(0);
            cTotLabel.setCellValue("TOTAL GENERAL (" + agregadoPorMina.size() + " minas)");
            cTotLabel.setCellStyle(styleHeader);
            rowTotal.createCell(1).setCellValue(totalViajes);
            rowTotal.getCell(1).setCellStyle(styleHeader);
            rowTotal.createCell(2).setCellValue(totalToneladas.doubleValue());
            rowTotal.getCell(2).setCellStyle(styleHeader);
            rowTotal.createCell(4).setCellValue(totalPagar.doubleValue());
            rowTotal.getCell(4).setCellStyle(styleHeader);

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ==========================================================================
    // EXCEL — Reporte de Laboratorio y Calidad, con logo y marca de agua
    // ==========================================================================
    public byte[] generarLaboratorioExcel(List<AnalisisLaboratorio> analisis, String periodo) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XSSFSheet sheet = workbook.createSheet("Control de Calidad");
            insertarLogoYMarcaDeAgua(workbook, sheet);

            CellStyle styleTitulo = estiloTitulo(workbook);
            CellStyle styleSubtitulo = estiloSubtitulo(workbook);
            CellStyle styleHeader = estiloHeader(workbook);
            CellStyle styleDataLeft = estiloDataLeft(workbook);
            CellStyle styleDataCenter = clonarConAlineacion(workbook, styleDataLeft, HorizontalAlignment.CENTER);
            CellStyle styleDataNumber = estiloDataNumero(workbook, styleDataLeft);

            int rowIdx = 3;
            Row rowTitle = sheet.createRow(rowIdx++);
            Cell cellTitle = rowTitle.createCell(2);
            cellTitle.setCellValue("CARBONES TAMANACO C.A. — INFORME DE LABORATORIO Y CALIDAD");
            cellTitle.setCellStyle(styleTitulo);
            sheet.addMergedRegion(new CellRangeAddress(3, 3, 2, 8));

            Row rowSub = sheet.createRow(rowIdx++);
            Cell cellSub = rowSub.createCell(2);
            cellSub.setCellValue("Período: " + (periodo != null ? periodo : "No especificado") + " | Generado: " + LocalDate.now().format(DATE_FMT));
            cellSub.setCellStyle(styleSubtitulo);
            sheet.addMergedRegion(new CellRangeAddress(4, 4, 2, 8));

            rowIdx++;
            Row headerRow = sheet.createRow(rowIdx++);
            String[] headers = {"FECHA", "MINA", "LOTE", "CENIZA (%)", "AZUFRE (%)", "PODER CAL.", "ESTADO"};
            for (int i = 0; i < headers.length; i++) {
                Cell c = headerRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(styleHeader);
            }

            for (AnalisisLaboratorio a : analisis) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(a.getFechaMuestra() != null ? a.getFechaMuestra().format(DATE_FMT) : "—");
                row.getCell(0).setCellStyle(styleDataCenter);
                row.createCell(1).setCellValue(a.getMina() != null ? a.getMina() : "—");
                row.getCell(1).setCellStyle(styleDataLeft);
                row.createCell(2).setCellValue(a.getLote() != null ? a.getLote() : "S/L");
                row.getCell(2).setCellStyle(styleDataCenter);
                row.createCell(3).setCellValue(a.getCeniza() != null ? a.getCeniza().doubleValue() : 0.0);
                row.getCell(3).setCellStyle(styleDataNumber);
                row.createCell(4).setCellValue(a.getAzufre() != null ? a.getAzufre().doubleValue() : 0.0);
                row.getCell(4).setCellStyle(styleDataNumber);
                row.createCell(5).setCellValue(a.getPoderCalorifico() != null ? a.getPoderCalorifico().doubleValue() : 0.0);
                row.getCell(5).setCellStyle(styleDataNumber);
                row.createCell(6).setCellValue(a.getEstado() != null ? a.getEstado() : "APROBADO");
                row.getCell(6).setCellStyle(styleDataCenter);
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ==========================================================================
    // Helpers compartidos: logo, marca de agua y estilos
    // ==========================================================================

    /**
     * Inserta, sobre un único Drawing compartido de la hoja, primero la marca de
     * agua (logo aclarado a ~12% de opacidad de píxel, cubriendo el área de la
     * tabla) y luego el logo normal del encabezado por encima. IMPORTANTE:
     * XSSFSheet.createDrawingPatriarch() reemplaza cualquier drawing previo de la
     * hoja si se llama más de una vez — por eso ambas imágenes se crean sobre el
     * mismo objeto Drawing en una sola invocación, en vez de en dos métodos separados.
     */
    private void insertarLogoYMarcaDeAgua(XSSFWorkbook workbook, XSSFSheet sheet) throws IOException {
        CreationHelper helper = workbook.getCreationHelper();
        Drawing<?> drawing = sheet.createDrawingPatriarch();

        byte[] logoAclarado = aclararParaMarcaDeAgua(cargarLogoBytes());
        int watermarkIdx = workbook.addPicture(logoAclarado, Workbook.PICTURE_TYPE_PNG);
        ClientAnchor anchorWatermark = helper.createClientAnchor();
        anchorWatermark.setCol1(0);
        anchorWatermark.setRow1(0);
        anchorWatermark.setCol2(8);
        anchorWatermark.setRow2(45);
        anchorWatermark.setAnchorType(ClientAnchor.AnchorType.DONT_MOVE_AND_RESIZE);
        drawing.createPicture(anchorWatermark, watermarkIdx);

        byte[] logoBytes = cargarLogoBytes();
        int logoIdx = workbook.addPicture(logoBytes, Workbook.PICTURE_TYPE_PNG);
        ClientAnchor anchorLogo = helper.createClientAnchor();
        anchorLogo.setCol1(0);
        anchorLogo.setRow1(0);
        anchorLogo.setCol2(2);
        anchorLogo.setRow2(3);
        Picture picture = drawing.createPicture(anchorLogo, logoIdx);
        picture.resize(1.0);
    }

    /** Aclara la imagen (reduce opacidad simulada aumentando el blanco) para usarla como marca de agua tenue. */
    private byte[] aclararParaMarcaDeAgua(byte[] original) throws IOException {
        BufferedImage img = ImageIO.read(new java.io.ByteArrayInputStream(original));
        BufferedImage resultado = new BufferedImage(img.getWidth(), img.getHeight(), BufferedImage.TYPE_INT_ARGB);
        for (int yPix = 0; yPix < img.getHeight(); yPix++) {
            for (int xPix = 0; xPix < img.getWidth(); xPix++) {
                int argb = img.getRGB(xPix, yPix);
                int alpha = (argb >> 24) & 0xff;
                int nuevaAlpha = (int) (alpha * 0.12); // muy tenue
                int rgb = argb & 0x00FFFFFF;
                resultado.setRGB(xPix, yPix, (nuevaAlpha << 24) | rgb);
            }
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(resultado, "png", out);
        return out.toByteArray();
    }

    private CellStyle estiloTitulo(XSSFWorkbook workbook) {
        XSSFColor colorNavy = new XSSFColor(new byte[]{(byte) 0x0d, (byte) 0x11, (byte) 0x17}, null);
        XSSFFont font = workbook.createFont();
        font.setFontName("Arial");
        font.setFontHeightInPoints((short) 14);
        font.setBold(true);
        font.setColor(colorNavy);
        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle estiloSubtitulo(XSSFWorkbook workbook) {
        Font font = workbook.createFont();
        font.setFontName("Arial");
        font.setFontHeightInPoints((short) 10);
        font.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        return style;
    }

    private CellStyle estiloHeader(XSSFWorkbook workbook) {
        Font font = workbook.createFont();
        font.setFontName("Arial");
        font.setFontHeightInPoints((short) 10);
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle estiloDataLeft(XSSFWorkbook workbook) {
        Font font = workbook.createFont();
        font.setFontName("Arial");
        font.setFontHeightInPoints((short) 9);
        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle clonarConAlineacion(XSSFWorkbook workbook, CellStyle base, HorizontalAlignment alineacion) {
        CellStyle style = workbook.createCellStyle();
        style.cloneStyleFrom(base);
        style.setAlignment(alineacion);
        return style;
    }

    private CellStyle estiloDataNumero(XSSFWorkbook workbook, CellStyle base) {
        CellStyle style = workbook.createCellStyle();
        style.cloneStyleFrom(base);
        style.setAlignment(HorizontalAlignment.RIGHT);
        DataFormat df = workbook.createDataFormat();
        style.setDataFormat(df.getFormat("#,##0.00"));
        return style;
    }
}
