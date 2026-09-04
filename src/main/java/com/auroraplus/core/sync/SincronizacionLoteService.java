package com.auroraplus.core.sync;

import com.auroraplus.core.config.LicenciaService;
import com.auroraplus.modules.ganaderia.controllers.VentaAnimalController;
import com.auroraplus.modules.ganaderia.services.GanaderiaVentaService;
import com.auroraplus.modules.horeca.services.HorecaService;
import com.auroraplus.modules.minero.controllers.VentaMineralController;
import com.auroraplus.modules.minero.services.VentaMineralService;
import com.auroraplus.modules.moda.controllers.VentaModaController;
import com.auroraplus.modules.moda.services.ModaVentaService;
import com.auroraplus.modules.repuestos.services.RepuestoConversionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Fase 8 (Offline-First) — el POS que estuvo horas sin conexión acumula sus
 * ventas localmente y las manda TODAS JUNTAS al reconectar, en vez de una por
 * una. Cada operación del lote se procesa en su PROPIA transacción (una
 * llamada normal al servicio correspondiente, que ya es @Transactional) — así
 * un ítem con datos inválidos no revierte ni bloquea a los demás que sí son
 * válidos. El POS recibe de vuelta, por cada clave, si se creó, si ya existía
 * (reintento) o por qué falló, y decide localmente qué reintentar.
 *
 * Todas las operaciones aquí YA exigían claveIdempotencia opcional en su
 * endpoint individual (ver IdempotenciaService) — en el lote es OBLIGATORIA,
 * porque es precisamente el escenario de reintento masivo tras reconectar.
 */
@Service
public class SincronizacionLoteService {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private VentaMineralService ventaMineralService;

    @Autowired
    private HorecaService horecaService;

    @Autowired
    private ModaVentaService modaVentaService;

    @Autowired
    private GanaderiaVentaService ganaderiaVentaService;

    @Autowired
    private RepuestoConversionService repuestoConversionService;

    @Autowired
    private LicenciaService licenciaService;

    @Autowired
    private IdempotenciaService idempotenciaService;

    // Este endpoint vive en /api/sync/lote, FUERA de /api/minero/, /api/horeca/,
    // etc. — el LicenciaInterceptor solo protege por el primer segmento de la
    // URL, así que aquí no hay candado automático. Sin esta validación manual,
    // un tenant sin el módulo contratado podría colar una venta de esa vertical
    // metiéndola dentro del lote. Mapeo explícito tipoOperacion -> módulo real.
    private static final java.util.Map<String, String> MODULO_POR_TIPO_OPERACION = java.util.Map.of(
        "venta_minero", "minero",
        "venta_horeca", "horeca",
        "abrir_comanda_horeca", "horeca",
        "agregar_item_comanda_horeca", "horeca",
        "venta_moda", "moda",
        "venta_ganaderia", "ganaderia",
        "venta_repuestos_volumen", "repuestos",
        "venta_repuestos_presentacion", "repuestos"
    );

    public static class OperacionLote {
        public String tipoOperacion; // venta_minero, venta_horeca, venta_moda, venta_ganaderia, venta_repuestos_volumen, venta_repuestos_presentacion
        public String claveIdempotencia; // obligatoria
        public Object payload; // mismo shape que el body/params del endpoint individual correspondiente
    }

    public static class ResultadoOperacionLote {
        public String claveIdempotencia;
        public String tipoOperacion;
        public boolean exito;
        public Long entidadId; // null si el tipo de operación no tiene una entidad persistida que referenciar (ver Repuestos)
        public String error;   // null si exito=true
    }

    // Payloads locales para las operaciones que no tienen un @RequestBody propio
    // en su controlador (usan @RequestParam sueltos en el endpoint individual).

    /**
     * Abre una comanda SIN que el POS necesite un comandaId real todavía — el
     * mesón la identifica con su propia claveIdempotencia (ej. un UUID
     * generado al tocar "Nueva mesa" sin conexión). Al sincronizar, esa clave
     * se resuelve al comandaId real y queda disponible para las operaciones
     * siguientes del mismo lote (agregar ítems, cerrar) referenciándola por
     * "comandaClaveCliente" en vez de un ID numérico.
     */
    public static class AbrirComandaPayload {
        public Integer numeroMesa;
        public String mesero;
        public String canal;
        public String nombreCliente;
        public String telefonoCliente;
        public String direccionEntrega;
        public String mensajero;
    }

