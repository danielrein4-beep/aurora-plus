package com.auroraplus.modules.comercio.controllers;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.financiero.entities.TasaCambio;
import com.auroraplus.core.financiero.repositories.TasaCambioRepository;
import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.modules.comercio.entities.PedidoWebComercio;
import com.auroraplus.modules.comercio.repositories.PedidoWebComercioRepository;
import com.auroraplus.modules.repuestos.entities.RepuestoItem;
import com.auroraplus.modules.repuestos.repositories.RepuestoItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequestMapping("/api/public/catalogo")
public class CatalogoPublicoController {

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    @Autowired(required = false)
    private RepuestoItemRepository repuestoItemRepository;

    @Autowired(required = false)
    private ArticuloRepository articuloRepository;

    @Autowired(required = false)
    private TasaCambioRepository tasaCambioRepository;

    @Autowired
    private PedidoWebComercioRepository pedidoWebRepository;

    @GetMapping("/{tenantId:[0-9]+}")
    public ResponseEntity<?> obtenerCatalogoPublico(@PathVariable Long tenantId) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        if (licencia == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Tienda no encontrada"));
        }

        BigDecimal tasaVes = BigDecimal.valueOf(50.0);
        if (tasaCambioRepository != null) {
            Optional<TasaCambio> tc = tasaCambioRepository
                .findTopByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(tenantId, "USD", "VES");
            if (tc.isPresent() && tc.get().getTasa() != null && tc.get().getTasa().compareTo(BigDecimal.ZERO) > 0) {
                tasaVes = tc.get().getTasa();
            }
        }

        List<Map<String, Object>> productos = new ArrayList<>();

        // 1. Items de repuestos si existen
        if (repuestoItemRepository != null) {
            List<RepuestoItem> items = repuestoItemRepository.findByTenantId(tenantId);
            for (RepuestoItem item : items) {
                BigDecimal precioUsd = item.getPrecioVenta() != null ? item.getPrecioVenta() : BigDecimal.ZERO;
                BigDecimal precioBs = precioUsd.multiply(tasaVes).setScale(2, RoundingMode.HALF_UP);

                Map<String, Object> p = new LinkedHashMap<>();
                p.put("id", "rep-" + item.getId());
                p.put("codigo", item.getCodigoSku());
                p.put("oem", item.getCodigoOriginalOem());
                p.put("nombre", item.getDescripcion());
                p.put("categoria", "Repuestos");
                p.put("stock", item.getStockActual() != null ? item.getStockActual() : BigDecimal.ZERO);
                p.put("precioUsd", precioUsd);
                p.put("precioBs", precioBs);
                p.put("unidad", item.getUnidadBase() != null ? item.getUnidadBase() : "Pza");
                p.put("precioMayorista", item.getPrecioMayorista());
                p.put("cantidadMinimaMayorista", item.getCantidadMinimaMayorista());
                productos.add(p);
            }
        }

        // 2. Articulos generales del inventario
        if (articuloRepository != null) {
            List<Articulo> articulos = articuloRepository.findByTenantId(tenantId);
            for (Articulo art : articulos) {
                BigDecimal precioUsd = art.getPrecioVenta() != null ? art.getPrecioVenta() : BigDecimal.ZERO;
                BigDecimal precioBs = precioUsd.multiply(tasaVes).setScale(2, RoundingMode.HALF_UP);

                Map<String, Object> p = new LinkedHashMap<>();
                p.put("id", "art-" + art.getId());
                p.put("codigo", art.getSku());
                p.put("nombre", art.getNombre());
                p.put("categoria", art.getCategoria() != null ? art.getCategoria() : "General");
                p.put("stock", art.getStockActual() != null ? art.getStockActual() : BigDecimal.ZERO);
                p.put("precioUsd", precioUsd);
                p.put("precioBs", precioBs);
                p.put("unidad", art.getUnidadMedida() != null ? art.getUnidadMedida() : "Unidad");
                productos.add(p);
            }
        }

        // 3. Si no hay items cargados en BD, catalogo modelo unicamete para entorno de pruebas (tenantId == 1)
        // Para cualquier otro tenant en produccion, se respeta estrictamente su inventario real para evitar alucinaciones
        if (productos.isEmpty() && Long.valueOf(1L).equals(tenantId)) {
            productos.addAll(generarCatalogoModelo(tasaVes));
        }

