package com.auroraplus.core.config;

import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Bloqueo exclusivo de duración de transacción, usado para serializar
 * operaciones que no toleran una condición de carrera (ver
 * TenantProvisioningService, IdempotenciaService).
 *
 * En PostgreSQL (producción, toda instalación real — ver application.properties)
 * usa pg_advisory_xact_lock: lock real de Postgres, liberado automáticamente
 * al terminar la transacción, efectivo entre procesos/conexiones distintas.
 *
 * H2 (perfil test) no implementa pg_advisory_xact_lock. La suite de
 * integración corre en un único proceso JVM, así que ahí un ReentrantLock en
 * memoria — liberado también al terminar la transacción actual, vía
 * TransactionSynchronization, igual que el lock de Postgres — da la misma
 * garantía real de exclusión mutua sin depender de una función que H2 no
 * tiene. La detección es por el producto JDBC real, no por el perfil activo:
 * así producción conserva el lock real aunque algún día corra bajo otro
 * perfil, y cualquier base no-Postgres (siempre H2 hoy) cae sola en la ruta seria.
 */
@Component
public class AdvisoryLock {

    private final ConcurrentHashMap<String, ReentrantLock> locksEnMemoria = new ConcurrentHashMap<>();

    /** true si la conexión JDBC activa es PostgreSQL real (nunca la H2 de test). */
    public boolean esPostgres(EntityManager entityManager) {
        try {
            String producto = entityManager.unwrap(Session.class)
                .doReturningWork(connection -> connection.getMetaData().getDatabaseProductName());
            return "PostgreSQL".equalsIgnoreCase(producto);
        } catch (Exception e) {
            // Ante la duda, NO tratar como Postgres: cae en el lock en memoria,
            // que es el lado seguro (mutex real, aunque no distribuido) en vez
            // de arriesgarse a ejecutar una función de Postgres inexistente.
            return false;
        }
    }

    /**
     * Bloqueo exclusivo por clave, vigente hasta que termine la transacción
     * actual (commit o rollback) — mismo alcance que pg_advisory_xact_lock.
     * Solo debe usarse desde un método @Transactional.
     */
    public void tomarBloqueoEnMemoria(String clave) {
        ReentrantLock lock = locksEnMemoria.computeIfAbsent(clave, k -> new ReentrantLock());
        lock.lock();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    lock.unlock();
                }
            });
        } else {
            // No debería ocurrir en el uso real (ambos llamadores son
            // @Transactional) — liberar de inmediato para no dejar el lock
            // tomado para siempre si de todos modos pasa.
            lock.unlock();
        }
    }
}
