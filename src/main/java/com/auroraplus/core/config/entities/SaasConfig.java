package com.auroraplus.core.config.entities;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** Configuración de la plataforma, clave/valor (V98). No pertenece a ningún negocio. */
@Entity
@Table(name = "saas_config")
public class SaasConfig {

    @Id
    @Column(length = 80)
    private String clave;

    @Column(columnDefinition = "TEXT")
    private String valor;

    @Column(name = "actualizado_en")
    private LocalDateTime actualizadoEn;

    @Column(name = "actualizado_por", length = 80)
    private String actualizadoPor;

    public String getClave() { return clave; }
    public void setClave(String clave) { this.clave = clave; }
    public String getValor() { return valor; }
    public void setValor(String valor) { this.valor = valor; }
    public LocalDateTime getActualizadoEn() { return actualizadoEn; }
    public void setActualizadoEn(LocalDateTime actualizadoEn) { this.actualizadoEn = actualizadoEn; }
    public String getActualizadoPor() { return actualizadoPor; }
    public void setActualizadoPor(String actualizadoPor) { this.actualizadoPor = actualizadoPor; }
}
