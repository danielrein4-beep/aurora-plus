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

    public static class ConfigPagoMovilRequest {
        public String banco;
        public String telefono;
        public String documento;
        public String titular;
        public Boolean activo;
    }

    @GetMapping("/{tenantId:[0-9]+}/pago-movil")
    public ResponseEntity<?> obtenerConfigPagoMovil(@PathVariable Long tenantId) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        if (licencia == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Tienda no encontrada"));
        }
        Map<String, Object> pagoMovil = new LinkedHashMap<>();
        pagoMovil.put("banco", licencia.getPagoMovilBanco() != null ? licencia.getPagoMovilBanco() : "");
        pagoMovil.put("telefono", licencia.getPagoMovilTelefono() != null ? licencia.getPagoMovilTelefono() : "");
        pagoMovil.put("documento", licencia.getPagoMovilDocumento() != null ? licencia.getPagoMovilDocumento() : "");
        pagoMovil.put("titular", licencia.getPagoMovilTitular() != null ? licencia.getPagoMovilTitular() : "");
        pagoMovil.put("activo", licencia.isPagoMovilActivo());
        return ResponseEntity.ok(pagoMovil);
    }

    @PostMapping("/{tenantId:[0-9]+}/pago-movil")
    public ResponseEntity<?> guardarConfigPagoMovil(@PathVariable Long tenantId, @RequestBody ConfigPagoMovilRequest req) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        if (licencia == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Tienda no encontrada"));
        }
        if (req.banco != null) licencia.setPagoMovilBanco(req.banco.trim());
        if (req.telefono != null) licencia.setPagoMovilTelefono(req.telefono.trim());
        if (req.documento != null) licencia.setPagoMovilDocumento(req.documento.trim());
        if (req.titular != null) licencia.setPagoMovilTitular(req.titular.trim());
        if (req.activo != null) licencia.setPagoMovilActivo(req.activo);
        licenciaTenantRepository.save(licencia);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("banco", licencia.getPagoMovilBanco());
        resp.put("telefono", licencia.getPagoMovilTelefono());
        resp.put("documento", licencia.getPagoMovilDocumento());
        resp.put("titular", licencia.getPagoMovilTitular());
        resp.put("activo", licencia.isPagoMovilActivo());
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/{tenantId:[0-9]+}/pedidos")
    public ResponseEntity<?> registrarPedidoWeb(@PathVariable Long tenantId, @RequestBody CrearPedidoWebRequest req) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        if (licencia == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Tienda no encontrada"));
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
        pedido.setTotalUsd(req.totalUsd != null ? req.totalUsd : BigDecimal.ZERO);
        pedido.setTotalBs(req.totalBs != null ? req.totalBs : BigDecimal.ZERO);
        pedido.setTasaCambio(req.tasaCambio != null ? req.tasaCambio : BigDecimal.ONE);
        pedido.setNotas(req.notas != null ? req.notas : "");

        StringBuilder itemsTxt = new StringBuilder();
        StringBuilder msgWhatsapp = new StringBuilder();
        msgWhatsapp.append("*NUEVO PEDIDO WEB - ").append(licencia.getNombreEmpresa().toUpperCase()).append("*\n");
        msgWhatsapp.append("Pedido: #").append(numPedido).append("\n\n");
        msgWhatsapp.append("*DETALLE DEL PEDIDO:*\n");

        if (req.items != null) {
            for (LineaPedidoDto it : req.items) {
                itemsTxt.append(it.cantidad).append("x ").append(it.nombre)
                        .append(" ($").append(it.precioUnitarioUsd).append("); ");
                msgWhatsapp.append("- ").append(it.cantidad).append("x ").append(it.nombre)
                        .append(" ($").append(it.subtotalUsd).append(" USD)\n");
            }
        }
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

    @GetMapping("/{tenantId:[0-9]+}/pedidos")
    public ResponseEntity<List<PedidoWebComercio>> listarPedidos(@PathVariable Long tenantId) {
        return ResponseEntity.ok(pedidoWebRepository.findByTenantIdOrderByFechaCreacionDesc(tenantId));
    }

    @PostMapping("/{tenantId:[0-9]+}/pedidos/{pedidoId:[0-9]+}/estado")
    public ResponseEntity<?> actualizarEstadoPedido(
            @PathVariable Long tenantId,
            @PathVariable Long pedidoId,
            @RequestParam String estado) {
        PedidoWebComercio p = pedidoWebRepository.findById(pedidoId).orElse(null);
        if (p == null || !p.getTenantId().equals(tenantId)) {
            return ResponseEntity.status(404).body(Map.of("error", "Pedido no encontrado"));
        }
        p.setEstado(estado);
        return ResponseEntity.ok(pedidoWebRepository.save(p));
    }
}
