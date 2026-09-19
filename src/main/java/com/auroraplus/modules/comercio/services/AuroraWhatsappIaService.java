package com.auroraplus.modules.comercio.services;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.financiero.entities.TasaCambio;
import com.auroraplus.core.financiero.repositories.TasaCambioRepository;
import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.mensajeria.WhatsAppCloudApiService;
import com.auroraplus.modules.repuestos.entities.RepuestoItem;
import com.auroraplus.modules.repuestos.repositories.RepuestoItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class AuroraWhatsappIaService {

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired(required = false)
    private TasaCambioRepository tasaCambioRepository;

    @Autowired(required = false)
    private ArticuloRepository articuloRepository;

    @Autowired(required = false)
    private RepuestoItemRepository repuestoItemRepository;

    @Autowired(required = false)
    private WhatsAppCloudApiService whatsAppCloudApiService;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    public static class RespuestaIaDTO {
        public String intencion;
        public String textoRespuesta;
        public boolean exito;
    }

    public RespuestaIaDTO procesarMensaje(Long tenantId, String telefonoCliente, String mensajeCliente) {
        RespuestaIaDTO resp = new RespuestaIaDTO();
        resp.exito = true;

        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        if (licencia == null) {
            resp.intencion = "ERROR";
            resp.textoRespuesta = "Negocio no encontrado en el sistema.";
            resp.exito = false;
            return resp;
        }

        if (!licencia.isWhatsappIaActiva()) {
            resp.intencion = "IA_PAUSADA";
            resp.textoRespuesta = "El asistente automatico esta actualmente en pausa. Un asesor te respondera a la brevedad.";
            return resp;
        }

        BigDecimal tasaVes = BigDecimal.valueOf(50.0);
        if (tasaCambioRepository != null) {
            Optional<TasaCambio> tc = tasaCambioRepository
                .findTopByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(tenantId, "USD", "VES");
            if (tc.isPresent() && tc.get().getTasa() != null && tc.get().getTasa().compareTo(BigDecimal.ZERO) > 0) {
                tasaVes = tc.get().getTasa();
            }
        }

        String msgLower = mensajeCliente.toLowerCase().trim();
        String nombreTienda = licencia.getNombreEmpresa();

        // 1. Deteccion de Intencion: TASA DE CAMBIO
        if (msgLower.contains("tasa") || msgLower.contains("dolar") || msgLower.contains("dólar") || msgLower.contains("bcv") || msgLower.contains("a como reciben")) {
            resp.intencion = "CONSULTA_TASA";
            resp.textoRespuesta = "Hola. En " + nombreTienda + " estamos trabajando con la tasa oficial BCV de " 
                + tasaVes.setScale(2, RoundingMode.HALF_UP) + " Bs/$. ¿En que articulo o producto te podemos ayudar hoy?";
            guardarConversacion(tenantId, telefonoCliente, mensajeCliente, resp.textoRespuesta, resp.intencion);
            return resp;
        }

        // 2. Deteccion de Intencion: PAGO MOVIL / DATOS BANCARIOS (100% aislado por Tenant)
        if (msgLower.contains("pago movil") || msgLower.contains("pago móvil") || msgLower.contains("pagomovil") 
                || msgLower.contains("transferir") || msgLower.contains("cuenta") || msgLower.contains("datos bancarios")) {
            resp.intencion = "CONSULTA_PAGO_MOVIL";

            boolean tieneDatos = licencia.getPagoMovilBanco() != null && !licencia.getPagoMovilBanco().isBlank()
                    && licencia.getPagoMovilTelefono() != null && !licencia.getPagoMovilTelefono().isBlank();

            if (!tieneDatos) {
                if (Long.valueOf(1L).equals(tenantId)) {
                    // Datos de prueba exclusivamente para tenant 1 local
                    resp.textoRespuesta = "Con gusto. Estos son los datos de Pago Movil para " + nombreTienda + " (Modo Pruebas):\n\n"
                        + "Banco: 0102 - Banco de Venezuela\n"
                        + "Telefono: 04141112233\n"
                        + "RIF / C.I.: J-12345678-0\n"
                        + "Titular: " + nombreTienda + "\n\n"
                        + "Tasa BCV del dia: " + tasaVes.setScale(2, RoundingMode.HALF_UP) + " Bs/$.\n"
                        + "Por favor envianos el capture del comprobante cuando realices el pago.";
                } else {
                    // Cero alucinaciones para comercios reales en produccion
                    resp.textoRespuesta = "En " + nombreTienda + " no se han registrado los datos publicos de Pago Movil en el sistema.\n\n"
                        + "Por favor escribe 'asesor' para que un encargado te suministre las coordenadas de pago directamente.";
                }
            } else {
                // Datos reales configurados por el dueno del negocio
                String bco = licencia.getPagoMovilBanco();
                String telf = licencia.getPagoMovilTelefono();
                String doc = licencia.getPagoMovilDocumento() != null && !licencia.getPagoMovilDocumento().isBlank() 
                    ? licencia.getPagoMovilDocumento() : (licencia.getRif() != null ? licencia.getRif() : "No especificado");
                String titular = licencia.getPagoMovilTitular() != null && !licencia.getPagoMovilTitular().isBlank() 
                    ? licencia.getPagoMovilTitular() : nombreTienda;

                resp.textoRespuesta = "Con gusto. Estos son los datos oficiales para Pago Movil en " + nombreTienda + ":\n\n"
                    + "Banco: " + bco + "\n"
                    + "Telefono: " + telf + "\n"
                    + "RIF / C.I.: " + doc + "\n"
                    + "Titular: " + titular + "\n\n"
                    + "Tasa BCV del dia: " + tasaVes.setScale(2, RoundingMode.HALF_UP) + " Bs/$.\n"
                    + "Por favor envianos el capture del comprobante cuando realices el pago.";
            }
            guardarConversacion(tenantId, telefonoCliente, mensajeCliente, resp.textoRespuesta, resp.intencion);
            return resp;
        }

        // 3. Deteccion de Intencion: BINANCE PAY
        if (msgLower.contains("binance") || msgLower.contains("usdt") || msgLower.contains("cripto")) {
            resp.intencion = "CONSULTA_BINANCE";
            resp.textoRespuesta = "Si, aceptamos Binance Pay en USDT sin comisiones. Al confirmar los articulos de tu pedido, te facilitamos el enlace directo o codigo QR para transferir.";
            guardarConversacion(tenantId, telefonoCliente, mensajeCliente, resp.textoRespuesta, resp.intencion);
            return resp;
        }

        // 4. Deteccion de Intencion: CATALOGO / LINK DE COMPRA
        if (msgLower.contains("catalogo") || msgLower.contains("catálogo") || msgLower.contains("lista de precios") || msgLower.contains("que venden") || msgLower.contains("qué venden")) {
            resp.intencion = "CONSULTA_CATALOGO";
            resp.textoRespuesta = "Puedes explorar todo nuestro catalogo disponible con precios en $ y Bs. directamente aqui: "
                + "https://auroraplus.app/catalogo/" + tenantId + "\n"
                + "Alli puedes seleccionar tus productos y enviar tu pedido en un clic.";
            guardarConversacion(tenantId, telefonoCliente, mensajeCliente, resp.textoRespuesta, resp.intencion);
            return resp;
        }

        // 5. Deteccion de Intencion: ASESOR HUMANO
        if (msgLower.contains("humano") || msgLower.contains("persona") || msgLower.contains("vendedor") || msgLower.contains("asesor") || msgLower.contains("encargado")) {
            resp.intencion = "TRANSFERENCIA_HUMANO";
            resp.textoRespuesta = "Entendido. He transferido tu conversacion a un asesor de " + nombreTienda + ". En breves momentos te respondera una persona de nuestro equipo.";
            guardarConversacion(tenantId, telefonoCliente, mensajeCliente, resp.textoRespuesta, resp.intencion);
            return resp;
        }

        // 6. Deteccion de Intencion: SALUDO INICIAL
        if (msgLower.equals("hola") || msgLower.equals("buenos dias") || msgLower.equals("buenas tardes") || msgLower.equals("buenas") || msgLower.equals("hola buenas")) {
            resp.intencion = "SALUDO";
            String saludoPers = licencia.getWhatsappIaSaludo();
            if (saludoPers != null && !saludoPers.isBlank()) {
                resp.textoRespuesta = saludoPers;
            } else {
                resp.textoRespuesta = "Hola, bienvenido a " + nombreTienda + ". Estamos a tu orden. ¿Que producto, repuesto o material estas buscando hoy?";
            }
            guardarConversacion(tenantId, telefonoCliente, mensajeCliente, resp.textoRespuesta, resp.intencion);
            return resp;
        }

        // 7. Busqueda en Inventario (RAG sobre productos y repuestos)
        String respuestaStock = buscarEnInventario(tenantId, msgLower, tasaVes, nombreTienda);
        if (respuestaStock != null) {
            resp.intencion = "COTIZACION_PRODUCTO";
            resp.textoRespuesta = respuestaStock;
            guardarConversacion(tenantId, telefonoCliente, mensajeCliente, resp.textoRespuesta, resp.intencion);
            return resp;
        }

        // 8. Respuesta por defecto orientadora
        resp.intencion = "ORIENTACION_GENERAL";
        resp.textoRespuesta = "Gracias por contactar a " + nombreTienda + ". Puedo ayudarte con disponibilidad de inventario, precios en USD/Bs., tasa BCV del dia o datos de Pago Movil. Tambien puedes ver nuestro catalogo digital en: https://auroraplus.app/catalogo/" + tenantId;
        guardarConversacion(tenantId, telefonoCliente, mensajeCliente, resp.textoRespuesta, resp.intencion);
        return resp;
    }

    private String buscarEnInventario(Long tenantId, String consulta, BigDecimal tasaVes, String nombreTienda) {
        String[] palabras = consulta.replaceAll("[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]", "").split("\\s+");
        List<String> keywords = new ArrayList<>();
        for (String w : palabras) {
            if (w.length() > 2 && !w.equals("tienen") && !w.equals("tienes") && !w.equals("precio") 
                    && !w.equals("cuanto") && !w.equals("cuesta") && !w.equals("para")) {
                keywords.add(w.toLowerCase());
            }
        }

        if (keywords.isEmpty()) {
            return null;
        }

        // Buscar en Repuestos
        if (repuestoItemRepository != null) {
            List<RepuestoItem> items = repuestoItemRepository.findByTenantId(tenantId);
            for (RepuestoItem item : items) {
                String desc = item.getDescripcion().toLowerCase();
                String sku = item.getCodigoSku().toLowerCase();
                boolean match = keywords.stream().anyMatch(k -> desc.contains(k) || sku.contains(k));
                if (match) {
                    BigDecimal pUsd = item.getPrecioVenta() != null ? item.getPrecioVenta() : BigDecimal.ZERO;
                    BigDecimal pBs = pUsd.multiply(tasaVes).setScale(2, RoundingMode.HALF_UP);
                    return "Si, tenemos disponible: *" + item.getDescripcion() + "*\n"
                        + "Precio: $" + pUsd + " USD / " + pBs + " Bs. (Tasa BCV: " + tasaVes.setScale(2, RoundingMode.HALF_UP) + " Bs/$)\n"
                        + "Stock actual: " + item.getStockActual() + " " + (item.getUnidadBase() != null ? item.getUnidadBase() : "Pza") + ".\n\n"
                        + "¿Deseas que te lo reservemos o prefieres entrega con delivery?";
                }
            }
        }

        // Buscar en Articulos Generales
        if (articuloRepository != null) {
            List<Articulo> articulos = articuloRepository.findByTenantId(tenantId);
            for (Articulo art : articulos) {
                String nom = art.getNombre().toLowerCase();
                String sku = art.getSku().toLowerCase();
                boolean match = keywords.stream().anyMatch(k -> nom.contains(k) || sku.contains(k));
                if (match) {
                    BigDecimal pUsd = art.getPrecioVenta() != null ? art.getPrecioVenta() : BigDecimal.ZERO;
                    BigDecimal pBs = pUsd.multiply(tasaVes).setScale(2, RoundingMode.HALF_UP);
                    return "Si, tenemos disponible: *" + art.getNombre() + "*\n"
                        + "Precio: $" + pUsd + " USD / " + pBs + " Bs. (Tasa BCV: " + tasaVes.setScale(2, RoundingMode.HALF_UP) + " Bs/$)\n"
                        + "Stock actual: " + art.getStockActual() + " " + (art.getUnidadMedida() != null ? art.getUnidadMedida() : "Unidad") + ".\n\n"
                        + "¿Deseas que te lo reservemos o prefieres entrega con delivery?";
                }
            }
        }

        // Catalogo modelo UNICAMENTE para el tenant 1 de pruebas local
        // Para cualquier otro tenant comercial, NUNCA se alucinan productos de otros tenants
        if (Long.valueOf(1L).equals(tenantId)) {
            Object[][] demo = {
                {"tornillo", "Tornillo Drywall 6x1 (Caja 100u)", 2.80, 45, "Caja"},
                {"taladro", "Taladro Percutor Inalambrico 20V", 68.00, 8, "Pza"},
                {"cable", "Cable Electrico 7 Hilos THW #12 (Metro)", 0.95, 320, "Metro"},
                {"tubo", "Tubo PVC Aguas Negras 4 x 3 Mts", 9.50, 24, "Tubo"},
                {"disco", "Disco de Corte para Metal 4 1/2", 1.25, 110, "Pza"},
                {"cemento", "Cemento Gris Tipo I 42.5kg", 9.00, 65, "Saco"},
                {"pintura", "Pintura Caucho Blanco Mate (Galon)", 14.50, 18, "Galon"},
                {"llave", "Juego de Llaves Combinadas 8-19mm", 22.00, 12, "Set"},
                {"bombillo", "Bombillo LED 12W Luz Blanca E27", 1.80, 85, "Pza"}
            };

            for (Object[] d : demo) {
                String key = (String) d[0];
                if (keywords.stream().anyMatch(k -> k.contains(key) || key.contains(k))) {
                    BigDecimal pUsd = BigDecimal.valueOf((Double) d[2]).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal pBs = pUsd.multiply(tasaVes).setScale(2, RoundingMode.HALF_UP);
                    return "Si, tenemos disponible: *" + d[1] + "*\n"
                        + "Precio: $" + pUsd + " USD / " + pBs + " Bs. (Tasa BCV: " + tasaVes.setScale(2, RoundingMode.HALF_UP) + " Bs/$)\n"
                        + "Stock actual: " + d[3] + " " + d[4] + ".\n\n"
                        + "Deseas que te lo reservemos o prefieres entrega con delivery?";
                }
            }
        }

        // Si el cliente pregunto explicitamente por disponibilidad o precio de un producto y no existe en su inventario
        boolean esConsultaProducto = consulta.contains("tienen") || consulta.contains("tienes") 
                || consulta.contains("precio") || consulta.contains("cuanto") || consulta.contains("cuesta") 
                || consulta.contains("disponible") || consulta.contains("hay") || consulta.contains("venden");

        if (esConsultaProducto) {
            return "Actualmente no encontramos ese articulo en el inventario registrado de " + nombreTienda + ".\n\n"
                + "Puedes consultar los productos disponibles en nuestro catalogo oficial: https://auroraplus.app/catalogo/" + tenantId + "\n"
                + "O si lo deseas, escribe 'asesor' para que un encargado verifique reposicion o existencia en almacen.";
        }

        return null;
    }

    private void guardarConversacion(Long tenantId, String telefono, String mensaje, String respuesta, String intencion) {
        if (jdbcTemplate != null) {
            try {
                jdbcTemplate.update(
                    "INSERT INTO comercio_whatsapp_conversaciones (tenant_id, telefono_cliente, mensaje_cliente, respuesta_ia, intencion) VALUES (?, ?, ?, ?, ?)",
                    tenantId, telefono, mensaje, respuesta, intencion
                );
            } catch (Exception e) {
                // Silencioso para no frenar la respuesta
            }
        }
    }
}
