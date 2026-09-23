package com.auroraplus.core.financiero.services;

import com.auroraplus.core.config.entities.LicenciaTenant;
import com.auroraplus.core.config.repositories.LicenciaTenantRepository;
import com.auroraplus.core.financiero.entities.CuentaBancaria;
import com.auroraplus.core.financiero.entities.MovimientoCuentaBancaria;
import com.auroraplus.core.financiero.repositories.CuentaBancariaRepository;
import com.auroraplus.core.financiero.repositories.MovimientoCuentaBancariaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Organiza "dónde está guardado el dinero" (Caja Efectivo, Cuenta Dólares,
 * cada banco) — independiente del ledger de ventas/gastos por moneda que ya
 * lleva MovimientoCaja. Cada movimiento aquí queda registrado con su
 * saldoAnterior/saldoNuevo, así el historial de una cuenta se puede auditar
 * sin volver a sumar todo desde el inicio.
 */
@Service
public class CuentaBancariaService {

    @Autowired
    private CuentaBancariaRepository cuentaBancariaRepository;

    @Autowired
    private MovimientoCuentaBancariaRepository movimientoRepository;

    @Autowired
    private LicenciaTenantRepository licenciaTenantRepository;

    /**
     * Antes de listar, se auto-provee una cuenta por cada método de pago que el
     * dueño ya activó en Configuración > Pagos (Pago Móvil, Zelle, Binance,
     * Bancolombia) y que todavía no tenga su cuenta vinculada — así el dueño no
     * tiene que crearla a mano dos veces. Las cuentas manuales (sin vínculo) se
     * listan siempre; las vinculadas a un método que el dueño desactivó después
     * se OCULTAN (no se borran, para no perder saldo/historial ya acumulado).
     */
    @Transactional
    public List<CuentaBancaria> listarConSincronizacion(Long tenantId) {
        LicenciaTenant licencia = licenciaTenantRepository.findByTenantId(tenantId).orElse(null);
        Set<String> metodosActivos = metodosPagoConfigurados(licencia);

        for (String metodo : metodosActivos) {
            if (cuentaBancariaRepository.findByTenantIdAndMetodoPagoVinculado(tenantId, metodo).isEmpty()) {
                CuentaBancaria nueva = crear(tenantId, nombreParaMetodo(metodo), tipoParaMetodo(metodo), monedaParaMetodo(metodo), BigDecimal.ZERO);
                nueva.setMetodoPagoVinculado(metodo);
                cuentaBancariaRepository.save(nueva);
            }
        }

        List<CuentaBancaria> todas = cuentaBancariaRepository.findByTenantIdOrderByFechaCreacionAsc(tenantId);
        List<CuentaBancaria> visibles = new ArrayList<>();
        for (CuentaBancaria c : todas) {
            if (c.getMetodoPagoVinculado() == null || metodosActivos.contains(c.getMetodoPagoVinculado())) {
                visibles.add(c);
            }
        }
        return visibles;
    }

    private Set<String> metodosPagoConfigurados(LicenciaTenant licencia) {
        Set<String> activos = new java.util.HashSet<>();
        activos.add("EFECTIVO"); // siempre disponible — el efectivo no se "configura" en Pagos
        if (licencia == null) return activos;

        if (licencia.isPagoMovilActivo()
            && notBlank(licencia.getPagoMovilBanco()) && notBlank(licencia.getPagoMovilTelefono()) && notBlank(licencia.getPagoMovilDocumento())) {
            activos.add("PAGO_MOVIL");
        }
        if (licencia.isZelleActivo() && notBlank(licencia.getZelleCorreo())) {
            activos.add("ZELLE");
        }
        if (licencia.isBinanceManualActivo() && notBlank(licencia.getBinancePayId())) {
            activos.add("BINANCE");
        }
        if (licencia.isBancolombiaActivo() && notBlank(licencia.getBancolombiaCuenta())) {
            activos.add("BANCOLOMBIA");
        }
        return activos;
    }

    private boolean notBlank(String s) { return s != null && !s.isBlank(); }

