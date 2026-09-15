package com.auroraplus.core.personal.services;

import com.auroraplus.core.personal.entities.PermisoPersonal.RolPersonal;
import com.auroraplus.core.personal.entities.RegistroAsistencia;
import com.auroraplus.core.personal.entities.TurnoPersonal;
import com.auroraplus.core.personal.repositories.EmpleadoRepository;
import com.auroraplus.core.personal.repositories.RegistroAsistenciaRepository;
import com.auroraplus.core.personal.repositories.TurnoPersonalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
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

    /**
     * Doble entrada concurrente (hardening pre-piloto): la verificación previa de abajo
     * (findFirst...FechaHoraSalidaIsNull) es solo el camino feliz — dos requests concurrentes del
     * mismo empleado pueden atravesar AMBAS esa lectura antes de que cualquiera confirme su
     * INSERT (TOCTOU clásico). La garantía real es el UNIQUE(tenant_id, marcador_entrada_abierta)
     * de la entidad: si dos transacciones intentan abrir entrada para el mismo empleado a la vez,
     * la base de datos deja pasar la primera y revienta la segunda con
     * DataIntegrityViolationException, que acá se traduce al mismo mensaje de negocio que el
     * camino feliz — ver RegistroAsistencia y V16__nucleo_personal_y_nomina.sql.
     */
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
        registro.setMarcadorEntradaAbierta(registro.getEmpleadoId());
        try {
            return registroAsistenciaRepository.saveAndFlush(registro);
        } catch (DataIntegrityViolationException conflicto) {
            throw new IllegalStateException("El empleado ya tiene una entrada abierta (registrada por una solicitud concurrente)");
        }
    }

    /**
     * Doble salida concurrente / no sobrescribir salida (hardening pre-piloto): antes esto era
     * leer -> comprobar en Java -> guardar, con la misma ventana de carrera que registrarEntrada.
     * Ahora el cierre real es un UPDATE atómico condicionado a "sigue abierto"
     * (cerrarSiSigueAbierto) — la base de datos toma el lock de fila al evaluarlo, así que entre
     * dos solicitudes concurrentes sobre el MISMO registro solo una consigue el UPDATE; la otra
     * ve 0 filas afectadas y se rechaza explícitamente, nunca pisa el valor ya guardado.
     */
    @Transactional
    public RegistroAsistencia registrarSalida(Long tenantId, Long registroId, java.time.LocalDateTime salida) {
        accessService.exigirFlag(tenantId, PersonalAccessService.FLAG_ASISTENCIA);
        accessService.exigirRol(tenantId, PUEDEN_REGISTRAR);
        RegistroAsistencia registro = registroAsistenciaRepository.findById(registroId)
            .filter(r -> r.getTenantId().equals(tenantId))
            .orElseThrow(() -> new RuntimeException("Registro de asistencia no encontrado"));
        if (salida == null) throw new IllegalArgumentException("La fecha de salida es obligatoria");
        if (salida.isBefore(registro.getFechaHoraEntrada())) {
            throw new IllegalArgumentException("La salida no puede ser anterior a la entrada");
        }
        int actualizadas = registroAsistenciaRepository.cerrarSiSigueAbierto(registroId, tenantId, salida);
        if (actualizadas == 0) {
            throw new IllegalStateException("Este registro ya tiene una salida registrada (posiblemente cerrada por otra solicitud)");
        }
        return registroAsistenciaRepository.findById(registroId)
            .orElseThrow(() -> new RuntimeException("Registro de asistencia no encontrado"));
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
