package com.auroraplus.modules.horeca.repositories;

import com.auroraplus.modules.horeca.entities.Comanda;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

/**
 * Specifications reutilizables sobre Comanda para el motor de filtrado del
 * módulo de Reportes Operativos — cada filtro es opcional (si el parámetro
 * viene nulo, esa condición simplemente no se agrega al WHERE), así el
 * mismo query se arma dinámico según lo que el usuario haya seleccionado en
 * el panel de filtros, sin un método de repositorio por cada combinación.
 */
public final class ComandaSpecifications {

    private ComandaSpecifications() {}

    public static Specification<Comanda> deTenant(Long tenantId) {
        return (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
    }

    public static Specification<Comanda> conEstado(Comanda.EstadoComanda estado) {
        return (root, query, cb) -> estado == null ? null : cb.equal(root.get("estado"), estado);
    }

    public static Specification<Comanda> conMetodoPago(String metodoPago) {
        return (root, query, cb) -> (metodoPago == null || metodoPago.isBlank()) ? null : cb.equal(root.get("metodoPago"), metodoPago);
    }

    public static Specification<Comanda> conFechaCierreEntre(LocalDateTime desde, LocalDateTime hasta) {
        return (root, query, cb) -> {
            if (desde == null && hasta == null) return null;
            if (desde != null && hasta != null) return cb.between(root.get("fechaCierre"), desde, hasta);
            if (desde != null) return cb.greaterThanOrEqualTo(root.get("fechaCierre"), desde);
            return cb.lessThanOrEqualTo(root.get("fechaCierre"), hasta);
        };
    }
}
