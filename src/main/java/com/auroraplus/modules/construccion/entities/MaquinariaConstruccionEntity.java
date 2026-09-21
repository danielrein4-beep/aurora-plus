package com.auroraplus.modules.construccion.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "maquinarias_construccion")
public class MaquinariaConstruccionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "proyecto_id")
    private Long proyectoId;

    @Column(name = "codigo", nullable = false, length = 50)
    private String codigo;

    @Column(name = "nombre", nullable = false, length = 150)
    private String nombre;

    @Column(name = "tipo", nullable = false, length = 50)
    private String tipo; // PESADA, LIVIANA, TRANSPORTE, HERRAMIENTA_MENOR, GENERADOR

    @Column(name = "marca", length = 100)
    private String marca;

    @Column(name = "modelo", length = 100)
    private String modelo;

    @Column(name = "serial_chasis", length = 100)
    private String serialChasis;

    @Column(name = "placa", length = 50)
    private String placa;

    @Column(name = "horometro_actual", precision = 10, scale = 2, nullable = false)
    private BigDecimal horometroActual = BigDecimal.ZERO;

    @Column(name = "horometro_ultimo_mantenimiento", precision = 10, scale = 2)
    private BigDecimal horometroUltimoMantenimiento = BigDecimal.ZERO;

    @Column(name = "intervalo_mantenimiento_horas", precision = 10, scale = 2)
    private BigDecimal intervaloMantenimientoHoras = new BigDecimal("250.00");

    @Column(name = "estado", nullable = false, length = 50)
    private String estado = "OPERATIVO"; // OPERATIVO, EN_MANTENIMIENTO, FUERA_DE_SERVICIO, STANDBY

    @Column(name = "operador_responsable", length = 150)
    private String operadorResponsable;

    @Column(name = "costo_hora_usd", precision = 12, scale = 2)
    private BigDecimal costoHoraUsd = BigDecimal.ZERO;

    @Column(name = "combustible_tipo", length = 50)
    private String combustibleTipo = "DIESEL";

    @Column(name = "capacidad_tanque_litros", precision = 10, scale = 2)
    private BigDecimal capacidadTanqueLitros;

    @Column(name = "consumo_promedio_lph", precision = 8, scale = 2)
    private BigDecimal consumoPromedioLph;

    @Column(name = "observaciones", columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public Long getProyectoId() { return proyectoId; }
    public void setProyectoId(Long proyectoId) { this.proyectoId = proyectoId; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getMarca() { return marca; }
    public void setMarca(String marca) { this.marca = marca; }

    public String getModelo() { return modelo; }
    public void setModelo(String modelo) { this.modelo = modelo; }

    public String getSerialChasis() { return serialChasis; }
    public void setSerialChasis(String serialChasis) { this.serialChasis = serialChasis; }

    public String getPlaca() { return placa; }
    public void setPlaca(String placa) { this.placa = placa; }

    public BigDecimal getHorometroActual() { return horometroActual; }
    public void setHorometroActual(BigDecimal horometroActual) { this.horometroActual = horometroActual; }

    public BigDecimal getHorometroUltimoMantenimiento() { return horometroUltimoMantenimiento; }
    public void setHorometroUltimoMantenimiento(BigDecimal horometroUltimoMantenimiento) { this.horometroUltimoMantenimiento = horometroUltimoMantenimiento; }

    public BigDecimal getIntervaloMantenimientoHoras() { return intervaloMantenimientoHoras; }
    public void setIntervaloMantenimientoHoras(BigDecimal intervaloMantenimientoHoras) { this.intervaloMantenimientoHoras = intervaloMantenimientoHoras; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getOperadorResponsable() { return operadorResponsable; }
    public void setOperadorResponsable(String operadorResponsable) { this.operadorResponsable = operadorResponsable; }

    public BigDecimal getCostoHoraUsd() { return costoHoraUsd; }
    public void setCostoHoraUsd(BigDecimal costoHoraUsd) { this.costoHoraUsd = costoHoraUsd; }

    public String getCombustibleTipo() { return combustibleTipo; }
    public void setCombustibleTipo(String combustibleTipo) { this.combustibleTipo = combustibleTipo; }

    public BigDecimal getCapacidadTanqueLitros() { return capacidadTanqueLitros; }
    public void setCapacidadTanqueLitros(BigDecimal capacidadTanqueLitros) { this.capacidadTanqueLitros = capacidadTanqueLitros; }

    public BigDecimal getConsumoPromedioLph() { return consumoPromedioLph; }
    public void setConsumoPromedioLph(BigDecimal consumoPromedioLph) { this.consumoPromedioLph = consumoPromedioLph; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
