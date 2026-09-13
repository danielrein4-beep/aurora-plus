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
        empleadoRepository.findByTenantIdAndId(tenantId, registro.getEmpleadoId())
            .orElseThrow(() -> new RuntimeException("Empleado no encontrado (o no pertenece a este tenant)"));
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
        return registroAsistenciaRepository.save(registro);
    }

    @Transactional
    public RegistroAsistencia registrarSalida(Long tenantId, Long registroId, java.time.LocalDateTime salida) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        accessService.exigirRol(tenantId, PUEDEN_REGISTRAR);
        RegistroAsistencia registro = registroAsistenciaRepository.findById(registroId)
            .filter(r -> r.getTenantId().equals(tenantId))
            .orElseThrow(() -> new RuntimeException("Registro de asistencia no encontrado"));
        registro.setFechaHoraSalida(salida);
        return registroAsistenciaRepository.save(registro);
    }

    /** Un EMPLEADO solo puede ver SU PROPIA asistencia — nunca la de otro (contrato §1.2). */
    public List<RegistroAsistencia> listarDeEmpleado(Long tenantId, Long empleadoId) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        Long empleadoPropio = accessService.empleadoIdPropioSiAplica(tenantId);
        if (empleadoPropio != null && !empleadoPropio.equals(empleadoId)) {
            throw new PersonalAccessService.AccesoPersonalDenegadoException("No puedes consultar la asistencia de otro empleado");
        }
        return registroAsistenciaRepository.findByTenantIdAndEmpleadoId(tenantId, empleadoId);
    }
}
