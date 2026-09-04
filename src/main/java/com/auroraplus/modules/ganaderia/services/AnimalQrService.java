package com.auroraplus.modules.ganaderia.services;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.auroraplus.modules.ganaderia.entities.Animal;
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
import java.util.EnumMap;
import java.util.Map;

/**
 * Ficha con código QR por animal (Subfase de trazabilidad), pensada para
 * lectura con el celular en el campo: apunta la cámara y trae el arete
 * directo, sin escribir nada a mano. El QR codifica el arete en texto plano
 * — el mismo valor que ya identifica al animal en toda la trazabilidad.
 */
@Service
public class AnimalQrService {

    private static final float LABEL_WIDTH = 141.7f; // 50mm
    private static final float LABEL_HEIGHT = 141.7f; // 50mm — cuadrada, para que el QR quede grande y legible

    private byte[] generarQrPng(String contenido, int size) throws Exception {
        Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
        hints.put(EncodeHintType.MARGIN, 1);
        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(contenido, BarcodeFormat.QR_CODE, size, size, hints);
        BufferedImage image = MatrixToImageWriter.toBufferedImage(matrix);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    public byte[] generarFichaQr(Animal animal) throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(new PDRectangle(LABEL_WIDTH, LABEL_HEIGHT));
            document.addPage(page);

            byte[] qrPng = generarQrPng(animal.getArete(), 300);
            PDImageXObject qrImg = PDImageXObject.createFromByteArray(document, qrPng, "qr-animal");

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 8);
                cs.newLineAtOffset(4, LABEL_HEIGHT - 12);
                cs.showText("ARETE: " + animal.getArete());
                cs.endText();

                float qrSize = LABEL_WIDTH - 20;
                cs.drawImage(qrImg, (LABEL_WIDTH - qrSize) / 2, 20, qrSize, qrSize);

                if (animal.getNombre() != null && !animal.getNombre().isBlank()) {
                    cs.beginText();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 6);
                    cs.newLineAtOffset(4, 8);
                    cs.showText(animal.getNombre());
                    cs.endText();
                }
            }

            document.save(out);
            return out.toByteArray();
        }
    }
}
