package com.auroraplus.modules.horeca.services;

import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.Kardex;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.inventario.services.InventarioService;
import com.auroraplus.modules.horeca.entities.FastBarTrago;
import com.auroraplus.modules.horeca.repositories.FastBarTragoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;

@Service
public class FastBarService {

    @Autowired
    private FastBarTragoRepository fastBarTragoRepository;

    @Autowired
    private ArticuloRepository articuloRepository;

    @Autowired
    private InventarioService inventarioService;

    /**
     * Venta rápida "en un clic" de un trago del Fast-Bar: descuenta de forma fraccionada
     * (mililitros) la botella asociada en inventario y devuelve el monto a cobrar.
     */
    @Transactional
    public BigDecimal venderTragoRapido(Long fastBarTragoId, Long tenantId, Integer cantidadTragos) {
        if (cantidadTragos == null || cantidadTragos <= 0) {
            throw new RuntimeException("La cantidad de tragos debe ser mayor a cero");
        }

        FastBarTrago trago = fastBarTragoRepository.findById(fastBarTragoId)
            .orElseThrow(() -> new RuntimeException("Trago de Fast-Bar no encontrado"));

        if (!trago.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Trago no pertenece a este tenant");
        }

        Articulo botella = articuloRepository.findBySkuAndTenantId(trago.getBotellaSku(), tenantId)
            .orElseThrow(() -> new RuntimeException("Botella no encontrada en inventario: " + trago.getBotellaSku()));

        BigDecimal mililitrosADescontar = trago.getMililitrosPorTrago().multiply(BigDecimal.valueOf(cantidadTragos));

        inventarioService.registrarMovimientoKardex(
            botella.getId(),
            tenantId,
            Kardex.TipoOperacion.SALIDA,
            mililitrosADescontar,
            botella.getCostoUnitario(),
            "Venta rápida Fast-Bar: " + trago.getNombreTrago());

        return trago.getPrecioVenta().multiply(BigDecimal.valueOf(cantidadTragos));
    }
}
