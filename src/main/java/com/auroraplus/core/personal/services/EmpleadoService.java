package com.auroraplus.core.personal.services;

import com.auroraplus.core.personal.entities.AsignacionEmpleado;
import com.auroraplus.core.personal.entities.Empleado;
import com.auroraplus.core.personal.entities.PermisoPersonal.RolPersonal;
import com.auroraplus.core.personal.repositories.AsignacionEmpleadoRepository;
import com.auroraplus.core.personal.repositories.EmpleadoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
public class EmpleadoService {

    private static final Set<RolPersonal> PUEDEN_ESCRIBIR = EnumSet.of(RolPersonal.RRHH, RolPersonal.NOMINA);

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private AsignacionEmpleadoRepository asignacionEmpleadoRepository;

    @Autowired
    private PersonalAccessService accessService;

    @Autowired
    private AuditoriaPersonalService auditoriaService;

    public List<Empleado> listar(Long tenantId) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_PERSONAL);
        return empleadoRepository.findByTenantId(tenantId);
    }

    @Transactional
    public Empleado crear(Long tenantId, Empleado empleado) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_PERSONAL);
        accessService.exigirRol(tenantId, PUEDEN_ESCRIBIR);
        if (empleado.getNombreCompleto() == null || empleado.getNombreCompleto().isBlank()) {
            throw new RuntimeException("El nombre completo es obligatorio");
        }
        if (empleado.getFechaIngreso() == null) {
            throw new RuntimeException("La fecha de ingreso es obligatoria");
        }
        empleado.setTenantId(tenantId);
        empleado.setId(null);
        Empleado guardado = empleadoRepository.save(empleado);
        auditoriaService.registrar(tenantId, accessService.resolverUsuarioIdActual(tenantId),
            "CREAR", "Empleado", guardado.getId(), "Empleado creado: " + guardado.getNombreCompleto());
        return guardado;
    }

    /**
     * Asigna (o reasigna) cargo/salario — nunca hace UPDATE sobre una AsignacionEmpleado
     * existente: cierra la vigente (si hay) en la fecha de corte y crea una nueva (contrato §2.1).
     */
    @Transactional
    public AsignacionEmpleado asignarCargo(Long tenantId, Long empleadoId, AsignacionEmpleado nueva, LocalDate fechaCorte) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_PERSONAL);
        accessService.exigirRol(tenantId, PUEDEN_ESCRIBIR);
        empleadoRepository.findByTenantIdAndId(tenantId, empleadoId)
            .orElseThrow(() -> new RuntimeException("Empleado no encontrado"));

        asignacionEmpleadoRepository.findByTenantIdAndEmpleadoIdAndVigenciaHastaIsNull(tenantId, empleadoId)
            .ifPresent(actual -> {
                actual.setVigenciaHasta(fechaCorte.minusDays(1));
                asignacionEmpleadoRepository.save(actual);
            });

        nueva.setTenantId(tenantId);
        nueva.setEmpleadoId(empleadoId);
        nueva.setId(null);
        nueva.setVigenciaDesde(fechaCorte);
        nueva.setVigenciaHasta(null);
        AsignacionEmpleado guardada = asignacionEmpleadoRepository.save(nueva);
        auditoriaService.registrar(tenantId, accessService.resolverUsuarioIdActual(tenantId),
            "ASIGNAR_CARGO", "Empleado", empleadoId, "Nueva asignación de cargo desde " + fechaCorte);
        return guardada;
    }
}
