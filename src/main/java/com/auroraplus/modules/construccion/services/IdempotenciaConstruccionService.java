package com.auroraplus.modules.construccion.services;

import com.auroraplus.modules.construccion.entities.IdempotenciaConstruccionEntity;
import com.auroraplus.modules.construccion.repositories.IdempotenciaConstruccionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Optional;

@Service
public class IdempotenciaConstruccionService {

    private static final Logger log = LoggerFactory.getLogger(IdempotenciaConstruccionService.class);

    @Autowired
    private IdempotenciaConstruccionRepository idempotenciaRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    // Observador de pre-claim: en producción es un no-op por defecto
    @Autowired(required = false)
    private IdempotenciaPreClaimObserver preClaimObserver = () -> {};

    public Optional<IdempotenciaConstruccionEntity> buscar(Long tenantId, String idempotencyKey) {
        if (tenantId == null || idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
            return Optional.empty();
        }
        return idempotenciaRepository.findByTenantIdAndIdempotencyKey(tenantId, idempotencyKey.trim());
    }

    /**
     * 1. Reclama la clave de idempotencia ANTES del efecto de negocio mediante una transacción aislada confirmada de inmediato.
     * Utiliza TransactionTemplate con PROPAGATION_REQUIRES_NEW para garantizar que el pre-claim 'EN_PROCESO'
     * quede confirmado en la base de datos sin retener bloqueos antes de iniciar el efecto de negocio.
     */
    public Optional<IdempotenciaConstruccionEntity> reclamarClave(
            Long tenantId, String idempotencyKey, String tipoRecurso, String payloadHash) {

        if (tenantId == null || idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
            return Optional.empty();
        }
        String key = idempotencyKey.trim();

        // 1. Verificación previa en base de datos
        Optional<IdempotenciaConstruccionEntity> prev = idempotenciaRepository.findByTenantIdAndIdempotencyKey(tenantId, key);
        if (prev.isPresent()) {
            return gestionarExistente(prev.get(), tenantId, key, tipoRecurso, payloadHash);
        }

        // 2. Pre-claim atómico aislado en transacción propia confirmada de inmediato
        TransactionTemplate tt = new TransactionTemplate(transactionManager);
        tt.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        Boolean insertado = tt.execute(status -> {
            try {
                jdbcTemplate.update(
                    "INSERT INTO idempotencia_construccion (tenant_id, idempotency_key, recurso_tipo, payload_hash, estado, created_at) " +
                    "VALUES (?, ?, ?, ?, 'EN_PROCESO', CURRENT_TIMESTAMP)",
                    tenantId, key, tipoRecurso, payloadHash
                );
                return true;
            } catch (DataIntegrityViolationException ex) {
                status.setRollbackOnly();
                return false;
            }
        });

        if (Boolean.TRUE.equals(insertado)) {
            if (preClaimObserver != null) {
                preClaimObserver.onPostPreClaim();
            }
            return Optional.empty(); // Reclamada exitosamente por este hilo
        }

        // 3. Colisión concurrente por constraint uk_idemp_tenant_key: recuperar el registro insertado por el otro hilo
        IdempotenciaConstruccionEntity existente = idempotenciaRepository.findByTenantIdAndIdempotencyKey(tenantId, key)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Colisión en clave de idempotencia"));
        return gestionarExistente(existente, tenantId, key, tipoRecurso, payloadHash);
    }

