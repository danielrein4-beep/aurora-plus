package com.auroraplus.core.financiero.services;

import com.auroraplus.core.financiero.entities.ArqueoCaja;
import com.auroraplus.core.financiero.entities.MovimientoCaja;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * PDF del cierre de caja (arqueo ciego): resumen del período + tabla de cada
 * movimiento que lo compone, para que el cajero y el dueño tengan un
 * comprobante físico/archivable del día, no solo el registro en base de datos.
 */
@Service
public class TesoreriaPdfService {

    private static final DateTimeFormatter FECHA_HORA_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Color NAVY = new Color(13, 17, 23);
    private static final Color ROJO_DESCUADRE = new Color(178, 34, 34);
    private static final Color VERDE_CUADRADO = new Color(34, 120, 60);

    public byte[] generarCierrePdf(ArqueoCaja arqueo, LocalDateTime desde, List<MovimientoCaja> movimientos) throws IOException {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            float pageHeight = page.getMediaBox().getHeight();
            float startX = 40;

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                float y = pageHeight - 50;

                y = escribirTitulo(cs, startX, y, "CIERRE DE CAJA — " + arqueo.getMoneda());

                y -= 20;
                y = escribirLinea(cs, startX, y, "Cajero: " + arqueo.getIdCajero()
                    + "   |   Cierre #" + arqueo.getId()
                    + "   |   Fecha de cierre: " + arqueo.getFechaArqueo().format(FECHA_HORA_FMT));

                String desdeTexto = desde != null ? desde.format(FECHA_HORA_FMT) : "Apertura del sistema";
                y = escribirLinea(cs, startX, y, "Período cubierto: " + desdeTexto + "  al  " + arqueo.getFechaArqueo().format(FECHA_HORA_FMT));

                y -= 15;
                y = escribirLineaNegrita(cs, startX, y, "Total ingresos: " + arqueo.getMoneda() + " " + sumaPorTipo(movimientos, MovimientoCaja.TipoMovimiento.INGRESO));
                y = escribirLineaNegrita(cs, startX, y, "Total egresos:  " + arqueo.getMoneda() + " " + sumaPorTipo(movimientos, MovimientoCaja.TipoMovimiento.EGRESO));
                y = escribirLineaNegrita(cs, startX, y, "Monto esperado en sistema: " + arqueo.getMoneda() + " " + arqueo.getMontoSistema().setScale(2, RoundingMode.HALF_UP));
                y = escribirLineaNegrita(cs, startX, y, "Monto declarado por el cajero: " + arqueo.getMoneda() + " " + arqueo.getMontoDeclarado().setScale(2, RoundingMode.HALF_UP));

                y -= 5;
                boolean cuadrado = arqueo.getDescuadre().compareTo(java.math.BigDecimal.ZERO) == 0;
                cs.setNonStrokingColor(cuadrado ? VERDE_CUADRADO : ROJO_DESCUADRE);
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 12);
                cs.newLineAtOffset(startX, y);
                cs.showText((cuadrado ? "CAJA CUADRADA" : "DESCUADRE") + ": " + arqueo.getMoneda() + " " + arqueo.getDescuadre().setScale(2, RoundingMode.HALF_UP));
                cs.endText();
                cs.setNonStrokingColor(Color.BLACK);
                y -= 25;

                // ── Tabla de movimientos del período ──
                float[] colWidths = {110, 70, 260, 75};
                String[] headers = {"FECHA", "TIPO", "CONCEPTO", "MONTO"};
                float rowHeight = 16f;

                cs.setNonStrokingColor(NAVY);
                cs.addRect(startX, y - rowHeight, sum(colWidths), rowHeight);
                cs.fill();
                cs.setNonStrokingColor(Color.WHITE);
                float x = startX;
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 9);
                for (int i = 0; i < headers.length; i++) {
                    cs.beginText();
                    cs.newLineAtOffset(x + 4, y - rowHeight + 5);
                    cs.showText(headers[i]);
                    cs.endText();
                    x += colWidths[i];
                }

                y -= rowHeight;
                cs.setNonStrokingColor(Color.BLACK);
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);

                for (MovimientoCaja m : movimientos) {
                    if (y < 60) break; // límite de una página para esta primera versión
                    y -= rowHeight;
                    x = startX;
                    String concepto = m.getConcepto() != null ? m.getConcepto() : "";
                    if (concepto.length() > 65) concepto = concepto.substring(0, 62) + "...";
                    String[] valores = {
                        m.getFechaRegistro().format(FECHA_HORA_FMT),
                        m.getTipo().name(),
                        concepto,
                        m.getMonto().setScale(2, RoundingMode.HALF_UP).toString()
                    };
                    for (int i = 0; i < valores.length; i++) {
                        cs.beginText();
                        cs.newLineAtOffset(x + 4, y + 5);
                        cs.showText(valores[i]);
                        cs.endText();
                        x += colWidths[i];
                    }
                }

                y -= rowHeight + 10;
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 9);
                cs.newLineAtOffset(startX, y);
                cs.showText("Total de movimientos en el período: " + movimientos.size());
                cs.endText();
            }

            document.save(out);
            return out.toByteArray();
        }
    }

    private float escribirTitulo(PDPageContentStream cs, float x, float y, String texto) throws IOException {
        cs.beginText();
        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 15);
        cs.newLineAtOffset(x, y);
        cs.showText(texto);
        cs.endText();
        return y;
    }

    private float escribirLinea(PDPageContentStream cs, float x, float y, String texto) throws IOException {
        cs.beginText();
        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
        cs.newLineAtOffset(x, y);
        cs.showText(texto);
        cs.endText();
        return y - 14;
    }

    private float escribirLineaNegrita(PDPageContentStream cs, float x, float y, String texto) throws IOException {
        cs.beginText();
        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 10);
        cs.newLineAtOffset(x, y);
        cs.showText(texto);
        cs.endText();
        return y - 15;
    }

    private String sumaPorTipo(List<MovimientoCaja> movimientos, MovimientoCaja.TipoMovimiento tipo) {
        return movimientos.stream()
            .filter(m -> m.getTipo() == tipo)
            .map(MovimientoCaja::getMonto)
            .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP)
            .toString();
    }

    private float sum(float[] values) {
        float total = 0;
        for (float v : values) total += v;
        return total;
    }
}
