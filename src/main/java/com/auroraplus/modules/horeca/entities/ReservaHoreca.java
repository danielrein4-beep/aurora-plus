package com.auroraplus.modules.horeca.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDateTime;

/**
 * Reserva de mesa — independiente de Comanda/Mesa a propósito: una reserva
 * existe ANTES de que el cliente llegue (puede que ni siquiera se presente),
 * así que no tiene sentido crear una comanda real hasta que el mesonero
 * efectivamente lo siente. numeroMesaSugerida es solo una sugerencia de
 * planificación, no reserva la mesa a nivel de sistema (Mesa/Comanda no se
 * enteran de esto).
 */
@Entity
@Table(name = "reservas_horeca")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ReservaHoreca {

    public enum EstadoReserva { PENDIENTE, CONFIRMADA, CANCELADA, COMPLETADA }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "nombre_cliente", nullable = false)
    private String nombreCliente;

    private String telefono;

    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora;

    @Column(name = "numero_personas", nullable = false)
    private Integer numeroPersonas;

    @Column(name = "numero_mesa_sugerida")
    private Integer numeroMesaSugerida;

    @Column(length = 500)
    private String notas;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoReserva estado = EstadoReserva.PENDIENTE;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getNombreCliente() { return nombreCliente; }
    public void setNombreCliente(String nombreCliente) { this.nombreCliente = nombreCliente; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }
    public Integer getNumeroPersonas() { return numeroPersonas; }
    public void setNumeroPersonas(Integer numeroPersonas) { this.numeroPersonas = numeroPersonas; }
    public Integer getNumeroMesaSugerida() { return numeroMesaSugerida; }
    public void setNumeroMesaSugerida(Integer numeroMesaSugerida) { this.numeroMesaSugerida = numeroMesaSugerida; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
    public EstadoReserva getEstado() { return estado; }
    public void setEstado(EstadoReserva estado) { this.estado = estado; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