    private Optional<IdempotenciaConstruccionEntity> gestionarExistente(
            IdempotenciaConstruccionEntity reg, Long tenantId, String key, String tipoRecurso, String payloadHash) {

        validarCoincidencia(reg, tipoRecurso, payloadHash, key);

        if ("COMPLETADO".equalsIgnoreCase(reg.getEstado())) {
            return Optional.of(reg);
        }

        if ("EN_PROCESO".equalsIgnoreCase(reg.getEstado())) {
            // Espera limitada (hasta 1500 ms en intervalos de 40 ms) a que la primera petición complete
                        long deadline = System.currentTimeMillis() + 3500;
            while (System.currentTimeMillis() < deadline) {
                try {
                    Thread.sleep(25);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
                List<IdempotenciaConstruccionEntity> check = jdbcTemplate.query(
                    "SELECT id, tenant_id, idempotency_key, recurso_tipo, recurso_id, payload_hash, resultado_json, estado " +
                    "FROM idempotencia_construccion WHERE tenant_id = ? AND idempotency_key = ?",
                    (rs, rowNum) -> {
                        IdempotenciaConstruccionEntity e = new IdempotenciaConstruccionEntity();
                        e.setId(rs.getLong("id"));
                        e.setTenantId(rs.getLong("tenant_id"));
                        e.setIdempotencyKey(rs.getString("idempotency_key"));
                        e.setRecursoTipo(rs.getString("recurso_tipo"));
                        long rId = rs.getLong("recurso_id");
                        if (!rs.wasNull()) e.setRecursoId(rId);
                        e.setPayloadHash(rs.getString("payload_hash"));
                        e.setResultadoJson(rs.getString("resultado_json"));
                        e.setEstado(rs.getString("estado"));
                        return e;
                    },
                    tenantId, key
                );
                if (!check.isEmpty()) {
                    IdempotenciaConstruccionEntity actual = check.get(0);
                    if ("COMPLETADO".equalsIgnoreCase(actual.getEstado())) {
                        return Optional.of(actual);
                    }
                    if ("FALLIDO".equalsIgnoreCase(actual.getEstado())) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT,
                                "La operación previa con esta clave falló. Reintente con una clave nueva.");
                    }
                }
            }
            // Si después de la espera sigue en proceso, se rechaza para nunca ejecutar el efecto dos veces
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La solicitud con Idempotency-Key '" + key + "' se encuentra actualmente en proceso.");
        }

        if ("FALLIDO".equalsIgnoreCase(reg.getEstado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La operación previa con esta clave de idempotencia falló.");
        }

        return Optional.of(reg);
    }

    /**
     * Completa la clave de idempotencia DENTRO de la misma transacción del efecto de negocio.
     * No abre una transacción independiente para garantizar que el efecto (valuación, bitácora o consumo) y el paso
     * a COMPLETADO hagan commit de forma atómica y conjunta.
     */
    public void completarClave(Long tenantId, String idempotencyKey, Long recursoId) {
        completarClave(tenantId, idempotencyKey, recursoId, null);
    }

    public void completarClave(Long tenantId, String idempotencyKey, Long recursoId, String resultadoJson) {
        if (tenantId == null || idempotencyKey == null || idempotencyKey.trim().isEmpty()) return;
        jdbcTemplate.update(
            "UPDATE idempotencia_construccion SET recurso_id = ?, resultado_json = ?, estado = 'COMPLETADO' " +
            "WHERE tenant_id = ? AND idempotency_key = ?",
            recursoId, resultadoJson, tenantId, idempotencyKey.trim()
        );
    }

    /**
     * Ante cualquier excepción o error imprevisto, libera la clave en una transacción independiente (REQUIRES_NEW)
     * para no dejarla permanentemente en EN_PROCESO aun cuando la transacción de negocio haga rollback.
     */
    public void liberarClaveEnFallo(Long tenantId, String idempotencyKey) {
        if (tenantId == null || idempotencyKey == null || idempotencyKey.trim().isEmpty()) return;
        try {
            TransactionTemplate tt = new TransactionTemplate(transactionManager);
            tt.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            tt.executeWithoutResult(status -> {
                jdbcTemplate.update(
                    "DELETE FROM idempotencia_construccion WHERE tenant_id = ? AND idempotency_key = ? AND estado = 'EN_PROCESO'",
                    tenantId, idempotencyKey.trim()
                );
            });
        } catch (Exception ex) {
            log.error("No se pudo liberar la clave de idempotencia de Construcción; quedará protegida hasta revisión", ex);
        }
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
