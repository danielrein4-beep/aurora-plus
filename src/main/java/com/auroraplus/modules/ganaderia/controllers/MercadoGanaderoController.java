package com.auroraplus.modules.ganaderia.controllers;

import com.auroraplus.core.auth.AuthContext;
import com.auroraplus.core.config.TenantContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

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
 * Al cerrar un trato se cobra 1% al vendedor y 1% al comprador, como comisión
 * pendiente que se suma a la siguiente factura de Aurora de cada uno.
 */
@RestController
@RequestMapping("/api/ganaderia/mercado")
public class MercadoGanaderoController {

    private static final BigDecimal COMISION_PORCENTAJE = new BigDecimal("1.00");
    private static final int MAX_FOTOS = 6;
    private static final int MAX_LARGO_FOTO = 1_500_000;
    private static final int MAX_LARGO_MINIATURA = 250_000;
    private static final String[] ROLES_NEGOCIO = {"DUENO_ADMIN", "ADMINISTRADOR_FINCA"};

    @Autowired
    private JdbcTemplate jdbc;

    // ─────────────────────────── vitrina ───────────────────────────

    @GetMapping("/publicaciones")
    public List<Map<String, Object>> vitrina(
            @RequestParam(required = false) String raza,
            @RequestParam(required = false) String sexo,
            @RequestParam(required = false) BigDecimal pesoMin,
            @RequestParam(required = false) BigDecimal pesoMax,
            @RequestParam(required = false) BigDecimal precioMax,
            @RequestParam(required = false) String ubicacion,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "recientes") String orden) {
        Long yo = tenantActual();
        StringBuilder sql = new StringBuilder(SELECT_TARJETA + " WHERE p.estado = 'ACTIVA' AND l.activa = TRUE");
        List<Object> params = new ArrayList<>();
        params.add(yo);
        if (texto(raza)) { sql.append(" AND a.raza ILIKE ?"); params.add("%" + raza.trim() + "%"); }
        if (texto(sexo)) { sql.append(" AND a.sexo = ?"); params.add(sexo.trim().toUpperCase()); }
        if (pesoMin != null) { sql.append(" AND COALESCE(p.peso_publicado, a.peso_actual) >= ?"); params.add(pesoMin); }
        if (pesoMax != null) { sql.append(" AND COALESCE(p.peso_publicado, a.peso_actual) <= ?"); params.add(pesoMax); }
        if (precioMax != null) { sql.append(" AND p.precio_solicitado <= ?"); params.add(precioMax); }
        if (texto(ubicacion)) { sql.append(" AND p.ubicacion ILIKE ?"); params.add("%" + ubicacion.trim() + "%"); }
        if (texto(q)) {
            sql.append(" AND (p.titulo ILIKE ? OR a.raza ILIKE ? OR p.descripcion ILIKE ? OR l.nombre_empresa ILIKE ?)");
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
        return jdbc.queryForList(sql.toString(), params.toArray()).stream().map(this::tarjeta).toList();
    }

    /** Mis publicaciones (todas, no solo activas) con ofertas y mensajes sin leer. */
    @GetMapping("/mis-publicaciones")
    public List<Map<String, Object>> misPublicaciones() {
        Long yo = tenantActual();
        return jdbc.queryForList(SELECT_TARJETA + " WHERE p.tenant_id = ? ORDER BY p.fecha_publicacion DESC, p.id DESC", yo, yo)
            .stream().map(this::tarjeta).toList();
    }

    @GetMapping("/publicaciones/{id:[0-9]+}")
    public Map<String, Object> detalle(@PathVariable Long id) {
        Long yo = tenantActual();
        Map<String, Object> fila = unaFila(SELECT_TARJETA + " WHERE p.id = ?", yo, id);
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

        Map<String, Object> salida = tarjeta(fila);
        salida.put("descripcion", fila.get("descripcion"));
        salida.put("fotos", jdbc.queryForList(
            "SELECT id, imagen_base64 AS imagen FROM mercado_ganado_fotos WHERE publicacion_id = ? ORDER BY orden, id", id));
        Long animalId = numero(fila.get("animal_id"));
        salida.put("pesos", jdbc.queryForList(
            "SELECT fecha, peso_kg AS \"pesoKg\" FROM registros_peso WHERE animal_id = ? AND tenant_id = ? ORDER BY fecha", animalId, vendedor));
        salida.put("vacunas", jdbc.queryForList(
            "SELECT v.nombre, v.enfermedad_prevenida AS \"enfermedadPrevenida\", av.fecha_aplicacion AS \"fechaAplicacion\" "
                + "FROM aplicaciones_vacuna av JOIN vacunas v ON v.id = av.vacuna_id "
                + "WHERE av.animal_id = ? AND av.tenant_id = ? ORDER BY av.fecha_aplicacion DESC LIMIT 20", animalId, vendedor));
        if (esMia) {
            salida.put("ofertas", jdbc.queryForList(
                "SELECT o.id, o.monto_ofertado AS monto, o.estado, o.fecha, o.mensaje, o.comprador_tenant_id AS \"compradorTenantId\", "
                    + "COALESCE(l.nombre_empresa, o.nombre_comprador) AS \"compradorNombre\" "
                    + "FROM ofertas_compra o LEFT JOIN licencias_tenant l ON l.tenant_id = o.comprador_tenant_id "
                    + "WHERE o.publicacion_id = ? AND o.comprador_tenant_id IS NOT NULL ORDER BY o.monto_ofertado DESC, o.fecha", id));
        } else {
            salida.put("misOfertas", jdbc.queryForList(
                "SELECT id, monto_ofertado AS monto, estado, fecha, mensaje, traspasado FROM ofertas_compra "
                    + "WHERE publicacion_id = ? AND comprador_tenant_id = ? ORDER BY fecha DESC", id, yo));
        }
        return salida;
    }

    // ─────────────────────────── publicar ───────────────────────────

    public static class PublicacionRequest {
        public Long animalId;
        public String titulo;
        public BigDecimal precio;
        public String tipoPrecio; // POR_CABEZA, POR_KG
        public String ubicacion;
        public String descripcion;
        public Boolean negociable;
        public List<String> fotos;
        public String miniatura;
    }

    @PostMapping("/publicaciones")
    @Transactional
    public Map<String, Object> publicar(@RequestBody PublicacionRequest req) {
        AuthContext.exigirRol(ROLES_NEGOCIO);
        Long yo = tenantActual();
        if (req.animalId == null) throw new RuntimeException("Elige el animal que vas a publicar");
        validarPrecio(req.precio);
        Map<String, Object> animal = unaFila("SELECT id, estado, arete, raza, peso_actual FROM animales WHERE id = ? AND tenant_id = ?", req.animalId, yo);
        if (animal == null) throw new RuntimeException("Ese animal no está en tu hato");
        if (!"ACTIVO".equals(animal.get("estado"))) throw new RuntimeException("Solo se pueden publicar animales activos");
        Integer yaPublicado = jdbc.queryForObject(
            "SELECT COUNT(*) FROM publicaciones_venta WHERE animal_id = ? AND estado = 'ACTIVA'", Integer.class, req.animalId);
        if (yaPublicado != null && yaPublicado > 0) throw new RuntimeException("Ese animal ya está publicado en el mercado");
        List<String> fotos = validarFotos(req.fotos, req.miniatura);

        String titulo = texto(req.titulo) ? recortar(req.titulo, 120)
            : (animal.get("raza") != null ? animal.get("raza") + " " : "") + "arete " + animal.get("arete");
        KeyHolder llave = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO publicaciones_venta (tenant_id, animal_id, precio_solicitado, descripcion, estado, fecha_publicacion, "
                    + "titulo, tipo_precio, ubicacion, negociable, peso_publicado, miniatura_base64) "
                    + "VALUES (?, ?, ?, ?, 'ACTIVA', ?, ?, ?, ?, ?, ?, ?)", Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, yo);
            ps.setLong(2, req.animalId);
            ps.setBigDecimal(3, req.precio);
            ps.setString(4, recortar(req.descripcion, 2000));
            ps.setObject(5, LocalDate.now());
            ps.setString(6, titulo);
            ps.setString(7, "POR_KG".equals(req.tipoPrecio) ? "POR_KG" : "POR_CABEZA");
            ps.setString(8, recortar(req.ubicacion, 120));
            ps.setBoolean(9, req.negociable == null || req.negociable);
            ps.setBigDecimal(10, (BigDecimal) animal.get("peso_actual"));
            ps.setString(11, req.miniatura);
            return ps;
        }, llave);
        Long id = ((Number) llave.getKeys().get("id")).longValue();
        guardarFotos(id, yo, fotos);
        return detalle(id);
    }

    @PutMapping("/publicaciones/{id:[0-9]+}")
    @Transactional
    public Map<String, Object> editar(@PathVariable Long id, @RequestBody PublicacionRequest req) {
        AuthContext.exigirRol(ROLES_NEGOCIO);
        Map<String, Object> pub = publicacionPropiaActiva(id);
        validarPrecio(req.precio);
        jdbc.update("UPDATE publicaciones_venta SET precio_solicitado = ?, titulo = COALESCE(?, titulo), tipo_precio = ?, ubicacion = ?, "
                + "descripcion = ?, negociable = ? WHERE id = ?",
            req.precio, texto(req.titulo) ? recortar(req.titulo, 120) : null,
            "POR_KG".equals(req.tipoPrecio) ? "POR_KG" : "POR_CABEZA", recortar(req.ubicacion, 120),
            recortar(req.descripcion, 2000), req.negociable == null || req.negociable, id);
        if (req.fotos != null) {
            List<String> fotos = validarFotos(req.fotos, req.miniatura);
            jdbc.update("DELETE FROM mercado_ganado_fotos WHERE publicacion_id = ?", id);
            jdbc.update("UPDATE publicaciones_venta SET miniatura_base64 = ? WHERE id = ?", req.miniatura, id);
            guardarFotos(id, numero(pub.get("tenant_id")), fotos);
        }
        return detalle(id);
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
        Long yo = tenantActual();
        Map<String, Object> pub = unaFila("SELECT id, tenant_id, estado FROM publicaciones_venta WHERE id = ?", id);
        if (pub == null || !"ACTIVA".equals(pub.get("estado"))) throw new RuntimeException("Esta publicación ya no está disponible");
        if (numero(pub.get("tenant_id")).equals(yo)) throw new RuntimeException("No puedes ofertar por tu propio animal");
        validarPrecio(req.monto);
        Integer pendientes = jdbc.queryForObject(
            "SELECT COUNT(*) FROM ofertas_compra WHERE publicacion_id = ? AND comprador_tenant_id = ? AND estado = 'PENDIENTE'",
            Integer.class, id, yo);
        if (pendientes != null && pendientes > 0) {
            jdbc.update("UPDATE ofertas_compra SET estado = 'RETIRADA' WHERE publicacion_id = ? AND comprador_tenant_id = ? AND estado = 'PENDIENTE'", id, yo);
        }
        String finca = nombreFinca(yo);
        jdbc.update("INSERT INTO ofertas_compra (tenant_id, publicacion_id, nombre_comprador, monto_ofertado, estado, fecha, "
                + "comprador_tenant_id, comprador_usuario, mensaje) VALUES (?, ?, ?, ?, 'PENDIENTE', ?, ?, ?, ?)",
            pub.get("tenant_id"), id, finca, req.monto, Timestamp.valueOf(LocalDateTime.now()), yo,
            AuthContext.getUsername(), recortar(req.mensaje, 500));
        String texto = "Oferta de " + dinero(req.monto) + (texto(req.mensaje) ? ": " + req.mensaje.trim() : "");
        insertarMensaje(id, yo, yo, nombreEmisor(yo), recortar(texto, 2000), true);
        return detalle(id);
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
        jdbc.update("UPDATE animales SET estado = 'VENDIDO' WHERE id = (SELECT animal_id FROM publicaciones_venta WHERE id = ?) AND tenant_id = ?", pubId, yo);

        String titulo = String.valueOf(jdbc.queryForObject("SELECT titulo FROM publicaciones_venta WHERE id = ?", String.class, pubId));
        registrarComision(yo, "mercado-ganado-vendedor", ofertaId, monto, "Venta en el mercado: " + titulo + " (1% vendedor)");
        registrarComision(comprador, "mercado-ganado-comprador", ofertaId, monto, "Compra en el mercado: " + titulo + " (1% comprador)");

        insertarMensaje(pubId, comprador, yo, nombreEmisor(yo),
            "Trato cerrado por " + dinero(monto) + ". Ya puedes recibir el animal en tu hato desde el mercado.", true);
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

        Map<String, Object> animal = unaFila(
            "SELECT arete, tipo_identificador, nombre, especie, raza, sexo, tipo_animal, fecha_nacimiento, peso_actual FROM animales WHERE id = ? AND tenant_id = ?",
            oferta.get("animal_id"), oferta.get("vendedor"));
        if (animal == null) throw new RuntimeException("El vendedor ya no tiene el registro de este animal");

        String arete = String.valueOf(animal.get("arete"));
        Integer repetido = jdbc.queryForObject("SELECT COUNT(*) FROM animales WHERE tenant_id = ? AND arete = ?", Integer.class, yo, arete);
        if (repetido != null && repetido > 0) arete = arete + "-M" + oferta.get("publicacion_id");
        final String areteFinal = arete;

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
            ps.setBigDecimal(11, (BigDecimal) oferta.get("monto_ofertado"));
            return ps;
        }, llave);
        Long nuevoId = ((Number) llave.getKeys().get("id")).longValue();
        jdbc.update("INSERT INTO registros_peso (tenant_id, animal_id, fecha, peso_kg) "
                + "SELECT ?, ?, fecha, peso_kg FROM registros_peso WHERE animal_id = ? AND tenant_id = ?",
            yo, nuevoId, oferta.get("animal_id"), oferta.get("vendedor"));
        jdbc.update("UPDATE ofertas_compra SET traspasado = TRUE WHERE id = ?", ofertaId);

        Long pubId = numero(oferta.get("publicacion_id"));
        insertarMensaje(pubId, yo, yo, nombreEmisor(yo), "Animal recibido en el hato con el arete " + areteFinal + ".", true);
        Map<String, Object> salida = detalle(pubId);
        salida.put("animalRecibidoId", nuevoId);
        return salida;
    }

    // ─────────────────────────── chat ───────────────────────────

    /** Conversaciones de mi finca, como vendedora o como compradora. */
    @GetMapping("/conversaciones")
    public List<Map<String, Object>> conversaciones() {
        Long yo = tenantActual();
        return jdbc.queryForList(
            "SELECT m.publicacion_id AS \"publicacionId\", m.comprador_tenant_id AS \"compradorTenantId\", p.titulo, p.estado, "
                + "p.miniatura_base64 AS miniatura, p.tenant_id = ? AS \"soyVendedor\", "
                + "CASE WHEN p.tenant_id = ? THEN lc.nombre_empresa ELSE lv.nombre_empresa END AS \"otraFinca\", "
                + "MAX(m.fecha) AS \"ultimaFecha\", "
                + "(ARRAY_AGG(m.contenido ORDER BY m.fecha DESC))[1] AS \"ultimoMensaje\", "
                + "COUNT(*) FILTER (WHERE m.emisor_tenant_id <> ? AND NOT m.leido) AS \"sinLeer\" "
                + "FROM mercado_ganado_mensajes m JOIN publicaciones_venta p ON p.id = m.publicacion_id "
                + "LEFT JOIN licencias_tenant lc ON lc.tenant_id = m.comprador_tenant_id "
                + "LEFT JOIN licencias_tenant lv ON lv.tenant_id = p.tenant_id "
                + "WHERE p.tenant_id = ? OR m.comprador_tenant_id = ? "
                + "GROUP BY m.publicacion_id, m.comprador_tenant_id, p.titulo, p.estado, p.miniatura_base64, p.tenant_id, lc.nombre_empresa, lv.nombre_empresa "
                + "ORDER BY MAX(m.fecha) DESC",
            yo, yo, yo, yo, yo);
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
    public List<Map<String, Object>> mensajes(@PathVariable Long id, @RequestParam(required = false) Long comprador) {
        Long yo = tenantActual();
        Long compradorConv = compradorDeConversacion(id, comprador);
        jdbc.update("UPDATE mercado_ganado_mensajes SET leido = TRUE WHERE publicacion_id = ? AND comprador_tenant_id = ? AND emisor_tenant_id <> ? AND NOT leido",
            id, compradorConv, yo);
        return jdbc.queryForList(
            "SELECT id, emisor_tenant_id = ? AS \"esMio\", emisor_nombre AS \"emisorNombre\", contenido, es_sistema AS \"esSistema\", fecha "
                + "FROM mercado_ganado_mensajes WHERE publicacion_id = ? AND comprador_tenant_id = ? ORDER BY fecha, id",
            yo, id, compradorConv);
    }

    public static class MensajeRequest {
        public String contenido;
        public Long comprador;
    }

    @PostMapping("/publicaciones/{id:[0-9]+}/mensajes")
    public List<Map<String, Object>> enviarMensaje(@PathVariable Long id, @RequestBody MensajeRequest req) {
        AuthContext.exigirRol(ROLES_NEGOCIO);
        if (!texto(req.contenido)) throw new RuntimeException("Escribe un mensaje");
        Long yo = tenantActual();
        Long compradorConv = compradorDeConversacion(id, req.comprador);
        Map<String, Object> pub = unaFila("SELECT estado, tenant_id FROM publicaciones_venta WHERE id = ?", id);
        boolean soyVendedor = numero(pub.get("tenant_id")).equals(yo);
        if (!soyVendedor && !"ACTIVA".equals(pub.get("estado"))) {
            Integer participo = jdbc.queryForObject(
                "SELECT COUNT(*) FROM mercado_ganado_mensajes WHERE publicacion_id = ? AND comprador_tenant_id = ?", Integer.class, id, yo);
            if (participo == null || participo == 0) throw new RuntimeException("Esta publicación ya no está disponible");
        }
        insertarMensaje(id, compradorConv, yo, nombreEmisor(yo), recortar(req.contenido.trim(), 2000), false);
        return mensajes(id, compradorConv);
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

    // ─────────────────────────── utilidades ───────────────────────────

    private static final String SELECT_TARJETA =
        "SELECT p.id, p.tenant_id, p.animal_id, p.titulo, p.precio_solicitado, p.tipo_precio, p.ubicacion, p.negociable, p.estado, "
            + "p.fecha_publicacion, p.descripcion, p.miniatura_base64, p.precio_final, p.fecha_cierre, "
            + "COALESCE(p.peso_publicado, a.peso_actual) AS peso, a.raza, a.sexo, a.tipo_animal, a.fecha_nacimiento, a.arete, "
            + "l.nombre_empresa AS finca, p.tenant_id = ? AS es_mia, "
            + "(SELECT COUNT(*) FROM ofertas_compra o WHERE o.publicacion_id = p.id AND o.estado = 'PENDIENTE' AND o.comprador_tenant_id IS NOT NULL) AS ofertas_pendientes, "
            + "(SELECT COUNT(*) FROM mercado_ganado_fotos f WHERE f.publicacion_id = p.id) AS total_fotos "
            + "FROM publicaciones_venta p JOIN animales a ON a.id = p.animal_id JOIN licencias_tenant l ON l.tenant_id = p.tenant_id";

    private Map<String, Object> tarjeta(Map<String, Object> f) {
        Map<String, Object> t = new LinkedHashMap<>();
        t.put("id", f.get("id"));
        t.put("titulo", f.get("titulo"));
        t.put("precio", f.get("precio_solicitado"));
        t.put("tipoPrecio", f.get("tipo_precio"));
        t.put("ubicacion", f.get("ubicacion"));
        t.put("negociable", f.get("negociable"));
        t.put("estado", f.get("estado"));
        t.put("fechaPublicacion", f.get("fecha_publicacion"));
        t.put("miniatura", f.get("miniatura_base64"));
        t.put("peso", f.get("peso"));
        t.put("raza", f.get("raza"));
        t.put("sexo", f.get("sexo"));
        t.put("tipoAnimal", f.get("tipo_animal"));
        t.put("arete", f.get("arete"));
        t.put("edadMeses", f.get("fecha_nacimiento") == null ? null
            : ChronoUnit.MONTHS.between(((java.sql.Date) f.get("fecha_nacimiento")).toLocalDate(), LocalDate.now()));
        t.put("finca", f.get("finca"));
        t.put("esMia", f.get("es_mia"));
        t.put("ofertasPendientes", f.get("ofertas_pendientes"));
        t.put("totalFotos", f.get("total_fotos"));
        t.put("precioFinal", f.get("precio_final"));
        t.put("fechaCierre", f.get("fecha_cierre"));
        return t;
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
    private Long compradorDeConversacion(Long publicacionId, Long compradorPedido) {
        Long yo = tenantActual();
        Map<String, Object> pub = unaFila("SELECT tenant_id, estado FROM publicaciones_venta WHERE id = ?", publicacionId);
        if (pub == null) throw new RuntimeException("Publicación no encontrada");
        if (numero(pub.get("tenant_id")).equals(yo)) {
            if (compradorPedido == null) throw new RuntimeException("Indica con qué finca es la conversación");
            // El vendedor solo responde a fincas que ya le escribieron u ofertaron; no puede abrir chats a cualquiera.
            Boolean existe = jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM mercado_ganado_mensajes WHERE publicacion_id = ? AND comprador_tenant_id = ?) "
                    + "OR EXISTS (SELECT 1 FROM ofertas_compra WHERE publicacion_id = ? AND comprador_tenant_id = ?)",
                Boolean.class, publicacionId, compradorPedido, publicacionId, compradorPedido);
            if (!Boolean.TRUE.equals(existe)) throw new RuntimeException("Conversación no encontrada");
            return compradorPedido;
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

    /** "Juan Pérez · Hacienda El Samán": quién escribe y de qué finca. */
    private String nombreEmisor(Long tenantId) {
        List<String> n = jdbc.queryForList("SELECT nombre_completo FROM usuarios WHERE tenant_id = ? AND username = ?",
            String.class, tenantId, AuthContext.getUsername());
        String persona = n.isEmpty() || n.get(0) == null ? AuthContext.getUsername() : n.get(0);
        String finca = nombreFinca(tenantId);
        if (persona == null || persona.isBlank() || persona.trim().equalsIgnoreCase(finca.trim())) return recortar(finca, 120);
        return recortar(persona.trim() + " · " + finca, 120);
    }

    private Long tenantActual() {
        Long t = TenantContext.getCurrentTenant();
        if (t == null) throw new RuntimeException("Sesión sin finca");
        return t;
    }

    private Map<String, Object> unaFila(String sql, Object... params) {
        List<Map<String, Object>> filas = jdbc.queryForList(sql, params);
        return filas.isEmpty() ? null : filas.get(0);
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
