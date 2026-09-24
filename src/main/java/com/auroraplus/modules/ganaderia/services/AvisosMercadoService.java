package com.auroraplus.modules.ganaderia.services;

import com.auroraplus.core.config.CorreoService;
import com.auroraplus.core.mensajeria.WhatsAppPlataformaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.util.HtmlUtils;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Avisa a una finca de lo que pasa en el Mercado Ganadero (oferta nueva,
 * mensaje, trato cerrado) por correo y, si está configurada la plantilla de
 * avisos, por el WhatsApp de la plataforma.
 *
 * Se envía después de confirmar la transacción y en segundo plano: un correo
 * que falla nunca debe tumbar ni demorar una oferta. Los textos no revelan
 * nombres de fincas antes de cerrar el trato.
 */
@Service
public class AvisosMercadoService {

    private static final Logger log = LoggerFactory.getLogger(AvisosMercadoService.class);

    @Autowired private JdbcTemplate jdbc;
    @Autowired private CorreoService correo;
    @Autowired private WhatsAppPlataformaService whatsapp;

    @Value("${app.frontend.url:http://localhost:8443}")
    private String urlFrontend;

    public void avisar(Long tenantId, String asunto, String texto) {
        Runnable envio = () -> CompletableFuture.runAsync(() -> enviar(tenantId, asunto, texto));
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { envio.run(); }
            });
        } else {
            envio.run();
        }
    }

    private void enviar(Long tenantId, String asunto, String texto) {
        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT email_contacto, telefono_contacto FROM licencias_tenant WHERE tenant_id = ?", tenantId);
        if (filas.isEmpty()) return;
        String email = (String) filas.get(0).get("email_contacto");
        String telefono = (String) filas.get(0).get("telefono_contacto");
        String enlace = urlFrontend.replaceAll("/+$", "") + "/mercado";

        if (email != null && !email.isBlank()) {
            try {
                correo.enviarHtml(email, asunto, """
                    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1c1917">
                      <div style="background:#022c22;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0">
                        <strong style="font-size:17px">Mercado Ganadero</strong><br><span style="font-size:12px;color:#a7f3d0">Aurora Plus</span>
                      </div>
                      <div style="border:1px solid #e7e5e4;border-top:0;padding:22px;border-radius:0 0 14px 14px">
                        <p style="font-size:15px;line-height:1.5">%s</p>
                        <p><a href="%s" style="display:inline-block;background:#f59e0b;color:#022c22;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Abrir el mercado</a></p>
                        <p style="font-size:12px;color:#78716c">Responde siempre desde el chat del mercado: los datos de contacto se comparten solos al cerrar el trato.</p>
                      </div>
                    </div>""".formatted(HtmlUtils.htmlEscape(texto), enlace));
            } catch (Exception e) {
                log.warn("No se pudo enviar el aviso del mercado por correo a la finca {}: {}", tenantId, e.getMessage());
            }
        }
        String e164 = telefonoVenezuela(telefono);
        if (e164 != null && whatsapp.avisosConfigurados()) {
            try {
                whatsapp.enviarAviso(e164, "Mercado Ganadero: " + texto);
            } catch (Exception e) {
                log.warn("No se pudo enviar el aviso del mercado por WhatsApp a la finca {}: {}", tenantId, e.getMessage());
            }
        }
    }

    /** "0414-555.00.33" o "414 5550033" → "+584145550033"; otros formatos con + se respetan. */
    static String telefonoVenezuela(String telefono) {
        if (telefono == null) return null;
        String limpio = telefono.replaceAll("[^0-9+]", "");
        if (limpio.startsWith("+")) return limpio.length() >= 11 ? limpio : null;
        if (limpio.startsWith("58") && limpio.length() == 12) return "+" + limpio;
        if (limpio.startsWith("0") && limpio.length() == 11) return "+58" + limpio.substring(1);
        if (limpio.length() == 10) return "+58" + limpio;
        return null;
    }
}