        // 4. Datos de Pago Movil del negocio
        Map<String, Object> pagoMovil = new LinkedHashMap<>();
        pagoMovil.put("activo", licencia.isPagoMovilActivo());
        pagoMovil.put("banco", licencia.getPagoMovilBanco() != null ? licencia.getPagoMovilBanco() : "0102 - Banco de Venezuela");
        pagoMovil.put("telefono", licencia.getPagoMovilTelefono() != null ? licencia.getPagoMovilTelefono() : (licencia.getTelefonoContacto() != null ? licencia.getTelefonoContacto() : "04141112233"));
        pagoMovil.put("documento", licencia.getPagoMovilDocumento() != null ? licencia.getPagoMovilDocumento() : (licencia.getRif() != null ? licencia.getRif() : "J-12345678-0"));
        pagoMovil.put("titular", licencia.getPagoMovilTitular() != null ? licencia.getPagoMovilTitular() : licencia.getNombreEmpresa());

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("tenantId", tenantId);
        resp.put("nombreTienda", licencia.getNombreEmpresa());
        resp.put("moduloPrincipal", licencia.getModuloPrincipal());
        resp.put("telefonoWhatsapp", licencia.getTelefonoContacto() != null ? licencia.getTelefonoContacto() : "04141234567");
        resp.put("emailContacto", licencia.getEmailContacto());
        resp.put("logoBase64", licencia.getLogoBase64());
        resp.put("tasaVes", tasaVes);
        resp.put("pagoMovil", pagoMovil);
        resp.put("productos", productos);

