package com.auroraplus.modules.veterinaria.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.veterinaria.entities.CobroConsultaVet;
import com.auroraplus.modules.veterinaria.entities.Mascota;
import com.auroraplus.modules.veterinaria.entities.Propietario;
import com.auroraplus.modules.veterinaria.repositories.CobroConsultaVetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Servicio financiero de la Vertical Veterinaria.
 * Procesa cobros de consultas, vacunas y cirugías con idempotencia estricta
 * e integración directa al Motor Financiero Central de Aurora+.
 */
@Service
public class CobroVeterinariaService {

    @Autowired
    private CobroConsultaVetRepository cobroConsultaVetRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    public static class CobroRequest {
        public String claveIdempotencia;
        public Long mascotaId;
        public Long propietarioId;
        public Long consultaId;
        public Long citaId;
        public Long procedimientoId;
        public String concepto;
        public BigDecimal montoTotal;
        public String monedaCobrada;
        public BigDecimal montoRecibido;
        public String monedaPago;
        public CobroConsultaVet.MetodoPago metodoPago;
        public String referenciaPago;
        public String cajeroUsuario;
    }

    @Transactional
    public CobroConsultaVet procesarCobro(Long tenantId, CobroRequest req, Mascota mascota, Propietario propietario) {
        if (req.claveIdempotencia == null || req.claveIdempotencia.isBlank()) {
            throw new IllegalArgumentException("La clave de idempotencia es obligatoria para garantizar la integridad de caja.");
        }

        // 1. Idempotencia: Verificar si ya existe este cobro registrado
        Optional<CobroConsultaVet> existente = cobroConsultaVetRepository.findByClaveIdempotencia(req.claveIdempotencia);
        if (existente.isPresent()) {
            return existente.get();
        }

        if (req.montoTotal == null || req.montoTotal.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto total a cobrar debe ser mayor a cero.");
        }

        String monedaCobrada = (req.monedaCobrada != null && !req.monedaCobrada.isBlank()) ? req.monedaCobrada : "USD";
        String monedaPago = (req.monedaPago != null && !req.monedaPago.isBlank()) ? req.monedaPago : monedaCobrada;
        BigDecimal montoRecibido = req.montoRecibido != null ? req.montoRecibido : req.montoTotal;

        String conceptoCaja = (req.concepto != null && !req.concepto.isBlank())
            ? "VET: " + req.concepto
            : "VET: Cobro de servicio veterinario - Paciente: " + (mascota != null ? mascota.getNombre() : "General");

        // 2. Integración al Motor Financiero Central
        // montoTotal viene en la moneda en que se cobró (no necesariamente la base del negocio).
        // Si se paga en esa misma moneda, se asienta tal cual; si se paga en otra, el motor
        // convierte desde la base y valida que lo recibido alcance.
        MovimientoCaja movCaja = monedaPago.equalsIgnoreCase(monedaCobrada)
            ? motorFinancieroService.registrarMovimientoEnMoneda(
                tenantId, MovimientoCaja.TipoMovimiento.INGRESO, req.montoTotal, monedaCobrada, conceptoCaja)
            : motorFinancieroService.registrarMovimientoMultiMoneda(
                tenantId,
                MovimientoCaja.TipoMovimiento.INGRESO,
                motorFinancieroService.convertirAMonedaBase(tenantId, req.montoTotal, monedaCobrada),
                monedaPago,
                montoRecibido,
                conceptoCaja
            );
        if (req.metodoPago != null) movCaja.setMetodoPago(req.metodoPago.name());

        // 3. Registrar el Cobro en la vertical veterinaria
        CobroConsultaVet cobro = new CobroConsultaVet();
        cobro.setTenantId(tenantId);
        cobro.setClaveIdempotencia(req.claveIdempotencia);
        cobro.setMascota(mascota);
        cobro.setPropietario(propietario != null ? propietario : (mascota != null ? mascota.getPropietario() : null));
        cobro.setConsultaId(req.consultaId);
        cobro.setCitaId(req.citaId);
        cobro.setProcedimientoId(req.procedimientoId);
        cobro.setConcepto(conceptoCaja);
        cobro.setMontoTotal(req.montoTotal);
        cobro.setMonedaCobrada(monedaCobrada);
        cobro.setMontoRecibido(montoRecibido);
        cobro.setMonedaPago(monedaPago);
        cobro.setTasaCambio(movCaja.getTasaAplicada());
        cobro.setMetodoPago(req.metodoPago != null ? req.metodoPago : CobroConsultaVet.MetodoPago.EFECTIVO);
        cobro.setReferenciaPago(req.referenciaPago);
        cobro.setFechaHora(LocalDateTime.now());
        cobro.setCajeroUsuario(req.cajeroUsuario);
        cobro.setEstado(CobroConsultaVet.EstadoCobro.PAGADO);
        cobro.setMovimientoCajaId(movCaja.getId());

        return cobroConsultaVetRepository.save(cobro);
    }

    public List<CobroConsultaVet> historialPorMascota(Long mascotaId) {
        return cobroConsultaVetRepository.findByMascotaIdOrderByFechaHoraDesc(mascotaId);
    }

    public List<CobroConsultaVet> historialPorPropietario(Long propietarioId) {
        return cobroConsultaVetRepository.findByPropietarioIdOrderByFechaHoraDesc(propietarioId);
    }

    public List<CobroConsultaVet> listarPorRangoFechas(LocalDateTime inicio, LocalDateTime fin) {
        return cobroConsultaVetRepository.findByFechaHoraBetweenOrderByFechaHoraDesc(inicio, fin);
    }
}
