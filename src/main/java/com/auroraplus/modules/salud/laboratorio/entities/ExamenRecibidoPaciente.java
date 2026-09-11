package com.auroraplus.modules.salud.laboratorio.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Una carga de resultados de laboratorio hecha por el PACIENTE desde el
 * portal público (escaneando el QR fijo del consultorio, ver
 * PortalLaboratorioPacienteService) — reemplaza el flujo viejo de
 * "orden digital" (OrdenLaboratorio) que nadie usaba, porque el doctor
 * entrega la orden impresa del propio laboratorio, no una de Aurora.
 *
 * pacienteId queda null si la cédula que escribió el paciente no coincide con
 * ningún registro existente ("sin identificar") — el doctor/secretaria la
 * vincula a mano después desde el inbox.
 */
@Entity
@Table(name = "salud_examenes_recibidos_paciente", indexes = {
    @Index(name = "idx_salud_exrec_tenant", columnList = "tenant_id"),
    @Index(name = "idx_salud_exrec_tenant_paciente", columnList = "tenant_id, paciente_id"),
    @Index(name = "idx_salud_exrec_tenant_leido", columnList = "tenant_id, leido")
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ExamenRecibidoPaciente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "paciente_id")
    private Long pacienteId;

    @Column(name = "cedula_ingresada", nullable = false, length = 30)
    private String cedulaIngresada;

    @Column(name = "nombre_ingresado", length = 150)
    private String nombreIngresado;

    @Column(name = "telefono_ingresado", length = 30)
    private String telefonoIngresado;

    @Column(name = "fecha_hora_recepcion", nullable = false)
    private LocalDateTime fechaHoraRecepcion = LocalDateTime.now();

    @Column(nullable = false)
    private boolean leido = false;

    @Column(name = "fecha_hora_leido")
    private LocalDateTime fechaHoraLeido;

    @Column(name = "leido_por", length = 100)
    private String leidoPor;

    @OneToMany(mappedBy = "examen", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private List<ArchivoExamenRecibido> archivos = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getPacienteId() { return pacienteId; }
    public void setPacienteId(Long pacienteId) { this.pacienteId = pacienteId; }
    public String getCedulaIngresada() { return cedulaIngresada; }
    public void setCedulaIngresada(String cedulaIngresada) { this.cedulaIngresada = cedulaIngresada; }
    public String getNombreIngresado() { return nombreIngresado; }
    public void setNombreIngresado(String nombreIngresado) { this.nombreIngresado = nombreIngresado; }
    public String getTelefonoIngresado() { return telefonoIngresado; }
    public void setTelefonoIngresado(String telefonoIngresado) { this.telefonoIngresado = telefonoIngresado; }
    public LocalDateTime getFechaHoraRecepcion() { return fechaHoraRecepcion; }
    public void setFechaHoraRecepcion(LocalDateTime fechaHoraRecepcion) { this.fechaHoraRecepcion = fechaHoraRecepcion; }
    public boolean isLeido() { return leido; }
    public void setLeido(boolean leido) { this.leido = leido; }
    public LocalDateTime getFechaHoraLeido() { return fechaHoraLeido; }
    public void setFechaHoraLeido(LocalDateTime fechaHoraLeido) { this.fechaHoraLeido = fechaHoraLeido; }
    public String getLeidoPor() { return leidoPor; }
    public void setLeidoPor(String leidoPor) { this.leidoPor = leidoPor; }
    public List<ArchivoExamenRecibido> getArchivos() { return archivos; }
    public void setArchivos(List<ArchivoExamenRecibido> archivos) {
        this.archivos = archivos;
        if (archivos != null) {
            for (ArchivoExamenRecibido a : archivos) a.setExamen(this);
        }
    }

    public void agregarArchivo(ArchivoExamenRecibido archivo) {
        archivo.setTenantId(this.tenantId);
        archivo.setExamen(this);
        this.archivos.add(archivo);
    }
}
