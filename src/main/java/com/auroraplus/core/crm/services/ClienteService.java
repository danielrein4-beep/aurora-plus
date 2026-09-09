package com.auroraplus.core.crm.services;

import com.auroraplus.core.crm.entities.Cliente;
import com.auroraplus.core.crm.repositories.ClienteRepository;
import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.repositories.ComandaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * CRM básico (Fase 3): CRUD de clientes + métricas agregadas. Las métricas
 * son de solo lectura y se calculan bajo demanda (al abrir el panel de un
 * cliente en el frontend) — nunca en el camino caliente de una venta, para
 * no afectar la latencia del POS.
 */
@Service
public class ClienteService {

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private ComandaRepository comandaRepository;

    public List<Cliente> listar(Long tenantId) {
        return clienteRepository.findByTenantIdOrderByNombreAsc(tenantId);
    }

    public List<Cliente> buscar(Long tenantId, String q) {
        return clienteRepository.buscar(tenantId, q != null ? q : "");
    }

    public Cliente obtener(Long id, Long tenantId) {
        Cliente cliente = clienteRepository.findById(id).orElseThrow(() -> new RuntimeException("Cliente no encontrado"));
        if (!cliente.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Violación de seguridad: Cliente no pertenece a este tenant");
        }
        return cliente;
    }

    @Transactional
    public Cliente crear(Long tenantId, String nombre, String identificacionRif, String telefono, String correo) {
        // Registro rápido desde el POS: el cajero puede tipear solo la
        // cédula y nada más — nombre/teléfono son opcionales ahí. Sin un
        // nombre real, se usa la cédula como identificador provisional en
        // vez de bloquear el alta exigiendo un dato que todavía no dieron.
        if ((nombre == null || nombre.isBlank()) && (identificacionRif == null || identificacionRif.isBlank())) {
            throw new RuntimeException("Indique al menos el nombre o la cédula/RIF del cliente");
        }
        String nombreFinal = (nombre != null && !nombre.isBlank()) ? nombre.trim() : "Cliente " + identificacionRif.trim();
        Cliente cliente = new Cliente();
        cliente.setTenantId(tenantId);
        cliente.setNombre(nombreFinal);
        cliente.setIdentificacionRif(identificacionRif != null && !identificacionRif.isBlank() ? identificacionRif.trim() : null);
        cliente.setTelefono(telefono != null && !telefono.isBlank() ? telefono.trim() : null);
        cliente.setCorreo(correo != null && !correo.isBlank() ? correo.trim() : null);
        return clienteRepository.save(cliente);
    }

    @Transactional
    public Cliente editar(Long id, Long tenantId, String nombre, String identificacionRif, String telefono, String correo) {
        Cliente cliente = obtener(id, tenantId);
        if (nombre != null && !nombre.isBlank()) cliente.setNombre(nombre.trim());
        if (identificacionRif != null) cliente.setIdentificacionRif(identificacionRif.isBlank() ? null : identificacionRif.trim());
        if (telefono != null) cliente.setTelefono(telefono.isBlank() ? null : telefono.trim());
        if (correo != null) cliente.setCorreo(correo.isBlank() ? null : correo.trim());
        return clienteRepository.save(cliente);
    }

    @Transactional
    public void eliminar(Long id, Long tenantId) {
        Cliente cliente = obtener(id, tenantId);
        clienteRepository.delete(cliente);
    }

    @Transactional(readOnly = true)
    public MetricasClienteDTO metricas(Long id, Long tenantId) {
        obtener(id, tenantId); // valida existencia/tenant antes de agregar
        List<Comanda> comandas = comandaRepository.findByTenantIdAndClienteIdAndEstadoOrderByFechaCierreDesc(tenantId, id, Comanda.EstadoComanda.PAGADA);

        MetricasClienteDTO metricas = new MetricasClienteDTO();
        metricas.cantidadVisitas = comandas.size();
        metricas.totalGastado = comandas.stream().map(Comanda::getTotalConsumo).reduce(BigDecimal.ZERO, BigDecimal::add);
        metricas.fechaUltimaCompra = comandas.stream().map(Comanda::getFechaCierre).filter(f -> f != null).findFirst().orElse(null);
        return metricas;
    }

    /** Historial de tickets del cliente — más recientes primero. */
    public List<Comanda> tickets(Long id, Long tenantId) {
        obtener(id, tenantId);
        return comandaRepository.findByTenantIdAndClienteIdAndEstadoOrderByFechaCierreDesc(tenantId, id, Comanda.EstadoComanda.PAGADA);
    }
}
