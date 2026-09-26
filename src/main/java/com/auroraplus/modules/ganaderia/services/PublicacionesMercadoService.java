package com.auroraplus.modules.ganaderia.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Mantiene el Mercado Ganadero al día con el hato: cuando un animal sale (venta directa, muerte,
 * robo o cambio manual de estado), sus publicaciones activas se retiran y las ofertas pendientes
 * se rechazan. Sin esto, un animal vendido o muerto seguía publicado y se podía vender otra vez,
 * con su cuenta por cobrar y su comisión duplicadas.
 */
@Service
public class PublicacionesMercadoService {

    @Autowired
    private JdbcTemplate jdbc;

    /** Las tablas del Mercado no tienen entidad JPA: en la base en memoria de las pruebas no existen. */
    private volatile Boolean hayMercado;

    private boolean hayMercado() {
        if (hayMercado == null) {
            hayMercado = Boolean.TRUE.equals(jdbc.execute((java.sql.Connection c) ->
                existeTabla(c, "publicaciones_venta") && existeTabla(c, "mercado_ganado_lote_animales")));
        }
        return hayMercado;
    }

    private static boolean existeTabla(java.sql.Connection c, String nombre) throws java.sql.SQLException {
        for (String n : new String[] {nombre, nombre.toUpperCase()}) {
            try (java.sql.ResultSet rs = c.getMetaData().getTables(null, null, n, null)) {
                if (rs.next()) return true;
            }
        }
        return false;
    }

    public void retirarPublicacionesDe(Long tenantId, Long animalId) {
        if (!hayMercado()) return;
        List<Long> ids = jdbc.queryForList(
            "SELECT p.id FROM publicaciones_venta p WHERE p.tenant_id = ? AND p.estado = 'ACTIVA' AND (p.animal_id = ? "
                + "OR EXISTS (SELECT 1 FROM mercado_ganado_lote_animales la WHERE la.publicacion_id = p.id AND la.animal_id = ?))",
            Long.class, tenantId, animalId, animalId);
        for (Long id : ids) {
            jdbc.update("UPDATE publicaciones_venta SET estado = 'RETIRADA', fecha_cierre = ? WHERE id = ? AND estado = 'ACTIVA'",
                Timestamp.valueOf(LocalDateTime.now()), id);
            jdbc.update("UPDATE ofertas_compra SET estado = 'RECHAZADA' WHERE publicacion_id = ? AND estado = 'PENDIENTE'", id);
        }
    }
}
