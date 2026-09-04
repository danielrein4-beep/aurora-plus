package com.auroraplus.core.inventario.services;

import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.Kardex;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.inventario.repositories.KardexRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;

@Service
public class InventarioService {

    @Autowired
    private ArticuloRepository articuloRepository;

    @Autowired
    private KardexRepository kardexRepository;

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
}
