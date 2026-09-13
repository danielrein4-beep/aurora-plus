package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.modules.ganaderia.entities.VentaLecheTanque;
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

/**
 * Nota de entrega / recibo de despacho de leche en tanque — comprobante para la
 * planta/comprador. Mismo formato tipo factura que la venta de animales (encabezado
 * del negocio con RIF opcional, comprador, detalle, total) y sin número de factura.
 */
@Service
public class DespachoLechePdfService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] generarNotaEntregaPdf(VentaLecheTanque despacho, LicenciaTenant licencia) throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A5);
            document.addPage(page);
            float pageHeight = page.getMediaBox().getHeight();
            float startX = 30;

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                float y = pageHeight - 40;

                if (licencia != null && licencia.getRazonSocial() != null && !licencia.getRazonSocial().isBlank()) {
                    cs.beginText();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 12);
                    cs.newLineAtOffset(startX, y);
                    cs.showText(licencia.getRazonSocial());
                    cs.endText();
                    y -= 14;
                    if (licencia.getRif() != null && !licencia.getRif().isBlank()) {
                        cs.beginText();
                        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
                        cs.newLineAtOffset(startX, y);
                        cs.showText("RIF: " + licencia.getRif());
                        cs.endText();
                        y -= 11;
                    }
                    if (licencia.getDomicilioFiscal() != null && !licencia.getDomicilioFiscal().isBlank()) {
                        cs.beginText();
                        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
                        cs.newLineAtOffset(startX, y);
                        cs.showText(licencia.getDomicilioFiscal());
                        cs.endText();
                        y -= 11;
                    }
                    y -= 8;
                }

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 14);
                cs.newLineAtOffset(startX, y);
                cs.showText("NOTA DE ENTREGA - DESPACHO DE LECHE");
                cs.endText();
                y -= 22;

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                cs.newLineAtOffset(startX, y);
                cs.showText("Fecha: " + despacho.getFecha().format(FMT));
                cs.endText();
                y -= 14;

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                cs.newLineAtOffset(startX, y);
                cs.showText("Comprador / Planta: " + (despacho.getCompradorOPlanta() != null ? despacho.getCompradorOPlanta() : "-"));
                cs.endText();
                y -= 25;

                cs.setNonStrokingColor(new java.awt.Color(13, 17, 23));
                cs.addRect(startX, y - 16, 350, 16);
                cs.fill();
                cs.setNonStrokingColor(java.awt.Color.WHITE);
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 9);
                cs.beginText();
                cs.newLineAtOffset(startX + 4, y - 12);
                cs.showText("LITROS");
                cs.endText();
                cs.beginText();
                cs.newLineAtOffset(startX + 120, y - 12);
                cs.showText("PRECIO/LITRO");
                cs.endText();
                cs.beginText();
                cs.newLineAtOffset(startX + 240, y - 12);
                cs.showText("TOTAL");
                cs.endText();
                y -= 16;

                cs.setNonStrokingColor(java.awt.Color.BLACK);
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                y -= 16;
                cs.beginText();
                cs.newLineAtOffset(startX + 4, y + 4);
                cs.showText(despacho.getLitrosVendidos().setScale(2, RoundingMode.HALF_UP).toString() + " L");
                cs.endText();
                cs.beginText();
                cs.newLineAtOffset(startX + 120, y + 4);
                cs.showText(despacho.getMonedaPago() + " " + despacho.getPrecioLitroUSD().setScale(2, RoundingMode.HALF_UP));
                cs.endText();
                cs.beginText();
                cs.newLineAtOffset(startX + 240, y + 4);
                cs.showText(despacho.getMonedaPago() + " " + despacho.getTotalUSD().setScale(2, RoundingMode.HALF_UP));
                cs.endText();
                y -= 25;

                if (despacho.getNotas() != null && !despacho.getNotas().isBlank()) {
                    cs.beginText();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
                    cs.newLineAtOffset(startX, y);
                    cs.showText("Notas: " + despacho.getNotas());
                    cs.endText();
                    y -= 16;
                }

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 12);
                cs.newLineAtOffset(startX, y);
                cs.showText("TOTAL: " + despacho.getMonedaPago() + " " + despacho.getTotalUSD().setScale(2, RoundingMode.HALF_UP));
                cs.endText();
            }

            document.save(out);
            return out.toByteArray();
        }
    }
}
