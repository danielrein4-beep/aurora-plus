package com.auroraplus.modules.moda.services;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.oned.Code128Writer;
import com.auroraplus.modules.moda.entities.VarianteModa;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.RoundingMode;
import java.util.List;

/**
 * Etiquetas con código de barras real (Code128, legible por cualquier lector
 * láser/CCD estándar) para el catálogo de Moda — Subfase 6.2. Dos formatos:
 * una etiqueta individual al tamaño típico de impresoras térmicas de
 * etiquetas (Zebra/Xprinter, ~50x30mm), y una hoja A4 con varias etiquetas en
 * cuadrícula para imprimir en una impresora normal y recortar.
 */
@Service
public class EtiquetaModaPdfService {

    // 50mm x 30mm en puntos PDF (1 punto = 1/72 pulgada; 1mm = 2.83465pt) — tamaño estándar de rollo térmico.
    private static final float LABEL_WIDTH = 141.7f;
    private static final float LABEL_HEIGHT = 85.0f;

    private byte[] generarBarcodePng(String contenido, int widthPx, int heightPx) throws Exception {
        Code128Writer writer = new Code128Writer();
        BitMatrix matrix = writer.encode(contenido, BarcodeFormat.CODE_128, widthPx, heightPx);
        BufferedImage image = MatrixToImageWriter.toBufferedImage(matrix);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    /** Una sola etiqueta al tamaño exacto para enviar directo al driver de una impresora térmica. */
    public byte[] generarEtiquetaIndividual(VarianteModa variante) throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(new PDRectangle(LABEL_WIDTH, LABEL_HEIGHT));
            document.addPage(page);

            byte[] barcodePng = generarBarcodePng(variante.getCodigoBarras(), 300, 90);
            PDImageXObject barcodeImg = PDImageXObject.createFromByteArray(document, barcodePng, "barcode");

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                String nombre = variante.getProducto().getNombre();
                if (nombre.length() > 28) nombre = nombre.substring(0, 28);

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 7);
                cs.newLineAtOffset(4, LABEL_HEIGHT - 10);
                cs.showText(nombre);
                cs.endText();

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 6);
                cs.newLineAtOffset(4, LABEL_HEIGHT - 20);
                cs.showText("Talla " + variante.getTalla() + "  -  " + variante.getColor());
                cs.endText();

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 8);
                cs.newLineAtOffset(4, LABEL_HEIGHT - 32);
                cs.showText("$" + variante.getProducto().getPrecioVenta().setScale(2, RoundingMode.HALF_UP));
                cs.endText();

                float barcodeWidth = LABEL_WIDTH - 8;
                float barcodeHeight = 32;
                cs.drawImage(barcodeImg, 4, 12, barcodeWidth, barcodeHeight);

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 6);
                cs.newLineAtOffset(4, 4);
                cs.showText(variante.getCodigoBarras());
                cs.endText();
            }

            document.save(out);
            return out.toByteArray();
        }
    }

    /** Hoja A4 con varias etiquetas en cuadrícula, para impresoras normales (no térmicas). */
    public byte[] generarHojaEtiquetas(List<VarianteModa> variantes, int copiasPorVariante) throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            float margin = 20f;
            int columnas = 3;
            float gap = 8f;
            float labelW = (PDRectangle.A4.getWidth() - margin * 2 - gap * (columnas - 1)) / columnas;
            float labelH = 90f;
            int filasPorPagina = (int) ((PDRectangle.A4.getHeight() - margin * 2) / (labelH + gap));

            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            PDPageContentStream cs = new PDPageContentStream(document, page);

            int col = 0, fila = 0;
            for (VarianteModa variante : variantes) {
                for (int copia = 0; copia < copiasPorVariante; copia++) {
                    if (fila >= filasPorPagina) {
                        cs.close();
                        page = new PDPage(PDRectangle.A4);
                        document.addPage(page);
                        cs = new PDPageContentStream(document, page);
                        col = 0;
                        fila = 0;
                    }

                    float x = margin + col * (labelW + gap);
                    float y = PDRectangle.A4.getHeight() - margin - (fila + 1) * (labelH + gap) + gap;

                    cs.setLineWidth(0.5f);
                    cs.addRect(x, y, labelW, labelH);
                    cs.stroke();

                    byte[] barcodePng = generarBarcodePng(variante.getCodigoBarras(), 260, 70);
                    PDImageXObject barcodeImg = PDImageXObject.createFromByteArray(document, barcodePng, "barcode");

                    String nombre = variante.getProducto().getNombre();
                    if (nombre.length() > 26) nombre = nombre.substring(0, 26);

                    cs.beginText();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 8);
                    cs.newLineAtOffset(x + 5, y + labelH - 12);
                    cs.showText(nombre);
                    cs.endText();

                    cs.beginText();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 7);
                    cs.newLineAtOffset(x + 5, y + labelH - 24);
                    cs.showText("Talla " + variante.getTalla() + "  -  " + variante.getColor()
                        + "   $" + variante.getProducto().getPrecioVenta().setScale(2, RoundingMode.HALF_UP));
                    cs.endText();

                    cs.drawImage(barcodeImg, x + 5, y + 14, labelW - 10, 34);

                    cs.beginText();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 6);
                    cs.newLineAtOffset(x + 5, y + 4);
                    cs.showText(variante.getCodigoBarras());
                    cs.endText();

                    col++;
                    if (col >= columnas) { col = 0; fila++; }
                }
            }
            cs.close();

            document.save(out);
            return out.toByteArray();
        }
    }
}
