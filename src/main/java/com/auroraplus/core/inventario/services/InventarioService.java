package com.auroraplus.core.inventario.services;

import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.Kardex;
import com.auroraplus.core.inventario.entities.LoteArticulo;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.inventario.repositories.KardexRepository;
import com.auroraplus.core.inventario.repositories.LoteArticuloRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;

@Service
public class InventarioService {

    @Autowired
    private ArticuloRepository articuloRepository;

    @Autowired
    private KardexRepository kardexRepository;

    @Autowired
    private LoteArticuloRepository loteArticuloRepository;

    @Transactional
    public Kardex registrarMovimientoKardex(Long articuloId, Long tenantId, Kardex.TipoOperacion tipo, BigDecimal cantidad, BigDecimal costo, String motivo) {

        Articulo articulo = articuloRepository.findById(articuloId)
            .orElseThrow(() -> new RuntimeException("Artículo no encontrado"));

        if (!articulo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
        }

        if (tipo == Kardex.TipoOperacion.ENTRADA) {
            articulo.setStockActual(articulo.getStockActual().add(cantidad));
        } else {
            if (articulo.getStockActual().compareTo(cantidad) < 0) {
                throw new RuntimeException("Stock insuficiente para procesar la salida/merma");
            }
            articulo.setStockActual(articulo.getStockActual().subtract(cantidad));
            // FEFO: cada venta o merma descuenta primero del lote con la
            // fecha de vencimiento más próxima, no de "el stock" en general
            // — así un lote que se agota deja de figurar en las alertas de
            // vencimiento de inmediato, en vez de seguir "por vencer" con
            // cantidad fantasma que ya se vendió.
            descontarPorLoteFefo(articulo, tenantId, cantidad);
        }
        articuloRepository.save(articulo);

        Kardex movimiento = new Kardex();
        movimiento.setTenantId(tenantId);
        movimiento.setArticulo(articulo);
        movimiento.setTipoOperacion(tipo);
        movimiento.setCantidad(cantidad);
        movimiento.setCostoUnitario(costo);
        movimiento.setMotivo(motivo);

        return kardexRepository.save(movimiento);
    }

    /**
     * Descuenta `cantidad` de los lotes de este artículo que todavía tienen
     * saldo, en orden FEFO (el que vence más pronto primero; los sin fecha
     * de vencimiento al final). Si los lotes registrados no alcanzan a
     * cubrir toda la cantidad (ej. venta de stock que nunca se registró por
     * lote), se descuenta lo que haya y el resto simplemente no tiene lote
     * asociado — Articulo.stockActual, ya ajustado arriba, sigue siendo la
     * fuente de verdad de cuánto hay en total.
     */
    private void descontarPorLoteFefo(Articulo articulo, Long tenantId, BigDecimal cantidad) {
        List<LoteArticulo> lotes = loteArticuloRepository.findConSaldoParaConsumirFefo(articulo.getId(), tenantId);
        BigDecimal restante = cantidad;
        for (LoteArticulo lote : lotes) {
            if (restante.compareTo(BigDecimal.ZERO) <= 0) break;
            BigDecimal saldoLote = lote.getCantidadActual() != null ? lote.getCantidadActual() : lote.getCantidadIngresada();
            if (saldoLote.compareTo(BigDecimal.ZERO) <= 0) continue;
            BigDecimal aDescontar = saldoLote.min(restante);
            lote.setCantidadActual(saldoLote.subtract(aDescontar));
            loteArticuloRepository.save(lote);
            restante = restante.subtract(aDescontar);
        }
    }
}
