package com.auroraplus.modules.tamanacocomercial.dto;

import java.math.BigDecimal;

public class TicketExtraidoDTO {
    private String fecha;
    private String hora;
    private String chofer;
    private String placa;
    private String mina;
    private BigDecimal pesoNeto;
    private String producto;
    private String observaciones;

    public TicketExtraidoDTO() {}

    public TicketExtraidoDTO(String fecha, String hora, String chofer, String placa, String mina,
                              BigDecimal pesoNeto, String producto, String observaciones) {
        this.fecha = fecha;
        this.hora = hora;
        this.chofer = chofer;
        this.placa = placa;
        this.mina = mina;
        this.pesoNeto = pesoNeto;
        this.producto = producto;
        this.observaciones = observaciones;
    }

    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }
    public String getHora() { return hora; }
    public void setHora(String hora) { this.hora = hora; }
    public String getChofer() { return chofer; }
    public void setChofer(String chofer) { this.chofer = chofer; }
    public String getPlaca() { return placa; }
    public void setPlaca(String placa) { this.placa = placa; }
    public String getMina() { return mina; }
    public void setMina(String mina) { this.mina = mina; }
    public BigDecimal getPesoNeto() { return pesoNeto; }
    public void setPesoNeto(BigDecimal pesoNeto) { this.pesoNeto = pesoNeto; }
    public String getProducto() { return producto; }
    public void setProducto(String producto) { this.producto = producto; }
    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }
}
