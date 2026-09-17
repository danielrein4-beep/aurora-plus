package com.auroraplus.modules.horeca.services;

import com.auroraplus.modules.horeca.entities.Comanda;
import com.auroraplus.modules.horeca.entities.ItemComanda;

import java.time.LocalDateTime;

/**
 * Ítem del tablero KDS, ya con el dato de la mesa/mesero aplanado — antes el
 * tablero solo traía ItemComanda directo, y como item.comanda es
 * @ManyToOne(LAZY) sin JOIN FETCH, el Hibernate6Module global lo serializaba
 * como null (el mismo gotcha ya documentado en CompraRetail/ItemVentaRetail):
 * el cocinero nunca sabía a qué mesa iba cada plato. Este DTO se arma DENTRO
 * de la transacción (HorecaService.obtenerTableroKds), no depende de que
 * Jackson serialice una relación lazy correctamente.
 */
public class ItemKdsDTO {
    public Long id;
    public String nombrePlato;
    public String estacionCocina;
    public ItemComanda.EstadoItem estadoItem;
    public java.math.BigDecimal cantidad;
    public String notas;
    public LocalDateTime fechaCreacion;
    public Integer numeroMesa;
    public String mesero;
    public String canal;

    public static ItemKdsDTO desde(ItemComanda item) {
        ItemKdsDTO dto = new ItemKdsDTO();
        dto.id = item.getId();
        dto.nombrePlato = item.getNombrePlato();
        dto.estacionCocina = item.getEstacionCocina();
        dto.estadoItem = item.getEstadoItem();
        dto.cantidad = item.getCantidad();
        dto.notas = item.getNotas();
        dto.fechaCreacion = item.getFechaCreacion();
        Comanda c = item.getComanda();
        if (c != null) {
            dto.numeroMesa = c.getNumeroMesa();
            dto.mesero = c.getMesero();
            dto.canal = c.getCanal();
        }
        return dto;
    }
}
