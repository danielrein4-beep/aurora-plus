package com.auroraplus.modules.salud.services;

import com.auroraplus.modules.salud.entities.Paciente;
import com.auroraplus.modules.salud.repositories.PacienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Hardening de aislamiento por tenant (piloto P0): las sobrecargas sin tenantId (listarActivos(),
 * buscar(String), obtenerPorId(Long), obtenerPorIdentificacion(String)) fueron eliminadas — no
 * tenían ningún llamador fuera de esta clase (confirmado por grep) y eran la puerta de escape que
 * dejaba consultar/tocar pacientes de cualquier tenant si alguien las invocaba sin pasar
 * tenantId. Todo método exige tenantId explícito ahora.
 */
@Service
public class PacienteService {

    @Autowired
    private PacienteRepository pacienteRepository;

    public List<Paciente> buscar(Long tenantId, String query) {
        exigirTenant(tenantId);
        if (query == null || query.isBlank()) {
            return pacienteRepository.findByTenantIdAndActivoTrue(tenantId);
        }
        return pacienteRepository.buscarPorFiltroYTenant(tenantId, query.trim());
    }

    public Optional<Paciente> obtenerPorId(Long tenantId, Long id) {
        exigirTenant(tenantId);
        return pacienteRepository.findByTenantIdAndId(tenantId, id);
    }

    public Optional<Paciente> obtenerPorIdentificacion(Long tenantId, String identificacion) {
        exigirTenant(tenantId);
        return pacienteRepository.findByTenantIdAndIdentificacion(tenantId, identificacion);
    }

    /** Alta de un paciente nuevo — fuerza id=null para garantizar un INSERT, nunca un UPDATE
     * disfrazado: si el cliente manda un id en el body (ajeno o no), JpaRepository.save()
     * interpretaría eso como "actualizar esa fila", permitiendo sobrescribir el paciente de
     * OTRO tenant con solo adivinar su id. */
    @Transactional
    public Paciente crear(Long tenantId, Paciente paciente) {
        exigirTenant(tenantId);
        validarDatosBasicos(paciente);
        paciente.setId(null);
        paciente.setTenantId(tenantId);
        return pacienteRepository.save(paciente);
    }

    /** Edición: exige que el paciente YA exista para este tenant antes de guardar nada — sin
     * este chequeo, un PUT con el id de otro tenant terminaba re-asignando esa fila al tenant
     * del atacante (save() no valida pertenencia por sí solo). */
    @Transactional
    public Paciente actualizar(Long tenantId, Long id, Paciente datos) {
        exigirTenant(tenantId);
        pacienteRepository.findByTenantIdAndId(tenantId, id)
            .orElseThrow(() -> new RuntimeException("Paciente no encontrado (o no pertenece a este tenant)"));
        validarDatosBasicos(datos);
        datos.setId(id);
        datos.setTenantId(tenantId);
        return pacienteRepository.save(datos);
    }

    /** Desactivación (borrado lógico): antes hacía .filter(...).ifPresent(...) — si el paciente
     * no pertenecía al tenant, la llamada simplemente no hacía nada, sin avisar (fallback
     * silencioso). Ahora revienta con un error claro si no existe para este tenant. */
    @Transactional
    public void desactivar(Long tenantId, Long id) {
        exigirTenant(tenantId);
        Paciente paciente = pacienteRepository.findByTenantIdAndId(tenantId, id)
            .orElseThrow(() -> new RuntimeException("Paciente no encontrado (o no pertenece a este tenant)"));
        paciente.setActivo(false);
        pacienteRepository.save(paciente);
    }

    private void exigirTenant(Long tenantId) {
        if (tenantId == null) {
            throw new RuntimeException("Tenant no identificado en la sesión");
        }
    }

    private void validarDatosBasicos(Paciente paciente) {
        if (paciente.getIdentificacion() == null || paciente.getIdentificacion().isBlank()) {
            throw new IllegalArgumentException("La identificación (Cédula/DNI/Pasaporte) es obligatoria.");
        }
        if (paciente.getNombres() == null || paciente.getNombres().isBlank()) {
            throw new IllegalArgumentException("Los nombres del paciente son obligatorios.");
        }
        if (paciente.getApellidos() == null || paciente.getApellidos().isBlank()) {
            throw new IllegalArgumentException("Los apellidos del paciente son obligatorios.");
        }
    }
}
