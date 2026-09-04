package com.auroraplus.modules.moda.controllers;

import com.auroraplus.core.financiero.entities.MovimientoCaja;
import com.auroraplus.core.financiero.repositories.MovimientoCajaRepository;
import com.auroraplus.modules.moda.entities.GiftCard;
import com.auroraplus.modules.moda.repositories.GiftCardRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Tarjetas de regalo (Subfase 6.3): emitirla es una venta real -> genera ingreso en caja por el saldo inicial. */
@RestController
@RequestMapping("/api/moda/gift-cards")
public class GiftCardController {

    @Autowired
    private GiftCardRepository giftCardRepository;

    @Autowired
    private MovimientoCajaRepository movimientoCajaRepository;

    private static final String MONEDA_MODA = "USD";

    @GetMapping
    public List<GiftCard> listar() {
        return giftCardRepository.findAll();
    }

    @GetMapping("/{codigo}")
    public GiftCard consultar(@PathVariable String codigo) {
        return giftCardRepository.findByCodigo(codigo)
            .orElseThrow(() -> new RuntimeException("Gift card no encontrada: " + codigo));
    }

    public static class EmisionRequest {
        public String codigo;
        public BigDecimal saldoInicial;
    }

    @PostMapping("/emitir")
    public ResponseEntity<GiftCard> emitir(@RequestParam Long tenantId, @RequestBody EmisionRequest request) {
        if (request.saldoInicial == null || request.saldoInicial.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El saldo inicial debe ser mayor a cero");
        }
        if (giftCardRepository.findByCodigo(request.codigo).isPresent()) {
            throw new RuntimeException("Ya existe una gift card con ese código");
        }

        GiftCard giftCard = new GiftCard();
        giftCard.setTenantId(tenantId);
        giftCard.setCodigo(request.codigo);
        giftCard.setSaldoInicial(request.saldoInicial);
        giftCard.setSaldoActual(request.saldoInicial);
        giftCard.setActiva(true);
        giftCard.setFechaEmision(LocalDateTime.now());
        GiftCard guardada = giftCardRepository.save(giftCard);

        MovimientoCaja ingreso = new MovimientoCaja();
        ingreso.setTenantId(tenantId);
        ingreso.setTipo(MovimientoCaja.TipoMovimiento.INGRESO);
        ingreso.setMonto(request.saldoInicial);
        ingreso.setMoneda(MONEDA_MODA);
        ingreso.setConcepto("Emisión gift card " + request.codigo);
        movimientoCajaRepository.save(ingreso);

        return ResponseEntity.ok(guardada);
    }
}
