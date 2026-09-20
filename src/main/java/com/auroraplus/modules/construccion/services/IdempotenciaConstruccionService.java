package com.auroraplus.modules.construccion.services;

import com.auroraplus.modules.construccion.entities.IdempotenciaConstruccionEntity;
import com.auroraplus.modules.construccion.repositories.IdempotenciaConstruccionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Service
public class IdempotenciaConstruccionService {

    @Autowired
    private IdempotenciaConstruccionRepository idempotenciaRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    public Optional<IdempotenciaConstruccionEntity> buscar(Long tenantId, String idempotencyKey) {
        if (tenantId == null || idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
            return Optional.empty();
        }
        return idempotenciaRepository.findByTenantIdAndIdempotencyKey(tenantId, idempotencyKey.trim());
    }

    /**
     * Reclama la clave de idempotencia ANTES del efecto de negocio mediante inserción atómica directa.
     * Utiliza JdbcTemplate para no contaminar la sesión de Hibernate en caso de colisión por clave única.
     * Si ya existe o colisiona en concurrencia:
     * - Si corresponde a otro tipo de acción, recurso o hash de payload, devuelve 409 Conflict.
     * - Si es idéntica, devuelve la entidad previamente registrada para retornar el recurso original.
     * Si no existía, la inserta con estado 'EN_PROCESO' y retorna Optional.empty() indicando que este hilo debe ejecutar la acción.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<IdempotenciaConstruccionEntity> reclamarClave(
            Long tenantId, String idempotencyKey, String tipoRecurso, String payloadHash) {

        if (tenantId == null || idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
            return Optional.empty();
        }
        String key = idempotencyKey.trim();

        // 1. Verificación previa en base de datos
        Optional<IdempotenciaConstruccionEntity> prev = idempotenciaRepository.findByTenantIdAndIdempotencyKey(tenantId, key);
        if (prev.isPresent()) {
            validarCoincidencia(prev.get(), tipoRecurso, payloadHash, key);
            return prev;
        }

        // 2. Inserción atómica antes del efecto de negocio
        try {
            jdbcTemplate.update(
                "INSERT INTO idempotencia_construccion (tenant_id, idempotency_key, recurso_tipo, payload_hash, estado, created_at) " +
                "VALUES (?, ?, ?, ?, 'EN_PROCESO', CURRENT_TIMESTAMP)",
                tenantId, key, tipoRecurso, payloadHash
            );
            return Optional.empty(); // Reclamada exitosamente por este hilo
        } catch (DataIntegrityViolationException ex) {
            // Colisión concurrente garantizada por constraint UNIQUE uk_idemp_tenant_key
            IdempotenciaConstruccionEntity existente = idempotenciaRepository.findByTenantIdAndIdempotencyKey(tenantId, key)
                    .orElseThrow(() -> ex);
            validarCoincidencia(existente, tipoRecurso, payloadHash, key);
            return Optional.of(existente);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void completarClave(Long tenantId, String idempotencyKey, Long recursoId) {
        if (tenantId == null || idempotencyKey == null || idempotencyKey.trim().isEmpty()) return;
        jdbcTemplate.update(
            "UPDATE idempotencia_construccion SET recurso_id = ?, estado = 'COMPLETADO' WHERE tenant_id = ? AND idempotency_key = ?",
            recursoId, tenantId, idempotencyKey.trim()
        );
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void liberarClaveEnFallo(Long tenantId, String idempotencyKey) {
        if (tenantId == null || idempotencyKey == null || idempotencyKey.trim().isEmpty()) return;
        jdbcTemplate.update(
            "DELETE FROM idempotencia_construccion WHERE tenant_id = ? AND idempotency_key = ? AND estado = 'EN_PROCESO'",
            tenantId, idempotencyKey.trim()
        );
    }

    private void validarCoincidencia(IdempotenciaConstruccionEntity reg, String tipoRecurso, String payloadHash, String key) {
        if (!reg.getRecursoTipo().equalsIgnoreCase(tipoRecurso)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Idempotency-Key '" + key + "' ya fue utilizada para un tipo de acción o recurso diferente: " + reg.getRecursoTipo());
        }
        if (reg.getPayloadHash() != null && !reg.getPayloadHash().equals(payloadHash)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Idempotency-Key '" + key + "' ya fue utilizada con datos o payload diferente");
        }
    }
}
