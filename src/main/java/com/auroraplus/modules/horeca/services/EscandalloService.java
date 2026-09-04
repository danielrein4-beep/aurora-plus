package com.auroraplus.modules.horeca.services;

import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.Kardex;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.inventario.services.InventarioService;
import com.auroraplus.modules.horeca.entities.DetalleReceta;
import com.auroraplus.modules.horeca.entities.EscandalloReceta;
import com.auroraplus.modules.horeca.repositories.DetalleRecetaRepository;
import com.auroraplus.modules.horeca.repositories.EscandalloRecetaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class EscandalloService {

    @Autowired
    private EscandalloRecetaRepository escandalloRecetaRepository;

    @Autowired
    private DetalleRecetaRepository detalleRecetaRepository;

    @Autowired
    private ArticuloRepository articuloRepository;

    @Autowired
    private InventarioService inventarioService;

    /** Calcula cantidadRequerida (bruto) a partir de pesoNeto + porcentajeMerma, si se informaron ambos. */
    public BigDecimal calcularCantidadBruta(BigDecimal pesoNeto, BigDecimal porcentajeMerma) {
        if (pesoNeto == null || porcentajeMerma == null) return null;
        if (porcentajeMerma.compareTo(new BigDecimal("100")) >= 0) {
            throw new RuntimeException("El porcentaje de merma debe ser menor a 100");
        }
        BigDecimal factorRendimiento = BigDecimal.ONE.subtract(porcentajeMerma.divide(new BigDecimal("100"), 6, RoundingMode.HALF_UP));
        return pesoNeto.divide(factorRendimiento, 4, RoundingMode.HALF_UP);
    }

    /**
     * Recalcula costoTotalProduccion desde el costo ACTUAL de cada ingrediente
     * (costeo por gramos dinámico): si el proveedor sube el precio de un
     * insumo, este método refleja el nuevo costo real del plato sin que nadie
     * tenga que editarlo a mano. Recorre sub-recetas en cascada: el costo de
     * una sub-receta se recalcula primero (recursivo) y su costo total se
     * multiplica por la cantidad que de ella usa el plato padre.
     */
    @Transactional
    public EscandalloReceta recalcularCosto(Long escandalloId, Long tenantId) {
        return recalcularCosto(escandalloId, tenantId, new HashSet<>());
    }

    /**
     * `visitados` marca la RUTA actual de la recursión (ancestros), no "todo lo
     * ya visto" — se quita al salir de cada rama (backtracking). Así una misma
     * sub-receta reutilizada en dos ramas distintas (legítimo: ej. "salsa base"
     * usada en dos platos distintos que a su vez usa el mismo plato) no se
     * confunde con un ciclo real (una receta que se referencia a sí misma).
     */
    private EscandalloReceta recalcularCosto(Long escandalloId, Long tenantId, Set<Long> visitados) {
        if (!visitados.add(escandalloId)) {
            throw new RuntimeException("Referencia circular de sub-recetas detectada en el escandallo " + escandalloId);
        }
        try {
            EscandalloReceta escandallo = escandalloRecetaRepository.findById(escandalloId)
                .orElseThrow(() -> new RuntimeException("Escandallo no encontrado"));
            if (!escandallo.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Escandallo no pertenece a este tenant");
            }

            List<DetalleReceta> ingredientes = detalleRecetaRepository.findByEscandalloId(escandalloId);
            BigDecimal costoTotal = BigDecimal.ZERO;
            for (DetalleReceta detalle : ingredientes) {
                if (detalle.getSubReceta() != null) {
                    EscandalloReceta subRecalculada = recalcularCosto(detalle.getSubReceta().getId(), tenantId, visitados);
                    costoTotal = costoTotal.add(detalle.getCantidadRequerida().multiply(subRecalculada.getCostoTotalProduccion()));
                } else {
                    Articulo articulo = articuloRepository.findBySkuAndTenantId(detalle.getIngredienteSku(), tenantId)
                        .orElseThrow(() -> new RuntimeException("Ingrediente no encontrado en inventario: " + detalle.getIngredienteSku()));
                    costoTotal = costoTotal.add(detalle.getCantidadRequerida().multiply(articulo.getCostoUnitario()));
                }
            }

            escandallo.setCostoTotalProduccion(costoTotal);
            return escandalloRecetaRepository.save(escandallo);
        } finally {
            visitados.remove(escandalloId);
        }
    }

    /**
     * Al registrar la venta de un plato, recorre su escandallo y descuenta de
     * forma fraccionada (gramos/mililitros) el inventario de cada ingrediente
     * directo — y, si una línea es una sub-receta, EXPLOTA en cascada hacia
     * sus propios ingredientes (recursivo), multiplicando cantidades a medida
     * que baja de nivel. El control de mermas queda garantizado por
     * InventarioService, que rechaza la salida si el stock es insuficiente.
     * También refresca el costo dinámico de todo el árbol de recetas
     * involucrado.
     */
    @Transactional
    public BigDecimal registrarVentaPlato(Long escandalloId, Long tenantId, Integer cantidadVendida) {
        if (cantidadVendida == null || cantidadVendida <= 0) {
            throw new RuntimeException("La cantidad vendida debe ser mayor a cero");
        }

        EscandalloReceta escandallo = escandalloRecetaRepository.findById(escandalloId)
            .orElseThrow(() -> new RuntimeException("Escandallo no encontrado"));
        if (!escandallo.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Escandallo no pertenece a este tenant");
        }

        BigDecimal costoTotalConsumido = explotarIngredientes(escandallo, BigDecimal.valueOf(cantidadVendida), tenantId,
            "Consumo por venta de plato: " + escandallo.getNombrePlato(), new HashSet<>());

        recalcularCosto(escandalloId, tenantId);

        return costoTotalConsumido;
    }

    /**
     * Descuenta del inventario cada línea de un escandallo multiplicada por
     * `factor` (cuántas veces se está preparando esa receta). Si una línea es
     * una sub-receta, se llama recursivamente con factor = factor *
     * cantidadRequerida-de-esa-línea, propagando la explosión hasta llegar a
     * artículos reales. `visitados` detecta ciclos (una sub-receta que se
     * referencia a sí misma directa o indirectamente).
     */
    private BigDecimal explotarIngredientes(EscandalloReceta escandallo, BigDecimal factor, Long tenantId, String motivo, Set<Long> visitados) {
        if (!visitados.add(escandallo.getId())) {
            throw new RuntimeException("Referencia circular de sub-recetas detectada en el escandallo " + escandallo.getId());
        }
        try {
            List<DetalleReceta> ingredientes = detalleRecetaRepository.findByEscandalloId(escandallo.getId());
            if (ingredientes.isEmpty()) {
                throw new RuntimeException("El escandallo '" + escandallo.getNombrePlato() + "' no tiene ingredientes configurados");
            }

            BigDecimal costoTotal = BigDecimal.ZERO;

            for (DetalleReceta detalle : ingredientes) {
                BigDecimal cantidadEfectiva = detalle.getCantidadRequerida().multiply(factor);

                if (detalle.getSubReceta() != null) {
                    costoTotal = costoTotal.add(
                        explotarIngredientes(detalle.getSubReceta(), cantidadEfectiva, tenantId, motivo, visitados));
                } else {
                    Articulo articulo = articuloRepository.findBySkuAndTenantId(detalle.getIngredienteSku(), tenantId)
                        .orElseThrow(() -> new RuntimeException("Ingrediente no encontrado en inventario: " + detalle.getIngredienteSku()));

                    BigDecimal costoConsumido = cantidadEfectiva.multiply(articulo.getCostoUnitario());
                    costoTotal = costoTotal.add(costoConsumido);

                    inventarioService.registrarMovimientoKardex(
                        articulo.getId(), tenantId, Kardex.TipoOperacion.SALIDA,
                        cantidadEfectiva, articulo.getCostoUnitario(), motivo);
                }
            }

            return costoTotal;
        } finally {
            visitados.remove(escandallo.getId());
        }
    }
}
