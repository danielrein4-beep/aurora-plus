package com.auroraplus.modules.salud.services;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.services.MotorFinancieroService;
import com.auroraplus.modules.salud.entities.CobroConsulta;
import com.auroraplus.modules.salud.repositories.CobroConsultaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Servicio financiero de la Vertical de Salud — Procesa cobros de consultas y
 * procedimientos médicos con idempotencia estricta (Offline-First) e integrándose
 * OBLIGATORIAMENTE al Motor Financiero Multi-Moneda Central de Aurora+.
 */
@Service
public class SaludFinanzasService {

    @Autowired
    private CobroConsultaRepository cobroConsultaRepository;

    @Autowired
    private MotorFinancieroService motorFinancieroService;

    public static class CobroRequest {
        public String claveIdempotencia; // Obligatorio para Offline-First
        public Long pacienteId;
        public Long consultaId;
        public Long citaId;
        public Long procedimientoId;
        public String concepto;
        public BigDecimal montoTotal; // Monto en la moneda base del catálogo/consulta (ej. USD)
        public String monedaCobrada;  // ej. "USD"
        public BigDecimal montoRecibido; // Monto efectivamente entregado por el paciente
        public String monedaPago;     // Moneda en que pagó el paciente (ej. "VES", "COP", "USD")
        public CobroConsulta.MetodoPago metodoPago;
        public String referenciaPago;
        public String cajeroUsuario;
    }

    /**
     * Procesa el cobro de una consulta médica.
     * Garantiza idempotencia: Si la claveIdempotencia ya fue procesada, retorna el cobro
     * registrado previamente sin duplicar movimientos de caja ni asientos contables.
     */
    @Transactional
    public CobroConsulta procesarCobro(Long tenantId, CobroRequest req, com.auroraplus.modules.salud.entities.Paciente paciente) {
        if (req.claveIdempotencia == null || req.claveIdempotencia.isBlank()) {
            throw new IllegalArgumentException("La clave de idempotencia es obligatoria para garantizar la integridad de caja.");
        }

        // 1. Idempotencia: Verificar si ya existe este cobro registrado
        Optional<CobroConsulta> existente = cobroConsultaRepository.findByClaveIdempotencia(req.claveIdempotencia);
        if (existente.isPresent()) {
            return existente.get(); // Reintento seguro (Offline-First): retorna el cobro ya procesado
        }

        if (req.montoTotal == null || req.montoTotal.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto total a cobrar debe ser mayor a cero.");
        }

        String monedaCobrada = (req.monedaCobrada != null && !req.monedaCobrada.isBlank()) ? req.monedaCobrada : "USD";
        String monedaPago = (req.monedaPago != null && !req.monedaPago.isBlank()) ? req.monedaPago : monedaCobrada;
        BigDecimal montoRecibido = req.montoRecibido != null ? req.montoRecibido : req.montoTotal;

        String conceptoCaja = (req.concepto != null && !req.concepto.isBlank())
            ? "SALUD: " + req.concepto
            : "SALUD: Cobro de consulta médica - Paciente: " + (paciente != null ? paciente.getNombreCompleto() : "General");

        // 2. Integración Financiera Centralizada: Asentar ingreso real en movimientos_caja
        MovimientoCaja movCaja = motorFinancieroService.registrarMovimientoMultiMoneda(
            tenantId,
            MovimientoCaja.TipoMovimiento.INGRESO,
            req.montoTotal,
            monedaPago,
            montoRecibido,
            conceptoCaja
        );

        // 3. Registrar el Cobro en la Vertical de Salud enlazado al movimiento de caja
        CobroConsulta cobro = new CobroConsulta();
        cobro.setTenantId(tenantId);
        cobro.setClaveIdempotencia(req.claveIdempotencia);
        cobro.setPaciente(paciente);
        cobro.setConsultaId(req.consultaId);
        cobro.setCitaId(req.citaId);
        cobro.setProcedimientoId(req.procedimientoId);
        cobro.setConcepto(conceptoCaja);
        cobro.setMontoTotal(req.montoTotal);
        cobro.setMonedaCobrada(monedaCobrada);
        cobro.setMontoRecibido(montoRecibido);
        cobro.setMonedaPago(monedaPago);
        cobro.setTasaCambio(movCaja.getTasaAplicada());
        cobro.setMetodoPago(req.metodoPago != null ? req.metodoPago : CobroConsulta.MetodoPago.EFECTIVO);
        cobro.setReferenciaPago(req.referenciaPago);
        cobro.setFechaHora(LocalDateTime.now());
        cobro.setCajeroUsuario(req.cajeroUsuario);
        cobro.setEstado(CobroConsulta.EstadoCobro.PAGADO);
        cobro.setMovimientoCajaId(movCaja.getId());

        return cobroConsultaRepository.save(cobro);
    }

    public List<CobroConsulta> historialPorPaciente(Long pacienteId) {
        return cobroConsultaRepository.findByPacienteIdOrderByFechaHoraDesc(pacienteId);
    }

    public List<CobroConsulta> listarPorRangoFechas(LocalDateTime inicio, LocalDateTime fin) {
        return cobroConsultaRepository.findByFechaHoraBetweenOrderByFechaHoraDesc(inicio, fin);
    }
}
