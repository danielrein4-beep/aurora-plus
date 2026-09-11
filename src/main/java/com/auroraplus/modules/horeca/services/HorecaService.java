package com.auroraplus.modules.horeca.services;

import com.auroraplus.core.crm.entities.Cliente;
import com.auroraplus.core.crm.repositories.ClienteRepository;
import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.core.inventario.entities.Articulo;
import com.auroraplus.core.inventario.entities.Kardex;
import com.auroraplus.core.inventario.repositories.ArticuloRepository;
import com.auroraplus.core.inventario.services.InventarioService;
import com.auroraplus.core.sync.IdempotenciaService;
import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.EscandalloReceta;
import com.auroraplus.modules.horeca.entities.ItemComanda;
import com.auroraplus.modules.horeca.entities.PagoVenta;
import com.auroraplus.modules.horeca.repositories.ComandaRepository;
import com.auroraplus.modules.horeca.repositories.EscandalloRecetaRepository;
import com.auroraplus.modules.horeca.repositories.ItemComandaRepository;
import com.auroraplus.modules.horeca.repositories.PagoVentaRepository;
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

    @Autowired
    private PagoVentaRepository pagoVentaRepository;

    @Autowired
    private ArticuloRepository articuloRepository;

    @Autowired
    private InventarioService inventarioService;

    @Autowired
    private ClienteRepository clienteRepository;

    public Comanda obtenerComanda(Long comandaId) {
        return comandaRepository.findById(comandaId).orElseThrow(() -> new RuntimeException("Comanda no encontrada"));
    }

    private static final java.util.Set<String> CANALES_VALIDOS = java.util.Set.of(
        "SALON", "QR_MESA", "DELIVERY_PROPIO", "RECOGER_EN_TIENDA"
    );

    // Ventas de mostrador (RECOGER_EN_TIENDA, DELIVERY_PROPIO) no tienen mesa
    // física — numeroMesa queda null. Concatenarlo directo producía literales
    // como "Comanda mesa null" en el historial de caja, que un cajero leería
    // como un dato roto en vez de "vino del mostrador".
    private String descripcionComanda(Comanda comanda) {
        if (comanda.getNumeroMesa() != null) return "Mesa " + comanda.getNumeroMesa();
        return switch (comanda.getCanal()) {
            case "RECOGER_EN_TIENDA" -> "Mostrador";
            case "DELIVERY_PROPIO" -> "Delivery";
            case "QR_MESA" -> "Pedido QR";
            default -> comanda.getCanal();
        };
    }

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
        return aperturarComanda(tenantId, numeroMesa, mesero, canal, nombreCliente, telefonoCliente, direccionEntrega, mensajero, claveIdempotencia, null);
    }

    /**
     * Variante que además admite clienteId (CRM, opcional): vincular un
     * cliente registrado a la venta es un paso extra, no un requisito — sin
     * clienteId la comanda se abre exactamente igual que siempre (anónima),
     * sin ninguna consulta ni validación de más en el camino caliente del POS.
     */
    @Transactional
    public Comanda aperturarComanda(Long tenantId, Integer numeroMesa, String mesero, String canal,
                                     String nombreCliente, String telefonoCliente, String direccionEntrega, String mensajero,
                                     String claveIdempotencia, Long clienteId) {
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

        if (clienteId != null) {
            Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));
            if (!cliente.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Cliente no pertenece a este tenant");
            }
            comanda.setCliente(cliente);
        }

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
                "Comanda " + descripcionComanda(cerrada) + " (" + metodoPago + ")");
        }

        idempotenciaService.registrar(tenantId, claveIdempotencia, "cierre_comanda_horeca", cerrada.getId());

        return cerrada;
    }

    public static class PagoParcialRequest {
        public String metodoPago;
        public String moneda; // moneda en la que el cliente entrega ESTA línea (ej. USD, VES)
        public BigDecimal monto; // monto entregado en esa moneda
    }

    /**
     * Cierra la comanda cobrándola con VARIOS métodos de pago a la vez (cobro
     * mixto: ej. parte en USD efectivo, resto en Bs por Pago Móvil) — cada
     * línea se registra por separado en tesorería, en SU propia moneda real
     * (para que el arqueo de caja por moneda sea exacto), y se valida el total
     * contra la tasa BCV vigente del tenant. Si lo recibido supera el total,
     * se calcula el vuelto exacto y se registra como un egreso "Vuelto
     * entregado" en la moneda solicitada (por defecto, la moneda base del
     * negocio), más su equivalente en Bs como referencia para el cajero.
     *
     * claveIdempotencia: mismo propósito que en cerrarComanda — un reintento
     * de red no debe cobrar dos veces ni duplicar las líneas de pago.
     */
    @Transactional
    public ResultadoCobroMixto cerrarComandaMixto(Long comandaId, Long tenantId, List<PagoParcialRequest> pagos,
                                                    String monedaVuelto, String claveIdempotencia) {
        java.util.Optional<Long> existente = idempotenciaService.obtenerSiYaProcesada(tenantId, claveIdempotencia);
        if (existente.isPresent()) {
            Comanda comandaExistente = comandaRepository.findById(existente.get())
                .orElseThrow(() -> new RuntimeException("Operación idempotente inconsistente: comanda " + existente.get() + " no encontrada"));
            ResultadoCobroMixto resultado = new ResultadoCobroMixto();
            resultado.comanda = comandaExistente;
            resultado.pagos = pagoVentaRepository.findByComandaIdOrderByFechaPagoAsc(comandaExistente.getId());
            resultado.totalBase = comandaExistente.getTotalConsumo();
            resultado.monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
            resultado.totalRecibidoBase = comandaExistente.getTotalRecibidoBase();
            resultado.vueltoBase = comandaExistente.getVueltoBase();
            resultado.monedaVuelto = comandaExistente.getMonedaVuelto();
            resultado.vueltoEnMonedaVuelto = comandaExistente.getVueltoMonto();
            return resultado;
        }

        Comanda comanda = comandaRepository.findById(comandaId)
            .orElseThrow(() -> new RuntimeException("Comanda no encontrada"));
        if (!comanda.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Comanda no pertenece a este tenant");
        }
        if (comanda.getEstado() != Comanda.EstadoComanda.ABIERTA) {
            throw new RuntimeException("Solo se puede cerrar una comanda que está ABIERTA");
        }
        if (pagos == null || pagos.isEmpty()) {
            throw new RuntimeException("Debe indicar al menos una línea de pago");
        }
        for (PagoParcialRequest p : pagos) {
            if (p.metodoPago == null || !METODOS_PAGO_VALIDOS.contains(p.metodoPago)) {
                throw new RuntimeException("Método de pago inválido. Use: " + METODOS_PAGO_VALIDOS);
            }
            if (p.moneda == null || p.moneda.isBlank()) {
                throw new RuntimeException("Cada línea de pago debe indicar su moneda");
            }
            if (p.monto == null || p.monto.compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("Cada línea de pago debe tener un monto mayor a cero");
            }
        }

        String monedaBase = motorFinancieroService.obtenerMonedaBase(tenantId);
        BigDecimal totalBase = comanda.getTotalConsumo();
        BigDecimal totalRecibidoBase = BigDecimal.ZERO;
        List<PagoVenta> guardados = new ArrayList<>();

        for (PagoParcialRequest p : pagos) {
            BigDecimal montoBaseLinea = motorFinancieroService.convertirAMonedaBase(tenantId, p.monto, p.moneda);
            totalRecibidoBase = totalRecibidoBase.add(montoBaseLinea);

            PagoVenta pago = new PagoVenta();
            pago.setTenantId(tenantId);
            pago.setComanda(comanda);
            pago.setMetodoPago(p.metodoPago);
            pago.setMoneda(p.moneda);
            pago.setMonto(p.monto);
            pago.setMontoEquivalenteBase(montoBaseLinea);
            if (!p.moneda.equals(monedaBase)) {
                pago.setTasaAplicada(montoBaseLinea.divide(p.monto, 6, RoundingMode.HALF_UP));
            }
            pago.setFechaPago(LocalDateTime.now());
            guardados.add(pagoVentaRepository.save(pago));

            motorFinancieroService.registrarMovimientoEnMoneda(tenantId, MovimientoCaja.TipoMovimiento.INGRESO,
                p.monto, p.moneda, "Comanda " + descripcionComanda(comanda) + " (" + p.metodoPago + ")");
        }

        BigDecimal faltante = totalBase.subtract(totalRecibidoBase).setScale(2, RoundingMode.HALF_UP);
        if (faltante.compareTo(BigDecimal.ZERO) > 0) {
            throw new RuntimeException("El pago no cubre el total de la comanda. Faltan " + faltante + " " + monedaBase);
        }

        BigDecimal vueltoBase = totalRecibidoBase.subtract(totalBase).setScale(2, RoundingMode.HALF_UP);
        String monedaVueltoFinal = (monedaVuelto != null && !monedaVuelto.isBlank()) ? monedaVuelto : monedaBase;
        BigDecimal vueltoEnMonedaVuelto = BigDecimal.ZERO;
        BigDecimal vueltoVes = null;

        if (vueltoBase.compareTo(BigDecimal.ZERO) > 0) {
            vueltoEnMonedaVuelto = motorFinancieroService.convertirMoneda(tenantId, vueltoBase, monedaBase, monedaVueltoFinal);
            motorFinancieroService.registrarMovimientoEnMoneda(tenantId, MovimientoCaja.TipoMovimiento.EGRESO,
                vueltoEnMonedaVuelto, monedaVueltoFinal, "Vuelto entregado - Comanda " + descripcionComanda(comanda));

            try {
                vueltoVes = "VES".equals(monedaVueltoFinal)
                    ? vueltoEnMonedaVuelto
                    : motorFinancieroService.convertirMoneda(tenantId, vueltoBase, monedaBase, "VES");
            } catch (RuntimeException sinTasaVes) {
                // Sin tasa BCV registrada: el vuelto en Bs queda como informativo ausente, no bloquea el cobro.
            }
        }

        comanda.setEstado(Comanda.EstadoComanda.PAGADA);
        comanda.setMetodoPago(pagos.size() == 1 ? pagos.get(0).metodoPago : "MIXTO");
        comanda.setFechaCierre(LocalDateTime.now());
        // Se guarda el vuelto entregado junto con la comanda: sin esto, el
        // ticket (PDF/térmica) impreso o reimpreso más tarde no tiene forma de
        // reflejar cuánto se recibió y cuánto se devolvió, un hueco contable
        // grave para el cierre de caja.
        comanda.setTotalRecibidoBase(totalRecibidoBase.setScale(2, RoundingMode.HALF_UP));
        comanda.setVueltoBase(vueltoBase);
        comanda.setMonedaVuelto(monedaVueltoFinal);
        comanda.setVueltoMonto(vueltoEnMonedaVuelto);
        Comanda cerrada = comandaRepository.save(comanda);

        idempotenciaService.registrar(tenantId, claveIdempotencia, "cierre_comanda_horeca_mixto", cerrada.getId());

        ResultadoCobroMixto resultado = new ResultadoCobroMixto();
        resultado.comanda = cerrada;
        resultado.pagos = guardados;
        resultado.totalBase = totalBase;
        resultado.monedaBase = monedaBase;
        resultado.totalRecibidoBase = totalRecibidoBase.setScale(2, RoundingMode.HALF_UP);
        resultado.vueltoBase = vueltoBase;
        resultado.monedaVuelto = monedaVueltoFinal;
        resultado.vueltoEnMonedaVuelto = vueltoEnMonedaVuelto;
        resultado.vueltoVes = vueltoVes;
        return resultado;
    }

    /**
     * Anula una comanda ya emitida (ABIERTA o PAGADA) — nunca se borra nada:
     * cada ítem devuelve su inventario/ingredientes de receta, cada pago
     * recibido y cada vuelto entregado quedan revertidos con un movimiento de
     * caja compensatorio (nunca eliminando el original), y la comanda queda
     * marcada ANULADA con motivo, fecha y usuario — el mismo principio de una
     * nota de crédito: se corrige con un movimiento inverso, no con un DELETE.
     */
    @Transactional
    public Comanda anularComanda(Long comandaId, Long tenantId, String motivo, String usuario, String claveIdempotencia) {
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
        if (comanda.getEstado() == Comanda.EstadoComanda.ANULADA) {
            throw new RuntimeException("Esta comanda ya está anulada");
        }
        if (motivo == null || motivo.isBlank()) {
            throw new RuntimeException("Debe indicar el motivo de la anulación");
        }

        boolean estabaPagada = comanda.getEstado() == Comanda.EstadoComanda.PAGADA;

        // 1) Devolver cada ítem al inventario — recetas explotan sus
        // ingredientes de vuelta, artículos de venta directa regresan su
        // cantidad. Se hace siempre, esté PAGADA o ABIERTA: el descuento de
        // stock ocurre al agregar el ítem, no al cerrar la comanda.
        List<ItemComanda> items = itemComandaRepository.findByComandaId(comandaId);
        for (ItemComanda item : items) {
            if (item.getEscandallo() != null) {
                escandalloService.revertirVentaPlato(item.getEscandallo().getId(), tenantId, item.getCantidad());
            } else if (item.getArticulo() != null) {
                inventarioService.registrarMovimientoKardex(item.getArticulo().getId(), tenantId, Kardex.TipoOperacion.ENTRADA,
                    item.getCantidad(), item.getCostoUnitario(), "Anulación de venta: " + item.getNombrePlato());
            }
        }

        // 2) Revertir caja — solo si de verdad se cobró. Cada línea de pago
        // recibida se compensa con un EGRESO en su misma moneda; el vuelto
        // entregado (que salió como EGRESO al cerrar) se compensa con un
        // INGRESO. Ninguno de los movimientos originales se toca ni se borra.
        if (estabaPagada) {
            List<PagoVenta> pagos = pagoVentaRepository.findByComandaIdOrderByFechaPagoAsc(comandaId);
            for (PagoVenta pago : pagos) {
                motorFinancieroService.registrarMovimientoEnMoneda(tenantId, MovimientoCaja.TipoMovimiento.EGRESO,
                    pago.getMonto(), pago.getMoneda(), "Anulación de venta " + descripcionComanda(comanda) + " (reverso de " + pago.getMetodoPago() + ")");
            }
            if (comanda.getVueltoMonto() != null && comanda.getVueltoMonto().compareTo(BigDecimal.ZERO) > 0) {
                motorFinancieroService.registrarMovimientoEnMoneda(tenantId, MovimientoCaja.TipoMovimiento.INGRESO,
                    comanda.getVueltoMonto(), comanda.getMonedaVuelto(), "Anulación de venta " + descripcionComanda(comanda) + " (reverso de vuelto entregado)");
            }
        }

        comanda.setEstado(Comanda.EstadoComanda.ANULADA);
        comanda.setMotivoAnulacion(motivo);
        comanda.setFechaAnulacion(LocalDateTime.now());
        comanda.setAnuladoPor(usuario);
        Comanda anulada = comandaRepository.save(comanda);

        idempotenciaService.registrar(tenantId, claveIdempotencia, "anular_comanda_horeca", anulada.getId());
        return anulada;
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
                                           String estacionCocina, BigDecimal cantidad, BigDecimal precioUnitario) {
        return agregarItemComanda(comandaId, tenantId, escandalloId, null, nombrePlato, estacionCocina, cantidad, precioUnitario, null);
    }

    /**
     * claveIdempotencia (opcional): sin esto, un reintento del POS (ej. tras
     * reconectar) duplicaría el plato en la comanda Y volvería a descontar sus
     * ingredientes del inventario dos veces — mucho más grave que duplicar un
     * cobro, porque además reporta un consumo de insumos que nunca ocurrió.
     */
    @Transactional
    public ItemComanda agregarItemComanda(Long comandaId, Long tenantId, Long escandalloId, String nombrePlato,
                                           String estacionCocina, BigDecimal cantidad, BigDecimal precioUnitario,
                                           String claveIdempotencia) {
        return agregarItemComanda(comandaId, tenantId, escandalloId, null, nombrePlato, estacionCocina, cantidad, precioUnitario, claveIdempotencia);
    }

    /**
     * Variante que además admite articuloId: venta DIRECTA de un artículo de
     * inventario (ej. un Doritos, un refresco) sin pasar por una receta —
     * descuenta 1:1 del stock (InventarioService, que ya rechaza la salida si
     * no alcanza), congela el costo de compra vigente del artículo en el ítem
     * (costoUnitario) para que el reporte de utilidad del día no cambie si el
     * costo del artículo se actualiza después, y no pasa por cocina (queda
     * ENTREGADO de una vez, como cualquier venta de mostrador).
     * escandalloId y articuloId son mutuamente excluyentes.
     */
    @Transactional
    public ItemComanda agregarItemComanda(Long comandaId, Long tenantId, Long escandalloId, Long articuloId, String nombrePlato,
                                           String estacionCocina, BigDecimal cantidad, BigDecimal precioUnitario,
                                           String claveIdempotencia) {
        return agregarItemComanda(comandaId, tenantId, escandalloId, articuloId, nombrePlato, estacionCocina, cantidad, precioUnitario, claveIdempotencia, null);
    }

    @Transactional
    public ItemComanda agregarItemComanda(Long comandaId, Long tenantId, Long escandalloId, Long articuloId, String nombrePlato,
                                           String estacionCocina, BigDecimal cantidad, BigDecimal precioUnitario,
                                           String claveIdempotencia, String notas) {
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
        if (escandalloId != null && articuloId != null) {
            throw new RuntimeException("Indique escandalloId o articuloId, no ambos");
        }
        if (cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("La cantidad debe ser mayor a cero");
        }

        // Venta de mostrador (Venta Rápida: RECOGER_EN_TIENDA) — el cliente se
        // lleva el producto en el momento, no hay mesero ni cocinero con
        // tablet relevando el KDS paso a paso. Estos ítems no entran al
        // tablero de cocina: quedan ENTREGADO de una vez, igual que ya
        // pasaba con los artículos de inventario vendidos directo. Las
        // mesas (SALON/QR_MESA) y delivery sí siguen el flujo normal de
        // cocina, porque ahí el plato se prepara mientras el cliente espera.
        boolean esVentaDeMostrador = "RECOGER_EN_TIENDA".equals(comanda.getCanal());

        ItemComanda item = new ItemComanda();
        item.setTenantId(tenantId);
        item.setComanda(comanda);
        item.setCantidad(cantidad);
        item.setNotas(notas);

        if (escandalloId != null) {
            EscandalloReceta escandallo = escandalloRecetaRepository.findById(escandalloId)
                .orElseThrow(() -> new RuntimeException("Escandallo no encontrado"));
            if (!escandallo.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Escandallo no pertenece a este tenant");
            }

            // Explota los ingredientes ANTES de aceptar el ítem: si falta stock, revienta
            // aquí y la transacción completa se revierte — el plato nunca llega a cocina.
            BigDecimal costoTotalConsumido = escandalloService.registrarVentaPlato(escandalloId, tenantId, cantidad);

            item.setEscandallo(escandallo);
            item.setNombrePlato(escandallo.getNombrePlato());
            item.setEstacionCocina(escandallo.getEstacionCocina());
            item.setPrecioUnitario(escandallo.getPrecioVenta() != null ? escandallo.getPrecioVenta() : precioUnitario);
            item.setCostoUnitario(costoTotalConsumido.divide(cantidad, 4, RoundingMode.HALF_UP));
            boolean saltaCocina = esVentaDeMostrador || !Boolean.TRUE.equals(escandallo.getRequiereCocina());
            item.setEstadoItem(saltaCocina ? ItemComanda.EstadoItem.ENTREGADO : ItemComanda.EstadoItem.PENDIENTE);
        } else if (articuloId != null) {
            Articulo articulo = articuloRepository.findById(articuloId)
                .orElseThrow(() -> new RuntimeException("Artículo no encontrado"));
            if (!articulo.getTenantId().equals(tenantId)) {
                throw new RuntimeException("Violación de seguridad: Artículo no pertenece a este tenant");
            }
            if (precioUnitario == null) {
                throw new RuntimeException("Debe indicar el precio de venta del artículo");
            }

            // Descuenta el stock ANTES de aceptar el ítem: si no alcanza, revienta aquí
            // (InventarioService) y la transacción completa se revierte.
            inventarioService.registrarMovimientoKardex(articulo.getId(), tenantId, Kardex.TipoOperacion.SALIDA,
                cantidad, articulo.getCostoUnitario(), "Venta directa: " + articulo.getNombre());

            item.setArticulo(articulo);
            item.setNombrePlato(articulo.getNombre());
            item.setEstacionCocina("MOSTRADOR");
            item.setPrecioUnitario(precioUnitario);
            item.setCostoUnitario(articulo.getCostoUnitario());
            item.setEstadoItem(ItemComanda.EstadoItem.ENTREGADO);
        } else {
            if (nombrePlato == null || estacionCocina == null || precioUnitario == null) {
                throw new RuntimeException("Sin escandalloId ni articuloId debe indicar nombrePlato, estacionCocina y precioUnitario");
            }
            item.setNombrePlato(nombrePlato);
            item.setEstacionCocina(estacionCocina);
            item.setPrecioUnitario(precioUnitario);
            item.setEstadoItem(esVentaDeMostrador ? ItemComanda.EstadoItem.ENTREGADO : ItemComanda.EstadoItem.PENDIENTE);
        }

        ItemComanda guardado = itemComandaRepository.save(item);

        BigDecimal montoItem = item.getPrecioUnitario().multiply(cantidad);
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
    public List<ItemComanda> obtenerTableroKds(Long tenantId, String estacionCocina) {
        return itemComandaRepository.findByTenantIdAndEstacionCocinaAndEstadoItemNot(tenantId, estacionCocina, ItemComanda.EstadoItem.ENTREGADO);
    }

    /**
     * Utilidad por producto del día: recorre las comandas PAGADAS cerradas
     * ese día y agrupa sus ítems por nombre, sumando cuánto entró (precio de
     * venta) contra cuánto costó (costoUnitario congelado al vender — del
     * escandallo o del artículo de inventario). Los ítems sin costo conocido
     * (cargos manuales sin receta ni artículo, ej. "Cover") se excluyen del
     * reporte porque no hay con qué calcular su utilidad.
     */
    public List<ResumenUtilidadProducto> obtenerUtilidadDiaria(Long tenantId, java.time.LocalDate fecha) {
        java.time.LocalDate dia = fecha != null ? fecha : java.time.LocalDate.now();
        LocalDateTime desde = dia.atStartOfDay();
        LocalDateTime hasta = dia.atTime(23, 59, 59);

        List<Comanda> comandas = comandaRepository.findByTenantIdAndEstadoAndFechaCierreBetween(tenantId, Comanda.EstadoComanda.PAGADA, desde, hasta);

        java.util.Map<String, ResumenUtilidadProducto> acumulado = new java.util.LinkedHashMap<>();
        for (Comanda comanda : comandas) {
            for (ItemComanda item : itemComandaRepository.findByComandaId(comanda.getId())) {
                if (item.getCostoUnitario() == null) continue;
                ResumenUtilidadProducto r = acumulado.computeIfAbsent(item.getNombrePlato(), ResumenUtilidadProducto::new);
                BigDecimal cant = item.getCantidad();
                r.cantidadVendida = r.cantidadVendida.add(cant);
                r.ingresoTotal = r.ingresoTotal.add(item.getPrecioUnitario().multiply(cant));
                r.costoTotal = r.costoTotal.add(item.getCostoUnitario().multiply(cant));
            }
        }

        List<ResumenUtilidadProducto> resultado = new ArrayList<>(acumulado.values());
        for (ResumenUtilidadProducto r : resultado) {
            r.utilidad = r.ingresoTotal.subtract(r.costoTotal).setScale(2, RoundingMode.HALF_UP);
            r.ingresoTotal = r.ingresoTotal.setScale(2, RoundingMode.HALF_UP);
            r.costoTotal = r.costoTotal.setScale(2, RoundingMode.HALF_UP);
        }
        resultado.sort((a, b) -> b.ingresoTotal.compareTo(a.ingresoTotal));
        return resultado;
    }
}
