package com.auroraplus.core.config.entities;

import jakarta.persistence.*;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

/** Un ajuste del negocio guardado como JSON bajo una clave (ver PreferenciasTenantController). */
@Entity
@Table(name = "preferencias_tenant")
@IdClass(PreferenciaTenant.Clave.class)
public class PreferenciaTenant {

    public static class Clave implements Serializable {
        private Long tenantId;
        private String clave;

        public Clave() {}

        public Clave(Long tenantId, String clave) {
            this.tenantId = tenantId;
            this.clave = clave;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof Clave otra && Objects.equals(tenantId, otra.tenantId) && Objects.equals(clave, otra.clave);
        }

        @Override
        public int hashCode() {
            return Objects.hash(tenantId, clave);
        }
    }

    @Id
    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Id
    @Column(name = "clave", nullable = false, length = 80)
    private String clave;

    @Column(name = "valor", nullable = false, columnDefinition = "TEXT")
    private String valor;

    @Column(name = "actualizado_por", length = 150)
    private String actualizadoPor;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion = LocalDateTime.now();

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getClave() { return clave; }
    public void setClave(String clave) { this.clave = clave; }
    public String getValor() { return valor; }
    public void setValor(String valor) { this.valor = valor; }
    public String getActualizadoPor() { return actualizadoPor; }
    public void setActualizadoPor(String actualizadoPor) { this.actualizadoPor = actualizadoPor; }
    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) { this.fechaActualizacion = fechaActualizacion; }
}
