package com.auroraplus.modules.horeca.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.sync.IdempotenciaService;
import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.EscandalloReceta;
import com.auroraplus.modules.horeca.entities.ItemComanda;
import com.auroraplus.modules.horeca.repositories.ComandaRepository;
import com.auroraplus.modules.horeca.repositories.EscandalloRecetaRepository;
import com.auroraplus.modules.horeca.repositories.ItemComandaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class HorecaService {

    @Autowired
    private ComandaRepository comandaRepository;

    @Autowired
    private ItemComandaRepository itemComandaRepository;

    @Autowired
    private EscandalloRecetaRepository escandalloRecetaRepository;

    @Autowired
    private EscandalloService escandalloService;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    @Autowired
    private IdempotenciaService idempotenciaService;

    public Comanda obtenerComanda(Long comandaId) {
        return comandaRepository.findById(comandaId).orElseThrow(() -> new RuntimeException("Comanda no encontrada"));
    }

    private static final java.util.Set<String> CANALES_VALIDOS = java.util.Set.of(
        "SALON", "QR_MESA", "DELIVERY_PROPIO", "RECOGER_EN_TIENDA"
    );

    public Comanda aperturarComanda(Long tenantId, Integer numeroMesa, String mesero) {
        return aperturarComanda(tenantId, numeroMesa, mesero, "SALON", null, null, null, null, null);
    }

    /**
     * POS omnicanal: SALON/QR_MESA requieren numeroMesa; DELIVERY_PROPIO exige
     * dirección de entrega y admite datos del mensajero (mensajería local —
     * sin agregadores tipo UberEats/Rappi, poco extendidos en San Cristóbal);
     * RECOGER_EN_TIENDA no requiere ni mesa ni entrega.
     *
     * claveIdempotencia (opcional): identidad que el POS le da a ESTA comanda
     * ANTES de tener conexión — al sincronizar, el lote resuelve esta misma
     * clave al comandaId real y la usa para agregar ítems y cerrar (ver
     * SincronizacionLoteService), sin que el mesón necesite saber nunca el ID
     * numérico. Un reintento con la misma clave devuelve la comanda ya abierta,
     * no abre una segunda mesa fantasma.
     */
    @Transactional
    public Comanda aperturarComanda(Long tenantId, Integer numeroMesa, String mesero, String canal,
                                     String nombreCliente, String telefonoCliente, String direccionEntrega, String mensajero,
                                     String claveIdempotencia) {
        java.util.Optional<Long> existente = idempotenciaService.obtenerSiYaProcesada(tenantId, claveIdempotencia);
        if (existente.isPresent()) {
            return comandaRepository.findById(existente.get())
                .orElseThrow(() -> new RuntimeException("Operación idempotente inconsistente: comanda " + existente.get() + " no encontrada"));
        }

        String canalFinal = canal != null ? canal : "SALON";
        if (!CANALES_VALIDOS.contains(canalFinal)) {
            throw new RuntimeException("Canal inválido. Use: " + CANALES_VALIDOS);
        }
        if (("SALON".equals(canalFinal) || "QR_MESA".equals(canalFinal)) && numeroMesa == null) {
            throw new RuntimeException("El canal " + canalFinal + " requiere numeroMesa");
        }
        if ("DELIVERY_PROPIO".equals(canalFinal) && (direccionEntrega == null || direccionEntrega.isBlank())) {
            throw new RuntimeException("El canal DELIVERY_PROPIO requiere direccionEntrega");
        }

        Comanda comanda = new Comanda();
        comanda.setTenantId(tenantId);
        comanda.setNumeroMesa(numeroMesa);
        comanda.setMesero(mesero);
        comanda.setCanal(canalFinal);
        comanda.setNombreCliente(nombreCliente);
        comanda.setTelefonoCliente(telefonoCliente);
        comanda.setDireccionEntrega(direccionEntrega);
        comanda.setMensajero(mensajero);
        comanda.setEstado(Comanda.EstadoComanda.ABIERTA);
        comanda.setTotalConsumo(BigDecimal.ZERO);
        comanda.setFechaApertura(LocalDateTime.now());

        Comanda guardada = comandaRepository.save(comanda);
        idempotenciaService.registrar(tenantId, claveIdempotencia, "abrir_comanda_horeca", guardada.getId());
        return guardada;
    }

    public Comanda agregarConsumo(Long comandaId, Long tenantId, BigDecimal montoItem) {
        Comanda comanda = comandaRepository.findById(comandaId)
            .orElseThrow(() -> new RuntimeException("Comanda no encontrada"));

        if (!comanda.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Comanda no pertenece a este tenant");
        }

        if (comanda.getEstado() != Comanda.EstadoComanda.ABIERTA) {
            throw new RuntimeException("No se puede agregar consumo a una comanda que no está ABIERTA");
        }

        BigDecimal nuevoTotal = comanda.getTotalConsumo().add(montoItem).setScale(2, RoundingMode.HALF_UP);
        comanda.setTotalConsumo(nuevoTotal);

        return comandaRepository.save(comanda);
    }

    private static final java.util.Set<String> METODOS_PAGO_VALIDOS = java.util.Set.of(
        "EFECTIVO", "TARJETA", "TRANSFERENCIA", "BILLETERA_DIGITAL"
    );

    /** Cierra la comanda cobrándola en la moneda base del negocio (sin conversión). */
    @Transactional
    public Comanda cerrarComanda(Long comandaId, Long tenantId, String metodoPago) {
        return cerrarComanda(comandaId, tenantId, metodoPago, null, null, null);
    }

    /**
     * Cierra la comanda cobrándola: exige método de pago y registra el ingreso
     * real en tesorería (core.financiero) — SIEMPRE en la moneda que
     * físicamente entra a la caja, no forzada a la moneda base. Así el cierre
     * de caja por moneda (arqueo, TesoreriaService) puede reportar "hay X
     * dólares, Y bolívares, Z pesos" real, sin mezclarlo todo en una sola
     * cifra. Si el cliente paga en OTRA moneda que la base del negocio (ej.
     * negocio en USD, cliente paga en VES), se indica monedaPago+montoRecibido:
     * el precio de la comanda (en moneda base) se convierte a esa moneda con
     * la tasa vigente, se valida que lo recibido alcance, y el ingreso queda
     * en VES — más el equivalente en la moneda base como referencia para
     * reportes consolidados.
     *
     * claveIdempotencia (opcional): el POS del mesón la genera al iniciar el
     * cobro, ANTES de saber si hay conexión. Si la petición se reenvía porque
     * se perdió la respuesta (no la petición), se retorna la MISMA comanda ya
     * cerrada en vez de fallar con "Solo se puede cerrar una comanda que está
     * ABIERTA" o, peor, cobrar dos veces.
     */
    @Transactional
    public Comanda cerrarComanda(Long comandaId, Long tenantId, String metodoPago, String monedaPago, BigDecimal montoRecibido,
                                  String claveIdempotencia) {
        java.util.Optional<Long> existente = idempotenciaService.obtenerSiYaProcesada(tenantId, claveIdempotencia);
        if (existente.isPresent()) {
            return comandaRepository.findById(existente.get())
                .orElseThrow(() -> new RuntimeException("Operación idempotente inconsistente: comanda " + existente.get() + " no encontrada"));
        }

        Comanda comanda = comandaRepository.findById(comandaId)
            .orElseThrow(() -> new RuntimeException("Comanda no encontrada"));

        if (!comanda.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Comanda no pertenece a este tenant");
        }
        if (comanda.getEstado() != Comanda.EstadoComanda.ABIERTA) {
            throw new RuntimeException("Solo se puede cerrar una comanda que está ABIERTA");
        }
        if (metodoPago == null || !METODOS_PAGO_VALIDOS.contains(metodoPago)) {
            throw new RuntimeException("Método de pago inválido. Use: " + METODOS_PAGO_VALIDOS);
        }

        comanda.setEstado(Comanda.EstadoComanda.PAGADA);
        comanda.setMetodoPago(metodoPago);
        comanda.setFechaCierre(LocalDateTime.now());
        Comanda cerrada = comandaRepository.save(comanda);

        if (cerrada.getTotalConsumo().compareTo(BigDecimal.ZERO) > 0) {
            motorFinancieroService.registrarMovimientoMultiMoneda(tenantId, MovimientoCaja.TipoMovimiento.INGRESO,
                cerrada.getTotalConsumo(), monedaPago, montoRecibido,
                "Comanda mesa " + cerrada.getNumeroMesa() + " (" + metodoPago + ")");
        }

        idempotenciaService.registrar(tenantId, claveIdempotencia, "cierre_comanda_horeca", cerrada.getId());

        return cerrada;
    }

    public Comanda asignarMesero(Long comandaId, Long tenantId, String nuevoMesero) {
        Comanda comanda = comandaRepository.findById(comandaId)
            .orElseThrow(() -> new RuntimeException("Comanda no encontrada"));

        if (!comanda.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Comanda no pertenece a este tenant");
        }

        if (comanda.getEstado() != Comanda.EstadoComanda.ABIERTA) {
            throw new RuntimeException("No se puede reasignar mesero en una comanda que no está ABIERTA");
        }

        comanda.setMesero(nuevoMesero);
        return comandaRepository.save(comanda);
    }

    /**
     * Divide el total de consumo de una comanda entre N personas en partes iguales.
     * El último monto absorbe el residuo del redondeo para que la suma cuadre exacto
     * con el total (evita descuadres de céntimos por división de BigDecimal).
     */
    public List<BigDecimal> dividirCuenta(Long comandaId, Long tenantId, int numeroPersonas) {
        if (numeroPersonas <= 0) {
            throw new RuntimeException("El número de personas para dividir la cuenta debe ser mayor a cero");
        }

        Comanda comanda = comandaRepository.findById(comandaId)
            .orElseThrow(() -> new RuntimeException("Comanda no encontrada"));

        if (!comanda.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Comanda no pertenece a este tenant");
        }

        BigDecimal total = comanda.getTotalConsumo();
        BigDecimal partesIguales = total.divide(BigDecimal.valueOf(numeroPersonas), 2, RoundingMode.DOWN);

        List<BigDecimal> partes = new ArrayList<>();
        BigDecimal acumulado = BigDecimal.ZERO;
        for (int i = 0; i < numeroPersonas - 1; i++) {
            partes.add(partesIguales);
            acumulado = acumulado.add(partesIguales);
        }
        partes.add(total.subtract(acumulado).setScale(2, RoundingMode.HALF_UP));

        return partes;
    }

    /**
     * Añade un ítem a la comanda. Si trae escandalloId, resuelve nombre/estación
     * desde la receta y — CRÍTICO — descuenta automáticamente sus ingredientes
     * del inventario (explosión de ingredientes) antes de aceptar el pedido; si
     * no hay stock suficiente de algún insumo, la llamada falla y el plato no
     * entra a cocina. Sin escandalloId se admite un cargo manual sin receta
     * (ej. "Cover"), que no toca inventario — se debe indicar nombrePlato y
     * estacionCocina a mano en ese caso.
     */
    @Transactional
    public ItemComanda agregarItemComanda(Long comandaId, Long tenantId, Long escandalloId, String nombrePlato,
                                           String estacionCocina, Integer cantidad, BigDecimal precioUnitario) {
        return agregarItemComanda(comandaId, tenantId, escandalloId, nombrePlato, estacionCocina, cantidad, precioUnitario, null);
    }

    /**
     * claveIdempotencia (opcional): sin esto, un reintento del POS (ej. tras
     * reconectar) duplicaría el plato en la comanda Y volvería a descontar sus
     * ingredientes del inventario dos veces — mucho más grave que duplicar un
     * cobro, porque además reporta un consumo de insumos que nunca ocurrió.
     */
    @Transactional
    public ItemComanda agregarItemComanda(Long comandaId, Long tenantId, Long escandalloId, String nombrePlato,
                                           String estacionCocina, Integer cantidad, BigDecimal precioUnitario,
                                           String claveIdempotencia) {
        java.util.Optional<Long> existente = idempotenciaService.obtenerSiYaProcesada(tenantId, claveIdempotencia);
        if (existente.isPresent()) {
            return itemComandaRepository.findById(existente.get())
                .orElseThrow(() -> new RuntimeException("Operación idempotente inconsistente: ítem " + existente.get() + " no encontrado"));
        }

        Comanda comanda = comandaRepository.findById(comandaId)
            .orElseThrow(() -> new RuntimeException("Comanda no encontrada"));

        if (!comanda.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Comanda no pertenece a este tenant");
        }

        if (comanda.getEstado() != Comanda.EstadoComanda.ABIERTA) {
            throw new RuntimeException("No se pueden agregar ítems a una comanda que no está ABIERTA");
        }

        ItemComanda item = new ItemComanda();
        item.setTenantId(tenantId);
        item.setComanda(comanda);
        item.setCantidad(cantidad);

        if (escandalloId != null) {
            EscandalloReceta escandallo = escandalloRecetaRepository.findById(escandalloId)
                .orElseThrow(() -> new RuntimeException("Escandallo no encontrado"));
            if (!escandallo.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Escandallo no pertenece a este tenant");
            }

            // Explota los ingredientes ANTES de aceptar el ítem: si falta stock, revienta
            // aquí y la transacción completa se revierte — el plato nunca llega a cocina.
            escandalloService.registrarVentaPlato(escandalloId, tenantId, cantidad);

            item.setEscandallo(escandallo);
            item.setNombrePlato(escandallo.getNombrePlato());
            item.setEstacionCocina(escandallo.getEstacionCocina());
            item.setPrecioUnitario(escandallo.getPrecioVenta() != null ? escandallo.getPrecioVenta() : precioUnitario);
        } else {
            if (nombrePlato == null || estacionCocina == null || precioUnitario == null) {
                throw new RuntimeException("Sin escandalloId debe indicar nombrePlato, estacionCocina y precioUnitario");
            }
            item.setNombrePlato(nombrePlato);
            item.setEstacionCocina(estacionCocina);
            item.setPrecioUnitario(precioUnitario);
        }

        item.setEstadoItem(ItemComanda.EstadoItem.PENDIENTE);

        ItemComanda guardado = itemComandaRepository.save(item);

        BigDecimal montoItem = item.getPrecioUnitario().multiply(BigDecimal.valueOf(cantidad));
        agregarConsumo(comandaId, tenantId, montoItem);

        idempotenciaService.registrar(tenantId, claveIdempotencia, "agregar_item_comanda_horeca", guardado.getId());

        return guardado;
    }

    /**
     * Actualiza el estado de un ítem en la pantalla de despacho de cocina (KDS):
     * PENDIENTE -> PREPARANDO -> LISTO -> ENTREGADO.
     */
    public ItemComanda actualizarEstadoItem(Long itemId, Long tenantId, ItemComanda.EstadoItem nuevoEstado) {
        ItemComanda item = itemComandaRepository.findById(itemId)
            .orElseThrow(() -> new RuntimeException("Ítem de comanda no encontrado"));

        if (!item.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Ítem no pertenece a este tenant");
        }

        item.setEstadoItem(nuevoEstado);
        return itemComandaRepository.save(item);
    }

    /**
     * Tablero KDS: lista los ítems pendientes de despacho (no ENTREGADO) para una estación de cocina.
     */
    public List<ItemComanda> obtenerTableroKds(String estacionCocina) {
        return itemComandaRepository.findByEstacionCocinaAndEstadoItemNot(estacionCocina, ItemComanda.EstadoItem.ENTREGADO);
    }
}
