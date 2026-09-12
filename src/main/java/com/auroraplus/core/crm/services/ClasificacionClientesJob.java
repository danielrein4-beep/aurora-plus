package com.auroraplus.core.crm.services;

import com.auroraplus.core.crm.entities.Cliente;
import com.auroraplus.core.crm.repositories.ClienteRepository;
import com.auroraplus.modules.repuestos.repositories.MovimientoRepuestoRepository;
import com.auroraplus.modules.repuestos.repositories.MovimientoRepuestoRepository.ResumenComprasCliente;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Regla ABC de clientes: corre de madrugada y reclasifica a TODOS los
 * clientes de TODOS los tenants según su historial real de compras — nadie
 * la elige a mano desde el CRUD de clientes.
 *
 * Aislamiento multi-tenant: este job corre sin JWT/TenantContext (como
 * AvisoVencimientoTrialJob y RecordatorioCitaJob), así que TenantFilterAspect
 * no activa el filtro de Hibernate y la consulta agregada ve movimientos de
 * TODOS los tenants a la vez — pero cada fila de resumenComprasPorCliente ya
 * trae su propio (tenantId, clienteId) desde el GROUP BY nativo, así que el
 * historial de un cliente nunca se mezcla con el de otro tenant. Como
 * verificación extra, se descarta cualquier fila cuyo tenantId no coincida
 * con el tenantId real del Cliente cargado por id.
 */
@Component
public class ClasificacionClientesJob {

    private static final Logger log = LoggerFactory.getLogger(ClasificacionClientesJob.class);

    // Umbrales de la heurística — de partida, ajustables sin tocar la lógica del job.
    private static final BigDecimal UMBRAL_MAYORISTA = new BigDecimal("500");
    private static final long COMPRAS_MINIMAS_FRECUENTE = 5;
    private static final long VENTANA_MAYORISTA_DIAS = 90;
    private static final long VENTANA_FRECUENTE_DIAS = 30;
    private static final long DIAS_INACTIVIDAD_RIESGO = 60;
    private static final BigDecimal DESCUENTO_MAYORISTA_POR_DEFECTO = new BigDecimal("10");

    @Autowired
    private MovimientoRepuestoRepository movimientoRepuestoRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Scheduled(cron = "0 30 3 * * *") // todos los días a las 3:30 am, hora del servidor — fuera del horario pico de ventas
    @Transactional
    public void reclasificarClientes() {
        LocalDateTime ahora = LocalDateTime.now();
        LocalDateTime desde90 = ahora.minusDays(VENTANA_MAYORISTA_DIAS);
        LocalDateTime desde30 = ahora.minusDays(VENTANA_FRECUENTE_DIAS);
        LocalDateTime limiteRiesgo = ahora.minusDays(DIAS_INACTIVIDAD_RIESGO);

        List<ResumenComprasCliente> resumenes = movimientoRepuestoRepository.resumenComprasPorCliente(desde90, desde30);
        int actualizados = 0;

        for (ResumenComprasCliente r : resumenes) {
            try {
                Optional<Cliente> opt = clienteRepository.findById(r.getClienteId());
                if (opt.isEmpty()) continue;
                Cliente cliente = opt.get();
                if (!cliente.getTenantId().equals(r.getTenantId())) continue; // defensivo, ver javadoc de la clase

                Cliente.Clasificacion nueva = clasificar(r, limiteRiesgo);
                if (cliente.getClasificacion() == nueva) continue;

                cliente.setClasificacion(nueva);
                if (nueva == Cliente.Clasificacion.MAYORISTA && cliente.getDescuentoAutomaticoPorcentaje() == null) {
                    // Primera vez que sube a Mayorista: se le da un descuento de partida — el
                    // dueño lo puede afinar después desde la ficha del cliente.
                    cliente.setDescuentoAutomaticoPorcentaje(DESCUENTO_MAYORISTA_POR_DEFECTO);
                }
                clienteRepository.save(cliente);
                actualizados++;
            } catch (Exception e) {
                // Un cliente con datos raros no debe tumbar la reclasificación del resto.
                log.error("No se pudo reclasificar el cliente {} (tenant {}): {}", r.getClienteId(), r.getTenantId(), e.getMessage(), e);
            }
        }

        log.info("Reclasificación ABC de clientes: {} de {} clientes con historial cambiaron de categoría", actualizados, resumenes.size());
    }

    private Cliente.Clasificacion clasificar(ResumenComprasCliente r, LocalDateTime limiteRiesgo) {
        BigDecimal totalUltimos90d = r.getTotalUltimos90d() != null ? r.getTotalUltimos90d() : BigDecimal.ZERO;
        long comprasUltimos30d = r.getComprasUltimos30d() != null ? r.getComprasUltimos30d() : 0;
        long comprasTotal = r.getComprasTotal() != null ? r.getComprasTotal() : 0;

        if (totalUltimos90d.compareTo(UMBRAL_MAYORISTA) >= 0) {
            return Cliente.Clasificacion.MAYORISTA;
        }
        if (comprasUltimos30d >= COMPRAS_MINIMAS_FRECUENTE) {
            return Cliente.Clasificacion.FRECUENTE;
        }
        if (comprasTotal >= 2 && r.getUltimaCompra() != null && r.getUltimaCompra().isBefore(limiteRiesgo)) {
            return Cliente.Clasificacion.EN_RIESGO;
        }
        return Cliente.Clasificacion.NORMAL;
    }
}
