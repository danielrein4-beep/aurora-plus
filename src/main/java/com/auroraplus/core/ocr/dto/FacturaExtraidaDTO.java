package com.auroraplus.core.ocr.dto;

import java.math.BigDecimal;
import java.util.List;

public class FacturaExtraidaDTO {
    private String numeroFactura;
    private String proveedor;
    private String fecha;
    private List<ItemExtraidoDTO> items;
    private BigDecimal total;

    public FacturaExtraidaDTO() {}

    public String getNumeroFactura() { return numeroFactura; }
    public void setNumeroFactura(String numeroFactura) { this.numeroFactura = numeroFactura; }
    public String getProveedor() { return proveedor; }
    public void setProveedor(String proveedor) { this.proveedor = proveedor; }
    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }
    public List<ItemExtraidoDTO> getItems() { return items; }
    public void setItems(List<ItemExtraidoDTO> items) { this.items = items; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }

    public static class ItemExtraidoDTO {
        private String descripcion;
        private BigDecimal cantidad;
        private BigDecimal precioUnitario;

        public ItemExtraidoDTO() {}

        public String getDescripcion() { return descripcion; }
        public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
        public BigDecimal getCantidad() { return cantidad; }
        public void setCantidad(BigDecimal cantidad) { this.cantidad = cantidad; }
        public BigDecimal getPrecioUnitario() { return precioUnitario; }
        public void setPrecioUnitario(BigDecimal precioUnitario) { this.precioUnitario = precioUnitario; }
    }
}
