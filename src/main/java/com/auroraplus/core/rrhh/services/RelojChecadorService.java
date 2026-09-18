package com.auroraplus.core.rrhh.services;

import com.auroraplus.core.rrhh.entities.Empleado;
import com.auroraplus.core.rrhh.entities.RegistroAsistencia;
import com.auroraplus.core.rrhh.repositories.EmpleadoRepository;
import com.auroraplus.core.rrhh.repositories.RegistroAsistenciaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Reloj checador: marca entrada/salida y calcula horas trabajadas por turno. */
@Service
public class RelojChecadorService {

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private RegistroAsistenciaRepository registroAsistenciaRepository;

    @Transactional
    public RegistroAsistencia checkIn(Long tenantId, Long empleadoId) {
        Empleado empleado = empleadoRepository.findById(empleadoId)
            .orElseThrow(() -> new RuntimeException("Empleado no encontrado"));
        if (!empleado.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Empleado no pertenece a este tenant");
        }
        if (!Boolean.TRUE.equals(empleado.getActivo())) {
            throw new RuntimeException("El empleado está inactivo");
        }
        if (registroAsistenciaRepository.findTurnoAbierto(empleadoId).isPresent()) {
            throw new RuntimeException("El empleado ya tiene un turno abierto (marcó entrada sin marcar salida antes)");
        }

        RegistroAsistencia registro = new RegistroAsistencia();
        registro.setTenantId(tenantId);
        registro.setEmpleado(empleado);
        registro.setFechaCheckIn(LocalDateTime.now());
        return registroAsistenciaRepository.save(registro);
    }

    @Transactional
    public RegistroAsistencia checkOut(Long tenantId, Long empleadoId) {
        RegistroAsistencia registro = registroAsistenciaRepository.findTurnoAbierto(empleadoId)
            .orElseThrow(() -> new RuntimeException("El empleado no tiene un turno abierto"));
        if (!registro.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Registro no pertenece a este tenant");
        }

        LocalDateTime ahora = LocalDateTime.now();
        registro.setFechaCheckOut(ahora);

        Duration duracion = Duration.between(registro.getFechaCheckIn(), ahora);
        BigDecimal horas = BigDecimal.valueOf(duracion.toMinutes())
            .divide(new BigDecimal("60"), 4, RoundingMode.HALF_UP);
        registro.setHorasTrabajadas(horas);

        return registroAsistenciaRepository.save(registro);
    }

    /** Liquidación de nómina en un período: horas fichadas (todos) + monto a pagar según tipoControl. */
    public Map<String, Object> liquidarPeriodo(Long tenantId, LocalDateTime desde, LocalDateTime hasta) {
        List<RegistroAsistencia> registros = registroAsistenciaRepository.findByTenantIdAndFechaCheckInBetween(tenantId, desde, hasta);

        Map<Long, BigDecimal> horasPorEmpleado = new LinkedHashMap<>();
        for (RegistroAsistencia r : registros) {
            if (r.getHorasTrabajadas() == null) continue; // turno todavía abierto, no cuenta para la liquidación
            horasPorEmpleado.merge(r.getEmpleado().getId(), r.getHorasTrabajadas(), BigDecimal::add);
        }

        // SALARIO_FIJO se debe ver en la liquidación aunque el empleado no haya
        // fichado ningún turno en el período (su pago no depende de las horas) —
        // por eso se parte del directorio completo, no solo de quienes ficharon.
        List<Empleado> empleadosActivos = empleadoRepository.findAll().stream()
            .filter(e -> Boolean.TRUE.equals(e.getActivo()))
            .toList();

        List<Map<String, Object>> liquidacionPorEmpleado = empleadosActivos.stream().map(emp -> {
            BigDecimal horas = horasPorEmpleado.getOrDefault(emp.getId(), BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

            boolean esPorHora = "POR_HORA".equals(emp.getTipoControl()) && emp.getTarifaPorHora() != null;
            boolean esSalarioFijo = "SALARIO_FIJO".equals(emp.getTipoControl()) && emp.getSalarioFijo() != null;

            BigDecimal tarifa = esPorHora ? emp.getTarifaPorHora() : null;
            BigDecimal totalPagar = esPorHora ? horas.multiply(tarifa).setScale(2, RoundingMode.HALF_UP)
                : esSalarioFijo ? emp.getSalarioFijo().setScale(2, RoundingMode.HALF_UP)
                : null;
            String monedaPago = esPorHora ? "USD" : esSalarioFijo ? emp.getMonedaSalario() : null;

            Map<String, Object> linea = new LinkedHashMap<>();
            linea.put("empleadoId", emp.getId());
            linea.put("nombre", emp.getNombre());
            linea.put("tipoControl", emp.getTipoControl());
            linea.put("horasTrabajadas", horas);
            linea.put("tarifaPorHora", tarifa);
            linea.put("totalPagar", totalPagar);
            linea.put("monedaPago", monedaPago);
            return linea;
        }).toList();

        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("desde", desde);
        resultado.put("hasta", hasta);
        resultado.put("empleados", liquidacionPorEmpleado);
        return resultado;
    }
}
