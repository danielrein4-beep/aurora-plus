package com.auroraplus.modules.repuestos.services;

import com.auroraplus.modules.repuestos.entities.OrdenCompraSugerida;
import com.auroraplus.modules.repuestos.entities.RepuestoItem;
import com.auroraplus.modules.repuestos.repositories.OrdenCompraSugeridaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Smart Restocking: se llama desde RepuestoConversionService justo después de
 * descontar stock por una venta. No manda correos ni notifica al proveedor —
 * solo dibuja un borrador para que el administrador lo revise cuando quiera
 * (ver la regla del negocio: "solo crear el borrador... para que el
 * administrador lo apruebe después").
 */
@Service
public class OrdenCompraSugeridaService {

    private static final Logger log = LoggerFactory.getLogger(OrdenCompraSugeridaService.class);

    @Autowired
    private OrdenCompraSugeridaRepository ordenCompraSugeridaRepository;

    /**
     * Sugiere reponer el doble de la brecha entre el mínimo y el stock actual
     * (heurística simple y explicable: cubre el mínimo configurado más un
     * colchón igual, en vez de dejar al negocio otra vez justo en el límite).
     */
    @Transactional
    public void generarBorradorSiAplica(RepuestoItem repuesto) {
        if (repuesto.getStockActual().compareTo(repuesto.getStockMinimo()) >= 0) return;

        boolean yaHayBorrador = ordenCompraSugeridaRepository
            .findFirstByTenantIdAndRepuestoIdAndEstado(repuesto.getTenantId(), repuesto.getId(), OrdenCompraSugerida.Estado.BORRADOR)
            .isPresent();
        if (yaHayBorrador) return;

        BigDecimal brecha = repuesto.getStockMinimo().subtract(repuesto.getStockActual());
        BigDecimal cantidadSugerida = repuesto.getStockMinimo().add(brecha);

        OrdenCompraSugerida orden = new OrdenCompraSugerida();
        orden.setTenantId(repuesto.getTenantId());
        orden.setRepuestoId(repuesto.getId());
        orden.setProveedorId(repuesto.getProveedorPrincipalId());
        orden.setCantidadSugerida(cantidadSugerida);
        orden.setMotivo("Stock (" + repuesto.getStockActual() + " " + repuesto.getUnidadBase()
            + ") por debajo del mínimo configurado (" + repuesto.getStockMinimo() + ") tras una venta.");
        ordenCompraSugeridaRepository.save(orden);

        log.info("Borrador de orden de compra generado para repuesto {} (tenant {}): sugerido {} {}",
            repuesto.getId(), repuesto.getTenantId(), cantidadSugerida, repuesto.getUnidadBase());
    }
}
