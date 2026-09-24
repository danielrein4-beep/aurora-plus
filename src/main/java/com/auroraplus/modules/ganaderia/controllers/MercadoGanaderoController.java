package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.ganaderia.services.AvisosMercadoService;
import com.auroraplus.modules.ganaderia.services.FiltroContactoMercado;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.math.RoundingMode;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Mercado ganadero: vitrina donde las fincas de Aurora publican sus animales,
 * se escriben por chat interno y cierran tratos entre sí. No es un portal
 * público: vive bajo /api/ganaderia, así que LicenciaInterceptor solo deja
 * entrar a negocios con el módulo de Ganadería activo.
 *
 * Es la única parte de ganadería que cruza tenants a propósito, por eso usa
 * SQL explícito en vez de repositorios (el filtro de Hibernate las escondería)
 * y cada endpoint decide a mano qué puede ver o tocar la finca que llama. La
 * finca que llama sale siempre de la sesión (TenantContext), nunca de un
 * parámetro.
 *
 * Protección de la comisión (1% al vendedor y 1% al comprador al cerrar):
 * - Ninguna de las dos partes ve el nombre de la otra hasta cerrar el trato;
 *   se muestran como "Finca en Barinas #K7Q" con su sello y reputación.
 * - Los datos de contacto que se cuelan en el chat, la oferta o la
 *   publicación se tapan (FiltroContactoMercado) y quedan como alerta para el
 *   super-admin.
 * - Al entrar, la finca acepta que la comisión aplica aunque el trato que
 *   nació aquí se cierre por fuera.
 *
 * Acceso por niveles (VerificacionMercadoService): mirar es libre; ofertar y
 * chatear piden ubicación y cédula verificada; publicar pide además el hierro.
 */
@RestController
@RequestMapping("/api/ganaderia/mercado")
public class MercadoGanaderoController {

    private static final BigDecimal COMISION_PORCENTAJE = new BigDecimal("1.00");
    private static final int VERSION_CONDICIONES = 1;
    private static final int MAX_FOTOS = 6;
    private static final int MAX_LARGO_FOTO = 1_500_000;
    private static final int MAX_LARGO_MINIATURA = 250_000;
    private static final String[] ROLES_NEGOCIO = {"DUENO_ADMIN", "ADMINISTRADOR_FINCA"};
    private static final Set<String> CATEGORIAS = Set.of("PADROTE", "VACA_PARIDA", "VACA_ORDENO", "NOVILLA", "MAUTE", "CEBA");

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private MotorFinancieroService motorFinanciero;

    @Autowired
    private AvisosMercadoService avisos;

    @Autowired
    private com.auroraplus.modules.ganaderia.services.VerificacionMercadoService verificacion;

    /** Clave para los alias y referencias opacas: sin ella no se puede volver del alias a la finca. */
    @Value("${jwt.secret}")
    private String secreto;

    // ─────────────────────────── vitrina ───────────────────────────

