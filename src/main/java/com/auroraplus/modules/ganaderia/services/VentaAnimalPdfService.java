package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.modules.ganaderia.entities.VentaAnimal;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;

/** Liquidación/nota de venta de animales — comprobante para el comprador y respaldo contable del hato. */
@Service
public class VentaAnimalPdfService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public byte[] generarLiquidacionPdf(VentaAnimal venta) throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            float pageHeight = page.getMediaBox().getHeight();
            float startX = 40;

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                float y = pageHeight - 50;

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 16);
                cs.newLineAtOffset(startX, y);
                cs.showText("LIQUIDACION DE VENTA DE GANADO");
                cs.endText();
                y -= 25;

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                cs.newLineAtOffset(startX, y);
                cs.showText("Ticket: " + venta.getNumeroTicket() + "   Fecha: " + venta.getFecha().format(FMT));
                cs.endText();
                y -= 16;

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                cs.newLineAtOffset(startX, y);
                cs.showText("Comprador: " + (venta.getComprador() != null ? venta.getComprador() : "-"));
                cs.endText();
                y -= 30;

                float[] colWidths = {60, 150, 90, 90, 100};
                String[] headers = {"ID", "ARETE", "ESPECIE", "SEXO", "PRECIO"};
                float rowHeight = 18f;

                cs.setNonStrokingColor(new java.awt.Color(13, 17, 23));
                cs.addRect(startX, y - rowHeight, sum(colWidths), rowHeight);
                cs.fill();
                cs.setNonStrokingColor(java.awt.Color.WHITE);
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
                cs.setNonStrokingColor(java.awt.Color.BLACK);
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);

                for (var item : venta.getItems()) {
                    if (y < 100) break;
                    y -= rowHeight;
                    x = startX;
                    String[] valores = {
                        String.valueOf(item.getAnimal().getId()),
                        item.getAnimal().getArete(),
                        item.getAnimal().getEspecie() != null ? item.getAnimal().getEspecie() : "",
                        item.getAnimal().getSexo() != null ? item.getAnimal().getSexo() : "",
                        item.getPrecioVenta().setScale(2, RoundingMode.HALF_UP).toString()
                    };
                    for (int i = 0; i < valores.length; i++) {
                        cs.beginText();
                        cs.newLineAtOffset(x + 4, y + 5);
                        cs.showText(valores[i]);
                        cs.endText();
                        x += colWidths[i];
                    }
                }

                y -= rowHeight + 15;
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 12);
                cs.newLineAtOffset(startX, y);
                cs.showText("TOTAL: USD " + venta.getTotal().setScale(2, RoundingMode.HALF_UP)
                    + "   (" + venta.getItems().size() + " animales)");
                cs.endText();
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
}
