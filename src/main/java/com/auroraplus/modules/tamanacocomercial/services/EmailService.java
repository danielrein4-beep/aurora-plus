package com.auroraplus.modules.tamanacocomercial.services;

import org.springframework.stereotype.Service;

@Service
public class EmailService {

    public void enviarCorreoRecuperacion(String emailDestino, String token) {
        String resetUrl = "http://localhost:8080/reset?token=" + token;

        System.out.println("=========================================================");
        System.out.println("SIMULADOR DE CORREO ELECTRÓNICO (ENTORNO DEV)");
        System.out.println("=========================================================");
        System.out.println("Para: " + emailDestino);
        System.out.println("Asunto: Recuperación de Contraseña - Carbones Tamanaco");
        System.out.println("Cuerpo: ");
        System.out.println("Has solicitado restablecer tu contraseña.");
        System.out.println("Por favor, haz clic en el siguiente enlace para crear una nueva:");
        System.out.println(resetUrl);
        System.out.println("Este enlace expirará en 1 hora.");
        System.out.println("=========================================================");
    }
}
