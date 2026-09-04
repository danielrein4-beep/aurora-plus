package com.auroraplus.modules.horeca.services;

import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.ItemComanda;
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
import java.util.List;

/** Ticket de cierre de comanda — tamaño de rollo térmico de 80mm, el formato estándar de impresoras de punto de venta. */
@Service
public class ComandaPdfService {

    private static final float TICKET_WIDTH = 226.77f; // 80mm
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public byte[] generarTicket(Comanda comanda, List<ItemComanda> items) throws Exception {
        float alturaEstimada = 140 + items.size() * 14;
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(new PDRectangle(TICKET_WIDTH, alturaEstimada));
            document.addPage(page);

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                float y = alturaEstimada - 15;
                float x = 8;

                String encabezado = comanda.getNumeroMesa() != null ? "MESA " + comanda.getNumeroMesa() : comanda.getCanal();
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 11);
                cs.newLineAtOffset(x, y);
                cs.showText(encabezado);
                cs.endText();
                y -= 14;

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 7);
                cs.newLineAtOffset(x, y);
                cs.showText("Mesero: " + comanda.getMesero());
                cs.endText();
                y -= 10;

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 7);
                cs.newLineAtOffset(x, y);
                cs.showText(comanda.getFechaCierre() != null ? comanda.getFechaCierre().format(FMT) : "");
                cs.endText();
                y -= 16;

                cs.moveTo(x, y);
                cs.lineTo(TICKET_WIDTH - x, y);
                cs.stroke();
                y -= 12;

                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 7);
                for (ItemComanda item : items) {
                    String nombre = item.getNombrePlato();
                    if (nombre.length() > 22) nombre = nombre.substring(0, 22);
                    cs.beginText();
                    cs.newLineAtOffset(x, y);
                    cs.showText(item.getCantidad() + "x " + nombre);
                    cs.endText();

                    String subtotal = item.getPrecioUnitario().multiply(java.math.BigDecimal.valueOf(item.getCantidad()))
                        .setScale(2, RoundingMode.HALF_UP).toString();
                    cs.beginText();
                    cs.newLineAtOffset(TICKET_WIDTH - x - 35, y);
                    cs.showText(subtotal);
                    cs.endText();
                    y -= 12;
                }

                y -= 4;
                cs.moveTo(x, y);
                cs.lineTo(TICKET_WIDTH - x, y);
                cs.stroke();
                y -= 14;

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 10);
                cs.newLineAtOffset(x, y);
                cs.showText("TOTAL: $" + comanda.getTotalConsumo().setScale(2, RoundingMode.HALF_UP));
                cs.endText();
                y -= 14;

                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 8);
                cs.newLineAtOffset(x, y);
                cs.showText("Pago: " + (comanda.getMetodoPago() != null ? comanda.getMetodoPago() : "-"));
                cs.endText();
            }

            document.save(out);
            return out.toByteArray();
        }
    }
}
