package com.auroraplus.core.personal.services;

import com.auroraplus.core.personal.entities.PermisoPersonal.RolPersonal;
import com.auroraplus.core.personal.entities.RegistroAsistencia;
import com.auroraplus.core.personal.entities.TurnoPersonal;
import com.auroraplus.core.personal.repositories.EmpleadoRepository;
import com.auroraplus.core.personal.repositories.RegistroAsistenciaRepository;
import com.auroraplus.core.personal.repositories.TurnoPersonalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.time.LocalDate;

@Service
public class AsistenciaService {

    private static final Set<RolPersonal> PUEDEN_REGISTRAR = EnumSet.of(RolPersonal.RRHH, RolPersonal.NOMINA, RolPersonal.SUPERVISOR);

    @Autowired
    private RegistroAsistenciaRepository registroAsistenciaRepository;

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private TurnoPersonalRepository turnoPersonalRepository;

    @Autowired
    private PersonalAccessService accessService;

    @Transactional
    public RegistroAsistencia registrarEntrada(Long tenantId, RegistroAsistencia registro) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        accessService.exigirRol(tenantId, PUEDEN_REGISTRAR);
        if (registro.getEmpleadoId() == null || registro.getFechaHoraEntrada() == null || registro.getOrigen() == null) {
            throw new IllegalArgumentException("Empleado, fecha de entrada y origen son obligatorios");
        }
        var empleado = empleadoRepository.findByTenantIdAndId(tenantId, registro.getEmpleadoId())
            .orElseThrow(() -> new RuntimeException("Empleado no encontrado (o no pertenece a este tenant)"));
        if (empleado.getFechaEgreso() != null) throw new IllegalStateException("No se puede registrar asistencia a un empleado inactivo");
        if (registroAsistenciaRepository
                .findFirstByTenantIdAndEmpleadoIdAndFechaHoraSalidaIsNullOrderByFechaHoraEntradaDesc(tenantId, registro.getEmpleadoId())
                .isPresent()) {
            throw new IllegalStateException("El empleado ya tiene una entrada abierta");
        }
        if (registro.getTurnoId() != null) {
            TurnoPersonal turno = turnoPersonalRepository.findById(registro.getTurnoId())
                .filter(t -> t.getTenantId().equals(tenantId))
                .orElseThrow(() -> new RuntimeException("Turno no encontrado (o no pertenece a este tenant)"));
            if (!turno.getEmpleadoId().equals(registro.getEmpleadoId())) {
                throw new RuntimeException("El turno indicado no pertenece a este empleado");
            }
        }
        registro.setTenantId(tenantId);
        registro.setId(null);
        registro.setFechaHoraSalida(null);
        return registroAsistenciaRepository.save(registro);
    }

    @Transactional
    public RegistroAsistencia registrarSalida(Long tenantId, Long registroId, java.time.LocalDateTime salida) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        accessService.exigirRol(tenantId, PUEDEN_REGISTRAR);
        RegistroAsistencia registro = registroAsistenciaRepository.findById(registroId)
            .filter(r -> r.getTenantId().equals(tenantId))
            .orElseThrow(() -> new RuntimeException("Registro de asistencia no encontrado"));
        if (salida == null) throw new IllegalArgumentException("La fecha de salida es obligatoria");
        if (registro.getFechaHoraSalida() != null) throw new IllegalStateException("Este registro ya tiene una salida");
        if (salida.isBefore(registro.getFechaHoraEntrada())) {
            throw new IllegalArgumentException("La salida no puede ser anterior a la entrada");
        }
        registro.setFechaHoraSalida(salida);
        return registroAsistenciaRepository.save(registro);
    }

    /** Un EMPLEADO solo puede ver SU PROPIA asistencia — nunca la de otro (contrato §1.2). */
    public List<RegistroAsistencia> listarDeEmpleado(Long tenantId, Long empleadoId) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        accessService.exigirVerDatosDeEmpleado(tenantId, empleadoId);
        empleadoRepository.findByTenantIdAndId(tenantId, empleadoId)
            .orElseThrow(() -> new RuntimeException("Empleado no encontrado (o no pertenece a este tenant)"));
        return registroAsistenciaRepository.findByTenantIdAndEmpleadoId(tenantId, empleadoId);
    }

    public List<RegistroAsistencia> listarRango(Long tenantId, LocalDate desde, LocalDate hasta) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        accessService.exigirVerDirectorioPersonal(tenantId);
        if (desde.isAfter(hasta)) throw new IllegalArgumentException("El inicio no puede ser posterior al fin");
        return registroAsistenciaRepository
            .findByTenantIdAndFechaHoraEntradaGreaterThanEqualAndFechaHoraEntradaLessThanOrderByFechaHoraEntradaDesc(
                tenantId, desde.atStartOfDay(), hasta.plusDays(1).atStartOfDay());
    }
}
