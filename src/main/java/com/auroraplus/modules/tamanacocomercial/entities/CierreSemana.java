package com.auroraplus.modules.tamanacocomercial.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "cierres_semana_comercial", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"tenant_id", "fecha_inicio_semana", "fecha_fin_semana"})
})
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class CierreSemana {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "fecha_inicio_semana", nullable = false)
    private LocalDate fechaInicioSemana; // Lunes

    @Column(name = "fecha_fin_semana", nullable = false)
    private LocalDate fechaFinSemana; // Domingo

    private boolean pagado = false;

    @Column(name = "fecha_pago")
    private LocalDateTime fechaPago;

    @Column(name = "comprobante_url")
    private String comprobanteUrl;

    @Column(name = "cerrado_por")
    private String cerradoPor;

    private String notas;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public LocalDate getFechaInicioSemana() { return fechaInicioSemana; }
    public void setFechaInicioSemana(LocalDate fechaInicioSemana) { this.fechaInicioSemana = fechaInicioSemana; }
    public LocalDate getFechaFinSemana() { return fechaFinSemana; }
    public void setFechaFinSemana(LocalDate fechaFinSemana) { this.fechaFinSemana = fechaFinSemana; }
    public boolean isPagado() { return pagado; }
    public void setPagado(boolean pagado) { this.pagado = pagado; }
    public LocalDateTime getFechaPago() { return fechaPago; }
    public void setFechaPago(LocalDateTime fechaPago) { this.fechaPago = fechaPago; }
    public String getComprobanteUrl() { return comprobanteUrl; }
    public void setComprobanteUrl(String comprobanteUrl) { this.comprobanteUrl = comprobanteUrl; }
    public String getCerradoPor() { return cerradoPor; }
    public void setCerradoPor(String cerradoPor) { this.cerradoPor = cerradoPor; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
}