    public static class AgregarItemComandaPayload {
        // Referencia la comanda por la MISMA claveIdempotencia usada para abrirla
        // (operación "abrir_comanda_horeca" en este mismo lote, o en uno anterior
        // ya sincronizado) — nunca por un ID numérico que el POS offline no tiene.
        public String comandaClaveCliente;
        public Long escandalloId;
        public String nombrePlato;
        public String estacionCocina;
        public Integer cantidad;
        public BigDecimal precioUnitario;
    }

    public static class CierreComandaPayload {
        public Long comandaId;
        // Alternativa a comandaId cuando la comanda se abrió offline en el mismo
        // lote (o en uno previo) y aún no se conoce su ID real.
        public String comandaClaveCliente;
        public String metodoPago;
        public String monedaPago;
        public BigDecimal montoRecibido;
    }

    public static class VentaRepuestoVolumenPayload {
        public Long repuestoId;
        public BigDecimal cantidad;
        public String monedaPago;
        public BigDecimal montoRecibido;
    }

    public static class VentaRepuestoPresentacionPayload {
        public Long presentacionId;
        public BigDecimal cantidad;
        public String monedaPago;
        public BigDecimal montoRecibido;
    }

    public List<ResultadoOperacionLote> procesarLote(Long tenantId, List<OperacionLote> operaciones) {
        List<ResultadoOperacionLote> resultados = new ArrayList<>();
        for (OperacionLote op : operaciones) {
            ResultadoOperacionLote resultado = new ResultadoOperacionLote();
            resultado.claveIdempotencia = op.claveIdempotencia;
            resultado.tipoOperacion = op.tipoOperacion;
            try {
                if (op.claveIdempotencia == null || op.claveIdempotencia.isBlank()) {
                    throw new RuntimeException("claveIdempotencia es obligatoria en cada operación del lote");
                }
                resultado.entidadId = procesarUnaOperacion(tenantId, op);
                resultado.exito = true;
            } catch (Exception e) {
                resultado.exito = false;
                resultado.error = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            }
            resultados.add(resultado);
        }
        return resultados;
    }