        return ResponseEntity.ok(resp);
    }

    private List<Map<String, Object>> generarCatalogoModelo(BigDecimal tasaVes) {
        List<Map<String, Object>> lista = new ArrayList<>();
        Object[][] demo = {
            {"TORN-38", "Tornillo Drywall 6x1 (Caja 100u)", "Tornilleria", 2.80, 45, "Caja"},
            {"TAL-20V", "Taladro Percutor Inalambrico 20V", "Herramientas", 68.00, 8, "Pza"},
            {"CAB-THW12", "Cable Electrico 7 Hilos THW #12 (Metro)", "Electrico", 0.95, 320, "Metro"},
            {"TUB-PVC4", "Tubo PVC Aguas Negras 4 x 3 Mts", "Plomeria", 9.50, 24, "Tubo"},
            {"DISC-45", "Disco de Corte para Metal 4 1/2", "Herramientas", 1.25, 110, "Pza"},
            {"CEM-T1", "Cemento Gris Tipo I 42.5kg", "Construccion", 9.00, 65, "Saco"},
            {"PINT-BLA", "Pintura Caucho Blanco Mate (Galon)", "Pinturas", 14.50, 18, "Galon"},
            {"LLAV-12", "Juego de Llaves Combinadas 8-19mm", "Herramientas", 22.00, 12, "Set"},
            {"BOMB-LED", "Bombillo LED 12W Luz Blanca E27", "Iluminacion", 1.80, 85, "Pza"},
            {"CINT-AIS", "Tirro / Teipe Electrico Negro 20m", "Electrico", 0.85, 150, "Rollo"}
        };

        for (int i = 0; i < demo.length; i++) {
            BigDecimal pUsd = BigDecimal.valueOf((Double) demo[i][3]).setScale(2, RoundingMode.HALF_UP);
            BigDecimal pBs = pUsd.multiply(tasaVes).setScale(2, RoundingMode.HALF_UP);

            Map<String, Object> p = new LinkedHashMap<>();
            p.put("id", "mod-" + (i + 1));
            p.put("codigo", demo[i][0]);
            p.put("nombre", demo[i][1]);
            p.put("categoria", demo[i][2]);
            p.put("precioUsd", pUsd);
            p.put("precioBs", pBs);
            p.put("stock", demo[i][4]);
            p.put("unidad", demo[i][5]);
            lista.add(p);
        }
        return lista;
    }

    public static class LineaPedidoDto {
        public String productoId;
        public String codigo;
        public String nombre;
        public BigDecimal cantidad;
        public BigDecimal precioUnitarioUsd;
        public BigDecimal subtotalUsd;
    }

    public static class CrearPedidoWebRequest {
        public String clienteNombre;
        public String clienteTelefono;
        public String tipoEntrega;
        public String direccionEntrega;
        public String metodoPago;
        public BigDecimal totalUsd;
        public BigDecimal totalBs;
        public BigDecimal tasaCambio;
        public String notas;
        public List<LineaPedidoDto> items;
    }

    // La configuracion de Pago Movil (GET/POST) y la gestion de pedidos (listar, cambiar
    // estado) se movieron a CatalogoGestionController bajo /api/comercio/catalogo — estos
    // endpoints exponian datos de clientes y, mas grave, permitian a cualquiera en internet
    // reescribir la cuenta bancaria del negocio sin ninguna autenticacion (solo requerian
    // adivinar el tenantId). Solo la CREACION de un pedido (abajo) es legitimamente publica:
    // la hace un cliente sin sesion desde el catalogo.

    /** Precio real en USD de un producto del catalogo, resuelto en el servidor a partir de
     * su id ("rep-N", "art-N" o "mod-N" para el catalogo de demo) — nunca del precio que
     * manda el navegador, que cualquiera puede alterar antes de enviarlo. Null si el id no
     * corresponde a ningun producto real: ese item se descarta del pedido. */
    private BigDecimal resolverPrecioReal(Long tenantId, String productoId, BigDecimal tasaVes) {
        if (productoId == null) return null;
        try {
            if (productoId.startsWith("rep-") && repuestoItemRepository != null) {
                Long id = Long.parseLong(productoId.substring(4));
                RepuestoItem item = repuestoItemRepository.findById(id).orElse(null);
                if (item == null || !tenantId.equals(item.getTenantId())) return null;
                return item.getPrecioVenta() != null ? item.getPrecioVenta() : BigDecimal.ZERO;
            }
            if (productoId.startsWith("art-") && articuloRepository != null) {
                Long id = Long.parseLong(productoId.substring(4));
                Articulo art = articuloRepository.findById(id).orElse(null);
                if (art == null || !tenantId.equals(art.getTenantId())) return null;
                return art.getPrecioVenta() != null ? art.getPrecioVenta() : BigDecimal.ZERO;
            }
            if (productoId.startsWith("mod-") && Long.valueOf(1L).equals(tenantId)) {
                for (Map<String, Object> p : generarCatalogoModelo(tasaVes)) {
                    if (productoId.equals(p.get("id"))) return (BigDecimal) p.get("precioUsd");
                }
            }
        } catch (NumberFormatException ignored) { /* id malformado -> item descartado */ }
        return null;
    }

    @PostMapping("/{tenantId:[0-9]+}/pedidos")
    public ResponseEntity<?> registrarPedidoWeb(@PathVariable Long tenantId, @RequestBody CrearPedidoWebRequest req) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        if (licencia == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Tienda no encontrada"));
        }
        if (req.items == null || req.items.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El pedido no tiene articulos."));
        }

        BigDecimal tasaVes = BigDecimal.valueOf(50.0);
        if (tasaCambioRepository != null) {
            Optional<TasaCambio> tc = tasaCambioRepository
                .findTopByTenantIdAndMonedaOrigenAndMonedaDestinoOrderByFechaActualizacionDesc(tenantId, "USD", "VES");
            if (tc.isPresent() && tc.get().getTasa() != null && tc.get().getTasa().compareTo(BigDecimal.ZERO) > 0) {
                tasaVes = tc.get().getTasa();
            }
        }

        String numPedido = "PED-" + String.format("%04d", (int)(Math.random() * 9000) + 1000);

        PedidoWebComercio pedido = new PedidoWebComercio();
        pedido.setTenantId(tenantId);
        pedido.setNumeroPedido(numPedido);
        pedido.setClienteNombre(req.clienteNombre != null && !req.clienteNombre.isBlank() ? req.clienteNombre : "Cliente Web");
        pedido.setClienteTelefono(req.clienteTelefono != null ? req.clienteTelefono : "");
        pedido.setTipoEntrega(req.tipoEntrega != null ? req.tipoEntrega : "DELIVERY");
        pedido.setDireccionEntrega(req.direccionEntrega != null ? req.direccionEntrega : "");
        pedido.setMetodoPago(req.metodoPago != null ? req.metodoPago : "PAGO_MOVIL");
        pedido.setEstado("PENDIENTE");
        pedido.setTasaCambio(tasaVes);
        pedido.setNotas(req.notas != null ? req.notas : "");

        // Recalcular cada linea y el total a partir del precio REAL en el catalogo — nunca
        // confiar en precioUnitarioUsd/subtotalUsd/totalUsd que manda el navegador, que
        // cualquiera puede editar antes de enviar el pedido para pagar de menos.
        StringBuilder itemsTxt = new StringBuilder();
        StringBuilder msgWhatsapp = new StringBuilder();
        msgWhatsapp.append("*NUEVO PEDIDO WEB - ").append(licencia.getNombreEmpresa().toUpperCase()).append("*\n");
        msgWhatsapp.append("Pedido: #").append(numPedido).append("\n\n");
        msgWhatsapp.append("*DETALLE DEL PEDIDO:*\n");

        BigDecimal totalUsdReal = BigDecimal.ZERO;
        for (LineaPedidoDto it : req.items) {
            BigDecimal precioReal = resolverPrecioReal(tenantId, it.productoId, tasaVes);
            if (precioReal == null) continue; // producto invalido/de otro tenant: se ignora
            BigDecimal cantidad = it.cantidad != null && it.cantidad.compareTo(BigDecimal.ZERO) > 0 ? it.cantidad : BigDecimal.ONE;
            BigDecimal subtotal = precioReal.multiply(cantidad).setScale(2, RoundingMode.HALF_UP);
            totalUsdReal = totalUsdReal.add(subtotal);

            String nombre = it.nombre != null ? it.nombre : "Articulo";
            itemsTxt.append(cantidad).append("x ").append(nombre).append(" ($").append(precioReal).append("); ");
            msgWhatsapp.append("- ").append(cantidad).append("x ").append(nombre)
                    .append(" ($").append(subtotal).append(" USD)\n");
        }

        if (totalUsdReal.compareTo(BigDecimal.ZERO) == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ninguno de los articulos del pedido pudo validarse contra el catalogo real."));
        }

        pedido.setTotalUsd(totalUsdReal);
        pedido.setTotalBs(totalUsdReal.multiply(tasaVes).setScale(2, RoundingMode.HALF_UP));
        pedido.setItemsJson(itemsTxt.toString());
        PedidoWebComercio guardado = pedidoWebRepository.save(pedido);

        msgWhatsapp.append("\n*TOTAL A PAGAR:* $").append(pedido.getTotalUsd()).append(" USD");
        if (pedido.getTotalBs().compareTo(BigDecimal.ZERO) > 0) {
            msgWhatsapp.append(" / ").append(pedido.getTotalBs()).append(" Bs.\n");
        } else {
            msgWhatsapp.append("\n");
        }
        msgWhatsapp.append("Tasa BCV/Ref: ").append(pedido.getTasaCambio()).append(" Bs/$\n\n");

        msgWhatsapp.append("*DATOS DEL CLIENTE:*\n");
        msgWhatsapp.append("Nombre: ").append(pedido.getClienteNombre()).append("\n");
        msgWhatsapp.append("Telefono: ").append(pedido.getClienteTelefono()).append("\n");
        msgWhatsapp.append("Modalidad: ").append(pedido.getTipoEntrega()).append("\n");
        if ("DELIVERY".equalsIgnoreCase(pedido.getTipoEntrega()) && !pedido.getDireccionEntrega().isBlank()) {
            msgWhatsapp.append("Direccion de Entrega: ").append(pedido.getDireccionEntrega()).append("\n");
        }
        msgWhatsapp.append("Metodo de Pago: ").append(pedido.getMetodoPago()).append("\n");

        // Si es Pago Movil, adjuntar los datos del comercio en el WhatsApp
        if ("PAGO_MOVIL".equalsIgnoreCase(pedido.getMetodoPago())) {
            String bco = licencia.getPagoMovilBanco() != null ? licencia.getPagoMovilBanco() : "0102 - Banco de Venezuela";
            String doc = licencia.getPagoMovilDocumento() != null ? licencia.getPagoMovilDocumento() : (licencia.getRif() != null ? licencia.getRif() : "");
            String telf = licencia.getPagoMovilTelefono() != null ? licencia.getPagoMovilTelefono() : (licencia.getTelefonoContacto() != null ? licencia.getTelefonoContacto() : "");
            msgWhatsapp.append("\n*DATOS PAGO MOVIL TIENDA:*\n");
            msgWhatsapp.append("Banco: ").append(bco).append("\n");
            msgWhatsapp.append("Documento/RIF: ").append(doc).append("\n");
            msgWhatsapp.append("Telefono: ").append(telf).append("\n");
            msgWhatsapp.append("Monto exacto: ").append(pedido.getTotalBs()).append(" Bs.\n");
        }

        if (pedido.getNotas() != null && !pedido.getNotas().isBlank()) {
            msgWhatsapp.append("\nObservaciones: ").append(pedido.getNotas()).append("\n");
        }
        msgWhatsapp.append("\nAurora Plus - Gestion Comercial");

        String destPhone = licencia.getTelefonoContacto();
        if (destPhone == null || destPhone.isBlank()) {
            destPhone = "584140000000";
        }
        String cleanPhone = destPhone.replaceAll("[^0-9]", "");
        if (cleanPhone.startsWith("0")) {
            cleanPhone = "58" + cleanPhone.substring(1);
        } else if (!cleanPhone.startsWith("58") && cleanPhone.length() == 10) {
            cleanPhone = "58" + cleanPhone;
        }

        String encodedMsg = URLEncoder.encode(msgWhatsapp.toString(), StandardCharsets.UTF_8);
        String whatsappUrl = "https://wa.me/" + cleanPhone + "?text=" + encodedMsg;

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("pedidoId", guardado.getId());
        resp.put("numeroPedido", guardado.getNumeroPedido());
        resp.put("estado", guardado.getEstado());
        resp.put("whatsappUrl", whatsappUrl);
        resp.put("mensajeTexto", msgWhatsapp.toString());

        return ResponseEntity.ok(resp);
    }

}
