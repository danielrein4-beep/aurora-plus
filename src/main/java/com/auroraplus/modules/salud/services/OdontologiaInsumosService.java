package com.auroraplus.modules.salud.services;

import com.auroraplus.core.inventario.entities.Kardex;
import com.auroraplus.core.inventario.services.InventarioService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Descuenta del inventario central los insumos del kit asociado a un
 * procedimiento odontologico realizado. Cada insumo del kit puede apuntar a un
 * articulo del inventario (articuloId); los que no apuntan a ninguno, o cuyo
 * stock no alcanza, se informan como pendientes en vez de fallar: el
 * procedimiento ya ocurrio en el sillon y debe quedar registrado igual.
 */
@Service
public class OdontologiaInsumosService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private InventarioService inventarioService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public static class InsumoKit {
        public String nombre;
        public BigDecimal cantidad;
        public String unidad;
        public Long articuloId;
    }

    public List<InsumoKit> leerInsumos(Object insumosJson) {
        if (insumosJson == null) return new ArrayList<>();
        try {
            return objectMapper.readValue(insumosJson.toString(), new TypeReference<List<InsumoKit>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    static String normalizar(String texto) {
        if (texto == null) return "";
        String sinTildes = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return sinTildes.toLowerCase().trim();
    }

    /** Primer kit activo cuyo alguna palabra clave aparezca en el nombre del procedimiento. */
    public Map<String, Object> buscarKit(Long tenantId, String procedimiento) {
        String proc = normalizar(procedimiento);
        List<Map<String, Object>> kits = jdbcTemplate.queryForList(
            "SELECT id, procedimiento_clave, nombre_kit, insumos_json::text AS insumos_json, palabras_clave " +
            "FROM salud_odontologia_kits_procedimientos WHERE tenant_id = ? AND activo = true ORDER BY id",
            tenantId);
        for (Map<String, Object> kit : kits) {
            String claves = (String) kit.get("palabras_clave");
            if (claves != null) {
                for (String clave : claves.split(",")) {
                    String c = normalizar(clave);
                    if (!c.isEmpty() && proc.contains(c)) return kit;
                }
            }
            String claveProc = normalizar((String) kit.get("procedimiento_clave")).replace("_", " ");
            if (!claveProc.isEmpty() && proc.contains(claveProc)) return kit;
        }
        return null;
    }

    public static class ResultadoDescuento {
        public String nombreKit;
        public List<String> descontados = new ArrayList<>();
        public List<String> pendientes = new ArrayList<>();

        public boolean completo() {
            return nombreKit != null && pendientes.isEmpty() && !descontados.isEmpty();
        }

        public String resumen() {
            if (nombreKit == null) return "Sin kit de insumos asociado.";
            StringBuilder sb = new StringBuilder("Kit: ").append(nombreKit).append(".");
            if (!descontados.isEmpty()) sb.append(" Descontado: ").append(String.join("; ", descontados)).append(".");
            if (!pendientes.isEmpty()) sb.append(" Sin descontar: ").append(String.join("; ", pendientes)).append(".");
            return sb.toString();
        }

        public Map<String, Object> comoMapa() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("kit", nombreKit);
            m.put("descontados", descontados);
            m.put("pendientes", pendientes);
            return m;
        }
    }

    /**
     * Registra una SALIDA de kardex por cada insumo vinculado con stock suficiente.
     * El stock se revisa antes de llamar a InventarioService: si esa llamada lanzara
     * por stock insuficiente, marcaria toda la transaccion para rollback y se
     * perderia tambien el registro del procedimiento.
     */
    public ResultadoDescuento descontarKit(Long tenantId, String procedimiento, Long itemId) {
        ResultadoDescuento r = new ResultadoDescuento();
        Map<String, Object> kit = buscarKit(tenantId, procedimiento);
        if (kit == null) return r;
        r.nombreKit = (String) kit.get("nombre_kit");

        for (InsumoKit insumo : leerInsumos(kit.get("insumos_json"))) {
            String etiqueta = insumo.nombre + " x" + (insumo.cantidad != null ? insumo.cantidad.stripTrailingZeros().toPlainString() : "?")
                + (insumo.unidad != null ? " " + insumo.unidad : "");
            if (insumo.cantidad == null || insumo.cantidad.compareTo(BigDecimal.ZERO) <= 0) {
                r.pendientes.add(etiqueta + " (cantidad invalida)");
                continue;
            }
            if (insumo.articuloId == null) {
                r.pendientes.add(etiqueta + " (sin articulo de inventario vinculado)");
                continue;
            }
            List<Map<String, Object>> articulo = jdbcTemplate.queryForList(
                "SELECT stock_actual, costo_unitario FROM articulos WHERE tenant_id = ? AND id = ?",
                tenantId, insumo.articuloId);
            if (articulo.isEmpty()) {
                r.pendientes.add(etiqueta + " (articulo no encontrado)");
                continue;
            }
            BigDecimal stock = (BigDecimal) articulo.get(0).get("stock_actual");
            if (stock == null || stock.compareTo(insumo.cantidad) < 0) {
                r.pendientes.add(etiqueta + " (stock insuficiente: " + (stock != null ? stock.stripTrailingZeros().toPlainString() : "0") + ")");
                continue;
            }
            BigDecimal costo = (BigDecimal) articulo.get(0).get("costo_unitario");
            inventarioService.registrarMovimientoKardex(insumo.articuloId, tenantId, Kardex.TipoOperacion.SALIDA,
                insumo.cantidad, costo != null ? costo : BigDecimal.ZERO,
                "Odontologia: " + procedimiento + " (item de plan #" + itemId + ")");
            r.descontados.add(etiqueta);
        }
        return r;
    }
}