    private Long procesarUnaOperacion(Long tenantId, OperacionLote op) {
        if (op.tipoOperacion == null) {
            throw new RuntimeException("tipoOperacion es obligatorio");
        }

        String moduloRequerido = MODULO_POR_TIPO_OPERACION.get(op.tipoOperacion);
        if (moduloRequerido != null) {
            LicenciaService.ResultadoValidacion validacion = licenciaService.validarAcceso(tenantId, moduloRequerido);
            if (!validacion.permitido) {
                throw new RuntimeException(validacion.mensaje);
            }
        }

        switch (op.tipoOperacion) {
            case "venta_minero" -> {
                VentaMineralController.VentaRequest p = objectMapper.convertValue(op.payload, VentaMineralController.VentaRequest.class);
                List<VentaMineralService.ItemVentaMineral> items = p.items.stream().map(i -> {
                    VentaMineralService.ItemVentaMineral item = new VentaMineralService.ItemVentaMineral();
                    item.producto = i.producto;
                    item.cantidad = i.cantidad;
                    item.precioUnitario = i.precioUnitario;
                    item.transformacionId = i.transformacionId;
                    return item;
                }).toList();
                return ventaMineralService.registrarVenta(tenantId, p.numeroFactura, p.comprador, items,
                    p.monedaPago, p.montoRecibido, op.claveIdempotencia).getId();
            }
            case "abrir_comanda_horeca" -> {
                AbrirComandaPayload p = objectMapper.convertValue(op.payload, AbrirComandaPayload.class);
                return horecaService.aperturarComanda(tenantId, p.numeroMesa, p.mesero, p.canal, p.nombreCliente,
                    p.telefonoCliente, p.direccionEntrega, p.mensajero, op.claveIdempotencia).getId();
            }
            case "agregar_item_comanda_horeca" -> {
                AgregarItemComandaPayload p = objectMapper.convertValue(op.payload, AgregarItemComandaPayload.class);
                Long comandaId = resolverComandaId(tenantId, p.comandaClaveCliente);
                return horecaService.agregarItemComanda(comandaId, tenantId, p.escandalloId, p.nombrePlato,
                    p.estacionCocina, p.cantidad, p.precioUnitario, op.claveIdempotencia).getId();
            }
            case "venta_horeca" -> {
                CierreComandaPayload p = objectMapper.convertValue(op.payload, CierreComandaPayload.class);
                Long comandaId = p.comandaId != null ? p.comandaId : resolverComandaId(tenantId, p.comandaClaveCliente);
                return horecaService.cerrarComanda(comandaId, tenantId, p.metodoPago, p.monedaPago, p.montoRecibido,
                    op.claveIdempotencia).getId();
            }
            case "venta_moda" -> {
                VentaModaController.VentaRequest p = objectMapper.convertValue(op.payload, VentaModaController.VentaRequest.class);
                List<ModaVentaService.ItemVenta> items = p.items.stream().map(i -> {
                    ModaVentaService.ItemVenta item = new ModaVentaService.ItemVenta();
                    item.varianteId = i.varianteId;
                    item.cantidad = i.cantidad;
                    return item;
                }).toList();
                return modaVentaService.registrarVenta(tenantId, p.numeroTicket, p.clienteId, p.metodoPago,
                    p.codigoGiftCard, items, p.monedaPago, p.montoRecibido, op.claveIdempotencia).getId();
            }
            case "venta_ganaderia" -> {
                VentaAnimalController.VentaRequest p = objectMapper.convertValue(op.payload, VentaAnimalController.VentaRequest.class);
                return ganaderiaVentaService.registrarVenta(tenantId, p.numeroTicket, p.comprador, p.items,
                    p.monedaPago, p.montoRecibido, op.claveIdempotencia).getId();
            }
            case "venta_repuestos_volumen" -> {
                VentaRepuestoVolumenPayload p = objectMapper.convertValue(op.payload, VentaRepuestoVolumenPayload.class);
                // Repuestos no tiene una entidad "Venta" persistida — no hay entidadId que devolver,
                // pero la idempotencia sigue protegiendo contra duplicar stock/caja (ver RepuestoConversionService).
                repuestoConversionService.venderPorVolumen(p.repuestoId, tenantId, p.cantidad, p.monedaPago,
                    p.montoRecibido, op.claveIdempotencia);
                return null;
            }
            case "venta_repuestos_presentacion" -> {
                VentaRepuestoPresentacionPayload p = objectMapper.convertValue(op.payload, VentaRepuestoPresentacionPayload.class);
                repuestoConversionService.despacharPorPresentacion(p.presentacionId, tenantId, p.cantidad, p.monedaPago,
                    p.montoRecibido, op.claveIdempotencia);
                return null;
            }
            default -> throw new RuntimeException("Tipo de operación no soportado en sincronización por lote: " + op.tipoOperacion);
        }
    }

    /**
     * Traduce la claveIdempotencia con la que el POS abrió una comanda offline
     * al comandaId real ya sincronizado. El procesamiento del lote es
     * secuencial (ver procesarLote): si "abrir_comanda_horeca" viene ANTES en
     * la misma lista, ya se registró en operaciones_idempotentes para cuando
     * se procesa este ítem — funciona tanto dentro del mismo envío como para
     * referenciar una comanda abierta en un lote anterior ya sincronizado.
     */
    private Long resolverComandaId(Long tenantId, String comandaClaveCliente) {
        if (comandaClaveCliente == null || comandaClaveCliente.isBlank()) {
            throw new RuntimeException("Debe indicar comandaId o comandaClaveCliente");
        }
        Optional<Long> comandaId = idempotenciaService.obtenerSiYaProcesada(tenantId, comandaClaveCliente);
        return comandaId.orElseThrow(() -> new RuntimeException(
            "No se encontró ninguna comanda abierta con la clave '" + comandaClaveCliente
                + "' — asegúrese de que la operación 'abrir_comanda_horeca' con esa misma clave se procesó antes (en este lote o en uno anterior)"));
    }
}
