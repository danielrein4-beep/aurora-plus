package com.auroraplus.modules.horeca.services;

import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.DetalleReceta;
import com.auroraplus.modules.horeca.entities.EscandalloReceta;
import com.auroraplus.modules.horeca.entities.FastBarTrago;
import com.auroraplus.modules.horeca.repositories.DetalleRecetaRepository;
import com.auroraplus.modules.horeca.repositories.EscandalloRecetaRepository;
import com.auroraplus.modules.horeca.repositories.FastBarTragoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Componente de prueba de estrés y validación (Subfase 4.4) que simula el flujo
 * operativo completo de un establecimiento piloto tipo "L'Apéritif": apertura de
 * comandas para tablas de charcutería (con descuento fraccionado de escandallo)
 * y transacciones de barra rápida (Fast-Bar), midiendo estabilidad bajo volumen.
 */
@Service
public class SimulacionHorecaPilotoService {

    @Autowired
    private HorecaService horecaService;

    @Autowired
    private EscandalloService escandalloService;

    @Autowired
    private FastBarService fastBarService;

    @Autowired
    private ArticuloRepository articuloRepository;

    @Autowired
    private EscandalloRecetaRepository escandalloRecetaRepository;

    @Autowired
    private DetalleRecetaRepository detalleRecetaRepository;

    @Autowired
    private FastBarTragoRepository fastBarTragoRepository;

    public ResultadoSimulacionHoreca ejecutarSimulacionPiloto(Long tenantId, int cantidadTransacciones) {
        DatosPiloto datos = prepararDatosPiloto(tenantId);
        ResultadoSimulacionHoreca resultado = new ResultadoSimulacionHoreca();

        for (int i = 1; i <= cantidadTransacciones; i++) {
            try {
                // 1. Apertura de comanda para mesa de charcutería
                Comanda comanda = horecaService.aperturarComanda(tenantId, 1 + (i % 20), "Mesero-" + (1 + i % 6));

                // 2. Registrar el ítem en cocina fría — agregarItemComanda ahora explota el
                // escandallo y descuenta el inventario internamente (antes esto se hacía
                // aparte, desconectado del flujo real de comanda; ya está corregido).
                horecaService.agregarItemComanda(comanda.getId(), tenantId, datos.escandalloId, null,
                    null, 1, new BigDecimal("18.00"));
                resultado.totalCostoInsumosConsumidos = resultado.totalCostoInsumosConsumidos.add(
                    escandalloRecetaRepository.findById(datos.escandalloId).orElseThrow().getCostoTotalProduccion());

                horecaService.cerrarComanda(comanda.getId(), tenantId, "EFECTIVO");
                resultado.totalVentasComandas = resultado.totalVentasComandas.add(new BigDecimal("18.00"));

                // 3. Transacción en barra (Fast-Bar)
                int cantidadTragos = 1 + (i % 3);
                BigDecimal montoFastBar = fastBarService.venderTragoRapido(datos.fastBarTragoId, tenantId, cantidadTragos);
                resultado.totalVentasFastBar = resultado.totalVentasFastBar.add(montoFastBar);

                resultado.transaccionesExitosas++;
            } catch (RuntimeException ex) {
                resultado.transaccionesFallidas++;
            }
        }

        return resultado;
    }