    private String nombreParaMetodo(String metodo) {
        return switch (metodo) {
            case "EFECTIVO" -> "Caja Efectivo";
            case "PAGO_MOVIL" -> "Pago Móvil";
            case "ZELLE" -> "Zelle";
            case "BINANCE" -> "Binance Pay";
            case "BANCOLOMBIA" -> "Bancolombia";
            default -> metodo;
        };
    }

    private CuentaBancaria.Tipo tipoParaMetodo(String metodo) {
        return switch (metodo) {
            case "EFECTIVO" -> CuentaBancaria.Tipo.EFECTIVO;
            case "PAGO_MOVIL" -> CuentaBancaria.Tipo.PAGO_MOVIL;
            case "ZELLE", "BINANCE" -> CuentaBancaria.Tipo.BILLETERA_DIGITAL;
            case "BANCOLOMBIA" -> CuentaBancaria.Tipo.BANCO;
            default -> CuentaBancaria.Tipo.OTRO;
        };
    }

    private String monedaParaMetodo(String metodo) {
        return switch (metodo) {
            case "PAGO_MOVIL" -> "VES";
            case "BANCOLOMBIA" -> "COP";
            default -> "USD"; // EFECTIVO, ZELLE, BINANCE
        };
    }

    public CuentaBancaria crear(Long tenantId, String nombre, CuentaBancaria.Tipo tipo, String moneda, BigDecimal saldoInicial) {
        if (nombre == null || nombre.isBlank()) throw new RuntimeException("El nombre de la cuenta es obligatorio");
        if (moneda == null || moneda.isBlank()) throw new RuntimeException("La moneda de la cuenta es obligatoria");

        CuentaBancaria cuenta = new CuentaBancaria();
        cuenta.setTenantId(tenantId);
        cuenta.setNombre(nombre.trim());
        cuenta.setTipo(tipo != null ? tipo : CuentaBancaria.Tipo.BANCO);
        cuenta.setMoneda(moneda.trim().toUpperCase());
        cuenta.setSaldo(saldoInicial != null ? saldoInicial : BigDecimal.ZERO);
        CuentaBancaria guardada = cuentaBancariaRepository.save(cuenta);

        if (guardada.getSaldo().compareTo(BigDecimal.ZERO) != 0) {
            registrarMovimiento(guardada, MovimientoCuentaBancaria.Tipo.INGRESO, guardada.getSaldo(), BigDecimal.ZERO, guardada.getSaldo(), "Saldo inicial al crear la cuenta");
        }
        return guardada;
    }

