package com.auroraplus.core.auth.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Solicitud pendiente de agregar, cambiar o quitar el correo/teléfono de una cuenta de administración (ver V91). */
@Entity
@Table(name = "superadmin_verificaciones_contacto")
public class VerificacionContactoSuperAdmin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Column(nullable = false, length = 10)
    private String canal;

    @Column(nullable = false, length = 10)
    private String accion;

    @Column(name = "valor_nuevo", length = 160)
    private String valorNuevo;

    @Column(name = "codigo_actual_hash", length = 100)
    private String codigoActualHash;

    @Column(name = "codigo_nuevo_hash", length = 100)
    private String codigoNuevoHash;

    @Column(nullable = false)
    private int intentos = 0;

    @Column(nullable = false, length = 12)
    private String estado = "PENDIENTE";

    @Column(name = "creada_en", nullable = false)
    private LocalDateTime creadaEn = LocalDateTime.now();

    @Column(name = "expira_en", nullable = false)
    private LocalDateTime expiraEn;

    public Long getId() { return id; }
    public Long getAdminId() { return adminId; }
    public void setAdminId(Long adminId) { this.adminId = adminId; }
    public String getCanal() { return canal; }
    public void setCanal(String canal) { this.canal = canal; }
    public String getAccion() { return accion; }
    public void setAccion(String accion) { this.accion = accion; }
    public String getValorNuevo() { return valorNuevo; }
    public void setValorNuevo(String valorNuevo) { this.valorNuevo = valorNuevo; }
    public String getCodigoActualHash() { return codigoActualHash; }
    public void setCodigoActualHash(String codigoActualHash) { this.codigoActualHash = codigoActualHash; }
    public String getCodigoNuevoHash() { return codigoNuevoHash; }
    public void setCodigoNuevoHash(String codigoNuevoHash) { this.codigoNuevoHash = codigoNuevoHash; }
    public int getIntentos() { return intentos; }
    public void setIntentos(int intentos) { this.intentos = intentos; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public LocalDateTime getCreadaEn() { return creadaEn; }
    public LocalDateTime getExpiraEn() { return expiraEn; }
    public void setExpiraEn(LocalDateTime expiraEn) { this.expiraEn = expiraEn; }
}
