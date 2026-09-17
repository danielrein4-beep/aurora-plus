package com.auroraplus.core.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Cifrado simétrico genérico (AES-256-GCM) para credenciales de terceros que
 * el negocio guarda en su propia configuración (ej. el Secret Key de su
 * cuenta Binance Pay) — nunca se guardan en texto plano en la base de datos.
 * Reutiliza jwt.secret como material de la llave (derivado con SHA-256, no
 * el texto crudo) en vez de exigir una variable de entorno nueva que
 * gestionar: es un secreto que YA vive protegido en el entorno de
 * producción, con la misma exigencia de "cambiar el valor de desarrollo
 * antes de producción" que ya existe para JWT.
 */
@Service
public class CifradoSimetricoService {

    @Value("${jwt.secret}")
    private String secretoBase;

    private SecretKeySpec obtenerLlave() {
        try {
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            byte[] llave = sha256.digest(secretoBase.getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(llave, "AES");
        } catch (Exception e) {
            throw new RuntimeException("No se pudo derivar la llave de cifrado", e);
        }
    }

    /** Devuelve "ivBase64:cifradoBase64" — el IV es aleatorio en cada llamada, nunca se reutiliza. */
    public String cifrar(String textoPlano) {
        if (textoPlano == null || textoPlano.isBlank()) return null;
        try {
            byte[] iv = new byte[12];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, obtenerLlave(), new GCMParameterSpec(128, iv));
            byte[] cifrado = cipher.doFinal(textoPlano.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(iv) + ":" + Base64.getEncoder().encodeToString(cifrado);
        } catch (Exception e) {
            throw new RuntimeException("No se pudo cifrar el valor", e);
        }
    }

    public String descifrar(String valorCifrado) {
        if (valorCifrado == null || valorCifrado.isBlank()) return null;
        try {
            String[] partes = valorCifrado.split(":", 2);
            byte[] iv = Base64.getDecoder().decode(partes[0]);
            byte[] cifrado = Base64.getDecoder().decode(partes[1]);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, obtenerLlave(), new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(cifrado), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("No se pudo descifrar el valor — ¿cambió jwt.secret desde que se guardó?", e);
        }
    }
}
