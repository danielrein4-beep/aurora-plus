package com.auroraplus.modules.repuestos.services;

import com.auroraplus.modules.repuestos.entities.Almacen;
import com.auroraplus.modules.repuestos.entities.RepuestoItem;
import com.auroraplus.modules.repuestos.entities.StockAlmacen;
import com.auroraplus.modules.repuestos.repositories.AlmacenRepository;
import com.auroraplus.modules.repuestos.repositories.RepuestoItemRepository;
import com.auroraplus.modules.repuestos.repositories.StockAlmacenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Multi-almacén como capa ADITIVA sobre el inventario existente: el stock
 * total de cada RepuestoItem (stockActual) sigue siendo la única fuente de
 * verdad para vender/kárdex — nada de esto lo toca. Lo que se agrega es
 * saber CÓMO se reparte ese total entre ubicaciones físicas, y poder
 * trasladar cantidad de una a otra.
 *
 * Límite honesto (documentado, no escondido): una venta de mostrador
 * descuenta el total sin preguntar de qué almacén salió físicamente — si el
 * negocio necesita que cada venta también descuente un almacén específico en
 * tiempo real, eso es una Fase 2 que toca RepuestoConversionService.
 */
@Service
public class AlmacenService {

    @Autowired
    private AlmacenRepository almacenRepository;

    @Autowired
    private StockAlmacenRepository stockAlmacenRepository;

    @Autowired
    private RepuestoItemRepository repuestoItemRepository;

    /** El primer almacén de un tenant siempre nace marcado principal y recibe todo el stock existente. */
    @Transactional
    public Almacen obtenerOCrearPrincipal(Long tenantId) {
        return almacenRepository.findByTenantIdAndEsPrincipalTrue(tenantId).orElseGet(() -> {
            Almacen principal = new Almacen();
            principal.setTenantId(tenantId);
            principal.setNombre("Almacén Central");
            principal.setEsPrincipal(true);
            Almacen guardado = almacenRepository.save(principal);

            for (RepuestoItem item : repuestoItemRepository.findByTenantId(tenantId)) {
                if (item.getStockActual() != null && item.getStockActual().compareTo(BigDecimal.ZERO) > 0) {
                    StockAlmacen fila = new StockAlmacen();
                    fila.setTenantId(tenantId);
                    fila.setAlmacenId(guardado.getId());
                    fila.setRepuestoId(item.getId());
                    fila.setCantidad(item.getStockActual());
                    stockAlmacenRepository.save(fila);
                }
            }
            return guardado;
        });
    }

    @Transactional
    public Almacen crear(Long tenantId, String nombre, String direccion) {
        if (nombre == null || nombre.isBlank()) throw new RuntimeException("El nombre del almacén es obligatorio");
        obtenerOCrearPrincipal(tenantId); // garantiza que el reparto exista antes de sumar una ubicación más
        Almacen almacen = new Almacen();
        almacen.setTenantId(tenantId);
        almacen.setNombre(nombre.trim());
        almacen.setDireccion(direccion);
        return almacenRepository.save(almacen);
    }

    public List<Almacen> listar(Long tenantId) {
        obtenerOCrearPrincipal(tenantId);
        return almacenRepository.findByTenantIdOrderByEsPrincipalDescNombreAsc(tenantId);
    }

    public List<StockAlmacen> distribucion(Long tenantId, Long repuestoId) {
        return stockAlmacenRepository.findByTenantIdAndRepuestoId(tenantId, repuestoId);
    }

    /** Cuánto de este repuesto está SIN asignar a ningún almacén todavía — para no perder de vista stock "fantasma". */
    public BigDecimal sinAsignar(Long tenantId, Long repuestoId) {
        RepuestoItem item = repuestoItemRepository.findById(repuestoId)
            .filter(r -> r.getTenantId().equals(tenantId))
            .orElseThrow(() -> new RuntimeException("Repuesto no encontrado"));
        BigDecimal asignado = distribucion(tenantId, repuestoId).stream()
            .map(StockAlmacen::getCantidad).reduce(BigDecimal.ZERO, BigDecimal::add);
        return item.getStockActual().subtract(asignado);
    }

