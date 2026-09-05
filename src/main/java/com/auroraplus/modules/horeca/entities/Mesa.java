package com.auroraplus.modules.horeca.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/** Registro físico de mesas del salón — base del mapa de mesas (Subfase Front of House). */
@Entity
@Table(name = "mesas")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Mesa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, unique = false)
    private Integer numero;

    private Integer capacidad;

    private String zona; // TERRAZA, SALON_PRINCIPAL, BARRA...

    // Posición y tamaño en el plano del salón (coordenadas libres, ej. píxeles o unidades de
    // grilla — las define el frontend al dibujar) — nulos hasta que alguien la ubique en el
    // plano por primera vez (ver /mesas-fisicas/{id}/posicion). Sin esto el "mapa" de mesas
    // solo era una lista con estado, no un plano real que se pueda dibujar.
    private Integer posX;
    private Integer posY;
    private Integer ancho;
    private Integer alto;

    // REDONDA o RECTANGULAR — cómo dibujarla (por defecto RECTANGULAR).
    private String forma = "RECTANGULAR";

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Integer getNumero() { return numero; }
    public void setNumero(Integer numero) { this.numero = numero; }
    public Integer getCapacidad() { return capacidad; }
    public void setCapacidad(Integer capacidad) { this.capacidad = capacidad; }
    public String getZona() { return zona; }
    public void setZona(String zona) { this.zona = zona; }
    public Integer getPosX() { return posX; }
    public void setPosX(Integer posX) { this.posX = posX; }
    public Integer getPosY() { return posY; }
    public void setPosY(Integer posY) { this.posY = posY; }
    public Integer getAncho() { return ancho; }
    public void setAncho(Integer ancho) { this.ancho = ancho; }
    public Integer getAlto() { return alto; }
    public void setAlto(Integer alto) { this.alto = alto; }
    public String getForma() { return forma; }
    public void setForma(String forma) { this.forma = forma; }
}
