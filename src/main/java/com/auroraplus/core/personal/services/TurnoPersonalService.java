package com.auroraplus.core.personal.services;

import com.auroraplus.core.personal.entities.PermisoPersonal.RolPersonal;
import com.auroraplus.core.personal.entities.TurnoPersonal;
import com.auroraplus.core.personal.repositories.EmpleadoRepository;
import com.auroraplus.core.personal.repositories.TurnoPersonalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.time.LocalDate;

/** No existía en la primera entrega (solo la entidad/repositorio) — agregado junto con la validación de tenant del punto 6. */
@Service
public class TurnoPersonalService {

    private static final Set<RolPersonal> PUEDEN_ESCRIBIR = EnumSet.of(RolPersonal.RRHH, RolPersonal.NOMINA, RolPersonal.SUPERVISOR);

    @Autowired
    private TurnoPersonalRepository turnoPersonalRepository;

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private PersonalAccessService accessService;

    @Transactional
    public TurnoPersonal crear(Long tenantId, TurnoPersonal turno) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        accessService.exigirRol(tenantId, PUEDEN_ESCRIBIR);
        empleadoRepository.findByTenantIdAndId(tenantId, turno.getEmpleadoId())
            .orElseThrow(() -> new RuntimeException("Empleado no encontrado (o no pertenece a este tenant)"));
        turno.setTenantId(tenantId);
        turno.setId(null);
        return turnoPersonalRepository.save(turno);
    }

    public List<TurnoPersonal> listarDeEmpleado(Long tenantId, Long empleadoId) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        Long empleadoPropio = accessService.empleadoIdPropioSiAplica(tenantId);
        if (empleadoPropio != null && !empleadoPropio.equals(empleadoId)) {
            throw new PersonalAccessService.AccesoPersonalDenegadoException("No puedes consultar los turnos de otro empleado");
        }
        return turnoPersonalRepository.findByTenantIdAndEmpleadoId(tenantId, empleadoId);
    }

    public List<TurnoPersonal> listarRango(Long tenantId, LocalDate desde, LocalDate hasta) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        accessService.exigirVerDirectorioPersonal(tenantId);
        if (desde.isAfter(hasta)) throw new IllegalArgumentException("El inicio no puede ser posterior al fin");
        return turnoPersonalRepository.findByTenantIdAndFechaBetweenOrderByFechaAscHoraInicioAsc(tenantId, desde, hasta);
    }
}