    @Transactional
    public void trasladar(Long tenantId, Long repuestoId, Long origenId, Long destinoId, BigDecimal cantidad) {
        if (origenId.equals(destinoId)) throw new RuntimeException("El almacén de origen y destino no pueden ser el mismo");
        if (cantidad == null || cantidad.compareTo(BigDecimal.ZERO) <= 0) throw new RuntimeException("La cantidad debe ser mayor a cero");

        StockAlmacen filaOrigen = stockAlmacenRepository.findByTenantIdAndAlmacenIdAndRepuestoId(tenantId, origenId, repuestoId)
            .orElseThrow(() -> new RuntimeException("Ese repuesto no tiene stock registrado en el almacén de origen"));
        if (filaOrigen.getCantidad().compareTo(cantidad) < 0) {
            throw new RuntimeException("Solo hay " + filaOrigen.getCantidad() + " disponibles en el almacén de origen");
        }
        filaOrigen.setCantidad(filaOrigen.getCantidad().subtract(cantidad));
        stockAlmacenRepository.save(filaOrigen);

        StockAlmacen filaDestino = stockAlmacenRepository.findByTenantIdAndAlmacenIdAndRepuestoId(tenantId, destinoId, repuestoId)
            .orElseGet(() -> {
                StockAlmacen nueva = new StockAlmacen();
                nueva.setTenantId(tenantId);
                nueva.setAlmacenId(destinoId);
                nueva.setRepuestoId(repuestoId);
                nueva.setCantidad(BigDecimal.ZERO);
                return nueva;
            });
        filaDestino.setCantidad(filaDestino.getCantidad().add(cantidad));
        stockAlmacenRepository.save(filaDestino);
    }

    public List<StockAlmacen> ubicacionesDelTenant(Long tenantId) {
        return stockAlmacenRepository.findByTenantIdAndUbicacionIsNotNull(tenantId);
    }

    /** Fija (o borra, si viene vacía) la posición física de un repuesto dentro de un almacén. Crea la fila con cantidad 0 si aún no existía. */
    @Transactional
    public StockAlmacen fijarUbicacion(Long tenantId, Long almacenId, Long repuestoId, String ubicacion) {
        almacenRepository.findByIdAndTenantId(almacenId, tenantId).orElseThrow(() -> new RuntimeException("Almacén no encontrado"));
        repuestoItemRepository.findById(repuestoId).filter(r -> r.getTenantId().equals(tenantId)).orElseThrow(() -> new RuntimeException("Repuesto no encontrado"));
        StockAlmacen fila = stockAlmacenRepository.findByTenantIdAndAlmacenIdAndRepuestoId(tenantId, almacenId, repuestoId).orElseGet(() -> {
            StockAlmacen nueva = new StockAlmacen();
            nueva.setTenantId(tenantId);
            nueva.setAlmacenId(almacenId);
            nueva.setRepuestoId(repuestoId);
            nueva.setCantidad(BigDecimal.ZERO);
            return nueva;
        });
        String limpia = ubicacion == null ? null : ubicacion.trim();
        fila.setUbicacion(limpia == null || limpia.isEmpty() ? null : limpia);
        return stockAlmacenRepository.save(fila);
    }

    public Almacen actualizar(Long tenantId, Long almacenId, String nombre, String direccion, Boolean activo) {
        Almacen almacen = almacenRepository.findByIdAndTenantId(almacenId, tenantId)
            .orElseThrow(() -> new RuntimeException("Almacén no encontrado"));
        if (nombre != null && !nombre.isBlank()) almacen.setNombre(nombre.trim());
        if (direccion != null) almacen.setDireccion(direccion);
        if (activo != null) almacen.setActivo(activo);
        return almacenRepository.save(almacen);
    }
}