    /**
     * Crea (si no existen) los insumos, el escandallo y el trago de Fast-Bar
     * necesarios para que la simulación pueda ejercitar el descuento fraccionado
     * real de inventario, en lugar de depender de datos precargados manualmente.
     */
    private DatosPiloto prepararDatosPiloto(Long tenantId) {
        Articulo jamon = articuloRepository.findBySkuAndTenantId("ING-JAMON-SERRANO", tenantId)
            .orElseGet(() -> crearInsumo(tenantId, "ING-JAMON-SERRANO", "Jamón Serrano", "GRAMOS", new BigDecimal("0.0800")));

        Articulo queso = articuloRepository.findBySkuAndTenantId("ING-QUESO-MANCHEGO", tenantId)
            .orElseGet(() -> crearInsumo(tenantId, "ING-QUESO-MANCHEGO", "Queso Manchego", "GRAMOS", new BigDecimal("0.0500")));

        Articulo botellaRon = articuloRepository.findBySkuAndTenantId("BOT-RON-ANEJO", tenantId)
            .orElseGet(() -> crearInsumo(tenantId, "BOT-RON-ANEJO", "Ron Añejo 750ml", "MILILITROS", new BigDecimal("0.0300")));

        EscandalloReceta escandallo = escandalloRecetaRepository.findAll().stream()
            .filter(e -> e.getTenantId().equals(tenantId) && "Tabla de Charcutería".equals(e.getNombrePlato()))
            .findFirst()
            .orElseGet(() -> {
                EscandalloReceta nuevo = new EscandalloReceta();
                nuevo.setTenantId(tenantId);
                nuevo.setNombrePlato("Tabla de Charcutería");
                nuevo.setCostoTotalProduccion(new BigDecimal("7.50"));
                EscandalloReceta guardado = escandalloRecetaRepository.save(nuevo);

                crearDetalleReceta(tenantId, guardado, jamon.getSku(), new BigDecimal("200.0000"));
                crearDetalleReceta(tenantId, guardado, queso.getSku(), new BigDecimal("150.0000"));

                return guardado;
            });

        FastBarTrago trago = fastBarTragoRepository.findAll().stream()
            .filter(t -> t.getTenantId().equals(tenantId) && "Ron con Cola".equals(t.getNombreTrago()))
            .findFirst()
            .orElseGet(() -> {
                FastBarTrago nuevo = new FastBarTrago();
                nuevo.setTenantId(tenantId);
                nuevo.setNombreTrago("Ron con Cola");
                nuevo.setBotellaSku(botellaRon.getSku());
                nuevo.setMililitrosPorTrago(new BigDecimal("45.0000"));
                nuevo.setPrecioVenta(new BigDecimal("8.00"));
                return fastBarTragoRepository.save(nuevo);
            });

        return new DatosPiloto(escandallo.getId(), trago.getId());
    }

    private Articulo crearInsumo(Long tenantId, String sku, String nombre, String unidadMedida, BigDecimal costoUnitario) {
        Articulo articulo = new Articulo();
        articulo.setTenantId(tenantId);
        articulo.setSku(sku);
        articulo.setNombre(nombre);
        articulo.setUnidadMedida(unidadMedida);
        articulo.setCategoria("INSUMO_HORECA");
        articulo.setPorcentajeImpuesto(BigDecimal.ZERO);
        articulo.setCostoUnitario(costoUnitario.setScale(2, RoundingMode.HALF_UP));
        articulo.setStockActual(new BigDecimal("1000000.0000")); // stock amplio para soportar el lote de prueba
        return articuloRepository.save(articulo);
    }

    private void crearDetalleReceta(Long tenantId, EscandalloReceta escandallo, String ingredienteSku, BigDecimal cantidadRequerida) {
        DetalleReceta detalle = new DetalleReceta();
        detalle.setTenantId(tenantId);
        detalle.setEscandallo(escandallo);
        detalle.setIngredienteSku(ingredienteSku);
        detalle.setCantidadRequerida(cantidadRequerida);
        detalleRecetaRepository.save(detalle);
    }

    private static class DatosPiloto {
        final Long escandalloId;
        final Long fastBarTragoId;

        DatosPiloto(Long escandalloId, Long fastBarTragoId) {
            this.escandalloId = escandalloId;
            this.fastBarTragoId = fastBarTragoId;
        }
    }

    public static class ResultadoSimulacionHoreca {
        private int transaccionesExitosas = 0;
        private int transaccionesFallidas = 0;
        private BigDecimal totalVentasComandas = BigDecimal.ZERO;
        private BigDecimal totalCostoInsumosConsumidos = BigDecimal.ZERO;
        private BigDecimal totalVentasFastBar = BigDecimal.ZERO;

        public int getTransaccionesExitosas() { return transaccionesExitosas; }
        public int getTransaccionesFallidas() { return transaccionesFallidas; }
        public BigDecimal getTotalVentasComandas() { return totalVentasComandas; }
        public BigDecimal getTotalCostoInsumosConsumidos() { return totalCostoInsumosConsumidos; }
        public BigDecimal getTotalVentasFastBar() { return totalVentasFastBar; }
    }
}