    @GetMapping("/publicaciones")
    public List<Map<String, Object>> vitrina(
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String raza,
            @RequestParam(required = false) String sexo,
            @RequestParam(required = false) String estadoRegion,
            @RequestParam(required = false) BigDecimal pesoMin,
            @RequestParam(required = false) BigDecimal pesoMax,
            @RequestParam(required = false) BigDecimal precioMax,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "recientes") String orden) {
        Long yo = tenantActual();
        StringBuilder sql = new StringBuilder(SELECT_TARJETA + " WHERE p.estado = 'ACTIVA' AND a.estado = 'ACTIVO' AND l.activa = TRUE" + SIN_SUSPENDIDOS + LOTE_ACTIVO);
        List<Object> params = new ArrayList<>(List.of(yo, yo));
        if (texto(categoria)) { sql.append(" AND p.categoria = ?"); params.add(categoria.trim().toUpperCase()); }
        if (texto(raza)) { sql.append(" AND a.raza ILIKE ?"); params.add("%" + raza.trim() + "%"); }
        if (texto(sexo)) { sql.append(" AND a.sexo = ?"); params.add(sexo.trim().toUpperCase()); }
        if (texto(estadoRegion)) { sql.append(" AND p.estado_region = ?"); params.add(estadoRegion.trim()); }
        if (pesoMin != null) { sql.append(" AND COALESCE(p.peso_publicado, a.peso_actual) >= ?"); params.add(pesoMin); }
        if (pesoMax != null) { sql.append(" AND COALESCE(p.peso_publicado, a.peso_actual) <= ?"); params.add(pesoMax); }
        if (precioMax != null) { sql.append(" AND p.precio_solicitado <= ?"); params.add(precioMax); }
        if (texto(q)) {
            sql.append(" AND (p.titulo ILIKE ? OR a.raza ILIKE ? OR p.descripcion ILIKE ? OR p.estado_region ILIKE ?)");
            String patron = "%" + q.trim() + "%";
            params.addAll(List.of(patron, patron, patron, patron));
        }
        sql.append(switch (orden) {
            case "precio_asc" -> " ORDER BY p.precio_solicitado ASC";
            case "precio_desc" -> " ORDER BY p.precio_solicitado DESC";
            case "peso_desc" -> " ORDER BY COALESCE(p.peso_publicado, a.peso_actual) DESC NULLS LAST";
            default -> " ORDER BY p.fecha_publicacion DESC, p.id DESC";
        });
        sql.append(" LIMIT 200");
        return tarjetas(jdbc.queryForList(sql.toString(), params.toArray()), yo);
    }

    /** Cuántos animales activos hay por categoría, raza y estado, para la portada y los filtros. */
    @GetMapping("/resumen")
    public Map<String, Object> resumenVitrina() {
        tenantActual(); // valida sesión y suspensión como el resto del mercado
        String base = "FROM publicaciones_venta p JOIN animales a ON a.id = p.animal_id JOIN licencias_tenant l ON l.tenant_id = p.tenant_id "
            + "WHERE p.estado = 'ACTIVA' AND a.estado = 'ACTIVO' AND l.activa = TRUE" + SIN_SUSPENDIDOS + LOTE_ACTIVO;
        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("total", jdbc.queryForObject("SELECT COUNT(*) " + base, Long.class));
        salida.put("categorias", jdbc.queryForList("SELECT p.categoria, COUNT(*) AS total " + base + " AND p.categoria IS NOT NULL GROUP BY p.categoria"));
        salida.put("razas", jdbc.queryForList("SELECT a.raza, COUNT(*) AS total " + base + " AND a.raza IS NOT NULL AND a.raza <> '' GROUP BY a.raza ORDER BY total DESC LIMIT 20"));
        salida.put("estados", jdbc.queryForList("SELECT p.estado_region AS estado, COUNT(*) AS total " + base + " AND p.estado_region IS NOT NULL GROUP BY p.estado_region ORDER BY total DESC"));
        salida.put("tratosCerrados", jdbc.queryForObject("SELECT COUNT(*) FROM publicaciones_venta WHERE estado = 'VENDIDA'", Long.class));
        return salida;
    }

    /** Panel del vendedor: sus publicaciones con la mejor oferta y el precio de referencia del mercado. */
    @GetMapping("/mi-puesto")
    public Map<String, Object> miPuesto() {
        Long yo = tenantActual();
        List<Map<String, Object>> publicaciones = tarjetas(
            jdbc.queryForList(SELECT_TARJETA + " WHERE p.tenant_id = ? ORDER BY p.estado = 'ACTIVA' DESC, p.fecha_publicacion DESC, p.id DESC", yo, yo, yo), yo);
        for (Map<String, Object> p : publicaciones) {
            Long id = numero(p.get("id"));
            List<Map<String, Object>> mejor = jdbc.queryForList(
                "SELECT monto_ofertado FROM ofertas_compra WHERE publicacion_id = ? AND estado = 'PENDIENTE' AND comprador_tenant_id IS NOT NULL "
                    + "ORDER BY monto_ofertado DESC LIMIT 1", id);
            p.put("mejorOferta", mejor.isEmpty() ? null : mejor.get(0).get("monto_ofertado"));
            p.put("referencia", referenciaPrecio(id));
        }
        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("activas", publicaciones.stream().filter(p -> "ACTIVA".equals(p.get("estado"))).count());
        resumen.put("ofertasPendientes", publicaciones.stream().mapToLong(p -> numero(p.get("ofertasPendientes"))).sum());
        resumen.put("vendidas", publicaciones.stream().filter(p -> "VENDIDA".equals(p.get("estado"))).count());
        resumen.put("montoVendido", publicaciones.stream().filter(p -> p.get("precioFinal") != null)
            .map(p -> (BigDecimal) p.get("precioFinal")).reduce(BigDecimal.ZERO, BigDecimal::add));
        return Map.of("resumen", resumen, "publicaciones", publicaciones);
    }

    /** Ofertas que hizo mi finca, con el animal y su estado. */
    @GetMapping("/mis-ofertas")
    public List<Map<String, Object>> misOfertas() {
        Long yo = tenantActual();
        List<Map<String, Object>> ofertas = jdbc.queryForList(
            "SELECT DISTINCT ON (o.publicacion_id) o.id, o.publicacion_id, o.monto_ofertado AS monto, o.estado, o.fecha, o.traspasado "
                + "FROM ofertas_compra o WHERE o.comprador_tenant_id = ? ORDER BY o.publicacion_id, o.id DESC", yo);
        if (ofertas.isEmpty()) return List.of();
        Map<Long, Map<String, Object>> cards = tarjetas(jdbc.queryForList(
                SELECT_TARJETA + " WHERE p.id IN (" + marcadores(ofertas.size()) + ")",
                concatenar(List.of(yo, yo), ofertas.stream().map(o -> o.get("publicacion_id")).toList()).toArray()), yo)
            .stream().collect(Collectors.toMap(t -> numero(t.get("id")), t -> t));
        List<Map<String, Object>> salida = new ArrayList<>();
        for (Map<String, Object> o : ofertas) {
            Map<String, Object> publicacion = cards.get(numero(o.get("publicacion_id")));
            if (publicacion == null) continue;
            Map<String, Object> oferta = new LinkedHashMap<>();
            oferta.put("id", o.get("id"));
            oferta.put("monto", o.get("monto"));
            oferta.put("estado", o.get("estado"));
            oferta.put("fecha", o.get("fecha"));
            oferta.put("traspasado", o.get("traspasado"));
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("oferta", oferta);
            fila.put("publicacion", publicacion);
            salida.add(fila);
        }
        salida.sort((a, b) -> Long.compare(numero(((Map<?, ?>) b.get("oferta")).get("id")), numero(((Map<?, ?>) a.get("oferta")).get("id"))));
        return salida;
    }

    @GetMapping("/guardados")
    public List<Map<String, Object>> guardados() {
        Long yo = tenantActual();
        return tarjetas(jdbc.queryForList(SELECT_TARJETA + " JOIN mercado_ganado_guardados g ON g.publicacion_id = p.id AND g.tenant_id = ? "
            + "WHERE (p.estado = 'ACTIVA'" + SIN_SUSPENDIDOS + ") OR p.comprador_tenant_id = ? "
            + "OR EXISTS (SELECT 1 FROM mercado_ganado_mensajes m WHERE m.publicacion_id = p.id AND m.comprador_tenant_id = ?) "
            + "ORDER BY g.fecha DESC", yo, yo, yo, yo, yo), yo);
    }

    @PostMapping("/publicaciones/{id:[0-9]+}/guardar")
    public Map<String, Object> guardar(@PathVariable Long id) {
        Long yo = tenantActual();
        Integer activa = jdbc.queryForObject("SELECT COUNT(*) FROM publicaciones_venta p WHERE p.id = ? AND p.estado = 'ACTIVA'" + SIN_SUSPENDIDOS,
            Integer.class, id);
        if (activa == null || activa == 0) throw new RuntimeException("Esta publicación ya no está disponible");
        jdbc.update("INSERT INTO mercado_ganado_guardados (tenant_id, publicacion_id) VALUES (?, ?) ON CONFLICT DO NOTHING", yo, id);
        return Map.of("guardado", true);
    }

    @DeleteMapping("/publicaciones/{id:[0-9]+}/guardar")
    public Map<String, Object> dejarDeGuardar(@PathVariable Long id) {
        jdbc.update("DELETE FROM mercado_ganado_guardados WHERE tenant_id = ? AND publicacion_id = ?", tenantActual(), id);
        return Map.of("guardado", false);
    }

    @GetMapping("/publicaciones/{id:[0-9]+}")
    public Map<String, Object> detalle(@PathVariable Long id) {
        Long yo = tenantActual();
        Map<String, Object> fila = unaFila(SELECT_TARJETA + " WHERE p.id = ?", yo, yo, id);
        if (fila == null) throw new RuntimeException("Publicación no encontrada");
        Long vendedor = numero(fila.get("tenant_id"));
        boolean esMia = vendedor.equals(yo);
        boolean participo = Boolean.TRUE.equals(jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM ofertas_compra WHERE publicacion_id = ? AND comprador_tenant_id = ?) "
                + "OR EXISTS (SELECT 1 FROM mercado_ganado_mensajes WHERE publicacion_id = ? AND comprador_tenant_id = ?)",
            Boolean.class, id, yo, id, yo));
        if (!"ACTIVA".equals(fila.get("estado")) && !esMia && !participo) {
            throw new RuntimeException("Esta publicación ya no está disponible");
        }

        Map<String, Object> salida = tarjetas(List.of(fila), yo).get(0);
        salida.put("descripcion", fila.get("descripcion"));
        salida.put("municipio", fila.get("ubicacion"));
        salida.put("fotos", jdbc.queryForList(
            "SELECT id, imagen_base64 AS imagen FROM mercado_ganado_fotos WHERE publicacion_id = ? ORDER BY orden, id", id));
        List<Long> delLote = animalesDe(id, numero(fila.get("animal_id")));
        boolean veAretes = esMia || (fila.get("comprador_tenant_id") != null && numero(fila.get("comprador_tenant_id")).equals(yo));
        // La curva de peso tiene sentido para un animal; en un lote se muestra cada animal con su peso.
        salida.put("pesos", delLote.size() == 1 ? jdbc.queryForList(
            "SELECT fecha, peso_kg AS \"pesoKg\" FROM registros_peso WHERE animal_id = ? AND tenant_id = ? ORDER BY fecha", delLote.get(0), vendedor) : List.of());
        salida.put("vacunas", jdbc.queryForList(
            "SELECT v.nombre, v.enfermedad_prevenida AS \"enfermedadPrevenida\", MAX(av.fecha_aplicacion) AS \"fechaAplicacion\", COUNT(DISTINCT av.animal_id) AS animales "
                + "FROM aplicaciones_vacuna av JOIN vacunas v ON v.id = av.vacuna_id "
                + "WHERE av.tenant_id = ? AND av.animal_id IN (" + marcadores(delLote.size()) + ") "
                + "GROUP BY v.nombre, v.enfermedad_prevenida ORDER BY MAX(av.fecha_aplicacion) DESC LIMIT 20",
            concatenar(List.of(vendedor), new ArrayList<>(delLote)).toArray()));
        if (delLote.size() > 1) {
            List<Map<String, Object>> animalesLote = new ArrayList<>();
            for (Map<String, Object> a : jdbc.queryForList(
                    "SELECT arete, raza, sexo, peso_actual, fecha_nacimiento FROM animales WHERE tenant_id = ? AND id IN (" + marcadores(delLote.size()) + ") ORDER BY arete",
                    concatenar(List.of(vendedor), new ArrayList<>(delLote)).toArray())) {
                Map<String, Object> x = new LinkedHashMap<>();
                x.put("arete", veAretes ? a.get("arete") : null);
                x.put("raza", a.get("raza"));
                x.put("sexo", a.get("sexo"));
                x.put("peso", a.get("peso_actual"));
                x.put("edadMeses", a.get("fecha_nacimiento") == null ? null
                    : ChronoUnit.MONTHS.between(((java.sql.Date) a.get("fecha_nacimiento")).toLocalDate(), LocalDate.now()));
                animalesLote.add(x);
            }
            salida.put("animales", animalesLote);
        }
        salida.put("referencia", referenciaPrecio(id));

        Long compradorCerrado = fila.get("comprador_tenant_id") == null ? null : numero(fila.get("comprador_tenant_id"));
        Map<String, Object> cerrada = null;
        if (esMia) {
            List<Map<String, Object>> ofertas = jdbc.queryForList(
                "SELECT o.id, o.monto_ofertado AS monto, o.estado, o.fecha, o.mensaje, o.comprador_tenant_id AS \"compradorTenantId\" "
                    + "FROM ofertas_compra o WHERE o.publicacion_id = ? AND o.comprador_tenant_id IS NOT NULL ORDER BY o.monto_ofertado DESC, o.id", id);
            Map<Long, Map<String, Object>> perfiles = perfiles(ofertas.stream().map(o -> numero(o.get("compradorTenantId"))).collect(Collectors.toSet()));
            for (Map<String, Object> o : ofertas) {
                Long comprador = numero(o.remove("compradorTenantId"));
                boolean revelado = "ACEPTADA".equals(o.get("estado"));
                o.put("compradorRef", referencia(id, comprador));
                o.put("comprador", perfilPublico(perfiles.get(comprador), comprador, "COMPRADOR", revelado));
            }
            salida.put("ofertas", ofertas);
            if ("VENDIDA".equals(fila.get("estado")) && compradorCerrado != null) {
                Map<String, Object> comprador = contacto(compradorCerrado);
                salida.put("contraparte", comprador);
                cerrada = ofertaAceptada(id);
                // Datos para la nota de movilización (la emite quien vende: los animales salen de su finca).
                Map<String, Object> nota = new LinkedHashMap<>();
                nota.put("animalIds", delLote);
                nota.put("destino", comprador.get("nombre"));
                nota.put("origen", jdbc.queryForList("SELECT nombre FROM fincas_ganaderia WHERE tenant_id = ?", String.class, yo).stream().findFirst()
                    .orElseGet(() -> (String) contacto(yo).get("nombre")));
                // Si ya se emitió una nota de venta con estos animales, se ofrece descargarla en vez de duplicarla.
                nota.put("emitidas", jdbc.queryForList(
                    "SELECT DISTINCT g.id, g.numero_guia AS \"numeroGuia\", g.fecha FROM guias_traslado g JOIN detalles_guia_traslado d ON d.guia_id = g.id "
                        + "WHERE g.tenant_id = ? AND g.motivo = 'VENTA' AND d.animal_id IN (" + marcadores(delLote.size()) + ") ORDER BY g.id DESC",
                    concatenar(List.<Object>of(yo), new ArrayList<Object>(delLote)).toArray()));
                salida.put("notaMovilizacion", nota);
            }
        } else {
            salida.put("misOfertas", jdbc.queryForList(
                "SELECT id, monto_ofertado AS monto, estado, fecha, mensaje, traspasado FROM ofertas_compra "
                    + "WHERE publicacion_id = ? AND comprador_tenant_id = ? ORDER BY id DESC", id, yo));
            if ("VENDIDA".equals(fila.get("estado")) && yo.equals(compradorCerrado)) {
                salida.put("contraparte", contacto(vendedor));
                cerrada = ofertaAceptada(id);
            }
        }
        salida.put("ofertaCerrada", cerrada);
        if (cerrada != null) {
            salida.put("yaCalifique", Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM mercado_ganado_calificaciones WHERE oferta_id = ? AND calificador_tenant_id = ?)",
                Boolean.class, cerrada.get("id"), yo)));
        }
        return salida;
    }

    // ─────────────────────────── condiciones ───────────────────────────

    @GetMapping("/condiciones")
    public Map<String, Object> condiciones() {
        Integer version = jdbc.queryForList("SELECT version FROM mercado_ganado_condiciones WHERE tenant_id = ?", Integer.class, tenantActual())
            .stream().findFirst().orElse(null);
        return Map.of("aceptadas", version != null && version >= VERSION_CONDICIONES, "version", VERSION_CONDICIONES);
    }

    @PostMapping("/condiciones/aceptar")
    public Map<String, Object> aceptarCondiciones() {
        AuthContext.exigirRol(ROLES_NEGOCIO);
        jdbc.update("INSERT INTO mercado_ganado_condiciones (tenant_id, usuario, version, fecha) VALUES (?, ?, ?, ?) "
                + "ON CONFLICT (tenant_id) DO UPDATE SET usuario = EXCLUDED.usuario, version = EXCLUDED.version, fecha = EXCLUDED.fecha",
            tenantActual(), AuthContext.getUsername(), VERSION_CONDICIONES, Timestamp.valueOf(LocalDateTime.now()));
        return condiciones();
    }

    // ─────────────────────────── verificación de la finca ───────────────────────────

    /** Qué tiene verificado la finca y qué le falta. Nunca devuelve el contenido de los documentos. */
    @GetMapping("/verificacion")
    public Map<String, Object> miVerificacion() {
        return verificacion.estado(tenantActual());
    }

    public static class VerificacionRequest {
        public String titularNombre;
        public String titularCedula;
        public String numeroHierro;
        /** PROPIEDAD, ARRENDAMIENTO o COMODATO (opcional). */
        public String tipoTierra;
        /** CEDULA, HIERRO, TIERRA → archivo nuevo (los que no vienen no se tocan). */
        public Map<String, com.auroraplus.modules.ganaderia.services.VerificacionMercadoService.Archivo> archivos;
    }

    @PostMapping("/verificacion")
    public Map<String, Object> enviarVerificacion(@RequestBody VerificacionRequest req) {
        AuthContext.exigirRol(ROLES_NEGOCIO);
        return verificacion.guardar(tenantActual(), AuthContext.getUsername(), req.titularNombre, req.titularCedula,
            req.numeroHierro, req.tipoTierra, req.archivos);
    }

    private void exigirCondiciones() {
        if (!Boolean.TRUE.equals(condiciones().get("aceptadas"))) {
            throw new RuntimeException("Antes de negociar en el mercado debes aceptar sus condiciones");
        }
    }

    // ─────────────────────────── publicar ───────────────────────────

    public static class PublicacionRequest {
        public Long animalId;
        /** Varios animales = venta por lote. */
        public List<Long> animalIds;
        public String categoria;
        public String titulo;
        public BigDecimal precio;
        public String tipoPrecio; // POR_CABEZA, POR_KG
        public String estadoRegion;
        public String municipio;
        public String descripcion;
        public Boolean negociable;
        public List<String> fotos;
        public String miniatura;
    }

    @PostMapping("/publicaciones")
    @Transactional
    public Map<String, Object> publicar(@RequestBody PublicacionRequest req) {
        AuthContext.exigirRol(ROLES_NEGOCIO);
        exigirCondiciones();
        Long yo = tenantActual();
        verificacion.exigir(yo, com.auroraplus.modules.ganaderia.services.VerificacionMercadoService.Nivel.VENDER);
        List<Long> ids = req.animalIds != null && !req.animalIds.isEmpty() ? req.animalIds.stream().distinct().toList()
            : req.animalId != null ? List.of(req.animalId) : List.of();
        if (ids.isEmpty()) throw new RuntimeException("Elige el animal que vas a publicar");
        if (ids.size() > 200) throw new RuntimeException("Un lote puede tener hasta 200 animales");
        String categoria = validarCategoria(req.categoria);
        validarPrecio(req.precio);
        if (!texto(req.estadoRegion)) throw new RuntimeException("Indica en qué estado está el animal");
        List<Map<String, Object>> animales = jdbc.queryForList(
            "SELECT id, estado, arete, raza, sexo, peso_actual FROM animales WHERE tenant_id = ? AND id IN (" + marcadores(ids.size()) + ")",
            concatenar(List.of(yo), new ArrayList<>(ids)).toArray());
        if (animales.size() != ids.size()) throw new RuntimeException(ids.size() == 1 ? "Ese animal no está en tu hato" : "Algún animal del lote no está en tu hato");
        for (Map<String, Object> a : animales) {
            if (!"ACTIVO".equals(a.get("estado"))) throw new RuntimeException("Solo se pueden publicar animales activos (arete " + a.get("arete") + ")");
        }
        Integer yaPublicado = jdbc.queryForObject(
            "SELECT COUNT(*) FROM publicaciones_venta p WHERE p.estado = 'ACTIVA' AND (p.animal_id IN (" + marcadores(ids.size()) + ") "
                + "OR EXISTS (SELECT 1 FROM mercado_ganado_lote_animales la WHERE la.publicacion_id = p.id AND la.animal_id IN (" + marcadores(ids.size()) + ")))",
            Integer.class, concatenar(new ArrayList<>(ids), new ArrayList<>(ids)).toArray());
        if (yaPublicado != null && yaPublicado > 0) {
            throw new RuntimeException(ids.size() == 1 ? "Ese animal ya está publicado en el mercado" : "Algún animal del lote ya está publicado en el mercado");
        }
        List<String> fotos = validarFotos(req.fotos, req.miniatura);
        Map<String, Object> animal = animales.stream().filter(a -> numero(a.get("id")).equals(ids.get(0))).findFirst().orElseThrow();
        List<BigDecimal> pesos = animales.stream().map(a -> (BigDecimal) a.get("peso_actual")).filter(Objects::nonNull).toList();
        BigDecimal pesoTotal = pesos.isEmpty() ? null : pesos.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal pesoPromedio = pesos.isEmpty() ? null : pesoTotal.divide(BigDecimal.valueOf(pesos.size()), 2, RoundingMode.HALF_UP);
        int cantidad = ids.size();

        String tituloBase = recortar(texto(req.titulo) ? req.titulo
            : cantidad > 1 ? "Lote de " + cantidad + (animal.get("raza") != null ? " " + animal.get("raza") : " animales")
            : (animal.get("raza") != null ? animal.get("raza") + " " : "") + ("MACHO".equals(animal.get("sexo")) ? "macho" : "hembra"), 120);
        String descripcionBase = recortar(req.descripcion, 2000);
        String municipioBase = recortar(req.municipio, 80);
        String titulo = limpiarPublicacion(tituloBase, null, yo);
        String descripcion = limpiarPublicacion(descripcionBase, null, yo);
        String municipio = limpiarPublicacion(municipioBase, null, yo);

        KeyHolder llave = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO publicaciones_venta (tenant_id, animal_id, precio_solicitado, descripcion, estado, fecha_publicacion, "
                    + "titulo, tipo_precio, ubicacion, negociable, peso_publicado, miniatura_base64, categoria, estado_region, cantidad, peso_total) "
                    + "VALUES (?, ?, ?, ?, 'ACTIVA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, yo);
            ps.setLong(2, ids.get(0));
            ps.setBigDecimal(3, req.precio);
            ps.setString(4, descripcion);
            ps.setObject(5, LocalDate.now());
            ps.setString(6, titulo);
            ps.setString(7, "POR_KG".equals(req.tipoPrecio) ? "POR_KG" : "POR_CABEZA");
            ps.setString(8, municipio);
            ps.setBoolean(9, req.negociable == null || req.negociable);
            ps.setBigDecimal(10, pesoPromedio);
            ps.setString(11, req.miniatura);
            ps.setString(12, categoria);
            ps.setString(13, recortar(req.estadoRegion, 40));
            ps.setInt(14, cantidad);
            ps.setBigDecimal(15, pesoTotal);
            return ps;
        }, llave);
        Long id = ((Number) llave.getKeys().get("id")).longValue();
        jdbc.update("UPDATE mercado_ganado_alertas SET publicacion_id = ? WHERE publicacion_id IS NULL AND tenant_id = ? AND tipo = 'CONTACTO_EN_PUBLICACION'", id, yo);
        for (Long animalId : ids) {
            jdbc.update("INSERT INTO mercado_ganado_lote_animales (publicacion_id, animal_id, tenant_id) VALUES (?, ?, ?)", id, animalId, yo);
        }
        guardarFotos(id, yo, fotos);
        Map<String, Object> salida = detalle(id);
        salida.put("datosOcultos", !Objects.equals(titulo, tituloBase) || !Objects.equals(descripcion, descripcionBase)
            || !Objects.equals(municipio, municipioBase));
        return salida;
    }

    @PutMapping("/publicaciones/{id:[0-9]+}")
    @Transactional
    public Map<String, Object> editar(@PathVariable Long id, @RequestBody PublicacionRequest req) {
        AuthContext.exigirRol(ROLES_NEGOCIO);
        Long yo = tenantActual();
        publicacionPropiaActiva(id);
        validarPrecio(req.precio);
        String categoria = validarCategoria(req.categoria);
        String descripcionBase = recortar(req.descripcion, 2000);
        String municipioBase = recortar(req.municipio, 80);
        String titulo = texto(req.titulo) ? limpiarPublicacion(recortar(req.titulo, 120), id, yo) : null;
        String descripcion = limpiarPublicacion(descripcionBase, id, yo);
        String municipio = limpiarPublicacion(municipioBase, id, yo);
        jdbc.update("UPDATE publicaciones_venta SET precio_solicitado = ?, titulo = COALESCE(?, titulo), tipo_precio = ?, ubicacion = ?, "
                + "descripcion = ?, negociable = ?, categoria = ?, estado_region = COALESCE(?, estado_region) WHERE id = ?",
            req.precio, titulo, "POR_KG".equals(req.tipoPrecio) ? "POR_KG" : "POR_CABEZA", municipio,
            descripcion, req.negociable == null || req.negociable, categoria, texto(req.estadoRegion) ? recortar(req.estadoRegion, 40) : null, id);
        if (req.fotos != null) {
            List<String> fotos = validarFotos(req.fotos, req.miniatura);
            jdbc.update("DELETE FROM mercado_ganado_fotos WHERE publicacion_id = ?", id);
            jdbc.update("UPDATE publicaciones_venta SET miniatura_base64 = ? WHERE id = ?", req.miniatura, id);
            guardarFotos(id, yo, fotos);
        }
        Map<String, Object> salida = detalle(id);
        salida.put("datosOcultos", !Objects.equals(descripcion, descripcionBase) || !Objects.equals(municipio, municipioBase)
            || (titulo != null && !Objects.equals(titulo, recortar(req.titulo, 120))));
        return salida;
    }

    @PostMapping("/publicaciones/{id:[0-9]+}/retirar")
    @Transactional
    public Map<String, Object> retirar(@PathVariable Long id) {
        AuthContext.exigirRol(ROLES_NEGOCIO);
        publicacionPropiaActiva(id);
        jdbc.update("UPDATE publicaciones_venta SET estado = 'RETIRADA', fecha_cierre = ? WHERE id = ?", Timestamp.valueOf(LocalDateTime.now()), id);
        jdbc.update("UPDATE ofertas_compra SET estado = 'RECHAZADA' WHERE publicacion_id = ? AND estado = 'PENDIENTE'", id);
        return detalle(id);
    }

    // ─────────────────────────── ofertas ───────────────────────────

    public static class OfertaRequest {
        public BigDecimal monto;
        public String mensaje;
    }

    @PostMapping("/publicaciones/{id:[0-9]+}/ofertas")
    @Transactional
    public Map<String, Object> ofertar(@PathVariable Long id, @RequestBody OfertaRequest req) {
        AuthContext.exigirRol(ROLES_NEGOCIO);
        exigirCondiciones();
        Long yo = tenantActual();
        verificacion.exigir(yo, com.auroraplus.modules.ganaderia.services.VerificacionMercadoService.Nivel.COMPRAR);
        Map<String, Object> pub = unaFila("SELECT id, tenant_id, estado FROM publicaciones_venta WHERE id = ?", id);
        if (pub == null || !"ACTIVA".equals(pub.get("estado"))) throw new RuntimeException("Esta publicación ya no está disponible");
        Long vendedor = numero(pub.get("tenant_id"));
        if (vendedor.equals(yo)) throw new RuntimeException("No puedes ofertar por tu propio animal");
        validarPrecio(req.monto);
        jdbc.update("UPDATE ofertas_compra SET estado = 'RETIRADA' WHERE publicacion_id = ? AND comprador_tenant_id = ? AND estado = 'PENDIENTE'", id, yo);

        String mensaje = null;
        boolean oculto = false;
        if (texto(req.mensaje)) {
            FiltroContactoMercado.Resultado f = FiltroContactoMercado.filtrar(recortar(req.mensaje, 500));
            mensaje = f.texto();
            if (f.huboContacto()) { oculto = true; registrarAlerta(id, yo, vendedor, "CONTACTO_EN_CHAT", req.mensaje); }
        }
        jdbc.update("INSERT INTO ofertas_compra (tenant_id, publicacion_id, nombre_comprador, monto_ofertado, estado, fecha, "
                + "comprador_tenant_id, comprador_usuario, mensaje) VALUES (?, ?, ?, ?, 'PENDIENTE', ?, ?, ?, ?)",
            vendedor, id, nombreFinca(yo), req.monto, Timestamp.valueOf(LocalDateTime.now()), yo, AuthContext.getUsername(), mensaje);
        insertarMensaje(id, yo, yo, nombreEmisor(yo),
            recortar("Oferta de " + dinero(req.monto) + (mensaje != null ? ": " + mensaje : ""), 2000), true);
        avisos.avisar(vendedor, "Nueva oferta: " + dinero(req.monto) + " por " + tituloDe(id),
            "Una finca te ofreció " + dinero(req.monto) + " por \"" + tituloDe(id) + "\". Entra al mercado para aceptarla, rechazarla o conversar.");
        Map<String, Object> salida = detalle(id);
        salida.put("datosOcultos", oculto);
        return salida;
    }

    @PostMapping("/ofertas/{ofertaId:[0-9]+}/rechazar")
    @Transactional
    public Map<String, Object> rechazar(@PathVariable Long ofertaId) {
        AuthContext.exigirRol(ROLES_NEGOCIO);
        Map<String, Object> oferta = ofertaDeMiPublicacion(ofertaId);
        jdbc.update("UPDATE ofertas_compra SET estado = 'RECHAZADA' WHERE id = ?", ofertaId);
        Long pub = numero(oferta.get("publicacion_id"));
        insertarMensaje(pub, numero(oferta.get("comprador_tenant_id")), tenantActual(), nombreEmisor(tenantActual()),
            "Oferta de " + dinero((BigDecimal) oferta.get("monto_ofertado")) + " rechazada", true);
        avisos.avisar(numero(oferta.get("comprador_tenant_id")), "Tu oferta por " + tituloDe(pub) + " no fue aceptada",
            "El vendedor no aceptó tu oferta de " + dinero((BigDecimal) oferta.get("monto_ofertado")) + " por \"" + tituloDe(pub) + "\". Puedes hacerle otra oferta desde el mercado.");
        return detalle(pub);
    }

    /** Cierra el trato: vende el animal, rechaza las demás ofertas y deja 1% de comisión a cada parte. */
    @PostMapping("/ofertas/{ofertaId:[0-9]+}/aceptar")
    @Transactional
    public Map<String, Object> aceptar(@PathVariable Long ofertaId) {
        AuthContext.exigirRol(ROLES_NEGOCIO);
        Long yo = tenantActual();
        Map<String, Object> oferta = ofertaDeMiPublicacion(ofertaId);
        Long pubId = numero(oferta.get("publicacion_id"));
        Long comprador = numero(oferta.get("comprador_tenant_id"));
        BigDecimal monto = (BigDecimal) oferta.get("monto_ofertado");
        LocalDateTime ahora = LocalDateTime.now();

        int cerradas = jdbc.update("UPDATE publicaciones_venta SET estado = 'VENDIDA', fecha_cierre = ?, comprador_tenant_id = ?, precio_final = ? "
            + "WHERE id = ? AND estado = 'ACTIVA'", Timestamp.valueOf(ahora), comprador, monto, pubId);
        if (cerradas == 0) throw new RuntimeException("Esta publicación ya fue cerrada");
        jdbc.update("UPDATE ofertas_compra SET estado = 'ACEPTADA' WHERE id = ?", ofertaId);
        jdbc.update("UPDATE ofertas_compra SET estado = 'RECHAZADA' WHERE publicacion_id = ? AND id <> ? AND estado = 'PENDIENTE'", pubId, ofertaId);
        jdbc.update("UPDATE animales SET estado = 'VENDIDO' WHERE tenant_id = ? AND (id = (SELECT animal_id FROM publicaciones_venta WHERE id = ?) "
            + "OR id IN (SELECT animal_id FROM mercado_ganado_lote_animales WHERE publicacion_id = ?))", yo, pubId, pubId);

        String titulo = String.valueOf(jdbc.queryForObject("SELECT titulo FROM publicaciones_venta WHERE id = ?", String.class, pubId));
        registrarComision(yo, "mercado-ganado-vendedor", ofertaId, monto, "Venta en el mercado: " + titulo + " (1% vendedor)");
        registrarComision(comprador, "mercado-ganado-comprador", ofertaId, monto, "Compra en el mercado: " + titulo + " (1% comprador)");

        insertarMensaje(pubId, comprador, yo, nombreEmisor(yo),
            "Trato cerrado por " + dinero(monto) + ". Ya pueden ver los datos de contacto del otro para coordinar la entrega.", true);
        // El pago entre fincas se hace aparte: queda como cuenta por cobrar y se abona desde Finanzas cuando llegue.
        motorFinanciero.registrarMovimientoEnMoneda(yo, MovimientoCaja.TipoMovimiento.CXC, monto, "USD",
            recortar("Venta en Mercado Ganadero: " + titulo + " a " + nombreFinca(comprador), 250), "ganaderia", "MERCADO_OFERTA", ofertaId);
        avisos.avisar(comprador, "Aceptaron tu oferta por " + titulo,
            "El vendedor aceptó tu oferta de " + dinero(monto) + " por \"" + titulo + "\". Ya puedes ver sus datos para coordinar la entrega.");
        return detalle(pubId);
    }

    /**
     * El comprador recibe el animal en su hato con su historial de pesos. El
     * pago entre fincas se acuerda por el chat; aquí solo se traspasa el registro.
     */
    @PostMapping("/ofertas/{ofertaId:[0-9]+}/recibir")
    @Transactional
    public Map<String, Object> recibir(@PathVariable Long ofertaId) {
        AuthContext.exigirRol(ROLES_NEGOCIO);
        Long yo = tenantActual();
        Map<String, Object> oferta = unaFila(
            "SELECT o.id, o.publicacion_id, o.monto_ofertado, o.estado, o.traspasado, p.animal_id, p.tenant_id AS vendedor "
                + "FROM ofertas_compra o JOIN publicaciones_venta p ON p.id = o.publicacion_id WHERE o.id = ? AND o.comprador_tenant_id = ?",
            ofertaId, yo);
        if (oferta == null) throw new RuntimeException("Oferta no encontrada");
        if (!"ACEPTADA".equals(oferta.get("estado"))) throw new RuntimeException("Solo se recibe un animal cuando el vendedor aceptó la oferta");
        if (Boolean.TRUE.equals(oferta.get("traspasado"))) throw new RuntimeException("Este animal ya está en tu hato");

        Long pubId = numero(oferta.get("publicacion_id"));
        Long vendedor = numero(oferta.get("vendedor"));
        List<Long> delLote = animalesDe(pubId, numero(oferta.get("animal_id")));
        BigDecimal costoPorAnimal = ((BigDecimal) oferta.get("monto_ofertado")).divide(BigDecimal.valueOf(delLote.size()), 2, RoundingMode.HALF_UP);
        List<String> aretes = new ArrayList<>();
        Long primero = null;
        for (Long animalOrigen : delLote) {
            Map<String, Object> copia = copiarAnimal(animalOrigen, vendedor, yo, costoPorAnimal, pubId);
            if (primero == null) primero = numero(copia.get("id"));
            aretes.add(String.valueOf(copia.get("arete")));
        }
        jdbc.update("UPDATE ofertas_compra SET traspasado = TRUE WHERE id = ?", ofertaId);
        String titulo = tituloDe(pubId);
        motorFinanciero.registrarMovimientoEnMoneda(yo, MovimientoCaja.TipoMovimiento.CXP, (BigDecimal) oferta.get("monto_ofertado"), "USD",
            recortar("Compra en Mercado Ganadero: " + titulo + " a " + nombreFinca(vendedor), 250), "ganaderia", "MERCADO_OFERTA", ofertaId);
        insertarMensaje(pubId, yo, yo, nombreEmisor(yo), delLote.size() == 1
            ? "Animal recibido en el hato con el arete " + aretes.get(0) + "."
            : delLote.size() + " animales recibidos en el hato.", true);
        Map<String, Object> salida = detalle(pubId);
        salida.put("animalRecibidoId", primero);
        return salida;
    }

    /** Copia un animal del vendedor al hato del comprador, con su historial de pesos y vacunas. */
    private Map<String, Object> copiarAnimal(Long animalOrigen, Long vendedor, Long comprador, BigDecimal costo, Long pubId) {
        Map<String, Object> animal = unaFila(
            "SELECT arete, tipo_identificador, nombre, especie, raza, sexo, tipo_animal, fecha_nacimiento, peso_actual FROM animales WHERE id = ? AND tenant_id = ?",
            animalOrigen, vendedor);
        if (animal == null) throw new RuntimeException("El vendedor ya no tiene el registro de uno de los animales");

        String arete = String.valueOf(animal.get("arete"));
        Integer repetido = jdbc.queryForObject("SELECT COUNT(*) FROM animales WHERE tenant_id = ? AND arete = ?", Integer.class, comprador, arete);
        if (repetido != null && repetido > 0) arete = arete + "-M" + pubId;
        final String areteFinal = arete;
        final Long yo = comprador;

        KeyHolder llave = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO animales (tenant_id, arete, tipo_identificador, nombre, especie, raza, sexo, tipo_animal, fecha_nacimiento, "
                    + "peso_actual, estado, costo_adquisicion, estado_reproductivo, estado_productivo) "
                    + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', ?, 'VACIA', 'SECA')", Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, yo);
            ps.setString(2, areteFinal);
            ps.setString(3, (String) animal.get("tipo_identificador"));
            ps.setString(4, (String) animal.get("nombre"));
            ps.setString(5, (String) animal.get("especie"));
            ps.setString(6, (String) animal.get("raza"));
            ps.setString(7, (String) animal.get("sexo"));
            ps.setString(8, (String) animal.get("tipo_animal"));
            ps.setObject(9, animal.get("fecha_nacimiento"));
            ps.setBigDecimal(10, (BigDecimal) animal.get("peso_actual"));
            ps.setBigDecimal(11, costo);
            return ps;
        }, llave);
        Long nuevoId = ((Number) llave.getKeys().get("id")).longValue();
        jdbc.update("INSERT INTO registros_peso (tenant_id, animal_id, fecha, peso_kg) "
                + "SELECT ?, ?, fecha, peso_kg FROM registros_peso WHERE animal_id = ? AND tenant_id = ?",
            comprador, nuevoId, animalOrigen, vendedor);
        // Vacunas: cada finca tiene su propio catálogo; se reutiliza la vacuna del comprador con el mismo nombre o se crea.
        for (Map<String, Object> v : jdbc.queryForList(
                "SELECT v.nombre, v.enfermedad_prevenida, v.dias_retiro_carne, v.dias_retiro_leche, v.dias_para_refuerzo, "
                    + "av.fecha_aplicacion, av.fecha_fin_retiro_carne, av.fecha_fin_retiro_leche, av.fecha_proxima_dosis, av.lote, av.veterinario_responsable "
                    + "FROM aplicaciones_vacuna av JOIN vacunas v ON v.id = av.vacuna_id WHERE av.animal_id = ? AND av.tenant_id = ?",
                animalOrigen, vendedor)) {
            List<Long> existente = jdbc.queryForList(
                "SELECT id FROM vacunas WHERE tenant_id = ? AND LOWER(nombre) = LOWER(?) ORDER BY id LIMIT 1", Long.class, comprador, v.get("nombre"));
            Long vacunaId = existente.isEmpty() ? jdbc.queryForObject(
                "INSERT INTO vacunas (tenant_id, nombre, enfermedad_prevenida, dias_retiro_carne, dias_retiro_leche, dias_para_refuerzo) "
                    + "VALUES (?, ?, ?, ?, ?, ?) RETURNING id", Long.class,
                comprador, v.get("nombre"), v.get("enfermedad_prevenida"), v.get("dias_retiro_carne"), v.get("dias_retiro_leche"), v.get("dias_para_refuerzo"))
                : existente.get(0);
            jdbc.update("INSERT INTO aplicaciones_vacuna (tenant_id, animal_id, vacuna_id, fecha_aplicacion, fecha_fin_retiro_carne, "
                    + "fecha_fin_retiro_leche, fecha_proxima_dosis, lote, veterinario_responsable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                comprador, nuevoId, vacunaId, v.get("fecha_aplicacion"), v.get("fecha_fin_retiro_carne"), v.get("fecha_fin_retiro_leche"),
                v.get("fecha_proxima_dosis"), v.get("lote"), v.get("veterinario_responsable"));
        }
        return Map.of("id", nuevoId, "arete", areteFinal);
    }

    /** Animales de una publicación: los del lote, o el de portada en publicaciones de un solo animal. */
    private List<Long> animalesDe(Long publicacionId, Long animalPortada) {
        List<Long> ids = jdbc.queryForList(
            "SELECT animal_id FROM mercado_ganado_lote_animales WHERE publicacion_id = ? ORDER BY animal_id = ? DESC, animal_id",
            Long.class, publicacionId, animalPortada);
        return ids.isEmpty() ? List.of(animalPortada) : ids;
    }

    private String tituloDe(Long publicacionId) {
        return String.valueOf(jdbc.queryForObject("SELECT titulo FROM publicaciones_venta WHERE id = ?", String.class, publicacionId));
    }

    public static class CalificacionRequest {
        public Integer estrellas;
        public String comentario;
    }

    /** Cada parte califica a la otra una sola vez, solo en tratos cerrados en Aurora. */
    @PostMapping("/ofertas/{ofertaId:[0-9]+}/calificar")
    public Map<String, Object> calificar(@PathVariable Long ofertaId, @RequestBody CalificacionRequest req) {
        AuthContext.exigirRol(ROLES_NEGOCIO);
        Long yo = tenantActual();
        if (req.estrellas == null || req.estrellas < 1 || req.estrellas > 5) throw new RuntimeException("Elige de 1 a 5 estrellas");
        Map<String, Object> oferta = unaFila(
            "SELECT o.id, o.estado, o.comprador_tenant_id, o.publicacion_id, p.tenant_id AS vendedor "
                + "FROM ofertas_compra o JOIN publicaciones_venta p ON p.id = o.publicacion_id WHERE o.id = ?", ofertaId);
        if (oferta == null || !"ACEPTADA".equals(oferta.get("estado"))) throw new RuntimeException("Solo se califica un trato cerrado");
        Long vendedor = numero(oferta.get("vendedor"));
        Long comprador = numero(oferta.get("comprador_tenant_id"));
        Long calificado = yo.equals(vendedor) ? comprador : yo.equals(comprador) ? vendedor : null;
        if (calificado == null) throw new RuntimeException("No participaste en este trato");
        String comentario = texto(req.comentario) ? FiltroContactoMercado.filtrar(recortar(req.comentario, 500)).texto() : null;
        jdbc.update("INSERT INTO mercado_ganado_calificaciones (oferta_id, calificador_tenant_id, calificado_tenant_id, estrellas, comentario) "
            + "VALUES (?, ?, ?, ?, ?) ON CONFLICT (oferta_id, calificador_tenant_id) DO NOTHING", ofertaId, yo, calificado, req.estrellas, comentario);
        return detalle(numero(oferta.get("publicacion_id")));
    }

    // ─────────────────────────── chat ───────────────────────────

    /** Conversaciones de mi finca, como vendedora o como compradora. */
    @GetMapping("/conversaciones")
    public List<Map<String, Object>> conversaciones() {
        Long yo = tenantActual();
        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT m.publicacion_id AS \"publicacionId\", m.comprador_tenant_id AS \"compradorTenantId\", p.titulo, p.estado, "
                + "p.miniatura_base64 AS miniatura, p.tenant_id AS vendedor, p.comprador_tenant_id AS cerrado_con, "
                + "MAX(m.fecha) AS \"ultimaFecha\", "
                + "(ARRAY_AGG(m.contenido ORDER BY m.fecha DESC))[1] AS \"ultimoMensaje\", "
                + "COUNT(*) FILTER (WHERE m.emisor_tenant_id <> ? AND NOT m.leido) AS \"sinLeer\" "
                + "FROM mercado_ganado_mensajes m JOIN publicaciones_venta p ON p.id = m.publicacion_id "
                + "WHERE p.tenant_id = ? OR m.comprador_tenant_id = ? "
                + "GROUP BY m.publicacion_id, m.comprador_tenant_id, p.titulo, p.estado, p.miniatura_base64, p.tenant_id, p.comprador_tenant_id "
                + "ORDER BY MAX(m.fecha) DESC",
            yo, yo, yo);
        Set<Long> otros = new HashSet<>();
        filas.forEach(f -> otros.add(numero(f.get("vendedor")).equals(yo) ? numero(f.get("compradorTenantId")) : numero(f.get("vendedor"))));
        Map<Long, Map<String, Object>> perfiles = perfiles(otros);
        for (Map<String, Object> f : filas) {
            boolean soyVendedor = numero(f.get("vendedor")).equals(yo);
            Long otro = soyVendedor ? numero(f.get("compradorTenantId")) : numero(f.get("vendedor"));
            boolean revelado = "VENDIDA".equals(f.get("estado")) && f.get("cerrado_con") != null
                && numero(f.get("cerrado_con")).equals(numero(f.get("compradorTenantId")));
            Map<String, Object> perfil = perfilPublico(perfiles.get(otro), otro, soyVendedor ? "COMPRADOR" : "VENDEDOR", revelado);
            f.put("soyVendedor", soyVendedor);
            f.put("otraFinca", perfil.get("nombre"));
            f.put("compradorRef", referencia(numero(f.get("publicacionId")), numero(f.get("compradorTenantId"))));
            f.remove("compradorTenantId");
            f.remove("vendedor");
            f.remove("cerrado_con");
        }
        return filas;
    }

    @GetMapping("/sin-leer")
    public Map<String, Object> sinLeer() {
        Long yo = tenantActual();
        Long n = jdbc.queryForObject(
            "SELECT COUNT(*) FROM mercado_ganado_mensajes m JOIN publicaciones_venta p ON p.id = m.publicacion_id "
                + "WHERE (p.tenant_id = ? OR m.comprador_tenant_id = ?) AND m.emisor_tenant_id <> ? AND NOT m.leido",
            Long.class, yo, yo, yo);
        return Map.of("sinLeer", n == null ? 0L : n);
    }

    /** Mensajes de una conversación. El vendedor indica con qué comprador; el comprador es siempre él mismo. */
    @GetMapping("/publicaciones/{id:[0-9]+}/mensajes")
    public List<Map<String, Object>> mensajes(@PathVariable Long id, @RequestParam(required = false) String comprador) {
        Long yo = tenantActual();
        Long compradorConv = compradorDeConversacion(id, comprador);
        return mensajesDe(id, compradorConv, yo);
    }

    private List<Map<String, Object>> mensajesDe(Long id, Long compradorConv, Long yo) {
        jdbc.update("UPDATE mercado_ganado_mensajes SET leido = TRUE WHERE publicacion_id = ? AND comprador_tenant_id = ? AND emisor_tenant_id <> ? AND NOT leido",
            id, compradorConv, yo);
        boolean revelado = tratoCerradoEntre(id, compradorConv);
        Long vendedor = jdbc.queryForObject("SELECT tenant_id FROM publicaciones_venta WHERE id = ?", Long.class, id);
        Long otro = vendedor.equals(yo) ? compradorConv : vendedor;
        Map<String, Object> perfilOtro = perfilPublico(perfiles(Set.of(otro)).get(otro), otro, vendedor.equals(yo) ? "COMPRADOR" : "VENDEDOR", revelado);

        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT id, emisor_tenant_id, emisor_nombre, contenido, es_sistema AS \"esSistema\", fecha "
                + "FROM mercado_ganado_mensajes WHERE publicacion_id = ? AND comprador_tenant_id = ? ORDER BY fecha, id",
            id, compradorConv);
        for (Map<String, Object> f : filas) {
            boolean mio = numero(f.get("emisor_tenant_id")).equals(yo);
            f.put("esMio", mio);
            f.put("emisorNombre", mio ? null : revelado ? f.get("emisor_nombre") : perfilOtro.get("nombre"));
            f.remove("emisor_tenant_id");
            f.remove("emisor_nombre");
        }
        return filas;
    }

    public static class MensajeRequest {
        public String contenido;
        /** Referencia opaca de la finca compradora (solo la manda el vendedor). */
        public String comprador;
    }

    @PostMapping("/publicaciones/{id:[0-9]+}/mensajes")
    public Map<String, Object> enviarMensaje(@PathVariable Long id, @RequestBody MensajeRequest req) {
        AuthContext.exigirRol(ROLES_NEGOCIO);
        exigirCondiciones();
        if (!texto(req.contenido)) throw new RuntimeException("Escribe un mensaje");
        Long yo = tenantActual();
        verificacion.exigir(yo, com.auroraplus.modules.ganaderia.services.VerificacionMercadoService.Nivel.COMPRAR);
        Long compradorConv = compradorDeConversacion(id, req.comprador);
        Map<String, Object> pub = unaFila("SELECT estado, tenant_id FROM publicaciones_venta WHERE id = ?", id);
        Long vendedor = numero(pub.get("tenant_id"));
        boolean soyVendedor = vendedor.equals(yo);
        if (!soyVendedor && !"ACTIVA".equals(pub.get("estado"))) {
            Integer participo = jdbc.queryForObject(
                "SELECT COUNT(*) FROM mercado_ganado_mensajes WHERE publicacion_id = ? AND comprador_tenant_id = ?", Integer.class, id, yo);
            if (participo == null || participo == 0) throw new RuntimeException("Esta publicación ya no está disponible");
        }
        String contenido = recortar(req.contenido.trim(), 2000);
        boolean oculto = false;
        // Una vez cerrado el trato ya se ven los datos del otro: el filtro solo cuida la negociación.
        if (!tratoCerradoEntre(id, compradorConv)) {
            FiltroContactoMercado.Resultado f = FiltroContactoMercado.filtrar(contenido);
            if (f.huboContacto()) {
                oculto = true;
                registrarAlerta(id, yo, soyVendedor ? compradorConv : vendedor, "CONTACTO_EN_CHAT", contenido);
                contenido = f.texto();
            }
        }
        insertarMensaje(id, compradorConv, yo, nombreEmisor(yo), contenido, false);
        // Un aviso por conversación mientras la otra parte no lea: no se le llena el correo con cada mensaje.
        Long sinLeerMios = jdbc.queryForObject(
            "SELECT COUNT(*) FROM mercado_ganado_mensajes WHERE publicacion_id = ? AND comprador_tenant_id = ? AND emisor_tenant_id = ? AND NOT leido",
            Long.class, id, compradorConv, yo);
        if (sinLeerMios != null && sinLeerMios == 1) {
            Long destinatario = soyVendedor ? compradorConv : vendedor;
            avisos.avisar(destinatario, "Nuevo mensaje sobre " + tituloDe(id),
                (soyVendedor ? "El vendedor" : "Una finca interesada") + " te escribió sobre \"" + tituloDe(id) + "\": " + recortar(contenido, 200));
        }
        return Map.of("mensajes", mensajesDe(id, compradorConv, yo), "datosOcultos", oculto);
    }

    // ─────────────────────────── comisiones ───────────────────────────

    /** Lo que la finca debe por el mercado y se sumará a su próxima factura de Aurora. */
    @GetMapping("/comisiones")
    public Map<String, Object> misComisiones() {
        Long yo = tenantActual();
        List<Map<String, Object>> filas = jdbc.queryForList(
            "SELECT id, descripcion, monto_base AS \"montoBase\", porcentaje, monto_comision AS \"montoComision\", pagada, fecha "
                + "FROM comisiones_plataforma WHERE tenant_id = ? AND origen LIKE 'mercado-ganado-%' ORDER BY fecha DESC LIMIT 100", yo);
        BigDecimal pendiente = filas.stream().filter(f -> !Boolean.TRUE.equals(f.get("pagada")))
            .map(f -> (BigDecimal) f.get("montoComision")).reduce(BigDecimal.ZERO, BigDecimal::add);
        return Map.of("pendiente", pendiente, "comisiones", filas);
    }

    // ─────────────────────────── tarjetas y perfiles ───────────────────────────

    /** Las publicaciones de una finca suspendida desaparecen de la vitrina. */
    private static final String SIN_SUSPENDIDOS =
        " AND NOT EXISTS (SELECT 1 FROM mercado_ganado_suspensiones s WHERE s.tenant_id = p.tenant_id)";

    /** Un lote deja de mostrarse si alguno de sus animales ya no está activo en el hato. */
    private static final String LOTE_ACTIVO =
        " AND NOT EXISTS (SELECT 1 FROM mercado_ganado_lote_animales la JOIN animales x ON x.id = la.animal_id "
            + "WHERE la.publicacion_id = p.id AND x.estado <> 'ACTIVO')";

    /** Primer ? = finca que mira (es_mia), segundo ? = finca que mira (guardado). */
    private static final String SELECT_TARJETA =
        "SELECT p.id, p.tenant_id, p.animal_id, p.titulo, p.precio_solicitado, p.tipo_precio, p.ubicacion, p.estado_region, p.categoria, "
            + "p.negociable, p.estado, p.fecha_publicacion, p.descripcion, p.miniatura_base64, p.precio_final, p.fecha_cierre, p.comprador_tenant_id, "
            + "p.cantidad, p.peso_total, "
            + "COALESCE(p.peso_publicado, a.peso_actual) AS peso, a.raza, a.sexo, a.tipo_animal, a.fecha_nacimiento, a.arete, "
            + "p.tenant_id = ? AS es_mia, "
            + "EXISTS (SELECT 1 FROM mercado_ganado_guardados g2 WHERE g2.publicacion_id = p.id AND g2.tenant_id = ?) AS guardado, "
            + "(SELECT COUNT(*) FROM ofertas_compra o WHERE o.publicacion_id = p.id AND o.estado = 'PENDIENTE' AND o.comprador_tenant_id IS NOT NULL) AS ofertas_pendientes, "
            + "(SELECT COUNT(*) FROM mercado_ganado_fotos f WHERE f.publicacion_id = p.id) AS total_fotos "
            + "FROM publicaciones_venta p JOIN animales a ON a.id = p.animal_id JOIN licencias_tenant l ON l.tenant_id = p.tenant_id";

    private List<Map<String, Object>> tarjetas(List<Map<String, Object>> filas, Long yo) {
        Map<Long, Map<String, Object>> perfiles = perfiles(filas.stream().map(f -> numero(f.get("tenant_id"))).collect(Collectors.toSet()));
        List<Map<String, Object>> salida = new ArrayList<>();
        for (Map<String, Object> f : filas) {
            Long vendedor = numero(f.get("tenant_id"));
            boolean esMia = vendedor.equals(yo);
            boolean revelado = esMia || ("VENDIDA".equals(f.get("estado")) && f.get("comprador_tenant_id") != null
                && numero(f.get("comprador_tenant_id")).equals(yo));
            Map<String, Object> t = new LinkedHashMap<>();
            t.put("id", f.get("id"));
            t.put("titulo", f.get("titulo"));
            t.put("categoria", f.get("categoria"));
            t.put("precio", f.get("precio_solicitado"));
            t.put("tipoPrecio", f.get("tipo_precio"));
            t.put("estadoRegion", f.get("estado_region"));
            t.put("negociable", f.get("negociable"));
            t.put("estado", f.get("estado"));
            t.put("fechaPublicacion", f.get("fecha_publicacion"));
            t.put("miniatura", f.get("miniatura_base64"));
            t.put("peso", f.get("peso"));
            t.put("cantidad", f.get("cantidad"));
            t.put("pesoTotal", f.get("peso_total"));
            t.put("raza", f.get("raza"));
            t.put("sexo", f.get("sexo"));
            t.put("tipoAnimal", f.get("tipo_animal"));
            t.put("arete", esMia ? f.get("arete") : null);
            t.put("edadMeses", f.get("fecha_nacimiento") == null ? null
                : ChronoUnit.MONTHS.between(((java.sql.Date) f.get("fecha_nacimiento")).toLocalDate(), LocalDate.now()));
            t.put("esMia", esMia);
            t.put("guardado", f.get("guardado"));
            t.put("ofertasPendientes", esMia ? f.get("ofertas_pendientes") : 0L);
            t.put("totalFotos", f.get("total_fotos"));
            t.put("precioFinal", revelado ? f.get("precio_final") : null);
            t.put("fechaCierre", revelado ? f.get("fecha_cierre") : null);
            Map<String, Object> perfil = perfilPublico(perfiles.get(vendedor), vendedor, "VENDEDOR", revelado);
            if (!revelado && f.get("estado_region") != null) perfil.put("nombre", "Finca en " + f.get("estado_region") + " #" + codigo(vendedor));
            t.put("vendedor", perfil);
            salida.add(t);
        }
        return salida;
    }

    /** Datos de reputación de varias fincas en pocas consultas. */
    private Map<Long, Map<String, Object>> perfiles(Set<Long> tenants) {
        Map<Long, Map<String, Object>> salida = new HashMap<>();
        if (tenants.isEmpty()) return salida;
        Object[] ids = tenants.toArray();
        String en = marcadores(ids.length);
        for (Map<String, Object> r : jdbc.queryForList("SELECT tenant_id, nombre_empresa, fecha_alta FROM licencias_tenant WHERE tenant_id IN (" + en + ")", ids)) {
            Map<String, Object> p = new HashMap<>();
            p.put("nombreReal", r.get("nombre_empresa"));
            p.put("fechaAlta", r.get("fecha_alta"));
            p.put("verificado", false);
            p.put("ventas", 0L);
            p.put("compras", 0L);
            p.put("calificacion", null);
            p.put("totalCalificaciones", 0L);
            salida.put(numero(r.get("tenant_id")), p);
        }
        // "Verificado por Aurora" = el equipo revisó la cédula del titular; hierro y tierra suman sellos aparte.
        for (Map.Entry<Long, Set<String>> e : verificacion.aprobadosDe(tenants).entrySet()) {
            Map<String, Object> p = salida.get(e.getKey());
            if (p == null) continue;
            p.put("verificado", e.getValue().contains("CEDULA"));
            p.put("hierroVerificado", e.getValue().contains("HIERRO"));
            p.put("tierraVerificada", e.getValue().contains("TIERRA"));
        }
        for (Map<String, Object> r : jdbc.queryForList("SELECT tenant_id, COUNT(*) AS n FROM publicaciones_venta WHERE estado = 'VENDIDA' "
                + "AND tenant_id IN (" + en + ") GROUP BY tenant_id", ids)) {
            Map<String, Object> p = salida.get(numero(r.get("tenant_id")));
            if (p != null) p.put("ventas", numero(r.get("n")));
        }
        for (Map<String, Object> r : jdbc.queryForList("SELECT comprador_tenant_id AS t, COUNT(*) AS n FROM ofertas_compra WHERE estado = 'ACEPTADA' "
                + "AND comprador_tenant_id IN (" + en + ") GROUP BY comprador_tenant_id", ids)) {
            Map<String, Object> p = salida.get(numero(r.get("t")));
            if (p != null) p.put("compras", numero(r.get("n")));
        }
        for (Map<String, Object> r : jdbc.queryForList("SELECT calificado_tenant_id AS t, AVG(estrellas) AS prom, COUNT(*) AS n "
                + "FROM mercado_ganado_calificaciones WHERE calificado_tenant_id IN (" + en + ") GROUP BY calificado_tenant_id", ids)) {
            Map<String, Object> p = salida.get(numero(r.get("t")));
            if (p == null) continue;
            p.put("calificacion", new BigDecimal(r.get("prom").toString()).setScale(1, RoundingMode.HALF_UP));
            p.put("totalCalificaciones", numero(r.get("n")));
        }
        return salida;
    }

    /** Lo que se muestra de una finca: su nombre real solo si el trato ya se cerró con ella. */
    private Map<String, Object> perfilPublico(Map<String, Object> datos, Long tenantId, String rol, boolean revelado) {
        Map<String, Object> p = new LinkedHashMap<>();
        String alias = ("COMPRADOR".equals(rol) ? "Comprador" : "Finca vendedora") + " #" + codigo(tenantId);
        p.put("nombre", revelado && datos != null && datos.get("nombreReal") != null ? datos.get("nombreReal") : alias);
        p.put("revelado", revelado);
        p.put("verificado", datos != null && Boolean.TRUE.equals(datos.get("verificado")));
        p.put("hierroVerificado", datos != null && Boolean.TRUE.equals(datos.get("hierroVerificado")));
        p.put("tierraVerificada", datos != null && Boolean.TRUE.equals(datos.get("tierraVerificada")));
        Object alta = datos == null ? null : datos.get("fechaAlta");
        p.put("mesesEnAurora", alta == null ? null : ChronoUnit.MONTHS.between(((java.sql.Date) alta).toLocalDate(), LocalDate.now()));
        p.put("diasEnAurora", alta == null ? null : ChronoUnit.DAYS.between(((java.sql.Date) alta).toLocalDate(), LocalDate.now()));
        p.put("ventas", datos == null ? 0L : datos.get("ventas"));
        p.put("compras", datos == null ? 0L : datos.get("compras"));
        p.put("calificacion", datos == null ? null : datos.get("calificacion"));
        p.put("totalCalificaciones", datos == null ? 0L : datos.get("totalCalificaciones"));
        return p;
    }

    /** Código corto y estable para reconocer a una finca sin revelar quién es ni su número interno. */
    private String codigo(Long tenantId) {
        return firmar("alias:" + tenantId).substring(0, 4).toUpperCase();
    }

    /** Referencia opaca de una finca compradora dentro de una publicación (el vendedor no ve su número interno). */
    private String referencia(Long publicacionId, Long tenantId) {
        return firmar("comprador:" + publicacionId + ":" + tenantId).substring(0, 16);
    }

    private String firmar(String texto) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secreto.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] h = mac.doFinal(texto.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : h) sb.append(Character.forDigit((b >> 4) & 0xF, 16)).append(Character.forDigit(b & 0xF, 16));
            return new java.math.BigInteger(sb.toString(), 16).toString(36);
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo calcular el alias", e);
        }
    }

    /** Datos de la otra parte, solo después de cerrar el trato. */
    private Map<String, Object> contacto(Long tenantId) {
        Map<String, Object> l = unaFila("SELECT nombre_empresa, telefono_contacto, email_contacto FROM licencias_tenant WHERE tenant_id = ?", tenantId);
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("nombre", l == null ? null : l.get("nombre_empresa"));
        c.put("telefono", l == null ? null : l.get("telefono_contacto"));
        c.put("email", l == null ? null : l.get("email_contacto"));
        return c;
    }

    private Map<String, Object> ofertaAceptada(Long publicacionId) {
        return unaFila("SELECT id, monto_ofertado AS monto, traspasado FROM ofertas_compra WHERE publicacion_id = ? AND estado = 'ACEPTADA' LIMIT 1", publicacionId);
    }

    /**
     * Precio de referencia: lo que se pide y se pagó por animales de la misma
     * categoría (y raza, si hay suficientes) en los últimos 6 meses.
     */
    private Map<String, Object> referenciaPrecio(Long publicacionId) {
        Map<String, Object> pub = unaFila("SELECT p.categoria, p.tipo_precio, a.raza FROM publicaciones_venta p JOIN animales a ON a.id = p.animal_id WHERE p.id = ?", publicacionId);
        if (pub == null || pub.get("categoria") == null) return null;
        String base = "SELECT AVG(COALESCE(p.precio_final, p.precio_solicitado)) AS promedio, MIN(COALESCE(p.precio_final, p.precio_solicitado)) AS minimo, "
            + "MAX(COALESCE(p.precio_final, p.precio_solicitado)) AS maximo, COUNT(*) AS muestras "
            + "FROM publicaciones_venta p JOIN animales a ON a.id = p.animal_id "
            + "WHERE p.categoria = ? AND p.tipo_precio = ? AND p.id <> ? AND p.estado IN ('ACTIVA', 'VENDIDA') AND p.fecha_publicacion >= ?";
        LocalDate desde = LocalDate.now().minusMonths(6);
        Map<String, Object> r = null;
        String alcance = "categoría";
        if (pub.get("raza") != null) {
            r = unaFila(base + " AND a.raza ILIKE ?", pub.get("categoria"), pub.get("tipo_precio"), publicacionId, desde, pub.get("raza"));
            alcance = "categoría y raza";
        }
        if (r == null || numero(r.get("muestras")) < 3) {
            r = unaFila(base, pub.get("categoria"), pub.get("tipo_precio"), publicacionId, desde);
            alcance = "categoría";
        }
        if (r == null || numero(r.get("muestras")) < 2) return null;
        Map<String, Object> ref = new LinkedHashMap<>();
        ref.put("promedio", new BigDecimal(r.get("promedio").toString()).setScale(2, RoundingMode.HALF_UP));
        ref.put("minimo", r.get("minimo"));
        ref.put("maximo", r.get("maximo"));
        ref.put("muestras", r.get("muestras"));
        ref.put("alcance", alcance);
        return ref;
    }

    // ─────────────────────────── utilidades ───────────────────────────

    private String limpiarPublicacion(String texto, Long publicacionId, Long yo) {
        if (texto == null) return null;
        FiltroContactoMercado.Resultado f = FiltroContactoMercado.filtrar(texto);
        if (f.huboContacto()) registrarAlerta(publicacionId, yo, null, "CONTACTO_EN_PUBLICACION", texto);
        return f.texto();
    }

    private void registrarAlerta(Long publicacionId, Long tenantId, Long otraParte, String tipo, String original) {
        jdbc.update("INSERT INTO mercado_ganado_alertas (publicacion_id, tenant_id, otra_parte_tenant_id, tipo, contenido_original, fecha) VALUES (?, ?, ?, ?, ?, ?)",
            publicacionId, tenantId, otraParte, tipo, recortar(original, 2000), Timestamp.valueOf(LocalDateTime.now()));
    }

    private boolean tratoCerradoEntre(Long publicacionId, Long comprador) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM publicaciones_venta WHERE id = ? AND estado = 'VENDIDA' AND comprador_tenant_id = ?)",
            Boolean.class, publicacionId, comprador));
    }

    private Map<String, Object> publicacionPropiaActiva(Long id) {
        Map<String, Object> pub = unaFila("SELECT id, tenant_id, estado FROM publicaciones_venta WHERE id = ? AND tenant_id = ?", id, tenantActual());
        if (pub == null) throw new RuntimeException("Publicación no encontrada");
        if (!"ACTIVA".equals(pub.get("estado"))) throw new RuntimeException("Esta publicación ya está cerrada");
        return pub;
    }

    private Map<String, Object> ofertaDeMiPublicacion(Long ofertaId) {
        Map<String, Object> oferta = unaFila(
            "SELECT o.id, o.publicacion_id, o.comprador_tenant_id, o.monto_ofertado, o.estado FROM ofertas_compra o "
                + "JOIN publicaciones_venta p ON p.id = o.publicacion_id WHERE o.id = ? AND p.tenant_id = ? AND o.comprador_tenant_id IS NOT NULL",
            ofertaId, tenantActual());
        if (oferta == null) throw new RuntimeException("Oferta no encontrada");
        if (!"PENDIENTE".equals(oferta.get("estado"))) throw new RuntimeException("Esta oferta ya fue respondida");
        return oferta;
    }

    /** Resuelve la conversación y comprueba que la finca que llama es parte de ella. */
    private Long compradorDeConversacion(Long publicacionId, String compradorRef) {
        Long yo = tenantActual();
        Map<String, Object> pub = unaFila("SELECT tenant_id, estado FROM publicaciones_venta WHERE id = ?", publicacionId);
        if (pub == null) throw new RuntimeException("Publicación no encontrada");
        if (numero(pub.get("tenant_id")).equals(yo)) {
            if (compradorRef == null || compradorRef.isBlank()) throw new RuntimeException("Indica con qué finca es la conversación");
            // El vendedor solo responde a fincas que ya le escribieron u ofertaron; no puede abrir chats a cualquiera.
            for (Long candidato : jdbc.queryForList(
                    "SELECT comprador_tenant_id FROM mercado_ganado_mensajes WHERE publicacion_id = ? "
                        + "UNION SELECT comprador_tenant_id FROM ofertas_compra WHERE publicacion_id = ? AND comprador_tenant_id IS NOT NULL",
                    Long.class, publicacionId, publicacionId)) {
                if (referencia(publicacionId, candidato).equals(compradorRef)) return candidato;
            }
            throw new RuntimeException("Conversación no encontrada");
        }
        return yo;
    }

    private void insertarMensaje(Long publicacionId, Long comprador, Long emisor, String emisorNombre, String contenido, boolean sistema) {
        jdbc.update("INSERT INTO mercado_ganado_mensajes (publicacion_id, comprador_tenant_id, emisor_tenant_id, emisor_nombre, contenido, es_sistema, fecha) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?)",
            publicacionId, comprador, emisor, emisorNombre, contenido, sistema, Timestamp.valueOf(LocalDateTime.now()));
    }

    private void registrarComision(Long tenantId, String origen, Long ofertaId, BigDecimal monto, String descripcion) {
        BigDecimal comision = monto.multiply(COMISION_PORCENTAJE).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        jdbc.update("INSERT INTO comisiones_plataforma (tenant_id, origen, referencia_id, monto_base, porcentaje, monto_comision, pagada, fecha, descripcion) "
                + "VALUES (?, ?, ?, ?, ?, ?, FALSE, ?, ?)",
            tenantId, origen, ofertaId, monto, COMISION_PORCENTAJE, comision, Timestamp.valueOf(LocalDateTime.now()), recortar(descripcion, 200));
    }

    private static String validarCategoria(String categoria) {
        String c = categoria == null ? "" : categoria.trim().toUpperCase();
        if (!CATEGORIAS.contains(c)) throw new RuntimeException("Elige la categoría del animal");
        return c;
    }

    private List<String> validarFotos(List<String> fotos, String miniatura) {
        List<String> limpias = fotos == null ? List.of() : fotos.stream().filter(MercadoGanaderoController::texto).toList();
        if (limpias.isEmpty()) throw new RuntimeException("Agrega al menos una foto del animal");
        if (limpias.size() > MAX_FOTOS) throw new RuntimeException("Máximo " + MAX_FOTOS + " fotos por publicación");
        for (String f : limpias) {
            if (!f.startsWith("data:image/")) throw new RuntimeException("Solo se aceptan imágenes");
            if (f.length() > MAX_LARGO_FOTO) throw new RuntimeException("Una de las fotos es demasiado pesada");
        }
        if (miniatura != null && (!miniatura.startsWith("data:image/") || miniatura.length() > MAX_LARGO_MINIATURA)) {
            throw new RuntimeException("Miniatura inválida");
        }
        return limpias;
    }

    private void guardarFotos(Long publicacionId, Long tenantId, List<String> fotos) {
        for (int i = 0; i < fotos.size(); i++) {
            jdbc.update("INSERT INTO mercado_ganado_fotos (publicacion_id, tenant_id, imagen_base64, orden) VALUES (?, ?, ?, ?)",
                publicacionId, tenantId, fotos.get(i), i);
        }
    }

    private static void validarPrecio(BigDecimal precio) {
        if (precio == null || precio.compareTo(BigDecimal.ZERO) <= 0) throw new RuntimeException("El precio debe ser mayor que cero");
        if (precio.compareTo(new BigDecimal("100000000")) > 0) throw new RuntimeException("Revisa el precio: es demasiado alto");
    }

    private String nombreFinca(Long tenantId) {
        List<String> n = jdbc.queryForList("SELECT nombre_empresa FROM licencias_tenant WHERE tenant_id = ?", String.class, tenantId);
        return n.isEmpty() || n.get(0) == null ? "Finca #" + tenantId : n.get(0);
    }

    /** "Juan Pérez · Hacienda El Samán": quién escribe y de qué finca (solo se muestra tras cerrar el trato). */
    private String nombreEmisor(Long tenantId) {
        List<String> n = jdbc.queryForList("SELECT nombre_completo FROM usuarios WHERE tenant_id = ? AND username = ?",
            String.class, tenantId, AuthContext.getUsername());
        String persona = n.isEmpty() || n.get(0) == null ? AuthContext.getUsername() : n.get(0);
        String finca = nombreFinca(tenantId);
        if (persona == null || persona.isBlank() || persona.trim().equalsIgnoreCase(finca.trim())) return recortar(finca, 120);
        return recortar(persona.trim() + " · " + finca, 120);
    }

    /** La finca que llama; si el super-admin la suspendió del mercado, no puede usarlo. */
    private Long tenantActual() {
        Long t = TenantContext.getCurrentTenant();
        if (t == null) throw new RuntimeException("Sesión sin finca");
        List<String> motivo = jdbc.queryForList("SELECT motivo FROM mercado_ganado_suspensiones WHERE tenant_id = ?", String.class, t);
        if (!motivo.isEmpty()) throw new RuntimeException("Tu finca está suspendida del Mercado Ganadero. Motivo: " + motivo.get(0));
        return t;
    }

    private Map<String, Object> unaFila(String sql, Object... params) {
        List<Map<String, Object>> filas = jdbc.queryForList(sql, params);
        return filas.isEmpty() ? null : filas.get(0);
    }

    private static String marcadores(int n) { return String.join(",", Collections.nCopies(n, "?")); }

    private static List<Object> concatenar(List<Object> a, List<Object> b) {
        List<Object> r = new ArrayList<>(a);
        r.addAll(b);
        return r;
    }

    private static Long numero(Object o) { return ((Number) o).longValue(); }

    private static boolean texto(String s) { return s != null && !s.isBlank(); }

    private static String recortar(String s, int max) {
        if (s == null) return null;
        String t = s.trim();
        return t.length() > max ? t.substring(0, max) : t;
    }

    private static String dinero(BigDecimal monto) { return "$" + monto.setScale(2, RoundingMode.HALF_UP).toPlainString(); }
}
