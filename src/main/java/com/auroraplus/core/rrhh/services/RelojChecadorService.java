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

    /** Liquidación de nómina por horas trabajadas en un período — solo para empleados con tarifaPorHora configurada. */
    public Map<String, Object> liquidarPeriodo(Long tenantId, LocalDateTime desde, LocalDateTime hasta) {
        List<RegistroAsistencia> registros = registroAsistenciaRepository.findByTenantIdAndFechaCheckInBetween(tenantId, desde, hasta);

        Map<Long, BigDecimal> horasPorEmpleado = new LinkedHashMap<>();
        Map<Long, Empleado> empleadosPorId = new LinkedHashMap<>();

        for (RegistroAsistencia r : registros) {
            if (r.getHorasTrabajadas() == null) continue; // turno todavía abierto, no cuenta para la liquidación
            Long empId = r.getEmpleado().getId();
            horasPorEmpleado.merge(empId, r.getHorasTrabajadas(), BigDecimal::add);
            empleadosPorId.putIfAbsent(empId, r.getEmpleado());
        }

        List<Map<String, Object>> liquidacionPorEmpleado = horasPorEmpleado.entrySet().stream().map(entry -> {
            Empleado emp = empleadosPorId.get(entry.getKey());
            BigDecimal horas = entry.getValue().setScale(2, RoundingMode.HALF_UP);

            // Solo se calcula monto a pagar para POR_HORA — SALARIO_FIJO y SOLO_CONTROL
            // registran las horas igual (control interno), pero no generan un pago
            // derivado de ellas.
            boolean esPorHora = "POR_HORA".equals(emp.getTipoControl()) && emp.getTarifaPorHora() != null;
            BigDecimal tarifa = esPorHora ? emp.getTarifaPorHora() : null;
            BigDecimal totalPagar = esPorHora ? horas.multiply(tarifa).setScale(2, RoundingMode.HALF_UP) : null;

            Map<String, Object> linea = new LinkedHashMap<>();
            linea.put("empleadoId", emp.getId());
            linea.put("nombre", emp.getNombre());
            linea.put("tipoControl", emp.getTipoControl());
            linea.put("horasTrabajadas", horas);
            linea.put("tarifaPorHora", tarifa);
            linea.put("totalPagar", totalPagar);
            return linea;
        }).toList();

        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("desde", desde);
        resultado.put("hasta", hasta);
        resultado.put("empleados", liquidacionPorEmpleado);
        return resultado;
    }
}