    @Transactional
    public CuentaBancaria ingresar(Long tenantId, Long cuentaId, BigDecimal monto, String concepto) {
        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) throw new RuntimeException("El monto debe ser mayor a cero");
        CuentaBancaria cuenta = obtenerPropia(tenantId, cuentaId);
        BigDecimal anterior = cuenta.getSaldo();
        BigDecimal nuevo = anterior.add(monto);
        cuenta.setSaldo(nuevo);
        cuentaBancariaRepository.save(cuenta);
        registrarMovimiento(cuenta, MovimientoCuentaBancaria.Tipo.INGRESO, monto, anterior, nuevo, concepto != null && !concepto.isBlank() ? concepto : "Ingreso manual");
        return cuenta;
    }

    @Transactional
    public CuentaBancaria retirar(Long tenantId, Long cuentaId, BigDecimal monto, String concepto) {
        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) throw new RuntimeException("El monto debe ser mayor a cero");
        CuentaBancaria cuenta = obtenerPropia(tenantId, cuentaId);
        BigDecimal anterior = cuenta.getSaldo();
        if (anterior.compareTo(monto) < 0) throw new RuntimeException("Saldo insuficiente en " + cuenta.getNombre());
        BigDecimal nuevo = anterior.subtract(monto);
        cuenta.setSaldo(nuevo);
        cuentaBancariaRepository.save(cuenta);
        registrarMovimiento(cuenta, MovimientoCuentaBancaria.Tipo.EGRESO, monto, anterior, nuevo, concepto != null && !concepto.isBlank() ? concepto : "Retiro manual");
        return cuenta;
    }

    /** Solo entre cuentas de la MISMA moneda — evitar inventar una tasa de cambio implícita en un simple traslado de dinero. */
    @Transactional
    public void transferir(Long tenantId, Long origenId, Long destinoId, BigDecimal monto) {
        if (origenId.equals(destinoId)) throw new RuntimeException("La cuenta de origen y destino no pueden ser la misma");
        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) throw new RuntimeException("El monto debe ser mayor a cero");

        CuentaBancaria origen = obtenerPropia(tenantId, origenId);
        CuentaBancaria destino = obtenerPropia(tenantId, destinoId);
        if (!origen.getMoneda().equals(destino.getMoneda())) {
            throw new RuntimeException("Solo se puede transferir entre cuentas de la misma moneda (" + origen.getMoneda() + " vs " + destino.getMoneda() + ")");
        }
        if (origen.getSaldo().compareTo(monto) < 0) throw new RuntimeException("Saldo insuficiente en " + origen.getNombre());

        BigDecimal saldoAnteriorOrigen = origen.getSaldo();
        BigDecimal saldoNuevoOrigen = saldoAnteriorOrigen.subtract(monto);
        origen.setSaldo(saldoNuevoOrigen);
        cuentaBancariaRepository.save(origen);

        BigDecimal saldoAnteriorDestino = destino.getSaldo();
        BigDecimal saldoNuevoDestino = saldoAnteriorDestino.add(monto);
        destino.setSaldo(saldoNuevoDestino);
        cuentaBancariaRepository.save(destino);

        registrarMovimiento(origen, MovimientoCuentaBancaria.Tipo.TRANSFERENCIA_SALIDA, monto, saldoAnteriorOrigen, saldoNuevoOrigen, "Transferencia a " + destino.getNombre());
        registrarMovimiento(destino, MovimientoCuentaBancaria.Tipo.TRANSFERENCIA_ENTRADA, monto, saldoAnteriorDestino, saldoNuevoDestino, "Transferencia desde " + origen.getNombre());
    }

    /** Solo cuentas creadas a mano — las vinculadas a un método de pago (Pago Móvil,
     * Zelle, etc.) las administra la sincronización automática, no se borran acá:
     * si el dueño ya no las quiere, las desactiva en Configuración > Pagos. */
    @Transactional
    public void eliminar(Long tenantId, Long cuentaId) {
        CuentaBancaria cuenta = obtenerPropia(tenantId, cuentaId);
        if (cuenta.getMetodoPagoVinculado() != null) {
            throw new RuntimeException("Esta cuenta está vinculada a " + cuenta.getNombre() + " en Configuración > Pagos — desactívala ahí, no se puede borrar directamente");
        }
        movimientoRepository.deleteAll(movimientoRepository.findByTenantIdAndCuentaIdOrderByFechaRegistroDesc(tenantId, cuentaId));
        cuentaBancariaRepository.delete(cuenta);
    }

    public CuentaBancaria actualizar(Long tenantId, Long cuentaId, String nombre, CuentaBancaria.Tipo tipo, Boolean activa) {
        CuentaBancaria cuenta = obtenerPropia(tenantId, cuentaId);
        if (nombre != null && !nombre.isBlank()) cuenta.setNombre(nombre.trim());
        if (tipo != null) cuenta.setTipo(tipo);
        if (activa != null) cuenta.setActiva(activa);
        return cuentaBancariaRepository.save(cuenta);
    }

    private CuentaBancaria obtenerPropia(Long tenantId, Long cuentaId) {
        return cuentaBancariaRepository.findByIdAndTenantId(cuentaId, tenantId)
            .orElseThrow(() -> new RuntimeException("Cuenta bancaria no encontrada"));
    }

    private void registrarMovimiento(CuentaBancaria cuenta, MovimientoCuentaBancaria.Tipo tipo, BigDecimal monto,
                                      BigDecimal saldoAnterior, BigDecimal saldoNuevo, String concepto) {
        MovimientoCuentaBancaria mov = new MovimientoCuentaBancaria();
        mov.setTenantId(cuenta.getTenantId());
        mov.setCuentaId(cuenta.getId());
        mov.setTipo(tipo);
        mov.setMonto(monto);
        mov.setSaldoAnterior(saldoAnterior);
        mov.setSaldoNuevo(saldoNuevo);
        mov.setConcepto(concepto);
        movimientoRepository.save(mov);
    }
}
