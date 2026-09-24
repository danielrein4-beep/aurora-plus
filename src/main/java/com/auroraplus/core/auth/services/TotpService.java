package com.auroraplus.core.auth.services;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;

/**
 * Códigos de un solo uso por tiempo (TOTP, RFC 6238: HMAC-SHA1, 6 dígitos,
 * pasos de 30 s) — el estándar que leen Google Authenticator, Authy y
 * Microsoft Authenticator. Implementado aquí para no sumar una dependencia
 * por ~60 líneas de código.
 */
@Service
public class TotpService {

    private static final String ALFABETO_BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final int PASO_SEGUNDOS = 30;
    /** Acepta el código del paso anterior y del siguiente, por desfase de reloj del teléfono. */
    private static final int VENTANA = 1;

    private final SecureRandom random = new SecureRandom();

    public String generarSecreto() {
        byte[] bytes = new byte[20];
        random.nextBytes(bytes);
        return base32(bytes);
    }

    public String uriOtpAuth(String emisor, String cuenta, String secreto) {
        String etiqueta = URLEncoder.encode(emisor + ":" + cuenta, StandardCharsets.UTF_8).replace("+", "%20");
        return "otpauth://totp/" + etiqueta + "?secret=" + secreto
            + "&issuer=" + URLEncoder.encode(emisor, StandardCharsets.UTF_8).replace("+", "%20")
            + "&algorithm=SHA1&digits=6&period=" + PASO_SEGUNDOS;
    }

    public boolean verificar(String secreto, String codigo) {
        if (secreto == null || codigo == null) return false;
        String limpio = codigo.replaceAll("\\s", "");
        if (!limpio.matches("\\d{6}")) return false;
        byte[] clave = decodificarBase32(secreto);
        long pasoActual = System.currentTimeMillis() / 1000 / PASO_SEGUNDOS;
        boolean valido = false;
        for (int i = -VENTANA; i <= VENTANA; i++) {
            // Comparación en tiempo constante y sin cortar el ciclo: no filtra cuál paso coincidió.
            valido |= MessageDigest.isEqual(
                codigoPara(clave, pasoActual + i).getBytes(StandardCharsets.US_ASCII),
                limpio.getBytes(StandardCharsets.US_ASCII));
        }
        return valido;
    }

    private String codigoPara(byte[] clave, long paso) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(clave, "HmacSHA1"));
            byte[] hash = mac.doFinal(ByteBuffer.allocate(8).putLong(paso).array());
            int desplazamiento = hash[hash.length - 1] & 0x0f;
            int binario = ((hash[desplazamiento] & 0x7f) << 24)
                | ((hash[desplazamiento + 1] & 0xff) << 16)
                | ((hash[desplazamiento + 2] & 0xff) << 8)
                | (hash[desplazamiento + 3] & 0xff);
            return String.format("%06d", binario % 1_000_000);
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo calcular el código TOTP", e);
        }
    }

    private static String base32(byte[] datos) {
        StringBuilder sb = new StringBuilder();
        int buffer = 0, bits = 0;
        for (byte b : datos) {
            buffer = (buffer << 8) | (b & 0xff);
            bits += 8;
            while (bits >= 5) {
                sb.append(ALFABETO_BASE32.charAt((buffer >> (bits - 5)) & 31));
                bits -= 5;
            }
        }
        if (bits > 0) sb.append(ALFABETO_BASE32.charAt((buffer << (5 - bits)) & 31));
        return sb.toString();
    }

    private static byte[] decodificarBase32(String texto) {
        String limpio = texto.replace("=", "").replace(" ", "").toUpperCase();
        ByteBuffer salida = ByteBuffer.allocate(limpio.length() * 5 / 8);
        int buffer = 0, bits = 0;
        for (char c : limpio.toCharArray()) {
            int valor = ALFABETO_BASE32.indexOf(c);
            if (valor < 0) throw new IllegalArgumentException("Secreto TOTP inválido");
            buffer = (buffer << 5) | valor;
            bits += 5;
            if (bits >= 8) {
                salida.put((byte) ((buffer >> (bits - 8)) & 0xff));
                bits -= 8;
            }
        }
        return salida.array();
    }
}
