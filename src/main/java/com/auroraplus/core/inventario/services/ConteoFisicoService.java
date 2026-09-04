package com.auroraplus.core.inventario.services;

import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.ConteoFisico;
import com.auroraplus.core.inventario.entities.DetalleConteoFisico;
import com.auroraplus.core.inventario.entities.Kardex;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.inventario.repositories.ConteoFisicoRepository;
import com.auroraplus.core.inventario.repositories.DetalleConteoFisicoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/** Conteo físico ciego del inventario, con ajuste automático del stock del sistema al cerrar. */
@Service
public class ConteoFisicoService {

    @Autowired
    private ConteoFisicoRepository conteoFisicoRepository;

    @Autowired
    private DetalleConteoFisicoRepository detalleConteoFisicoRepository;

    @Autowired
    private ArticuloRepository articuloRepository;

    @Autowired
    private InventarioService inventarioService;

    @Transactional
    public ConteoFisico iniciarConteo(Long tenantId, String responsable) {
        ConteoFisico conteo = new ConteoFisico();
        conteo.setTenantId(tenantId);
        conteo.setResponsable(responsable);
        conteo.setEstado("ABIERTO");
        conteo.setFechaInicio(LocalDateTime.now());
        return conteoFisicoRepository.save(conteo);
    }

    /**
     * Registra (o corrige, si ya se contó) lo que el responsable encontró
     * físicamente de un artículo. El stock teórico se congela en ESTE momento
     * (snapshot), no se recalcula después — es la foto contra la que se mide
     * la brecha, aunque el sistema siga vendiendo mientras dura el conteo.
     */
    @Transactional
    public DetalleConteoFisico registrarConteoArticulo(Long conteoId, Long tenantId, Long articuloId, BigDecimal stockFisicoContado) {
        ConteoFisico conteo = conteoFisicoRepository.findById(conteoId)
            .orElseThrow(() -> new RuntimeException("Conteo no encontrado"));
        if (!conteo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Conteo no pertenece a este tenant");
        }
        if (!"ABIERTO".equals(conteo.getEstado())) {
            throw new RuntimeException("El conteo ya está cerrado");
        }
        if (stockFisicoContado == null || stockFisicoContado.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("El stock físico contado no puede ser negativo");
        }

        Articulo articulo = articuloRepository.findById(articuloId)
            .orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
        if (!articulo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
        }

        Optional<DetalleConteoFisico> existente = detalleConteoFisicoRepository.findByConteoIdAndArticuloId(conteoId, articuloId);
        DetalleConteoFisico detalle = existente.orElseGet(DetalleConteoFisico::new);
        if (existente.isEmpty()) {
            detalle.setTenantId(tenantId);
            detalle.setArticulo(articulo);
            detalle.setStockTeorico(articulo.getStockActual());
            conteo.addDetalle(detalle);
        }
        detalle.setStockFisicoContado(stockFisicoContado);

        return detalleConteoFisicoRepository.save(detalle);
    }

    /**
     * Cierra el conteo: por cada línea con brecha, ajusta el stock del
     * sistema al valor físico real vía un movimiento de Kardex (MERMA si
     * faltó, ENTRADA si sobró) — así el inventario teórico vuelve a coincidir
     * con la realidad del estante.
     */
    @Transactional
    public ConteoFisico cerrarConteo(Long conteoId, Long tenantId) {
        ConteoFisico conteo = conteoFisicoRepository.findById(conteoId)
            .orElseThrow(() -> new RuntimeException("Conteo no encontrado"));
        if (!conteo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Conteo no pertenece a este tenant");
        }
        if (!"ABIERTO".equals(conteo.getEstado())) {
            throw new RuntimeException("El conteo ya está cerrado");
        }

        List<DetalleConteoFisico> detalles = detalleConteoFisicoRepository.findByConteoId(conteoId);
        if (detalles.isEmpty()) {
            throw new RuntimeException("El conteo no tiene ningún artículo registrado");
        }

        for (DetalleConteoFisico detalle : detalles) {
            BigDecimal brecha = detalle.getBrecha();
            if (brecha.compareTo(BigDecimal.ZERO) == 0) continue;

            Articulo articulo = detalle.getArticulo();
            if (brecha.compareTo(BigDecimal.ZERO) < 0) {
                inventarioService.registrarMovimientoKardex(articulo.getId(), tenantId, Kardex.TipoOperacion.MERMA,
                    brecha.abs(), articulo.getCostoUnitario(), "Ajuste por conteo físico #" + conteoId + " — faltante");
            } else {
                inventarioService.registrarMovimientoKardex(articulo.getId(), tenantId, Kardex.TipoOperacion.ENTRADA,
                    brecha, articulo.getCostoUnitario(), "Ajuste por conteo físico #" + conteoId + " — sobrante");
            }
        }

        conteo.setEstado("CERRADO");
        conteo.setFechaCierre(LocalDateTime.now());
        return conteoFisicoRepository.save(conteo);
    }
}
