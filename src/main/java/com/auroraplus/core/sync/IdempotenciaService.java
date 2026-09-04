package com.auroraplus.core.sync;

import com.auroraplus.core.sync.entities.OperacionIdempotente;
import com.auroraplus.core.sync.repositories.OperacionIdempotenteRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Punto único que deben usar todos los servicios de venta/pago para
 * protegerse de reintentos del POS (ver OperacionIdempotente). Uso esperado
 * al inicio de un método @Transactional:
 *
 *   Optional&lt;Long&gt; existente = idempotenciaService.obtenerSiYaProcesada(tenantId, clave, "venta_horeca");
 *   if (existente.isPresent()) return repo.findById(existente.get()).orElseThrow();
 *   ... crear la venta normalmente ...
 *   idempotenciaService.registrar(tenantId, clave, "venta_horeca", ventaCreada.getId());
 */
@Service
public class IdempotenciaService {

    @Autowired
    private OperacionIdempotenteRepository operacionIdempotenteRepository;

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Si claveIdempotencia viene null/vacía, el llamador no está pidiendo
     * protección (ej. una petición hecha directo desde el panel de administración,
     * no desde un POS offline) — se retorna vacío y el flujo sigue normal.
     *
     * Si viene informada, se toma un advisory lock de Postgres por
     * (tenantId, clave) ANTES de consultar: así, si dos peticiones con la
     * MISMA clave llegan casi al mismo tiempo (doble clic real, o dos
     * reintentos simultáneos), la segunda espera a que la primera termine
     * TODA su transacción (crear + registrar) antes de consultar — y
     * entonces sí encuentra el resultado ya guardado, en vez de crear un
     * duplicado. El lock se libera solo al terminar la transacción actual.
     */
    @Transactional
    public Optional<Long> obtenerSiYaProcesada(Long tenantId, String claveIdempotencia) {
        if (claveIdempotencia == null || claveIdempotencia.isBlank()) {
            return Optional.empty();
        }

        String clavePlena = tenantId + ":" + claveIdempotencia;
        entityManager.createNativeQuery("SELECT pg_advisory_xact_lock(778899, hashtext(:clave))")
            .setParameter("clave", clavePlena)
            .getResultList();

        return operacionIdempotenteRepository.findByTenantIdAndClaveIdempotencia(tenantId, claveIdempotencia)
            .map(OperacionIdempotente::getEntidadId);
    }

    public void registrar(Long tenantId, String claveIdempotencia, String tipoOperacion, Long entidadId) {
        if (claveIdempotencia == null || claveIdempotencia.isBlank()) {
            return;
        }
        OperacionIdempotente op = new OperacionIdempotente();
        op.setTenantId(tenantId);
        op.setClaveIdempotencia(claveIdempotencia);
        op.setTipoOperacion(tipoOperacion);
        op.setEntidadId(entidadId);
        operacionIdempotenteRepository.save(op);
    }
}
